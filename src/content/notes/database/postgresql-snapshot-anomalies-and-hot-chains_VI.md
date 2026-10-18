---
title: "Snapshot, anomaly và HOT chain trong PostgreSQL"
category: "Database"
description: "Phân tích lost update, phantom, write skew, snapshot visibility, savepoint và pruning trên page."
updated: 2026-10-18
translationKey: "database/postgresql-snapshot-anomalies-and-hot-chains"
---

Isolation level mô tả những lịch sử đọc/ghi mà transaction được phép quan sát. Tên `REPEATABLE READ` không đủ để suy ra implementation: PostgreSQL dùng snapshot isolation ở mức này, còn `SERIALIZABLE` theo dõi dependency để ngăn lịch sử không serializable. Hãy xem các lịch sử cụ thể trước khi chọn mức cô lập.

## Các anomaly qua lịch sử

**Non-repeatable read:** T1 đọc row X, T2 update/commit, T1 đọc lại thấy giá trị khác. **Phantom:** T1 đọc tập row theo predicate, T2 insert row mới khớp predicate/commit, T1 đọc lại thấy thêm row. PostgreSQL `READ COMMITTED` lấy snapshot mới mỗi statement nên có thể thấy thay đổi giữa hai câu.

**Lost update:** hai transaction đọc cùng giá trị rồi ghi kết quả tính toán; update sau ghi đè ý định trước. Dùng atomic arithmetic update, row lock hoặc optimistic version check.

**Write skew:** T1 và T2 cùng đọc hai row thỏa invariant, rồi ghi hai row khác nhau khiến invariant bị phá dù mỗi transaction không ghi cùng row. Ví dụ 2 bác sĩ đều thấy người kia trực rồi mỗi người tự nghỉ; cuối cùng không ai trực. Snapshot isolation có thể cho phép; constraint hoặc SERIALIZABLE/explicit locking cần bảo vệ invariant.

## Visibility và transaction tự thấy thay đổi

Snapshot ghi trạng thái transaction ID: active-at-snapshot, committed trước, hoặc bắt đầu sau. Tuple của transaction hiện tại có thể visible cho chính nó dù chưa commit; row của transaction khác active thường không visible. Exported snapshot cho phép nhiều transaction chia sẻ cùng điểm nhìn, nhưng transaction export phải giữ snapshot đúng lifecycle và có thể kéo dài vacuum horizon.

Virtual transaction ID dùng để theo dõi transaction trước khi cần XID thường; subtransaction/savepoint có trạng thái riêng. Lỗi statement trong block transaction đánh dấu transaction aborted cho tới `ROLLBACK` hoặc rollback về savepoint. `COMMIT` sau lỗi có thể kết thúc bằng rollback; ứng dụng phải kiểm tra trạng thái thay vì giả định lệnh sau tiếp tục bình thường.

## HOT chain và page pruning

HOT update tránh thêm index entry nếu không đổi indexed column và tuple mới nằm cùng heap page. Index vẫn trỏ tới root tuple; heap chain nối các version. Khi snapshot cũ không cần version trung gian, page pruning có thể rút chain, cập nhật line pointer redirect và tái sử dụng dead tuple trong page. Nếu page hết chỗ hoặc index column đổi, HOT không áp dụng.

Một update liên tiếp có thể tạo chain nhiều version; đọc phải tìm version visible theo snapshot. Pruning sớm bị giới hạn bởi oldest snapshot và page pin/concurrent access. Vacuum làm việc toàn quan hệ để index/heap cleanup; pruning tại page không thay vacuum.

### Pruning làm gì trên một page?

Pruning là lần dọn nhanh cục bộ có thể diễn ra khi PostgreSQL đang đọc hoặc sửa một heap page. Nó thường đáng làm khi lần cập nhật trước không tìm được chỗ trên chính page đó, hoặc page đã dùng phần chỗ mà `fillfactor` chừa lại cho update. `fillfactor` là phần trăm page tối đa mà INSERT cố lấp; chẳng hạn `fillfactor = 75` để lại khoảng trống cho các phiên bản mới do UPDATE. Mức này là chỗ trống ban đầu, không phải lời hứa mọi lần update đều sẽ thành HOT.

Pruning chỉ xét một heap page và chỉ bỏ version mà không snapshot nào còn cần. Nếu một snapshot lâu vẫn có thể nhìn thấy version, version đó chưa thể bị loại. Khi có thể dọn, PostgreSQL gom lại vùng tuple tự do trong page, nhưng không nhất thiết xóa line pointer: index có thể vẫn giữ TID trỏ tới slot đó. Line pointer tương ứng chuyển sang trạng thái `dead`, để index scan biết heap tuple không còn tồn tại và có thể đánh dấu index entry là dead sau khi xác nhận. Vì thế **tuple bytes có thể đã được dọn trong heap nhưng TID slot/index entry vẫn cần một giai đoạn cleanup khác**.

Theo mô tả trong sách PostgreSQL 14, pruning tại page không cập nhật free space map hoặc visibility map. Chỗ thu hồi được dành cho update trên page đó, thay vì ngay lập tức quảng bá như chỗ trống dành cho INSERT ở page khác. Đây là chi tiết triển khai của phiên bản/sách; `VACUUM` vẫn cần thiết để quét relation, dọn index rộng hơn và cập nhật metadata bảo trì.

### Trace: chỗ trống, dead pointer và lần index scan

Giả sử một page có `fillfactor = 75`, mỗi row khá lớn, và ta chèn một row rồi cập nhật nó liên tục. Các phiên bản cũ ban đầu vẫn nằm trên page vì có thể còn cần cho snapshot; phiên bản cuối hiện tại cũng chiếm chỗ. Khi page chạm ngưỡng chừa chỗ, lần update kế tiếp có thể kích hoạt pruning trước khi ghi version tiếp theo. Pruning thu hồi bytes của các version cũ đã an toàn, dồn phần trống lại, nhưng line pointer cũ vẫn có thể mang trạng thái `dead` vì index còn trỏ tới chúng.

Index scan đi theo các entry ấy có thể lần đầu phải chạm heap để xác nhận TID trỏ tới line pointer `dead`; khi đã biết entry không thể cho row visible, access method có thể ghi nhận entry đó là dead để tránh fetch heap lặp lại. Entry không nhất thiết bị xóa vật lý khỏi trang index ngay tại lần scan. Điều này giải thích vì sao xem heap sau pruning và xem index ngay sau đó có thể cho hai hình ảnh khác nhau: heap tuple đã biến mất nhưng tham chiếu index vẫn còn cho tới cleanup thích hợp.

### HOT update biến nhiều index entry thành một chain trong heap

Một HOT update cần đồng thời thỏa hai điều kiện: không thay đổi cột mà bất kỳ index nào tham chiếu (kể cả cột dùng trong expression index hoặc predicate của partial index), và version mới phải nằm trên cùng heap page với version cũ. Nếu thiếu một điều kiện, PostgreSQL phải tạo entry index mới cho version mới; nếu page khác, một TID trong index không thể lần theo chain cục bộ qua page khác.

Khi HOT áp dụng, index entry hiện có tiếp tục trỏ tới đầu chain. Tuple header dùng `ctid` để nối version trước tới version sau. Version cũ có bit **Heap Hot Updated** để báo rằng cần đi tiếp; version mới không được index trỏ trực tiếp có bit **Heap Only Tuple**. Mỗi version vẫn được kiểm tra visibility theo snapshot: tìm thấy chain không có nghĩa được trả version cuối bất kể snapshot. Khi chain dài, lần đọc có thể phải kiểm tra nhiều tuple hơn; pruning rút gọn phần lịch sử đã an toàn.

| Đặc điểm | UPDATE thường | HOT UPDATE |
| --- | --- | --- |
| Điều kiện về index | Có thể đổi cột được index tham chiếu | Không đổi cột index tham chiếu, kể cả expression/partial index |
| Vị trí tuple mới | Có thể nằm ở page khác | Phải còn chỗ trên cùng heap page |
| Entry mới trong mỗi index | Thường cần entry cho version mới | Không cần entry mới chỉ vì tạo version heap mới |
| Cách index tới version | Index có thể có TID cho các version cần thiết | Entry cũ dẫn tới HOT chain trong heap |

`fillfactor` thấp hơn có thể tăng xác suất còn chỗ để HOT, nhưng đổi lại table ban đầu chiếm nhiều page hơn và vẫn không giúp nếu workload sửa cột được index hóa. Hãy đo `n_tup_upd`, `n_tup_hot_upd` trong `pg_stat_all_tables`, xem các index/predicate thật sự tham chiếu cột nào, rồi điều chỉnh theo workload thay vì hạ fillfactor theo cảm tính.

### Khi page hết chỗ: HOT chain bị tách

HOT chain không thể chạy xuyên nhiều heap page. Nếu cùng page không còn chỗ cho version tiếp theo, PostgreSQL có thể không dọn được vì một snapshot cũ còn giữ horizon; update mới phải sang page khác và cần index entry riêng. Tuple ở page cũ kết thúc chain HOT của nó; version mới ở page mới bắt đầu chain khác. `ctid` có thể cho thấy một liên kết tới tuple kế tiếp về mặt vật lý, nhưng khi bit `Heap Hot Updated` không được đặt, executor không đi tiếp qua liên kết đó như một HOT chain. Index lúc này có hai entry, mỗi entry dẫn vào đầu một chain trên page riêng.

Đây là lý do “không đổi cột index” chưa đủ để đảm bảo HOT. Cần chỗ trống trên đúng page và cần version cũ trở nên an toàn để pruning. Transaction `REPEATABLE READ` lâu có thể giữ version mà pruning cần loại; khi page cạn chỗ, hiệu quả HOT giảm dù mọi giá trị index vẫn vậy. Hãy kiểm tra cả tuổi snapshot/horizon lẫn chỗ trống/page layout khi giải thích HOT ratio thấp.

### B-tree có pruning riêng trước khi split

Heap page pruning và B-tree index-page pruning là hai thao tác khác nhau. Heap pruning dọn tuple/chain trên một heap page. Index pruning dọn entry trong một leaf page của B-tree, thường khi một lần INSERT index sắp buộc page split. Split có thể lan lên parent và tăng kích thước cây; xóa entry sau đó thường không ghép hai page lại, nên tránh được split có thể giúp index không tăng thêm page.

Sách PostgreSQL 14 mô tả hai nguồn entry có thể loại. Trước hết là entry đã được đánh dấu dead bởi index scan sau khi kiểm tra heap. Nếu chưa đủ chỗ, PostgreSQL có thể kiểm tra các entry “hứa hẹn” là phiên bản lặp của cùng logical row: truy cập heap để xác nhận version đã qua horizon và không còn cần thiết, rồi xóa chúng ngay trên leaf page trước khi split. Truy cập heap có chi phí, nên chỉ kiểm tra ứng viên phù hợp; đây là đánh đổi giữa vài lần kiểm tra visibility với một lần split và mức tăng dung lượng cấu trúc.

Trong PostgreSQL 14, **simple deletion** dựa vào cờ `LP_DEAD` mà index scan để lại; **bottom-up deletion** nhắm vào version churn do UPDATE ở index không đổi logic key. Cả hai là cleanup cục bộ, tăng dần và có thể giúp trì hoãn split; chúng không thay thế VACUUM toàn quan hệ và không hứa mọi index garbage đều được tìm thấy ngay. Đừng nhầm “B-tree dọn được một entry khi sắp split” với việc index lập tức co nhỏ xuống kích thước tối thiểu.

### Pruning HOT chain giữ root bằng redirect

Index cần một TID ổn định làm đầu chain. Nếu pruning bỏ version đầu mà index entry trỏ tới, PostgreSQL không thể chỉ xóa line pointer đó. Nó có thể đổi line pointer đầu thành **redirect** trỏ tới version mới bắt đầu chain; các line pointer của version trung gian không còn index reference thì có thể trở thành `unused`, và vùng tuple được gom lại. Index vẫn đi vào đúng root TID, còn heap chuyển hướng tới version đầu tiên còn sống.

Hãy phân biệt ba trạng thái khi đọc kết quả `pageinspect`: `normal` trỏ tới tuple, `dead` là slot chưa thể bỏ vì còn tham chiếu cần xử lý, và `redirect` giữ TID gốc để điều hướng tới HOT chain mới. `unused` mới là slot có thể tái sử dụng. Trạng thái line pointer và trạng thái index tuple là hai lớp khác nhau; không nên nhìn một cờ đơn lẻ rồi kết luận toàn bộ cleanup đã xong.

## Chọn isolation từ invariant

Viết invariant trước, rồi hỏi một transaction đơn lẻ có đủ dữ liệu để bảo vệ nó không. Unique/check/FK constraint thường là cách chắc nhất cho invariant biểu diễn được. Nếu cần đọc nhiều row rồi quyết định write, dùng khóa rõ, serializable với retry, hoặc thiết kế single-owner. SERIALIZABLE có thể abort dù logic nghiệp vụ hợp lệ; retry phải bao trọn database transaction và tránh lặp side effect ngoài DB.

*PostgreSQL Internals 14*, Part I, phân tích anomalies, snapshots, own changes, exported snapshots, subtransactions, HOT chains và pruning. Đối chiếu [HOT trong PostgreSQL 14](https://www.postgresql.org/docs/14/storage-hot.html), [B-tree deletion trong PostgreSQL 14](https://www.postgresql.org/docs/14/btree-implementation.html#BTREE-DELETION), [mã nguồn HOT](https://github.com/postgres/postgres/blob/REL_14_STABLE/src/backend/access/heap/README.HOT), [mã nguồn B-tree](https://github.com/postgres/postgres/blob/REL_14_STABLE/src/backend/access/nbtree/README), [transaction isolation](https://www.postgresql.org/docs/14/transaction-iso.html), [snapshot synchronization](https://www.postgresql.org/docs/14/functions-admin.html#FUNCTIONS-SNAPSHOT-SYNCHRONIZATION) và [routine vacuum](https://www.postgresql.org/docs/14/routine-vacuuming.html).


## Lịch transaction cần tự mô phỏng

### READ COMMITTED khi UPDATE phải chờ

Ở Read Committed, mỗi statement có snapshot riêng. Nếu T1 đọc và khóa row, T2 chạy `UPDATE ... WHERE balance >= 100` rồi phải chờ T1, sau khi T1 commit PostgreSQL có thể theo phiên bản mới nhất của row và đánh giá lại điều kiện `WHERE`. Nếu predicate không còn đúng, T2 bỏ qua row đó; nếu đúng, T2 tính thay đổi trên phiên bản mới. Đây là hành vi đặc biệt quan trọng: statement không đơn giản ghi đè snapshot cũ, nhưng nhiều câu lệnh nghiệp vụ vẫn có thể tạo anomaly nếu invariant trải qua nhiều row.

Ở Repeatable Read, snapshot tồn tại xuyên transaction; nếu T2 muốn cập nhật row đã bị thay đổi từ sau snapshot, PostgreSQL thường trả serialization failure thay vì áp dụng âm thầm. Nhưng hai transaction ghi hai row riêng biệt vẫn có thể write skew. Ở Serializable, SSI theo dõi rw-dependency; nếu cấu hình dependency có nguy cơ tạo cycle, một bên bị abort. Serialization failure là kết quả hợp lệ của cơ chế, không phải dữ liệu hỏng.

### XID, snapshot và phiên bản tuple

Snapshot có ranh giới XID (`xmin`/`xmax`) cùng danh sách XID đang chạy ở giữa. XID nhỏ hơn ranh giới chưa chắc tự nó chứng minh commit: transaction có thể abort; trạng thái commit được tra qua transaction status và hint bits có thể cache kết quả đó trên page. `xmin`/`xmax` trên tuple không phải timestamp wall-clock. Tuple của transaction hiện tại được xử lý riêng để transaction nhìn thấy write của chính nó.

Update chain nối các phiên bản vật lý qua `ctid`; index có thể trỏ tới một phiên bản/điểm đầu chain và heap xác định phiên bản visible theo snapshot. `VACUUM` chỉ gỡ version khi không snapshot hợp lệ nào còn cần nó. Vì thế một `idle in transaction` hay exported snapshot sống lâu có thể ngăn cleanup kể cả khi không còn câu query đang chạy.

### Phân biệt các cách dọn/rebuild

HOT update yêu cầu không đổi cột được index tham chiếu và còn chỗ trên cùng heap page. Pruning rút chain/line pointer ngay trong page khi snapshot và pin cho phép; regular VACUUM quét relation để dọn index reference và tái sử dụng space. Freeze xử lý tuổi XID, là mục tiêu khác với bloat cleanup. `VACUUM FULL` viết heap mới và cần lock mạnh; `CLUSTER` sắp lại heap theo index rồi cũng rewrite; `REINDEX` xây index mới mà không rewrite heap; online rewrite bằng công cụ như pg_repack cần đồng bộ change và thêm disk. Chọn lệnh theo mục tiêu, không gọi tất cả là “compact”.

Sách *PostgreSQL Internals 14*, Part I (tr. 45–168), cần đọc cùng [isolation semantics PostgreSQL 14](https://www.postgresql.org/docs/14/transaction-iso.html), [snapshot synchronization](https://www.postgresql.org/docs/14/functions-admin.html#FUNCTIONS-SNAPSHOT-SYNCHRONIZATION), [HOT](https://www.postgresql.org/docs/14/storage-hot.html), [routine vacuum](https://www.postgresql.org/docs/14/routine-vacuuming.html) và [CLUSTER](https://www.postgresql.org/docs/14/sql-cluster.html).

## Tự kiểm tra

**Snapshot isolation có thể gặp write skew?** Có; transaction ghi row khác nhau nhưng cùng phá invariant đã đọc.

**Transaction có thể thấy write chưa commit của chính nó?** Có; snapshot xử lý thay đổi của transaction hiện tại riêng.

**HOT pruning thay thế vacuum?** Không; pruning dọn chain cục bộ trong page, vacuum xử lý bảo trì rộng hơn.

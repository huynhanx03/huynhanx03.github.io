---
title: "Tuple, page và TOAST trong PostgreSQL"
category: "Database"
description: "Đọc cấu trúc heap page, tuple header, visibility map và cách PostgreSQL lưu giá trị lớn."
updated: 2026-10-18
translationKey: "database/postgresql-tuples-pages-and-toast"
---

PostgreSQL lưu heap table thành các page cố định, thường 8 KiB theo build mặc định. Một page chứa header, line pointer và tuple; line pointer cho phép tuple đổi vị trí bên trong page mà index vẫn trỏ ổn định đến slot. Index trỏ tới TID gồm số page và offset/slot, không trỏ trực tiếp đến một địa chỉ byte cố định.

## Một heap tuple chứa gì?

Tuple header giữ transaction ID tạo và xóa phiên bản (`xmin`, `xmax`), bit cờ, thông tin null và vị trí dữ liệu. Các cột được sắp theo thứ tự schema với alignment; vì thế thứ tự cột có thể ảnh hưởng padding và kích thước, dù chọn thứ tự không thay thế được thiết kế type tốt. NULL được biểu diễn trong null bitmap, không phải lúc nào cũng chiếm một vùng giá trị đầy đủ.

`xmin` là XID của transaction tạo tuple version. Khi một version bị xóa hoặc bị thay thế bởi `UPDATE`, `xmax` được ghi XID của transaction thực hiện thao tác đó. Vì vậy, `xmax = 0` thường có nghĩa chưa có transaction xóa version này; nếu có `xmax` khác 0 thì vẫn phải kiểm tra transaction đó đã commit hay abort và snapshot hiện tại bắt đầu lúc nào. `xmin`/`xmax` không phải timestamp đồng hồ. Trong tài liệu và mã nguồn PostgreSQL, transaction thường được viết tắt là **xact**.

### Tuple header ghi kết quả kiểm tra visibility như thế nào?

Header có các bit cờ cho biết PostgreSQL đã biết transaction gắn với `xmin` hoặc `xmax` commit hay abort chưa. Chẳng hạn, `xmin_committed` và `xmin_aborted` mô tả trạng thái của transaction tạo tuple; hai bit tương ứng của `xmax` mô tả transaction xóa/thay thế. Khi trạng thái chưa biết, PostgreSQL phải tra danh sách transaction đang chạy trong `ProcArray` và trạng thái commit trong **commit log** (`pg_xact`). `pg_xact` là dữ liệu transaction nằm trong thư mục dữ liệu, không phải một bảng system catalog để ứng dụng cập nhật bằng SQL.

Sau khi tra được trạng thái, PostgreSQL có thể ghi nhớ kết quả vào tuple header bằng **hint bit**. Các bit này là gợi ý đã xác nhận, giúp lần đọc sau tránh tra `ProcArray`/`pg_xact` lần nữa. Transaction ghi row chưa biết trước nó sẽ commit hay abort, nên không thể đánh dấu kết quả cuối ngay lúc INSERT. Transaction đọc sau đó có thể là bên đầu tiên xác nhận trạng thái và làm page trong buffer cache thành dirty. Vì vậy một `SELECT` read-only đôi khi vẫn khiến page cần được ghi ra đĩa: nó đã cập nhật hint bit, không phải dữ liệu logic của row.

Khi xem page bằng `pageinspect`, một tuple mới có thể hiện `xmin` nhưng chưa có bit `xmin_committed`, vì transaction tạo nó còn chạy. `xmax = 0` đôi khi đi kèm bit `xmax_aborted`: đây là cách đánh dấu giá trị giả “chưa có transaction xóa”, không phải bằng chứng đã có một lần xóa rồi rollback. Những bit này là chi tiết nội bộ; hãy dùng chúng để hiểu cơ chế và chẩn đoán, không viết ứng dụng phụ thuộc vào bitmask cố định giữa các phiên bản.

### COMMIT và ROLLBACK không sửa lại từng tuple ngay lập tức

PostgreSQL ghi trạng thái commit/abort trong `pg_xact`. Khi transaction commit, các tuple mà nó tạo/xóa không nhất thiết được viết lại ngay chỉ để cập nhật bit trong từng page. Lần truy cập thông thường sau đó có thể tra trạng thái transaction rồi đặt hint bit. Khi transaction abort, PostgreSQL cũng không đi qua mọi page để xóa các byte đã ghi; nó đánh dấu transaction aborted. Các tuple do transaction tạo trở nên invisible, còn `xmax` do transaction abort ghi lên tuple cũ bị bỏ qua. Pruning hoặc VACUUM có thể thu hồi chỗ vật lý khi an toàn.

Phân biệt hai việc: **ROLLBACK làm thay đổi kết quả logic mà transaction khác nhìn thấy**, còn **thu hồi byte khỏi heap là công việc dọn dẹp sau đó**. Hint bit chỉ là cache có thể tính lại; chúng không thay thế trạng thái transaction có thẩm quyền trong `pg_xact`. PostgreSQL vẫn dùng WAL để bảo vệ thay đổi dữ liệu đã commit theo cấu hình durability; hint bit chỉ được ghi an toàn khi WAL bảo đảm record commit cần thiết đã bền vững trước page chứa bit đó. Vì thế “ROLLBACK không xóa tuple ngay” không đồng nghĩa “PostgreSQL bỏ qua phục hồi sau crash”. Bảng dưới đây chỉ minh họa visibility của tuple, không phải phép đo page vật lý:

| Thao tác | Tuple cũ | Tuple mới | Kết quả logic sau khi hoàn tất |
| --- | --- | --- | --- |
| `INSERT` rồi `COMMIT` | — | `xmin = X`, X đã commit | Row visible với snapshot phù hợp. |
| `DELETE` rồi `COMMIT` | `xmax = X`, X đã commit | — | Snapshot mới không còn thấy row; snapshot cũ có thể vẫn cần version cũ. |
| `DELETE` rồi `ROLLBACK` | `xmax = X`, X đã abort | — | Xóa không có hiệu lực; version cũ vẫn có thể visible. |
| `UPDATE` rồi `COMMIT` | `xmax = X` | Version mới có `xmin = X` | Snapshot cũ/mới có thể chọn hai version khác nhau. |

Transaction đang ghi `xmax` lên row cũng có thể khiến transaction khác muốn sửa cùng row phải chờ. Trong header thực tế, `xmax` có thể biểu diễn transaction xóa/cập nhật, một row lock chưa xóa row (`lock-only`), hoặc một MultiXact khi có nhiều locker; các bit cờ cho biết cách diễn giải. Vì thế `xmax` vừa tham gia quyết định version cũ còn visible không, vừa phục vụ khóa row; đừng suy ra “row đã xóa xong” chỉ từ việc thấy một giá trị ở `xmax`.

PostgreSQL dùng MVCC bằng cách thêm tuple version mới thay vì ghi đè version đang được transaction khác nhìn thấy. `UPDATE` thường tương tự `DELETE` version cũ cộng `INSERT` version mới. Index entry có thể còn trỏ đến tuple cũ cho đến khi vacuum dọn phiên bản không còn visible. Đây là lý do UPDATE nhiều có thể làm table/index phình dù số hàng logic không đổi.

### Index không tự chọn phiên bản row theo snapshot

Index entry không mang `xmin`/`xmax` để tự quyết định một row version có visible với transaction hiện tại hay không. Nó mang khóa và TID trỏ đến heap; khi một logical row có nhiều phiên bản, truy vấn phải kiểm tra heap theo snapshot. Vì thế một index scan có thể tìm được TID cũ nhưng vẫn phải bỏ qua tuple đã chết với snapshot đó.

Ví dụ, transaction A ở `REPEATABLE READ` giữ snapshot cũ và đọc account `id=7`. Transaction B cập nhật `balance`, tạo heap version mới. Với snapshot của A, version cũ vẫn có thể visible; snapshot bắt đầu sau khi B commit sẽ chọn version mới. Index không chứa hai bộ `xmin`/`xmax` riêng để trả lời hai snapshot này: heap tuple header và trạng thái transaction mới quyết định kết quả. Nếu B đổi cột được index hóa, index cần entry cho key mới; entry cũ có thể còn đó cho đến khi không snapshot nào cần nó và vacuum dọn được.

Nếu chỉ đổi cột không được index hóa và tuple mới còn chỗ trên cùng heap page, PostgreSQL có thể dùng **HOT update**: không tạo entry mới trong mỗi index; entry hiện tại dẫn đến gốc của HOT chain, rồi heap lần theo chain để tìm version visible. Nếu không đủ chỗ hoặc update đụng cột được index hóa, HOT không áp dụng và các index cần cập nhật. Page pruning có thể rút ngắn chain khi version trung gian không còn cần giữ.

Index-only scan là ngoại lệ có điều kiện: nó chỉ bỏ heap fetch khi index chứa đủ cột và visibility map xác nhận page all-visible. Nếu bit đó chưa được set hoặc bị xóa sau write, executor vẫn phải kiểm tra heap. Vì vậy “index-only” phụ thuộc trạng thái vacuum/visibility, không chỉ cú pháp index.

## Page, free space và visibility

Heap page giữ `pd_lower`/`pd_upper` để phân biệt vùng metadata và chỗ trống; line pointer trỏ đến tuple. Khi tuple bị xóa, chỗ của nó không nhất thiết lập tức được trả về cho filesystem. Vacuum có thể đánh dấu line pointer reusable và cập nhật free space map (FSM), giúp INSERT tìm page có khoảng trống. FSM là ước lượng phục vụ chọn page; khi dữ liệu thay đổi nhanh nó có thể cần được hiệu chỉnh.

Visibility map có bit cho page all-visible và all-frozen. All-visible hỗ trợ index-only scan an toàn hơn; all-frozen giúp vacuum tránh đọc lại tuple đã được đóng băng. Một thay đổi trên page có thể xóa trạng thái all-visible, nên write activity làm giảm cơ hội index-only scan dù index không đổi.

## TOAST cho giá trị lớn

Một tuple không thể tùy ý lớn hơn page: PostgreSQL không chia một heap tuple sang page kế tiếp. Với cột varlena như `text`, `bytea`, `jsonb` và một số mảng, PostgreSQL có thể nén giá trị, chuyển nó khỏi tuple chính (out-of-line), hoặc làm cả hai. Tuple chính khi đó giữ một pointer nhỏ; giá trị ngoài được chia thành các chunk trong TOAST table liên kết với bảng gốc. Theo sách, table có thuộc tính có thể TOAST thường có TOAST table riêng từ lúc tạo, dù hiện chưa có giá trị nào đủ lớn để dùng tới.

TOAST bắt đầu xử lý khi row vượt ngưỡng mục tiêu để một page có thể chứa nhiều row. Với page mặc định 8 KiB, sách dùng mục tiêu xấp xỉ một phần tư page sau khi trừ header, khoảng 2 KiB; đây là heuristic của phiên bản sách mô tả, không phải giới hạn cứng của SQL. PostgreSQL lần lượt nén/chuyển các thuộc tính phù hợp cho tới khi row về ngưỡng. Kiểu dữ liệu chọn storage strategy mặc định; có thể xem bằng `\d+` trong `psql` hoặc `pg_attribute.attstorage`.

| Strategy | Hành vi |
| --- | --- |
| `plain` | Không nén và không chuyển out-of-line; dùng cho kiểu không cần TOAST. |
| `extended` | Có thể nén và chuyển out-of-line; đây là lựa chọn phổ biến cho dữ liệu có thể dài. |
| `external` | Có thể chuyển out-of-line nhưng giữ giá trị không nén; thao tác substring trên `text`/`bytea` lớn có thể chỉ đọc phần chunk cần thiết, nhanh hơn đổi lại tốn dung lượng. |
| `main` | Ưu tiên nén và giữ inline; chỉ chuyển out-of-line khi nén vẫn chưa làm row đủ nhỏ. |

Strategy là quy tắc xử lý thuộc tính, không phải lời hứa rằng mọi giá trị sẽ luôn ở cùng một dạng lưu trữ. Nó cân bằng kích thước heap row với chi phí CPU, I/O và việc truy cập giá trị. Ví dụ, `external` có thể hợp lý khi ứng dụng thường đọc một phần của giá trị lớn: đọc một substring từ `text` chưa nén có thể chỉ cần lấy các chunk chứa đoạn đó, thay vì tải và giải nén toàn bộ payload. Đổi lại, dữ liệu chiếm thêm dung lượng.

Index không thể chuyển key dài sang TOAST table như heap row; cơ chế TOAST cho index chỉ có thể nén. Vì thế giới hạn kích thước key index vẫn tồn tại và còn tùy access method/operator class. Lưu JSON lớn trong heap không đồng nghĩa có thể tạo index trực tiếp trên một giá trị lớn tùy ý.

TOAST giúp page heap chứa được nhiều row hơn, nhưng đọc cột toasted có thể cần thêm index/table fetch và ghép chunk. Query chỉ lấy metadata có thể tránh tải blob nếu không chọn cột đó. Ngược lại, `SELECT *`, sort/hash trên payload hoặc cập nhật JSON lớn có thể tăng I/O và CPU. Compression không miễn phí: CPU tăng và hiệu quả phụ thuộc dữ liệu.

TOAST table có quản lý phiên bản riêng với heap table, nhưng các chunk thường được thêm hoặc xóa chứ không sửa tại chỗ. Nếu `UPDATE` một cột khác mà giá trị toasted không đổi, heap version mới có thể tiếp tục tham chiếu cùng giá trị TOAST cũ. Nếu chính giá trị dài đổi, PostgreSQL tạo giá trị/chunk TOAST mới cùng heap version mới. Điều này giải thích vì sao payload lớn không nhất thiết phải ghi lại chỉ vì một cột nhỏ trên cùng row thay đổi; đồng thời bản cũ vẫn cần được giữ cho tới khi không còn snapshot cần nó và cleanup có thể thu hồi.

Giả sử `body` đủ lớn để được lưu ngoài:

| Thao tác | Phiên bản heap | Giá trị TOAST |
| --- | --- | --- |
| `INSERT` row | `H1` trỏ `body` tới `T1` | Tạo các chunk của `T1`. |
| `UPDATE title` | Tạo `H2`; `body` vẫn trỏ tới `T1` | Không phải ghi lại payload không đổi. |
| `UPDATE body` | Tạo `H3`; `body` trỏ tới `T2` | Tạo chunk mới cho `T2`; `H2`/`T1` còn cần cho snapshot cũ. |

Sau khi không snapshot nào còn cần version cũ, VACUUM có thể thu hồi heap version và các chunk TOAST không còn được tham chiếu. Bảng này mô tả vòng đời ở mức khái niệm; chi tiết cleanup phụ thuộc thời điểm các version trở nên an toàn để xóa.

## Ví dụ chọn query shape

Giả sử bảng `documents(id, owner_id, title, body jsonb)` có `body` lớn. Màn danh sách chỉ cần ID và title. Tạo index phù hợp `(owner_id, id)` hoặc một covering index có title nếu workload chứng minh có lợi; query chỉ chọn `id,title` để không detoast `body`. Nếu thêm title làm index rất rộng, so sánh dung lượng và write amplification với heap fetch trước khi quyết định.

Khi màn chi tiết lấy body, heap TID lookup rồi TOAST access là hợp lý. Cache ở application có thể hữu ích nếu đo được read lặp, nhưng phải có invalidation/version policy. Đừng chuyển mọi JSON sang nhiều bảng chỉ vì thấy TOAST; chọn theo cách truy vấn, cập nhật và ràng buộc cần bảo vệ.

## Cách quan sát

Dùng `pageinspect` để xem page/tuple ở môi trường chẩn đoán; extension này đọc cấu trúc nội bộ, cần quyền phù hợp và kết quả phụ thuộc version/build. Theo dõi `pgstattuple`, `pg_stat_all_tables`, `n_dead_tup`, index-only scan và heap fetch; số liệu thống kê có sai số và không phải bằng chứng page-by-page chính xác. Với bảng lớn, xem vacuum, fillfactor, update pattern, FSM và visibility map cùng nhau.

*PostgreSQL 14 Internals*, Part I, trình bày page, tuple, MVCC, HOT và TOAST. Các strategy/ngưỡng theo sách được đối chiếu với [tài liệu TOAST của PostgreSQL 14](https://www.postgresql.org/docs/14/storage-toast.html); cơ chế visibility/hint bit được đối chiếu thêm với mã nguồn PostgreSQL 14 về [đánh giá visibility của heap tuple](https://github.com/postgres/postgres/blob/REL_14_STABLE/src/backend/access/heap/heapam_visibility.c), [buffer và hint bit](https://github.com/postgres/postgres/blob/REL_14_STABLE/src/backend/storage/buffer/README), cùng [transaction status](https://github.com/postgres/postgres/blob/REL_14_STABLE/src/backend/access/transam/README). Cũng tham khảo [database page layout](https://www.postgresql.org/docs/current/storage-page-layout.html), [TOAST](https://www.postgresql.org/docs/current/storage-toast.html), [visibility map](https://www.postgresql.org/docs/current/storage-vm.html) và [index-only scans](https://www.postgresql.org/docs/current/indexes-index-only-scans.html). Sách theo PostgreSQL 14; các liên kết docs hiện hành có thể mô tả release mới hơn.

## Tự kiểm tra

**Index entry tự biết version nào visible với snapshot?** Không; entry cho TID, còn heap version và `xmin`/`xmax` quyết định visibility.

**Vì sao HOT update có thể không thêm entry mới vào index?** Vì key được index không đổi và tuple mới nằm vừa trên cùng page; entry hiện tại dẫn tới HOT chain trong heap.

**Index có chứa toàn bộ row PostgreSQL không?** Thường không; index giữ key và TID, rồi heap cung cấp tuple cùng thông tin visibility.

**Tạo covering index đảm bảo index-only scan?** Không; visibility map phải cho phép bỏ heap visibility check và planner phải thấy path đó rẻ.

**TOAST làm payload lớn biến mất khỏi chi phí?** Không; nó giữ tuple chính nhỏ hơn nhưng truy cập, nén, chunking và cập nhật payload vẫn tốn tài nguyên.

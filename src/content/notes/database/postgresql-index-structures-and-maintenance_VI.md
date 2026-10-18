---
title: "Page structure và maintenance của index PostgreSQL"
category: "Database"
description: "Hiểu B-tree dedup, Hash overflow, GiST/SP-GiST routing, GIN posting list và BRIN summary ở mức cấu trúc."
updated: 2026-10-17
translationKey: "database/postgresql-index-structures-and-maintenance"
---

Index PostgreSQL implement một access method qua interface chung, nhưng page layout và search semantics khác nhau. Operator class định nghĩa key comparison/consistency; access method quản lý page, concurrency và vacuum integration. Vì vậy cùng một loại index có thể dùng operator class khác để hỗ trợ semantics khác.

## Hash và B-tree

Hash index lưu hash value nên phù hợp equality; hash collision buộc recheck heap value. Bucket có overflow page khi dữ liệu tăng; split bucket tăng capacity. Không có order để range scan.

B-tree page chứa pivot/separator ở internal level và item ở leaf; sibling links hỗ trợ range scan. Insert vào page đầy có thể split; concurrent search dùng high-key/right-link để đi đúng khi split chưa hoàn tất. Deduplication có thể nén nhiều duplicate key thành posting list/TID array ở leaf, giảm size cho cột cardinality thấp; unique index không có duplicates để tận dụng.

## GiST và SP-GiST

GiST là framework cho balanced search tree với operator class cung cấp `consistent`, `union`, `penalty`, `picksplit` và tùy chọn distance. Với bounding box, parent lưu vùng bao các child; query kiểm tra region rồi có thể heap recheck. Penalty/split tốt làm giảm overlap và search branches. GiST hỗ trợ exclusion constraints khi operator class định nghĩa conflict.

SP-GiST phân vùng không gian không overlap theo trie, radix tree, quadtree hoặc k-d tree. Internal node dẫn tới partition child; hợp dữ liệu có cấu trúc phân vùng. Skew có thể tạo cây sâu/partition mất cân bằng; chọn opclass theo data shape.

## GIN và full-text/array/JSON

GIN là inverted index: key element/lexeme ánh xạ sang posting list các heap TID. Từ một query nhiều token, nó kết hợp posting lists rồi recheck semantics. Posting tree lưu list dài. `fastupdate` có thể đưa insert vào pending list để amortize ghi; vacuum/cleanup phải merge pending list, và query có thể chậm nếu list lớn.

`jsonb_ops` index nhiều loại key/value operator tổng quát; `jsonb_path_ops` gọn hơn cho tập containment operators hẹp hơn, không hỗ trợ cùng mọi query. Array containment và full-text dùng operator class khác. `pg_trgm` tạo trigram support cho similarity/LIKE/ILIKE patterns nhưng index selectivity phụ thuộc chuỗi.

## BRIN và summary

BRIN lưu summary cho range liên tiếp của heap block, ví dụ min/max timestamp. Query loại range không thể khớp summary; range còn lại được heap recheck (lossy). Summarization có thể chạy khi insert hoặc bởi `VACUUM`/`brin_summarize_new_values`; pages_per_range tạo tradeoff giữa index size và false positives. Minmax, minmax-multi, inclusion và bloom opclass hợp loại data khác nhau.

## Bảo trì và chọn method

Index có thể bloat, invalid sau `CREATE INDEX CONCURRENTLY` thất bại, hoặc cũ statistics. Theo dõi `pg_stat_user_indexes`, `pg_stat_progress_create_index`, size, query plan và vacuum. `REINDEX` rewrite index; concurrent build giảm write blocking nhưng tốn thời gian/disk và có phases. Đừng giữ index trùng chỉ vì “có thể hữu ích”; mỗi index tăng write amplification và cache footprint.

*PostgreSQL Internals 14*, Part V, mô tả từng access method; current refs: [index types](https://www.postgresql.org/docs/current/indexes-types.html), [B-tree](https://www.postgresql.org/docs/current/btree.html), [GIN](https://www.postgresql.org/docs/current/gin.html), [GiST](https://www.postgresql.org/docs/current/gist.html), [SP-GiST](https://www.postgresql.org/docs/current/spgist.html), [BRIN](https://www.postgresql.org/docs/current/brin.html).


## Đọc sâu Part V: mỗi access method giữ một lời hứa khác nhau

### Hash: bucket, overflow và split theo tải

Hash index băm giá trị thành mã 32-bit rồi tìm bucket tương ứng. Mã hash không chứa giá trị gốc, vì thế va chạm có thể đưa về TID không khớp và PostgreSQL phải kiểm tra lại row trong heap. Đây là index cho phép `=`, không cho range hay order; hash code cũng không thể dùng thay khóa duy nhất.

Mỗi bucket có thể cần nhiều page overflow khi có quá nhiều entry. PostgreSQL mở rộng bảng theo split points thay vì nhân đôi ngay toàn bộ cấu trúc: metadata giữ bucket count, split progress và page allocation; bitmap page giúp cấp overflow page. Khi phân bố hash lệch hoặc nhiều giá trị va chạm, chuỗi overflow dài khiến đọc/ghi chậm. Hash index có WAL từ PostgreSQL 10, nhưng tính năng đó không biến nó thành lựa chọn mặc định: B-tree thường hỗ trợ nhiều query hơn, còn Hash chỉ đáng cân nhắc khi workload equality được đo và index nhỏ hơn/nhanh hơn thật.

Ở mức page, metapage nằm ở block 0; mỗi bucket có bucket page chính, có thể nối overflow pages, còn bitmap pages đánh dấu overflow pages đã rỗng để tái sử dụng. Entries được xếp theo hash code trong từng page để binary search, nhưng chain nhiều page không có thứ tự toàn cục. Khi split, hệ thống thêm bucket mới rồi dùng thêm bit từ hash code để phân phối lại entries của bucket được chọn. Hash index không giảm số bucket khi dữ liệu bị xóa: VACUUM dọn entry chết và có thể gom ngắn chain; muốn giảm footprint thường phải xây lại index. Split ở foreground có thể làm một INSERT tăng latency.

Metapage còn giữ ước lượng `ffactor` (số entry mục tiêu mỗi bucket), `maxbucket`, masks và thông tin các page đã cấp. Trong ví dụ của sách, `highmask` tạo bucket candidate; nếu số đó vượt `maxbucket`, `lowmask` ánh xạ lại vào bucket hiện hữu. Cách này cho phép thêm bucket theo từng split thay vì di chuyển toàn bộ entry khi bảng lớn gấp đôi. Page chính mới được cấp theo các chunk; vì thế số block vật lý có thể tăng theo đợt dù số bucket logic tăng dần. `ffactor` phụ thuộc kích thước page và fillfactor; nó là mục tiêu ước tính, không bảo đảm mỗi bucket chứa được đúng từng ấy row. Duplicate/skew làm một bucket tràn sớm dù tổng số row chưa vượt ngưỡng cân bằng.

Hash operator class cung cấp hàm hash cho kiểu dữ liệu và operator `=` tương ứng. Extension có kiểu mới cần operator class/family tương thích để planner hiểu phép equality nào có thể dùng index. Các khả năng của access method trong PostgreSQL 14 được tóm tắt như sau:

| Khả năng | Hash index |
| --- | --- |
| Equality và bitmap/index scan | Có; bitmap scan vẫn phải recheck row trong heap |
| Range, ordering, clustering, index-only scan | Không |
| Unique index, nhiều key column, `INCLUDE` | Không |
| Exclusion constraint với operator `=` | Có; có thể áp đặt invariant không cho hai key bằng nhau, nhưng không phải unique index |
| `NULL` key và tìm phần tử bên trong array | Không theo access method được mô tả trong sách |

Điểm dễ nhầm là Hash không thể khai báo `UNIQUE`, nhưng có thể dùng trong exclusion constraint với `=`. Đây là khả năng constraint do access method/operator class hỗ trợ, không biến index thành cấu trúc có thứ tự hoặc cung cấp uniqueness theo cơ chế của unique B-tree. Với ứng dụng cần unique key thông thường, chọn unique B-tree. Hash có regular index scan và bitmap scan; bitmap path trả về các heap tuple để recheck. `pageinspect` trong ví dụ sách giúp xem metapage, bucket, overflow và bitmap page, nhưng chỉ nên dùng để học/điều tra đúng phiên bản, không dựa vào layout nội bộ như API ổn định.

### Trace: vì sao thêm bucket không xóa được overflow do skew

Giả sử index bắt đầu với 2 bucket và `ffactor` xấp xỉ 307 entry mỗi bucket. Chèn 500 row có cùng key: hash code giống nhau, nên cả 500 TID dồn vào cùng bucket; bucket chính chứa phần vừa trang, phần còn lại nối qua overflow page. Thêm bucket mới không phân tán lại các key giống nhau.

Sau đó chèn thêm 115 key khác nhau. Tổng số entry là 615, vượt ngưỡng 2 × 307, nên index thêm bucket thứ ba và split một bucket. Những key khác nhau được phân phối vào các bucket theo hash bits; 500 row trùng vẫn đi cùng một bucket. Trace này tách hai nguyên nhân thường bị nhầm: số lượng tổng thể làm bảng tăng số bucket, còn skew của một giá trị làm riêng bucket đó có overflow chain.

### B-tree: tìm, range, split và operator class

Trang internal giữ pivot key để chọn child; leaf giữ key cùng heap TID. Với equality, tìm xuống leaf phù hợp. Với range, tìm đầu khoảng rồi đi theo sibling links đến khi vượt cận. PostgreSQL có thể split page đang đầy; high key và right-link giúp search vẫn đi đúng khi split đã xảy ra nhưng parent chưa được cập nhật. Vì insert đồng thời có thể split nhiều mức, các thuật toán ưu tiên giữ trang nhất quán và giảm khóa dài.

Pivot không nhất thiết lưu toàn bộ key: suffix truncation bỏ phần hậu tố không cần để phân biệt hai nhánh. Non-unique leaf keys có thể deduplicate thành một key và posting list các TID; lợi ích phụ thuộc equality semantics của operator class và dữ liệu duplicate. Operator class định nghĩa so sánh/ordering và hỗ trợ planner dùng `<`, `=`, `>`, range, sort hoặc pattern. Nếu collation hoặc comparison operator không cùng family với index, planner không thể dùng index theo cách ta mong đợi. Index `(a ASC, b DESC)` có thứ tự cụ thể; nó không tương đương một index có hướng khác khi query sort nhiều cột.

### Từ điều kiện đến đường đi trên cây

B-tree cân bằng: mọi leaf ở cùng độ sâu. Mỗi page có nhiều pivot/entry nên cây thường nông; internal pivot chọn child theo khoảng nửa mở `pivot_i ≤ key < pivot_(i+1)`. Khi tìm equality, đi từ root tới leaf rồi tìm key trong page. Key trùng có thể nằm qua nhiều leaf, vì vậy scan phải tiếp tục qua sibling khi còn giá trị bằng nhau. Với range, tìm cận đầu một lần rồi đi dọc linked leaf pages theo hướng phù hợp. Đây là lý do B-tree vừa hỗ trợ equality vừa trả dãy có thứ tự.

Insert xác định leaf theo thứ tự key. Nếu page thiếu chỗ, split chuyển một phần entry sang page mới và cập nhật parent; parent đầy thì split tiếp, có thể tăng chiều cao khi root tách. PostgreSQL gắn sibling links ở các level để traversal còn đi đúng trong lúc cấu trúc đang được cập nhật. Vacuum/pruning có thể dọn entry chết trước khi split, nhưng implementation không gộp hai page thưa thành một sau đó; page split vì vậy có thể để lại footprint lâu dài. B-tree không nhất thiết giữ mọi page đầy, và depth/cost phụ thuộc key width, fillfactor, duplicate rate cùng churn.

Mỗi page có kích thước block cố định. Metapage chỉ ra root hiện tại và level; root có thể đổi page sau split. Trên page không phải rightmost của một level, high key là cận trên của các key tại page đó; nếu concurrent split khiến parent chưa trỏ tới page mới, right-link và high key cho phép search bước sang sibling. High key được lưu ở vị trí thuận tiện cho thao tác page, không phải như một key bình thường cuối danh sách. Internal pivot chỉ cần đủ thông tin để phân nhánh; suffix truncation bỏ các thuộc tính hậu tố không cần thiết khi split leaf. Leaf vẫn cần key đầy đủ, TID và payload `INCLUDE` nếu index-only scan phải trả chúng.

### Deduplication và operator class

Khi leaf thiếu chỗ, PostgreSQL có thể gom nhiều entry cùng key thành một posting tuple chứa danh sách TID. Nó trì hoãn dedup tới lúc cần chỗ để tránh công xử lý khi chưa có lợi ích. Cách này hữu ích cho non-unique index có nhiều duplicate và cũng có thể giảm áp lực split khi index còn giữ TID của nhiều phiên bản row MVCC. Có thể điều khiển bằng `deduplicate_items`. Dedup cần phép so sánh equality tương thích byte image; do đó một số kiểu như floating point, `numeric`, `jsonb`, composite/range/array, nondeterministic collation và index có `INCLUDE` không dùng được. Xem `allequalimage` trong metapage để hiểu khả năng của index cụ thể; đừng suy từ kiểu “có nhiều giá trị trùng” rằng mọi opclass đều dedup được.

B-tree operator class định nghĩa năm strategy operator `<`, `<=`, `=`, `>=`, `>` và support comparator trả -1/0/1. Đây là quy tắc sắp xếp mà cả index, `ORDER BY`, merge join và grouping dựa vào. Vì kiểu mới có thể cần thứ tự tự nhiên khác thứ tự mặc định, sách xây composite `capacity(amount, unit)` rồi định nghĩa comparator đổi đơn vị về byte. Khi đó `(1, 'MB')` lớn hơn `(512, 'kB')`, dù so sánh từng field theo thứ tự từ điển sẽ không cho kết quả mong muốn. Operator class phải giữ tính nhất quán giữa comparator và năm operator; nếu chúng bất đồng, index có thể trả thứ tự sai hoặc planner dùng sai điều kiện.

### Thứ tự cột, direction và NULL

Composite B-tree sắp lexicographic: trước theo cột 1, rồi mới cột 2 khi cột 1 bằng nhau. Vì vậy `(book_ref, passenger_name)` hỗ trợ hiệu quả equality/range trên `book_ref` và query dùng cả hai; filter chỉ `passenger_name` thường không xác định một đoạn liên tục trong cây. PostgreSQL 14 chưa có B-tree skip scan để thay một điều kiện `b = ...` bằng nhiều lần tìm theo từng giá trị phân biệt của cột `a`. Nếu workload thường tìm theo passenger name, index bắt đầu bằng `passenger_name` là cấu trúc khác phục vụ query đó.

Index `(a ASC, b ASC)` đọc xuôi trả cả hai tăng, đọc ngược trả cả hai giảm. Nó không thể trả trực tiếp `a ASC, b DESC`; cần index có direction tương ứng hoặc sort thêm. Với NULL, thứ tự mặc định là `ASC NULLS LAST` và `DESC NULLS FIRST`; khai báo `NULLS FIRST/LAST` khác có thể làm planner không dùng index cho thứ tự yêu cầu. Một phần prefix đã có thứ tự vẫn có thể giúp `Incremental Sort`, nhưng vẫn phát sinh sort trong từng nhóm.

Trong PostgreSQL 14, B-tree có thể sắp xếp, enforce unique, có nhiều key columns, exclusion equality và `INCLUDE`; hỗ trợ regular/bitmap/backward scan và clustering. Đây là access method lõi duy nhất có thể enforce unique và đảm bảo thứ tự tổng quát. Các thuộc tính theo từng key column cho biết hướng, null ordering, orderable, returnable và hỗ trợ tìm nhiều phần tử/null. Kiểm tra bằng `pg_indexam_has_property`, `pg_index_has_property`, `pg_index_column_has_property`; đây là mô tả khả năng, không phải lời hứa planner sẽ chọn index cho mọi query.

### Trace: một composite index phục vụ query nào?

Với `CREATE INDEX ON ticket (booking_ref, passenger_name)`, các entry được sắp theo booking reference trước. Truy vấn một booking ref có thể tìm một đoạn leaf liên tục; thêm passenger name thu hẹp tiếp ngay trong đoạn đó. Chỉ có `WHERE passenger_name = ...` không tạo cận cho cột đầu nên không thể nhảy thẳng đến các tên đó trong cây. Đổi index thành `(passenger_name, booking_ref)` sẽ đảo query nào có đường tìm liên tục.

Nếu index là `(passenger_name ASC, booking_ref ASC)`, scan backward đáp ứng cả hai cột DESC. Nhưng query `passenger_name ASC, booking_ref DESC` cần hướng hỗn hợp; planner có thể dùng index cho prefix passenger name rồi chạy incremental sort cho booking ref. Nếu query còn yêu cầu `passenger_name NULLS FIRST`, index mặc định có thể không khớp thứ tự NULL và một kế hoạch sort khác sẽ cần thiết. Hãy kiểm tra đúng `ORDER BY`, NULL policy và filter thực tế bằng `EXPLAIN`, không chỉ nhìn tên các cột trong index.

### GiST: predicate bao vùng và phép tìm gần

GiST là framework balanced tree. Mỗi internal entry giữ predicate bao các giá trị ở subtree con. Query dùng hàm consistency để quyết định subtree nào có thể khớp; predicate rộng tạo nhiều nhánh phải đi. Với R-tree cho điểm, predicate thường là bounding box: nếu box không giao vùng query thì bỏ cả subtree. Nếu giao thì có thể phải kiểm tra row thật vì bounding box chỉ là approximation.

Operator class quyết định cách `union` tạo predicate cha, `penalty` đo chi phí khi đặt entry vào nhánh, `picksplit` chia page và `consistent` lọc query. Chọn box nhỏ/ít overlap cải thiện cả tree; insert/update liên tục có thể làm predicate mở rộng và index kém chọn lọc, nên rebuild hoặc cách chia dữ liệu có thể cần. Distance support cho phép nearest-neighbor theo thứ tự khoảng cách; exclusion constraint dùng operator class để cấm những cặp giá trị xung đột, ví dụ khoảng thời gian đặt phòng bị overlap. Cùng access method nhưng semantics phụ thuộc opclass.

Hãy nối function với thao tác cụ thể: query gọi `consistent` trên entry; insert dùng `penalty` để chọn child; khi page đầy, `picksplit` chia entry và `union` cập nhật predicate ancestor. Với R-tree, predicate cha là hình chữ nhật bao các điểm con. Query vùng bỏ subtree khi box không giao vùng; box chồng lấn tạo false positive nên heap phải xác minh. RD-tree cho full-text trong sách tạo bit signature cho document và OR signature ở node cha; một bit có thể đại diện nhiều lexeme, vì vậy signature khớp vẫn chưa chứng minh document có từ truy vấn. Các trace này giải thích vì sao chất lượng split và độ phân biệt predicate quyết định số page cần đọc.

#### R-tree: từ điểm địa lý đến query vùng

Với điểm 2D, leaf entry là điểm còn inner entry là bounding box phủ các điểm con. Query điểm nằm trong circle/rectangle đi từ root, chỉ mở subtree có box giao vùng; các box chồng nhau khiến phải xét nhiều subtree. Khi đến leaf, operator class kiểm tra điểm thật. R-tree không thể hứa một nhánh duy nhất như B-tree, và một box rộng có thể biến selective query thành nhiều page read. `penalty` thường ước lượng phần diện tích bounding box tăng thêm khi chèn điểm; `picksplit` cố chia entry sao cho box con nhỏ và overlap ít. `union` tạo box cha chứa toàn bộ con. Đây là heuristic: không có split nào tối ưu mọi query shape.

Trong GiST, block 0 là root chứ không có metapage riêng. Nếu root split, root cũ trở thành child page và block 0 được viết thành root mới. `pageinspect` cho thấy page/entry, còn extension ngoài lõi như `gevel` có thể diễn giải sâu hơn một số cấu trúc; layout nội bộ chỉ nên dùng như công cụ học/diagnostic theo đúng major version.

#### Nearest-neighbor: một thứ tự lower-bound an toàn

Query `ORDER BY point <-> target LIMIT k` là k-nearest-neighbor (KNN), không phải boolean filter. Operator class cung cấp ordering operator và hàm distance. Với leaf point, distance là khoảng cách thật. Với inner bounding box, distance phải là lower bound: khoảng cách từ target tới box, bằng 0 nếu target nằm trong box. Lower bound có thể nhỏ hơn khoảng cách tới mọi point con, khiến cây phải thăm thêm nhánh; nhưng không được lớn hơn khoảng cách thật, nếu không engine có thể bỏ qua một điểm gần hơn và trả kết quả sai.

Access method ưu tiên nhánh có lower-bound nhỏ, giữ candidate tốt nhất, rồi dừng khi mọi nhánh chưa thăm đều có lower-bound lớn hơn candidate thứ k. Vì index scan trả từng row, `LIMIT` có thể dừng sớm mà không sắp toàn bộ bảng. KNN chỉ hoạt động khi opclass khai báo distance ordering phù hợp; GiST trên range có thể hỗ trợ overlap/containment nhưng không nhất thiết có distance ordering. Kiểm tra plan có `Order By` ngay ở Index Scan, nếu không planner sẽ phải sort candidate rows theo cách khác.

#### Exclusion constraint và khả năng thực tế

GiST hỗ trợ exclusion constraint vì operator class có thể định nghĩa một cặp row “xung đột” theo operator giao hoán. Ví dụ reservation dùng `EXCLUDE USING gist (during WITH &&)` để cấm hai khoảng thời gian overlap; point/circle có thể cấm sân bay quá gần nhau. Constraint tạo index tương ứng và kiểm tra cùng lúc với write. Với nhiều cột, có thể kết hợp geometry overlap và `city WITH <>`; `btree_gist` cung cấp GiST operator class cho các kiểu scalar để ghép điều kiện này. Dùng `btree_gist` chỉ để giả lập equality/range trên scalar thường kém B-tree; giá trị của nó là phối hợp scalar với điều kiện GiST khác trong một index/constraint.

| Khả năng trong PostgreSQL 14 | GiST |
| --- | --- |
| Sắp xếp tổng quát / unique | Không |
| Nhiều key column / `INCLUDE` / exclusion constraint | Có, tùy operator class và operator |
| Regular index scan / bitmap scan / backward scan | Có / có / không |
| Cluster bằng index / index-only scan | Có thể cluster; index-only phụ thuộc opclass có trả lại key đầy đủ |
| NULL và KNN distance | NULL được lưu nhưng có thể làm tìm kiếm kém chọn lọc; distance chỉ có khi opclass cung cấp |

`NULL` không làm bounding predicate rộng thêm, nên GiST đặt NULL vào subtree bất kỳ và phải tìm qua cả cây khi query tìm NULL. Đừng suy từ “GiST hỗ trợ index-only scan” rằng mọi opclass đều trả được key: `returnable` và `distance_orderable` là thuộc tính theo column/operator class.

#### RD-tree chữ ký cho full-text

`tsvector` là document đã normalize thành lexeme và vị trí; `tsquery` kết hợp lexeme bằng `&`, `|`, `!`, còn `@@` kiểm tra match. Cấu hình stemming/stop word phải giống nhau khi tạo vector và query. Nếu tạo generated column, gọi `to_tsvector` với cấu hình tường minh để biểu thức immutable và kết quả tái lập. Có thể index expression, nhưng khi GiST recheck row phải tính lại vector; lưu `tsvector` generated có thêm storage nhưng tránh bước xây lại đó.

GiST full-text dùng RD-tree (Russian Doll): predicate cha là tập lexeme bao tập của mọi document con. Liệt kê toàn bộ lexeme cho node lớn có thể vượt page, nên opclass thường dùng signature bitset. Mỗi lexeme bật một bit theo hash; document signature là OR các bit lexeme của nó, node cha là OR signature con. Nếu query yêu cầu bit không có trong signature thì chắc chắn loại; nếu có đủ bit thì vẫn chỉ là ứng viên vì lexeme khác có thể va vào cùng bit. Do vậy signature cho phép false positive nhưng không false negative, và GiST phải heap-recheck từng candidate. Signature dài hơn giảm va chạm/recheck nhưng làm index lớn; signature ngắn tiết kiệm disk nhưng đọc nhiều row thừa. Tăng `siglen` chỉ có ích nếu đo được recheck/I/O đáng kể và disk budget cho phép.

Một query nhiều term hiếm thường tạo ít candidate; term phổ biến làm signature match ở nhiều document. Với `EXPLAIN (ANALYZE, BUFFERS)`, so `Rows Removed by Index Recheck`, actual rows, buffer reads và kích thước index trước/sau khi đổi signature. Trigram (`pg_trgm`) cũng dùng GiST signature cho similarity/LIKE/ILIKE; độ chọn lọc phụ thuộc chuỗi và pattern. Các opclass khác mở rộng GiST cho geometric/cube, range/multirange, inet, `ltree`, `hstore`, integer array qua extension và scalar qua `btree_gist`. Cùng GiST method nhưng khả năng, độ chính xác, NULL và KNN khác theo từng operator class.

### SP-GiST: phân vùng không gian, không bắt buộc cân bằng

SP-GiST (space-partitioned GiST) là một framework cho các cây phân vùng: mỗi node chia miền giá trị thành những vùng không chồng lấn, rồi định tuyến mỗi giá trị xuống một vùng. “Không gian” ở đây là tập giá trị mà operator class quản lý, không nhất thiết là tọa độ Euclid. Quadtree, k-d tree và radix trie đều có thể dùng framework này. Cây không cần cân bằng; đổi lại, cấu trúc tự nhiên của dữ liệu và cách chọn partition quyết định độ sâu cũng như số page phải đọc.

#### Từ query đến leaf

Một inner node giữ prefix hoặc điểm phân chia cùng các liên kết tới node con. Liên kết có thể mang nhãn, chẳng hạn nhãn quadrant hoặc byte đầu tiếp theo. Leaf giữ giá trị đầy đủ hoặc phần suffix còn lại, kèm TID trỏ về heap row. Khi tìm kiếm, `inner_consistent` quyết định những con nào còn có khả năng khớp; `leaf_consistent` kiểm tra ứng viên cuối cùng. Khi chèn, `choose` chọn node con hiện có, yêu cầu tạo con mới, hoặc báo prefix hiện tại không còn phù hợp để framework chia node. Khi leaf page đầy, `picksplit` chia các entry thành nhóm mới.

Framework chịu trách nhiệm các chi tiết cấp thấp như page, khóa đồng thời và WAL; operator class định nghĩa ý nghĩa của prefix, partition và phép kiểm tra. Vì mỗi node có fanout nhỏ hơn B-tree, việc xếp node lên page ảnh hưởng đáng kể đến số lần đọc. Trong SP-GiST, một page có thể chứa nhiều inner node, nên quan hệ giữa node logic và page vật lý không phải một-một. Các leaf gắn với cùng một inner node nằm trên một page; nếu page đầy, danh sách leaf có thể được chuyển sang page khác hoặc được chia, nhưng không trải một nhóm leaf tùy tiện qua nhiều page. Framework tái sử dụng chỗ trống, còn metapage lưu cache các page được dùng gần đây để giảm chi phí cấp phát. Page 0 là metapage, page 1 là root của cây chính; NULL có cây riêng bắt đầu ở page 2. Metapage không chứa con trỏ root. Các công cụ `pageinspect` không cung cấp giao diện kiểm tra SP-GiST tương đương những access method khác; sách nêu `gevel` như extension bên ngoài để xem cấu trúc.

#### Quadtree và k-d tree cho điểm

Với `quad_point_ops`, mặt phẳng 2D được chia quanh centroid thành bốn quadrant. Điểm nằm đúng biên được gán nhất quán vào quadrant có số thứ tự thấp hơn. Một inner node có tối đa bốn con trong mảng cố định, nên một số vị trí có thể rỗng. Query “các điểm ở phía bắc điểm X” chỉ cần đi xuống những quadrant còn có thể chứa điểm thỏa điều kiện; ở leaf, index xác nhận predicate trên điểm thực.

Operator class minh họa các hàm `config`, `choose`, `picksplit`, `inner_consistent` và `leaf_consistent`. Khi leaf page tràn, ví dụ chọn centroid mới từ trung bình tọa độ các điểm rồi phân phối lại vào bốn quadrant. Cách chia này cố gắng tách dữ liệu nhưng không cam kết hai phía cân bằng: một cụm điểm dày hoặc lệch có thể tạo nhánh dài. Quadtree hợp với partition tự nhiên theo vùng; cần kiểm tra độ sâu và buffer thực tế thay vì giả định cây luôn cân bằng.

`kd_point_ops` dùng k-d tree: mỗi node chia theo một giá trị trên một trục, rồi luân phiên trục y/x; với k chiều thì tiếp tục qua các trục. Node thường có hai con và điểm phân chia là prefix. Việc chia lặp lại đến khi mỗi phần vừa leaf page. K-d tree tránh tạo bốn slot cho một lần chia, còn quadtree phân hoạch đồng thời hai trục; hiệu quả cụ thể phụ thuộc phân bố điểm và truy vấn.

#### Radix tree cho chuỗi

SP-GiST `text_ops` gom prefix chung vào inner node. Mỗi liên kết con được gắn nhãn bằng byte tiếp theo; leaf giữ suffix còn lại. Có thể khôi phục chuỗi bằng cách nối các prefix, nhãn và suffix trên đường đi, vì vậy một số index-only scan có thể trả lại giá trị dù leaf không chứa toàn bộ chuỗi. Cấu trúc nén được các đoạn đầu giống nhau, nhưng xử lý chuỗi theo byte và prefix của node có chi phí lưu trữ riêng; không nên diễn giải byte như ký tự Unicode hay giả định mọi collation có cùng thứ tự.

Prefix lookup phù hợp với radix tree hơn một range scan tổng quát. Các pattern operator theo thứ tự byte như `~<~`, `~<=~`, `~>=~`, `~>~` có thể giới hạn nhánh cho pattern kiểu `LIKE 'ivan%'`; cách này không áp dụng quy tắc collation thông thường. Với collation không phải `C`, so sánh ký tự thông thường có thể không tương đương phép so byte. Operator `^@` biểu đạt starts-with trực tiếp và là lựa chọn rõ nghĩa cho truy vấn prefix khi operator class hỗ trợ. Chỉ mục vẫn không biến mọi `LIKE` hay truy vấn khoảng thành thao tác rẻ: wildcard đầu chuỗi, thứ tự collation và số nhánh phù hợp đều quan trọng. Khi chèn chuỗi không khớp prefix hiện có, cây tách prefix chung tại điểm khác nhau rồi tạo liên kết cho byte tiếp theo.

#### Khả năng và kiểu dữ liệu

Các khả năng của SP-GiST phụ thuộc operator class. Với point quadtree trong sách, access method hỗ trợ index scan, bitmap scan và exclusion constraint; không hỗ trợ unique, multicolumn, backward scan hay clustering. Cột không có thứ tự tổng quát để ORDER BY, không hỗ trợ search array, nhưng hỗ trợ tìm NULL qua cây riêng. `quad_point_ops` có thể trả giá trị và hỗ trợ distance ordering/KNN; `text_ops` có thể tái dựng giá trị nhưng không hỗ trợ distance ordering. Do đó không suy ra khả năng KNN chỉ từ việc loại index là SP-GiST.

Các ví dụ khác trong sách cho thấy cùng framework áp dụng được cho nhiều miền: `box_ops` coi hình chữ nhật là điểm trong không gian 4D nên có thể tạo 16 partition; `poly_ops` định tuyến theo bounding box và cần recheck vì hộp bao không mô tả chính xác đa giác; `range_ops` coi hai đầu khoảng là điểm 2D; `inet_ops` dùng radix tree. Với hình học “spaghetti” có nhiều đối tượng chồng lấn, partition không chồng lấn của SP-GiST có thể tránh một số nhánh rộng của GiST. Nhưng phải chọn theo operator class, mức recheck và workload cụ thể. Bảng properties trong PostgreSQL 14 và danh sách operator class là điểm kiểm tra cuối cùng trước khi thiết kế index.

### GIN: inverted index cho giá trị gồm nhiều thành phần

GIN (Generalized Inverted Index) phù hợp khi một giá trị chứa nhiều thành phần có thể tìm riêng: lexeme trong `tsvector`, phần tử trong array, hoặc key/value trong `jsonb`. Thay vì xếp nguyên giá trị như B-tree, GIN lưu mỗi thành phần một lần rồi ánh xạ nó tới các row chứa thành phần đó. Đây giống mục lục cuối sách: tra một từ để lấy danh sách trang, nhưng ở đây danh sách là TID của heap tuple.

#### Entry tree, posting list và page layout

Cây entry được sắp theo key. Mỗi key trỏ tới posting list TID đã sắp thứ tự; list ngắn nằm ngay trong entry, còn list dài chuyển thành posting tree riêng. Vì TID có thứ tự, chúng có thể được nén theo chênh lệch với TID trước đó. Một GIN entry tree không lưu lại document hay array đầy đủ. Cây của key và posting tree của TID là hai cấu trúc có vai trò khác nhau.

Trong ví dụ sách, node nội bộ không lưu key phân cách thấp nhất vì key đó dư thừa; high key vẫn đánh dấu biên trên. Các sibling cùng mức nối một chiều vì traversal đi theo một hướng. `pageinspect` có thể đọc metapage, page flags và entry leaf; metapage thống kê số entry/page và trạng thái pending list. Một leaf entry có thể đại diện cho nhiều TID đã nén chứ không phải một TID đơn. Khi entry tree hoặc posting tree tràn page, page được split và key/TID được phân phối lại.

Một key không cần bị xóa khỏi entry tree ngay khi posting list tạm thời rỗng: key đó có thể xuất hiện ở row khác về sau. Điều này giải thích vì sao GIN tối ưu cho tập key lặp lại và vì sao cleanup/vacuum quan trọng; đừng suy ra rằng mỗi lần xóa row sẽ lập tức loại bỏ toàn bộ dấu vết key khỏi cấu trúc index.

#### Operator class biến dữ liệu thành key

GIN là framework tổng quát; operator class quyết định dữ liệu nào trở thành key và cách các key chứng minh điều kiện query. Về mặt ý tưởng, `extractValue` tách row value thành key; `extractQuery` tách query thành search key; hàm compare sắp key; hàm consistency quyết định tập key đã tìm có thể thỏa predicate hay không. Partial search cần thêm phép so prefix/partial key. Hàm `consistent` có thể trả ứng viên cần recheck; `triConsistent` còn phân biệt key chắc chắn có, chắc chắn không có, hoặc chưa biết để từ chối ứng viên sớm hơn. Tên hàm trong mã nguồn có thể khác theo phiên bản, nhưng vai trò này là hợp đồng của operator class.

Vì GIN chỉ thấy key đã trích xuất chứ không lưu nguyên item, consistency có thể cần heap recheck. Nếu query không có key nào bắt buộc phải tồn tại—ví dụ phủ định một từ—operator class có thể phải xét gần như mọi item. Đó là lý do query phủ định thường không được GIN tăng tốc tốt như query chứa term dương hiếm.

#### Theo dấu một truy vấn full-text

Với `tsvector @@ tsquery`, GIN tách lexeme từ document khi insert và tách search key từ `tsquery` khi đọc. Với query `everywher | oink`, nó tìm posting của hai lexeme, gộp các TID đã sắp, rồi consistency diễn giải phép OR để giữ ứng viên. Cây chỉ giao tiếp key và membership; ý nghĩa `&`, `|`, `!` thuộc operator class.

Tần suất từ quyết định nhiều công việc hơn số từ trong query. Với `farm & cluck`, sách có sáu row chứa `farm` nhưng chỉ hai row chứa `cluck`. GIN có thể lấy `cluck` làm key bắt buộc, rồi chỉ kiểm tra sự hiện diện của `farm` tại những TID đó; các TID thấp hơn ứng viên hiện tại và các đoạn posting không thể chứa kết quả được bỏ qua. Với query `farm & (cluck | chick)`, cần chọn tập key bắt buộc sao cho logic vẫn chính xác; lấy một lexeme hiếm thôi chưa chắc đủ. Term phổ biến đơn lẻ như `wrote` vẫn có thể tạo hàng trăm nghìn kết quả, nên index không thể làm chi phí đọc kết quả biến mất.

GIN hỗ trợ prefix lexeme trong `tsquery`, chẳng hạn `pig:*`; operator class thực hiện partial match qua dãy key đã sắp. Trên workload thật, dùng `ts_stat` để xem số document chứa lexeme và đo bằng `EXPLAIN (ANALYZE, BUFFERS)`, vì “từ hiếm” và “từ phổ biến” phụ thuộc dữ liệu.

#### Ghi dữ liệu và fast update

Một row có thể sinh nhiều key. Một lần insert/update do đó đụng nhiều entry và posting list, nên ghi trực tiếp từng thay đổi vào cây có thể tạo nhiều page write ngẫu nhiên. `fastupdate` gom thay đổi mới vào pending list nằm ngoài entry tree. Search phải xét cả cây chính lẫn pending list; khi list được nhập vào cây, các query đồng thời vẫn phải tránh trả trùng kết quả. Khi pending list vượt ngưỡng, cleanup chuyển các entry vào cây theo lô. Điều này giảm chi phí ghi thường ngày nhưng làm thời gian ghi có lúc tăng vọt và query chậm hơn khi backlog lớn. Vacuum/autovacuum có thể giúp cleanup; tắt `fastupdate` không tự nhập backlog đang có.

Ngưỡng chịu ảnh hưởng bởi `gin_pending_list_limit` ở cấp cấu hình hoặc storage parameter của index. Tạo index mới cũng gom key theo batch trong `maintenance_work_mem`; cấp thêm bộ nhớ có thể giúp build nhanh hơn nhưng phải tính trong tổng ngân sách bộ nhớ bảo trì. Khi chẩn đoán, theo dõi kích thước pending list, thời gian cleanup, số key mỗi row, độ phổ biến lexeme và write amplification. GIN thường hợp workload đọc nhiều hơn ghi; cập nhật một document dài có thể sửa nhiều posting list.

#### Kết quả bitmap và các thuộc tính

GIN trả kết quả qua bitmap, không trả TID tuần tự từng cái. Do đó access method không hỗ trợ ordinary index scan hay backward scan, nhưng hỗ trợ bitmap index scan. `LIMIT 1000` không có nghĩa index chỉ cần dựng 1000 TID đầu: bitmap có thể phải được xây gần như đầy đủ trước khi heap scan áp dụng giới hạn. GIN cũng không cung cấp thứ tự, unique constraint, exclusion constraint hoặc INCLUDE column; multicolumn GIN được hỗ trợ và thứ tự các cột không mang nghĩa prefix như B-tree, vì mỗi key gắn với số thứ tự cột riêng. Với GIN full-text, document không nằm trong index nên index-only scan không thể trả nguyên document.

`gin_fuzzy_search_limit` có thể khiến GIN bỏ ngẫu nhiên một số kết quả để gần đạt giới hạn chỉ định. Kết quả khi bật là xấp xỉ và có thể thay đổi giữa lần chạy; planner không xem đây là semantics chính xác để ước lượng. Không bật nếu ứng dụng cần đầy đủ tập kết quả. Đây không tương đương SQL `LIMIT`.

#### Full-text, trigram, array và JSONB

GIN full-text index hỗ trợ membership của lexeme, nhưng không giữ vị trí của lexeme trong document. Vì vậy nó không tự tăng tốc cụm từ dựa trên khoảng cách từ và không cung cấp thứ tự relevance. PostgreSQL vẫn có thể recheck phrase condition trên heap; tính điểm relevance cho hàng loạt ứng viên cũng có chi phí. RUM là extension ngoài lõi mà sách dùng để minh họa lựa chọn khác: trong implementation sách mô tả, nó không có deferred updates như GIN, nên hỗ trợ regular index scan và ordering operators; nó cũng gắn thông tin bổ sung như vị trí lexeme với key để tăng tốc phrase search và ranking. Đổi lại, index lớn hơn, update chậm hơn và generic WAL của extension tạo thêm chi phí ghi so với WAL tích hợp. Đây là đặc điểm của implementation trong sách; hãy kiểm tra phiên bản extension trước khi áp dụng vào hệ thống hiện tại.

`pg_trgm` tách chuỗi thành trigram để hỗ trợ LIKE/ILIKE, regex và similarity. Các phép tìm này thường tạo ứng viên cần recheck; độ chọn lọc phụ thuộc pattern và chuỗi. Với ngôn ngữ dùng ký tự nhiều byte, trigram nội bộ không phải lúc nào cũng có thể giải mã ngược thành ký tự ban đầu. Trigram phù hợp tìm gần đúng/substring, không thay thế phân tích ngôn ngữ của full-text search.

`array_ops` lập index trên từng phần tử và hỗ trợ overlap `&&`, contains `@>`, contained-by `<@`, equality `=`. Điều kiện contains có thể lọc bằng cách đòi các phần tử query xuất hiện, nhưng equality còn phải xác nhận không có phần tử dư, nên bitmap heap scan thường có recheck. Ví dụ array ngày bay `{2,4,7}` chỉ tạo index cho các phần tử 2, 4, 7; nhiều row chia sẻ chúng làm candidate set rộng. `btree_gin` bổ sung opclass mô phỏng so sánh scalar để ghép cột thường với array trong một GIN đa cột, nhưng không làm phép so sánh scalar hiệu quả hơn B-tree. Chỉ dùng khi lợi ích của một GIN đa cột giải quyết đúng workload.

Với `jsonb`, `jsonb_ops` mặc định lập entry riêng cho key, value và array element. Nó hỗ trợ containment, kiểm tra tồn tại key (`?`, `?|`, `?&`) và các toán tử JSONPath được liệt kê trong tài liệu. `jsonb_path_ops` chỉ hỗ trợ một tập toán tử nhỏ hơn; nó hash đường dẫn từ gốc tới value, nên điều kiện như `{"days_of_week": [6]}` tra đúng tổ hợp path/value thay vì ghép key `days_of_week` với value `6` ở bất kỳ chỗ nào. Cách này thường chọn lọc hơn và index nhỏ hơn cho containment/path query, nhưng không hỗ trợ phép tồn tại key riêng. Hash collision vẫn cần recheck. Chọn opclass bằng cách đối chiếu toàn bộ toán tử ứng dụng cần dùng, không chỉ so kích thước index.

Các extension như `intarray`, `hstore` và `btree_gin` bổ sung operator class cho kiểu dữ liệu riêng. Chương sách cũng nhắc `jsquery` và RUM như lựa chọn bên ngoài; với JSONPath và toán tử lõi trong PostgreSQL 14, ưu tiên kiểm tra khả năng tích hợp sẵn trước khi thêm extension.

### BRIN: dùng summary để bỏ qua block range

BRIN (Block Range Index) chia heap thành các nhóm page liền nhau. Với mỗi nhóm, index lưu summary của giá trị trong nhóm thay vì TID của từng row. Query dùng summary để loại những nhóm chắc chắn không thể chứa kết quả; các nhóm còn lại được trả thành bitmap lossy và heap phải kiểm tra row thật. BRIN vì vậy giống bộ lọc giúp sequential scan bỏ qua phần lớn bảng, không giống B-tree tìm chính xác từng row.

BRIN hợp với bảng rất lớn khi giá trị có tính cục bộ theo vị trí vật lý: các row gần nhau có summary tương tự. Với ngày/ID tăng dần, giá trị cần tương quan với thứ tự page. Bảng vài terabyte nhưng dữ liệu bị xáo trộn có thể nhận ít lợi ích; bảng nhỏ hoặc query trả phần lớn bảng thường hợp scan tuần tự hơn. Ví dụ trong sách nạp dữ liệu chuyến bay gần theo thời gian, rồi truy vấn một ngày; index chỉ vài trăm KB trên bảng vài GB, trong khi B-tree lớn hơn nhiều nhưng lọc chính xác hơn. Số đo đó minh họa trade-off của dataset, không phải hứa hẹn chung.

#### Page layout và đường đi của query

Page 0 là metapage, chứa kích thước range và metadata cấu trúc. Revmap (range map) ánh xạ số thứ tự range tới tuple summary; các summary nằm ở các page khác. Khi revmap cần thêm page, nó có thể chiếm vị trí trước đây dành cho summary và các tuple bị chuyển đi. `pageinspect` cung cấp `brin_metapage_info`, `brin_revmap_data` và `brin_page_items` để quan sát các phần này.

Khi scan, BRIN lần qua revmap và summary. Nếu summary có thể khớp điều kiện, toàn bộ heap pages trong range được thêm vào bitmap; bitmap luôn lossy vì BRIN không giữ TID từng row. Range chưa có summary cũng phải được xem là có thể khớp để không bỏ sót dữ liệu. Heap sau đó được đọc theo range, tuần tự và có thể prefetch. `Rows Removed by Index Recheck`, heap blocks lossy và buffer reads trong `EXPLAIN (ANALYZE, BUFFERS)` cho thấy còn bao nhiêu row/page thừa phải kiểm tra.

`pages_per_range` chọn số heap page mà một summary đại diện. Range nhỏ tạo nhiều summary, index lớn hơn nhưng biên chặt; range lớn giảm dung lượng nhưng thường quét thêm page. Sách đo nhiều ngày khác nhau, dùng `EXPLAIN (FORMAT JSON)` và so phân bố buffer/efficiency thay vì chọn từ một query may mắn. Tối ưu theo query thực, gồm độ dài khoảng thời gian, tần suất giá trị và tỷ lệ heap page phải đọc. Không có một kích thước tối ưu cho mọi bảng.

#### Summary được cập nhật ra sao

Insert vào một range đã summarize gọi hàm add của operator class. Nếu giá trị mới nằm ngoài min/max hiện có, summary phải nới. Nếu tuple summary còn đủ chỗ, cập nhật tại chỗ; nếu không, BRIN ghi tuple mới và sửa revmap. Summary chưa tồn tại thì không thể dùng để loại range, nên correctness vẫn giữ nhưng query phải scan thêm.

Range mới thường được summarize khi VACUUM chạy hoặc khi gọi `brin_summarize_new_values`/`brin_summarize_range`. Có thể yêu cầu summarize range mới ngay khi page xuất hiện bằng cấu hình autosummarize, nhưng điều này làm chậm ingest từng row. Autosummarize gửi yêu cầu tới autovacuum; công việc có thể đến trễ. Sau bulk load, kiểm tra và summarize các range mới nếu workload cần BRIN sớm.

Summarization không khóa bảng khỏi ghi. Sách mô tả cách triển khai bằng placeholder tuple: placeholder được đặt trước lúc quét, các thay đổi đồng thời được gộp vào summary sau khi scan xong. Đây là chi tiết nội bộ, không phải giao kèo API cho mọi minor version. PostgreSQL 14.20 có sửa một lỗi autosummarize trên expression index cần snapshot; lỗi cũ có thể để placeholder tuple sót lại và làm index phình. Vì vậy, nếu summary thiếu hoặc index tăng bất thường, kiểm tra release note đúng minor version và trạng thái các range trước khi kết luận dữ liệu sai. Range chưa summarize vẫn phải được quét nên không bị bỏ sót kết quả.

Summary thông thường chỉ nới, không tự co lại sau DELETE hoặc khi dữ liệu đổi trật tự. PostgreSQL MVCC có thể đặt phiên bản row mới vào page trống ở giữa bảng; chỉ một ít update cũng kéo min/max của range rất rộng. Hạ table `fillfactor` có thể để chỗ cho update tại page gần row cũ nhưng làm heap lớn hơn và không loại bỏ mọi trường hợp. Nếu summary quá rộng, có thể desummarize range rồi summarize lại; chỉ làm khi số liệu cho thấy phạm vi đó gây scan thừa. BRIN hợp nhất với append-heavy/ít update, như bảng sự kiện hoặc kho phân tích.

#### Minmax: giá trị có thứ tự và tương quan vật lý

`minmax` giữ cực tiểu/cực đại cho từng range. Với điều kiện `x >= a AND x < b`, range chỉ bị loại nếu khoảng `[min,max]` chắc chắn không giao `[a,b)`. Các row trong range vẫn cần recheck. Vì thế minmax mạnh nhất khi page order gần với value order. Xem `pg_stats.correlation` là dấu hiệu hữu ích; sách đo timestamp gần 1.0 trong bảng nạp tuần tự, còn mã chuyến bay/người bay gần 0 nên minmax ít chọn lọc. Tương quan cao nhưng chỉ vài giá trị lặp lại cũng có thể không đủ tốt.

Tăng độ chính xác bằng cách giảm `pages_per_range` làm index lớn hơn. Đánh giá nhiều query đại diện và nhiều điểm trong phân bố, rồi so heap blocks, recheck rows, index size và latency. Multicolumn BRIN cho mỗi cột summary độc lập nhưng dùng chung range map/kích thước range; tách thành nhiều index cũng được, planner có thể `BitmapAnd` bitmap của chúng. Chọn multicolumn khi các cột cùng cần một kích thước range; tách khi cần cấu hình khác nhau.

#### Minmax-multi: giữ nhiều cụm giá trị

Một min/max duy nhất bị rộng nhanh khi range chứa nhiều cụm rời xa nhau hoặc update/backfill đặt giá trị mới vào giữa file. `minmax-multi` giữ nhiều điểm/khoảng nhỏ trong mỗi range: cụm chính được tóm tắt chặt, outlier không buộc toàn bộ summary thành một khoảng khổng lồ. Nó hữu ích khi thứ tự vật lý có correlation cục bộ nhưng không còn là một dải đơn giản.

Tham số `values_per_range` giới hạn số điểm/đầu mút mà summary được giữ; khi giới hạn chạm tới, các đoạn được rút gọn/gộp. Trong PostgreSQL 14, mặc định là 32, cho phép từ 8 đến 256. Nhiều value hơn tăng kích thước summary và index nhưng thường giữ chọn lọc tốt hơn. Ví dụ sách thử 16 value cho dữ liệu ngày sau khi update làm minmax thường suy giảm. Chọn bằng workload và giới hạn của opclass trong phiên bản PostgreSQL đang chạy; không mặc định tăng tham số sẽ luôn nhanh hơn.

#### Inclusion: tóm tắt bằng miền bao

`inclusion` dùng khi kiểu dữ liệu có quan hệ chứa/bao nhưng không có thứ tự tuyến tính hữu ích. Summary là giá trị hợp (union) bao tất cả giá trị trong range: bounding box cho `box`, hoặc miền bao cho range/network type. Query như “điểm nằm trong vùng” chỉ loại range khi bounding summary chắc chắn không giao vùng query; bounding box rộng tạo nhiều false positives.

Sách dựng expression index BRIN trên `box(airport_coord)` để minh họa tọa độ, rồi cho thấy planner vẫn chọn sequential scan khi thống kê tương quan không đủ. Ép `enable_seqscan=off` chỉ để thấy bitmap index plan trong bài học; không biến index thành lựa chọn production tốt. Inclusion cần query, dữ liệu và cost estimate phù hợp. Kiểm tra `Rows Removed by Index Recheck`; nhiều row thừa có thể khiến scan toàn bảng rẻ hơn.

#### Bloom: membership xác suất theo range

Bloom summary băm các giá trị trong range thành bit signature. Nếu query value có ít nhất một bit cần thiết chưa bật, range chắc chắn không chứa value đó; nếu đủ bit bật, range có thể chứa nên vẫn phải kiểm tra heap. Bloom có false positive nhưng không false negative. Nó hỗ trợ equality, hữu ích khi giá trị không có thứ tự/correlation kém nhưng nhiều row trong một range chia sẻ số lượng distinct vừa phải.

Hai opclass options là `n_distinct_per_range` (ước lượng số giá trị khác nhau trong range) và `false_positive_rate` (mục tiêu xác suất false positive). PostgreSQL 14 mặc định `n_distinct_per_range = -0.1` (ước lượng theo tỷ lệ row, tối thiểu 16 giá trị) và `false_positive_rate = 0.01`; xác suất cho phép nằm trong 0.0001–0.25. Nếu có `n` giá trị distinct và muốn xác suất false positive `p`, ước lượng chữ ký Bloom cần khoảng `m = -n ln(p) / (ln 2)^2` bit; số hàm băm tối ưu xấp xỉ `(m/n) ln 2`. Đây là mô hình để hiểu trade-off, còn BRIN quản lý kích thước qua options của operator class. Signature lớn hơn giảm dương tính giả nhưng tăng index. Với nhiều giá trị distinct hơn dự kiến, filter bão hòa và loại được ít range. Sách dùng `flight_no` gần như không tương quan để minh họa, thống kê distinct theo range và so hai, bốn, tám page mỗi range. Tham số nên dựa trên distinct thực tế và workload; range nhỏ cũng làm index lớn lên.

Không nhầm BRIN Bloom với extension `bloom`: BRIN tạo một filter riêng cho mỗi column summary trong mỗi block range; extension `bloom` có access method riêng, có thể hash nhiều cột của một row cho truy vấn equality ad hoc. Hai cấu trúc trả lời bài toán khác nhau.

#### Khả năng của access method

Trong PostgreSQL 14, BRIN không sắp thứ tự, không hỗ trợ unique, exclusion hay INCLUDE; nó hỗ trợ multicolumn. Index chỉ scan bằng bitmap, không index scan tuần tự TID, backward scan hay cluster. Cột có thể hỗ trợ search NULL; BRIN không trả giá trị để index-only scan và không order theo distance. Việc bảng có thứ tự vật lý tốt không đồng nghĩa BRIN có lệnh CLUSTER hữu ích; với bảng cực lớn, viết lại toàn bảng tốn thời gian và dung lượng.

### Cách đọc lựa chọn trong sách

Với mỗi access method, sách đi từ câu hỏi đến page: query operator nào được hỗ trợ, metadata/page nào lưu, search chọn nhánh ra sao, insert làm cấu trúc đổi thế nào, và recheck/update ảnh hưởng kết quả/chi phí gì. Hãy kiểm tra operator class trong catalog và dùng `EXPLAIN (ANALYZE, BUFFERS)` trên dữ liệu đại diện. `enable_seqscan=off` có thể giúp xem một đường index trong bài học nhưng không phải cách tuning production.

Tham khảo bản [PostgreSQL 14 Indexes](https://www.postgresql.org/docs/14/indexes.html), [index access methods](https://www.postgresql.org/docs/14/indexes-types.html), [B-tree implementation](https://www.postgresql.org/docs/14/btree.html), [GiST](https://www.postgresql.org/docs/14/gist.html), [SP-GiST và operator class](https://www.postgresql.org/docs/14/spgist-builtin-opclasses.html), [GIN và operator class](https://www.postgresql.org/docs/14/gin-builtin-opclasses.html), [GIN extensibility](https://www.postgresql.org/docs/14/gin-extensibility.html), [BRIN overview và maintenance](https://www.postgresql.org/docs/14/brin-intro.html), [BRIN operator class và parameters](https://www.postgresql.org/docs/14/brin-builtin-opclasses.html), [BRIN extensibility](https://www.postgresql.org/docs/14/brin-extensibility.html), [PostgreSQL 14.20 release notes](https://www.postgresql.org/docs/14/release-14-20.html), và [Hash](https://www.postgresql.org/docs/14/hash-index.html).

## Tự kiểm tra

**GIN lưu row theo thứ tự table?** Không; nó map token/key element tới posting list.

**BRIN có thể tránh heap recheck hoàn toàn?** Thường không; summary lossy chỉ loại page range chắc chắn không match.

**B-tree high key/right-link giúp gì khi split?** Search có thể đi sang sibling đúng khi parent chưa cập nhật xong.

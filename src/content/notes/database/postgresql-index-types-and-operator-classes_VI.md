---
title: "Các loại index PostgreSQL và operator class"
category: "Database"
description: "Chọn B-tree, Hash, GiST, SP-GiST, GIN hoặc BRIN theo phép toán và phân bố dữ liệu."
updated: 2026-10-17
translationKey: "database/postgresql-index-types-and-operator-classes"
---

Index chỉ hữu ích khi cấu trúc của nó hỗ trợ phép so sánh mà query cần và planner thấy đường đó rẻ. PostgreSQL có nhiều access method vì “tìm bằng nhau”, “tìm trong khoảng”, “tìm gần” và “tìm phần tử trong JSON/array” là các bài toán khác nhau.

## B-tree là mặc định cho nhiều query

B-tree hỗ trợ equality, range, sort và prefix phù hợp collation. Composite index `(tenant_id, created_at)` thường phục vụ điều kiện theo tenant rồi khoảng thời gian; thứ tự column quan trọng vì B-tree dùng tiền tố trái. `INCLUDE` có thể thêm payload để index-only scan nhưng tăng dung lượng và write cost. Null ordering, collation và operator class ảnh hưởng tính phù hợp.

## Các access method khác

| Method | Hợp với | Điểm cần cân nhắc |
| --- | --- | --- |
| Hash | Equality | Chỉ equality; WAL-logged trong phiên bản hiện hành, không thay B-tree cho range/sort. |
| GiST | Cây tìm kiếm tổng quát: hình học, range, nearest-neighbor tùy opclass | Semantics do operator class định nghĩa; split/penalty ảnh hưởng chất lượng. |
| SP-GiST | Dữ liệu phân vùng không gian như trie, quad-tree, radix tree | Cần kiểu dữ liệu/opclass phù hợp và phân bố hỗ trợ partition. |
| GIN | Inverted index cho nhiều thành phần: array, full-text, JSONB theo operator class | Ghi/update có thể đắt; pending list và `fastupdate` ảnh hưởng latency. |
| BRIN | Table rất lớn có dữ liệu tương quan với thứ tự vật lý | Nhỏ, lossy; heap recheck là bình thường và hiệu quả phụ thuộc correlation. |

Operator class ánh xạ kiểu dữ liệu và operator sang chiến lược index; operator family gom các class có quan hệ tương thích, chẳng hạn so sánh giữa kiểu. Do đó index có tồn tại nhưng query dùng cast/operator/collation khác vẫn có thể không khớp. Extension như `pg_trgm` thêm operator/index support nhưng cần cài và xác nhận version.

## Chọn qua query thực tế

Với `WHERE email = ...`, unique B-tree phù hợp và còn bảo vệ tính duy nhất. Với `ORDER BY created_at DESC LIMIT 20` theo tenant, composite B-tree có thể lọc và trả thứ tự. Tìm JSONB containment có thể cần GIN với opclass thích hợp. Với bảng append-only hàng tỷ row, BRIN có thể giảm footprint nếu ngày tháng tương quan với vị trí lưu.

Index không miễn phí: mỗi write phải cập nhật index phù hợp, index chiếm cache/disk, planner phải chọn lựa và vacuum/reindex phải bảo trì. Dùng `pg_stat_user_indexes`, `pg_stat_statements`, execution plan và workload representative để đánh giá. Không xóa index chỉ vì `idx_scan = 0` trong cửa sổ ngắn: constraint, rare query hoặc chu kỳ batch có thể cần nó.

## Tạo và thay index an toàn

`CREATE INDEX CONCURRENTLY` giảm thời gian khóa write so với build thường nhưng chạy nhiều phase, có thể thất bại và để invalid index cần kiểm tra. Nó không chạy bên trong transaction block thông thường. `REINDEX CONCURRENTLY` và thao tác partition có quy tắc riêng. Kiểm tra dung lượng tạm, replication lag, tiến độ và trạng thái sau lỗi.

Sách *PostgreSQL Internals 14*, Part V, đi sâu B-tree; tài liệu hiện hành mô tả [index types](https://www.postgresql.org/docs/current/indexes-types.html), [operator classes](https://www.postgresql.org/docs/current/indexes-opclass.html), [multicolumn indexes](https://www.postgresql.org/docs/current/indexes-multicolumn.html), [GIN](https://www.postgresql.org/docs/current/gin.html) và [BRIN](https://www.postgresql.org/docs/current/brin.html).

## Đọc sâu Chương 19: index thực hiện được những phép toán nào?

### Index là cấu trúc phụ, còn access method là hợp đồng

Index có thể xóa rồi dựng lại từ heap; ngoài tăng tốc đọc, nó có thể là cơ chế thực thi `PRIMARY KEY`, `UNIQUE` hoặc exclusion constraint. PostgreSQL 14 có sáu access method lõi: B-tree, Hash, GiST, GIN, SP-GiST và BRIN. Extension có thể thêm method như Bloom mà không sửa core. Dù cách lưu khác nhau, index cuối cùng thường đưa ra TID để indexing engine truy cập heap, kiểm tra visibility theo snapshot và recheck điều kiện nếu method chỉ trả ứng viên gần đúng.

Method không tự hiểu mọi kiểu dữ liệu. `pg_am` cho biết method và handler; operator class (opclass) nối method với một kiểu và tập operator/support function cụ thể. Ví dụ B-tree `text_ops` định nghĩa thứ tự theo collation, còn `text_pattern_ops` dùng so sánh byte phù hợp cho một số prefix pattern. Operator family gom các opclass có semantics tương thích, kể cả phép so sánh giữa kiểu khác nhau; planner có thể dùng family để xử lý `integer` với `bigint` mà không phải cast mọi thứ về cùng kiểu. Tra `pg_opclass`, `pg_opfamily`, `pg_amop` và `pg_amproc` khi một index không được dùng như dự kiến.

### Vì sao `LIKE 'ELENA%'` đôi khi không đi B-tree thường?

B-tree chỉ giúp nếu điều kiện được chuyển thành phép toán mà opclass của index hỗ trợ. Với locale không phải `C`, thứ tự text theo collation không nhất thiết tương đương thứ tự byte của prefix. Ví dụ sách tạo index thường trên `passenger_name`, nhưng planner dùng Seq Scan cho `LIKE 'ELENA%'`; index `text_pattern_ops` cho phép biến prefix thành khoảng so sánh `>= 'ELENA'` và `< 'ELENB'`, sau đó heap recheck `LIKE` để loại ứng viên sai. Hãy kiểm tra `Index Cond` và `Filter` trong plan: index condition thu hẹp vùng tìm, còn filter xác nhận semantics cuối.

Một điều kiện cũng cần đặt indexed expression ở dạng planner nhận diện được: `column operator expression`, hoặc dạng đảo nếu có operator commute phù hợp. `initcap(name) = ...` không dùng index thường trên `name`; expression index trên đúng `initcap(name)` có thể dùng. Hàm trong expression index phải immutable vì kết quả phải ổn định qua thời gian và cấu hình; nếu hàm phụ thuộc dữ liệu khác hoặc locale thay đổi, heap scan và index có thể bất đồng.

### Đọc capability thay vì đoán từ tên method

PostgreSQL cung cấp ba lớp thuộc tính: access-method (`pg_indexam_has_property`), index cụ thể (`pg_index_has_property`) và từng cột (`pg_index_column_has_property`). Chúng trả lời các câu hỏi khác nhau: method có bảo đảm order/unique/multicolumn/INCLUDE không; index cụ thể có regular scan, bitmap scan, backward scan hay clusterability không; cột có sort direction, distance ordering, trả lại value, tìm nhiều phần tử array hoặc NULL được không. Ví dụ GiST có thể cung cấp nearest-neighbor order bằng `<->` nếu opclass khai báo distance support; B-tree có thể trả thứ tự nhưng Hash không. `ORDER BY point <-> query_point LIMIT 3` có thể dừng sau các lá gần nhất nếu GiST hỗ trợ ordering; nếu không, executor phải tính/sort ứng viên.

Unique constraint là quy tắc dữ liệu, unique index là cơ chế cụ thể để đảm bảo quy tắc đó. Exclusion constraint tổng quát hơn: cấm một cặp row đồng thời thỏa operator, thường là `&&` cho khoảng thời gian giao nhau. Không nhầm chúng với nhau: exclusion key không thể thay primary/unique key trong mọi ngữ cảnh như foreign key.

### Composite index và cột INCLUDE có vai trò khác nhau

B-tree `(ticket_no, flight_id)` có thể tìm theo cả hai điều kiện hoặc tiền tố `ticket_no`; điều kiện chỉ trên `flight_id` thường không khoanh vùng hiệu quả vì các key được sắp trước hết theo `ticket_no`. Method khác có thể áp quy tắc multicolumn khác, nên không áp dụng máy móc “leftmost prefix” cho mọi index.

`INCLUDE (status)` thêm payload để trả `status` mà không biến nó thành key so sánh. Một unique index trên `(flight_id) INCLUDE (status)` vẫn chỉ yêu cầu `flight_id` duy nhất; `status` không tham gia uniqueness. Index-only scan còn phụ thuộc visibility map. `INCLUDE` làm leaf lớn, tăng ghi và có giới hạn kích thước tuple, vì vậy chỉ thêm các cột truy vấn thực sự cần.

Operator classes, families và capabilities là tầng hợp đồng giữa kiểu dữ liệu, toán tử, index và planner. Khi plan bỏ index, lần lượt hỏi: có đúng biểu thức/cast/collation không; toán tử có trong opclass/family không; method có capability cần thiết không; index có predicate/partial condition đáp ứng không; rồi mới xét cost và statistics.

Nguồn sách: *PostgreSQL Internals 14*, Chương 19, pp. 357–375. Xem tài liệu PostgreSQL 14 về [index extensibility](https://www.postgresql.org/docs/14/xindex.html), [operator classes](https://www.postgresql.org/docs/14/indexes-opclass.html), [operator families](https://www.postgresql.org/docs/14/xindex.html#XINDEX-OPFAMILY), [collation](https://www.postgresql.org/docs/14/collation.html), [expression indexes](https://www.postgresql.org/docs/14/indexes-expressional.html), và [index-only scans](https://www.postgresql.org/docs/14/indexes-index-only-scans.html).

## Tự kiểm tra

**B-tree composite `(a,b)` có tối ưu query chỉ lọc `b` không?** Thường không hiệu quả như index bắt đầu bằng `b`; kiểm tra planner và version vì có thêm tối ưu đặc thù.

**GIN có luôn tốt hơn B-tree?** Không. Chúng hỗ trợ phép toán khác nhau và GIN có write/storage tradeoff riêng.

**BRIN trả kết quả chính xác từ index luôn?** Không nhất thiết; BRIN thường lọc page range lossy rồi heap recheck.

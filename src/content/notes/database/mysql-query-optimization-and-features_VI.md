---
title: "Tối ưu query và tính năng nâng cao của MySQL"
category: "Database"
description: "Từ optimizer và execution plan đến partition, view, routine và các kiểu query dễ gây bất ngờ trong MySQL."
updated: 2026-10-17
translationKey: "database/mysql-query-optimization-and-features"
---

Khi một API chậm, ta thường nhìn SQL trước. Nhưng tối ưu đúng bắt đầu bằng việc xác định query đang đọc bao nhiêu dòng, đi theo index nào, join theo thứ tự gì và phải sort bao nhiêu dữ liệu. MySQL chọn execution plan dựa trên schema, index, statistics, parameter và chi phí ước lượng; một query “trông gọn” chưa chắc có plan rẻ.

## Đo đúng câu hỏi trước khi viết lại

Phân biệt vấn đề một query với vấn đề toàn server. Slow query log và Performance Schema giúp tìm workload; `SHOW PROCESSLIST`/process list cho biết session đang chạy hay chờ; status counters có thể chỉ ra lượng rows, temporary table, table scan hoặc lock. Counter thường tích lũy theo thời gian, nên so hai snapshot có khoảng thời gian xác định thay vì nhìn một con số đơn.

`EXPLAIN` cho biết optimizer dự định xử lý bảng và join theo thứ tự nào, index nào có thể dùng, access type, ước lượng rows và các bước bổ sung. MySQL 8.4 có `EXPLAIN ANALYZE` để chạy và báo actual timing/rows theo iterator plan; dùng thận trọng với query ghi. Hãy so estimate với actual và tìm node đầu tiên lệch mạnh. Xem [EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/explain.html) và [execution plan](https://dev.mysql.com/doc/refman/8.4/en/execution-plan-information.html).

Query optimization thường là giảm data access: không lấy cột không dùng, không đọc hàng triệu dòng để trả vài chục, đẩy filter sớm khi đúng ngữ nghĩa, và tránh trả về dữ liệu ứng dụng sẽ bỏ. Nhưng không thể chỉ đếm query round-trip: gộp query có thể gửi quá nhiều data, còn tách query có thể tạo N+1 và snapshot khác nhau.

## Join, subquery và optimizer limits

MySQL optimizer có thể chuyển đổi một số subquery, đổi thứ tự inner join, dùng nested-loop, hash join hoặc access path khác. Correlated subquery có thể chạy lặp theo outer row; đôi khi indexed lookup rẻ hơn, đôi khi thành hàng triệu lần lặp. `UNION` thường loại duplicate còn `UNION ALL` giữ duplicate; tránh duplicate elimination khi semantics không yêu cầu.

Index Merge có thể hợp nhất kết quả từ nhiều index nhưng không tự động tốt hơn composite index. Equality propagation có thể suy ra điều kiện từ join, nhưng type conversion/collation có thể làm mất cơ hội dùng index. MySQL Server 8.4 không có parallel scan tổng quát để tự chia mọi SELECT cho nhiều CPU. Một số sản phẩm/engine khác trong hệ MySQL có cách chạy phân tán riêng; chẳng hạn NDB có join pushdown tới data node. Đừng áp hành vi của một sản phẩm sang InnoDB trên MySQL Server. Xem [các kiểu tối ưu SELECT trong MySQL 8.4](https://dev.mysql.com/doc/refman/8.4/en/select-optimization.html).

MySQL 8.4 dùng hash join khi phù hợp; không suy luận điều này từ sách cũ. Join algorithm, memory và plan phải kiểm tra theo version. Hint có thể ép join order hoặc algorithm nhưng làm query nhạy với dữ liệu tương lai; chỉ thêm khi có đo và kế hoạch gỡ bỏ.

## Từng kiểu truy vấn có bẫy riêng

- `COUNT(*)` cần đọc hoặc tổng hợp dữ liệu theo semantics của engine/isolation. Không dựa vào quan niệm MyISAM luôn giữ row count chính xác cho mọi predicate; counter cache cũng cần đồng bộ.
- `GROUP BY`/`DISTINCT` có thể sort hoặc dùng temporary structure; xem actual rows, memory và disk temporary table.
- `LIMIT offset, count` vẫn phải bỏ qua các dòng ở offset. Pagination bằng keyset trên thứ tự ổn định thường scale tốt hơn deep offset.
- `SQL_CALC_FOUND_ROWS`/`FOUND_ROWS()` bị deprecated từ MySQL 8.0.17; tài liệu 8.4 nói chúng có thể bị loại bỏ trong bản tương lai. Thường chạy query lấy page và count riêng hoặc dùng cách khác theo yêu cầu consistency.
- Correlated subquery đôi khi tốt nếu outer set nhỏ và inner có index; đừng rewrite mọi subquery thành join theo quy tắc cứng.
- User-defined variables không đảm bảo evaluation order giữa expressions; pattern ranking bằng biến từ sách cũ nên thay bằng window function nếu version hỗ trợ và semantics phù hợp.

## Partitioning chia một table, không tự chia tải server

MySQL partitioning chia dữ liệu và index của cùng một table theo RANGE, LIST, HASH hoặc KEY; pruning bỏ partition không thể có kết quả phù hợp. Nó có thể giúp quản lý dữ liệu theo thời gian hoặc scan một subset, nhưng query không có điều kiện trên partition key vẫn có thể phải xét nhiều partition.

Partitioning không phải sharding: nó không tự phân phối ghi qua nhiều MySQL server. Trong MySQL 8.4, InnoDB và NDB là các engine cung cấp native partition support. InnoDB partitioned table không tương thích với foreign key references; partition key còn bị ràng buộc với unique/primary keys. Trước khi thiết kế, đọc [partitioning overview](https://dev.mysql.com/doc/refman/8.4/en/partitioning-overview.html), [pruning](https://dev.mysql.com/doc/refman/8.4/en/partitioning-pruning.html) và restrictions. Partition quá nhỏ/nhiều cũng tăng metadata và operation overhead.

## Views, routines, triggers và events

View đóng gói một query và quyền truy cập; optimizer có thể merge view vào query ngoài hoặc materialize tạm tùy cấu trúc. View không tự là materialized result được refresh định kỳ. Một view phức tạp có thể che query plan và giới hạn update.

Stored procedure/function chạy logic trong server, giúp giảm round-trip hoặc đóng gói thao tác, nhưng tạo thêm versioning, deploy, permission, observability và portability concerns. Trigger chạy ngầm khi row đổi nên dễ tạo side effect khó thấy và làm tăng chi phí ghi; giữ trigger nhỏ, dễ tra và kiểm tra thứ tự/cascade. Event scheduler chạy công việc theo thời gian trong chính MySQL server; nó cần giám sát, xử lý retry và tránh chạy trùng sau restart. Cursor xử lý tuần tự trong stored program; set-based SQL thường hiệu quả hơn nhưng không phải lúc nào cũng diễn đạt dễ hiểu.

Foreign key constraints bảo vệ referential integrity và có thể ảnh hưởng locking/DDL. Không tắt constraint để “tăng tốc” nếu chưa có kiểm tra thay thế và quy trình phục hồi dữ liệu lỗi.

## Hai case study cần suy nghĩ theo workload

Một queue table có thể lưu trạng thái, priority, thời gian tạo và worker claim. Nếu nhiều worker chạy `SELECT ... WHERE status='ready' ORDER BY priority LIMIT ... FOR UPDATE`, index cần hỗ trợ filter/order nhưng lock semantics và cách skip locked phụ thuộc version. Cập nhật trạng thái claim phải atomic; nếu worker chết cần lease/visibility timeout, retry và idempotency. Chỉ giữ queue trong MySQL khi throughput, contention, scheduling và recovery phù hợp hơn một broker.

Tính khoảng cách địa lý bằng công thức trên từng row có thể bắt database tính rất nhiều lần. Nếu cần radius search, trước hết tạo bounding box để giảm ứng viên, sau đó tính khoảng cách chính xác; hoặc dùng spatial index/type trong hệ hỗ trợ. Hãy xác định đơn vị, hệ tọa độ, xử lý cực/antimeridian và so sánh độ chính xác, không chỉ tốc độ.


## Các giới hạn trong sách là ảnh chụp của MySQL cũ

Chương 6 mô tả Oracle MySQL 5.5: nhiều câu `IN` bị đổi thành subquery phụ thuộc từng hàng bên ngoài; các join chủ yếu là nested loop; hash join và nhiều phép rewrite còn thiếu. Đây là lịch sử hữu ích để hiểu optimizer phát triển ra sao, nhưng không phải quy tắc cho MySQL 8.4. Bản mới có thể dùng semijoin/antijoin cho `IN`/`EXISTS`, materialize subquery, dùng hash join hoặc dừng sau match đầu tiên. Các phép chuyển đổi có điều kiện, vì vậy hãy xem actual plan thay vì khẳng định “subquery chậm” hay “join luôn nhanh”. [Semijoin và antijoin 8.4](https://dev.mysql.com/doc/refman/8.4/en/semijoins-antijoins.html).

Câu hỏi “có ít nhất một dòng liên quan không?” thường diễn đạt tự nhiên bằng `EXISTS`; `JOIN` có thể nhân bản dòng ngoài khi có nhiều dòng khớp. Nếu kết quả cần một dòng cho mỗi khách hàng, `EXISTS` tránh tạo bản sao rồi mới loại bằng `DISTINCT`. Nếu cần dữ liệu từ cả hai bảng, join diễn tả đúng kết quả. Bắt đầu từ grain của kết quả, rồi đo cách plan tạo ra nó.

`UNION` cần hai lớp suy nghĩ: `UNION` loại trùng, còn `UNION ALL` giữ trùng; loại trùng có thể cần bước tổng hợp. `ORDER BY` cuối xác định thứ tự của kết quả hợp nhất. Đẩy `LIMIT` vào từng nhánh chỉ an toàn nếu chứng minh nó không làm mất hàng có thể lọt vào top cuối; thường cần cùng thứ tự sort, tie-breaker và đủ ứng viên mỗi nhánh. MySQL hiện tại có thể tối ưu/materialize từng dạng khác nhau, nên dùng `EXPLAIN` thay vì cho rằng mọi UNION đều ghi toàn bộ vào một temporary table.

Index Merge ghép kết quả từ nhiều index trên cùng table, chẳng hạn union hoặc intersection. Nó hữu ích khi từng điều kiện có index riêng, nhưng phải đọc nhiều nhánh và kết hợp row identifier; composite index có thể ít việc hơn nếu workload thường kết hợp các điều kiện ấy. So sánh số hàng thực tế và chi phí ghi thêm index. Nhiều index trong plan không tự chứng minh rằng query nhanh hơn.

“Loose scan” trong sách và manual mới có thể chỉ hai chiến lược khác nhau. `LooseScan` của semijoin chọn một đại diện trong nhóm để tránh trả duplicate; loose index scan cho một số `GROUP BY`/MIN/MAX nhảy giữa các nhóm index. Nó không có nghĩa MySQL có thể bỏ qua tùy ý mọi đoạn rời rạc của mọi index. MySQL 8.4 còn có Skip Scan với điều kiện riêng. Đọc đúng operator và điều kiện trong [tài liệu SELECT optimization](https://dev.mysql.com/doc/refman/8.4/en/select-optimization.html).

`MIN()`/`MAX()` có thể rất rẻ nếu index cho phép lấy giá trị đầu/cuối trong nhóm phù hợp; nếu điều kiện lọc không được index hỗ trợ, query vẫn có thể xét nhiều hàng. Đừng thay bằng `LIMIT 1` nếu chưa có thứ tự xác định: giữa nhiều hàng thỏa predicate, hàng tùy ý không chắc chứa giá trị nhỏ nhất/lớn nhất. Muốn viết dạng tương đương, sắp xếp theo cột cực trị và dùng predicate/index phù hợp.

## Hints điều khiển plan cần có bằng chứng và ngày xem lại

Sách liệt kê `STRAIGHT_JOIN`, `USE INDEX`, `FORCE INDEX`, hint sắp nhóm, ưu tiên table lock và cú pháp cũ như `DELAYED`. Trong MySQL 8.4, optimizer hint điều khiển được join order, semijoin strategy, materialization, Index Merge, access method, thời gian chạy và lựa chọn khác. Bật hint chỉ cho phép optimizer dùng một chiến lược nếu đủ điều kiện; không đảm bảo chiến lược đó luôn được chọn. Một số hint lịch sử như `HASH_JOIN` không có tác dụng trong 8.4; index hint cũ đang được thay thế dần bằng cú pháp mới. Kiểm tra đúng release trong [Optimizer Hints 8.4](https://dev.mysql.com/doc/refman/8.4/en/optimizer-hints.html) và [Index Hints 8.4](https://dev.mysql.com/doc/refman/8.4/en/index-hints.html).

Một số modifier trong sách không phải optimizer hint theo nghĩa chặt. `HIGH_PRIORITY`/`LOW_PRIORITY` thay đổi hàng đợi statement trên engine dùng table lock như MyISAM; chúng không cấp thêm CPU hay khiến query chạy nhanh hơn. `SQL_SMALL_RESULT`/`SQL_BIG_RESULT` gợi ý cách xử lý `GROUP BY`/`DISTINCT`, nhưng thường không cần tự ép. `SQL_BUFFER_RESULT` tạo temporary result ở server để có thể nhả table lock sớm khi gửi kết quả lâu; đây khác buffering ở client và đổi lock time lấy RAM/temp I/O phía server. `FOR UPDATE` và `LOCK IN SHARE MODE` điều khiển locking read, không phải cách ép access plan; cú pháp hiện đại là `FOR SHARE`. `INSERT DELAYED` đã deprecated từ 5.6 và trong 8.4 bị bỏ qua với warning, nên không dùng để làm insert bất đồng bộ. [SELECT modifiers 8.4](https://dev.mysql.com/doc/refman/8.4/en/select.html), [locking reads 8.4](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html), [INSERT DELAYED 8.4](https://dev.mysql.com/doc/refman/8.4/en/insert-delayed.html).

Trước khi thêm hint, lưu query, schema, phân bố dữ liệu, statistics, phiên bản, plan dự kiến và plan quan sát được. Đo nhiều lần trên dữ liệu đại diện; ghi lý do, metric cần theo dõi và thời điểm xem lại sau upgrade hoặc đổi dữ liệu. Hint xử lý một quyết định cụ thể; nó không thay việc sửa cardinality estimate sai, index không phù hợp hay query trả quá nhiều dữ liệu.

## Equality propagation và truy vấn cùng bảng

Equality propagation có thể truyền điều kiện qua các cột đã được ràng buộc bằng phép bằng. Nếu `a.id = b.id` và query có `a.id IN (...)`, optimizer có thể suy ra điều kiện tương ứng cho phía `b`, mở thêm access path. Với danh sách rất lớn, việc sao chép và xử lý nhiều giá trị có thể làm lập kế hoạch nặng hơn; đo thời gian optimize riêng với thời gian execute. Đây là hành vi phụ thuộc phiên bản và hình dạng query, không phải lý do để bỏ điều kiện đúng.

Sách cũng chỉ cách cập nhật một bảng bằng kết quả aggregate tính từ chính bảng đó qua derived table đã materialize. MySQL cấm một số dạng vừa sửa bảng vừa đọc chính bảng đó trong subquery, nhưng có ngoại lệ khi derived table được materialize thay vì bị merge. Với dạng `UPDATE target JOIN (SELECT ... FROM target ...) AS summary ...`, kiểm tra plan/materialization trên bản hiện tại. Ghi rõ grain và join key để tránh một dòng đích khớp nhiều dòng aggregate. Đọc [hạn chế subquery trên bảng đích](https://dev.mysql.com/doc/refman/8.4/en/subquery-restrictions.html) và xác nhận kết quả trên dữ liệu thử.

## Static query analysis bổ sung cho đo runtime

Phân tích tĩnh như lint query có thể phát hiện pattern đáng xem lại—`SELECT *`, điều kiện không sargable, query không có giới hạn, hoặc DISTINCT không cần. Sách nhắc `pt-query-advisor`, một công cụ trong hệ sinh thái Percona thời đó; trạng thái hỗ trợ của từng công cụ thay đổi theo thời gian. Static rule chỉ tạo giả thuyết: nó không biết phân bố dữ liệu, cache, độ rộng hàng hay p95 của endpoint. Kết hợp lint với slow log/statement digest và plan runtime; đừng biến mọi cảnh báo thành luật sửa máy móc.

## Tự kiểm tra

**Nếu query dùng index thì nó chắc chắn nhanh?** Không. Nó có thể đọc quá nhiều row ngẫu nhiên; full scan có thể rẻ hơn. Xem actual plan và workload.

**Partition table có thay sharding không?** Không. Partitioning tổ chức một table trong engine; sharding phân dữ liệu trên nhiều server và cần routing/coordination.

**Trigger có làm thay đổi trong cùng transaction không?** Trigger được gọi bởi câu lệnh và thường nằm trong transaction đó, nhưng có thể làm phát sinh thao tác/lock khác mà người gọi không nhìn thấy; cần xem engine, trigger semantics và failure behavior.

Nguồn đọc: *High Performance MySQL*, chương 6–7 và các case study; [MySQL 8.4 optimization](https://dev.mysql.com/doc/refman/8.4/en/optimization.html), [partitioning](https://dev.mysql.com/doc/refman/8.4/en/partitioning.html).

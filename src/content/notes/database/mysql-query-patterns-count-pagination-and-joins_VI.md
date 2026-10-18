---
title: "COUNT, JOIN, GROUP BY và pagination trong MySQL"
category: "Database"
description: "Tối ưu theo lượng dữ liệu thực đọc, chọn cách phân rã query và tránh count/offset đắt."
updated: 2026-10-17
translationKey: "database/mysql-query-patterns-count-pagination-and-joins"
---

Query chậm thường không phải vì SQL “dài”, mà vì server đọc quá nhiều row, sort nhiều dữ liệu, gửi dư bytes hoặc lặp query từ application. Tối ưu bắt đầu bằng ước lượng work: rows examined, rows returned, response size, round trips và lock time. Chọn cách viết theo semantics rồi xác nhận bằng EXPLAIN và benchmark.

## Đọc ít hơn

Tránh `SELECT *` khi chỉ cần vài column; nó tăng I/O, buffer pressure và network, đồng thời có thể làm index-only access không khả thi. Filter sớm bằng predicate sargable; bọc indexed column trong function/cast có thể làm access path kém hơn. Thêm index không cứu được nếu ứng dụng lấy hàng triệu row rồi bỏ.

Response time gồm service time của query và chờ queue/lock/network. Rows examined/returned ratio cho thấy DB làm dư việc, nhưng ratio cao có thể hợp lý nếu filter hiếm. Đo endpoint end-to-end và query riêng.

## Một query phức tạp hay nhiều query nhỏ?

Join database giảm network round trip và cho optimizer quyền chọn thứ tự; nhưng join quá rộng có thể tạo intermediate row lớn. Chia query đôi khi giúp cache hoặc xử lý song song ở application, song nhiều round trip, consistency gap và application merge có giá. Join decomposition hữu ích khi một join khổng lồ buộc đọc nhiều dữ liệu không cần, không phải quy tắc chung.

Kiểm tra join key type/collation, index ở cả hai phía theo access pattern và cardinality. Outer join filter đặt ở `WHERE` có thể đổi semantics thành inner join; predicate đặt `ON` hay `WHERE` phải theo ý nghĩa mong muốn.

## COUNT và summary

`COUNT(*)` đếm row phù hợp và có thể cần đọc index/table; InnoDB không giữ một row count exact rẻ vì transaction visibility khác nhau. `COUNT(column)` bỏ NULL; `COUNT(DISTINCT)` tốn thêm dedup/sort/hash. Nếu UI cần số gần đúng, sampling/summary table có thể giảm work nhưng ghi nhận stale/error semantics.

Counter table cập nhật mỗi request có thể thành hot row và lock contention. Shard counter hoặc cộng batch giảm contention nhưng số đọc không còn instant/exact. Materialized summary tự xây cần transactional update, backfill và reconciliation.

## Pagination và LIMIT

`ORDER BY ... LIMIT` cần thứ tự ổn định có tie-break. `LIMIT 20 OFFSET 100000` vẫn phải đi qua nhiều row trước khi bỏ; keyset pagination dùng điều kiện `(created_at,id) < (?,?)` để tiếp tục từ cursor. Nó nhanh hơn cho deep pages nhưng không cho nhảy trực tiếp tới page index bất kỳ và cần index theo sort/filter.

`SQL_CALC_FOUND_ROWS` lịch sử buộc server tiếp tục tìm toàn bộ kết quả dù chỉ trả một trang; nó bị deprecated từ MySQL 8.0.17. Tách query page và count có thể tốn thêm round trip; cân nhắc count async/cached nếu UX không cần exact tức thì.

## GROUP BY, DISTINCT, UNION

GROUP BY có thể dùng index order hoặc temp table/sort; `DISTINCT` không miễn phí nếu phải deduplicate nhiều row. `UNION` loại duplicate, `UNION ALL` không; chọn theo semantics. `GROUP BY WITH ROLLUP` thêm subtotal levels. Xem EXPLAIN, temporary tables, filesort, rows examined và memory spill.

### Một vòng phân tích có số liệu

Giả sử endpoint lấy 20 đơn gần nhất của một customer nhưng slow log cho thấy query examined 180.000 rows. Đừng bắt đầu bằng thêm index bất kỳ. Trước tiên ghi đúng filter/order và uniqueness: `WHERE customer_id=? ORDER BY created_at DESC, id DESC LIMIT 20`. Sau đó kiểm tra `EXPLAIN`: access type, key, estimated rows, chosen order và extra sort. Index `(customer_id, created_at, id)` có thể giúp filter rồi đọc theo thứ tự, nhưng chiều scan và column direction cần kiểm tra theo MySQL version/query.

Chạy `EXPLAIN ANALYZE` trên dữ liệu đại diện để so actual rows/loops với estimates; nếu estimates sai, kiểm tra histogram/statistics và độ lệch data. Sau thay đổi, đo p95/p99, rows examined, bytes và write cost trong cùng workload. Một index mới không tốt nếu query nhanh hơn 2 ms nhưng làm insert chậm đáng kể hoặc buffer pool phình vượt ngân sách.

Khi query join `orders` với `order_items`, chọn grain trước: một row mỗi order hay một row mỗi item? Join trước aggregation có thể nhân bản order amount theo số items; aggregate items về order trước hoặc tính tổng ở đúng grain. So sánh kết quả bằng dữ liệu nhỏ có 1 order nhiều item để bắt lỗi logic trước khi tuning.

## Case study: queue table

Queue trong MySQL có thể claim task bằng transaction và `SELECT ... FOR UPDATE SKIP LOCKED` ở server hỗ trợ; phải xác nhận version/isolation, index trạng thái+due time, lease, retry và dead-letter behavior. Claim rồi commit nhanh, làm việc ngoài transaction, sau đó update trạng thái bằng task ID/version. Không giữ lock trong suốt xử lý dài; worker crash cần lease hết hạn để task có thể được claim lại.

Case trong sách dùng `UPDATE ... WHERE owner=0 AND status='unsent' LIMIT n` để claim một lô trong một statement, lưu connection ID làm owner, rồi đọc các hàng thuộc owner đó. Cách một statement rút ngắn khoảng giữa “chọn” và “claim”, so với `SELECT ... FOR UPDATE` rồi mới `UPDATE`. Tuy nhiên ownership gắn với connection ID và việc dọn hàng của connection đã mất không phải lease bền vững; connection có thể bị ngắt, ID tái sử dụng và xử lý ngoài transaction có thể kéo dài. Thiết kế hiện đại thường dùng claim token ngẫu nhiên, `claimed_at`/lease deadline, retry count và cập nhật có điều kiện; `SKIP LOCKED` có thể phân phát hàng song song nhưng không đảm bảo fairness tuyệt đối. Không dùng `SLEEP()` + `KILL QUERY` như notification production; đó là mẹo minh họa sách, còn notification/broker phù hợp hơn khi polling thành tải.

*High Performance MySQL*, ch. 6, trình bày rows examined, query decomposition, COUNT/JOIN/GROUP BY/LIMIT, UNION và queue case. Đối chiếu [EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/explain.html), [locking reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html), [SKIP LOCKED](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html#innodb-locking-reads-skip-locked).


## Chia nhỏ query: giảm một loại chi phí, có thể tạo loại khác

Một request có thể lấy bài viết, rồi tác giả, rồi bình luận, tạo thành N+1 query. Gộp bằng join hoặc lấy một nhóm ID qua `IN (...)` thường giảm round trip. Nhưng join lớn có thể nhân số hàng: một bài có 5 comment và 4 tag tạo tới 20 hàng trung gian nếu ghép cả hai quan hệ một lúc. Xác định grain cần trả, gom từng quan hệ riêng khi cần, và đo bytes/result cũng như số lần truy cập.

Tách một join thành vài query đôi khi hữu ích khi từng phần có cache tốt, kết quả được dùng lại, hoặc application xử lý song song mà không tăng tải database. Đổi lại, round trip tăng, app phải ghép dữ liệu, và query ở hai thời điểm có thể nhìn snapshot khác nhau. Nếu tính đúng đắn phụ thuộc mọi dữ liệu thuộc cùng một trạng thái, hãy chạy trong transaction với isolation phù hợp hoặc giữ một query.

Sách nêu các tình huống cụ thể cho join decomposition: object cache có thể bỏ hẳn query hoặc loại ID đã có khỏi `IN` list; lấy ID trước rồi đọc các hàng theo ID có thể giảm truy cập lặp; application có thể ghép dữ liệu từ shard/server khác nhau. Mặt trái cũng quan trọng: cache invalidation giữa các bảng khó hơn, danh sách ID lớn có giới hạn packet và lập plan, các query rời có thể nhìn snapshot không đồng nhất, và app phải xử lý duplicate/missing rows. So tổng công việc server, bytes mạng, cache hit rate, round trip và yêu cầu nhất quán.

“Chopping up a query” trong sách là chia thao tác ghi lớn thành lô nhỏ, chẳng hạn xóa theo khoảng khóa chính. Mỗi lô giới hạn số hàng bị lock, lượng undo/redo và thời gian transaction, giúp replica bắt kịp từng phần. Chọn batch size từ thời gian thực tế và tải; lưu checkpoint sau mỗi batch để có thể tiếp tục. Điều kiện phải ổn định để không bỏ hàng; xét trigger/cascade, foreign key, binlog và retry. Nhiều batch không còn atomic toàn cục: ứng dụng có thể thấy trạng thái dở dang và cần thiết kế idempotent.

## COUNT, nhóm và con số gần đúng

`COUNT(*)` đếm hàng trong result; `COUNT(expression)` chỉ đếm hàng mà expression không phải `NULL`. Vì vậy `COUNT(nullable_column)` không tương đương `COUNT(*)`. `COUNT(DISTINCT x)` còn loại trùng. InnoDB phải tính theo các phiên bản hàng nhìn thấy trong snapshot; nó không thể luôn trả metadata counter chính xác rẻ như nhau cho mọi transaction. Sách lưu ý MyISAM có thể trả nhanh `COUNT(*)` không điều kiện vì engine lưu tổng số hàng, nhưng `COUNT(*) WHERE ...` hay `COUNT(DISTINCT ...)` vẫn phải làm việc.

Nếu người dùng chỉ cần biết có trang tiếp không, lấy `page_size + 1` hàng rồi dùng hàng thừa để hiện nút Next. Nếu số gần đúng chấp nhận được, dùng estimate hoặc counter cập nhật định kỳ và ghi rõ độ trễ/sai số. Nếu cần số chính xác liên tục, summary table/counter phải cập nhật cùng transaction và chịu được hot row, backfill, đối soát. “Nhanh, chính xác, đơn giản” thường buộc sản phẩm chọn trade-off.

Conditional aggregation có thể đếm nhiều nhóm trong một lần scan, chẳng hạn `SUM(color = 'blue')` và `SUM(color = 'red')`, nhưng boolean và `NULL` phải khớp ý nghĩa cần đếm. Đừng copy mẹo cũ `COUNT(boolean OR NULL)` mà chưa kiểm tra NULL, SQL mode và phiên bản. Dùng bảng mẫu nhỏ để chứng minh kết quả trước khi tối ưu.

Chương sách còn minh họa lấy tổng bảng rồi trừ đi số ít hàng bị loại, ví dụ tổng số thành phố trừ nhóm ID nhỏ. Phép biến đổi chỉ rẻ nếu phần tổng thật sự được engine trả rất nhanh và nhóm bị loại nhỏ, có index. Với InnoDB, tổng không điều kiện cũng không mặc nhiên là constant chính xác; hãy so plan và số hàng đọc trước khi dùng phép trừ.

## GROUP BY, DISTINCT và kết quả tất định

Index đúng thứ tự đôi khi cho phép đọc nhóm liền nhau; nếu không, server có thể sort hoặc dùng temporary structure. `GROUP BY ... WITH ROLLUP` thêm hàng tổng phụ ở nhiều cấp. Xem plan và đối chiếu kết quả với phép tính nhỏ. Đừng chọn cột ngoài nhóm một cách tùy ý: nếu `ONLY_FULL_GROUP_BY` không cho phép, hãy xác định functional dependency hoặc dùng aggregate có chủ đích. Thêm `ORDER BY` nếu người dùng cần thứ tự; SQL không hứa thứ tự chỉ vì dữ liệu tình cờ đi theo index.

Tối ưu không được đổi nghĩa. Nếu `orders` có một hàng mỗi đơn và `order_items` có nhiều hàng mỗi đơn, join rồi `SUM(orders.total)` sẽ tính tổng đơn lặp lại. Trước tiên xác định muốn tổng theo đơn hay item; có thể tổng hợp `order_items` về một hàng mỗi đơn rồi join. Kiểm tra bằng dữ liệu mẫu có một đơn với nhiều item để bắt lỗi grain trước benchmark.

## User variables là ví dụ lịch sử, không phải công cụ ranking hiện đại

Sách dùng biến session như `@rank`, `@previous_count` để gán hạng trong một lượt quét; ví dụ cho thấy evaluation stage và query plan có thể ảnh hưởng SQL. MySQL không đảm bảo thứ tự đọc/ghi user variable trong cùng statement. `ORDER BY`, `GROUP BY`, temporary table hoặc optimizer thay đổi có thể làm phép gán chạy ở thời điểm khác dự kiến. Biến còn tồn tại giữa các câu lệnh trên cùng connection, nên giá trị chưa reset có thể rò qua connection pool.

Trong MySQL hiện nay, ưu tiên `ROW_NUMBER()`, `RANK()` hoặc `DENSE_RANK()` với thứ tự xác định. Có thể dùng user variable để mang dữ liệu vào query, nhưng tránh vừa gán vừa đọc cùng biến trong một statement; không dựa vào side effect để ranking, đếm hàng update hoặc tạo “lazy UNION”. Xem [quy tắc user-defined variables 8.4](https://dev.mysql.com/doc/refman/8.4/en/user-variables.html).

Các ví dụ khác trong sách dùng biến để giữ giá trị `NOW()` sau UPDATE, phân biệt nhánh insert/update trong upsert, tính running total/average, hoặc chỉ đọc bảng archive nếu bảng chính không có hàng. Chúng minh họa sức biểu đạt nhưng dựa vào thời điểm expression được thực thi và session state. Cách hiện đại thường giữ input ở application, dùng window function, affected-row metadata, query tách rõ, hoặc transaction với điều kiện xác định. Chỉ giữ mẹo biến khi đã kiểm tra semantics theo đúng driver/version và có lý do đo được.

## Tìm trong bán kính: lọc rẻ trước, tính chính xác sau

Tính Haversine cho mọi hàng có thể tốn CPU và B-tree thường không loại được ứng viên. Cách tiếp cận trong sách có hai bước: dựng bounding box latitude/longitude để lấy ít ứng viên bằng index, sau đó tính khoảng cách chính xác trên tập nhỏ. Bounding box là bộ lọc gần đúng, không phải kết quả cuối; cần predicate khoảng cách chính xác để bỏ các góc vuông nằm ngoài bán kính.

Tọa độ Trái Đất cần xử lý kỹ hơn ví dụ đơn giản: độ rộng kinh độ tương ứng với khoảng cách thay đổi theo vĩ độ; vùng gần cực và đường đổi ngày có thể làm bounding box ngây thơ sai; hệ tọa độ, đơn vị và precision đầu vào quyết định độ chính xác có ý nghĩa tới đâu. Nếu spatial query là workload chính, kiểm tra spatial type/index và hàm trong MySQL đang dùng thay vì tự phát minh mã hóa lưới. Thử điểm biên, cực và antimeridian.

Sách minh họa thêm một cách biến bounding box thành equality prefix: lưu `FLOOR(latitude)` và `FLOOR(longitude)` vào cột phụ, tạo index `(lat_cell, lon_cell)`, rồi tạo danh sách ô bao quanh điểm tìm kiếm. Với tâm khoảng `38.03, -78.48` và bán kính 100 mile, ví dụ sách xét latitude floor 36–40 và longitude floor -80 đến -77. Index dùng các giá trị ô để giảm candidate; predicate tọa độ chính xác hoặc Haversine vẫn phải lọc lại vì các ô tạo ra vùng vuông rộng hơn vòng tròn. Đây là kỹ thuật lưới thô có write-maintenance cost, không phải thay thế spatial index; cần sinh đúng cell ở vĩ độ cao và qua antimeridian.

## Khi SQL không nên làm toàn bộ phép tính

Case UDF trong sách đưa phép tính bit nặng sang chương trình C riêng rồi MySQL gọi qua extension. Ý chính không phải “C luôn nhanh hơn SQL”, mà là chọn đúng nơi xử lý. Trước UDF, thử giảm ứng viên bằng index, dùng hàm native, tính trước dữ liệu dẫn xuất hoặc xử lý batch ngoài database. Native UDF có rủi ro làm crash server, thêm yêu cầu quyền, phụ thuộc ABI/phiên bản và khó deploy. Daemon riêng thêm timeout mạng, retry, protocol và failure mode. Chỉ tách khi profile chứng minh CPU database là nút thắt và đo end-to-end cho thấy có lợi.

Kết quả benchmark trong sách—một daemon C tận dụng SSE4.2 xử lý vài triệu chuỗi trong khoảng thời gian rất ngắn—chỉ là case của workload, phần cứng và code thời đó. Không dùng con số ấy làm dự báo cho hệ thống hiện tại. Bài học có thể tái sử dụng là chuyển phép tính thuần CPU khỏi transaction database khi phép đo cho thấy database đang bị chiếm CPU; sau đó tính cả serialization, network, batching, timeout và chi phí vận hành service mới.

## Tự kiểm tra

**`COUNT(*)` trên InnoDB luôn đọc một counter metadata?** Không; exact count phụ thuộc visibility và có thể cần scan.

**OFFSET pagination có cost không đổi theo page?** Không; offset lớn phải bỏ qua nhiều row.

**Queue worker nên giữ row lock trong lúc gọi API?** Không; claim nhanh, commit, làm việc ngoài transaction rồi ghi kết quả idempotently.

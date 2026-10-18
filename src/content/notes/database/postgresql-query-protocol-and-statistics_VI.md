---
title: "Protocol truy vấn và statistics của PostgreSQL"
category: "Database"
description: "Theo dõi simple/extended protocol, parse-bind-execute, plan cache và cách planner ước lượng cardinality."
updated: 2026-10-17
translationKey: "database/postgresql-query-protocol-and-statistics"
---

Một truy vấn phải đi qua protocol của client trước khi PostgreSQL có thể chọn cách đọc dữ liệu. Sau đó planner dùng thống kê để đoán số hàng và chi phí của từng đường đi. Hai chủ đề gặp nhau khi prepared statement chạy với các parameter khác nhau: protocol có thể giữ statement lại, còn chất lượng plan vẫn phụ thuộc vào cách planner ước lượng dữ liệu.

## Chương 16: từ client protocol đến execution

### Simple Query và Extended Query protocol

Simple Query gửi SQL text trong message `Query`; một message có thể chứa nhiều câu lệnh SQL ngăn bằng dấu chấm phẩy. Extended Query tách các bước `Parse`, `Bind`, `Describe`, `Execute` và `Sync`. `Parse` chuẩn bị statement; `Bind` gắn giá trị parameter vào một portal; `Describe` hỏi metadata; `Execute` chạy portal; `Sync` đánh dấu ranh giới đồng bộ protocol. Driver có thể pipeline các bước để giảm lượt đi-về mạng, còn parameter binding tách dữ liệu khỏi SQL text.

Prepared statement lưu trạng thái trong session/backend. Nếu connection pool dùng transaction pooling và chuyển transaction sang backend khác, statement hoặc portal có thể không còn ở đó, trừ khi pooler hỗ trợ cơ chế tương ứng. Vì vậy, hãy xem protocol cùng topology của pooler thay vì giả định “đã prepare” đồng nghĩa “mọi kết nối đều dùng chung statement”.


Extended protocol giữ parse tree trong bộ nhớ của backend sau `Parse`; đó là cache theo session/backend, không phải cache toàn cluster. Vì vậy backend khác phải parse query riêng, nhưng không tranh một global cache chung. `pg_prepared_statements` chỉ hiển thị statement của session hiện tại; statement unnamed do driver/protocol tạo cũng không nhất thiết xuất hiện như named statement. Connection pool chuyển transaction sang backend khác có thể làm statement/portal không còn tồn tại ở backend mới.

Parameter binding tách giá trị khỏi SQL structure: parse tree đã xác định `$1` là một parameter, nên chuỗi người dùng truyền vào không thể biến thành cú pháp SQL mới như khi nối literal. Nhưng parameter chỉ thay **giá trị**; nó không thay được tên table/column, keyword hay hướng sort. Với identifier động, dùng allowlist/quote identifier đúng cách thay vì nghĩ bind parameter có thể bảo vệ mọi mảnh SQL.

Extended protocol cũng cho client lấy result theo batch qua portal. Batch nhỏ giảm memory ở client nhưng tăng round-trip; batch lớn tận dụng network tốt hơn nhưng giữ nhiều dữ liệu/buffer hơn. Cursor SQL đạt ý tưởng tương tự nhưng cần quản lý transaction và portal; plan có thể ưu tiên `cursor_tuple_fraction` rows đầu tiên, khác với plan tối ưu cho đọc hết kết quả.

### Generic plan và custom plan

Custom plan được tính theo giá trị parameter cụ thể; generic plan được dùng lại mà không tối ưu theo từng giá trị. Giả sử `status='rare'` khớp 2 dòng trong khi `status='active'` khớp 40% bảng. Một plan dùng index có thể phù hợp với trường hợp đầu nhưng kém với trường hợp thứ hai; một generic plan không thể chuyên biệt hoàn hảo cho cả hai. PostgreSQL có thể cân nhắc chi phí giữa generic và custom plan. Khi đo, so cùng query với các parameter đại diện, xem plan thực tế và tách thời gian parse/plan khỏi execution. Prepared statement giảm công chuẩn bị lặp lại trong một số tình huống; nó không bảo đảm query luôn nhanh hơn.


Trong PostgreSQL 14, server thường thử custom plan cho năm lần chạy đầu của prepared statement có parameter. Sau đó nó so chi phí ước lượng trung bình của các custom plan với một generic plan; nếu generic được ước lượng hợp lý hơn khi tính cả chi phí planning lặp lại, server có thể dùng nó về sau. Đây là heuristic dựa trên estimate, không đo actual runtime rồi tự biết mọi lần. Một parameter lệch mạnh có thể làm generic plan tốt cho giá trị phổ biến nhưng tệ cho giá trị hiếm, hoặc ngược lại. Kiểm tra `pg_prepared_statements.generic_plans`/`custom_plans`, dùng parameter đại diện và `EXPLAIN EXECUTE`; PostgreSQL 14 có `plan_cache_mode` để ép thử `force_custom_plan` hoặc `force_generic_plan` khi cần chẩn đoán.

Ví dụ cùng predicate `total_amount > ...`: ngưỡng rất cao chỉ khớp ít booking nên bitmap/index access có thể hợp; ngưỡng thấp khớp gần toàn bảng nên sequential scan thường tốt hơn. Một prepared statement với hai parameter này cần cân bằng lợi ích planning reuse và độ nhạy theo parameter. Benchmark với cùng distribution và concurrency của production; không chọn custom/generic chỉ theo một lần chạy.

## Chương 17: planner xây cardinality estimate ra sao

### Thống kê relation và độ mới của ANALYZE

`pg_class` lưu ước lượng quy mô relation như `reltuples`, `relpages` và `relallvisible`; đây là số liệu planner dùng để tính chi phí, không phải bộ đếm chính xác cho từng truy vấn. `relallvisible` ước lượng số page được visibility map đánh dấu all-visible, giúp planner đánh giá khả năng index-only scan tránh đọc heap. Các giá trị này không cập nhật theo từng row; `ANALYZE`, `VACUUM` và một số lệnh DDL cập nhật chúng, đôi khi từ một phần mẫu rồi nội suy theo kích thước vật lý hiện tại. `ANALYZE` lấy mẫu để xây thống kê cột; autovacuum cũng có thể kích hoạt analyze. Sau khi bulk load hoặc phân phối dữ liệu đổi mạnh, thống kê cũ có thể làm planner đoán sai. Một bảng mới chưa analyze có thể chưa có ước lượng đáng tin; sách minh họa trạng thái này bằng `reltuples = -1`, khác với một bảng đã biết là rỗng.


### ANALYZE lấy mẫu thế nào, và vì sao reltuples có thể cũ?

PostgreSQL không phải đếm từng row của bảng lớn mỗi lần `ANALYZE`. Trong PostgreSQL 14, số row mẫu mục tiêu tỉ lệ với `300 × default_statistics_target`; sampler chọn page ngẫu nhiên rồi lấy row trong các page đó. Vì vậy bảng nhỏ có thể đọc ít page hơn, còn bảng lớn vẫn dùng một mẫu hữu hạn thay vì quét hết. Tăng target cho cột cần đo chi tiết hơn có thể cải thiện MCV/histogram, nhưng tăng thời gian scan mẫu, xử lý và lưu catalog; nó không biến thống kê thành số đếm chính xác.

`reltuples`, `relpages` và `relallvisible` là estimate ở cấp relation. `ANALYZE` và `VACUUM` hiệu chỉnh chúng; một số thao tác như bulk load/rewrite cũng có thể cập nhật hoặc giúp PostgreSQL suy ra quy mô mới. Khi table chưa từng được analyze, `reltuples = -1` nghĩa là chưa có ước lượng đáng tin, không phải “bảng rỗng”; planner phải dùng giả định thô dựa trên page/row width. Khi row bị xóa hoặc thay đổi phân phối sau lần lấy mẫu, estimate có thể đi lệch đến lần analyze kế tiếp. Luôn xác minh bằng actual row count/plan khi chênh lệch ảnh hưởng quyết định, thay vì coi catalog estimate là bộ đếm realtime.

MCV cũng có giới hạn thực dụng: sách ghi PostgreSQL 14 loại một số giá trị lớn hơn khoảng 1 kB khỏi thống kê để tránh làm catalog và planning phình lên. Giá trị lớn/unique vốn khó hữu ích trong danh sách phổ biến; nếu cần estimate tốt cho kiểu dữ liệu đặc biệt, hãy kiểm tra thống kê/operator class và version cụ thể thay vì giả định mọi giá trị đều có thể xuất hiện trong MCV.

### NULL, số giá trị distinct, MCV và histogram

Thống kê cột trong `pg_stats` thường gồm `null_frac`, `n_distinct`, `most_common_vals`, `most_common_freqs` và histogram cho phần giá trị còn lại. Chúng trả lời những câu hỏi khác nhau. Nếu bảng có 10.000 dòng và `null_frac = 0.05`, điều kiện `IS NULL` bắt đầu từ ước lượng khoảng 500 dòng. `n_distinct` dương là ước lượng số giá trị riêng; nếu âm, trị tuyệt đối biểu diễn tỷ lệ distinct trên tổng row. Chẳng hạn `-1` có nghĩa số distinct xấp xỉ số dòng, thường gặp ở cột gần như unique. Nếu một cột có khoảng 100 giá trị distinct và không có thông tin nào tốt hơn, equality với một giá trị không được liệt kê có thể được ước lượng gần theo phân phối đều trên phần còn lại. Nhưng nếu một giá trị xuất hiện quá thường xuyên, MCV ghi riêng giá trị và tần suất của nó để planner không áp dụng giả định đều sai chỗ. Histogram chia phần phân phối còn lại—không gồm các MCV—thành các khoảng có population gần bằng nhau để ước lượng range predicate; nó không thay thế MCV cho các giá trị lệch nổi bật.

Đây chỉ là mô hình lấy từ sample. `default_statistics_target` và target theo cột ảnh hưởng lượng mẫu/chi tiết thu được; tăng target có thể giúp cột lệch mạnh nhưng tốn thời gian analyze và catalog. Hãy điều chỉnh cột có bằng chứng sai lệch thay vì tăng target toàn hệ thống theo cảm tính.

### Kiểu dữ liệu, average width và correlation

Một số kiểu không scalar có thống kê riêng phù hợp với toán tử của kiểu đó. Với array, `pg_stats` có thể chứa `most_common_elems`, tần suất row chứa mỗi element và histogram số element distinct trong array; chúng khác với thống kê về nguyên cả array. Các thống kê này chỉ có ý nghĩa cho operator class/toán tử mà planner biết cách ước lượng. `avg_width` ước lượng kích thước trung bình của giá trị tính bằng byte, ảnh hưởng tới ước lượng kích thước tuple trung gian, sort và dữ liệu truyền qua plan. Sai average width có thể làm đánh giá memory/cost sai dù số dòng gần đúng.

`correlation` trong `pg_stats` mô tả mức độ thứ tự giá trị của một cột khớp với thứ tự vật lý của row trong bảng. Nó không đo quan hệ giữa hai cột. Khi các row thỏa điều kiện nằm gần nhau trên heap, index scan có thể đọc ít page rời rạc hơn; khi chúng rải khắp bảng, heap fetch có thể tốn nhiều I/O hơn. Vì vậy correlation chủ yếu ảnh hưởng cost của access path, không tự nói predicate sẽ khớp bao nhiêu dòng.

### Expression statistics và expression indexes

Thống kê của `email` không tự mô tả phân phối của `lower(email)` hoặc `extract(month FROM timestamp)`. PostgreSQL 14 có thể thu expression statistics bằng `CREATE STATISTICS ... ON (expression) ...` rồi `ANALYZE`; expression index cũng có thống kê riêng cho biểu thức index. Chúng giúp estimate khi query dùng biểu thức tương ứng, nhưng statistics chỉ giúp planner dự đoán—nó không tạo index hay đường truy cập mới. Muốn tăng tốc lookup, cần access path phù hợp; muốn estimate tốt hơn, cần thống kê mà planner hỗ trợ.

Ví dụ, để planner biết phân phối tháng được rút ra từ timestamp:

```sql
CREATE STATISTICS events_month_stats
    ON (extract(month FROM occurred_at))
    FROM events;
ANALYZE events;
```

### Multivariate statistics: dependencies, ndistinct và MCV

Khi query lọc nhiều cột, planner thường cần tránh giả định mọi điều kiện độc lập. Nếu `country='VN'` gần như luôn đi cùng `currency='VND'`, nhân selectivity riêng lẻ có thể đánh giá thấp số dòng. `CREATE STATISTICS` hỗ trợ ba dạng hữu ích: `dependencies` mô tả phụ thuộc hàm; `ndistinct` ước lượng số tổ hợp distinct, hữu ích cho grouping/distinct; multivariate `mcv` giữ các tổ hợp giá trị phổ biến để mô hình hóa skew cụ thể. PostgreSQL 14 thu chúng từ sample khi chạy `ANALYZE`; tạo statistics object chỉ khai báo muốn thu loại thống kê nào. Chọn nhóm cột có lý do thay vì mọi tổ hợp. Đây là thống kê, không phải constraint: nó không bảo đảm dữ liệu tuân theo quan hệ đó. Trong PostgreSQL 14, extended statistics chưa được dùng cho selectivity estimate của join giữa các bảng; functional dependencies cũng chỉ áp dụng cho một số điều kiện equality với constant/`IN`, không tự sửa estimate của range hay mọi biểu thức.

```sql
CREATE STATISTICS orders_geo_stats (dependencies, mcv)
    ON country, currency
    FROM orders;
ANALYZE orders;
```

Trong ví dụ bảng `flights` của sách, điều kiện `flight_no='PG0007' AND departure_airport='VKO'` có 396 dòng thật nhưng estimate ban đầu chỉ 15 vì giả định độc lập. Sau khi tạo và thu extended statistics, estimate tăng lên 277—gần thực tế hơn nhưng vẫn không chính xác tuyệt đối. Bài học là statistics có thể sửa một giả định sai có hệ thống; vẫn phải đo estimated so với actual trên workload thật.

## Tìm điểm estimate bắt đầu sai

Trong `EXPLAIN ANALYZE`, đối chiếu `rows` ước lượng với `actual rows` tại từng node. Với node chạy nhiều lần, nhân actual rows với `loops` để hiểu tổng số hàng được xử lý. Tìm node đầu tiên có chênh lệch lớn; sai số ở node đó có thể lan qua join và khiến planner chọn thứ tự hoặc thuật toán khác. Kiểm tra thời điểm `ANALYZE`, skew, MCV/histogram, tương quan cột, expression, parameter và target trước khi thử ép plan.

`EXPLAIN ANALYZE` thực sự chạy câu lệnh. Nếu đó là `UPDATE` hay `DELETE`, dữ liệu sẽ bị sửa; transaction rollback bảo vệ thay đổi trong PostgreSQL nhưng không nhất thiết hoàn tác side effect bên ngoài từ function hoặc trigger. Hãy dùng bản sao dữ liệu hoặc cách kiểm tra an toàn phù hợp.

Nguồn theo version: *PostgreSQL Internals 14*, Part IV, ch. 16–17. Tài liệu PostgreSQL 14: [protocol](https://www.postgresql.org/docs/14/protocol.html), [planner statistics](https://www.postgresql.org/docs/14/planner-stats.html), [pg_stats columns](https://www.postgresql.org/docs/14/view-pg-stats.html), [CREATE STATISTICS](https://www.postgresql.org/docs/14/sql-createstatistics.html), và [PREPARE](https://www.postgresql.org/docs/14/sql-prepare.html).

## Tự kiểm tra

**Prepared statement có luôn plan lại theo parameter?** Không; generic/custom plan behavior phụ thuộc server và workload.

**Histogram thay được MCV cho dữ liệu lệch?** Không; chúng trả lời dạng phân phối khác nhau.

**Extended statistics có làm query chạy nhanh trực tiếp?** Chúng cải thiện estimate; planner mới có thể chọn plan tốt hơn.

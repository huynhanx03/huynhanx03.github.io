---
title: "Planner và executor của PostgreSQL"
category: "Database"
description: "Đọc đường đi của query qua parse, plan, scan, join, sort và parallel execution."
updated: 2026-10-17
translationKey: "database/postgresql-query-planner-and-execution"
---

Hai câu SQL cho cùng kết quả có thể mất thời gian rất khác nhau vì PostgreSQL chọn **kế hoạch thực thi** dựa trên thống kê và chi phí ước lượng. Planner không đoán bằng cú pháp đẹp; nó ước lượng số row, page I/O, CPU và khả năng song song rồi chọn giữa nhiều đường đi. Khi query chậm, kế hoạch thực tế giúp ta kiểm tra giả định nào sai.

## Từ câu SQL đến plan

Parser kiểm tra cú pháp; analyzer phân giải table, column và kiểu; rewrite xử lý view/rule; planner tạo các phương án scan, join, sort và aggregate; executor chạy plan node. Prepared statement có thể dùng custom plan dựa trên giá trị bind hoặc generic plan dùng chung; parameter-sensitive workload có thể khiến một plan không hợp cho mọi giá trị.

`EXPLAIN` hiển thị dự đoán. `EXPLAIN (ANALYZE, BUFFERS)` thực thi query rồi báo thời gian/row thực tế và buffer; với câu ghi, query thực sự được chạy nên dùng transaction rollback hoặc môi trường thử nghiệm. `ANALYZE` trong tùy chọn này có nghĩa thực thi đo đạc, khác lệnh `ANALYZE` cập nhật thống kê.

## Scan và thống kê

Sequential scan đọc heap; index scan đi từ index đến tuple; bitmap scan gom địa chỉ heap rồi đọc page theo cụm. Index không luôn nhanh hơn: nếu cần nhiều row rải rác, random access có thể đắt hơn tuần tự. Visibility map giúp index-only scan bỏ heap fetch khi page đủ điều kiện.

Planner dựa vào thống kê `ANALYZE`: histogram, most-common values, null fraction, distinct estimate và correlation. Nếu estimated rows khác actual rows nhiều, join order và memory plan có thể lệch. Dữ liệu tương quan giữa nhiều column cần extended statistics ở trường hợp phù hợp. Sau data skew hoặc bulk load, cập nhật thống kê rồi so sánh lại.

## Join, sort và memory

Nested loop tốt khi outer nhỏ và inner có index; hash join xây hash table cho một phía rồi dò phía kia; merge join tận dụng input đã sắp xếp. Planner chọn theo kích thước ước lượng và chi phí. Sai cardinality có thể làm nested loop lặp hàng triệu lần hoặc hash tràn ra disk.

Sort/hash node dùng `work_mem` cho mỗi operation/node và mỗi worker, không phải mức trần tổng của server. Nâng quá cao với nhiều connection/song song có thể gây OOM. Kiểm tra `Sort Method`, disk spill, hash batches và temp file trước khi tăng cấu hình. Parallel plan có thể giảm thời gian một query nhưng thêm worker/CPU và không phù hợp mọi node hay workload.

## Quy trình đọc EXPLAIN

Đọc từ node con lên cha: `actual rows × loops` xấp xỉ lượng công việc lặp. So estimated với actual rows tại node sớm nhất sai lệch lớn; nó thường là nguồn khiến các node phía trên chọn đường tệ. Xem buffer hit/read, heap fetch, recheck, temp I/O và thời gian startup/total. Đừng chỉ nhìn cost: cost là đơn vị tương đối nội bộ, không phải milliseconds.

Ví dụ, nếu filter được 20 row nhưng planner dự đoán 20.000, kiểm tra thống kê, kiểu cast, biểu thức và skew trước khi ép index. Nếu actual scan đọc phần lớn table, sequential scan có thể là lựa chọn đúng dù index tồn tại.

Sách *PostgreSQL Internals 14*, Part IV, trình bày planner/executor và các access method. Tham khảo [using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html), [planner statistics](https://www.postgresql.org/docs/current/planner-stats.html), [runtime query configuration](https://www.postgresql.org/docs/current/runtime-config-query.html).


## Đọc sâu Chương 16: plan là một pipeline có đánh đổi

### Parse tree khác execution plan

SQL mô tả kết quả cần lấy, không mô tả từng bước đọc dữ liệu. Sau lexical/syntax parsing, PostgreSQL có abstract syntax tree; semantic analysis phân giải tên table/column, kiểu dữ liệu và quyền truy cập. Rewrite stage mở rộng view thành query nền, xử lý rule và một số phép biến đổi như row-level security. Planner nhận biểu diễn đã rewrite rồi mới tạo plan tree gồm các node như `Seq Scan`, `Index Scan`, `Nested Loop`, `Sort`.

Tên `Range Table Entry` (RTE) trong source không chỉ có nghĩa một table vật lý: nó có thể đại diện table, subquery hoặc kết quả join — một nguồn row mà các toán tử phía trên tiêu thụ. Vì thế cây cú pháp ban đầu và cây plan không phải cùng một cấu trúc. Một view có thể biến mất khỏi plan và thay bằng các relation nền; query planner có thể đổi thứ tự join hay thuật toán mà vẫn giữ cùng kết quả logic.

### Không thể thử mọi plan

Với mỗi cặp row source, planner có thể chọn nested loop, hash join hoặc merge join; khi có nhiều bảng, còn phải xét thứ tự ghép. Số tổ hợp tăng rất nhanh nên PostgreSQL không duyệt hết mọi plan. Dynamic programming với heuristic tìm kiếm phương án trong thời gian hợp lý; khi số relation lớn vượt `geqo_threshold`, PostgreSQL có thể chuyển sang GEQO, một thuật toán di truyền nhanh hơn nhưng không bảo đảm tìm được plan tối ưu toàn cục. Đây là các giới hạn tìm kiếm trong sách/version, không phải lời hứa rằng plan tối ưu đã được tìm thấy.

`join_collapse_limit` chi phối việc planner làm phẳng cấu trúc join viết trong SQL; đặt bằng 1 có thể giữ thứ tự join tường minh để thu hẹp tìm kiếm. `from_collapse_limit` điều khiển việc làm phẳng subquery tương tự. CTE có thể được tối ưu cùng query hoặc tạo ranh giới tùy version và cách khai báo (`MATERIALIZED`/`NOT MATERIALIZED`); SQL function có thể inline trong một số điều kiện. Ép thứ tự join có thể giúp planner khi estimate sai, nhưng cũng có thể khóa mất một plan tốt hơn khi dữ liệu đổi. Chỉ điều chỉnh sau khi `EXPLAIN (ANALYZE)` chứng minh vấn đề.

### Startup cost và total cost trả lời câu hỏi khác nhau

Một plan có thể tốn nhiều công trước khi trả row đầu tiên (ví dụ sort cần đọc gần hết input), nhưng sau đó trả các row còn lại nhanh. Plan khác có thể có startup thấp nhưng total cost cao. Nếu client cần toàn bộ kết quả, planner thường tối ưu total cost. Nếu dùng cursor, planner cân nhắc lấy sớm một phần kết quả qua `cursor_tuple_fraction`; ở mặc định PostgreSQL 14 là 0.1. Mô hình lựa chọn là `startup_cost + fraction × (total_cost - startup_cost)`, nên plan “row đầu tiên nhanh” có thể khác plan “đọc hết nhanh”. Startup cost không đơn giản là thời gian thực tế của row đầu tiên: đó là phần ước lượng của các prerequisite trước khi node trả dữ liệu.

### Cost bắt đầu từ cardinality và selectivity

Với mỗi node, planner ước lượng input rows rồi nhân với selectivity của điều kiện để ra số output rows. Scan leaf dựa vào kích thước relation và column statistics; filter kết hợp điều kiện có thể phải giả định độc lập nếu thiếu extended statistics. Join estimate dựa trên cardinality hai phía và selectivity điều kiện join. Sai số sớm lan lên các node cha: planner có thể chọn nested loop cho outer thực tế rất lớn hoặc cấp memory không đủ cho hash/sort.

Cost subtree được tính đệ quy: tổng cost của child cộng cost riêng của node theo số row/page ước lượng, loại operation và các cost parameter. `startup cost`/`total cost` là đơn vị nội bộ tương đối, không phải milliseconds. Một sort thường có startup cao vì phải đọc và sắp xếp input trước khi trả output; nested loop có thể trả dòng đầu sớm nhưng lặp inner operation nhiều lần. Đọc `rows`, `width`, `loops` và buffer I/O cùng nhau để hiểu giả định nào đang chi phối.

### Executor kéo row từ dưới lên

Plan tree thường vận hành theo mô hình demand/pull. Root yêu cầu row từ child; child có thể tiếp tục yêu cầu từ node thấp hơn. Scan tạo tuple, filter loại hoặc giữ tuple, join lấy tuple từ hai phía, rồi node cha xử lý tiếp. Một `Sort` thường phải tiêu thụ input trước khi output; `Nested Loop` có thể tạo kết quả ngay khi tìm được cặp khớp. Vì vậy plan không chạy đơn giản “từ trên xuống” như cây thư mục; root bắt đầu yêu cầu công việc, còn dữ liệu đi ngược từ leaf lên root. `EXPLAIN ANALYZE` đo các node trong mô hình này, và `loops` cho biết node được gọi lặp bao nhiêu lần.

## Tự kiểm tra

**Cost 100 có nghĩa query chạy 100 ms?** Không. Cost là thước đo tương đối để planner so plan.

**Có index thì planner phải dùng index?** Không. Sequential scan có thể rẻ hơn khi cần nhiều row.

**`work_mem = 64MB` giới hạn toàn server ở 64MB?** Không. Nó áp dụng cho operation và có thể nhân lên theo node, worker, query và connection.

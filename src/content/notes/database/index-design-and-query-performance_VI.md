---
title: "Thiết kế index và đo hiệu năng truy vấn"
category: "Database"
description: "Chọn index theo điều kiện lọc và thứ tự truy vấn, rồi kiểm tra lợi ích bằng workload và phép đo có thể lặp lại."
updated: 2026-10-17
translationKey: "database/index-design-and-query-performance"
---

Một index có thể biến truy vấn từ quét hàng triệu dòng thành vài lần đọc page. Cũng index ấy có thể làm mỗi lần ghi đắt hơn, dùng thêm RAM và khiến optimizer phải chọn giữa nhiều access path. Thiết kế index là bài toán workload: xác định truy vấn quan trọng, hiểu thứ tự dữ liệu, rồi đo tác động lên cả đọc lẫn ghi.

## Bắt đầu từ truy vấn, không bắt đầu từ danh sách cột

Ghi lại truy vấn cùng điều kiện, thứ tự kết quả và số dòng trả về. Một truy vấn như:

```sql
SELECT order_id, created_at, total
FROM orders
WHERE tenant_id = 12 AND status = 'paid'
ORDER BY created_at DESC
LIMIT 30;
```

cần lọc theo tenant và trạng thái, lấy các đơn gần nhất, rồi dừng sau 30 dòng. Index `(tenant_id, status, created_at)` có thể hỗ trợ đường đi này trong một số engine, nhưng hướng sắp xếp, kiểu dữ liệu, collation, thống kê, độ chọn lọc và optimizer đều ảnh hưởng kết quả. Đây là giả thuyết để kiểm tra, không phải quy tắc “cột WHERE vào trước, ORDER BY vào cuối” áp dụng không điều kiện.

## Selectivity và số page thực sự phải đọc

Điều kiện khớp ít dòng thường có thể hưởng lợi từ index hơn điều kiện khớp phần lớn bảng. **Selectivity** mô tả mức độ điều kiện thu hẹp dữ liệu. Nhưng số dòng thôi chưa đủ: các dòng có thể nằm rải rác trên rất nhiều page, hoặc nằm liền nhau; dữ liệu cần trả có thể nằm ngay trong index hoặc cần lookup thêm vào heap/table.

Index trên cột boolean thường ít chọn lọc nếu giá trị chia gần đều. Index đó vẫn hữu ích trong một số trường hợp nếu workload chủ yếu truy vấn một giá trị hiếm hoặc index có predicate riêng (partial/filtered index ở hệ hỗ trợ). Chỉ đo trên phân bố dữ liệu thực.

Điều kiện nên cho phép engine dùng index. Bọc cột trong hàm, ép kiểu ngầm, so sánh không phù hợp với collation hoặc dùng wildcard ở đầu chuỗi có thể ngăn access path mong muốn, tùy engine. Không nên viết lại truy vấn bằng một mẹo cú pháp nếu chưa xác nhận plan và ngữ nghĩa vẫn như cũ.

## Composite index có thứ tự

Index nhiều cột được sắp theo thứ tự key đã định nghĩa. Với `(a, b, c)`, engine thường có thể tận dụng prefix `(a)` và `(a, b)`; nó không tương đương một index chỉ có `(b)` hoặc `(c)`. Điều kiện equality trên prefix rồi range trên cột sau thường tạo một vùng index liên tiếp, nhưng quy tắc chính xác phụ thuộc access method.

Thứ tự cột cần cân bằng nhiều query. Cột có selectivity cao không tự động phải đứng đầu; prefix nào được workload dùng, điều kiện equality/range, sorting và kích thước index đều quan trọng. Một index lớn có thể hỗ trợ nhiều truy vấn nhưng cũng tăng chi phí ghi và cache pressure.

## Covering, clustered và index-only access

Nếu truy vấn cần `order_id`, `created_at`, `total`, có thể đưa đủ thông tin vào index để tránh đọc dòng chính. Đây là **covering index** theo cách gọi phổ biến. Một số engine cho phép cột include không tham gia sắp xếp key; một số khác có quy tắc riêng. Index càng rộng thì càng ít entry trên page, lớn hơn trong cache và đắt hơn khi ghi.

Trong **clustered storage**, thứ tự primary key cũng quyết định cách dữ liệu bảng được tổ chức. InnoDB lưu row theo clustered index; một secondary index có thể mang khóa chính để tìm lại row. PostgreSQL heap không tự duy trì thứ tự vật lý theo B-tree. Những khác biệt này ảnh hưởng độ rộng secondary index, random I/O và cách chọn primary key.

Index-only scan chỉ tránh heap/table khi điều kiện hiển thị và nội dung index đủ đáp ứng. Trong PostgreSQL, visibility map ảnh hưởng khả năng bỏ qua heap; trong engine khác cơ chế khác. Hãy đọc plan thay vì suy luận từ tên index.

## Mỗi index cũng là một write path

Insert, delete và nhiều update phải thay đổi index. Nếu update cột không thuộc một index, một số engine có thể tránh sửa index đó; nếu indexed key đổi, cấu trúc phải được cập nhật. Nhiều index làm tăng storage, buffer/cache footprint, WAL/redo và thời gian bảo trì.

Index trùng lặp hoặc không được dùng có thể là chi phí thuần. Trước khi xóa index, quan sát đủ lâu để bao phủ workload theo lịch, kiểm tra constraint/foreign key và khả năng query hiếm. Index “unused” trong một cửa sổ ngắn có thể vẫn cần cho batch tháng hoặc phục hồi.

## Đo workload thay vì benchmark một câu lệnh

Benchmark cần trả lời câu hỏi xác định. Ví dụ: “Index mới giảm p95 của truy vấn lịch sử mà không làm throughput ghi giảm quá 5% dưới 400 kết nối đồng thời.” Sau đó giữ ổn định dữ liệu, cache, concurrency, phần cứng, phiên bản và cấu hình.

Một phép đo đáng tin cậy cần:

- Query mix gần production, không chỉ một truy vấn thuận lợi.
- Dữ liệu có kích thước, skew và độ tuổi tương tự thực tế.
- Warm cache hoặc cold cache được chọn rõ và giữ nhất quán.
- Throughput, latency distribution (ít nhất p50/p95/p99), lỗi, CPU, I/O, lock wait, memory và temporary spill.
- Chạy đủ lâu để qua giai đoạn khởi động và dao động ngắn; lặp lại để nhận ra nhiễu.
- Một thay đổi chính mỗi lần; lưu plan, cấu hình và phiên bản để so sánh lại.

Đo microbenchmark giúp cô lập một thao tác, nhưng không dự đoán đầy đủ ứng dụng. End-to-end benchmark cho thấy tương tác giữa client, connection pool, network, database và storage; đổi lại khó quy nguyên nhân nếu thiếu profile. Chọn công cụ theo câu hỏi.

## Profile để tìm phần tốn thời gian

Slow query log, query statistics và execution plan giúp tìm câu lệnh đáng điều tra. Server-wide metrics cho biết vấn đề chỉ nằm ở một query hay toàn instance: connection saturation, buffer miss, lock wait, checkpoint, redo/WAL pressure, disk latency hoặc CPU. Snapshot status cần khoảng thời gian và baseline; counter tích lũy từ khi khởi động không tự nói điều gì xảy ra trong một phút vừa rồi.

Khi truy vấn chậm bất chợt, thu thập plan, parameter, số dòng actual, wait/event, trạng thái transaction và tài nguyên máy gần cùng thời điểm. Sampling tránh overhead quá lớn nhưng có thể bỏ lỡ sự kiện ngắn. Công cụ profiling như `strace` có thể giúp khi nghi ngờ system call hoặc file I/O, nhưng cần diễn giải cùng workload và quyền hạn phù hợp.

Một hệ thống có thể trả lời chậm dù database query time thấp: round trip nhiều, ứng dụng tải thừa dữ liệu, connection pool xếp hàng hoặc JSON serialization tốn CPU. Đo cả từng lớp trước khi quy lỗi cho index.

## Tối ưu có thể làm truy vấn sai

Thay join bằng nhiều query có thể giảm dữ liệu trung gian nhưng tăng round trips hoặc làm snapshot khác nhau. Cache kết quả có thể nhanh nhưng thêm invalidation và stale-data behavior. Summary table giảm phép tính đọc nhưng cần cập nhật nhất quán. Materialized view giúp đọc nhưng có thời gian refresh. Mỗi tối ưu đổi một chi phí lấy một chi phí khác.

Trước khi phát hành, so kết quả và transaction semantics, không chỉ latency. Theo dõi index mới sau khi triển khai và có đường rollback nếu ghi bị ảnh hưởng. Không áp dụng hint hoặc thay đổi global server variable như bước đầu nếu một vấn đề hẹp có thể xử lý ở query/index.

## Tự kiểm tra

**Index có nhiều cột luôn tốt hơn nhiều index đơn?** Không. Nó có thể phục vụ một số prefix và tránh lookup, nhưng tăng kích thước, chi phí ghi, và không hỗ trợ mọi thứ tự lọc.

**Tại sao benchmark chạy nhanh hơn sau lần đầu?** Cache, page warm-up, JIT/plan cache hoặc dữ liệu đã tải có thể thay đổi trạng thái. Cần quyết định đang đo warm hay cold behavior.

**Tại sao cần p95/p99 nếu average tốt?** Average có thể che một nhóm request bị chậm do lock, I/O, queueing hoặc spill; tail latency ảnh hưởng trải nghiệm và deadline của request.

Nguồn đọc: *High Performance MySQL*, chương 2–6, 8–9 và 14; tài liệu [kiểm tra index usage của PostgreSQL](https://www.postgresql.org/docs/current/indexes-examine.html) và [tối ưu InnoDB của MySQL](https://dev.mysql.com/doc/refman/8.4/en/optimizing-innodb.html).

---
title: "Benchmark và profiling MySQL có kiểm soát"
category: "Database"
description: "Thiết kế workload đại diện, đọc latency/throughput và thu bằng chứng từ application tới MySQL."
updated: 2026-10-18
translationKey: "database/mysql-benchmarking-and-profiling"
---

Benchmark chỉ trả lời được câu hỏi mà workload của nó mô phỏng. Một test insert tuần tự không dự đoán chính xác API đọc nhiều index; một sysbench mặc định không đại diện traffic có skew, transaction dài và burst của production. Trước khi tune, xác định bottleneck cần đo và giữ workload đủ giống thực tế.

## Chọn mục tiêu và workload

Ghi rõ mục tiêu: throughput tối đa ở latency cap, latency p99 ở tải dự kiến, hiệu năng failover hay tốc độ restore. Workload cần tỉ lệ read/write, query mix, dataset lớn hơn cache khi phù hợp, concurrency, think time, transaction shape, dữ liệu phân bố lệch và client/network. Dùng cùng dataset/state giữa các lần chạy hoặc reset được kiểm soát.

Đo latency phân vị (p50/p95/p99), throughput, errors, queue depth, CPU, memory, I/O, rows examined và DB waits. Average che mất tail latency. Tăng concurrency từng mức để thấy saturation; tải quá cao có thể giảm throughput khi queue và contention phình.

## Kỷ luật benchmark

Warm-up cache và connection pool, chạy đủ lâu để vượt startup noise, lặp lại vài lần, ghi version/config/hardware và tránh chạy benchmark khác cạnh tranh cùng host. Thay một biến mỗi vòng; vẽ throughput/latency theo concurrency. Plot giúp thấy điểm cong saturation mà một con số “transactions/s” che đi.

Một phép đo nên có các pha tách biệt: chuẩn bị dữ liệu; warm-up; chạy workload ổn định; dừng tải; lưu kết quả thô và cấu hình. Không tính warm-up vào kết quả nếu mục tiêu là steady state, nhưng cũng đừng bỏ nó nếu câu hỏi thực tế là thời gian khởi động hoặc cache lạnh. Nếu test cần reset database, ghi rõ cách reset và xác nhận mỗi vòng bắt đầu từ cùng trạng thái. Nếu không reset được, thứ tự chạy có thể làm kết quả lệch vì cache, dữ liệu và compaction/checkpoint đã đổi.

Load generator cũng ảnh hưởng phép đo. Mô hình **closed-loop** gửi request mới sau khi request trước hoàn tất; khi server chậm, chính tốc độ phát tải giảm nên có thể che hàng đợi quá tải. Mô hình **open-loop** cố phát request theo tốc độ định trước; nó bộc lộ queue buildup và overload, nhưng cần giới hạn backlog để generator không tự hết tài nguyên. Ghi cả offered load (tải dự định gửi) lẫn completed throughput (tải server hoàn tất), cùng timeout/error. Think time thuộc mô hình người dùng; bỏ nó có thể biến workload tương tác thành vòng lặp bắn liên tục.

Kết quả chỉ so được khi giữ giống dataset, phân bố key, query mix, isolation/durability settings, concurrency model, client count và giới hạn tài nguyên. Với kết quả sát nhau, chạy nhiều lần và báo median/range hoặc độ phân tán; khác biệt nhỏ hơn nhiễu không đủ để kết luận tune có tác dụng. Giữ raw latency samples khi có thể, vì histogram/percentile tính từ bucket hoặc trung bình đã gộp có thể mất chi tiết tail.

### Ví dụ: tìm điểm bão hòa thay vì chọn một con số lớn nhất

Giả sử endpoint đọc hồ sơ cần đạt p99 dưới 200 ms. Ta chạy cùng dataset và mix query, mỗi lần tăng concurrency, rồi thu completed requests/s, p99, timeout, CPU và lock/I/O waits. Các số dưới đây là **dữ liệu minh họa**, không phải benchmark từ sách hay khuyến nghị phần cứng:

| Client đồng thời | Hoàn tất mỗi giây | p99 | Timeout | Tín hiệu đi kèm |
| ---: | ---: | ---: | ---: | --- |
| 8 | 420 | 42 ms | 0 | CPU 38%, queue ngắn |
| 16 | 760 | 71 ms | 0 | CPU 66% |
| 32 | 910 | 238 ms | 3 | CPU 96%, runnable queue tăng |
| 64 | 700 | 1.4 s | 81 | CPU vẫn bão hòa, request xếp hàng |

Mốc 64 client có concurrency cao nhất nhưng phục vụ ít request hơn và latency tệ hơn. Với mục tiêu p99 < 200 ms, 16 client là điểm đo đạt yêu cầu; 32 cho thấy nơi bắt đầu bão hòa. Tiếp theo phải xác định CPU bị statement nào tiêu thụ hay do application fan-out; giảm concurrency có thể bảo vệ SLO, còn tối ưu query có thể nâng điểm bão hòa. Chỉ tăng `max_connections` không tạo thêm CPU và có thể cho phép queue lớn hơn.

Đừng chỉ lấy percentile cuối cùng trong bảng: xác nhận test đủ dài, workload lặp lại được và hàng đợi/timeout được đo ở cả client lẫn server. Nếu generator gửi tải chậm hơn dự kiến khi bị chặn, con số completed throughput có thể che phần tải đã bị từ chối hoặc chưa phát ra.

Sysbench phù hợp tạo workload tổng hợp; TPC-C/DBT-2 mô hình giao dịch nhiều bước hơn; full-stack load test đo cả application/network. Không so số từ hardware, dataset, durability hoặc client khác nhau như kết quả có thể xếp hạng trực tiếp. Bao gồm thời gian chạy dài để thấy checkpoint, purge, replication và cache effects.

## Từ ứng dụng đến query

Profiling bắt đầu ở request trace: một request có thể phát nhiều query, serialize payload lớn hoặc đợi pool trước khi MySQL thấy lệnh. Instrument query count, duration, rows, connection-pool wait và correlation ID. Sau đó phân biệt query chậm đơn lẻ với tổng workload gây CPU/I/O/lock pressure.

Hãy chia thời gian một request thành những đoạn có thể đo: chờ vào application worker/pool, xử lý ứng dụng, network round trips, thời gian chờ và chạy trong server, rồi serialize/đọc response. Các đoạn có thể chồng lấp; đừng cộng chúng như thể mọi hệ thống chạy tuần tự. Correlation ID và timestamp gần đồng bộ giúp ghép trace ứng dụng với thread/statement của MySQL. Nếu request mất 900 ms nhưng query chỉ chiếm 80 ms, tối ưu index có thể không giải quyết độ trễ người dùng.

Chọn công cụ theo câu hỏi. Slow query log ghi statement vượt ngưỡng và có thể bổ sung rows examined; general log ghi rất nhiều hoạt động nên thường không thích hợp bật dài hạn trên tải lớn. Performance Schema gom event có cấu trúc theo thread/digest/wait nhưng history bị giới hạn và phụ thuộc instrument/consumer. `EXPLAIN` là mô tả plan; `EXPLAIN ANALYZE` chạy statement được hỗ trợ để đo thực tế, vì vậy chỉ dùng với hiểu biết về side effect và môi trường phù hợp. Mỗi lớp đo có điểm mù: app trace thấy pool wait, server history thấy query event, OS metrics thấy CPU/I/O; không một lớp nào giải thích hết request.

Slow query log/Performance Schema có thể chỉ ra digest, latency, rows examined, temp table, sort và waits. EXPLAIN/EXPLAIN ANALYZE giải thích plan; performance schema cung cấp server-wide evidence; OS tools như `iostat`, `vmstat`, `pidstat` cho biết tài nguyên host. Dùng sampling/retention có giới hạn vì tracing mọi query có overhead.

## Sự cố không liên tục

Với spike ngắn, thu ring buffer metrics và diagnostics trước khi sự cố biến mất: processlist, global status delta, active transactions, lock waits, slow log, CPU/I/O/network và application traces. Snapshot một lần không cho rate; lấy delta theo khoảng thời gian. Ghi timestamp đồng bộ giữa ứng dụng, DB và host.

Sau khi có baseline, thử giả thuyết nhỏ: ví dụ tăng buffer pool chỉ khi evidence là physical reads thiếu cache; giảm concurrency nếu CPU queueing/lock contention cao; sửa index khi rows examined quá lớn. Mỗi thay đổi cần metric trước/sau và rollback path.

*High Performance MySQL*, ch. 2–3, trình bày benchmark, profiling và intermittent diagnostics. Với MySQL 8.4, dùng [Performance Schema](https://dev.mysql.com/doc/refman/8.4/en/performance-schema.html), [slow query log](https://dev.mysql.com/doc/refman/8.4/en/slow-query-log.html), [EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/explain.html); `SHOW PROFILE`/`SHOW PROFILES` trong sách đã **deprecated** và được tài liệu 8.4 hướng sang Performance Schema, không nên mô tả là đã bị xóa khỏi bản 8.4.

## Tự kiểm tra

**Một benchmark chạy 10 giây đủ so cấu hình?** Có thể chưa vượt startup/cache noise hoặc workload dài hạn.

**Average latency có phát hiện request chậm nhất?** Không; xem phân vị và tail latency.

**Spike CPU trên DB chứng minh query optimizer sai?** Không; có thể do app fan-out, concurrency, lock hoặc background work.

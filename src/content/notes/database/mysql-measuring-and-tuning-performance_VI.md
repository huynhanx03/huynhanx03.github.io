---
title: "Đo và tối ưu hiệu năng MySQL"
category: "Database"
description: "Thiết kế benchmark có thể tin cậy, profile từ ứng dụng tới storage và điều chỉnh MySQL dựa trên bằng chứng thay vì một con số cấu hình."
updated: 2026-10-18
translationKey: "database/mysql-measuring-and-tuning-performance"
---

Một máy chủ “nhanh hơn 30%” chỉ có ý nghĩa khi ta biết so với workload nào, trên phần cứng nào và đo ở đâu. Tối ưu MySQL bắt đầu bằng baseline tái lập được, sau đó tìm bottleneck ở ứng dụng, query, engine, operating system hoặc storage. Chỉnh buffer size trước khi biết vấn đề thường chỉ chuyển bottleneck sang chỗ khác.

## Biến mục tiêu thành phép đo

Ghi câu hỏi trước khi chạy benchmark: ví dụ throughput ghi tăng bao nhiêu trong khi p95 vẫn dưới 80 ms ở 300 kết nối. Cố định phiên bản MySQL, cấu hình, schema, kích thước/độ lệch dữ liệu, phần cứng, client, concurrency và cache state. Nếu hai lần chạy khác nhiều yếu tố, không biết thay đổi nào tạo kết quả.

Chọn loại benchmark theo câu hỏi:

- **Microbenchmark** cô lập CPU, file I/O, một query hoặc storage primitive; nó giúp so thành phần nhưng không mô phỏng ứng dụng đầy đủ.
- **Database workload benchmark** phát lại kiểu transaction như OLTP để quan sát engine với concurrency.
- **End-to-end benchmark** gồm client, network, connection pool và application path; sát thực tế hơn nhưng cần metrics để tìm lớp gây chậm.

Không dùng một query chạy đơn luồng để kết luận server xử lý tốt khi nhiều connection tranh CPU, buffer pool, locks và disk. Dữ liệu phải đủ lớn để vượt qua hiệu ứng cache nếu mục tiêu là đo storage, hoặc ghi rõ đang đo warm-cache behavior.

Theo dõi throughput, p50/p95/p99 latency, error rate, CPU, memory, disk IOPS/latency, bytes read/write, lock waits, rows examined, temporary tables/spills và replication lag nếu có. Lặp lại benchmark, làm nóng hệ thống, tách startup noise và giữ log cấu hình. Dùng plot theo thời gian để thấy saturation, checkpoint spikes hoặc throughput suy giảm; average đơn lẻ che tail latency.

Sách nêu `sysbench`, DBT-2/TPC-C, `http_load` và bộ benchmark MySQL. Công cụ và phiên bản cũ cần kiểm tra lại trước khi dùng; phần quan trọng lâu dài là workload, isolation, measurement window và phương pháp lặp lại.

## Đừng gộp throughput, latency và concurrency thành một con số

**Throughput** là số operation hoàn tất trong một đơn vị thời gian. **Response time** là thời gian một request đi từ lúc bắt đầu đến khi hoàn tất, gồm cả thời gian chờ queue. **Concurrency** là số operation đang thực sự chạy hoặc đang chờ tại một tầng; số phiên đăng nhập hay số connection đang mở không đồng nghĩa với số request đang đồng thời tiêu thụ database.

Khi tăng concurrency, throughput thường tăng trước, rồi chững lại khi CPU, I/O, lock hoặc connection pool trở thành nút thắt. Queue khi đó dài ra và p95/p99 có thể tăng nhanh. Ví dụ: 100 request/giây với p99 40 ms có thể phục vụ người dùng tốt hơn 110 request/giây với p99 2 giây. Nếu một workload batch cần hoàn thành nhanh, response time của batch có thể là mục tiêu; với API tương tác, tail latency và tỷ lệ lỗi thường quan trọng hơn average.

Đo **scalability** bằng cách thay đổi có chủ đích một trục — số client, số core, dung lượng dữ liệu hoặc số replica — rồi xem output thay đổi ra sao. Hệ thống lý tưởng tăng tuyến tính, nhưng contention, coordination, cache và giới hạn phần cứng thường khiến lợi ích giảm dần. Ghi rõ điểm bắt đầu và workload; chỉ nói “đã scale gấp đôi” mà không nêu metric thì không có kết luận.

## Một benchmark đáng tin có thể lặp lại

Trước mỗi run, ghi thành một manifest: câu hỏi đang kiểm tra; phiên bản binary; cấu hình; schema và index; số dòng cùng phân bố dữ liệu; transaction mix và tỷ lệ đọc/ghi; client count; cache state; warm-up; thời lượng đo; giới hạn CPU/I/O; và commit/durability policy. Dùng dữ liệu đại diện nếu có thể. Nếu phải tạo synthetic data, mô phỏng cả độ lệch: bảng “uniform” dễ hơn dữ liệu thật có hot key và phân bố lệch.

Nếu replay query log, giữ quan hệ giữa connection, thứ tự request và concurrency. Chạy tuần tự từng dòng sẽ biến workload nhiều client thành workload đơn luồng. Query lặp lại y hệt có thể chỉ đo cache hit; test trên dataset nhỏ không cho biết hành vi khi working set vượt RAM. Kiểm tra error/rollback và server log để chắc benchmark thực sự chạy đúng nghiệp vụ, không phải đang đo thời gian báo lỗi.

Tách **warm-up** khỏi cửa sổ đo nếu muốn đo steady state; nếu muốn biết sau restart mất bao lâu mới đạt công suất thì đo cold start riêng. Benchmark ngắn có thể bỏ qua checkpoint, flushing, compaction, cache build hoặc job định kỳ. Chạy đủ lâu để đường metric ổn định qua chu kỳ nền của workload; lưu mỗi lần chạy riêng và cố định cách khởi tạo dữ liệu.

Thu thập mẫu theo thời gian, ít nhất gồm throughput, latency histogram/percentile, errors, CPU, memory/swap, disk latency/IOPS, network, status counters, lock waits, checkpoint/dirty pages và replication lag nếu liên quan. Lưu raw samples cùng cấu hình, timestamp và command. Vẽ series theo thời gian: đường trung bình phẳng có thể che một khoảng throughput rơi mạnh khi cache lạnh hoặc dirty pages được flush. Khi thấy điểm lạ, đối chiếu các biểu đồ cùng timestamp để tìm resource thay đổi; đừng kết luận nguyên nhân chỉ từ hình dạng.

Để so sánh A/B, giữ mọi điều kiện như nhau, chỉ đổi một yếu tố mỗi lần khi có thể, rồi lặp lại đủ lần để thấy biến động giữa các run. Tránh chạy benchmark cạnh backup, cron, consistency scan hoặc workload khác. Với storage dùng chung, tải của máy hàng xóm cũng là một biến số. Ghi lại cả kết quả xấu, lỗi và điều kiện chạy; nếu chỉ giữ run đẹp nhất thì phép đo không còn tái lập được.

## Chọn công cụ theo lớp cần hiểu

- **Full-stack load test** gửi request qua app, web server, connection pool, network và MySQL. Nó trả lời câu hỏi user-facing như “bao nhiêu request/giây vẫn giữ p99 dưới ngưỡng?”, nhưng cần tracing/metrics theo tầng để biết bottleneck nằm đâu.
- **Database workload benchmark** cô lập MySQL hơn. `sysbench` hiện có workload OLTP, đồng thời cũng có test CPU, file I/O, memory, threads và mutex; dùng test CPU không thể suy ra hiệu năng truy vấn database. Script workload quyết định câu chuyện đang đo.
- **Transactional benchmark như TPC-C/DBT-2** trộn nhiều loại transaction, đọc/ghi và ràng buộc workload. Nó sát hành vi OLTP tổng hợp hơn một phép đo query đơn, nhưng vẫn không đại diện mọi ứng dụng. Đọc transaction mix, scale factor, rollback, latency histogram và thời gian ramp-up cùng throughput.
- **Microbenchmark** cô lập một expression, syscall hay thao tác I/O để so thành phần. Nó giúp hình thành giả thuyết, không thay thế phép đo end-to-end.

Sách dùng các phiên bản cũ của `http_load`, MySQL Benchmark Suite, DBT-2 và sysbench. Hãy xem ví dụ lệnh lịch sử như tư liệu về cách đặt workload; xác minh tool/version trước khi chạy. Tài liệu hiện hành của [MySQL 8.4 về benchmark tự xây](https://dev.mysql.com/doc/refman/8.4/en/custom-benchmarks.html) và [Performance Schema](https://dev.mysql.com/doc/refman/8.4/en/performance-schema.html), cùng [README sysbench hiện tại](https://github.com/akopytov/sysbench/blob/master/README.md), mô tả khả năng và instrumentation hiện dùng.

### Đọc đúng loại công cụ và con số nó trả về

Ở đầu-cuối hệ thống, `ab` trong sách bắn lặp một URL nhanh nhất có thể nên hữu ích cho một phép thử sơ bộ, nhưng không mô phỏng nhiều hành vi người dùng. `http_load` có thể chọn URL từ danh sách, giới hạn số client đồng thời hoặc phát request theo tốc độ định trước. Khi tăng tốc độ gửi, hãy nhìn cả số request hoàn tất lẫn thời gian kết nối/phản hồi và mã lỗi: nếu tốc độ phát yêu cầu là 20/giây nhưng server chỉ hoàn tất khoảng 11/giây, phần chênh lệch đang nằm trong hàng đợi hoặc không được phục vụ. JMeter cho phép mô hình hóa nhiều bước, ramp-up và protocol khác nhau; cấu hình càng linh hoạt thì càng cần ghi lại kịch bản để so sánh công bằng. Đây là ví dụ về loại phép đo, không phải khuyến nghị chọn các bản công cụ cũ trong sách.

Ở tầng MySQL, `mysqlslap` tạo kết nối đồng thời và chạy câu SQL hoặc file câu lệnh; nếu để công cụ tự sinh truy vấn từ schema, phải kiểm tra truy vấn đó có giống nghiệp vụ cần đo không. Bộ MySQL Benchmark Suite (`sql-bench`) có nhiều phép thử sẵn và tiện so sơ bộ thao tác hay engine, nhưng chạy tuần tự, một người dùng và dataset nhỏ. Vì vậy nó không đo được lợi ích của nhiều CPU hay hành vi khi dữ liệu vượt RAM. Kết quả từng test còn tách wall-clock time khỏi CPU time của client: phần client bận không phải thời gian server xử lý. Đừng lấy một bảng xếp hạng từ suite này làm dự báo production.

`sysbench` cần được đọc theo đúng test mode. CPU test tính số nguyên tố chủ yếu cho biết năng lực CPU trong bài toán đó; file-I/O test cần tập tin lớn hơn RAM nếu muốn tránh page cache biến phép đo disk thành phép đo memory. Các mode tuần tự/tuần tự ghi lại/đọc ngẫu nhiên/ghi ngẫu nhiên/đọc-ghi ngẫu nhiên tạo áp lực khác nhau. Ghi lại block size, tỷ lệ đọc/ghi, số thread, chế độ đồng bộ, `fsync` và percentile; một con số MB/giây không mô tả đủ độ trễ hay độ bền ghi. OLTP test chuẩn bị dữ liệu trước, chạy nhiều thread trong cửa sổ cố định, rồi báo transaction/giây, query/giây, deadlock, latency min/avg/max/p95 và fairness giữa thread. Phiên bản 0.4 của sách là lịch sử; bản sysbench hiện hành có cách gọi và workload khác nhau, nên hãy dùng tài liệu của đúng phiên bản thay vì chép lệnh nguyên xi.

DBT-2 là bộ triển khai miễn phí theo kiểu TPC-C, không được TPC chứng nhận; số `tpmC` và `Price/tpmC` của kết quả TPC-C chính thức không thể so trực tiếp với DBT-2. Scale factor/warehouse, số connection, số terminal, transaction mix, ramp-up, thời lượng, think time và rollback đều ảnh hưởng phép đo. Chế độ không có think time stress server nhưng làm người dùng giả định gửi liên tục, có thể phi thực tế. TPCC-MySQL trong sách cũng mô phỏng workload kiểu TPC-C và báo transaction mix, latency percentile, ràng buộc tỷ lệ transaction/thời gian đáp ứng và tpmC; cần đọc các điều kiện đạt cùng histogram, không chỉ nhìn dòng kết quả cuối. Dù bộ nào được dùng, hãy lưu lệnh, dữ liệu sinh, cấu hình, output thô và metrics đồng thời để có thể giải thích vì sao một lần chạy khác lần khác.

## Từ API tới query: tìm tầng chịu chi phí

Profile application để biết thời gian nằm ở network, connection pool, serialization, retry hay database. Instrument request bằng query count, duration và fingerprint; tránh log dữ liệu nhạy cảm hoặc toàn bộ parameter không kiểm soát. N+1 query thường lộ qua số round trip nhiều dù từng query nhanh.

Ở MySQL, slow query log và Performance Schema giúp truy vấn top theo thời gian, số lần, rows examined hoặc wait. `SHOW PROCESSLIST` là ảnh chụp session; query log là lịch sử; Performance Schema cung cấp sự kiện có cấu trúc. Chúng trả lời các câu hỏi khác nhau. Global status counters cần lấy theo delta qua khoảng thời gian; process list không thay thế lịch sử.

Khi một query chậm, ghi query fingerprint, parameter đại diện, plan, rows estimate/actual, session isolation, transaction age, lock waits và server load cùng thời điểm. Khi nhiều query đồng thời chậm, xét connection saturation, CPU, buffer pool churn, disk, checkpoint/redo, temp table, replication hoặc lock contention.

`SHOW PROFILE` trong sách cũ là lịch sử cần biết; MySQL 8.4 đánh dấu lệnh này deprecated và hướng sang Performance Schema. Công cụ phân tích hiện hành nên ưu tiên Performance Schema và `EXPLAIN ANALYZE` của phiên bản hỗ trợ. Đo profiling cũng tốn overhead; dùng sampling hoặc phạm vi hẹp khi production nhạy cảm.

## Profile phải khớp với câu hỏi

Trước hết chọn đơn vị cần điều tra:

- **Toàn ứng dụng:** thời gian trong request, database, cache, dịch vụ ngoài, serialization và code ứng dụng. Gắn trace/request ID xuyên suốt để so các đoạn trong cùng một request.
- **Toàn workload MySQL:** nhóm query theo digest/fingerprint, cộng tổng thời gian và số lần chạy. Query mất 10 ms nhưng chạy 100.000 lần có thể tiêu thụ nhiều thời gian server hơn query chạy một lần trong 2 giây.
- **Một statement:** xem plan, rows examined/returned, thời gian từng stage, waits và lock chain quanh đúng lần thực thi.
- **Server internals:** dùng wait/event instrumentation hoặc profiler hệ điều hành khi các phép đo query chưa giải thích được CPU, mutex, I/O hay context switch.

Profile cho biết thời gian hoặc sự kiện được công cụ ghi nhận; nó không tự giải thích nguyên nhân. Một công cụ có thể bỏ sót thời gian chờ, gộp nhiều lần chạy vào average, hoặc không lưu latency distribution. Nếu profile báo một query tốn 40% tổng thời gian, cần hỏi đó là tổng cộng, trung bình mỗi lần, hay một tail nhỏ nhưng rất chậm. Đọc histogram/percentile và số lần chạy trước khi tối ưu.

## Xử lý sự cố chỉ thỉnh thoảng mới xuất hiện

Một dashboard tổng hợp cả ngày có thể làm biến mất một lần stall kéo dài vài giây. Thiết kế **trigger** dựa trên tín hiệu gần thời gian thực, chẳng hạn `Threads_running` cao liên tục trong nhiều mẫu hoặc throughput giảm trong khi connection đang chờ tăng. Đặt ngưỡng từ baseline trước đó và yêu cầu điều kiện tồn tại qua vài mẫu để tránh bắt một spike vô hại. Ngưỡng quá cao tạo false negative; ngưỡng quá thấp tạo false positive và làm hệ thống giám sát tự gây tải.

Khi trigger nổ, ghi snapshot có timestamp đồng bộ: status counters dạng delta, process list/wait state, digest và slow-query samples, transaction age/lock waits, CPU, memory/swap, `iostat`/disk latency, network, error log và replication state. Lấy nhiều mẫu trong lúc lỗi đang xảy ra, đồng thời giữ một số mẫu baseline lúc server khỏe để biết trạng thái nào là bình thường. Thu thập vừa đủ: process list chỉ là ảnh chụp tức thời; query log có thể chứa dữ liệu nhạy cảm; profiler/stack trace sâu có thể thêm overhead.

Điều tra từ quan sát đến giả thuyết: “throughput rơi và `Threads_running` tăng” là quan sát; “disk bị nghẽn” là giả thuyết cần kiểm chứng. Ghép các nguồn theo thời gian, kiểm tra xem query nào chạy, wait nào tăng và thiết bị nào thực sự phát sinh I/O. Tìm cả dữ kiện trái với phán đoán đầu tiên. Nếu ứng dụng và MySQL cùng có log, correlation ID giúp nhận ra request nào tạo ra nhiều query hoặc retry.

Ví dụ, một đợt cache expiration đồng loạt có thể khiến nhiều worker cùng tải lại những key nóng. Query lên MySQL tăng, query có sort/tmp table tạo I/O, và database trông như đang stall. Tăng buffer pool có thể không giải quyết nguyên nhân; cần làm lệch thời gian hết hạn, giới hạn đồng thời rebuild cache, rồi kiểm tra lại workload và I/O. Đây là một giả thuyết cho tới khi timeline và query samples ủng hộ nó.

Trên MySQL 8.4, `SHOW PROFILE` và `SHOW PROFILES` vẫn tồn tại nhưng đã **deprecated**; dùng Performance Schema cho statement, stage và wait events. Có thể bắt đầu từ bảng history/summary hoặc view của `sys`, rồi thu hẹp theo thread, digest và khoảng thời gian. [Tài liệu MySQL 8.4](https://dev.mysql.com/doc/refman/8.4/en/show-profiles.html) ghi rõ trạng thái deprecated và hướng dẫn chuyển sang [query profiling bằng Performance Schema](https://dev.mysql.com/doc/refman/8.4/en/performance-schema.html).

## Một profile là bản đồ ưu tiên, không phải lời giải thích hoàn chỉnh

Trong chương profiling, sách định nghĩa hiệu năng theo **thời gian hoàn tất một tác vụ**. Với database, đó thường là thời gian phản hồi của statement trong workload đã xác định. CPU, I/O và số query/giây là dấu hiệu hoặc mục tiêu phụ: CPU tăng sau nâng cấp có thể nghĩa là server làm được nhiều công việc hữu ích hơn; CPU thấp nhưng query chờ I/O vẫn có thể rất chậm. Hãy đo mục tiêu trực tiếp, rồi dùng tài nguyên để giải thích nó.

Một tác vụ tốn thời gian ở hai nơi: **đang làm việc** hoặc **đang chờ**. Execution-time profile xếp hạng công việc tiêu thụ thời gian; wait analysis tìm chỗ bị chặn như I/O, mutex, lock hoặc queue. Profile tốt gom các tác vụ cùng loại và báo ít nhất số lần chạy, tổng response time, thời gian trung bình mỗi lần và phần trăm tổng thời gian; xếp theo tổng thời gian giảm dần giúp thấy nhóm query nào đang chiếm phần lớn ngân sách. Nhưng nếu CPU profile không thấy vấn đề mà request vẫn đứng, cần đo wait thay vì chỉ tối ưu thêm SQL.

Số tổng và trung bình làm mất phân bố. Một query digest có thể gộp hàng nghìn lần chạy rất nhanh với một vài lần chạy cực chậm. Dùng histogram, percentile, độ lệch chuẩn và mức phân tán để nhìn ra outlier; một query hiếm nhưng p99 tệ vẫn có thể làm hỏng trải nghiệm dù không đứng đầu tổng thời gian. Profile cũng có thể có **lost time** — thời gian toàn tác vụ không được các event đã đo giải thích — do thiếu instrumentation, làm tròn hoặc chi phí đo. Ghi nhận phần thiếu thay vì coi tổng trong report là toàn bộ sự thật.

Chọn việc tối ưu theo hai tiêu chí: tỷ trọng thời gian và giá trị người dùng/kinh doanh. Theo định luật Amdahl, nếu một loại query chiếm 5% tổng response time thì làm nó nhanh vô hạn cũng chỉ cải thiện tối đa khoảng 5% tổng thể trong cùng điều kiện. Ngược lại, query ít gặp nhưng gây tail latency nghiêm trọng có thể đáng ưu tiên vì ảnh hưởng của nó không hiện lên trong tổng thời gian. Dừng khi lợi ích kỳ vọng không còn đáng chi phí sửa, vận hành và rủi ro.

## Profile từ request xuống statement, rồi xuống event

Bắt đầu ở application vì request là thứ người dùng thực sự chờ. Đo thời gian tổng request, database, cache và dịch vụ ngoài; gắn trace/request ID để liên kết các đoạn và phát hiện N+1, retry hay query lặp. Instrumentation tạo overhead, nên cân bằng độ chi tiết với chi phí: một số hệ thống lấy mẫu một phần request, nhưng cần giữ đủ mẫu production và baseline để bắt được đường chạy hiếm. Tên các sản phẩm và PHP profiler trong sách như New Relic, xhprof, xdebug, IfP là bối cảnh thời điểm xuất bản; ý cốt lõi là đo xuyên suốt stack, chọn công cụ còn được hỗ trợ và không mặc định rằng staging giống production.

Nếu câu hỏi là “query nào tạo tải?”, ghi workload trong khoảng đại diện rồi gom theo digest/fingerprint. Slow query log có thể được cấu hình để lấy mẫu rộng hơn ngưỡng “chậm”, nhưng bật ghi mọi query lâu dài làm tăng I/O và dung lượng log; lập thời hạn, rotation và quyền truy cập trước. General log ghi câu lệnh tới server nhưng không có thời gian hoàn tất nên không thay slow log để profile. Dùng parser như `pt-query-digest` để xếp hạng tổng thời gian, tần suất, average, phân bố và outlier; đọc report trước rồi mới mở mẫu raw. Query digest gộp các câu cùng dạng nên cần quay về query thực và parameter khi điều tra plan hoặc skew. Đọc cả histogram: một đỉnh ở hàng trăm mili giây và một đỉnh nhanh hơn hàng nghìn lần có thể là hai đường thực thi khác nhau, chẳng hạn dữ liệu lệch hoặc một nhóm cache hit. Chỉ digest đã chuẩn hóa chưa giải thích được khác biệt giữa các literal. Các chỉ số như độ phân tán (variance-to-mean ratio) giúp phát hiện nhóm query biến động, nhưng cần soi mẫu nhanh/chậm và bối cảnh trước khi quy nguyên nhân.

Nếu câu hỏi là “lần chạy cụ thể đã làm gì?”, giới hạn đo đúng statement và session. Sách dùng `SHOW PROFILE` để xem các stage theo thời gian, `SHOW STATUS` để quan sát counter như temporary table và handler reads, slow-query log mở rộng để thêm chi tiết, và Performance Schema để xem wait/event. Counter phải được chụp trước/sau và xét đúng phạm vi session hay global; chính câu lệnh chẩn đoán cũng có thể làm thay đổi counter. `EXPLAIN` cho biết plan ước tính, còn counters/events là bằng chứng về điều đã xảy ra, nhưng mỗi phép đo đều có overhead và điểm mù. Trên MySQL hiện hành hãy ưu tiên Performance Schema/`sys` và công cụ plan phù hợp; `SHOW PROFILE` là API lịch sử đã deprecated.

## Bắt sự cố hiếm bằng trigger và bằng chứng cùng thời điểm

Khi server thỉnh thoảng chậm, trước tiên phân biệt **một query riêng lẻ** với **toàn server**. Nếu QPS tụt đồng thời `Threads_running`/hàng chờ tăng, query chậm có thể là nạn nhân của contention chung. Nếu chỉ một fingerprint chậm trong khi phần còn lại bình thường, thu hẹp vào query, plan, parameter và lock của nó. Chuỗi mẫu `SHOW GLOBAL STATUS`, snapshot process list/wait và log query theo timestamp dễ nhận ra biến động hơn một lần chụp sau khi sự cố đã hết.

Tạo trigger từ baseline khỏe, ví dụ số thread đang chạy vượt một ngưỡng trong vài mẫu liên tiếp, hoặc trạng thái process list bất thường tồn tại đủ lâu. Trigger quá nhạy sinh false positive và dữ liệu thừa; trigger quá cao bỏ lỡ sự cố. Sách dùng `pt-stalk`/`pt-collect` để kích hoạt và lưu snapshot có timestamp; tên lệnh là lịch sử, nhưng mẫu thiết kế vẫn hữu ích: kiểm tra dung lượng đĩa, giới hạn thời gian/khối lượng thu thập, giữ một số snapshot lúc bình thường, rồi đối chiếu query/transaction, InnoDB status, OS CPU/memory, `iostat`, network và error log. Cần đồng bộ thời gian giữa các máy để ghép sự kiện.

Một ca trong sách bắt đầu bằng lỗi `max_connections` ngắt quãng. Trong lúc lỗi, có nhiều query chờ, I/O ghi tăng vọt dù database nhỏ và workload chủ yếu là SELECT. Trạng thái InnoDB trông giống checkpoint stall, nhưng delta của `Innodb_buffer_pool_pages_flushed`, số dirty page và khoảng checkpoint không ủng hộ giả thuyết đó. Dữ liệu `df`/`lsof` cho thấy dung lượng file tạm của MySQL tăng mạnh; process list có nhiều query “Copying to tmp table” và “Sorting result”. Ghép các dấu vết cho thấy một đợt cache expiration đồng thời khiến nhiều worker dựng lại cùng dữ liệu, tạo query trùng và temporary table trên disk. Bài học không phải “cache stampede luôn là nguyên nhân”, mà là kiểm tra cả dữ kiện ủng hộ lẫn dữ kiện bác bỏ: flush có thể là dấu hiệu của I/O đang bị nghẽn, không nhất thiết là nguyên nhân. Đừng dùng số lượng query làm đại diện cho chi phí: vài câu `UPDATE` nặng vẫn có thể tiêu thụ nhiều tài nguyên hơn hàng trăm câu `SELECT` nhẹ. Ngược lại, một plan có filesort hay temporary table là dấu hiệu cần hiểu trong workload, không tự động chứng minh đó là nguyên nhân gốc. Ca này cũng không có phép đo hoàn hảo cho mọi nguồn I/O ở phiên bản cũ; kết luận dựa trên nhiều dấu vết khớp nhau và vẫn cần ghi rõ phần chưa đo được.

Khi cần xuống tầng hệ điều hành, phân biệt profiler CPU với syscall tracer: `oprofile` trong sách lấy mẫu CPU symbol; `strace` tính thời gian trong system call nên có thể lộ thời gian chờ I/O, nhưng attach rộng vào `mysqld` có overhead lớn và có thể làm thay đổi sự cố. Stack trace GDB gộp bằng `pt-pmp` có thể lộ nhiều thread cùng chờ một queue/mutex, nhưng cần symbol và kiến thức internals để diễn giải. Percona/MariaDB từng có `USER_STATISTICS` để tìm user/table/index ít hoặc nhiều được dùng; phiên bản và schema hiện hành khác nhau nên xác minh trước khi dựa vào nó. Chỉ dùng các công cụ sâu này khi câu hỏi cần tới đó và có thể chịu được overhead.

## Điều chỉnh server theo resource bị nghẽn

**Buffer pool** chứa page InnoDB. Quá nhỏ gây churn và đọc lặp; quá lớn có thể ép OS swap hoặc lấy RAM của connection/workload khác. Đo hit/miss, dirty pages, evictions, memory pressure và workload trước khi tăng.

**Redo log/checkpoint** ảnh hưởng write throughput và recovery window. Log capacity nhỏ có thể buộc checkpoint thường hơn; tăng log không miễn phí: cần disk, thời gian recovery và hiểu thay đổi version. **Temporary tables/sort/join buffers** thường có thể cấp theo connection hoặc query; tăng global limit khi nhiều concurrent sessions có thể nhân memory usage lên rất lớn.

**Connection và thread**: connection thừa tiêu memory và scheduler; dùng connection pool nhưng giới hạn concurrency thực. **Table/open caches** ảnh hưởng workload nhiều table nhưng phải xem file descriptor limit. **I/O settings**, fsync, storage scheduler và filesystem cần đo trên thiết bị thật. Không tắt durability option để đạt benchmark nếu production phải giữ commit qua crash.

Tuning checklist trong sách gồm cache, thread, table cache, temp table, sorting, join buffers, network, OS file descriptor, CPU, RAM, filesystem và disk. Không có bộ giá trị chung; version 8.4 đổi default, nên bắt đầu từ [MySQL 8.4 configuration](https://dev.mysql.com/doc/refman/8.4/en/server-configuration.html), [InnoDB buffer pool](https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool.html), [memory use](https://dev.mysql.com/doc/refman/8.4/en/memory-use.html) rồi xác nhận bằng đo.

## Phân biệt response time với throughput

Response time gồm thời gian service và chờ queue/resource. Khi server gần saturation, thêm concurrency có thể làm throughput tăng ít nhưng latency tăng mạnh do queueing và lock contention. Một test nhỏ nhiều lần cache hit có thể rất nhanh nhưng không dự đoán tail latency dưới tải.

Khi benchmark, chạy từng cấu hình đủ lâu để steady state, theo dõi warmup, checkpoint và background tasks. Giữ workload mix ổn định, so cùng số client, và kiểm tra kết quả trên vài lần chạy. Nếu profiling cho thấy query nhanh nhưng API chậm, chuyển sang network, app, pooling hoặc payload; đừng tiếp tục tăng cache database.

## Tối ưu ở tầng ứng dụng

Giảm round trips bằng batch hoặc transaction khi semantics cho phép. Fetch đúng số cột và dòng; phân trang keyset cho tập lớn; đặt timeout và xử lý retry có giới hạn. Pool connection tránh connect/disconnect mỗi request nhưng không có nghĩa giữ transaction lâu. Cache ứng dụng cần TTL/invalidation, giới hạn bộ nhớ và chấp nhận staleness được diễn đạt rõ.

Stored procedure có thể giảm giao tiếp hoặc đóng gói logic gần dữ liệu; nhưng phải tính complexity, triển khai và quan sát. User-defined function trong query có thể chạy cho mỗi row và chặn optimizer transformations. Đo tổng ứng dụng, không chỉ query engine.

## Chẩn đoán sự cố ngắt quãng

Nếu lỗi chỉ xuất hiện thỉnh thoảng, thu thập dữ liệu theo trigger: log query chậm, status delta, process list, wait events, replication state và tài nguyên OS quanh thời điểm xảy ra. Giữ đủ timestamp để ghép correlation nhưng giới hạn volume và dữ liệu nhạy cảm. Một profile trung bình cả ngày có thể bỏ sót spike 20 giây.

Phân biệt một query chậm với mọi query cùng chậm; hiện tượng intermittent có thể do lock chain, batch job, backup, page flush, network burst hoặc hot key. Dùng `strace`/system profiler chỉ khi giả thuyết liên quan system call/I/O đã hình thành; trace rộng có thể tạo overhead và output khó diễn giải.

## Tự kiểm tra

**Tăng `innodb_buffer_pool_size` có luôn cải thiện hiệu năng?** Không. Có thể swap hoặc lấy RAM khỏi connection và hệ điều hành; cần xem cache misses cùng memory pressure.

**Throughput tăng thì user luôn thấy nhanh hơn?** Không. Tail latency có thể tăng dù tổng transaction/giây tăng.

**Benchmark một query trên dataset nhỏ có dự báo được production?** Không nếu không tái tạo row count, skew, concurrency, cache, I/O và query mix.

Nguồn đọc: *High Performance MySQL*, chương 2, 3, 8, 9 và 14; [MySQL optimization](https://dev.mysql.com/doc/refman/8.4/en/optimization.html) và [Performance Schema](https://dev.mysql.com/doc/refman/8.4/en/performance-schema.html).

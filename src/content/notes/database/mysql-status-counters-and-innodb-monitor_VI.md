---
title: "Đọc status counters và InnoDB Monitor"
category: "Database"
description: "Biến status của MySQL thành bằng chứng có ngữ cảnh: đọc scope, delta, nhóm counters và các vùng trong InnoDB Monitor."
updated: 2026-10-18
translationKey: "database/mysql-status-counters-and-innodb-monitor"
---

Một con số trong MySQL hiếm khi tự nói được nguyên nhân. `Threads_running = 80` có thể là tải tăng bình thường, query bị khóa, hoặc server đang chạy quá nhiều việc cùng lúc. `Created_tmp_disk_tables` tăng cũng chưa chứng minh ổ đĩa là nút thắt. Muốn dùng status để chẩn đoán, ta cần biết giá trị đó đo cái gì, được tích lũy trong khoảng nào, thuộc global hay session, và có tín hiệu nào khác xác nhận giả thuyết.

Bài này đi từ snapshot đến phép suy luận. Các tên như `SHOW SLAVE STATUS`, `Qcache_*` hay `INFORMATION_SCHEMA.GLOBAL_STATUS` xuất hiện trong *High Performance MySQL* phản ánh MySQL 5.x. Hãy coi chúng là ngữ cảnh lịch sử; trên MySQL 8.4, ưu tiên lệnh, Performance Schema và `sys` schema hiện hành.

## Ba loại thông tin không nên trộn lẫn

**System variable** là cấu hình hoặc trạng thái cấu hình, thường đọc bằng `SHOW VARIABLES`. Ví dụ `max_connections` là giới hạn được đặt. **Status variable** là số liệu server đang phơi bày qua `SHOW STATUS`. **Event instrumentation** ghi lại sự kiện có thời gian hoặc quan hệ, như statement, wait, transaction và lock trong Performance Schema. Ba lớp trả lời ba câu hỏi khác nhau: server được cấu hình ra sao, đã làm bao nhiêu việc, và việc đó tiêu tốn thời gian/chờ ở đâu.

`SHOW GLOBAL STATUS` trả về giá trị global hoặc tổng hợp toàn server; `SHOW SESSION STATUS` trả về giá trị của connection hiện tại. Nếu bỏ scope, MySQL mặc định là session. Vì vậy, hai người chạy `SHOW STATUS` trong hai session có thể thấy số khác nhau dù đang nối cùng một server. Một số biến có cả hai scope, một số chỉ có một. Cần xem định nghĩa và scope của từng biến trong manual đúng phiên bản.

Status cũng có hai dạng về hành vi. **Counter** thường tăng dần từ lúc server khởi động hoặc reset; ví dụ số lần kết nối. **Gauge** phản ánh mức hiện tại và có thể lên xuống; ví dụ số thread đang kết nối. Tên biến không luôn đủ để phân loại. Hãy kiểm tra tài liệu và so sánh cách nó thay đổi theo thời gian.

## Snapshot, delta và rate

Counter tuyệt đối thường kém hữu ích hơn tốc độ thay đổi. Lấy hai mẫu cùng scope, cùng server, cách nhau một khoảng đo:

```text
rate = (counter_t2 - counter_t1) / (t2 - t1)
```

Ví dụ `Connections` tăng từ 12.000 lên 12.600 trong 60 giây thì tốc độ tiếp nhận connection là 10 lần/giây. Con số này không phải số connection đang mở; xem `Threads_connected` cho gauge hiện tại, và đối chiếu `Max_used_connections` để biết đỉnh kể từ khi server khởi động.

Một collector cần ghi timestamp, hostname/instance, version, scope và trạng thái khởi động lại. Nếu server restart giữa hai mẫu, counter có thể quay về thấp hơn; delta âm không phải “negative work”. Tránh chia cho khoảng lấy mẫu không đều, và đừng so mẫu từ hai primary khác nhau như thể chúng cùng một counter liên tục. Phép đo ngắn giúp bắt spike nhưng dễ nhiễu; phép đo dài làm mượt spike và có thể che sự cố thoáng qua. Lưu raw samples để có thể đổi cửa sổ phân tích sau này.

MySQL 8.4 hỗ trợ `SHOW GLOBAL STATUS` và `SHOW SESSION STATUS`; có thể lấy danh sách hẹp bằng `LIKE`. Cách chính xác để snapshot phụ thuộc collector và quyền truy cập. Khi truy vấn status qua Performance Schema, lưu ý cách collection phụ thuộc instrumented threads. Một lệnh đọc status cũng có chi phí và làm thay đổi một số counter tạo temporary table; không nên polling quá dày chỉ vì có thể làm được.

## Đọc các nhóm status như một câu chuyện

### Kết nối, thread và mạng

`Connections` đếm lần thử kết nối, `Threads_connected` là số connection hiện mở, `Threads_running` cho biết thread đang thực thi chứ không chỉ đang ngủ. `Threads_created` và `Threads_cached` giúp hiểu thread cache, nhưng tăng `Threads_created` tự nó chưa nói rằng cần tăng cache. `Aborted_connects` thường hướng ta tới lỗi handshake, thông tin xác thực, timeout hoặc client kết nối không hoàn tất; `Aborted_clients` thường liên quan connection bị đóng bất thường sau khi đã kết nối. `Bytes_received` và `Bytes_sent` cho lưu lượng tích lũy.

Hãy đặt câu hỏi theo cặp: connection rate tăng cùng `Threads_connected` hay chỉ là churn? `Threads_running` tăng cùng CPU, lock wait, hay disk latency? Bytes sent cao vì kết quả lớn, nhiều lần round trip, hay replication/client traffic? Một biến chỉ gợi hướng điều tra; process list, statement digest, network metric và log mới cho thêm ngữ cảnh.

### Câu lệnh, SELECT, handler, sort và temporary work

`Com_*` đếm nhóm lệnh SQL/protocol; `Questions` và các biến gần nghĩa có định nghĩa riêng, nên không mặc định chúng bằng tổng `Com_*`. Lệnh ping của client cũng có thể làm `Com_admin_commands` tăng. Nếu ứng dụng ping ngay trước mỗi query, nó thêm một network round trip nhưng không bảo đảm server vẫn khỏe ở lệnh kế tiếp; đó vừa tốn latency vừa tạo khoảng race kiểu “kiểm tra rồi mới dùng”. Việc gọi `USE` lặp lại có thể làm `Com_change_db` lớn. Đây là manh mối để xem cách client/ORM dùng connection, không phải mục tiêu giảm counter bằng mọi giá.

`Binlog_cache_use` và `Binlog_cache_disk_use` đếm transaction dùng binary log cache và transaction vượt `binlog_cache_size` nên phải ghi statement ra temporary file. Chúng có thể gợi ý transaction write lớn. Tỷ lệ hit đơn lẻ không đủ để đặt `binlog_cache_size`: lấy delta, xem kích thước/loại transaction, disk pressure và giới hạn bộ nhớ khi nhiều session cùng chạy.

`Created_tmp_*` chủ yếu đếm temporary table/file ngầm server tạo khi thực thi query; nó không tự cho biết bảng lớn bao nhiêu hoặc query nào gây ra. Cần phân biệt temporary object do người dùng tạo với temporary work của execution, rồi nối sang statement instrumentation theo phiên bản.

Các `Select_*` như `Select_scan`, `Select_range`, `Select_full_join` và `Select_range_check` mô tả một số kiểu access/join đã xảy ra. Chúng không phải bảng xếp hạng tốt/xấu áp dụng cho mọi schema: scan có thể đúng nếu query cần đọc phần lớn bảng; join không có điều kiện thường đáng xem xét ngay. Kiểm tra plan và rows thực tế trước khi thêm index.

`Handler_*` phản ánh lời gọi qua giao diện storage engine, chẳng hạn đọc next row hoặc truy cập theo key. `Sort_*` mô tả query phải sort thay vì lấy row theo thứ tự index; `Sort_scan` và `Sort_range` phân loại theo kiểu access của query, không có nghĩa hai kiểu sort có chi phí thuật toán khác nhau. `Sort_merge_passes` tăng khi phải merge nhiều run qua sort buffer, nhưng không phải thước đo độc lập để tăng `sort_buffer_size`. Các counter sort/temporary không cho biết trực tiếp query nào gây ra, dung lượng lớn đến đâu, hay user có bị chậm không. Nối với statement digest, `EXPLAIN ANALYZE`, temp-table instrumentation, memory/disk metrics và latency. `Key_*`, `Open_*` và `Qcache_*` trong sách gắn với MyISAM, table file hoặc query cache cũ; query cache đã bị loại bỏ từ MySQL 8.0 nên đừng áp dụng mẹo sizing lịch sử.

`Table_locks_immediate` và `Table_locks_waited` đo lock ở tầng server. Chúng không đếm row/gap locks của InnoDB; số thấp không loại trừ transaction bị chặn trên một record. Dùng Performance Schema lock/wait tables để xem đúng tầng.

### InnoDB, redo, buffer pool và I/O

Nhóm `Innodb_*` có counters, gauge và biến chuyên biệt thay đổi theo release. Đừng dựa vào một “hit ratio” tổng hợp để khẳng định buffer pool ổn: một tỷ lệ cao có thể che workload lệch, và một tỷ lệ thấp thoáng qua khi scan có thể không phải sự cố. Theo dõi delta của logical/physical reads, dirty/free pages, pending I/O, redo/checkpoint và thời gian chờ; ghép với disk latency, throughput và workload.

Các trường như insert/change buffer và adaptive hash index trong sách giải thích kiến trúc lịch sử, nhưng không phải tất cả đều có status hoặc hành vi như cũ ở MySQL 8.4. Tên, ý nghĩa, khả năng cấu hình và việc xuất hiện trong monitor phụ thuộc phiên bản. Dùng tài liệu hiện hành để diễn giải biến cụ thể, không suy từ tên gần giống.

## Đọc InnoDB Monitor theo từng vùng

`SHOW ENGINE INNODB STATUS\G` là snapshot văn bản dày đặc. Nó rất hữu ích khi được đọc cùng timestamp của incident, nhưng không phải timeline; output lịch sử gần nhất có thể là deadlock cũ hơn sự cố hiện tại. Output statement bị giới hạn kích thước và một phần có thể không được đưa vào báo cáo.

- **BACKGROUND THREAD** cho thấy hoạt động của thread nền như flush và write. So với tải và checkpoint để đặt câu hỏi về tiến độ, không dùng số vòng lặp đơn lẻ làm kết luận.
- **SEMAPHORES** có thông tin spin, rounds và OS waits. Spin tiêu CPU để chờ ngắn; ngủ trong OS tránh quay CPU nhưng có chi phí chuyển ngữ cảnh. Monitor cũ còn hiển thị số lần reserve/signal wait-array; chênh lệch hai mẫu có ích hơn số tích lũy kể từ startup. Chỉ nghi contention khi số liệu tăng theo cửa sổ thời gian và đi cùng CPU/throughput bất thường.
- **LATEST FOREIGN KEY ERROR** lưu lỗi khóa ngoại gần nhất; nó giúp giải thích một lần insert/update thất bại, không phải mọi lỗi constraint trong lịch sử. Tách lỗi dữ liệu vi phạm quan hệ khỏi lỗi định nghĩa schema: cột tham chiếu có thể thiếu index bắt đầu bằng các cột FK, hoặc hai phía có kiểu không khớp chính xác như `INT` với `INT UNSIGNED`. Xác nhận tên constraint/table, loại thao tác và index trước khi đổi schema.
- **LATEST DETECTED DEADLOCK** cho cycle gần nhất mà InnoDB phát hiện: transaction, câu lệnh, index/record và lock liên quan. Xác định transaction nào bị rollback, vì output có thể dài/truncated. So deadlock graph với thứ tự truy cập tài nguyên trong ứng dụng; sửa thứ tự hoặc rút ngắn transaction thường bền hơn retry vô hạn.
- **TRANSACTIONS** giúp tìm transaction đang hoạt động, tuổi transaction, read view, lock wait và trạng thái purge. Transaction dài giữ snapshot cũ có thể cản purge dọn phiên bản không còn cần; khi đó history list/undo tăng dù query hiện tại không dài. Tìm session sở hữu transaction và đường request trước khi kết thúc connection, vì rollback cũng có thể kéo dài và tạo I/O.
- **FILE I/O** tóm tắt pending reads/writes/fsync và hoạt động I/O. Ghép các queue/pending count với latency thiết bị và thời điểm; pending không đồng nghĩa thiết bị đang quá tải nếu mức hoàn tất cũng cao.
- **LOG** nói về LSN, checkpoint và flush. Độ chênh giữa vị trí redo hiện tại và checkpoint cần được hiểu trong bối cảnh tốc độ ghi, flush và dung lượng log; không có một ngưỡng phổ quát độc lập với workload.
- **BUFFER POOL AND MEMORY** cho số page theo trạng thái free/database/modified và pending I/O. Hit rate trong output là trung bình theo khoảng ngắn của monitor, không phải SLA; đọc cùng working set, reads và latency.
- **ROW OPERATIONS** và trạng thái background thread giúp nhận ra việc xử lý/flush đang chạy hoặc idle. Đây là gợi ý hoạt động engine, không phải profile theo query.

Các bộ đếm average trong output không nhất thiết cùng một khoảng thời gian: một số tính từ lần in status gần nhất, một số có reset interval riêng; output cũng không phải snapshot nguyên tử ở một thời điểm duy nhất. Với MySQL 5.x mà sách mô tả, một số `Innodb_*` status có thể giữ global lock và quét toàn buffer pool, làm thread khác chờ và khiến `Threads_running` bị méo. Đây là hành vi phụ thuộc phiên bản, không suy ra nguyên xi cho release hiện tại. Trên version đang chạy, kiểm tra manual và đo overhead trong staging; vẫn tránh polling quá dày và luôn giữ timestamp. Sách còn minh họa transaction ID 64-bit thành hai số 32-bit cao/thấp; nếu gặp format cũ này, ghép bằng `(high << 32) + low`, nhưng không áp dụng cách đọc đó cho output mới nếu format đã đổi.

## Process list là ảnh chụp thread, không phải lịch sử query

`SHOW PROCESSLIST` trả lời thread đang làm gì tại thời điểm lấy mẫu. Các cột hữu ích gồm ID để tìm đúng connection; user/host/database để biết nguồn; `Command` để phân biệt query với session `Sleep`; `Time` để biết thread đã ở trong state hiện tại bao lâu; `State` để hiểu bước đang chờ/chạy; và `Info` để xem statement. Ngoại lệ cần nhớ: với replica SQL thread, `Time` có ý nghĩa gắn với timestamp event được apply và đồng hồ replica, không phải thời lượng chạy query thông thường. Một state thường chỉ tồn tại rất ngắn, nên một dòng đứng yên trong một lần chụp chưa đủ để kết luận bị treo. Chụp lặp lại có timestamp rồi đối chiếu query, lock waits, transaction age và log.

Dùng `SHOW FULL PROCESSLIST` khi cần câu SQL đầy đủ: không có `FULL`, `Info` chỉ hiển thị 100 ký tự đầu. Quyền `PROCESS` cho phép xem thread của người dùng khác; nếu thiếu quyền, thông tin có thể chỉ gồm session của chính mình. Nội dung query có thể chứa dữ liệu nhạy cảm nên đừng đăng nguyên output lên nơi công khai.

`KILL QUERY` yêu cầu dừng statement hiện tại; `KILL CONNECTION` đóng session. Cả hai không đồng nghĩa mọi công việc biến mất tức thì: InnoDB có thể phải rollback transaction, và rollback lớn vẫn tiêu I/O/CPU. Trước khi kill, xác định transaction nào bị ảnh hưởng, có request retry hay không và rollback có thể kéo dài đến đâu. Với MySQL 8.4, có thể đọc `performance_schema.processlist`; implementation này truy vấn dữ liệu từ Performance Schema, không cần mutex của thread manager và có đặc tính hiệu năng tốt hơn trong môi trường bận. Xem [SHOW PROCESSLIST](https://dev.mysql.com/doc/refman/8.4/en/show-processlist.html) và [processlist table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-processlist-table.html).

## Mutex statistics cần so theo cửa sổ thời gian

`SHOW ENGINE INNODB MUTEX` giúp khảo sát mutex và read/write lock bên trong InnoDB, và cần quyền `PROCESS`. Sách dùng output cũ với `os_waits`; MySQL 8.4 mô tả các trường `spins`, `waits` và `calls`. Một lock có wait là một điểm đáng tìm hiểu, chưa đủ để kết luận đó là bottleneck: số tích lũy từ lâu có thể lớn dù hiện tại đã hết contention. Lấy hai snapshot cùng instance rồi xét delta trong lúc latency/throughput đang xấu; nối tên mutex với CPU, waits và workload trong cùng cửa sổ.

Output cũng không phải danh sách đầy đủ mọi lock. Các mutex/rw-lock chưa từng phải chờ có thể không xuất hiện; lock của từng block buffer pool không được liệt kê từng cái một, thay vào đó có số liệu tổng hợp cho `BUF_BLOCK_MUTEX`. Trên MySQL 8.4, thu thập mutex statistics có thể bật bằng `SET GLOBAL innodb_monitor_enable='latch'` và reset bằng `SET GLOBAL innodb_monitor_reset='latch'`; reset làm thay đổi baseline mà collector đang dùng, nên phải ghi nhận rõ trước khi thực hiện. Instrument mutex-wait của Performance Schema là lớp riêng, mặc định có thể tắt; kiểm tra `setup_instruments`/consumer và điều kiện khởi động trước khi dựa vào dữ liệu. Đừng so số giữa version/build khác nhau hoặc lấy số `waits` đơn lẻ làm lý do tăng/giảm concurrency. MySQL 8.4 mô tả lệnh và cách theo dõi trong [SHOW ENGINE](https://dev.mysql.com/doc/refman/8.4/en/show-engine.html) và [Monitoring InnoDB mutex waits with Performance Schema](https://dev.mysql.com/doc/refman/8.4/en/monitor-innodb-mutex-waits-performance-schema.html).

## INFORMATION_SCHEMA biến metadata thành SQL

`INFORMATION_SCHEMA` là lớp metadata có thể đọc bằng SQL: tên database/bảng/cột, kiểu dữ liệu, quyền, chỉ mục và một số trạng thái của server. Nó giống catalog của hệ quản trị hơn là bảng nghiệp vụ. Bạn đọc bằng `SELECT`; không dùng `INSERT`, `UPDATE` hay `DELETE` để sửa metadata ở đây. Điểm tiện hơn nhiều lệnh `SHOW` là có thể lọc, sắp xếp, nối và tổng hợp kết quả ngay trong một truy vấn.

Ví dụ dưới đây tìm các cột mang tên `actor_id` trong Sakila:

```sql
SELECT TABLE_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'sakila'
  AND COLUMN_NAME = 'actor_id'
  AND TABLE_NAME <> 'actor'
ORDER BY TABLE_NAME, ORDINAL_POSITION;
```

Đây là cách tìm ứng viên để điều tra, không phải bằng chứng rằng các cột ấy có quan hệ khóa ngoại với `actor.actor_id`. Hai cột cùng tên có thể mang ý nghĩa khác nhau. Khi cần xác nhận constraint, hãy truy vấn `KEY_COLUMN_USAGE` và kiểm tra `REFERENCED_TABLE_SCHEMA`, `REFERENCED_TABLE_NAME` cùng `REFERENCED_COLUMN_NAME`. Bảng này mô tả cột tham gia constraint; nó không phải danh mục đầy đủ mọi loại key part của index.

Với chỉ mục, `STATISTICS` có một dòng cho mỗi thành phần của mỗi index. `SEQ_IN_INDEX` cho biết thứ tự thành phần; thứ tự này quan trọng vì index ghép `(a, b)` không tương đương `(b, a)`, và thường chỉ hỗ trợ tốt các truy vấn bắt đầu từ tiền tố trái phù hợp. Truy vấn sau gom các thành phần theo thứ tự để đọc index ghép:

```sql
SELECT TABLE_NAME, INDEX_NAME,
       GROUP_CONCAT(COALESCE(COLUMN_NAME, EXPRESSION)
                    ORDER BY SEQ_IN_INDEX) AS key_parts
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'sakila'
GROUP BY TABLE_NAME, INDEX_NAME
HAVING COUNT(*) > 1
ORDER BY TABLE_NAME, INDEX_NAME;
```

`HAVING COUNT(*) > 1` chỉ chọn index có nhiều thành phần; nó không tự nói index đó tốt hay được query sử dụng. MySQL 8.4 còn có functional key parts: `COLUMN_NAME` là `NULL`, còn `EXPRESSION` chứa biểu thức. `COALESCE` giúp ví dụ hiển thị cả hai dạng. Metadata cho biết định nghĩa; để hiểu optimizer có chọn index trong một truy vấn cụ thể hay không, hãy xem `EXPLAIN` và workload thực tế.

Có một khác biệt phiên bản cần nhớ khi đọc sách. Ở các bản MySQL cũ mà sách mô tả, một số truy vấn metadata có thể phải tạo bảng tạm hoặc đọc nhiều metadata, nên việc quét rộng trên server lớn gây tải đáng kể. MySQL 8.4 tích hợp nhiều view với data dictionary và tối ưu một số đường truy cập, nhưng điều đó không biến mọi truy vấn thành miễn phí. Đặc biệt, số liệu bảng/index trong `TABLES` và `STATISTICS` có thể được cache; mặc định `information_schema_stats_expiry` là 86400 giây. Đặt biến này bằng `0` buộc lấy thống kê trực tiếp từ storage engine để có số mới hơn, đổi lại có thể chậm hơn. Hãy giới hạn schema/bảng, kiểm tra `EXPLAIN` khi phù hợp, và chỉ yêu cầu số liệu động khi câu hỏi cần chúng.

Cuốn sách cũng giới thiệu các bảng InnoDB trong `INFORMATION_SCHEMA` như `INNODB_TRX`, `INNODB_LOCKS` và `INNODB_LOCK_WAITS`. Đây là ví dụ hữu ích về việc nối metadata với tình trạng giao dịch, nhưng phần lock đã đổi theo phiên bản: trên MySQL 8.4, xem lock đang giữ/yêu cầu trong `performance_schema.data_locks` và quan hệ blocker→waiter trong `performance_schema.data_lock_waits`; `INNODB_TRX` vẫn cung cấp trạng thái transaction. View `sys.innodb_lock_waits` có thể trình bày quan hệ chờ ở dạng dễ đọc hơn. Luôn ghép kết quả với process list và thời điểm lấy mẫu vì lock có thể biến mất trong lúc bạn điều tra.

Nguồn: *High Performance MySQL*, Appendix B, “The INFORMATION_SCHEMA” và “InnoDB Tables” (PDF tr. 739–740); [INFORMATION_SCHEMA overview](https://dev.mysql.com/doc/refman/8.4/en/information-schema-introduction.html), [query optimization](https://dev.mysql.com/doc/refman/8.4/en/information-schema-optimization.html), [STATISTICS table](https://dev.mysql.com/doc/refman/8.4/en/information-schema-statistics-table.html), [KEY_COLUMN_USAGE](https://dev.mysql.com/doc/refman/8.4/en/information-schema-key-column-usage-table.html), [data_lock_waits](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-data-lock-waits-table.html), [sys lock-wait view](https://dev.mysql.com/doc/refman/8.4/en/sys-innodb-lock-waits.html).

## Từ tín hiệu đến giả thuyết có thể kiểm chứng

Giả sử throughput giảm, `Threads_running` tăng và app báo p99 cao. Đây chưa đủ để tăng `max_connections`. Ta chụp cùng thời điểm: connection pool wait, process list, statement digest, data lock waits, CPU, disk latency, replication lag và InnoDB status. Nếu nhiều thread đều chờ cùng một row lock, tăng connection chỉ thêm người xếp hàng. Nếu CPU bão hòa bởi một digest, xem plan và số lần chạy. Nếu pending I/O và latency thiết bị cùng tăng trong lúc flush, điều tra write workload/checkpoint. Chọn một giả thuyết, thay một yếu tố, rồi kiểm tra xem tín hiệu dự đoán có đổi không.

Một checklist mẫu:

1. Xác nhận instance, phiên bản, timezone và thời điểm bắt đầu sự cố.
2. Thu hai hoặc nhiều snapshot có timestamp; đánh dấu restart, failover và reset counter.
3. Phân loại biến thành counter, gauge hay cấu hình; xác nhận global/session scope.
4. Tính delta/rate và đặt cạnh latency/throughput/error của cùng cửa sổ.
5. Dùng Performance Schema và `sys` để đi từ nhóm sự kiện tới digest, wait, transaction hoặc lock.
6. Ghi giả thuyết, bằng chứng ủng hộ, bằng chứng phản bác, thay đổi nhỏ và rollback.

Đừng tối ưu chỉ vì counter “đẹp hơn”. Mục tiêu là cải thiện một thuộc tính người dùng quan tâm mà không làm hỏng tính đúng, độ bền hoặc giới hạn tài nguyên.

## Các công cụ hiện hành và giới hạn

Trong MySQL 8.4, Performance Schema cung cấp event, wait, statement, thread, lock và status instrumentation; `sys` thêm view và thủ tục giúp đọc chúng. Để biết vì sao một event có hoặc không có trong kết quả, hãy lần theo bốn lớp:

1. **Instrument** (`setup_instruments`) xác định loại hoạt động server có thể đo, chẳng hạn statement, stage, wait hoặc mutex. Instrument phải được bật; `TIMED=NO` có nghĩa event có thể được đếm nhưng không có thời lượng.
2. **Thread filter** quyết định thread nào được instrument. `setup_consumers` có `thread_instrumentation`, còn `performance_schema.threads` cho biết từng thread có đang được instrument/history hay không.
3. **Consumer** (`setup_consumers`) quyết định sự kiện được giữ ở đâu: bảng `_current` cho event đang chạy, `_history` cho một số event gần đây theo thread, `_history_long` cho một số event gần đây toàn server. Nếu consumer tương ứng tắt, bật instrument thôi chưa đủ để có history.
4. **Summary** gom nhiều event theo thread, account, digest hoặc object. Summary phù hợp để tìm nhóm tích lũy nhiều thời gian; history phù hợp để xem một vài execution cụ thể. Tổng tích lũy không giữ đầy đủ thứ tự và chi tiết từng lần chạy.

Có thể kiểm tra cấu hình mà chưa thay đổi nó:

```sql
SELECT NAME, ENABLED, TIMED
FROM performance_schema.setup_instruments
WHERE NAME LIKE 'statement/%'
ORDER BY NAME;

SELECT NAME, ENABLED
FROM performance_schema.setup_consumers
WHERE NAME LIKE 'events_statements%'
ORDER BY NAME;
```

Các history tables có giới hạn dung lượng; event cũ bị thay thế khi bảng đầy. Digest chuẩn hóa literal để gom query tương tự, nhưng độ dài digest có giới hạn và statement mẫu không đại diện mọi giá trị đầu vào. Sách đo các bản MySQL 5.5 thời kỳ đầu: khoảng 8–11% overhead khi bật nhưng chưa thu event, và 19–25% khi bật mọi consumer, tùy workload. Đây là benchmark theo release/máy/test khi đó, không phải hệ số overhead cho MySQL 8.4; hãy đo cấu hình instrument hiện dùng với workload của mình. Trước khi bật history dài hoặc instrument chi tiết, xem dung lượng, retention và overhead dự kiến của cấu hình cụ thể.

`SHOW PROCESSLIST` trả lời “thread đang ở đâu lúc này”; digest summary trả lời “nhóm statement nào tích lũy nhiều thời gian”; event history có thể cho biết một execution vừa diễn ra; `SHOW ENGINE INNODB STATUS` tóm tắt một số vùng internals. `INFORMATION_SCHEMA` vẫn hữu ích cho metadata có cấu trúc, nhưng không phải mọi view có cùng chi phí. Chọn nguồn theo câu hỏi và giới hạn query chẩn đoán trong production.

Nguồn: *High Performance MySQL*, Appendix B (PDF tr. 715–744); [SHOW STATUS và scope](https://dev.mysql.com/doc/refman/8.4/en/show-status.html), [server status variables](https://dev.mysql.com/doc/refman/8.4/en/server-status-variables.html), [binary log cache variables](https://dev.mysql.com/doc/refman/8.4/en/replication-options-binary-log.html), [SHOW PROCESSLIST](https://dev.mysql.com/doc/refman/8.4/en/show-processlist.html), [Performance Schema processlist table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-processlist-table.html), [Performance Schema event tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-event-tables.html), [setup_instruments](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-setup-instruments-table.html), [setup_consumers](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-setup-consumers-table.html), [SHOW ENGINE](https://dev.mysql.com/doc/refman/8.4/en/show-engine.html), [Monitoring InnoDB mutex waits](https://dev.mysql.com/doc/refman/8.4/en/monitor-innodb-mutex-waits-performance-schema.html), [InnoDB Monitor](https://dev.mysql.com/doc/refman/8.4/en/innodb-standard-monitor.html), [Performance Schema status tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-status-variable-tables.html), [statement digests](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-digests.html), [sys schema](https://dev.mysql.com/doc/refman/8.4/en/sys-schema.html).

## Tự kiểm tra

**`Threads_connected` tăng có nghĩa là query chạy đồng thời tăng?** Không. Nó đếm session mở; `Threads_running` gần hơn với thread đang thực thi, nhưng vẫn cần xem waits và workload.

**`Select_scan` khác 0 nghĩa là thiếu index?** Không. Scan có thể là plan đúng khi phần lớn hàng cần được đọc. Kiểm tra predicate, rows và chi phí thực.

**Một `LATEST DETECTED DEADLOCK` cũ chứng minh incident hiện tại do deadlock?** Không. Đó chỉ là deadlock gần nhất được ghi trong output; ghép timestamp, logs và lock instrumentation.

**Tôi nên chỉnh buffer/connection ngay khi thấy counter xấu?** Chưa. Lấy baseline, tìm statement hoặc wait tạo ra tín hiệu, rồi thử thay đổi có thể đo và hoàn tác.

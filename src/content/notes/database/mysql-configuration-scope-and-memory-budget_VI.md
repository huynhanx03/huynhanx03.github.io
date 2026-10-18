---
title: "Phạm vi biến cấu hình và memory budget MySQL"
category: "Database"
description: "Đọc scope/dynamic variables, phân biệt global và session memory, rồi thay config theo vòng benchmark an toàn."
updated: 2026-10-17
translationKey: "database/mysql-configuration-scope-and-memory-budget"
---

MySQL setting có phạm vi global, session hoặc cả hai; có biến chỉ đọc lúc startup, có biến dynamic thay được khi chạy, và một số thay đổi chỉ tác động connection mới. Ghi giá trị vào file config không chứng minh server đang dùng nó: cần kiểm tra `SHOW VARIABLES`, startup logs và nguồn option đã nạp.

## Truy vết giá trị cấu hình đang có hiệu lực

`mysqld` có thể đọc nhiều option file, nhận thêm option từ service manager/command line, rồi nạp persisted system variables từ `mysqld-auto.cnf`. Với server, persisted values được xử lý sau các option file và có thể ghi đè giá trị trước đó. Vì vậy, sửa đúng một file chưa chắc sửa được biến đang chạy. Package, container và managed service còn có cách khởi động riêng.

Hãy kiểm tra server binary, cách service khởi động, option file được đọc và group `[mysqld]`; cấu hình trong `[client]` chỉ dành cho client. `mysqld --verbose --help` hiển thị các đường dẫn option file mặc định của binary đó. Sau đó kiểm tra giá trị runtime, source persisted và error log. Ghi lại cả đơn vị: biến có thể tính theo byte, giây, số kết nối hoặc số page.

MySQL xử lý option theo thứ tự; option về sau thường thắng. `SET GLOBAL` chỉ đổi instance hiện tại. `SET PERSIST` vừa đổi global runtime vừa lưu vào `mysqld-auto.cnf`, còn `SET PERSIST_ONLY` lưu để áp dụng lúc khởi động cho biến phù hợp. Khi muốn dọn một giá trị đã persist, dùng `RESET PERSIST` thay vì sửa trực tiếp file do server quản lý. Nếu hai nguồn cấu hình bất đồng, ghi cả hai vào change record để lần restart sau không làm cấu hình quay lại ngoài dự kiến.

## Global và session scope

`SET GLOBAL x=...` thay giá trị mặc định cho session mới, thường không đổi session đang mở; `SET SESSION` chỉ đổi connection hiện tại. Connection pool giữ session lâu nên một request có thể thừa hưởng isolation/sql_mode/timezone từ request trước nếu ứng dụng không reset. Với `SET PERSIST` ở phiên bản hỗ trợ, giá trị được lưu để qua restart; quản lý cả config file và persisted variables để tránh drift.

Dynamic không có nghĩa đổi an toàn ngay: tăng buffer/cache có thể cấp memory, giảm giới hạn có thể không giải phóng ngay hoặc ảnh hưởng đang chạy. Đọc `SET` scope/dynamic metadata theo version và thử ở staging.

Một biến `GLOBAL` thường đặt giá trị khởi tạo cho connection mới; các session hiện tại giữ session value của riêng chúng. Do đó, sau khi đổi `max_execution_time` hoặc `sql_mode` ở global scope, pool lâu đời có thể tiếp tục dùng giá trị cũ. Kiểm tra cả global lẫn session value trong một connection đại diện, và xác định ứng dụng có reset session state khi trả connection về pool không.

## Global memory và per-connection memory

InnoDB buffer pool, redo buffers/capacity, key cache, table/open cache và thread cache khác với per-connection sort/join/read buffers, temp tables, binlog/replication buffers. Ước lượng peak:

```text
RAM ≈ global buffers + active_connections × worst-case per-connection use
      + OS/page cache + agents + safety headroom
```

Đây là upper-bound planning model, không phải memory luôn được cấp hết. Tuy nhiên `max_connections × buffer settings` giải thích OOM do config “hợp lý” ở một connection nhưng nguy hiểm khi burst.

`sort_buffer_size`, `join_buffer_size`, `read_buffer_size` và `read_rnd_buffer_size` là những biến dễ bị tăng quá tay vì mỗi connection/query có thể cần cấp buffer theo thao tác. Một câu query join nhiều bảng có thể cần nhiều join buffer; không phải mỗi connection chỉ có đúng một. Sort buffer 256 MB không làm mọi sort nhanh hơn: nó có thể tiêu nhiều RAM và thời gian khởi tạo kể cả khi query chỉ sort ít row. Trước tiên xem plan, số row cần sort và liệu index có thể tránh sort không.

Nếu một query phân tích riêng thật sự cần buffer lớn hơn, có thể đặt session value chỉ quanh query, lưu giá trị ban đầu rồi khôi phục ngay. Chỉ làm vậy khi biến có scope session và quyền phù hợp; không để connection pool tái sử dụng connection với giá trị bất thường.

Temporary table cũng phải đọc theo version. MySQL 8.4 dùng `TempTable` mặc định cho internal in-memory temporary table; `tmp_table_size` giới hạn mỗi table, còn `temptable_max_ram` giới hạn vùng RAM chung của engine. Với internal tables dùng engine `MEMORY`, `tmp_table_size` và `max_heap_table_size` cùng tham gia giới hạn. Sách cũ mô tả chuyển sang MyISAM trên đĩa; đó không phải behavior hiện tại. Spill ra đĩa có thể hợp lý hơn việc cho mọi query giữ một temporary table lớn trong RAM.

## Cấu hình an toàn có thể kiểm chứng

Không đặt mọi variable theo template benchmark. Giữ `max_connections` theo pool/capacity, bật slow logging có retention, xác nhận `sql_mode`, charset, timezone, `read_only`/super_read_only cho replica, binary log và durability policy. Không bật `skip-networking`/bind rộng tùy tiện; authentication/TLS/ACL và firewall phải khớp topology.

Trước thay đổi, lưu effective variables, workload baseline, memory/latency/error. Thay ít biến, restart nếu cần theo thứ tự rollout, kiểm tra server log/config warnings, rồi đo lại. Tài liệu variable page versioned; một tên variable có thể deprecated/renamed hoặc default đổi.

Một lần chỉnh nên có giả thuyết cụ thể: “sort buffer đang được cấp lặp lại khi query X sort 2 triệu row; session-level thử nghiệm ở Y có giảm p95 mà không làm tăng RSS dưới tải đồng thời không?” Chạy workload có cùng mix read/write, concurrency, dataset, warm-up và durability. Thay một hoặc hai biến, chờ steady state, so latency phân vị, throughput, error, RSS, swap, disk I/O và số operation liên quan. Ghi cả kết quả xấu để tránh lặp lại.

Đừng tối ưu chỉ theo cache hit ratio, “buffer pool hit” hay kết quả của tuning script. Ratio có thể đẹp trong khi query vẫn chờ I/O, lock hoặc CPU; benchmark một loại query có thể làm loại khác chậm đi. Cấu hình trong sách Chương 8 là ví dụ lịch sử, không phải file mẫu hiện hành: chẳng hạn query cache không còn trong MySQL hiện đại, `innodb_log_file_size` cũ đã được thay bằng cách cấu hình redo capacity ở bản mới, và temporary-table engine đã đổi.

## Các cơ chế cấu hình mà Chương 8 muốn ta hiểu

### Bắt đầu từ workload và thay đổi ít biến

Sách mở đầu bằng một nguyên tắc dễ bị bỏ qua: đừng bắt đầu bằng cách hỏi “máy có bao nhiêu RAM thì nên bật biến nào?”. Hãy xem query nào chậm, query làm bao nhiêu việc, server đang chờ CPU, lock hay storage, rồi mới chọn biến có thể tác động đúng đường đi đó. Phần lớn hệ thống cần schema/index/query tốt và một số thiết lập nền tảng; lợi ích từ những núm chỉnh sâu thường nhỏ hơn rủi ro cấu hình quá tay.

Trước khi đổi, lấy nhiều snapshot ở giờ cao điểm và bình thường. Status counter dạng tích lũy cần lấy delta trên một khoảng thời gian; một giá trị tổng từ lúc server khởi động không nói được tốc độ hiện tại. Ghi version, biến global/session, nguồn cấu hình, workload, latency phân vị, throughput, lỗi, RSS, swap và storage queue. Đổi một nhóm nhỏ có giả thuyết rõ; quan sát đến steady state; nếu cải thiện query mục tiêu nhưng làm tổng workload xấu đi thì rollback.

Benchmark vẫn hữu ích cho capacity planning, chọn server/storage, kiểm tra recovery time hoặc so workload trước/sau migration. Khi dùng để chỉnh config, replay query thật trên dữ liệu gần production và giữ read/write mix, concurrency, warmup cùng durability policy. Không tune theo hit ratio hoặc tuning script, và không tin một công thức crash log như thể nó là upper bound memory: prepared statement, temporary result, query complexity và concurrency làm footprint thay đổi. Giữ config trong version control, ghi lý do từng setting và xem lại sau khi schema/workload/version đổi.

### Mỗi cache giữ một loại dữ liệu

InnoDB buffer pool giữ data/index page và cấu trúc nội bộ; MyISAM key cache giữ index block còn data file thường dựa vào OS page cache. Vì thế nếu tăng key cache, cần tính cả RAM dành cho OS cache dữ liệu MyISAM. Đừng suy ra “index hit 99%” là đủ: số lần đọc vật lý mỗi giây và độ trễ của các lần miss mới cho biết storage có thành nút thắt hay không. Trên MySQL 8.4, nhiều hệ thống không dùng MyISAM nên key cache thường không phải biến chính.

Thread cache tái sử dụng worker khi connection đóng rồi connection khác mở; nó giảm chi phí tạo thread khi churn kết nối cao. Nó không phải connection pool và cũng không làm giảm số session đang chạy. Theo dõi `Threads_created` theo thời gian cùng `Threads_connected`, thay vì chọn số lớn theo cảm tính.

Table-open cache giữ tài nguyên của table đang mở; table-definition cache giữ định nghĩa đã parse. Bản sách mô tả việc tách hai cache từ MySQL 5.1; tên/behavior hiện tại cần xác nhận ở manual phiên bản đích. Mở quá ít làm tăng reopen; mở quá nhiều có thể chạm file descriptor hoặc tăng chi phí tìm trong cache. `Opened_tables` tăng không tự động có nghĩa cache thiếu, vì temporary table và DDL cũng làm counter đổi. InnoDB còn có data dictionary riêng; một server cũ có hàng chục nghìn table có thể tốn memory và chậm khởi động khi mở/tính statistics. Đừng gọi đó là leak nếu bộ nhớ tăng cùng số metadata được cache; đo số table, RSS và thời gian startup.

### Global buffer không phải toàn bộ memory budget

Sách tách memory thành giới hạn process/OS, nhu cầu theo connection và phần còn lại cho cache. Per-connection buffer có thể được cấp theo operation: một query join nhiều bảng có thể có nhiều join buffer; sort/read buffer có thể được cấp theo thao tác. Do đó công thức `max_connections × mọi buffer` là trần rất bảo thủ, không phải mức sử dụng bình thường; nhưng chỉ nhìn vào lượng RAM của một query cũng bỏ qua burst concurrency.

Buffer pool không cần lớn hơn working set có ích chỉ vì máy còn RAM. Pool lớn giảm disk read lặp lại nhưng có thể kéo dài warm-up và thời gian flush khi shutdown; tăng pool online cũng chia chunk và tiêu tốn memory ngay. MySQL hiện có thể lưu một phần page list rồi nạp lại lúc startup; đây là cách rút ngắn warm-up, không phải đảm bảo mọi page nóng sẽ còn trong RAM. Theo dõi `Innodb_buffer_pool_pages_dirty`, pages read/flushed, disk latency và throughput khi tải lại.

### An toàn cho dữ liệu là một phần của tuning

`innodb_flush_log_at_trx_commit` chọn thời điểm redo được ghi/flush quanh commit: giá trị bền chặt hơn tăng yêu cầu I/O, còn lựa chọn lỏng hơn chấp nhận cửa sổ mất transaction khi crash. Khi bật binary log, `sync_binlog` tham gia độ bền và đồng bộ replication/PITR. Chọn cả hai theo RPO và kiểm thử phần cứng thật; OS hoặc controller báo flush xong không luôn có nghĩa dữ liệu đã nằm trên medium bền. Tài liệu hiện hành mô tả cặp chính sách cho durability cao; đừng hạ chúng chỉ để tăng benchmark.

Các biến như `max_allowed_packet`, `sql_mode`, `skip_name_resolve`, `read_only`/`super_read_only`, binary-log retention và startup failure behavior có thể ngăn lỗi dữ liệu hoặc lỗi vận hành nhưng không phải công cụ tăng tốc chung. `skip_name_resolve` đòi account grant tương thích IP/hostname; strict SQL mode có thể làm app cũ fail khi insert dữ liệu không hợp lệ; retention phải đủ lâu cho restore/PITR nhưng có giới hạn disk. Test trong staging và rà application expectations trước khi áp dụng.

### Các núm InnoDB nâng cao cần có bằng chứng

Chương 8 nêu `innodb_buffer_pool_instances` để giảm contention trên pool rất lớn; MySQL 8.4 tự chọn default theo kích thước pool/CPU, và mỗi instance cần đủ lớn để có ích. Không chép con số “8 instance” trong benchmark cũ. `innodb_read_io_threads`/`innodb_write_io_threads` điều khiển worker I/O nền, không phải số query song song; tăng chúng chỉ có tác dụng nếu quan sát được hàng đợi I/O mà worker không xử lý kịp.

Chương 8 nêu `innodb_io_capacity` như cách báo cho InnoDB biết storage có thể xử lý bao nhiêu I/O mỗi giây để lập kế hoạch công việc nền. Ở phiên bản sách, InnoDB mặc định giả định khoảng 100 IOPS; không dùng con số này cho hệ thống mới. Trong MySQL 8.4, giá trị mặc định là 10.000, còn ý nghĩa vẫn là ước lượng capacity dành cho các việc như flush dirty page và merge change buffer, không phải giới hạn cứng mọi I/O. Nếu đặt quá thấp, dirty-page flushing và change-buffer merges có thể tụt lại, làm tăng checkpoint pressure; nếu đặt quá cao, page có thể bị đẩy khỏi buffer pool quá nhanh và làm giảm lợi ích cache. `innodb_io_capacity_max` cho phép tăng tốc khi backlog lớn; nếu đặt `innodb_io_capacity` lúc khởi động mà không đặt max, max mặc định bằng hai lần capacity. Đo IOPS thực của volume trong đúng môi trường, checkpoint age, dirty pages, pending flush và latency trước/sau; không đoán từ số spindle hay loại SSD.

MySQL 8.4 cũng đổi hai default liên quan tới cơ chế InnoDB: adaptive hash index chuyển từ bật sang tắt, và change buffering chuyển từ `all` sang `none`. Adaptive hash index có thể rút ngắn lookup lặp lại trên B-tree khi pattern truy cập phù hợp, nhưng có chi phí memory và latch contention; benchmark cả hai trạng thái bằng workload thật. Change buffer trì hoãn một số sửa đổi trên non-unique secondary index khi page tương ứng chưa nằm trong buffer pool, để gom I/O về sau; nó hữu ích trong một số workload ghi ngẫu nhiên nhưng kém cần thiết khi working set đã nằm trong RAM hoặc ít secondary index. Đừng khôi phục default cũ chỉ vì sách/benchmark cũ khuyên như vậy; quan sát index writes, merge backlog, I/O và p95.

`innodb_thread_concurrency` giới hạn thread đang ở trong InnoDB, còn `innodb_commit_concurrency` giới hạn commit đồng thời. Chúng có thể giảm oversubscription trên workload cụ thể nhưng cũng tạo hàng chờ và tăng latency; MySQL 8.4 mặc định không giới hạn concurrency InnoDB. Chỉ thử khi đã đo contention/scheduler pressure và luôn so với default. `innodb_autoinc_lock_mode` đổi cách cấp auto-increment giữa câu insert; mode mặc định interleaved ở 8.4 phù hợp replication row-based nhưng có thể tạo khoảng số tăng và không bảo đảm dãy consecutive giữa nhiều statement đồng thời. `innodb_strict_mode` chuyển một số cấu hình table nguy hiểm từ warning thành error, nên kiểm tra DDL/restore trước khi bật.

`innodb_old_blocks_time` kiểm soát thời gian page nằm trong vùng LRU “old” trước khi có thể được promote. Nó có thể hạn chế full scan một lần đẩy page nóng ra khỏi cache, nhưng cũng có thể trì hoãn promotion của page thực sự dùng lại. Chỉ chỉnh nếu cache pollution được quan sát; thử query scan và workload thường cùng nhau. Các con số buffer pool instances, concurrency tickets và thread limits trong bản sách phản ánh server cũ, không phải lời khuyên mặc định hiện nay.

### Temporary table, BLOB/TEXT và filesort phải đọc theo release

Counter temporary table giúp phát hiện query tạo nhiều trung gian, nhưng không nói được từng query nào spill. Từ các counter global hãy chuyển sang query digest/plan và Performance Schema để xác định nguồn. Sách khuyên `tmpdir` đủ dung lượng và cân nhắc memory filesystem cho MySQL cũ; ngày nay phải tính giới hạn RAM, swap, container cgroup và bảo đảm filesystem tạm không biến hết memory thành áp lực hệ thống.

Sách mô tả BLOB/TEXT khiến một số temporary table xuống disk và mô tả thuật toán filesort hai lượt của phiên bản cũ. MySQL 8.4 TempTable có hỗ trợ BLOB/TEXT trong một số internal temporary-table path; điều kiện spill phụ thuộc query, giới hạn RAM và loại dữ liệu. Các biến `max_length_for_sort_data`/`max_sort_length` và thuật toán sort cũng phụ thuộc release. Không tăng sort buffer hoặc đưa cả payload dài vào sort để “chữa” query; giảm cột cần materialize, chọn index phù hợp, phân trang theo khóa và đo merge passes/temporary bytes. Chi tiết external storage của InnoDB thay đổi theo row format/page size, nên con số prefix/page trong sách chỉ để hiểu vì sao lấy BLOB không cần thiết có thể gây I/O.

## Khi config sai

OOM killer, swapping, too-many-connections, temp table spill và buffer pool pressure có dấu hiệu khác. Correlate `SHOW GLOBAL STATUS`, Performance Schema, process RSS, OS memory, disk queue và connection pool. Rollback config không nhất thiết sửa state runtime ngay; restart có outage/cold cache impact.

*High Performance MySQL*, ch. 8 và Appendix B, bao gồm config scope, status variables, memory caches và safety settings. Đối chiếu [option files](https://dev.mysql.com/doc/refman/8.4/en/option-files.html), [server system variables](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html), [SET](https://dev.mysql.com/doc/refman/8.4/en/set-variable.html), [persisted variables](https://dev.mysql.com/doc/refman/8.4/en/persisted-system-variables.html), [internal temporary tables](https://dev.mysql.com/doc/refman/8.4/en/internal-temporary-tables.html), [memory use](https://dev.mysql.com/doc/refman/8.4/en/memory-use.html), [redo logging](https://dev.mysql.com/doc/refman/8.4/en/optimizing-innodb-logging.html), [transaction durability](https://dev.mysql.com/doc/refman/8.4/en/optimizing-innodb-transaction-management.html), [binary-log durability](https://dev.mysql.com/doc/refman/8.4/en/replication-options-binary-log.html), [buffer-pool warmup](https://dev.mysql.com/doc/refman/8.4/en/innodb-preload-buffer-pool.html), [InnoDB variables](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html), and [background I/O threads](https://dev.mysql.com/doc/refman/8.4/en/innodb-performance-multiple_io_threads.html), [I/O capacity](https://dev.mysql.com/doc/refman/8.4/en/innodb-configuring-io-capacity.html), [adaptive hash index](https://dev.mysql.com/doc/refman/8.4/en/innodb-adaptive-hash.html), [change buffer](https://dev.mysql.com/doc/refman/8.4/en/innodb-change-buffer.html), and [MySQL 8.4 default changes](https://dev.mysql.com/doc/refman/8.4/en/upgrading-from-previous-series.html).

## Tự kiểm tra

**`SET GLOBAL` đổi giá trị của connection pool đang mở?** Thường không; nó đặt mặc định cho session mới.

**Có thể tính memory chỉ từ global buffers?** Không; concurrency nhân per-connection allocations.

**Config file có phải bằng chứng effective setting?** Không; kiểm tra runtime variables và startup log.

**`SET PERSIST` chỉ đổi server đang chạy?** Không; nó còn lưu setting để được nạp khi restart. Xem biến persisted và nguồn cấu hình trước lần khởi động tiếp.

**Tăng `tmp_table_size` có bảo đảm mọi temporary table ở RAM?** Không; còn giới hạn global của TempTable, loại engine và dạng dữ liệu.

**Cache hit ratio thấp có đủ chứng minh cần tăng cache?** Không; phải nối ratio với latency, I/O, workload và tác động tổng thể.

---
title: "Page, B-tree và ghi dữ liệu của InnoDB"
category: "Database"
description: "Theo một row từ clustered index đến page, buffer pool, redo, doublewrite và checkpoint trong MySQL."
updated: 2026-10-17
translationKey: "database/mysql-innodb-pages-and-flushing"
---

InnoDB đọc và ghi dữ liệu theo **page**, không theo từng field độc lập. Một truy vấn lấy một row thường phải tìm page chứa row đó; nhiều row cùng page có thể được phục vụ từ một lần đọc. Vì vậy kích thước row, thứ tự khóa, độ sâu B-tree và cache hit đều ảnh hưởng độ trễ.

## Từ bảng đến page

Mỗi bảng InnoDB có clustered index. Leaf page của B-tree này chứa record của bảng theo primary key; các page nội bộ giữ separator key và con trỏ tới page con. Một secondary index là B-tree riêng, nhưng leaf entry chứa secondary key cộng primary key để tra row. Với query chỉ cần cột đã có trong secondary index, engine có thể tránh bước quay lại clustered index; đó là covering index.

Page có header, directory/slot metadata, record và vùng trống. Insert vào page còn chỗ thì tương đối rẻ. Khi page đầy, InnoDB có thể split: tạo page khác, phân phối record và cập nhật parent. Insert theo khóa tăng thường có locality tốt hơn khóa ngẫu nhiên, nhưng vẫn có page contention và split ở vùng cuối. Index càng rộng thì mỗi page chứa càng ít entry, cây có thể cao hơn và cache giữ được ít key hơn.

InnoDB gom page vào tablespace và extent để cấp phát vật lý. File table-per-table không có nghĩa một file luôn tương ứng đúng một loại dữ liệu hay mọi metadata đều nằm cạnh row. Tablespace system, undo, temporary và redo có vai trò riêng; xem cấu hình thật trước khi suy ra từ tên file.

## Buffer pool và dirty page

Khi đọc page, InnoDB tìm trong buffer pool. Cache hit tránh I/O; miss khiến engine đọc page từ storage vào memory. Update thường sửa bản trong buffer pool trước, đánh dấu page **dirty**, rồi ghi redo để có thể tái dựng thay đổi sau crash. Page data có thể được flush muộn hơn, nên commit không cần chờ mọi data page của transaction được ghi ngay xuống vị trí cuối cùng.

Buffer pool cần chừa chỗ cho workload đang hoạt động. Một pool quá nhỏ làm đọc lặp lại từ storage; cấp quá nhiều memory có thể đẩy OS cache hoặc ứng dụng ra ngoài. Page bị đọc tuần tự một lần cũng có thể đẩy page hữu ích ra khỏi cache, vì thế InnoDB có cơ chế LRU nhiều vùng và chiến lược đọc-ahead. Theo dõi hit ratio cùng latency, dirty-page age và I/O; một tỷ lệ hit cao riêng lẻ chưa chứng minh hệ thống khỏe.

## Redo, doublewrite và checkpoint

Redo log là nhật ký thay đổi theo thứ tự, dùng để replay thay đổi đã được ghi bền khi cần crash recovery. Data page được ghi từng page; mất điện giữa lúc ghi có thể để page torn nếu thiết bị không ghi nguyên tử. Doublewrite ghi page hoàn chỉnh vào vùng trung gian trước khi ghi vị trí cuối, để recovery có bản page hợp lệ cho các trường hợp torn page. Chi tiết triển khai và các tối ưu phụ thuộc phiên bản, file system và thiết bị.

Checkpoint tiến lên khi dirty page được flush đủ để giới hạn lượng redo phải đọc lại sau crash. Nếu ứng dụng tạo dirty page nhanh hơn tốc độ flush, checkpoint age tăng và cuối cùng có thể gây áp lực ghi, dù query hiện tại chưa chạm giới hạn CPU. Flush quá mạnh lại làm tăng I/O cạnh tranh. Background flushing, redo capacity và workload phải được cân bằng bằng số liệu.

Sách mô tả redo log vòng với các biến `innodb_log_file_size` và `innodb_log_files_in_group` của MySQL cũ. Trong MySQL 8.4, dùng `innodb_redo_log_capacity`; capacity quá nhỏ khiến checkpoint phải đuổi theo ghi và có thể ép flush gấp, còn quá lớn tăng lượng công việc recovery có thể cần sau crash. Chọn theo tốc độ phát sinh redo, dirty-page age, checkpoint pressure và thời gian recovery đã thử, không theo một tỷ lệ database cố định. `innodb_log_buffer_size` là RAM giữ redo trước khi flush; tăng nó chủ yếu có ích cho transaction lớn để tránh flush trước commit, không làm log bền hơn nếu durability policy không thay đổi.

### Commit durability và cách flush

`innodb_flush_log_at_trx_commit=1` ghi và flush redo theo từng commit. Với `2`, redo được ghi ở commit nhưng flush xuống durable storage theo chu kỳ; với `0`, cả ghi và flush theo chu kỳ thay vì mỗi commit. Giá trị lỏng hơn có thể làm mất các transaction gần nhất khi crash, tùy chu kỳ; ứng dụng phải chấp nhận rõ cửa sổ đó. Khi binary log bật, `sync_binlog=1` đồng bộ binlog theo commit để giảm nguy cơ data log và replication log lệch nhau. Hai file được flush ở hai đường I/O, vì vậy latency storage và độ tin cậy của cache/controller ảnh hưởng trực tiếp. Kiểm tra semantics/default của release đích và chấp nhận rằng process crash, OS crash và mất điện có failure boundary khác nhau.

Group commit gom một nhóm commit vào ít lần I/O hơn; phiên bản trong sách bị giới hạn bởi tương tác binary log và InnoDB, nhưng không được suy ra behavior đó cho MySQL 8.4. Giữ cả commit settings ở release hiện hành, đo fsync latency/commit latency và xác nhận storage thực thi flush đúng. Battery-backed write cache có thể giảm latency khi mất điện vẫn an toàn; write-back cache không được bảo vệ có thể làm durability setting mất ý nghĩa.

`innodb_flush_method` điều khiển tương tác giữa buffer pool và page cache của hệ điều hành. Sách so sánh buffered I/O và `O_DIRECT` trong bối cảnh kernel/filesystem/RAID cũ. Double buffering đôi khi giúp OS gom/sắp xếp I/O; direct I/O đôi khi tránh giữ cùng page ở hai cache. Không có đáp án chung: kiểm tra phương thức được hỗ trợ trên OS, thiết bị có write cache được bảo vệ hay không, memory pressure, warmup và throughput/latency thực tế. Không dùng `nosync`/development modes hoặc tắt flush để làm production benchmark đẹp.

### Tablespace, purge và chi phí DDL

System tablespace gồm các file được nối tiếp theo thứ tự cấu hình; nhiều file ở nhiều mount point không tự phân phối I/O song song. RAID/storage layer phải thực sự striping thì tải mới được dàn. File autoextend tăng không tự co lại khi xóa row; giới hạn và reclaim cần được lập kế hoạch trước. `innodb_file_per_table` giúp cô lập/rebuild/di chuyển tablespace từng table và dễ quản lý dung lượng, nhưng `DROP TABLE` lớn có thể tốn thời gian dọn file/page và cạnh tranh buffer pool. Đây là tradeoff vận hành, không phải lựa chọn một lần cho mọi trường hợp.

MVCC giữ row version cũ trong undo khi transaction còn cần snapshot. Transaction dài có thể ghìm purge horizon, làm undo/history phình ra dù ứng dụng đã xóa dữ liệu. Theo dõi oldest transaction, purge progress và history-list growth; rút ngắn transaction thường an toàn hơn ép purge bằng giới hạn throttle. Đừng đặt các giá trị `innodb_max_purge_lag` theo sách cũ nếu chưa xác minh behavior phiên bản mới.

### Doublewrite bảo vệ page khỏi ghi dở

Doublewrite ghi một batch page vào vùng bảo vệ rồi mới ghi page về vị trí cuối trong tablespace. Nếu crash để lại torn page, recovery có thể dùng bản page hợp lệ để khôi phục. Cơ chế này không thay redo: redo tái dựng thay đổi logic đã commit; doublewrite giúp đảm bảo page vật lý không bị ghi dở. Nó thường giảm chi phí đồng bộ so với cách phải fsync riêng từng page, dù thêm I/O.

MySQL 8.4 vẫn bật doublewrite mặc định và có các chế độ liên quan như `DETECT_AND_RECOVER`/`DETECT_ONLY` theo tài liệu hiện hành. Chỉ tắt hoặc đổi chế độ khi storage đảm bảo atomic page write và đã có bằng chứng crash-recovery trên đúng nền tảng; sai giả định có thể biến crash thành corruption. Đối chiếu [doublewrite buffer docs](https://dev.mysql.com/doc/refman/8.4/en/innodb-doublewrite-buffer.html) trước khi dùng bất kỳ tối ưu phần cứng chuyên biệt nào.

### MyISAM là phần lịch sử cần tách khỏi InnoDB

Chương 8 còn mô tả `key_buffer_size`, key-cache block size, `delay_key_write`, recovery và concurrent inserts của MyISAM. Key cache chỉ giữ index; data page dựa nhiều vào OS cache. Delaying key writes có thể gộp ghi nhưng crash trước khi flush có thể làm hỏng index. MyISAM không có transaction/MVCC như InnoDB và có table-level locking, nên không bê các tuning này sang InnoDB. Nếu hệ thống còn MyISAM, kiểm tra backup/recovery, integrity và quyền sửa index trước khi dùng tính năng legacy.

## Ví dụ một lần cập nhật

Giả sử cập nhật `orders.status` cho `order_id=42`:

1. Optimizer chọn primary-key lookup; InnoDB tìm root-to-leaf đường đi trong clustered B-tree.
2. Nếu leaf page chưa ở buffer pool, engine đọc page. Lock/MVCC kiểm tra transaction và record phù hợp.
3. Engine tạo undo cần thiết cho rollback/old version, sửa record trong page memory và ghi redo mô tả thay đổi.
4. Khi commit, durability phụ thuộc redo flush policy và storage flush; page dữ liệu có thể vẫn dirty.
5. Background writer flush page về tablespace. Checkpoint tiến khi các thay đổi cũ đã an toàn trong data file.

Nếu `status` có secondary index, thay đổi còn phải cập nhật index đó. Một cột thêm index có thể làm mọi write đắt hơn: thêm page access, redo, dirty pages, storage và công việc purge khi xóa/sửa index entry.

## Cách điều tra chậm

Phân biệt cache miss với query plan kém, lock wait và thiết bị chậm. Đọc `EXPLAIN ANALYZE`, buffer pool metrics, file I/O waits, dirty pages, redo/checkpoint counters và lock waits trong cùng khoảng thời gian. Tránh tăng buffer pool chỉ vì thấy physical reads, hoặc tắt doublewrite/flush chỉ để benchmark đẹp. Mỗi thay đổi durability cần nêu rõ cửa sổ mất dữ liệu được chấp nhận.

*High Performance MySQL*, ch. 1–2, 5 và 8, giới thiệu kiến trúc InnoDB, đo hiệu năng, index và cấu hình; đối chiếu [InnoDB physical structure](https://dev.mysql.com/doc/refman/8.4/en/innodb-physical-structure.html), [buffer pool](https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool.html), [doublewrite buffer](https://dev.mysql.com/doc/refman/8.4/en/innodb-doublewrite-buffer.html), [redo logging](https://dev.mysql.com/doc/refman/8.4/en/optimizing-innodb-logging.html), [transaction durability](https://dev.mysql.com/doc/refman/8.4/en/optimizing-innodb-transaction-management.html), [InnoDB I/O optimization](https://dev.mysql.com/doc/refman/8.4/en/optimizing-innodb-diskio.html), [undo tablespaces](https://dev.mysql.com/doc/refman/8.4/en/innodb-undo-tablespaces.html), và [InnoDB variables](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html) cho MySQL 8.4.

## Tự kiểm tra

**Vì sao secondary index entry chứa primary key?** Để tìm record ở leaf của clustered index; đổi lại primary key rộng làm mọi secondary index tốn chỗ hơn.

**Commit xong nghĩa là data page đã được ghi vào vị trí cuối?** Không nhất thiết; redo có thể làm commit bền trong khi dirty page được flush sau.

**Tăng buffer pool luôn làm query nhanh?** Không. Nếu bottleneck là lock, CPU, plan hoặc storage saturation, tăng cache không sửa nguyên nhân và còn lấy memory của thành phần khác.

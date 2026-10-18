---
title: "Công cụ chẩn đoán, status và lock của MySQL"
category: "Database"
description: "Dùng Performance Schema, status, EXPLAIN, command line và lock wait để tìm nguyên nhân thay vì đoán."
updated: 2026-10-17
translationKey: "database/mysql-diagnostics-tools-and-locks"
---

Khi MySQL chậm, cần phân biệt query plan sai, lock wait, thiếu tài nguyên, replication lag hay client pool. Công cụ không tự giải thích hệ thống; hãy ghép output với giả thuyết, timestamp và workload. Nhiều tên trong *High Performance MySQL* thuộc MySQL 5.x; ưu tiên Performance Schema và tài liệu 8.4 hiện hành.

## Status và instrumentation

`SHOW GLOBAL STATUS` là counter tích lũy từ lần start/reset; lấy hai snapshot theo thời gian rồi trừ để suy ra rate. `SHOW VARIABLES` cho biết configuration nhưng session/global scope khác nhau. `SHOW PROCESSLIST` là snapshot hoạt động; không tự giải thích lịch sử.

Performance Schema chứa instrumented waits, statements, stages, transactions, metadata/data locks và replication state. Bật consumer/instrument phù hợp vì instrumentation cũng tốn overhead và memory. `sys` schema cung cấp view tiện đọc trên Performance Schema; xác nhận tên view theo version.

## Đọc EXPLAIN

`EXPLAIN` mô tả access path, join order, estimated rows và key; tree/JSON format thêm detail. So estimated rows với actual từ `EXPLAIN ANALYZE` trên bản 8.0+ phù hợp, nhớ câu lệnh sẽ chạy thật. Xem rows examined, filtered, temporary/filesort và loop count; cost không phải milliseconds.

Appendix D của sách giải thích cột EXPLAIN lịch sử; cột và format thay đổi theo release. Hãy kiểm tra manual đúng server, tránh áp dụng ý nghĩa cũ của `Extra`/`type` mà không xác minh.

## Lock wait và InnoDB status

`performance_schema.data_lock_waits` nối waiter với blocker; join tới `data_locks` và `threads/events_statements` để lấy query, transaction, index/record lock. `SHOW ENGINE INNODB STATUS` có deadlock gần nhất và transaction/semantics; output có thể truncate và chỉ phản ánh snapshot. App-level transaction trace giúp liên kết request.

MySQL có metadata lock (MDL) khác InnoDB row locks. DDL đợi transaction đang dùng object dù câu query hiện không chạy. Global read lock, user locks và named locks cũng khác phạm vi; xác định đúng loại trước khi kill session. Kết thúc connection có thể rollback transaction lớn và tạo thêm I/O.

### Xác định loại lock trước khi tìm blocker

Appendix E chia lock ở server layer thành table lock, global read lock, name lock khi đổi/xóa object và user lock từ `GET_LOCK()`. Chúng không phải một loại “row lock”. Process state lịch sử như `Locked`, `Waiting for table` hay `User lock` có thể gợi ý vùng chờ, nhưng tên state thay đổi theo version và không đủ để tìm owner.

Ở tầng engine, InnoDB dùng record, gap/next-key và intention locks để bảo vệ phạm vi cần thiết cho isolation và thao tác ghi. `SHOW ENGINE INNODB STATUS` giúp đọc lock wait/deadlock gần nhất nhưng output là snapshot giới hạn; các bảng `INFORMATION_SCHEMA.INNODB_LOCKS` và `INNODB_LOCK_WAITS` trong sách đã được thay bằng các bảng Performance Schema tương ứng trên MySQL hiện hành.

MDL bảo vệ định nghĩa object và phối hợp query với DDL. Một query có thể giữ metadata lock đến hết transaction; `ALTER TABLE` rồi chờ phía sau, và query mới lại xếp sau DDL đang chờ. Incident trông như “DDL treo” có thể bắt đầu từ transaction idle lâu trước đó. Kiểm tra `performance_schema.metadata_locks` cùng thread/processlist và tuổi transaction.

Các ví dụ `SHOW PROCESSLIST` trong sách dùng state của MySQL đời cũ như `Locked`, `Waiting for release of readlock`, `Waiting for table` và `User lock`. Chúng giúp khoanh vùng lúc đó, nhưng state không phải giao diện ổn định để suy ra toàn bộ quan hệ owner–waiter. Sách còn dùng `mysqladmin debug` để in table-lock owner vào error log; đó là công cụ debug thô, không phải truy vấn giám sát tiện dụng. `SHOW OPEN TABLES` có thể cho thấy `Name_locked`, nhưng không giải thích đầy đủ session nào đang giữ khóa.

Với MySQL 8.4, `performance_schema.metadata_locks` ghi cả metadata lock đã được cấp (`GRANTED`) lẫn yêu cầu đang chờ (`PENDING`), bao gồm user-level lock do `GET_LOCK()`. Vì vậy ví dụ trong sách rằng không có cách tìm owner của user lock đã lỗi thời. Phạm vi quan sát phụ thuộc loại lock: dùng `metadata_locks` cho metadata/user-level lock; dùng `data_locks` và `data_lock_waits` cho lock dữ liệu InnoDB. Đừng giả định một bảng chẩn đoán duy nhất bao quát mọi server lock và engine lock.

Với InnoDB, `performance_schema.data_lock_waits` biểu diễn quan hệ requester → blocker; nối hai phía tới `data_locks`, thread và statement event để tìm object/index, mode lock, query và connection. Dữ liệu là ảnh chụp của state thay đổi nhanh: khi truy vấn kết quả xong, wait có thể đã biến mất hoặc đổi. Dùng `sys.innodb_lock_waits` nếu phù hợp, rồi xác nhận bằng transaction age và application trace. Không giả sử các view đọc đồng thời tạo ra snapshot hoàn toàn nhất quán.

Sách còn hướng dẫn bật `innodb_lock_monitor` bằng một bảng có tên đặc biệt, rồi đọc danh sách lock trong `SHOW ENGINE INNODB STATUS` hoặc error log. Cách này giải thích được cấu trúc record/index lock, nhưng output có thể rất dài: mỗi lock có thể kèm dump record, phần status có giới hạn và monitor lịch sử chỉ in tối đa một số lock cho mỗi transaction. Trên MySQL hiện hành, bắt đầu với Performance Schema để lọc đúng wait; chỉ dùng InnoDB status bổ sung khi cần hiểu deadlock hay chi tiết engine. Không bật monitor kiểu cũ trên hệ thống bận nếu chưa cân nhắc lượng log và khả năng làm mất phần chẩn đoán khác.

### Cách lần theo một wait chain

1. Ghi timestamp và xác định request chậm; lấy process list và số waiter.
2. Xem wait thuộc MDL, InnoDB data lock, named lock hay table/global lock. Dùng đúng instrument thay vì suy từ chữ “locked”.
3. Tìm transaction giữ lock, tuổi transaction, trạng thái connection và statement gần nhất. Blocker ở trạng thái Sleep vẫn có thể giữ transaction chưa commit.
4. Lần ngược tới code path giữ transaction: network call trong transaction, xử lý chậm giữa hai câu SQL, thiếu commit/rollback hoặc batch quá lớn.
5. Chỉ kill sau khi cân nhắc rollback duration, retry behavior và tác động nghiệp vụ. Sau đó sửa transaction boundary/order và đặt cảnh báo cho idle-in-transaction.

Ví dụ: session A `BEGIN`, cập nhật một row rồi ứng dụng chờ gọi dịch vụ ngoài trước `COMMIT`. Session B chờ cùng row; 12 session khác tiếp tục xếp sau. Query hiện tại của A có thể là `NULL` vì connection đang idle, nhưng transaction vẫn nắm lock. Tăng timeout chỉ kéo dài hàng đợi; đưa service call ra khỏi transaction xử lý nguyên nhân.

## CLI và vận hành tool

`mysql`, `mysqladmin`, `mysqlbinlog`, dump/restore, `mysqldump` và monitoring stack có vai trò khác nhau; test câu lệnh trên phiên bản thật và quyền phù hợp. Khi chuyển file lớn, checksum, compression, network throughput và resume strategy quan trọng; pipe dump trực tiếp vào production target cần bảo vệ lỗi giữa chừng.

Tool bên thứ ba/variant như Percona Server, MariaDB và Drizzle khác compatibility, feature và support lifecycle. Sphinx là search service lịch sử trong sách; hiện nay đánh giá MySQL full-text, Redis Search hay engine chuyên dụng theo nhu cầu thay vì mặc định tích hợp Sphinx.

Nguồn: *High Performance MySQL*, ch. 16 và Appendices A, B, E; [Performance Schema](https://dev.mysql.com/doc/refman/8.4/en/performance-schema.html), [data locks](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-data-locks-table.html), [data lock waits](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-data-lock-waits-table.html), [metadata locks và user locks](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-metadata-locks-table.html), [độ nhất quán của thông tin lock](https://dev.mysql.com/doc/refman/8.4/en/innodb-information-schema-internal-data.html), [EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/explain.html), [mysqlbinlog](https://dev.mysql.com/doc/refman/8.4/en/mysqlbinlog.html).

## Tự kiểm tra

**Global status counter 10 triệu chứng minh rate 10 triệu/giây?** Không; cần delta chia thời gian.

**MySQL chậm và processlist có query đang chạy nghĩa là query đó là blocker?** Không; cần lock wait graph/metadata lock evidence.

**Kill một session chỉ dừng một câu lệnh?** Thường đóng connection và rollback transaction; xác định impact trước.

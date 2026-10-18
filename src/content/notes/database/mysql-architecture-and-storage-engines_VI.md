---
title: "MySQL architecture và các storage engine"
category: "Database"
description: "Theo một query qua các lớp của MySQL và phân biệt trách nhiệm của server với InnoDB cùng các storage engine khác."
updated: 2026-10-18
translationKey: "database/mysql-architecture-and-storage-engines"
---

MySQL là một database server có thể dùng nhiều storage engine. Một ứng dụng gửi SQL qua connector; server xác thực kết nối, phân tích và lập kế hoạch query; storage engine thực hiện việc đọc/ghi vật lý cho bảng. Ranh giới này giải thích vì sao hai bảng trong cùng server có thể có hỗ trợ transaction, locking, index và crash recovery khác nhau.

## Query đi qua những lớp nào?

Client dùng giao thức MySQL qua TCP hoặc socket. Server quản lý kết nối, xác thực và quyền, sau đó xử lý cú pháp, kiểm tra tên/kiểu, áp dụng rewrite và gọi optimizer. Optimizer chọn access path; executor phối hợp với storage engine để lấy hoặc thay đổi dòng. Server định dạng kết quả và gửi về client.

Server layer giữ nhiều dịch vụ dùng chung như SQL parsing, optimizer, privilege system, data dictionary, logging/replication interfaces và protocol. Storage engine sở hữu cách lưu table/index, locking, transaction semantics và một số cơ chế recovery. Vì thế câu “MySQL hỗ trợ X” cần hỏi X ở server hay engine, table cụ thể dùng engine nào và cấu hình ra sao.

Trong một transaction có bảng từ nhiều engine, tính atomic có thể không giống transaction chỉ dùng InnoDB. Tránh trộn engine transactional và nontransactional nếu ứng dụng cần rollback thống nhất; đọc kỹ quy tắc của từng loại table.

### Một connection giữ state qua nhiều câu lệnh

Client mở TCP/socket connection, thương lượng giao thức và TLS nếu được cấu hình, rồi xác thực account theo host cùng quyền của account đó. Sau khi kết nối, server xử lý từng command trên session và giữ một số state gắn với session: transaction, isolation level, user/system variables, temporary tables, prepared statements, character set và default schema. Đóng connection sẽ giải phóng state đó; connection pool tái sử dụng connection nên phải reset hoặc quản lý state cẩn thận khi chuyển request giữa người dùng.

Connection pooling giảm chi phí handshake và tạo thread, nhưng một connection đang giữ transaction hoặc temporary table không phải tài nguyên “trống”. Giới hạn pool cần cân bằng với concurrency mà CPU, lock, buffer pool và storage có thể xử lý. Tăng `max_connections` chỉ tăng khả năng xếp hàng và lượng bộ nhớ theo connection nếu workload đã bão hòa. Thread cache tái sử dụng thread ở một số đường đi; nó không phải pool connection của ứng dụng và không giới hạn số session.

Trong MySQL 8.4, mô hình mặc định vẫn dùng một execution thread cho mỗi client connection; Enterprise Thread Pool là cơ chế server-side khác, điều phối statement qua các thread group khi có nhiều session. Nó không thay connection pool phía ứng dụng: connection pool giảm chi phí tạo kết nối và quản lý session, còn server thread pool quản lý số thread thực thi statement đồng thời. Hai cơ chế ở hai tầng và giải quyết hai áp lực khác nhau. Xem [MySQL Enterprise Thread Pool](https://dev.mysql.com/doc/refman/8.4/en/faqs-thread-pool.html).

### Optimizer đưa ra kế hoạch, executor thực hiện nó

Parser kiểm tra cú pháp và tạo biểu diễn nội bộ; resolver tìm object/column và kiểm tra quyền; optimizer cân nhắc join order, index, predicate transformation và ước lượng cost; executor thực thi iterator/operator rồi gọi handler API để đọc/ghi storage engine. Storage engine không parse SQL hay lập kế hoạch cho toàn câu query: nó nhận yêu cầu truy cập theo giao diện server và trả hàng/cursor/status. Một plan nhanh trên giấy vẫn có thể chậm do estimate lệch, dữ liệu skew, cache miss, lock wait, client chậm hoặc truyền kết quả lớn.

Ranh giới này giải thích vì sao `EXPLAIN` có thể nói về lựa chọn access path nhưng không bao quát mọi chi phí endpoint. Khi query chậm, ghép plan với actual rows/loops, engine waits, connection pool và thời gian ở phía application. Xem [bài về query planning](./mysql-query-planning-and-execution_VI.md) để theo dõi một ví dụ hoàn chỉnh.

## Lock granularity là một quyết định của engine

Hai client cùng sửa một vùng dữ liệu cần phối hợp để không ghi đè hoặc làm hỏng state. Locking bảo vệ tính đúng, nhưng mỗi lock có chi phí cấp phát, kiểm tra, giữ và giải phóng. Khóa phạm vi rộng giảm số lock phải quản lý nhưng chặn nhiều công việc không xung đột; khóa hẹp tăng concurrency nhưng tốn metadata và có thể tạo deadlock. Không có một granularity tốt cho mọi workload.

MySQL server có một số lock ở tầng SQL/object; storage engine kiểm soát các lock gắn với record/index và transaction. MyISAM chủ yếu dùng table-level locking, trong khi InnoDB phối hợp record/range locks với MVCC. Vì vậy cùng một câu `UPDATE` có thể có concurrency, rollback và crash behavior khác khi table dùng engine khác. `LOCK TABLES` ở server layer không phải cách thay thế transaction hay engine-level row lock. MySQL 8.4 khuyên tránh lệnh này; nếu cần quyền ghi độc quyền trên một số dòng, dùng transaction cùng `SELECT ... FOR UPDATE`. [InnoDB best practices](https://dev.mysql.com/doc/refman/8.4/en/innodb-best-practices.html).

Deadlock là cycle trong wait-for graph, không đồng nghĩa với bug của server. Nếu transaction A giữ row 1 chờ row 2, còn transaction B giữ row 2 chờ row 1, không transaction nào tự tiến lên. Engine phát hiện cycle và rollback một bên; ứng dụng cần retry toàn transaction với giới hạn/backoff phù hợp, đảm bảo thao tác có thể retry an toàn. Sắp xếp thứ tự truy cập nhất quán và rút transaction ngắn giúp giảm khả năng deadlock. Chi tiết isolation và lock nằm trong [bài concurrency control](./concurrency-control-mvcc-and-locks).

## Transaction đặt ranh giới cho nhiều câu lệnh

Transaction gom các thay đổi thành một đơn vị commit/rollback. Trong MySQL 8.4, InnoDB mặc định bật `autocommit`: mỗi statement thành công thường là một transaction riêng. Để chuyển tiền, cần đặt debit và credit trong cùng `START TRANSACTION ... COMMIT`; nếu bước sau lỗi thì `ROLLBACK`. Đây là bảo đảm của engine transactional cho những table mà transaction chạm tới, không phải lời hứa toàn cục của mọi engine hay file ngoài database.

Một số câu DDL tạo implicit commit theo quy tắc của MySQL; đừng giả định `ALTER TABLE` có thể rollback chung với DML trước đó. Ngoài ra, “transaction committed” không có nghĩa mọi replica đã áp dụng, cache đã cập nhật hoặc message đã tới service khác. Những ranh giới này cần outbox/CDC, idempotency và reconciliation ở tầng ứng dụng. Xem [ACID](./acid_VI.md), [MVCC và locks](./concurrency-control-mvcc-and-locks_VI.md), và [WAL/recovery](./write-ahead-logging-and-recovery_VI.md) để học cơ chế sâu hơn.

## InnoDB là mặc định quan trọng

Trong MySQL 8.4, InnoDB là default storage engine. Nó cung cấp transaction, crash recovery, MVCC consistent reads, row-level locking, foreign key constraints, clustered index và buffer pool. Một bảng InnoDB thường được tổ chức theo primary key: leaf của clustered index chứa row data; secondary index entry thường mang primary key để tìm row. Primary key quá rộng có thể làm secondary index tăng kích thước.

Buffer pool giữ page dữ liệu và index trong RAM. Redo/undo hỗ trợ commit/recovery và versioning; background threads flush dirty page, purge version không còn cần, xử lý change buffer/adaptive mechanisms theo version/config. Chi tiết được xem trong [InnoDB architecture](https://dev.mysql.com/doc/refman/8.4/en/innodb-architecture.html), [multi-versioning](https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html) và [physical structure](https://dev.mysql.com/doc/refman/8.4/en/innodb-physical-structure.html).

Các tên biến và default thay đổi theo release. Ví dụ, MySQL 8.4 có default khác MySQL 8.0 ở một số InnoDB settings; không chép nguyên cấu hình benchmark cũ vào production.

## Các storage engine khác giải quyết nhu cầu khác

| Engine | Mô hình và giới hạn cần hiểu |
| --- | --- |
| InnoDB | Transactional, row locks, MVCC, foreign keys, crash recovery; là mặc định MySQL 8.4. |
| MyISAM | Table-level locking và không có transaction như InnoDB; lịch sử dùng cho read-mostly nhưng không thay thế InnoDB trong workload giao dịch cần recovery/locking. |
| MEMORY | Bảng nằm trong RAM, dữ liệu mất khi server restart; phù hợp vùng tạm hoặc cache không bền, có giới hạn kiểu và locking. |
| CSV | Lưu dạng văn bản có delimiter; dễ trao đổi dữ liệu nhưng scan và cập nhật có đặc tính riêng. |
| ARCHIVE | Nén/append-oriented cho dữ liệu lưu trữ; index và khả năng cập nhật bị giới hạn. |
| BLACKHOLE | Nhận write nhưng không giữ row; có thể hữu ích trong vài luồng replication/logging nhưng không phải nơi lưu dữ liệu. |
| MERGE | Gộp một số bảng MyISAM tương thích thành một logical view; phụ thuộc đặc tính MyISAM. |
| FEDERATED | Truy cập table ở server từ xa; network và remote failure trở thành một phần query path. |
| NDB Cluster | Engine phân tán shared-nothing, có transaction và vận hành khác InnoDB; không nằm trong mọi binary MySQL Server chuẩn. |
| XtraDB | Nhánh tương thích InnoDB trong một số distribution lịch sử; tên sản phẩm, trạng thái và khác biệt phải tra theo phiên bản cụ thể. |
| TokuDB | Engine lịch sử dùng Fractal Tree cho workload write-heavy/large data; không mặc định có trong MySQL hiện hành. |
| Infobright / InfiniDB | Engine columnar cho analytics/warehouse; giảm lượng cột phải đọc và tận dụng compression/metadata, nhưng thuộc distribution riêng. |
| Aria / PBXT / Falcon | Các tên lịch sử từ ecosystem MySQL/MariaDB; không xem mô tả trong ấn bản cũ là khuyến nghị triển khai hiện nay. |

Engine có thể khác ở lock granularity, transaction, index, row format, storage, backup, replication và SQL feature. [Bảng storage engine](https://dev.mysql.com/doc/refman/8.4/en/storage-engines.html) và [kiến trúc pluggable](https://dev.mysql.com/doc/refman/8.4/en/pluggable-storage-overview.html) là điểm tra cứu; xác nhận engine có sẵn trong đúng distribution.

Chuyển `ENGINE` bằng `ALTER TABLE` có thể rebuild dữ liệu và cần thời gian, dung lượng tạm, lock hoặc kế hoạch migration. Server cũng có thể fallback sang default nếu engine yêu cầu không khả dụng; bật `NO_ENGINE_SUBSTITUTION` giúp biến nhầm lẫn đó thành lỗi rõ ràng thay vì tạo table bằng engine khác.

Khi kiểm tra table thật, đừng chỉ nhìn schema migration. `SHOW TABLE STATUS` hoặc metadata tương ứng trong `INFORMATION_SCHEMA` có thể cho biết engine, row format, ước lượng row count, dung lượng data/index, collation, auto-increment và một số thông tin table khác. Đây là điểm kiểm tra nhanh để phát hiện bảng dùng nhầm engine hoặc tăng dung lượng; số liệu có thể ước lượng/engine-dependent, không thay thế thống kê optimizer hay đo workload. Tên và trường cụ thể cũng thay đổi theo version.

Sách giải thích table definition thời đó được lưu trong file `.frm`, còn engine tự lưu row/index. Đừng áp dụng layout file đó cho MySQL hiện nay: data dictionary đã thay đổi. Bài học còn giá trị là metadata/schema của server và file data của engine là hai lớp khác nhau, còn case sensitivity của database/table name vẫn cần xét OS và `lower_case_table_names`.

## Engine khác nhau qua cách lưu và giới hạn

MyISAM cho thấy rõ tradeoff giữa ít overhead và độ an toàn. Engine này dùng table lock, không có transaction hay crash recovery như InnoDB; table thường tách data file `.MYD` và index file `.MYI`, với row fixed hoặc dynamic tùy schema. Một số thao tác append có thể chạy concurrent với reader, nhưng update/write nói chung vẫn cạnh tranh ở table lock. Engine có full-text index và một số kiểu prefix index cho `TEXT`/`BLOB`; đây là khả năng của engine, không phải lý do tự động chọn nó cho bảng giao dịch. `CHECK TABLE`, `REPAIR TABLE` hoặc công cụ `myisamchk` kiểm tra/sửa cấu trúc sau lỗi nhưng không rollback transaction; phần row hỏng có thể mất. Key cache cũng có thể trở thành điểm contention khi concurrency cao.

Một số phiên bản hỗ trợ trì hoãn ghi index bằng `DELAY_KEY_WRITE`: giảm ghi nhỏ lúc chạy nhưng crash có thể làm hỏng index. Compressed MyISAM phù hợp dữ liệu bất biến, giảm dung lượng/I/O và vẫn có index, nhưng table chỉ đọc cho tới khi giải nén. Các chi tiết file/row và engine-specific này thuộc bối cảnh lịch sử của sách; xác minh lại với đúng MySQL/MariaDB release trước khi phụ thuộc vào chúng.

Các engine chuyên dụng cũng có giới hạn dễ nhầm:

- **ARCHIVE** trong phần sách mô tả tối ưu insert/logging bằng cách gom ghi và nén từng record; thường đọc bằng scan. Nó có vài hành vi nhất quán riêng — ví dụ read chỉ thấy các row đã tồn tại lúc query bắt đầu, và bulk insert chỉ lộ ra sau khi hoàn tất — nhưng đó không phải transaction/rollback của InnoDB. Kiểm tra feature và trạng thái engine trong release mục tiêu.
- **CSV** giúp trao đổi file text nhưng không có index như engine thông thường.
- **MEMORY** lưu row trong RAM và mất dữ liệu sau restart; user-created MEMORY table không tự chuyển xuống disk khi vượt ngưỡng. Engine có table lock và giới hạn kiểu/layout riêng, nên không phải bản InnoDB nhanh hơn. Nó khác `CREATE TEMPORARY TABLE`: temporary table là thuộc tính vòng đời/visibility theo connection và có thể dùng engine khác. Bản sách nói internal temporary table có thể chuyển từ MEMORY sang MyISAM; trong MySQL 8.4, server dùng TempTable cho internal temporary table trong RAM và InnoDB cho dạng on-disk. Xem [MEMORY engine](https://dev.mysql.com/doc/refman/8.4/en/memory-storage-engine.html) và [internal temporary tables](https://dev.mysql.com/doc/refman/8.4/en/internal-temporary-tables.html).
- **BLACKHOLE** bỏ dữ liệu được insert; log/replication có thể vẫn ghi statement. Nó không phải nơi cất dữ liệu và các replication trick cần đánh giá kỹ.
- **FEDERATED** biến remote server thành một phần của query latency và failure path.
- **NDB Cluster** có kiến trúc distributed shared-nothing riêng; đừng gộp semantics của nó với table InnoDB chỉ vì cùng truy vấn qua MySQL SQL layer.

Sách cũng mô tả XtraDB, PBXT, TokuDB/Fractal Tree, Infobright và InfiniDB. Đây là bức tranh ecosystem của thời điểm xuất bản. Bài học bền vững là chọn data layout theo workload: row store hợp truy cập record/transaction phổ thông; column store có lợi khi đọc ít cột trên tập rất lớn và nén tốt. Tên engine, hỗ trợ, license và trạng thái maintenance phải được xác minh riêng.

## Chọn engine từ workload và migration plan

Đừng chọn theo câu “MyISAM nhanh hơn InnoDB”. Hãy hỏi transaction/constraint có bắt buộc không, cần online backup và crash recovery ra sao, workload đọc/ghi và query access path thế nào, dung lượng/index tăng bao nhiêu, và engine có feature cần thiết không. Transactional engine như InnoDB thường là mặc định; dùng engine khác khi có lợi ích đo được và giới hạn của nó được chấp nhận.

| workload trong sách | điều cần rút ra khi thiết kế hiện nay |
| --- | --- |
| Logging/ingest lớn | Tách ingest khỏi báo cáo bằng replica, time-bucket/partition hoặc pipeline riêng; đừng hy sinh crash safety chỉ vì insert nhanh hơn trong benchmark nhỏ. |
| Catalog đọc nhiều | Đo query và cache thực tế. Table lock hoặc `COUNT(*)` nhanh ở một engine không đại diện mọi query và concurrency. |
| Order processing | Cần transaction, constraint và recovery; ưu tiên engine transactional và giữ các bước nghiệp vụ trong đúng transaction boundary. |
| Forum với counter nóng | Engine swap không sửa N+1 query, hot row hay aggregate counter contention; cần profiling, query redesign hoặc counter strategy. |
| Dữ liệu bất biến/đóng gói | Compression có ích nếu giảm I/O; cân nhắc read-only semantics và cách cập nhật/restore. |
| Warehouse rất lớn | So sánh columnar/analytic engine trên workload thật, thay vì ngoại suy từ OLTP row lookup. |

Đổi engine có thể dùng `ALTER TABLE ... ENGINE=...` (thường copy/rebuild), dump rồi import, hoặc tạo bảng mới và copy theo batch `INSERT ... SELECT`. Batch hạn chế transaction/log quá lớn nhưng cần chốt snapshot và bắt kịp write phát sinh để không mất thay đổi. Online schema-change tool có thể giảm downtime nhưng thêm trigger/copy/cutover failure modes. Trước cutover, so row count/checksum, index/constraint, query plan, replication lag và rollback path; không giả định feature riêng của engine sẽ còn sau conversion.

### Trạng thái phiên bản trong sách

Chương lịch sử mô tả các nhánh 3.23–5.x và thời điểm 5.6 còn sắp phát hành; nó giải thích vì sao có server layer và storage-engine API, không phải lựa chọn version hiện nay. Phần development model phân biệt development milestone/lab preview với GA: trước khi triển khai, dùng release được hỗ trợ, đọc lifecycle và thử upgrade path. Query cache, engine plugin, file format và fork đều phải kiểm tra theo bản MySQL hoặc distribution cụ thể; “drop-in compatible” không bảo đảm cùng replication, backup, data dictionary hay execution behavior.

## Đọc sách cũ với phiên bản hiện tại

*High Performance MySQL* giải thích kiến trúc server, engines và lịch sử MySQL, nhưng nhiều ví dụ thuộc các phiên bản cũ hơn MySQL 8.4. Một ví dụ nổi bật là **query cache**: sách cũ mô tả cache kết quả query, còn query cache đã bị loại khỏi các phiên bản mới; MySQL 8.4 docs ghi rõ nó đã bị remove. Không áp dụng directive `SQL_CACHE`/`SQL_NO_CACHE` từ sách vào hệ thống hiện hành. [SELECT documentation](https://dev.mysql.com/doc/refman/8.4/en/select.html) nêu trạng thái hiện tại.

Khi đánh giá một feature, ghi rõ MySQL version, engine, edition và topology. Feature của InnoDB Cluster, NDB, MySQL Enterprise Backup hoặc MySQL HeatWave có thể không có trong cùng gói cài đặt hoặc edition.

## Dòng thời gian cho biết vì sao server có nhiều lớp

Phần lịch sử trong sách giúp giải thích các quyết định kiến trúc chồng lên nhau. MySQL 3.23 đưa MyISAM, full-text và replication vào dòng sản phẩm phổ biến; InnoDB thời đó chưa luôn nằm trong binary chuẩn. 4.0 đóng gói InnoDB rộng hơn, bổ sung SSL và cải thiện replica thread; 4.1 mở rộng SQL, charset UTF-8 và prepared statement/binary protocol; 5.0 thêm view, trigger, stored procedure/function; 5.1 thêm partitioning, row-based replication và plugin APIs; 5.5 đặt InnoDB làm engine mặc định, mở rộng Performance Schema và dọn nhiều legacy behavior. Appendix A tiếp tục câu chuyện về các fork và distribution.

Đây là dòng thời gian của một ấn bản cũ, không phải bảng tính năng hiện hành. Đặc biệt, “5.6 sắp phát hành” và “6.0 bị hủy” chỉ có nghĩa trong bối cảnh lúc sách viết. Khi chọn bản server, so sánh release lifecycle, support window, deprecation, bug fixes, upgrade path và feature cần dùng theo tài liệu hiện tại; đừng chọn theo benchmark hay lời khuyên phát hành trong sách.

## Benchmark lịch sử dạy cách đọc kết quả, không dạy cấu hình

Sách đo các bản MySQL cũ với một workload read-only, dữ liệu 2.5 GB nằm trong buffer pool 4 GB, máy nhiều CPU/RAM và các mức concurrency khác nhau. Kết quả cho thấy một build có thể chậm hơn ở một thread nhưng mở rộng tốt hơn ở concurrency cao; thêm chức năng và đường xử lý có thể tăng overhead trong một query rất đơn giản. Bài học là performance luôn gắn với workload, hardware, cache state và concurrency.

Các số transactions/second, chip/server, phiên bản và kết luận benchmark trong sách không đại diện MySQL 8.4. Hãy dùng chúng như ví dụ về thiết kế phép đo: warmup, cửa sổ steady-state, mẫu định kỳ và concurrency sweep. Khi so release hiện nay, dùng cùng data distribution và durability policy, workloads read/write thật, lặp lại nhiều lần, giữ raw time series và so p95/p99, error, resource cùng throughput. Tham khảo cách lập phép đo trong [bài benchmark](./mysql-measuring-and-tuning-performance_VI.md).

## Đánh giá MySQL distribution và fork

Appendix A của sách mô tả Percona Server, MariaDB, Drizzle và các build riêng của Linux distributions theo thời điểm xuất bản. Những lựa chọn này không cùng một loại: **Percona Server** giữ hướng tương thích gần MySQL nhưng thêm instrumentation/feature; **MariaDB Server** là một nhánh phát triển riêng với nhiều khác biệt ngày càng tăng; **Drizzle database server** là một fork được bàn trong bối cảnh lịch sử của cuốn sách, nên phải đánh giá trạng thái dự án và khả năng hỗ trợ riêng trước khi xem như lựa chọn production. Tên Drizzle hiện cũng được dùng bởi dự án ORM TypeScript khác, nên cần phân biệt rõ. Một package của Linux distribution cũng có thể khác upstream ở build flags, patch và lifecycle.

### Ba hướng phát triển trong bối cảnh của cuốn sách

Trong phiên bản mà sách mô tả, Percona Server xuất phát từ các bản vá để giải quyết vấn đề vận hành cụ thể. Ba mục tiêu được nêu là **transparency** (thêm status, instrumentation và slow-log detail để nhìn server rõ hơn), **performance** (cải thiện tốc độ, khả năng scale và tính ổn định của latency, chủ yếu quanh InnoDB), và **operational flexibility** (gỡ một số giới hạn gây khó cho vận hành). Sách mô tả nó như một bản thay thế tương thích, có Percona XtraDB thay cho InnoDB ở thời đó; một phần cải tiến được upstream tiếp nhận hoặc làm lại. Đây là mô tả lịch sử, không phải bảo đảm file format hay drop-in compatibility cho mọi bản Percona/MySQL hiện hành.

MariaDB trong bối cảnh đó theo đuổi phát triển cộng đồng và nhận thêm nhiều thay đổi ở server, optimizer, replication và storage engine. Sách lấy Aria cho internal temporary table, XtraDB, SphinxSE và PBXT làm ví dụ; cũng nhắc optimizer cho subquery/join, hash join, dynamic columns, role-based access control và timestamp microsecond trong một release cụ thể. Không mang danh sách hay so sánh hiệu năng ấy sang release mới: MariaDB và MySQL nay là các dòng sản phẩm khác nhau, cần tra ma trận tương thích theo version, đặc biệt cho replication, engine, authentication, SQL behavior và data format.

Drizzle được sách gọi là fork thực sự và không tương thích MySQL ở mức ứng dụng do thay đổi SQL/hành vi. Hướng thiết kế là server gọn cho web workload, giảm legacy behavior và lựa chọn; kiến trúc microkernel đưa nhiều tính năng vào plugin. Ví dụ lịch sử gồm bộ kiểu dữ liệu/character set được đơn giản hóa, replication dùng Protocol Buffers và benchmark tập trung concurrency cao. Những chi tiết này giải thích triết lý dự án, không phải khuyến nghị cài Drizzle hiện nay.

Ngoài ba tên trên, sách nhắc các bản vá tùy biến của công ty lớn, fork nhỏ, và package Linux có thể mang patch/build khác upstream dù vẫn mang tên MySQL. Nguồn binary vì vậy là một phần của vận hành: ghi rõ vendor, repository, package version, build options, patch policy và support owner; cùng một tên sản phẩm không đủ để tái tạo hành vi server.

Trong phần kết của appendix, sách đưa ra cách chọn theo ưu tiên lúc đó: gần MySQL và cần instrumentation/performance thì xem Percona Server; muốn bộ thay đổi cộng đồng rộng hơn thì xem MariaDB; cần core tối giản và chấp nhận incompatibility thì Drizzle. Một lý do thực tế khác là ai kiểm soát source và có thể sửa lỗi: vendor có thể hỗ trợ bản fork của mình, nhưng không tự quyết định bản sửa sẽ vào upstream. Hãy chuyển nguyên tắc này thành câu hỏi hiện nay: tính năng cần là gì, ai chịu trách nhiệm khi có bug, SLA/support window ra sao, và đường nâng cấp/quay lui có được vendor hỗ trợ không.

Giao thức gần giống hoặc cụm từ “drop-in replacement” chỉ mô tả một lớp tương thích. Nó không chứng minh cùng execution plan, GTID, replication, plugin, binary log, default, data dictionary, backup format hay upgrade path. MariaDB còn có bảng tương thích replication phụ thuộc phiên bản và chiều source/replica. Percona Server hiện có tài liệu riêng theo nhánh 8.4 và bảng feature so với MySQL; so sánh từng feature đang dùng thay vì suy từ nguồn gốc chung.

Trước khi đổi distribution, lập compatibility matrix cho SQL/DDL, collations/charsets, routines, engine, plugins, auth, replication topology/GTID, backup/restore tool, monitoring agent, connector, OS package và operational support window. Thử restore một bản backup trên đích, replay workload hoặc kiểm tra query plan, diễn tập failover/rollback, rồi chuyển một canary có thể quay lại. Đặc biệt xác nhận downgrade: một khi data dictionary hoặc file format đã nâng cấp, quay lại binary cũ có thể không còn được hỗ trợ.

Tài liệu hiện hành: [Percona Server for MySQL 8.4](https://docs.percona.com/percona-server/8.4/), [bảng feature Percona Server/MySQL](https://docs.percona.com/percona-server/8.4/feature-comparison.html), [MariaDB và MySQL compatibility](https://mariadb.com/docs/release-notes/community-server/about/compatibility-and-differences/mariadb-vs-mysql-compatibility), và [replication compatibility](https://mariadb.com/docs/release-notes/community-server/about/compatibility-and-differences/replication-compatibility-between-mariadb-and-mysql).

## Khi nào cần chọn engine khác?

Chỉ chọn engine khác khi có yêu cầu đo được mà InnoDB không đáp ứng và cả giới hạn về transaction, recovery, concurrency, schema, backup, monitoring, failover và team operation đều được chấp nhận. Cùng một transaction có thể chạm nhiều table; dùng nhiều engine làm tăng số mô hình phải hiểu và quy trình backup/recovery phức tạp hơn.

Trước khi migrate một table lớn, xác nhận disk headroom, thời lượng copy/rebuild, metadata lock, replication lag và đường rollback. `ALTER TABLE ... ENGINE=...` có thể đọc và ghi lại toàn bộ dữ liệu/index; với table đang hoạt động, thao tác đó có thể cạnh tranh I/O và kéo dài lock. Thử trên bản sao có kích thước tương đương, đo impact, dùng công cụ online phù hợp nếu cần, rồi validate row count, constraints, index, query plan và replication. Không coi cú pháp ngắn là migration không rủi ro.

Tên database/table cũng có thể phụ thuộc filesystem và `lower_case_table_names`. Giá trị này phải chọn lúc khởi tạo data directory và không thể thay tùy tiện sau đó. Dùng casing nhất quán trong schema/code và thử dump/restore giữa các hệ điều hành trước khi chuyển môi trường; một ứng dụng chạy trên filesystem không phân biệt hoa thường có thể che lỗi sẽ lộ trên Linux.

## Tự kiểm tra

**Nếu MySQL server có hỗ trợ transaction, table MEMORY cũng có transaction không?** Không. Transaction là khả năng của engine/table; MEMORY không cung cấp transaction như InnoDB.

**Có thể giả định mọi MySQL installation đều có NDB?** Không. NDB Cluster có distribution và yêu cầu riêng.

**Có nên dùng query cache vì sách nói query lặp sẽ nhanh?** Không trên MySQL 8.4; query cache đã bị loại. Đo cache phù hợp ở application, buffer pool hoặc cơ chế hiện hành.

Nguồn đọc: *High Performance MySQL*, chương 1 (PDF tr. 31–64); [connection interfaces](https://dev.mysql.com/doc/refman/8.4/en/connection-interfaces.html), [storage engine architecture](https://dev.mysql.com/doc/refman/8.4/en/pluggable-storage-overview.html), [transaction/commit](https://dev.mysql.com/doc/refman/8.4/en/commit.html), [identifier case sensitivity](https://dev.mysql.com/doc/refman/8.4/en/identifier-case-sensitivity.html), và các phần về storage engine/InnoDB trong [MySQL 8.4 Reference Manual](https://dev.mysql.com/doc/refman/8.4/en/).

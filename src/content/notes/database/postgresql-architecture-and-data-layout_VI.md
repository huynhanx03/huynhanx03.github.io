---
title: "Kiến trúc PostgreSQL và cách dữ liệu nằm trên đĩa"
category: "Database"
description: "Theo một row từ logical table đến page, tuple, TOAST và các tiến trình của PostgreSQL."
updated: 2026-10-17
translationKey: "database/postgresql-architecture-and-data-layout"
---

Khi chạy `SELECT`, PostgreSQL không mở một file riêng mang tên bảng rồi đọc tuần tự như một bảng tính. Một cluster chứa nhiều database; mỗi database có schema và relation; relation được ánh xạ thành các file, fork và page. Hiểu các lớp này giúp ta giải thích được kích thước bảng, cache miss, vacuum và vì sao một lần cập nhật có thể tạo thêm dữ liệu thay vì ghi đè row cũ.

## Cluster, database và relation

Trong PostgreSQL, **cluster** là một vùng dữ liệu được quản lý bởi một instance/server; ở đây “cluster” không nhất thiết có nghĩa là nhiều máy. Bên trong có nhiều database. Một connection thông thường làm việc trong một database cụ thể. Database chứa schema, còn schema chứa table, index, view, sequence và các object khác.

Table và index là các **relation**. Catalog hệ thống lưu metadata của chúng như OID, kiểu relation, column, constraint và vị trí lưu trữ. Vì tên là metadata chứ không phải tên file vật lý, không nên tự tìm hoặc sửa file trong `PGDATA` khi server đang chạy. Dùng SQL catalog hoặc công cụ được hỗ trợ để quan sát.

## File, fork và page

Một relation lớn được chia thành các segment file; mỗi segment thường giới hạn kích thước để tránh một file đơn khổng lồ. Relation có thể có nhiều **fork**: main fork chứa dữ liệu chính; free-space map (FSM) ước lượng page nào còn chỗ; visibility map (VM) ghi page nào có thể bỏ qua kiểm tra visibility hoặc phục vụ index-only scan; init fork dùng cho một số relation unlogged khi khởi tạo lại.

File được chia thành page cố định, thường 8 KiB theo bản build mặc định, nhưng kích thước page là thuộc tính lúc build. Page heap có header, line pointer và vùng tuple. Line pointer trỏ tới tuple trong page; tuple không cần được dồn sát nhau theo thứ tự row. Khi tuple lớn lên hoặc bị thay thế, page có thể còn khoảng trống rải rác.

```text
relation file → page
                 ├─ page header
                 ├─ line pointers → tuple A, tuple B
                 └─ free space
```

Page chứa header kiểm tra và vị trí LSN liên quan đến WAL. PostgreSQL dùng page layout để tìm và kiểm tra dữ liệu, còn checksum tùy cấu hình/build có thể giúp phát hiện corruption; checksum không tự sửa dữ liệu.

## Heap tuple và TOAST

Heap là tổ chức bảng mặc định: tuple thường được đặt ở vị trí tìm thấy, không theo thứ tự primary key. Tuple mang thông tin transaction như `xmin` (transaction tạo phiên bản) và `xmax` (transaction xóa/đánh dấu thay thế), cùng bitmap NULL, metadata và giá trị column. Cách biểu diễn thay đổi theo phiên bản và loại dữ liệu; SQL là giao diện ổn định hơn các chi tiết nhị phân.

Một giá trị rất lớn không nhất thiết nằm trọn trong page của hàng. TOAST có thể nén hoặc tách giá trị ra relation phụ, rồi tuple chính giữ con trỏ. Điều này cho phép lưu `text`, `jsonb` hay giá trị lớn khác, nhưng đọc giá trị có thể cần truy cập thêm page và giải nén. TOAST không biến row lớn thành miễn phí: cân nhắc payload, số lần đọc, cập nhật và cách chia bảng.

## Tiến trình server và shared memory

PostgreSQL dùng mô hình process: tiến trình cha quản lý server, mỗi client thường được phục vụ bởi một backend process; các tiến trình phụ trách checkpoint, WAL writer, background writer, autovacuum và các việc nền khác. Shared memory chứa shared buffers và cấu trúc đồng bộ; mỗi backend cũng có private memory cho sort, hash và trạng thái query. Vì mỗi connection có process và bộ nhớ riêng, tạo quá nhiều connection làm tăng chi phí; pooler thường giúp giới hạn số backend hoạt động.

Khi backend đọc page, nó tìm trong shared buffers trước. Nếu page không có, hệ điều hành/storage cung cấp page vào cache database. `EXPLAIN (ANALYZE, BUFFERS)` cho biết truy cập buffer trong query, còn thống kê hệ thống giúp nhìn rộng hơn. “Read” trong thống kê PostgreSQL có thể là đọc vào shared buffer, không đồng nghĩa chắc chắn với I/O vật lý vì OS page cache cũng có thể trả dữ liệu.

## Từ SQL đến catalog

Client gửi lệnh qua PostgreSQL protocol. Parser tạo cây cú pháp, analyzer phân giải tên và kiểu dựa vào catalog, rewrite áp dụng rule/view, planner chọn kế hoạch, executor chạy kế hoạch. Catalog cho biết relation có tồn tại và kiểu gì; dữ liệu row nằm trong heap/index chứ không nằm trong catalog.

Sách *PostgreSQL Internals* mô tả phiên bản 14. Các khái niệm về relation, page, tuple, forks và backend hữu ích để đọc cấu trúc, nhưng chi tiết byte layout và tên tiến trình cần đối chiếu release/build. Tài liệu PostgreSQL hiện hành tại thời điểm viết là 18; phần [database physical storage](https://www.postgresql.org/docs/current/storage.html), [database page layout](https://www.postgresql.org/docs/current/storage-page-layout.html), [TOAST](https://www.postgresql.org/docs/current/storage-toast.html) và [server processes](https://www.postgresql.org/docs/current/progress-reporting.html) là nguồn tra cứu.

## Khi debug, đi từ logical đến physical

Trước hết xác nhận database, schema, relation, kích thước và thống kê bằng SQL. Sau đó xem kế hoạch query, buffer, bloat indicators, vacuum progress và cấu hình. Chỉ cần đọc file/page trực tiếp khi có công cụ chuyên biệt và bản sao an toàn; không sửa page thủ công. Khi cần chuyển dữ liệu giữa máy, dùng backup/restore hoặc replication đã hỗ trợ thay vì copy nóng file relation.

## Học hệ thống bằng cách tự kiểm chứng

Phần kết của *PostgreSQL Internals 14* nhấn mạnh rằng giá trị lâu dài của sách không chỉ là một danh sách sự thật, mà là cách đặt câu hỏi và kiểm tra hệ thống. Tài liệu, sách và câu trả lời trên mạng đều có thể cũ hoặc thiếu bối cảnh. Hãy dùng chúng để hình thành giả thuyết, rồi xác nhận trên đúng release đang chạy.

Một vòng kiểm chứng gọn có thể đi như sau:

1. Ghi câu hỏi, `server_version_num`, cấu hình liên quan và workload.
2. Nêu dự đoán trước khi chạy: plan sẽ dùng index nào, đọc bao nhiêu buffer, hoặc operation nào phải chờ.
3. Thử trên dữ liệu đại diện trong môi trường an toàn. Với query đọc, so sánh `EXPLAIN (ANALYZE, BUFFERS)` cùng số liệu catalog/monitoring; nhớ rằng `ANALYZE` thực thi câu lệnh.
4. Thay đổi một điều kiện mỗi lần, lưu plan và kết quả, rồi kiểm tra xem evidence có ủng hộ giả thuyết không.
5. Nếu kết quả khác tài liệu, kiểm tra release, cấu hình, schema và source code tương ứng trước khi khái quát thành quy tắc.

Ví dụ, nếu nghĩ index-only scan không chạm heap, đừng chỉ nhìn tên plan node: hãy kiểm tra `Heap Fetches`, visibility map/buffer activity và kết quả sau khi vacuum trên bản sao thử nghiệm. Mục tiêu là hiểu điều kiện làm behavior xảy ra, không thuộc một câu trả lời rời khỏi version và dữ liệu.

## Tự kiểm tra

**`PGDATA` có một file dễ đọc cho mỗi table không?** Không. Một relation có thể có nhiều segment và fork; định danh vật lý do server quản lý.

**Page 8 KiB có phải luôn đúng với mọi PostgreSQL build?** Không. Đây là mặc định phổ biến; page size được quyết định lúc build.

**Nếu tuple có con trỏ TOAST thì dữ liệu lớn đã nằm trong RAM?** Không. Con trỏ chỉ cho biết giá trị được lưu ngoài tuple; truy cập vẫn có thể cần page I/O và giải nén.

Nguồn: *PostgreSQL Internals 14*, phần mở đầu, “Pages and Tuples” và “Conclusion” (p. 619); [PostgreSQL 18 Documentation: Database Physical Storage](https://www.postgresql.org/docs/current/storage.html).

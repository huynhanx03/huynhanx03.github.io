---
title: "Thiết kế schema và chọn kiểu dữ liệu trong MySQL"
category: "Database"
description: "Chọn kiểu cột, khóa và mức chuẩn hóa theo ý nghĩa dữ liệu, đồng thời dự tính chi phí lưu trữ, index và thay đổi schema."
updated: 2026-10-17
translationKey: "database/mysql-schema-and-data-types"
---

Một cột tiền dùng `FLOAT`, id tăng tự động được chọn làm khóa clustering, và địa chỉ khách hàng được lặp vào mỗi đơn có thể đều chạy được. Nhưng chúng kéo theo sai số tiền, index phụ lớn hoặc nhiều bản sao khó đồng bộ. Schema tốt diễn tả đúng domain, ràng buộc dữ liệu sai và hỗ trợ workload mà không lưu nhiều hơn mức cần thiết.

## Chọn kiểu theo miền giá trị

Kiểu số nguyên nhỏ tiết kiệm chỗ hơn kiểu lớn, nhưng giới hạn miền giá trị. Xác định giá trị nhỏ nhất/lớn nhất, khả năng tăng theo thời gian và phép toán trước khi chọn `TINYINT`, `INT` hay `BIGINT`; `UNSIGNED` thay đổi miền giá trị và phép so sánh. Đừng dùng kiểu nhỏ đến mức một lần tăng trưởng làm migration khẩn cấp.

Tiền cần biểu diễn chính xác đến quy mô nào? `DECIMAL(p,s)` lưu số thập phân với precision/scale được khai báo; `FLOAT`/`DOUBLE` biểu diễn gần đúng và phù hợp hơn với đại lượng khoa học có tolerance rõ. Không dùng float cho số dư tiền nếu ứng dụng cần phép cộng/trừ thập phân chính xác.

Với chuỗi, `CHAR(n)` có semantics độ dài cố định và `VARCHAR(n)` có độ dài biến đổi tới giới hạn. `TEXT` phù hợp nội dung lớn nhưng ảnh hưởng cách index, sort, row layout và thao tác. Length khai báo và bytes thực tế khác nhau theo charset; Unicode có thể dùng nhiều byte cho một ký tự. Chọn charset/collation nhất quán, đặc biệt với unique và so sánh không phân biệt hoa thường.

Ngày sinh là date, thời điểm sự kiện là timestamp/datetime với quy ước múi giờ rõ ràng. MySQL `TIMESTAMP` chuyển đổi theo session time zone còn `DATETIME` lưu giá trị ngày giờ không tự gắn múi giờ; kiểm tra [ngữ nghĩa kiểu ngày giờ](https://dev.mysql.com/doc/refman/8.4/en/datetime.html) của version đang dùng. Lưu thời điểm UTC hay local là quyết định ứng dụng phải nhất quán từ input tới hiển thị.

`ENUM`/`SET`, `BIT`, `JSON`, `BLOB` và `TEXT` có thể tiện cho một số trường hợp nhưng không thay thế phân tích domain. Enum làm đổi danh sách giá trị thành thay đổi schema; JSON linh hoạt nhưng query/index phụ thuộc biểu thức và tính năng engine. Đọc [MySQL data types](https://dev.mysql.com/doc/refman/8.4/en/data-types.html) trước khi thiết kế lâu dài.

## Chọn định danh có ý thức về index

Primary key vừa định danh dòng vừa có thể quyết định layout vật lý của InnoDB. Một khóa tuần tự hẹp thường giữ clustered pages có locality tốt hơn trong một số workload; UUID ngẫu nhiên có thể làm insert rải nhiều page, split và tăng index. UUID có thể phù hợp khi ID cần sinh phân tán hoặc không muốn đoán thứ tự; dạng binary/time-ordered và schema-specific tradeoffs cần benchmark.

Secondary index của InnoDB mang primary key để tìm clustered row. Vì vậy mỗi secondary index chịu ảnh hưởng bởi kích thước primary key. Chọn natural key như email cần cân nhắc nó có thể đổi hay không, collation, length và việc cập nhật nhiều index. Một surrogate key hẹp có thể giúp layout nhưng không xóa nhu cầu unique constraint cho business key.

## Chuẩn hóa, bản sao và bảng tổng hợp

Chuẩn hóa giữ mỗi sự thật ở nơi phù hợp, giảm update anomaly và giúp constraint diễn đạt quan hệ. Denormalization có thể giảm join hoặc làm đường đọc nhanh hơn khi workload chứng minh cần. Từ đó phát sinh câu hỏi: copy nào là source of truth, lúc nào cập nhật, transaction nào bảo vệ hai bản và làm sao sửa lệch?

MySQL không cung cấp native materialized view theo kiểu view được refresh tự động như một đối tượng bảng lưu kết quả. Hệ thống thường tạo summary/cache table hoặc duy trì aggregate trong application/trigger/job. Counter table có thể thành hotspot khi nhiều transaction cùng tăng một dòng; shard counter rồi hợp nhất sẽ đổi độ chính xác tức thời và độ phức tạp đọc.

Không thêm cache table trước khi có query profile. Nếu dùng, định nghĩa refresh cadence, rebuild path, idempotency, consistency lag, cleanup và metric phát hiện sai lệch. Dùng cùng transaction cho nguồn và bản sao khi yêu cầu cần atomicity; nếu cập nhật bất đồng bộ, mô tả trạng thái trung gian cho client.

## Ràng buộc và NULL

`NOT NULL`, `CHECK`, `UNIQUE`, `PRIMARY KEY` và `FOREIGN KEY` bảo vệ các quy tắc khác nhau. InnoDB kiểm tra foreign key và các constraint theo hỗ trợ/phiên bản; không giả định storage engine khác có cùng behavior. Tên khóa, hành vi cascade và thứ tự migration cần được kiểm thử trên version mục tiêu.

`NULL` có nghĩa không có/không biết giá trị theo schema, không giống 0 hoặc chuỗi rỗng. SQL dùng ba giá trị logic; `column = NULL` không kiểm tra null, phải dùng `IS NULL`. Unique constraint có cách đối xử với nhiều NULL theo sản phẩm. Một nullable cột cũng làm phép tính và predicate cần xử lý thêm trường hợp unknown.

## Đổi schema trên bảng đang chạy

`ALTER TABLE` có thể chỉ đổi metadata, thay đổi in-place, hoặc rebuild/copy toàn bảng tùy thao tác, engine, row format và version. “Online DDL” có thể cho phép một số DML đồng thời nhưng vẫn cần metadata lock ở các pha, thêm I/O, dung lượng và thời gian. Đọc [in-place/online DDL](https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl.html), đo trên bản sao có kích thước tương tự và chuẩn bị rollback/forward plan.

Migration an toàn thường tách thành các bước tương thích: thêm cấu trúc cho phép code cũ tiếp tục chạy, deploy code dual-read/write khi cần, backfill theo batch, xác minh, chuyển đọc, rồi xóa cột cũ ở release sau. Thay đổi không tương thích trong một bước có thể làm ứng dụng đang chạy lỗi.

## Tự kiểm tra

**`VARCHAR(255)` luôn chiếm 255 byte?** Không. Nó lưu độ dài thực tế cộng overhead; byte phụ thuộc charset và nội dung.

**Có nên dùng UUID làm primary key vì nó unique toàn cục?** Có thể, nhưng cân nhắc độ rộng, thứ tự insert, clustered index, secondary indexes và khả năng sinh ID phân tán. Đo trên workload.

**Summary table có đúng dữ liệu chỉ vì được cập nhật trong code không?** Chưa chắc. Cần quy tắc atomicity, retry, backfill, idempotency và reconciliation rõ ràng.

Nguồn đọc: *High Performance MySQL*, chương 4; [MySQL 8.4 data types](https://dev.mysql.com/doc/refman/8.4/en/data-types.html), [online DDL](https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl.html).

---
title: "Dữ liệu dẫn xuất và thay đổi schema MySQL an toàn"
category: "Database"
description: "Cân bằng chuẩn hóa với cache và bảng tổng hợp, rồi triển khai thay đổi schema qua nhiều phiên bản ứng dụng mà không làm mất tính đúng đắn."
updated: 2026-10-17
translationKey: "database/mysql-schema-evolution-and-derived-data"
---

Một trang báo cáo cần số đơn theo phòng ban. Ta có thể lưu tên trưởng phòng trên từng nhân viên để truy vấn khỏi join, hoặc giữ mỗi sự thật một lần rồi join khi đọc. Cách đầu rẻ hơn cho một số lần đọc, nhưng khi trưởng phòng đổi, mọi bản sao phải đổi cùng nhau. Thiết kế schema là quyết định đặt chi phí ở đâu: lúc đọc, lúc ghi, lúc đồng bộ hay lúc khôi phục.

## Chuẩn hóa để bảo vệ sự thật

Giả sử bảng `employee(name, department, department_head)` lưu lặp trưởng phòng trên mọi nhân viên. Nếu Brown thay Jones, cập nhật thiếu một hàng sẽ khiến cùng phòng ban có hai trưởng phòng. Nếu phòng ban chưa có nhân viên, schema này cũng không thể lưu phòng ban độc lập.

Tách dữ liệu thành `department(id, name, head_employee_id)` và `employee(id, name, department_id)` đặt mỗi fact ở đúng một nơi. Thay đổi trưởng phòng chỉ cập nhật một bản ghi; có thể tạo phòng ban trước khi tuyển nhân viên; constraint diễn đạt quan hệ. Đổi lại, câu hỏi cần tên phòng ban và trưởng phòng phải join. Đây là lợi ích của chuẩn hóa: giảm update anomaly và giữ nguồn đúng rõ ràng, không phải lời hứa rằng mọi query đều nhanh hơn.

Khi định chuẩn hóa, hỏi fact nào phụ thuộc vào key nào. Nếu `department_id` xác định `department_name`, lưu tên phòng ban lặp ở từng nhân viên tạo thêm bản sao phải đồng bộ. Nếu một giá trị là snapshot có ý nghĩa lịch sử — chẳng hạn tên sản phẩm trên hóa đơn tại thời điểm mua — bản sao có thể là dữ liệu nghiệp vụ đúng, không phải cache. Mục đích của bản sao phải được ghi rõ.

## Denormalize có hợp đồng cập nhật

Một bản sao đọc nhanh cần có owner và quy tắc nhất quán. Ví dụ bảng `daily_sales(day, store_id, total, order_count)` tránh quét hàng triệu order cho dashboard. Trước khi thêm bảng này, xác định:

- Câu query nào đang tốn kém và profile chứng minh bảng tổng hợp giúp gì?
- Mỗi order mới, sửa hoặc hủy sẽ cập nhật aggregate bằng transaction, event hay batch?
- Client được phép thấy số liệu trễ bao lâu?
- Làm sao dựng lại dữ liệu từ nguồn nếu job lỗi hoặc aggregate lệch?
- Có metric hoặc reconciliation job nào phát hiện drift?

Cập nhật cùng transaction giúp source row và aggregate cùng commit hoặc cùng rollback, nhưng có thể tăng contention. Cập nhật bất đồng bộ tách tải ghi, nhưng tạo khoảng thời gian source và summary không khớp; cần retry idempotent, checkpoint/watermark và cách xử lý event đến trễ hoặc lặp. Một job rebuild định kỳ dễ kiểm chứng hơn nhưng phải tính tài nguyên quét dữ liệu và khoảng dữ liệu mà người dùng đang nhìn thấy.

MySQL không tự làm mới một materialized view kiểu bảng kết quả được lưu sẵn. Summary/cache table do ứng dụng, trigger, event hoặc pipeline duy trì. Incremental update tiết kiệm công đọc lại toàn bộ nguồn nhưng phải xử lý insert/update/delete chính xác; rebuild từ đầu đơn giản hơn về logic nhưng có chi phí và cần chiến lược swap/đọc nhất quán. Chọn theo workload và yêu cầu freshness.

## Counter có thể thành khóa nóng

`UPDATE page_counter SET count = count + 1 WHERE page_id = ?` là phép cộng atomic trong database, nhưng tất cả lượt xem cùng một page vẫn tranh cùng row lock. Khi một row trở thành điểm nóng, tăng connection chỉ làm nhiều transaction xếp hàng hơn.

Có thể chia counter thành các slot:

```sql
CREATE TABLE page_counter (
  page_id BIGINT NOT NULL,
  slot SMALLINT NOT NULL,
  count BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (page_id, slot)
);
```

Mỗi update chọn một slot trong số hữu hạn; đọc tổng bằng `SUM(count)` cho `page_id`. Ghi phân tán contention qua nhiều row, còn đọc phải gộp và tổng có thể không phải snapshot tức thời nếu các slot tiếp tục thay đổi. Chọn số slot theo phép đo; nhiều slot làm read/maintenance tốn hơn.

Counter theo ngày có thể dùng khóa `(day, page_id, slot)` để truy vấn một khoảng và dọn dữ liệu cũ theo retention policy. Bản ghi phải được tạo trước hoặc có upsert phù hợp. Nếu cùng một event được retry, tăng counter lần nữa sẽ đếm trùng; cần event ID/dedup nếu metric phải chính xác. Với analytics chấp nhận gần đúng, nói rõ sai số và độ trễ thay vì tạo một điểm ghi toàn cục để đạt độ chính xác tức thì.

## Triển khai migration khi code cũ vẫn đang chạy

Giả sử `customer_code` đang là `VARCHAR(32)` nhưng cần chuẩn hóa thành `customer_id BIGINT`. Thay column và deploy một lần có thể làm code phiên bản cũ không hiểu schema mới, hoặc code mới đọc trong lúc backfill chưa xong. Dùng các bước tương thích:

1. **Expand:** thêm column mới nullable và index/constraint phù hợp trong khi column cũ vẫn tồn tại. Xác minh DDL algorithm/lock hỗ trợ trên đúng MySQL version và table shape.
2. **Dual write:** deploy application ghi cả hai cột trong một transaction. Đọc vẫn ưu tiên cột cũ; metric kiểm tra số hàng được ghi cả hai.
3. **Backfill theo batch:** chuyển dữ liệu cũ với giới hạn row count/thời gian và checkpoint để job có thể tiếp tục sau lỗi. Tránh một transaction khổng lồ gây undo pressure, lock dài hoặc replica lag.
4. **Validate:** so sánh null count, mismatch, duplicate key và các aggregate quan trọng. Dừng chuyển đổi nếu có sai khác; giữ đường sửa hoặc chạy lại idempotent.
5. **Switch reads:** deploy code đọc `customer_id`, giữ dual write trong giai đoạn quan sát. Xác nhận traffic và rollback path trước khi ngừng phụ thuộc column cũ.
6. **Contract:** ở release sau, ngừng ghi cột cũ rồi mới drop nó sau thời gian an toàn. Drop cũng là một schema change cần xem metadata lock và khả năng rollback.

“Online DDL” không có nghĩa mọi thay đổi không khóa và không tốn tài nguyên. Tùy operation, engine và version, MySQL có thể làm instant metadata change, in-place work hoặc rebuild/copy; các pha vẫn có thể cần metadata lock, dung lượng tạm, I/O và thời gian. Đọc bảng hỗ trợ thuật toán và `LOCK` trong manual phiên bản đích, chạy thử với kích thước dữ liệu gần thật, theo dõi replica lag, và đặt điều kiện dừng. Không dùng thủ thuật sửa file nội bộ hoặc quy trình không được hỗ trợ từ các ví dụ lịch sử của sách.

## Đánh đổi trước khi thêm bản sao

Index phụ, cột cache, summary table và denormalization có thể giảm công đọc, đồng thời tăng bytes lưu, index maintenance, write amplification, đường retry và số invariants phải giữ. Nếu dữ liệu hiện tại chưa đủ lớn, phép đo có thể cho thấy join vẫn rẻ hơn duy trì bản sao. Khi thêm bản sao, hãy ghi ngay nguồn chính, owner cập nhật, semantics freshness, rebuild procedure và cách đối soát.


## Chọn điểm cân bằng giữa chuẩn hóa, bản sao và tốc độ đọc

Chuẩn hóa giảm dữ liệu trùng và các bất thường khi insert/update/delete, thường làm writes đơn giản hơn và bảng gọn hơn. Đổi lại, đọc cần join; cột cần lọc/sắp có thể nằm ở bảng khác nên một index không giải quyết được query. Denormalization đặt một số fact cạnh nhau để lọc/sắp bằng một đường truy cập hoặc tránh join, nhưng tăng write work, storage và nghĩa vụ giữ bản sao khớp. Không có lựa chọn “luôn normalize” hay “luôn denormalize”: bắt đầu từ model dễ giữ đúng, sau đó dùng profile của query thật để quyết định có chuyển một phần read path hay không.

Một ví dụ trong sách là tìm 10 message mới nhất của premium users. Nếu chỉ có index theo thời gian trên message, database có thể phải đọc nhiều message rồi join sang user để loại người không premium; nếu bắt đầu từ nhóm premium, có thể phải sort nhiều message. Copy `account_type` sang message và tạo index phù hợp có thể cho phép lọc/sắp trong cùng index, nhưng khi user đổi loại tài khoản phải cập nhật các message tương ứng. Bản sao chỉ đáng giữ nếu tần suất/chi phí đọc bù được update và repair cost. Không copy snapshot lịch sử như tên sản phẩm invoice vào “cache” nếu snapshot đó chính là sự thật nghiệp vụ tại thời điểm mua.

## Cache table và summary table cần refresh/rebuild rõ ràng

Cache table có thể giữ subset/cột đã sắp theo workload khác với bảng nguồn; summary/roll-up table giữ kết quả `GROUP BY`, ví dụ số message mỗi giờ. Cả hai làm query đọc ngắn hơn, nhưng phải định nghĩa freshness, atomicity, delete/update semantics, late events, retry/dedup, retention và drift repair. Cập nhật real-time có thể tăng contention; batch rebuild tiêu tốn I/O/CPU nhưng thường đơn giản hơn để xác minh và có thể sinh index gọn, ít phân mảnh.

Khi dữ liệu có thể trễ, hourly summary có thể phục vụ dashboard với độ trễ tối đa một giờ. Nếu cần chính xác “24 giờ vừa qua” mà vẫn muốn tận dụng summary, cộng 23 bucket giờ trọn vẹn rồi đếm trực tiếp hai đoạn biên chưa trọn giờ trên bảng gốc. Khoảng thời gian phải dùng biên nửa mở `[start, end)` để tránh đếm trùng ở ranh giới. Đây là một cách đổi một lần quét lớn thành một aggregation nhỏ cộng hai range query; độ mới và chính xác được xác định rõ thay vì âm thầm trả số gần đúng.

MySQL không tự duy trì materialized view native theo mô hình bảng kết quả được refresh; sách giới thiệu Flexviews để tiêu thụ row-based binlog và áp dụng delta của insert/update vào view aggregate. Đây là ý tưởng CDC/incremental view maintenance, còn Flexviews và các đường dẫn/tool trong sách là lịch sử — hãy đánh giá tool/CDC hiện hành, retention binlog, thứ tự sự kiện và recovery trước khi dùng. Một lần cập nhật nguồn có thể làm `COUNT` tăng 1, `SUM` đổi theo delta, nhưng update/delete cần trừ giá trị cũ và cộng mới, còn retry cần idempotency.

Khi rebuild summary mà ứng dụng vẫn cần đọc, tạo shadow table, nạp và validate xong rồi dùng một thao tác rename phù hợp để chuyển tên. Giữ bản cũ trong thời gian quan sát giúp rollback nhanh; cần đảm bảo CDC/catch-up đã theo kịp nguồn trước swap, xử lý write phát sinh trong lúc build và kiểm tra metadata lock/atomicity của phiên bản mục tiêu. Đừng xây bảng mới từ snapshot cũ rồi swap mà bỏ qua writes đến sau snapshot.

## Counter slots đổi điểm nghẽn ghi thành chi phí đọc tổng hợp

Một row counter duy nhất hoạt động như mutex: dù `count = count + 1` là atomic, mọi update cùng row vẫn được serialize bởi lock. Tạo các slot và chọn slot cho mỗi sự kiện phân tán writes; `SUM(count)` khi đọc gộp slot. Daily key `(day, slot)` giúp giới hạn vòng đời; compact job có thể hợp các slot về một slot rồi dọn phần còn lại. Số slot là tradeoff: nhiều slot giảm contention nhưng tăng read aggregation và cleanup.

Random slot không bảo vệ khỏi duplicate event: nếu client timeout sau commit rồi retry, cùng hit có thể đếm hai lần. Khi cần count chính xác, lưu event ID/dedup hoặc transactional outbox/consumer idempotency; khi metric cho phép gần đúng, nói rõ error/freshness budget. Cũng cần để ý giới hạn kiểu counter và rollover.

## ALTER TABLE: hiểu rebuild, giới hạn online và chiến thuật an toàn

Sách mô tả MySQL đời cũ thường tạo bảng rỗng mới, copy hàng/index, rồi thay bảng; với bảng lớn, bộ nhớ hạn chế và nhiều index, việc này có thể kéo dài, tăng I/O, dung lượng tạm và replica lag. MySQL hiện đại có instant/in-place/copy algorithm cho các thao tác khác nhau; “online” thường có nghĩa một số DML được phép trong một phần quá trình, không có nghĩa không cần metadata lock, không tiêu tài nguyên hay không thể timeout. Kiểm tra đúng loại thao tác, engine, row format, MySQL version, `ALGORITHM`/`LOCK`, replication topology và dung lượng trống bằng manual hiện hành trước rollout.
+
+Khi operation không thể chạy an toàn trực tiếp, các chiến lược ở mức vận hành gồm thử trên clone có kích thước tương đương, chạy trên replica rồi chuyển traffic theo quy trình đã thiết kế, hoặc tạo shadow copy và bắt kịp writes trước swap. Chia migration thành expand/backfill/validate/switch/contract để các version ứng dụng cùng tồn tại. Backfill theo batch/checkpoint giới hạn lock, undo/redo, binlog và lag; có kiểm tra row count, null/mismatch, uniqueness và rollback/forward plan.
+
+Với MyISAM cũ, sách còn mô tả `DISABLE KEYS`, nạp dữ liệu rồi `ENABLE KEYS` để trì hoãn xây non-unique indexes và dựng chúng bằng sort; cách này không tắt việc kiểm tra unique index. Đây là kỹ thuật đặc thù MyISAM, không phải tối ưu InnoDB hay mặc định cho hệ thống mới. Chương sách còn minh họa sửa trực tiếp file `.frm` và ghép file `.MYD/.MYI` để né rebuild. Đó là thủ thuật không được hỗ trợ, gắn với định dạng MySQL/MyISAM cũ; không dùng trên hệ thống hiện đại. Dùng DDL được hỗ trợ, backup/restore test, và tool online schema change được duy trì nếu cần. Các ví dụ `ALTER ... MODIFY` luôn rebuild, `.frm`, engine MyISAM hay thuật toán offline trong sách không được áp nguyên văn cho MySQL 8.4.

## Tự kiểm tra

**Tách bảng phòng ban có nghĩa mọi query nhanh hơn?** Không. Nó giảm lặp dữ liệu và update anomaly, nhưng một số truy vấn cần thêm join.

**Tăng counter bằng một câu `UPDATE` có thể vẫn nghẽn?** Có. Cùng một row vẫn tuần tự hóa các lượt cập nhật; counter slots phân tán ghi nhưng làm đọc phức tạp hơn.

**Có thể drop column cũ ngay sau khi backfill xong?** Chỉ khi mọi phiên bản ứng dụng, job và consumer đã ngừng đọc/ghi nó, validation đạt và có kế hoạch phục hồi.

Nguồn đọc: *High Performance MySQL*, chương 4; [MySQL 8.4 online DDL operations](https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl-operations.html), [ALTER TABLE](https://dev.mysql.com/doc/refman/8.4/en/alter-table.html).

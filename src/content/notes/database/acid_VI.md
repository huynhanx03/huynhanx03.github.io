---
title: "ACID: transaction bảo vệ dữ liệu đến đâu?"
category: "Database"
description: "Theo dõi một giao dịch để phân biệt nguyên tử, nhất quán, cô lập và bền vững, cùng giới hạn của mỗi bảo đảm."
updated: 2026-10-15
translationKey: "database/acid"
---

Một lệnh chuyển 100 đơn vị từ tài khoản A sang B gồm ít nhất hai cập nhật. Nếu chỉ trừ A mà chưa cộng B, dữ liệu lưu lại không còn biểu diễn một lần chuyển tiền hoàn chỉnh. Nếu hai request cùng đọc số dư cũ, từng lệnh riêng lẻ chạy thành công vẫn có thể tạo ra kết quả sai.

**Transaction** gom một nhóm thao tác database thành một đơn vị công việc. ACID mô tả bốn khía cạnh của đơn vị đó: atomicity, consistency, isolation và durability. Chúng cần được đọc cùng phạm vi transaction và cấu hình của hệ quản trị; bốn chữ cái không tự bảo vệ mọi tác dụng phụ của ứng dụng.

## Theo dõi một lần chuyển tiền

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

Đây là khung minh họa, không phải quy trình chuyển tiền đủ để dùng thật. Giả định đơn vị tiền là số nguyên, hai tài khoản tồn tại; code thực tế cần kiểm tra số dòng cập nhật, số dư, quyền giao dịch và yêu cầu trùng. Các lệnh trong cùng transaction phải dùng cùng phiên/kết nối được quản lý phù hợp.

Giả sử A có 500, B có 200. Trạng thái mong muốn sau commit là A=400, B=300. Ta dùng một lần chuyển này để xem từng thuộc tính bảo vệ điều gì.

## Atomicity: cùng thành công hoặc cùng bị hủy

Nếu transaction bị rollback, thay đổi của lần trừ và lần cộng không được để lại như kết quả đã commit riêng lẻ. Database dùng các cơ chế log và phục hồi phù hợp với thiết kế của nó để hỗ trợ điều này. [Hướng dẫn transaction của PostgreSQL](https://www.postgresql.org/docs/current/tutorial-transactions.html) minh họa ranh giới BEGIN/COMMIT/ROLLBACK.

Đừng suy ra mọi lỗi đều tự động trả tiền theo cùng cách. Ứng dụng phải xử lý lỗi và kết thúc transaction theo quy tắc driver/database. Email đã gửi, lệnh gọi nhà cung cấp bên ngoài hay cập nhật ở database khác không tự được rollback bởi transaction này.

Nếu mất kết nối đúng lúc commit, client có thể chưa biết transaction đã commit hay chưa. Trả lời cho người dùng và gửi lại yêu cầu cần xét trạng thái không chắc chắn đó, thay vì mặc định mất phản hồi nghĩa là chưa chuyển.

## Consistency: hợp lệ theo những quy tắc nào?

Với ví dụ không có phí, tổng hai số dư cần giữ ở 700. Nếu có quy tắc số dư không âm, transaction cũng phải tuân thủ nó. Primary key, foreign key, unique và check constraints giúp database kiểm tra những quy tắc đã được khai báo.

Nhưng database không tự biết mọi nghiệp vụ. Hai lệnh cập nhật hợp lệ về kiểu có thể cộng sai người nhận nếu ứng dụng truyền nhầm id. ACID consistency cần cả ràng buộc database lẫn logic transaction đúng. Cũng không nên nhầm thuộc tính này với eventual consistency hoặc linearizability trong hệ phân tán: chúng trả lời các câu hỏi khác nhau.

## Isolation: mức bảo vệ phụ thuộc isolation level

Cô lập điều chỉnh những gì transaction được nhìn thấy và các lịch thực thi được chấp nhận khi nhiều transaction cùng chạy. Không phải mức nào cũng cho cảm giác “mình là transaction duy nhất”. Serializable hướng đến kết quả tương đương một thứ tự tuần tự hợp lệ, nhưng không có nghĩa database phải thực thi thật từng transaction nối đuôi nhau.

| Hiện tượng | Cách hình dung |
| --- | --- |
| Dirty read | Đọc dữ liệu chưa commit của transaction khác |
| Non-repeatable read | Đọc lại cùng dòng và thấy giá trị đã được transaction khác commit thay đổi |
| Phantom read | Cùng điều kiện truy vấn nhưng tập dòng phù hợp thay đổi bởi transaction khác |

Các tên mức thường gặp là Read Uncommitted, Read Committed, Repeatable Read và Serializable. Bảo đảm cụ thể cần đọc theo hệ quản trị: PostgreSQL xử lý Read Uncommitted như Read Committed và Repeatable Read của nó còn ngăn phantom read. [Tài liệu isolation PostgreSQL](https://www.postgresql.org/docs/current/transaction-iso.html) nêu rõ khác biệt.

Để tránh hai request cùng tiêu số dư, có thể cần cập nhật có điều kiện, khóa dòng theo transaction hoặc mức cô lập phù hợp. Serializable có thể từ chối transaction bằng lỗi serialization; ứng dụng phải có chính sách thử lại cả transaction khi phù hợp, không chỉ lệnh cuối.

## Durability: commit được giữ trong mô hình lỗi nào?

Sau commit được xác nhận theo cấu hình bền vững đang dùng, database phải có khả năng phục hồi dữ liệu trong những sự cố được bảo đảm. WAL/redo log cho phép khôi phục thay đổi dù các trang dữ liệu chưa ghi hết xuống storage. Không nên suy thành “mọi dữ liệu đã commit vẫn tồn tại sau khi toàn bộ ổ đĩa và bản sao bị phá hủy”.

Cấu hình đổi bảo đảm. Chẳng hạn PostgreSQL asynchronous commit có thể báo thành công trước khi WAL được flush; một khoảng giao dịch gần nhất có thể mất khi crash. [Tài liệu asynchronous commit](https://www.postgresql.org/docs/current/wal-async-commit.html) giải thích đánh đổi đó. Replication bất đồng bộ cũng không đồng nghĩa replica đã nhận commit lúc primary trả lời.

Backup, phục hồi thảm họa và cách ứng dụng báo thành công là phần cần thiết ngoài cách viết SQL. Trong ví dụ chuyển tiền, ứng dụng chỉ nên khẳng định kết quả theo trạng thái transaction thực sự biết được.

## Tự kiểm tra ranh giới transaction

**Gửi email rồi rollback transaction: email có biến mất không?** Không. Nó là tác dụng phụ bên ngoài ranh giới database. Cần cách phối hợp riêng nếu muốn thông báo nhất quán với dữ liệu.

**Hai lệnh SELECT và UPDATE ở trong transaction đã đủ ngăn quá bán chưa?** Chưa kết luận được. Phải xét isolation, khóa, điều kiện UPDATE và cách xử lý lỗi.

**NoSQL có đồng nghĩa không có ACID?** Không. Bảo đảm có thể áp dụng cho một document, nhiều document hoặc transaction trong phạm vi cụ thể tùy sản phẩm. Eventual consistency cũng không phải tên thay thế cho việc bỏ cả bốn thuộc tính. Hãy đọc theo thao tác, phạm vi và cấu hình.

Bài [race condition](/vi/notes/fundamentals/concurrency_race/) giúp xác định đơn vị nghiệp vụ cần bảo vệ trước khi chọn cơ chế database.

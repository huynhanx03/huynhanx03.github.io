---
title: "ACID: 4 Trụ Cột Của Giao Dịch Database"
category: "Database"
---

# Nguyên lý ACID trong Database

Trong hệ quản trị cơ sở dữ liệu (DBMS), **Transaction (Giao dịch)** là trái tim của mọi ứng dụng. Để đảm bảo tính toàn vẹn của dữ liệu trong môi trường cao tải và nhiều rủi ro, các giao dịch phải tuân thủ tuyệt đối 4 thuộc tính gọi là **ACID**.

---

## A - Atomicity (Tính nguyên tử)
**"Tất cả hoặc không có gì (All or Nothing)."**

-   **Bản chất:** Một giao dịch gồm nhiều bước phải được thực hiện trọn vẹn. Nếu bất kỳ bước nào trong chuỗi bị lỗi, toàn bộ giao dịch sẽ bị hủy bỏ (**Rollback**) để dữ liệu không bị rơi vào trạng thái "nửa vời".
-   **Cơ chế:** Database đảm bảo điều này thông qua **Transaction Logs** và cơ chế quay lui dữ liệu.

## C - Consistency (Tính nhất quán)
**"Dữ liệu luôn hợp lệ sau mỗi giao dịch."**

-   **Bản chất:** Transaction sau khi commit phải đưa hệ thống từ một trạng thái hợp lệ sang một trạng thái hợp lệ khác. 
-   **Ràng buộc:** Nó phải tuân thủ mọi quy tắc như **Constraints** (Primary Key, Foreign Key), **Unique**, và các **Business Rules** đã định nghĩa trước. Nếu vi phạm, transaction sẽ bị từ chối.

## I - Isolation (Tính cô lập)
**"Các giao dịch chạy song song không dẫm chân lên nhau."**

-   **Bản chất:** Mỗi giao dịch hoạt động như thể nó là thực thể duy nhất trong hệ thống, không bị ảnh hưởng bởi các giao dịch khác đang chạy đồng thời.
-   **Vấn đề xử lý:** Isolation giúp ngăn chặn các hiện tượng:
    -   **Dirty Read:** Đọc phải dữ liệu chưa được commit của transaction khác.
    -   **Non-Repeatable Read:** Đọc lại cùng một dòng nhưng dữ liệu đã bị đổi.
    -   **Phantom Read:** Xuất hiện bản ghi "ma" khi truy vấn lại.
-   **Công cụ:** Được kiểm soát thông qua các **Isolation Levels** (Read Uncommitted, Read Committed, Repeatable Read, Serializable).

## D - Durability (Tính bền vững)
**"Dữ liệu đã ghi là không thể mất."**

-   **Bản chất:** Một khi giao dịch đã Commit, dữ liệu sẽ được lưu trữ vĩnh viễn, bất kể server có bị sập nguồn hay cháy nổ ngay sau đó.
-   **Cơ chế:** Database đảm bảo bằng các kỹ thuật như **Write-Ahead Log (WAL)**, **Redo Log**, và cơ chế **Persistence** xuống ổ đĩa cứng hoặc replication.

---

### Ví dụ thực tế: Chuyển tiền ngân hàng

Hãy tưởng tượng bạn chuyển tiền:
1.  **Atomicity:** Nếu hệ thống trừ tiền bạn xong mà gặp lỗi mạng không cộng tiền được cho người nhận, nó sẽ tự động trả lại tiền cho bạn (Rollback).
2.  **Consistency:** Sau khi chuyển, tổng số tiền của cả hai phải không đổi (Bảo toàn năng lượng).
3.  **Isolation:** Nếu người khác cũng đang chuyển tiền cho bạn lúc đó, số dư sẽ được tính toán tuần tự, không bị ghi đè lẫn nhau.
4.  **Durability:** Ngay khi app báo "Thành công", số tiền đó đã được ghi vào đĩa của ngân hàng, không sợ mất điện.

---

> ACID là tiêu chuẩn bắt buộc cho các hệ thống tài chính, ngân hàng và thương mại điện tử (thường dùng RDBMS như PostgreSQL, MySQL). Tuy nhiên, một số hệ thống NoSQL chấp nhận hy sinh ACID để đổi lấy tốc độ và khả năng mở rộng (Eventual Consistency).

---
title: "Data Race vs Race Condition"
category: "Fundamentals"
tags: ["concurrency", "distributed-systems", "basics"]
---

# Data Race vs Race Condition: Hiểu sâu để tối ưu hệ thống

Khi bước vào thế giới của lập trình song song (Concurrency) và hệ thống phân tán, hai khái niệm "Data Race" và "Race Condition" thường xuyên bị nhầm lẫn. Tuy nhiên, chúng là những vấn đề khác biệt với những cách giải quyết khác nhau.

## 1. Data Race (Xung đột dữ liệu)

**Định nghĩa:** Data Race xảy ra khi có ít nhất hai luồng (Threads) hoặc tiến trình (Processes) truy cập vào cùng một vùng nhớ đồng thời, trong đó:
- Có ít nhất một thao tác là **Ghi (Write)**.
- Không có cơ chế **Đồng bộ hóa (Synchronization)** nào được sử dụng để kiểm soát thứ tự truy cập.

**Hậu quả:** Kết quả của biến đó trở nên không xác định (Undefined Behavior). Bạn có thể nhận được một giá trị "rác" hoặc một giá trị bị hỏng do thao tác ghi chưa hoàn tất đã bị đọc.

**Ví dụ trong Go:**
```go
var count int
go func() { count++ }()
go func() { count++ }()
// Không có Mutex hay Channel để bảo vệ biến 'count'
```

## 2. Race Condition (Điều kiện chạy đua)

**Định nghĩa:** Race Condition là một lỗi logic mà tính đúng đắn của chương trình phụ thuộc vào **thứ tự** hoặc **thời điểm** thực thi của các sự kiện. 

Một hệ thống có thể **không có Data Race** (vì đã dùng khóa bảo vệ vùng nhớ) nhưng vẫn bị **Race Condition** về mặt logic nghiệp vụ.

**Ví dụ điển hình: Tồn kho quá bán (Over-selling)**
1. **Khách A** kiểm tra kho: "Còn 1 món".
2. **Khách B** kiểm tra kho: "Còn 1 món" (vì Khách A chưa kịp mua).
3. **Khách A** nhấn mua -> Trừ kho còn 0.
4. **Khách B** nhấn mua -> Trừ kho còn -1.

Mặc dù thao tác "Trừ kho" có thể đã được bảo vệ bởi Mutex (nghĩa là không có Data Race), nhưng logic kiểm tra và trừ kho không được thực hiện như một **Giao dịch nguyên tử (Atomic Transaction)**, dẫn đến lỗi logic.

## 3. Bản so sánh nhanh

| Đặc điểm | Data Race | Race Condition |
| :--- | :--- | :--- |
| **Bản chất** | Lỗi truy cập bộ nhớ cấp thấp. | Lỗi logic/thuật toán cấp cao. |
| **Nguyên nhân** | Thiếu đồng bộ hóa khi truy cập vùng nhớ dùng chung. | Sự phụ thuộc vào thứ tự thực thi của các tác vụ. |
| **Công cụ phát hiện** | `go run -race`, ThreadSanitizer. | Kiểm thử logic, stress test, phân tích thiết kế. |

## 4. Cách giải quyết

### Đối với Data Race
1. **Sử dụng Mutex (Khóa):** Đảm bảo tại một thời điểm chỉ có một luồng được phép Ghi hoặc Đọc-Ghi.
2. **Atomic Operations:** Sử dụng các chỉ thị phần cứng để thực hiện các thao tác đơn giản (cộng, gán) một cách không thể chia cắt.
3. **Channels (Go):** Áp dụng triết lý "Đừng chia sẻ bộ nhớ, hãy giao tiếp".

### Đối với Race Condition
1. **Giao dịch nguyên tử (Transactions):** Đảm bảo chuỗi hành động "Kiểm tra -> Xử lý -> Cập nhật" là một khối duy nhất không thể bị xen ngang (ví dụ: dùng SELECT FOR UPDATE trong Database).
2. **Idempotency (Tính lũy đẳng):** Thiết kế hệ thống sao cho một hành động lặp lại nhiều lần vẫn cho ra cùng một kết quả an toàn.
3. **Immutability (Bất biến):** Hạn chế tối đa việc thay đổi trạng thái của dữ liệu dùng chung.

---

> Một chương trình có thể có Data Race mà không bị Race Condition, và ngược lại. Nhưng thông thường, sự xuất hiện của một trong hai đều là dấu hiệu cho thấy hệ thống cần được xem xét lại về mặt thiết kế Concurrency.

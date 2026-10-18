---
title: "Garbage Collection"
category: "Go"
tags: ["golang", "garbage-collection", "runtime"]
---

# Garbage Collection: Quản trị bộ nhớ và Hiệu năng Runtime

Garbage Collection (GC) là cơ chế quản trị bộ nhớ tự động, đóng vai trò then chốt trong việc phát hiện và thu hồi các vùng nhớ không còn được sử dụng (unreachable). Mục tiêu cốt lõi của GC là giải phóng tài nguyên, ngăn chặn rò rỉ bộ nhớ (memory leak) và giúp lập trình viên tập trung hoàn toàn vào logic nghiệp vụ thay vì quản trị bộ nhớ thủ công.

---

## 1. Nguyên lý vận hành và Đặc tính cơ bản

### 1.1. Chu trình thu gom rác
Hệ thống GC vận hành dựa trên 4 bước logic chính:
1.  **Cấp phát**: Chương trình tạo ra các đối tượng và vùng nhớ cần thiết.
2.  **Định danh**: Khi đối tượng không còn được tham chiếu hoặc không còn khả năng truy cập, GC xác định chúng là "rác" (garbage).
3.  **Thu hồi**: Giải phóng các vùng rác này để làm trống tài nguyên.
4.  **Tái sử dụng**: Bộ nhớ được trả về để phục vụ cho các lần cấp phát sau.

### 1.2. Đánh giá chiến lược
-   **Ưu điểm**: Giảm thiểu lỗi quản lý bộ nhớ (`double free`, `dangling pointer`), hạn chế memory leak, tăng độ an toàn và ổn định hệ thống.
-   **Nhược điểm**: Có thể gây tạm dừng chương trình (**STW - Stop The World**), tiêu tốn tài nguyên CPU và không kiểm soát chính xác thời điểm giải phóng.

---

## 2. Mô hình GC truyền thống

Đây là kiến trúc nền tảng của Go, được thiết kế để tối ưu hóa độ trễ (latency) cho các hệ thống web và API.

### 2.1. Cách thức thực thi
-   **Concurrent**: Bộ thu gom rác chạy song song với chương trình (mutators).
-   **STW tối thiểu**: Chỉ dừng chương trình rất ngắn ở giai đoạn bắt đầu (Mark Setup) và kết thúc (Mark Termination) mỗi lần thu gom.
-   **Mark and Sweep**: Thực hiện theo kiểu "Đánh dấu rồi quét". Đối tượng còn được dùng sẽ được giữ lại, các đối tượng còn lại bị thu hồi bộ nhớ.

### 2.2. Mô hình Đánh màu (Tri-color Marking)
-   **Màu trắng**: Đối tượng chưa được kiểm tra, có thể bị thu gom nếu kết thúc chu kỳ vẫn là màu trắng.
-   **Màu xám**: Đối tượng đã phát hiện nhưng chưa duyệt hết các tham chiếu bên trong.
-   **Màu đen**: Đối tượng đã duyệt xong và xác định chắc chắn là còn sử dụng.
> Việc đánh màu giúp GC chạy song song mà không bỏ sót đối tượng, đảm bảo tính toàn vẹn của đồ thị bộ nhớ.

### 2.3. Các thành phần vận hành
-   **Điểm gốc (Roots)**: Bắt đầu đánh dấu từ Stack của các goroutine, bao gồm biến toàn cục và các tham chiếu đang hoạt động.
-   **Write Barrier (Theo dõi khi ghi)**: Khi chương trình gán một tham chiếu mới, GC phải được thông báo để cập nhật trạng thái đánh dấu. Điều này làm tăng chi phí CPU nhưng đảm bảo an toàn tuyệt đối.

### 2.4. Đặc tính kỹ thuật đặc thù
-   **Không di chuyển đối tượng (Non-moving)**: Đối tượng luôn giữ nguyên địa chỉ bộ nhớ từ khi cấp phát đến khi thu hồi. Điều này giúp con trỏ luôn ổn định, tương thích tốt với các hệ thống bậc thấp.
-   **Không phân chia theo thế hệ (Non-generational)**: Không chia trẻ hay già; mỗi lần thu gom có thể phải duyệt toàn bộ Heap dựa trên mức cấp phát.
-   **Thời điểm kích hoạt**: GC chạy dựa trên mức cấp phát bộ nhớ (thông qua `GOGC`). Khi heap tăng đủ lớn so với lần thu gom trước, GC sẽ được kích hoạt.

---

## 3. Bước ngoặt với "Green Tea": Tối ưu cho Multi-core

"Green Tea" là sự tiến hóa vượt bậc nhằm tối ưu hóa chi phí CPU và tính cục bộ của bộ nhớ.

### 3.1. Đơn vị quét theo Khối (8KB)
Thay vì quét từng đối tượng rải rác, hệ thống thực hiện thu gom theo các khối bộ nhớ liên tiếp (**Spans - 8KB**).
-   **Locality tốt hơn**: Việc truy cập theo vùng liền kề giúp tận dụng cache CPU hiệu quả, giảm thiểu **Cache Miss** đáng kể so với mô hình cũ.
-   **Giảm chi phí CPU**: Tiết kiệm đáng kể overhead nhờ xử lý trọn gói (giảm từ 10% đến 40% chi phí runtime).

### 3.2. Khả năng mở rộng
Dễ dàng chia việc thu gom cho nhiều lõi CPU đồng thời. Mỗi lõi có thể xử lý các khối bộ nhớ độc lập, giảm tranh chấp (contention) giữa các luồng runtime.

---

## 4. GC của Go vs. Java

Sự khác biệt phản ánh triết lý thiết kế hệ thống giữa hai hệ sinh thái lớn:

| Tiêu chí | Go Garbage Collector | Java Garbage Collector (JVM) |
| :--- | :--- | :--- |
| **Triết lý thiết kế** | Đơn giản, ổn định, dễ dự đoán. | Linh hoạt, đa dạng nhiều chiến lược. |
| **Mô hình bộ nhớ** | Không phân thế hệ (Non-generational). | Phân thế hệ rõ ràng (Generational). |
| **Đơn vị thu gom** | Khối bộ nhớ liên tiếp (**8KB**). | Vùng nhớ / Region / Generation. |
| **Di chuyển Object** | **Không di chuyển** (Địa chỉ ổn định). | **Có di chuyển** để chống phân mảnh. |
| **Con trỏ** | Luôn ổn định và an toàn. | Thay đổi do object bị di chuyển. |
| **Độ trễ** | Thấp và ổn định mặc định. | Tùy biến cao, ZGC rất thấp nhưng phức tạp.|
| **Tuning GC** | Ít hoặc gần như không cần can thiệp. | Nhiều tham số cần tinh chỉnh phức tạp. |
| **Độ phức tạp** | Thấp. | Cao. |

---

## 5. Giải phẫu Cơ chế Điều phối và Hệ thống Bổ trợ

### 5.1. GC Assist (Cơ chế cưỡng bức hỗ trợ)
Đây là giải thích cho hiện tượng latency spikes bất ngờ dù STW pause thấp.
-   **Cơ chế**: Khi ứng dụng cấp phát bộ nhớ quá nhanh khiến GC Concurrent không theo kịp, Runtime kích hoạt chế độ **Assist**. Nó "ép" chính Goroutine đang alloc đó phải dừng việc nghiệp vụ để tham gia Marking rác.
-   **Hệ quả**: Đây là cơ chế "phanh khẩn cấp" để đảm bảo Heap không vỡ trận.

### 5.2. Background Scavenger & Memory Release
GC chỉ thu hồi bộ nhớ về cho Go Runtime. Để trả lại cho Hệ điều hành (OS), cần đến **Background Scavenger**.
-   **Cơ chế**: Một Goroutine ngầm theo dõi các trang bộ nhớ đã thu hồi và thực hiện trả lại cho OS (thông qua `madvise`) để tối ưu hóa **RSS** (Resident Set Size).

### 5.3. GC Pacing & Lifecycle Transitions
Quá trình chuyển giao giữa các phase được điều phối bởi thuật toán **Pacing**:
- **Sweep Termination** (kết thúc cũ) -> **Mark Setup** (chuẩn bị STW) -> **Concurrent Marking** (quét nền) -> **Mark Termination** (chốt sổ STW).
- Thuật toán này dự báo thời điểm kích hoạt GC sao cho tối ưu nhất cả về CPU và Memory.

### 5.4. runtime.Pinner (Go 1.21+)
Cung cấp khả năng "ghim" địa chỉ bộ nhớ cho các trường hợp tương tác nâng cao với **cgo**, đảm bảo an toàn vùng nhớ khỏi sự tác động của GC.

---

## 6. Chiến lược Tối ưu hóa và Quản trị Áp lực Heap

Việc tối ưu GC bắt đầu từ cách viết code hiệu quả:

1.  **sync.Pool**: Tái sử dụng đối tượng (Reuse) giúp giảm lượng cấp phát mới khổng lồ. Đây là vũ khí mạnh nhất để giảm áp lực cho Heap và tần suất GC.
2.  **Escape Analysis**: Hạn chế biến "escape" lên Heap. Biến nằm trên Stack không chịu áp lực từ GC.
3.  **Pointer-heavy avoidance**: Tránh cấu trúc quá nhiều con trỏ (ví dụ `map[int]*Struct`) để giảm chi phí Pointer scanning.
4.  **Pre-allocation**: Luôn sử dụng `cap` cho slice/map nếu biết kích thước để tránh rác vụn từ việc tái cấp phát.

---

> Hiểu về Garbage Collection là ranh giới giữa việc "viết code chạy được" và "viết mã nguồn hiệu năng cao". Tư duy đúng đắn là thiết kế mã nguồn sao cho GC phải làm việc ít nhất có thể.

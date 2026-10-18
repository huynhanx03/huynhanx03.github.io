---
title: "Channels"
category: "Go"
tags: ["golang", "concurrency", "channels", "fundamentals"]
---

# Channels: Đường dẫn truyền tin cậy

Nếu coi Goroutines là những công nhân đang nỗ lực làm việc song song, thì **Channels** chính là những "đường ống dẫn" giúp họ trao đổi dữ liệu (hàng hóa) với nhau một cách an toàn và nhịp nhàng.

Channel vừa đóng vai trò là một **Hàng đợi dữ liệu** (Queue), vừa là một **Điểm đồng bộ** (Synchronization Point) được Go runtime trực tiếp quản lý.

## 1. Khởi tạo và Sử dụng Cơ bản

Theo triết lý của Go: *"Đừng giao tiếp bằng cách chia sẻ bộ nhớ; hãy chia sẻ bộ nhớ bằng cách giao tiếp."*

```go
// Khởi tạo một channel truyền tải dữ liệu kiểu số nguyên (int)
ch := make(chan int)

// Gửi dữ liệu vào channel (ký hiệu <- phía bên phải)
go func() {
    ch <- 100
}()

// Nhận dữ liệu từ channel (ký hiệu <- phía bên trái)
val := <-ch
fmt.Println("Giá trị nhận được:", val)
```

### Channel một chiều (Uni-directional Channels)
Để tăng tính an toàn, Go cho phép giới hạn quyền hạn của Channel trong tham số hàm:
- `chan<- int`: Chỉ có thể gửi (Send-only).
- `<-chan int`: Chỉ có thể nhận (Receive-only).

## 2. So sánh Unbuffered và Buffered Channel

| Tiêu chí | Unbuffered Channel (Không đệm) | Buffered Channel (Có đệm) |
| :--- | :--- | :--- |
| **Bản chất** | Buffer size = 0. | Buffer size > 0. |
| **Cơ chế Send** | Block cho đến khi có người Nhận. | Không block nếu buffer chưa đầy. |
| **Cơ chế Receive** | Block cho đến khi có người Gửi. | Không block nếu buffer có dữ liệu. |
| **Ưu điểm** | Tốc độ xử lý nhanh, đồng bộ chặt chẽ. | Tăng thông lượng, giảm Context Switching. |
| **Bất lợi** | Context switching nhiều hơn. | Chiếm dụng bộ nhớ nếu `cap` quá lớn. |
| **Ví dụ** | **Điện thoại**: Người gọi và người nghe phải cùng trực tuyến. | **Hòm thư**: Người đưa thư bỏ thư vào hòm rồi đi, người nhận lấy sau. |

## 3. Trạng thái và Hành vi của Channel

Hiểu rõ hành vi của Channel trong các trạng thái khác nhau là chìa khóa để tránh lỗi `panic` hoặc `deadlock`.

| Trạng thái | Gửi (Send) | Nhận (Receive) | Đóng (Close) |
| :--- | :--- | :--- | :--- |
| **Nil** (Chưa khởi tạo) | **Block mãi mãi** | **Block mãi mãi** | **Panic** |
| **Open** (Đang mở) | Thành công / Block | Thành công / Block | Thành công |
| **Closed** (Đã đóng) | **Panic** | Nhận hết dữ liệu tồn -> Trả về Zero Value | **Panic** |

## 4. Giải phẫu Channel: Cấu trúc `hchan`

Bên trong Go runtime, mỗi channel thực chất là một cấu trúc **`hchan`** nằm trên bộ nhớ Heap. Bạn có thể hiểu Channel là sự kết hợp của 4 thành phần cốt lõi:

```go
type hchan struct {
    qcount   uint           // Số lượng phần tử hiện có trong buffer
    dataqsiz uint           // Sức chứa của buffer (capacity)
    buf      unsafe.Pointer // Con trỏ tới mảng vòng (Ring Buffer) lưu trữ dữ liệu
    lock     mutex          // Khóa bảo vệ channel khi có goroutine truy cập

    sendx    uint   // Chỉ số (index) tiếp theo để gửi dữ liệu vào buf
    recvx    uint   // Chỉ số (index) tiếp theo để nhận dữ liệu từ buf

    sendq    waitq  // Hàng chờ các Goroutine đang đợi Gửi (đang bị block)
    recvq    waitq  // Hàng chờ các Goroutine đang đợi Nhận (đang bị block)
}
```

**Insight kỹ thuật "Clean":**
> Channel thực chất là một cấu trúc dữ liệu **Thread-safe**:
> `Mutex (Khóa)` + `Ring Buffer (Mảng vòng)` + `2 Chỉ số (sendx, recvx)` + `Wait Queues (Hàng chờ Goroutine)`.

---

### 4.1. Cơ chế Ring Buffer và 2 "Con trỏ" (sendx, recvx)
Mảng `buf` trong Channel là một **Hàng đợi vòng (Circular Queue)**. Thay vì dịch chuyển toàn bộ dữ liệu khi có người nhận (tốn O(n)), Go runtime sử dụng 2 chỉ số:

*   **`sendx`**: Vị trí mà Sender sẽ ghi dữ liệu tiếp theo vào.
*   **`recvx`**: Vị trí mà Receiver sẽ lấy dữ liệu tiếp theo ra.

**Cách vận hành "đuổi bắt":**
1.  **Gửi (Send):** Dữ liệu đặt vào `buf[sendx]`, sau đó `sendx++`.
2.  **Nhận (Receive):** Lấy dữ liệu từ `buf[recvx]`, sau đó `recvx++`.
3.  **Quay vòng:** Khi bất kỳ chỉ số nào chạm ngưỡng `dataqsiz` (capacity), nó sẽ tự động **quay lại 0** (Reset index).
4.  **Trạng thái:**
    -   **Channel Rỗng:** Khi `qcount == 0`.
    -   **Channel Đầy:** Khi `qcount == dataqsiz`.

Việc dùng mảng vòng giúp các thao tác trên Channel luôn đạt độ phức tạp **O(1)**, cực kỳ tối ưu về mặt hiệu năng.

---

## 5. Vòng đời dữ liệu dưới góc nhìn Runtime

Khi bạn thực hiện `ch <- data` hoặc `<-ch`, Go runtime sẽ vận hành qua các giai đoạn sau:

### Giai đoạn 1: Khóa (Locking)
Mọi thao tác bắt đầu bằng việc `lock` Mutex bên trong `hchan`. Điều này đảm bảo tính nguyên tử (atomic), biến Channel thành một cấu trúc dữ liệu an toàn cho đa luồng.

### Giai đoạn 2: "Bắt tay" trực tiếp (Direct Handoff) - Một tối ưu cực mạnh
- **Nếu Gửi:** Runtime kiểm tra hàng chờ `recvq`. Nếu có Goroutine đang đợi nhận, nó sẽ copy dữ liệu **trực tiếp từ stack của sender sang stack của receiver**. Bước này bỏ qua hoàn toàn việc ghi vào buffer, cực kỳ hiệu quả!
- **Nếu Nhận:** Tương tự, nếu có ai đó đang đợi ở `sendq` và buffer đang rỗng, dữ liệu được truyền thẳng tay.

### Giai đoạn 3: Thao tác với Ring Buffer (Nếu là Buffered)
Nếu không có ai đang chờ sẵn:
- **Gửi:** Nếu buffer chưa đầy, dữ liệu được copy vào mảng `buf` tại vị trí `sendx`. Sau đó `sendx` được tăng lên (và quay vòng về 0 nếu chạm cuối mảng).
- **Nhận:** Lấy dữ liệu tại vị trí `recvx` trong `buf`, giải phóng chỗ trống và cập nhật `recvx`.

### Giai đoạn 4: Tạm dừng và Điều phối (Blocking & Scheduling)
Nếu buffer đã đầy (khi gửi) hoặc rỗng (khi nhận):
1. Goroutine hiện tại tự đóng gói mình vào một cấu trúc gọi là `sudog`.
2. Đưa `sudog` này vào hàng chờ tương ứng (`sendq` hoặc `recvq`).
3. **Yêu cầu Scheduler:** Goroutine này chủ động chuyển sang trạng thái *Waiting* và nhường CPU cho Goroutine khác. 
4. Khi có một "đối tác" xuất hiện sau đó, Scheduler sẽ đánh thức Goroutine này dậy để hoàn tất việc truyền tin.

## 5. Vấn đề Lock Contention và Cách tối ưu hóa

Khi quá nhiều goroutine cùng thao tác lên một channel duy nhất, khóa Mutex bên trong sẽ gây ra trễ hệ thống (Lock Contention).

**Các giải pháp Clean Code:**
- **Batching (Gom nhóm)**: Gửi cả một `slice` dữ liệu thay vì gửi từng phần tử lẻ để giảm số lần tranh chấp khóa.
- **Sharding (Phân đoạn)**: Chia một channel lớn thành nhiều channel nhỏ hơn để phân tán áp lực.
- **Local Buffer**: Mỗi worker có vùng đệm riêng, chỉ đẩy lên channel chính khi thực sự cần.
- **Direct Handoff**: Tối ưu hóa việc tận dụng các goroutine đang chờ sẵn trong hàng đợi để giảm thời gian xử lý buffer.

## 6. Câu lệnh Select: Nhạc trưởng điều phối

Sử dụng `select` để lắng nghe từ nhiều channel đồng thời:

```go
select {
case msg1 := <-ch1:
    fmt.Println("Nhận từ kênh 1:", msg1)
case ch2 <- 10:
    fmt.Println("Gửi thành công vào kênh 2")
default:
    // Thực hiện nếu không có channel nào sẵn sàng (Non-blocking)
    fmt.Println("Làm việc khác...")
}
```

### Giải phẫu câu lệnh `select` (Select Anatomy)

Bạn có bao giờ thắc mắc điều gì thực sự xảy ra khi Go thực thi cụm `select`? Nó không phải là một vòng lặp `for` đơn giản duyệt qua các case. Quy trình thực tế phức tạp và tinh vi hơn nhiều:

1.  **Cấu trúc `scase`**: Mỗi `case` trong `select` được trình biên dịch chuyển thành một cấu trúc gọi là **`scase`**, chứa thông tin về channel và loại thao tác (gửi hoặc nhận).
2.  **Xáo trộn (Scrambling)**: Trước khi kiểm tra, Go runtime sẽ xáo trộn thứ tự các case một cách ngẫu nhiên. Đây là lý do tại sao `select` không chọn theo thứ tự khai báo, giúp đảm bảo tính công bằng (Fairness).
3.  **Khóa đồng loạt (Locking)**: Go runtime sẽ khóa tất cả các channel có mặt trong `select`. Để tránh **Deadlock**, các channel được khóa theo thứ tự địa chỉ bộ nhớ tăng dần.
4.  **Thăm dò (Polling)**: Sau khi khóa, runtime duyệt qua danh sách các case đã xáo trộn để xem có channel nào sẵn sàng ngay lập tức không. Nếu có, nó thực hiện thao tác đó, mở khóa tất cả và kết thúc `select`.
5.  **Chờ đợi (Waiting)**: Nếu không có case nào sẵn sàng và không có `default`:
    -   Goroutine hiện tại sẽ tạo ra các `sudog` và đăng ký bản thân vào hàng chờ (`sendq`/`recvq`) của **TẤT CẢ** các channel trong `select`.
    -   Goroutine đi vào trạng thái ngủ (Sleep).
6.  **Đánh thức (Waking)**: Khi có một đối tác thực hiện thao tác trên một trong các channel đó, Goroutine sẽ được đánh thức. Nó sẽ khóa lại tất cả, hủy đăng ký khỏi các hàng chờ của những channel còn lại, và thực thi code của case tương ứng.

**Insight quan trọng:** Vì phải khóa/mở khóa nhiều channel và đăng ký/hủy đăng ký hàng chờ, lệnh `select` có chi phí xử lý (overhead) lớn hơn so với việc gửi/nhận trên một channel đơn lẻ.

---

> **Quy tắc đóng channel:** Chỉ bên Gửi mới đóng channel (`close(ch)`). Tuyệt đối không gửi vào channel đã đóng để tránh **Panic**.

---

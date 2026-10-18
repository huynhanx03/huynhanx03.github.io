---
title: "Goroutines"
category: "Go"
tags: ["golang", "concurrency", "goroutines", "fundamentals"]
---

# Goroutines: Lập trình đồng thời siêu nhẹ

Go được khai sinh để chinh phục thế giới đa nhân (Multi-core). Trái tim của sức mạnh này chính là **Goroutine**. Hãy tạm quên đi khái niệm "Thread" (Luồng) nặng nề của hệ điều hành; Goroutine là một thực thể vận hành nhẹ nhàng hơn hàng nghìn lần.

## 1. Goroutine là gì?

Goroutine là một hàm có khả năng thực thi đồng thời với các hàm khác. Một ứng dụng Go có thể vận hành hàng triệu Goroutine cùng một lúc mà không làm quá tải hệ thống.

## 2. Cách vận hành cơ bản

### 2.1. Khởi tạo với từ khóa `go`

Mọi thứ diễn ra vô cùng đơn giản: chỉ cần thêm từ khóa `go` trước bất kỳ lời gọi hàm nào.

```go
func SayHello(name string) {
    fmt.Println("Xin chào", name)
}

func main() {
    go SayHello("An") // Thực thi hàm ngầm trong nền (background)
    fmt.Println("Hàm main vẫn tiếp tục chạy...")

    // Lưu ý quan trọng: Nếu hàm main kết thúc, mọi Goroutine khác cũng sẽ bị ngắt lập tức
    time.Sleep(time.Second)
}
```

> **Hàm main là một Goroutine:** Khi chương trình Go chạy, hệ thống sẽ tạo ra một Goroutine đặc biệt gọi là `main goroutine`. Nếu `main` thoát ra, chương trình sẽ đóng lại ngay lập tức mà không cần quan tâm các Goroutine khác có còn đang chạy hay không.

### 2.2. Đồng bộ hóa với WaitGroup

Làm thế nào để hàm `main` kiên nhẫn chờ đợi cho đến khi tất cả các Goroutine hoàn thành nhiệm vụ? Chúng ta sử dụng công cụ `sync.WaitGroup`.

```go
var wg sync.WaitGroup

wg.Add(1) // Thông báo có 1 tác vụ chuẩn bị bắt đầu
go func() {
    defer wg.Done() // Báo cáo hoàn thành khi hàm kết thúc
    fmt.Println("Đang xử lý dữ liệu chuyên sâu...")
}()

wg.Wait() // Dừng lại chờ cho đến khi nhận được đủ tín hiệu Done
fmt.Println("Mọi tác vụ đã hoàn tất!")
```

### 2.3. Phân biệt Concurrency và Parallelism

-   **Concurrency (Đồng thời)**: Khả năng sắp xếp và quản lý nhiều việc để xử lý cùng lúc (ví dụ: một người vừa nấu ăn vừa nghe điện thoại).
-   **Parallelism (Song song)**: Thực hiện nhiều việc tại cùng một thời điểm vật lý (ví dụ: hai đầu bếp cùng nấu ăn ở hai gian bếp khác nhau).

Go được thiết kế tối ưu để bạn viết mã theo tư duy Concurrency, và hệ thống của Go (Go Runtime) sẽ tự động phân phối để chúng chạy Parallelism trên các nhân CPU hiện có.

> Đừng lạm dụng từ khóa `go` một cách vô tội vạ. Mỗi Goroutine cần có mục tiêu rõ ràng và phải được quản lý vòng đời chặt chẽ để tránh rò rỉ tài nguyên.

---

## 3. Tại sao Goroutine mạnh mẽ? (Kiến trúc & Cơ chế)

### 3.1. So sánh với Thread truyền thống

So với OS Thread truyền thống:
- Stack cực nhỏ (khởi điểm vài KB), tự động co/giãn linh hoạt.
- Context Switch (chuyển đổi ngữ cảnh) cực nhẹ do được tiến hành ở user-space (không cần can thiệp xuống kernel).
- Scheduler được kiểm soát hoàn toàn bởi Go runtime thay vì Hệ điều hành.

**Lợi ích:**
- Tránh ánh xạ 1:1 giữa Goroutine và OS Thread.
- Loại bỏ chi phí Context Switch nặng nề của OS Kernel.
- Tận dụng tối đa sức mạnh đa nhân (Core CPU).

**1. Mỗi Goroutine có bộ nhớ Stack riêng biệt:**
-   **Stack riêng:** Mỗi Goroutine khi sinh ra đều được cấp một vùng nhớ riêng gọi là Stack (khởi điểm chỉ **2KB**) để lưu trữ các biến cục bộ và lời gọi hàm. Điều này giúp chúng hoạt động độc lập, không xâm phạm lẫn nhau.
-   **Tự động co giãn (Contiguous Stacks):** Nếu 2KB không đủ, Go runtime sẽ tự động cấp thêm vùng nhớ lớn hơn và chuyển dữ liệu sang. Khác với OS Thread luôn giữ cố định 1-8MB (gây lãng phí), Goroutine chỉ dùng đúng những gì nó cần.

**2. Cơ chế Hoán đổi (Context Switch) của Scheduler:**
-   Goroutine không phải là một luồng hệ điều hành thật sự, nó là một thực thể logic chứa code và vùng nhớ Stack riêng.
-   **Cách chạy (Pointer Swap):** Khi đến lượt một Goroutine được chạy, Go Scheduler thực hiện việc hoán đổi cực nhanh: nó cập nhật các thanh ghi của CPU (như **SP - Stack Pointer** và **PC - Program Counter**) để trỏ thẳng vào vùng Stack của Goroutine mới.
-   **Hiệu năng:** Vì vùng nhớ Stack đã nằm sẵn trên bộ nhớ (Heap), việc chuyển đổi chỉ là thay đổi địa chỉ mà CPU trỏ tới. **Hoàn toàn không có việc sao chép dữ liệu Stack**, giúp tốc độ chuyển đổi đạt mức nano giây.

#### Bảng so sánh Process vs Thread vs Goroutine

| Tiêu chí | Process | Thread (OS) | Goroutine (Go) |
| :--- | :--- | :--- | :--- |
| **Bản chất** | Đơn vị cô lập tài nguyên | Đơn vị thực thi trong process | Đơn vị thực thi logic của Go |
| **Quản lý bởi** | Hệ điều hành | Hệ điều hành | Go runtime |
| **Không gian bộ nhớ** | Riêng biệt | Chung trong process | Chung trong process |
| **Heap** | Riêng | Chung | Chung |
| **Stack** | Riêng | Riêng | Riêng |
| **Kích thước stack** | Lớn, cố định | ~1–8 MB, cố định | ~2 KB, tăng động |
| **Tạo mới** | Rất tốn kém | Tốn kém | Rất rẻ |
| **Context switch** | Rất đắt (kernel) | Đắt (kernel) | Rẻ (user-space) |
| **Scheduling** | Kernel | Kernel | Go scheduler |
| **Số lượng tối đa** | Rất ít | Vài nghìn | Hàng trăm nghìn – triệu |
| **Giao tiếp** | IPC | Shared memory | Channel / shared memory |
| **Khả năng scale** | Kém | Trung bình | Rất tốt |
| **Mục tiêu thiết kế** | An toàn, cách ly | Song song | Concurrency hiệu quả |

### 3.2. Mô hình lập lịch GMP

-   **Goroutine**: Chỉ tiêu tốn khoảng **2KB** khởi điểm và có khả năng co giãn linh hoạt (growable stacks).

GMP là mô hình lập lịch (scheduler) của Go runtime, được sử dụng để ánh xạ các đơn vị công việc logic (Goroutine) lên các đơn vị thực thi vật lý (OS Thread/Machine) một cách hiệu quả. Go sử dụng một bộ điều phối (scheduler) nội bộ vô cùng thông minh. Thay vì để Hệ điều hành quản lý hàng triệu Thread, Go Scheduler sẽ tự mình phân phối hàng triệu Goroutine (G) lên một số lượng ít các Thread hệ điều hành (M) thông qua các bộ xử lý logic (P). Điều này giúp việc chuyển đổi ngữ cảnh (context switch) diễn ra cực nhanh.

- **G (Goroutine)**: Đơn vị công việc logic.
- **M (Machine)**: OS Thread/Luồng Hệ điều hành vật lý.
- **P (Processor)**: Tài nguyên thực thi trung gian, giữ quyền chạy Go code.

#### 3.2.1. G – Goroutine (Đơn vị công việc)

| Tiêu chí | Mô tả chi tiết |
| :--- | :--- |
| **Bản chất** | Là một task logic, không phải Thread. Rất nhẹ (stack vài KB, có thể tự co/giãn). Không gắn cố định với OS Thread. |
| **Vai trò** | Chứa: Function cần chạy, Stack, và các Metadata (status, con trỏ, thông tin panic...). |
| **Điểm quan trọng** | Goroutine không tự chạy. Nó bắt buộc phải được gán cho P và chạy trên M. |

#### 3.2.2. M – Machine (OS Thread)

| Tiêu chí | Mô tả chi tiết |
| :--- | :--- |
| **Bản chất** | Là một OS Thread thật do Go runtime tạo và quản lý. |
| **Vai trò** | Thực sự thực thi các lệnh CPU (CPU instruction). Chạy Go code hoặc bị block bởi syscall (hệ thống). |
| **Điểm quan trọng** | Số lượng M có thể nhiều hơn P. M không sở hữu công việc, nó chỉ là "người làm thuê" để thực thi. |

#### 3.2.3. P – Processor (Lõi Lập lịch)

| Tiêu chí | Mô tả chi tiết |
| :--- | :--- |
| **Bản chất** | P không phải CPU. P là: Quyền được chạy Go code và đi kèm với hàng đợi (run queue) local để chứa Goroutine. |
| **Vai trò** | Giữ Run queue của Goroutine, Cache allocator, GC state. Điều phối Goroutine rất nhanh mà không cần khóa (lock) toàn cục. |
| **Quan hệ** | 1 P ↔ tối đa 1 M tại một thời điểm. M muốn chạy Go code bắt buộc phải có P. |
| **GOMAXPROCS** | Số lượng P được xác định bởi biến môi trường `GOMAXPROCS` (thường mặc định bằng số core CPU). |
| **Local Run Queue** | Mỗi P sở hữu một hàng đợi riêng chứa tối đa **256** Goroutine đang chờ chạy. Ngoài ra còn có một slot đặc biệt gọi là `runnext` để ưu tiên chạy ngay lập tức Goroutine vừa thức tỉnh. |

#### 3.2.4. Các thực thể nội bộ đặc biệt

- **M0 (Machine 0)**: Là thread đầu tiên được tạo ra khi chương trình khởi chạy. Nó chịu trách nhiệm khởi tạo runtime và thực thi hàm `main`.
- **G0 (Goroutine 0)**: Mỗi M đều đi kèm với một G0. G0 không chạy code người dùng mà chạy trên **System Stack** để thực hiện các nhiệm vụ lập lịch, cấp phát bộ nhớ và quản lý GC.

### 3.3. Cơ chế lập lịch thông minh

#### 3.3.1. Luồng chạy thực tế (Execution Flow)

1. Goroutine (G) được tạo và đưa vào Run Queue của P.
2. Một OS Thread (M) sẵn sàng sẽ lấy một Processor (P).
3. M lấy một Goroutine (G) từ Run Queue của P.
4. M thực thi Goroutine đó.

Trạng thái kết thúc của Goroutine:
- **Chạy xong** → Exit.
- **Bị block** → Bị tách khỏi M.
- **Tự nguyện nhả CPU (Yield)** → Trả CPU cho Goroutine khác.

> **Tóm tắt:** M chạy, P điều phối, G là công việc.

#### 3.3.2. Xử lý Blocking Syscall

Khi một Goroutine thực hiện một lệnh Syscall blocking (như I/O, network), OS Thread (M) sẽ bị block theo. Nếu M giữ P, toàn bộ Goroutine trên P đó sẽ bị đứng.

**Giải pháp của Go:**
- Khi Goroutine vào Syscall blocking: M nhả P (cho phép Goroutine bị block chạy trên M mà không cần P).
- P ngay lập tức được gán cho một M khác rảnh rỗi.
- **Kết quả:** Khi Syscall xong, Goroutine quay lại Run Queue. Các Goroutine khác trên P vẫn tiếp tục được lập lịch và chạy mà không bị gián đoạn.

#### 3.3.3. Work Stealing (Cân bằng tải)

- **Vấn đề:** Một Processor (P) rảnh rỗi nhưng P khác lại quá tải với quá nhiều Goroutine trong hàng đợi.
- **Giải pháp:** P rảnh sẽ "ăn cắp" (steal) khoảng 1/2 số Goroutine từ Run Queue của P khác.
- **Lợi ích:** Tránh phụ thuộc hoàn toàn vào Global Queue, giảm xung đột khóa (lock contention), và tối ưu cache locality.

#### 3.3.4. Global Run Queue (GRQ) - Hành lang chờ chung

Khi Local Queue của P bị đầy (quá 256), các Goroutine mới sinh ra sẽ được đẩy vào **Global Run Queue**. GRQ là một hàng đợi dùng chung cho toàn bộ hệ thống, được bảo vệ bởi một khóa (global lock).

**Cơ chế thoát khỏi Global Queue:**
1.  **Tính công bằng (Quy tắc 1/61):** Để tránh việc P chỉ mải mê chạy các Goroutine trong Local Queue mà "bỏ đói" (starve) các Goroutine ở Global Queue, Go scheduler áp dụng quy tắc đặc biệt: Cứ mỗi **61 ticks** (lần lập lịch), P sẽ bắt buộc phải kiểm tra GRQ trước khi xem Local Queue của chính mình.
2.  **Lấp đầy mẻ (Batch Picking):** Khi một P rảnh rỗi hoặc đến lượt kiểm tra GRQ, nó không chỉ lấy duy nhất 1 Goroutine. Để tối ưu hóa và giảm số lần phải tranh chấp khóa (lock contention) trên GRQ, P sẽ lấy một "mẻ" (batch) Goroutine.
    *   **Công thức:** `n = min(len(GRQ)/Gomaxprocs + 1, 128)`.
    *   Các Goroutine này sẽ được nạp đầy vào 1/2 Local Queue của P đó để xử lý dần.
3.  **Thứ tự ưu tiên:** Khi P đi tìm việc (`findrunnable`), thứ tự thường là: Local Queue -> **Global Queue** -> Stealing (ăn cắp từ P khác) -> Network Poller.

#### 3.3.5. Network Poller (Non-blocking I/O)

Go xử lý hàng triệu kết nối mạng mà không cần hàng triệu OS Thread nhờ **Network Poller**.

- **Cơ chế:** Khi một Goroutine yêu cầu I/O mạng (read/write socket), nó sẽ được đưa vào Network Poller (sử dụng các cơ chế OS như `epoll`, `kqueue`, hoặc `IOCP`).
- **Lợi ích:** OS Thread (M) không bị block. M có thể rảnh tay để chạy Goroutine khác. Khi I/O sẵn sàng, Network Poller sẽ thông báo cho scheduler để đưa Goroutine đó quay lại Run Queue.

#### 3.3.6. Scheduler Preemption (Cơ chế chiếm quyền)

Go scheduler là một **Cooperative Scheduler** (hợp tác), nghĩa là Goroutine phải tự nhường (yield) tại các điểm kiểm tra (thường là lời gọi hàm).

- **Từ Go 1.14 trở đi:** Go giới thiệu **Asynchronous Preemption**. Nếu một Goroutine chạy quá lâu (ví dụ vòng lặp vô tận không có lời gọi hàm), runtime sẽ gửi một tín hiệu (Signal) để ép Goroutine đó dừng lại và nhường chỗ cho người khác. Điều này giúp hệ thống ổn định hơn, tránh việc một Goroutine "tham lam" chiếm dụng toàn bộ CPU.

## 4. Quản trị vòng đời & An toàn

### 4.1. Concurrency Leaks: Phân loại & Kịch bản

**Concurrency Leak** xảy ra khi các tài nguyên (Goroutine, Context, Timer, Connection) bị treo hoặc không được giải phóng, dẫn đến lãng phí tài nguyên và làm hệ thống cạn kiệt theo thời gian.

#### 4.1.1. Hệ sinh thái 5 loại Leak thường gặp

Trong Go, tài nguyên không chỉ bị rò rỉ qua Goroutine mà còn qua các thực thể runtime và bộ nhớ. Một lập trình viên cần phân biệt rõ 5 nhóm chính:

| Loại Leak | Nguyên nhân chính (Thủ phạm) | Hậu quả (Triệu chứng) |
| :--- | :--- | :--- |
| **Goroutine Leak** | G bị block vĩnh viễn (do Channel, Mutex, WaitGroup). | Tăng RAM (Stack), tăng CPU overhead cho Scheduler. |
| **Context Leak** | Quên gọi hàm `cancel()` từ `WithCancel` hoặc `WithTimeout`. | Giữ lại các timers, references trong Context tree. |
| **Timer Leak** | Sử dụng `time.After` sai cách bên trong vòng lặp. | RAM Heap tăng dần do các Timer struct rác tích tụ. |
| **Resource Leak** | Không `close()` HTTP Body, File, hoặc DB Connection. | Gây Goroutine Leak ngầm (ngốn worker/connection). |
| **Memory Leak** | Giữ tham chiếu mảng lớn qua slice nhỏ truyền giữa các G. | RAM tăng cao, GC không thu hồi được mảng gốc (Pinning). |

> Các loại leak này thường tạo thành một chuỗi. Ví dụ: **Resource Leak** (quên đóng Body) -> trực tiếp giữ một **Goroutine ngầm** (G leak) để quản lý connection -> G leak này lại giữ tham chiếu tới **Context** (Context leak). Vì vậy, hãy tìm "nguồn phát" tài nguyên thay vì chỉ đi tìm "số lượng Goroutine".

#### 4.1.2. Các kịch bản rò rỉ thực tế (Detailed Case Studies)

Dưới đây là chi tiết cơ chế và lý do gây rò rỉ cho từng kịch bản cụ thể:

**A. Goroutine Leak (Phổ biến nhất)**
Hiện tượng Goroutine bị treo vô hạn tại các điểm đồng bộ hóa hoặc I/O:

1.  **Gửi vào Channel mà không có người nhận**: 
    *   **Cơ chế**: Gửi dữ liệu (`ch <- data`) vào unbuffered channel nhưng không có Goroutine nào sẵn sàng nhận (`<-ch`).
    *   **Bị Block như nào**: Goroutine gửi sẽ bị "đứng" vĩnh viễn tại chính dòng lệnh đó.
    *   **Lý do Leak**: Nếu Goroutine nhận bị thoát sớm hoặc không bao giờ được tạo, tài nguyên Stack của G gửi không bao giờ được giải phóng.

2.  **Nhận từ Channel mà không có người gửi**: 
    *   **Cơ chế**: Cố nhận dữ liệu (`<-ch`) từ một channel rỗng (hoặc buffered channel đã hết dữ liệu) và không còn G nào gửi vào nữa.
    *   **Bị Block như nào**: Goroutine nhận sẽ rơi vào trạng thái chờ vô thời hạn.
    *   **Lý do Leak**: Nếu Goroutine gửi bị crash hoặc thoát mà không `close(ch)`, G nhận sẽ kẹt lại mãi mãi.

3.  **Deadlock do Mutex**: 
    *   **Cơ chế**: Goroutine cố lấy một Lock (`mutex.Lock()`) nhưng Lock đó đang bị giữ bởi chính nó hoặc tạo vòng lặp chờ với G khác.
    *   **Bị Block như nào**: Treo vĩnh viễn ở trạng thái "Waiting for Lock".
    *   **Lý do Leak**: Go không hỗ trợ Reentrant Lock, dẫn đến việc G tự block chính mình.

4.  **Chờ I/O không có Timeout**: 
    *   **Cơ chế**: Gọi API mạng, đọc file, hoặc kết nối DB mà không thiết lập thời gian chờ (timeout/deadline).
    *   **Bị Block như nào**: Khi server đích sập hoặc mất mạng, Goroutine và OS Thread (M) sẽ bị treo cứng.
    *   **Lý do Leak**: Không có cơ chế tự thoát khi gặp sự cố ngoại cảnh.

**B. Context Leak**
- **Ví dụ**: Gọi `ctx, _ := context.WithTimeout(...)` nhưng không gọi `defer cancel()`.
- **Cơ chế**: Go runtime duy trì một timer nội bộ và các tham chiếu trong cây context cho đến khi context cha kết thúc.
- **Hệ quả**: Nếu hàm này được gọi liên tục, các timer "rác" sẽ lấp đầy bộ nhớ trước khi kịp hết hạn tự nhiên.

**C. Timer Leak**
- **Ví dụ**: Sử dụng `time.After(time.Hour)` bên trong một vòng lặp `for-select`.
- **Cơ chế**: Mỗi lần gọi `time.After` sẽ tạo một Timer mới. Nếu case `Default` được chọn, Timer 1 tiếng này vẫn "sống" trong runtime heap.
- **Hệ quả**: RAM Heap tăng tỉ lệ thuận với số lần lặp, dù các tác vụ logic đã hoàn thành.

**D. Resource Leak (Ẩn sau Goroutine Leak)**
- **Ví dụ**: Quên `resp.Body.Close()` sau khi gọi HTTP request.
- **Cơ chế**: Thư viện `net/http` duy trì một Goroutine đọc ngầm để tái sử dụng connection (keep-alive).
- **Hệ quả**: Cạn kiệt connection pool và làm tăng số lượng Goroutine mồ côi mà bạn không hề code trực tiếp.

**E. Memory Leak (Pinning Memory)**
- **Ví dụ**: Cắt một slice nhỏ từ một mảng khổng lồ (`huge[:10]`) và giữ/gửi slice này đi.
- **Cơ chế**: Slice nhỏ vẫn giữ tham chiếu đến toàn bộ mảng gốc (Backing Array).
- **Hệ quả**: Garbage Collector (GC) không thể thu hồi mảng khổng lồ đó, gây lãng phí RAM nghiêm trọng.

> **Ghi nhớ:** Goroutine Leak là "bề nổi của tảng băng", còn Context/Resource Leak thường là phần chìm gây ra nó.

#### 4.1.3. Chiến lược tiếp cận An toàn (Performance & Reliability)

Để xây dựng hệ thống bền bỉ (Reliability) và tối ưu (Performance), hãy áp dụng các kỹ thuật sau:

1.  **Quản lý Quyền sở hữu (Ownership):** Mọi Goroutine khi sinh ra phải có một "Chủ sở hữu" chịu trách nhiệm về vòng đời của nó. Sử dụng `context.Context` để truyền tín hiệu hủy bỏ xuyên suốt.
2.  **Nguyên tắc "Lối thoát cưỡng bức":** 
    *   **Channel**: Luôn kết hợp `select` với `ctx.Done()` để đảm bảo Goroutine luôn có đường thoát.
    *   **I/O**: Luôn thiết lập `Timeout/Deadline` cho mọi kết nối ngoại vi.
3.  **Dọn dẹp tài nguyên (Cleanup):** Luôn sử dụng lệnh `defer` ngay sau khi khởi tạo: `defer cancel()`, `defer resp.Body.Close()`, `defer rows.Close()`.
4.  **Quan sát & Kiểm thử (Observability & Testing):**
    *   **Profiling**: Dùng `pprof` để phân tích đồ thị Goroutine (`/debug/pprof/goroutine?debug=2`).
    *   **Metric**: Theo dõi `runtime.NumGoroutine()` để phát hiện sớm các dấu hiệu tăng bất thường.
    *   **Unit Test**: Tích hợp `go.uber.org/goleak` để chặn đứng code có leak ngay từ khâu CI/CD (ví dụ: `defer goleak.VerifyNone(t)`).

### 4.2. Panic và Recover trong Goroutine (Quy tắc an toàn)

Một sai lầm nguy hiểm của lập trình viên Go mới là quên rằng **Panic trong một Goroutine sẽ làm sập toàn bộ chương trình**, ngay cả khi `main goroutine` có lệnh `recover()`.

- **Nguyên tắc:** Mỗi Goroutine phải tự quản lý `recover()` của chính nó.
- **Cách xử lý chuẩn:**
```go
go func() {
    defer func() {
        if r := recover(); r != nil {
            log.Printf("Recovered from panic in goroutine: %v", r)
        }
    }()
    // Code thực thi chính của Goroutine
    doWork()
}()
```

## 5. Công cụ giám sát và quan sát (Observability)

### 5.1. Theo dõi Scheduler với GODEBUG

Bạn có thể xem trực quan cách các G-M-P đang làm việc bằng cách chạy chương trình với biến môi trường:
`GODEBUG=schedtrace=1000 ./myprog`
- `schedtrace=1000`: In trạng thái scheduler mỗi 1000ms.
- Giúp bạn phát hiện các hiện tượng như "P bị đói" hoặc "quá nhiều OS Threads bị tạo ra".

### 5.2. Các hàm Runtime hữu ích

- `runtime.NumGoroutine()`: Trả về số lượng Goroutine hiện có. Cực kỳ quan trọng để debug Goroutine leak.
- `runtime.Gosched()`: Chủ động nhường CPU cho Goroutine khác.
- `runtime.GOMAXPROCS(n)`: Giới hạn số nhân CPU mà Go runtime được sử dụng.

---

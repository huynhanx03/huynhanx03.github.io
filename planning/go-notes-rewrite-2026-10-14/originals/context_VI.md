---
title: "Context"
category: "Go"
tags: ["golang", "context", "advanced", "fundamentals"]
---

# Context: Quản lý vòng đời và Ngữ cảnh thực thi

**context.Context** là cơ chế tiêu chuẩn của ngôn ngữ Go nhằm kiểm soát vòng đời của một yêu cầu (request) hoặc một chuỗi các hoạt động phụ thuộc trong môi trường xử lý đồng thời và hệ thống phân tán. Đây là giải pháp quản trị giúp điều phối các tín hiệu hủy bỏ, thời hạn thực thi và truyền dẫn dữ liệu đặc tả xuyên suốt các lớp ứng dụng.

---

## 1. Cơ sở ra đời và Tầm quan trọng

Trước khi có sự xuất hiện của gói `context`, việc quản lý các chuỗi thực thi không đồng bộ trong Go đối mặt với nhiều rủi ro về mặt vận hành:
-   **Tình trạng Goroutine Leak**: Các tiến trình con tiếp tục vận hành vô thời hạn ngay cả khi tiến trình cha đã kết thúc.
-   **Lãng phí tài nguyên hệ thống**: Máy chủ tiêu tốn năng lực xử lý cho các tác vụ mà kết quả không còn giá trị sử dụng (ví dụ: người dùng đã hủy yêu cầu sớm).
-   **Sự phức tạp trong mã nguồn**: Việc truyền thủ công các tham số timeout và tín hiệu hủy qua từng cấp độ hàm gây ra sự thiếu tường minh và khó khăn trong bảo trì (callback hell hoặc tham số dư thừa).

**Context được thiết kế để giải quyết 3 bài toán lõi:**
1.  **Thiết lập Thời hạn (Timeout / Deadline)**: Áp đặt giới hạn thời gian tồn tại cho một tác vụ để bảo vệ tài nguyên hệ thống.
2.  **Cơ chế Hủy bỏ (Cancellation)**: Chủ động chấm dứt một chuỗi tác vụ khi kết quả của chúng không còn cần thiết.
3.  **Truyền dẫn Metadata**: Vận chuyển các thông tin định danh (TraceID, UserID) giữa các ranh giới chức năng mà không làm ô nhiễm chữ ký hàm nghiệp vụ.

---

## 2. Giải phẫu Giao diện Context

Gói `context` định nghĩa một Interface duy nhất, cho phép tính linh hoạt cao trong việc triển khai và đảm bảo tính an toàn đồng thời (**Thread-safety**):

```go
type Context interface {
    Deadline() (time.Time, bool) // Trả về thời điểm kết thúc tác vụ (nếu có).
    Done() <-chan struct{}       // Channel phát tín hiệu khi Context bị đóng. Đây là thành phần then chốt để các tiến trình hạ nguồn lắng nghe tín hiệu dừng.
    Err() error                  // Trả về lý do Context bị vô hiệu hóa (context.Canceled hoặc context.DeadlineExceeded).
    Value(key any) any           // Truy xuất dữ liệu đặc tả gắn liền với ngữ cảnh.
}
```

---

## 3. Các loại Context cơ bản

Hệ thống Context vận hành theo cấu trúc cây (Tree-based hierarchy). Khi một Context cha bị hủy, toàn bộ các Context dẫn xuất (con) sẽ nhận được tín hiệu hủy một cách đệ quy thông qua cơ chế lan tỏa.

### 3.1. context.Background() 
-   **Bản chất**: Ngữ cảnh gốc (Root Context).
-   **Đặc tính**: Bất biến, không thể bị hủy bỏ, không có thời hạn và không chứa dữ liệu.
-   **Phạm vi**: Sử dụng tại các điểm khởi nguồn nơi vòng đời yêu cầu bắt đầu (hàm `main`, `init`, cấp độ Request handler hoặc trong Testing).

### 3.2. context.TODO()
-   **Bản chất**: Tương tự như `Background()`.
-   **Ý nghĩa**: Điểm đánh dấu (placeholder). Sử dụng khi thiết kế hệ thống chưa xác định rõ ranh giới ngữ cảnh, hoặc khi cần bổ sung tham số Context vào mã nguồn hiện có.

### 3.3. context.WithCancel(parent)
-   **Mục đích**: Thiết lập cơ chế hủy bỏ chủ động theo logic nghiệp vụ.
-   **Hành vi**: Trả về Context con và một hàm `cancel()`. Khi gọi `cancel()`, channel `Done()` sẽ đóng và lan tỏa tín hiệu xuống toàn bộ cây con hạ nguồn.
-   **Ứng dụng**: Sử dụng khi xuất hiện lỗi hệ thống hoặc hành động hủy từ người dùng.

### 3.4. context.WithTimeout(parent, duration)
-   **Mục đích**: Tự động phát tín hiệu hủy sau một khoảng thời gian xác định (`duration`).
-   **Cơ chế**: Context con sẽ tự động vô hiệu hóa nếu tác vụ kéo dài quá thời gian định trước.
-   **Ứng dụng**: Phù hợp cho các truy vấn DB hoặc gọi API bên thứ ba để đảm bảo cam kết SLA.

### 3.5. context.WithDeadline(parent, absoluteTime)
-   **Mục đích**: Tự động hủy tác vụ tại một mốc thời gian tuyệt đối.
-   **Bản chất**: `WithTimeout` thực chất là một cách viết tắt của `WithDeadline` với mốc thời gian là `time.Now().Add(duration)`.

### 3.6. context.WithValue(parent, key, value)
-   **Mục đích**: Vận chuyển Metadata xuyên suốt luồng thực thi.
-   **Phạm vi**: Chỉ sử dụng cho mục đích quan sát (Tracing, Logging, Auth tokens).
-   **Khuyến cáo**: Tuyệt đối không sử dụng để truyền tải dữ liệu nghiệp vụ (Business Data) vì Context được thiết kế để thẩm thấu qua nhiều lớp mà không tạo ra sự phụ thuộc chặt chẽ.
-   **Lưu ý quan trọng (Key Safety)**: Để tránh xung đột khóa (Value Collision) giữa các package, luôn định nghĩa key dưới dạng một kiểu dữ liệu nội bộ (**unexported struct**).
```go
type contextKey struct{}
var sessionKey = contextKey{} // Duy nhất, không thể bị ghi đè từ bên ngoài
```

### 3.7. WithCancelCause (Go 1.20+)
-   **Cải tiến**: Cho phép đính kèm nguyên nhân lỗi cụ thể khi thực hiện hủy bỏ, giúp việc xử lý lỗi ở phía hạ nguồn (Observability) trở nên minh bạch hơn.
```go
ctx, cancel := context.WithCancelCause(parent)
cancel(errors.New("connection_lost"))
// Truy xuất qua: context.Cause(ctx)
```

---

## 4. Cấu trúc Nội bộ

### 4.1. Các thực thể hiện thực hóa (Internal Structures)
Go hiện thực hóa Interface Context thông qua các cấu trúc dữ liệu chuyên biệt để tối ưu hóa hiệu năng:
-   **emptyCtx**: Dùng cho `Background()` và `TODO()`. Là một kiểu số nguyên đơn giản, không thể bị hủy và không chứa dữ liệu.
-   **cancelCtx**: Cấu trúc lõi cho cơ chế hủy bỏ. Nó quản lý một channel `done` và một danh sách các con (`children`) để truyền tín hiệu hủy bỏ lũy kế.
-   **timerCtx**: Mở rộng từ `cancelCtx`, bổ sung thêm bộ định thời (`time.Timer`) và mốc thời gian (`deadline`) để tự động kích hoạt hàm `cancel`.
-   **valueCtx**: Cấu trúc chuyên dụng để lưu trữ dữ liệu đặc tả. Nó hoạt động như một nút trong danh sách liên kết ngược trỏ về cha.

---

### 4.2. Tại sao là sự kết hợp giữa Cây và Danh sách liên kết?

Kiến trúc bên trong của Context là một ví dụ điển hình về việc lựa chọn cấu trúc dữ liệu dựa trên mục đích thực thi:

#### Cơ chế Hủy bỏ: Cấu trúc Cây (Directed Tree)
`cancelCtx` và `timerCtx` tổ chức theo dạng Cây. Một nút cha quản lý danh sách các con thông qua một `map` (`children map[canceler]struct{}`).
-   **Lý do**: Vì hành động hủy mang tính chất **Lan tỏa (Broadcast)**. Khi một Context cha bị đóng, nó phải nhanh chóng "duyệt" (traverse) qua toàn bộ danh sách con để đóng channel của chúng. Cấu trúc cây giúp lan truyền tín hiệu hủy bỏ đệ quy một cách hiệu quả và triệt để theo chiều dọc của hệ thống.

#### Cơ chế Metadata: Danh sách liên kết ngược (Backward Linked List)
`valueCtx` không lưu trữ dữ liệu tập trung (bên trong một map của cha). Thay vào đó, mỗi lần gọi `WithValue`, một nút mới được tạo ra bao bọc lấy khóa-giá trị và trỏ ngược về Context cha.
-   **Lý do**: 
    1.  **Tính Bất biến (Immutability)**: Việc thêm dữ liệu không bao giờ làm thay đổi logic hay dữ liệu ở nút cha, giữ cho Context an toàn tuyệt đối khi được chia sẻ giữa hàng nghìn Goroutine đồng thời. 
    2.  **Tra cứu tuần tự (Upward Search)**: Hàm `Value(key)` thực hiện tìm kiếm đệ quy từ nút hiện tại ngược lên phía gốc. Điều này đảm bảo dữ liệu ở nút con (gần nhất với điểm gọi) luôn có độ ưu tiên cao nhất, cho phép cơ chế ghi đè (override) dữ liệu một cách tự nhiên.

---

## 5. Các nguyên tắc vận hành tiêu chuẩn

Để đảm bảo mã nguồn chuyên nghiệp và ổn định, hãy tuân thủ các nguyên tắc sau:
1.  **Tính nhất quán**: `context.Context` luôn là tham số đầu tiên của hàm (`func Do(ctx Context, ...)`).
2.  **Tính bất biến**: Context mang tính chất "dòng chảy" thực thi. Tuyệt đối không lưu trữ Context trong Struct để tránh sai lệch về vòng đời và gây khó khăn trong việc kiểm soát tài nguyên.
3.  **Trách nhiệm giải phóng**: Hàm `cancel()` phải luôn được thực thi (thông qua `defer`) để thu hồi bộ định thời (Timer) và tài nguyên liên quan ngay lập tức khi tác vụ kết thúc.
4.  **Tính Thread-safety**: Context an toàn cho việc truy cập đồng thời từ nhiều Goroutine.

---

> Việc sử dụng Context đúng cách không chỉ là vấn đề kỹ thuật, mà còn là tư duy chịu trách nhiệm về tài nguyên trong các hệ thống quy mô lớn.

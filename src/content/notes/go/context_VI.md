---
title: "Context: tín hiệu hủy, deadline và dữ liệu theo request"
category: "Go"
tags: ["golang", "context", "advanced", "fundamentals"]
description: "Context truyền tín hiệu “không cần làm nữa”, deadline và dữ liệu đi cùng request qua các hàm. Nó không tự giết goroutine, không chờ worker dừng và không thay mọi tham số nghiệp vụ."
updated: 2026-10-15
translationKey: "go/context"
---

Một HTTP handler khởi chạy truy vấn database rồi gọi service khác. Giữa chừng, client ngắt kết nối. Những thao tác phía sau cần biết request không còn cần kết quả, dù chúng nằm cách handler vài tầng lời gọi hàm.

`context.Context` truyền thông tin vòng đời ấy qua chuỗi lời gọi: tín hiệu hủy, deadline và dữ liệu theo request. Mỗi operation vẫn phải hợp tác. Context không tự giết goroutine và không chờ nó dừng.

Bài này giả định bạn biết hàm, [Goroutines](/vi/notes/go/goroutines/) và receive từ channel. Các đoạn trích độc lập; thêm import cần thiết và đặt khai báo ngoài `main`. Kết quả dự kiến được suy từ hợp đồng API, không phải số đo thời gian.

## Truyền vòng đời của caller xuống công việc phía sau

Giả sử handler gọi `lookup(ctx, id)`, rồi lookup gọi database. Truyền `r.Context()` của handler qua cả hai tầng cho phép việc client ngắt hoặc deadline sớm hơn tới được database operation. Tạo `context.Background()` giữa đường sẽ cắt nhánh truyền cancellation ấy.

Background là root context rỗng, không value, không cancellation và không deadline. Nó phù hợp lúc khởi động hoặc khi chủ ý tạo vòng đời cấp cao mới. TODO có hành vi tương tự nhưng ghi nhận rằng chưa chọn được context đúng. Không nên dùng chúng để âm thầm thay request context. Không truyền nil thay context; chọn root phù hợp khi thật sự không có context từ caller.

Interface chung cung cấp bốn câu hỏi mà operation có thể đặt ra:

```go
type Context interface {
    Deadline() (time.Time, bool)
    Done() <-chan struct{}
    Err() error
    Value(key any) any
}
```

Deadline trả thời điểm và cờ có giới hạn hay không. Done trả channel đóng khi hủy hoặc hết hạn; channel có thể nil nếu context không thể hủy. Err là nil trước cancellation, rồi báo `context.Canceled` hoặc `context.DeadlineExceeded`. Value tra dữ liệu theo key, không có thì trả nil.

Nhiều goroutine dùng cùng context đồng thời được. Điều đó bảo vệ method của context, không bảo vệ object mutable bất kỳ đặt trong nó. Pointer lấy qua Value vẫn cần quy tắc ownership hoặc khóa thông thường.

## Tạo vòng đời ngắn hơn mà vẫn giữ giới hạn của caller

Giả sử request có ngân sách mười giây, nhưng lookup database chỉ nên được tối đa hai giây:

```go
func query(ctx context.Context, db *sql.DB) (string, error) {
    ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
    defer cancel()
    var name string
    err := db.QueryRowContext(ctx,
        "SELECT name FROM users WHERE id = ?", 1).Scan(&name)
    return name, err
}
```

Import `context`, `database/sql` và `time`. Caller cung cấp database handle; đổi placeholder `?` theo driver. WithTimeout trả child context cùng hàm hủy child đó. Query dùng child nên timeout riêng hoặc cancellation sớm hơn từ parent đều có thể kết thúc ngân sách.

Child không kéo dài deadline sớm hơn của parent. Nếu upstream chỉ còn nửa giây, hàm này không được thêm hai giây mới. Cancel child để nguyên parent và các sibling; cancel parent lan xuống mọi descendant.

WithDeadline nhận thời điểm tuyệt đối thay vì duration. WithCancel thêm quyền hủy thủ công mà không thêm deadline. Các hàm cancel trả về có thể gọi nhiều lần an toàn. Defer ngay sau khi tạo thành công để các nhánh trả về sớm giải phóng timer và liên kết parent-child phù hợp, thay vì giữ tới deadline hoặc parent cancellation.

Deadline là tín hiệu, không bảo đảm hàm trả đúng tại mốc ấy. Driver và operation nền phải hỗ trợ hủy. WithTimeout không tạo một goroutine bọc query, không cưỡng bức driver bị chặn phải thoát và không rollback side effect bất kỳ.

## Công việc tự viết cần điểm quan sát cancellation

Một hàm chờ có thể cùng lắng nghe thời gian và cancellation:

```go
func wait(ctx context.Context, delay time.Duration) error {
    timer := time.NewTimer(delay)
    defer timer.Stop()
    select {
    case <-timer.C:
        return nil
    case <-ctx.Done():
        return ctx.Err()
    }
}
```

Hàm cần context và time. Nếu bị hủy khi timer còn chờ, case thứ hai cho phép kết thúc chờ. Nếu cả hai sẵn sàng thì case nào cũng có thể thắng. Thứ tự case không ưu tiên cancellation; context đã hủy cũng không tự cấm mọi side effect phía sau.

CPU loop phải kiểm tra hủy tại khoảng phù hợp; chọn khoảng là đánh đổi overhead với độ trễ phản ứng. I/O chặn cần API hỗ trợ context hoặc deadline. Kiểm tra `ctx.Err()` ngay trước lời gọi không thể hủy không làm lời gọi đó trở nên interruptible sau khi bắt đầu. Context cũng không phải transaction rollback: khi cần, hãy dùng bảo đảm transaction của chính operation.

## Yêu cầu dừng và xác nhận đã dừng là hai bước riêng

Giả sử owner chỉ được giải phóng tài nguyên sau cleanup của worker. Nó cần tín hiệu completion bên cạnh cancellation:

```go
ctx, cancel := context.WithCancel(context.Background())
done := make(chan struct{})

go func() {
    defer close(done)
    <-ctx.Done()
    // Hoàn tất phần cleanup mà goroutine này phụ trách trước khi return.
}()

cancel()
<-done
fmt.Println(ctx.Err()) // context canceled
```

Worker sở hữu done và đóng sau cleanup, ở đường kết thúc của nó. `cancel()` yêu cầu dừng; `<-done` join worker. Cancellation có thể xảy ra trước khi goroutine bắt đầu chờ mà vẫn đúng: receive từ Done đã đóng sẽ đi tiếp khi worker được chạy. Không cần sleep để đoán worker sẵn sàng chưa.

Worker thật phải bố trí sự hợp tác ấy quanh tất cả việc nó làm. Ví dụ không có nghĩa mọi hàm chặn đều ngắt được. Bước chờ hoàn tất vẫn có thể lâu nếu cleanup chậm hoặc dependency bỏ qua cancellation.

## Thêm metadata theo request mà vẫn giữ tham số bắt buộc rõ ràng

Request ID hữu ích xuyên qua logging và các tầng service, dù không phải đầu vào nghiệp vụ chính của từng hàm. Kiểu key riêng giữ metadata ấy tách khỏi key của package khác:

```go
type requestIDKey struct{}

func withRequestID(ctx context.Context, id string) context.Context {
    return context.WithValue(ctx, requestIDKey{}, id)
}
func requestID(ctx context.Context) (string, bool) {
    id, ok := ctx.Value(requestIDKey{}).(string)
    return id, ok
}
```

WithValue tạo child wrapper, không sửa parent. Tra cùng key từ child sẽ thấy value gần nhất, che value cùng key ở parent. Hàm accessor gom assertion tại một nơi và cho caller xử lý trường hợp vắng mặt rõ ràng.

Key phải comparable. Hai giá trị `requestIDKey{}` trong package này cố ý bằng nhau, nhờ đó ghi bằng một instance và đọc bằng instance khác vẫn đúng. Struct không export không khiến từng instance thành key độc nhất. Với metadata khác, dùng kiểu private khác hoặc phân biệt giá trị có chủ ý; tránh key string mà package không liên quan cũng có thể chọn trùng.

Request ID, tracing metadata và principal theo request là những trường hợp hợp lý. Input nghiệp vụ bắt buộc và dependency như database client nên nằm ở tham số có kiểu hoặc field service rõ ràng. Giấu chúng sau Value biến việc thiếu tham số thành bất ngờ lúc chạy. Context truy cập đồng thời được cũng không làm object bên trong bất biến. Đừng log secret chỉ vì context đang mang nó.

## Giữ nguyên nhân hủy khi caller cần biết thêm

Có lúc caller cần cả phân loại cancellation chuẩn lẫn nguyên nhân cụ thể khiến công việc dừng:

```go
ctx, cancel := context.WithCancelCause(parent)
cancel(errors.New("upstream unavailable"))
fmt.Println(ctx.Err())          // context canceled
fmt.Println(context.Cause(ctx)) // upstream unavailable
```

Đoạn trích giả định có parent context và import context, errors, fmt. WithCancelCause và Cause có từ Go 1.20. Err giữ phân loại chuẩn cho xử lý cancellation thông thường, còn Cause mang thêm thông tin lỗi. Ví dụ hủy trực tiếp child này; trong cây lớn hơn, lần cancellation xác lập cause có ý nghĩa, nên không xem các lần gọi sau là cách viết lại nguyên nhân đã có.

Go 1.21 thêm WithTimeoutCause và WithDeadlineCause để đặt cause khi hết giới hạn thời gian. CancelFunc trả về không nhận tham số error. WithoutCancel, cũng từ 1.21, giữ values nhưng bỏ deadline/cancellation của parent. Chỉ dùng khi công việc được chủ ý cho sống lâu hơn parent và đã có owner cùng giới hạn mới. Tách mọi operation gây bất tiện khỏi cancellation có thể biến request bị bỏ thành background work vô hạn.

## Implementation giải thích vì sao cần cleanup và chuỗi value vừa phải

```text
backgroundCtx / todoCtx → emptyCtx
cancelCtx: parent | done | children | error/cause
  └─ timerCtx: deadline | timer
valueCtx: parent | key | value

cancel(parent) → children → descendants
Value(key) → this wrapper → parent → root
```

Đây là mô hình đọc source, không phải struct layout công khai. Source đối chiếu ngày 2026-10-15 dùng emptyCtx dựa trên `struct{}`; mô tả integer lịch sử không còn đúng với source ấy.

Context có thể hủy theo dõi quan hệ children để truyền cancellation xuống dưới. Cancel giải phóng liên kết phù hợp và dừng timer; đó là lý do bỏ qua cancel có thể giữ tài nguyên sau khi operation đã trả về. Wrapper value được tìm ngược về root thay vì nằm trong một map trung tâm. Chuỗi sâu có thể tăng chi phí lookup, thêm một lý do để mỗi value có mục đích rõ.

## Để vòng đời hiện rõ trong thiết kế API

Đặt `ctx context.Context` đầu danh sách tham số và truyền tiếp cho operation thuộc cùng request. Nhận context cho mỗi operation thay vì dùng lại context đã canceled. Struct service sống lâu thường giữ dependency, còn mỗi method nhận context từ caller của lần gọi ấy.

Tránh context trong struct là hướng dẫn thiết kế để tránh nhập nhằng lifetime, không phải compiler cấm. API lịch sử như http.Request có lý do cụ thể để mang context. Khi cân nhắc ngoại lệ, câu hỏi hữu ích là caller có biết context lưu trong đó thuộc operation và vòng đời nào hay không.

## Thử dự đoán trước khi xem đáp án

1. Parent còn 300 ms; child đặt timeout hai giây. Ngân sách nào giới hạn operation? Cancel child có dừng sibling không?
2. Vì sao query bỏ qua context vẫn có thể chạy quá deadline? `cancel()` có chứng minh worker xong chưa?
3. Hai `requestIDKey{}` trong ví dụ có là hai key khác nhau không? Nếu package khác tự định nghĩa kiểu cùng tên thì sao?

**Giải thích:**

1. Deadline sớm hơn của parent giới hạn operation. Cancel child tác động child và descendants, không tác động parent/sibling.
2. Operation phải quan sát hủy; context không cưỡng bức code bất kỳ thoát. Cần completion signal hoặc WaitGroup riêng để xác nhận đã thoát và cleanup xong.
3. Chúng bằng nhau trong cùng kiểu do package định nghĩa. Kiểu do package khác định nghĩa là kiểu riêng, giúp tránh va chạm vô tình.

## Tài liệu đối chiếu

- [context package](https://pkg.go.dev/context) — method, dẫn xuất context, cause và hợp đồng dùng đồng thời.
- [Context and structs](https://go.dev/blog/context-and-structs) — thiết kế vòng đời API và ngoại lệ lịch sử.
- [Context implementation](https://go.dev/src/context/context.go) — mô hình triển khai, đối chiếu ngày 2026-10-15.

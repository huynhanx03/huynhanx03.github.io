---
title: "Context: tín hiệu hủy, deadline và dữ liệu theo request"
category: "Go"
tags: ["golang", "context", "advanced", "fundamentals"]
description: "Context truyền tín hiệu “không cần làm nữa”, deadline và dữ liệu đi cùng request qua các hàm. Nó không tự giết goroutine, không chờ worker dừng và không thay mọi tham số nghiệp vụ."
updated: 2026-10-14
translationKey: "go/context"
---

Context truyền tín hiệu “không cần làm nữa”, deadline và dữ liệu đi cùng request qua các hàm. Nó không tự giết goroutine, không chờ worker dừng và không thay mọi tham số nghiệp vụ.

## 1. Vì sao cần truyền cùng vòng đời?

Một HTTP request có thể gọi service, database và API ngoài. Nếu client bỏ cuộc, các tầng còn lại nên có cơ hội dừng để không làm việc vô ích. Tự tạo Background ở giữa chuỗi sẽ mất cancellation/deadline của caller. Context là cách truyền hợp đồng vòng đời nhất quán; các operation vẫn phải hỗ trợ và quan sát tín hiệu đó.

## 2. Bốn method của Context

```go
type Context interface {
    Deadline() (time.Time, bool)
    Done() <-chan struct{}
    Err() error
    Value(key any) any
}
```

Deadline trả mốc thời gian và cờ có deadline. Done đóng khi canceled hoặc hết hạn; nó có thể nil với context không thể hủy. Err là nil trước cancellation, sau đó thường là Canceled hoặc DeadlineExceeded. Value tìm dữ liệu theo key; không tìm thấy trả nil. Nhiều goroutine có thể dùng cùng context an toàn, nhưng mutable object đặt trong Value vẫn cần synchronization riêng.

## 3. Background, TODO và context từ request

Background là root không deadline, không values và không cancellation, phù hợp main/khởi tạo. TODO có hành vi tương tự nhưng nói rằng caller chưa xác định context đúng. Trong HTTP handler, dùng r.Context() làm parent cho work của request thay vì Background để giữ cancellation upstream. Không truyền nil context.

## 4. WithCancel, WithTimeout và WithDeadline

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

Đây là đoạn trích cần context, database/sql và time; placeholder ? phải đổi theo DB driver. WithTimeout tạo giới hạn tương đối; WithDeadline dùng mốc tuyệt đối; WithCancel không thêm mốc mà cho caller quyền yêu cầu dừng. Child không kéo dài deadline sớm hơn của parent. Cancel child không cancel parent hay sibling; cancel parent lan xuống children. Gọi cancel nhiều lần được, và nên defer ngay sau khi tạo để giải phóng liên kết/timer sớm.

Một deadline không bảo đảm toàn hàm kết thúc đúng mốc nếu driver hoặc code không cooperate. WithTimeout không tự tạo goroutine bao quanh truy vấn. Cancel cũng không đợi work thật sự dừng: nếu cần join, dùng cơ chế completion riêng.

## 5. Quan sát cancellation trong công việc riêng

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

CPU loop cần check ctx ở các điểm phù hợp; I/O nên dùng API nhận context hoặc deadline hỗ trợ. Context đã hủy không tự ngăn tất cả side effect; nếu cả hai select case sẵn sàng, bất kỳ case nào cũng có thể được chọn. Context không phải cơ chế transaction rollback.

## 6. WithValue và key có kiểu riêng

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

Dữ liệu phù hợp là request ID, trace hoặc principal theo request. Không dùng Value để giấu dependency như DB client hoặc thay các input bắt buộc của hàm bằng lookup any. Key phải comparable; dùng kiểu không export tránh va chạm với package khác. Hai requestIDKey{} trong cùng package cố ý bằng nhau; muốn hai key riêng thì dùng hai kiểu riêng hoặc phân biệt giá trị. Unexported struct không có nghĩa mỗi instance tạo một key độc nhất.

WithValue tạo context mới, không sửa parent; cùng key ở child che value của parent khi lookup. Context an toàn không làm object mutable trong Value tự bất biến. Không đặt secrets vào log chỉ vì chúng có trong context.

## 7. Nguyên nhân hủy và các API theo phiên bản

```go
ctx, cancel := context.WithCancelCause(parent)
cancel(errors.New("upstream unavailable"))
fmt.Println(ctx.Err())          // context canceled
fmt.Println(context.Cause(ctx)) // upstream unavailable
```

WithCancelCause/Cause có từ Go 1.20: Err giữ phân loại chuẩn, Cause có thêm nguyên nhân. Go 1.21 có WithTimeoutCause/WithDeadlineCause; CancelFunc của chúng không nhận error mới. WithoutCancel (Go 1.21) giữ values nhưng bỏ deadline/cancellation; chỉ dùng khi chủ ý thiết kế work vượt vòng đời parent và đã có giới hạn/owner mới, không như cách né cancellation mặc định.

## 8. Runtime: cây cancellation và chuỗi values

```text
backgroundCtx / todoCtx → emptyCtx
cancelCtx: parent, done, children, error/cause
  └─ timerCtx: deadline, timer
valueCtx: key, value, parent reference

cancel(parent) → children → their children
Value(key)     → current node → parent → root
```

Sơ đồ là mô hình, không phải declaration API. Source hiện hành dùng emptyCtx dạng struct{}; mô tả integer trong bản cũ đã lỗi thời. Cancelable parent quản lý children để broadcast hủy; cancel loại liên kết và dừng timer phù hợp. ValueCtx tạo một node wrapper cho mỗi WithValue và tìm ngược lên parent, nên lookup có thể tăng chi phí theo độ sâu, không như lookup vào một map tập trung.

## 9. Hợp đồng API nên rõ ràng

Đặt ctx đầu chữ ký, truyền tiếp cùng request lifetime, không lưu request context lâu dài trong struct service. Quy tắc tránh context trong struct là hướng dẫn thiết kế để không nhập nhằng lifetime, không phải lệnh compiler cấm; API lịch sử như http.Request là ngoại lệ có lý do. Dữ liệu bắt buộc vẫn dùng tham số có kiểu. Nhận context mới cho mỗi operation thay vì tái dùng context đã canceled.

## Ví dụ áp dụng

### Tình huống: yêu cầu hủy rồi chờ worker đã thoát

Cancel là yêu cầu dừng; một tín hiệu riêng cho biết worker đã hoàn tất. Tách hai việc này giúp caller biết khi nào có thể an toàn tiếp tục dọn tài nguyên.

```go
ctx, cancel := context.WithCancel(context.Background())
done := make(chan struct{})

go func() {
    defer close(done)
    <-ctx.Done()
    // Finish any owned cleanup before returning.
}()

cancel()
<-done
fmt.Println(ctx.Err()) // context canceled
```

Cancel có thể xảy ra trước khi worker bắt đầu chờ; Done đã đóng nên lần nhận vẫn tiếp tục ngay khi worker được chạy. Không cần sleep để đoán thời điểm worker sẵn sàng. <-done là bước chờ hoàn tất, không phải cancel(). Worker làm công việc thật phải kiểm tra hủy ở những điểm thích hợp hoặc gọi API hỗ trợ context; đoạn này không chứng minh mọi hàm chặn đều có thể bị hủy.

## Tự kiểm tra

Cancel một child ảnh hưởng sibling không? Vì sao một query không nhận context có thể chạy quá deadline? Hai key struct{} cùng kiểu trong package có khác nhau không?

## Tài liệu đối chiếu

- [context package](https://pkg.go.dev/context)
- [Context and structs](https://go.dev/blog/context-and-structs)
- [Context implementation](https://go.dev/src/context/context.go)

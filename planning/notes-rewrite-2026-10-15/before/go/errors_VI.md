---
title: "Xử lý lỗi: trả error, wrap nguyên nhân và chọn cách phục hồi"
category: "Go"
tags: ["golang", "errors", "fundamentals"]
description: "Error mô tả một thao tác không hoàn thành theo hợp đồng. Code rõ ràng cần cho thấy lỗi thuộc thao tác nào, caller có thể làm gì và nguyên nhân còn truy vết được không."
updated: 2026-10-14
translationKey: "go/errors"
---

Error mô tả một thao tác không hoàn thành theo hợp đồng. Code rõ ràng cần cho thấy lỗi thuộc thao tác nào, caller có thể làm gì và nguyên nhân còn truy vết được không.

## 1. error là interface, không phải lệnh điều khiển luồng

```go
type error interface { Error() string }

func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}
```

Dòng type error minh họa predeclared interface; không cần khai báo lại nó trong chương trình. Go không có try/catch cho lỗi thông thường. Return error không tự dừng caller; caller phải quyết định. Theo convention, nil nghĩa thành công và error đứng cuối. Không bỏ qua err rồi dùng kết quả khi hợp đồng chưa bảo đảm kết quả đó hợp lệ.

## 2. Bốn quyết định thực tế khi thất bại

**Propagate:** trả lỗi để tầng biết nghiệp vụ quyết định. **Retry:** chỉ với lỗi tạm thời và thao tác retry an toàn/idempotent, có giới hạn lần/thời gian và backoff. **Terminate:** tầng main có thể kết thúc khi cấu hình bắt buộc thiếu; thư viện không nên tự os.Exit. **Log và tiếp tục:** chỉ khi có fallback chấp nhận được; nên log ở tầng xử lý cuối để tránh cùng lỗi bị log nhiều lần.

Retry một thanh toán sau lỗi timeout có thể tạo giao dịch trùng nếu server đã xử lý nhưng response bị mất. Error message không đủ để quyết định retry: hợp đồng operation và trạng thái bên ngoài mới quan trọng. os.Exit không chạy defer, nên cần dọn tài nguyên trước khi exit.

## 3. Sentinel và lỗi có dữ liệu

```go
var ErrInvalid = errors.New("invalid input")

type ValidationError struct {
    Field string
    Reason string
}
func (e *ValidationError) Error() string {
    return fmt.Sprintf("%s: %s", e.Field, e.Reason)
}
```

Sentinel là giá trị lỗi định danh mà caller có thể kiểm tra. Structured error giữ thông tin như field, code hoặc thời điểm; message dành cho người đọc, field dành cho code. Không phân loại lỗi bằng so sánh chuỗi Error() vì wording dễ thay đổi. Không trả một *ValidationError nil dưới dạng error khi thành công: interface đó không nil.

## 4. Wrap, Is và As khác nhau thế nào?

```go
err := fmt.Errorf("load account: %w", ErrInvalid)
fmt.Println(errors.Is(err, ErrInvalid)) // true

err = fmt.Errorf("create user: %w", &ValidationError{
    Field: "email", Reason: "missing",
})
var validation *ValidationError
if errors.As(err, &validation) {
    fmt.Println(validation.Field) // email
}
```

`%w` giữ lỗi bên trong để Unwrap/Is/As truy vết. `%v` chỉ định dạng message và không giữ một liên kết unwrap như %w. Is tìm lỗi khớp target trong cây lỗi (có thể qua method Is), không kiểm tra một type nói chung. As tìm lỗi gán được vào kiểu của biến đích và điền biến ấy; đây không phải conversion dữ liệu tùy ý. Vì validation là *ValidationError, ta truyền &validation cho As để hàm có thể gán vào nó.

Wrap làm nguyên nhân thành một phần hợp đồng API mà caller có thể phụ thuộc. Chỉ expose nguyên nhân phù hợp. Từ Go 1.20, errors.Join ghép nhiều lỗi và Is/As có thể tìm trong các nhánh; không nên mô tả mọi error chỉ là một chain tuyến tính.

## 5. Panic và recover

```go
func boundary() {
    defer func() {
        if value := recover(); value != nil {
            log.Printf("panic: %v", value)
        }
    }()
    panic("unexpected state")
}
```

Đây là ví dụ cơ chế, không phải mẫu mặc định cho mọi hàm. Panic dừng đường chạy bình thường rồi chạy defer trên stack goroutine đó. Recover có hiệu lực khi được gọi trực tiếp trong deferred function của cùng goroutine đang panic. Recover trong main không bắt panic của goroutine khác. Sau recover, không tiếp tục ở dòng ngay sau panic; hàm chứa defer kết thúc.

Dùng error cho tình huống dự kiến như input sai, file thiếu hoặc request timeout. Panic/recover phù hợp ở ranh giới kiểm soát khi có kế hoạch logging, stack trace và xử lý kết quả; nuốt panic rồi giả vờ thành công che lỗi dữ liệu. Một số fatal runtime errors không thể recover như panic thông thường.

## Ví dụ áp dụng

### Tình huống: phân loại lỗi dù đã thêm ngữ cảnh

Tầng dưới báo hết hàng; tầng trên thêm mã đơn hàng. Caller vẫn cần nhận diện nguyên nhân để quyết định hiển thị thông báo hoặc thử lại.

```go
var ErrOutOfStock = errors.New("out of stock")

func reserve(available, requested int) error {
    if requested > available {
        return ErrOutOfStock
    }
    return nil
}

err := reserve(2, 3)
if err != nil {
    err = fmt.Errorf("order A17: %w", err)
}
fmt.Println(err) // order A17: out of stock
fmt.Println(errors.Is(err, ErrOutOfStock)) // true
```

%w giữ quan hệ nguyên nhân; errors.Is đi qua chuỗi wrap nên vẫn nhận ra sentinel. So sánh chuỗi hoặc err == ErrOutOfStock ở tầng ngoài sẽ không thay thế được hành vi này. Hết hàng không tự nhiên trở thành lỗi nên retry: chỉ thử lại khi quy tắc nghiệp vụ cho phép và có khả năng trạng thái thay đổi. Ví dụ giả định số lượng đầu vào không âm.

## Tự kiểm tra

Khi nào dùng Is thay vì As? Viết một lỗi được wrap hai tầng mà caller vẫn lấy được Field, rồi giải thích lý do không log ở cả ba tầng.

## Tài liệu đối chiếu

- [errors package](https://pkg.go.dev/errors)
- [Working with errors in Go 1.13](https://go.dev/blog/go1.13-errors)
- [Go language specification](https://go.dev/ref/spec)

---
title: "Xử lý lỗi: trả error, wrap nguyên nhân và chọn cách phục hồi"
category: "Go"
tags: ["golang", "errors", "fundamentals"]
description: "Error mô tả một thao tác không hoàn thành theo hợp đồng. Code rõ ràng cần cho thấy lỗi thuộc thao tác nào, caller có thể làm gì và nguyên nhân còn truy vết được không."
updated: 2026-10-15
translationKey: "go/errors"
---

Một đơn hàng không giữ được số lượng hàng yêu cầu. Tầng lưu trữ biết hàng không đủ; tầng đơn hàng biết đang xử lý mã đơn nào; caller biết có nên đề nghị khách đổi số lượng hay không. Xử lý lỗi tốt mang đủ thông tin qua các tầng mà không buộc tầng nào cũng quyết định giống nhau.

Trong Go, thất bại thông thường được trả về dưới dạng giá trị. Bài này theo một lỗi từ nơi phát sinh qua bước wrap và phân loại, rồi phân biệt đường đi ấy với panic và recovery. Bạn cần biết hàm, interface và `defer`; [bài interface](/vi/notes/go/interfaces/) giải thích typed nil. Các đoạn code độc lập trừ khi nói rõ dùng lại. Đặt khai báo hàm, method ở cấp package và câu lệnh trong `main`, import `errors`, `fmt` hoặc `log` khi dùng. Comment là kết quả dự kiến, không phải kết quả đã chạy.

## Error trả về cần caller quyết định

Interface `error` có sẵn của ngôn ngữ có hình dạng sau; không khai báo lại nó trong code ứng dụng:

```go
type error interface { Error() string }
```

Kiểu phù hợp có method `Error() string` có thể mô tả thất bại. Một thao tác nhỏ có thể trả error cùng kết quả:

```go
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}

value, err := divide(10, 0)
if err != nil {
    fmt.Println("cannot calculate:", err)
    return
}
fmt.Println(value)
```

Kết quả dự kiến là `cannot calculate: division by zero`. `divide` trả về bình thường với hai giá trị. Nó không ném exception cho lỗi thông thường hay tự dừng caller. Caller kiểm tra `err` rồi return khỏi `main` của mình trong đoạn này, nên không in giá trị giữ chỗ 0 như một thương hợp lệ.

Theo quy ước, `error` nằm cuối danh sách kết quả và nil nghĩa thành công. Khi thất bại, kết quả khác chỉ dùng được trong phạm vi hợp đồng hàm cho phép; một số API trả dữ liệu từng phần có ích, còn hàm này thì không. Go không có `try/catch` cho lỗi thông thường để thay thế bước quyết định ấy.

## Tạo định danh khi caller cần nhận biết lỗi

**Sentinel** là một giá trị lỗi cụ thể đại diện cho điều kiện có thể nhận diện:

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

Ví dụ giả định số lượng không âm và chỉ kiểm tra hàng sẵn có; nó chưa sửa tồn kho hay thực hiện giữ hàng nguyên tử. Yêu cầu 3 khi có 2 làm hàm trả sentinel. Tầng sau thêm mã đơn bằng `%w`, tạo error giữ lại nguyên nhân bên trong.

Error ngoài là giá trị mới, nên `err == ErrOutOfStock` bằng false sau khi wrap. Message của nó cũng có thêm chữ. `errors.Is` đi theo quan hệ lỗi được giữ lại và nhận ra sentinel. So chuỗi `Error()` sẽ khiến logic nghiệp vụ phụ thuộc câu chữ, dấu câu và ngữ cảnh được bổ sung.

Điều kiện khác có thể có sentinel riêng, chẳng hạn `var ErrInvalid = errors.New("invalid input")`. Nên chọn những phân biệt mà caller thực sự cần. Với thất bại không có caller nào cần phân loại, một message dễ đọc có thể đã đủ.

## Thêm dữ liệu có cấu trúc khi phân loại chưa đủ

Lỗi validation cần chỉ ra input nào phải sửa:

```go
type ValidationError struct {
    Field string
    Reason string
}
func (e *ValidationError) Error() string {
    return fmt.Sprintf("%s: %s", e.Field, e.Reason)
}

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

Đoạn này dùng lại `ErrInvalid` ở trên. `ValidationError` cung cấp message dễ đọc qua `Error`, còn các field cho code thông tin để sử dụng mà không cần phân tích chuỗi. Structured error khác có thể giữ code hoặc timestamp khi ứng dụng cần.

`errors.Is` hỏi một error có khớp điều kiện đích hay không. Nó có thể đi qua wrapper và gọi method tùy chỉnh `Is(error) bool`; đây không phải phép kiểm tra kiểu nói chung. `errors.As` tìm error gán được vào kiểu đích và lưu nó vào biến đích. Ở đây `validation` có kiểu `*ValidationError`, nên `&validation` cho `As` chỗ để ghi pointer ấy. Nó không chuyển mọi error tùy ý thành `ValidationError`.

Khi thao tác thành công, trả `nil` tường minh. `*ValidationError` nil được chuyển sang `error` vẫn mang kiểu động, khiến interface không nil. Đây không phải cách báo thành công hợp lệ; gọi method `Error` đang minh họa trên pointer nil đó cũng dereference nil.

## Giữ nguyên nhân có chủ đích

`fmt.Errorf("create user: %w", err)` giữ liên kết để unwrap và kiểm tra. Dùng `%v` chỉ tạo chữ, không giữ liên kết unwrap đó. Khác biệt này là một phần API: nếu caller tìm được sentinel riêng của storage qua wrapping, họ có thể bắt đầu phụ thuộc nó. Hãy đưa ra nguyên nhân phù hợp để caller biết, hoặc chuyển thành hợp đồng lỗi do tầng hiện tại sở hữu.

Nhiều tầng có thể thêm ngữ cảnh hữu ích mà vẫn để ranh giới ngoài xử lý:

```go
err := error(&ValidationError{Field: "email", Reason: "missing"})
err = fmt.Errorf("create user: %w", err)
err = fmt.Errorf("submit signup: %w", err)

var validation *ValidationError
if errors.As(err, &validation) {
    fmt.Println("please correct", validation.Field) // please correct email
}
```

`As` đi qua hai wrapper đến lỗi validation. Mỗi tầng đóng góp thao tác mình hiểu; không tầng nào phải log chỉ vì nó trả error. Handler cuối có thể log toàn bộ ngữ cảnh một lần và đưa ra phản hồi phù hợp.

`errors.Is`, `errors.As` và wrapping bằng `%w` có từ Go 1.13. Từ Go 1.20, `errors.Join` ghép các thất bại thành error có nhiều con. Vì vậy việc kiểm tra hoạt động trên cả cây lỗi lẫn chuỗi wrap tuyến tính. `Is`, `As` xét các nhánh; đừng giả định gọi lặp `errors.Unwrap` dạng trả một error sẽ duyệt hết lỗi được join. [Tài liệu package errors](https://pkg.go.dev/errors) mô tả các quy tắc duyệt này.

## Chọn phản ứng từ ý nghĩa thao tác

Cùng một error có thể dẫn đến quyết định khác nhau tại các ranh giới khác nhau:

| Quyết định | Khi phù hợp | Điều caller phải xác định |
| --- | --- | --- |
| Trả lên trên | Tầng khác biết thất bại có ý nghĩa gì với người dùng hoặc nghiệp vụ | Thêm ngữ cảnh có ích và giữ nguyên nhân phù hợp |
| Retry | Điều kiện có thể tạm thời và lặp thao tác an toàn | Giới hạn số lần hoặc tổng thời gian, dùng backoff và tôn trọng hủy |
| Kết thúc | Chương trình không thể tiếp tục, chẳng hạn thiếu cấu hình bắt buộc | Để ranh giới chương trình quyết định và dọn tài nguyên cần thiết |
| Log rồi tiếp tục | Có fallback hoặc kết quả từng phần chấp nhận được | Làm rõ kết quả đó và tránh log trùng |

Timeout khi thanh toán không chứng minh thanh toán chưa xảy ra. Server có thể đã thực hiện trước khi response bị mất. Retry thiếu kiểm soát có thể trừ tiền hai lần. Retry an toàn phụ thuộc ngữ nghĩa thao tác, cơ chế idempotency và trạng thái bên ngoài đã biết, thay vì dò từ như “timeout” trong message.

Tương tự, “hết hàng” không tự dẫn đến retry. Trạng thái có thể chưa đổi trong khoảng thời gian hữu ích, và quy tắc nghiệp vụ có thể yêu cầu chọn số lượng khác. Thư viện thông thường nên trả thất bại thay vì gọi `os.Exit`, vì chương trình sở hữu quyết định kết thúc. `os.Exit` không chạy deferred function; cần dọn tài nguyên bắt buộc trước khi thoát. Log hữu ích nhất ở tầng xử lý thất bại cuối cùng, nơi đã biết kết quả sẽ được xử lý ra sao.

## Panic tháo stack; recover thuộc ranh giới kiểm soát

Panic đi theo luồng điều khiển khác với trả error:

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

Import `log` cho hàm này. Gọi `boundary` gây panic, bắt đầu tháo call stack của goroutine đó và chạy các deferred function trên đường đi. Hàm được defer trực tiếp gọi `recover`, nhận giá trị panic rồi ghi log. Prefix log có thể thay đổi. Khi recovery xong, `boundary` return; chương trình không tiếp tục ở câu lệnh ngay sau `panic`.

Recovery chỉ có tác dụng khi `recover` được gọi trực tiếp bởi deferred function trên cùng goroutine đang panic. Recover trong `main` không bắt được panic của goroutine khác; chuyển chính lời gọi `recover()` vào helper thông thường do hàm defer gọi cũng không đáp ứng điều kiện gọi trực tiếp này.

Đoạn code minh họa cơ chế, không phải wrapper mặc định cho mọi hàm. Thất bại dự kiến như input sai, file thiếu và timeout thường nên được trả dưới dạng error. Ranh giới recovery có kiểm soát cần kế hoạch ghi log, stack trace và kết quả của thao tác thất bại; nuốt panic rồi báo thành công che đi thất bại. Recovery cũng không rollback trạng thái đã đổi trước panic. Một số fatal runtime errors không recover được như panic thông thường.

## Theo lỗi đến quyết định xử lý

**1.** Lỗi giữ hàng đã được wrap thêm `order A17`. Nên kiểm tra thế nào để nhận biết thiếu hàng, và vì sao so bằng trực tiếp sai?

**2.** Handler cần tên field không hợp lệ từ lỗi đã wrap hai lần. Nên dùng `Is` hay `As`, và log ở đâu?

**3.** Goroutine gửi yêu cầu thanh toán rồi nhận timeout. Chỉ riêng dữ kiện ấy có đủ để retry không?

**Giải thích:**

1. Dùng `errors.Is(err, ErrOutOfStock)`. Wrapper ngoài là giá trị error khác nhưng vẫn giữ sentinel làm nguyên nhân.
2. Dùng `As` với `var validation *ValidationError` và `&validation`, rồi đọc `validation.Field` khi khớp. Log ở tầng xử lý kết quả, thường một lần với ngữ cảnh tích lũy; tầng giữa có thể trả error bổ sung ngữ cảnh.
3. Không. Phải xác định yêu cầu đầu có thể đã có tác dụng hay chưa và lặp lại có an toàn không. Dùng thiết kế idempotency hoặc đối soát phù hợp nếu cần, cùng giới hạn thời gian và số lần khi được phép retry.

## Tài liệu đối chiếu

- [errors package](https://pkg.go.dev/errors) — matching, extraction, join và duyệt cây lỗi.
- [Working with errors in Go 1.13](https://go.dev/blog/go1.13-errors) — wrapping và quyết định API.
- [Go specification: handling panics](https://go.dev/ref/spec#Handling_panics) — ngữ nghĩa panic và recover.
- [os.Exit](https://pkg.go.dev/os#Exit) — kết thúc mà không chạy defer.

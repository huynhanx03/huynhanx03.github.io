---
title: "Interface: hợp đồng hành vi, kiểu động và nil"
category: "Go"
tags: ["golang", "interfaces", "abstraction", "fundamentals"]
description: "Interface mô tả hành vi mà caller cần. Một kiểu thỏa interface khi method set của nó đáp ứng hợp đồng, giúp caller dùng nhiều implementation mà không phụ thuộc vào cấu trúc dữ liệu cụ thể."
updated: 2026-10-15
translationKey: "go/interfaces"
---

Một hàm tạo lời chào cần tên của một người. Hàm không cần biết tên đó đến từ map, database hay service khác. Interface cho phép caller nêu hành vi cần dùng, để các implementation cung cấp hành vi ấy bằng những cấu trúc dữ liệu khác nhau.

Hai câu hỏi chính là điều gì khiến một kiểu thỏa hợp đồng và giá trị interface giữ gì sau phép gán. Câu hỏi thứ hai giải thích cách chọn method, sao chép, assertion và trường hợp pointer nil nằm trong interface không nil. Nếu chưa quen method set, hãy đọc [bài method](/vi/notes/go/methods/) trước. Các đoạn code độc lập, với khai báo ở cấp package và câu lệnh trong `main`; import `fmt` khi dùng. Ví dụ có `any` cần Go 1.18 trở lên. Comment đưa kết quả dự kiến.

## Mô tả hành vi caller cần

Bắt đầu với một hành vi nhỏ mà nhiều kiểu có thể cung cấp:

```go
type Speaker interface { Speak() string }

type Dog struct{}
func (Dog) Speak() string { return "Woof" }

type Human struct { Name string }
func (h Human) Speak() string { return "Hello, " + h.Name }

func greet(s Speaker) { fmt.Println(s.Speak()) }
var _ Speaker = (*Human)(nil)
```

`Speaker` yêu cầu method tên `Speak`, không nhận tham số và trả `string`. Cả hai kiểu đều cung cấp đúng chữ ký này. `greet(Dog{})` in `Woof`; `greet(Human{Name: "An"})` in `Hello, An`. Bên trong `greet`, kiểu tĩnh của `s` là `Speaker`, nên code gọi method đã cam kết mà không cần xem field của chó hay người.

Go không có khai báo `implements`. Compiler kiểm tra tên và chữ ký method theo quy tắc kiểu. Method `Speak() error` không thỏa `Speak() string` dù tên giống nhau. Đây là implicit structural satisfaction được kiểm tra tĩnh, thay vì duck typing tùy ý lúc chạy. Defined type nền số nguyên hay map cũng có thể có method; cơ chế này không giới hạn ở struct.

Dòng `var _` kiểm tra việc thỏa interface khi biên dịch mà không cấp một `Human`. Vì `Speak` dùng value receiver, cả `Human` lẫn `*Human` đều có method cần thiết. Nếu receiver là `*Human`, chỉ kiểu pointer thỏa `Speaker`; cú pháp gọi rút gọn trên biến addressable không thêm method vào method set của `Human`.

## Giá trị interface có kiểu động và giá trị động

Biến khai báo là `Speaker` vẫn giữ kiểu tĩnh ấy. Lúc chạy, một giá trị interface không nil còn có kiểu động và giá trị thuộc kiểu đó. Gọi `s.Speak()` chọn implementation của kiểu động.

Phép gán vẫn sao chép giá trị:

```go
h := Human{Name: "An"}
var s Speaker = h
h.Name = "Mai"
fmt.Println(s.Speak()) // Hello, An

s = &h
h.Name = "Lan"
fmt.Println(s.Speak()) // Hello, Lan
```

Lần gán đầu lưu một giá trị `Human` được sao chép từ `h`. Cập nhật `h.Name` không cập nhật bản sao đó. Lần thứ hai lưu bản sao pointer `*Human`, nên cả hai đường truy cập đi đến cùng `h`. Khi gọi `Speak` qua pointer này, Go sao chép giá trị `Human` hiện tại để làm receiver cho lời gọi. Interface không mặc nhiên trỏ ngược về biến struct ban đầu; giá trị được gán quyết định phần nào dùng chung.

## Pointer nil vẫn mang theo một kiểu

```go
type User struct { Name string }
var p *User
var value any = p
fmt.Println(p == nil)     // true
fmt.Println(value == nil) // false
```

Interface nil không có kiểu động và không có giá trị động. Ở đây `value` có kiểu động `*User` cùng giá trị pointer nil. Vì vậy nó khác interface nil. Gọi đây là **typed nil** mô tả cặp thông tin ấy; hai kết quả so sánh không mâu thuẫn vì chúng so hai giá trị khác nhau, có kiểu tĩnh khác nhau.

Điều này có ý nghĩa khi hàm trả một interface như `error`. Trả `*MyError` nil qua kết quả `error` lưu cả kiểu lẫn pointer nil. Caller vì thế thấy `err != nil`. Hàm thành công nên trả `nil` tường minh. [Bài xử lý lỗi](/vi/notes/go/errors/) giải thích hệ quả đối với việc quyết định có thất bại hay không.

Method có nil pointer receiver có thể hợp lệ nếu phần cài đặt kiểm tra nil trước khi dereference. Interface không thêm việc kiểm tra đó. Truy cập field qua pointer nil vẫn panic; gọi method value receiver qua pointer nil cũng không tạo được giá trị receiver cụ thể cần thiết.

## Dùng assertion khi cần biết kiểu cụ thể

`any` là alias của `interface{}`, có từ Go 1.18. Nó không đặt yêu cầu method, nên nhiều giá trị không liên quan có thể được gán vào. Kiểm tra kiểu tĩnh vẫn áp dụng: muốn thao tác đặc thù với chuỗi, trước hết phải xác định giá trị bên trong đúng kiểu.

```go
var value any = "Go"
text, ok := value.(string)
fmt.Println(text, ok) // Go true

switch v := value.(type) {
case string:
    fmt.Println(len(v))
case int:
    fmt.Println(v + 1)
default:
    fmt.Println("unsupported")
}
```

Assertion hai kết quả trả chuỗi bên trong và true ở đây. Khi không khớp, nó trả zero value của kiểu được assertion cùng false. Assertion một kết quả, `text := value.(string)`, sẽ panic nếu không khớp. Type switch chọn nhánh bằng kiểu động; trong case chỉ có kiểu cụ thể `string`, `v` mang kiểu `string`, nên `len(v)` hợp lệ và in 2.

So sánh interface có ranh giới liên quan. So `any([]int{1})` với `any([]int{1})` sẽ panic: cả hai chứa cùng kiểu động slice, vốn không comparable. Gán được vào interface không làm giá trị cụ thể có thêm phép so sánh bằng nhau.

Interface chứa type terms như `interface{ ~int }` phục vụ mục đích khác. Chúng ràng buộc type parameter trong generics và không được dùng làm kiểu giá trị runtime thông thường. `any` và những interface chỉ có method trong bài này dùng được làm kiểu runtime.

## Đặt hợp đồng gần phía sử dụng

Tình huống tạo lời chào trở nên thực tế hơn khi thao tác đọc dữ liệu có thể thất bại. Đây là ví dụ riêng, không ghép với `Speaker` và hàm `greet` trước đó:

```go
type NameReader interface {
    Name(id int) (string, error)
}

func greet(reader NameReader, id int) (string, error) {
    name, err := reader.Name(id)
    if err != nil {
        return "", fmt.Errorf("greet user %d: %w", id, err)
    }
    return "Hello, " + name, nil
}

type Names map[int]string

func (n Names) Name(id int) (string, error) {
    name, ok := n[id]
    if !ok {
        return "", fmt.Errorf("user %d not found", id)
    }
    return name, nil
}

message, err := greet(Names{7: "An"}, 7)
fmt.Println(message, err) // Hello, An <nil>
```

`greet` phụ thuộc một thao tác. `Names` cung cấp thao tác ấy bằng method trên defined type nền map, cho thấy implementation không cần là struct. Với key 7, lookup thành công, `Name` trả `"An", nil`, rồi `greet` tạo thông báo. Với key thiếu, nó trả error và caller nhận ngữ cảnh bổ sung thay vì lời chào.

Implementation dùng database có thể đáp ứng cùng chữ ký. Consumer thường có thể định nghĩa interface nhỏ này trong package của mình vì biết chính xác mình cần gì. Interface chuẩn như `io.Reader`, `io.Writer` cũng thể hiện nguyên tắc hợp đồng hành vi hẹp hữu ích ấy. Constructor có thể trả concrete type đến khi thật sự cần abstraction; tạo interface cho mọi struct thêm tên nhưng chưa chắc thêm khả năng thay thế có ích.

Hợp đồng này chưa nói về ghi map đồng thời hay hỗ trợ timeout. Cần thiết kế các yêu cầu ấy tường minh, chẳng hạn thêm context parameter khi thao tác cần hủy. Thay dependency trong kiểm thử hoặc bằng implementation khác chỉ có ích nếu implementation thay thế cũng tuân thủ hợp đồng hành vi mong đợi.

## Biểu diễn runtime là chi tiết giúp giải thích

Mô hình runtime Go truyền thống phân biệt interface có method (`iface`) và empty interface (`eface`):

```text
non-empty interface: [itab reference | data]
empty interface:     [type reference | data]
itab: concrete type + interface type + method dispatch information
```

Word liên quan đến kiểu giải thích cách runtime chọn method dù caller chỉ thấy interface. Nó cũng giúp hình dung typed nil: thông tin kiểu còn đó trong khi giá trị pointer nil.

Sơ đồ này không phải bảo đảm của spec để thao tác bằng `unsafe`. Một data word cũng không có nghĩa mỗi phép gán đều gây một heap allocation riêng. Biểu diễn và boxing phụ thuộc kiểu và compiler. Dùng mô hình ngôn ngữ để suy luận hành vi, còn khi phân tích hiệu năng cần bằng chứng đo đạc.

## Xác định caller cần thông tin gì

**1.** Cho `var e *MyError = nil`, với `*MyError` thỏa `error`. `var err error = e` lưu gì, và `err == nil` có đúng không?

**2.** Một hàm chỉ gọi `Read([]byte) (int, error)`. Tham số `any` hay interface reader nhỏ diễn đạt yêu cầu tốt hơn?

**3.** Ví dụ sao chép `Human` thay đổi thế nào nếu chuyển `Speak` sang pointer receiver?

**Giải thích:**

1. Nó lưu kiểu động `*MyError` và giá trị pointer nil. Interface không nil. Trả literal `nil` để báo thao tác thành công.
2. Interface reader nêu thao tác cần thiết và cho compiler kiểm tra implementation. `any` phù hợp khi xử lý dữ liệu khác kiểu và chủ động kiểm tra kiểu, thay vì lúc hàm đã biết mình cần method nào.
3. `var s Speaker = h` không còn biên dịch vì method set của `Human` thiếu method ấy. `s = &h` vẫn hợp lệ và chia sẻ đối tượng gốc.

## Tài liệu đối chiếu

- [Go specification: interface types](https://go.dev/ref/spec#Interface_types), [method sets](https://go.dev/ref/spec#Method_sets), [type assertions](https://go.dev/ref/spec#Type_assertions) và [comparison operators](https://go.dev/ref/spec#Comparison_operators).
- [Effective Go](https://go.dev/doc/effective_go) — interface và method.
- [Go runtime: runtime2.go](https://go.dev/src/runtime/runtime2.go) — đối chiếu mô hình triển khai `iface`, `eface` ngày 2026-10-15.

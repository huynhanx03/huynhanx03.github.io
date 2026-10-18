---
title: "Interface: hợp đồng hành vi, kiểu động và nil"
category: "Go"
tags: ["golang", "interfaces", "abstraction", "fundamentals"]
description: "Interface mô tả hành vi mà caller cần. Một kiểu thỏa interface khi method set của nó đáp ứng hợp đồng, giúp caller dùng nhiều implementation mà không phụ thuộc vào cấu trúc dữ liệu cụ thể."
updated: 2026-10-14
translationKey: "go/interfaces"
---

Interface mô tả hành vi mà caller cần. Một kiểu thỏa interface khi method set của nó đáp ứng hợp đồng, giúp caller dùng nhiều implementation mà không phụ thuộc vào cấu trúc dữ liệu cụ thể.

## 1. Thỏa interface là điều kiện kiểm tra bằng kiểu

```go
type Speaker interface { Speak() string }

type Dog struct{}
func (Dog) Speak() string { return "Woof" }

type Human struct { Name string }
func (h Human) Speak() string { return "Hello, " + h.Name }

func greet(s Speaker) { fmt.Println(s.Speak()) }
var _ Speaker = (*Human)(nil)
```

Không có từ khóa implements. Compiler đối chiếu method name và signature, không chỉ thấy tên giống nhau. Đây là implicit structural satisfaction được kiểm tra tĩnh, không phải kiểm tra duck typing tùy ý lúc chạy. Defined type nền int cũng có thể có method; interface không chỉ dành cho struct. Dòng var _ kiểm tra ở compile time, không tạo Human để chạy.

## 2. Interface giữ kiểu động và giá trị động

Một giá trị Speaker có kiểu tĩnh Speaker, nhưng có thể giữ giá trị động Dog hoặc Human. Gọi Speak chọn implementation của kiểu động. Gán một value vào interface sao chép value đó; nếu value là pointer, bản sao pointer vẫn trỏ tới object chung. Đừng mặc định interface luôn trỏ tới bản gốc của một struct value.

```go
type User struct { Name string }
var p *User
var value any = p
fmt.Println(p == nil)     // true
fmt.Println(value == nil) // false
```

Interface chỉ nil khi không có kiểu động và không có giá trị động. value ở đây có kiểu động *User dù pointer nil. Đây là typed nil, không phải một interface vừa nil vừa không nil. Nếu hàm trả error nil thành công, trả nil thật thay vì một *MyError nil. Method trên nil pointer có thể hợp lệ nếu implementation tự xử lý nil; truy cập field qua nil vẫn panic.

## 3. any, assertion và type switch

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

any là alias của interface{} từ Go 1.18, không phải kiểu động làm Go mất kiểm tra kiểu. Bạn chỉ không biết kiểu cụ thể bên trong nên phải kiểm tra trước khi dùng. Assertion một kết quả value.(T) panic nếu sai; dạng hai kết quả trả zero value và false. Type switch chọn nhánh theo kiểu động; khi một case có một kiểu cụ thể, v mang kiểu ấy.

## 4. Chi tiết runtime: iface và eface

```text
non-empty interface: [itab reference | data]
empty interface:     [type reference | data]
itab: concrete type + interface type + method dispatch information
```

Runtime truyền thống gọi hai biểu diễn này là iface và eface. Sơ đồ giúp giải thích dispatch và typed nil, không phải layout được Go spec bảo đảm cho unsafe. Data word không có nghĩa mọi kiểu đều cần một heap allocation riêng; representation/boxing tùy compiler và kiểu. Khi chưa profiling, ưu tiên hợp đồng interface rõ hơn tối ưu đoán từ sơ đồ.

## 5. Thiết kế interface ở phía sử dụng

Interface nhỏ như io.Reader/io.Writer giúp caller chỉ phụ thuộc thao tác cần thiết. Thường đặt interface ở package sử dụng, trả concrete type từ constructor khi chưa có nhu cầu abstraction. Đây là cách mở rộng implementation mà không sửa caller và giúp thay dependency trong kiểm thử. Không tạo interface cho mọi struct chỉ để có thêm một tầng tên.

Pointer/value method set vẫn áp dụng: nếu Speak khai báo trên *Human, chỉ *Human thỏa Speaker. Interface có type terms như ~int chỉ được dùng làm constraint cho generics, không được dùng làm kiểu của một biến runtime. Hai interface có thể so sánh nhưng sẽ panic nếu cùng kiểu động không comparable, ví dụ []int.

## Ví dụ áp dụng

### Tình huống: bên sử dụng định nghĩa hợp đồng nhỏ

Hàm tạo lời chào chỉ cần đọc tên người dùng; nó không cần biết database, kết nối hay toàn bộ API của repository. Định nghĩa interface theo đúng nhu cầu ấy.

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

Names đáp ứng NameReader mà không cần khai báo implements. Một kiểu dùng database cũng có thể đáp ứng bằng cùng chữ ký. Hợp đồng chưa nói về timeout hay concurrent access; nếu cần, hãy bổ sung theo nhu cầu thực tế, chẳng hạn context ở tham số. Ví dụ chỉ dùng map để làm rõ sự thay thế dependency.

## Tự kiểm tra

Tạo một error chứa typed nil và giải thích vì sao err != nil. Khi nào bạn chọn any, khi nào chọn một interface có method?

## Tài liệu đối chiếu

- [Go language specification](https://go.dev/ref/spec)
- [Effective Go](https://go.dev/doc/effective_go)

---
title: "Composition và embedding: lắp ghép mà không kế thừa"
category: "Go"
tags: ["golang", "composition", "struct-embedding", "fundamentals"]
description: "Composition nghĩa là một thành phần sử dụng các thành phần khác để làm việc. Go hỗ trợ điều này bằng field thông thường, embedded field và interface; embedding chỉ là một trong các cách lắp ghép."
updated: 2026-10-15
translationKey: "go/composition"
---

Một service checkout cần ghi log, nhưng caller chưa chắc cần gọi mọi method của logger thông qua checkout. Đây là câu hỏi thiết kế phía sau composition: đối tượng được tạo từ những thành phần nào, và những thao tác nào thuộc API công khai của nó?

Go hỗ trợ composition qua field thông thường, embedded field và interface. Embedding bổ sung promotion cho selector và method, nên cần hiểu chính xác sự tiện lợi ấy đưa những gì ra ngoài. Bài này dựa trên [struct](/vi/notes/go/structs/), [method](/vi/notes/go/methods/) và [interface](/vi/notes/go/interfaces/). Mỗi khối code là đoạn riêng trừ khi nói rõ dùng lại kiểu trước đó; đặt method ở cấp package, câu lệnh trong `main`, thêm `fmt` tại nơi sử dụng. Comment mô tả kết quả dự kiến.

## Bắt đầu với dependency tường minh

Field có tên cho phép checkout quyết định cách sử dụng logger:

```go
type Logger interface { Println(...any) }

type Checkout struct {
    logger Logger
}

func NewCheckout(logger Logger) *Checkout {
    return &Checkout{logger: logger}
}

func (c *Checkout) Place(orderID string) {
    c.logger.Println("placing order", orderID)
}
```

`Place` gọi thành phần qua `c.logger`. Caller dùng được `Place`, nhưng field này không tự tạo method `Println` cho `Checkout`. Ghi log vẫn là dependency bên trong. Với package `log` chuẩn, `NewCheckout(log.Default()).Place("A17")` ghi log thao tác; prefix cụ thể phụ thuộc cấu hình logger.

Constructor yêu cầu logger sử dụng được. Không thể gọi method trên interface nil, còn interface giữ typed nil có hành vi tùy method cụ thể. Ví dụ chưa kiểm tra dependency đó. `Place` cũng chỉ minh họa ghi log, chưa thực hiện giao dịch đặt hàng. Cách viết `any` cần Go 1.18 trở lên.

Nếu field được nhúng dưới dạng `Logger`, `Println` sẽ được promote và caller có thể gọi qua checkout. Cả hai thiết kế đều lắp ghép hành vi từ thành phần khác. Field có tên phù hợp khi thành phần nên ở bên trong; embedding phù hợp khi hành vi được promote là phần có chủ đích của API ngoài.

## Embedding thay đổi selector thế nào?

```go
type Persona struct { Name string }
func (p Persona) Greet() string { return "Hello, " + p.Name }

type Employee struct {
    Persona
    ID int
}

e := Employee{Persona: Persona{Name: "An"}, ID: 7}
fmt.Println(e.Name, e.Greet()) // An Hello, An
```

Khai báo `Persona` bỏ tên field tường minh. Tên kiểu trở thành tên field, nên `Employee` vẫn có một field `Persona` thật. Go cho phép selector `e.Name`, `e.Greet` thay cho `e.Persona.Name`, `e.Persona.Greet`; đó là selector được **promote**.

Khởi tạo vẫn theo các field thật. Literal dùng `Persona: Persona{...}`. `Employee{Name: "An"}` không biên dịch vì `Name` được promote chứ không được khai báo trực tiếp trong `Employee`. Hình dung đối tượng lồng nhau trước rồi đến cú pháp rút gọn giúp giải thích cả truy cập lẫn khởi tạo.

## Thành phần được nhúng vẫn giữ receiver riêng

`Employee` chứa `Persona`, nhưng không phải subtype tự động truyền được vào hàm nhận `Persona`. Với hàm ấy, cần truyền `e.Persona`. Hàm nhận interface phù hợp có thể nhận cả hai kiểu khi method set của chúng thỏa interface. Generics cung cấp một dạng tái sử dụng theo kiểu khác với constraint riêng; embedding không thay thế các cơ chế ấy.

Ranh giới tương tự áp dụng cho method. Bổ sung các method cấp package sau vào ví dụ trước:

```go
func (p Persona) Introduction() string { return p.Greet() }
func (e Employee) Greet() string { return "Employee " + e.Name }
```

Với cùng `e`, `e.Greet()` trả `Employee An`, còn `e.Introduction()` trả `Hello, An`. `Employee.Greet` khai báo trực tiếp che selector được promote. Nhưng `Introduction` vẫn chạy với receiver `Persona`, và `p.Greet()` được phân giải thành `Persona.Greet`. Embedding không tạo virtual dispatch đến method trùng tên của đối tượng ngoài.

Điều này có ý nghĩa khi tái sử dụng thành phần có các method gọi lẫn nhau. Thêm method ngoài thay đổi thứ caller chọn trên kiểu ngoài; nó không viết lại hành vi nội bộ của thành phần.

## Giải quyết xung đột bằng đường dẫn field

```go
type A struct { Name string }
type B struct { Name string }
type C struct { A; B }

c := C{A: A{Name: "A"}, B: B{Name: "B"}}
fmt.Println(c.A.Name) // A
// c.Name is ambiguous.
```

Khai báo `C` hợp lệ. Vấn đề xuất hiện khi dùng `c.Name`: có hai field ứng viên ở cùng độ sâu selector. Go không thể chọn một trong hai. Đường dẫn `c.A.Name` xác định rõ thành phần mong muốn nên hợp lệ.

Field hoặc method ở mức nông hơn có thể che tên ở mức sâu hơn. Vì vậy việc phân giải theo độ sâu selector và quy tắc method set, thay vì theo một hệ thống phân cấp kế thừa chung. Đường dẫn tường minh còn cho biết thành phần nào sở hữu trạng thái, đôi khi hữu ích ngay cả khi selector ngắn hơn hợp lệ.

## Promotion có thể trở thành cam kết interface

```go
type Logger struct{}
func (Logger) Log(message string) { fmt.Println(message) }

type Service struct { Logger }
type Logging interface { Log(string) }
var _ Logging = Service{}
```

Đây là ví dụ riêng với ví dụ interface `Logger` trước đó. `Service` thỏa `Logging` nhờ method `Log` được promote. Caller nhận `Logging` vì thế có thể nhận một `Service` và gọi method mà không biết field nhúng.

Với pointer receiver, cần xét cả kiểu ngoài và field được nhúng:

| Field nhúng | Method khai báo trên `T` | Method khai báo trên `*T` |
| --- | --- | --- |
| `T` | Promote vào `Outer` và `*Outer` | Promote vào `*Outer` |
| `*T` | Promote vào `Outer` và `*Outer` | Promote vào `Outer` và `*Outer` |

Bảng giả định tên method không mơ hồ và không bị che. Đây là mô tả method set, không bảo đảm mọi lời gọi đều có dữ liệu receiver dùng được. Nhúng `*T` cho phép nhiều struct ngoài chia sẻ cùng một đối tượng, nhưng zero value của struct ngoài chứa pointer nil. Method được promote cần field của đối tượng ấy có thể panic. Cần xác định zero value dùng được hay phải khởi tạo thành phần nhúng trước.

Promotion còn có chi phí API: method mới được export từ kiểu nhúng có thể hiện ra qua kiểu ngoài. Chọn embedding có chủ đích cần xét quan hệ ấy, thay vì chỉ xem đây là cách giảm vài dòng forwarding.

## Kết hợp hợp đồng hoặc chuyển tiếp hành vi

Interface có thể kết hợp interface khác mà không chứa các field thành phần ở runtime:

```go
type Reader interface { Read([]byte) (int, error) }
type Writer interface { Write([]byte) (int, error) }
type ReadWriter interface { Reader; Writer }
```

Một giá trị thỏa `ReadWriter` khi method set cung cấp cả hai thao tác. Method trùng phải có chữ ký tương thích, giống nhau; hai chữ ký `Read` khác nhau không thể trở thành overload.

Ngược lại, field có tên giữ dependency thật và cần chuyển tiếp tường minh:

```go
type Service struct { logger Logging }
func (s Service) Run() { s.logger.Log("start") }
```

`Service` này là đoạn riêng với bản dùng embedding và giả định có `Logging` ở trên. Nó cung cấp `Run`, nhưng không tự thỏa `Logging`. Decorator hoặc proxy có thể theo cùng cách: giữ interface, khai báo những method muốn đưa ra ngoài, thêm logging hoặc metrics rồi chuyển tiếp đến giá trị được bọc. Retry cần thêm quy tắc an toàn theo thao tác cụ thể; bọc một dependency không tự làm retry an toàn.

## Chọn quan hệ trước khi chọn cú pháp

**1.** Vì sao `Employee{Name: "An"}` sai trong khi `e.Name` hợp lệ?

**2.** Service cần logger nhưng không nên cung cấp ghi log như thao tác công khai. Dạng field nào diễn đạt thiết kế đó, và service có tự thỏa interface logger không?

**3.** Nếu `Log` đổi sang receiver `*Logger` còn `Service` nhúng value `Logger`, `Service{}` còn thỏa `Logging` không? `*Service` thì sao?

**Giải thích:**

1. Literal gọi tên field được khai báo. `Name` thuộc `Persona`; promotion chỉ cung cấp selector ngắn hơn. Cần khởi tạo `Persona` lồng bên trong tường minh.
2. Dùng field có tên như `logger Logging` và gọi tường minh. Service cần method `Log` riêng để thỏa `Logging`; field ấy không tự promote method.
3. Value `Service` không còn method đó trong method set. `*Service` có, nếu không mơ hồ hay bị che. Biến `Service` addressable vẫn có thể gọi pointer method bằng cú pháp rút gọn; việc thỏa interface vẫn theo method set của kiểu.

## Tài liệu đối chiếu

- [Go specification: struct types](https://go.dev/ref/spec#Struct_types), [selectors](https://go.dev/ref/spec#Selectors), [method sets](https://go.dev/ref/spec#Method_sets) và [embedded interfaces](https://go.dev/ref/spec#Embedded_interfaces).
- [Effective Go: embedding](https://go.dev/doc/effective_go#embedding) — composition và hành vi chuyển tiếp.

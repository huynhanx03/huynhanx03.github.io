---
title: "Composition và embedding: lắp ghép mà không kế thừa"
category: "Go"
tags: ["golang", "composition", "struct-embedding", "fundamentals"]
description: "Composition nghĩa là một thành phần sử dụng các thành phần khác để làm việc. Go hỗ trợ điều này bằng field thông thường, embedded field và interface; embedding chỉ là một trong các cách lắp ghép."
updated: 2026-10-14
translationKey: "go/composition"
---

Composition nghĩa là một thành phần sử dụng các thành phần khác để làm việc. Go hỗ trợ điều này bằng field thông thường, embedded field và interface; embedding chỉ là một trong các cách lắp ghép.

## 1. Field có tên và embedded field

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

Persona không có field name riêng trong khai báo, nhưng tên kiểu trở thành tên field. e.Name và e.Greet là selector được promote, rút gọn e.Persona.Name và e.Persona.Greet. Dùng literal có Persona: rõ ràng; không thể điền trực tiếp một promoted field như Name: trong literal Employee.

## 2. Embedding không tạo subtype hay override

Employee chứa Persona nhưng không thể tự truyền vào hàm nhận Persona; phải truyền e.Persona. Method có receiver Persona vẫn chạy với Persona, không nhìn thấy Employee như một lớp con. Một method cùng tên ở Employee che selector promote, không tạo virtual dispatch bên trong Persona. Interface mới là hợp đồng để hai kiểu khác nhau thay thế nhau ở caller; generics là công cụ khác cho code theo kiểu.

## 3. Selector mơ hồ và độ sâu

```go
type A struct { Name string }
type B struct { Name string }
type C struct { A; B }

c := C{A: A{Name: "A"}, B: B{Name: "B"}}
fmt.Println(c.A.Name) // A
// c.Name is ambiguous.
```

Hai tên cùng độ sâu làm selector mơ hồ khi được sử dụng; định nghĩa C vẫn hợp lệ. Field/method gần hơn có thể che tên ở sâu hơn. Quy tắc này áp dụng theo selector và method set, không phải mọi xung đột đều giống mô hình diamond của class inheritance. Truy cập tường minh cũng giúp người đọc biết dữ liệu thuộc thành phần nào.

## 4. Promotion có thể giúp thỏa interface

```go
type Logger struct{}
func (Logger) Log(message string) { fmt.Println(message) }

type Service struct { Logger }
type Logging interface { Log(string) }
var _ Logging = Service{}
```

Service thỏa Logging nhờ method được promote. Nếu method receiver là pointer, cần xét lại method set của Service/*Service và kiểu embedded field. Embed *T cho phép chia sẻ một T nhưng zero value của outer struct có thể chứa pointer nil; gọi method rồi dereference field có thể panic. Constructor hoặc quy tắc zero value cần làm rõ điều này.

## 5. Interface embedding và delegation

```go
type Reader interface { Read([]byte) (int, error) }
type Writer interface { Write([]byte) (int, error) }
type ReadWriter interface { Reader; Writer }

type Service struct { logger Logging }
func (s Service) Run() { s.logger.Log("start") }
```

Hai ví dụ dùng các Service khác nhau và nên đọc riêng. ReadWriter yêu cầu hợp các method Reader/Writer; method trùng phải có signature tương thích. Service giữ field có tên logger sẽ gọi tường minh, không tự expose Log ra API. Named field hợp khi bạn chỉ muốn dependency nội bộ; embedding hợp khi muốn expose/compose hành vi có chủ đích.

Decorator/proxy có thể giữ interface bên trong và tự khai báo method để thêm logging, retry hoặc metrics trước khi delegate. Không nhúng một kiểu chỉ để tránh viết vài dòng nếu bạn không muốn nhận toàn bộ API được promote của nó.

## Ví dụ áp dụng

### Tình huống: field có tên giữ API rõ ràng

Một service cần logger để thực hiện công việc, nhưng không nhất thiết muốn đưa mọi method của logger lên API công khai của service. Field có tên diễn đạt quan hệ này.

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

NewCheckout yêu cầu logger hợp lệ. Caller sử dụng Place; logger là chi tiết bên trong. Nếu embed Logger, Println sẽ được promote và có thể gọi qua service, làm API rộng hơn. Chọn embedding khi muốn quan hệ promote đó; chọn field có tên khi muốn chuyển tiếp hành vi một cách chủ động. Ví dụ Place minh họa logging, chưa thực hiện giao dịch đặt hàng.

## Tự kiểm tra

Giải thích vì sao e.Persona hợp lệ ở hàm nhận Persona nhưng e thì không. Khi nào dependency logger nên là field có tên thay vì embedding?

## Tài liệu đối chiếu

- [Go language specification](https://go.dev/ref/spec)
- [Effective Go](https://go.dev/doc/effective_go)

---
title: "Composition"
category: "Go"
tags: ["golang", "composition", "struct-embedding", "fundamentals"]
---

# Composition: Triết lý lắp ghép cấu trúc

Ngôn ngữ Go phủ quyết cơ chế kế thừa phân cấp (Class-based Inheritance) của các ngôn ngữ OOP truyền thống. Thay vào đó, Go hiện thực hóa tư duy **Composition** (Lắp ghép) một cách triệt để thông qua tính năng **Struct Embedding**. Đây không chỉ là thay đổi về cú pháp, mà là một sự thay đổi về tư duy thiết kế: Ưu tiên sự linh hoạt của việc lắp ghép các thành phần nhỏ thành hệ thống lớn.

---

## 1. Bản chất của Struct Embedding

Trong Go, khi bạn nhúng một Struct vào một Struct khác mà không đặt tên trường, Go sẽ thực hiện cơ chế **Anonymous Embedding**.

```go
type Persona struct {
    Name string
}

func (p Persona) Greet() {
    fmt.Println("Xin chào, tôi là", p.Name)
}

type Employee struct {
    Persona // Embedding
    ID      int
}
```

---

## 2. Phân biệt then chốt: Embedding vs. Subtyping

Đây là điểm khác biệt học thuật quan trọng nhất mà lập trình viên cần nắm vững:

-   **OOP Truyền thống (Subtyping):** Lớp con **là một (is-a)** lớp cha. Đối tượng lớp con có thể được sử dụng ở bất kỳ đâu mong đợi lớp cha.
-   **Go (Embedding):** Struct bao ngoài **có một (has-a)** struct bên trong, nhưng được che đậy bằng cú pháp truy cập trực tiếp. `Employee` **không phải** là một `Persona`. 

> Bạn không thể truyền một biến kiểu `Employee` vào một hàm nhận tham số kiểu `Persona`. Sự đa hình trong Go chỉ được thực hiện thông qua **Interfaces**, không phải qua Struct Embedding.

---

## 3. Giải quyết xung đột (Ambiguous Selectors)

Go giải quyết vấn đề "Diamond Problem" (Xung đột đa kế thừa) bằng một quy tắc cực kỳ tường minh:

Nếu một Struct nhúng nhiều thành phần có cùng tên trường hoặc phương thức, Go sẽ không báo lỗi lúc định nghĩa. Lỗi biên dịch chỉ xảy ra khi bạn truy cập vào trường đó mà không chỉ rõ nguồn gốc.

```go
type A struct { Name string }
type B struct { Name string }

type C struct {
    A
    B
}

var c C
// fmt.Println(c.Name) // LỖI: Ambiguous selector 'Name'
fmt.Println(c.A.Name)   // Hợp lệ: Truy cập tường minh
```

Cơ chế này ép buộc lập trình viên phải minh bạch trong mã nguồn, loại bỏ mọi sự mơ hồ mà các hệ thống kế thừa phức tạp thường gặp phải.

---

## 4. Interface Satisfaction via Embedding

Sức mạnh thực sự của Composition bộc lộ khi kết hợp với Interface. Bằng cách nhúng một Struct đã thực hiện sẵn các phương thức cần thiết, Struct mới sẽ **nghiễm nhiên thỏa mãn một Interface** mà không cần viết lại mã (Boilerplate code).

```go
type Logger struct{}
func (l Logger) Log(msg string) { fmt.Println(msg) }

type Service struct {
    Logger // Giúp Service thỏa mãn interface có phương thức Log()
}
```

---

## 5. Composition trên Giao diện (Interface Embedding)

Go cho phép lắp ghép các Giao diện nhỏ thành Giao diện lớn hơn. Đây là cách Go áp dụng nguyên lý **Interface Segregation** (ISP) trong SOLID.

```go
type Reader interface { Read(p []byte) (n int, err error) }
type Writer interface { Write(p []byte) (n int, err error) }

// ReadWriter được lắp ghép từ hai giao diện nguyên tử
type ReadWriter interface {
    Reader
    Writer
}
```

Kiểu thiết kế này giúp hệ thống cực kỳ linh hoạt (composability) và dễ dàng thực hiện các cơ chế Decorator hay Proxy.

---

> **Favor Composition over Inheritance:** Việc lắp ghép các thành phần độc lập giúp giảm thiểu sự phụ thuộc chặt chẽ (Tight Coupling), làm cho mã nguồn dễ kiểm thử (Unit Test) và dễ bảo trì hơn trong dài hạn.

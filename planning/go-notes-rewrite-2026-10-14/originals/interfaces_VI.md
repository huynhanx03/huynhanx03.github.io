---
title: "Interfaces"
category: "Go"
tags: ["golang", "interfaces", "abstraction", "fundamentals"]
---

# Interfaces: Những bản hợp đồng linh hoạt

Interface (Giao diện) là một trong những tính năng mạnh mẽ nhất, tạo nên sự linh hoạt và khả năng mở rộng tuyệt vời cho ngôn ngữ Go. Nó giúp mã nguồn của bạn trở nên trừu tượng hóa, dễ dàng bảo trì và thực hiện kiểm thử (Unit Test).

## 1. Triết lý khác biệt

Trong các ngôn ngữ như Java hay C#, bạn phải sử dụng từ khóa `implements` để khẳng định một Lớp (Class) tuân thủ một Interface. Trong Go, **mọi thứ diễn ra một cách thầm lặng.**

> **Duck Typing:** "Nếu nó đi như một con vịt và kêu như một con vịt, thì nó chính là một con vịt." 
> Trong Go: Nếu một cấu trúc (**Struct**) sở hữu đầy đủ các phương thức mà Interface yêu cầu, nó sẽ **tự động** được coi là thỏa mãn Interface đó mà không cần bất kỳ khai báo rườm rà nào.

## 2. Định nghĩa Interface

```go
type Speaker interface {
    Speak() string
}

type Dog struct{}
func (d Dog) Speak() string { return "Woof!" }

type Human struct{}
func (h Human) Speak() string { return "Xin chào!" }
```

Cả `Dog` và `Human` đều nghiễm nhiên thỏa mãn giao diện `Speaker`.

**Kiểm tra Implementation tại thời điểm Compile**
Trong các dự án lớn, hãy sử dụng dòng mã này để đảm bảo Struct chắc chắn thỏa mãn Interface ngay khi viết mã:
```go
var _ Speaker = (*Human)(nil) // Gây lỗi Compile nếu Human thiếu phương thức
```
Dòng này không cấp phát bộ nhớ, chỉ là một lời khẳng định (Assertion) với trình biên dịch.

### Cấu trúc thực sự của Interface
Bên trong Go, một Interface không phải là "không có gì". Nó gồm hai thành phần:
1.  **Kiểu dữ liệu cụ thể (Concrete Type)**: Lưu giữ thông tin về kiểu của đối tượng được gán vào.
2.  **Giá trị cụ thể (Value)**: Trỏ tới vùng nhớ chứa dữ liệu thực tế của đối tượng đó.


```go
// iface dùng cho interface có phương thức (ví dụ: Speaker)
type iface struct {
    tab  *itab   // Chứa thông tin về kiểu dữ liệu và bảng phương thức
    data unsafe.Pointer // Trỏ tới giá trị thực tế
}

// eface dùng cho interface rỗng (any)
type eface struct {
    _type *_type          // Chỉ chứa thông tin về kiểu dữ liệu
    data  unsafe.Pointer  // Trỏ tới giá trị thực tế
}
```

**Điều này dẫn tới một cạm bẫy thú vị:** Một Interface có thể là "vừa nil vừa không nil". 
-   Nó chỉ thực sự là `nil` khi cả hai con trỏ trên đều là `nil`.
-   Nếu con trỏ Kiểu (`tab` hoặc `_type`) đã có giá trị nhưng `data` là `nil`, phép so sánh `if interface == nil` sẽ trả về `false`. Điều này thường xảy ra khi bạn gán một con trỏ `nil` của một Struct vào một Interface.

## 3. Tại sao chúng ta cần Interface?

Hãy tưởng tượng bạn xây dựng một hàm có nhiệm vụ in lời chào của bất kỳ đối tượng nào "biết nói":

```go
func Greet(s Speaker) {
    fmt.Println(s.Speak())
}
```

Nhờ Interface, bạn có thể truyền vào một con chó, một con người, hay thậm chí là một robot trong tương lai mà **không cần chỉnh sửa lại hàm Greet**. Đây chính là minh chứng cho nguyên lý "Mở để mở rộng, Đóng để thay đổi" (**Open-Closed Principle**).

## 4. Interface rỗng (`interface{}` hoặc `any`)

Một Interface không chứa phương thức nào sẽ được mọi kiểu dữ liệu trong Go thỏa mãn. Từ phiên bản Go 1.18, chúng ta sử dụng từ khóa `any` để thay thế cho `interface{}`.

```go
func PrintAnything(v any) {
    fmt.Println(v)
}
```

`any` có thể tiếp nhận mọi giá trị từ số nguyên, chuỗi cho đến các cấu trúc phức tạp. Tuy nhiên, hãy thận trọng khi sử dụng để tránh làm mất đi tính an toàn của kiểu dữ liệu (**Type Safety**).

---

> **Interface Segregation (Chia nhỏ Giao diện):** Go khuyến khích tạo ra các Interface nhỏ gọn và tập trung vào một nhiệm vụ duy nhất (thường chỉ gồm 1 hoặc 2 phương thức). Hãy tham khảo các ví dụ kinh điển như `io.Reader` hay `io.Writer`.

---

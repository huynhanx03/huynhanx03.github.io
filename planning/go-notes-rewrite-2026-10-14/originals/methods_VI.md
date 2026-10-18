---
title: "Methods"
category: "Go"
tags: ["golang", "methods", "receivers", "fundamentals"]
---

# Phương thức và Hành vi (Methods)

Trong Go, **Method** (Phương thức) là một hàm có đối số đặc biệt được gọi là **Receiver**. Nếu Struct đại diện cho trạng thái (state), thì Phương thức đại diện cho hành vi (behavior) của dữ liệu đó. Bản chất của Phương thức là "Syntactic Sugar" giúp tổ chức mã nguồn theo hướng đối tượng mà vẫn giữ được hiệu năng tối ưu của lập trình hàm.

---

## 1. Cơ chế Receiver (Receiver Semantics)

Sự khác biệt duy nhất giữa Hàm và Phương thức là sự hiện diện của Receiver ngay trước tên hàm. Go phân chia rạch ròi hai loại ngữ nghĩa truyền tham số:

-   **Value Receiver** `(r T)`: Phương thức làm việc trên một **bản sao** của dữ liệu. Mọi thay đổi bên trong không tác động đến đối tượng gốc. Phù hợp cho các kiểu dữ liệu nhỏ hoặc khi cần đảm bảo tính bất biến (Immutability).
-   **Pointer Receiver** `(r *T)`: Phương thức làm việc trực tiếp trên địa chỉ bộ nhớ. Cho phép thay đổi dữ liệu gốc và tối ưu hiệu năng cho các Struct lớn bằng cách tránh chi phí sao chép dữ liệu.

```go
type Rectangle struct {
    Width, Height float64
}

// Pointer Receiver: Hiệu chỉnh trực tiếp trạng thái của đối tượng
func (r *Rectangle) Scale(factor float64) {
    r.Width *= factor
    r.Height *= factor
}

// Value Receiver: Chỉ truy xuất thông tin, không làm thay đổi trạng thái
func (r Rectangle) Area() float64 {
    return r.Width * r.Height
}
```

> **Quy tắc nhất quán:** Nếu một vài phương thức của Struct cần dùng Pointer Receiver, thì **tất cả** phương thức khác của Struct đó cũng nên dùng Pointer Receiver. Việc trộn lẫn hai loại receiver trong cùng một kiểu dữ liệu là một "bad practice" dễ gây nhầm lẫn về mặt hành vi.

---

## 2. Giải phẫu Runtime: Method Expression vs. Method Value

Để làm chủ Go, bạn cần hiểu cách trình biên dịch xử lý phương thức đằng sau lớp vỏ cú pháp:

### Method Expression (Biểu thức phương thức)
Bạn có thể coi phương thức như một hàm thông thường bằng cách gọi trực tiếp từ tên kiểu dữ liệu. Khi đó, đối số đầu tiên bắt buộc phải là Receiver.
```go
f := Rectangle.Area // f có kiểu: func(Rectangle) float64
area := f(rect)     // Kết quả tương đương rect.Area()
```

### Method Value (Giá trị phương thức)
Bạn có thể gán một phương thức của một **đối tượng cụ thể** vào một biến. Biến này sẽ trở thành một Closure "ngậm" sẵn đối tượng đó.
```go
scaleFunc := rect.Scale // scaleFunc "ràng buộc" trực tiếp với biến rect
scaleFunc(2.0)          // Tương đương thực hiện rect.Scale(2.0)
```

---

## 3. Method Sets: Quy tắc tập hợp phương thức

Đây là kiến thức then chốt quyết định cách một kiểu dữ liệu tương tác với các Interface (Giao diện):

-   **Kiểu giá trị `T`**: Chỉ sở hữu các phương thức được định nghĩa với **Value Receiver**.
-   **Kiểu con trỏ `*T`**: Sở hữu **tất cả** các phương thức (bao gồm cả Value và Pointer Receiver).

| Kiểu Receiver | Tập hợp phương thức chứa |
| :--- | :--- |
| `(r T)` | Chỉ các phương thức khai báo `(r T)` |
| `(r *T)` | Cả phương thức `(r T)` và `(r *T)` |

**Cơ chế Tự động giải tham chiếu (Syntactic Sugar):** 
Tại sao bạn vẫn gọi được `rect.Scale()` khi `rect` là giá trị? Thực tế, Go tự động chuyển đổi nó thành `(&rect).Scale()` nếu biến đó có thể lấy được địa chỉ (addressable). Điều tương tự cũng xảy ra khi gọi Value Receiver thông qua con trỏ.

---

## 4. Method Promotion (Thăng hạng phương thức)

Khi bạn sử dụng kỹ thuật **Embedding** (nhúng struct này vào struct kia), các phương thức của struct được nhúng sẽ được "thăng hạng" lên struct cha.

```go
type Base struct { ID int }
func (b Base) Identify() { fmt.Println("ID:", b.ID) }

type User struct {
    Base  // Embedding
    Name string
}

u := User{Base{1}, "An"}
u.Identify() // Gọi trực tiếp như thể Identify là của User
```

Đây là cách Go hỗ trợ tính đa hình và tái sử dụng mã nguồn mà không cần đến hệ thống kế thừa (Inheritance) phức tạp của OOP truyền thống.

---

## 5. Khai báo hành vi cho kiểu dữ liệu tùy chỉnh

Go không giới hạn phương thức chỉ cho Struct. Bạn có thể gán hành vi cho bất kỳ kiểu dữ liệu nào (ngoại trừ kiểu primitive trực tiếp hoặc kiểu từ package khác).

```go
type MyDuration int

func (d MyDuration) ToSeconds() int {
    return int(d)
}
```

> **Lưu ý về Overloading:** Go đề cao tính minh bạch, do đó ngôn ngữ **không hỗ trợ** nạp chồng phương thức (Method Overloading). Mỗi kiểu dữ liệu phải có danh sách tên phương thức duy nhất và rõ ràng.

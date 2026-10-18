---
title: "Method và receiver: bản sao, pointer và method set"
category: "Go"
tags: ["golang", "methods", "receivers", "fundamentals"]
description: "Method là hàm gắn với một receiver. Hiểu receiver giúp bạn xác định method có sửa trạng thái gốc không, method value giữ gì và một kiểu có thỏa interface không."
updated: 2026-10-15
translationKey: "go/methods"
---

Một hình chữ nhật có thể trả diện tích và thay đổi kích thước. Cả hai hành vi đều gắn tự nhiên với hình chữ nhật, nhưng cần dữ liệu theo cách khác nhau: tính diện tích có thể dùng bản sao, còn co giãn hình đang có phải truy cập được các field gốc.

**Method** là hàm được khai báo với receiver, tức giá trị viết trước tên method. Chọn receiver quyết định thứ gì được sao chép vào lời gọi. Lựa chọn ấy còn ảnh hưởng interface và callback, nên cần hiểu nhiều hơn việc nhớ `T` hay `*T`. Bài này giả định bạn đã biết [sao chép struct](/vi/notes/go/structs/) và pointer. Các đoạn code độc lập trừ khi nói rõ dùng lại kiểu trước đó. Đặt khai báo method ở cấp package, câu lệnh trong `main`, import `fmt` hoặc `time` tại nơi sử dụng. Comment mô tả kết quả dự kiến.

## Theo receiver vào lời gọi

```go
type Rectangle struct { Width, Height float64 }

func (r Rectangle) Area() float64 {
    return r.Width * r.Height
}
func (r *Rectangle) Scale(factor float64) {
    r.Width *= factor
    r.Height *= factor
}
```

`Area` nhận một giá trị `Rectangle`. Khi gọi, receiver được sao chép, giống như truyền tham số struct. Nếu `Area` gán lại `r.Width`, nó chỉ sửa bản sao cục bộ. Hình chữ nhật của caller vẫn giữ chiều rộng cũ.

`Scale` nhận một giá trị `*Rectangle`: pointer được sao chép, nhưng hình chữ nhật mà pointer trỏ tới vẫn dùng chung. Truy cập `r.Width` qua pointer sửa field gốc. Trong ví dụ này, pointer nil sẽ gây panic khi method truy cập field; dùng pointer receiver không tự làm nil trở thành đầu vào được hỗ trợ.

Value receiver không hứa dữ liệu hoàn toàn bất biến. Nếu struct chứa slice, map hoặc pointer, sao chép struct có thể vẫn để dữ liệu bên dưới dùng chung, và method vẫn sửa được dữ liệu đó. Tương tự, pointer receiver cho phép truy cập đối tượng nhưng không cung cấp đồng bộ. Đọc và ghi đồng thời vẫn cần cách phân quyền sở hữu hoặc khóa phù hợp.

## Vì sao value gọi được Scale nhưng không gán được vào interface?

Dùng lại các method của `Rectangle` ở trên:

```go
r := Rectangle{Width: 3, Height: 4}
r.Scale(2)
fmt.Println(r.Area()) // 48

type Scaler interface { Scale(float64) }
var _ Scaler = (*Rectangle)(nil)
// var _ Scaler = Rectangle{} // Would not compile.
```

`r` là biến addressable: Go có thể lấy địa chỉ của nó. Vì vậy lời gọi `r.Scale(2)` có thể dùng dạng rút gọn của `(&r).Scale(2)`. Chiều rộng thành 6, chiều cao thành 8 và tích của chúng là 48.

Việc thỏa interface xét **method set của kiểu**, thay vì áp dụng cú pháp rút gọn ấy cho một biến cụ thể. Method set của `Rectangle` có `Area`; method set của `*Rectangle` có cả `Area` và `Scale`. Chỉ `*Rectangle` thỏa `Scaler`. Khai báo với blank identifier kiểm tra điều này lúc biên dịch; nó không gọi `Scale` trên pointer nil.

Map element cho thấy vì sao addressability có ý nghĩa:

```go
rectangles := map[string]Rectangle{"card": {Width: 3, Height: 4}}
// rectangles["card"].Scale(2) // Would not compile.
r := rectangles["card"]
r.Scale(2)
rectangles["card"] = r
fmt.Println(rectangles["card"].Area()) // 48
```

Map element không addressable, nên Go không thể cung cấp `&rectangles["card"]`. Lấy value ra tạo một biến có thể lấy địa chỉ; sau khi scale bản sao ấy, gán lại mới cập nhật map. Map chứa `*Rectangle` là lựa chọn khác, nhưng các entry khi đó có thể chia sẻ đối tượng và có thể nil. Chọn cách ấy khi ngữ nghĩa phù hợp với ứng dụng.

## Lưu method cũng là lưu receiver

Một callback có thể được dùng lâu sau dòng tạo ra nó. Phân biệt method expression với method value cho biết callback sẽ dùng dữ liệu nào.

```go
r := Rectangle{Width: 3, Height: 4}
areaOf := Rectangle.Area
fmt.Println(areaOf(r)) // 12

savedArea := r.Area
savedScale := r.Scale
r.Width = 10
fmt.Println(savedArea()) // 12
savedScale(2)
fmt.Println(r.Width) // 20
```

`Rectangle.Area` là **method expression**, có kiểu `func(Rectangle) float64`. Receiver trở thành tham số đầu tiên được truyền tường minh. Vì thế `areaOf(r)` tính diện tích của receiver mà caller cung cấp ở lần gọi ấy.

`r.Area` là **method value**. Receiver được đánh giá và giữ lại tại lúc tạo `savedArea`. Vì `Area` dùng value receiver, hình chữ nhật được giữ có chiều rộng 3 và chiều cao 4. Đổi chiều rộng bản gốc về sau không đổi bản sao đã giữ, nên callback trả 12.

Tạo `savedScale` giữ một pointer đến `r`, nhờ cú pháp rút gọn với biến addressable. Pointer đó trỏ đến cùng hình chữ nhật có chiều rộng được đổi thành 10 sau đó, nên scale sẽ nhân đôi chiều rộng hiện tại thành 20. Method value giữ receiver đã được đánh giá; nó không tìm lại một biến cùng tên mỗi lần chạy. Vì vậy giữ method value cũng có thể kéo dài thời gian dữ liệu receiver còn truy cập được.

Một bộ đếm nhỏ làm rõ ý nghĩa của snapshot:

```go
type Meter struct { Count int }

func (m Meter) Value() int { return m.Count }
func (m *Meter) Add(delta int) { m.Count += delta }

m := Meter{Count: 4}
m.Add(3)
fmt.Println(m.Value()) // 7

snapshot := m.Value
m.Add(2)
fmt.Println(snapshot(), m.Value()) // 7 9
```

Snapshot giữ giá trị 7, còn lời gọi mới sao chép giá trị hiện tại là 9. Nếu `Value` dùng receiver `*Meter`, callback được lưu cũng đọc bộ đếm đã cập nhật. Như vậy receiver thay đổi hành vi quan sát được trước khi ta xét hiệu năng.

## Gắn hành vi với kiểu do package sở hữu

Method không giới hạn ở struct. Import `time` cho khai báo ở cấp package sau:

```go
type Seconds int
func (s Seconds) Duration() time.Duration {
    return time.Duration(s) * time.Second
}
```

`Seconds` là defined type có underlying type là số nguyên. Method làm phép chuyển sang duration rõ ràng tại nơi sử dụng. Ví dụ giả định số nguyên và phép nhân nằm trong miền biểu diễn của `time.Duration`; nó chưa kiểm tra overflow.

Receiver base type phải được định nghĩa trong cùng package và đáp ứng các hạn chế về receiver của spec; riêng base type không được tự nó là kiểu pointer hoặc interface. Có thể khai báo method có receiver `*Seconds`, nhưng không thêm method trực tiếp cho `int` hay kiểu của package khác. Go cũng không overload tên method theo danh sách tham số: hãy chọn tên khác có ý nghĩa hoặc một hợp đồng chung.

## Method được nhúng vẫn giữ receiver gốc

```go
type Base struct { ID int }
func (b Base) Identify() int { return b.ID }

type User struct {
    Base
    Name string
}
u := User{Base: Base{ID: 1}, Name: "An"}
fmt.Println(u.Identify()) // 1
```

`Identify` được promote, cho phép viết `u.Identify()` thay cho `u.Base.Identify()`. Receiver vẫn là `Base`. Method không tự truy cập được `User.Name`, và method trùng tên ở ngoài cũng không biến lời gọi bên trong `Base` thành virtual dispatch. Promotion phụ thuộc độ sâu selector và field nhúng `T` hay `*T`; [bài composition](/vi/notes/go/composition/) tiếp tục với các quy tắc ấy và hệ quả đối với API.

## Xem receiver là một phần hợp đồng dữ liệu

Pointer receiver phù hợp khi method cần sửa đối tượng đang có, giữ identity, tránh copy đối tượng đáng kể hoặc làm việc với struct chứa khóa không được copy sau khi sử dụng. Value receiver hợp với dữ liệu nhỏ được thiết kế để có hành vi như một giá trị độc lập. Cần xét field dùng chung trước khi kết luận dữ liệu thật sự độc lập.

Dùng dạng receiver nhất quán thường giúp API dễ theo dõi hơn. Trộn hai dạng là hợp lệ và có thể có chủ đích như ví dụ hình chữ nhật; đồng thời nó làm thay đổi interface mà kiểu value thỏa được. Đừng chọn pointer chỉ vì giả định nó luôn nhanh hơn. Chi phí copy, escape behavior, chia sẻ dữ liệu và workload thật đều ảnh hưởng hiệu năng.

## Đọc receiver trước khi dự đoán kết quả

**1.** Vì sao `r.Scale(2)` biên dịch được nhưng `var s Scaler = r` thì không?

**2.** Nếu tạo `savedArea := r.Area` rồi thực hiện `r = Rectangle{Width: 10, Height: 10}`, callback đã lưu có dùng giá trị thay thế không?

**3.** Method dùng value receiver gán `r.Items[0] = "new"`, với `Items` là field slice. Bản sao receiver có bảo vệ dữ liệu của caller không?

**Giải thích:**

1. Lời gọi có thể lấy địa chỉ biến. Phép gán interface xét method set của `Rectangle`, mà method set này thiếu `Scale` có pointer receiver.
2. Không. Nó đã giữ bản sao value receiver tại lúc tạo. Method value có pointer receiver được lưu từ biến ấy sẽ giữ địa chỉ biến và nhìn thấy các field thay thế.
3. Không. Sao chép receiver sao chép phần mô tả slice nên array nền vẫn có thể dùng chung. Muốn sửa độc lập cần dữ liệu nền riêng hoặc hợp đồng API cấm thao tác sửa đó.

## Tài liệu đối chiếu

- [Go specification: method declarations](https://go.dev/ref/spec#Method_declarations), [method sets](https://go.dev/ref/spec#Method_sets), [calls](https://go.dev/ref/spec#Calls), [method expressions](https://go.dev/ref/spec#Method_expressions) và [method values](https://go.dev/ref/spec#Method_values).
- [Effective Go](https://go.dev/doc/effective_go) — pointer, value và method.

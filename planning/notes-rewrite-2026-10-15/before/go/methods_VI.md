---
title: "Method và receiver: bản sao, pointer và method set"
category: "Go"
tags: ["golang", "methods", "receivers", "fundamentals"]
description: "Method là hàm gắn với một receiver. Hiểu receiver giúp bạn xác định method có sửa trạng thái gốc không, method value giữ gì và một kiểu có thỏa interface không."
updated: 2026-10-14
translationKey: "go/methods"
---

Method là hàm gắn với một receiver. Hiểu receiver giúp bạn xác định method có sửa trạng thái gốc không, method value giữ gì và một kiểu có thỏa interface không.

## 1. Value receiver và pointer receiver

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

Area nhận bản sao Rectangle nên sửa Width cục bộ sẽ không sửa bản gốc. Scale nhận bản sao pointer nên sửa field qua pointer tác động object gốc. Value receiver không bảo đảm bất biến: nếu receiver chứa slice/map/pointer, method vẫn có thể sửa vùng nền dùng chung. Pointer receiver không tự làm method an toàn khi gọi đồng thời.

## 2. Cú pháp gọi tự động không đổi method set

```go
r := Rectangle{Width: 3, Height: 4}
r.Scale(2)
fmt.Println(r.Area()) // 48

type Scaler interface { Scale(float64) }
var _ Scaler = (*Rectangle)(nil)
// var _ Scaler = Rectangle{} would not compile.
```

r là biến lấy địa chỉ được, nên r.Scale được hiểu như (&r).Scale. Nhưng method set của Rectangle chỉ có các method receiver Rectangle; *Rectangle có cả receiver Rectangle và *Rectangle. Vì vậy chỉ *Rectangle thỏa Scaler. Map element không addressable: m[key].Scale không được tự chuyển như biến r; lấy value ra, sửa rồi gán lại, hoặc dùng map giữ pointer.

## 3. Chọn receiver bằng hợp đồng dữ liệu

Dùng pointer khi cần sửa object, tránh copy object lớn hoặc giữ identity, đặc biệt với struct chứa mutex. Value phù hợp dữ liệu nhỏ có semantics như một giá trị. Giữ receiver nhất quán thường dễ đọc hơn, nhưng trộn receiver không phải hành vi compiler cấm hay luôn sai: ví dụ Area/Scale giúp minh họa method set. Đừng chọn pointer chỉ vì nghĩ nó luôn nhanh hơn.

## 4. Method expression và method value

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

Rectangle.Area là method expression có kiểu func(Rectangle) float64: caller truyền receiver. r.Area là method value giữ bản sao value receiver tại thời điểm tạo. r.Scale giữ pointer tới r tại thời điểm tạo; nó thấy thay đổi field về sau, chứ không tìm lại một biến tên r mỗi lần chạy. Method value có thể kéo dài vòng đời dữ liệu receiver.

## 5. Promotion từ embedded field

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

Identify được promote nên u.Identify rút gọn u.Base.Identify. Receiver thực tế vẫn là Base, không tự đổi thành User hay gọi method override của User. Promotion còn phụ thuộc embedding T hay *T và độ sâu selector; đọc tiếp Composition để hiểu xung đột.

## 6. Method cho kiểu tự định nghĩa

```go
type Seconds int
func (s Seconds) Duration() time.Duration {
    return time.Duration(s) * time.Second
}
```

Receiver base type phải được định nghĩa trong cùng package và không được là pointer/interface type theo các hạn chế của spec. Bạn không thêm method trực tiếp cho int hoặc kiểu của package khác. Go không có overload cùng tên theo bộ tham số: chọn tên biểu đạt khác hoặc thiết kế một hợp đồng chung.

## Ví dụ áp dụng

### Tình huống: một hành vi chỉ đọc và một hành vi cập nhật

Đọc tên method chưa đủ: receiver quyết định method làm việc với bản sao hay truy cập đối tượng gốc. Hãy đọc cả chữ ký.

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

m là biến có thể lấy địa chỉ, nên m.Add(3) được phép gọi pointer receiver. Method value snapshot giữ bản sao receiver tại lúc tạo; nó không đọc lại m mỗi lần gọi. Nếu Value dùng *Meter, snapshot sẽ giữ pointer và nhìn thấy cập nhật. Receiver ảnh hưởng ngữ nghĩa trước khi ảnh hưởng hiệu năng.

## Tự kiểm tra

Vì sao savedArea vẫn trả 12 nhưng savedScale sửa r hiện tại? Phân biệt gọi method trên biến addressable với việc thỏa interface.

## Tài liệu đối chiếu

- [Go language specification](https://go.dev/ref/spec)
- [Effective Go](https://go.dev/doc/effective_go)

---
title: "Struct: mô hình dữ liệu, sao chép và bố trí bộ nhớ"
category: "Go"
tags: ["golang", "structs", "fundamentals"]
description: "Struct gom các giá trị liên quan thành một kiểu có tên. Một struct rõ nghĩa mô tả dữ liệu và các trạng thái hợp lệ của nó; method sẽ bổ sung hành vi ở bài tiếp theo."
updated: 2026-10-14
translationKey: "go/structs"
---

Struct gom các giá trị liên quan thành một kiểu có tên. Một struct rõ nghĩa mô tả dữ liệu và các trạng thái hợp lệ của nó; method sẽ bổ sung hành vi ở bài tiếp theo.

## 1. Định nghĩa, literal và tag

```go
type User struct {
    ID int
    Name string
    Active bool `json:"active"`
}

u := User{ID: 1, Name: "An", Active: true}
v := User{2, "Binh", false}
var empty User
```

Literal có tên field dễ đọc và chịu thay đổi tốt hơn literal theo thứ tự. Field không được điền có zero value; empty có ID=0, Name="", Active=false. Tag là metadata cho thư viện như encoding/json hoặc ORM, không tự thực thi logic. Field muốn thư viện ở package khác truy cập thường phải được export.

## 2. Truy cập, pointer và bản sao

```go
copyUser := u
copyUser.Name = "Lan"
fmt.Println(u.Name) // An

p := &u
p.Name = "Mai"
fmt.Println(u.Name) // Mai
```

Go cho phép p.Name thay cho (*p).Name. Gán một struct sao chép field, không deep-copy dữ liệu mà field tham chiếu tới. Nếu User có field []string, hai bản sao có thể vẫn chia sẻ array. Không copy struct chứa sync.Mutex sau lần dùng đầu tiên.

## 3. Khi nào so sánh được?

Struct dùng == được khi tất cả field đều comparable. Array chỉ comparable nếu kiểu phần tử comparable. Slice, map và function không comparable nên struct chứa chúng không dùng == được. Interface field có thể khiến phép so sánh panic nếu giá trị động bên trong không comparable. So sánh pointer kiểm tra cùng đối tượng, không so sánh sâu toàn bộ object.

## 4. Alignment và padding

```go
type Scattered struct {
    A bool
    B int64
    C bool
}
type Grouped struct {
    B int64
    A bool
    C bool
}
```

Alignment yêu cầu field bắt đầu tại offset phù hợp với kiểu của nó; compiler có thể chèn padding giữa field và cuối struct. Trên các nền tảng 64-bit thông dụng, ví dụ trên thường là 24 byte và 16 byte. Có thể kiểm tra bằng unsafe.Sizeof/Alignof/Offsetof; không áp con số ấy cho mọi kiến trúc.

Nhóm field theo alignment có thể tiết kiệm bộ nhớ khi có rất nhiều object. Tuy nhiên tối ưu theo size không phải quy tắc luôn đúng; hãy giữ ý nghĩa field, compatibility của positional literal và đo tác động. Unsafe dùng để quan sát layout ở ví dụ này, không để xây một serialization phụ thuộc layout runtime.

## 5. Chuyển kiểu giữa các struct

```go
type Public struct { Name string `json:"name"` }
type Internal struct { Name string `json:"display_name"` }

p := Public{Name: "An"}
i := Internal(p)
fmt.Println(i.Name) // An
```

Explicit conversion có thể hợp lệ khi underlying struct types giống nhau sau khi bỏ qua tags theo quy tắc conversion. Thứ tự, tên và kiểu field vẫn quan trọng; field không export còn có identity theo package. Khác tags không tự ngăn conversion, nhưng tags vẫn có thể làm hai kiểu khác nhau khi xét type identity cho mục đích khác. Conversion không tự mapping dữ liệu hay chuyển đơn vị.

## 6. Empty struct và struct không tên

```go
done := make(chan struct{})
set := map[string]struct{}{"Go": {}}

report := struct {
    Title string
    Count int
}{Title: "Daily", Count: 3}

_, _, _ = done, set, report
```

struct{} có size 0, hữu ích cho tín hiệu không payload, value của set hoặc kiểu có method nhưng không giữ trạng thái. Channel/map vẫn có metadata và key nên không miễn phí bộ nhớ. Anonymous struct hợp cho dữ liệu dùng một chỗ, ví dụ DTO hay bảng case; named type hợp hơn khi nhiều hàm cần chia sẻ cùng một mô hình.

## Ví dụ áp dụng

### Tình huống: sao chép struct có slice

Gán struct sao chép từng field. Với slice, field được sao chép là phần mô tả slice, không phải toàn bộ array chứa phần tử.

```go
type Order struct {
    ID    int
    Items []string
}

original := Order{ID: 1, Items: []string{"tea", "cake"}}
copyOfOrder := original
copyOfOrder.ID = 2
copyOfOrder.Items[0] = "coffee"
fmt.Println(original.ID, original.Items) // 1 [coffee cake]

independent := original
independent.Items = append([]string(nil), original.Items...)
independent.Items[0] = "water"
fmt.Println(original.Items) // [coffee cake]
```

ID độc lập vì nó là int; Items vẫn chia sẻ array ở phép gán đầu tiên. Lần sau chúng ta sao chép phần tử sang slice khác. Với []string, như vậy đủ để sửa các phần tử độc lập; với []*Item hoặc [][]byte, còn phải xét dữ liệu được trỏ tới hoặc các slice con. Thiết kế clone theo cấu trúc dữ liệu thực tế.

## Tự kiểm tra

Một struct chứa []string được copy thì phần nào độc lập? Vì sao ví dụ Public → Internal hợp lệ dù JSON tags khác nhau?

## Tài liệu đối chiếu

- [Go language specification](https://go.dev/ref/spec)
- [Effective Go](https://go.dev/doc/effective_go)

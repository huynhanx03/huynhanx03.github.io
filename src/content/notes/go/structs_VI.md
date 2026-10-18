---
title: "Struct: mô hình dữ liệu, sao chép và bố trí bộ nhớ"
category: "Go"
tags: ["golang", "structs", "fundamentals"]
description: "Struct gom các giá trị liên quan thành một kiểu có tên. Một struct rõ nghĩa mô tả dữ liệu và các trạng thái hợp lệ của nó; method sẽ bổ sung hành vi ở bài tiếp theo."
updated: 2026-10-15
translationKey: "go/structs"
---

Một hồ sơ người dùng có mã định danh, tên và cờ kích hoạt. Nếu truyền từng giá trị riêng lẻ, ta dễ ghép nhầm dữ liệu của hai người hoặc quên những giá trị nào thuộc cùng một hồ sơ. Struct tạo một hình dạng chung cho nhóm dữ liệu; khi khai báo bằng `type`, ta còn đặt tên cho hình dạng ấy để dùng trong chữ ký hàm.

Việc gom dữ liệu cũng đặt ra câu hỏi ít thấy hơn: sau khi sao chép hồ sơ, những thay đổi nào độc lập? Bài này theo câu hỏi ấy từ field thông thường đến slice, phép so sánh và bố trí bộ nhớ. Bạn cần biết biến và hàm; [bài slice](/vi/notes/go/slices/) giải thích array dùng chung ở phần sau. Các đoạn code độc lập: đặt câu lệnh trong `main`, khai báo kiểu ở cấp package khi cần và import `fmt` để in. Comment là kết quả dự kiến theo quy tắc ngôn ngữ, không phải ghi nhận đã chạy code.

## Đặt hình dạng cho các giá trị liên quan

```go
type User struct {
    ID int
    Name string
    Active bool `json:"active"`
}

u := User{ID: 1, Name: "An", Active: true}
v := User{2, "Binh", false}
var empty User
fmt.Println(u.Name, v.Name) // An Binh
fmt.Println(empty)          // {0  false}
```

`User` khai báo ba field cùng kiểu của chúng. Composite literal cung cấp giá trị cho các field đó. Literal có tên field của `u` cho biết ý nghĩa từng giá trị; literal theo vị trí của `v` dựa vào thứ tự khai báo. Khi thêm hoặc đổi thứ tự field, cách khởi tạo theo vị trí cần được xem lại kỹ. Literal có tên field dễ đối chiếu hơn và cho phép bỏ qua field; field bị bỏ qua nhận zero value.

`var empty User` khởi tạo mọi field bằng zero value: `ID` bằng 0, `Name` là chuỗi rỗng và `Active` bằng false. Hai khoảng trắng trong kết quả in nằm hai bên chuỗi rỗng. Zero value là quy tắc khởi tạo của ngôn ngữ; hồ sơ như vậy có hợp lệ hay không lại do ứng dụng quyết định. Chẳng hạn, điều kiện ID phải dương vẫn cần bước kiểm tra riêng.

Phần trong dấu backtick là **struct tag**: metadata mà thư viện có thể đọc. `json:"active"` chỉ dẫn tên field cho `encoding/json`; bản thân tag không chạy code hay kiểm tra giá trị. Field bắt đầu bằng chữ hoa được export. Thư viện ở package khác thường cần field được export để truy cập dữ liệu; gắn tag vào field riêng tư không biến nó thành field công khai. ORM và các thư viện khác có quy ước tag riêng.

## Sao chép hồ sơ hay trỏ tới cùng hồ sơ

Bắt đầu với `u := User{ID: 1, Name: "An", Active: true}` ở trên:

```go
copyUser := u
copyUser.Name = "Lan"
fmt.Println(u.Name) // An

p := &u
p.Name = "Mai"
fmt.Println(u.Name) // Mai
```

Phép gán đầu sao chép các field của struct. `copyUser.Name` là field riêng, nên thay chuỗi trong field đó không đổi `u.Name`. Phép gán thứ hai chép một địa chỉ vào `p`. Lúc này `p.Name` chọn field của hồ sơ gốc. Go cho phép viết `p.Name` thay cho `(*p).Name`, nên lần ghi này làm thay đổi `u`.

Quy tắc ấy cũng áp dụng khi truyền tham số và trả kết quả: Go sao chép giá trị. Pointer được sao chép vẫn xác định cùng một đối tượng. Struct được sao chép có các field riêng, nhưng những field ấy có thể mô tả dữ liệu dùng chung.

## Field slice khiến bản sao chỉ độc lập một phần

Giả sử đơn hàng chứa danh sách tên món:

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

Sau `copyOfOrder := original`, hai field `ID` giữ hai số nguyên độc lập. Hai field `Items` giữ hai phần mô tả slice riêng, nhưng cùng tham chiếu một array nền. Ghi phần tử số 0 đi qua phần mô tả đến array chung. Vì vậy ID gốc vẫn bằng 1 còn món đầu tiên đã thay đổi.

Lệnh `append` phía sau sao chép các phần tử chuỗi sang vùng chứa slice riêng cho đầu vào không rỗng này. Từ đó, thay `independent.Items[0]` không chạm vào array gốc. Như vậy đủ để thay các phần tử của `[]string` độc lập. Với `[]*Item` hoặc `[][]byte`, phần tử được chép là pointer hoặc mô tả slice con; đối tượng hay array mà chúng tham chiếu vẫn có thể dùng chung. Hàm clone phải quyết định phần nào trong cấu trúc dữ liệu thật cần vùng chứa độc lập.

Một số struct còn có hạn chế sao chép ngoài vấn đề chia sẻ dữ liệu thông thường. [Tài liệu sync.Mutex](https://pkg.go.dev/sync#Mutex) cấm copy mutex sau lần sử dụng đầu tiên. Struct chứa mutex cũng chịu hạn chế thực tế ấy: dùng pointer khi truyền quanh đối tượng đã có, kể cả khi chọn [receiver của method](/vi/notes/go/methods/).

## Phép so sánh đi theo các field

Nếu mọi kiểu field đều comparable, hai struct cùng kiểu có thể được so sánh bằng `==`. Với `User`, phép so sánh đối chiếu cả ID, tên và cờ kích hoạt. Array comparable khi kiểu phần tử comparable, nên field array cũng có thể tham gia. Field slice, map hoặc function khiến kiểu struct không comparable; `Order` ở trên không dùng được `==`.

Field interface cần xét thêm một bước. Kiểu struct có thể comparable nhưng một lần so sánh cụ thể vẫn panic vì dữ liệu bên trong interface:

```go
type Label struct { Value any }
a := Label{Value: []int{1}}
b := Label{Value: []int{1}}
// fmt.Println(a == b) // Would panic: the dynamic []int values are not comparable.
_, _ = a, b
```

Phép so sánh đi đến hai interface có cùng kiểu động `[]int`, mà kiểu này không có phép so sánh bằng nhau. [Bài interface](/vi/notes/go/interfaces/) giải thích mô hình kiểu động; `any` cần Go 1.18 trở lên. So sánh pointer lại kiểm tra identity: hai hồ sơ được cấp riêng có thể có mọi field bằng nhau nhưng pointer khác nhau. Hãy xác định cần so cùng đối tượng, so field hay so theo quy tắc nghiệp vụ trước khi viết phép so sánh.

## Khác tên kiểu và tag không có nghĩa tự ánh xạ field

Hai kiểu struct được định nghĩa riêng là hai kiểu khác nhau, nhưng explicit conversion có thể hợp lệ khi cấu trúc nền phù hợp:

```go
type Public struct { Name string `json:"name"` }
type Internal struct { Name string `json:"display_name"` }

p := Public{Name: "An"}
i := Internal(p)
fmt.Println(i.Name) // An
```

Ở quy tắc conversion này, Go bỏ qua struct tags khi đối chiếu underlying types. Tên, thứ tự và kiểu field vẫn phải đáp ứng quy tắc; tên field không export còn có identity theo package. Tags vẫn có ý nghĩa khi xét type identity trong những ngữ cảnh khác. Vì vậy phép chuyển trên giữ nguyên chuỗi. Nó không ghép các field khác tên, đổi đơn vị, áp dụng quy tắc JSON hay kiểm tra tính hợp lệ. Những việc ấy cần code tường minh. [Quy tắc conversion](https://go.dev/ref/spec#Conversions) mô tả các điều kiện chính xác.

## Đặt tên kiểu khi mô hình được dùng chung

Có những dữ liệu chỉ cần hình dạng tại một vị trí:

```go
done := make(chan struct{})
set := map[string]struct{}{"Go": {}}

report := struct {
    Title string
    Count int
}{Title: "Daily", Count: 3}

_, _, _ = done, set, report
```

Struct không tên của `report` hợp với DTO dùng một chỗ hoặc bảng case. Khi nhiều hàm chia sẻ cùng một khái niệm, kiểu có tên giúp diễn đạt quan hệ giữa chúng rõ hơn.

`struct{}` không có field và có size bằng 0. `chan struct{}` diễn đạt tín hiệu không cần payload; `map[string]struct{}` biểu diễn tư cách thành viên mà không cần giá trị dữ liệu đi kèm. Một defined type dựa trên empty struct cũng có thể cung cấp method mà không giữ trạng thái. Những cách dùng ấy không làm channel hay map miễn phí bộ nhớ: metadata của channel, vùng chứa map và các key vẫn chiếm chỗ.

## Bố trí bộ nhớ đáng xét khi có nhiều hồ sơ

Mô hình ngôn ngữ mô tả field, còn compiler phải đặt chúng vào bộ nhớ. Alignment ràng buộc offset mà một giá trị có thể bắt đầu. Padding lấp các khoảng trống để thỏa điều kiện ấy và alignment của các struct liên tiếp.

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

fmt.Println(unsafe.Sizeof(Scattered{}), unsafe.Sizeof(Grouped{}))
// Một số target 64-bit phổ biến cho kết quả 24 và 16; còn tùy kiến trúc.
```

Đoạn này cần thêm import `unsafe`. Trên những nền tảng thông dụng có alignment 8 byte cho `int64`, `Scattered` chừa khoảng trống sau boolean đầu và thêm padding sau boolean cuối. `Grouped` đặt số nguyên cần alignment trước rồi xếp hai boolean cạnh nhau, nên giảm phần trống. `unsafe.Alignof` và `unsafe.Offsetof` còn cho phép quan sát alignment và offset từng field.

Các con số này không được bảo đảm trên mọi kiến trúc. Nhóm field theo alignment có thể có ích với tập dữ liệu lớn, nhưng cần giữ ý nghĩa mô hình và xét caller đang dùng positional literal trước khi đổi thứ tự. Hãy đo trên workload liên quan trước khi xem đây là tối ưu. Layout bộ nhớ runtime cũng không phù hợp để làm định dạng serialization di động; cần mã hóa từng field có chủ đích.

## Suy luận với một hồ sơ mới

**1.** Sau `copyOfOrder := original`, gán `copyOfOrder.Items = nil` có làm `original.Items` thành nil không? Điều này khác gì với gán một phần tử?

**2.** Struct chứa `[2]int` có làm map key được không? Nếu đổi field đó thành `[]int` thì sao?

**3.** Trong ví dụ conversion, có thể đổi `Internal.Name` thành `DisplayName` rồi mong `Internal(p)` tự ánh xạ tên không?

**Giải thích:**

1. Không. Hai field slice là hai giá trị riêng. Thay một phần mô tả không thay phần mô tả còn lại; ghi `Items[0]` lại truy cập array nền đang dùng chung.
2. Có, nếu các field khác cũng comparable. `[2]int` comparable. Field `[]int` làm struct không comparable, nên không thể dùng làm map key.
3. Không. Tên field không còn phù hợp với quy tắc conversion đang minh họa. Cần tạo `Internal{DisplayName: p.Name}` tường minh và thêm kiểm tra nếu cần.

Thói quen có ích là nhìn kiểu của từng field trước khi kết luận về sao chép, so sánh hay conversion. [Bài method](/vi/notes/go/methods/) áp dụng cùng cách suy luận cho giá trị mà receiver nhận được.

## Tài liệu đối chiếu

- [Go specification: struct types](https://go.dev/ref/spec#Struct_types), [comparison operators](https://go.dev/ref/spec#Comparison_operators), [conversions](https://go.dev/ref/spec#Conversions) và [size and alignment guarantees](https://go.dev/ref/spec#Size_and_alignment_guarantees).
- [Effective Go](https://go.dev/doc/effective_go) — composite literal và kiểu dữ liệu.
- [sync.Mutex](https://pkg.go.dev/sync#Mutex) — hạn chế sao chép sau lần dùng đầu tiên.

---
title: "Biến, hằng số và kiểu: theo dõi giá trị qua từng phép gán"
category: "Go"
tags: ["golang", "basics", "variables", "types"]
description: "Phân biệt khai báo, gán và shadowing; hiểu zero value, chuyển kiểu và hằng số để biểu đạt đúng ý nghĩa dữ liệu."
updated: 2026-10-15
translationKey: "go/variables"
---

Một biến `count` đang giữ số 10. Bạn viết thêm một dòng có `count := 20`, nhưng sau khi ra khỏi khối lệnh, `count` vẫn là 10. Để giải thích được kết quả, ta cần nhìn cả nơi khai báo tên lẫn giá trị được gán, không chỉ đọc tên biến.

Bài này theo dõi ba phần: tên cho phép truy cập biến ở đâu, kiểu cho phép biến giữ những giá trị nào, và phép gán thay đổi biến nào. Các ví dụ là những đoạn độc lập: đặt câu lệnh trong hàm, khai báo kiểu/hàm ở phạm vi package khi được trình bày như vậy, và thêm `fmt` nếu có lệnh in. Comment ghi kết quả dự kiến.

## Khai báo tạo biến; phép gán cập nhật biến

```go
var count int
var name = "An"

func example() {
    count := 10
    count = 12
    count, ready := 15, true
    fmt.Println(count, ready) // 15 true
}
```

Hai dòng `var` ở ngoài hàm tạo biến package. `var count int` chỉ rõ kiểu và chưa chỉ định giá trị, nên `count` bắt đầu bằng 0. `var name = "An"` có giá trị khởi tạo để compiler suy luận kiểu `string`; suy luận kiểu vẫn cho một kiểu được xác định khi biên dịch, không làm biến đổi kiểu tùy giá trị lúc chạy.

Bên trong `example`, `count := 10` tạo biến cục bộ mới. Tên `count` của package vẫn tồn tại, nhưng trong vùng này tên cục bộ che tên ngoài. Dòng `count = 12` cập nhật chính biến cục bộ ấy.

`:=` là **khai báo ngắn**, chỉ dùng trong hàm. Nó yêu cầu ít nhất một tên khác `_` mới trong cùng block. Vì `ready` mới, `count, ready := 15, true` hợp lệ: `count` có sẵn trong cùng block được gán lại, `ready` được khai báo. Nếu viết tiếp `count := 16` ở cùng block thì không còn tên mới và compiler báo lỗi. Với tên được dùng lại, kiểu của biến vẫn phải phù hợp với phép khai báo lại này.

## Block quyết định tên đang chỉ vào biến nào

Block thường là vùng nằm trong `{ ... }`. Một khai báo trong block con có thể che tên ở block ngoài; đó là **shadowing**:

```go
count := 10
{
    count := 20
    fmt.Println(count) // 20
}
fmt.Println(count) // 10

{
    count = 30
}
fmt.Println(count) // 30
```

Ở block đầu, dấu `:=` tạo biến khác. Khi block kết thúc, tên đó ra khỏi phạm vi nên lệnh in tiếp theo lại đọc biến ngoài. Ở block sau, dấu `=` không khai báo biến; Go tìm tên đang nhìn thấy và cập nhật biến ngoài. Khi đọc code có nhiều tầng, hãy tìm khai báo gần nhất đang có hiệu lực trước khi kết luận biến nào thay đổi.

Tên có sẵn như `int` và `len` thuộc phạm vi universe. Khai báo ngoài hàm thường thuộc phạm vi package; import thuộc phạm vi file; tham số và biến cục bộ có phạm vi trong hàm hoặc block tương ứng. Những phạm vi này giải thích tại sao hai file cùng package dùng chung biến package nhưng mỗi file vẫn cần import riêng.

Tên bắt đầu bằng chữ hoa được export khi đó là khai báo ở phạm vi package, tên field hoặc tên method. Viết hoa biến cục bộ không làm nó thành API cho package khác. Chọn tên theo ý nghĩa và phạm vi: `i` đủ cho loop ngắn; `requestTimeout` giúp người đọc hiểu cấu hình ở xa nơi dùng. Giữ initialism quen thuộc như `ID` và `URL` nhất quán.

## Gán nhiều giá trị không cần biến tạm

```go
i, j := 1, 2
i, j = j, i
fmt.Println(i, j) // 2 1
```

Go tính các giá trị bên phải trước, rồi thực hiện các phép gán bên trái. Vì vậy, cả hai giá trị cũ vẫn được dùng để đổi chỗ. Nếu thay bằng hai câu `i = j` rồi `j = i`, câu đầu đã làm mất giá trị 1 trong `i`, nên cả hai kết thúc bằng 2.

Quy tắc đánh giá này không biến câu gán thành một thao tác atomic đối với goroutine khác. Nếu dữ liệu được dùng đồng thời, vẫn cần cơ chế đồng bộ bảo vệ thao tác theo yêu cầu.

## Zero value cho trạng thái ban đầu xác định

Một biến được khai báo mà không có giá trị khởi tạo sẽ nhận **zero value** của kiểu, thay vì giữ dữ liệu ngẫu nhiên trong bộ nhớ.

| Nhóm kiểu | Zero value |
| --- | --- |
| Số nguyên, số thực, số phức | `0` |
| `bool` | `false` |
| `string` | `""` |
| Pointer, slice, map, channel, function, interface | `nil` |
| Array, struct | Mỗi phần tử hoặc field nhận zero value của kiểu riêng |

Zero value có nghĩa rõ không đồng nghĩa mọi thao tác đều hợp lệ. Có thể `append` vào nil slice, nhưng ghi vào nil map hoặc đọc giá trị qua nil pointer sẽ panic. Thiết kế một kiểu dùng được ngay ở zero value giúp caller bớt bước khởi tạo; khi zero value chưa diễn đạt đủ nghiệp vụ, cần thêm trạng thái.

Giả sử số lần thử lại bằng 0 có nghĩa “không thử lại”, còn chưa cấu hình có nghĩa “dùng mặc định 3”. Chỉ một `int` không phân biệt được hai trường hợp:

```go
type RetrySetting struct {
    Count int
    Set   bool
}

func retryCount(setting RetrySetting) (int, error) {
    if !setting.Set {
        return 3, nil
    }
    if setting.Count < 0 {
        return 0, fmt.Errorf("retry count must be non-negative")
    }
    return setting.Count, nil
}
```

`RetrySetting{}` có `Set=false`, nên trả 3. `RetrySetting{Count: 0, Set: true}` biểu đạt một giá trị được cung cấp rõ và trả 0. Kiểm tra số âm chỉ áp dụng sau khi đã xác định có cấu hình. Có thể dùng `*int` với nil biểu thị vắng mặt, nhưng cần giải thích thêm ý nghĩa nil và việc chia sẻ pointer. Hai field ở đây giúp tách giá trị khỏi trạng thái hiện diện; [bài struct](/vi/notes/go/structs/) giải thích cú pháp gom field.

## Kiểu số và chuyển kiểu có giới hạn

Go có `int` và `uint` với độ rộng phụ thuộc kiến trúc, các kiểu cố định `int8` đến `int64`, `uint8` đến `uint64`, cùng `uintptr`. Các nhóm còn lại gồm `float32`/`float64`, `complex64`/`complex128`, `bool` và `string`. `byte` là alias của `uint8`; `rune` là alias của `int32`. Thường dùng `int` cho bộ đếm và index; chọn độ rộng cố định khi giao thức hay định dạng dữ liệu yêu cầu.

```go
x := 10
y := 5.5
z := float64(x) + y
fmt.Println(z) // 15.5
```

`x` có kiểu `int`, `y` có kiểu `float64`. Go không tự đổi một biến số nguyên sang số thực để cộng hai biến này, nên ta viết conversion `float64(x)`. Conversion tạo giá trị dùng trong biểu thức, không thay kiểu đã khai báo của `x`.

Chuyển kiểu không bảo đảm giữ nguyên số: chuyển số thực sang số nguyên bỏ phần lẻ theo hướng về 0; chuyển số nguyên sang kiểu hẹp hơn có thể mất bit. Hằng số ngoài miền biểu diễn có thể bị từ chối lúc biên dịch, còn conversion của giá trị biến có quy tắc khác. Với số thực ngoài miền biểu diễn của kiểu số nguyên đích, không dựa vào một kết quả chuyển đổi tùy tiện. Không dùng `float64` cho tiền khi hợp đồng yêu cầu số học thập phân chính xác; số nguyên theo đơn vị nhỏ nhất hoặc một cách biểu diễn thập phân phù hợp cần được chọn theo miền giá trị.

String là dãy byte bất biến. `len(s)` đếm byte; một ký tự Unicode có thể chiếm nhiều byte, và một ký tự người dùng nhìn thấy có thể gồm nhiều rune. Bài [điều khiển luồng](/vi/notes/go/flow/) sẽ dùng `range` để làm rõ cách đọc string.

## Hằng số chưa cần gắn với một kiểu cụ thể

```go
const rate = 1.25
var a float32 = rate
var b float64 = rate

const MaxRetries int = 3
```

`rate` là hằng số không có kiểu (*untyped constant*). Khi gán vào `a` hoặc `b`, ngữ cảnh chọn kiểu số tương ứng nếu hằng số biểu diễn được theo quy tắc của kiểu đích. Điều này khác với một biến `float64`, vốn không thể gán thẳng vào biến `float32` mà thiếu conversion. Không phải hằng số nào cũng dùng được với mọi kiểu: chẳng hạn `1.25` không biểu diễn một số nguyên.

Các biểu thức hằng số được đánh giá khi biên dịch với độ chính xác cao; chúng không phải object có thể sửa lúc chạy. `MaxRetries` được khai báo có kiểu `int`, nên mất sự linh hoạt về kiểu của một hằng số không có kiểu. Khi dùng khai báo ngắn như `value := rate`, Go chọn kiểu mặc định cho hằng số này là `float64`.

## Tạo kiểu có ý nghĩa và đặt tên các trạng thái

```go
type Celsius float64
type Fahrenheit float64
type Temperature = Celsius

var c Celsius = 100
f := Fahrenheit(c) // conversion, not a temperature formula
_ = f
```

`Celsius` và `Fahrenheit` là hai defined type khác nhau dù cùng kiểu nền `float64`. Sự khác biệt buộc người viết thể hiện conversion ở những chỗ cần thiết. Tuy nhiên, `Fahrenheit(c)` chỉ chuyển kiểu số; 100 vẫn là 100, không tự trở thành 212. Công thức chuyển nhiệt độ phải được viết rõ trong một hàm. `Temperature` là alias, một tên khác cho chính kiểu `Celsius`, nên không tạo ranh giới kiểu mới.

Để đặt tên cho các trạng thái số nguyên, có thể kết hợp defined type với `iota`:

```go
type Status int

const (
    Pending Status = iota
    Active
    Closed
)
```

Trong mỗi block `const`, `iota` bắt đầu bằng 0 và tăng theo từng khai báo `ConstSpec`. Các dòng bỏ biểu thức lặp lại biểu thức và kiểu trước đó, nên ba giá trị lần lượt là 0, 1, 2 và đều có kiểu `Status`. Một block khác bắt đầu lại từ 0.

Cách viết này chưa tạo enum đóng: `Status(99)` vẫn hợp lệ về kiểu. Khi nhận số từ API hoặc file, cần kiểm tra số ấy thuộc trạng thái được hỗ trợ. Kiểu giúp tránh trộn lẫn các nhóm giá trị; validation mới kiểm tra ý nghĩa bên trong nhóm.

## Tự kiểm tra bằng các thay đổi nhỏ

**1.** Trong ví dụ shadowing, đổi `count := 20` thành `count = 20`. Lệnh in ngay sau block đầu sẽ đọc gì?

**2.** `a, err := ...` có luôn hợp lệ nếu `a` đã tồn tại không? Hãy xét trường hợp cả `a` và `err` đã được khai báo trong cùng block.

**3.** Vì sao `RetrySetting{Count: 0, Set: true}` không nên bị thay bằng `RetrySetting{}` khi lưu cấu hình?

**Giải thích:**

1. Nó đọc 20 vì phép gán cập nhật biến ngoài, không tạo biến mới.
2. Không luôn hợp lệ. Cần ít nhất một tên mới khác `_` trong cùng block và phải thỏa quy tắc kiểu. Nếu cả hai đã có ở block đó, dùng `=` để gán lại. Nếu tên chỉ có ở block ngoài, `:=` có thể tạo biến mới và che tên ngoài.
3. Hai giá trị lần lượt biểu đạt “đã chọn 0” và “chưa cung cấp”. Làm mất `Set` khiến lần đọc sau áp dụng mặc định 3, thay đổi ý nghĩa cấu hình.

## Tài liệu đối chiếu

- [Go specification: declarations and scope](https://go.dev/ref/spec#Declarations_and_scope), [short declarations](https://go.dev/ref/spec#Short_variable_declarations) — phạm vi và khai báo lại.
- [Constants](https://go.dev/ref/spec#Constants), [conversions](https://go.dev/ref/spec#Conversions), [zero value](https://go.dev/ref/spec#The_zero_value) — quy tắc giá trị và kiểu.
- [Effective Go](https://go.dev/doc/effective_go) — đặt tên và dùng khai báo trong code Go.

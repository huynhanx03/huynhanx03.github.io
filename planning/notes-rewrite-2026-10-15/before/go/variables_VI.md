---
title: "Biến, hằng số và kiểu: đọc đúng dữ liệu trong Go"
category: "Go"
tags: ["golang", "basics", "variables", "types"]
description: "Biến có tên, kiểu và giá trị. Hiểu ba phần này giúp bạn biết một phép gán có tạo biến mới không, giá trị mặc định là gì và khi nào cần chuyển kiểu."
updated: 2026-10-14
translationKey: "go/variables"
---

Biến có tên, kiểu và giá trị. Hiểu ba phần này giúp bạn biết một phép gán có tạo biến mới không, giá trị mặc định là gì và khi nào cần chuyển kiểu.

## 1. Khai báo và gán là hai thao tác khác nhau

```go
var count int
var name = "An"

func example() {
    count := 10
    count = 12
    count, ready := 15, true
    fmt.Println(count, ready)
}
```

`var count int` tạo biến bằng zero value. `var name = "An"` suy luận kiểu string. `:=` chỉ dùng trong hàm; ít nhất một tên khác `_` phải mới trong cùng block. Trong `count, ready := ...`, count được gán lại còn ready được khai báo. Một block lồng nhau có thể tạo count khác: đó là shadowing, không phải cập nhật biến ngoài.

```go
i, j := 1, 2
i, j = j, i
fmt.Println(i, j) // 2 1
```

Vế phải được tính trước khi gán, nên swap không cần biến tạm. Tuy nhiên đây không phải phép atomic giữa nhiều goroutine; truy cập đồng thời vẫn cần đồng bộ.

## 2. Zero value là gì?

| Nhóm kiểu | Zero value |
|---|---|
| Số nguyên, số thực, số phức | `0` |
| bool | `false` |
| string | `""` |
| pointer, slice, map, channel, function, interface | `nil` |
| array, struct | Mỗi phần tử/trường có zero value riêng |

Có zero value không đồng nghĩa mọi thao tác đều hợp lệ: append vào nil slice được, nhưng ghi vào nil map hoặc dereference nil pointer sẽ panic. Thiết kế một kiểu có zero value dùng được sẽ làm API thuận tiện hơn.

## 3. Các kiểu cơ bản và chuyển kiểu

Go có int/uint theo kiến trúc, các kiểu độ rộng cố định int8…int64 và uint8…uint64, float32/float64, complex64/complex128, bool và string. `byte` là alias của uint8; `rune` là alias của int32. String là dãy byte bất biến, không phải dãy ký tự có thể sửa trực tiếp. Chọn int cho chỉ số thông thường; chọn độ rộng cố định khi định dạng dữ liệu yêu cầu.

```go
x := 10
y := 5.5
z := float64(x) + y
fmt.Println(z) // 15.5
```

Conversion nói rõ ý định, nhưng không bảo đảm giữ nguyên giá trị: float sang int bỏ phần thập phân; số nguyên sang kiểu nhỏ hơn có thể mất bit. Không dùng float64 để lưu tiền nếu nghiệp vụ yêu cầu độ chính xác thập phân tuyệt đối.

## 4. Hằng số có kiểu và không có kiểu

```go
const rate = 1.25
var a float32 = rate
var b float64 = rate

const MaxRetries int = 3
```

Hằng số không có kiểu như rate có thể được dùng trong các ngữ cảnh số phù hợp, nếu giá trị biểu diễn được trong kiểu đích. Không phải mọi constant đều tương thích mọi kiểu. Hằng số số học được tính với độ chính xác cao khi biên dịch, không phải một object có thể sửa lúc chạy.

## 5. iota và kiểu trạng thái

```go
type Status int

const (
    Pending Status = iota
    Active
    Closed
)
```

iota bắt đầu từ 0 và tăng theo từng dòng khai báo const trong block; block mới bắt đầu lại. Dòng bỏ trống biểu thức lặp lại biểu thức trước. Đây là tiện ích để đặt tên trạng thái, không tạo enum đóng: biến Status vẫn có thể nhận `Status(99)`, nên input bên ngoài cần validation.

## 6. Defined type, alias và phạm vi tên

```go
type Celsius float64
type Fahrenheit float64
type Temperature = Celsius

var c Celsius = 100
f := Fahrenheit(c) // conversion, not a temperature formula
_ = f
```

`type Celsius float64` tạo kiểu mới; `type Temperature = Celsius` tạo tên khác cho cùng kiểu. Chuyển Celsius sang Fahrenheit chỉ đổi kiểu số, không tự thực hiện công thức nhiệt độ. Phạm vi tên gồm universe, package, file (như import) và block. Tên bắt đầu bằng chữ hoa có thể được export khi khai báo ở nơi ngôn ngữ cho phép, như tên package-level, field và method; biến cục bộ viết hoa không tự trở thành API.

Đặt tên theo ý nghĩa và độ rộng phạm vi: i phù hợp cho loop ngắn, requestTimeout phù hợp cho cấu hình. ID/URL giữ dạng initialism thông dụng. Tránh tên quá ngắn khi người đọc phải tìm nhiều nơi để hiểu.

## Ví dụ áp dụng

### Tình huống: phân biệt “chưa cấu hình” và số 0

Zero value hữu ích, nhưng không phải lúc nào cũng biểu đạt đủ ý nghĩa. Với số lần thử lại, 0 có thể có nghĩa “không thử lại”, khác với “dùng mặc định”. Thêm một trạng thái hiện diện để phân biệt hai trường hợp.

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

RetrySetting{} cho kết quả 3; RetrySetting{Count: 0, Set: true} cho kết quả 0. Việc kiểm tra âm chỉ áp dụng cho giá trị được cung cấp. Có thể dùng *int thay cho hai field, nhưng khi đó cần giải thích nil và việc chia sẻ pointer. Chọn cách làm rõ hợp đồng dữ liệu nhất.

## Tự kiểm tra

Giải thích tại sao `a, err := ...` có thể hợp lệ khi a đã tồn tại. Phân biệt type mới và alias, rồi tìm một ví dụ shadowing trong code bạn đang viết.

## Tài liệu đối chiếu

- [Go language specification](https://go.dev/ref/spec)
- [Effective Go](https://go.dev/doc/effective_go)

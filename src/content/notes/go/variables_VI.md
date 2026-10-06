---
title: "Variables"
category: "Go"
tags: ["golang", "basics", "variables", "types"]
---

# Biến: Những viên gạch đầu tiên

Sau khi đã thấu hiểu triết lý, hãy bắt đầu đặt những viên gạch đầu tiên cho mã nguồn của bạn. Trong chương này, chúng ta sẽ tìm hiểu cách Go định nghĩa dữ liệu thông qua Biến (Variables), Hằng số (Constants) và các Kiểu dữ liệu cơ bản.

## 1. Khai báo Biến

Có hai phương thức phổ biến để khai báo biến trong Go. Sự khác biệt nằm ở tính **tường minh** và **sự tiện dụng**.

### Sử dụng từ khóa `var`
Phương thức này cho phép bạn khai báo biến ở cấp độ Gói (Package) hoặc bên trong Hàm (Function).

```go
var name string = "Gopher"
var age int = 15
```

### Toán tử khai báo ngắn `:=`
Đây là cách viết cực kỳ phổ biến nhưng chỉ có hiệu lực **bên trong** Hàm. Go sẽ tự động suy luận kiểu dữ liệu (Type Inference) dựa trên giá trị khởi tạo.

```go
location := "Vietnam" // Go tự hiểu đây là chuỗi (string)
count := 10           // Go tự hiểu đây là số nguyên (int)
```

> Khi sử dụng `:=`, ít nhất một biến ở vế trái phải là biến mới được tạo. Nếu tất cả biến đã được khai báo trước đó, bạn bắt buộc phải dùng toán tử gán `=` thông thường.

### Gán giá trị đồng loạt (Tuple Assignment)

Go cho phép gán nhiều giá trị cùng lúc trên một dòng mã. Điều này đặc biệt hữu dụng khi bạn muốn hoán đổi (swap) giá trị mà không cần đến biến trung gian:

```go
i, j = j, i // Hoán đổi giá trị giữa i và j
```

## 2. Giá trị mặc định (Zero Values)

Một trong những ưu điểm của Go là: **Biến luôn được khởi tạo với một giá trị mặc định.** Bạn sẽ không bao giờ gặp phải lỗi "truy cập vùng nhớ chưa xác định" như trong các ngôn ngữ bậc thấp khác.

| Kiểu dữ liệu | Giá trị mặc định (Zero Value) |
| :--- | :--- |
| `int`, `float` | `0` |
| `string` | `""` (Chuỗi rỗng) |
| `bool` | `false` |
| `pointer`, `interface`, `slice`, `map` | `nil` |

## 3. Các kiểu dữ liệu cơ bản

Go phân chia kiểu dữ liệu rất rạch ròi để tối ưu hóa việc sử dụng bộ nhớ:

- **Số nguyên (Integers):** Bao gồm `int8`, `int16`, `int32`, `int64` và `uint` (số không âm). Trong đa số trường hợp, chúng ta chỉ cần dùng `int`.
- **Số thực (Floating Point):** `float32`, `float64`.
- **Logic:** `bool` (chỉ nhận giá trị `true` hoặc `false`).
- **Chuỗi:** `string`.

## 4. Hằng số (Constants)

Hằng số là những giá trị cố định, không thay đổi trong suốt vòng đời của chương trình.

```go
const Pi = 3.14
const StatusOK = 200
```

> **Untyped Constants:** Hằng số trong Go có độ chính xác cao và không bị gò bó vào một kiểu dữ liệu konkrét cho đến khi được sử dụng thực tế. Điều này cho phép bạn viết mã linh hoạt hơn, ví dụ: `Math.Pi * distance` mà không cần quan tâm `distance` thuộc kiểu `float32` hay `float64`.

### Đặc sản `iota` (Enumerator)

Go cung cấp từ khóa `iota` để tạo ra chuỗi hằng số tăng dần một cách thanh lịch, cực kỳ hữu ích khi định nghĩa các trạng thái (Enum):

```go
const (
    Pending = iota // 0
    Active         // 1
    Closed         // 2
)
```
Mỗi khi xuất hiện trong một khối `const`, `iota` sẽ tự động tăng giá trị bắt đầu từ 0.

## 5. Định nghĩa kiểu dữ liệu mới (Type Declarations)

Đây là công cụ mạnh mẽ giúp mã nguồn trở nên tường minh. Bạn có thể tạo ra một kiểu dữ liệu mới dựa trên một kiểu nền tảng có sẵn:

```go
type Celsius float64
type Fahrenheit float64

var c Celsius = 100
// var f Fahrenheit = c // LỖI! Dù cùng là float64 nhưng khác Type.
```

Kỹ thuật này giúp bạn tránh được những lỗi logic sơ đẳng, ví dụ như vô tình cộng giá trị nhiệt độ vào giá trị tiền tệ.

## 6. Phạm vi hoạt động (Scope)

- **Package Scope (Phạm vi Gói):** Biến được khai báo bên ngoài Hàm, có thể truy cập từ mọi tệp tin trong cùng một Gói.
- **Local Scope (Phạm vi Cục bộ):** Biến được khai báo bên trong Hàm, chỉ tồn tại trong phạm vi cặp ngoặc `{}` bao quanh nó.
- **Universe Scope (Phạm vi Toàn vũ trụ):** Bao gồm các thực thể đã được định nghĩa sẵn bởi ngôn ngữ như `int`, `string`, `true`, `false`.

## 7. Quy tắc đặt tên (Naming Convention)

Để mã nguồn luôn "Sạch", hãy tuân thủ phong cách của các Gopher:
- Sử dụng **camelCase** (chữ cái đầu viết thường, các từ sau viết hoa chữ cái đầu) thay vì snake_case.
- Ưu tiên sự ngắn gọn nhưng súc tích (ví dụ: `i` cho chỉ số vòng lặp, `err` cho biến lỗi).
- **Tính công khai:** Nếu tên bắt đầu bằng chữ cái VIẾT HOA (ví dụ: `User`), nó sẽ là **Exported** (có thể truy cập từ gói khác). Ngược lại (ví dụ: `user`), nó là **Unexported** (chỉ sử dụng nội bộ).

---

> Go là ngôn ngữ **Strongly Typed** (định kiểu mạnh). Bạn không thể thực hiện các phép toán giữa các kiểu dữ liệu khác nhau (ví dụ: cộng `int` với `float64`) mà không thực hiện chuyển đổi kiểu (casting) một cách tường minh.

**Ví dụ:**
```go
var x int = 10
var y float64 = 5.5
// z := x + y // LỖI BIÊN DỊCH!
z := float64(x) + y // CHÍNH XÁC
```

---

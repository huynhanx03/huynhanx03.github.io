---
title: "The Logic Flow"
category: "Go"
tags: ["golang", "basics", "flow-control", "loops"]
---

# Điều khiển luồng: Dòng chảy của mã nguồn

Trong bất kỳ ngôn ngữ lập trình nào, việc điều khiển luồng thực thi (Control Flow) là kiến thức nền tảng. Go giữ cho phần này cực kỳ tinh gọn bằng cách loại bỏ những cú pháp dư thừa và tập trung tối đa vào sự rõ ràng.

## 1. Cấu trúc Điều kiện `if`

`if` trong Go rất quen thuộc, nhưng có hai điểm khác biệt đáng lưu ý:
1. Không cần dấu ngoặc đơn `()` bao quanh điều kiện.
2. Có thể thực thi một **Câu lệnh khởi tạo ngắn** ngay trước khi kiểm tra điều kiện.

```go
// Cách viết cơ bản
if x > 10 {
    fmt.Println("X lớn hơn 10")
}

// Cách viết nâng cao: Khai báo biến ngay trong câu lệnh if
// Biến v chỉ tồn tại bên trong phạm vi (Scope) của khối if/else này
if v := calculateValue(); v < 100 {
    fmt.Println("Giá trị nhỏ:", v)
} else {
    fmt.Println("Giá trị lớn:", v)
}
```

## 2. Sức mạnh của `switch`

`switch` trong Go linh hoạt và mạnh mẽ hơn nhiều so với C hay Java:
- Bạn không cần viết `break` ở cuối mỗi nhánh (case) vì Go tự động thực hiện điều đó.
- Bạn có thể so sánh mọi kiểu dữ liệu, không chỉ giới hạn ở số nguyên.
- Bạn có thể sử dụng `switch` mà không cần giá trị so sánh (**Switch true**). Khi đó, nó hoạt động như một chuỗi `if-else if` dài, giúp mã nguồn sạch sẽ hơn.

```go
// Switch cơ bản với giá trị khởi tạo
switch os := runtime.GOOS; os {
case "darwin":
    fmt.Println("Hệ điều hành macOS")
case "linux":
    fmt.Println("Hệ điều hành Linux")
default:
    fmt.Println("Các hệ điều hành khác")
}

// Switch thay thế if-else (Switch true)
hour := time.Now().Hour()
switch {
case hour < 12:
    fmt.Println("Chào buổi sáng")
case hour < 17:
    fmt.Println("Chào buổi chiều")
default:
    fmt.Println("Chào buổi tối")
}
```

### Từ khóa `fallthrough`
Mặc dù Go tự động break ở cuối mỗi case, đôi khi bạn thực sự muốn chương trình chạy tiếp xuống case bên dưới. Bạn có thể dùng `fallthrough`. Tuy nhiên, hãy thận trọng vì nó khiến logic trở nên khó kiểm soát hơn.

## 3. `for` - Vòng lặp duy nhất

Go không sử dụng `while` hay `do-while`. Mọi kịch bản lặp đều được gói gọn trong từ khóa `for`. Điều này tạo nên sự nhất quán và cực kỳ dễ đọc.

### Vòng lặp `for` truyền thống
```go
for i := 0; i < 10; i++ {
    fmt.Println(i)
}
```

### Sử dụng `for` thay thế `while`
Bằng cách lược bỏ phần khởi tạo và bước nhảy, bạn sẽ có một vòng lặp kiểm tra điều kiện tương tự `while`.
```go
sum := 1
for sum < 1000 {
    sum += sum
}
```

### Vòng lặp vô hạn
```go
for {
    // Thực thi mãi mãi cho đến khi gặp lệnh break hoặc return
}
```

### Duyệt qua Tập hợp (Sử dụng `range`)
Đây là phương thức phổ biến và an toàn nhất để duyệt qua Array, Slice, Map hoặc String.
```go
nums := []int{2, 3, 4}
for index, value := range nums {
    fmt.Printf("Chỉ số: %d, Giá trị: %d\n", index, value)
}
```

> **Giải mã Unicode:** Khi duyệt `range` trên một chuỗi (string), Go sẽ tự động giải mã các ký tự UTF-8 (Runes). Nếu chuỗi chứa các ký tự đa byte (như tiếng Việt hay Emoji), `index` sẽ là vị trí byte bắt đầu của ký tự đó, chứ không đơn thuần là số thứ tự ký tự.

### Vòng lặp có nhãn (Labeled Loops)
Trong những tình huống vòng lặp lồng nhau phức tạp, Go cho phép bạn đặt nhãn (Label) để có thể `break` hoặc `continue` ra hẳn vòng lặp bên ngoài.

```go
outer:
    for i := 0; i < 5; i++ {
        for j := 0; j < 5; j++ {
            if i*j > 10 {
                break outer // Thoát khỏi cả hai vòng lặp
            }
        }
    }
```

---

> Hãy luôn ưu tiên sử dụng `range` khi làm việc với các Tập hợp (Collections) vì nó giúp mã nguồn an toàn, tránh được các lỗi truy cập ngoài phạm vi (out of bounds).

---

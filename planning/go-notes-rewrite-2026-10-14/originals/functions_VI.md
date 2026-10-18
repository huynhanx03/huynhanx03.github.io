---
title: "Functional Mastery"
category: "Go"
tags: ["golang", "basics", "functions", "closures"]
---

# Hàm: Trái tim của Logic chương trình

Trong Go, Hàm (Function) được tôn trọng như một **Công dân hạng nhất** (First-class citizen). Điều này đồng nghĩa với việc bạn có thể coi Hàm như một biến: có thể truyền Hàm vào một Hàm khác, hoặc trả về một Hàm như một kết quả.

## 1. Khai báo Hàm cơ bản

Cú pháp của Go nhấn mạnh sự rõ ràng: từ khóa `func` + `tên hàm` + `tham số` + `kiểu trả về`.

```go
func add(x int, y int) int {
    return x + y
}

// Nếu các tham số có cùng kiểu dữ liệu, bạn có thể viết gọn lại:
func addShorter(x, y int) int {
    return x + y
}
```

## 2. Đệ quy (Recursion)

Hàm trong Go hỗ trợ đệ quy một cách mạnh mẽ. Một hàm có thể tự gọi lại chính nó để giải quyết các bài toán phân tách nhỏ hơn.

```go
func factorial(n int) int {
    if n == 0 {
        return 1
    }
    return n * factorial(n-1)
}
```

## 3. Trả về nhiều giá trị (Multiple Return Values)

Đây là vũ khí đặc sắc của Go, thường được áp dụng để trả về kết quả đi kèm với một thông báo lỗi (**error**).

```go
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("không thể chia cho số 0")
    }
    return a / b, nil
}

// Cách sử dụng điển hình:
result, err := divide(10, 2)
```

## 3. Trả về giá trị có tên (Named Return Values)

Go cho phép bạn định danh sẵn các giá trị trả về ngay tại phần khai báo. Chúng hành xử như những biến cục bộ đã được khởi tạo ở đầu hàm.

```go
func split(sum int) (x, y int) {
    x = sum * 4 / 9
    y = sum - x
    return // Tự động trả về giá trị hiện tại của x và y (Naked return)
}
```
> Chỉ nên sử dụng "Naked return" trong các hàm ngắn và đơn giản để đảm bảo tính dễ đọc.

## 4. Hàm cũng là Dữ liệu (Function Values)

Trong Go, Hàm không chỉ là mã thực thi mà còn là một kiểu dữ liệu. Bạn có thể gán hàm cho biến, hoặc truyền chúng như tham số.

```go
func applyOperation(a, b int, op func(int, int) int) int {
    return op(a, b)
}

// Sử dụng: applyOperation(10, 5, add)
```

## 5. Hàm ẩn danh và Closures

Bạn có thể khởi tạo một Hàm mà không cần đặt tên, gán nó vào biến hoặc thực thi ngay tại chỗ. Một Hàm có khả năng "ghi nhớ" các biến nằm ngoài phạm vi bao quanh nó được gọi là một **Closure**.

```go
func intSeq() func() int {
    i := 0
    return func() int {
        i++
        return i
    }
}

func main() {
    nextId := intSeq()
    fmt.Println(nextId()) // Kết quả: 1
    fmt.Println(nextId()) // Kết quả: 2
    
    newNextId := intSeq()
    fmt.Println(newNextId()) // Kết quả: 1 (Một "không gian" bộ nhớ riêng biệt)
}
```

## 5. Hàm có số lượng tham số tùy biến (Variadic Functions)

Một Hàm có thể tiếp nhận số lượng đối số không giới hạn bằng cách sử dụng ký hiệu `...`.

```go
func sumAll(nums ...int) int {
    total := 0
    for _, num := range nums {
        total += num
    }
    return total
}

// Gọi hàm linh hoạt: sumAll(1, 2, 3, 4, 5)
```

## 7. Trì hoãn thực thi với `defer`

`defer` là một tính năng cực kỳ quan trọng giúp quản lý tài nguyên (đóng tệp tin, giải phóng khóa...). Các lệnh `defer` sẽ được thực thi ngay trước khi hàm bao quanh nó thoát ra, theo cơ tự LIFO (Vào sau - Ra trước).

```go
func readFile(filename string) {
    f, _ := os.Open(filename)
    defer f.Close() // Chắc chắn tệp sẽ được đóng dù hàm có lỗi hay thoát sớm
    
    // Xử lý tệp...
}
```

> **Cái bẫy của `defer`:** Các tham số truyền vào hàm `defer` được **tính toán ngay lập tức** tại thời điểm gọi lệnh `defer`, chứ không phải lúc hàm thực thi.
> Ví dụ: nếu bạn `defer fmt.Println(c)`, giá trị của `c` được in ra sẽ là giá trị tại dòng có chữ `defer`, dù sau đó `c` có thay đổi thế nào đi nữa.

---

> Hãy luôn trả về `error` như là giá trị cuối cùng trong danh sách trả về nếu Hàm của bạn có khả năng phát sinh lỗi. Đây là chuẩn mực tối thượng trong cộng đồng Go.

---

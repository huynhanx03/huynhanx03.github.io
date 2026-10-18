---
title: "Hàm: tham số, kết quả, closure và defer"
category: "Go"
tags: ["golang", "basics", "functions", "closures"]
description: "Một hàm nên có trách nhiệm và hợp đồng rõ: nhận gì, trả gì, có thể thất bại ra sao và có sửa dữ liệu dùng chung không. Bài này giải thích các công cụ Go dùng để biểu đạt hợp đồng đó."
updated: 2026-10-14
translationKey: "go/functions"
---

Một hàm nên có trách nhiệm và hợp đồng rõ: nhận gì, trả gì, có thể thất bại ra sao và có sửa dữ liệu dùng chung không. Bài này giải thích các công cụ Go dùng để biểu đạt hợp đồng đó.

## 1. Khai báo và truyền tham số

```go
func add(x, y int) int {
    return x + y
}

func apply(a, b int, operation func(int, int) int) int {
    return operation(a, b)
}
```

x, y int là cách rút gọn hai tham số cùng kiểu. Go truyền mọi đối số bằng giá trị, kể cả pointer, slice và map. Bản sao của các kiểu có tham chiếu có thể vẫn trỏ tới dữ liệu dùng chung; vì vậy pass-by-value không có nghĩa mọi thay đổi được cô lập. `apply(10, 5, add)` trả 15; tham số operation cho thấy hàm cũng là dữ liệu.

## 2. Nhiều kết quả và error

```go
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}
```

Đoạn này cần import errors. Caller phải kiểm tra error trước khi dùng kết quả theo hợp đồng. Kết quả số 0 khi lỗi không phải phép chia thành công. Đặt error cuối là convention phổ biến, không phải yêu cầu compiler áp đặt cho mọi hàm.

## 3. Kết quả có tên

```go
func split(total int) (first, second int) {
    first = total * 4 / 9
    second = total - first
    return first, second
}
```

Named results là biến cục bộ có zero value khi vào hàm. Có thể dùng return không đối số, nhưng ở hàm dài người đọc sẽ khó thấy giá trị nào được trả. Defer có thể sửa named result sau khi return đã tính biểu thức; chỉ sử dụng khi cần và giải thích rõ.

## 4. Hàm ẩn danh và closure

```go
func sequence() func() int {
    next := 0
    return func() int {
        next++
        return next
    }
}

first := sequence()
fmt.Println(first(), first()) // 1 2
second := sequence()
fmt.Println(second()) // 1
```

Mỗi lần sequence tạo một biến next riêng. Closure giữ biến ấy sống sau khi sequence trả về; nó giữ biến, không chụp một giá trị bất biến tại thời điểm tạo hàm. Hai goroutine gọi cùng first có thể race trên next. Function value chưa khởi tạo là nil, gọi nó sẽ panic; function chỉ so sánh được với nil.

## 5. Variadic và slice

```go
func sumAll(nums ...int) int {
    total := 0
    for _, n := range nums {
        total += n
    }
    return total
}

values := []int{1, 2, 3}
fmt.Println(sumAll(), sumAll(1, 2), sumAll(values...)) // 0 3 6
```

Tham số variadic phải đứng cuối và trong hàm có kiểu slice. Gọi với values... truyền slice đó, nên sửa phần tử nums có thể ảnh hưởng values. API không được mô tả nhận vô hạn đối số: lượng dữ liệu vẫn bị giới hạn bởi bộ nhớ và thời gian xử lý.

## 6. Đệ quy cần điều kiện dừng

```go
func factorial(n uint) uint64 {
    if n <= 1 {
        return 1
    }
    return uint64(n) * factorial(n-1)
}
```

Ví dụ này chỉ phù hợp n≤20 vì uint64 sẽ tràn với giai thừa lớn hơn. Mỗi lời gọi làm n nhỏ đi và giữ công việc còn lại trên stack. Hàm đệ quy cần base case, tiến về base case và giới hạn input; Go không bảo đảm tối ưu tail call. Với bài toán đơn giản, vòng lặp có thể ít tốn stack hơn.

## 7. defer: lịch dọn dẹp theo vòng đời hàm

```go
func readFile(name string) ([]byte, error) {
    f, err := os.Open(name)
    if err != nil {
        return nil, err
    }
    defer f.Close()
    return io.ReadAll(f)
}
```

Đoạn này cần os và io. Chỉ defer Close sau khi Open thành công. Defer chạy theo LIFO khi hàm return hoặc unwinding do panic, nhưng không chạy khi os.Exit kết thúc process. Ví dụ đọc bỏ qua lỗi Close theo chủ đích; với file ghi, lỗi Flush/Close có thể ảnh hưởng tính đúng và cần xử lý.

```go
value := 1
defer fmt.Println(value)
defer func() { fmt.Println(value) }()
value = 2
// At function exit: 2, then 1.
```

Đối số của defer được tính ngay khi đăng ký. Closure lại đọc biến lúc chạy. Đặt defer trong loop dài sẽ tích lũy việc dọn dẹp đến khi hàm ngoài thoát; tách xử lý một lượt thành hàm riêng nếu cần đóng tài nguyên sau từng lượt.

## Ví dụ áp dụng

### Tình huống: closure giữ trạng thái riêng

Một hàm có thể tạo và trả hàm khác. Mỗi lần gọi hàm tạo dưới đây sinh một biến n riêng; hàm được trả về tiếp tục truy cập biến đó sau khi hàm tạo kết thúc.

```go
func counter(start int) func() int {
    n := start
    return func() int {
        n++
        return n
    }
}

a := counter(10)
b := counter(10)
fmt.Println(a(), a(), b()) // 11 12 11
```

Hai lần gọi a dùng chung biến của a; b có biến khác. Closure giữ biến, không chụp một bản sao bất biến của giá trị. Nếu nhiều goroutine gọi cùng a, cần đồng bộ việc tăng n. Đây là ví dụ tạo hàm ở phạm vi package và gọi trong main; cần fmt để in kết quả.

## Tự kiểm tra

Giải thích output của hai defer. Sau đó chỉ ra dữ liệu nào được chia sẻ khi truyền slice cho một hàm.

## Tài liệu đối chiếu

- [Go language specification](https://go.dev/ref/spec)
- [Effective Go](https://go.dev/doc/effective_go)

---
title: "Hàm: dữ liệu đi vào, kết quả đi ra và công việc để lại"
category: "Go"
tags: ["golang", "basics", "functions", "closures"]
description: "Hiểu truyền bằng giá trị, nhiều kết quả, closure, variadic, đệ quy và defer bằng cách theo dõi dữ liệu cùng vòng đời một lần gọi hàm."
updated: 2026-10-15
translationKey: "go/functions"
---

Một hàm tính ra số đúng chưa đủ để caller dùng đúng. Caller còn cần biết đầu vào có bị sửa không, kết quả nào dùng được khi lỗi và tài nguyên được đóng vào lúc nào. Đó là những phần của hợp đồng hàm mà chữ ký và thân hàm cần làm rõ.

Bài này nối các quy tắc ấy với từng lần gọi cụ thể. Bạn cần biết biến và vòng lặp. Các ví dụ độc lập: khai báo hàm ở phạm vi package, đặt các câu lệnh gọi trong `main` hoặc hàm phù hợp, và thêm import được sử dụng. Comment mô tả kết quả dự kiến, không phải báo cáo thực thi.

## Một lời gọi tạo ra các biến tham số riêng

```go
func add(x, y int) int {
    return x + y
}

func apply(a, b int, operation func(int, int) int) int {
    return operation(a, b)
}
```

`x, y int` là cách viết gộp hai tham số cùng kiểu `int`; kiểu kết quả nằm sau danh sách tham số. Khi gọi `add(10, 5)`, hàm nhận hai giá trị vào các biến tham số `x` và `y`, tính 15 rồi trả giá trị đó cho nơi gọi. Gán lại `x` trong hàm không gán lại biến mà caller đã dùng làm đối số.

Tham số `operation` có kiểu hàm nhận hai `int` và trả một `int`. Vì `add` có chữ ký phù hợp, `apply(10, 5, add)` gọi `add` và trả 15. Ta truyền giá trị hàm `add`, chưa gọi nó tại vị trí đối số. Khả năng giữ và truyền hàm như dữ liệu cho phép caller chọn phép xử lý mà không thay phần điều phối trong `apply`.

Go truyền **mọi đối số bằng giá trị**. Với pointer, giá trị được chép là pointer; với slice, bản sao vẫn có thể mô tả cùng array; với map, bản sao vẫn truy cập cùng dữ liệu map. Vì vậy, một biến tham số riêng chưa đồng nghĩa dữ liệu bên trong độc lập:

```go
func doubleFirst(values []int) {
    if len(values) == 0 {
        return
    }
    values[0] *= 2
}

scores := []int{10, 20}
doubleFirst(scores)
fmt.Println(scores) // [20 20]
```

`values` riêng về giá trị slice nhưng vẫn truy cập phần tử đầu của array mà `scores` dùng. Nhánh rỗng bảo đảm không index phần tử không có. Ngược lại, gán lại `values` thành slice khác chỉ thay tham số. [Bài slice](/vi/notes/go/slices/) theo dõi kỹ khác biệt giữa sửa phần tử và trả slice mới sau `append`; [bài pointer](/vi/notes/go/pointers/) giải thích việc sao chép địa chỉ.

## Nhiều kết quả tách giá trị khỏi trạng thái thất bại

```go
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}
```

Hàm cần import `errors`. Với đầu vào số thực hữu hạn thông thường, caller có thể dùng hàm để chia và kiểm tra mẫu số bằng 0. Ví dụ không thêm chính sách loại `NaN` hay vô cực; nếu miền dữ liệu yêu cầu số hữu hạn, validation cần thể hiện điều đó.

Hai kết quả đi cùng nhau: khi `error` khác nil, số 0 ở kết quả đầu không phải một phép chia thành công. Caller cần đọc hợp đồng trước khi dùng kết quả:

```go
quotient, err := divide(10, 0)
if err != nil {
    fmt.Println("cannot divide:", err)
    return
}
fmt.Println(quotient)
```

Đoạn gọi đặt trong `main`, cần `fmt`. Nhánh lỗi in thông báo rồi kết thúc hàm, nên không in `quotient` như một kết quả hợp lệ. Đặt `error` cuối là convention phổ biến, không phải yêu cầu compiler cho mọi hàm. Go cho phép nhiều kết quả; ý nghĩa của từng kết quả khi thất bại vẫn do API quy định.

## Kết quả có tên vẫn là biến

```go
func split(total int) (first, second int) {
    first = total * 4 / 9
    second = total - first
    return first, second
}
```

`first` và `second` được tạo khi vào hàm, nhận zero value rồi được gán. Với `total=17`, số học nguyên cho `first=7`, `second=10`, nên tổng vẫn bằng 17. Ví dụ giả định phép nhân trung gian `total * 4` không tràn `int`; chia nguyên không giữ phần lẻ.

Go cho phép `return` không đối số ở hàm có kết quả được đặt tên. Tuy nhiên, khi hàm dài, câu `return first, second` cho người đọc thấy ngay thứ tự và nguồn kết quả. Named result còn có thể bị một deferred closure sửa trước khi caller nhận nó; ta sẽ xem thứ tự đó sau khi hiểu `defer`.

## Closure giữ một biến qua nhiều lần gọi

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

Biểu thức `func() int { ... }` tạo hàm ẩn danh. Khi nó dùng biến `next` thuộc hàm bao ngoài, ta có **closure**: giá trị hàm giữ khả năng truy cập biến đó. `sequence` trả về rồi nhưng biến `next` vẫn sống đủ lâu để các lần gọi `first` tăng từ 0 lên 1 rồi 2.

Lần gọi `sequence()` thứ hai tạo biến `next` khác, nên `second()` bắt đầu từ 1. Nếu viết `another := first`, ta sao chép giá trị hàm đang có; `another` và `first` sẽ cùng làm việc với biến trạng thái ấy, không tạo bộ đếm riêng.

Có thể mở rộng factory để chọn giá trị ban đầu:

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

Đây là cùng cơ chế với `sequence`, thêm tham số `start`. Closure giữ biến, không chụp một bản sao bất biến của giá trị. Hai goroutine gọi cùng `a` có thể race trên `n`; trạng thái riêng so với `b` chưa làm `a` tự an toàn khi dùng đồng thời. Việc tăng cũng có giới hạn miền `int` nếu gọi đủ nhiều lần.

Zero value của kiểu hàm là nil; gọi một function value nil gây panic. Có thể so sánh hàm với nil để kiểm tra sự hiện diện, nhưng không so hai function value với nhau bằng `==`. Với API nhận hàm như `apply`, cần quy định hàm không nil hoặc quyết định một hành vi hợp lệ khi vắng mặt.

## Variadic: nhiều đối số được nhìn như một slice

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

Tham số variadic phải đứng cuối. Trong thân hàm, `nums` có kiểu `[]int`, nên dùng vòng lặp như slice thông thường. Không có đối số thì vòng lặp không chạy và tổng là 0. Ví dụ giả định các phép cộng không tràn `int`.

Khi gọi `sumAll(1, 2)`, các đối số được cung cấp thành phần tử của slice cho lời gọi. Khi đã có `values`, dấu `...` trong `sumAll(values...)` truyền slice ấy làm đối số variadic mà không tạo yêu cầu sao chép các phần tử. Nếu hàm gán `nums[0]`, caller có thể thấy `values[0]` đổi. Chữ ký `...int` không tự hứa hàm chỉ đọc dữ liệu.

Variadic thuận tiện cho số lượng đối số thay đổi, nhưng không mang nghĩa lượng dữ liệu vô hạn: bộ nhớ, thời gian và giới hạn số học vẫn tồn tại.

## Đệ quy: giảm bài toán rồi quay về

```go
func factorial(n uint) uint64 {
    if n <= 1 {
        return 1
    }
    return uint64(n) * factorial(n-1)
}
```

Hàm minh họa dành cho `0 ≤ n ≤ 20`; `21!` đã vượt `uint64`. Kiểu `uint` loại số âm, nhưng không tự chặn giá trị quá lớn. Với `factorial(3)`, hàm để lại phép nhân `3 * ...`, gọi `factorial(2)`, rồi gọi `factorial(1)`. Base case trả 1; các lời gọi trước lần lượt hoàn thành `2 * 1`, rồi `3 * 2`, được 6.

Tính dừng đến từ hai phần: có base case, và mỗi lời gọi còn lại làm `n` nhỏ hơn để tiến đến base case. Mỗi lời gọi còn việc chưa làm phải giữ trạng thái trên stack. Go không bảo đảm tối ưu tail call; với phép tính tuyến tính đơn giản, vòng lặp thường dễ thể hiện giới hạn và ít cần stack hơn. Nếu công bố hàm này như một API tổng quát, cần kiểm tra miền đầu vào hoặc chọn cách biểu diễn số phù hợp hơn.

## defer gắn việc dọn dẹp với lần gọi hàm

Sau khi mở file thành công, mọi đường ra khỏi hàm đọc đều cần đóng file. `defer` cho phép đặt lời gọi đóng ngay sau chỗ nhận tài nguyên:

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

Import `os` và `io`. Nếu `Open` thất bại, hàm trả trước khi đăng ký `Close`. Nếu thành công, `defer f.Close()` đăng ký lời gọi; nó chưa đóng file ở dòng đó. `io.ReadAll` đọc dữ liệu, các biểu thức return được tính, rồi `Close` chạy trước khi caller nhận kết quả.

Ví dụ đọc này chủ động bỏ qua lỗi `Close`; nó không phải mẫu xử lý mọi tài nguyên. Với file ghi hoặc lớp có buffer, lỗi `Flush`/`Close` có thể quyết định dữ liệu đã được ghi đủ hay chưa và cần được xử lý. Defer chạy khi hàm return hoặc khi stack unwinding do panic đi qua hàm; `os.Exit` kết thúc process mà không chạy defer. Defer cũng không phải bảo đảm dọn dẹp khi process bị cưỡng bức kết thúc.

Hai quy tắc khác cần theo dõi là thời điểm tính đối số và thứ tự thực hiện:

```go
value := 1
defer fmt.Println(value)
defer func() { fmt.Println(value) }()
value = 2
// Khi hàm kết thúc: in 2 trước, rồi đến 1.
```

Lời gọi đầu tính đối số `value` ngay khi đăng ký, nên giữ số 1. Lời gọi thứ hai không truyền đối số; thân closure đọc chính biến `value` khi chạy, lúc đó bằng 2. Defer chạy theo thứ tự ngược lúc đăng ký, LIFO, nên closure in 2 trước rồi lời gọi đầu in 1.

Đặt defer trong loop không tạo một vòng đời cleanup cho mỗi block. Các lần đăng ký tích lũy đến khi **hàm chứa loop** kết thúc. Nếu cần đóng từng file trước khi đọc file tiếp theo, tách xử lý một file thành hàm nhỏ có defer của riêng nó.

## Một return vẫn còn bước trước khi giao kết quả

```go
func adjusted() (result int) {
    defer func() { result++ }()
    return 10
}
```

Kết quả dự kiến là 11. Trước tiên, `return 10` gán 10 vào biến kết quả `result`. Sau đó deferred closure tăng biến ấy thành 11. Cuối cùng caller mới nhận kết quả. Điều này giải thích vì sao named result có thể hữu ích khi cần xử lý lỗi cleanup; đồng thời, nó đòi hỏi người đọc biết rõ deferred code đang sửa kết quả nào. Không cần dùng mẫu này cho một hàm vốn rõ ràng với return thông thường.

## Thử dự đoán

**1.** Sau `first := sequence(); other := first`, nếu gọi `first()` rồi `other()`, hai kết quả là gì?

**2.** Nếu `sumAll` được đổi thành hàm gán `nums[0] = 99` khi không rỗng, lời gọi với `values...` có thể sửa `values` không?

**3.** Trong ví dụ hai defer, đổi `value = 2` thành `value = 7`. Thứ tự in là gì, và vì sao không phải cả hai đều 7?

**Giải thích:**

1. 1 rồi 2: hai giá trị hàm cùng giữ một biến trạng thái. Gọi factory một lần nữa mới tạo biến riêng.
2. Có. Slice truyền bằng `...` vẫn có thể chia sẻ array nền. Muốn giữ đầu vào, hàm phải không sửa hoặc phải sao chép phù hợp.
3. 7 rồi 1. Closure đọc biến lúc chạy, còn đối số `fmt.Println(value)` đã được tính và giữ từ lúc đăng ký defer. Thứ tự LIFO quyết định lời gọi nào chạy trước.

## Tài liệu đối chiếu

- [Go specification: function types](https://go.dev/ref/spec#Function_types), [calls](https://go.dev/ref/spec#Calls), [function literals](https://go.dev/ref/spec#Function_literals) — chữ ký, truyền giá trị, variadic và closure.
- [Defer statements](https://go.dev/ref/spec#Defer_statements), [Defer, Panic, and Recover](https://go.dev/blog/defer-panic-and-recover) — thời điểm tính đối số, thứ tự và named results.
- [Effective Go](https://go.dev/doc/effective_go) — nhiều kết quả và cách sử dụng hàm.
- [os.Exit](https://pkg.go.dev/os#Exit) — kết thúc process mà không chạy defer.

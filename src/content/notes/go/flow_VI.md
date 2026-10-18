---
title: "Điều khiển luồng: lần theo nhánh rẽ và từng lượt lặp"
category: "Go"
tags: ["golang", "basics", "flow-control", "loops"]
description: "Theo dõi if, switch, for và range để biết nhánh nào chạy, vòng lặp dừng ở đâu và biến nào được dùng lại hoặc tạo mới."
updated: 2026-10-15
translationKey: "go/flow"
---

Một chuỗi `"8080"` có thể trở thành số cổng hợp lệ; `"abc"` không đọc được thành số; `"70000"` đọc được nhưng nằm ngoài miền cho phép. Ba đường đi này cần những điều kiện khác nhau. Điều khiển luồng giúp diễn đạt khi nào tiếp tục, khi nào chọn một nhánh khác và khi nào dừng hẳn.

Bài này giả định bạn đã biết [biến, kiểu và block](/vi/notes/go/variables/). Các đoạn code độc lập: khai báo hàm ở phạm vi package, đặt câu lệnh trong hàm và thêm import được nêu gần ví dụ. Output trong comment là kết quả dự kiến.

## if: kiểm tra một điều kiện, giới hạn một biến

Điều kiện của `if` phải có kiểu boolean. Không dùng số 0 hay chuỗi rỗng thay cho `false`, và không cần ngoặc tròn bao điều kiện.

```go
items := []string{"book", "pen"}
if value := len(items); value == 0 {
    fmt.Println("empty")
} else {
    fmt.Println(value) // 2
}
// value is not in scope here.
```

Phần trước dấu `;` chạy một lần trước khi xét điều kiện. Vì có hai phần tử, `value == 0` là false và chương trình chạy nhánh `else`. `value` chỉ được dùng trong toàn bộ câu `if`, gồm các nhánh `else if` và `else` tương ứng, rồi hết phạm vi. Đặt biến ở đây diễn đạt rằng nó chỉ phục vụ quyết định này.

Nếu phần khởi tạo cần nhiều bước, hãy viết trước `if` để mạch xử lý dễ đọc. `else` cần đặt trên cùng dòng với `}` trước nó: quy tắc chèn dấu chấm phẩy của Go khiến cách xuống dòng khác có thể không còn là một câu `if` hợp lệ.

## Dừng sớm để đường đi thành công rõ ràng

Ta hiện thực ba trường hợp của số cổng bằng một hàm. Cú pháp trả nhiều kết quả sẽ được giải thích trong [bài hàm](/vi/notes/go/functions/); ở đây, hãy theo thời điểm hàm kết thúc.

```go
func parsePort(raw string) (int, error) {
    port, err := strconv.Atoi(raw)
    if err != nil {
        return 0, fmt.Errorf("parse port: %w", err)
    }
    if port < 1 || port > 65535 {
        return 0, fmt.Errorf("port outside range: %d", port)
    }
    return port, nil
}
```

Ví dụ cần `strconv` và `fmt`. Với `"abc"`, `Atoi` trả lỗi và câu `return` đầu kết thúc hàm; phép kiểm tra miền giá trị không chạy. Với `"70000"`, chuyển đổi thành công nhưng điều kiện thứ hai đúng, nên hàm kết thúc với lỗi miền giá trị. Với `"8080"`, cả hai nhánh lỗi đều bị bỏ qua và hàm trả `(8080, nil)`.

Điều kiện `port < 1 || port > 65535` ghép hai trường hợp không hợp lệ bằng OR. Chính sách ví dụ chủ động loại cổng 0; trong một số API, cổng 0 mang ý nghĩa khác, nên cần đổi hợp đồng nếu muốn hỗ trợ nó. Chuyển được sang `int` chỉ xác nhận dạng số, chưa xác nhận ý nghĩa nghiệp vụ.

Mỗi nhánh lỗi dừng ngay khiến đường đi thành công còn lại đọc từ trên xuống. Không cần thêm một tầng `else` để bao toàn bộ phần xử lý sau mỗi `return`.

## switch: chỉ một case khớp được chọn

Khi nhiều nhánh xét cùng một giá trị, `switch` giúp nhìn thấy các lựa chọn cạnh nhau:

```go
switch os := runtime.GOOS; os {
case "darwin", "linux":
    fmt.Println("Unix-like")
default:
    fmt.Println(os)
}
```

Import `runtime` và `fmt`. Phần khởi tạo đặt tên `os` cho chuỗi hệ điều hành; đây là biến cục bộ, không phải package `os`. Nếu giá trị là `"darwin"` hoặc `"linux"`, cùng một thân case chạy. Các hệ khác đi vào `default`. Không có output cố định độc lập với hệ đang chạy.

Expression switch chọn case khớp đầu tiên và tự kết thúc sau case đó; không cần `break` ở cuối từng case. Các phép so sánh phải hợp lệ theo quy tắc kiểu và equality. Chẳng hạn, không dùng slice làm biểu thức switch thông thường để so hai slice với nhau.

Có thể bỏ biểu thức sau `switch` để xét các điều kiện khác nhau, tương đương `switch true`:

```go
hour := 10
switch {
case hour < 12:
    fmt.Println("morning")
case hour < 17:
    fmt.Println("afternoon")
default:
    fmt.Println("evening")
}
```

10 thỏa cả hai điều kiện đầu, nhưng chỉ `morning` được in vì case đầu tiên thắng. Đảo hai case sẽ làm 10 đi vào `afternoon`; thứ tự là một phần của logic. Ví dụ giả định `hour` đã nằm trong 0–23, chưa kiểm tra đầu vào ngoài miền đó.

`fallthrough` là ngoại lệ tường minh: sau khi chạy case hiện tại, nó chạy thân case kế tiếp mà không kiểm tra điều kiện của case ấy. Nếu chỉ muốn nhiều giá trị có chung xử lý, nhóm chúng trong cùng `case` thường rõ hơn. **Type switch** xét kiểu động của interface và có quy tắc riêng; không dùng `fallthrough` trong type switch.

## for: theo dõi khởi tạo, điều kiện và bước tiếp theo

Go dùng `for` cho cả lặp theo bộ đếm, lặp theo điều kiện và lặp không có điều kiện:

```go
for i := 0; i < 3; i++ {
    fmt.Println(i)
}
// 0
// 1
// 2

sum := 1
for sum < 16 {
    sum *= 2
}
fmt.Println(sum) // 16

finished := false
for {
    if finished {
        break
    }
    finished = true
}
```

Vòng đầu khởi tạo `i` một lần. Trước mỗi lượt, nó kiểm tra `i < 3`; sau thân vòng, `i++` chuẩn bị lượt tiếp theo. Khi `i` bằng 3, điều kiện sai và thân không chạy nữa. Vòng thứ hai không cần biến đếm riêng: trạng thái lần lượt là 1 → 2 → 4 → 8 → 16, rồi điều kiện sai.

Vòng thứ ba không có điều kiện nên không tự dừng. Ở lượt đầu, `finished` còn false và được đổi thành true; ở lượt sau, `break` thoát vòng. Đây là mô hình nhỏ để giải thích lặp đến khi có tín hiệu dừng, không phải cách chờ công việc đồng thời: vòng chờ thực tế cần cơ chế nhận tín hiệu phù hợp để tránh quay liên tục hoặc data race.

`continue` bỏ phần còn lại của thân vòng và sang lượt tiếp theo; trong `for` ba thành phần, bước post vẫn chạy. `break` thoát cấu trúc `for`, `switch` hoặc `select` gần nhất có liên quan. `return` thoát cả hàm. Vì thế, `break` trong một switch nằm trong loop thường chỉ thoát switch, chưa dừng loop. Panic cũng có thể làm rời vòng nhưng đi vào luồng panic/unwinding, không phải cơ chế kết thúc lặp thông thường.

## range: cần biết mỗi giá trị đại diện cho gì

Với slice, `range` có thể trả index và bản sao giá trị phần tử. Để sửa danh sách gốc, ghi qua index:

```go
nums := []int{2, 3, 4}
for i, value := range nums {
    nums[i] = value * 2
}
fmt.Println(nums) // [4 6 8]
```

Nếu chỉ gán `value = value * 2`, biến tạm thay đổi nhưng phần tử `nums[i]` không được ghi. Quy tắc sao chép cũng áp dụng khi range array. Nếu phần tử là pointer hoặc có chứa tham chiếu, bản sao phần tử vẫn có thể dẫn đến dữ liệu dùng chung; “bản sao” không có nghĩa clone sâu.

Range một slice không tự cập nhật số lượt theo những lần append trong thân vòng. Khi bắt đầu, vòng dùng giá trị slice đã nhận cho việc duyệt. Có thể nhìn thấy sửa đổi phần tử của array nền còn dùng chung, nhưng không nên dựa vào range để duyệt cả phần mới thêm. Nếu mục tiêu là xử lý một hàng đợi tăng dần, hãy chọn một vòng có điều kiện phản ánh đúng hàng đợi đó. Range giúp khỏi tự viết biên duyệt; các lệnh index khác trong thân vẫn có thể gây panic.

Với string, hai giá trị lại mang nghĩa khác:

```go
for byteIndex, r := range "éa" {
    fmt.Println(byteIndex, r)
}
// 0 233
// 2 97
```

`é` được mã hóa UTF-8 bằng hai byte, nên `a` bắt đầu ở offset 2. `r` là rune được giải mã, mang giá trị code point 233 hoặc 97; không phải byte tại offset đó. Một ký tự người dùng nhìn thấy có thể gồm nhiều rune, như chữ kèm dấu kết hợp hoặc một số emoji. Với UTF-8 không hợp lệ, range sinh rune thay thế `U+FFFD` và tiến một byte tại vị trí lỗi.

Các nguồn khác có hợp đồng duyệt riêng:

| Nguồn | Hành vi cần nhớ |
| --- | --- |
| Map | Trả key/value; thứ tự không được bảo đảm |
| Channel | Nhận giá trị đến khi channel đóng và các giá trị đã buffer được nhận hết |
| Nil slice hoặc nil map | Không có lượt lặp |
| Nil channel | Chờ mãi nếu không có cách khác làm hàm kết thúc |

Từ Go 1.22 có thể `for i := range 3` để nhận 0, 1, 2. Từ Go 1.23, range còn hỗ trợ iterator function với chữ ký phù hợp. Đó là các dạng mở rộng; không cần học chúng để dùng những ví dụ slice/string ở đây.

## Biến mỗi lượt và closure: điều kiện theo phiên bản

Một closure có thể giữ biến loop để dùng sau khi loop kết thúc. Dùng closure ở đây giúp quan sát biến mà không cần goroutine hay lịch chạy không xác định:

```go
var readers []func() int
for _, value := range []int{10, 20, 30} {
    readers = append(readers, func() int { return value })
}
fmt.Println(readers[0](), readers[1](), readers[2]()) // 10 20 30
```

Output này yêu cầu ngữ nghĩa ngôn ngữ Go 1.22 trở lên: biến khai báo bằng `:=` trong loop được tạo riêng cho từng lượt. Closure thứ nhất giữ biến của lượt nhận 10, closure thứ hai giữ biến của lượt nhận 20. Quy tắc cũng liên quan đến loop ba thành phần có biến được khai báo trong phần init.

Nếu khai báo `var value int` trước loop rồi viết `for _, value = range ...`, mọi lượt gán vào cùng một biến, nên ba closure đều đọc 30 sau loop. Với ngữ nghĩa trước Go 1.22, dạng khai báo bằng `:=` cũng từng dùng lại biến qua các lượt. [Tài liệu thay đổi Go 1.22](https://go.dev/doc/go1.22#language) mô tả thay đổi này; language version áp dụng cho package, thường từ dòng `go` trong `go.mod`, có ý nghĩa chứ không chỉ phiên bản toolchain đã cài. Khi tạo goroutine, truyền giá trị làm tham số vẫn là cách thể hiện rõ dữ liệu dành cho lần gọi đó; đồng bộ dữ liệu dùng chung vẫn là việc riêng.

## Khi cần thoát nhiều tầng

```go
outer:
for i := 0; i < 5; i++ {
    for j := 0; j < 5; j++ {
        if i*j > 10 {
            break outer
        }
    }
}
```

Lần đầu điều kiện đúng là `i=3`, `j=4`. `break outer` thoát vòng ngoài đã gắn nhãn, vì vậy không tiếp tục các giá trị sau. Một `break` không nhãn ở vị trí ấy chỉ thoát vòng `j`. `continue outer` bỏ phần còn lại của lượt ngoài và chuyển sang lượt tiếp theo của vòng `i`.

Nhãn hữu ích khi chính hành vi “thoát hai tầng” là điều muốn diễn đạt. Khi cần nhiều nhãn để hiểu một đoạn, tách việc tìm kiếm hoặc kiểm tra thành hàm rồi dùng `return` có thể làm trách nhiệm rõ hơn.

## Thử lần theo luồng

**1.** Đổi `nums[i] = value * 2` thành `value = value * 2`. `nums` có đổi không?

**2.** Với `hour=10`, nếu đưa `case hour < 17` lên trước `case hour < 12`, nhánh nào chạy?

**3.** Trong ví dụ closure, thay khai báo mỗi lượt bằng một `value` có sẵn và phép gán `=`. Vì sao kết quả sau loop khác, kể cả dùng Go 1.22 trở lên?

**Giải thích:**

1. Không. Chỉ bản sao phần tử trong `value` được gán lại; cần ghi qua index để sửa slice số nguyên.
2. Nhánh `<17` chạy vì khớp đầu tiên. Switch không tự chọn điều kiện “cụ thể nhất”.
3. Ba hàm đều đọc cùng biến cuối cùng bằng 30. Quy tắc mỗi lượt tạo biến mới áp dụng cho biến được loop khai báo, không áp dụng cho một biến cũ mà loop chỉ gán vào.

## Tài liệu đối chiếu

- [Go specification: if](https://go.dev/ref/spec#If_statements), [switch](https://go.dev/ref/spec#Switch_statements), [for và range](https://go.dev/ref/spec#For_statements) — lựa chọn nhánh và dữ liệu từng lượt.
- [Go 1.22 language changes](https://go.dev/doc/go1.22#language) — biến loop và range số nguyên.
- [Fixing For Loops in Go 1.22](https://go.dev/blog/loopvar-preview) — điều kiện language version của thay đổi biến loop.

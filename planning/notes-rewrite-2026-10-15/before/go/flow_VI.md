---
title: "Điều khiển luồng: if, switch, for và range"
category: "Go"
tags: ["golang", "basics", "flow-control", "loops"]
description: "Điều khiển luồng quyết định câu lệnh nào chạy, chạy bao nhiêu lần và dừng ở đâu. Bài này nối cú pháp với cách đọc hành vi, đặc biệt là phạm vi biến và dữ liệu mà range trả về."
updated: 2026-10-14
translationKey: "go/flow"
---

Điều khiển luồng quyết định câu lệnh nào chạy, chạy bao nhiêu lần và dừng ở đâu. Bài này nối cú pháp với cách đọc hành vi, đặc biệt là phạm vi biến và dữ liệu mà range trả về.

## 1. if và biến khởi tạo

```go
if value := len(items); value == 0 {
    fmt.Println("empty")
} else {
    fmt.Println(value)
}
```

Điều kiện phải là bool, không cần ngoặc tròn. value chỉ tồn tại trong if, else if và else tương ứng. Dùng cách này khi biến chỉ phục vụ quyết định đó; không ép mọi xử lý vào một dòng dài. `else` đặt cùng dòng với dấu `}` trước nó.

## 2. switch chọn nhánh nào?

```go
switch os := runtime.GOOS; os {
case "darwin", "linux":
    fmt.Println("Unix-like")
default:
    fmt.Println(os)
}

switch {
case hour < 12:
    fmt.Println("morning")
case hour < 17:
    fmt.Println("afternoon")
default:
    fmt.Println("evening")
}
```

Expression switch chọn case khớp đầu tiên; không tự chạy xuyên xuống case sau. Switch không có biểu thức tương đương switch true, nên thứ tự các điều kiện có ý nghĩa. Các biểu thức so sánh phải tuân thủ quy tắc kiểu và equality: không phải mọi kiểu đều dùng được làm biểu thức switch. Type switch là cơ chế khác để xét kiểu động của interface.

`fallthrough` chạy thân case kế tiếp mà không kiểm tra điều kiện case ấy; chỉ dùng trong expression switch và khi thật sự muốn hành vi này. Nó không có trong type switch. Thường có thể viết các giá trị chung vào cùng một case để code dễ hiểu hơn.

## 3. Ba cách dùng for

```go
for i := 0; i < 3; i++ {
    fmt.Println(i)
}

sum := 1
for sum < 16 {
    sum *= 2
}

for {
    if finished {
        break
    }
}
```

For ba thành phần gồm init, condition, post; init chạy một lần, post chạy sau mỗi lượt không thoát vòng. For chỉ có condition thay while. For không có condition lặp đến break/return hoặc panic. `continue` sang lượt tiếp theo, còn `break` thoát loop/switch/select gần nhất; `return` thoát cả hàm.

## 4. range trả về bản sao hay dữ liệu gốc?

```go
nums := []int{2, 3, 4}
for i, value := range nums {
    nums[i] = value * 2
}
fmt.Println(nums) // [4 6 8]

for byteIndex, r := range "éa" {
    fmt.Println(byteIndex, r)
}
// 0 233
// 2 97
```

Với slice/array, value là bản sao phần tử: gán value không cập nhật nums[i]. Với string, index là offset byte, r là rune được giải mã UTF-8. Một rune không nhất thiết bằng một ký tự người dùng thấy, vì dấu kết hợp/emoji có thể gồm nhiều rune. Với map, thứ tự không được bảo đảm; với channel, range nhận đến khi channel đóng và buffer hết. Range trên nil channel chờ mãi.

Range tránh việc tự viết biên chỉ số cho nguồn đang duyệt, nhưng không bảo đảm code trong thân loop không có lỗi index. Không thay đổi độ dài slice trong loop rồi mặc định range sẽ tự duyệt phần thêm mới. Go 1.22 còn hỗ trợ range số nguyên; range function của Go 1.23 là chủ đề mở rộng, không cần để hiểu các ví dụ hiện tại.

## 5. Biến loop và closure theo phiên bản

Với language version Go 1.22 trở lên, biến khai báo bằng `:=` trong loop được tạo riêng cho mỗi lượt. Nếu dùng biến đã khai báo rồi gán bằng `=`, biến đó vẫn được dùng chung giữa các lượt. Truyền value làm tham số goroutine vẫn là cách tường minh. Hành vi này phụ thuộc language version của package, không chỉ phiên bản binary go cài trên máy.

## 6. Loop có nhãn

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

break outer thoát vòng ngoài được gắn nhãn. continue outer bắt đầu lượt tiếp theo của vòng ngoài. Khi nhiều nhãn làm luồng khó theo dõi, tách một phần xử lý thành hàm có return thường rõ hơn.

## Ví dụ áp dụng

### Tình huống: đọc một giá trị và dừng sớm khi không hợp lệ

Khi kiểm tra dữ liệu đầu vào, mỗi nhánh lỗi nên kết thúc ngay. Như vậy đường đi thành công nằm thẳng từ trên xuống, không chìm trong nhiều tầng if.

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

Đầu vào "8080" trả (8080, nil); "abc" dừng ở lỗi chuyển đổi; "70000" chuyển đổi được nhưng không qua quy tắc miền giá trị. Hai bước khác nhau: đọc đúng kiểu dữ liệu và kiểm tra đúng ý nghĩa. Ví dụ yêu cầu import fmt và strconv, và chọn chính sách không chấp nhận port 0.

## Tự kiểm tra

Vì sao range string trả index 0 rồi 2 trong ví dụ? Viết lại một loop sửa slice đúng vị trí và một loop thoát hai tầng bằng label.

## Tài liệu đối chiếu

- [Go language specification](https://go.dev/ref/spec)
- [Go 1.22 loop changes](https://go.dev/doc/go1.22)

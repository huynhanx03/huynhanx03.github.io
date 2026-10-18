---
title: "Con trỏ: địa chỉ, chia sẻ dữ liệu và vòng đời bộ nhớ"
category: "Go"
tags: ["golang", "basics", "pointers", "memory"]
description: "Con trỏ là giá trị dùng để truy cập một biến qua địa chỉ của nó. Mục tiêu đầu tiên khi dùng pointer là diễn đạt việc chia sẻ hoặc sửa trạng thái; lợi ích hiệu năng cần được đo thay vì mặc định."
updated: 2026-10-14
translationKey: "go/pointers"
---

Con trỏ là giá trị dùng để truy cập một biến qua địa chỉ của nó. Mục tiêu đầu tiên khi dùng pointer là diễn đạt việc chia sẻ hoặc sửa trạng thái; lợi ích hiệu năng cần được đo thay vì mặc định.

## 1. Đọc &, *T và *p

```go
age := 15
p := &age
fmt.Println(*p) // 15
*p = 20
fmt.Println(age) // 20
```

`&age` lấy địa chỉ biến age, `*int` là kiểu pointer tới int, còn `*p` truy cập biến được trỏ tới. In p sẽ cho một địa chỉ, nhưng giá trị địa chỉ cụ thể thay đổi giữa các lần chạy. Gán q := p sao chép địa chỉ; q và p vẫn truy cập cùng một age.

## 2. Truyền pointer vẫn là truyền bằng giá trị

```go
func set(p *int, value int) {
    *p = value
}

func replaceLocal(p *int) {
    other := 99
    p = &other
}

n := 1
set(&n, 2)
replaceLocal(&n)
fmt.Println(n) // 2
```

set sửa biến mà bản sao p đang trỏ tới. replaceLocal chỉ gán lại pointer cục bộ, không đổi n hay pointer của caller. Nếu cần thay một pointer ở caller, thường trả pointer mới; `**T` cũng làm được nhưng hợp đồng sẽ phức tạp hơn. Slice và map có thể sửa dữ liệu nền mà không cần *slice/*map vì bản sao của chúng vẫn giữ tham chiếu.

## 3. nil và quyền sở hữu

```go
var p *int
fmt.Println(p == nil) // true
// fmt.Println(*p) would panic.
```

Nil biểu thị không trỏ tới biến nào. API cần nói rõ nil có hợp lệ không: có thể dùng nil cho giá trị tùy chọn, hoặc yêu cầu pointer không nil như một precondition. Không nên thêm nil-check rồi im lặng bỏ qua lỗi ở mọi nơi. Hai goroutine cùng giữ pointer không có nghĩa chúng được quyền sửa dữ liệu đồng thời; vẫn cần mutex, atomic hoặc ownership qua channel.

## 4. new(T), literal và make

```go
p := new(int)
fmt.Println(*p) // 0

user := &struct{ Name string }{Name: "An"}
fmt.Println(user.Name) // An
```

`new(T)` cấp chỗ cho một giá trị T được khởi tạo zero và trả *T. `&User{...}` tiện khi cần khởi tạo các field. `new(map[string]int)` chỉ tạo pointer tới nil map; muốn map ghi được dùng make(map[string]int). Make dùng cho slice/map/channel và trả chính giá trị kiểu đó, không trả pointer.

Từ Go 1.26, new cũng nhận biểu thức, ví dụ new(10) tạo *int chứa 10. Cách viết new(T) ở trên vẫn hợp lệ và tương thích với các phiên bản cũ hơn.

## 5. Biến cục bộ có thể sống sau khi hàm trả

```go
func createPointer() *int {
    n := 10
    return &n
}
```

Ví dụ này hợp lệ: Go bảo đảm n sống đủ lâu để pointer còn sử dụng được. Compiler dùng escape analysis để quyết định bố trí biến trên stack hay heap. Trả địa chỉ local thường làm biến escape, nhưng inline và các tối ưu khác có thể thay đổi kết quả. Viết new hoặc & không tự bảo đảm một heap allocation; không suy luận allocation chỉ từ cú pháp.

```sh
go build -gcflags="-m" ./...
```

Lệnh này là công cụ đọc quyết định compiler, không phải cần dùng unsafe để can thiệp vào chúng. Stack goroutine có thể di chuyển khi tăng kích thước; chương trình Go thông thường được runtime cập nhật pointer đúng cách.

## 6. So với C/C++ và cách chọn

Go thông thường không có pointer arithmetic như p+1, cũng không cần free/delete. Garbage collector xử lý bộ nhớ không còn reachable; file, connection và lock vẫn cần dọn theo vòng đời riêng. Package unsafe là ngoại lệ chuyên sâu, không phải cách làm thường ngày. Pointer có thể tăng chia sẻ, allocation và chi phí GC; value copy có thể đơn giản hơn cho dữ liệu nhỏ. Các struct chứa mutex không được copy sau khi sử dụng.

## Ví dụ áp dụng

### Tình huống: thay đối tượng thay vì sửa đối tượng cũ

Một API có thể sửa qua pointer, hoặc trả đối tượng mới để caller chọn thay thế. Hai hành động có tác động khác nhau khi nhiều biến đang cùng trỏ tới một đối tượng.

```go
type Config struct { Port int }

func withPort(old *Config, port int) *Config {
    next := *old
    next.Port = port
    return &next
}

current := &Config{Port: 8080}
alias := current
current = withPort(current, 9090)
fmt.Println(current.Port, alias.Port) // 9090 8080
```

Caller thay địa chỉ trong current; alias vẫn giữ địa chỉ cũ. Hàm yêu cầu old không nil. Config ở đây chỉ có int nên sao chép độc lập; nếu chứa slice/map/pointer, phép *old chỉ sao chép nông và dữ liệu bên trong vẫn có thể được chia sẻ. Không suy rộng ví dụ này thành cách clone mọi struct.

## Tự kiểm tra

Vì sao replaceLocal không làm n thành 99? Bạn sẽ trả một value hay pointer từ một hàm tạo cấu hình bất biến nhỏ, và vì sao?

## Tài liệu đối chiếu

- [Go language specification](https://go.dev/ref/spec)
- [Go FAQ: stack and heap](https://go.dev/doc/faq#stack_or_heap)
- [Go 1.26 language changes](https://go.dev/doc/go1.26#language)

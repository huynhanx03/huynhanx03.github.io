---
title: "Con trỏ: sửa một biến qua địa chỉ và theo dõi dữ liệu chung"
category: "Go"
tags: ["golang", "basics", "pointers", "memory"]
description: "Phân biệt sao chép pointer, sửa giá trị được trỏ tới và thay pointer; hiểu nil, new, vòng đời biến và điều kiện chọn pointer."
updated: 2026-10-15
translationKey: "go/pointers"
---

Bạn đưa một số vào hàm, hàm đổi số đó, nhưng biến ở caller vẫn giữ nguyên. Lý do là hàm nhận bản sao giá trị. Nếu mục tiêu là cho hàm sửa chính biến của caller, ta cần cung cấp cách truy cập biến ấy. Pointer, hay con trỏ, là một giá trị phục vụ việc truy cập đó qua địa chỉ.

Bài này giả định bạn đã biết [biến](/vi/notes/go/variables/) và [truyền đối số bằng giá trị](/vi/notes/go/functions/). Các đoạn code độc lập: đặt câu lệnh trong hàm, khai báo hàm và kiểu ngoài `main`, thêm `fmt` khi dùng lệnh in. Comment là kết quả dự kiến. Địa chỉ cụ thể không cần thiết để giải thích ví dụ.

## Ba vị trí của dấu & và dấu *

```go
age := 15
p := &age
fmt.Println(*p) // 15
*p = 20
fmt.Println(age) // 20

q := p
*q = 25
fmt.Println(*p, age) // 25 25
```

`age` là biến giữ một `int`. Biểu thức `&age` lấy địa chỉ của biến ấy; `p` có kiểu `*int`, đọc là “pointer tới int”. Trong biểu thức `*p`, dấu `*` thực hiện dereference: truy cập biến mà pointer đang trỏ tới. Vì thế, `*p = 20` ghi vào chính `age`, không tạo thêm biến số nguyên.

Dấu `*` có vai trò khác nhau theo vị trí: trong kiểu `*int`, nó mô tả kiểu pointer; trong biểu thức `*p`, nó truy cập giá trị được trỏ tới. `&` làm việc theo chiều ngược lại khi lấy địa chỉ một biến có thể lấy địa chỉ.

Dòng `q := p` sao chép **giá trị pointer**, không sao chép biến `age`. Sau đó cả `q` và `p` đều dẫn đến cùng biến. Ghi 25 qua `q` được nhìn thấy qua `p` lẫn `age`. Có thể in `p` để xem một biểu diễn địa chỉ, nhưng địa chỉ thay đổi giữa các lần chạy và không giải thích thêm về quan hệ chia sẻ.

Một cách theo dõi đủ dùng là:

| Biến | Giữ gì? | Khi gán qua biến ấy |
| --- | --- | --- |
| `age` | Số nguyên | `age = 30` thay số được lưu |
| `p` | Pointer tới `age` | `p = ...` thay nơi `p` trỏ tới |
| `*p` | Truy cập biến tại đích của `p` | `*p = 30` thay giá trị tại đích |

Phân biệt hai dòng cuối giúp tránh phần lớn nhầm lẫn khi truyền pointer vào hàm.

## Truyền pointer vẫn tạo một bản sao tham số

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

Khi gọi `set(&n, 2)`, tham số `p` nhận bản sao địa chỉ của `n`. `*p = value` đi theo địa chỉ ấy để sửa `n` thành 2. Việc sao chép pointer không ngăn truy cập cùng một đích.

Khi gọi `replaceLocal(&n)`, tham số `p` ban đầu cũng dẫn đến `n`. Tuy nhiên, `p = &other` thay **biến pointer cục bộ** để nó trỏ tới `other`. Không có dòng nào ghi qua `*p` vào `n`; hàm cũng không nhận địa chỉ của một biến pointer ở caller để thay biến đó. Vì thế `n` vẫn là 2.

Nếu cần caller chuyển sang một đối tượng khác, cách thường rõ hơn là trả pointer mới rồi để caller gán lại. `**T`, pointer tới một biến pointer, cũng cho phép sửa biến pointer của caller, nhưng thêm một tầng truy cập và cần hợp đồng thật rõ. Không cần dùng nó chỉ để sửa một `int` qua `*int`.

Slice và map là ví dụ liên quan: truyền chúng bằng giá trị vẫn có thể sửa dữ liệu nền dùng chung, nên thường không cần `*[]T` hoặc `*map[K]V` chỉ để sửa phần tử. Pointer tới slice có ý nghĩa khác, chẳng hạn khi API thực sự cần thay chính giá trị slice ở caller. [Bài slice](/vi/notes/go/slices/) giải thích vì sao thường trả slice sau `append`.

## nil diễn đạt không có đích truy cập

```go
var p *int
fmt.Println(p == nil) // true
// fmt.Println(*p) would panic.
```

Zero value của pointer là nil. Nó chưa trỏ tới biến nào, nên dereference sẽ gây panic. Có thể so pointer với nil để kiểm tra sự hiện diện, nhưng ý nghĩa nghiệp vụ của nil cần do API quy định.

Chẳng hạn, `*int` có thể dùng cho số lần thử lại tùy chọn: nil nghĩa là “chưa cung cấp”, pointer tới 0 nghĩa là “đã chọn 0”. Ngược lại, `set` ở trên yêu cầu `p` không nil để có biến cần sửa. Thêm `if p == nil { return }` sẽ khiến lỗi gọi hàm bị im lặng bỏ qua, không tự làm hợp đồng tốt hơn. Chỉ chấp nhận nil khi có hành vi hợp lệ để mô tả.

Việc có chung pointer cũng chưa xác định ai được sửa. Hai goroutine cùng tăng `*p` có thể race hoặc làm mất cập nhật. Cần mutex, thao tác atomic phù hợp, hoặc quy ước ownership được thực thi qua việc phối hợp channel. Pointer diễn đạt truy cập; đồng bộ và trách nhiệm sửa dữ liệu là những quyết định khác.

## new, literal và make tạo những giá trị khác nhau

```go
p := new(int)
fmt.Println(*p) // 0

user := &struct{ Name string }{Name: "An"}
fmt.Println(user.Name) // An
```

`new(int)` tạo biến `int` có zero value rồi trả pointer tới biến đó. Khác với `var p *int`, `p` ở đây có đích hợp lệ để dereference. Với struct, `&User{...}` hoặc literal struct ẩn danh như ví dụ cho phép khởi tạo field đồng thời lấy pointer. `user.Name` là cách truy cập field qua pointer mà Go hỗ trợ, không cần viết `(*user).Name` trong trường hợp này.

`new` không tự thực hiện bước khởi tạo nội bộ mà một kiểu có thể cần. `new(map[string]int)` trả `*map[string]int`, nhưng map được trỏ tới vẫn là nil; ghi phần tử vào nó sẽ panic. `make(map[string]int)` mới tạo map dùng được để ghi. `make` dùng cho slice, map và channel, trả chính giá trị kiểu đó thay vì pointer tới nó. Sự khác nhau nằm ở giá trị được tạo và trạng thái khởi đầu, không phải quy tắc “new ở heap, make ở stack”.

[Từ Go 1.26](https://go.dev/doc/go1.26#language), `new` còn nhận biểu thức để đặt giá trị ban đầu:

```go
// Cần hỗ trợ ngôn ngữ Go 1.26.
p := new(10)
fmt.Println(*p) // 10
```

Dạng này tạo một biến mới chứa kết quả biểu thức, ở đây là `int` bằng 10. Nó không lấy địa chỉ của một biến có sẵn như `&age`. Dạng `new(T)` vẫn khởi tạo zero và tiếp tục dùng được với các phiên bản cũ hơn. Cần language version phù hợp; chỉ cài toolchain mới chưa đồng nghĩa mọi package đang bật cú pháp mới.

## Địa chỉ biến cục bộ vẫn hợp lệ sau khi hàm trả

```go
func createPointer() *int {
    n := 10
    return &n
}
```

Go cho phép ví dụ này. `n` được tạo trong hàm nhưng phải sống đủ lâu để pointer được trả về còn dùng đúng. Ra khỏi phạm vi tên `n` không có nghĩa bộ nhớ của biến lập tức biến mất; scope của tên và lifetime của biến là hai chuyện khác nhau.

Compiler dùng **escape analysis** để xác định dữ liệu có cần tồn tại ngoài phạm vi có thể bố trí trên stack hay không. Trả địa chỉ biến cục bộ thường làm biến escape, nhưng inline và các tối ưu khác có thể thay đổi quyết định cấp phát tại nơi gọi. Chỉ thấy `new` hoặc `&` trong code chưa đủ kết luận có heap allocation.

Khi cần điều tra quyết định compiler cho một dự án cụ thể, có thể dùng lệnh sau:

```sh
go build -gcflags="-m" ./...
```

Đây là lệnh tham khảo để xem chẩn đoán compiler, không phải một kết quả đo đã thực hiện trong bài. Đọc kết quả cùng phiên bản compiler, flags và code thực tế; tối ưu có thể đổi khi chúng đổi. Không cần dùng `unsafe` để can thiệp nhằm làm ví dụ hợp lệ. Trong triển khai Go, stack goroutine có thể di chuyển khi tăng kích thước và pointer của code Go thông thường được cập nhật phù hợp.

## Sửa đối tượng cũ hay thay bằng đối tượng mới?

Giả sử hai biến cùng trỏ tới cấu hình hiện tại. Ta muốn thay cấu hình cho một bên nhưng giữ cấu hình cũ cho bên kia:

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

`withPort` yêu cầu `old` không nil. `next := *old` sao chép giá trị struct sang biến mới. Sửa `next.Port` không sửa struct cũ. Hàm trả pointer tới bản sao, rồi caller thay giá trị pointer trong `current`. `alias` không được gán lại nên vẫn dẫn đến cấu hình cũ có cổng 8080.

Nếu thay thân hàm bằng `old.Port = port; return old`, cả `current` và `alias` đều nhìn thấy 9090 vì ta đã sửa cùng đối tượng. Hai thiết kế hợp lệ cho những hợp đồng khác nhau: một cái tạo phiên bản mới, một cái cập nhật trạng thái đang chia sẻ.

Ở đây `Config` chỉ chứa `int`, nên copy giá trị đủ để hai cấu hình độc lập. Nếu có field slice, map hoặc pointer, `next := *old` chỉ sao chép nông; dữ liệu được tham chiếu bên trong vẫn có thể chung. Không dùng mẫu này như cách clone sâu mọi struct. Struct có mutex còn có giới hạn khác: không copy mutex sau khi đã sử dụng.

## Chọn pointer theo ý nghĩa, rồi mới xét chi phí

Pointer phù hợp khi cần sửa cùng trạng thái, chia sẻ danh tính một đối tượng hoặc biểu đạt giá trị tùy chọn bằng nil. Một cấu hình nhỏ được dùng như giá trị bất biến có thể trả bằng value để caller dễ hiểu việc sao chép và thay thế. Dữ liệu lớn có thể khiến copy đáng kể, nhưng pointer cũng có thể làm tăng allocation, thời gian giữ dữ liệu và công việc GC. Cần đo trên workload thực tế nếu quyết định dựa vào hiệu năng.

Go thông thường không có phép cộng địa chỉ `p+1` như pointer arithmetic của C/C++, và không yêu cầu `free`/`delete`. GC thu hồi bộ nhớ không còn reachable; nó không thay việc đóng file, connection hay nhả khóa theo vòng đời sử dụng. `unsafe` là ngoại lệ chuyên sâu với yêu cầu riêng, không cần cho các thao tác pointer thông thường ở bài này.

## Tự kiểm tra

**1.** Vì sao `q := p` rồi `*q = 25` sửa `age`, còn `replaceLocal(&n)` không sửa `n` thành 99?

**2.** Trong ví dụ cấu hình, thay `next.Port = port` bằng một thao tác sửa phần tử của field slice được copy từ `old`. Có còn bảo đảm `alias` không thấy thay đổi không?

**3.** `new(int)` chứng minh chắc chắn biến nằm ở heap hay không?

**Giải thích:**

1. `*q` đi theo bản sao địa chỉ để ghi vào đích chung. `replaceLocal` chỉ thay địa chỉ trong tham số của chính nó. Cần phân biệt gán pointer với gán qua pointer.
2. Không. Copy struct không tự sao chép array nền của field slice. Muốn độc lập phải xác định và sao chép dữ liệu con cần tách.
3. Không. Cú pháp quyết định kiểu và trạng thái ban đầu, còn nơi cấp phát do compiler chọn theo escape analysis và các tối ưu. Tính đúng của code không phụ thuộc việc đoán được nơi đó.

## Tài liệu đối chiếu

- [Go specification: pointer types](https://go.dev/ref/spec#Pointer_types), [address operators](https://go.dev/ref/spec#Address_operators), [allocation](https://go.dev/ref/spec#Allocation) — kiểu và thao tác pointer.
- [Go FAQ: stack or heap](https://go.dev/doc/faq#stack_or_heap) — lifetime và quyết định bố trí bộ nhớ.
- [Go 1.26 language changes](https://go.dev/doc/go1.26#language) — `new` nhận biểu thức.
- [sync.Mutex](https://pkg.go.dev/sync#Mutex) — giới hạn sao chép mutex sau khi sử dụng.

---
title: "Channel: gửi nhận, đóng kênh, select và ownership"
category: "Go"
tags: ["golang", "concurrency", "channels", "fundamentals"]
description: "Channel truyền giá trị và tạo điểm đồng bộ giữa goroutine. Để đọc một đoạn code channel, hãy xác định người gửi, người nhận, điều kiện block và ai bảo đảm không còn send trước khi close."
updated: 2026-10-15
translationKey: "go/channels"
---

Producer có thể tính xong một giá trị khi consumer chưa sẵn sàng. Producer nên chờ, xếp giá trị vào hàng đợi hay bỏ cuộc khi request kết thúc? Channel làm những lựa chọn ấy hiện rõ trong giao thức trao đổi của chương trình.

Để suy luận về channel, hãy xác định ai gửi, ai nhận, điều kiện nào khiến thao tác chờ và ai biết chắc không còn lần gửi nào. Bài này giả định kiến thức từ [Goroutines](/vi/notes/go/goroutines/). Các đoạn trích độc lập; đặt câu lệnh trong `main`, khai báo bên ngoài, import `fmt`, `context` hoặc `sync` khi dùng.

## Bắt đầu từ một lần gửi và nhận gặp nhau

```go
ch := make(chan int)
go func() { ch <- 100 }()
fmt.Println(<-ch) // 100
```

`make(chan int)` tạo unbuffered channel. Một send và một receive phải gặp nhau để chuyển số 100. Worker tới send trước thì chờ receiver; main tới receive trước thì chờ sender. Không phía nào tự hoàn thành cuộc trao đổi ấy một mình.

Channel phối hợp lần trao giá trị này; nó chưa join mọi hành động diễn ra sau đó trong goroutine gửi. Nếu caller cần biết cleanup đã xong, hãy đặt cleanup trước một tín hiệu completion riêng.

Gán giá trị channel vẫn tham chiếu cùng channel, kể cả cùng buffer nếu có. Giới hạn hướng trong chữ ký hàm thu hẹp thao tác được phép mà không tạo channel khác:

```go
func produce(out chan<- int) { out <- 1 }
func consume(in <-chan int) int { return <-in }
```

`chan int` dùng được cả hai hướng, `chan<- int` chỉ gửi và `<-chan int` chỉ nhận. Hướng thể hiện vai trò hàm và giúp compiler từ chối thao tác sai hướng. Tuy nhiên, riêng hướng chưa diễn đạt toàn bộ giao thức sở hữu, kể cả ai được đóng channel có quyền gửi.

## Buffer thay đổi thời điểm sender phải chờ

```go
ch := make(chan int, 2)
ch <- 10
ch <- 20
fmt.Println(len(ch), cap(ch)) // 2 2
fmt.Println(<-ch) // 10
```

Hai lần gửi hoàn thành dù chưa có receiver vì buffer có hai slot. Lần gửi thứ ba sẽ chờ một receive giải phóng slot. Nhận từ channel mở nhưng rỗng phải chờ sender. Trong ví dụ chỉ có một sender này, giá trị được nhận theo thứ tự gửi.

Buffer tách thời điểm producer và consumer trong giới hạn capacity. Khi đầy, nó tạo **backpressure**: producer phải chậm lại theo consumer. Tăng capacity giữ nhiều dữ liệu chờ hơn và có thể tăng thời gian nằm trong queue; nó không sửa được consumer đã dừng hẳn. Buffered channel cũng không mặc định nhanh hơn unbuffered.

`len(ch)` quan sát số giá trị đang đệm tại một thời điểm; `cap(ch)` là capacity buffer cố định. Lần quan sát không giữ chỗ. Goroutine khác có thể lấp slot trước lần send tiếp theo, nên `if len(ch) < cap(ch)` không bảo đảm send không block. Hãy thử chính thao tác cần làm:

```go
select {
case ch <- 30:
    fmt.Println("queued")
default:
    fmt.Println("not queued")
}
```

Default chạy nếu send chưa tiến hành được. Đây là quyết định bỏ qua hoặc xử lý công việc theo cách khác, không phải tự động retry. Nếu ch đã đóng, case send có thể panic; default không bảo vệ được giao thức close/send sai.

## Đóng channel thông báo kết thúc việc gửi

```go
ch := make(chan int, 1)
ch <- 7
close(ch)
v, ok := <-ch
fmt.Println(v, ok) // 7 true
v, ok = <-ch
fmt.Println(v, ok) // 0 false
```

Close không xóa số 7. Receive đầu nhận giá trị đã được gửi nên ok vẫn true. Khi channel đã đóng và rỗng, receive trả ngay zero value của element cùng ok=false. Nếu cứ nhận một kết quả, ta sẽ nhận số 0 mãi; dùng ok hoặc range khi cần biết hoàn tất.

| Trạng thái | Send | Receive | Close |
| --- | --- | --- | --- |
| nil | Chờ vô hạn | Chờ vô hạn | Panic |
| open | Trao/đệm giá trị hoặc chờ | Nhận giá trị hoặc chờ | Đóng |
| closed | Panic | Drain giá trị đệm, rồi zero và false | Panic |

Nil channel là zero value của biến channel. Nó không có điểm trao đổi; send/receive case tương ứng trong select bị vô hiệu hóa. Close không phải free bộ nhớ channel hay thao tác bắt buộc với mọi channel. Channel có thể trở thành unreachable mà chưa đóng. Đóng khi receiver cần biết sẽ không còn giá trị mới.

### Một producer biết khi nào mình gửi xong

```go
func sequence(count int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := 0; n < count; n++ {
            out <- n + 1
        }
    }()
    return out
}

sum := 0
for value := range sequence(3) {
    sum += value
}
fmt.Println(sum) // 6
```

Producer đóng output vì nó biết đã hoàn tất mọi send. Range nhận tới khi channel đóng và buffer hết dữ liệu. Consumer ở đây nhận hết dãy nên cho producer tiến tới kết thúc; channel không buffer khiến producer chờ tại từng lần trao giá trị.

Nếu consumer break sớm, lần gửi kế tiếp có thể bị chặn mãi. Buffer hữu hạn chỉ trì hoãn khả năng này. API cho phép bỏ nhận sớm cần cancellation, bao gồm tại điểm gửi.

### Nhiều sender cần một coordinator

Mỗi sender chỉ biết phần việc của chính mình đã xong. Không sender nào được tự đóng output khi sender khác còn có thể gửi. Đoạn trích sau minh họa giao thức hữu hạn với điều kiện caller nhận hết kết quả:

```go
func merge(inputs ...<-chan int) <-chan int {
    out := make(chan int)
    var wg sync.WaitGroup
    wg.Add(len(inputs))
    for _, input := range inputs {
        go func(in <-chan int) {
            defer wg.Done()
            for value := range in {
                out <- value
            }
        }(input)
    }
    go func() {
        wg.Wait()
        close(out)
    }()
    return out
}
```

Giả định mọi input cuối cùng đóng và consumer drain out. Worker dừng khi input kết thúc; coordinator chờ tất cả sender rồi đóng output đúng một lần. Giá trị từ các input khác nhau có thể xen theo nhiều thứ tự. Nếu một input không kết thúc hoặc consumer bỏ output, phiên bản hỗ trợ hủy phải xử lý cả chờ nhận lẫn chờ gửi. Receiver tự close sẽ đua với sender còn hoạt động.

## Trao giá trị công bố dữ liệu, không tự chuyển quyền sở hữu độc quyền

Theo Go memory model, send được đồng bộ trước completion của receive tương ứng. Receiver vì thế có thể thấy dữ liệu đã chuẩn bị trước send. Close cũng được đồng bộ trước receive quan sát việc đóng bằng cách trả zero value. Các quy tắc ấy giải thích vì sao channel có thể mang tín hiệu hoàn tất.

Nhưng giá trị được chuyển vẫn copy theo kiểu của nó. Pointer, slice và map tiếp tục tham chiếu dữ liệu chung. Gửi `[]byte` không copy backing array. Sender sửa byte trong lúc receiver đọc vẫn có thể race dù đã trao qua channel. Hoặc chuyển quyền sử dụng theo convention rồi ngừng dùng dữ liệu, hoặc gửi bản copy độc lập, hoặc có đồng bộ riêng cho việc sửa chung.

## Select chờ các khả năng, không ưu tiên cancellation

Đoạn send hỗ trợ hủy dưới đây nằm trong hàm trả error, có các tham số ctx, out và value:

```go
select {
case out <- value:
    return nil
case <-ctx.Done():
    return ctx.Err()
}
```

Nếu chỉ cancellation sẵn sàng, hàm có thể ngừng chờ receiver. Nếu cả hai case sẵn sàng, select chọn pseudo-random đều giữa chúng. Thứ tự source không ưu tiên hủy, nên context đã canceled chưa bảo đảm không gửi thêm. Cancellation cần sự hợp tác; bài [Context](/vi/notes/go/context/) giải thích bước riêng để chờ worker thoát.

Không có default, select chờ tới khi có thao tác tiến hành được. Có default, nó đi tiếp ngay khi không case nào sẵn sàng. Select không case chờ mãi. Lặp một nhánh default trong loop chặt có thể busy-spin thay vì park.

Channel expression và vế phải của send được tính một lần theo thứ tự source khi vào select, kể cả với case không thắng. Tránh đặt side effect tốn kém ở đó rồi giả định chỉ case được chọn mới tính chúng.

Receive từ channel đóng luôn sẵn sàng; điều đó cần xử lý trong loop nhận nhiều nguồn:

```go
for left != nil || right != nil {
    select {
    case value, ok := <-left:
        if !ok {
            left = nil
            continue
        }
        fmt.Println(value)
    case value, ok := <-right:
        if !ok {
            right = nil
            continue
        }
        fmt.Println(value)
    }
}
```

Đoạn trích giả định hai biến `<-chan int` cuối cùng đều đóng. Gán nguồn đã hết về nil vô hiệu hóa case cục bộ; nó không thay channel gốc hay alias khác. Khi cả hai nil, loop kết thúc. Nếu không vô hiệu hóa hoặc thoát, channel đã hết có thể liên tục trả zero và tiêu CPU.

## Bên trong runtime: queue, parking và copy

Mô hình dưới giúp đọc source runtime, không phải layout công khai để ứng dụng phụ thuộc:

```text
hchan:
  qcount | dataqsiz | buf
  sendx | recvx
  sendq | recvq
  lock | closed | element type information

ring buffer: [0][1][2] ... [cap-1]
              sendx and recvx wrap around
```

qcount đếm giá trị trong queue; dataqsiz là capacity. sendx và recvx là index, không phải pointer. Ring buffer dùng lại slot thay vì dồn mọi phần tử sau receive. Bookkeeping queue có thể O(1), nhưng copy element vẫn tốn thời gian theo kích thước payload.

Khi phù hợp, partner đang đợi cho phép direct handoff. Nếu không, send/receive dùng buffer. Khi thao tác không tiến hành được, G đăng ký một wait record `sudog` vào queue rồi park. Partner có thể làm nó runnable trở lại; runnable chưa có nghĩa được chạy tức thì.

Runtime lock bảo vệ metadata channel, dù không phải mọi fast check đều lấy lock. Khi buffer đầy và sender đang đợi, receive có thể lấy giá trị cũ nhất rồi đưa value sender vào slot vừa trống để giữ thứ tự queue. Direct handoff là tối ưu triển khai, không phải tùy chọn bật trong ứng dụng.

Select tổng quát quản lý `scase`, thứ tự poll ngẫu nhiên và thứ tự khóa channel ổn định nhằm tránh deadlock nội bộ. Khi chờ, nó đăng ký vào các queue liên quan; khi có case thắng thì gỡ đăng ký còn lại. Compiler có thể tối ưu select đơn giản, nên không có một hệ số overhead cố định so với thao tác channel thường.

## Chọn tối ưu theo áp lực cần giảm

Nhiều goroutine tranh một channel có thể làm lock nóng. Batching giảm số send nhưng tăng payload hoặc thời gian chờ. Sharding chia contention nhưng khó giữ thứ tự toàn cục. Buffer cục bộ cần quy tắc flush lúc shutdown. Các kỹ thuật này đổi latency, bộ nhớ hoặc quy tắc thứ tự; hãy xem contention và đo workload trước khi chọn.

## Thử dự đoán trước khi xem đáp án

1. Vì sao nhận số 7 sau close vẫn có ok=true? Khi buffer đã hết, các lần nhận sau ra sao?
2. Gửi pointer có làm các lần sửa tiếp của sender an toàn không?
3. Worker pool nhiều worker gửi thì ai đóng result channel? Nếu consumer bỏ sớm thì sao?

**Giải thích:**

1. Số 7 là giá trị thật đang đệm. Close chấm dứt gửi mới mà không xóa nó. Khi hết dữ liệu, receive trả ngay zero/false nên loop phải quan sát completion.
2. Không. Pointer được copy, còn object vẫn chung. Cần chuyển ownership, copy dữ liệu hoặc phối hợp truy cập.
3. Coordinator có thể chứng minh mọi sender đã xong sẽ đóng. Consumer bỏ sớm còn cần cancellation và join; close từ receiver là không an toàn khi sender vẫn hoạt động.

## Tài liệu đối chiếu

- [Go specification: channels](https://go.dev/ref/spec#Channel_types), [select](https://go.dev/ref/spec#Select_statements) và [close](https://go.dev/ref/spec#Close) — hợp đồng ngôn ngữ.
- [The Go memory model](https://go.dev/ref/mem#chan) — thứ tự đồng bộ khi giao tiếp.
- [Channel source](https://go.dev/src/runtime/chan.go) và [select source](https://go.dev/src/runtime/select.go) — mô hình implementation, đối chiếu ngày 2026-10-15.

---
title: "Channel: gửi nhận, đóng kênh, select và ownership"
category: "Go"
tags: ["golang", "concurrency", "channels", "fundamentals"]
description: "Channel truyền giá trị và tạo điểm đồng bộ giữa goroutine. Để đọc một đoạn code channel, hãy xác định người gửi, người nhận, điều kiện block và ai bảo đảm không còn send trước khi close."
updated: 2026-10-14
translationKey: "go/channels"
---

Channel truyền giá trị và tạo điểm đồng bộ giữa goroutine. Để đọc một đoạn code channel, hãy xác định người gửi, người nhận, điều kiện block và ai bảo đảm không còn send trước khi close.

## 1. Tạo channel và giới hạn hướng

```go
ch := make(chan int)
go func() { ch <- 100 }()
fmt.Println(<-ch) // 100

func produce(out chan<- int) { out <- 1 }
func consume(in <-chan int) int { return <-in }
```

chan int cho phép send/receive; chan<- int chỉ send, <-chan int chỉ receive. Hướng channel thể hiện quyền ở chữ ký hàm, không tạo channel khác. Nil channel không có chỗ trao đổi nên send/receive block. Gán channel sao chép reference tới cùng channel; không tạo bản sao buffer.

## 2. Unbuffered và buffered khác hợp đồng chờ

Unbuffered (cap 0) cần một send và một receive gặp nhau để trao giá trị. Buffered cho sender đi tiếp khi còn chỗ; receiver nhận được khi có giá trị trong buffer. Buffer tách thời điểm producer/consumer nhưng không giải quyết consumer chậm vô hạn. Cap lớn tạo queue lớn và giữ memory, nên chọn theo backpressure/latency chấp nhận được, không mặc định buffered luôn nhanh hơn.

```go
ch := make(chan int, 2)
ch <- 10
ch <- 20
fmt.Println(len(ch), cap(ch)) // 2 2
fmt.Println(<-ch) // 10
```

Len là ảnh tức thời, không phải reservation: giữa len(ch) và send/receive, goroutine khác có thể đổi trạng thái. Không dùng if len(ch)<cap(ch) để bảo đảm send không block; dùng select có default nếu cần thử thao tác không chờ.

## 3. Bảng trạng thái và việc đóng channel

| Trạng thái | Send | Receive | Close |
|---|---|---|---|
| nil | Block mãi | Block mãi | Panic |
| open | Trao trực tiếp/ghi buffer, hoặc block | Nhận trực tiếp/buffer, hoặc block | Đóng thành công |
| closed | Panic | Drain buffer; sau đó zero value, ok=false | Panic |

```go
ch := make(chan int, 1)
ch <- 7
close(ch)
v, ok := <-ch
fmt.Println(v, ok) // 7 true
v, ok = <-ch
fmt.Println(v, ok) // 0 false
```

Close nghĩa “không còn gửi”, không xóa dữ liệu đã gửi và không phải free resource. Range nhận đến khi đóng và buffer hết. Không bắt buộc close mọi channel nếu không ai cần tín hiệu kết thúc. Bên sở hữu lifecycle gửi thường đóng channel; với nhiều sender, coordinator phải join chúng rồi close. Không close ở receiver trong khi senders có thể còn hoạt động.

## 4. Channel đồng bộ gì, và không đồng bộ gì?

Send được đồng bộ trước completion của receive tương ứng theo Go memory model. Điều này giúp publish dữ liệu đã chuẩn bị trước send. Tuy nhiên channel chỉ copy value: gửi pointer/slice/map vẫn chia sẻ object nền. Nếu sender tiếp tục sửa object trong lúc receiver đọc, vẫn có data race. Có thể chuyển ownership bằng convention, hoặc giữ lock riêng; channel không tự enforce ownership.

## 5. select: chọn một thao tác sẵn sàng

```go
select {
case out <- value:
    return nil
case <-ctx.Done():
    return ctx.Err()
}
```

Đây là đoạn trích trong hàm trả error. Nếu nhiều case sẵn sàng, select chọn pseudo-random đều giữa các case sẵn sàng; không ưu tiên case trên. Vì vậy ctx đã canceled không bảo đảm case send sẽ không được chọn nếu send cũng sẵn sàng. Default chạy khi không case nào sẵn sàng; không default thì G chờ. Select không case block mãi.

Channel expression và vế phải của send được đánh giá một lần khi vào select, theo thứ tự source; đừng đặt side effect đắt tiền vào đó rồi nghĩ chỉ case được chọn mới chạy. Receive từ closed channel luôn sẵn sàng; trong loop nhiều nguồn, gán nguồn đã đóng về nil để vô hiệu hóa case nếu không muốn busy loop. Default trong for cũng có thể tạo busy spinning.

## 6. hchan và ring buffer: mô hình runtime

```text
hchan (schematic, not a public Go type):
  qcount / dataqsiz / buf
  sendx / recvx
  sendq / recvq
  lock / closed / element type information

buffer slots: [0][1][2]...[cap-1]
               ↑ sendx      ↑ recvx (both wrap around)
```

qcount là số giá trị đang đệm, dataqsiz là cap; sendx/recvx là index chứ không phải pointer. Ring buffer tái sử dụng slot mà không dịch toàn bộ dữ liệu. Mỗi lần copy payload vẫn có chi phí theo kích thước element, nên O(1) queue bookkeeping không phải O(1) thời gian trọn thao tác với mọi payload.

Đường trao dữ liệu thường kiểm tra partner đang đợi, dùng direct handoff khi phù hợp, hoặc đọc/ghi buffer. Nếu không thể tiến hành, G đăng ký sudog vào sendq/recvq rồi park; partner làm G runnable trở lại. Runtime dùng khóa để bảo vệ metadata, nhưng không phải mọi fast check đều lock. Khi buffer đầy và sender chờ, receive có thể lấy phần tử cũ rồi đưa giá trị sender vào slot vừa giải phóng để giữ thứ tự queue.

## 7. select bên trong runtime và contention

Select tổng quát tổ chức các case (scase), thứ tự poll ngẫu nhiên và thứ tự khóa channel ổn định để tránh deadlock nội bộ. Nếu phải chờ, nó đăng ký vào các queue liên quan; khi một case thắng thì gỡ registrations còn lại. Compiler có thể tối ưu select đơn giản, nên không suy luận mọi select đều tốn hơn một thao tác channel bằng cùng hệ số.

Nhiều G tranh một channel có thể làm lock nóng. Batching giảm số send nhưng tăng kích thước payload/thời gian chờ; sharding chia contention nhưng khó giữ thứ tự toàn cục; buffer local cần quy tắc flush khi shutdown. Direct handoff là runtime optimization, không phải nút bật trong code ứng dụng. Đo contention và latency trước khi chọn kỹ thuật.

## Ví dụ áp dụng

### Tình huống: một producer, một consumer, kết thúc hữu hạn

Producer tạo dữ liệu, consumer nhận đến khi channel đóng. Quyền sở hữu việc đóng kênh thuộc producer vì nó biết khi nào không còn gửi nữa.

```go
func sequence(count int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := 1; n <= count; n++ {
            out <- n
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

Channel không buffer: producer phải chờ consumer nhận từng số, nên tốc độ nhận giới hạn tốc độ gửi. Đây là backpressure, tức phía xử lý chậm tạo sức ép để phía tạo dữ liệu chờ. Consumer này nhận hết nên producer thoát bình thường. Nếu consumer break sớm, producer có thể mắc ở lần gửi tiếp theo; API cho trường hợp đó cần tín hiệu hủy và select khi gửi. Chỉ thêm buffer không giải quyết tổng quát việc bỏ nhận.

## Tự kiểm tra

Vì sao receive đầu tiên sau close có ok=true? Một pointer đã gửi qua channel có an toàn nếu sender tiếp tục sửa nó không? Thiết kế ai đóng channel trong worker pool nhiều sender.

## Tài liệu đối chiếu

- [Go language specification](https://go.dev/ref/spec)
- [The Go memory model](https://go.dev/ref/mem)
- [Channel runtime source](https://go.dev/src/runtime/chan.go)
- [Select runtime source](https://go.dev/src/runtime/select.go)

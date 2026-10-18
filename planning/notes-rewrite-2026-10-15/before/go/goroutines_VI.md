---
title: "Goroutine: chạy đồng thời, scheduler và quản lý vòng đời"
category: "Go"
tags: ["golang", "concurrency", "goroutines", "fundamentals"]
description: "Goroutine là một luồng thực thi do Go runtime quản lý. Từ khóa go giúp bắt đầu công việc đồng thời, nhưng phần quan trọng hơn là biết ai chờ kết quả, ai yêu cầu dừng và công việc dọn dẹp lúc nào."
updated: 2026-10-14
translationKey: "go/goroutines"
---

Goroutine là một luồng thực thi do Go runtime quản lý. Từ khóa go giúp bắt đầu công việc đồng thời, nhưng phần quan trọng hơn là biết ai chờ kết quả, ai yêu cầu dừng và công việc dọn dẹp lúc nào.

## 1. Khởi chạy không có nghĩa hoàn thành

```go
func hello(name string) { fmt.Println("Hello,", name) }

func main() {
    var wg sync.WaitGroup
    wg.Add(1)
    go func() {
        defer wg.Done()
        hello("An")
    }()
    fmt.Println("main continues")
    wg.Wait()
}
```

Ví dụ cần fmt và sync. go trả quyền điều khiển cho caller mà không đợi hello; thứ tự hai dòng output không cố định. Khi main trả về, process kết thúc, không tự đợi các goroutine khác. Time.Sleep chỉ đợi một khoảng thời gian, không xác nhận công việc xong; WaitGroup mới biểu đạt việc chờ hoàn thành.

Add trước khi khởi chạy, Done đúng một lần cho mỗi task, và không copy WaitGroup sau lần dùng đầu. WaitGroup không truyền error, không hủy task và không bảo vệ dữ liệu được các task sửa. Go 1.25 thêm WaitGroup.Go cho mẫu tạo task/chờ, nhưng hàm truyền vào API đó không được panic; Add/Done ở trên vẫn phù hợp khi cần tương thích bản cũ.

## 2. Concurrency và parallelism

Concurrency là tổ chức nhiều công việc có tiến trình chồng lấp; parallelism là chúng thực sự chạy cùng lúc trên nhiều execution resource. Một core vẫn có concurrency bằng cách chuyển giữa task. Thêm goroutine không tự tăng tốc nếu bottleneck là CPU, lock hoặc database. Unbounded concurrency còn làm request chậm hơn vì tăng queue, memory và contention.

## 3. Process, thread và goroutine

| Đơn vị | Không gian bộ nhớ | Ai lập lịch? | Stack và chi phí |
|---|---|---|---|
| Process | Thường cách ly với process khác | OS | Có tài nguyên riêng; giao tiếp thường cần IPC |
| OS thread | Chia sẻ process | OS | Có stack riêng; kích thước/chuyển ngữ cảnh phụ thuộc OS |
| Goroutine | Chia sẻ process | Go runtime trên các OS thread | Stack nhỏ, có thể tăng/giảm; không ánh xạ 1:1 thread |

Mốc 2 KiB thường xuất hiện khi đọc minimum stack của runtime; stack bắt đầu thực tế có thể được điều chỉnh. Khi stack tăng, runtime có thể cấp vùng mới và copy stack; khi chỉ chuyển giữa goroutine thì lưu/khôi phục trạng thái như SP, PC, không copy toàn stack như một điều kiện để switch. Chi phí không có con số nano giây cố định. OS vẫn lập lịch thread bên dưới.

Goroutine chia sẻ heap dù có stack riêng, nên stack riêng không ngăn data race trên object chung. Hàng trăm nghìn goroutine có thể khả thi cho workload phù hợp, nhưng không có số lượng tối đa nhỏ/lớn được hứa sẵn: stack, buffer, socket, GC và CPU đều tạo giới hạn.

## 4. Mô hình G–M–P

```text
G (work + stack + state)
        runs on
M (OS thread) + P (right/resources to execute ordinary Go code)
                     ├─ local runnable queue
                     ├─ runnext slot
                     └─ allocation / runtime caches

shared global runnable queue ↔ scheduler ↔ network poller
```

G giữ trạng thái công việc. M thực thi instruction trên một OS thread. P là tài nguyên lập lịch logic, không phải một CPU core; M cần P để chạy Go code thông thường. Số M có thể lớn hơn số P khi có syscall/cgo. GOMAXPROCS đặt số P, không giới hạn tổng goroutine hay tổng thread, cũng không pin chúng vào một số core cố định.

Trong runtime quen thuộc, local queue có 256 slot và runnext là slot ưu tiên riêng. M0 là thread khởi đầu phục vụ bootstrap, không phải cam kết main luôn chạy trên M0. Mỗi M có g0 để chạy trên system stack cho một số việc runtime; g0 không phải một goroutine nghiệp vụ bạn khởi chạy bằng go. Đây là chi tiết source có thể đổi theo phiên bản.

Trước Go 1.25, mặc định GOMAXPROCS thường theo logical CPU lúc khởi động. Go 1.25 bổ sung xét Linux cgroup CPU limit và cập nhật định kỳ khi giới hạn thay đổi; CPU request không phải CPU limit. Đặt GOMAXPROCS thủ công hoặc cấu hình tương thích có thể đổi hành vi đó. Đọc version/configuration của ứng dụng trước khi suy luận tài nguyên trong container.

## 5. Các đường đi của scheduler

**Runnable → running:** task được đưa vào run queue rồi M có P chọn chạy. **Channel/lock wait:** G park và M/P có thể chạy G khác. **Blocking syscall:** M có thể bị OS giữ; runtime có cơ chế nhả/retake P để M khác chạy. Khi syscall xong, G có thể lấy lại P hoặc trở về runnable queue, không phải luôn theo một đường cố định.

**Work stealing:** một P thiếu việc tìm runnable G từ P khác, thường lấy một phần queue để giảm contention. **Global queue:** chứa việc dùng chung khi cần, và scheduler kiểm tra để không bỏ đói công việc ngoài local queue. Con số kiểm tra mỗi 61 scheduling ticks có trong một số đường code, nhưng tick không phải một millisecond hay lời hứa thời gian chờ.

Bản runtime cũ có batch global lấy xấp xỉ len(GRQ)/P + 1, còn bị chặn bởi số G hiện có, giới hạn yêu cầu và khoảng nửa local queue. Công thức min(...,128) trong bản notes cũ chỉ là mô hình rút gọn. Findrunnable còn xét timer, GC, network và trạng thái thread; không có thứ tự local → global → steal → poller cố định cho mọi lần.

**Network poller:** với I/O mạng mà runtime hỗ trợ, G đợi readiness qua epoll/kqueue/IOCP tùy OS, còn M có thể làm việc khác. Không phải mọi file I/O hay cgo đều đi qua đường này. **Preemption:** từ Go 1.14 có asynchronous preemption trên các nền tảng được hỗ trợ, bổ sung các safe point hợp tác; không mô tả Go hiện đại là chỉ chạy cooperative.

## 6. Năm nhóm tài nguyên có thể bị giữ quá lâu

| Nhóm | Tình huống | Hướng xử lý |
|---|---|---|
| Goroutine | Gửi không có receiver; nhận không còn sender; quên Done | Thiết kế completion và cancellation |
| Context | Không gọi cancel | Gọi cancel ở mọi đường kết thúc phù hợp |
| Timer | Tạo nhiều timer, giữ reference hoặc không dừng logic | Hiểu phiên bản timer và vòng đời |
| Resource | Không đóng body/file/rows | Close đúng nơi sở hữu |
| Memory retention | Slice nhỏ giữ array lớn | Copy vùng cần giữ, bỏ alias cũ |

Mutex không reentrant: lấy cùng lock hai lần, vòng chờ lock hoặc quên Unlock có thể gây deadlock. I/O không timeout có thể giữ G vô hạn, nhưng network wait không nhất thiết giữ M. HTTP body không Close có thể giảm reuse connection và giữ tài nguyên; không nên kết luận một body luôn tạo đúng một goroutine leak. Một G bị park thường không dùng CPU liên tục, nhưng vẫn giữ stack và dữ liệu reachable.

Về timer: trước Go 1.23, timer/ticker chưa dừng có hạn chế thu gom. Với semantics Go 1.23 mới, GC có thể thu hồi timer/ticker không còn reference dù chưa Stop. Tạo time.After liên tục vẫn gây allocation churn và có thể vô tình đặt lại timeout mỗi lượt; đừng giữ lời khẳng định “mọi time.After trong loop luôn leak đến lúc fire” cho mọi bản Go. Go.mod và GODEBUG tương thích ảnh hưởng semantics timer.

## 7. Mỗi goroutine cần chủ sở hữu và lối thoát

```go
func forward(ctx context.Context, out chan<- int, value int) error {
    select {
    case out <- value:
        return nil
    case <-ctx.Done():
        return ctx.Err()
    }
}
```

Cancellation là yêu cầu hợp tác: code phải lắng nghe ctx hoặc gọi API hỗ trợ nó. Cancel không đợi G thật sự dừng; dùng WaitGroup/completion channel để join. Bounded worker pool hoặc semaphore giúp giới hạn công việc đang chạy. Một lối thoát ở send không giải quyết CPU loop hoặc I/O nằm trước send; từng điểm chờ phải có chính sách dừng phù hợp.

Panic không recover trong một goroutine có thể kết thúc process. Recover phải ở deferred function của cùng goroutine; không cần bọc mọi go bằng recover. Nếu có boundary phục hồi, ghi stack trace và chuyển kết quả thành lỗi rõ, không coi task đã hoàn thành thành công chỉ vì không crash.

```go
go func() {
    defer func() {
        if value := recover(); value != nil {
            log.Printf("worker panic: %v\n%s", value, debug.Stack())
        }
    }()
    doWork()
}()
```

## 8. Quan sát trước khi tối ưu

Theo dõi runtime.NumGoroutine theo thời gian, so với request đang hoạt động. Dùng goroutine profile để thấy stack đang chờ, pprof/trace để tìm contention và scheduler delay. GODEBUG=schedtrace=1000 in scheduler state mỗi khoảng 1.000 ms; thêm scheddetail=1 khi cần chi tiết. Runtime.Gosched nhường lượt, không thay synchronization; GOMAXPROCS(0) đọc cấu hình hiện tại.

Race detector giúp tìm unsynchronized memory access, không chứng minh mọi logic race/deadlock đều vắng mặt. Tool như go.uber.org/goleak có thể hỗ trợ phát hiện goroutine còn dư khi kiểm thử; cần phân biệt goroutine nền hợp lệ với leak. Không tự expose debug HTTP endpoints ra Internet.

## Ví dụ áp dụng

### Tình huống: chia công việc và chờ tất cả hoàn tất

Khi biết trước danh sách công việc, có thể phân mỗi phần tử cho một goroutine và chờ bằng WaitGroup. Ví dụ nhỏ dưới đây minh họa vòng đời, chưa phải worker pool cho hàng triệu phần tử.

```go
func squares(input []int) []int {
    output := make([]int, len(input))
    var wg sync.WaitGroup
    for i, value := range input {
        wg.Add(1)
        go func(index, n int) {
            defer wg.Done()
            output[index] = n * n
        }(i, value)
    }
    wg.Wait()
    return output
}

fmt.Println(squares([]int{3, 1, 2})) // [9 1 4]
```

Mỗi goroutine ghi một index riêng; slice không append hay đổi cấu trúc trong lúc chạy. Wait bảo đảm caller chỉ đọc kết quả sau khi các lần ghi hoàn tất. Thứ tự hoàn thành không cố định, nhưng thứ tự output theo index đầu vào nên vẫn cố định. Add diễn ra trước khi khởi chạy goroutine. Với đầu vào lớn, giới hạn số worker và cân nhắc chi phí: phép nhân nhỏ có thể rẻ hơn chi phí chạy đồng thời. Caller cũng không được sửa input đồng thời khi hàm đang đọc nó.

## Tự kiểm tra

Nếu caller không cần kết quả nữa, worker đang send thoát thế nào? Phân biệt goroutine parked với OS thread blocking; giải thích tại sao NumGoroutine tăng chưa đủ để kết luận có leak.

## Tài liệu đối chiếu

- [sync.WaitGroup](https://pkg.go.dev/sync#WaitGroup)
- [Runtime scheduler source](https://go.dev/src/runtime/proc.go)
- [Go 1.25 runtime changes](https://go.dev/doc/go1.25)
- [Go 1.23 timer changes](https://go.dev/wiki/Go123Timer)
- [Diagnostics](https://go.dev/doc/diagnostics)

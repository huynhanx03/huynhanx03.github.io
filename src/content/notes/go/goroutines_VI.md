---
title: "Goroutine: chạy đồng thời, scheduler và quản lý vòng đời"
category: "Go"
tags: ["golang", "concurrency", "goroutines", "fundamentals"]
description: "Goroutine là một luồng thực thi do Go runtime quản lý. Từ khóa go giúp bắt đầu công việc đồng thời, nhưng phần quan trọng hơn là biết ai chờ kết quả, ai yêu cầu dừng và công việc dọn dẹp lúc nào."
updated: 2026-10-15
translationKey: "go/goroutines"
---

Một hàm có thể mất nhiều thời gian mà không cần caller luôn chờ bên cạnh. Thêm `go` trước lời gọi giúp hàm chạy đồng thời, cho caller tiếp tục. Nhưng ngay lúc ấy xuất hiện một câu hỏi mới: khi caller trả về, ai biết công việc đã xong chưa?

Bài này đi từ một chương trình nhỏ tới scheduler và cách chẩn đoán vòng đời trong service. Bạn cần biết hàm và khái niệm dữ liệu dùng chung. Các ví dụ là đoạn trích độc lập; đặt câu lệnh trong `main` và import package tương ứng. Thứ tự lập lịch bên dưới là khả năng có thể xảy ra hoặc chi tiết triển khai, không phải lời hứa về thứ tự output.

## Khởi chạy công việc rồi chờ nó hoàn tất

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

Thêm `package main` và import `fmt`, `sync` để có chương trình hoàn chỉnh. `go` khởi chạy một **goroutine**, tức luồng thực thi do Go runtime quản lý. Caller tiếp tục mà không chờ `hello` trả về. Dòng nào trong hai dòng in ra cũng có thể xuất hiện trước; code chỉ bảo đảm worker hoàn thành trước khi `main` trả về, không áp đặt thứ tự giữa hai lệnh in.

`WaitGroup` đếm công việc chưa xong. `Add(1)` ghi nhận task trước khi chạy, `Done` giảm đếm lúc worker thoát, còn `Wait` chờ đếm về 0. Nếu Add bên trong worker, Wait có thể nhìn thấy 0 trước khi worker kịp đăng ký. Mỗi task phải có đúng một Done, và không copy WaitGroup sau lần sử dụng đầu.

Khi `main` trả về, chương trình kết thúc mà không tự join goroutine khác. `time.Sleep` chỉ đợi thời gian trôi qua: máy chậm hoặc dependency bị chặn có thể khiến task chạy lâu hơn. Cơ chế báo hoàn tất mới diễn đạt đúng điều kiện cần chờ.

Go 1.25 thêm `WaitGroup.Go` để khởi chạy task có theo dõi; hàm truyền vào không được panic. Dạng Add/Done vẫn phù hợp khi hỗ trợ toolchain cũ. Cả hai cách đều không truyền error, không yêu cầu hủy và không bảo vệ object dùng chung khỏi sửa đồng thời.

## Công việc chồng lấp chưa chắc chạy cùng lúc

Concurrency tổ chức nhiều công việc có tiến trình chồng lấp. Parallelism nghĩa là chúng thực sự thực thi cùng lúc trên nhiều tài nguyên xử lý. Một logical CPU vẫn có concurrency nhờ chuyển giữa các task, nhất là khi có task chờ I/O. Công việc CPU muốn chạy song song cần năng lực xử lý sẵn có.

Cần phân biệt logical CPU với core vật lý: SMT, chẳng hạn Intel Hyper-Threading, cho phép nhiều hardware thread chia sẻ tài nguyên thực thi của một core. Vì thế số logical CPU không đồng nghĩa số core độc lập hay mức tăng tốc tương ứng. [Intel giải thích quan hệ giữa core và logical processor](https://www.intel.com/content/www/us/en/developer/articles/guide/hyper-thread-tuning-guide-for-video-ai-workload.html).

Thêm goroutine không tăng khả năng phục vụ của database và không loại bỏ mutex đang bị tranh chấp. Khi dependency đã bão hòa, việc mới có thể chỉ xếp hàng, giữ thêm stack, buffer và connection. Worker pool hữu hạn hoặc semaphore đặt giới hạn chủ động cho việc đang chạy. Giới hạn phù hợp phụ thuộc CPU, năng lực dependency và thời gian chờ chấp nhận được.

Một ví dụ nhỏ giúp theo dõi rõ các lần ghi dùng chung:

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

Mỗi task nhận index và số riêng rồi ghi một phần tử khác nhau. Không task nào append hoặc thay `output`. Wait bảo đảm mọi lần ghi xong trước khi caller đọc kết quả. Task có thể hoàn thành theo thứ tự bất kỳ, còn kết quả vẫn theo index đầu vào. Caller cũng không được sửa input đồng thời khi `squares` đang đọc.

Ví dụ này giải thích vòng đời và quyền ghi dữ liệu, chưa phải cách hiệu quả để bình phương số. Phép nhân nhỏ có thể rẻ hơn overhead goroutine; đầu vào rất lớn lại tạo quá nhiều công việc. Giả định bình phương các số nằm trong miền `int`; tràn số là vấn đề riêng.

## Goroutine không ánh xạ một–một với OS thread

| Đơn vị | Quan hệ bộ nhớ | Ai lập lịch? | Hệ quả về tài nguyên |
| --- | --- | --- | --- |
| Process | Thường cách ly với process khác | OS | Có tài nguyên riêng; giao tiếp thường cần IPC |
| OS thread | Chia sẻ address space trong process | OS | Có stack riêng; chi phí chuyển tùy OS |
| Goroutine | Chia sẻ bộ nhớ process với goroutine khác | Go runtime trên OS threads | Stack nhỏ có thể điều chỉnh; không cần một thread riêng |

Stack riêng không làm heap object thành dữ liệu riêng. Hai goroutine vẫn có thể cùng giữ một map hoặc user object rồi race trên đó.

Con số stack 2 KiB thường được nhắc đến là minimum trong runtime, không phải bảo đảm mỗi goroutine luôn chiếm đúng từng ấy. Kích thước ban đầu có thể được điều chỉnh; stack có thể tăng hoặc giảm. Khi tăng, runtime có thể cấp vùng mới và copy stack. Chuyển goroutine thông thường lưu/khôi phục trạng thái như SP, PC; không cần copy toàn stack ở mỗi lần chuyển.

Không có chi phí chuyển cố định theo nano giây hay một số lượng goroutine luôn an toàn. Hàng trăm nghìn goroutine có thể hợp lý với workload phù hợp, nhưng stack, object giữ lại, socket, GC và CPU giới hạn số hữu ích. OS vẫn lập lịch các thread nằm dưới scheduler Go.

## G, M và P chia trách nhiệm thế nào?

```text
G: goroutine state + stack
             executes on
M: OS thread + P: resources/right to execute ordinary Go code
                 ├─ local runnable queue
                 ├─ runnext
                 └─ allocation/runtime caches

shared global queue ↔ scheduler ↔ network poller
```

G giữ công việc và trạng thái thực thi. M là OS thread chạy instruction. P là tài nguyên lập lịch logic mà M cần để chạy Go code thông thường. P không phải core; mô hình này cũng không pin G hay M vào core cố định.

`GOMAXPROCS` điều khiển số P. Nó không giới hạn tổng goroutine hay tổng OS thread: syscall bị chặn hoặc cgo có thể cần nhiều M hơn P. Vì thế đặt bằng 2 không có nghĩa process chỉ có hai thread.

Khi đọc source, bạn thường gặp local queue 256 entry trên mỗi P và slot ưu tiên riêng `runnext`. Thread bootstrap gọi là M0, nhưng điều này không hứa `main` luôn chạy ở đó. Mỗi M có `g0` dùng system stack cho một số công việc runtime; g0 không phải goroutine nghiệp vụ tạo bằng `go`. Tên và kích thước ấy thuộc implementation runtime.

### Vì sao cấu hình CPU trong container quan trọng?

Trước Go 1.25, mặc định GOMAXPROCS thường theo logical CPU sẵn có lúc khởi động. Go 1.25 thêm khả năng xét CPU limit từ Linux cgroup và cập nhật định kỳ khi limit đổi. CPU request của Kubernetes khác CPU limit. Đặt GOMAXPROCS thủ công hoặc dùng cấu hình tương thích có thể tắt/thay đổi hành vi tự động.

Trước khi dùng số core của host để giải thích hiệu năng container, hãy xem phiên bản Go và cấu hình ứng dụng. `runtime.GOMAXPROCS(0)` đọc giá trị hiện tại mà không thay nó.

## Theo dõi lúc công việc không còn runnable

G runnable có thể được M đang giữ P chọn để chạy. Khi phải chờ channel hoặc lock, G có thể **park**: G chờ còn M/P chạy việc khác. G đang park thường không tiêu CPU liên tục, nhưng stack và object reachable vẫn giữ bộ nhớ.

Blocking syscall khác ở chỗ OS có thể giữ chính M. Runtime có cơ chế nhả hoặc retake P để M khác chạy Go code. Khi syscall xong, G có thể lấy lại P hoặc thành runnable để chờ lượt. Không có một đường quay lại duy nhất áp dụng cho mọi tình huống.

Với I/O mạng được hỗ trợ, network poller chờ readiness qua cơ chế OS như epoll, kqueue hoặc IOCP. Nhờ đó G chờ có thể nhả tài nguyên thực thi. Không phải mọi file operation hay cgo đều đi đường này, nên khẳng định “I/O chỉ block goroutine” cần nêu điều kiện.

P thiếu việc có thể lấy runnable G từ P khác, thường lấy một phần queue để giảm tranh chấp. Global runnable queue giữ việc dùng chung; các lần kiểm tra fairness giúp tránh bỏ đói nó. Một số đường scheduler kiểm tra mỗi 61 scheduling ticks; tick không phải millisecond hay giới hạn thời gian chờ.

Batch từ global queue trong runtime lịch sử lấy xấp xỉ `len(global queue)/P + 1`, còn bị chặn bởi số G có sẵn, giới hạn caller yêu cầu và khoảng nửa local queue. Công thức kiểu `min(..., 128)` chỉ là cách nhìn rút gọn. Scheduler còn xét timer, network readiness, GC và trạng thái thread; không có thứ tự local → global → steal → poller cố định cho mọi lần tìm việc.

Go 1.14 đưa asynchronous preemption vào các nền tảng được hỗ trợ, bổ sung cho safe point hợp tác. Vì thế không nên mô tả Go hiện đại là scheduler hoàn toàn cooperative. Preemption cho việc khác cơ hội chạy; nó không tạo đồng bộ mà chương trình cần. `runtime.Gosched` cũng nhường lượt mà không thiết lập giao thức truy cập bộ nhớ chung.

## Mỗi goroutine cần chủ sở hữu và lối thoát

Giả sử worker đã có kết quả nhưng caller bỏ nhận. Send vô điều kiện có thể chờ mãi. Cho phép hủy send tạo thêm một lối thoát:

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

Hàm cần import `context`. Nếu send chưa thực hiện được và có cancellation, hàm trả error. Nếu cả hai case sẵn sàng thì case nào cũng có thể thắng; vị trí case không tạo ưu tiên cho cancellation. CPU loop trước send vẫn cần điểm kiểm tra hủy; I/O trước đó cần API hỗ trợ context hoặc deadline.

Cancellation là yêu cầu dừng có hợp tác. Nó không join worker. Chủ sở hữu cần WaitGroup hoặc completion channel khi phải biết việc dọn dẹp đã xong; bài [Context](/vi/notes/go/context/) có ví dụ hủy rồi join. Bài [Channels](/vi/notes/go/channels/) giải thích cách coordinator đóng output sau khi mọi sender hoàn tất.

### Nhiều vấn đề khác nhau thường cùng được gọi là leak

| Thứ bị giữ lại | Một nguyên nhân có thể có | Quyết định về vòng đời |
| --- | --- | --- |
| Goroutine | Send không có receiver, receive hết sender, thiếu báo hoàn tất | Điều kiện thoát và join |
| Tài nguyên context | Bỏ qua hàm cancel | Cancel ở các đường trả về phù hợp |
| Timer | Tạo liên tục hoặc giữ timer | Vòng đời và semantics theo phiên bản |
| Tài nguyên bên ngoài | Không đóng body/file/rows | Chủ sở hữu gọi `Close` |
| Heap object | Slice nhỏ giữ array lớn | Copy phần cần giữ hoặc bỏ alias |

Mutex không reentrant: lấy cùng lock hai lần có thể deadlock, cũng như vòng phụ thuộc khóa hoặc quên Unlock. I/O thiếu timeout hiệu lực có thể giữ công việc vô hạn. HTTP response body chưa đóng có thể cản connection reuse và giữ tài nguyên, nhưng không đồng nghĩa mỗi body leak đúng một goroutine. GC không thực hiện giao thức shutdown thay ứng dụng.

Lời khuyên về timer phải gắn phiên bản. Trước Go 1.23, timer/ticker chưa Stop có hạn chế thu gom. Với semantics mới từ 1.23, timer/ticker không còn reference có thể được GC thu hồi dù chưa Stop. Phiên bản trong module và cấu hình GODEBUG tương thích ảnh hưởng semantics được dùng. Lặp `time.After` vẫn có thể gây allocation churn hoặc vô tình khởi động lại timeout mỗi vòng; “mọi loop đều leak tới lúc timer fire” không đúng cho mọi bản Go.

### Recover panic tại ranh giới được chọn có chủ đích

Panic chưa recover ở bất kỳ goroutine nào có thể kết thúc process. Deferred recovery phải chạy trong cùng goroutine gây panic; recover ở caller không bắt panic của worker mới.

```go
go func() {
    defer func() {
        if value := recover(); value != nil {
            log.Printf("worker panic: %v\n%s", value, debug.Stack())
            // Báo lỗi qua cơ chế trả kết quả của ứng dụng.
        }
    }()
    doWork()
}()
```

Đoạn trích giả định đã có `doWork` và import `log`, `runtime/debug`. Nó minh họa vị trí recover có hiệu lực, chưa phải giao thức trả kết quả đầy đủ. Nếu service chủ ý recover ở một boundary, hãy ghi stack và báo thất bại; chỉ log không được khiến task lỗi trông như thành công. Không cần mặc định bọc mọi câu lệnh go bằng recover.

## Khảo sát vòng đời trước khi đổi cấu hình scheduler

Theo dõi `runtime.NumGoroutine` theo thời gian cùng số request đang hoạt động. Tăng khi tải tăng có thể bình thường; tăng sau khi tải đã hết cần thêm bằng chứng. Goroutine profile cho biết worker còn park ở đâu, còn pprof và execution trace giúp thấy contention, scheduler delay và CPU.

`GODEBUG=schedtrace=1000` in trạng thái scheduler khoảng mỗi 1.000 millisecond; `scheddetail=1` thêm chi tiết. Đây là cấu hình chẩn đoán, không phải cách tự sửa hiệu năng. Không expose debug HTTP endpoint ra Internet công khai.

Race detector tìm truy cập bộ nhớ không đồng bộ trên đường đã chạy, không tìm hết lost update, deadlock hay lỗi vòng đời. Tool như `go.uber.org/goleak` hỗ trợ tìm goroutine còn dư trong test, nhưng phải tính đến background work hợp lệ. Đọc kết quả tool cùng quy tắc sở hữu và shutdown dự kiến.

## Thử dự đoán trước khi xem đáp án

1. `WaitGroup.Wait` có thay mutex khi nhiều worker tăng cùng một số nguyên không?
2. Caller cancel lúc worker đang send bị chặn. Điều gì cho worker thoát, và điều gì báo caller rằng worker đã thoát?
3. Một nghìn G park có đồng nghĩa một nghìn OS thread bị chặn không? Số G tăng có đủ chứng minh leak không?

**Giải thích:**

1. Không. Chờ chỉ phối hợp hoàn tất, không ngăn các worker race trong lúc chạy. Bảo vệ cập nhật chung hoặc chia dữ liệu độc lập như `squares`.
2. Select giữa send và ctx.Done tạo lối thoát. Completion channel hoặc WaitGroup tạo bước join riêng. Những thao tác chặn trước send cũng cần chính sách dừng.
3. Cả hai đều không. Nhiều G park có thể dùng rất ít M. Cần so số lượng với tải, tài nguyên giữ lại, stack và việc G có biến mất sau khi chủ sở hữu kết thúc hay không.

## Tài liệu đối chiếu

- [sync.WaitGroup](https://pkg.go.dev/sync#WaitGroup) — hợp đồng completion và `Go`.
- [Runtime scheduler source](https://go.dev/src/runtime/proc.go) — chi tiết triển khai, đối chiếu ngày 2026-10-15.
- [Go 1.25 runtime changes](https://go.dev/doc/go1.25#runtime) và [Go 1.14 runtime changes](https://go.dev/doc/go1.14#runtime) — thay đổi scheduler theo phiên bản.
- [Go 1.23 timer changes](https://go.dev/wiki/Go123Timer) — thu gom timer và cấu hình tương thích.
- [Diagnostics](https://go.dev/doc/diagnostics) — profile, trace và các công cụ quan sát.

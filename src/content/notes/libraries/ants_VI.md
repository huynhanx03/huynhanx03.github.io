---
title: "ants: giới hạn công việc và hiểu cách goroutine pool vận hành"
category: "Libraries"
tags: ["golang", "concurrency", "ants", "pool", "performance"]
description: "Theo dõi Submit, worker rảnh, chờ công suất và cleanup; phân biệt bảo đảm sử dụng với chi tiết ants v2.11.0."
updated: 2026-10-15
translationKey: "libraries/ants"
---

Một chương trình cần xử lý nhiều công việc độc lập. Tạo một goroutine cho mỗi việc khá thuận tiện, nhưng nếu đầu vào lớn hơn khả năng xử lý, số công việc đang sống có thể tăng quá mức: tốn stack, giữ dữ liệu và gây áp lực lên dependency.

`ants` cung cấp goroutine pool để giới hạn và tái sử dụng worker. Giá trị đầu tiên là kiểm soát số việc chạy đồng thời; hiệu năng cần được đánh giá theo workload. Bài này tách cách dùng pool với các chi tiết triển khai trong **ants v2.11.0**, không khẳng định đây là phiên bản mới nhất.

## Theo dõi vòng đời một công việc

Khi `Submit` nhận một task, pool tìm worker đang rảnh. Nếu chưa có worker rảnh và chưa chạm giới hạn, nó có thể tạo worker mới. Khi hết chỗ, lời gọi có thể phải chờ hoặc trả lỗi overload tùy cấu hình. Sau task, worker có thể quay về hàng đợi rảnh để nhận việc tiếp.

Pool không tự làm phép tính nhanh hơn. Nếu hệ thống chỉ cho phép 20 truy vấn đồng thời, pool giúp biểu đạt giới hạn ấy, nhưng hàng nghìn goroutine đang chờ Submit vẫn có thể giữ nhiều bộ nhớ. Cần giới hạn cả cách nhận đầu vào và số người chờ, không chỉ số worker. `Nonblocking` và `MaxBlockingTasks` là các lựa chọn cần đọc theo hợp đồng phiên bản đang dùng.

```go
func runBatch() error {
    pool, err := ants.NewPool(2)
    if err != nil {
        return err
    }
    defer pool.Release()

    results := make([]int, 4)
    var wg sync.WaitGroup
    var submitErr error
    for index := range results {
        index := index // Capture this iteration's index for older Go language versions too.
        wg.Add(1)
        err := pool.Submit(func() {
            defer wg.Done()
            results[index] = index * index
        })
        if err != nil {
            wg.Done()
            submitErr = err
            break
        }
    }
    wg.Wait()
    if submitErr != nil {
        return submitErr
    }
    fmt.Println(results) // [0 1 4 9]
    return nil
}
```

Đây là hàm minh họa, cần import `fmt`, `sync` và `github.com/panjf2000/ants/v2`. `index := index` tạo biến riêng cho closure ngay cả trong module còn dùng ngữ nghĩa vòng lặp cũ; nếu bỏ dòng này, Go 1.22 trở lên chỉ bảo đảm biến riêng khi language version của module/file đã chọn ngữ nghĩa mới. Task ghi các index khác nhau; `Wait` chờ trước khi đọc kết quả. Thứ tự task hoàn tất không cố định, nhưng vị trí kết quả đã được xác định nên output thành công ổn định.

Nếu Submit thất bại, task chưa được nhận nên caller cân bằng lại `wg.Add(1)` bằng `Done`, dừng gửi rồi vẫn chờ các task đã nhận. `Release` không phải cơ chế đợi kết quả nghiệp vụ; bước chờ ở đây do WaitGroup đảm nhiệm. Với task có thể panic hoặc bị treo, ứng dụng cần chính sách lỗi, deadline và cleanup riêng.

## Worker rảnh được chọn theo cấu trúc nào?

Trong phiên bản đối chiếu, cấu hình thường dùng worker stack: worker trả về sau nằm trên đỉnh và được lấy trước. Khi bật PreAlloc, pool dùng loop queue dựa trên ring buffer. Đó là lựa chọn cấu trúc lưu worker rảnh, không phải cam kết thứ tự hoàn tất task.

LIFO có thể tạo cơ hội dùng lại worker vừa hoạt động; không nên suy thành bảo đảm dữ liệu vẫn nằm trong L1/L2 hoặc worker chạy trên cùng CPU. FIFO của cấu trúc queue cũng không bảo đảm công bằng cho mọi goroutine Submit, vì còn tranh khóa và lịch scheduler.

Nguồn đối chiếu: [worker_stack.go v2.11.0](https://github.com/panjf2000/ants/blob/v2.11.0/worker_stack.go), [worker_loop_queue.go v2.11.0](https://github.com/panjf2000/ants/blob/v2.11.0/worker_loop_queue.go).

## Chờ worker khác với chờ giành khóa

Các thao tác lấy/trả worker cần bảo vệ trạng thái pool. Phiên bản này dùng spin lock với atomic CAS, gọi `runtime.Gosched()` khi chưa lấy được khóa và tăng số lượt nhường theo exponential backoff có giới hạn. Đây là quyết định triển khai cho đoạn khóa ngắn; không chứng minh spin lock luôn hơn `sync.Mutex`. Mutex của Go cũng có fast path và cách park goroutine, không phải mỗi lần Lock đều đưa OS thread xuống ngủ.

Khi vấn đề là pool hết worker, chờ bằng `sync.Cond` cho phép goroutine tạm dừng thay vì liên tục kiểm tra. `Wait` nhả khóa và chờ; trước khi trả về nó lấy lại khóa. Caller phải kiểm tra lại điều kiện vì một goroutine khác có thể lấy worker trước. `Signal` không bảo đảm goroutine được đánh thức sẽ giành khóa đầu tiên.

Có hai thời gian chờ khác nhau: rất ngắn để giành khóa cấu trúc và có thể dài để có năng lực xử lý. Không nên dùng một vòng spin thay cho mọi loại chờ.

Đối chiếu [spinlock v2.11.0](https://github.com/panjf2000/ants/blob/v2.11.0/pkg/sync/spinlock.go) và [sync.Cond](https://pkg.go.dev/sync#Cond).

## Channel nhỏ và đồng hồ cache giải quyết chi phí khác nhau

`workerChanCap` được tính lúc khởi tạo package: nếu `GOMAXPROCS(0)==1` thì chọn channel không buffer; nếu lớn hơn 1 thì chọn buffer 1. Đây không phải bộ điều chỉnh liên tục theo số core hay theo mọi thay đổi GOMAXPROCS sau đó. Channel không buffer tạo điểm gặp sender/receiver, không bảo đảm receiver được scheduler chạy ngay lập tức; buffer 1 cũng không khiến mọi lần gửi đều không block.

Một goroutine ticktock cập nhật thời gian cache mỗi 500 ms trong bản này. Đáng chú ý, code dùng `atomic.Value` để lưu `time.Time`, không phải `atomic.StoreInt64` lưu timestamp như một số mô tả cũ. Mục đích là giảm số lần lấy thời gian ở đường nóng, đổi lại thời gian sử dụng có độ hạt theo chu kỳ cập nhật.

`time.Now()` không luôn là một system call theo cách đơn giản; nền tảng có thể có đường lấy thời gian nhanh. Kích thước struct hoặc số lệnh CPU cũng không đủ chứng minh chênh lệch hiệu năng tổng thể. [ants.go v2.11.0](https://github.com/panjf2000/ants/blob/v2.11.0/ants.go) là nguồn cho những lựa chọn cụ thể này.

## Thu hồi worker và tái sử dụng object

Scavenger định kỳ xét worker rảnh đã quá thời hạn. Các cấu trúc của bản này tìm ranh giới thời gian bằng binary search trên thứ tự idle thích hợp. Tuy bước tìm ranh giới có chi phí logarit, tách danh sách, dịch/xóa phần tử và kết thúc nhiều worker vẫn có chi phí theo số phần tử cần xử lý; không gọi cả đợt cleanup là O(log n).

Worker struct còn được tái sử dụng qua `sync.Pool`, giúp giảm một phần allocation churn. Pool này có quyền bỏ object cache, nên không dùng nó như kho giữ tài nguyên sống lâu. Tái sử dụng struct cũng không có nghĩa mọi goroutine và mọi task của ứng dụng đều zero-allocation.

`PoolWithFuncGeneric[T]` cho phép định nghĩa hàm worker nhận T và `Invoke` truyền T, tránh phải tự assertion từ `any` trong code người dùng. Đây là lợi ích hợp đồng kiểu. Generic không bảo đảm mọi boxing/heap allocation biến mất hay mọi workload đều nhanh hơn; closure, T và phần xử lý bên trong vẫn ảnh hưởng.

Đối chiếu [PoolWithFuncGeneric v2.11.0](https://github.com/panjf2000/ants/blob/v2.11.0/pool_func_generic.go).

## Chọn giới hạn theo tài nguyên, không theo một con số đẹp

Nếu task chờ network, số worker hợp lý có thể khác task bão hòa CPU. Cần xét giới hạn database, thời gian giữ dữ liệu, số caller chờ và yêu cầu latency. Đừng chuyển hàng triệu task từ goroutine chạy sang goroutine chờ rồi coi vấn đề tải đã được giải quyết.

Một task giữ worker mà Submit công việc khác vào cùng pool có giới hạn có thể tạo bế tắc: mọi worker đều chờ một công việc chưa có worker nhận. Cần thiết kế cách phân rã tác vụ và quan hệ chờ, không chỉ tăng size cho lần chạy hiện tại.

**Tự kiểm tra.** Pool size 10 có bảo đảm chỉ 10 request sống trong ứng dụng không? Không: request đang chờ nhận worker hoặc chờ ở tầng khác vẫn sống. Cần giới hạn admission và backpressure toàn luồng.

**Có nên mặc định dùng pool cho mọi goroutine không?** Không. Go đã quản lý goroutine nhẹ; pool thêm giới hạn, chính sách chờ và chi phí điều phối. Chọn khi có nhu cầu rõ về concurrency hoặc tái sử dụng, rồi đo đúng workload.

Đọc [goroutine](/vi/notes/go/goroutines/) và [channel](/vi/notes/go/channels/) để hiểu vòng đời trước khi tối ưu pool.

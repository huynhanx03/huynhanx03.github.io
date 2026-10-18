---
title: "Temporal là gì và xây Workflow Go đầu tiên"
category: "Workflow Engine"
kind: "guide"
translationKey: "temporal/fundamentals"
series: "Temporal"
seriesOrder: 1
description: "Hiểu Service, Worker, Workflow, Activity, Namespace, Task Queue và chạy một ứng dụng Temporal Go tối thiểu."
sources:
  - title: "What is Temporal?"
    url: "https://docs.temporal.io/temporal"
  - title: "Temporal Go SDK Developer Guide"
    url: "https://docs.temporal.io/develop/go"
  - title: "Temporal Task Queues"
    url: "https://docs.temporal.io/task-queue"
draft: false
updated: 2026-10-15
---

Một quy trình tạo đơn đã giữ hàng và đang chờ thu tiền thì process ứng dụng chết. Khi chạy lại, ta cần biết bước nào đã hoàn tất, điều gì còn chờ và liệu có thể gọi tiếp mà không tạo tác dụng phụ trùng. Đây là nhu cầu tiến trình bền vững mà Temporal hỗ trợ.

Ta viết Workflow bằng Go như hàm có state, nhưng SDK thực thi nó theo Event History. Temporal Service lưu history và điều phối task; Client start/gửi message; Worker ứng dụng poll Task Queue để chạy code đã đăng ký. Workflow quyết định bước tiếp theo, Activity thực hiện I/O. State trong RAM có thể được cache, nhưng cơ sở phục hồi là code tương thích cộng lịch sử bền vững, không phải RAM của một worker cụ thể.

![Temporal Client, Service, Event History, Worker và Activity giao tiếp qua Task Queue](/images/notes/temporal/temporal-architecture.jpg)

*Service ghi history và điều phối task; Worker chạy code ứng dụng còn Activity là ranh giới cho I/O.*

## Namespace, Workflow ID và Task Queue

Namespace là ranh giới quản trị cho execution, cấu hình và quan sát trong Temporal. Workflow ID là định danh nghiệp vụ do ứng dụng chọn, ví dụ `order-123`. Run ID định danh một lần chạy cụ thể; Retry, Continue-As-New hay reset có thể tạo run mới mà vẫn thuộc cùng chuỗi Workflow ID. Hãy xác định conflict/reuse behavior cho lệnh start gửi trùng, thay vì cho rằng network retry tạo thêm execution hoặc không tạo thêm execution theo một mặc định chung.

Task Queue định tuyến task đến nhóm Worker poll queue đó. Workflow code đăng ký ở Worker; Service không chạy code thay ứng dụng. Nếu execution mở nhưng không tiến triển, kiểm tra Worker có poll đúng Namespace và Task Queue, có đăng ký đúng Workflow/Activity type và có capacity xử lý không. Với nhiều queue, ghi rõ queue name trong cấu hình và cảnh báo khi client/worker lệch nhau.

## Chạy local và theo dõi happy path

Khởi chạy Temporal local theo quickstart chính thức, tạo Client, đăng ký Workflow và Activity vào Worker rồi start Worker. Tạo Workflow Execution từ Client với Workflow ID và Task Queue phù hợp. Theo dõi Web UI để thấy trạng thái mở, Workflow Task, Activity Task và kết quả cuối. Chạy chương trình hai lần với cùng Workflow ID để quan sát conflict/reuse policy; đây là cách sớm hiểu định danh và request retry.

Một Workflow Go tối thiểu có thể gọi Activity như sau:

~~~go
func OrderWorkflow(ctx workflow.Context, orderID string) error {
    options := workflow.ActivityOptions{
        StartToCloseTimeout: time.Minute,
        RetryPolicy: &temporal.RetryPolicy{
            InitialInterval: time.Second,
            MaximumInterval: time.Minute,
            MaximumAttempts: 5,
        },
    }
    ctx = workflow.WithActivityOptions(ctx, options)
    return workflow.ExecuteActivity(ctx, ReserveInventory, orderID).Get(ctx, nil)
}
~~~

Timeout và retry trên chỉ là ví dụ; timeout thật cần phản ánh latency và yêu cầu của dependency. Nếu Activity reserve hàng được gọi lại sau timeout, ứng dụng phải bảo đảm không giữ hàng hai lần. Temporal có thể retry attempt sau khi Service không nhận được kết quả đúng hạn, nhưng không thể mở transaction nguyên tử xuyên qua database của mình và provider bên ngoài.

### Đọc đoạn code theo thời điểm

`ActivityOptions` gắn timeout và retry cho việc giữ hàng. `ExecuteActivity` đưa ra yêu cầu điều phối; worker Activity gọi hệ thống kho. `Get` chờ kết quả theo cơ chế của SDK rồi trả lỗi nếu kết quả cuối là thất bại. Nó không phải lời gọi HTTP trực tiếp trong hàm Workflow.

Để ghép vào project, cần import `go.temporal.io/sdk/workflow`, `go.temporal.io/sdk/temporal`, `time`, khai báo `ReserveInventory` và đăng ký nó cùng Workflow ở worker. Đoạn trích không có client/worker bootstrap; dùng quickstart chính thức để nối toàn bộ chương trình.

Nếu worker mất sau khi kết quả Activity đã ghi nhận, replay dùng lại kết quả ấy. Nếu provider đã xử lý nhưng kết quả chưa ghi, attempt sau vẫn có thể gọi lại. Hai cửa sổ này giải thích đồng thời khả năng phục hồi của Workflow và yêu cầu idempotency của Activity.

## Thiết kế Workflow như một hàm có thể dựng lại

Workflow function giữ biến cục bộ và luồng điều phối, nhưng mọi lệnh Temporal phát ra phải tương thích với history khi replay. Đưa HTTP, database, random, thời gian hệ điều hành và lời gọi LLM vào Activity. Với timer, dùng API Workflow của SDK thay vì `time.Sleep`. Với concurrency, dùng primitive của SDK chứ không tạo goroutine Go tùy ý. Các giới hạn này là hợp đồng cần hiểu trước khi viết nhiều nghiệp vụ.

Đừng dùng một Workflow lớn vô hạn cho toàn bộ hệ thống. Workflow nên có ID nghiệp vụ ổn định, input versioned và kết thúc hoặc Continue-As-New khi tiến trình chạy lâu làm history tăng. Bắt đầu với một execution có phạm vi và lifecycle rõ, thêm Child Workflow khi cần ranh giới execution riêng thay vì tách theo cấu trúc package.

Sau quickstart, hãy thử worker restart giữa khi Activity đang chạy, start lại Worker và quan sát Service khôi phục Workflow. Bài tập này thể hiện đúng giá trị Temporal: application code không phải tự dựng snapshot state mỗi khi process chết. Các chương tiếp theo sẽ lần lượt phân tích vì sao recovery hoạt động, làm Activity an toàn và triển khai thay đổi code có execution cũ còn mở.

## Tự kiểm tra vòng đời

**Temporal Cloud có chạy code Activity của ứng dụng thay worker không?** Không theo mô hình ở đây. Đội ứng dụng vẫn triển khai worker để thực thi code và quản lý dependency.

**Namespace đúng nhưng Task Queue sai có nhận được công việc không?** Worker phải poll đúng queue và đăng ký đúng type, ngoài việc dùng namespace/kết nối hợp lệ.

**Start thành công có nghĩa giữ hàng xong không?** Không. Execution đã được khởi tạo theo phản hồi; kết quả nghiệp vụ đến sau khi các task được xử lý. Đọc [history và determinism](/vi/notes/temporal/history-and-determinism/) để theo dấu command thành event.

---
title: "Temporal là gì và xây Workflow Go đầu tiên"
category: "Workflow Engine"
kind: "guide"
translationKey: "temporal/fundamentals"
translationPending: true
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
---

Temporal giúp ứng dụng chạy một quy trình nghiệp vụ qua thời gian mà không phải tự viết toàn bộ cơ chế lưu state, retry timer và khôi phục sau process failure. Ta viết Workflow bằng Go như một hàm stateful, nhưng không chạy nó giống hàm backend thông thường: SDK điều phối Workflow dựa trên Event History để worker có thể dựng lại state sau khi process bị dừng.

Một ứng dụng gồm Temporal Service, Client, Worker, Workflow và Activity. Service ghi lịch sử execution và đưa task vào Task Queue. Client start Workflow hoặc gửi message. Worker do mình triển khai poll Task Queue rồi thực thi Workflow Task hay Activity Task. Activity thực hiện I/O như gọi API thanh toán; Workflow quyết định khi nào gọi Activity và cách phản ứng với kết quả. Workflow state nằm trong lịch sử bền vững của Service, không nằm trong RAM của Worker.

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

## Thiết kế Workflow như một hàm có thể dựng lại

Workflow function giữ biến cục bộ và luồng điều phối, nhưng mọi lệnh Temporal phát ra phải tương thích với history khi replay. Đưa HTTP, database, random, thời gian hệ điều hành và lời gọi LLM vào Activity. Với timer, dùng API Workflow của SDK thay vì `time.Sleep`. Với concurrency, dùng primitive của SDK chứ không tạo goroutine Go tùy ý. Các giới hạn này là hợp đồng cần hiểu trước khi viết nhiều nghiệp vụ.

Đừng dùng một Workflow lớn vô hạn cho toàn bộ hệ thống. Workflow nên có ID nghiệp vụ ổn định, input versioned và kết thúc hoặc Continue-As-New khi tiến trình chạy lâu làm history tăng. Bắt đầu với một execution có phạm vi và lifecycle rõ, thêm Child Workflow khi cần ranh giới execution riêng thay vì tách theo cấu trúc package.

Sau quickstart, hãy thử worker restart giữa khi Activity đang chạy, start lại Worker và quan sát Service khôi phục Workflow. Bài tập này thể hiện đúng giá trị Temporal: application code không phải tự dựng snapshot state mỗi khi process chết. Các chương tiếp theo sẽ lần lượt phân tích vì sao recovery hoạt động, làm Activity an toàn và triển khai thay đổi code có execution cũ còn mở.

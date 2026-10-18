---
title: "Chạy Cadence và xây Workflow Go đầu tiên"
category: "Workflow Engine"
kind: "guide"
translationKey: "cadence/first-workflow"
translationPending: true
series: "Cadence"
seriesOrder: 2
description: "Theo một Workflow Go từ Client qua Service và Worker, hiểu Workflow ID, Task List và nơi state được lưu."
sources:
  - title: "Cadence Workflows"
    url: "https://cadenceworkflow.io/docs/concepts/workflows"
  - title: "Cadence Activities"
    url: "https://cadenceworkflow.io/docs/concepts/activities"
  - title: "Cadence Deployment Topology"
    url: "https://cadenceworkflow.io/docs/concepts/topology"
  - title: "Cadence Go samples"
    url: "https://cadenceworkflow.io/docs/get-started"
draft: false
---

Một ứng dụng Cadence có ba phần cần phân biệt. Client gửi lệnh bắt đầu hoặc gửi message; Cadence Service lưu trạng thái thực thi và xếp task; Worker là chương trình Go của mình thực sự chạy Workflow và Activity. Service không tải mã ứng dụng xuống để chạy thay worker. Vì vậy khi thiết kế task routing, ta phải bảo đảm Worker đã đăng ký đúng Workflow/Activity và đang poll đúng Task List.

## Dựng môi trường nhỏ nhất

Với local development, dùng môi trường Cadence dành cho phát triển theo hướng dẫn chính thức, tạo Domain rồi chạy Service và Web UI. Mục tiêu của lần chạy đầu không phải dựng production topology mà là nhìn thấy toàn vòng đời: Client start execution, Worker nhận Workflow Task, Workflow gọi Activity, Activity trả kết quả, rồi execution đóng thành công. Ghi rõ version của Server và Go SDK vì API Schedule, Visibility và một số tùy chọn thay đổi theo phiên bản.

Trong Go, đăng ký Workflow và Activity trước khi Worker bắt đầu poll. Sau đó tạo Worker gắn với Domain và Task List. Client có thể ở process riêng; Worker thường chạy liên tục trong service application. Khi Client start workflow, nó gửi loại workflow, input, Workflow ID, Task List và timeout. Lệnh start không đồng nghĩa nghiệp vụ hoàn tất: Client nhận handle để tra cứu, chờ kết quả hoặc gửi tín hiệu về sau.

~~~go
func OrderWorkflow(ctx workflow.Context, orderID string) error {
    options := workflow.ActivityOptions{
        ScheduleToStartTimeout: time.Minute,
        StartToCloseTimeout:    30 * time.Second,
    }
    ctx = workflow.WithActivityOptions(ctx, options)

    return workflow.ExecuteActivity(ctx, ReserveInventory, orderID).Get(ctx, nil)
}
~~~

Đây chỉ là khung minh họa. Trong ứng dụng thật, cấu hình timeout cần dựa trên SLA của Activity, error cần được phân loại, và việc reserve hàng phải có idempotency key. Không đặt thao tác I/O bên trong Workflow function. Workflow chỉ phát lệnh Activity; Cadence ghi nhận lệnh và kết quả để replay.

## Workflow ID là định danh nghiệp vụ

Workflow ID thường gắn với đối tượng cần điều phối, chẳng hạn `order-12345`. Nó giúp tra cứu execution và có thể bảo vệ khỏi start trùng tùy theo chính sách reuse/conflict đã chọn. Run ID xác định một lần chạy cụ thể; retry hoặc Continue-As-New có thể tạo run khác trong cùng chuỗi execution. Đừng nhầm Workflow ID với request ID tạm thời của HTTP: phải quyết định rõ hành vi khi Client gửi lại yêu cầu vì timeout mạng.

## Task List và Worker

Task List là hàng đợi logic mà Service dùng để gửi task đến Worker phù hợp. Tên queue cần trùng giữa bên phát task và Worker poll queue. Có thể tách Worker theo nhóm Activity, độ tin cậy, tài nguyên hoặc quyền truy cập; đừng tách quá sớm nếu nó làm tăng gánh nặng triển khai. Một Worker không poll task list không có nghĩa task mất đi; task chờ cho tới khi có worker phù hợp, nhưng backlog và timeout vẫn cần được giám sát.

Khi kiểm tra lần đầu, xác nhận Domain, Workflow ID, Workflow Type và Task List trong Web UI hoặc CLI. Nếu execution ở trạng thái chạy nhưng không tiến triển, lần lượt kiểm tra Worker còn sống, Worker có đăng ký đúng type, task list có chính xác và Activity có bị block. Đây là cách tách lỗi cấu hình/routing khỏi lỗi nghiệp vụ.

Hình bên dưới nhấn mạnh một khác biệt quan trọng: history thuộc về Service; Worker có thể bị thay thế. Khi replay, kết quả Activity đã ghi trong history được dùng lại để dựng state, còn hệ thống ngoài chỉ được gọi khi Workflow phát sinh một Activity mới.

![Cadence khôi phục Workflow bằng history mà không gọi lại Activity đã hoàn tất](/images/notes/cadence/durable-replay.png)

*Service lưu Event History; Worker replay phần quyết định và tiếp tục từ kết quả Activity đã ghi nhận.*

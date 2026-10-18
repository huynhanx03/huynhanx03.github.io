---
title: "Activity, Retry và xử lý lỗi ngoài hệ thống"
category: "Workflow Engine"
kind: "guide"
translationKey: "temporal/activity-reliability"
series: "Temporal"
seriesOrder: 3
description: "Chọn ranh giới Activity, cấu hình timeout/retry, heartbeat công việc dài và bảo vệ side effect khỏi việc thực thi lặp."
sources:
  - title: "Temporal Go SDK Activity basics"
    url: "https://docs.temporal.io/develop/go/activities"
  - title: "Temporal Activity execution"
    url: "https://docs.temporal.io/activity-execution"
  - title: "Temporal Retry Policies"
    url: "https://docs.temporal.io/encyclopedia/retry-policies"
  - title: "Temporal Async Activity Completion"
    url: "https://docs.temporal.io/develop/go/activities/asynchronous-activity"
draft: false
updated: 2026-10-15
---

Cổng thanh toán đã thu tiền nhưng response không tới worker. Service chưa có kết quả hoàn tất; attempt sau có thể gửi lại lệnh. Nếu coi “retry” là chỉ chạy lại một hàm vô hại, ứng dụng có thể thu hai lần.

Activity là code ứng dụng làm I/O ngoài Workflow deterministic. Temporal quản lý execution/attempt, timeout, heartbeat và kết quả cần thiết để điều phối tiếp; nó không biết giao dịch ở provider đã xảy ra trước khi mất phản hồi hay chưa. Ta cần thiết kế ranh giới kết quả nghiệp vụ, khóa thao tác và cách đối soát trước khi chọn số lần retry.

![Ranh giới Workflow deterministic, Activity có I/O và dependency bên ngoài](/images/notes/temporal/workflow-activity-boundary.jpg)

*Workflow ra quyết định có thể replay; Activity là nơi làm việc với hệ thống ngoài.*

## Ranh giới Activity và at-least-once

Temporal có thể tạo attempt mới khi Start-to-Close hoặc Heartbeat Timeout xảy ra và retry policy còn cho phép. Hãy thiết kế như thể cùng một yêu cầu nghiệp vụ có thể được thực hiện nhiều lần. Với charge payment, tạo idempotency key ổn định theo order/operation và truyền nó đến provider. Với tạo shipment, dùng business ID/idempotency key cùng bảo đảm chống trùng thích hợp của provider. Chỉ tra cứu rồi tạo riêng rẽ chưa bảo vệ được hai attempt chồng nhau. Nếu response bị mất sau khi provider đã xử lý, lần thử tiếp theo phải tìm được kết quả trước.

Activity quá rộng có thể chứa nhiều side effect: nếu bước cuối lỗi thì retry từ đầu làm lặp lại bước đã thành công. Tách theo ranh giới có kết quả độc lập, nhưng đừng tạo một Activity cho mọi dòng code vì mỗi lần gọi tạo lịch sử và overhead. Đặt transaction cục bộ bên trong Activity khi database cho phép, nhưng hiểu rằng transaction đó không bao trùm Temporal Service và provider HTTP.

## Timeout kiểm soát những khoảng chờ khác nhau

Start-to-Close giới hạn thời lượng một attempt sau khi Worker nhận task. Schedule-to-Start giới hạn thời gian task chờ trong Task Queue; nó hữu ích để phát hiện thiếu Worker hoặc routing sai. Schedule-to-Close giới hạn tổng thời gian từ lúc schedule đến kết quả cuối cùng, gồm queue và retries. Heartbeat Timeout yêu cầu Activity dài hạn báo đang sống và có thể gửi checkpoint.

Schedule-to-Start hết hạn không được retry: đưa task lại vào cùng queue không sửa được việc thiếu Worker. Schedule-to-Close hết hạn kết thúc budget của toàn Activity Execution. Vì vậy, cần phân biệt lỗi một attempt với việc hết budget hoặc lỗi routing. Xem [Activity failure detection](https://docs.temporal.io/encyclopedia/detecting-activity-failures).

Các timeout không có một giá trị chuẩn cho mọi Activity. Dùng SLA downstream, p95/p99 latency, giới hạn HTTP/database và nhu cầu nghiệp vụ. Retry backoff cần nằm trong Schedule-to-Close budget. Timeout ngắn làm tăng load vì Activity khỏe bị chạy lại; timeout dài làm lỗi thật phát hiện chậm và giữ Workflow chờ lâu. Có thể đặt heartbeat cho công việc mất nhiều phút, nhưng thao tác nhanh không cần heartbeat chỉ để “đủ cấu hình”.

### Một budget thời gian có thể hết ở đâu?

Giả sử budget tổng là 5 phút, một attempt được chạy tối đa 30 giây. Năm phút phải bao gồm thời gian chờ, các attempt và backoff theo cơ chế timeout áp dụng; nó không phải 5 phút cộng thêm toàn bộ retry. Nếu mất worker lâu ở đầu, số cơ hội thử còn lại có thể giảm.

Start-to-Close giúp giới hạn attempt, còn Schedule-to-Close đặt budget toàn Activity execution. Heartbeat giúp nhận ra attempt dài không còn báo tiến độ. Các giá trị này trả lời những câu hỏi khác nhau; đặt một con số cho tất cả sẽ che mất nguyên nhân khi timeout.

Timeout cũng chưa chứng minh attempt cũ đã ngừng I/O. Giới hạn ở dependency và idempotency vẫn cần để một attempt bị coi là lỗi không va chạm với attempt mới.

## Retry policy và lỗi không nên thử lại

Retry policy xác định initial interval, backoff, giới hạn interval/attempt và lỗi non-retryable. Lỗi kết nối thoáng qua có thể retry; lỗi input sai thường không đổi khi chạy lại. Nếu mọi lỗi đều retry vô hạn, execution hỏng có thể giữ slot logic, tạo backlog và che mất tín hiệu cho vận hành. Cân nhắc retry tối đa rồi chuyển sang nhánh xử lý người dùng/operator thay vì để lỗi chìm.

Phân biệt Application Error và lỗi kỹ thuật theo semantics SDK, tránh retry lỗi nghiệp vụ vĩnh viễn như thẻ thanh toán bị từ chối. Lỗi không retry có thể khiến Workflow đóng thất bại; nếu muốn tiếp tục, hãy bắt lỗi trong Workflow và quyết định bước tiếp theo. Đừng nuốt lỗi rồi đánh dấu thành công khi hệ thống ngoài chưa xác nhận.

## Heartbeat, checkpoint và cancellation

Activity xử lý nhiều file/chunk có thể heartbeat kèm checkpoint. Khi attempt mới chạy, code đọc heartbeat details để tiếp tục phần chưa xong, thay vì chạy từ đầu. Checkpoint cần ghi sau khi một đơn vị công việc đã được commit bền vững; nếu ghi checkpoint trước thao tác lưu, retry có thể bỏ mất dữ liệu. Payload checkpoint phải nhỏ và có version/schema rõ ràng.

Heartbeat cũng là đường để Worker nhận biết cancellation và báo tiến độ. Activity nên tôn trọng context cancellation, dừng thao tác khi có thể và dọn tài nguyên với giới hạn thời gian. Cancellation không thể cưỡng bức một thư viện Go bị block vô hạn nếu thư viện đó không hỗ trợ context; chọn API timeout phù hợp cho dependency.

## Async completion cho callback bên ngoài

Một provider có thể nhận lệnh rồi gọi webhook nhiều giờ sau. Async Activity completion cho phép Activity trả quyền xử lý cho callback handler thay vì giữ một goroutine chờ. Lưu completion token/reference an toàn, xác thực webhook, kiểm tra callback lặp và liên kết đúng attempt. Nếu callback không đến, Activity Timeout hoặc watchdog phải kết thúc chờ; Heartbeat Timeout chỉ phát hiện được việc mất liên lạc khi bên xử lý ngừng gửi heartbeat. Thiết kế callback idempotent vì provider có thể gửi lại và process có thể crash sau khi ghi kết quả nhưng trước khi ack webhook.

Trong Go, trả `activity.ErrResultPending` để giữ Activity Execution chờ; trả thành công bình thường sẽ hoàn tất nó. Callback dùng `CompleteActivity` với token. Start-to-Close vẫn giới hạn attempt đang chờ; nếu đặt Heartbeat Timeout, phía xử lý ngoài phải gửi heartbeat qua Client để giữ nó sống trong giới hạn đó. Xem [async completion](https://docs.temporal.io/develop/go/activities/asynchronous-activity).

Trước khi production, kiểm thử: provider xử lý nhưng response mất; Activity timeout sau commit; Worker dừng giữa attempt; callback đến hai lần; cancellation khi đang chạy; và dependency trả lỗi vĩnh viễn. Quan sát retry count, timeout loại nào xảy ra và thời gian queue. Bằng chứng này giúp chỉnh policy dựa trên hành vi thật thay vì đoán.

## Tự kiểm tra đường lỗi

**Provider từ chối thẻ vì một lý do nghiệp vụ cuối cùng: cứ backoff có tự sửa không?** Không. Phân loại lỗi và đưa Workflow vào nhánh phù hợp thay vì retry vô ích.

**Checkpoint sau khi commit chunk khác trước khi commit thế nào?** Ghi trước có thể khiến retry bỏ qua dữ liệu chưa lưu; ghi sau có thể cần xử lý lại chunk khi mất checkpoint, nên bước xử lý chunk cũng cần chịu được lặp.

**Async completion callback tới hai lần nên áp kết quả hai lần không?** Không. Cần kiểm tra định danh/attempt, trạng thái đã hoàn tất và hợp đồng API; xác thực callback trước khi chấp nhận.

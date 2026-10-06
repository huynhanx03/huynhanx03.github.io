---
title: "Activity, Retry và xử lý lỗi ngoài hệ thống"
category: "Workflow Engine"
kind: "guide"
translationKey: "temporal/activity-reliability"
translationPending: true
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
    url: "https://docs.temporal.io/develop/go/asynchronous-activity"
draft: false
---

Workflow Definition cần deterministic; lời gọi mạng, database và thao tác có side effect phải chạy trong Activity. Activity là code Go bình thường thực thi trên Worker, nhưng Temporal lưu trạng thái schedule, attempt, heartbeat và kết quả để Workflow có thể tiếp tục sau lỗi process. Khi thiết kế một Activity, hãy hỏi nó đại diện bước nghiệp vụ nào, điều kiện thành công là gì, và retry một lần nữa sẽ gây tác dụng phụ gì.

![Ranh giới Workflow deterministic, Activity có I/O và dependency bên ngoài](/images/notes/temporal/workflow-activity-boundary.jpg)

*Workflow ra quyết định có thể replay; Activity là nơi làm việc với hệ thống ngoài.*

## Ranh giới Activity và at-least-once

Temporal có thể schedule lại Activity khi timeout hoặc khi không nhận được kết quả đúng hạn. Hãy thiết kế như thể cùng một yêu cầu nghiệp vụ có thể được thực hiện nhiều lần. Với charge payment, tạo idempotency key ổn định theo order/operation và truyền nó đến provider. Với tạo shipment, tra cứu shipment theo business ID trước khi tạo lại. Nếu response bị mất sau khi provider đã xử lý, lần thử tiếp theo phải tìm được kết quả trước.

Activity quá rộng có thể chứa nhiều side effect: nếu bước cuối lỗi thì retry từ đầu làm lặp lại bước đã thành công. Tách theo ranh giới có kết quả độc lập, nhưng đừng tạo một Activity cho mọi dòng code vì mỗi lần gọi tạo lịch sử và overhead. Đặt transaction cục bộ bên trong Activity khi database cho phép, nhưng hiểu rằng transaction đó không bao trùm Temporal Service và provider HTTP.

## Timeout kiểm soát những khoảng chờ khác nhau

Start-to-Close giới hạn thời lượng một attempt sau khi Worker nhận task. Schedule-to-Start giới hạn thời gian task chờ trong Task Queue; nó hữu ích để phát hiện thiếu Worker hoặc routing sai. Schedule-to-Close giới hạn tổng thời gian từ lúc schedule đến kết quả cuối cùng, gồm queue và retries. Heartbeat Timeout yêu cầu Activity dài hạn báo đang sống và có thể gửi checkpoint.

Các timeout không có một giá trị chuẩn cho mọi Activity. Dùng SLA downstream, p95/p99 latency, giới hạn HTTP/database và nhu cầu nghiệp vụ. Retry backoff cần nằm trong Schedule-to-Close budget. Timeout ngắn làm tăng load vì Activity khỏe bị chạy lại; timeout dài làm lỗi thật phát hiện chậm và giữ Workflow chờ lâu. Có thể đặt heartbeat cho công việc mất nhiều phút, nhưng thao tác nhanh không cần heartbeat chỉ để “đủ cấu hình”.

## Retry policy và lỗi không nên thử lại

Retry policy xác định initial interval, backoff, giới hạn interval/attempt và lỗi non-retryable. Lỗi kết nối thoáng qua có thể retry; lỗi input sai thường không đổi khi chạy lại. Nếu mọi lỗi đều retry vô hạn, execution hỏng có thể giữ slot logic, tạo backlog và che mất tín hiệu cho vận hành. Cân nhắc retry tối đa rồi chuyển sang nhánh xử lý người dùng/operator thay vì để lỗi chìm.

Phân biệt Application Error và lỗi kỹ thuật theo semantics SDK, tránh retry lỗi nghiệp vụ vĩnh viễn như thẻ thanh toán bị từ chối. Lỗi không retry có thể khiến Workflow đóng thất bại; nếu muốn tiếp tục, hãy bắt lỗi trong Workflow và quyết định bước tiếp theo. Đừng nuốt lỗi rồi đánh dấu thành công khi hệ thống ngoài chưa xác nhận.

## Heartbeat, checkpoint và cancellation

Activity xử lý nhiều file/chunk có thể heartbeat kèm checkpoint. Khi attempt mới chạy, code đọc heartbeat details để tiếp tục phần chưa xong, thay vì chạy từ đầu. Checkpoint cần ghi sau khi một đơn vị công việc đã được commit bền vững; nếu ghi checkpoint trước thao tác lưu, retry có thể bỏ mất dữ liệu. Payload checkpoint phải nhỏ và có version/schema rõ ràng.

Heartbeat cũng là đường để Worker nhận biết cancellation và báo tiến độ. Activity nên tôn trọng context cancellation, dừng thao tác khi có thể và dọn tài nguyên với giới hạn thời gian. Cancellation không thể cưỡng bức một thư viện Go bị block vô hạn nếu thư viện đó không hỗ trợ context; chọn API timeout phù hợp cho dependency.

## Async completion cho callback bên ngoài

Một provider có thể nhận lệnh rồi gọi webhook nhiều giờ sau. Async Activity completion cho phép Activity trả quyền xử lý cho callback handler thay vì giữ một goroutine chờ. Lưu completion token/reference an toàn, xác thực webhook, kiểm tra callback lặp và liên kết đúng attempt. Nếu callback không đến, heartbeat/timeout hoặc watchdog phải kết thúc chờ. Thiết kế callback idempotent vì provider có thể gửi lại và process có thể crash sau khi ghi kết quả nhưng trước khi ack webhook.

Trước khi production, kiểm thử: provider xử lý nhưng response mất; Activity timeout sau commit; Worker dừng giữa attempt; callback đến hai lần; cancellation khi đang chạy; và dependency trả lỗi vĩnh viễn. Quan sát retry count, timeout loại nào xảy ra và thời gian queue. Bằng chứng này giúp chỉnh policy dựa trên hành vi thật thay vì đoán.

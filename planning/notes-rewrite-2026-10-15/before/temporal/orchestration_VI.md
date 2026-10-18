---
title: "Signal, Query, Update, Timer và Child Workflow"
category: "Workflow Engine"
kind: "guide"
translationKey: "temporal/orchestration"
translationPending: true
series: "Temporal"
seriesOrder: 4
description: "Chọn API giao tiếp và primitive điều phối cho Workflow dài hạn, recurring job và quy trình nhiều bước."
sources:
  - title: "Temporal Workflow Message Passing"
    url: "https://docs.temporal.io/encyclopedia/workflow-message-passing"
  - title: "Temporal Schedules"
    url: "https://docs.temporal.io/schedules"
  - title: "Temporal Child Workflows"
    url: "https://docs.temporal.io/child-workflows"
  - title: "Temporal Continue-As-New"
    url: "https://docs.temporal.io/continue-as-new"
draft: false
---

Workflow dài hạn có thể nhận thông tin sau khi start, chờ một thời điểm bền vững, tạo Workflow con và phản ứng với cancellation. Các API này không nên được trộn lẫn: mỗi loại có semantics về phản hồi, history và thời điểm xử lý khác nhau. Hãy bắt đầu từ hợp đồng cần cho Client: chỉ gửi sự kiện, đọc state, hay ghi dữ liệu và đợi xác nhận?

## Signal, Query và Update

Signal là lệnh ghi bất đồng bộ: Client gửi message rồi không cần đợi kết quả xử lý đồng bộ. Ví dụ hãng vận chuyển báo kiện hàng đã nhận. Workflow xử lý Signal trong code deterministic và cập nhật state cục bộ; nếu cần xác nhận bên ngoài, thiết kế một bước phản hồi khác.

Query đọc state hiện tại của Workflow mà không thêm event vào history. Handler chỉ nên đọc state có trong Workflow, không làm I/O hay thay đổi state. Dùng Query để lấy trạng thái hiển thị, không dùng nó làm command. Kết quả là ảnh chụp tại thời điểm Query được xử lý và có thể cũ ngay sau đó.

Update là thao tác ghi có thể xác nhận: Client đợi Workflow nhận/validate và xử lý Update để nhận kết quả hoặc lỗi. Chọn Update khi cần request-response và muốn từ chối request không hợp lệ trước khi chấp nhận. Vì Update được ghi lại khi được chấp nhận, handler phải deterministic; đặt validation ở đầu để hạn chế side effect ngoài Workflow. So sánh đặc tính SDK/version đang dùng trước khi giả định giới hạn concurrency hay behavior.

## Timer, Schedule và chờ lâu

Workflow timer là một lần chờ bên trong execution. Dùng API timer của Temporal thay cho `time.Sleep`; Service ghi timer, Worker được phép dừng trong lúc chờ rồi tiếp tục khi timer fire. Ví dụ đợi 24 giờ để khách thanh toán, hoặc chờ một Signal tối đa 15 phút rồi đi vào nhánh timeout.

Schedule tạo Workflow Execution lặp theo lịch, quản lý overlap/catch-up và có thể pause/update tùy API. Nó khác timer vòng lặp bên trong một execution. Chọn Schedule khi cần quản lý recurring starts như một đối tượng có ID; chọn timer cho deadline thuộc một đơn hàng cụ thể. Khi lịch bị downtime, quyết định có catch-up hay skip, tránh vô tình tạo hàng nghìn executions cũ cùng lúc.

## Child Workflow và Continue-As-New

Child Workflow phù hợp khi một phần quy trình cần state/history, timeout, retry hoặc owner riêng. Một Workflow cha có thể gọi nhiều child cho các sản phẩm, nhưng cần đặt giới hạn concurrency và định nghĩa parent close policy. Child có thể chạy task queue khác, giúp tách đội/worker deployment; đổi lại giao tiếp và state không được chia sẻ như biến trong cùng function.

Bắt đầu với một Workflow đơn giản nếu quy trình có phạm vi hữu hạn. Tách child khi lifecycle riêng là yêu cầu thật: vận hành độc lập, có thể tái sử dụng, hoặc tách lịch sử lớn. Đừng dùng child chỉ như cách chia file code; điều đó làm tăng số execution phải tìm và liên kết.

Continue-As-New đóng run hiện tại và tạo run tiếp theo cho cùng Workflow ID với input state mới. Dùng nó cho Workflow cần chạy vô thời hạn hoặc theo chu kỳ khi history đã dài. Chỉ mang trạng thái cần thiết: tổng số lần thử, checkpoint nghiệp vụ, cấu hình version và dữ liệu đang chờ xử lý. State cũ không tự được sao chép; Signal đang chờ hoặc message mới đến trong giai đoạn chuyển tiếp cần được tính đến.

## Cancellation và compensation

Cancellation gửi yêu cầu hợp tác đến Workflow/Activity. Workflow có thể dừng chờ, cleanup và gọi các Activity bù. Termination cắt execution ngay; không nên dùng thay cho cancellation thường ngày nếu cần hoàn tác trạng thái bên ngoài. Timeout kết thúc hoặc làm lỗi một scope theo cấu hình, nên phải định nghĩa rõ timeout nghiệp vụ khác với Activity timeout.

Saga mô hình hóa chuỗi side effect không thể gộp thành một transaction: reserve, charge, create shipment. Nếu bước sau thất bại, chạy compensation theo thứ tự ngược hoặc quy tắc phù hợp. Compensation không bảo đảm chắc chắn thành công; nó cũng cần retry, idempotency, trạng thái và escalation. Có lúc nghiệp vụ cần “đánh dấu cần xử lý thủ công” thay vì tự rollback.

Với mỗi primitive, hỏi nó thay đổi điều gì trong history, ai cần nhận phản hồi, và điều gì xảy ra khi cùng message tới hai lần hoặc tới sát lúc Workflow đóng. Viết test cho race giữa timer và Signal, cancellation khi Activity đang chạy, child fail và Continue-As-New. Những tình huống cạnh biên thường quyết định workflow có đáng tin hơn một queue handler tự viết hay không.

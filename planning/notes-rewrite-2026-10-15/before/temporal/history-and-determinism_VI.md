---
title: "Event History, Replay và tính Deterministic"
category: "Workflow Engine"
kind: "guide"
translationKey: "temporal/history-and-determinism"
translationPending: true
series: "Temporal"
seriesOrder: 2
description: "Theo dấu Command thành Event, hiểu Worker phục hồi state bằng replay và phân biệt Workflow Task failure với Workflow failure."
sources:
  - title: "Temporal Event History"
    url: "https://docs.temporal.io/encyclopedia/event-history"
  - title: "Temporal Workflow Definition"
    url: "https://docs.temporal.io/workflow-definition"
  - title: "Temporal Tasks"
    url: "https://docs.temporal.io/tasks"
  - title: "Temporal Workflow Task Errors"
    url: "https://docs.temporal.io/references/workflow-task-errors"
draft: false
---

Event History là log bền vững theo thứ tự của những gì đã xảy ra trong một Workflow Execution. Khi Workflow gọi ExecuteActivity hoặc tạo timer, code chưa tự chạy I/O ngay tại dòng đó; nó yêu cầu SDK phát Command. Worker gửi command sau khi hoàn tất Workflow Task, Service xử lý yêu cầu rồi lưu các Event tương ứng như ActivityTaskScheduled hoặc TimerStarted. Khi Activity hoàn tất, kết quả cũng được thêm vào history.

Nếu Worker process chết, một Worker khác nhận Workflow Task và SDK chạy lại Workflow Definition từ đầu với input ban đầu. Trong replay, những thao tác đã có Event trong history trả kết quả ghi nhận trước đó; Activity không được gọi lại cho phần đã hoàn tất. Replay tiếp tục tới chỗ workflow cần quyết định mới, rồi Worker phát command mới. Vì thế state cục bộ được tái tạo từ code cộng với history thay vì snapshot RAM của process.

![Temporal dựng lại state từ Event History rồi tiếp tục tại điểm cần tiến triển](/images/notes/temporal/durable-execution-replay.jpg)

*Replay dùng kết quả Activity và timer đã ghi trong history; không lặp lại I/O của phần đã hoàn tất.*

## Determinism là tương thích với lịch sử

Với cùng input và history, Workflow phải phát ra chuỗi command tương thích như trước. Không dùng trực tiếp `time.Now`, random, HTTP, database hoặc goroutine Go trong Workflow Definition. Dùng clock, timer, selector và concurrency primitive của Temporal SDK. Giá trị không xác định được tính trong Activity hoặc được ghi có chủ đích bằng API phù hợp của SDK.

Một lỗi phổ biến là thêm Activity trước một lệnh cũ trong code. Execution mới chạy được, nhưng execution đang mở replay lịch sử có thể thấy code phát ScheduleActivity ở vị trí khác với Event History. Service/SDK phát hiện nondeterminism vì hai trình tự không khớp. Thay đổi tên/ID Activity, loại child, timer ordering hoặc handler có thể cũng tác động; thay đổi input hay thời gian timeout có thể an toàn trong một số trường hợp nhưng phải kiểm tra quy tắc cụ thể của SDK.

## Workflow Task failure khác Workflow Execution failure

Workflow Task failure nghĩa Worker chưa xử lý thành công một lượt task, ví dụ do nondeterminism, worker crash, timeout hoặc lỗi code chưa được xử lý theo cách SDK dự kiến. Service có thể tiếp tục thử lại Workflow Task, và Workflow Execution vẫn mở trong khi nhóm sửa code hoặc hạ tầng. Workflow Execution failure là quy trình nghiệp vụ đã kết thúc với trạng thái Failed, chẳng hạn Activity trả lỗi cuối cùng và Workflow để lỗi lan ra.

Phân biệt hai trạng thái giúp phản ứng đúng. Nondeterminism sau deploy thường cần rollback/fix code tương thích, không phải start lại đơn hàng. Thẻ lỗi nghiệp vụ có thể cần người dùng cập nhật thông tin rồi start quy trình mới. Đọc history và Worker log, xác định task failure hay execution failure rồi mới quyết định reset, retry hay compensation.

## History cũng là giới hạn tài nguyên

Mỗi Command/Event và payload được ghi làm history tăng. Workflow chạy dài có thể replay lâu và vượt giới hạn service; Worker cache giúp giảm replay thường xuyên nhưng không thay đổi yêu cầu correctness. Đo history length và task latency. Continue-As-New bắt đầu run mới với input state cần thiết để tránh giữ toàn bộ event cũ trong lần chạy tiếp theo; các liên hệ với Workflow ID và Run ID cần được thể hiện rõ trong dashboard.

Khi chia bằng Child Workflow, mỗi child có history và lifecycle độc lập, còn parent theo dõi kết quả hoặc giao tiếp qua message. Đây cũng là cách phân chia workload lớn, nhưng không phải cách chia package. Bắt đầu đơn giản với một Workflow nếu giới hạn lịch sử và coupling cho phép; tạo child khi đơn vị con thực sự có owner, retry, trạng thái hoặc khả năng scale riêng.

Thực hành tốt là lưu lịch sử đại diện từ production hoặc tạo fixture tương đương, sau đó chạy replayer khi sửa code. Log Task Failure có ích, nhưng replay tự động trong CI cho biết chính xác history nào không tương thích. Determinism không chỉ là quy tắc style: đó là điều kiện để tiến trình cũ tiếp tục chạy khi ứng dụng đã thay đổi.

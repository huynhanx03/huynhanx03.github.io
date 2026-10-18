---
title: "Event History, Replay và tính Deterministic"
category: "Workflow Engine"
kind: "guide"
translationKey: "temporal/history-and-determinism"
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
updated: 2026-10-15
---

Workflow gọi `ExecuteActivity` để giữ hàng. Dòng code đó đưa ra một ý định điều phối, không tự chạy I/O kho ngay trong Workflow. SDK thu thập Command; khi hoàn tất Workflow Task, worker gửi command cho Service, nơi xử lý và ghi các event tương ứng. Kết quả Activity về sau cũng được ghi vào history.

Nếu worker mất state trong RAM, worker phù hợp có thể replay định nghĩa từ input và history để dựng lại. Lệnh đã được ghi nhận được đối chiếu với lịch sử, kết quả đã hoàn tất được cấp lại; phần side effect ấy không chạy lại chỉ vì replay. Worker cache có thể tránh replay toàn bộ mỗi task, nhưng không thay đổi yêu cầu đúng khi cần phục hồi.

![Temporal dựng lại state từ Event History rồi tiếp tục tại điểm cần tiến triển](/images/notes/temporal/durable-execution-replay.jpg)

*Replay dùng kết quả Activity và timer đã ghi trong history; không lặp lại I/O của phần đã hoàn tất.*

## Determinism là tương thích với lịch sử

Với cùng input và history, Workflow phải phát ra chuỗi command tương thích như trước. Không dùng trực tiếp `time.Now`, random, HTTP, database hoặc goroutine Go trong Workflow Definition. Dùng clock, timer, selector và concurrency primitive của Temporal SDK. Giá trị không xác định được tính trong Activity hoặc được ghi có chủ đích bằng API phù hợp của SDK.

Một lỗi phổ biến là thêm Activity trước một lệnh cũ trong code. Execution mới chạy được, nhưng execution đang mở replay lịch sử có thể thấy code phát ScheduleActivity ở vị trí khác với Event History. Service/SDK phát hiện nondeterminism vì hai trình tự không khớp. Thay đổi tên/ID Activity, loại child, timer ordering hoặc handler có thể cũng tác động; thay đổi input hay thời gian timeout có thể an toàn trong một số trường hợp nhưng phải kiểm tra quy tắc cụ thể của SDK.

### So khớp một history ngắn

Giả sử thứ tự cũ là Reserve → Charge. History đã ghi Reserve và kết quả của nó; code Workflow cũ nhận kết quả rồi đi tới Charge. Khi replay, kết quả Reserve được đọc từ history để dựng lại đúng bước đang chờ.

Nếu deploy code mới thêm Validate ở trước Reserve, code mới có thể phát command không phù hợp tại vị trí history cũ đã ghi Reserve. Nó chạy được với đơn mới chưa chứng minh có thể tiếp tục đơn cũ. Cần phương án tương thích như patch/versioning đúng SDK; không sửa bằng cách gọi lại API kho bên trong Workflow.

Điều phải giữ là sự tương thích với command history, không phải bắt mọi dòng tính toán cục bộ không bao giờ được sửa. Hãy xét từng thay đổi theo tác động đến những quyết định đã được ghi.

## Workflow Task failure khác Workflow Execution failure

Workflow Task failure nghĩa Worker chưa xử lý thành công một lượt task, ví dụ do nondeterminism, worker crash, timeout hoặc lỗi code chưa được xử lý theo cách SDK dự kiến. Service có thể tiếp tục thử lại Workflow Task, và Workflow Execution vẫn mở trong khi nhóm sửa code hoặc hạ tầng. Workflow Execution failure là quy trình nghiệp vụ đã kết thúc với trạng thái Failed, chẳng hạn Activity trả lỗi cuối cùng và Workflow để lỗi lan ra.

Phân biệt hai trạng thái giúp phản ứng đúng. Nondeterminism sau deploy thường cần rollback/fix code tương thích, không phải start lại đơn hàng. Thanh toán bị từ chối vì lý do nghiệp vụ có thể cần người dùng cập nhật thông tin rồi bắt đầu quy trình mới. Đọc history và Worker log, xác định task failure hay execution failure rồi mới quyết định reset, retry hay compensation.

## History cũng là giới hạn tài nguyên

Mỗi Command/Event và payload được ghi làm history tăng. Workflow chạy dài có thể replay lâu và vượt giới hạn service; Worker cache giúp giảm replay thường xuyên nhưng không thay đổi yêu cầu correctness. Đo history length và task latency. Continue-As-New bắt đầu run mới với input state cần thiết để tránh giữ toàn bộ event cũ trong lần chạy tiếp theo; các liên hệ với Workflow ID và Run ID cần được thể hiện rõ trong dashboard.

Khi chia bằng Child Workflow, mỗi child có history và lifecycle độc lập, còn parent theo dõi kết quả hoặc giao tiếp qua message. Đây cũng là cách phân chia workload lớn, nhưng không phải cách chia package. Bắt đầu đơn giản với một Workflow nếu giới hạn lịch sử và coupling cho phép; tạo child khi đơn vị con thực sự có owner, retry, trạng thái hoặc khả năng scale riêng.

Thực hành tốt là lưu lịch sử đại diện từ production hoặc tạo fixture tương đương, sau đó chạy replayer khi sửa code. Log Task Failure có ích, nhưng replay tự động trong CI cho biết chính xác history nào không tương thích. Determinism không chỉ là quy tắc style: đó là điều kiện để tiến trình cũ tiếp tục chạy khi ứng dụng đã thay đổi.

## Tự kiểm tra cách đọc lỗi

**Workflow Task lỗi lặp có nghĩa đơn đã đóng Failed chưa?** Không nhất thiết. Execution có thể còn mở trong lúc task tiếp tục lỗi; cần nhìn trạng thái execution và nguyên nhân task.

**Một kết quả Activity đã có trong history có bị gọi lại vì worker mới không?** Không vì riêng việc replay phần hoàn tất đó. Attempt chưa được ghi hoàn tất là tình huống khác, cần idempotency.

**Có thể sửa lỗi bằng cách xóa history không?** Không coi đó là thao tác biên tập trạng thái tùy ý. Cần cơ chế được engine hỗ trợ và đối chiếu side effect thực tế; history liên quan trực tiếp đến khả năng phục hồi.

---
title: "Thiết kế Activity có timeout, retry và side effect an toàn"
category: "Workflow Engine"
kind: "guide"
translationKey: "cadence/activity-reliability"
series: "Cadence"
seriesOrder: 4
description: "Chọn ranh giới Activity, timeout, retry, heartbeat và idempotency để lỗi ngoài hệ thống không tạo tác dụng phụ trùng."
sources:
  - title: "Cadence Activities"
    url: "https://cadenceworkflow.io/docs/concepts/activities"
  - title: "Cadence Activity Timeouts"
    url: "https://cadenceworkflow.io/docs/concepts/activities"
  - title: "Cadence Asynchronous Activity Completion"
    url: "https://cadenceworkflow.io/docs/go-client/activity-async-completion"
  - title: "Cadence Retry Policies"
    url: "https://cadenceworkflow.io/docs/concepts/activities"
draft: false
updated: 2026-10-15
---

Provider đã tạo shipment, nhưng worker chết trước khi báo kết quả cho Cadence. Nhìn từ Service, Activity chưa hoàn tất; nhìn từ provider, kiện hàng đã tồn tại. Nếu retry gửi lại lệnh tạo mới không có khóa ổn định, hệ thống có thể đặt hai chuyến giao cho một đơn.

Activity là ranh giới cho công việc bên ngoài Workflow deterministic. Thiết kế nó từ một kết quả nghiệp vụ có thể nhận diện, như “tạo shipment cho order X”, rồi quyết định cách xác nhận, thử lại và đối soát. Quá lớn thì retry lặp nhiều bước; quá nhỏ thì một quy trình tạo nhiều task/event và chi phí điều phối. Replay các lệnh cũ không tự tạo thêm event chỉ vì code được chạy lại.



## Bốn timeout trả lời bốn câu hỏi khác nhau

Schedule-to-Start giới hạn thời gian task nằm chờ trước khi Worker nhận. Schedule-to-Close thường được hiểu là giới hạn từ lúc schedule đến khi Activity kết thúc, còn Start-to-Close giới hạn một attempt sau khi Worker bắt đầu. Heartbeat Timeout yêu cầu Activity chạy lâu phải báo tiến độ định kỳ. Đây là bốn khái niệm timeout; trong Go, cấu hình ActivityOptions cần có Schedule-to-Start và Start-to-Close tường minh, còn tổ hợp timeout hợp lệ và mặc định khác nhau giữa SDK.

Với `RetryPolicy` trong Cadence Go theo behavior tài liệu hóa, server kéo dài Schedule-to-Start và Schedule-to-Close trong event đã schedule theo `ExpirationInterval`; nếu trường này không đặt, nó dùng workflow timeout. Vì vậy `ScheduleToCloseTimeout` cấu hình ban đầu không nhất thiết là budget tổng thực tế khi có retry. Muốn giới hạn thời gian thử lại theo deadline nghiệp vụ, đặt `ExpirationInterval` phù hợp hoặc đặt workflow timeout tương ứng; `MaximumAttempts` có thể khiến retry dừng sớm hơn. Start-to-Close vẫn giới hạn một attempt, còn queue và backoff tiêu thụ khoảng thời gian tổng. Kiểm tra đúng SDK/server đang dùng: [Cadence Go retries](https://cadenceworkflow.io/docs/go-client/retries), [Activity timeouts](https://cadenceworkflow.io/docs/concepts/activities).

## Retry không thay thế idempotency

Retry policy nên phân biệt lỗi tạm thời và lỗi vĩnh viễn. Lỗi mạng hoặc giới hạn rate có thể retry với backoff; lỗi input không hợp lệ thường nên trả thất bại ngay. Tránh retry vô hạn với một dependency đã ngừng hoạt động: nó giữ execution mở và tạo backlog. Dùng maximum attempts hoặc expiration interval, theo dõi trạng thái lỗi, rồi quyết định workflow chờ, yêu cầu người dùng sửa dữ liệu hay chạy bù.

Hãy giả định timeout có thể xảy ra sau khi hệ thống ngoài đã thực hiện side effect. Một request tạo shipment có thể thành công tại nhà cung cấp nhưng response bị mất. Lần retry phải dùng idempotency key hoặc đọc trạng thái shipment theo business key trước khi tạo mới. Với thao tác không thể lặp an toàn, thiết kế một Activity truy vấn để đối soát hoặc lưu operation ID trước khi báo hoàn thành.

### Theo dấu một lần thử không rõ kết quả

| Thời điểm | Provider | Cadence biết gì? |
| --- | --- | --- |
| Trước yêu cầu | Chưa có shipment | Activity đã được schedule/nhận |
| Sau xử lý nhưng mất response | Có thể đã có shipment | Chưa có kết quả thành công được ghi |
| Attempt sau | Tìm shipment bằng khóa nghiệp vụ | Cần một kết quả xác nhận được |

Khóa phải ổn định cho cùng thao tác logic, không đổi theo mỗi attempt. Việc “tra trước rồi tạo” cũng phải dựa vào bảo đảm chống trùng ở provider hoặc cơ chế atomic thích hợp; hai attempt có thể chồng nếu công việc cũ không thực sự dừng sau timeout.

Không dùng timeout như bằng chứng rollback. Timeout làm engine thay đổi cách chờ/thử lại, còn I/O ngoài phải có deadline, cancellation và hợp đồng riêng.

## Heartbeat và tiến trình dài

Activity tải file, xử lý batch hoặc đợi hệ thống ngoài trong thời gian dài nên heartbeat thường xuyên hơn timeout đã cấu hình. Heartbeat thông báo Worker còn hoạt động và có thể mang checkpoint để lần retry tiếp tục từ chunk gần nhất. Chỉ lưu dữ liệu tiến trình nhỏ, bền vững và có thể đọc lại; đừng dùng heartbeat details làm nơi chứa toàn bộ file hoặc nguồn trạng thái nghiệp vụ duy nhất.

Khi workflow bị cancel, Activity có thể cần nhận biết cancellation qua heartbeat để dọn tài nguyên hoặc dừng công việc. Nếu code chỉ block trong một lời gọi không hỗ trợ context/cancel, yêu cầu hủy không làm nó dừng tức thì. Quy định rõ thời gian cleanup tối đa và cách xử lý nếu dependency bỏ qua cancellation.

## Khi bên ngoài chỉ callback sau

Một số hệ thống nhận yêu cầu rồi trả kết quả qua webhook vài giờ sau. Có thể dùng asynchronous Activity completion: Activity lưu token/reference và nhường hoàn thành cho process callback, thay vì giữ một goroutine xử lý Activity chờ suốt thời gian đó. Callback phải xác thực, gắn đúng Activity attempt và chống gửi lặp. Phải có deadline hoặc watchdog; nếu callback mất, Activity vẫn cần timeout để workflow không chờ vô hạn.

Trong Go, hàm phải trả `activity.ErrResultPending` để báo bàn giao; trả thành công bình thường sẽ hoàn tất Activity ngay. Callback dùng Client `CompleteActivity` với token để báo kết quả sau. Timeout vẫn có hiệu lực trong lúc chờ; nhường goroutine không kéo dài deadline. Xem [async completion của Cadence Go](https://cadenceworkflow.io/docs/go-client/activity-async-completion).

Ranh giới Activity cũng là ranh giới bảo mật. Chỉ chuyển dữ liệu tối thiểu cần thiết, không ghi secret vào log, và cân nhắc converter/mã hóa phù hợp cho payload lưu trong history. Đừng tin rằng Activity hoàn tất đồng nghĩa mọi hệ thống đã ở cùng trạng thái: database, provider và Cadence không nằm trong một transaction phân tán duy nhất.

Một checklist trước khi đưa Activity vào production: có input/output ổn định không; retry sẽ gọi lại gì; idempotency key là gì; timeout nào áp dụng; lỗi nào non-retryable; heartbeat cần lưu checkpoint gì; cancellation có dọn được không; và có metric để tìm Activity chậm hoặc retry nhiều không? Viết câu trả lời vào contract của Activity sẽ giúp nhóm khác dùng nó an toàn hơn.

## Tự kiểm tra hợp đồng Activity

**Start-to-Close quá hạn có chứng minh provider chưa xử lý không?** Không. Side effect có thể xong trước khi mất phản hồi; cần tra trạng thái bằng khóa ổn định.

**Heartbeat báo chunk 10 trước khi chunk được ghi bền vững có an toàn không?** Không. Attempt sau có thể bỏ qua chunk chưa thật sự hoàn tất. Ghi checkpoint theo trạng thái có thể tiếp tục đúng.

**Async completion bỏ worker chờ có làm deadline không cần thiết không?** Không. Callback có thể mất hoặc trễ; phải có cách kết thúc chờ, xác thực và xử lý callback lặp.

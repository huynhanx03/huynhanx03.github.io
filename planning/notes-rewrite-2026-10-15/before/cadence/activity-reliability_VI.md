---
title: "Thiết kế Activity có timeout, retry và side effect an toàn"
category: "Workflow Engine"
kind: "guide"
translationKey: "cadence/activity-reliability"
translationPending: true
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
---

Activity là ranh giới giữa orchestration có thể replay và thế giới bên ngoài có I/O, lỗi mạng cùng side effect. Activity tốt đại diện cho một bước nghiệp vụ đủ rõ để retry và quan sát, chẳng hạn “reserve inventory cho order X”, thay vì một hàm kỹ thuật quá nhỏ như “gọi HTTP endpoint”. Nếu Activity quá lớn, timeout/retry có thể lặp lại nhiều công việc; nếu quá nhỏ, mỗi lần replay lại tạo thêm nhiều event và khó hiểu tiến trình.

## Bốn timeout trả lời bốn câu hỏi khác nhau

Schedule-to-Start giới hạn thời gian task nằm chờ trước khi Worker nhận. Schedule-to-Close giới hạn toàn bộ thời gian từ lúc schedule đến khi Activity thành công hoặc hết hạn, gồm cả các lần retry. Start-to-Close giới hạn một lần thử sau khi Worker bắt đầu. Heartbeat Timeout yêu cầu Activity chạy lâu phải báo tiến độ định kỳ. Không phải Activity nào cũng cần cả bốn; chọn dựa trên thời gian queue bình thường, thời lượng xử lý, số retry và khả năng tiếp tục sau checkpoint.

Nếu không đặt timeout phù hợp, một Activity bị treo có thể giữ Workflow ở trạng thái mở mà không tạo tín hiệu đủ nhanh để khắc phục. Timeout quá ngắn lại tạo retry khi hệ thống chỉ đang chậm, tăng tải lên dependency. Hãy bắt đầu từ phân phối thời gian thực tế, đặt một giới hạn nghiệp vụ và thêm khoảng chịu đựng cho biến động. Schedule-to-Close cần lớn hơn tổng budget của các attempt và backoff nếu muốn có đủ cơ hội retry.

## Retry không thay thế idempotency

Retry policy nên phân biệt lỗi tạm thời và lỗi vĩnh viễn. Lỗi mạng hoặc giới hạn rate có thể retry với backoff; lỗi input không hợp lệ thường nên trả thất bại ngay. Tránh retry vô hạn với một dependency đã ngừng hoạt động: nó giữ execution mở và tạo backlog. Dùng maximum attempts hoặc expiration interval, theo dõi trạng thái lỗi, rồi quyết định workflow chờ, yêu cầu người dùng sửa dữ liệu hay chạy bù.

Hãy giả định timeout có thể xảy ra sau khi hệ thống ngoài đã thực hiện side effect. Một request tạo shipment có thể thành công tại nhà cung cấp nhưng response bị mất. Lần retry phải dùng idempotency key hoặc đọc trạng thái shipment theo business key trước khi tạo mới. Với thao tác không thể lặp an toàn, thiết kế một Activity truy vấn để đối soát hoặc lưu operation ID trước khi báo hoàn thành.

## Heartbeat và tiến trình dài

Activity tải file, xử lý batch hoặc đợi hệ thống ngoài trong thời gian dài nên heartbeat thường xuyên hơn timeout đã cấu hình. Heartbeat thông báo Worker còn hoạt động và có thể mang checkpoint để lần retry tiếp tục từ chunk gần nhất. Chỉ lưu dữ liệu tiến trình nhỏ, bền vững và có thể đọc lại; đừng dùng heartbeat details làm nơi chứa toàn bộ file hoặc nguồn trạng thái nghiệp vụ duy nhất.

Khi workflow bị cancel, Activity có thể cần nhận biết cancellation qua heartbeat để dọn tài nguyên hoặc dừng công việc. Nếu code chỉ block trong một lời gọi không hỗ trợ context/cancel, yêu cầu hủy không làm nó dừng tức thì. Quy định rõ thời gian cleanup tối đa và cách xử lý nếu dependency bỏ qua cancellation.

## Khi bên ngoài chỉ callback sau

Một số hệ thống nhận yêu cầu rồi trả kết quả qua webhook vài giờ sau. Có thể dùng asynchronous Activity completion: Activity lưu token/reference và nhường hoàn thành cho process callback, thay vì giữ Worker thread bận. Callback phải xác thực, gắn đúng Activity attempt và chống gửi lặp. Phải có deadline hoặc watchdog; nếu callback mất, Activity vẫn cần timeout để workflow không chờ vô hạn.

Ranh giới Activity cũng là ranh giới bảo mật. Chỉ chuyển dữ liệu tối thiểu cần thiết, không ghi secret vào log, và cân nhắc converter/mã hóa phù hợp cho payload lưu trong history. Đừng tin rằng Activity hoàn tất đồng nghĩa mọi hệ thống đã ở cùng trạng thái: database, provider và Cadence không nằm trong một transaction phân tán duy nhất.

Một checklist trước khi đưa Activity vào production: có input/output ổn định không; retry sẽ gọi lại gì; idempotency key là gì; timeout nào áp dụng; lỗi nào non-retryable; heartbeat cần lưu checkpoint gì; cancellation có dọn được không; và có metric để tìm Activity chậm hoặc retry nhiều không? Viết câu trả lời vào contract của Activity sẽ giúp nhóm khác dùng nó an toàn hơn.

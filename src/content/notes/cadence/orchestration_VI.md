---
title: "Điều phối Workflow bằng Signal, Query và Timer"
category: "Workflow Engine"
kind: "guide"
translationKey: "cadence/orchestration"
translationPending: true
series: "Cadence"
seriesOrder: 5
description: "Chọn đúng primitive để nhận yêu cầu, đọc trạng thái, chờ lịch và phối hợp các bước nghiệp vụ dài hạn."
sources:
  - title: "Cadence Workflow Signals and Queries"
    url: "https://cadenceworkflow.io/docs/concepts/events"
  - title: "Cadence Timers"
    url: "https://cadenceworkflow.io/docs/concepts/timers"
  - title: "Cadence Schedules"
    url: "https://cadenceworkflow.io/docs/concepts/schedules"
  - title: "Cadence Child Workflows"
    url: "https://cadenceworkflow.io/docs/concepts/workflows"
draft: false
---

Workflow hữu ích khi nó có thể chờ và nhận thay đổi nghiệp vụ mà không cần giữ process hoặc goroutine thường sống suốt thời gian đó. Ví dụ đơn hàng chờ khách bổ sung giấy tờ, chờ thời hạn thanh toán, hoặc nhận sự kiện giao hàng. Các primitive message, timer và child workflow giải quyết những nhu cầu khác nhau; dùng nhầm primitive làm logic khó hiểu và history khó vận hành.

## Signal và Query có hợp đồng khác nhau

Signal gửi thông tin vào Workflow đang chạy theo kiểu bất đồng bộ. Client không đợi Workflow xử lý xong hay nhận kết quả trực tiếp. Dùng Signal khi một sự kiện như “đã giao hàng” cần được ghi vào quy trình nhưng bên gửi không cần phản hồi đồng bộ. Nếu Signal có thể đến trước khi Workflow xử lý xong một bước khác, Workflow nên giữ message trong state hoặc dùng channel/selector của SDK để xử lý theo thứ tự.

Query đọc state hiện tại mà không ghi event mới. Query phù hợp cho dashboard hỏi “đơn này đang ở bước nào?” nhưng handler phải đọc state trong bộ nhớ Workflow và không gọi database hay thay đổi trạng thái. Query không phải API để chạy một tác vụ mới; kết quả có thể phản ánh một thời điểm cụ thể và client nên hiểu workflow có thể tiến triển ngay sau đó.

Cadence hiện cung cấp Signal để ghi bất đồng bộ và Query để đọc state; đừng gán cho Cadence API Update như Temporal. Nếu Client cần kết quả xác nhận cho một yêu cầu ghi, phải thiết kế hợp đồng rõ ràng: gửi Signal mang request ID, Workflow lưu kết quả và gửi phản hồi qua một kênh ứng dụng, hoặc chờ một Query sau khi biết Workflow đã xử lý request đó. Query đọc đồng bộ nhưng không tự bảo đảm nó đã nhìn thấy Signal cụ thể nào. Chương so sánh cuối sẽ nói rõ vì cùng tên khái niệm không đảm bảo API và hành vi giống hệt.

## Timer, Cron và Schedule

Timer trong Workflow là cách durable để chờ: Service ghi thời điểm bắt đầu và kết quả expiry vào history, rồi Worker có thể dừng trong lúc chờ. Không dùng `time.Sleep` của Go trong Workflow; sleep local không được ghi vào history và có thể làm process giữ tài nguyên hoặc replay lệch.

Timer thường trả lời “quy trình này chờ đến khi nào?” Schedule trả lời “khi nào khởi chạy một Workflow mới lặp lại?”. Cron là cơ chế recurring start cũ và có semantics hạn chế hơn Schedule. Cadence Schedules có thể quản lý trạng thái lịch, pause, backfill và overlap policy. Khi lần trước còn chạy mà lịch mới đến, chọn skip, buffer, concurrent, cancel hay terminate theo ý nghĩa dữ liệu; chạy song song không an toàn nếu hai execution cùng cập nhật một tài khoản không có khóa.

Trước khi bật backfill, định nghĩa rõ thời điểm UTC, cửa sổ cần bù, tác dụng phụ có thể lặp và cách giới hạn concurrency. Schedule chạy bù trong lúc hệ thống đang quá tải có thể làm tình hình xấu hơn. Hãy quan sát lần chạy gần nhất/kế tiếp và có quy trình pause khẩn cấp.

## Child Workflow hay thêm nhánh vào Workflow hiện tại?

Child Workflow hữu ích khi một phần quy trình cần vòng đời và history riêng, có thể tái sử dụng hoặc chạy song song với nhiều đơn vị độc lập. Ví dụ, workflow cha điều phối đơn hàng, còn mỗi sản phẩm có child riêng để kiểm tra nhà cung cấp. Nhưng child tạo thêm execution, task và giao tiếp bất đồng bộ; đừng tách chỉ để làm code trông có vẻ modular. Nếu phần việc bounded, cần chia sẻ state chặt và chỉ có một owner, một Workflow thường dễ hiểu hơn.

Khi start nhiều child, quyết định rõ parent đóng thì child được để chạy, cancel hay terminate; chờ kết quả của tất cả hay chấp nhận kết quả từng phần. Giới hạn số child đồng thời để tránh tạo bão task. Child không tự chia sẻ bộ nhớ với parent; dùng kết quả, Signal hoặc persisted input/output làm hợp đồng.

## Cancellation, timeout và compensation

Cancellation là yêu cầu hợp tác. Workflow có thể dừng chờ, gửi cancellation xuống Activity/child, chạy cleanup rồi đóng trạng thái đã hủy. Termination là dừng cưỡng bức, không cho code cơ hội dọn dẹp. Dùng termination khi cần cắt execution ngay và chấp nhận trạng thái ngoài hệ thống có thể dang dở; với thanh toán hay giao hàng, cancel có phối hợp thường an toàn hơn.

Saga compensation không phải rollback transaction tự động. Nếu reserve hàng thành công rồi charge thất bại, Workflow gọi một bước nghiệp vụ mới để release hàng. Compensation cũng có thể thất bại hoặc cần retry; thiết kế nó thành Activity idempotent, ghi rõ thứ tự, và quyết định dừng hay tiếp tục các bước bù. Càng nhiều side effect thì càng cần trạng thái nghiệp vụ minh bạch.

Hãy bắt đầu từ câu hỏi “điều gì có thể gửi vào quy trình, và quy trình chờ cái gì?”. Từ đó chọn Signal cho sự kiện bất đồng bộ, Query cho đọc state, Timer cho chờ bên trong một execution, Schedule cho recurring start, Child Workflow khi cần đơn vị độc lập, và compensation khi rollback nghiệp vụ không thể thực hiện nguyên tử.

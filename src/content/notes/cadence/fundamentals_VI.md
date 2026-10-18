---
title: "Durable Workflow là gì và khi nào nên dùng Cadence?"
category: "Workflow Engine"
kind: "guide"
translationKey: "cadence/fundamentals"
series: "Cadence"
seriesOrder: 1
description: "Hiểu durable execution, phân biệt workflow engine với queue và nhận biết lúc Cadence đáng với chi phí vận hành."
sources:
  - title: "Cadence Workflow Engine"
    url: "https://cadenceworkflow.io/docs/concepts/workflow-engine"
  - title: "Cadence Workflows"
    url: "https://cadenceworkflow.io/docs/concepts/workflows"
  - title: "Cadence Blog: workflow history"
    url: "https://cadenceworkflow.io/blog/2026/06/03/2026-06-03-workflow-history-data-converter/workflow-history-data-converter"
draft: false
updated: 2026-10-15
---

Đơn hàng đã giữ hàng trong kho, nhưng worker chết ngay trước lúc yêu cầu thu tiền. Khi process mới lên, chương trình phải biết bước nào đã xong và bước nào còn phải làm. Nếu khởi chạy lại từ đầu một cách mù quáng, nó có thể giữ hàng hoặc thu tiền thêm lần nữa.

Durable workflow giúp quản lý tiến trình qua những lần gián đoạn như vậy. Ta vẫn cần thiết kế side effect an toàn; điều engine cung cấp là cơ chế lưu lịch sử và tiếp tục điều phối. Với Cadence, Workflow có thể chờ lâu, nhận Signal rồi tiếp tục mà không phụ thuộc một process ứng dụng phải sống liên tục. Biến cục bộ được dựng lại bằng code và history, không phải snapshot RAM tùy ý.



## Workflow, Activity, Service và Worker

Workflow quyết định thứ tự và chính sách nghiệp vụ. Nó không nên gọi database, HTTP hay hệ thống thanh toán trực tiếp vì các kết quả bên ngoài không thể tái tạo an toàn khi replay. Công việc có side effect đặt trong Activity. Activity có thể gọi dịch vụ ngoài, ghi dữ liệu và được retry độc lập; vì vậy thao tác của nó vẫn phải chịu được việc gọi lại.

Cadence Service ghi nhận các quyết định và phân phối task. Worker là process ứng dụng do mình chạy; nó poll Task List, chạy Workflow hoặc Activity rồi gửi kết quả về Service. Worker có thể dừng mà không làm mất state đã ghi bền vững, nhưng nếu toàn bộ worker không hoạt động thì workflow không tiến triển cho đến khi có worker phù hợp trở lại. Nói “workflow chịu lỗi process” không có nghĩa ứng dụng không cần vận hành worker.

### Theo dấu sau khi worker chết

Giả sử Service đã ghi nhận Activity giữ hàng thành công, nhưng chưa có kết quả thu tiền. Worker mới dùng history để dựng lại state “đã giữ hàng”. Khi replay đi qua bước giữ hàng đã hoàn tất, SDK cung cấp lại kết quả đã ghi; nó không gọi lại kho chỉ vì đang chạy lại code Workflow.

Nếu phía kho đã giữ hàng nhưng kết quả chưa kịp được Service ghi nhận, attempt về sau vẫn có thể lặp lại yêu cầu. Đây là chỗ cần idempotency và đối soát. Durable execution bảo vệ tiến trình điều phối; nó không tạo transaction nguyên tử với hệ thống kho.

History đã bền vững cũng chưa đủ để tiến triển ngay: cần Service/persistence hoạt động và worker phù hợp trở lại. Một workflow đang chờ người dùng hai ngày khác với một Activity worker bị giữ bận hai ngày.

## Vì sao không chỉ dùng queue hoặc cron?

Queue phù hợp khi mỗi message độc lập: nhận một công việc, xử lý, ack hoặc retry. Nó không tự mô hình hóa một quy trình kéo dài có nhiều nhánh, timer, trạng thái chờ và hành động bù. Ta vẫn có thể xây những phần đó bằng database, bảng outbox, scheduler và state machine tự viết; Cadence gom cơ chế thực thi bền vững vào một mô hình thống nhất.

Đổi lại, đội ngũ phải hiểu replay/determinism, quản lý Service và persistence, vận hành Worker, kiểm soát payload và xử lý thay đổi code khi execution cũ còn sống. Một tác vụ gửi email duy nhất thường không cần Cadence. Quy trình cấp hạn mức, onboarding khách hàng hoặc thanh toán nhiều bước, phải sống qua downtime và cần xem lại lịch sử thường là ứng viên tốt hơn.

## Một bài kiểm tra quyết định

Hãy mô tả quy trình bằng các trạng thái nghiệp vụ, ví dụ `PENDING_PAYMENT`, `PAID`, `SHIPPING` và `REFUNDED`. Với mỗi bước, hỏi: có phải chờ bên ngoài không; thời gian chờ tối đa bao lâu; retry có an toàn không; nếu bước sau thất bại thì cần bù gì; và người vận hành cần tìm execution bằng dữ liệu nào? Nếu câu trả lời đòi hỏi nhiều bảng trạng thái, cron rời rạc và logic retry tự viết, workflow engine có thể giảm rủi ro và công sức.

Đừng chọn Cadence chỉ vì quy trình có nhiều hàm. Chọn khi độ bền của tiến trình, khả năng phục hồi, quan sát và xử lý ngoại lệ có giá trị lớn hơn chi phí của một nền tảng workflow. Trước khi triển khai, thử một quy trình thật có timeout, retry, cancellation và dữ liệu nhạy cảm; prototype chỉ có happy path sẽ đánh giá thiếu phần khó nhất.

Trong các chương tiếp theo, ta dùng một đơn hàng làm ví dụ xuyên suốt: bắt đầu từ Workflow nhỏ nhất, thêm Activity có retry, xử lý thông điệp và timer, rồi kiểm thử replay và đưa lên production. Mỗi primitive nên giải quyết một yêu cầu đã thấy trong quy trình, thay vì thêm vào chỉ vì SDK có sẵn.

## Tự kiểm tra trước khi chọn engine

**Chỉ có một task gửi email độc lập thì có cần workflow engine không?** Chưa có lý do đủ mạnh chỉ từ số task. Queue với retry và lưu trạng thái phù hợp có thể đáp ứng; cần xét quy trình chờ, nhiều nhánh và nhu cầu phục hồi/quan sát.

**Worker tắt có làm state đã ghi mất không?** Không theo mô hình lưu bền vững đã cấu hình, nhưng công việc không tự chạy khi thiếu worker nhận đúng task. Độ bền trạng thái và khả năng tiến triển là hai điều phải vận hành.

**Activity có cần chống gọi lại dù đã dùng Cadence?** Có. Cửa sổ “side effect thành công, kết quả chưa được ghi” vẫn tồn tại. Bài [Activity reliability](/vi/notes/cadence/activity-reliability/) đi sâu vào ranh giới này.

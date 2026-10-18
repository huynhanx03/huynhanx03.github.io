---
title: "Durable Workflow là gì và khi nào nên dùng Cadence?"
category: "Workflow Engine"
kind: "guide"
translationKey: "cadence/fundamentals"
translationPending: true
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
---

Một đơn hàng có thể đi qua nhiều bước: giữ hàng, thu tiền, giao cho hãng vận chuyển, chờ xác nhận và hoàn tiền nếu một khâu thất bại. Nếu viết tất cả bằng một HTTP request, process có thể chết giữa chừng. Nếu tách thành queue, mỗi consumer cần tự lưu tiến độ, lên lịch retry, tránh xử lý trùng và cho nhân viên biết đơn đang kẹt ở đâu. Đây là phần việc mà durable workflow giải quyết.

Cadence cho phép mô tả quy trình như một hàm có trạng thái. Workflow có thể chờ vài phút, vài ngày, nhận tín hiệu từ người dùng rồi tiếp tục. Cadence lưu các sự kiện của execution; khi worker khởi động lại hoặc đổi máy, SDK chạy lại mã Workflow theo lịch sử để dựng lại state rồi tiếp tục từ điểm cần tiến triển. Biến cục bộ của hàm không được lưu như một snapshot tùy ý; history là nguồn để tái tạo chúng.

## Workflow, Activity, Service và Worker

Workflow quyết định thứ tự và chính sách nghiệp vụ. Nó không nên gọi database, HTTP hay hệ thống thanh toán trực tiếp vì các kết quả bên ngoài không thể tái tạo an toàn khi replay. Công việc có side effect đặt trong Activity. Activity có thể gọi dịch vụ ngoài, ghi dữ liệu và được retry độc lập; vì vậy thao tác của nó vẫn phải chịu được việc gọi lại.

Cadence Service ghi nhận các quyết định và phân phối task. Worker là process ứng dụng do mình chạy; nó poll Task List, chạy Workflow hoặc Activity rồi gửi kết quả về Service. Worker có thể dừng mà không làm mất state đã ghi bền vững, nhưng nếu toàn bộ worker không hoạt động thì workflow không tiến triển cho đến khi có worker phù hợp trở lại. Nói “workflow chịu lỗi process” không có nghĩa ứng dụng không cần vận hành worker.

## Vì sao không chỉ dùng queue hoặc cron?

Queue phù hợp khi mỗi message độc lập: nhận một công việc, xử lý, ack hoặc retry. Nó không tự mô hình hóa một quy trình kéo dài có nhiều nhánh, timer, trạng thái chờ và hành động bù. Ta vẫn có thể xây những phần đó bằng database, bảng outbox, scheduler và state machine tự viết; Cadence gom cơ chế thực thi bền vững vào một mô hình thống nhất.

Đổi lại, đội ngũ phải hiểu replay/determinism, quản lý Service và persistence, vận hành Worker, kiểm soát payload và xử lý thay đổi code khi execution cũ còn sống. Một tác vụ gửi email duy nhất thường không cần Cadence. Quy trình cấp hạn mức, onboarding khách hàng hoặc thanh toán nhiều bước, phải sống qua downtime và cần xem lại lịch sử thường là ứng viên tốt hơn.

## Một bài kiểm tra quyết định

Hãy mô tả quy trình bằng các trạng thái nghiệp vụ, ví dụ `PENDING_PAYMENT`, `PAID`, `SHIPPING` và `REFUNDED`. Với mỗi bước, hỏi: có phải chờ bên ngoài không; thời gian chờ tối đa bao lâu; retry có an toàn không; nếu bước sau thất bại thì cần bù gì; và người vận hành cần tìm execution bằng dữ liệu nào? Nếu câu trả lời đòi hỏi nhiều bảng trạng thái, cron rời rạc và logic retry tự viết, workflow engine có thể giảm rủi ro và công sức.

Đừng chọn Cadence chỉ vì quy trình có nhiều hàm. Chọn khi độ bền của tiến trình, khả năng phục hồi, quan sát và xử lý ngoại lệ có giá trị lớn hơn chi phí của một nền tảng workflow. Trước khi triển khai, thử một quy trình thật có timeout, retry, cancellation và dữ liệu nhạy cảm; prototype chỉ có happy path sẽ đánh giá thiếu phần khó nhất.

Trong các chương tiếp theo, ta dùng một đơn hàng làm ví dụ xuyên suốt: bắt đầu từ Workflow nhỏ nhất, thêm Activity có retry, xử lý thông điệp và timer, rồi kiểm thử replay và đưa lên production. Mỗi primitive nên giải quyết một yêu cầu đã thấy trong quy trình, thay vì thêm vào chỉ vì SDK có sẵn.

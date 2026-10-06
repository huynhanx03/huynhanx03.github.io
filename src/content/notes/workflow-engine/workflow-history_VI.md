---
title: "Workflow History là dữ liệu bền vững"
category: "Workflow Engine"
kind: "note"
translationKey: "workflow-engine/workflow-history"
translationPending: true
series: "Workflow Engine"
seriesOrder: 2
description: "History hỗ trợ replay nhưng cũng lưu payload và tạo yêu cầu về kích thước, bảo mật, retention."
sources:
  - title: "Cadence workflow history article"
    url: "https://cadenceworkflow.io/blog/2026/06/03/2026-06-03-workflow-history-data-converter/workflow-history-data-converter"
draft: false
---

Event History thường được nhìn như nhật ký để trả lời “workflow đã làm gì?”. Nhưng nó còn là đầu vào để worker replay và dựng lại state. Vì thế input, kết quả Activity, signal và một số payload khác có thể được lưu lâu hơn ta dự tính.

Điều đó tạo ra ba câu hỏi thiết kế: history lớn đến đâu, dữ liệu nhạy cảm có thể đọc ở đâu, và execution cần được giữ lại bao lâu?

## Đừng truyền cả object nếu chỉ cần một định danh

Giả sử Activity xử lý video trả về file 200 MB. Đưa toàn bộ file qua Workflow History khiến mỗi bước tiếp theo mang dữ liệu lớn, tăng chi phí lưu trữ và replay. Claim-check pattern lưu file ở object storage, còn history chỉ giữ object key cùng metadata cần thiết.

Reference bên ngoài cũng là dependency: nó phải còn tồn tại khi retry hoặc workflow tiếp tục. Thiết kế retention của object storage phải khớp với vòng đời execution; credential hoặc URL ký sẵn có thể hết hạn giữa các lần retry.

## Mã hóa không bao phủ mọi bề mặt

Data converter có thể mã hóa/serialize payload trên đường đi qua SDK, nhưng Search Attributes, log ứng dụng, metric label và dữ liệu trong hệ thống nguồn có thể không đi qua converter. Hãy lập danh sách tất cả nơi dữ liệu xuất hiện trước khi tuyên bố “history đã được mã hóa”.

Cadence có bài hướng dẫn về giới hạn payload 2 MB và cách claim check; con số này không nên áp sang Temporal hay phiên bản Cadence khác. Kiểm tra giới hạn thực tế, retention và cấu hình server/SDK của mình.

Một workflow bền vững cần giữ đủ dữ liệu để phục hồi, nhưng chỉ giữ đúng lượng dữ liệu cần thiết. Thiết kế payload là một phần của kiến trúc độ tin cậy và bảo mật, không chỉ là tối ưu dung lượng.

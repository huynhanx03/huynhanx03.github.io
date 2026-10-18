---
title: "Cron vs Schedule"
category: "Workflow Engine"
kind: "note"
translationKey: "workflow-engine/cron-vs-schedule"
translationPending: true
series: "Workflow Engine"
seriesOrder: 1
description: "Schedules bổ sung chính sách overlap, pause và backfill cho quy trình định kỳ; chọn policy theo ý nghĩa nghiệp vụ."
sources:
  - title: "Cadence Schedules release blog"
    url: "https://cadenceworkflow.io/blog/2026/06/23/cadence-schedules"
draft: false
---

Một tác vụ chạy lúc 2 giờ sáng nghe có vẻ đơn giản. Nhưng nếu lần chạy trước kéo dài quá 2 giờ thì sao? Bỏ lượt mới, xếp hàng chờ, chạy song song hay hủy lần cũ? Cron chỉ trả lời “khi nào đến giờ”; hệ thống vẫn phải tự định nghĩa phần còn lại.

Cadence Schedules biến lịch thành đối tượng server-side có thể quan sát và thay đổi. Tài liệu hiện hành mô tả các overlap policy như `SkipNew`, `Buffer`, `Concurrent`, `CancelPrevious` và `TerminatePrevious`; lịch cũng có thể pause, unpause và backfill những lượt đã bỏ lỡ. Đây là điểm mới đáng chú ý trong Cadence v1.4.1. Hãy kiểm tra server và SDK đang chạy vì hỗ trợ API có thể khác theo phiên bản.

## Ví dụ: ETL chạy mỗi giờ

Nếu dữ liệu đầu vào cũ mất giá trị sau một giờ, có thể hủy lần trước và chạy với dữ liệu mới. Nếu mỗi cửa sổ dữ liệu bắt buộc phải xử lý, buffer hoặc backfill hợp lý hơn. Nếu mỗi lần độc lập và có giới hạn tài nguyên, cho chạy song song nhưng đặt concurrency cap.

Policy sai có thể tạo backlog, bỏ mất dữ liệu hoặc gây hai lần ghi cùng kết quả. Schedules không loại bỏ yêu cầu idempotency trong Activity.

## Bốn câu hỏi trước khi đặt lịch

1. Khi lần trước chưa xong, lần mới nên skip, chờ hay chạy song song?
2. Sau downtime, có cần chạy bù không? Chạy tất cả hay chỉ lần gần nhất?
3. Ai được pause lịch và lý do được lưu ở đâu?
4. Làm sao nhìn thấy lần tiếp theo, lần gần nhất và các lượt lỗi?

Cadence và Temporal đều có Schedule, nhưng tên policy và semantics không hoàn toàn giống. Hãy đọc docs của engine đang dùng và test với một lịch có thời lượng dài hơn chu kỳ trước khi triển khai.

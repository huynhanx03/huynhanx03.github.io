---
title: "Vận hành Temporal và Worker trong production"
category: "Workflow Engine"
kind: "guide"
translationKey: "temporal/production"
translationPending: true
series: "Temporal"
seriesOrder: 7
description: "Lập kế hoạch namespace, Worker, persistence, capacity, nâng cấp và xử lý sự cố cho Temporal self-hosted hoặc Cloud."
sources:
  - title: "Temporal Platform production deployments"
    url: "https://docs.temporal.io/production-deployment"
  - title: "Workers"
    url: "https://docs.temporal.io/workers"
  - title: "Temporal Service"
    url: "https://docs.temporal.io/temporal-service"
  - title: "Temporal Visibility"
    url: "https://docs.temporal.io/visibility"
draft: false
---

Temporal làm bền vững tiến trình nghiệp vụ, nhưng production vẫn cần một kế hoạch vận hành cho Service, persistence, visibility và Worker của ứng dụng. Temporal Cloud giảm phần hạ tầng do đội mình trực tiếp quản lý; self-hosted cho phép kiểm soát deployment sâu hơn nhưng đội vận hành phải chịu trách nhiệm nâng cấp, cơ sở dữ liệu, backup, bảo mật, scale và phục hồi thảm họa. Đây là lựa chọn về trách nhiệm và năng lực vận hành, không chỉ là nơi đặt endpoint.

## Tách Service khỏi Worker trong sơ đồ trách nhiệm

Client gửi lệnh và truy vấn; Temporal Service giữ Workflow state, phát task, theo dõi timeout và quản lý history; Worker do nhóm ứng dụng triển khai, poll Task Queue rồi chạy code. Service khỏe không có nghĩa Workflow tiến triển nếu Worker không chạy hoặc đăng ký sai type. Ngược lại, Worker khỏe không sửa được lỗi persistence hay lỗi kết nối Service.

Viết runbook theo từng lớp: API/namespace/connectivity, persistence/visibility, queue routing, Workflow Task và Activity/dependency. Với mỗi lớp, nêu metric, dashboard, log và thao tác an toàn. Trước production, thử dừng một Worker, khởi động lại process, mất kết nối downstream trong thời gian ngắn và phục hồi; xác nhận task được nhận lại, Activity có idempotency và alert không gây nhiễu.

## Capacity và phân loại backlog

Task Queue là ranh giới routing, không phải một worker cố định. Client và Worker phải dùng đúng namespace/queue, Worker phải đăng ký Workflow và Activity types mà task yêu cầu. Theo dõi backlog count và schedule-to-start latency, nhưng tách theo queue và loại workload. Queue tăng trong vài giây có thể là burst bình thường; queue tăng liên tục cùng latency là dấu hiệu capacity hoặc downstream không theo kịp.

Scale Worker theo CPU, memory, concurrency và dependency quota. Tăng worker song song có thể tăng tải database/API, gây thêm timeout rồi tạo retry storm. Đặt giới hạn task poller/activity concurrency hợp lý, scale chậm theo lag, và để capacity dự phòng cho deploy hoặc mất một vùng. Với Workflow Task backlog, kiểm tra deterministic code và tốc độ replay; một history rất dài có thể khiến mỗi lượt xử lý tốn CPU hơn.

## Namespace, quyền truy cập và dữ liệu

Namespace phân tách cấu hình và execution; dùng quy ước tên nhất quán theo môi trường/đội hoặc domain nghiệp vụ. Quản lý endpoint, TLS, credential và quyền Client/Worker qua secret manager; xoay credential theo quy trình có diễn tập. Mọi hoạt động hỗ trợ như xem history, terminate, reset hay signal execution cần log/audit và xác định ai được thực hiện.

Workflow history có thể chứa input và kết quả mà ứng dụng truyền vào. Xác định retention theo nhu cầu debug, chi phí, nghĩa vụ dữ liệu và khả năng tiếp tục execution. Nếu cần archival hoặc dữ liệu lớn/nhạy cảm, thử chính sách với phiên bản triển khai thật. Đừng dựa vào tên field là “metadata” để giả định nó vô hại; Search Attributes và log cũng cần phân loại.

## Deploy và nâng cấp không làm đứt execution

Workflow có thể tồn tại lâu hơn một lần phát hành. Gắn Worker build/version vào telemetry, chạy replay regression, rollout canary và giữ code cũ khi còn execution cần nó. Một deploy có thể thay routing, serialization hoặc cách xử lý Activity; chuẩn bị rollback cả Worker lẫn tương thích history. Nâng cấp Temporal Server và SDK cũng cần theo release notes, kiểm tra tương thích, backup trước thay đổi lưu trữ và kế hoạch phục hồi.

Runbook cần nói rõ cách xem trạng thái trước khi terminate/reset. Reset tạo một nhánh tiếp tục từ điểm history nhất định chứ không xóa hậu quả side effect đã xảy ra ở bên ngoài. Trước thao tác can thiệp, xác minh Activity đã thực hiện gì, dùng idempotency key nào, và đội nghiệp vụ muốn tiếp tục, bù trừ hay bắt đầu execution mới.

## Alert và phản ứng sự cố

Alert theo triệu chứng ảnh hưởng dịch vụ: latency tăng, lỗi API, task backlog kéo dài, Worker poll biến mất, số Activity retry/timeout tăng, persistence chậm hoặc execution lỗi vượt ngưỡng. Dùng cửa sổ thời gian và ngưỡng theo SLO thay vì báo động mọi retry đơn lẻ. Gắn link dashboard, query visibility và thao tác chẩn đoán vào runbook.

Khi queue kẹt, xác định trước task đang đợi Worker hay Worker đang đợi downstream. Khi Workflow Task thất bại lặp, kiểm tra nondeterminism, version/registration và lịch sử thay vì tăng số Worker mù quáng. Khi Activity retry nhiều, bảo vệ dependency bằng concurrency limit, backoff và circuit policy ở lớp phù hợp; dừng retry vô hạn cho lỗi vĩnh viễn. Sau incident, bổ sung fixture history hoặc kiểm thử fault injection để bài học trở thành kiểm tra có thể chạy lại.

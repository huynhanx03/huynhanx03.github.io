---
title: "Vận hành Temporal và Worker trong production"
category: "Workflow Engine"
kind: "guide"
translationKey: "temporal/production"
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
updated: 2026-10-15
---

Service vẫn trả API, nhưng đơn hàng ngừng tiến triển sau deploy worker. Từ trạng thái ấy không thể kết luận Temporal đã mất dữ liệu: worker có thể không poll, sai registration hoặc liên tục lỗi khi đọc history.

Production cần một bản đồ trách nhiệm. Temporal Cloud quản lý phần Service theo dịch vụ cung cấp, còn đội ứng dụng vẫn vận hành worker/code và dependency. Self-hosted đòi hỏi thêm trách nhiệm server, persistence, visibility, backup, bảo mật và phục hồi. Chọn nơi chạy endpoint chưa thay thế kế hoạch cho cả hệ thống.



## Tách Service khỏi Worker trong sơ đồ trách nhiệm

Client gửi lệnh và truy vấn; Temporal Service giữ Workflow state, phát task, theo dõi timeout và quản lý history; Worker do nhóm ứng dụng triển khai, poll Task Queue rồi chạy code. Service khỏe không có nghĩa Workflow tiến triển nếu Worker không chạy hoặc đăng ký sai type. Ngược lại, Worker khỏe không sửa được lỗi persistence hay lỗi kết nối Service.

Viết runbook theo từng lớp: API/namespace/connectivity, persistence/visibility, queue routing, Workflow Task và Activity/dependency. Với mỗi lớp, nêu metric, dashboard, log và thao tác an toàn. Trước production, thử dừng một Worker, khởi động lại process, mất kết nối downstream trong thời gian ngắn và phục hồi; xác nhận task được nhận lại, Activity có idempotency và alert không gây nhiễu.

## Capacity và phân loại backlog

Task Queue là ranh giới routing, không phải một worker cố định. Client và Worker phải dùng đúng namespace/queue, Worker phải đăng ký Workflow và Activity types mà task yêu cầu. Theo dõi backlog count và schedule-to-start latency, nhưng tách theo queue và loại workload. Queue tăng trong vài giây có thể là burst bình thường; queue tăng liên tục cùng latency là dấu hiệu capacity hoặc downstream không theo kịp.

Scale Worker theo CPU, memory, concurrency và dependency quota. Tăng worker song song có thể tăng tải database/API, gây thêm timeout rồi tạo retry storm. Đặt giới hạn task poller/activity concurrency hợp lý, scale chậm theo lag, và để capacity dự phòng cho deploy hoặc mất một vùng. Với Workflow Task backlog, kiểm tra deterministic code và tốc độ replay; một history rất dài có thể khiến mỗi lượt xử lý tốn CPU hơn.

### Đừng dùng một con số backlog để quyết định mọi thao tác

| Dấu hiệu | Giả thuyết cần đối chiếu |
| --- | --- |
| Activity schedule-to-start cao, ít poller | Thiếu worker/capacity hoặc sai queue |
| Activity start được nhưng timeout nhiều | Dependency, deadline hoặc code xử lý |
| Workflow Task lỗi lặp cùng history | Tương thích phiên bản/determinism hoặc lỗi code |
| Workflow chờ timer đúng hạn | Có thể là hoạt động bình thường |

Các dấu hiệu chỉ hướng điều tra. Tăng worker khi dependency đang quá tải có thể tạo thêm retry; tăng poller khi code nondeterministic không sửa được command lệch history. Dùng execution mẫu để nối số liệu với một diễn biến cụ thể.

## Namespace, quyền truy cập và dữ liệu

Namespace phân tách cấu hình và execution; dùng quy ước tên nhất quán theo môi trường/đội hoặc domain nghiệp vụ. Quản lý endpoint, TLS, credential và quyền Client/Worker qua secret manager; xoay credential theo quy trình có diễn tập. Mọi hoạt động hỗ trợ như xem history, terminate, reset hay signal execution cần log/audit và xác định ai được thực hiện.

Workflow history có thể chứa input và kết quả mà ứng dụng truyền vào. Xác định retention theo nhu cầu debug, chi phí, nghĩa vụ dữ liệu và khả năng tiếp tục execution. Nếu cần archival hoặc dữ liệu lớn/nhạy cảm, thử chính sách với phiên bản triển khai thật. Đừng dựa vào tên field là “metadata” để giả định nó vô hại; Search Attributes và log cũng cần phân loại.

## Deploy và nâng cấp không làm đứt execution

Workflow có thể tồn tại lâu hơn một lần phát hành. Gắn Worker build/version vào telemetry, chạy replay regression, rollout canary và giữ code cũ khi còn execution cần nó. Một deploy có thể thay routing, serialization hoặc cách xử lý Activity; chuẩn bị rollback cả Worker lẫn tương thích history. Nâng cấp Temporal Server và SDK cũng cần theo release notes, kiểm tra tương thích, backup trước thay đổi lưu trữ và kế hoạch phục hồi.

Runbook cần nói rõ cách xem trạng thái trước khi terminate/reset. Reset tạo một nhánh tiếp tục từ điểm history nhất định chứ không xóa hậu quả side effect đã xảy ra ở bên ngoài. Trước thao tác can thiệp, xác minh Activity đã thực hiện gì, dùng idempotency key nào, và đội nghiệp vụ muốn tiếp tục, bù trừ hay bắt đầu execution mới.

### Một thao tác reset cần biết gì?

Trước reset, xác định mốc history dự định tiếp tục, side effect đã xảy ra ngoài engine và khóa chống trùng của chúng. Tiếp tục từ một điểm cũ có thể làm một hành động được yêu cầu lại; provider đã giao hàng không quay về trạng thái chưa giao chỉ vì engine có run mới.

Quyền can thiệp cần tách khỏi quyền đọc chẩn đoán. Runbook nên có người chịu trách nhiệm, điều kiện trước/sau và cách xác nhận trạng thái nghiệp vụ, thay vì một lệnh dùng chung cho mọi sự cố.

## Alert và phản ứng sự cố

Alert theo triệu chứng ảnh hưởng dịch vụ: latency tăng, lỗi API, task backlog kéo dài, Worker poll biến mất, số Activity retry/timeout tăng, persistence chậm hoặc execution lỗi vượt ngưỡng. Dùng cửa sổ thời gian và ngưỡng theo SLO thay vì báo động mọi retry đơn lẻ. Gắn link dashboard, query visibility và thao tác chẩn đoán vào runbook.

Khi queue kẹt, xác định trước task đang đợi Worker hay Worker đang đợi downstream. Khi Workflow Task thất bại lặp, kiểm tra nondeterminism, version/registration và lịch sử thay vì tăng số Worker mù quáng. Khi Activity retry nhiều, bảo vệ dependency bằng concurrency limit, backoff và circuit policy ở lớp phù hợp; dừng retry vô hạn cho lỗi vĩnh viễn. Sau incident, bổ sung fixture history hoặc kiểm thử fault injection để bài học trở thành kiểm tra có thể chạy lại.

## Tự kiểm tra cách vận hành

**Cloud có loại bỏ nhu cầu theo dõi worker/downstream không?** Không. Những thành phần đó vẫn quyết định tiến trình thực sự chạy được hay không.

**Retention history đã đóng có phải cơ chế giảm history của workflow đang mở không?** Không. Với execution dài, cần ranh giới state/Continue-As-New phù hợp; không tự xóa dữ liệu đang cần để replay.

**Mọi retry đều phải báo động không?** Không. Chọn tín hiệu theo mức ảnh hưởng và SLO; nhưng retry dai dẳng hoặc lỗi vĩnh viễn cần có đường xử lý, không được bị che bởi cơ chế tự thử lại.

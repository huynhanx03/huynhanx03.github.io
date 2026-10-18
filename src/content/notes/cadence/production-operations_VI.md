---
title: "Vận hành Cadence trong production"
category: "Workflow Engine"
kind: "guide"
translationKey: "cadence/production-operations"
series: "Cadence"
seriesOrder: 7
description: "Từ topology và Task List đến scale Worker, đọc CLI, retention và các quyết định khi triển khai nhiều vùng."
sources:
  - title: "Cadence Deployment Topology"
    url: "https://cadenceworkflow.io/docs/concepts/topology"
  - title: "Cadence Task Lists"
    url: "https://cadenceworkflow.io/docs/concepts/task-lists"
  - title: "Cadence CLI"
    url: "https://cadenceworkflow.io/docs/cli"
  - title: "Cadence Cross-DC Replication"
    url: "https://cadenceworkflow.io/docs/operation-guide"
draft: false
updated: 2026-10-15
---

Queue tăng nhưng CPU worker còn thấp. Có nên tăng replica ngay không? Nếu worker đang chờ một database đã quá tải, replica mới có thể làm nhiều request cùng chờ hơn. Nếu worker poll sai Task List, thêm cùng cấu hình sai cũng không nhận được việc.

Vận hành Cadence bắt đầu bằng sơ đồ trách nhiệm: Service quản lý API/state/history/routing; persistence và visibility giữ các dữ liệu tương ứng; worker ứng dụng chạy logic và gọi dependency. Cấu hình và thành phần cụ thể phải đối chiếu topology phiên bản đang dùng. Tách các lớp này giúp tìm đúng nguyên nhân trước khi can thiệp.



## Worker cần được vận hành như một backend service

Worker poll Task List và tiêu thụ CPU, memory, connection đến database/provider. Theo dõi task backlog, thời gian từ schedule đến start, số attempt, thời lượng xử lý và lỗi. Nếu backlog tăng nhưng CPU thấp, bottleneck có thể ở downstream hoặc một worker thiếu registration; chỉ tăng replica có thể làm dependency quá tải hơn. Scale theo loại task và giới hạn concurrency, đồng thời giữ đủ capacity cho recovery khi một vùng hoặc nhóm worker gặp sự cố.

Task List là hợp đồng routing. Đặt tên theo workload có ý nghĩa, tránh hard-code khác nhau giữa client và worker, và kiểm tra rollout khi đổi tên vì task cũ có thể vẫn đang chờ. Tách Task List khi cần cô lập tài nguyên, quyền truy cập hoặc đặc tính SLA; thêm quá nhiều queue làm tăng độ phức tạp của deployment và quan sát.

### Phân loại trước khi scale

| Quan sát | Hướng điều tra trước |
| --- | --- |
| Chờ start lâu, thiếu poller phù hợp | Worker còn sống, Domain/Task List, registration và capacity |
| Activity chạy lâu/retry tăng | Dependency latency, quota, deadline và idempotency |
| Workflow Task thất bại lặp sau deploy | Tương thích code/history và log nondeterminism |
| Chỉ một execution chờ Signal | Điều kiện nghiệp vụ, message đã tới chưa, trạng thái handler |

Các dòng là giả thuyết chẩn đoán, không phải kết luận chỉ từ một metric. Đối chiếu history của mẫu execution với telemetry trước khi chọn thao tác.

## Dùng CLI để điều tra, không để thay cho observability

CLI có thể describe/list workflow, xem history, query handler, signal, cancel hoặc terminate execution. Khi một đơn hàng bị kẹt, dùng Workflow ID để xem event cuối cùng, task list và attempt của Activity. Đọc history theo chuỗi: Workflow Task được schedule/started chưa; Activity có được tạo không; Activity timeout hay trả lỗi; có timer nào đang chờ; có signal nào tới không?

CLI tác động trực tiếp lên execution khi signal, cancel, terminate hoặc batch command. Viết runbook với điều kiện trước/sau, quyền cần có và cách xác minh thay vì đưa lệnh terminate thành phản xạ đầu tiên. Cancel cho code cơ hội cleanup; terminate dừng không hợp tác. Dùng reason có ngữ cảnh nghiệp vụ và ghi audit theo quy định nội bộ.

## Storage, retention và replay capacity

Event History cần đủ lâu để điều tra và cho workflow tiếp tục; retention quá ngắn có thể làm mất khả năng kiểm tra execution đã đóng, còn giữ vô hạn làm tăng chi phí. Chọn retention dựa trên yêu cầu hỗ trợ, bảo mật, compliance và dung lượng persistence. Lưu ý retention của blob ngoài history phải tương thích với execution còn retry hoặc bị Continue-As-New. Backup/restore cần được diễn tập; một database snapshot chưa chứng minh ứng dụng có thể giải mã payload và tiếp tục replay.

History dài khiến replay tốn thời gian và có thể chạm giới hạn. Theo dõi lịch sử lớn, dùng Child Workflow để chia workload thực sự độc lập, và Continue-As-New cho execution tuần hoàn cần giữ cùng Workflow ID. Không cắt history chỉ để giảm chi phí mà chưa chứng minh state được chuyển đầy đủ.

### Retention không thay thế backup

Retention thường quản lý dữ liệu execution đã đóng theo cơ chế engine. Workflow đang mở vẫn cần history để tiếp tục; không đặt một lịch xóa storage tùy ý dựa trên tuổi execution. Blob ngoài history và khóa giải mã cũng phải còn theo vòng đời đã thiết kế.

Backup có giá trị khi khôi phục được cả đường đọc dữ liệu và ứng dụng. Một bản persistence phục hồi được nhưng worker thiếu key hoặc không còn code tương thích vẫn chưa chứng minh quy trình có thể tiếp tục. Diễn tập cần kiểm tra chuỗi phụ thuộc này trong môi trường được phép.

## High availability và nhiều data center

Multi-DC replication không chỉ là bật một cờ. Phải xác định Domain, nơi nhận quyền điều phối, độ trễ replication, hành vi khi partition, và quy trình failover/failback. Kiểm tra version compatibility và chính sách failover trong tài liệu Cadence cụ thể. Workflows có Activity side effect bên ngoài vẫn có thể va chạm khi hai phía cùng thử lại; idempotency ở hệ thống nghiệp vụ là lớp bảo vệ quan trọng.

Trước production rollout, làm game day: dừng Worker giữa Activity, làm dependency timeout, restart Service theo topology phù hợp, khôi phục persistence và thực hiện failover nếu có. Đo thời gian phát hiện, backlog recovery và tỷ lệ execution tiếp tục thành công. Đặt SLO cho thời gian bắt đầu Activity, tuổi workflow chờ lâu nhất và tỷ lệ task lỗi; dashboard nên dẫn được từ aggregate tới execution cụ thể.

Một runbook đủ dùng trả lời: ai sở hữu Service/persistence; ai sở hữu Worker; cách phân biệt queue backlog với code failure; lúc nào pause Schedule; cách replay test history; dữ liệu nào có thể bị lộ trong history; và khi nào escalation cần nhà cung cấp hoặc nhóm nền tảng. Nếu các câu trả lời nằm rải rác trong đầu một người, hệ thống chưa sẵn sàng vận hành bền vững.

## Tự kiểm tra phản ứng sự cố

**Terminate có tự thu hồi shipment đã tạo không?** Không. Trước can thiệp cần biết side effect và trạng thái nghiệp vụ thực tế; có thể cần compensation/đối soát riêng.

**Mọi worker poll đúng nhưng backlog tăng, downstream báo rate limit: tăng concurrency có phải hướng mặc định không?** Không. Cần điều chỉnh admission/concurrency/backoff theo giới hạn dependency và budget nghiệp vụ.

**Một lần failover thành công có bảo đảm mọi side effect chỉ chạy đúng một lần không?** Không. Cần idempotency và kiểm soát quyền sở hữu khi hệ thống ngoài được gọi lại.

---
title: "Payload, Visibility và quan sát Workflow"
category: "Workflow Engine"
kind: "guide"
translationKey: "cadence/data-and-observability"
translationPending: true
series: "Cadence"
seriesOrder: 6
description: "Quản lý dữ liệu đi vào Event History, tìm execution bằng Visibility và nối trace qua các Activity mà không lộ dữ liệu nhạy cảm."
sources:
  - title: "Cadence Workflow History and Data Converter"
    url: "https://cadenceworkflow.io/blog/2026/06/03/2026-06-03-workflow-history-data-converter/workflow-history-data-converter"
  - title: "Cadence Claim-Check Pattern"
    url: "https://cadenceworkflow.io/blog/2026/06/10/2026-06-10-claim-check-pattern/claim-check-pattern"
  - title: "Cadence History Encryption"
    url: "https://cadenceworkflow.io/blog/2026/06/17/2026-06-17-encrypt-cadence-history/encrypt-cadence-history"
  - title: "Cadence Advanced Visibility"
    url: "https://cadenceworkflow.io/docs/concepts/search-workflows"
draft: false
---

Event History vừa giúp khôi phục Workflow vừa là nơi dữ liệu được lưu để Worker replay. Workflow input, Activity input/output, Signal payload và kết quả khác có thể nằm trong history trong thời gian retention. Vì vậy, payload không chỉ là chi tiết truyền giữa hai hàm; nó là dữ liệu lưu trữ, bảo mật và vận hành. Hãy thiết kế trước khi đưa cả object lớn hoặc thông tin cá nhân vào lệnh Workflow.

## Chỉ lưu thứ cần để tiếp tục

Nếu Activity xử lý video, hồ sơ lớn hoặc báo cáo, đừng gửi nguyên file qua Workflow. Lưu blob ở object storage và đưa một reference bền vững vào history. Đây là claim-check pattern. Reference cần tồn tại lâu hơn execution có thể retry/continue; khóa phải xác định ổn định để replay không sinh vô số blob rác. Cần kiểm tra quyền truy cập, retention, xóa dữ liệu và tình huống blob đã hết hạn nhưng Workflow còn chạy.

Cadence ghi nhận giới hạn payload ở mức khoảng 2 MB trong các tài liệu và ví dụ hiện hành, nhưng phải xác nhận giới hạn của server, SDK và trường dữ liệu cụ thể mình sử dụng. Giảm payload bằng compression có thể giúp một số trường hợp, nhưng không thay thế việc đặt budget kích thước. Đặt metric cho số byte input/result và phát hiện payload tăng dần trước khi chạm ngưỡng.

## Data Converter, mã hóa và những nơi nằm ngoài nó

Data Converter chuyển đổi payload giữa SDK và history; có thể dùng nó cho serialization, compression hoặc mã hóa. Blog Cadence minh họa AES-GCM, nhưng đây không có nghĩa mọi metadata được mã hóa. Event type, tên Activity, Task List, timeout và Search Attributes có thể vẫn hiện trong Web UI hoặc storage. Log ứng dụng, metric label, Search Attributes và hệ thống nguồn cũng có thể giữ plaintext.

Định nghĩa threat model: ai có quyền đọc history, backup, log, blob store và key management? Key phải được cấp cho mọi Worker cần decode; xoay key cần hỗ trợ dữ liệu đã mã hóa bằng key cũ trong khi execution còn sống. Nếu Worker thiếu key hoặc decoder không tương thích, replay có thể thất bại liên tục. Hãy test restore history cũ với đúng cấu hình key và quy trình luân chuyển trước khi bật mã hóa diện rộng.

Không đưa credential, access token hoặc secret dùng một lần vào workflow input nếu chỉ Activity cần chúng. Lấy secret từ secret manager tại thời điểm thực thi, truyền tham chiếu có thời hạn phù hợp và tránh log payload đầy đủ. Nếu nghiệp vụ yêu cầu lưu PII, xác định retention và quy trình xóa/xử lý theo quyền của người dùng.

## Visibility tìm execution; History giải thích một execution

Advanced Visibility phục vụ danh sách và truy vấn nhiều execution bằng metadata như Workflow ID, type, trạng thái, thời gian và custom Search Attributes. Nó trả lời “đơn hàng nào đang chờ thanh toán quá 30 phút?”. Event History trả lời “execution này đã nhận signal nào, schedule Activity lúc nào và Activity thất bại ra sao?”. Dùng nhầm hai bề mặt sẽ khiến dashboard quét history từng execution hoặc cố nhét toàn bộ payload vào chỉ mục tìm kiếm.

Search Attributes là metadata có kiểu, do ứng dụng chọn. Đặt tên ổn định, tránh cardinality quá cao nếu backend visibility không phù hợp, không lưu secret, và xác nhận khả năng query/index trên deployment đang chạy. Query CLI/API thường bị giới hạn theo Domain và kích thước trang; khi danh sách lớn cần pagination hoặc API phù hợp.

## Trace xuyên qua quy trình

Một trace HTTP có thể bắt đầu khi người dùng submit đơn, nhưng workflow có thể tiếp tục nhiều giờ sau đó. Propagate trace/correlation ID qua Workflow input và Activity context theo thư viện tracing được SDK hỗ trợ; không lưu span đang sống qua timer. Tạo span mới cho từng Activity attempt và gắn Workflow ID, Run ID ở nơi an toàn để tìm tương quan. Tránh dùng ID không giới hạn làm label metric vì làm phình cardinality.

Tối thiểu nên có metric: execution mở theo trạng thái nghiệp vụ, tuổi của workflow lâu nhất, Activity retry/timeout, Workflow Task failure, schedule latency và kích thước history/payload. Log cần chứa correlation key nhưng không in dữ liệu bí mật. Cùng nhau, Visibility cho biết quy mô và vị trí, History giải thích một execution, còn trace/metric giúp thấy độ trễ và quan hệ giữa service.

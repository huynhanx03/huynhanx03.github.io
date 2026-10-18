---
title: "Payload, Visibility và quan sát Workflow"
category: "Workflow Engine"
kind: "guide"
translationKey: "temporal/data-and-observability"
series: "Temporal"
seriesOrder: 6
description: "Thiết kế payload trong Event History, bảo vệ dữ liệu nhạy cảm và tìm execution bằng Visibility cùng trace/metric."
sources:
  - title: "Data handling - Go SDK"
    url: "https://docs.temporal.io/develop/go/data-handling"
  - title: "Temporal Visibility"
    url: "https://docs.temporal.io/visibility"
  - title: "Temporal Service"
    url: "https://docs.temporal.io/temporal-service"
  - title: "Protect sensitive data in a Temporal application"
    url: "https://temporal.io/blog/how-to-protect-sensitive-data-in-a-temporal-application"
draft: false
updated: 2026-10-15
---

Một workflow xử lý hồ sơ lớn cần biết file nào đã kiểm tra, nhưng không cần giữ cả file trong từng message. Nhân viên hỗ trợ cần tìm workflow theo trạng thái; dashboard lại cần biết chậm ở queue hay ở provider. Nếu đưa tất cả dữ liệu vào history hoặc Search Attributes, ba nhu cầu này bị trộn lẫn.

Ta tách dữ liệu để tiếp tục tiến trình, metadata để tìm execution và telemetry để chẩn đoán. Input, kết quả Activity, Signal/Update được ghi theo cơ chế API có thể lưu trong history; thiết kế payload vì thế là quyết định lưu trữ, khả năng replay, bảo mật và retention.



## Giữ history đủ dùng, không biến nó thành kho file

Workflow cần dữ liệu để ra quyết định khi replay. Với file lớn, video, báo cáo hoặc object nhiều trường ít khi được đọc, lưu nội dung ở object storage rồi truyền một reference có quyền truy cập giới hạn. Reference phải bền qua retry và đủ lâu so với thời hạn Workflow; nếu hết hạn trước khi execution tiếp tục thì quy trình đã durable nhưng dữ liệu phụ thuộc lại mất. Cũng cần định nghĩa dọn object sau khi execution đóng, xử lý workflow bị hủy và xóa theo yêu cầu dữ liệu.

Tránh đưa access token, thông tin thẻ, bí mật cá nhân hoặc nội dung nhạy cảm vào arguments, error message, log và search attributes nếu không cần. Search attribute thường phục vụ lọc/hiển thị, nên chỉ chứa metadata đã được phê duyệt; nó không phải nơi cất payload bảo mật. Giảm dữ liệu cũng giúp history nhỏ hơn, replay nhanh hơn và nhân viên hỗ trợ dễ tìm sự cố.

## Data Converter và Payload Codec

Data Converter biến kiểu dữ liệu ứng dụng thành payload lưu/truyền và đọc ngược lại. Codec có thể mã hóa hoặc nén payload để bảo vệ dữ liệu hay tiết kiệm băng thông. Client/Worker và công cụ đọc payload cần đường giải mã tương thích. UI có thể cần cơ chế codec server hoặc tích hợp được hỗ trợ, không phải tự động nạp cùng thư viện ứng dụng. Nếu thiếu key/decoder, thành phần đọc có thể không giải mã được payload tương ứng.

Mã hóa payload không tự giải quyết quản lý key. Cần xác định nơi lưu key, vòng đời và rotation, quyền của Worker, backup, môi trường debug và cách truy cập có kiểm toán. Sau khi đổi codec, giữ khả năng đọc payload cũ trong suốt thời gian history còn tồn tại. Thử cả workflow mới lẫn fixture cũ; rollout reader trước writer nếu giao thức cần tương thích ngược. Không ghi plaintext vào log ở bước fallback khi decrypt lỗi.

Nén và mã hóa làm thay đổi kích thước, latency và mức sử dụng CPU. Đo bằng payload đại diện thay vì chỉ benchmark object rỗng. Đặt giới hạn kích thước rõ ràng ở API của ứng dụng, phân biệt lỗi payload quá lớn với lỗi mạng, và không giả định mỗi môi trường Temporal có cùng quota cấu hình.

### Đổi người ghi sau khi người đọc đã hiểu

Nếu thêm codec mới, worker xử lý execution cũ cần đọc được payload cũ, còn worker có thể nhận dữ liệu mới phải hiểu định dạng mới trước khi writer phát ra nó. Bởi vậy “deploy reader trước writer” là một hướng triển khai có điều kiện, không chỉ thay key hiện tại trong cấu hình.

Một history có thể chứa payload từ nhiều thời điểm. Gắn version/key reference theo thiết kế codec và giữ khả năng đọc dữ liệu trong phạm vi còn được hỗ trợ. Không sửa bằng cách log plaintext khi decode lỗi; cách đó biến lỗi tương thích thành sự cố dữ liệu.

## Visibility giúp tìm execution, không thay thế source of truth

Visibility cung cấp danh sách và truy vấn execution theo Workflow ID, loại Workflow, trạng thái, thời gian và Search Attributes. Hãy chọn thuộc tính phục vụ câu hỏi vận hành: “đơn của khách X đang ở đâu?”, “có bao nhiêu quy trình chờ phê duyệt?” hoặc “loại workflow nào lỗi tăng?”. Chỉ số nhỏ, có kiểu ổn định, ít giá trị nhạy cảm và có owner rõ sẽ giữ query dễ hiểu.

Visibility phục vụ tìm kiếm và thống kê chứ không phải dữ liệu nghiệp vụ chuẩn. Đừng dùng kết quả tìm kiếm có thể cập nhật trễ để quyết định thu tiền hoặc cấp quyền. Quyết định nghiệp vụ nên nằm trong Workflow state hoặc hệ thống dữ liệu có thẩm quyền. Trước khi dựa vào Advanced Visibility, xác nhận backend, tính năng, index và hạn chế query của cấu hình đang chạy.

## Đo lường sức khỏe từ nhiều lớp

Dashboard nên phân biệt Service, Worker và dependency ngoài. Ở Worker, theo dõi số poller, task queue backlog, schedule-to-start latency, thời lượng Workflow Task/Activity, retries, timeout và số execution mở. Ở Service, theo dõi API latency/error, persistence latency và tài nguyên lịch sử. Ở dependency, đối chiếu tỷ lệ lỗi, giới hạn request và thời gian phản hồi. Một backlog tăng cùng Activity latency cao thường có ý nghĩa khác backlog tăng trong khi Worker không poll.

Trace context có thể được truyền qua Workflow và Activity để nối yêu cầu từ API tới backend. Chọn propagation có kiểm soát; không đưa toàn bộ HTTP header, cookie hoặc bearer token vào history. Dùng Workflow ID làm khóa tra cứu hỗ trợ, nhưng tránh dùng định danh có PII nếu nó lộ trên dashboard/log. Log nên có execution/run ID cần thiết và tên bước; dữ liệu payload nên được ẩn hoặc bỏ.

### Phân biệt ba thời gian

Giả sử Activity đợi 40 giây mới start, chạy 2 giây rồi provider trả lỗi. “Tổng 42 giây” chưa chỉ ra bottleneck: schedule-to-start hướng tới queue/worker; thời gian execution hướng tới code/dependency; backoff giữa attempt là một phần khác của vòng đời.

Dashboard nên dẫn được từ số tổng hợp đến queue, type và execution mẫu. Workflow ID/Run ID hữu ích trong log/trace để tra cứu, nhưng ID không giới hạn làm metric label có thể gây cardinality rất lớn. Chọn bề mặt lưu theo câu hỏi cần trả lời.

## Một quy trình điều tra hữu ích

Khi một execution chậm, tìm nó bằng Workflow ID/Search Attributes, kiểm tra trạng thái và history, xác định đang chờ timer, Signal, Activity hay Worker Task. So sánh schedule-to-start với execution latency để phân biệt queue với code chậm. Xem attempt và heartbeat để nhận diện Activity đang retry hoặc đứng yên. Sau đó đối chiếu log/trace của Worker và downstream. Ghi lại nguyên nhân theo loại sự cố để dashboard dần phản ánh câu hỏi thực tế thay vì chỉ chứa biểu đồ đẹp.

## Tự kiểm tra dữ liệu quan sát

**Visibility báo PAID có đủ để ra lệnh thu tiền lần nữa không?** Không. Chỉ mục có thể trễ và không phải nguồn quyết định nghiệp vụ; cần state/hợp đồng có thẩm quyền.

**History chỉ chứa object key có bảo đảm replay và mọi Activity về sau đều thành công không?** Không. Code có thể replay được nhưng object, quyền truy cập hoặc key giải mã đã hết vòng đời vẫn làm bước sau lỗi.

**Trace có cần giữ một span đang mở suốt nhiều ngày chờ không?** Không mặc định. Dùng correlation/propagation và các span phù hợp với attempt/giai đoạn; không giữ đối tượng span như state durable.

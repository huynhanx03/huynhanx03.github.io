---
title: "Payload, Visibility và quan sát Workflow"
category: "Workflow Engine"
kind: "guide"
translationKey: "temporal/data-and-observability"
translationPending: true
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
---

Temporal giữ Event History để replay và khôi phục Workflow. Input, kết quả Activity, Signal/Update và thông tin cần thiết khác có thể được lưu trong history. Thiết kế payload vì thế liên quan đồng thời đến durability, kích thước lưu trữ, quyền truy cập, retention và khả năng debug. Hãy quyết định dữ liệu nào cần để tiếp tục quy trình, dữ liệu nào chỉ cần để tra cứu, và dữ liệu nào tuyệt đối không nên ghi nguyên dạng vào history.

## Giữ history đủ dùng, không biến nó thành kho file

Workflow cần dữ liệu để ra quyết định khi replay. Với file lớn, video, báo cáo hoặc object nhiều trường ít khi được đọc, lưu nội dung ở object storage rồi truyền một reference có quyền truy cập giới hạn. Reference phải bền qua retry và đủ lâu so với thời hạn Workflow; nếu hết hạn trước khi execution tiếp tục thì quy trình đã durable nhưng dữ liệu phụ thuộc lại mất. Cũng cần định nghĩa dọn object sau khi execution đóng, xử lý workflow bị hủy và xóa theo yêu cầu dữ liệu.

Tránh đưa access token, thông tin thẻ, bí mật cá nhân hoặc nội dung nhạy cảm vào arguments, error message, log và search attributes nếu không cần. Search attribute thường phục vụ lọc/hiển thị, nên chỉ chứa metadata đã được phê duyệt; nó không phải nơi cất payload bảo mật. Giảm dữ liệu cũng giúp history nhỏ hơn, replay nhanh hơn và nhân viên hỗ trợ dễ tìm sự cố.

## Data Converter và Payload Codec

Data Converter biến kiểu dữ liệu ứng dụng thành payload lưu/truyền và đọc ngược lại. Codec có thể mã hóa hoặc nén payload để bảo vệ dữ liệu hay tiết kiệm băng thông. Đây là hợp đồng xuyên suốt giữa Client, Worker, Web UI và công cụ đọc history: nếu một thành phần không có codec hoặc key phù hợp, nó có thể không giải mã được input, kết quả hay lỗi.

Mã hóa payload không tự giải quyết quản lý key. Cần xác định nơi lưu key, vòng đời và rotation, quyền của Worker, backup, môi trường debug và cách truy cập có kiểm toán. Sau khi đổi codec, giữ khả năng đọc payload cũ trong suốt thời gian history còn tồn tại. Thử cả workflow mới lẫn fixture cũ; rollout reader trước writer nếu giao thức cần tương thích ngược. Không ghi plaintext vào log ở bước fallback khi decrypt lỗi.

Nén và mã hóa làm thay đổi kích thước, latency và mức sử dụng CPU. Đo bằng payload đại diện thay vì chỉ benchmark object rỗng. Đặt giới hạn kích thước rõ ràng ở API của ứng dụng, phân biệt lỗi payload quá lớn với lỗi mạng, và không giả định mỗi môi trường Temporal có cùng quota cấu hình.

## Visibility giúp tìm execution, không thay thế source of truth

Visibility cung cấp danh sách và truy vấn execution theo Workflow ID, loại Workflow, trạng thái, thời gian và Search Attributes. Hãy chọn thuộc tính phục vụ câu hỏi vận hành: “đơn của khách X đang ở đâu?”, “có bao nhiêu quy trình chờ phê duyệt?” hoặc “loại workflow nào lỗi tăng?”. Chỉ số nhỏ, có kiểu ổn định, ít giá trị nhạy cảm và có owner rõ sẽ giữ query dễ hiểu.

Visibility phục vụ tìm kiếm và thống kê chứ không phải dữ liệu nghiệp vụ chuẩn. Đừng dùng kết quả tìm kiếm có thể cập nhật trễ để quyết định thu tiền hoặc cấp quyền. Quyết định nghiệp vụ nên nằm trong Workflow state hoặc hệ thống dữ liệu có thẩm quyền. Trước khi dựa vào Advanced Visibility, xác nhận backend, tính năng, index và hạn chế query của cấu hình đang chạy.

## Đo lường sức khỏe từ nhiều lớp

Dashboard nên phân biệt Service, Worker và dependency ngoài. Ở Worker, theo dõi số poller, task queue backlog, schedule-to-start latency, thời lượng Workflow Task/Activity, retries, timeout và số execution mở. Ở Service, theo dõi API latency/error, persistence latency và tài nguyên lịch sử. Ở dependency, đối chiếu tỷ lệ lỗi, giới hạn request và thời gian phản hồi. Một backlog tăng cùng Activity latency cao thường có ý nghĩa khác backlog tăng trong khi Worker không poll.

Trace context có thể được truyền qua Workflow và Activity để nối yêu cầu từ API tới backend. Chọn propagation có kiểm soát; không đưa toàn bộ HTTP header, cookie hoặc bearer token vào history. Dùng Workflow ID làm khóa tra cứu hỗ trợ, nhưng tránh dùng định danh có PII nếu nó lộ trên dashboard/log. Log nên có execution/run ID cần thiết và tên bước; dữ liệu payload nên được ẩn hoặc bỏ.

## Một quy trình điều tra hữu ích

Khi một execution chậm, tìm nó bằng Workflow ID/Search Attributes, kiểm tra trạng thái và history, xác định đang chờ timer, Signal, Activity hay Worker Task. So sánh schedule-to-start với execution latency để phân biệt queue với code chậm. Xem attempt và heartbeat để nhận diện Activity đang retry hoặc đứng yên. Sau đó đối chiếu log/trace của Worker và downstream. Ghi lại nguyên nhân theo loại sự cố để dashboard dần phản ánh câu hỏi thực tế thay vì chỉ chứa biểu đồ đẹp.

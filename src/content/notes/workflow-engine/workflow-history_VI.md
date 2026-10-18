---
title: "Workflow History là dữ liệu bền vững"
category: "Workflow Engine"
kind: "note"
translationKey: "workflow-engine/workflow-history"
series: "Workflow Engine"
seriesOrder: 2
description: "History hỗ trợ replay nhưng cũng lưu payload và tạo yêu cầu về kích thước, bảo mật, retention."
sources:
  - title: "Cadence workflow history article"
    url: "https://cadenceworkflow.io/blog/2026/06/03/2026-06-03-workflow-history-data-converter/workflow-history-data-converter"
draft: false
updated: 2026-10-15
---

Một Activity xử lý video trả về kết quả. Khi worker chết rồi khởi động lại, Workflow vẫn cần biết kết quả ấy để đi tiếp. Nếu kết quả là file video 200 MB, gửi cả file qua luồng điều phối sẽ biến history thành nơi giữ một lượng dữ liệu mà phần điều phối thực ra không cần đọc.

Event History là dữ liệu đầu vào để dựng lại state, bên cạnh vai trò giải thích execution đã làm gì. Vì vậy, thiết kế payload quyết định đồng thời chi phí phục hồi, vòng đời dữ liệu và những nơi thông tin có thể xuất hiện.

## Kết quả hàm có thể trở thành dữ liệu lưu lâu dài

Workflow input, kết quả Activity, Signal và những payload được ghi theo cơ chế SDK có thể được giữ trong history. Khi replay, kết quả đã ghi giúp code đi lại đúng nhánh mà không gọi lại Activity đã hoàn tất. Đây không phải bản sao RAM của worker và cũng không có nghĩa mọi biến tạm đều được serialize độc lập.

Hãy nhìn một luồng nhỏ:

1. Activity lưu video đã xử lý.
2. Activity trả thông tin kết quả cho Workflow.
3. Service ghi kết quả cần thiết vào history.
4. Worker khác replay sau sự cố và dùng lại thông tin đó để đi tiếp.

Tại bước 2, ta quyết định đưa toàn bộ byte hay một tham chiếu vào lịch sử. Quyết định ấy còn tác động tới những lần đọc history về sau, không chỉ lần gọi hiện tại.

## Chỉ mang theo thứ đủ để tiếp tục

Claim-check pattern lưu file trong object storage, còn history giữ object key cùng metadata cần thiết, chẳng hạn checksum và schema version. Workflow điều phối theo reference; Activity cần nội dung mới tải file. Như vậy phần replay không phải mang file lớn chỉ để biết file nào đã được tạo.

Nhưng reference tạo dependency bên ngoài. Object phải còn tồn tại và truy cập được khi Activity retry hoặc quy trình tiếp tục. URL ký sẵn có thể hết hạn trước workflow; thường cần định danh bền vững và Activity lấy quyền truy cập phù hợp tại lúc dùng. Nếu muốn dữ liệu không đổi giữa các lần dùng, reference cần xác định đúng phiên bản hoặc object bất biến theo hợp đồng lưu trữ.

| Tình huống | Điều cần thiết kế |
| --- | --- |
| Workflow chờ nhiều ngày | Retention của object đủ cho thời gian sử dụng |
| Activity retry đọc lại | Đọc cùng dữ liệu hay phiên bản nào được xác định rõ |
| Người dùng yêu cầu xóa | Quan hệ giữa object, history, bản sao và khả năng tiếp tục execution |
| Cleanup object thừa | Không xóa nhầm object mà execution còn cần |

Claim check chuyển trách nhiệm lưu trữ ra ngoài, không làm trách nhiệm ấy biến mất.

## Mã hóa payload chưa bao phủ mọi nơi có dữ liệu

Data converter có thể serialize, nén hoặc mã hóa những payload đi qua đường chuyển đổi của SDK. Nhưng tên Activity, loại event, Search Attributes, log, metric label hay dữ liệu trong hệ thống nguồn có thể nằm ngoài phạm vi đó. Một dòng log in input đầy đủ vẫn có thể làm lộ dữ liệu dù payload history đã mã hóa.

Cần kiểm kê bề mặt đọc và ghi: history/UI, backup, blob store, log và nơi giữ khóa. Worker phục hồi cũng cần decode được dữ liệu cũ; bỏ khóa cũ quá sớm có thể làm execution không replay được. Giữ cơ chế đọc phiên bản dữ liệu cũ phù hợp với vòng đời execution.

## Giới hạn là theo trường dữ liệu và cấu hình

Blog Cadence dẫn trường hợp giới hạn payload khoảng 2 MB và giải pháp claim check. Không áp con số ấy sang mọi event, server hoặc Temporal. Kiểm tra giới hạn đúng phiên bản, SDK và thao tác; nén không thay thế budget kích thước. [Bài Cadence về history và converter](https://cadenceworkflow.io/blog/2026/06/03/2026-06-03-workflow-history-data-converter/workflow-history-data-converter) là nguồn đối chiếu, không phải cam kết cho môi trường khác.

History lớn còn tăng chi phí đọc và replay. Retention cho execution đã đóng cần cân bằng nhu cầu điều tra, dữ liệu nhạy cảm và chi phí; đây không phải cách tùy ý xóa phần history mà execution đang mở còn cần.

## Tự kiểm tra thiết kế payload

**Chỉ trả URL tải file có hạn 15 phút cho workflow chờ hai ngày có đủ không?** Không. Khi tiếp tục, URL có thể hết hạn. Cần reference bền vững và đường cấp quyền/đọc lại thích hợp.

**Mã hóa converter có cho phép ghi access token vào metric label không?** Không. Metric không mặc định đi qua converter; token cũng không phải metadata phù hợp cho chỉ mục/nhãn quan sát.

**Giữ đủ history có bảo đảm tiếp tục được nếu object ngoài đã xóa không?** Chưa. History chỉ còn reference, còn Activity tiếp theo vẫn cần đối tượng thật. Khả năng phục hồi phụ thuộc cả dữ liệu ngoài engine.

Mục tiêu là giữ đúng lượng dữ liệu cần để phục hồi, trong đúng thời gian và phạm vi truy cập. Đọc tiếp [payload và observability Cadence](/vi/notes/cadence/data-and-observability/) để tách Visibility, History, log và trace.

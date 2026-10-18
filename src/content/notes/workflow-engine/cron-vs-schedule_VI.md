---
title: "Cron vs Schedule"
category: "Workflow Engine"
kind: "note"
translationKey: "workflow-engine/cron-vs-schedule"
series: "Workflow Engine"
seriesOrder: 1
description: "Schedules bổ sung chính sách overlap, pause và backfill cho quy trình định kỳ; chọn policy theo ý nghĩa nghiệp vụ."
sources:
  - title: "Cadence Schedules release blog"
    url: "https://cadenceworkflow.io/blog/2026/06/23/cadence-schedules"
draft: false
updated: 2026-10-15
---

Một tác vụ ETL được hẹn chạy mỗi giờ, nhưng lần 09:00 mất 90 phút. Đến 10:00, có nên bắt đầu thêm một lần nữa? Nếu có, hai lần có được ghi cùng bảng kết quả không? Nếu không, dữ liệu của giờ 10:00 sẽ bị bỏ hay phải xử lý sau?

Biểu thức cron xác định các thời điểm dự kiến. Chính sách thực thi mới quyết định xử lý chạy chồng, trễ lịch và chạy bù. Nhiều scheduler có thêm cơ chế riêng, nên cần phân biệt biểu thức cron với toàn bộ sản phẩm lập lịch. Bài này dùng Cadence Schedules để làm rõ các quyết định; không áp tên policy của nó sang Temporal.

## Theo một lịch chạy bị chồng

Giả sử mỗi lần xử lý một cửa sổ dữ liệu riêng, như [09:00, 10:00). Lần 09:00 bắt đầu đúng giờ nhưng chưa xong khi đến 10:00. Có những lựa chọn khác nhau:

| Ý nghĩa nghiệp vụ | Hướng xử lý | Rủi ro phải tính |
| --- | --- | --- |
| Chỉ cần kết quả gần nhất | Bỏ lượt mới hoặc thay thế lượt cũ theo yêu cầu | Bỏ nhầm dữ liệu vẫn cần xử lý |
| Mọi cửa sổ đều phải xử lý | Xếp chờ và giới hạn backlog | Tốc độ xử lý chậm hơn tốc độ phát lịch lâu dài |
| Mỗi cửa sổ độc lập | Cho chạy đồng thời có giới hạn | Nhiều lượt cùng tạo tải lớn lên dependency |

Thời gian dự kiến của lượt chạy và thời gian worker thực sự bắt đầu là hai giá trị khác nhau. ETL nên xác định cửa sổ dữ liệu từ thông tin lịch/hợp đồng đầu vào, không mặc định “giờ hiện tại của worker” luôn là cửa sổ cần xử lý. Đó là điều giúp một lần chạy trễ vẫn xử lý đúng dữ liệu.

## Schedule trở thành một đối tượng có thể quản lý

Cadence Schedules cho phép quản lý lịch phía server, quan sát và thay đổi nó. Tài liệu đối chiếu ngày 2026-10-15 có các policy `SkipNew`, `Buffer`, `Concurrent`, `CancelPrevious` và `TerminatePrevious`. Buffer và concurrency có giới hạn cần cấu hình; hàng chờ không phải một nơi chứa vô hạn mọi lượt bỏ lỡ. API còn hỗ trợ pause, unpause và backfill. Xem [Schedules](https://cadenceworkflow.io/docs/concepts/schedules) và kiểm tra server/SDK đang dùng trước khi áp dụng.

Trong ví dụ trên, chọn Buffer chỉ hợp lý nếu khả năng xử lý đủ để cuối cùng bắt kịp. Nếu mỗi giờ tạo 90 phút công việc nhưng chỉ chạy một lượt một lúc, backlog vẫn tăng đều. Một policy hợp lệ về cú pháp chưa giải quyết thiếu năng lực xử lý.

## Pause, chạy bù và chạy trùng

Pause lịch thường có nghĩa ngừng tạo lượt mới, không mặc định hủy các execution đã chạy. Sau khi mở lại, cần quyết định bỏ các lượt lỡ, chạy một phần hay backfill một khoảng thời gian. Chạy bù nhiều giờ có thể tạo tải đột biến, nên phải xét overlap và giới hạn tài nguyên cùng nhau.

Mỗi lượt ETL nên có khóa nghiệp vụ xác định cửa sổ/phiên bản xử lý. Nếu chạy lại cửa sổ 09:00, việc ghi kết quả cần tránh nhân đôi số liệu hoặc phải có chính sách thay thế rõ ràng. Schedule không làm Activity tự trở thành idempotent.

Cancellation là yêu cầu hợp tác; code có thể còn đang cleanup và I/O bên ngoài có thể đã xảy ra. Termination đóng execution cưỡng bức, không đảo ngược side effect đã phát. Dừng execution ở engine cũng không chứng minh process hay provider ngoài đã ngừng mọi thao tác. Chọn policy phải dựa vào tác dụng phụ của tác vụ, không chỉ trạng thái trong UI.

## Trước khi đưa một lịch vào sử dụng

Ghi rõ: khi chồng lượt thì làm gì; backlog lớn tối đa bao nhiêu; downtime cần chạy bù đến đâu; ai có quyền pause và lưu lý do; cách tìm lần tiếp theo, lần gần nhất và lượt lỗi. Để kiểm tra policy trong môi trường thử nghiệm, dùng một tác vụ dài hơn chu kỳ rồi quan sát lượt tiếp theo bị bỏ, được xếp chờ hay chạy chồng. Đối chiếu cả cửa sổ dữ liệu và kết quả ghi, vì trạng thái execution đúng chưa chứng minh dữ liệu ETL đúng.

**Tự kiểm tra.** Nếu mỗi cửa sổ đều quan trọng, SkipNew có bảo đảm đầy đủ dữ liệu không? Không. Nó có thể bỏ lượt; cần cơ chế chờ/chạy bù hoặc cách gom cửa sổ có chủ đích.

Nếu tác vụ chỉ ghi báo cáo mới nhất, có nên mặc định TerminatePrevious? Chưa đủ dữ kiện: phải biết tác vụ cũ có thể để lại file hay transaction dang dở nào và hệ thống ngoài còn tiếp tục ghi không.

Bài [Workflow History](/vi/notes/workflow-engine/workflow-history/) giải thích vì sao các lần chạy và payload còn là dữ liệu cần quản lý. Phần giới thiệu lịch được công bố trong [blog Cadence Schedules](https://cadenceworkflow.io/blog/2026/06/23/cadence-schedules); không suy phiên bản hỗ trợ chính xác nếu chưa đối chiếu release của môi trường.

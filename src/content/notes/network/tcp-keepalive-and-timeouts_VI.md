---
title: "TCP keepalive, application heartbeat và timeout"
category: "Network"
tags: ["network", "tcp", "keepalive", "timeout"]
description: "Phân biệt TCP keepalive với deadline ứng dụng, idle timeout của NAT và cơ chế phát hiện peer chết."
updated: 2026-10-16
translationKey: "network/tcp-keepalive-and-timeouts"
---

TCP connection có thể im lặng nhưng vẫn hợp lệ; cũng có thể peer đã mất mà local host chưa biết. Keepalive gửi probe sau thời gian idle để kiểm tra một số lỗi kết nối. Nó thường không đủ nhanh cho deadline của request và không thay heartbeat nghiệp vụ.

## TCP keepalive

Keepalive thường tắt mặc định ở một số API/OS hoặc có timer dài; ứng dụng bật theo socket và cấu hình hệ thống. Probe không được ACK có thể dẫn tới kết luận connection chết sau nhiều lần thử. Thời gian chính xác tùy kernel/configuration.

Keepalive kiểm tra peer/path ở tầng TCP; một process ứng dụng có thể treo nhưng kernel vẫn ACK. Vì vậy kết nối sống không đảm bảo service khỏe.

### Keepalive hoạt động thế nào?

Khi connection không có hoạt động trong khoảng `keepalive time`, đầu TCP đã bật tính năng gửi probe. Nếu không nhận phản hồi, nó gửi lại theo `keepalive interval` cho tới giới hạn `keepalive probes`; sau đó TCP báo lỗi và thường đóng connection. Phản hồi bình thường chỉ chứng minh TCP phía kia còn trả lời qua đường đi lúc đó. Nếu peer đã reboot và quên connection cũ, nó có thể trả RST. Nếu mạng đang đứt tạm thời, TCP thường không phân biệt được sự cố đó với peer đã chết.

Probe thường dùng sequence number nằm ngay trước byte kế tiếp mà peer mong đợi, nên không mang byte ứng dụng mới hay làm thay đổi stream; peer ACK lại để chứng minh TCP còn nhận packet. Một probe đơn lẻ bị mất không đủ để kết luận peer đã chết. Dạng packet và khả năng tương thích của các stack cũ có thể khác nhau.

Keepalive là tùy chọn TCP, không phải polling bắt buộc trong giao thức. Chỉ endpoint muốn chủ động gửi probe cần bật keepalive; peer vẫn có thể ACK probe bằng xử lý TCP bình thường dù không bật timer keepalive riêng ([RFC 1122](https://www.rfc-editor.org/rfc/rfc1122.html#section-4.2.3.6)). Ở mỗi đầu, nó được bật riêng; thông số có thể cấu hình theo socket hoặc toàn hệ thống tùy OS. Thời gian mặc định dài trong sách (thường nhắc tới khoảng hai giờ) và giá trị sysctl/registry là ví dụ lịch sử của phiên bản lúc viết sách, không nên dùng làm mặc định hiện hành. Cần kiểm tra tài liệu của OS/runtime đang chạy.

### Chọn đúng loại kiểm tra

- TCP keepalive hữu ích để dọn connection idle bị half-open hoặc duy trì một số trạng thái NAT, nhưng có thể kết thúc nhầm connection đang tốt khi mạng chập chờn.
- Application heartbeat có thể yêu cầu phản hồi ở tầng dịch vụ và mang thông tin xác nhận cụ thể hơn. Tuy vậy, heartbeat TCP-level như SSH `TCPKeepAlive` khác heartbeat được gửi bên trong giao thức ứng dụng; mã hóa ứng dụng có thể bảo vệ heartbeat khỏi giả mạo trên đường truyền tốt hơn TCP probe thuần.
- Deadline của request giới hạn thời gian một thao tác; nó không tự kiểm tra connection idle. Timeout NAT, load balancer và firewall cũng độc lập, và middlebox có thể hết hạn state trước khi keepalive dài gửi probe đầu tiên.

Đặt interval cần xét cả thời hạn idle của middlebox, độ trễ phát hiện mong muốn, tải probe và khả năng có lỗi mạng tạm thời. Với RPC, heartbeat không thay deadline; retry sau timeout vẫn cần idempotency vì server có thể đã xử lý request nhưng phản hồi bị mất.

### Giới hạn và rủi ro

Probe/ACK TCP không được bảo vệ bằng mã hóa TCP; kẻ quan sát có thể suy ra nhịp timer, còn probe giả mạo có thể kéo dài thời gian giữ tài nguyên trong một số tình huống. Keepalive timer cũng khác retransmission timer: nó phục vụ kiểm tra idle, không thay cơ chế truyền lại dữ liệu chưa được ACK. Vì vậy đừng dùng keepalive để đo sức khỏe ứng dụng, đảm bảo request đã xử lý, hay làm cơ chế duy nhất cho tính sẵn sàng.

## Heartbeat ứng dụng

Heartbeat có thể yêu cầu service xác nhận trạng thái ở tầng ứng dụng, phát hiện worker không xử lý. Nhưng heartbeat quá dày làm tải tăng; timeout quá ngắn gây false positive khi GC pause, scheduler stall hoặc network jitter.

## Deadline và idle timeout middlebox

Deadline giới hạn thời gian caller chờ một thao tác. NAT/load balancer/firewall có thể xóa connection idle trước khi TCP keepalive gửi probe. Thiết kế cần phối hợp interval keepalive, idle timeout middlebox và application deadline.

Retry sau timeout cần idempotency/operation ID vì peer có thể đã xử lý nhưng response bị mất. Đóng connection không rollback công việc phía server.

## Tóm tắt

- TCP keepalive kiểm tra connection idle, thường không phù hợp phát hiện nhanh.
- TCP ACK không chứng minh process ứng dụng đang khỏe.
- Heartbeat ứng dụng kiểm tra semantics cao hơn nhưng cần chọn timeout hợp lý.
- Middlebox có idle timeout riêng; connection có thể bị dọn dù endpoint còn sống.
- Timeout/retry cần idempotency vì trạng thái remote có thể không rõ.

## Tự kiểm tra

**Keepalive thành công chứng minh server xử lý request?** Không; kernel có thể trả ACK thay ứng dụng.

**Timeout nghĩa server chắc chắn không thực hiện thao tác?** Không; response có thể mất sau khi thao tác hoàn tất.

**Đặt heartbeat 1 ms giúp phát hiện lỗi nhanh và tốt hơn?** Không; false positive và overhead có thể tăng.

## Đọc tiếp

Khi server lắng nghe port, backlog và bind address cũng quyết định kết nối vào được nhận thế nào.

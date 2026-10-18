---
title: "TCP handshake, đóng kết nối và TIME_WAIT"
category: "Network"
tags: ["network", "tcp", "handshake", "time-wait"]
description: "Theo SYN/SYN-ACK/ACK, FIN/RST và các trạng thái TCP khi mở, đóng hoặc lỗi kết nối."
updated: 2026-10-16
translationKey: "network/tcp-connection-state-machine"
---

TCP connection không phải dây vật lý cố định; đó là state ở hai endpoint được nhận dạng bởi địa chỉ/port nguồn và đích cùng protocol. Handshake xác lập sequence space và một số option; đóng kết nối là quá trình trao đổi state riêng.

## Three-way handshake

1. Client gửi SYN với Initial Sequence Number (ISN) của nó.
2. Server trả SYN-ACK, xác nhận ISN client và đưa ISN server.
3. Client ACK lại; hai bên có thể gửi dữ liệu theo state đã thiết lập.

Bit SYN tiêu thụ một sequence number ngoài mọi byte ứng dụng nếu có; trong handshake không mang data đang xét, SYN và SYN-ACK mỗi gói chỉ tiêu thụ một vị trí ([RFC 9293](https://www.rfc-editor.org/rfc/rfc9293.html#section-3.4)). Mỗi bên vì vậy xác nhận ISN của peer bằng ISN+1. Bắt tay trao đổi khả năng/options và chứng minh hai chiều có thể nhận thông điệp khởi tạo; nó **không xác thực danh tính** máy chủ. TLS hoặc giao thức ứng dụng mới thiết lập danh tính và bảo vệ dữ liệu. Nếu SYN/SYN-ACK mất, TCP thử lại theo timer với khoảng chờ tăng dần; thời gian và số lần retry phụ thuộc stack/chính sách, nên các con số trong packet trace sách không phải SLA chung.

SYN queue/backlog chịu ảnh hưởng bởi tải và cấu hình server. SYN cookie là một kỹ thuật phòng một số dạng queue exhaustion, không thay firewall hay giới hạn kết nối toàn diện.

## Đóng hai chiều

TCP là full duplex; mỗi hướng byte stream có thể kết thúc riêng. FIN nói bên gửi không còn dữ liệu theo hướng đó; peer có thể ACK rồi tiếp tục gửi theo hướng ngược. Đây là half-close. RST hủy kết nối đột ngột hoặc báo không có endpoint/listener phù hợp.

Gọi `close()` ở ứng dụng không nhất thiết khiến peer lập tức thấy EOF nếu còn buffer hoặc dữ liệu chưa gửi. Semantics phụ thuộc socket option, shutdown và lỗi.

Một lần đóng graceful thường có bốn bước: FIN, ACK, FIN chiều ngược, ACK cuối. FIN của một phía chỉ đóng chiều gửi đó; peer vẫn được gửi response trước khi đóng chiều còn lại. Hai bên có thể cùng active open hoặc cùng close; state machine hỗ trợ các trường hợp hiếm này. RST là abort: dữ liệu đang xếp hàng có thể bị bỏ và peer nhận lỗi thay vì EOF bình thường. Không nên gộp RST với FIN khi đọc capture.

## TIME_WAIT

Bên chủ động đóng thường có thể vào TIME_WAIT để đảm bảo segment cũ không lẫn vào kết nối mới cùng tuple và để retransmit ACK cuối nếu cần. TIME_WAIT giữ state tạm thời; số lượng cao có thể phản ánh nhiều kết nối ngắn, nhưng không mặc định là leak cần tắt kernel safeguard.

TIME_WAIT thường được mô tả là chờ 2×MSL: nếu ACK cuối bị mất, peer gửi lại FIN và endpoint còn state có thể ACK lại. MSL và thời gian TIME_WAIT là chính sách/implementation cụ thể; không nên lấy timer trong sách hoặc tên sysctl cũ làm quy tắc cho mọi kernel. `SO_REUSEADDR` có semantics khác nhau theo OS và không tự cho phép tái sử dụng cùng 4-tuple một cách an toàn. TCP cần bảo vệ connection instance mới khỏi segment trễ của instance cũ; timestamps có thể giúp phân biệt trong điều kiện protocol cho phép.

Port reuse và tuple reuse bị ràng buộc bởi state, sequence number và socket options. `SO_REUSEADDR`/`SO_REUSEPORT` có semantics riêng theo OS; không dùng chúng như cách “xóa mọi giới hạn port”.

## Half-open và timeout

Một bên có thể nghĩ connection còn mở trong khi bên kia đã restart hoặc mất mạng. TCP phát hiện theo timeout/retransmit, keepalive hoặc application heartbeat; không có phát hiện tức thì mọi lần cáp rút. Deadline ứng dụng nên ngắn hơn giới hạn chờ vô ích.

Khi peer đã quên connection (ví dụ reboot), segment dữ liệu tiếp theo thường nhận RST vì không còn state phù hợp. RST tới một port không có listener cũng là cách TCP báo connection refused; nó khác UDP, nơi lỗi port thường được báo bằng ICMP. Reset spoof có thể làm gián đoạn kết nối nếu khớp tuple và vượt kiểm tra sequence/window, nên stack áp dụng kiểm tra chặt hơn; encryption ở TLS bảo vệ payload nhưng không tự ngăn mọi dạng DoS tầng TCP.

TIME_WAIT Assassination là lỗi state trong đó RST cũ làm endpoint rời TIME_WAIT quá sớm, mở khả năng nhầm segment cũ với connection instance mới. Cách phòng cụ thể phụ thuộc TCP implementation; đây là lý do không nên tùy tiện xóa state hoặc rút ngắn timer.

## Tấn công nhắm vào quản lý kết nối

SYN flood gửi nhiều yêu cầu bắt tay không hoàn tất để làm cạn state/queue dành cho SYN_RCVD. SYN cookies cho phép server trì hoãn cấp state cho tới khi client ACK được SYN-ACK; đây là biện pháp giảm áp lực, không ngăn mọi kiểu flood và có trade-off với một số option. Rate limiting, lọc nguồn giả mạo ở biên, capacity phù hợp và giám sát queue vẫn quan trọng.

Attacker cũng có thể giả segment SYN/RST/ACK để làm rối hoặc ngắt connection nếu đoán đúng 4-tuple và sequence/window hợp lệ. ISN khó đoán, kiểm tra RST chặt, TCP-AO trong môi trường hỗ trợ và lọc ICMP có xác thực ngữ cảnh giúp giảm rủi ro. TCP-AO cần shared key được quản lý ngoài cơ chế đó; TLS mã hóa/xác thực application stream nhưng không ngăn attacker làm cạn queue hoặc làm rớt đường truyền.

## Tóm tắt

- Handshake trao đổi ISN và thiết lập state/option.
- FIN đóng một hướng; TCP hỗ trợ half-close.
- RST reset đột ngột; timeout xử lý peer không phản hồi.
- TIME_WAIT bảo vệ tính đúng đắn của tuple/ACK, không nhất thiết là leak.
- Connection state sống ở hai endpoint và middlebox có thể hết hạn sớm.

## Tự kiểm tra

**Three-way handshake xác thực danh tính server?** Không; TLS/application authentication làm việc đó.

**FIN nghĩa cả hai hướng lập tức đóng?** Không; FIN đóng hướng gửi của bên đó.

**TIME_WAIT tăng nghĩa cần giảm thời gian kernel ngay?** Không; trước tiên xem connection lifecycle và thiết kế client/server.

## Đọc tiếp

Khi segment mất hoặc đi trễ, TCP ước lượng RTT và retransmit theo timeout/SACK.

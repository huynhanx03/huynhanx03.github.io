---
title: "TCP options: MSS, window scale, SACK và timestamp"
category: "Network"
tags: ["network", "tcp", "protocol"]
description: "Giải thích các TCP option quan trọng được thương lượng lúc mở kết nối và cách chúng cải thiện truyền dữ liệu."
updated: 2026-10-16
translationKey: "network/tcp-options-mss-window-scaling"
---

TCP header có vùng options độ dài thay đổi. Một số tùy chọn được trao đổi chủ yếu trong SYN để hai đầu thống nhất cách truyền; một số xuất hiện trên các segment trong suốt kết nối. Options mở rộng khả năng của TCP mà vẫn giữ semantics byte stream cơ bản.

## MSS và MTU

Maximum Segment Size cho biết payload TCP tối đa một đầu muốn nhận trong một segment, thường dựa trên MTU và trừ IP/TCP header. MSS không gồm header. Tunnel, VPN và encapsulation làm effective MTU nhỏ hơn; nếu đường truyền có đoạn MTU bé hơn, packet có thể bị fragment hoặc bị drop khi PMTUD hỏng.

MSS được quảng bá theo chiều ngược lại: giá trị một đầu gửi cho peer là mức payload lớn nhất mà **bên gửi option** muốn nhận. Đây là receive limit, không phải hai bên thương lượng một MSS chung duy nhất. Sender còn phải xét PMTU và độ dài header để chọn segment thực tế; đường đi hai chiều có thể có PMTU khác nhau. Nếu MSS option vắng mặt, protocol có quy tắc mặc định, nhưng con số lịch sử trong sách không nên dùng làm cấu hình hiện hành mặc định cho mọi stack.

## Window scale

TCP header window field chỉ có 16 bit. Window scale option thương lượng hệ số để biểu diễn receive window lớn hơn 65,535 bytes, cần thiết trên đường có bandwidth-delay product cao. Scale được trao đổi ở SYN; sau đó giá trị cửa sổ trong header được diễn giải theo hệ số của chiều tương ứng. Riêng Window field trong SYN và SYN-ACK không được scale ([RFC 7323](https://www.rfc-editor.org/rfc/rfc7323.html#section-2.2)).

## SACK và timestamp

Selective Acknowledgment cho phép receiver báo những dải byte đã nhận ngoài phần liên tục đầu tiên, giúp sender retransmit đúng lỗ hổng thay vì gửi lại cả vùng. Timestamp hỗ trợ đo RTT và PAWS chống segment cũ quay lại trong một số trường hợp sequence number wrap.

SACK-Permitted được trao đổi trong SYN; khi đã cho phép, receiver có thể gửi SACK block trong ACK để chỉ ra các dải byte đã tới ngoài khoảng liên tục đầu tiên. Cumulative ACK vẫn giữ vai trò nền tảng. Header option space tối đa 40 byte nên số block có thể mang mỗi segment bị giới hạn; sender cũng phải có recovery logic biết sử dụng thông tin này.

Timestamp option mang TSval và TSecr, không đòi đồng bộ đồng hồ hai máy. Echo timestamp có thể tạo thêm RTT sample; timestamp tăng đơn điệu còn hỗ trợ PAWS (Protection Against Wrapped Sequence numbers) loại segment cũ khi sequence space wrap trên kết nối tốc độ cao. Đây là chức năng của TCP timestamps, không phải timestamp nghiệp vụ.

## UTO, TCP-AO và option space

User Timeout (UTO) có thể trao đổi ngưỡng chờ dữ liệu chưa ACK trước khi ứng dụng coi peer đã lỗi. Giá trị mang tính gợi ý; mỗi endpoint vẫn áp dụng giới hạn và chính sách local của mình. TCP Authentication Option (TCP-AO) xác thực segment bằng shared key/thuật toán được cấu hình, nhưng không tự cung cấp quy trình phân phối khóa hay mã hóa payload. Mức hỗ trợ thực tế tùy stack và môi trường.

Option dùng Kind/Length và có thể được pad để header dài theo bội số 4 byte; EOL kết thúc danh sách, NOP dùng căn chỉnh. Header tối đa 60 byte nên các option cạnh tranh không gian. TCP stack thường bỏ qua option không nhận biết theo quy tắc tương thích, nhưng middlebox sửa hoặc loại option có thể khiến khả năng đã thương lượng không còn hoạt động như mong đợi.

## PMTU và black hole

TCP chọn payload theo MSS được peer quảng bá và PMTU đường đi. Với PMTUD cổ điển, gói không phân mảnh được gửi; ICMP Fragmentation Needed/Packet Too Big cho biết MTU nút kế tiếp, TCP giảm segment size rồi retransmit. PLPMTUD có thể dò kích thước ở tầng packetization mà không phụ thuộc hoàn toàn vào ICMP. Nếu firewall làm rơi ICMP cần thiết, bắt tay với gói nhỏ vẫn thành công nhưng truyền dữ liệu lớn bị treo hoặc retransmit: đó là dấu hiệu PMTU black hole. Capture hai phía và kiểm tra PTB/Fragmentation Needed giúp phân biệt với lỗi ứng dụng.

Một ICMP PTB giả với MTU quá nhỏ cũng có thể ép sender dùng segment bé, làm giảm hiệu năng. Không nên chặn toàn bộ ICMP một cách máy móc; cần lọc/kiểm tra thông điệp theo ngữ cảnh và dùng cơ chế PMTU phù hợp của hệ điều hành.

Middlebox có thể loại hoặc làm sai options; packet capture tại hai đầu giúp xác định SYN nào đã thương lượng được. `ss -ti` trên Linux thường hiển thị một số TCP metrics của socket đang mở.

## Tự kiểm tra

**MSS có tính TCP/IP header vào không?** Không; đó là kích thước TCP payload.

**Window scaling có thể thương lượng sau khi kết nối đã thiết lập?** Không theo cách chuẩn; option được trao đổi trong SYN.

**SACK đổi TCP thành message protocol?** Không; TCP vẫn cung cấp byte stream.

## Đọc tiếp

RTO, retransmission và congestion control dùng ACK cùng đo RTT để điều chỉnh cách gửi.

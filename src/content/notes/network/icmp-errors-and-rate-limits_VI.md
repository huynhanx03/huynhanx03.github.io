---
title: "ICMP error message và rate limiting"
category: "Network"
tags: ["network", "icmp", "firewall", "diagnostics"]
description: "Đọc ICMP error theo type/code, hiểu quoted packet, rate limit, Redirect và Path MTU Discovery."
updated: 2026-10-16
translationKey: "network/icmp-errors-and-rate-limits"
---

ICMP đi bên trong IP: IPv4 dùng Protocol 1, IPv6 dùng Next Header 58 (có thể nằm sau extension headers). Message mở đầu bằng Type, Code và checksum; Type chọn họ thông điệp, Code làm rõ nguyên nhân. Checksum ICMPv6 còn bao gồm pseudo-header IPv6 để bảo vệ liên kết message với địa chỉ nguồn/đích.

ICMP Echo chỉ là nhóm message dễ nhận ra. ICMP còn báo lỗi chuyển tiếp và mang tín hiệu điều khiển mà host cần để vận hành IP. ICMP không làm IP trở thành reliable: packet bị drop vì nghẽn buffer thường không sinh ICMP; tầng vận chuyển và ứng dụng vẫn phải xử lý mất gói.

## Một số ICMP lỗi

- **Destination Unreachable:** route không có, host/địa chỉ/port không tới được, hoặc policy cấm; type/code phân biệt một số nguyên nhân.
- **Time Exceeded:** TTL/Hop Limit hết trên đường, hoặc hết thời gian tái lắp fragment.
- **Fragmentation Needed / Packet Too Big (PTB):** packet không vừa MTU next hop và không thể được forward theo quy tắc của IP version đó.
- **Parameter Problem:** router/host phát hiện trường header hay Next Header/option không xử lý được; pointer có thể chỉ byte gây lỗi.
- **Redirect:** router báo host rằng có next hop tốt hơn hoặc đích thực ra nằm cùng link. Host có thể cập nhật thông tin route; đây là thông điệp điều khiển nhạy cảm và phải được xác thực theo ngữ cảnh/interface/policy.

ICMP error thường trích header IP của packet gây lỗi cùng phần đầu payload. Phần trích này cho phép hệ điều hành tìm protocol, port và socket liên quan; nó cũng giúp NAT/router xử lý lỗi đúng flow. Một số ICMP extension có thể đính kèm thông tin bổ sung như interface/next hop hoặc dữ liệu MPLS. Chi tiết Type/Code giữa ICMPv4 và ICMPv6 khác nhau; không nên đọc một code của IPv4 như thể nó có cùng nghĩa ở IPv6.

Các lỗi phổ biến cần phân biệt:

- IPv4 Destination Unreachable type 3/code 3 và IPv6 type 1/code 4 báo port không có listener (hay gặp với UDP). Ứng dụng UDP có thể không nhận lỗi nếu socket/API không bật cơ chế nhận asynchronous network errors; packet capture vẫn thấy ICMP đến host.
- IPv4 type 3/code 4 báo “fragmentation needed” khi DF được đặt; IPv6 dùng riêng type 2 Packet Too Big. Router IPv6 không fragment packet transit, nên sender điều chỉnh kích thước hoặc tự fragment khi phù hợp.
- Time Exceeded code 0 hỗ trợ traceroute; code 1 báo reassembly timeout.
- ICMPv6 Parameter Problem tách lỗi header (code 0), Next Header không nhận ra (code 1), và option không nhận ra (code 2). Code IPv4 có lịch sử khác và một số giá trị đã lỗi thời.

## Rate limiting và lọc

Không gửi ICMP error đáp lại một ICMP error khác; cũng tránh phản hồi cho packet broadcast/multicast và fragment không đầu trong các trường hợp được chuẩn quy định. Những ràng buộc này hạn chế lỗi lồng nhau và broadcast storm. ICMPv6 có một số ngoại lệ riêng, vì vậy không suy diễn quy tắc IPv4 sang IPv6.

Router/kernel có thể rate-limit ICMP để tránh bị flood. Thấy một số reply rồi im không chứng minh data plane cũng drop; control-plane response có policy riêng. Mức limit tùy thiết bị/OS, không lấy con số từ trace hoặc ví dụ sách làm chuẩn chung. Với UDP, ứng dụng cũng có thể tiếp tục retry dù ICMP Port Unreachable đã tới kernel, tùy socket API và implementation.

Firewall nên phân biệt ICMP version, type/code, direction và vai trò của thiết bị. Cho phép các message cần thiết cho PMTUD và hoạt động IPv6, đồng thời giới hạn Echo theo nhu cầu, thường tốt hơn chặn toàn bộ ICMP. Chặn PTB/Fragmentation Needed có thể tạo PMTU black hole: kết nối bắt tay hoặc packet nhỏ chạy được, nhưng truyền dữ liệu lớn bị treo.

## Rủi ro và chuyển đổi giữa hai phiên bản

ICMP có thể bị lợi dụng để khuếch đại traffic, dò thông tin, làm sai route/PMTU, hoặc gửi lỗi giả khiến một số stack cũ xử lý sai flow. Các ví dụ như smurf, ping of death, teardrop và land là lỗi/kiểu tấn công lịch sử; không nên mặc định rằng hệ thống hiện đại vẫn dễ bị chúng. Bài học còn nguyên giá trị là kiểm tra nguồn và ngữ cảnh của ICMP, giới hạn phản hồi, không tin Redirect/PMTU chỉ vì packet mang đúng type, và cập nhật hệ điều hành/thiết bị mạng.

Khi translator đổi IPv4↔IPv6, nó phải đổi cả IP header lẫn ICMP type/code/checksum. Với ICMP error, phần packet gốc được trích dẫn cũng cần được dịch để host phía kia ghép lỗi đúng flow. Một số message không có ánh xạ tương đương và có thể bị loại bỏ; MTU và checksum khác nhau giữa hai phiên bản cũng ảnh hưởng kết quả. Vì vậy lỗi qua NAT64/translator có thể không biểu hiện giống một đường native.

## Tóm tắt

- ICMP errors thông báo tình trạng IP, khác Echo ping.
- Type/Code xác định nguyên nhân; quoted packet giúp ghép lỗi với flow gốc.
- Time Exceeded hỗ trợ traceroute; Fragmentation Needed/PTB hỗ trợ PMTUD.
- ICMP response có thể rate-limit hoặc bị lọc riêng.
- ICMPv4 và ICMPv6 có type/code và một số quy tắc xử lý khác nhau.
- Firewall policy nên dựa type/code, không chặn mù.

## Tự kiểm tra

**Ping timeout nghĩa route hỏng?** Chưa; Echo có thể bị lọc.

**Chặn Packet Too Big an toàn nếu TCP chạy?** Có thể gây PMTU black hole với payload lớn.

**Router tạo ICMP lỗi cho mọi packet drop?** Không.

**Nếu thấy ICMP Port Unreachable trong capture thì ứng dụng UDP chắc chắn đã nhận lỗi?** Không. Kernel có thể nhận ICMP trong khi ứng dụng không được báo lỗi bất đồng bộ.

**Chặn PTB nhưng vẫn cho ping là đủ?** Không. Ping nhỏ có thể chạy trong khi packet ứng dụng lớn bị PMTU black hole.

## Đọc tiếp

Nối ICMP error với `ip route get`, packet capture và MTU test trong quy trình chẩn đoán.

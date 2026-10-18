---
title: "ICMP, ping, traceroute và Path MTU Discovery"
category: "Network"
tags: ["network", "icmp", "diagnostics", "pmtud"]
description: "Hiểu ICMP là control/error reporting cho IP, giới hạn của ping/traceroute và vai trò MTU."
updated: 2026-10-16
translationKey: "network/icmp-diagnostics-path-mtu"
---

ICMP đi kèm IP và mang lỗi/trạng thái của tầng mạng. Nó không phải transport đáng tin cậy cho ứng dụng: packet ICMP cũng có thể mất, bị lọc hoặc bị giới hạn tốc độ. IPv6 dựa vào ICMPv6 sâu hơn IPv4: ngoài báo lỗi, ICMPv6 còn vận chuyển Router/Neighbor Discovery và quản lý multicast membership.

## Ping kiểm tra điều gì?

`ping` gửi ICMP Echo Request và chờ Echo Reply. Identifier giúp phân biệt các tiến trình ping vì ICMP không có port tầng vận chuyển; Sequence Number giúp nhìn ra mất, trùng hoặc đảo thứ tự. Dữ liệu tùy chọn thường được trả nguyên vẹn trong Echo Reply, và thời gian gửi/nhận dùng để ước lượng RTT mà không cần đồng bộ đồng hồ hai máy.

Reply cho thấy đường đi của gói ICMP hoạt động tại thời điểm đó; nó không chứng minh port TCP của ứng dụng mở, DNS đúng hay request nghiệp vụ thành công. Firewall có thể chặn echo nhưng cho phép ứng dụng, hoặc ngược lại. Ping tới địa chỉ broadcast IPv4 có thể khiến nhiều máy cùng trả lời và tạo lượng traffic lớn; không dùng tùy tiện trên mạng thật.

RTT gồm thời gian hai chiều và xử lý; nó không chỉ là latency một chiều. Packet loss một vài lần cần xét mẫu dài hơn và điều kiện mạng.

## Traceroute

Traceroute gửi probe với TTL/Hop Limit tăng dần. Router khi giá trị về 0 có thể gửi ICMP Time Exceeded; phản hồi giúp suy ra địa chỉ giao diện router gần phía nguồn và RTT của probe. Probe có thể là UDP, ICMP Echo hoặc TCP tùy công cụ, nên các kiểu trace khác nhau có thể đi qua policy khác. Router/firewall có thể không trả lời hoặc rate-limit, và forward/reverse path có thể khác nhau; dấu `*` không chứng minh hop đó làm rơi traffic cuối-cuối.

## Destination unreachable và fragmentation needed

ICMP lỗi thường chứa bản sao header và phần đầu packet gây lỗi để host liên hệ với protocol/flow ban đầu. Type/Code khác nhau giữa IPv4 và IPv6; ví dụ port unreachable trong IPv4 là Destination Unreachable type 3/code 3, còn IPv6 là type 1/code 4.

IPv4 có thể báo Fragmentation Needed khi DF cấm fragment; IPv6 dùng Packet Too Big (PTB) và router không fragment packet transit. Sender hạ kích thước packet dựa trên thông tin đó. Firewall chặn thông điệp này có thể tạo PMTU black hole: kết nối nhỏ như handshake thành công nhưng dữ liệu lớn đứng lại. ICMP error bị giới hạn theo quy tắc để tránh error storm và có thể bị rate-limit.

ICMPv6 còn mang Router Solicitation/Advertisement để host khám phá router và nhận cấu hình, Neighbor Solicitation/Advertisement để tìm link-layer address và theo dõi reachability, cùng MLD để quản lý multicast listener. Vì vậy, chẩn đoán IPv6 cần kiểm tra đúng loại ICMPv6, không kết luận “ICMPv6 là ping”.

ICMP errors có quy tắc về việc message nào được tạo để tránh vòng lặp/giả mạo. Host không nên coi mọi ICMP đến là chân lý tuyệt đối; xử lý theo protocol và state.

## Firewall policy

Chặn ping có thể là policy nhưng chặn mọi ICMP/ICMPv6 thường làm hỏng báo lỗi và discovery. Cho phép loại/type/code cần thiết theo role mạng, rate-limit khi phù hợp và log có chọn lọc.

## Tóm tắt

- ICMP là control/error reporting gắn với IP.
- Ping kiểm tra Echo path, không kiểm tra toàn bộ ứng dụng.
- Traceroute suy ra hop qua TTL/Hop Limit nhưng phản hồi có thể bị lọc.
- PMTUD phụ thuộc thông báo ICMP packet-too-big/fragmentation-needed.
- Firewall cần policy theo loại thông điệp, không chặn mù mọi ICMP.

## Tự kiểm tra

**Ping thành công nghĩa HTTPS service đang khỏe?** Không.

**Traceroute có `*` ở hop 3 nghĩa router 3 làm rơi mọi packet?** Không; có thể chỉ không trả lời probe.

**Chặn hết ICMPv6 có an toàn?** Không; ND, Router Discovery, PMTUD và các chức năng khác cần ICMPv6. Firewall nên áp policy theo type/code và vị trí mạng.

## Đọc tiếp

Multicast là cách gửi tới nhóm host thay cho broadcast tới mọi node trong phạm vi.

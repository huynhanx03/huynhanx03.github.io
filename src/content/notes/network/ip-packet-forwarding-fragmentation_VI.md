---
title: "IP packet, forwarding và fragmentation"
category: "Network"
tags: ["network", "ip", "forwarding", "mtu"]
description: "Đọc header IP ở mức khái niệm, lần qua router và hiểu fragment cùng Path MTU Discovery."
updated: 2026-10-16
translationKey: "network/ip-packet-forwarding-fragmentation"
---

IP cung cấp dịch vụ datagram best-effort: cố gắng chuyển packet từ nguồn tới đích qua nhiều mạng, nhưng không bảo đảm packet tới, đúng thứ tự hay chỉ xuất hiện một lần. Reliability thường được xử lý ở tầng trên như TCP hoặc ứng dụng.

## Header và chuyển tiếp

IPv4 header chứa source/destination address, protocol, TTL, total length, identification/fragment fields và checksum header. IPv6 có header cơ bản khác, dùng Next Header và Hop Limit; một số chức năng chuyển qua extension header. Router đọc địa chỉ đích, tra route, giảm TTL/Hop Limit và forward hoặc loại packet.

IP address gắn với interface theo cấu hình; host nhiều interface có thể có nhiều địa chỉ và route. Source address được chọn theo policy/route, không phải lúc nào cũng “IP duy nhất của máy”.

## Route chọn đường, frame chở từng chặng

Forwarding table thường có destination prefix, mask/prefix length, next hop và interface. Kernel so địa chỉ đích với các route khớp rồi dùng **longest-prefix match**: route cụ thể hơn thắng route tổng quát; default route chỉ là đường dự phòng rộng nhất. Nếu có nhiều route cùng độ dài prefix, metric, policy routing hoặc quy tắc của hệ điều hành quyết định thêm.

Route `on-link`/connected thường gửi thẳng tới peer trên link. Route có gateway gửi tới next-hop router. IP source/destination thường giữ nguyên trên các hop; riêng NAT, tunnel hoặc cơ chế đặc biệt có thể thay đổi chúng. Link-layer frame được tạo lại trên mỗi link và MAC destination mỗi lần là MAC của next hop trên link đó. Switch chuyển frame theo MAC; router đọc IP đích, tra route và tạo frame mới cho chặng tiếp theo.

Khi một IP packet tới host, host kiểm tra nó có địa chỉ đích cục bộ hay không. Nếu packet không dành cho host, máy chỉ forward tiếp khi được cấu hình làm router; host thông thường loại packet đó. Router cũng có thể trả ICMP khi thiếu route hoặc TTL/Hop Limit hết, nhưng có trường hợp im lặng loại packet theo policy.

## Host nhiều interface

Máy có nhiều interface cần quyết định địa chỉ nguồn, interface gửi và cách nhận packet. **Strong host model** gắn việc nhận/gửi địa chỉ IP chặt với interface sở hữu địa chỉ đó; **weak host model** cho phép một địa chỉ cục bộ được dùng/nhận qua interface khác. Hành vi thực tế phụ thuộc OS, cấu hình và routing policy; nó ảnh hưởng multihoming, firewall và nguy cơ traffic đi vào interface ngoài dự kiến.

Khi ứng dụng không chỉ định địa chỉ nguồn, hệ điều hành thường chọn dựa trên route/interface, scope, trạng thái địa chỉ và policy; IPv6 càng cần để ý vì một interface có thể có nhiều địa chỉ cùng scope khác nhau. Nếu kết nối sai đường hoặc không nhận được phản hồi, kiểm tra route được chọn, source address, interface và policy lọc cùng nhau thay vì chỉ xem IP đích.

## Fragmentation IPv4

Nếu packet IPv4 lớn hơn MTU của link kế tiếp, router có thể fragment nếu cờ DF không đặt và cấu hình cho phép. Fragment mang offset/identification để đích lắp lại; mất một fragment có thể khiến toàn datagram không dùng được. Reassembly thường ở destination, tăng độ nhạy với loss và tốn buffer.

IPv6 router không fragment packet. Sender cần biết MTU path và dùng Fragment header nếu cần phân mảnh đầu-cuối theo cơ chế phù hợp. Vì vậy Path MTU Discovery/ICMP quan trọng.

## Path MTU Discovery và black hole

Sender gửi packet theo MTU ước lượng; router gặp link nhỏ hơn có thể gửi ICMP báo “too big” (IPv6) hoặc fragmentation-needed (IPv4 DF). Sender hạ kích thước payload phù hợp. Nếu firewall chặn thông điệp cần thiết, small packets chạy nhưng packet lớn bị drop lặp lại — PMTU black hole.

MSS TCP là giới hạn payload TCP đã thương lượng/điều chỉnh, dựa vào MTU và header. Tuning MSS có thể là workaround trong topology cụ thể, nhưng cần tìm nguyên nhân MTU/ICMP thay vì áp dụng mù.

## Best effort và lớp khác

IP checksum IPv4 bảo vệ header, không bảo vệ payload end-to-end. Link checksum chỉ theo từng link và packet có thể đổi frame qua router. TCP checksum bao phủ segment và pseudo-header; TLS xác thực nội dung ứng dụng theo session. Mỗi lớp có phạm vi khác nhau.

## Tóm tắt

- IP chuyển datagram best-effort, không tự cung cấp reliability.
- Router forward dựa trên địa chỉ đích và route, giảm TTL/Hop Limit.
- Longest-prefix match chọn route cụ thể nhất; default route chỉ dùng khi không có route phù hợp hơn.
- Địa chỉ IP là đầu-cuối, còn địa chỉ link-layer hướng tới next hop và đổi theo từng link.
- IPv4 có thể fragment theo điều kiện; IPv6 router không fragment.
- PMTUD cần ICMP cần thiết; chặn sai có thể tạo black hole.
- Checksum từng tầng bảo vệ phạm vi khác nhau.

## Tự kiểm tra

**IP bảo đảm packet đến đích theo đúng thứ tự?** Không.

**IPv6 router fragment packet khi MTU nhỏ?** Không; sender cần xử lý PMTU/fragmentation.

**Ethernet FCS bảo vệ payload xuyên mọi router?** Không; FCS được tính lại trên từng link.

## Đọc tiếp

ICMP cung cấp lỗi và chẩn đoán cho IP, ngoài chức năng ping.

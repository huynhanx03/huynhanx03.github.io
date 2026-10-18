---
title: "Chẩn đoán mạng: từ route tới packet capture"
category: "Network"
tags: ["network", "diagnostics", "tcpdump", "troubleshooting"]
description: "Dùng giả thuyết và quan sát từng tầng để phân biệt DNS, route, firewall, TCP và lỗi ứng dụng."
updated: 2026-10-16
translationKey: "network/network-diagnostics-packet-capture"
---

“Không vào được server” có thể là DNS sai, route thiếu, firewall drop, TCP port không listen, TLS certificate lỗi hoặc application trả 500. Chẩn đoán hiệu quả bắt đầu bằng cách tái hiện lỗi và xác định tầng cụ thể thay vì thử ngẫu nhiên nhiều thay đổi.

## Quy trình từ gần tới xa

1. Xem interface/link/address: `ip link`, `ip addr`.
2. Xem route/next-hop: `ip route get <ip>`.
3. Kiểm tra neighbor: `ip neigh`.
4. Query DNS riêng, so kết quả với IP mong đợi.
5. Thử TCP connect tới host/port theo policy.
6. Xem TLS handshake và response application.
7. So capture ở client/server khi cần biết packet dừng ở đâu.

Ping hữu ích nhưng không phải cổng kiểm tra duy nhất; firewall có thể chặn ICMP.

## Socket và connection state

Trên Linux, `ss -lntup` xem socket TCP/UDP và process owner theo quyền; `ss -ti` có thể hiển thị thông tin TCP. `lsof -i` là góc nhìn khác. Cột LISTEN chứng minh kernel có socket đang listen tại interface/port hiển thị, không chứng minh downstream app khỏe.

## Packet capture

`tcpdump` bắt packet tại interface với filter để giảm dữ liệu. Xem SYN/SYN-ACK, retransmission, RST, DNS query, ICMP lỗi và MTU. Capture có thể cần quyền cao và chứa credential/dữ liệu nhạy cảm; giới hạn file, snaplen, thời gian và nơi chia sẻ.

Offload NIC có thể làm packet capture ở host thấy checksum chưa tính hoặc segment lớn hơn wire do GSO/TSO. Capture tại switch mirror/server có thể khác góc nhìn. Đặt điểm capture và đồng bộ thời gian trước khi kết luận.

## Đọc dấu hiệu TCP

- SYN lặp không có SYN-ACK: đường về, firewall, listener hoặc server path có thể lỗi.
- RST: endpoint/middlebox chủ động reset hoặc port không nhận theo state.
- Retransmission: loss, delay, reordering hoặc capture artifact cần phân biệt.
- TCP handshake thành công nhưng request treo: kiểm tra TLS/application/downstream.

Đây là gợi ý chẩn đoán, không phải kết luận duy nhất.

## Tóm tắt

- Chẩn đoán theo tầng: link, route, neighbor, DNS, transport, TLS, application.
- `ss` cho socket state; packet capture cho góc nhìn trên đường truyền.
- ICMP block không có nghĩa mọi traffic fail.
- Offload và capture point ảnh hưởng cách diễn giải packet.
- Capture có thể chứa dữ liệu nhạy cảm; quản lý phạm vi và retention.

## Tự kiểm tra

**SYN gửi đi chứng minh server đã nhận?** Không; cần thấy phản hồi/quan sát phía server.

**TCP connected nghĩa request application thành công?** Không.

**Wireshark báo bad checksum ở host capture luôn chứng minh packet hỏng trên dây?** Không; offload có thể làm capture trước khi checksum hoàn thiện.

## Đọc tiếp

Network filesystem đưa file API qua mạng; semantics khác filesystem local vì latency và failure remote.

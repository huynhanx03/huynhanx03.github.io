---
title: "Ethernet frame, MTU và học địa chỉ của switch"
category: "Network"
tags: ["network", "ethernet", "switch", "mtu"]
description: "Theo dõi một frame Ethernet trong LAN, cách switch học MAC source và quan hệ giữa MTU, frame và packet IP."
updated: 2026-10-16
translationKey: "network/ethernet-frame-mtu-and-switch-learning"
---

Ethernet chuyển frame trong một link-layer segment. Frame mang địa chỉ MAC nguồn/đích và payload; switch quan sát MAC nguồn để học thiết bị nằm ở port nào, rồi dùng bảng forwarding để chuyển frame unicast.

## Switch học và chuyển frame

Khi frame đi vào port, switch cập nhật bảng MAC theo source MAC và VLAN. Nếu destination đã biết, switch gửi ra port tương ứng; nếu chưa biết, thường flood trong VLAN đó (trừ port vào). Broadcast cũng được flood trong phạm vi broadcast domain. Bảng MAC có thể hết hạn để thích nghi khi thiết bị di chuyển.

MAC table không phải routing table IP. Switch layer 2 chuyển frame trong VLAN; router hoặc switch layer 3 định tuyến packet giữa subnet. Một switch có thể đảm nhiệm cả hai vai trò nhưng logic vẫn khác.

## MTU và kích thước frame

MTU thường chỉ payload tối đa ở một giao diện IP/link; Ethernet frame còn có header và FCS. VLAN tag tăng header frame. Jumbo frame cần cấu hình tương thích trên toàn đường đi; một đoạn có MTU nhỏ hơn có thể tạo black hole nếu Path MTU Discovery không hoạt động.

Ethernet II cơ bản có **destination MAC (6 byte), source MAC (6 byte), EtherType (2 byte), payload và FCS (4 byte)**. EtherType như `0x0800`, `0x86DD`, `0x0806` giúp giao frame payload lên IPv4, IPv6 hoặc ARP. Trong định dạng IEEE 802.3, trường tương ứng có thể biểu thị độ dài; giá trị từ 1501 đến 1535 không dùng cho cả hai cách diễn giải thông thường, còn giá trị từ 1536 trở lên là EtherType. Frame có kích thước tối thiểu 64 byte tính từ địa chỉ đích tới hết FCS; payload ngắn được pad. Mức tối thiểu có nguồn gốc từ yêu cầu phát hiện collision của Ethernet half-duplex lịch sử.

FCS là CRC-32 phát hiện hỏng bit của frame; nó không sửa dữ liệu, xác thực người gửi hay bảo đảm retransmission. Frame cơ bản thường tối đa 1518 byte gồm header 14 byte, IP packet tối đa 1500 byte (gồm IP header) và FCS 4 byte. Một 802.1Q tag thêm 4 byte, nên frame tagged thường tối đa 1522 byte. Preamble, start-frame delimiter và inter-packet gap phục vụ truyền/đồng bộ ở lớp thấp hơn, không được tính vào IP MTU hay con số frame trên theo cách phổ biến.

Khi packet lớn hơn MTU, nguồn IPv4 có thể fragment nếu cho phép hoặc báo lỗi cho ứng dụng. Router không chuyển tiếp được packet IPv4 có DF thì loại packet và gửi ICMP Fragmentation Needed khi quy tắc cho phép; router IPv6 không fragment packet transit mà báo Packet Too Big. Báo lỗi cục bộ cho ứng dụng khác với gửi ICMP về nguồn qua mạng. TCP thường điều chỉnh MSS để segment vừa MTU, nhưng tunnel/VPN thêm overhead và làm effective MTU nhỏ hơn.

## Lần theo vấn đề LAN

`ip link` cho MTU và trạng thái interface; `bridge fdb show` xem forwarding database Linux bridge; switch quản trị có lệnh xem MAC table, VLAN và port counters. Packet capture có thể xác nhận frame/VLAN tag, nhưng capture ở host thường thấy frame sau một số xử lý offload.

## Tự kiểm tra

**Switch layer 2 chọn đường bằng địa chỉ IP?** Không; nó chuyển frame dựa trên MAC trong VLAN.

**MTU gồm Ethernet header?** Thường không; MTU mô tả kích thước payload layer 3 mà interface chuyển được.

**Jumbo frame chỉ cần bật ở hai endpoint?** Không; mọi đoạn liên quan cần hỗ trợ đúng cấu hình.

## Đọc tiếp

Nếu MAC next hop chưa biết, ARP hoặc IPv6 Neighbor Discovery phân giải địa chỉ link-layer.

---
title: "Chẩn đoán interface và route trên Linux"
category: "Network"
tags: ["network", "linux", "routing", "diagnostics"]
description: "Lần theo interface, địa chỉ, bảng route và neighbor để tìm điểm gãy trước khi bắt packet."
updated: 2026-10-16
translationKey: "network/network-diagnostics-interfaces-routes"
---

Khi một kết nối không hoạt động, nên lần theo đường đi từ máy nguồn: interface có link không, địa chỉ và prefix đúng chưa, route chọn next hop nào, neighbor đã phân giải được chưa, rồi mới kiểm tra transport và ứng dụng. Cách này tránh quy mọi lỗi thành “DNS” hoặc “firewall”.

## Interface và địa chỉ

`ip link` xem trạng thái link và MTU; `ip addr` xem địa chỉ/prefix; `ip -s link` cho bộ đếm lỗi và drop. Link `UP` ở cấu hình không nhất thiết nghĩa carrier vật lý đã có. Wi-Fi association, VLAN tagging hoặc cáp/switch có thể là vấn đề ở lớp dưới.

Địa chỉ có thể được cấu hình thủ công, DHCP hoặc IPv6 autoconfiguration. Kiểm tra prefix, địa chỉ trùng, gateway và trạng thái tentative/deprecated. Trên máy có nhiều interface, source address được chọn có thể không phải địa chỉ mong muốn.

## Route và next hop

`ip route` xem route IPv4; `ip -6 route` xem IPv6. Policy-routing rules chọn bảng cần tra; trong bảng đó, kernel dùng prefix dài nhất rồi xét metric/quy tắc phù hợp. Vì vậy route cụ thể trong một bảng khác không tự thắng rule đã chọn bảng trước. ([ip-rule(8)](https://man7.org/linux/man-pages/man8/ip-rule.8.html)). `ip route get 203.0.113.7` hỏi kernel sẽ gửi đích qua interface, next hop và source address nào.

Nếu đích nằm cùng subnet, máy thường phân giải địa chỉ link-layer của chính đích. Nếu ở mạng khác, nó phân giải MAC của gateway. `ip neigh` cho neighbor cache và trạng thái ARP/ND. Route đúng nhưng neighbor unresolved thường chỉ ra vấn đề ở link layer hoặc gateway.

## Tiếp tục theo tầng

Sau khi xác nhận route, dùng `ping` thận trọng: ICMP có thể bị chặn dù dịch vụ hoạt động. `tracepath`/`traceroute` gợi ý đường đi; `ss -tuna` cho socket; `curl -v` hoặc `nc` thử endpoint; `tcpdump` kiểm tra packet tại interface. So sánh packet ở hai đầu giúp xác định mất ở đường truyền hay ở host.

Giữ lại lệnh, interface, timestamp và kết quả. Cấu hình mạng có thể đổi theo NetworkManager, systemd-networkd, netplan hoặc công cụ khác; kiểm tra ai là nguồn cấu hình để tránh chỉnh runtime rồi bị ghi đè.

## Tự kiểm tra

**Route chọn gateway nào cho một đích cụ thể?** Dùng `ip route get` để hỏi lựa chọn thực tế của kernel.

**Ping thất bại chứng minh host down?** Không; ICMP có thể bị lọc.

**Đích ngoài subnet cần ARP cho MAC của server cuối?** Thông thường máy chỉ cần MAC của next-hop gateway trên link cục bộ.

## Đọc tiếp

Khi interface và route đã đúng, packet capture giúp xem handshake, retransmission và lỗi transport.

---
title: "Routing, next hop và default gateway"
category: "Network"
tags: ["network", "routing", "gateway", "linux"]
description: "Đọc route table, longest-prefix match và lần theo một packet từ host qua các router."
updated: 2026-10-16
translationKey: "network/routing-next-hop-and-gateway"
---

Route table cho biết packet tới prefix nào nên đi qua interface/next hop nào. Host không cần biết toàn bộ Internet; nó cần route tới mạng cục bộ và thường một default route tới gateway.

## Longest-prefix match

Router so địa chỉ đích với các prefix route khớp, rồi chọn prefix cụ thể nhất (nhiều bit prefix nhất). Nếu không có route cụ thể hơn, default route `0.0.0.0/0` hoặc `::/0` có thể được dùng.

Route có thể chứa interface trực tiếp, gateway next hop, metric/priority và nguồn cấu hình. Nhiều route cùng prefix được xử lý theo policy/kernel. Đừng chỉ nhìn default gateway mà bỏ qua route cụ thể/VPN.

## Host gửi packet

1. Ứng dụng ghi vào socket.
2. Kernel tra route theo destination IP.
3. Nếu peer on-link, next hop là peer; nếu ngoài subnet, next hop là gateway.
4. Neighbor resolution tìm MAC next hop.
5. Kernel/driver phát frame; router tiếp tục tra route ở mỗi hop.

Router giảm TTL IPv4 hoặc Hop Limit IPv6; khi hết, packet bị loại và ICMP có thể báo lỗi. TTL không phải tuổi tuyệt đối tính bằng giây; nó giới hạn số lần chuyển tiếp.

## Xem route trên Linux

```sh
ip route
ip -6 route
ip route get 203.0.113.10
```

Địa chỉ documentation trong ví dụ không dùng làm server thật. `ip route get` giúp hỏi kernel chọn đường nào cho một đích. Khi lỗi, so route table với interface/address/neighbor và policy rule.

## Routing động và static

Static route cấu hình tĩnh, đơn giản cho mạng nhỏ nhưng cần cập nhật thủ công khi topology đổi. Routing protocol như OSPF/BGP trao đổi reachability và policy giữa router; route announcement không đồng nghĩa đường đi luôn khỏe hoặc an toàn. BGP policy/route filtering quan trọng vì route toàn cầu có thể bị quảng bá sai.

## Tóm tắt

- Route table map destination prefix tới next hop/interface.
- Longest-prefix match ưu tiên route cụ thể nhất.
- MAC chỉ cần cho next hop trên link hiện tại.
- TTL/Hop Limit hạn chế vòng lặp chuyển tiếp; ICMP có thể báo lỗi.
- Static và dynamic routing có chi phí quản trị/policy khác nhau.

## Tự kiểm tra

**Router cần giữ một route riêng cho từng website?** Thường route theo prefix; host/domain được resolve thành IP trước.

**Ethernet MAC destination trên mọi hop giữ nguyên?** Không; mỗi link có frame mới tới next hop.

**Default gateway luôn được dùng dù có route cụ thể?** Không; longest-prefix match có thể chọn route cụ thể.

## Đọc tiếp

Gói có thể đi qua nhiều mạng và gặp giới hạn MTU; topic IP & Network Control sẽ đi sâu fragmentation và ICMP.

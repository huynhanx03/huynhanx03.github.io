---
title: "Path MTU Discovery và black hole do MTU"
category: "Network"
tags: ["network", "ip", "mtu", "tcp"]
description: "Theo dõi cách host tìm MTU nhỏ nhất trên đường đi và nhận diện kết nối chỉ treo khi gửi dữ liệu lớn."
updated: 2026-10-16
translationKey: "network/path-mtu-discovery-black-hole"
---

MTU của interface nguồn không đảm bảo mọi link trên đường có cùng kích thước. Path MTU Discovery (PMTUD) giúp sender biết packet lớn nhất có thể đi end-to-end mà không cần router fragment. Nếu thông điệp báo lỗi bị chặn, packet lớn có thể rơi vào black hole.

## IPv4 và IPv6

Trong IPv4, sender có thể đặt DF; router gặp MTU nhỏ hơn cần trả ICMP “fragmentation needed” để sender giảm kích thước. IPv6 router không fragment packet transit; router trả ICMPv6 Packet Too Big và nguồn điều chỉnh packet.

TCP thường dùng MSS negotiation cộng PMTUD để chọn segment phù hợp. UDP/application datagram lớn cần tự xử lý kích thước hoặc fragmentation; mất một fragment khiến toàn datagram không dùng được.

## Dấu hiệu và chẩn đoán

Handshake nhỏ thành công nhưng tải file/response lớn bị treo; một số mạng hoặc VPN hoạt động còn mạng khác thất bại. Dùng `tracepath`, `ping` với kích thước phù hợp và capture ICMP lỗi. Chặn tất cả ICMP thường phá PMTUD và gây lỗi khó nhận diện.

Tunnel thêm header nên giảm effective MTU. MSS clamping có thể là workaround cho TCP trong một số mạng, nhưng không sửa UDP hay mọi packet; cần xác định overhead và xử lý nguyên nhân ICMP/policy.

## Tự kiểm tra

**Chặn ICMP tăng bảo mật mà không ảnh hưởng kết nối?** Có thể phá PMTUD và diagnostics.

**MSS clamping sửa mọi ứng dụng?** Không; chỉ tác động TCP MSS.

**MTU lớn nhất ở source là MTU của cả đường?** Không; PMTU là minimum trên path.

## Đọc tiếp

ICMP lỗi cung cấp thông tin cần thiết để sender thay đổi kích thước packet.

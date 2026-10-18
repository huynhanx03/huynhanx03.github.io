---
title: "IPv6 SLAAC, DHCPv6 và vòng đời địa chỉ"
category: "Network"
tags: ["network", "ipv6", "dhcp"]
description: "Phân biệt Router Advertisement, SLAAC, DHCPv6 stateful/stateless và cách host theo dõi địa chỉ IPv6."
updated: 2026-10-16
translationKey: "network/dhcpv6-slaac-and-address-lifecycle"
---

IPv6 host thường học prefix và default router qua Router Advertisement (RA) từ router. Tùy cờ trong RA, host có thể tự tạo địa chỉ bằng SLAAC, hỏi DHCPv6 để nhận thêm thông tin hoặc nhận địa chỉ qua DHCPv6 stateful. Đây là các cơ chế có thể cùng tồn tại.

## Vai trò của RA

RA quảng bá prefix, lifetime, MTU và thông tin router. Cờ M (managed) gợi ý dùng DHCPv6 để lấy địa chỉ; cờ O gợi ý dùng DHCPv6 cho thông tin khác. M/O không tự quyết định toàn bộ cấu hình: client policy, prefix flags và thông tin khác trong RA cũng có vai trò. Default router thường đến từ RA, không phải DHCPv6.

SLAAC tạo interface identifier theo cơ chế hiện đại có thể dùng địa chỉ tạm thời để giảm tracking. DHCPv6 stateful cấp địa chỉ và lease; DHCPv6 stateless có thể cung cấp DNS/search domain mà không quản lý địa chỉ. DHCPv6 thường không cấp default gateway; RA vẫn quan trọng.

DHCPv6 có SOLICIT/ADVERTISE/REQUEST/REPLY tương tự mục tiêu của DHCPv4 nhưng dùng message format riêng, không phải BOOTP. Client gửi tới multicast `ff02::1:2` để tìm server/relay trên link; UDP port client/server là 546/547. Một client nhận diện ổn định bằng DUID; IAID phân biệt association gắn với interface. IA_NA thường xin địa chỉ non-temporary, IA_TA xin temporary address, còn IA_PD xin prefix delegation cho router. Các ID là input cho việc quản lý binding, không nên coi là chứng minh danh tính mật mã.

## Vòng đời và kiểm tra

IPv6 address có preferred lifetime và valid lifetime. Địa chỉ deprecated vẫn có thể dùng cho kết nối hiện có nhưng không nên chọn cho kết nối mới; hết valid lifetime thì bị loại. DAD kiểm tra trùng địa chỉ trước khi dùng.

Địa chỉ mới bắt đầu ở trạng thái **tentative**: host dùng nó cho Neighbor Discovery cần thiết nhưng chưa dùng như địa chỉ bình thường. DAD gửi Neighbor Solicitation từ địa chỉ unspecified tới solicited-node multicast; nếu thấy node khác đang dùng candidate, địa chỉ bị từ chối. Khi DAD thành công, địa chỉ trở thành preferred. Hết preferred lifetime thì nó deprecated; địa chỉ deprecated có thể còn phục vụ flow hiện có tới khi valid lifetime hết.

SLAAC không cần DHCP server để dựng địa chỉ từ prefix trong RA. Stateless DHCPv6 có thể bổ sung DNS/search list; stateful DHCPv6 có thể quản lý địa chỉ/prefix. Nếu M/O tắt, client vẫn có thể dùng SLAAC; nếu M/O bật, hành vi cuối còn tùy client. Prefix Delegation là việc server cấp một prefix cho router để router chia cho mạng phía sau, khác với cấp một địa chỉ host.

Trên Linux, `ip -6 addr`, `ip -6 route`, `ip -6 neigh` và `rdisc6` (nếu có) giúp kiểm tra. Capture ICMPv6 RA/DHCPv6 cho thấy host thực nhận thông tin gì. Chặn toàn bộ ICMPv6 có thể phá Neighbor Discovery và Path MTU Discovery.

## Tự kiểm tra

**DHCPv6 thường cấp default route?** Thông thường default router đến qua RA.

**SLAAC và DHCPv6 loại trừ nhau?** Không.

**IPv6 có thể có nhiều địa chỉ trên một interface?** Có, với scope và lifetime khác nhau.

## Đọc tiếp

ICMPv6 vừa báo lỗi vừa hỗ trợ chức năng điều khiển như Neighbor Discovery.

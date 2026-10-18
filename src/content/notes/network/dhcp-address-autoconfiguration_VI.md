---
title: "DHCP và tự cấu hình địa chỉ mạng"
category: "Network"
tags: ["network", "dhcp", "ipv4", "ipv6"]
description: "Theo DHCP lease từ discovery tới renewal, và phân biệt DHCP với SLAAC cùng cấu hình tĩnh."
updated: 2026-10-16
translationKey: "network/dhcp-address-autoconfiguration"
---

Host mới vào mạng cần địa chỉ, prefix, gateway và thường cả DNS. DHCP tự động phân phối cấu hình theo lease; SLAAC giúp host IPv6 tự tạo địa chỉ từ Router Advertisement. Cấu hình tĩnh là lựa chọn khác nhưng cần quản trị nhất quán.

## DHCPv4 DORA

Quy trình thường được tóm bằng DORA:

1. **Discover:** client broadcast tìm DHCP server.
2. **Offer:** server đề nghị địa chỉ và option.
3. **Request:** client yêu cầu một offer.
4. **Acknowledgment:** server xác nhận lease.

DHCPv4 dùng UDP: client port 68, server port 67. Client chưa có địa chỉ nên DISCOVER/REQUEST ban đầu thường dùng source `0.0.0.0` và limited broadcast; transaction ID giúp ghép reply đúng request. Sau khi nhận một hay nhiều OFFER, client broadcast REQUEST kèm Server Identifier và Requested IP để các server khác biết offer nào được chọn. Server được chọn commit binding và trả ACK; nếu địa chỉ không còn hợp lệ, có thể trả NAK. Chỉ sau ACK mới được dùng lease; client thường kiểm tra xung đột địa chỉ và gửi DECLINE nếu phát hiện địa chỉ đang bị dùng.

DHCP mở rộng bố cục BOOTP cũ bằng options. Các option phổ biến mang subnet mask, router, DNS, domain/search list, lease và danh sách option client muốn nhận. Server có thể dùng client identifier để nhận diện client; MAC trong trường chaddr là cách truyền thống nhưng không phải lúc nào cũng là định danh bền vững hay xác thực. Server có thể cấp địa chỉ động từ pool, địa chỉ cố định theo cấu hình client, hoặc cấp tự động theo policy; cách gọi/chính sách cụ thể tùy sản phẩm.

Client có địa chỉ rồi có thể renew trực tiếp mà không chạy lại toàn bộ DORA; DHCPINFORM dùng khi cần cấu hình bổ sung nhưng địa chỉ đã được gán ngoài DHCP. DHCPRELEASE trả địa chỉ sớm, DHCPDECLINE báo địa chỉ xung đột.

## Lease và xung đột

Lease có thời hạn; client cố renew để giữ địa chỉ. Ở T1 client hỏi lại server cấp lease; nếu không liên lạc được đến T2, nó bước sang rebinding và có thể hỏi server khác. Nếu lease hết mà chưa được gia hạn, client phải ngừng dùng địa chỉ đó. T1/T2 mặc định trong sách là giá trị phổ biến theo DHCPv4 thời kỳ đó, không phải con số bắt buộc cho mọi server/client.

DHCP reservation gắn identity client với địa chỉ theo cấu hình server, nhưng không phải cơ chế xác thực mạnh. Nếu DHCP ACK cấp địa chỉ đang được host khác dùng, client có thể gửi DHCPDECLINE để báo server và thử lại theo policy.

## Không có DHCP server

IPv4 link-local autoconfiguration có thể tự chọn địa chỉ trong `169.254.0.0/16` và dùng ARP-based conflict detection trước khi nhận địa chỉ. Nó chỉ có ý nghĩa trên link cục bộ; tự có địa chỉ này không tạo default route, DNS hay Internet connectivity. IPv6 có link-local address và SLAAC/RA với các bước riêng.

DHCP server độc hại có thể cấp gateway/DNS sai. Network access control, segmentation và bảo vệ switch giảm rủi ro; TLS xác thực dịch vụ vẫn quan trọng.

## IPv6: SLAAC, stateless và stateful DHCPv6

RA quảng bá prefix/router; SLAAC tạo địa chỉ và duplicate address detection. DHCPv6 stateless có thể cung cấp thông tin bổ sung; stateful DHCPv6 quản lý cấp địa chỉ theo lease. Cờ trong RA cùng policy client ảnh hưởng lựa chọn. Không phải mạng IPv6 nào cũng có DHCPv6 server.

Trong DHCPv6, client/server identity thường dựa trên DUID; IAID phân biệt association/interface mà client xin cấu hình. Stateful DHCPv6 có thể cấp một hay nhiều địa chỉ hoặc prefix; **Prefix Delegation** thường cấp một prefix cho router khách hàng để router chia tiếp cho các subnet phía sau. DHCPv6 không thay Router Advertisement cho việc quảng bá default router. RA M/O flags là tín hiệu cấu hình, còn hành vi cuối cùng còn tùy client policy.

## DHCP và DNS cập nhật cùng nhau

DHCP có thể gửi DNS server/search domain cho client. Trong mạng nội bộ, DHCP server và DNS server đôi khi được phối hợp để cập nhật bản ghi tên ↔ địa chỉ khi lease được cấp hoặc đổi. Cách phối hợp có thể nằm trong một dịch vụ kết hợp hoặc dùng dynamic DNS; cần có policy để tránh client tự ghi tên tùy ý hoặc để lại bản ghi stale sau khi lease đổi. Chi tiết cập nhật DNS nằm ở [DNS update và quản lý zone](/vi/notes/network/dns-message-zones-and-updates/).

## Chẩn đoán

Kiểm tra interface link state, address/prefix, route, DNS và lease. Trên Linux, `ip addr`, `ip route`, `resolvectl`/công cụ tương ứng hiển thị các lớp khác nhau. Địa chỉ hợp lệ nhưng không có default route khác với DNS lỗi.

## Tóm tắt

- DHCP tự phân phối cấu hình có lease; DORA là quy trình phổ biến DHCPv4.
- Server Identifier giúp các server biết client đã chọn offer nào; transaction ID ghép reply với request.
- Relay cho phép DHCP server phục vụ nhiều subnet.
- Link-local IPv4 chỉ giúp giao tiếp trên link, không tự tạo gateway/DNS.
- Reservation không thay thế authentication/network security.
- SLAAC và DHCPv6 phối hợp theo RA/policy; DHCPv6 không luôn bắt buộc.
- Debug tách address, route, DNS và link state.

## Tự kiểm tra

**DHCP server cấp IP nghĩa DNS chắc chắn đúng?** Chưa; cần kiểm tra option và resolver.

**DHCP lease là địa chỉ vĩnh viễn?** Không; nó có hạn và cần renew.

**IPv6 cần DHCPv6 để có default gateway?** Thông thường gateway đến qua Router Advertisement, không phải DHCPv6.

## Đọc tiếp

Khi mạng lỗi hoặc MTU không khớp, ICMP đưa thông tin lỗi và chẩn đoán về host.

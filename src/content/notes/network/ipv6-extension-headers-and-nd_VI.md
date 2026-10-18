---
title: "IPv6 extension header, Router Advertisement và Neighbor Discovery"
category: "Network"
tags: ["network", "ipv6", "icmpv6", "neighbor discovery"]
description: "Theo extension header chain, RA/SLAAC và các kiểm tra neighbor trong một link IPv6."
updated: 2026-10-16
translationKey: "network/ipv6-extension-headers-and-nd"
---

IPv6 fixed header có kích thước 40 byte và chỉ giữ các trường thường cần để chuyển tiếp. Option/metadata khác có thể nằm trong extension headers, nối bằng Next Header; mỗi header chỉ tới loại header kế tiếp cho tới transport protocol hoặc `No Next Header`. Vì vậy khi đọc capture, cần lần theo cả chuỗi chứ không giả định TCP/UDP luôn nằm ngay sau base header.

## Extension headers

Các loại gồm Hop-by-Hop Options, Routing, Fragment, Destination Options và AH/ESP theo cơ chế liên quan. Hop-by-Hop Options được đặt ngay sau base header; các option dùng cấu trúc type-length-value và mã hóa cách node xử lý option không nhận biết (bỏ qua, loại packet, hoặc loại kèm ICMPv6 Parameter Problem tùy bit action). Extension header dài hoặc hiếm gặp có thể bị middlebox xử lý khác nhau, gây interoperability issue.

IPv4 options và IPv6 extension headers là khả năng protocol, không đồng nghĩa mọi mạng sẽ chuyển tiếp mọi biến thể. Nhưng firewall loại mù toàn bộ packet có extension header cũng có thể chặn chức năng hợp lệ; policy nên hiểu cụ thể loại header và traffic được phép.

IPv6 router không fragment packet transit. Nếu cần fragmentation, **source** chia datagram thành fragment bằng Fragment header; đích phải nhận đủ fragment để reassemble. Offset theo đơn vị 8 byte, và các fragment cùng datagram dùng Identification chung. Packet lớn nên dựa vào PMTUD/ICMPv6 Packet Too Big để chọn kích thước phù hợp, thay vì trông chờ router chia hộ.

Routing header cho phép một số kiểu xử lý định tuyến đặc biệt. Routing Header Type 0 (RH0) trong sách đã bị deprecated do có thể tạo vòng chuyển tiếp và khuếch đại traffic; đừng nhầm nó với cơ chế định tuyến IPv6 thông thường hay dùng ví dụ RH0 cũ như hướng dẫn triển khai hiện nay. IPv6 cũng có Jumbo Payload option cho payload vượt 65,535 byte trên môi trường phù hợp, nhưng đây là trường hợp chuyên biệt chứ không phải kích thước phổ biến của Internet.

## Router Advertisement

Router gửi RA với prefix, on-link flag, lifetime và thông tin router preference. Host dùng RA cho default route và có thể cấu hình địa chỉ qua SLAAC. Rogue RA trong LAN có thể quảng bá gateway/DNS sai; RA guard/switch policy và segment trust giúp phòng vệ.

## Neighbor Discovery

Neighbor Solicitation/Advertisement giải địa chỉ link-layer và DAD; Router Solicitation yêu cầu RA. Neighbor Unreachability Detection kiểm tra peer còn reachable. Các message dùng ICMPv6 type/code và multicast scope.

## Tóm tắt

- IPv6 extension header mở rộng fixed header theo chuỗi.
- Sender xử lý fragmentation; router báo Packet Too Big.
- RA quảng bá prefix/default router, có thể bị giả mạo trong link không bảo vệ.
- ND xử lý neighbor resolution, DAD và reachability.
- Chặn ICMPv6/extension header mù có thể phá kết nối.

## Tự kiểm tra

**IPv6 header luôn đúng 40 byte tính cả extension?** Base header là 40 byte; extension được nối thêm.

**Router IPv6 fragment khi MTU nhỏ?** Không.

**RA chỉ cung cấp DNS?** Nó có prefix/router/lifetime và flags; DNS có thể được cung cấp theo extension/config.

## Đọc tiếp

Để phân biệt neighbor, route và MTU failure, xem ICMP diagnostic workflow.

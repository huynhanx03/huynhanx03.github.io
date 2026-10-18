---
title: "PPPoE: tìm access concentrator và mở phiên PPP"
category: "Network"
tags: ["network", "pppoe", "ppp", "ethernet", "dsl"]
description: "Theo PPPoE từ discovery broadcast đến phiên PPP, xác thực thuê bao và cấu hình địa chỉ IP."
updated: 2026-10-16
translationKey: "network/pppoe-discovery-and-session"
---

**PPPoE** đưa phiên PPP qua Ethernet. Một ví dụ kinh điển là modem DSL chạy bridge: máy tính hoặc router của khách hàng tự tạo phiên PPP với access concentrator (AC) của nhà mạng. Khi đó thiết bị đầu cuối dùng PPP để xác thực và thương lượng cấu hình; modem bridge không nhất thiết tự làm router IP.

PPPoE có hai giai đoạn: **Discovery** tìm AC và tạo session; sau đó **Session** mang packet PPP thông thường. Vì có thêm encapsulation, giới hạn MTU cần được tính trên toàn đường và phải tương thích với thiết bị, tunnel và path phía sau.

## Giai đoạn Discovery

Client bắt đầu bằng **PADI** (Initiation) gửi Ethernet broadcast để hỏi có server PPPoE nào cung cấp service phù hợp không. Một hay nhiều AC có thể trả **PADO** (Offer) unicast. Client chọn offer rồi gửi **PADR** (Request) tới AC đã chọn. AC xác nhận bằng **PADS** (Session-confirmation) và cấp Session ID.

Thông điệp PADI/PADO/PADR/PADS mang các tag dạng type-length-value, chẳng hạn Service-Name và AC-Name. Host-Uniq giúp client ghép phản hồi với yêu cầu của nó; AC-Cookie có thể dùng để giảm một số dạng lạm dụng tài nguyên discovery. Tag là metadata của phiên, không phải bằng chứng xác thực thuê bao.

EtherType Ethernet `0x8863` dùng cho discovery; `0x8864` dùng cho PPP session. PADI ban đầu broadcast, các bước sau thường unicast giữa client và AC. Sau PADS, hai bên dùng Session ID đã chọn để phân biệt phiên trên Ethernet.

## Giai đoạn PPP Session

Khi session đã mở, payload Ethernet mang PPP packet. PPP chạy LCP để thương lượng link; nếu policy yêu cầu, hai đầu xác thực; sau đó IPCP và/hoặc IPv6CP cấu hình network layer. Có thể dùng thêm cơ chế PPP khác tùy dịch vụ và thiết bị.

Kết nối PPPoE thành công ở discovery chưa chứng minh client đã có địa chỉ IP hay route. Khi debug, tách các tầng:

1. Có nhận được PADO từ AC không?
2. PADR/PADS có hoàn tất và Session ID có được cấp không?
3. LCP có mở link và auth có thành công không?
4. IPCP/IPv6CP có thương lượng địa chỉ không?
5. Route, DNS, MTU và khả năng tới đích có hoạt động không?

Phiên kết thúc khi một bên gửi **PADT** (Termination), hoặc khi link nền bị ngắt. Lỗi ở discovery thường liên quan VLAN/bridge/service tag/AC; lỗi sau PADS có thể nằm ở PPP authentication hoặc IP configuration.

## Giới hạn và bảo mật

PPPoE đóng gói PPP trên Ethernet, không tự tạo mã hóa. Xác thực subscriber và bảo vệ dữ liệu là việc của các cơ chế PPP/IPsec/TLS hoặc kiến trúc nhà mạng khác. Nếu LCP chọn phương thức xác thực yếu, việc link lên không có nghĩa thông tin bí mật được bảo vệ tốt.

Encapsulation tiêu thụ một phần dung lượng frame khả dụng. Nếu interface, tunnel và upstream không thống nhất MTU, packet nhỏ có thể chạy nhưng packet lớn bị lỗi; cần kiểm tra PMTUD/ICMP phù hợp thay vì mặc định PPPoE đã đồng nghĩa với một MTU cụ thể trên mọi đường.

## Tóm tắt

- Discovery tìm AC và cấp Session ID qua PADI → PADO → PADR → PADS.
- Session mang PPP; LCP/authentication/IPCP/IPv6CP vẫn thực hiện như các bước PPP riêng.
- Ethernet dùng EtherType `0x8863` cho discovery và `0x8864` cho session.
- PADT hoặc link nền bị ngắt sẽ kết thúc phiên.
- PADS thành công chưa đủ để kết luận IP, route, DNS hay MTU hoạt động.

## Tự kiểm tra

**PADI có được gửi unicast tới AC đã biết không?** Thường không; client broadcast PADI để tìm offer.

**PADS nghĩa là IPCP đã cấp địa chỉ?** Không; PADS chỉ hoàn tất PPPoE discovery. PPP/LCP và NCP còn chạy sau đó.

**PPPoE tự mã hóa payload?** Không. Nó là encapsulation để mang PPP qua Ethernet.

## Đọc tiếp

Trong phiên PPP, [LCP, xác thực và NCP](/vi/notes/network/ppp-link-negotiation-and-encapsulation/) cấu hình link và IP.

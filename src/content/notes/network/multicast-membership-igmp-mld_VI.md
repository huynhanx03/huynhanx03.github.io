---
title: "IP multicast và quản lý membership IGMP/MLD"
category: "Network"
tags: ["network", "multicast", "igmp", "mld"]
description: "Theo dõi membership và source filter multicast trên LAN bằng IGMP/MLD; hiểu querier, snooping và timeout."
updated: 2026-10-16
translationKey: "network/multicast-membership-igmp-mld"
---

Địa chỉ multicast chỉ định **nhóm đích**, không chứa danh sách máy nhận. Ứng dụng đăng ký quan tâm tới group trên một interface; host cập nhật membership và source filter, còn router/switch dùng thông tin đó để quyết định nhánh nào cần nhận traffic. Cơ chế membership không tự định tuyến multicast xuyên mạng.

## IGMP và MLD đóng vai trò gì?

IPv4 dùng **IGMP**. IPv6 dùng **MLD**, được mang trong ICMPv6. Cả hai cho các host báo membership trên link để multicast router không cần gửi mọi group ra mọi interface. Router giữ trạng thái soft state: định kỳ hỏi, làm mới state khi nhận report và xóa state khi hết hạn.

IGMPv1/2 và MLDv1 chủ yếu biểu đạt quan tâm tới group. IGMPv3/MLDv2 thêm source filtering, cần thiết cho **Source-Specific Multicast (SSM)** và cũng biểu đạt các kiểu ASM. Các phiên bản mới có cơ chế tương thích khi phát hiện node/router cũ; vì vậy packet capture có thể thấy nhiều version cùng tồn tại.

## Host báo membership ra sao?

Khi ứng dụng join/leave group hoặc đổi tập nguồn, host có thể gửi report unsolicited để báo thay đổi. Router cũng gửi query định kỳ. Host không phải trả lời ngay: nó chọn một khoảng chờ ngẫu nhiên trong giới hạn query, để gom nhiều thay đổi vào một report và giảm burst. Với các version cũ, report suppression cho phép host nghe report cùng group từ host khác rồi bỏ report của mình; version mới không dựa vào suppression theo cùng cách.

IGMPv3/MLDv2 report có thể chứa nhiều **group records**. Mỗi record mô tả trạng thái hiện tại, đổi filter mode, hoặc thêm/bớt nguồn:

- **INCLUDE(S):** chỉ nhận traffic từ các nguồn trong tập S. Tập rỗng tương ứng không còn quan tâm group theo kiểu này.
- **EXCLUDE(S):** nhận từ các nguồn ngoài S. EXCLUDE với tập rỗng thường biểu thị join group từ bất kỳ nguồn nào.
- **ALLOW_NEW_SOURCES / BLOCK_OLD_SOURCES:** cập nhật danh sách nguồn mà không nhất thiết đổi mode.
- **CHANGE_TO_INCLUDE / CHANGE_TO_EXCLUDE:** chuyển giữa hai mode.

Semantics chính là include/exclude theo group; SSM thường dùng quan tâm cụ thể tới nguồn. Không nhầm membership của ứng dụng với trạng thái multicast routing toàn mạng.

## Router query, querier và timer

Query có ba kiểu: **general query** hỏi về mọi group; **group-specific query** kiểm tra một group; **group-and-source-specific query** kiểm tra tập nguồn cụ thể. Query đặc hiệu thường được dùng sau báo cáo thay đổi trước khi router dừng chuyển traffic, để xác nhận không còn listener cần luồng đó.

Nhiều multicast router có thể cùng nối một link, nhưng một **querier** chịu trách nhiệm gửi query định kỳ. Routers theo dõi query và bầu querier; trong cơ chế cơ bản được mô tả trong sách, địa chỉ IP thấp hơn thắng. Router dự phòng tiếp quản nếu không còn nghe query trong khoảng thời gian phù hợp. Chi tiết election/timer có thể khác theo phiên bản và implementation.

Các timer quyết định mức phản hồi nhanh và lượng control traffic: query interval, response interval, membership interval, last-member query interval/count, startup query và robustness variable. Tăng robustness giúp chịu mất packet tốt hơn nhưng sinh thêm report/query; giảm thời gian last-member làm leave nhanh hơn nhưng dễ xóa state nhầm nếu report bị mất. Con số trong sách (2012) là giá trị mặc định của protocol tại thời điểm đó, không phải cấu hình bắt buộc cho mọi mạng.

## IGMP/MLD snooping trên switch

Switch L2 có thể đọc IGMP/MLD report/query để ghi nhớ port nào có receiver cho group/source. Khi bật snooping đúng cách, multicast chỉ được chuyển tới port liên quan; nếu thiếu snooping hoặc querier, một số switch flood multicast trong VLAN hoặc làm mất state theo timeout. MLD snooping phải phân biệt MLD trong ICMPv6 với các loại ICMPv6 khác; không được chặn ND/PMTUD chỉ vì switch đang xử lý MLD.

Snooping không thay multicast router. Router membership biết group nào cần được forward qua các interface L3; switch snooping tối ưu nhánh L2 trong VLAN. Querier là cần thiết trên nhiều thiết bị để state snooping được refresh ổn định. Khi multicast bị mất, kiểm tra đồng thời host join, query/report, querier, bảng snooping và routing multicast.

## Robustness và bảo mật

IGMP/MLD dựa trên state và timer. Mất query/report có thể tạo một trong hai lỗi: traffic không mong muốn tiếp tục chảy, hoặc receiver hợp lệ không còn nhận được traffic. State-change report và query đặc hiệu có thể được retransmit; tham số robustness điều chỉnh đánh đổi độ bền với lượng control traffic.

Thiết bị độc hại trên link có thể join nhiều group để tiêu thụ bandwidth hoặc CPU, gửi query gây quá nhiều report, hay giả làm querier nếu triển khai cho phép. Kiểm soát membership, giới hạn group/source/rate theo khả năng thiết bị và bảo vệ access layer. Đây là control protocol trên link; phạm vi truy cập và lỗ hổng implementation quan trọng hơn việc chỉ chặn mọi multicast.

## Tóm tắt

- IGMP quản membership IPv4; MLD quản membership IPv6 qua ICMPv6.
- Membership gắn với interface và được duy trì như soft state.
- IGMPv3/MLDv2 thêm source filtering; include/exclude diễn đạt luồng muốn nhận.
- Querier hỏi định kỳ; router xác nhận leave bằng query đặc hiệu và dùng timer/retransmission.
- Switch snooping tối ưu port L2; router multicast vẫn đảm nhiệm chuyển tiếp L3.
- Kiểm tra query, report, querier, snooping và routing cùng nhau khi lỗi multicast.

## Tự kiểm tra

**Join group nghĩa là router Internet biết máy của tôi?** Không. Report chỉ cập nhật membership trên link; routing multicast xuyên mạng là cơ chế khác.

**MLD là protocol riêng ngang IGMP?** Mục đích tương tự, nhưng MLD là các message ICMPv6.

**Không thấy multicast ở port switch chứng minh app chưa join?** Chưa chắc; cần kiểm tra join trên host, VLAN/querier, snooping và trạng thái route.

## Đọc tiếp

Để phân biệt địa chỉ group với địa chỉ MAC thực tế trên LAN, xem [Broadcast, multicast và IGMP/MLD](/vi/notes/network/ip-multicast-broadcast/).

---
title: "Broadcast, multicast và IGMP/MLD"
category: "Network"
tags: ["network", "multicast", "broadcast", "igmp"]
description: "Phân biệt broadcast với multicast, đọc mapping IP-to-MAC và hiểu phạm vi chuyển tiếp trong LAN."
updated: 2026-10-16
translationKey: "network/ip-multicast-broadcast"
---

Unicast gửi tới một đích; broadcast IPv4 gửi tới mọi node trong broadcast domain; multicast gửi tới nhóm receiver đã quan tâm. Multicast giúp phân phối một luồng tới nhiều bên mà không cần sender tạo một bản riêng trên mỗi kết nối, nhưng cần quản lý membership và routing.

## Multicast group

IPv4 multicast dùng `224.0.0.0/4`; IPv6 dùng `ff00::/8`. Địa chỉ nhóm không phải địa chỉ host thông thường. Membership gắn với interface: một process có thể join cùng group trên nhiều interface hoặc chọn nguồn được nhận/bị loại. Process cũng có thể gửi tới group mà không join group đó.

Trên Ethernet, IP multicast được ánh xạ trực tiếp sang MAC multicast chứ không cần ARP cho từng thành viên. IPv4 dùng `01:00:5e` cộng 23 bit thấp của group address; do chỉ có 23 bit cho mapping, **32 địa chỉ IPv4 multicast khác nhau có thể rơi vào cùng một MAC**. IPv6 dùng `33:33` cộng 32 bit thấp; rất nhiều group IPv6 vì vậy cũng chia sẻ MAC. NIC có thể lọc MAC bằng bảng hữu hạn hoặc hash nên đôi khi frame không thuộc group IP vẫn được đưa lên stack để IP kiểm tra và loại. MAC multicast chỉ giúp nhận frame ở link layer; nó không chứng minh host đã join chính xác group IP.

IGMP cho IPv4 và MLD cho IPv6 giúp host/router trao đổi membership trên link. Switch snooping theo message để chỉ chuyển multicast tới cổng có receiver, nhưng behavior phụ thuộc thiết bị/cấu hình.

## Link-local và định tuyến multicast

Một số multicast scope chỉ tồn tại trong link; nhóm khác có phạm vi rộng hơn. Router multicast cần protocol/state để chuyển tiếp qua các mạng. Việc host join group trên LAN không tự đảm bảo có multicast routing end-to-end.

Trong **any-source multicast (ASM)**, receiver join một group và có thể nhận luồng từ nhiều sender. Trong **source-specific multicast (SSM)**, receiver chọn cặp nguồn + group, giúp xác định rõ luồng mong muốn và giảm một số phức tạp của ASM. Đây là semantics của membership/forwarding; bản thân địa chỉ group không đảm bảo Internet có multicast routing hay mọi router hỗ trợ.

IPv6 multicast address có field scope để giới hạn phạm vi, chẳng hạn node-local, link-local, organization hoặc global. IPv4 có các dải multicast và limited/directed broadcast riêng; directed broadcast thường bị chặn ở router vì có thể bị lợi dụng khuếch đại traffic. Đừng nhầm multicast với broadcast: group membership là điểm cốt lõi của multicast.

Multicast phổ biến trong discovery, streaming nội bộ và control protocol, nhưng Internet routing multicast không phổ biến như unicast. Nhiều ứng dụng dùng CDN hoặc application-layer replication thay thế.

## Broadcast trong IPv4

IPv4 có **limited broadcast** (`255.255.255.255`) cho link cục bộ và **subnet-directed broadcast** với phần host toàn bit 1. Broadcast Ethernet tới `ff:ff:ff:ff:ff:ff`; mọi NIC trong broadcast domain phải xem xét frame. Router thường không forward broadcast giữa các mạng; directed broadcast từ ngoài bị tắt ở nhiều thiết bị vì có thể khuếch đại phản hồi (smurf-style amplification). Gửi broadcast bằng socket thường cần ứng dụng bật cờ như `SO_BROADCAST`; điều này giúp tránh phát tán nhầm traffic.

Broadcast đơn giản và tiện khi chưa biết địa chỉ receiver, nhưng ảnh hưởng mọi host trong phạm vi. Multicast phức tạp hơn vì cần quản membership và forwarding state, đổi lại traffic chủ yếu tới link/host có listener. TCP là kết nối giữa hai endpoint unicast; broadcast/multicast thường được dùng với UDP hoặc ICMP, không phải TCP.

## Ai nhận được frame multicast?

Việc nhận diễn ra qua nhiều lớp: switch quyết định port nào nhận frame (có thể dùng IGMP/MLD snooping); NIC lọc destination MAC (có thể có false positive do hash/capacity); driver/IP kiểm tra group address; cuối cùng transport lọc port và socket membership/source filters. Vì mapping IP-to-MAC không duy nhất, việc NIC nhận frame không đồng nghĩa ứng dụng nhận datagram.

## Broadcast có giới hạn

Broadcast có thể tạo nhiều xử lý không cần thiết và thường không được router forward. IPv6 không có broadcast; các chức năng tương ứng dùng multicast hoặc anycast theo protocol. Giảm broadcast domain qua VLAN có thể kiểm soát phạm vi nhưng không tự giải quyết mọi vấn đề hiệu năng.

## Tóm tắt

- Unicast một đích; broadcast mọi node trong phạm vi; multicast nhóm receiver.
- IGMP/MLD theo dõi membership cho IPv4/IPv6.
- Switch snooping và router multicast cần hỗ trợ/cấu hình.
- Join group trên LAN không đồng nghĩa multicast được route toàn mạng.
- IPv6 dùng multicast thay cho broadcast.
- IP multicast-to-MAC mapping không duy nhất; NIC/stack tiếp tục lọc ở các lớp trên.
- IPv4 mapping dùng 23 bit thấp; IPv6 dùng 32 bit thấp, nên MAC collision là bình thường.
- Broadcast dễ triển khai nhưng làm mọi host trong phạm vi xử lý traffic; multicast cần membership state.

## Tự kiểm tra

**Multicast packet luôn được gửi tới mọi host như broadcast?** Không; mạng có thể lọc theo membership.

**IPv6 có broadcast address?** Không; protocol dùng multicast cho các chức năng liên quan.

**IGMP làm nhiệm vụ định tuyến multicast toàn Internet?** Không; IGMP quản lý membership trên link; routing là chức năng khác.

## Đọc tiếp

Sau IP và control plane, topic Transport Layer chuyển sang UDP/TCP và giao tiếp giữa process.

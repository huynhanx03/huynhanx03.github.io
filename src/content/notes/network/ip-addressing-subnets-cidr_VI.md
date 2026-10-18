---
title: "Địa chỉ IP, subnet và CIDR"
category: "Network"
tags: ["network", "ip", "subnet", "cidr"]
description: "Đọc prefix, xác định địa chỉ cùng mạng và hiểu địa chỉ interface khác địa chỉ network/broadcast."
updated: 2026-10-16
translationKey: "network/ip-addressing-subnets-cidr"
---

IP address gắn với interface và được diễn giải cùng prefix length. Prefix cho biết bao nhiêu bit đầu xác định network; phần còn lại phân biệt địa chỉ trong prefix. CIDR viết dạng `address/prefix`, chẳng hạn `192.0.2.17/24`.

## Tính prefix IPv4

IPv4 có 32 bit. Prefix `/24` giữ 24 bit network và còn 8 bit host. Subnet mask tương ứng `255.255.255.0`; network address của `192.0.2.17/24` là `192.0.2.0`, vì host bit được đặt về 0.

Prefix nhỏ hơn có nhiều bit host hơn và bao phủ phạm vi lớn hơn. Số địa chỉ host dùng được phụ thuộc prefix và quy ước; `/31` có thể dùng cho point-to-point theo RFC, `/32` biểu diễn một host route. Tránh quy tắc đơn giản “luôn trừ 2” cho mọi prefix.

### Class A/B/C là lịch sử, không dùng để suy prefix hiện nay

IPv4 từng chia unicast thành class A, B, C với ranh giới mặc định `/8`, `/16`, `/24`; class D dành cho multicast và class E được giữ lại. Kích thước block cố định khiến nhiều tổ chức bị cấp quá nhiều hoặc quá ít địa chỉ. Subnetting cho phép chia block cục bộ, còn VLSM cho phép subnet trong cùng site có prefix khác nhau. CIDR bỏ cách phân lớp này để cấp block theo nhu cầu và quảng bá prefix ra hệ thống định tuyến. Vì vậy, octet đầu tiên không cho biết subnet mask của một địa chỉ hiện nay.

## Cùng subnet hay cần router?

Host áp dụng mask/prefix lên địa chỉ đích để quyết định đích thuộc on-link prefix không. Nếu cùng link, nó cần tìm địa chỉ link-layer của peer rồi gửi frame trực tiếp. Nếu ngoài prefix, host tra route để chọn next hop, có thể là gateway của một route cụ thể hoặc default gateway. IP packet vẫn hướng tới IP cuối; default route chỉ dùng khi không có route phù hợp cụ thể hơn.

Ví dụ, host `192.0.2.10/24` muốn tới `192.0.2.80`: cùng `/24`, nên ARP tìm MAC của peer. Muốn tới `198.51.100.20`: ngoài prefix, host dùng route/default gateway và tìm MAC gateway.

## Private, public và special-use

Một số IPv4 prefix được dành cho private network (RFC1918), loopback, link-local, documentation và multicast. Private address không được định tuyến toàn cục như public address, nhưng có thể đi Internet qua NAT. Public/private không phải thuộc tính bảo mật: firewall policy vẫn cần cấu hình.

Địa chỉ còn mang **phạm vi sử dụng**. IPv4 có limited broadcast; IPv6 không có broadcast và dùng multicast cho các nhóm/hoạt động tương ứng. IPv6 có địa chỉ link-local chỉ dùng trên cùng link, unique-local cho phạm vi nội bộ và global unicast cho định tuyến toàn cầu theo policy. Một host thường có nhiều địa chỉ cùng lúc; không nên coi một địa chỉ là danh tính ổn định của người dùng.

IPv6 có 128 bit, dùng prefix notation tương tự. Link-local address chỉ có ý nghĩa trên link, global unicast có thể được định tuyến toàn cục; multicast thay cho nhiều trường hợp broadcast IPv4. Không nên rút gọn IPv6 thành “IPv4 dài hơn”; neighbor discovery, autoconfiguration và address selection cũng khác.

## Subnetting theo bài toán

Để chia prefix, xác định số mạng cần, số host mỗi mạng, yêu cầu tăng trưởng và các subnet được phép. Variable Length Subnet Mask cho phép dùng prefix khác nhau trong một tổ chức. Route aggregation gom prefix liên tiếp để giảm số entry, nhưng chỉ đúng khi các block thỏa điều kiện bit alignment.

Các prefix được phân bổ theo tầng quản lý: cơ quan điều phối toàn cầu ủy quyền cho registry khu vực, rồi tới ISP/tổ chức và cuối cùng là các mạng/interface. **Provider-aggregatable (PA)** thường dễ gộp vào prefix của ISP, giúp giảm route toàn cục, nhưng đổi ISP có thể phải đổi prefix. **Provider-independent (PI)** linh hoạt hơn khi đổi ISP, nhưng quảng bá độc lập có thể làm tăng số route và cần nhà mạng hỗ trợ. Multihoming vì thế phải cân bằng tính dự phòng, khả năng chuyển nhà mạng và tác động lên routing table; nhiều địa chỉ không tự tạo ra failover nếu policy/định tuyến chưa cấu hình.

**Anycast** dùng cùng một địa chỉ unicast được quảng bá từ nhiều vị trí; routing đưa gói tới một điểm phù hợp theo topology/policy, thường là điểm gần theo metric chứ không nhất thiết gần địa lý. Nó khác multicast, vốn giao dữ liệu tới các thành viên của một nhóm.

Sai prefix gây lỗi khó nhìn: host có thể nghĩ peer on-link rồi ARP vô ích, hoặc nghĩ peer ở xa và gửi gateway. Khi debug, kiểm tra địa chỉ, prefix, route và neighbor table cùng nhau.

## Tóm tắt

- IP address luôn cần prefix để suy ra network phạm vi.
- Cùng prefix thì gửi trực tiếp trên link; khác prefix thì dùng router.
- MAC next-hop và IP destination là hai địa chỉ khác vai trò.
- Private address cần NAT để truy cập Internet phổ biến, nhưng không tự bảo vệ host.
- IPv6 dùng địa chỉ 128 bit với prefix length và neighbor/autoconfig semantics riêng.

## Tự kiểm tra

**`192.0.2.17/24` có network address nào?** `192.0.2.0/24`.

**Gửi tới host ngoài subnet thì Ethernet destination là MAC của host cuối?** Thường là MAC của next-hop gateway trên link hiện tại.

**Private IP đồng nghĩa máy an toàn khỏi Internet?** Không; cần policy firewall và kiến trúc mạng.

## Đọc tiếp

Trước khi packet IP đi tới router, link layer cần chuyển frame trong LAN bằng Ethernet/Wi-Fi.

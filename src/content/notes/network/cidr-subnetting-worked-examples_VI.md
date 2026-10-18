---
title: "Subnet CIDR qua ví dụ tính địa chỉ"
category: "Network"
tags: ["network", "ip", "cidr", "subnetting"]
description: "Tính network prefix, phạm vi địa chỉ và kiểm tra cùng subnet bằng phép mask thay vì học thuộc mẹo."
updated: 2026-10-16
translationKey: "network/cidr-subnetting-worked-examples"
---

CIDR viết prefix length sau địa chỉ, chẳng hạn `/24`: số bit đầu dành cho network prefix. Phần bit còn lại phân biệt địa chỉ trong prefix. Cách tính bằng mask giúp xác định một đích có trực tiếp trên link hay phải đi qua router.

## Ví dụ IPv4 `/26`

`192.0.2.70/26` có 26 bit network và 6 bit host. Subnet mask là `255.255.255.192`; kích thước block ở octet cuối là `256 − 192 = 64`. Các network bắt đầu ở `.0`, `.64`, `.128`, `.192`, nên `.70` thuộc mạng `192.0.2.64/26`.

Trong mạng broadcast IPv4 thông thường này, `.64` là network address, `.127` là broadcast, và `.65` đến `.126` là địa chỉ host thường dùng. Một số prefix point-to-point hoặc cấu hình đặc biệt có quy tắc sử dụng khác; đừng áp máy móc công thức usable-host cho mọi môi trường.

## Cùng subnet hay cần router?

So sánh prefix bit của địa chỉ nguồn và đích theo mask. Nếu cùng prefix, host thường ARP trực tiếp cho đích trên IPv4. Nếu khác prefix, host gửi frame tới MAC của next-hop router. Default route chỉ được dùng khi không có route cụ thể hơn.

Trong thực tế kernel chọn route theo bảng route, prefix dài nhất, metric và policy rules; subnet mask của interface chỉ là một phần thông tin. `ip route get ADDRESS` cho biết quyết định thực tế trên Linux.

## IPv6

IPv6 dùng cùng ý tưởng prefix length, ví dụ `2001:db8:1::/64`. IPv6 không dùng broadcast; Neighbor Discovery thực hiện phân giải link-layer và nhiều chức năng control. `/64` phổ biến ở LAN để hỗ trợ SLAAC, nhưng route giữa site có thể dùng độ dài prefix khác.

## Tự kiểm tra

**`10.1.2.130/25` thuộc prefix nào?** Block size là 128, nên thuộc `10.1.2.128/25`.

**Hai host cùng lớp A/B/C thì chắc chắn cùng subnet?** Không; CIDR prefix quyết định.

**IPv6 có broadcast address?** Không.

## Đọc tiếp

Khi biết đích ngoài subnet, routing table và longest-prefix match chọn next hop.

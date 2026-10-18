---
title: "IPv4 fragmentation: identification, offset và reassembly"
category: "Network"
tags: ["network", "ipv4", "fragmentation", "mtu"]
description: "Giải mã fragment offset, MF/DF flag và các chi phí khi IP phải lắp lại datagram."
updated: 2026-10-16
translationKey: "network/ipv4-fragmentation-details"
---

IPv4 header có Identification, Flags và Fragment Offset để liên hệ các fragment của cùng datagram. Offset tính theo đơn vị 8 byte; mọi fragment trừ fragment cuối thường phải mang payload bội số 8 để offset biểu diễn được.

## DF và MF

DF (Don't Fragment) yêu cầu router không fragment packet; nếu packet quá MTU, router drop và có thể trả ICMP fragmentation-needed. MF (More Fragments) cho biết còn fragment sau; fragment cuối có MF=0. Offset cho biết vị trí payload trong datagram gốc.

Identification cùng source/destination/protocol giúp destination nhóm fragment; giá trị reuse không an toàn trong khoảng thời gian còn fragment cũ có thể gây ambiguity. Reassembly buffer có giới hạn và timeout.

## Fragmentation có rủi ro vận hành

Mất một fragment làm toàn datagram không thể tái dựng. Firewall/NAT phải xử lý fragment state; attacker có thể khai thác overlapping/teardrop-like edge cases nếu stack/filter không thống nhất. Nhiều network thiết kế tránh fragmentation bằng PMTUD/MSS adjustment.

## Tóm tắt

- IPv4 fragment dùng ID, MF, DF và offset tính theo block 8 byte.
- Reassembly diễn ra ở đích và cần buffer/timeout.
- Một fragment mất thường làm datagram gốc mất.
- Firewall/NAT xử lý fragment cần nhất quán.
- PMTUD giúp tránh fragment ngoài ý muốn.

## Tự kiểm tra

**Fragment offset tính theo byte trực tiếp?** Không, đơn vị 8 byte.

**Router reassemble mọi fragment rồi fragment lại ở mỗi hop?** Thông thường router forward fragment; reassembly ở destination.

**DF set nghĩa packet lớn vẫn tới đích?** Không; cần báo lỗi/PMTUD và sender giảm kích thước.

## Đọc tiếp

IPv6 thay đổi fragmentation và chuyển trách nhiệm sizing về sender.

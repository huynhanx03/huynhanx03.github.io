---
title: "IPv6: địa chỉ, scope và tự cấu hình"
category: "Network"
tags: ["network", "ipv6", "slaac", "addressing"]
description: "Đọc địa chỉ IPv6, phân biệt link-local/global/multicast và hiểu SLAAC cùng DHCPv6."
updated: 2026-10-16
translationKey: "network/ipv6-addressing-autoconfiguration"
---

IPv6 dùng địa chỉ 128 bit và prefix CIDR. Dạng rút gọn bỏ số 0 đầu mỗi hextet và dùng `::` một lần để thay chuỗi nhóm 0. Ví dụ `2001:db8:0:0:0:0:0:12` có thể viết `2001:db8::12`. Prefix `/64` thường dùng cho subnet LAN, nhưng có ngoại lệ theo loại link/kiến trúc.

## Các loại địa chỉ thường gặp

- **Global unicast:** có thể được định tuyến toàn cầu theo policy.
- **Link-local (`fe80::/10`):** chỉ có ý nghĩa trên link và thường tự xuất hiện trên interface IPv6.
- **Unique local (`fc00::/7`):** dùng nội bộ theo phạm vi; không tương đương public global address.
- **Multicast (`ff00::/8`):** gửi tới nhóm; IPv6 không dùng broadcast như IPv4.
- **Loopback (`::1`):** host tự giao tiếp.

Một interface có thể có nhiều địa chỉ cùng lúc, có scope và thời hạn khác nhau. Địa chỉ tạm thời/privacy address có thể thay đổi theo policy hệ điều hành.

Interface ID (IID) là phần nhận diện interface trong một số kiểu địa chỉ/prefix IPv6. Một cách lịch sử là biến MAC 48-bit thành modified EUI-64 bằng cách chèn `ff:fe` và đảo bit U/L; ví dụ trong sách minh họa cơ chế này. Không nên giả định mọi IPv6 address hiện nay lộ MAC theo cách đó: nhiều hệ điều hành dùng IID ổn định nhưng khó liên kết giữa mạng, IID ngẫu nhiên/tạm thời hoặc cơ chế khác để hạn chế tracking. Cách tạo IID còn phụ thuộc loại địa chỉ, phiên bản hệ điều hành và policy.

## Router Advertisement: router, prefix và các option

Host có thể gửi Router Solicitation để yêu cầu router trả Router Advertisement (RA), hoặc chờ RA định kỳ. RA quảng bá router lifetime (host có thể dùng router làm default next hop trong bao lâu), prefix và các tham số của link. Router lifetime bằng 0 có nghĩa router đó không được dùng làm default router; nó không tự vô hiệu các option prefix khác trong cùng RA.

Trong Prefix Information option, cờ **L** cho biết prefix có thể dùng cho on-link determination; cờ **A** cho biết prefix có thể dùng để tự cấu hình địa chỉ bằng SLAAC. Hai vai trò này độc lập. Valid lifetime giới hạn thời gian prefix/address còn hợp lệ; preferred lifetime ngắn hơn có thể khiến địa chỉ chuyển sang deprecated trước khi hết hạn hoàn toàn. Host không nên giả định “cùng prefix” đồng nghĩa on-link nếu không có thông tin xác nhận.

RA có thể mang MTU, route information, recursive DNS server (RDNSS) và DNS search list (DNSSL) nếu router/client hỗ trợ. Vì vậy khi IPv6 có địa chỉ nhưng không phân giải tên hoặc chọn route sai, hãy kiểm tra nội dung RA thật trong capture và policy của host, không chỉ nhìn cờ M/O. DHCPv6 có thể cấp thêm thông tin hoặc địa chỉ theo policy; default router thông thường vẫn được khám phá qua RA.

RS/RA là ICMPv6 Neighbor Discovery. ND message dùng Hop Limit 255 và receiver kiểm tra để giới hạn thông điệp vào link; đây không phải authentication. Rogue RA trong cùng LAN có thể quảng bá router/prefix/DNS giả, nên mạng doanh nghiệp có thể cần RA Guard hoặc biện pháp kiểm soát tương ứng trên switch và theo dõi router được phép.

IPv6 Neighbor Discovery dùng ICMPv6; chặn toàn bộ ICMPv6 thường làm hỏng chức năng nền tảng. Host cần biết prefix on-link, router và neighbor mapping để gửi packet.

## Dual stack và chuyển đổi

Dual stack chạy IPv4 và IPv6 song song. Client có thể nhận cả A và AAAA, rồi chọn đường theo thuật toán/hệ điều hành (Happy Eyeballs là một hướng giảm chờ khi một họ địa chỉ lỗi). Một ứng dụng “có IPv6 address” chưa chứng minh path IPv6 tới dịch vụ hoạt động.

NAT64/DNS64 và tunnel hỗ trợ một số kịch bản chuyển đổi nhưng tạo thêm phụ thuộc và giới hạn. Ưu tiên triển khai native dual-stack khi có thể, sau đó test DNS, firewall, MTU và telemetry của cả hai họ.

## Tóm tắt

- IPv6 address 128 bit; interface có thể giữ nhiều địa chỉ.
- Link-local, global, unique-local, multicast và loopback có scope khác.
- SLAAC dùng prefix từ RA; DHCPv6 tham gia theo cấu hình.
- Trong RA, cờ L nói prefix có thể dùng cho on-link; cờ A nói prefix có thể dùng cho SLAAC.
- RA có thể cung cấp default router, MTU, route và DNS option; từng lifetime áp dụng cho trường riêng.
- ND dựa trên ICMPv6; firewall cần cho phép thông điệp cần thiết.
- Dual stack cần kiểm tra cả DNS và end-to-end path IPv4/IPv6.

## Tự kiểm tra

**IPv6 bỏ broadcast nhưng không có multicast?** Ngược lại; multicast là cơ chế quan trọng.

**Mọi subnet IPv6 luôn phải `/64`?** `/64` rất phổ biến cho LAN/SLAAC, nhưng có ngoại lệ theo loại link.

**RA quảng bá được nghĩa internet IPv6 hoạt động?** Không; route, firewall, DNS và upstream còn phải đúng.

## Đọc tiếp

DHCPv4/DHCPv6 cùng SLAAC tự cấu hình các phần khác nhau; kế tiếp là lease và lifecycle địa chỉ.

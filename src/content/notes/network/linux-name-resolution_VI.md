---
title: "Name resolution trên Linux: NSS, resolv.conf và systemd-resolved"
category: "Network"
tags: ["linux", "dns", "resolver", "nss"]
description: "Theo getaddrinfo từ ứng dụng qua NSS tới DNS stub/caching resolver, hiểu vì sao dig và app có thể khác kết quả."
updated: 2026-10-16
translationKey: "network/linux-name-resolution"
---

Trên Linux, ứng dụng thường gọi `getaddrinfo()` thay vì tự gửi DNS packet. Name Service Switch (NSS) quy định nguồn tra cứu và thứ tự, có thể gồm `/etc/hosts`, DNS, mDNS hoặc module khác. Vì vậy `dig` query DNS trực tiếp có thể cho kết quả khác với ứng dụng dùng NSS.

## `/etc/resolv.conf`

File này thường khai báo nameserver và search domain. Trên máy dùng NetworkManager/systemd-resolved, nó có thể là symlink tới stub resolver hoặc file được sinh tự động. Sửa trực tiếp có thể bị ghi đè hoặc bỏ qua per-link/VPN DNS policy.

## systemd-resolved

`systemd-resolved` có thể cung cấp local stub, cache và DNS routing theo interface/domain. Split DNS gửi domain công ty qua VPN resolver còn public domain qua resolver khác. `resolvectl status` giúp xem link-specific DNS/search domains.

## Troubleshooting

So sánh `getent hosts name`, `dig name`, `/etc/hosts`, NSS config và resolver status. Kiểm tra IPv4/IPv6 A/AAAA, search suffix, cache TTL, VPN link selection và firewall UDP/TCP 53.

## Tóm tắt

- App thường đi qua NSS/getaddrinfo, không query DNS trực tiếp.
- `dig` và NSS lookup kiểm tra đường khác.
- resolv.conf có thể do service quản lý/symlink.
- Split DNS gắn policy theo interface/domain.
- Chẩn đoán tách host file, NSS, resolver, DNS server và connect.

## Tự kiểm tra

**`dig` thành công nghĩa `curl hostname` chắc chắn resolve giống?** Không; NSS, hosts, family selection và proxy khác.

**Sửa resolv.conf luôn bền?** Không nếu manager sinh lại.

**Search domain chỉ là DNS server?** Không; nó biến đổi cách thử tên ngắn.

## Đọc tiếp

Linux firewall xử lý packet theo hook/state; cấu hình route/DNS không tự mở port.

---
title: "Network interface và cấu hình mạng trên Linux"
category: "Network"
tags: ["linux", "network", "interface", "networkmanager"]
description: "Khám phá link/address/route, phân biệt cấu hình tạm với persistent và hiểu NetworkManager/systemd-networkd."
updated: 2026-10-16
translationKey: "network/linux-network-interfaces-and-config"
---

Kernel biểu diễn card mạng và interface logic; user-space manager cấu hình địa chỉ, route, DNS và trạng thái link. Lệnh `ip` đọc/chỉnh trạng thái kernel hiện tại, còn NetworkManager hoặc systemd-networkd có thể khôi phục cấu hình persistent khi boot/link đổi.

## Link, address, route

```sh
ip link
ip addr
ip route
ip -6 route
```

`ip link` xem trạng thái thiết bị/link; `ip addr` hiển thị address/prefix; `ip route` hiển thị route table. Link up không bảo đảm DHCP, gateway, DNS hay remote service đều hoạt động.

Lệnh `ip addr add`/`ip route add` thường thay đổi trạng thái runtime; cấu hình persistent nằm ở NetworkManager profiles, systemd-networkd files hoặc framework distro khác. Chỉnh runtime không nhất thiết sống qua reboot.

## NetworkManager và systemd-networkd

NetworkManager phù hợp desktop/server cần quản lý dynamic interface, Wi-Fi, VPN và profile; systemd-networkd quản lý cấu hình link dạng declarative ở nhiều server. Một máy có thể cài nhiều manager nhưng cần tránh cùng quản lý một interface theo cách xung đột.

DNS có thể do `systemd-resolved`, NetworkManager hoặc resolver file quản lý. `/etc/resolv.conf` có thể là symlink; sửa tay có thể bị manager ghi đè. Dùng công cụ đúng để xem DNS per-link/VPN.

## Chẩn đoán theo tầng

1. Link/carrier có up không?
2. Interface có address và prefix đúng không?
3. Route/default gateway chọn đúng không?
4. Neighbor resolution thành công không?
5. IP tới đích hoạt động không?
6. DNS resolve đúng không?
7. Port/service/application phản hồi không?

Ping có thể bị chặn; thử route lookup, neighbor state, resolver query và TCP connect theo policy. Không flush interface từ xa nếu không có console/rollback.

## Tóm tắt

- Kernel giữ trạng thái interface/address/route; manager lưu cấu hình persistent.
- Link up không chứng minh end-to-end network hoạt động.
- Runtime `ip` change có thể mất sau reboot.
- DNS resolver thường do service quản lý; sửa resolv.conf có thể bị ghi đè.
- Điều tra từ link tới application theo từng tầng.

## Tự kiểm tra

**`ip link` báo UP nghĩa server truy cập Internet?** Không.

**Sửa route bằng `ip` luôn persistent?** Không.

**`/etc/resolv.conf` luôn là file bình thường do người dùng quản?** Không; có thể được resolver manager sinh ra.

## Đọc tiếp

Network app cần socket/service lifecycle; xem cách daemon lắng nghe và được systemd quản lý.

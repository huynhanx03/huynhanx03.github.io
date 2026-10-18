---
title: "Container networking: namespace, bridge và port mapping"
category: "Network"
tags: ["network", "containers", "bridge", "nat"]
description: "Theo gói từ container network namespace qua veth/bridge tới host, NAT và mạng bên ngoài."
updated: 2026-10-16
translationKey: "network/container-networking"
---

Container có thể có network namespace riêng với interface, route và firewall view riêng. Runtime thường nối container tới host bằng veth pair, bridge hoặc overlay, rồi cấu hình route/NAT để đi ra ngoài. Chi tiết phụ thuộc runtime và CNI/plugin.

## Veth và bridge

Veth pair hoạt động như hai đầu cáp ảo: một đầu ở container namespace, đầu kia ở host. Bridge nối nhiều endpoint layer 2; host/router xử lý route giữa subnet và mạng ngoài. Container thường nhận IP private nội bộ.

Một bridge mặc định kiểu Docker có thể dùng bridge host như `docker0`, nối tới interface container bằng veth pair, rồi dùng NAT để container truy cập mạng ngoài. Hai namespace có thể cùng đặt tên interface là `eth0` mà vẫn là hai thiết bị khác nhau. Subnet container bị trùng với subnet VPN/LAN hiện có sẽ làm route mơ hồ; chọn dải không xung đột.

## NAT và port publishing

Outbound traffic có thể masquerade qua host address. Port publishing ánh xạ host IP/port vào container IP/port bằng NAT/proxy rule. Bind `127.0.0.1` trên host khác bind wildcard; firewall và IPv6 policy cần được xem riêng.

Container IP có thể thay đổi khi recreate; service discovery nên dựa tên/service network hoặc control plane thay vì hard-code IP lâu dài.

Rootless networking không nhất thiết có datapath giống bridge rootful: runtime có thể chuyển tiếp qua userspace helper, với giới hạn về port, inbound connectivity hoặc giao tiếp giữa container tùy công cụ/cấu hình. Khi debug, xác định runtime và mode trước rồi mới giả định có `docker0`, iptables/nftables rule hay veth trên host.

## Overlay và nhiều host

Overlay encapsulate packet giữa hosts để tạo mạng logic chung. Encapsulation làm giảm MTU hữu dụng; MTU mismatch có thể gây lỗi gói lớn. CNI plugin thiết lập interface/routes/policy; networking nhiều host cần route, encryption/identity và observability.

## Tóm tắt

- Network namespace tách interface/route view của container.
- Veth nối container với host bridge hoặc datapath khác.
- NAT/port publishing ánh xạ luồng; firewall vẫn kiểm soát truy cập.
- IP container có thể đổi; dùng service discovery.
- Overlay thêm header và ảnh hưởng MTU.

## Tự kiểm tra

**Container có IP private nghĩa không thể truy cập từ ngoài?** Port mapping/routing có thể expose nó.

**Port publish đồng nghĩa ứng dụng khỏe?** Không; cần health check.

**Overlay MTU luôn bằng interface vật lý?** Không; header encapsulation làm giảm payload hữu dụng.

## Đọc tiếp

Kết nối container dùng cùng nền TCP/IP: DNS/service discovery, route, NAT, firewall và MTU.

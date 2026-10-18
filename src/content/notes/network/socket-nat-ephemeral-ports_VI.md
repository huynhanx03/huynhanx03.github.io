---
title: "Ephemeral port, socket tuple và giới hạn kết nối"
category: "Network"
tags: ["network", "tcp", "socket", "nat"]
description: "Hiểu 4-tuple kết nối, ephemeral port allocation, TIME_WAIT và cạn cổng khi tạo quá nhiều kết nối ngắn hạn."
updated: 2026-10-16
translationKey: "network/socket-nat-ephemeral-ports"
---

TCP connection thường được nhận diện bằng protocol cùng source/destination IP và port (4-tuple). Client lấy ephemeral source port khi mở kết nối outbound; server lắng nghe trên destination port ổn định. Nhiều kết nối tới cùng server có thể cùng tồn tại nhờ source port/địa chỉ khác nhau.

## Phạm vi ephemeral port

Kernel chọn port từ range cấu hình, tránh một số port đã dùng hoặc reserved. Trên Linux xem `sysctl net.ipv4.ip_local_port_range`; `ss -tan` xem socket hiện tại. TIME_WAIT giữ tuple một thời gian sau đóng bình thường để tránh packet cũ nhầm kết nối mới.

## NAT và cạn tài nguyên

NAT có thể dịch source port để nhiều máy chia sẻ public IP. Giới hạn không chỉ là port count lý thuyết: mỗi mapping tiêu thụ conntrack state; timeout, traffic pattern và số đích ảnh hưởng mức tái sử dụng. Client mở kết nối ngắn hạn quá nhiều có thể gặp `EADDRNOTAVAIL` hoặc lỗi NAT port exhaustion.

Connection pooling, keep-alive ở tầng ứng dụng, giới hạn concurrency và backpressure thường giảm churn. Tăng ephemeral range có thể giúp trong một số trường hợp nhưng không sửa leak socket hay connection rate quá cao.

## Tự kiểm tra

**Mỗi kết nối TCP cần một port riêng trên server?** Không; server phân biệt theo tuple.

**NAT có port vô hạn?** Không.

**Tăng range port chắc chắn xử lý cạn kết nối?** Không.

## Đọc tiếp

TCP close state và TIME_WAIT giải thích vì sao tuple chưa thể được dùng lại ngay lập tức.

---
title: "TCP server: socket, bind, listen và backlog"
category: "Network"
tags: ["network", "tcp", "socket", "server"]
description: "Theo socket server từ bind/listen tới accept, phân biệt backlog với số connection đang xử lý."
updated: 2026-10-16
translationKey: "network/tcp-server-sockets-backlog"
---

TCP server tạo socket, bind địa chỉ/port, gọi listen rồi accept kết nối. Mỗi bước có lỗi riêng: port đã dùng, địa chỉ không tồn tại trên host, backlog đầy hoặc application không gọi accept đủ nhanh.

## Bind address và port

Server bind vào loopback chỉ nhận kết nối local; bind wildcard có thể lắng nghe trên nhiều interface; bind một IP local cụ thể giới hạn địa chỉ đích nhận được, không tự bảo đảm packet chỉ đi vào qua interface chứa IP đó. Ràng buộc thiết bị là cơ chế riêng, chẳng hạn `SO_BINDTODEVICE` trên Linux ([socket(7)](https://man7.org/linux/man-pages/man7/socket.7.html)). IPv4/IPv6 dual-stack behavior tùy socket option và OS. Firewall vẫn quyết định packet có được phép tới hay không.

Port number xác định endpoint process/service trong host, không phải firewall rule hay danh tính ứng dụng. Container/host networking có thể thêm port mapping.

## Listen queue và accept

Kernel giữ state cho connection handshake và kết nối đã hoàn tất đang chờ ứng dụng accept. Backlog là tham số liên quan queue, nhưng semantics và giới hạn chịu kernel setting; nó không phải số worker hay số connection tối đa toàn server.

Nếu application accept chậm, queue có thể đầy và client timeout/refuse. Tăng backlog chỉ hấp thụ burst tạm thời; nếu server xử lý không đủ nhanh, queue lại đầy. Cần đo accept rate, worker saturation và downstream latency.

## Socket lifecycle và resource

Socket/file descriptor cần được đóng; lỗi khi setup phải cleanup phần đã tạo. Server cần giới hạn connection, timeout, buffer và concurrency để client chậm không giữ tài nguyên vô hạn.

## Tóm tắt

- Server dùng socket, bind, listen, accept theo lifecycle.
- Bind address xác định interface/scope; wildcard và loopback khác nhau.
- Backlog là queue liên quan kết nối chờ, không phải worker count.
- Tăng backlog không giải quyết sustained overload.
- Giới hạn resource, timeout và cleanup là phần thiết kế server.

## Tự kiểm tra

**Bind `127.0.0.1` cho phép máy khác trong LAN truy cập?** Không; đó là loopback.

**Backlog 100 nghĩa server xử lý đúng 100 connection đồng thời?** Không.

**Port mở nghĩa ứng dụng khỏe?** Chỉ cho thấy endpoint có thể lắng nghe/nhận kết nối theo thời điểm; health cần kiểm tra cao hơn.

## Đọc tiếp

Topic **Network Services & Security** bàn về DNS, firewall và danh tính endpoint.

---
title: "DNS: phân giải tên qua resolver và hierarchy"
category: "Network"
tags: ["network", "dns", "name resolution"]
description: "Theo query từ stub resolver tới recursive resolver và authoritative server, rồi hiểu cache TTL."
updated: 2026-10-16
translationKey: "network/dns-resolution-and-caching"
---

DNS ánh xạ tên như `www.example.com` sang record, thường là địa chỉ IP. Nó là hệ thống phân tán theo cây, không phải một máy chủ trung tâm chứa toàn bộ Internet.

## Các vai trò resolver

Ứng dụng gọi stub resolver trên host, thường qua libc/system resolver API. Stub hỏi recursive resolver do mạng/VPN/OS cấu hình. Resolver có cache; nếu chưa có câu trả lời, nó tìm qua root, TLD rồi authoritative server cho zone phù hợp.

Recursive resolver trả kết quả cho client; authoritative server trả lời có thẩm quyền cho zone của nó. Vai trò có thể cùng đặt trên một hạ tầng nhưng khác semantics.

## Delegation và zone

Root biết nơi hỏi TLD; TLD biết nameserver authoritative của domain; authoritative server giữ record trong zone. NS delegation nối các tầng. Glue record giúp tìm IP nameserver nằm bên trong domain được delegate, tránh vòng phụ thuộc.

Zone không nhất thiết trùng domain; subdomain có thể được delegate riêng. DNS hierarchy cho phép quản trị phân tán và cache kết quả.

## Cache và TTL

Record có TTL chỉ định khoảng thời gian cache có thể giữ trước khi hỏi lại. Cache giảm latency và tải server, nhưng thay đổi record có thể chưa được mọi resolver nhìn thấy tới khi cache hết hạn. TTL không phải thời gian server bảo đảm record tồn tại vĩnh viễn.

Negative caching lưu câu trả lời “không tồn tại” theo quy tắc liên quan SOA/TTL. Vì thế, vừa tạo record mà client vẫn nhận NXDOMAIN có thể do cache âm.

## DNS không đồng nghĩa kết nối

DNS trả địa chỉ; TCP/UDP, route, firewall và TLS vẫn phải hoạt động. Một `dig` thành công không chứng minh port application mở. DNS load balancing có thể trả nhiều địa chỉ; client chọn địa chỉ theo policy riêng.

## Tóm tắt

- DNS là hierarchy root/TLD/authoritative với recursive resolver ở client path.
- Stub resolver hỏi recursive; authoritative server quản lý zone.
- Delegation cho phép phân quyền tên miền.
- TTL điều khiển cache và tạo độ trễ propagation.
- DNS thành công chỉ giải quyết tên; không xác nhận ứng dụng khỏe.

## Tự kiểm tra

**Recursive resolver luôn authoritative cho domain?** Không.

**Đổi A record thì mọi client thấy ngay?** Không; cache theo TTL và negative cache có thể giữ kết quả.

**DNS trả IP nghĩa TCP connect thành công?** Không; đó là các bước khác nhau.

## Đọc tiếp

DNS message có nhiều loại record, transport và cơ chế update; xem cấu trúc query/response.

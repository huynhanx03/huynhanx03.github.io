---
title: "UDP checksum, pseudo-header và IPv6"
category: "Network"
tags: ["network", "udp", "checksum", "ipv6"]
description: "Hiểu checksum UDP bao phủ header/payload và địa chỉ IP giả lập, cùng các khác biệt giữa IPv4/IPv6."
sources:
  - title: "User Datagram Protocol"
    url: "https://www.rfc-editor.org/rfc/rfc768.html"
  - title: "Internet Protocol, Version 6 (IPv6) Specification"
    url: "https://www.rfc-editor.org/rfc/rfc8200.html"
  - title: "IPv6 and UDP Checksums for Tunneled Packets"
    url: "https://www.rfc-editor.org/rfc/rfc6935.html"
  - title: "Requirements for Internet Hosts - Communication Layers (RFC 1122)"
    url: "https://www.rfc-editor.org/rfc/rfc1122.html"
  - title: "IP/ICMP Translation Algorithm (RFC 7915)"
    url: "https://www.rfc-editor.org/rfc/rfc7915.html"
  - title: "Stateful NAT64: Network Address and Protocol Translation from IPv6 Clients to IPv4 Servers (RFC 6146)"
    url: "https://www.rfc-editor.org/rfc/rfc6146.html"
updated: 2026-10-17
translationKey: "network/udp-checksum-and-ipv6"
---

UDP checksum phát hiện một số lỗi trong header UDP và payload. Để liên kết datagram với đúng endpoint IP, checksum còn tính pseudo-header gồm source/destination address, protocol/next-header và UDP length. Pseudo-header không được truyền như phần UDP riêng; nó tham gia tính checksum. Khi payload có số byte lẻ, phép tính coi như có một byte 0 ảo ở cuối; byte này không nằm trong packet. Length được đưa vào cả UDP header và phép tính checksum.

## IPv4 và IPv6

Trong IPv4, checksum UDP bằng 0 biểu thị sender không tính checksum. [RFC 1122](https://www.rfc-editor.org/rfc/rfc1122.html) yêu cầu host bật checksum mặc định; receiver phải loại datagram nếu checksum khác 0 nhưng không hợp lệ. Trong IPv6 checksum UDP bắt buộc trong đa số trường hợp, với ngoại lệ giới hạn được quy định cho một số tunnel. Điều này quan trọng vì IPv6 không có header checksum ở tầng IP.

Checksum Internet dùng one's-complement arithmetic. Nếu checksum tính ra `0x0000`, sender ghi `0xffff` để không nhầm với “không tính checksum” của UDP/IPv4. Khi NAT hoặc translator sửa địa chỉ/port, checksum UDP thường phải cập nhật vì pseudo-header hoặc UDP header đã thay đổi. Khi dịch IPv4 sang IPv6, translator không thể giữ nguyên UDP checksum bằng 0 vì IPv6 UDP yêu cầu checksum. Với datagram không fragment, translator có thể tính checksum mới hoặc loại datagram. Translator stateless không đủ dữ liệu để tính checksum cho các fragment riêng lẻ; RFC 7915 khuyến nghị loại fragment đầu tiên, còn NAT64 stateful có thể xử lý theo quy trình reassembly của RFC 6146.

## Checksum không phải integrity cryptographic

Checksum Internet dùng one's-complement arithmetic; nó phát hiện nhiều lỗi ngẫu nhiên nhưng collision có thể xảy ra và attacker có thể tính lại. MAC/TLS/DTLS cung cấp authentication/integrity chống attacker theo key/session.

## Tóm tắt

- UDP checksum bao gồm pseudo-header để ràng buộc segment với IP endpoints.
- UDP IPv4 có thể tắt checksum trong một số trường hợp; IPv6 thường yêu cầu.
- Checksum 0 trong UDP/IPv4 nghĩa là không được tính; checksum hợp lệ tính ra 0 được mã hóa thành `0xffff`.
- Checksum phát hiện lỗi truyền, không xác thực nguồn chống attacker.
- Checksum offload có thể ảnh hưởng host capture.

## Tự kiểm tra

**Pseudo-header được gửi thêm trong packet?** Không; nó chỉ tham gia phép tính checksum.

**Checksum đúng chứng minh datagram không bị giả mạo?** Không.

**IPv4/IPv6 UDP checksum semantics giống hoàn toàn?** Có khác biệt về bắt buộc/ngoại lệ.

## Đọc tiếp

TLS/DTLS bổ sung xác thực và mã hóa cho ứng dụng dùng UDP/TCP.

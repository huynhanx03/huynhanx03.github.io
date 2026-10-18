---
title: "TLS: xác minh tên certificate, SNI và trust chain"
category: "Network"
tags: ["network", "tls", "pki", "https"]
description: "Theo dõi cách client chọn certificate theo SNI và xác minh chain, hostname, thời hạn cùng trust store."
sources:
  - title: "Service Identity in TLS"
    url: "https://www.rfc-editor.org/rfc/rfc9525.html"
  - title: "The Transport Layer Security (TLS) Protocol Version 1.3"
    url: "https://www.rfc-editor.org/rfc/rfc8446.html"
  - title: "TLS Encrypted Client Hello"
    url: "https://www.rfc-editor.org/rfc/rfc9849.html"
updated: 2026-10-17
translationKey: "network/tls-certificate-name-validation-sni"
---

TLS mã hóa kênh, nhưng client cần xác minh mình đang nói chuyện với đúng server. Certificate chứa public key cùng danh tính được CA ký; client kiểm tra chuỗi chữ ký tới trust anchor đã cấu hình. Chỉ mã hóa mà không kiểm tra danh tính vẫn có thể mã hóa tới kẻ giả mạo.

## Trust chain và hostname

Client kiểm tra certificate còn hiệu lực, usage phù hợp, chain chữ ký hợp lệ và tên host nằm trong Subject Alternative Name. Trust store do OS, runtime hoặc ứng dụng quản lý; thiếu intermediate certificate có thể làm một client lỗi trong khi client khác tải intermediate được.

## SNI và nhiều virtual host

Một IP có thể phục vụ nhiều hostname. Client gửi Server Name Indication (SNI) trong ClientHello để server chọn certificate/config phù hợp. SNI chỉ giúp chọn cấu hình, không xác thực server.

Encrypted ClientHello (ECH) có thể mã hóa ClientHello bên trong, bao gồm hostname thật trong SNI, khi cả client và hạ tầng server hỗ trợ và cấu hình đúng. ClientHello bên ngoài vẫn chứa tên công khai dùng cho kết nối tới lớp server phía trước; ECH không che địa chỉ IP đích và không thay việc xác minh certificate. Server có thể xử lý ClientHello bên ngoài khi không chấp nhận ECH, nhưng client phải nhận biết việc bị từ chối và không dùng phiên đó để gửi application data; tùy policy, client có thể thử lại với ECH config mới hoặc kết thúc kết nối ([RFC 9849](https://www.rfc-editor.org/rfc/rfc9849.html)).

## Chẩn đoán

`openssl s_client -connect host:443 -servername host -showcerts` kiểm tra handshake và chain nhận được. `curl -v` cho lỗi hostname/CA; đừng giải quyết bằng tắt certificate verification trong production. Kiểm tra clock hệ thống vì sai thời gian làm certificate có vẻ chưa hiệu lực hoặc hết hạn.

## Tự kiểm tra

**Certificate được ký bởi CA nghĩa là hostname bất kỳ đều hợp lệ?** Không; client kiểm tra SAN.

**SNI chứng minh server đúng danh tính?** Không.

**Tắt verify là sửa TLS?** Không; nó bỏ xác thực server.

## Đọc tiếp

Handshake TLS thống nhất cipher/key rồi record layer bảo vệ dữ liệu ứng dụng.

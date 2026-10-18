---
title: "Hash, MAC, chữ ký và key agreement trong mạng"
category: "Network"
tags: ["network", "cryptography", "mac", "key exchange"]
description: "Phân biệt primitive mật mã và theo dõi cách protocol kết hợp chúng thành confidentiality, integrity và authentication."
updated: 2026-10-16
translationKey: "network/cryptographic-primitives-key-agreement"
---

Protocol bảo mật dùng các primitive mật mã có mục tiêu khác nhau. Chọn nhầm primitive hoặc tự ghép chúng thường nguy hiểm hơn việc dùng library protocol đã được kiểm chứng.

## Hash và MAC

Cryptographic hash ánh xạ bytes thành digest cố định, có tính chất khó tìm preimage/collision theo chuẩn an toàn. Hash công khai không chứng minh ai tạo dữ liệu. HMAC kết hợp hash với secret key để xác thực integrity giữa bên cùng key.

## Chữ ký số

Private key ký; public key verify. Chữ ký gắn dữ liệu với key nhưng danh tính chỉ đáng tin khi public key được xác thực qua certificate/PKI hoặc kênh tin cậy. Chữ ký không mã hóa payload.

## Key agreement và forward secrecy

Diffie-Hellman/ECDH cho hai bên tạo shared secret qua kênh công khai; handshake cần authenticate để chống MITM. Ephemeral key exchange xóa private ephemeral sau session có thể cung cấp forward secrecy. RSA key transport lịch sử khác semantics.

DH tự nó chỉ giúp hai phía cùng tạo secret; nếu public value không được xác thực, Mallory có thể đứng giữa tạo hai shared secret khác nhau và chuyển tiếp dữ liệu. Chữ ký/certificate hoặc một kênh tin cậy phải gắn exchange với đúng peer. Forward secrecy nói về ảnh hưởng của việc lộ key dài hạn về sau: nó không cứu session nếu endpoint hoặc ephemeral secret bị lộ ngay lúc đang dùng.

Protocol thường dùng hybrid cryptography: public-key operation xác thực hoặc thỏa thuận khóa phiên, sau đó symmetric cipher xử lý phần lớn dữ liệu vì nhanh hơn. KDF dẫn xuất các khóa theo mục đích từ secret đầu vào; không dùng trực tiếp một shared secret cho mọi chức năng mà không theo thiết kế protocol.

### Nonce, salt và nguồn ngẫu nhiên

Nonce giúp ràng buộc một lần trao đổi/transaction và freshness; salt làm các bản băm secret độc lập hơn, cản việc tái sử dụng bảng tra cứu giữa các giá trị giống nhau. Chúng không thay thế nhau và không tự bảo vệ nội dung. Key và challenge cần tính khó đoán khi protocol yêu cầu. Nonce không nhất thiết phải ngẫu nhiên: bộ đếm có thể phù hợp nếu bảo đảm không lặp dưới cùng key, như cách dựng nonce trong [RFC 5116](https://www.rfc-editor.org/rfc/rfc5116.html#section-3.2). Bộ sinh giả ngẫu nhiên dùng cho mô phỏng có thể dự đoán được và không phù hợp làm key.

## AEAD

Authenticated Encryption with Associated Data (AEAD) mã hóa payload và xác thực ciphertext cùng associated data như header. Nonce/IV uniqueness là yêu cầu quan trọng; reuse có thể làm lộ/giả mạo dữ liệu tùy cipher.

Hash mật mã và checksum/FCS giải quyết hai bài toán khác nhau. Checksum/CRC chủ yếu bắt lỗi truyền ngẫu nhiên; hash công khai tạo fingerprint nhưng ai cũng tính lại được nên không chứng minh nguồn gửi. MAC như HMAC cần secret chung và xác thực được thông điệp giữa bên giữ secret; chữ ký số dùng private key để ký và public key để kiểm tra, nhưng không mã hóa dữ liệu và cần xác thực public key. MAC không cho nonrepudiation khi nhiều bên cùng giữ secret.

Cipher suite chỉ định tổ hợp thuật toán theo phiên bản protocol. Suite TLS cũ có thể gộp key exchange, authentication và record protection; TLS 1.3 tách key exchange/chữ ký khỏi suite, vốn chọn AEAD và hash dùng với HKDF ([RFC 8446](https://www.rfc-editor.org/rfc/rfc8446.html#section-4.1.2)). Việc đổi primitive độc lập có thể giúp tiến hóa, nhưng hai đầu vẫn phải thống nhất suite tương thích. Ví dụ DES/3DES, SHA-1, tên suite, độ dài khóa và hướng dẫn triển khai trong sách 2012 là chi tiết theo thời điểm; không dùng làm khuyến nghị cấu hình hiện hành.

## Tóm tắt

- Hash phát hiện thay đổi nhưng không xác thực nguồn.
- MAC xác thực bằng secret chung; chữ ký dùng key pair.
- Key agreement cần authentication chống MITM.
- Ephemeral DH có thể cho forward secrecy.
- AEAD bảo vệ confidentiality/integrity; nonce phải dùng đúng.

## Tự kiểm tra

**SHA-256 digest chứng minh publisher?** Không nếu không có chữ ký/MAC trusted.

**ECDH tự xác thực server?** Không.

**AEAD nonce có thể reuse tùy tiện?** Không; tuân yêu cầu cipher.

## Đọc tiếp

TLS kết hợp certificate, key agreement, signature và AEAD theo protocol handshake.

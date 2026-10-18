---
title: "Nền tảng bảo mật mạng và TLS"
category: "Network"
tags: ["network", "security", "tls", "cryptography"]
description: "Phân biệt confidentiality, integrity, authentication và theo dõi TLS bảo vệ kết nối ứng dụng."
sources:
  - title: "DNS Queries over HTTPS (RFC 8484)"
    url: "https://www.rfc-editor.org/rfc/rfc8484.html"
  - title: "TLS Encrypted Client Hello (RFC 9849)"
    url: "https://www.rfc-editor.org/rfc/rfc9849.html"
updated: 2026-10-17
translationKey: "network/network-security-foundations-tls"
---

Bảo mật mạng không phải một tính chất duy nhất. Một giao thức có thể mã hóa nhưng không xác thực đúng peer, hoặc xác thực mà không bảo vệ dữ liệu sau khi session kết thúc. Trước khi chọn công nghệ, xác định attacker, tài sản cần bảo vệ và ranh giới tin cậy.

## Ba mục tiêu cơ bản

- **Confidentiality:** người ngoài không đọc được nội dung.
- **Integrity:** thay đổi trái phép được phát hiện.
- **Authentication:** xác định peer/key hoặc nguồn dữ liệu theo policy.

Ba mục tiêu kinh điển thường được gọi là CIA: confidentiality, integrity và availability. Authentication, authorization, nonrepudiation và auditability là các thuộc tính liên quan nhưng không đồng nghĩa với CIA. Ví dụ, mã hóa có thể giữ bí mật nội dung nhưng không chứng minh người nhận có quyền dùng nội dung đó; chữ ký có thể gắn thông điệp với một key nhưng không làm dịch vụ luôn sẵn sàng.

Khi phân tích threat model, tách tấn công thụ động và chủ động. Nghe lén có thể lộ nội dung chưa mã hóa. Ngay cả khi payload được mã hóa đúng, traffic analysis vẫn có thể lộ người liên lạc, thời điểm hoặc kích thước. Sửa, xóa, sắp xếp lại hay phát lại thông điệp là tấn công chủ động; DoS nhắm vào availability. Mã hóa giúp giảm một số rủi ro nhưng không che hết metadata, chặn mọi replay nếu protocol không kiểm freshness, hay ngăn flooding.

## Bảo mật ở các lớp khác nhau

Bảo vệ link-layer chỉ đi qua một hop; network-layer như IPsec có thể bảo vệ giữa các host/gateway; TLS bảo vệ một kết nối giữa các process/đầu cuối TLS; DNSSEC xác thực dữ liệu DNS theo chuỗi phân cấp; DKIM ký một số nội dung email theo miền gửi. Chọn lớp theo ranh giới cần tin cậy: khi proxy hoặc VPN gateway giải mã/kết thúc bảo vệ rồi chuyển tiếp, đoạn tiếp theo có thể cần lớp bảo vệ riêng.

Encryption đối xứng dùng cùng secret để mã hóa/giải mã; public-key cryptography hỗ trợ key agreement/chữ ký nhưng tốn chi phí hơn. Hash phát hiện thay đổi nhưng không xác thực nếu attacker thay cả hash; MAC dùng secret chung; chữ ký số xác nhận dữ liệu gắn với private key mà verifier tin cậy.

## TLS handshake khái quát

TLS client/server thương lượng phiên bản/cipher, xác thực certificate theo policy, thiết lập key rồi bảo vệ application data bằng record protocol. TLS 1.3 giảm số lượt handshake so với phiên bản cũ trong các trường hợp phổ biến. TLS không che IP đích, kích thước hay thời điểm packet. DoH mã hóa trao đổi DNS giữa client và resolver; ECH có thể che hostname thật trong SNI khỏi observer trên đường truyền nếu được triển khai đúng, nhưng vẫn để lộ địa chỉ IP và một số metadata ([RFC 8484](https://www.rfc-editor.org/rfc/rfc8484.html), [RFC 9849](https://www.rfc-editor.org/rfc/rfc9849.html)).

Địa chỉ nguồn trong IP header tự nó không chứng minh ai đã gửi packet: IP spoofing có thể làm giả địa chỉ này, khiến attribution và một số kiểu phản hồi trở nên khó khăn. Bảo vệ cần đặt ở nơi có đủ ngữ cảnh: lọc nguồn không hợp lệ ở biên mạng giúp giảm spoofing, còn TLS xác thực endpoint và bảo vệ nội dung theo chính sách certificate. Đây là hai lớp giải quyết hai vấn đề khác nhau; TLS không ngăn hết DoS/DDoS hoặc giả mạo ở những protocol không xác thực.

Certificate gắn public key với identity theo CA chain và hostname. Client cần validate chain, thời hạn, hostname và policy. Chấp nhận mọi certificate hoặc tắt verification phá mục tiêu chống MITM.

## Key, nonce và forward secrecy

Ephemeral Diffie-Hellman cho forward secrecy trong thiết kế phù hợp: lộ key dài hạn sau này không nhất thiết giải mã được session đã ghi trước. Nonce cần duy nhất theo yêu cầu cipher; random number yếu có thể phá bảo mật. Không tự thiết kế cipher/protocol.

## TLS giới hạn ở đâu?

TLS bảo vệ một hop từ client tới TLS endpoint. Nếu proxy/terminator giải mã rồi chuyển tiếp plaintext, cần bảo vệ hop tiếp theo. TLS không khắc phục application authorization, injection, compromised endpoint hoặc secret lưu không an toàn.

## Tóm tắt

- Confidentiality, integrity và authentication là mục tiêu khác nhau.
- Hash, MAC, chữ ký và encryption có semantics khác.
- TLS xác thực peer theo certificate policy rồi bảo vệ dữ liệu trên connection.
- Tắt certificate validation phá chống giả mạo server.
- TLS bảo vệ tới endpoint termination, không thay authorization/application security.

## Tự kiểm tra

**HTTPS nghĩa dữ liệu an toàn sau khi server giải mã?** Không; TLS bảo vệ khi truyền, app vẫn phải bảo vệ dữ liệu.

**Hash file chứng minh tác giả?** Không nếu không có MAC/chữ ký và trust anchor.

**TLS ngăn mọi MITM nếu client bỏ verify?** Không.

## Đọc tiếp

IPsec bảo vệ traffic ở tầng IP; EAP/802.1X kiểm soát truy cập vào LAN.

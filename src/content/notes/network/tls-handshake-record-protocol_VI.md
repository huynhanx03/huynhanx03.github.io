---
title: "TLS handshake và record protocol"
category: "Network"
tags: ["network", "tls", "handshake", "https"]
description: "Theo ClientHello/ServerHello, certificate, key derivation và record encryption; phân biệt TLS 1.2 với 1.3."
sources:
  - title: "The Transport Layer Security (TLS) Protocol Version 1.3 (RFC 8446)"
    url: "https://www.rfc-editor.org/rfc/rfc8446.html"
  - title: "Datagram Transport Layer Security Version 1.2 (RFC 6347)"
    url: "https://www.rfc-editor.org/rfc/rfc6347.html"
  - title: "The Datagram Transport Layer Security (DTLS) Protocol Version 1.3 (RFC 9147)"
    url: "https://www.rfc-editor.org/rfc/rfc9147.html"
updated: 2026-10-17
translationKey: "network/tls-handshake-record-protocol"
---

TLS thiết lập security parameters rồi bảo vệ application bytes trong record protocol. TLS 1.2 và TLS 1.3 có handshake/message flow khác nhau; không nên gộp mọi phiên bản thành một trình tự duy nhất.

## Handshake khái quát TLS 1.3

Với handshake TLS 1.3 dùng certificate và ephemeral (EC)DHE đang xét, ClientHello nêu supported versions, cipher suites, key share và extensions; ServerHello chọn parameters và key share. Hai phía derive handshake/application traffic secrets; server certificate và CertificateVerify authenticate server, Finished xác nhận transcript theo key. Sau đó Application Data được bảo vệ bằng AEAD.

Với PSK, peer không nhất thiết gửi certificate/CertificateVerify; chế độ PSK-only còn có thể không dùng key share mới. Vì vậy không áp nguyên luồng certificate ở trên cho mọi handshake ([RFC 8446](https://www.rfc-editor.org/rfc/rfc8446.html#section-2.2)). Resumption/PSK có thể rút ngắn handshake; 0-RTT data có replay risk và chỉ an toàn với operation phù hợp/idempotent theo policy.

## TLS 1.2 khác gì?

TLS 1.2 hỗ trợ nhiều cipher/key exchange suites lịch sử và handshake thường nhiều round trip hơn; RSA key exchange legacy thiếu forward secrecy. Cấu hình modern thường ưu tiên ECDHE + AEAD suites. TLS 1.3 loại bỏ nhiều thuật toán/option legacy.

## Record protocol và metadata

Record chia dữ liệu thành chunk, bảo vệ confidentiality/integrity; TCP vẫn cung cấp stream bên dưới. TLS không che IP/port, packet size/timing, và certificate/name visibility phụ thuộc protocol extensions. TLS termination tại proxy tạo trust boundary mới.

Trong TLS 1.2, record layer phân loại handshake, alert, đổi trạng thái cipher và application data; mỗi chiều có read/write state. Record cắt dữ liệu thành mảnh có giới hạn protocol, nên boundary của message ứng dụng không được bảo toàn. Handshake chuẩn bị trạng thái mới rồi Finished xác nhận transcript trước khi application data được tin cậy. Trace và tên message cũ trong sách mô tả TLS 1.2; không áp nguyên trình tự đó cho TLS 1.3.

Renegotiation từng tạo rủi ro ghép prefix của kẻ tấn công với phiên hợp lệ nếu handshake mới không ràng buộc vào phiên trước. Bài học khái quát là mỗi lần thương lượng lại phải được channel-bound và transcript-authenticated; không bật legacy renegotiation tùy tiện.

DTLS điều chỉnh TLS cho datagram có thể mất, đảo thứ tự hoặc lặp; chi tiết handshake thay đổi theo phiên bản. DTLS 1.2 dùng epoch/sequence number ở record, retransmit handshake theo flight và dùng `HelloVerifyRequest` để gửi cookie kiểm tra client có nhận được phản hồi ở địa chỉ nguồn. DTLS 1.3 dựa trên TLS 1.3, dùng cookie extension trong `HelloRetryRequest` cùng cơ chế ACK/timer riêng. Cookie giúp chống DoS dùng địa chỉ nguồn giả, nhưng không ngăn client thật gửi quá nhiều yêu cầu ([RFC 6347](https://www.rfc-editor.org/rfc/rfc6347.html), [RFC 9147](https://www.rfc-editor.org/rfc/rfc9147.html)).

## Tóm tắt

- Handshake thương lượng algorithms/keys và authenticate peer.
- TLS 1.3 dùng key share/traffic secrets, TLS 1.2 có nhiều legacy suite hơn.
- Certificate chain và hostname validation thiết yếu.
- 0-RTT giảm latency nhưng cần replay-aware application semantics.
- Record bảo vệ application bytes, không che mọi metadata mạng.

## Tự kiểm tra

**TLS 1.3 0-RTT phù hợp mọi POST?** Không; replay risk.

**TLS bảo vệ dữ liệu sau khi proxy terminate?** Không trên hop tiếp theo nếu chưa mã hóa lại.

**Certificate hợp lệ bỏ qua hostname check được không?** Không.

## Đọc tiếp

Certificate lifecycle và CA chain quyết định liệu server identity có được tin không.

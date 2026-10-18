---
title: "IPsec: IKE, ESP và transport/tunnel mode"
category: "Network"
tags: ["network", "ipsec", "ikev2", "esp", "vpn"]
description: "Theo Security Association từ IKEv2 tới ESP packet, hiểu mode, key lifetime và NAT traversal."
updated: 2026-10-16
translationKey: "network/ipsec-ike-esp-modes"
---

IPsec không phải một cipher đơn; đó là bộ protocol/policy bảo vệ packet IP. Security Association (SA) xác định SPI, algorithm, key, lifetime, replay window và hướng xử lý. Inbound/outbound SA thường riêng biệt.

Một IPsec SA cho AH/ESP là đơn hướng; bảo vệ hai chiều thường cần một cặp. IKE SA là trạng thái điều khiển hai chiều dùng để quản lý các CHILD_SA, nên không áp quy tắc đơn hướng ấy cho mọi loại SA ([RFC 7296](https://www.rfc-editor.org/rfc/rfc7296.html#section-1)). Endpoint có thể là host hoặc security gateway. Chính sách không bắt buộc bảo vệ mọi packet: Security Policy Database (SPD) quyết định packet được bypass, discard hay protect; Security Association Database (SAD) giữ trạng thái SA; Peer Authorization Database (PAD) gắn peer với cách xác thực được phép. Traffic selector như địa chỉ, protocol và port giúp xác định packet nào thuộc policy/SA.

## IKEv2

IKEv2 xác thực peers, thương lượng policy/algorithms và derive key cho child SA. Authentication có thể dùng certificate hoặc pre-shared key. Rekey tạo key mới trước khi lifetime hết; identity/mode sai khiến tunnel up một chiều hoặc traffic không match policy.

Trong trao đổi ban đầu, `IKE_SA_INIT` thương lượng suite, trao đổi nonce và DH; `IKE_AUTH` xác thực identity hai bên và thiết lập CHILD_SA đầu tiên. Sau đó `CREATE_CHILD_SA` có thể tạo/rekey SA, còn `INFORMATIONAL` chuyển trạng thái, báo lỗi hoặc xóa SA. IKE message ID giúp ghép request/response và phát hiện replay. Các danh sách thuật toán, số cổng và trace cụ thể trong sách phản ánh phiên bản tiêu chuẩn/implementation thời điểm đó; không dùng suite cũ của ví dụ làm cấu hình.

## ESP

ESP bảo vệ payload packet với confidentiality và/hoặc integrity/authentication theo suite. Transport mode giữ outer IP header của endpoints hiện tại và bảo vệ payload; tunnel mode bọc cả packet IP gốc trong packet mới, phù hợp gateway-to-gateway/remote access.

ESP mang SPI và sequence number; receiver có thể dùng anti-replay window để loại packet cũ/trùng. Anti-replay cần integrity/authentication để sequence number không thể bị sửa tùy ý. ESP có thể hoạt động integrity-only, nhưng mã hóa mà thiếu integrity là thiết kế nguy hiểm vì ciphertext có thể bị sửa mà không phát hiện. Tunnel mode che nội dung/header IP bên trong nhưng outer header, kích thước và thời điểm vẫn có thể tiết lộ metadata.

AH cung cấp integrity và xác thực nguồn ở mức IP, không mã hóa; vì kiểm tra các trường địa chỉ bất biến, NAT sửa địa chỉ sẽ làm kiểm tra hỏng. Đây là lý do ESP phổ biến hơn và AH thường khó triển khai qua NAT. Transport mode AH/ESP có giới hạn với fragment; tunnel và MTU cần được tính trong vận hành.

## NAT traversal và replay

NAT thay header/port; IKE NAT detection có thể chuyển ESP encapsulation qua UDP (thường UDP/4500). ESP sequence number và anti-replay window chống packet replay trong giới hạn cấu hình. Fragmentation/MTU có thể phức tạp khi tunnel thêm header.

NAT làm IPsec phức tạp vì AH bảo vệ địa chỉ IP; transport checksum của TCP/UDP cũng phụ thuộc pseudo-header địa chỉ; IKE identity/traffic selector có thể chứa địa chỉ private; và ESP không có TCP/UDP port để NAT demultiplex như thường lệ. NAT traversal dò sự hiện diện của NAT rồi bọc IKE/ESP qua UDP. Đây là cách tương thích cho một số topology, không biến mọi tổ hợp mode/protocol thành NAT-safe.

## Tóm tắt

- IKEv2 thương lượng/authenticate; ESP mang traffic được bảo vệ.
- SA có direction/state/lifetime và algorithm/key.
- Transport bảo vệ payload; tunnel bọc packet gốc trong packet mới.
- NAT-T đóng gói ESP qua UDP khi cần.
- Tunnel MTU, route, policy và rekey cần được kiểm tra cùng nhau.

## Tự kiểm tra

**IKE tunnel established nghĩa mọi route được bảo vệ?** Không; policy/selector/route có thể không match.

**ESP luôn mã hóa?** Có thể chọn mode/service; cần cấu hình suite.

**IPsec tunnel không ảnh hưởng MTU?** Sai; header thêm overhead.

## Đọc tiếp

802.1X/EAP kiểm soát truy cập link; IPsec bảo vệ packet path.

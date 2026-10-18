---
title: "UDP-Lite và checksum bao phủ một phần"
category: "Network"
tags: ["network", "udp", "checksum", "transport"]
description: "Tìm hiểu UDP-Lite cho ứng dụng chịu được một phần lỗi payload và vì sao nó không thay thế UDP phổ thông."
updated: 2026-10-16
translationKey: "network/udp-lite-partial-checksum"
---

UDP chuẩn chỉ có hai lựa chọn checksum: kiểm tra toàn bộ datagram hoặc (theo quy tắc IPv4) không có checksum. UDP-Lite là một transport riêng cho một số ứng dụng có thể sử dụng payload dù một phần bit bị lỗi, chẳng hạn một số kiểu media mã hóa chịu lỗi. Ứng dụng chọn số byte đầu được bảo vệ bằng checksum; header UDP-Lite luôn phải được bảo vệ.

## Checksum Coverage

UDP-Lite giữ header 8 byte tương tự UDP, nhưng trường **Checksum Coverage** thay vị trí của UDP Length. Giá trị 0 nghĩa là checksum bao phủ toàn bộ datagram. Giá trị từ 8 trở lên chỉ số byte tính từ đầu header UDP-Lite được checksum bảo vệ; 1–7 không hợp lệ vì header 8 byte phải được bảo vệ. UDP-Lite có protocol/Next Header number riêng (136), nên IP demultiplex nó khác UDP (17), dù dùng port number.

Payload nằm ngoài checksum coverage có thể được giao lên ứng dụng dù có lỗi bit ở đường truyền. Điều đó chỉ hữu ích nếu codec/application biết cách xử lý hỏng dữ liệu; ứng dụng phải thiết kế semantics và bảo vệ phần điều khiển quan trọng. Checksum coverage không mã hóa, không xác thực sender, và không tự sửa lỗi. Nó cũng không vô hiệu FCS ở link layer: link vẫn loại frame hỏng toàn bộ thì payload lỗi không tới được UDP-Lite. Lợi ích chịu lỗi cần cơ chế link cho phép chuyển phần lỗi không nhạy cảm lên trên ([RFC 3828](https://www.rfc-editor.org/rfc/rfc3828.html#section-4)).

## Tương thích và triển khai

Hai endpoint và socket API phải hỗ trợ UDP-Lite cùng coverage gửi/nhận. Router chỉ chuyển tiếp IP không nhất thiết phải hiểu transport này, nhưng firewall phải cho qua và NAT phải xử lý đúng protocol/mapping. Nó không tương thích tự động với service chỉ lắng nghe UDP. Một middlebox có thể chặn hoặc xử lý sai protocol lạ, nên không thể chỉ đổi trường coverage rồi gửi tới port UDP thông thường.

Đây là kỹ thuật chuyên biệt, không phải lựa chọn mặc định cho mọi streaming app. Trước khi dùng cần xác minh cả hai đầu hỗ trợ, middlebox cho qua, phần payload chịu lỗi thật sự, và integrity/authentication cần thiết được cung cấp riêng.

## Tóm tắt

- UDP-Lite cho phép checksum bao phủ một phần datagram; header luôn được bảo vệ.
- Coverage bằng 0 nghĩa là toàn datagram; giá trị 8 trở lên là số byte được bảo vệ.
- Dữ liệu không được checksum có thể tới ứng dụng dù bị lỗi; ứng dụng phải biết cách chịu lỗi.
- UDP-Lite dùng IP protocol number 136, còn UDP dùng 17; đây không phải số port.
- Cần hỗ trợ đầu-cuối và middlebox; checksum không phải authentication.

## Tự kiểm tra

**Coverage bằng 4 nghĩa chỉ bảo vệ 4 byte đầu?** Không hợp lệ; header 8 byte bắt buộc nằm trong checksum coverage.

**UDP-Lite có thể gửi tới server UDP thường cùng port?** Không nhất thiết. IP phân loại UDP-Lite bằng protocol number riêng và socket phải hỗ trợ nó.

## Đọc tiếp

Với UDP chuẩn, checksum luôn bao phủ toàn bộ datagram khi được bật; xem [UDP checksum và IPv6](/vi/notes/network/udp-checksum-and-ipv6/).

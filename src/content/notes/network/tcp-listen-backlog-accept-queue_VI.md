---
title: "TCP listen backlog, SYN queue và accept queue"
category: "Network"
tags: ["network", "tcp", "linux", "server"]
description: "Phân biệt hàng đợi bắt tay SYN với hàng đợi kết nối đã thiết lập chờ accept, cùng dấu hiệu quá tải server."
updated: 2026-10-16
translationKey: "network/tcp-listen-backlog-accept-queue"
---

Server gọi `listen()` để nhận kết nối TCP. Trước khi ứng dụng gọi `accept()`, kernel đã xử lý handshake và giữ state cho kết nối. Hai queue thường được nhắc tới là SYN queue (kết nối đang bắt tay) và accept queue (đã thiết lập, chờ ứng dụng nhận).

## Backlog

Backlog là gợi ý/giới hạn liên quan số kết nối hoàn tất đang chờ accept; giới hạn thực tế còn phụ thuộc kernel và cấu hình hệ thống như `somaxconn`. SYN backlog và cơ chế SYN cookies có tham số riêng. Tên tham số và chi tiết implementation thay đổi theo kernel.

Trong mô hình Berkeley sockets thường gặp, kernel xử lý SYN và hoàn tất three-way handshake trước khi ứng dụng nhận socket qua `accept()`. Vì vậy listener có thể đã trả lời client thành công trong lúc connection đã established vẫn đang chờ ứng dụng. Hệ điều hành thường quản lý riêng yêu cầu SYN chưa hoàn tất (SYN/request queue) và connection hoàn tất chờ `accept()` (accept queue), nhưng cách tính backlog và giới hạn thay đổi theo kernel.

Khi accept queue đầy, stack có thể trì hoãn phản hồi, bỏ SYN/ACK hoặc dùng hành vi khác; client có thể retransmit và trải qua timeout. Đây không nhất thiết có nghĩa là không có process listen. SYN cookies giúp giảm state phải cấp cho SYN chưa xác thực bằng cách mã hóa đủ thông tin vào SYN-ACK để khôi phục khi ACK hợp lệ trở lại; chúng không làm tăng tốc `accept()` hay sửa accept queue đã đầy. Một số option TCP ít có thể được thương lượng khi dùng cookie, nên đây là cơ chế bảo vệ có trade-off, không phải cách thay thế capacity planning.

Nếu ứng dụng không accept đủ nhanh, accept queue có thể đầy; client thấy retry hoặc timeout tùy cấu hình. Nếu SYN queue chịu flood hoặc nhiều SYN không hoàn tất, kernel dùng cơ chế bảo vệ và state timeout.

## Chẩn đoán

`ss -lnt` hiển thị listener; với socket listening, cột queue có thể cho biết số kết nối đang chờ và backlog giới hạn. `ss -s`, counters TCP trong `/proc/net/netstat`, log ứng dụng và metrics accept rate giúp xác định tầng nghẽn.

Tăng backlog chỉ hấp thụ burst lâu hơn; nó không làm application xử lý nhanh hơn. Cần xem worker count, event loop stall, CPU, file descriptor limit và thời gian accept.

## Tự kiểm tra

**Backlog lớn giải quyết server quá tải lâu dài?** Không.

**Ứng dụng phải `accept()` trước khi TCP handshake hoàn tất?** Thường không; kernel quản lý handshake trước đó.

**SYN queue và accept queue là một?** Không.

## Đọc tiếp

Socket server cần phối hợp backlog với worker pool, timeout và giới hạn tài nguyên process.

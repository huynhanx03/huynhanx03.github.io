---
title: "TCP đóng kết nối: FIN, TIME_WAIT và RST"
category: "Network"
tags: ["network", "tcp", "connection"]
description: "Theo dõi TCP half-close, handshake kết thúc, TIME_WAIT và reset để hiểu vì sao port chưa thể tái sử dụng ngay."
updated: 2026-10-16
translationKey: "network/tcp-fin-time-wait-and-reset"
---

TCP là full-duplex: mỗi chiều byte stream có thể kết thúc riêng. FIN báo bên gửi không còn dữ liệu ở chiều đó; ACK xác nhận byte/FIN. Vì hai chiều đóng độc lập, kết thúc một kết nối bình thường thường cần nhiều bước.

## FIN và half-close

Sau khi gửi FIN, một endpoint vẫn có thể nhận dữ liệu từ chiều còn lại. Ứng dụng có thể dùng half-close để báo “đã gửi xong request” nhưng tiếp tục đọc response. Kernel giữ state cho đến khi chiều còn lại kết thúc hoặc timeout.

## TIME_WAIT

Endpoint chủ động đóng thường đi vào TIME_WAIT để ACK lại FIN bị retransmit và bảo đảm segment cũ không bị nhầm với kết nối mới dùng cùng tuple. Thời lượng phụ thuộc TCP implementation. Nhiều socket TIME_WAIT không nhất thiết là leak; cần xem tốc độ kết nối mới, tuple reuse, ephemeral port và trạng thái server.

## RST

RST reset kết nối ngay, thường khi port không có listener, ứng dụng abort hoặc packet không khớp state. RST khác FIN: FIN là đóng có trình tự, còn reset báo không tiếp tục stream. Firewall/middlebox cũng có thể phát RST, nên packet capture tại hai đầu giúp phân biệt.

`ss -tan state time-wait` xem socket ở TIME_WAIT; `ss -ltnp` xem listener. Log ứng dụng cùng packet capture cho biết đóng do peer, process hay mạng.

## Tự kiểm tra

**FIN có nghĩa cả hai chiều lập tức đóng?** Không.

**TIME_WAIT luôn do server giữ?** Thường endpoint đóng chủ động giữ state, có thể là client hoặc server.

**RST tương đương FIN?** Không; reset ngắt ngay thay vì kết thúc có trình tự.

## Đọc tiếp

Khi kết nối đã thiết lập, keepalive và timeout của ứng dụng ảnh hưởng phát hiện peer mất.

---
title: "TCP state: half-close, simultaneous open và reset"
category: "Network"
tags: ["network", "tcp", "state machine", "rst"]
description: "Đi qua các transition ít gặp, incoming queue, half-open state và ý nghĩa của RST/TIME_WAIT."
updated: 2026-10-16
translationKey: "network/tcp-state-edge-cases"
---

TCP state machine gồm nhiều trạng thái vì hai hướng stream có thể đóng riêng, handshake có timeout và packet có thể tới trễ. Chỉ nhớ “SYN rồi ACK, sau đó FIN” chưa đủ để debug server thực tế.

## Half-close

Sau khi một bên gửi FIN, nó báo không còn dữ liệu theo hướng gửi. Nó vẫn có thể nhận bytes từ peer tới khi hướng kia đóng. Ứng dụng có thể dùng `shutdown(SHUT_WR)` rồi tiếp tục đọc response; đóng toàn socket quá sớm có thể làm mất dữ liệu logic.

## Simultaneous open/close

Hai endpoint có thể cùng gửi SYN trong một số protocol workflow, hoặc cùng bắt đầu đóng. State machine có transition cho các trường hợp này; không nên giả định client luôn active opener và server luôn passive listener.

## RST và half-open connection

RST hủy state ngay hoặc báo port/connection không hợp lệ. Server có thể reset khi ứng dụng abort socket; middlebox cũng có thể phát reset. Nếu host restart, peer còn giữ state cũ và gửi segment vào endpoint không tồn tại — đó là dạng half-open connection.

## TIME_WAIT và incoming backlog

TIME_WAIT bảo vệ tuple/sequence space sau active close. Listener có thể có queue cho handshake đang xử lý và queue connection đã established chờ `accept`; giới hạn và tên backlog tùy kernel. Queue đầy có thể làm SYN drop hoặc connection bị trì hoãn, nhưng tăng backlog không xử lý capacity sustained.

## Tóm tắt

- FIN đóng một hướng; half-close cho phép bên kia còn gửi.
- Simultaneous open/close có state transition hợp lệ.
- RST khác FIN: reset không graceful.
- TIME_WAIT giảm nhầm segment cũ và giữ cơ hội gửi ACK cuối.
- Backlog là queue kernel, không phải giới hạn worker/connection tổng.

## Tự kiểm tra

**Sau FIN, socket không thể nhận thêm byte?** Có thể còn nhận theo hướng ngược.

**RST luôn phát ra từ ứng dụng?** Có thể do kernel/middlebox.

**Backlog đầy luôn nghĩa process đang dùng hết worker?** Có thể là accept/handshake queue, cần xem cụ thể.

## Đọc tiếp

Timeout/retransmission giữ connection tiến triển khi ACK mất hoặc trễ.

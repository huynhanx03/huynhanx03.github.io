---
title: "UDP server: socket binding, peer và giới hạn hàng đợi"
category: "Network"
tags: ["network", "udp", "socket", "server"]
description: "Hiểu cách UDP socket nhận datagram theo local/remote address, wildcard bind, nhiều server và queue overflow."
updated: 2026-10-16
translationKey: "network/udp-server-socket-behavior"
---

Một UDP server không “listen” theo handshake như TCP. Nó bind một local port (và có thể bind một local IP cụ thể), rồi nhận datagram được IP/UDP chuyển tới socket phù hợp. Khi ứng dụng cần trả lời, kernel cung cấp source IP và source port của datagram đến; đây là địa chỉ peer để gửi response.

## Local bind và wildcard

Socket có thể bind vào một IP local cụ thể cùng port, hoặc bind wildcard (mọi địa chỉ phù hợp) cùng port. Bind cụ thể giới hạn địa chỉ IP đích, không tự ràng buộc interface nhận packet; ràng buộc thiết bị là cơ chế riêng, chẳng hạn `SO_BINDTODEVICE` trên Linux ([socket(7)](https://man7.org/linux/man-pages/man7/socket.7.html)); ví dụ bind loopback chỉ nhận datagram từ cùng host. Wildcard tiện khi host có nhiều địa chỉ, nhưng làm server có thể nhận request trên nhiều interface/scopes hơn dự định.

Khi cùng port có socket bind cụ thể và socket wildcard, hệ điều hành thường ưu tiên socket cụ thể khớp destination address rồi mới xét wildcard. Quy tắc chọn socket chi tiết phụ thuộc hệ điều hành và các socket option.

## Peer được phép và UDP connect

Socket UDP mặc định có thể nhận từ nhiều source IP/port. Một socket cũng có thể được “connect” tới một peer để kernel chỉ nhận/gửi với địa chỉ remote đó, chọn route/source phù hợp và trong một số hệ thống báo lỗi ICMP như Port Unreachable qua API. Đây chỉ là cấu hình endpoint cục bộ; không có SYN/ACK, không chứng minh peer tồn tại, và không biến UDP thành transport tin cậy.

## Nhiều socket cùng port

Thông thường một local IP/port trong một address family chỉ gắn với một endpoint. `SO_REUSEADDR`/`SO_REUSEPORT` có thể cho phép chia sẻ, nhưng semantics và phân phối datagram khác nhau giữa OS. Với broadcast/multicast, nhiều socket cùng group/port có thể cần nhận mỗi socket một bản sao. Với unicast, kernel thường chọn một socket, không broadcast bản sao tới mọi tiến trình; cách chọn phụ thuộc implementation. Đừng dựa vào một option như thể behavior giống nhau trên Linux, BSD và Windows.

## IPv4, IPv6 và port space

Server dual-stack có thể dùng một socket IPv6 wildcard nhận cả IPv4-mapped address, hoặc tách socket IPv4/IPv6. Việc port space có dùng chung hay không, và IPv6 socket có nhận IPv4 hay không, phụ thuộc hệ điều hành cùng `IPV6_V6ONLY`. Nếu chạy hai listener riêng, cần chọn behavior rõ ràng để tránh bind conflict hoặc vô tình mở dịch vụ trên cả hai họ địa chỉ.

## Queue, concurrency và congestion

Kernel thường giữ receive queue hữu hạn cho socket. Nếu ứng dụng xử lý chậm, burst datagram có thể làm queue đầy và kernel loại packet; UDP không có flow control để yêu cầu client giảm tốc, và ứng dụng có thể không nhận được thông báo chính xác về mọi packet bị drop. Queue ở router giữa đường cũng có thể đầy, gây loss ảnh hưởng nhiều luồng.

Server có thể dùng nhiều worker để tăng tốc xử lý, nhưng cần kiểm soát tổng queue, giới hạn request/peer, thời gian xử lý và bộ nhớ. Client/server UDP phải tự thiết kế rate limit, retry và congestion response phù hợp; retry dồn dập khi server quá tải làm tình hình nặng thêm. Dùng backoff, giới hạn retry, request ID và duplicate suppression khi semantics cần.

## Bảo mật và vận hành

UDP không có handshake để xác minh source address. Source IP có thể bị giả mạo nếu mạng không lọc ingress; phản hồi lớn cho request nhỏ có thể biến server thành amplifier trong DDoS. Xác thực request trước khi gửi dữ liệu lớn, giới hạn kích thước/tốc độ và không xem UDP checksum là authentication.

Khi debug, kiểm tra địa chỉ bind, interface/route, port, firewall, socket receive queue/drop counters, và packet capture ở cả hai đầu. ICMP Port Unreachable có thể xuất hiện khi không có socket phù hợp, nhưng firewall hoặc API UDP connected có thể làm thông báo không tới ứng dụng.

## Tóm tắt

- UDP server bind local IP/port; wildcard nhận trên nhiều địa chỉ local.
- UDP `connect` lọc một peer cục bộ nhưng không tạo handshake tin cậy.
- Reuse-port/address và IPv4/IPv6 dual-stack có semantics phụ thuộc OS.
- Receive queue hữu hạn; UDP không có flow control hay congestion control tự thân.
- Xác thực request, rate limit, backoff và chống amplification là trách nhiệm ứng dụng/hạ tầng.

## Tự kiểm tra

**`connect()` trên UDP chứng minh server đã chấp nhận kết nối?** Không. Nó không gửi handshake; thường chỉ gắn peer mặc định cho socket cục bộ.

**Hai process bind cùng UDP port thì mỗi process luôn nhận một bản unicast?** Không. Với unicast, hệ điều hành thường phân phối cho một endpoint; semantics phụ thuộc socket option và implementation.

**UDP drop vì receive queue đầy sẽ tự báo client để giảm tốc?** Không. UDP không có flow control; ứng dụng phải thiết kế phản hồi tải.

## Đọc tiếp

Để hiểu packet và checksum trước khi kernel chọn socket, xem [UDP: datagram nhỏ, semantics đơn giản](/vi/notes/network/udp-datagrams-and-design/).

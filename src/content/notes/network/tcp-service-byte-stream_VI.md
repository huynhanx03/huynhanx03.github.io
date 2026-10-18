---
title: "TCP service model: byte stream, port và reliability"
category: "Network"
tags: ["network", "tcp", "transport", "socket"]
description: "Hiểu TCP cung cấp byte stream có thứ tự, sequence/ACK và những gì reliability không bảo đảm cho ứng dụng."
sources:
  - title: "Transmission Control Protocol (TCP)"
    url: "https://www.rfc-editor.org/rfc/rfc9293.html"
  - title: "On the Implementation of the TCP Urgent Mechanism"
    url: "https://www.rfc-editor.org/rfc/rfc6093.html"
updated: 2026-10-17
translationKey: "network/tcp-service-byte-stream"
---

TCP tạo kết nối logic giữa hai endpoint và cung cấp byte stream có thứ tự, phát hiện mất mát rồi retransmit trong phạm vi kết nối. Ứng dụng ghi bytes; TCP có quyền chia/gộp chúng thành segment. Một lần `write()` không tương đương một packet hay một lần `read()` phía bên kia.

## Sequence number và acknowledgment

TCP đánh số byte trong stream. Receiver ACK byte tiếp theo mà nó mong muốn (cumulative ACK trong mô hình phổ biến); sender giữ dữ liệu chưa được xác nhận để có thể retransmit. Sequence number là modulo 32-bit và connection quản lý ISN/window để phân biệt dữ liệu trong phiên.

ACK cho biết TCP stack peer nhận bytes theo protocol; nó không chứng minh ứng dụng đã parse, lưu database hay hoàn tất công việc. Nếu cần xác nhận nghiệp vụ, cần response ở tầng application.

## Segment và header

TCP header chứa source/destination port, sequence, acknowledgment, flags, receive window, checksum và options. MSS, window scale, SACK và timestamps thương lượng/trao đổi thông tin bổ sung. Header có thể có options nên TCP header không luôn cố định 20 byte.

IP có thể fragment theo điều kiện, nhưng TCP stack thường chọn segment theo MSS/PMTU để tránh fragment. Packet capture ở host có thể thấy checksum/segment size khác wire do offload NIC (TSO/GSO/GRO); cần biết điểm capture.

## Byte stream không giữ message boundary

Nếu sender ghi `HELLO` rồi `WORLD`, receiver có thể đọc `HELLOWORLD`, `HEL` rồi `LOWORLD`, hoặc cách chia khác. Ứng dụng cần framing như length-prefix, delimiter hoặc fixed-size record. Dùng một `read` cho rằng “đọc đủ header” là lỗi phổ biến; phải lặp tới khi đủ bytes hoặc EOF/error.

## Reliability và giới hạn

TCP retransmit mất segment, loại duplicate và đưa dữ liệu lên theo thứ tự. Nếu một byte mất, bytes sau có thể chờ dù đã tới (head-of-line blocking trong stream). Kết nối có thể reset/timeout; ứng dụng cần timeout, retry policy và idempotency.

## ARQ: phát hiện lỗi rồi gửi lại

Một checksum có thể phát hiện nhiều lỗi bit nhưng thường không sửa được dữ liệu sai. Một cách khác là dùng error-correcting code để phục hồi lỗi trong phạm vi khả năng của mã; TCP chủ yếu dựa vào Automatic Repeat Request (ARQ): receiver ACK dữ liệu nhận hợp lệ, còn sender giữ bản sao chưa được xác nhận để gửi lại nếu cần. Nếu segment lỗi checksum, receiver bỏ nó; sender chỉ thấy thiếu ACK hoặc nhận ACK lặp và suy ra cần phục hồi.

Sequence number giúp phân biệt dữ liệu mới với bản duplicate, còn ACK bị mất có thể khiến sender gửi lại dữ liệu mà receiver đã nhận. Receiver nhận ra sequence trùng và không giao byte đó lần thứ hai cho ứng dụng. Trên đường IP nhiều hop, packet còn có thể mất, lặp hoặc đổi thứ tự; TCP tái lắp thành một byte stream theo thứ tự trước khi giao lên. Vì vậy độ tin cậy của TCP là kết quả của state ở hai endpoint, không phải thuộc tính mà IP hay Ethernet tự cung cấp xuyên suốt đường đi.

## Vì sao cần cửa sổ trượt

Stop-and-wait chỉ cho sender có một packet đang chờ ACK. Trong mô hình lý tưởng bỏ qua thời gian xử lý và truyền packet, throughput xấp xỉ kích thước dữ liệu chia cho RTT; khi RTT lớn, sender dành phần lớn thời gian chờ. Sliding window cho phép có nhiều byte chưa được ACK trên đường cùng lúc; khi ACK tiến lên, cửa sổ trượt và giải phóng buffer gửi. Kích thước cửa sổ hữu ích bị ràng buộc bởi cả khả năng nhận của peer lẫn tình trạng mạng: receive window thực hiện flow control, còn congestion window thuộc congestion control. Hai giới hạn này không thể thay thế cho nhau.

TCP dùng cumulative ACK: ACK số N xác nhận mọi byte trước N theo thứ tự liên tục và báo byte kế tiếp đang chờ. Nếu có lỗ hổng, ACK thường đứng lại tại đầu lỗ dù receiver có thể đã giữ dữ liệu tới sau; SACK bổ sung thông tin về các block ngoài thứ tự. ACK là tín hiệu của transport peer, không phải bảo đảm rằng process ứng dụng đã xử lý hoặc lưu dữ liệu bền vững.

## Retransmission timeout là ước lượng

RTT thay đổi theo hàng đợi, tải endpoint và đường đi. Timeout đặt quá ngắn gây retransmission thừa khi dữ liệu chỉ bị trễ; đặt quá dài làm phục hồi loss chậm và để đường truyền nhàn rỗi. TCP đo RTT từ ACK, ước lượng biến thiên và chọn RTO thích ứng; chi tiết thuật toán, backoff và giới hạn được tiêu chuẩn/implementation cập nhật theo thời gian. Không nên lấy ví dụ số trong một ấn bản sách cũ làm hằng số cấu hình hiện hành.

## TCP urgent data không phải kênh ngoài luồng thật sự

URG flag và Urgent Pointer đánh dấu ranh giới của dữ liệu urgent trong byte stream; theo mô hình TCP, dữ liệu vẫn nằm trong cùng sequence space chứ không đi qua một connection riêng. Trên API Berkeley sockets, `MSG_OOB` có thể đưa byte urgent ra một lần đọc riêng; `SO_OOBINLINE` yêu cầu giữ nó trong luồng đọc bình thường. Vì vậy cách ứng dụng nhìn thấy dữ liệu còn phụ thuộc API và implementation.

RFC 9293 quy định Urgent Pointer trỏ tới sequence number của byte ngay sau vùng urgent. RFC 6093 giải thích vì sao một số implementation và tài liệu cũ khác nhau về ranh giới này, đồng thời khuyến nghị ứng dụng mới không dùng cơ chế urgent vì khả năng tương thích với middlebox. Nếu cần kênh điều khiển riêng, protocol tầng ứng dụng hoặc connection riêng thường rõ ràng hơn.

## Tóm tắt

- TCP cung cấp byte stream có thứ tự, không message boundaries.
- Sequence/ACK cho phép phát hiện và retransmit mất bytes.
- TCP header có options; MSS/PMTU và offload ảnh hưởng capture.
- TCP ACK xác nhận transport receipt, không xác nhận nghiệp vụ.
- Reliable transport không loại bỏ timeout, reset hay retry semantics ứng dụng.

## Tự kiểm tra

**Một `write()` tương ứng một `read()`?** Không.

**TCP ACK nghĩa database peer đã commit?** Không; cần application-level confirmation.

**TCP giữ nguyên thứ tự byte sau khi retransmit?** Có trong stream; việc mất một phần có thể trì hoãn bytes sau.

## Đọc tiếp

Kết nối TCP được khởi tạo và đóng qua state machine; xem handshake và TIME_WAIT.

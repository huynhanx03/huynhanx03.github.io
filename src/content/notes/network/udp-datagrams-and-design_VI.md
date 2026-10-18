---
title: "UDP: datagram nhỏ, semantics đơn giản"
category: "Network"
tags: ["network", "udp", "transport"]
description: "Đọc UDP header và hiểu ứng dụng phải tự xử lý mất gói, thứ tự, giới hạn datagram và congestion."
updated: 2026-10-16
translationKey: "network/udp-datagrams-and-design"
---

UDP cung cấp datagram connectionless giữa các port. Nó giữ ranh giới message: một lần gửi datagram tạo một UDP datagram, khác TCP byte stream. UDP không bắt tay, không retransmit, không loại duplicate, không sắp thứ tự, không flow control và không congestion control. IP vẫn có thể chia datagram thành fragment bên dưới; ứng dụng nhận lại message nguyên vẹn sau IP reassembly, hoặc không nhận gì nếu thiếu fragment, trừ khi receive API cắt datagram vì buffer quá nhỏ.

## Header và checksum

Header UDP luôn 8 byte: source port, destination port, length và checksum (mỗi trường 16 bit). Source port có thể bằng 0 nếu sender không cần nhận trả lời; destination port giúp kernel demultiplex datagram tới socket. UDP và TCP có không gian port riêng dù một dịch vụ thường đăng ký cùng số port ở cả hai để tiện nhớ. Length bao gồm header và payload; tối thiểu là 8 byte, nên UDP payload rỗng vẫn hợp lệ. Trường length có vẻ dư thừa vì IP cũng có độ dài, nhưng giúp UDP kiểm tra phần datagram của chính nó. IPv6 jumbogram lớn hơn 65,535 byte là trường hợp đặc biệt: UDP Length có thể bằng 0 theo quy tắc jumbogram.

Checksum kiểm tra UDP header, payload và pseudo-header địa chỉ nguồn/đích cùng protocol/length theo IPv4/IPv6. Pseudo-header không được truyền như byte trong packet; nó ràng buộc datagram với đúng IP endpoints. Với payload lẻ byte, phép tính thêm một byte 0 ảo chỉ để tính checksum. Nếu kết quả checksum là 0, giá trị lưu trên wire là `0xffff`; với IPv4, checksum field 0 biểu thị sender không tính checksum. RFC yêu cầu host mặc định bật checksum UDP/IPv4 và xác minh mọi checksum khác 0; UDP/IPv6 checksum bắt buộc trong đa số trường hợp, trừ ngoại lệ chuyên biệt. Checksum không phải mã hóa hay xác thực chống attacker.

Port giúp kernel chuyển datagram tới socket phù hợp. UDP không tạo một kết nối trạng thái như TCP; ứng dụng có thể lọc peer address/port hoặc phục vụ nhiều client trên cùng socket.

## Mất, lặp và thứ tự

Datagram có thể mất, tới trễ, lặp hoặc đảo thứ tự. Nếu ứng dụng cần reliability, sequencing, retry, duplicate suppression hay congestion control, nó phải tự thiết kế hoặc dùng protocol phù hợp. Retry không giới hạn có thể gây congestion và nhân đôi side effect.

Một giao thức request/response tối thiểu có thể giữ bản tin đang chờ, gửi sequence ID, đặt timeout rồi retry nếu ACK chưa tới. ACK cũng có thể bị mất: receiver phải nhận ra ID trùng, gửi lại ACK nhưng không thực thi cùng thao tác lần nữa. ID và trạng thái receiver cần được giữ đủ lâu và xử lý khi khởi động lại; chỉ retry cùng payload không đảm bảo side effect xảy ra đúng một lần.

Timeout quá ngắn tạo retransmission thừa; quá dài làm người gọi chờ dù request đã mất. Khi nhiều client cùng retry vào server quá tải, timeout tăng dần (exponential backoff) và giới hạn retry giúp tránh khuếch đại tải. Nếu cần các semantics đã được triển khai rộng và kiểm tra kỹ, cân nhắc TCP/QUIC hoặc giao thức ứng dụng phù hợp thay vì tự viết lớp reliability sơ sài.

DNS thường dùng UDP cho query nhỏ nhưng có thể fallback TCP; QUIC dùng UDP làm transport substrate rồi tự cung cấp reliability/congestion control ở user space. “Dùng UDP” không nghĩa ứng dụng bỏ qua transport behavior.

UDP phù hợp khi ứng dụng cần message boundary và muốn tự quyết định retry/semantics, khi cần multicast/broadcast, hoặc khi một transport khác trên user space cung cấp congestion/reliability riêng. Overhead header thấp không tự đảm bảo nhanh hơn: ứng dụng có thể phải gánh handshake, retransmit, deduplication, rate control và bảo mật.

Một ví dụ lịch sử trong sách là **Teredo**: nó bọc IPv6 datagram bên trong UDP/IPv4 để đi qua một số mạng IPv4/NAT, dùng server để khám phá mapping và relay khi không có đường trực tiếp. Đây minh họa UDP như lớp encapsulation cho protocol khác, cùng loại vấn đề với VPN/NAT traversal. Teredo phụ thuộc hạ tầng và có các giới hạn bảo mật/vận hành; coi nó là ví dụ kiến trúc của giai đoạn chuyển IPv6, không phải khuyến nghị triển khai hiện nay.

## Kích thước và fragmentation

Datagram lớn có thể bị IP fragmentation; mất một fragment có thể làm mất cả datagram. Buffer ứng dụng truyền cho một lần receive quá nhỏ có thể cắt/truncate message theo API; queue nhận trong kernel bị đầy thường làm mất cả datagram, là vấn đề khác. Path MTU thay đổi theo đường; thiết kế nên giới hạn payload và xử lý lỗi/response rõ.

## Server design

Server cần bind đúng địa chỉ/port, đọc source IP/port để phản hồi, xử lý nhiều peer, giới hạn queue/buffer và chống amplification. Wildcard bind nhận nhiều địa chỉ local; bind cụ thể giới hạn địa chỉ IP đích được nhận; nó không tự tương đương ràng buộc thiết bị/interface. Socket UDP có thể được “connect” để lọc một peer mặc định và nhận lỗi ICMP qua API ở một số hệ thống, nhưng điều đó không tạo TCP handshake hay đảm bảo peer tồn tại. Source IP có thể giả mạo ở một số môi trường vì UDP connectionless; không gửi response lớn cho request nhỏ chưa xác thực.

## Tóm tắt

- UDP giữ datagram boundary nhưng không cung cấp reliability/order/congestion control.
- Header 8 byte có source/destination port, length và checksum; source port 0 có thể dùng khi không cần response.
- Port đưa datagram tới socket; UDP connect không phải TCP connection.
- Ứng dụng phải xử lý loss, retry, duplicates và congestion nếu cần.
- Datagram lớn có rủi ro IP fragmentation/truncation.
- Server cần chống amplification và giới hạn tài nguyên.

## Tự kiểm tra

**UDP không kết nối nghĩa packet không có IP source/destination?** Không; IP vẫn định tuyến datagram.

**UDP luôn nhanh hơn TCP?** Không; ứng dụng có thể phải xây lại tính năng và kết quả phụ thuộc workload.

**UDP checksum xác thực peer?** Không; checksum phát hiện lỗi truyền theo phạm vi, không chứng minh danh tính.

## Đọc tiếp

TCP biến packet thành byte stream tin cậy trong một kết nối; xem mô hình dịch vụ TCP.

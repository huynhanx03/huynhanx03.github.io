---
title: "IPv4 header: TTL, protocol, checksum và options"
category: "Network"
tags: ["network", "ipv4", "packet header"]
description: "Giải mã các trường IPv4 thường gặp trong capture và phân biệt header checksum với payload integrity."
updated: 2026-10-16
translationKey: "network/ipv4-header-and-options"
---

IPv4 packet bắt đầu bằng header có độ dài biến đổi. Header cơ bản 20 byte gồm version, IHL, DSCP/ECN, total length, identification, flags/fragment offset, TTL, protocol, header checksum và source/destination address.

Các số nhiều byte trong IP header đi theo **network byte order (big-endian)**. IHL đếm theo từ 32 bit, nên header tối đa 60 byte. Total Length tính toàn datagram IPv4 gồm header và payload; nó giúp phân biệt dữ liệu IP với padding mà Ethernet thêm để đạt frame tối thiểu.

## Các trường quan trọng khi debug

- **IHL:** độ dài header theo đơn vị 4 byte; options làm tăng chiều dài.
- **Total Length:** kích thước toàn IPv4 packet, gồm header và payload.
- **TTL:** giảm tại mỗi router; về 0 thì packet bị loại và có thể tạo ICMP Time Exceeded.
- **Protocol:** chỉ ra protocol được bọc trực tiếp như TCP, UDP, ICMP hoặc một IP-in-IP; đây không phải TCP/UDP port.
- **Identification/Flags/Fragment Offset:** liên hệ các fragment khi datagram bị phân mảnh; offset đo theo block 8 byte.
- **Header checksum:** phát hiện lỗi ở IPv4 header; router cập nhật vì TTL đổi.
- **DSCP/ECN:** DSCP chọn lớp/per-hop treatment theo policy; ECN có thể báo nghẽn mà không phải drop packet nếu endpoints và đường truyền cùng hỗ trợ.

DSCP là một nhãn, không phải bảo đảm băng thông hay độ trễ. Router có thể phân loại, xếp hàng hoặc remark traffic theo policy; hai mạng dọc đường có thể áp chính sách khác nhau. ECN dùng hai bit riêng: router có khả năng ECN có thể mark packet khi queue nghẽn, rồi transport như TCP phản hồi congestion mark theo cơ chế của nó. Chỉ bật ECN ở một đầu là chưa đủ để có tín hiệu đầu-cuối.

## Options

IPv4 options có thể gồm record route, timestamp, source route và option khác. Chúng làm header dài/khó xử lý hơn; nhiều router xử lý chậm hoặc drop option packet. Source routing cho sender chỉ định path có nguy cơ security và thường bị tắt.

Options được đệm để tổng header vẫn là bội số 4 byte; End of List và No Operation là option một byte dùng trong kết thúc/đệm. Nhiều option trong bảng của sách là lịch sử hoặc ít gặp; đừng mặc định rằng router hiện nay sẽ chấp nhận chúng. Router Alert là một ngoại lệ có mục đích yêu cầu xử lý thêm ở router, nhưng vẫn phụ thuộc hỗ trợ và policy của đường đi.

## Checksum phạm vi nào?

IPv4 header checksum không bảo vệ payload. TCP/UDP checksum và application cryptographic integrity có phạm vi khác. Nếu capture thấy checksum “bad” ở host send, NIC offload có thể chưa tính checksum tại điểm capture.

## Tóm tắt

- IPv4 header cơ bản 20 byte; options làm độ dài biến đổi.
- TTL/protocol/length/fragment fields giúp router xử lý packet.
- DSCP là gợi ý xử lý theo policy; ECN là tín hiệu congestion khi toàn đường hỗ trợ.
- Router giảm TTL nên phải cập nhật header checksum.
- Header checksum không bảo vệ payload.
- Options có thể tăng overhead và bị middlebox xử lý khác.

## Tự kiểm tra

**TTL tính bằng giây?** Không; nó giảm theo hop.

**IPv4 header checksum xác thực packet nguồn?** Không.

**Protocol field chứa TCP port?** Không; nó chỉ định transport/protocol kế tiếp.

## Đọc tiếp

IPv6 đổi header cố định và chuyển extension sang chuỗi header riêng.

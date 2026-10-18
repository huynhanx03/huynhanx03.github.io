---
title: "UDP datagram size, fragmentation và truncation"
category: "Network"
tags: ["network", "udp", "fragmentation", "mtu"]
description: "Tính payload UDP tối đa thực dụng, hiểu reassembly và tránh datagram lớn dễ mất toàn bộ."
updated: 2026-10-16
translationKey: "network/udp-fragmentation-path-mtu"
---

UDP giữ message boundary nhưng IP fragmentation biến một IP datagram chứa UDP message thành nhiều packet. Chỉ fragment đầu mang UDP header/port; mảnh sau mang offset và payload IP, không có port để rule lọc thông thường đọc trực tiếp. NAT/firewall phải liên hệ các fragment cùng datagram và xử lý nhất quán; fragment đến sai thứ tự vẫn có thể được reassemble ở đích.

IPv4 dùng Identification, Fragment Offset (đơn vị 8 byte) và More Fragments để nhóm/lắp lại fragment. Router IPv4 có thể fragment packet transit nếu DF không cấm; fragment không được ráp lại giữa đường. IPv6 router không fragment packet transit: chỉ source mới dùng Fragment header. Mất dù chỉ một fragment khiến toàn bộ UDP datagram không được giao; UDP không thể yêu cầu gửi riêng fragment bị mất.

Receiver phải giữ buffer cho fragment và có timeout để tránh chờ vô hạn các mảnh không bao giờ tới. Sau timeout, toàn bộ datagram bị bỏ; một số stack có thể phát ICMP reassembly timeout nhưng không nên trông chờ ứng dụng luôn nhận được thông báo. Các datagram thiếu fragment hoặc vượt giới hạn reassembly cũng tạo bề mặt tiêu thụ tài nguyên.

## Kích thước payload

Payload tối đa lý thuyết phụ thuộc IP version, header length và protocol length field, nhưng giới hạn implementation/socket buffer thường thấp hơn. Trên Ethernet MTU 1500, IPv4/UDP header cơ bản chiếm 28 bytes, nên payload một packet không fragment tối đa khoảng 1472 bytes; options/tunnel làm nhỏ hơn.

Đây là phép tính minh họa cho MTU 1500 và header cơ bản, không phải safe universal application size. Internet path MTU có thể nhỏ hơn.

## Path MTU Discovery với UDP

Vì ứng dụng thường tự chọn độ dài mỗi UDP send, nó cần tránh packet lớn hơn path MTU nếu muốn tránh IP fragmentation. PMTUD dùng ICMP Fragmentation Needed (IPv4) hoặc Packet Too Big (IPv6) để báo MTU của next hop nhỏ hơn. IP stack thường xử lý thông tin này và có thể lưu cache theo đích; socket/API có thể báo lỗi “message too long” hoặc cung cấp MTU cho ứng dụng, tùy hệ điều hành. Nếu nhiều datagram được gửi trước khi ICMP quay về, chúng đều có thể bị drop. Nếu firewall chặn ICMP cần thiết, sender không học được MTU và kết nối có thể rơi vào PMTU black hole.

PMTU thay đổi theo đường đi và theo thời gian; tunnel/encapsulation làm MTU hữu dụng nhỏ hơn do header thêm vào. Ứng dụng nên có giới hạn payload hợp lý, xử lý lỗi send và cân nhắc cơ chế phát hiện kích thước không phụ thuộc ICMP nếu protocol hỗ trợ. Đừng tắt PMTUD toàn cục chỉ để né một lỗi chưa được chẩn đoán.

Trước khi fragment được phát trên Ethernet, host vẫn cần phân giải MAC của next hop qua ARP/ND. Nếu cache chưa có mapping, một số packet/fragment có thể được xếp hàng trong lúc neighbor resolution diễn ra; queue và retry là chi tiết implementation. Fragmentation không bỏ qua bước link-layer delivery.

## Datagram truncation

Nếu buffer ứng dụng truyền cho một lần receive nhỏ hơn datagram, API có thể báo truncation hoặc trả phần đầu tùy syscall/runtime. Ứng dụng cần biết message đầy đủ chưa; parse phần bị cắt có thể tạo lỗi protocol hoặc security bug. Kích thước IP tối đa lý thuyết không đồng nghĩa với kích thước thực dụng: giới hạn socket/implementation và buffer phía nhận có thể thấp hơn nhiều. Trên IPv4 optionless, 65,535 byte IP length trừ 20-byte IP header và 8-byte UDP header cho tối đa lý thuyết 65,507 byte payload; IPv6 không có extension header hay jumbogram cho tối đa lý thuyết 65,527 byte payload. Không nên xem các mức này là payload an toàn qua Internet.

Điều này khác với kernel receive queue bị đầy, thường khiến cả datagram bị drop. [udp(7)](https://man7.org/linux/man-pages/man7/udp.7.html) mô tả truncation của buffer lần nhận trên Linux. Nếu UDP datagram lớn hơn buffer của lần đọc, nhiều API bỏ phần dư của datagram; cách báo truncation phụ thuộc OS/API. Kiểm tra return length/flags thay vì giả định lần đọc kế tiếp sẽ trả phần còn lại.

## Thiết kế an toàn

- Giữ datagram dưới path MTU thực dụng hoặc dùng protocol fragmentation ở application.
- Cho phép ICMP PTB/Fragmentation Needed cần thiết để PMTUD hoạt động.
- Thêm message ID/length/checksum/authentication nếu reassembly tầng app.
- Giới hạn tổng buffer và thời gian giữ fragment để chống memory exhaustion.
- Retry có backoff/congestion control nếu reliability cần.

UDP flood có thể làm cạn băng thông, socket queue và CPU; phản hồi lớn cho request nhỏ có thể tạo amplification nếu source bị giả mạo. Fragmentation làm tăng state/buffer cần reassembly và từng gây lỗi implementation. Tên tấn công lịch sử như Fraggle, teardrop và ping of death minh họa các lớp rủi ro, nhưng không nên mặc định hệ điều hành hiện đại vẫn có đúng lỗ hổng cũ. Phòng vệ bằng cập nhật stack, lọc source spoofing, rate/size limit, giới hạn reassembly và xác thực request trước phản hồi lớn.

## Tóm tắt

- IP fragmentation khiến toàn datagram phụ thuộc tất cả fragments.
- IPv4 có thể bị router fragment; IPv6 chỉ source fragment, và router transit không làm việc đó.
- Fragment ngoài đầu không mang UDP port; firewall/NAT phải xử lý reassembly/state nhất quán.
- Header/tunnel làm payload tối đa nhỏ hơn MTU.
- UDP receive buffer nhỏ có thể truncate message.
- UDP maximum lý thuyết không phải kích thước payload thực dụng.
- Application fragmentation cần giới hạn memory/time và xác thực.
- Đừng dựa vào con số UDP max lý thuyết làm payload Internet-safe.

## Tự kiểm tra

**Một trong 10 fragment mất thì app nhận 9/10 phần như stream?** Thường datagram không hoàn chỉnh bị loại khi reassembly timeout.

**MTU 1500 nghĩa UDP payload 1500?** Không; IP/UDP header chiếm chỗ.

**Ứng dụng luôn phát hiện truncation?** Tùy API; phải kiểm tra return flags/length semantics.

## Đọc tiếp

PMTUD và ICMP cần hoạt động để sender không phải fragment quá lớn.

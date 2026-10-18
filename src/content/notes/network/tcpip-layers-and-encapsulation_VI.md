---
title: "TCP/IP: các tầng và quá trình đóng gói dữ liệu"
category: "Network"
tags: ["network", "tcp/ip", "encapsulation", "protocol"]
description: "Theo byte từ ứng dụng qua transport, IP và link layer để hiểu mỗi tầng giải quyết bài toán nào."
updated: 2026-10-16
translationKey: "network/tcpip-layers-and-encapsulation"
---

Khi trình duyệt gửi một request, dữ liệu không đi thẳng từ hàm ứng dụng ra dây mạng. Mỗi tầng thêm thông tin điều khiển để tầng dưới biết giao dữ liệu cho ai và xử lý thế nào. Ở máy nhận, các header được đọc ngược lại để chuyển payload lên đúng ứng dụng.

## Bốn tầng TCP/IP để suy nghĩ

| Tầng | Câu hỏi chính | Ví dụ |
| --- | --- | --- |
| Application | Dữ liệu có ý nghĩa gì? | HTTP, DNS, SSH |
| Transport | Giao tiếp giữa process nào, với semantics nào? | TCP, UDP |
| Internet | Gói đi tới host/network nào? | IPv4, IPv6, ICMP |
| Link | Gửi frame tới node kế tiếp trên liên kết này ra sao? | Ethernet, Wi-Fi |

Mô hình OSI chia thành bảy tầng để phân tích. TCP/IP thường gộp một số tầng; không cần ép mỗi protocol vào một ô nếu nó phục vụ nhiều vai trò.

Mô hình năm tầng thường tách physical khỏi link; mô hình bốn tầng gộp chúng thành network access/link. Đây là các cách phân chia để suy nghĩ, không phải ranh giới vật lý bắt buộc trong mọi hệ thống. TCP/IP không có session/presentation layer chuẩn riêng; ứng dụng tự xử lý session, encoding hoặc chuyển đổi dữ liệu nếu cần.

## Đóng gói và tháo gói

Ứng dụng tạo message; transport thêm port/sequence/checksum tùy protocol để tạo segment/datagram; IP bọc thành packet với địa chỉ nguồn/đích; link layer bọc thành frame gửi trên liên kết hiện tại.

```text
Ethernet frame [ IP packet [ TCP segment [ HTTP bytes ] ] ]
```

Tên PDU thay đổi theo tài liệu/tầng. Ở router, frame cũ thường được tháo để đọc packet IP rồi bọc frame mới cho link tiếp theo; payload TCP/ứng dụng thường không bị router diễn giải. NAT/firewall/proxy có thể thay đổi hoặc chấm dứt một số phần theo vai trò của chúng.

Mỗi tầng còn **multiplex** nhiều loại dữ liệu dùng chung một tầng dưới, rồi **demultiplex** ở đầu nhận bằng identifier của nó: EtherType/field tương ứng phân biệt payload link, protocol number phân biệt payload IP như TCP/UDP/ICMP, còn port giúp transport giao dữ liệu cho socket phù hợp. Identifier của từng tầng giải quyết phạm vi khác nhau; port không thay địa chỉ IP và MAC không định tuyến xuyên Internet.

## Địa chỉ ở nhiều phạm vi

Ethernet MAC address dùng giao tiếp trên link cục bộ; IP address xác định interface trong mạng định tuyến; TCP/UDP port xác định endpoint transport trong host. Ba loại địa chỉ không thay thế nhau.

IP packet có địa chỉ đích cuối, nhưng frame gửi tới next hop trên link hiện tại. Trên Internet, router thay link header qua từng đoạn; địa chỉ IP thường giữ nguyên trừ khi có NAT/tunnel hoặc cơ chế khác.

## Host, router và switch không xử lý cùng một tầng

End host thường chạy ứng dụng, transport, IP và các giao thức link mà nó kết nối. Router cần IP forwarding cùng các giao thức link của những interface nó nối; switch Ethernet thông thường chuyển frame trong phạm vi link và không cần xử lý transport/application để làm việc đó. Đây là mô hình vai trò cơ bản: thiết bị thật có thể chạy thêm dịch vụ quản trị, firewall, NAT hoặc chức năng host. IP là giao thức đa chặng; link frame chỉ đi qua một chặng tới next hop.

Một số giao thức hỗ trợ được xếp giữa các tầng khi cần mô tả: ARP ánh xạ IPv4 sang địa chỉ link trên mạng đa truy cập; ICMP mang lỗi/thông tin điều khiển cho IP; ICMPv6 còn chứa Neighbor Discovery và chức năng cấu hình địa chỉ IPv6. Chúng thường được gọi là giao thức phụ trợ/adjunct, không phải transport ứng dụng thông thường.

TCP và UDP cùng nằm ở transport nhưng cung cấp hợp đồng khác nhau. TCP tạo byte stream tin cậy, sắp thứ tự và điều khiển tốc độ; UDP giữ ranh giới datagram nhưng bản thân không đảm bảo giao nhận hay thứ tự. Ứng dụng chọn semantics, không chỉ chọn “nhanh hay chậm”.

## Vì sao phân tầng hữu ích?

Ứng dụng có thể dùng TCP qua Ethernet hoặc Wi-Fi mà không viết lại toàn bộ logic. Router thay đổi tuyến và link mà không cần hiểu HTTP. Mỗi tầng cung cấp abstraction và protocol contract riêng.

Phân tầng không có nghĩa các tầng độc lập hoàn toàn. MTU ở link ảnh hưởng packet; latency/loss ở IP/link ảnh hưởng TCP; NAT ảnh hưởng kết nối; TLS chạy phía trên transport nhưng phụ thuộc xác thực tên host. Khi debug phải lần theo nhiều tầng.

## Tóm tắt

- Mỗi tầng thêm header để phục vụ địa chỉ hóa, giao nhận hoặc ngữ nghĩa ứng dụng.
- MAC, IP và port có phạm vi và vai trò khác nhau.
- Router thường thay frame qua từng link nhưng chuyển tiếp packet IP.
- Tầng giúp thay thế công nghệ độc lập tương đối, không xóa phụ thuộc xuyên tầng.

## Tự kiểm tra

**Ethernet frame chứa địa chỉ IP đích cuối ở header Ethernet?** Không; link header chứa địa chỉ cho liên kết hiện tại, IP header chứa địa chỉ mạng.

**TCP bảo đảm ứng dụng xử lý request đúng một lần?** TCP cung cấp byte stream đáng tin trong kết nối; exactly-once nghiệp vụ cần protocol ứng dụng.

**Router luôn giữ nguyên mọi header?** Không; frame thay theo link và middlebox có thể thay đổi packet/transport.

## Đọc tiếp

Để đi qua router, host cần địa chỉ IP và biết prefix của mạng. Xem bài về IPv4/IPv6, subnet và CIDR.

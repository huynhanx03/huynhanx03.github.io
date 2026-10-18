---
title: "Ethernet, Wi-Fi, switching và MTU"
category: "Network"
tags: ["network", "ethernet", "wifi", "switch", "mtu"]
description: "Hiểu frame trên LAN, học MAC learning của switch và liên hệ kích thước frame với MTU."
updated: 2026-10-16
translationKey: "network/ethernet-wifi-switching-mtu"
---

IP packet cần được chuyển trên một link cụ thể. Ethernet và Wi-Fi định nghĩa cách host đóng frame, nhận dạng node trên link và xử lý truy cập môi trường truyền. Switch nối các cổng LAN; router nối các mạng IP khác nhau.

## Ethernet frame và MAC address

Ethernet frame có source/destination MAC, type/length, payload và trailer kiểm tra lỗi frame. MAC address thường dài 48 bit, nhưng có địa chỉ multicast/broadcast và cơ chế local administration. MAC không phải địa chỉ định tuyến Internet.

Ethernet truyền trong LAN/VLAN; broadcast frame được phân phối trong broadcast domain theo topology. Router không chuyển tiếp broadcast Ethernet thông thường sang mọi mạng khác.

## Switch học địa chỉ

Switch quan sát source MAC trên mỗi cổng, ghi vào forwarding table. Khi biết destination MAC, nó gửi frame ra cổng tương ứng; nếu chưa biết, nó flood trong VLAN (trừ cổng vào) theo quy tắc switching. Entry hết hạn hoặc cập nhật khi host di chuyển.

Switch không đơn giản “định tuyến theo MAC toàn Internet”. VLAN chia miền layer 2; giao tiếp giữa VLAN cần router hoặc switch layer 3.

## Wi-Fi là link có chia sẻ môi trường

802.11 dùng cơ chế truy cập môi trường vô tuyến, association với access point, bảo mật link và frame có nhiều trường hơn Ethernet wired. Nhiễu, tín hiệu, roaming và airtime ảnh hưởng hiệu năng; tốc độ liên kết quảng cáo không bằng throughput ứng dụng.

Access point thường bridge traffic giữa wireless client và LAN, nhưng có thể áp isolation, VLAN hoặc captive portal. IP packet thường được bọc trong frame Wi-Fi để đi qua link vô tuyến; frame/link behavior khác Ethernet cáp.

## MTU và fragmentation

MTU là kích thước payload tối đa của link-layer protocol theo cấu hình. Ethernet phổ biến có IP MTU 1500 byte, nhưng VLAN/tunnel/PPP và mạng khác có thể thay đổi. Nếu packet lớn hơn MTU trên đường, IPv4 có thể fragment nếu cho phép; IPv6 router không fragment, sender cần Path MTU Discovery.

Tunnel thêm header nên giảm payload hữu dụng. MTU mismatch có thể làm small request chạy nhưng transfer lớn treo nếu ICMP báo lỗi bị chặn. Khi điều tra, kiểm tra MTU end-to-end và ICMP/PMTUD, không chỉ giảm MTU tùy tiện.

MTU của một link và **Path MTU** là hai phạm vi khác nhau. Trên đường qua nhiều mạng, Path MTU bị giới hạn bởi link có MTU nhỏ nhất tại thời điểm đó; đường đi có thể đổi sau sự cố định tuyến, và hai chiều không nhất thiết cùng MTU. Vì vậy, con số MTU của NIC đầu cuối không tự cho biết packet lớn nhất chắc chắn đi hết đường. Tunnel cũng làm thay đổi giới hạn này: packet bên trong phải vừa với phần payload còn lại sau header đóng gói.

## Loopback và giao tiếp trên cùng máy

Loopback là interface ảo để IP/TCP/UDP giao tiếp ngay trong host. IPv4 dành toàn bộ `127.0.0.0/8` cho loopback (thường ứng dụng dùng `127.0.0.1`); IPv6 dùng địa chỉ duy nhất `::1`. Packet loopback không được phát lên mạng vật lý. Hệ điều hành vẫn xử lý packet qua ngăn xếp mạng; vì vậy đo trên loopback có thể giúp quan sát chi phí phần mềm, nhưng kết quả không đại diện cho NIC, dây dẫn, Wi-Fi hay mạng thực.

## Rủi ro ở tầng liên kết

Packet capture trên Ethernet có thể thấy traffic được gửi tới máy capture, broadcast/multicast, hoặc traffic mà switch cố ý sao chép tới cổng monitor. Việc đặt card ở promiscuous mode tự nó không khiến switch gửi cho máy đó unicast traffic của mọi cổng. Mã hóa ở tầng ứng dụng/transport bảo vệ nội dung khi frame bị quan sát, nhưng không che toàn bộ metadata như địa chỉ, kích thước và thời điểm.

Switch cũng có bề mặt tấn công riêng: làm cạn bảng MAC có thể khiến thiết bị xử lý frame đích chưa biết bằng cách flood trong VLAN; giả mạo BPDU hoặc thông tin topology có thể tác động STP; Wi-Fi cho phép nghe môi trường vô tuyến rộng hơn mạng cáp. Đây là mô hình đe dọa cần hiểu, không phải hướng dẫn khai thác. Phòng vệ dựa trên cấu hình switch/AP như giới hạn và xác thực cổng, bảo vệ BPDU, tách VLAN, mã hóa Wi-Fi hiện hành, cùng mã hóa đầu-cuối. PPP và tunnel cũng cần xác thực, bảo vệ cấu hình và kiểm soát endpoint; encapsulation tự nó không đồng nghĩa với mã hóa.

## Link aggregation và Ethernet flow control

**Link aggregation** ghép nhiều physical link thành một logical link để tăng tổng thông lượng qua nhiều luồng hoặc dự phòng khi một member link hỏng. LACP trao đổi trạng thái/capability để các đầu thống nhất link nào thuộc cùng aggregation group. Phân phối thường dựa trên hash của flow/địa chỉ; vì vậy một flow đơn lẻ thường vẫn đi trên một member, và băng thông của nó không tự động bằng tổng băng thông mọi link. Cấu hình hai đầu, tốc độ/duplex tương thích và trạng thái member phải khớp.

Ethernet full-duplex có thể dùng **802.3x PAUSE frame** để yêu cầu peer tạm ngừng gửi khi buffer sắp đầy. Đây là flow control ở link, không phải congestion control end-to-end như TCP. Nếu switch áp pause rộng cho nhiều port, thiết bị ít gây tải cũng có thể bị dừng và nghẽn lan sang các flow khác; bật tính năng này cần theo thiết kế mạng và thiết bị, không phải giải pháp mặc định cho mọi packet loss.

**Wake-on-LAN** là chức năng power management riêng: NIC ở trạng thái chờ có thể đánh thức máy khi nhận magic packet, thường chứa sáu byte `FF` theo sau bởi MAC đích lặp lại 16 lần. Việc đánh thức còn phụ thuộc NIC, firmware, nguồn chờ, switch và policy bảo mật; gửi được packet không bảo đảm máy sẽ thức. [Tài liệu adapter của Microsoft](https://github.com/MicrosoftDocs/windows-powershell-docs/blob/main/docset/winserver2025-ps/NetAdapter/Set-NetAdapterPowerManagement.md) mô tả mẫu byte này.

## Tóm tắt

- Ethernet/Wi-Fi vận chuyển frame trên link; IP định tuyến giữa mạng.
- Switch học source MAC và forward theo destination trong VLAN.
- Wi-Fi dùng shared radio medium; link rate không bằng application throughput.
- MTU giới hạn payload link; tunnel làm giảm kích thước hữu dụng.
- Path MTU phụ thuộc toàn bộ đường đi và có thể khác giữa hai chiều.
- Loopback đưa packet trở lại stack trên cùng máy, không đi qua mạng vật lý.
- Nghe được frame ở link không đồng nghĩa đọc được payload đã mã hóa.
- PMTUD cần tín hiệu ICMP cần thiết để tránh black hole.

## Tự kiểm tra

**Switch có gửi mọi frame ra mọi cổng không?** Không. Nó dùng bảng forwarding và chỉ flood khi quy tắc yêu cầu.

**Interface MTU 1500 có bảo đảm packet 1500 byte đi qua tunnel không?** Không. Encapsulation có thể làm Path MTU nhỏ hơn.

**Promiscuous mode có cho thấy mọi unicast trong switch không?** Không. Switch phải mirror hoặc chuyển traffic đó tới cổng capture.

**Switch thông thường thay IP route giữa các mạng?** Layer-2 switch chủ yếu forward frame trong VLAN; routing là chức năng layer 3.

**MTU 1500 có nghĩa toàn Ethernet frame dài tối đa 1500 byte?** Thường IP MTU là payload IP; Ethernet header/trailer nằm ngoài con số đó.

**Wi-Fi link rate 1 Gbit/s bảo đảm app chuyển 1 Gbit/s?** Không; protocol overhead, retransmission, contention và Internet path ảnh hưởng.

## Đọc tiếp

Host cần ánh xạ IP next hop sang MAC. IPv4 dùng ARP; IPv6 dùng Neighbor Discovery.

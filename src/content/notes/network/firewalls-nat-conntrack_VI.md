---
title: "Firewall, NAT và connection tracking"
category: "Network"
tags: ["network", "firewall", "nat", "conntrack"]
description: "Hiểu firewall lọc traffic ra sao, NAT sửa luồng thế nào, và vì sao NAT không thay thế chính sách bảo mật."
updated: 2026-10-16
translationKey: "network/firewalls-nat-conntrack"
---

Hãy hình dung router biên như cổng vào một tòa nhà. Firewall quyết định ai được đi qua; NAT sửa thông tin địa chỉ để gói tin tìm đúng người nhận ở phía bên kia. Một thiết bị thường làm cả hai việc, nhưng chúng giải quyết hai vấn đề khác nhau. NAT không tự biến thành firewall: một kết nối inbound có thể bị chặn vì policy lọc, vì không có mapping, hoặc vì cả hai.

Chương 7 của *TCP/IP Illustrated, Volume 1* (Stevens, Fall, 2012) là nguồn cho phần mở rộng về firewall, các kiểu mapping/filtering, traversal và chuyển đổi IPv4/IPv6. Các lệnh và tên giao thức trong sách phản ánh thời điểm xuất bản; phần dưới giải thích cơ chế, không xem ví dụ cũ là cấu hình hiện hành.

## Firewall lọc traffic như thế nào?

Stateless rule xét từng packet độc lập theo interface, địa chỉ, protocol, port, cờ TCP và hướng đi. Cách này đơn giản, nhưng rule phải tự cho phép cả hai chiều nếu muốn request và response qua được.

Stateful firewall theo dõi flow. Khi policy cho phép một kết nối mới, firewall lưu trạng thái để nhận diện packet trả lời thuộc flow ấy. Trong Linux, conntrack là cơ chế theo dõi liên quan; nftables có thể dùng trạng thái conntrack để viết rule. “Established” không có nghĩa packet chắc chắn an toàn: nó chỉ nói thiết bị nhận diện packet là một phần của flow đã thấy. “Related” thường dùng cho traffic phụ được liên kết với flow khác, nhưng cần hiểu helper/protocol và policy cụ thể.

Một proxy firewall ở tầng ứng dụng đi xa hơn lọc header: proxy kết thúc một kết nối rồi tạo kết nối khác tới máy đích, thường sau khi hiểu giao thức ứng dụng. Vì nó làm endpoint trung gian nên có thể áp policy theo lệnh hay nội dung ứng dụng, nhưng phải có proxy phù hợp và client/service được cấu hình để dùng nó. Proxy không phải tên khác của NAT.

Mạng có thể chia thành vùng như inside, outside và DMZ. DMZ dành cho dịch vụ cần nhận kết nối từ ngoài, với policy giới hạn đường từ DMZ vào mạng nội bộ. ACL/rule thường được xét theo thứ tự; một rule rộng đặt trước có thể khiến rule hẹp phía sau không còn tác dụng. Cần đọc cả thứ tự, chain/hook, interface và default policy.

Fragment IP gây khó khăn cho lọc theo port: chỉ fragment đầu thường có header TCP/UDP, các fragment sau thì không. Firewall phải xử lý fragment nhất quán với cách host đích tái lắp packet. Rule lọc port đơn giản không thể suy ra port từ mọi fragment; xử lý sai hoặc state không đồng nhất có thể gây bypass hay từ chối dịch vụ.

## NAT sửa packet và giữ mapping

Hai việc thường bị gọi chung là NAT:

- **Basic NAT** thay địa chỉ IP, thường giữa một phạm vi private và một phạm vi khác.
- **NAPT/PAT** thay cả địa chỉ lẫn port (hoặc trường định danh tương ứng với một số giao thức), nhờ nhiều máy dùng chung một địa chỉ ngoài.

Source NAT thay địa chỉ nguồn khi packet rời mạng; masquerading thường chọn địa chỉ interface hiện hành. Destination NAT/port forwarding đổi đích để chuyển inbound traffic tới service bên trong. NAT giữ mapping để packet trả về được sửa ngược lại đúng endpoint nội bộ.

Khi địa chỉ hoặc port trong header thay đổi, checksum IP và checksum tầng vận chuyển có thể cần cập nhật. ICMP báo lỗi thường chứa một phần packet gốc; thiết bị NAT phải sửa phần được trích dẫn đủ để gửi lỗi về đúng endpoint nội bộ. Fragment sau fragment đầu không mang port, vì vậy NAT cần liên hệ chúng với fragment đầu hoặc xử lý theo cơ chế reassembly/state thích hợp. Tunnel và giao thức nhúng địa chỉ trong payload có thể cần ALG (application-level gateway); ALG sửa nội dung ứng dụng nhưng dễ lệch phiên bản, gây lỗi và tăng độ phức tạp.

NAT cũng làm khó mô hình kết nối end-to-end: host bên ngoài thường không thể tự mở kết nối vào host private nếu chưa có mapping phù hợp. Port forwarding là mapping tĩnh hoặc được cấu hình trước từ địa chỉ/port ngoài sang endpoint trong. Hairpin NAT (NAT loopback) cho phép client bên trong truy cập dịch vụ nội bộ bằng địa chỉ ngoài; không phải router nào cũng hỗ trợ giống nhau.

## Mapping và filtering không giống nhau

Đừng gộp **mapping behavior** với **filtering behavior**. Mapping mô tả địa chỉ/port ngoài được cấp và tái sử dụng ra sao cho traffic đi ra. Filtering mô tả endpoint ngoài nào được phép gửi packet quay vào mapping đó. Thiết bị có thể dùng mapping endpoint-independent nhưng filtering nghiêm ngặt hơn, hoặc hành vi khác; nhãn “symmetric NAT” thường gom nhiều hành vi lại và không đủ để dự đoán mọi thiết bị. Khi debug P2P, cần biết cả hai hành vi thay vì chỉ hỏi “có NAT không?”.

CGNAT/LSN đặt thêm một tầng dịch địa chỉ ở nhà mạng; port forwarding trên router gia đình khi đó chưa chắc cho phép inbound từ Internet. NAT64 giúp một số client IPv6 truy cập dịch vụ IPv4 qua translator; DS-Lite là một kiến trúc chia sẻ IPv4 qua nhà cung cấp. NPTv6 dịch tiền tố IPv6 theo kiểu stateless trong trường hợp phù hợp. Những cơ chế này không thay policy firewall. IPv6 có địa chỉ global không có nghĩa là nên để mọi traffic inbound được phép.

## Conntrack và áp lực tài nguyên

Conntrack lưu thông tin flow theo tuple và timeout. TCP có trạng thái handshake/đóng kết nối; UDP không có handshake nhưng firewall vẫn có thể theo dõi một “pseudo-state” theo packet và thời gian. Timeout phụ thuộc hệ điều hành, thiết bị và cấu hình, không nên coi một con số từ sách hay một router là quy tắc chung.

Bảng conntrack có giới hạn. Nhiều flow ngắn, scan, UDP traffic hoặc tải bất thường có thể tiêu thụ entry; khi bảng cạn, flow mới có thể bị drop dù đường truyền còn hoạt động. Vì vậy cần xem counter/log và giới hạn tài nguyên thay vì chỉ tăng timeout tùy tiện.

## NAT traversal: STUN, TURN và ICE

NAT traversal có thể dùng mapping tạm (“pinholes”) và hole punching: hai peer trao đổi thông tin qua một kênh signaling rồi thử gửi packet trực tiếp để tạo state ở NAT. Kết quả phụ thuộc mapping/filtering, firewall, thời điểm và topology; không có bảo đảm mọi cặp peer đều kết nối trực tiếp được.

- **STUN** giúp endpoint khám phá địa chỉ/port mà một máy chủ bên ngoài nhìn thấy và có thể duy trì binding. STUN không tự chuyển tiếp dữ liệu và không bảo đảm vượt được NAT.
- **TURN** cấp relay để chuyển tiếp traffic khi đường trực tiếp không hoạt động. Đổi lại, relay tốn băng thông và tài nguyên máy chủ.
- **ICE** thu thập các candidate (địa chỉ cục bộ, địa chỉ server-reflexive từ STUN, relay từ TURN), kiểm tra các cặp kết nối và chọn đường phù hợp; thường ưu tiên đường trực tiếp nếu kiểm tra thành công.

UPnP IGD, NAT-PMP và PCP là các cơ chế để thiết bị yêu cầu router mở mapping. Quyền tự tạo mapping giảm thao tác cấu hình thủ công nhưng cũng mở thêm bề mặt tấn công; chỉ bật khi mô hình tin cậy và quản trị cho phép. Không mở port rộng chỉ để “cho NAT hoạt động”.

## Thiết kế và kiểm tra policy

Default deny có thể phù hợp ở ranh giới tin cậy, nhưng cần allow rule tối thiểu và quan sát. Đọc rule theo đúng thứ tự và hook; kiểm tra riêng traffic tới host (input), traffic do host tạo (output), và traffic router chuyển tiếp (forward). NAT chain và filter chain có vai trò khác nhau. Khi thay firewall từ xa, hãy giữ đường quản trị và có rollback.

Kiểm tra cả IPv4 lẫn IPv6; chỉ cấu hình IPv4 rồi quên IPv6 có thể để hở đường. Log nên có giới hạn tốc độ để tránh log flood. NAT không mã hóa traffic, không xác thực người dùng, không vá dịch vụ dễ tổn thương và không thay firewall.

## Tóm tắt

- Firewall áp policy; NAT dịch địa chỉ/port. Một thiết bị có thể làm cả hai.
- Stateful firewall dùng conntrack để nhận diện flow và packet liên quan.
- Basic NAT đổi địa chỉ; NAPT/PAT đổi địa chỉ và port.
- Mapping quyết định cách cấp địa chỉ/port; filtering quyết định ai được gửi vào mapping.
- STUN khám phá binding, TURN relay khi cần, ICE thử và chọn candidate; không công cụ nào bảo đảm luôn có đường trực tiếp.
- Conntrack exhaustion và timeout ảnh hưởng kết nối; NAT không phải mã hóa hay xác thực.

## Tự kiểm tra

**Máy sau NAT chắc chắn an toàn?** Không; NAT không thay firewall, cập nhật bản vá hay xác thực.

**IPv6 không NAT nghĩa không cần firewall?** Sai; firewall áp policy độc lập với NAT.

**UDP không connection nên conntrack không áp dụng?** Không; thiết bị có thể theo dõi trạng thái UDP dựa trên traffic và timeout.

**Có STUN là chắc chắn kết nối P2P trực tiếp được?** Không. STUN chỉ giúp khám phá địa chỉ/port quan sát được; filtering hoặc firewall vẫn có thể chặn. TURN là phương án relay khi cần.

**NAT mapping và NAT filtering cùng một khái niệm?** Không. Một mô tả ánh xạ outbound; cái kia mô tả nguồn inbound nào được chấp nhận.

## Đọc tiếp

Để xem phần Linux cụ thể, đọc [Firewall Linux: nftables, chain và connection state](/vi/notes/network/linux-firewall-nftables/). Với kiến thức nền về packet IP, xem [IP packet forwarding và fragmentation](/vi/notes/network/ip-packet-forwarding-fragmentation/).

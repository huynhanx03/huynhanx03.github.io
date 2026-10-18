---
title: "ARP và IPv6 Neighbor Discovery"
category: "Network"
tags: ["network", "arp", "ipv6", "neighbor discovery"]
description: "Tìm MAC của next hop trên LAN, đọc cache neighbor và hiểu giới hạn an toàn của ARP/ND."
updated: 2026-10-16
translationKey: "network/arp-and-neighbor-discovery"
---

IP routing chọn next hop, nhưng Ethernet cần MAC destination để phát frame. IPv4 thường dùng ARP để ánh xạ địa chỉ IPv4 on-link sang MAC; IPv6 dùng Neighbor Discovery (ND) dựa trên ICMPv6.

## ARP request/reply

Nếu host chưa biết MAC tương ứng `192.0.2.1`, nó broadcast ARP request trong LAN hỏi ai sở hữu IP đó. Owner thường trả ARP reply unicast chứa MAC. Host nhận request có thể học mapping của bên hỏi từ chính ARP request, vì request đã mang cả sender IP và sender MAC. [RFC 826](https://www.rfc-editor.org/rfc/rfc826.html) mô tả bước cập nhật mapping trước khi tạo reply. Host cache mapping trong thời gian nhất định để không broadcast mọi packet.

ARP chỉ phân giải **địa chỉ on-link** cho IPv4 trên môi trường multi-access có thể broadcast. Khi host gửi tới IP ngoài subnet, nó phân giải MAC của next hop (thường là gateway), không hỏi ARP về server ở xa. Point-to-point như PPP không cần ARP khi hai đầu đã biết nhau qua cấu hình link.

## Đọc ARP frame

Trên Ethernet không gắn tag, EtherType `0x0806` cho biết payload là ARP. Phần ARP mang loại địa chỉ phần cứng và địa chỉ giao thức, độ dài của mỗi loại, mã thao tác, rồi các cặp sender/target hardware address và protocol address. Với Ethernet/IPv4, đây thường là MAC 6 byte và IPv4 4 byte; request có opcode 1, reply opcode 2. Target hardware address trong request thường để 0 vì mục tiêu là hỏi địa chỉ đó.

ARP request thường đi tới MAC broadcast `ff:ff:ff:ff:ff:ff` trong broadcast domain. ARP reply bình thường gửi unicast về MAC của requester. Switch chuyển broadcast trong cùng VLAN; router không chuyển tiếp broadcast Ethernet sang VLAN khác. Vì vậy ARP không phải cơ chế tìm MAC xuyên Internet.

Khi đọc packet capture, để ý hai địa chỉ đích ở hai lớp: IP packet có thể hướng tới server từ xa, còn Ethernet destination là MAC của gateway. Với một server on-link, trước khi gửi IP packet lần đầu, host thường phải nhận được ARP reply hoặc đã có cache hợp lệ.

Nếu đích IP nằm ngoài subnet, host ARP địa chỉ default gateway chứ không ARP host Internet cuối. Đây là bước hay nhầm khi chụp packet: Ethernet destination là gateway, IP destination vẫn là server từ xa.

## Neighbor Discovery trong IPv6

IPv6 ND là một nhóm chức năng chạy trên ICMPv6, không chỉ là bản thay thế ARP. Nó phân giải địa chỉ on-link, khám phá router, quảng bá prefix/configuration, phát hiện địa chỉ trùng, kiểm tra neighbor còn reachable hay không và gửi Redirect trong một số trường hợp.

### Neighbor Solicitation và Advertisement

Khi cần MAC của một IPv6 neighbor, host gửi **Neighbor Solicitation (NS)** tới solicited-node multicast ứng với địa chỉ đích, thay vì broadcast cho toàn LAN. NS chứa target IPv6; trên link có địa chỉ lớp 2, nó thường kèm Source Link-Layer Address option. Neighbor trả **Neighbor Advertisement (NA)** có thể chứa Target Link-Layer Address option. NA có cờ Router, Solicited và Override để biểu đạt vai trò gửi, việc đây có phải phản hồi solicitation hay không, và cách xử lý mapping cache hiện tại.

NS/NA cũng dùng để xác minh reachability. Neighbor cache giữ mapping cùng trạng thái: INCOMPLETE khi đang phân giải, REACHABLE sau khi có bằng chứng gần đây, STALE khi mapping có vẻ hợp lệ nhưng chưa được xác nhận gần đây, rồi DELAY/PROBE khi cần kiểm tra lại. Bằng chứng có thể đến từ NA hoặc tín hiệu từ tầng cao hơn. Nếu probe hết hạn mà không có xác nhận, entry có thể bị loại; thời gian retry phụ thuộc cấu hình/implementation.

### Router Advertisement và địa chỉ IPv6

Host gửi **Router Solicitation (RS)** tới nhóm All Routers để nhận phản hồi sớm; router gửi **Router Advertisement (RA)** định kỳ hoặc trả lời RS. RA có thể mang router lifetime, prefix information, MTU, thông tin route và DNS tùy option. Prefix Information tách hai ý thường bị nhầm: cờ **L** nói prefix có thể dùng để quyết định địa chỉ on-link; cờ **A** cho phép dùng prefix để SLAAC. Các lifetime cũng khác nhau: preferred lifetime và valid lifetime quyết định trạng thái địa chỉ; router lifetime áp dụng cho việc dùng router làm default next hop.

IPv6 không mặc định rằng mọi địa chỉ có prefix giống nhau đều on-link; host cần thông tin xác nhận, chẳng hạn RA Prefix Information, cấu hình, hoặc Redirect phù hợp. Đây là khác biệt quan trọng khi debug “cùng subnet” theo suy nghĩ lấy từ IPv4.

### Duplicate Address Detection

Trước khi dùng địa chỉ unicast mới, host thường thực hiện **DAD**: NS phát từ địa chỉ nguồn unspecified để hỏi xem target address đã có ai dùng chưa. Nếu phát hiện phản hồi/conflict, địa chỉ candidate không được đưa vào sử dụng bình thường. Vì source lúc này unspecified, NS không mang Source Link-Layer Address option như solicitation thông thường. DAD dựa trên link và xử lý multicast; nó không phải xác thực danh tính, và kết quả phụ thuộc vào thông điệp có tới được host hay không.

### Giới hạn an toàn

ND message dùng IPv6 Hop Limit 255; receiver kiểm tra giá trị này để loại message đã được forward từ link khác, bởi router giảm Hop Limit khi chuyển tiếp. Điều đó chặn một số spoof từ xa nhưng không xác thực thiết bị cùng link. Rogue RA/NA trên LAN vẫn có thể đưa host tới router hoặc mapping sai. Phân đoạn L2, RA Guard/switch controls phù hợp với hạ tầng, giám sát và SEND trong môi trường có thể triển khai giải quyết các phần khác nhau; không nên coi Hop Limit 255 là cơ chế xác thực.

SEND bổ sung chữ ký/credential và Cryptographically Generated Address cho một mô hình tin cậy cụ thể, nhưng triển khai và quản trị phức tạp, không phải tính năng mặc định ở mọi mạng. Nhiều tuỳ chọn ND trong sách thuộc Mobile IPv6 hoặc trạng thái chuẩn thời điểm xuất bản; khi cấu hình thật cần kiểm tra hỗ trợ và tiêu chuẩn hiện hành của hệ điều hành/router.

ICMPv6 không chỉ là ping; chặn toàn bộ ICMPv6 có thể làm neighbor discovery hoặc Path MTU Discovery lỗi. Firewall IPv6 cần cho phép loại ICMP cần thiết theo policy.

## Cache và kiểm tra

`ip neigh` trên Linux xem bảng neighbor. Entry có state như REACHABLE, STALE, DELAY hoặc FAILED; state không giống “MAC chắc chắn online” tại mọi thời điểm. Cache giúp giảm broadcast nhưng entry cũ có thể cần xác minh lại.

Nếu đích on-link không trả lời ARP, hệ điều hành thường thử lại request rồi đánh dấu neighbor chưa phân giải được hoặc thất bại. Packet chờ có thể bị giữ trong thời gian ngắn, sau đó ứng dụng thấy timeout hay lỗi kết nối; thông báo cụ thể và nhịp retry tùy OS, phiên bản và workload. Không nên lấy một số giây trong trace của sách cũ làm quy tắc chung.

ARP cache là **soft state**: mapping động hết hạn hoặc được xác minh/làm mới để hệ thống có thể thích nghi khi NIC, topology hay địa chỉ thay đổi. Cache giảm độ trễ và broadcast; đổi lại, mapping cũ hoặc bị đầu độc có thể khiến frame bị gửi sai nơi.

## Giới hạn bảo mật

ARP không xác thực mapping theo thiết kế phổ biến; host độc hại trong LAN có thể giả reply (ARP spoofing). ND cũng cần bảo vệ theo môi trường; có cơ chế như SEND nhưng không triển khai phổ quát. VLAN isolation, switch protections và TLS/end-to-end authentication giải quyết các lớp khác nhau.

## Tóm tắt

- ARP/ND phân giải IP next-hop sang địa chỉ link-layer.
- Host định tuyến ra ngoài subnet thì tìm MAC của gateway.
- IPv6 ND còn phục vụ router discovery, SLAAC, DAD, reachability và redirect; dùng ICMPv6.
- NS/NA phân giải neighbor; RS/RA khám phá router và quảng bá thông tin link.
- RA có cờ/lifetime tách bạch cho on-link prefix, SLAAC và default router.
- Neighbor cache có trạng thái và thời hạn; xem bằng `ip neigh` trên Linux.
- Hop Limit 255 giúp giới hạn ND ở link nhưng không xác thực peer cùng link.
- ARP/ND không mặc định xác thực danh tính, nên LAN vẫn cần phòng vệ.

## Tự kiểm tra

**Host gửi ARP hỏi MAC của server ở Internet?** Thường hỏi MAC gateway nếu server ngoài subnet.

**Chặn ICMPv6 có thể phá kết nối IPv6 dù TCP được phép?** Có; ND/PMTUD cần thông điệp ICMPv6 phù hợp.

**ARP cache STALE nghĩa mapping chắc chắn sai?** Không; chỉ cần xác nhận lại khi dùng theo cơ chế neighbor.

**RA prefix A=1 nghĩa địa chỉ đó chắc chắn on-link?** Không. A cho phép SLAAC; cờ L riêng mới nói prefix có thể dùng cho on-link determination.

**Hop Limit 255 làm ND an toàn trước máy độc hại cùng LAN?** Không. Nó giúp loại ND đã forward từ link khác, nhưng node cùng link vẫn cần được kiểm soát.

## Đọc tiếp

Network layer còn cần route table và default gateway để quyết định next hop.

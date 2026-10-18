---
title: "Mobile IP: home address, care-of address và home agent"
category: "Network"
tags: ["network", "ipv6", "mobility", "routing", "tunnel"]
description: "Hiểu mô hình Mobile IPv6 giữ danh tính IP khi node đổi mạng, cùng chi phí tunneling và route optimization."
updated: 2026-10-16
translationKey: "network/mobile-ip-home-and-care-of-address"
---

Routing thông thường dựa trên prefix của địa chỉ IP. Khi một thiết bị đổi sang mạng khác, địa chỉ mới thường thuộc prefix mới; nếu giữ địa chỉ cũ thì mạng có thể vẫn định tuyến packet về vị trí cũ. **Mobile IP** giải quyết một trường hợp cụ thể: node di chuyển giữa các mạng nhưng muốn giữ một địa chỉ ổn định để các kết nối tiếp tục nhận diện nó.

Đây là một mô hình protocol chuyên biệt, không phải bước bắt buộc trong mọi Wi-Fi roaming hoặc chuyển mạng điện thoại. Ý tưởng chính dễ nhớ hơn các chi tiết signaling: giữ một địa chỉ làm danh tính, cấp một địa chỉ theo vị trí hiện tại, rồi thông báo quan hệ giữa hai địa chỉ cho một router hỗ trợ di động.

## Bốn thành phần và hai địa chỉ

- **Mobile Node (MN):** thiết bị có thể đổi điểm gắn mạng.
- **Home Address (HoA):** địa chỉ ổn định gắn với home network; peer dùng nó như danh tính IP của node.
- **Care-of Address (CoA):** địa chỉ nhận được ở visited network, phản ánh vị trí mạng hiện tại.
- **Home Agent (HA):** router ở home network lưu binding HoA → CoA và giúp chuyển packet tới node khi node rời nhà.

Binding chỉ có ích nếu được xác thực và còn hiệu lực. Nếu attacker có thể giả binding update, traffic có thể bị chuyển về vị trí do attacker chọn; vì vậy signaling và khóa xác thực là phần quan trọng của thiết kế.

## Cách cơ bản: bidirectional tunneling

Khi MN sang visited network, nó lấy CoA rồi gửi binding update cho HA. HA xác nhận và ghi nhận binding. CN (correspondent node) gửi packet tới HoA như bình thường; route Internet đưa packet về home network, HA bọc packet vào tunnel hướng tới CoA. MN nhận packet đã bọc và xử lý gói gốc. Chiều ngược lại cũng có thể được tunnel qua HA.

Tunnel giúp CN không cần biết MN đã di chuyển: packet ban đầu vẫn hướng tới HoA. Đổi lại, đường đi vòng qua HA có thể dài hơn đường trực tiếp, thêm header và độ trễ. Tunneling không tự mã hóa payload; bảo vệ signaling/binding và bảo vệ nội dung ứng dụng là những vấn đề riêng.

## Route optimization

Để tránh mọi packet phải đi vòng qua HA, một thiết kế có thể cho CN biết CoA hiện tại của MN rồi gửi traffic trực tiếp. CN cần bằng chứng rằng bên yêu cầu thật sự có thể nhận tại cả HoA lẫn CoA. MIPv6 mô tả **Return Routability Procedure** với các thử thách gửi theo hai đường; MN kết hợp token nhận được để tạo thông tin xác thực cho binding update.

Khi binding được chấp nhận, packet có thể đi thẳng: hướng MN→CN dùng Home Address option để ứng dụng tiếp tục thấy HoA; chiều CN→MN có thể dùng Routing Header Type 2 để xử lý địa chỉ nhà ở đích. Chi tiết header và bảo vệ phụ thuộc phiên bản/specification; routing header IPv6 Type 0 trong ví dụ lịch sử của sách đã bị deprecated và không phải cơ chế route optimization cần dùng.

Route optimization giảm đường vòng nhưng tăng signaling, trạng thái binding và bề mặt bảo mật ở CN. Nếu CN không hỗ trợ cơ chế này, tunnel qua HA vẫn là mô hình tương thích cơ bản.

Một số chức năng khám phá/cập nhật của Mobile IPv6 được mang bằng ICMPv6: Home Agent Address Discovery Request/Reply giúp tìm HA; Mobile Prefix Solicitation/Advertisement giúp node đang ở xa nhận cập nhật prefix; Fast Handover (FMIPv6) định nghĩa thêm proxy-router solicitation/advertisement để chuẩn bị thông tin điểm truy cập kế tiếp. Đây là các signaling extension chuyên biệt, không phải phần bắt buộc của mọi IPv6 host hay quy trình Wi-Fi roaming thông thường. Sách *TCP/IP Illustrated, Volume 1* mô tả các kiểu message theo trạng thái RFC năm 2012; khi triển khai thực tế cần xác minh hỗ trợ và tiêu chuẩn hiện hành.

## Cách suy luận khi đọc sơ đồ hoặc packet capture

1. Hỏi packet đang hướng tới **HoA** hay **CoA** ở IP header ngoài.
2. Nếu thấy encapsulation, tách header ngoài (định tuyến tới vị trí hiện tại) khỏi packet IP gốc (định danh đầu-cuối).
3. Kiểm tra binding update/ack và cơ chế xác thực; đừng coi việc nhận packet ở CoA là bằng chứng đủ về danh tính.
4. So đường đi qua HA với đường tối ưu trực tiếp để nhận ra trade-off giữa tương thích, độ trễ và signaling.

Khái niệm “địa chỉ danh tính” tách khỏi “địa chỉ vị trí” xuất hiện trong nhiều thiết kế mạng. Tuy nhiên, không nên suy ra rằng ứng dụng nhìn thấy tunnel, Mobile IP tự giữ mọi TCP session, hoặc mọi kiểu roaming đều dùng HoA/CoA.

## Tóm tắt

- HoA giữ danh tính IP; CoA cho biết vị trí mạng hiện tại.
- HA giữ binding và có thể tunnel packet giữa home network với CoA.
- Bidirectional tunneling đơn giản với peer không hỗ trợ mobility, nhưng có thể làm đường đi vòng.
- Route optimization cho phép gửi trực tiếp sau khi xác thực binding, đổi lại cần thêm signaling và state.
- Tunnel, xác thực signaling và mã hóa dữ liệu ứng dụng là các lớp chức năng khác nhau.

## Tự kiểm tra

**MN đổi mạng nghĩa HoA tự trở thành địa chỉ trong subnet mới?** Không. CoA phản ánh mạng mới; HA giúp giữ liên hệ với HoA.

**Tunnel qua HA tự mã hóa dữ liệu?** Không. Encapsulation tạo đường chuyển tiếp; confidentiality cần cơ chế mã hóa riêng.

**Route optimization luôn ngắn hơn nếu bật?** Nó có thể tránh đường vòng qua HA, nhưng còn phụ thuộc topology, binding và hỗ trợ của peer.

## Đọc tiếp

Routing thông thường vẫn chuyển packet từng hop theo route table và next hop; xem [routing và next hop](/vi/notes/network/routing-next-hop-and-gateway/).

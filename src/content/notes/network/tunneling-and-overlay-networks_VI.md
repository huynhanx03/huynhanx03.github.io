---
title: "Tunneling và mạng overlay"
category: "Network"
tags: ["network", "tunnel", "overlay", "vpn", "encapsulation"]
description: "Hiểu tunnel bọc packet hoặc frame, overhead, MTU, bất đối xứng đường truyền và ranh giới bảo mật."
updated: 2026-10-16
translationKey: "network/tunneling-and-overlay-networks"
---

Tunnel tạo một liên kết logic bằng cách đóng gói traffic bên trong một protocol khác. Ví dụ, packet IPv4 có thể được bọc trong IPv6; frame Ethernet có thể đi bên trong UDP/IP. Hai đầu tunnel tháo lớp bọc để chuyển tiếp traffic gốc. Mạng bên dưới chỉ cần chuyển packet ngoài tới đầu kia, nên các đầu tunnel có thể tạo một **overlay network** mà không cần có kết nối vật lý trực tiếp giữa từng cặp node.

## Packet đi qua tunnel như thế nào?

Giả sử host A gửi packet gốc tới host B. Gateway tunnel nhận packet đó, thêm header ngoài có địa chỉ của hai endpoint tunnel, rồi gửi qua mạng trung gian. Router trung gian định tuyến theo header ngoài. Gateway bên kia gỡ lớp bọc và tiếp tục chuyển packet gốc tới B.

```text
packet gốc → thêm header tunnel → mạng trung gian → gỡ header → packet gốc
```

Encapsulation không thay thế routing: mạng trung gian vẫn phải tìm đường cho packet ngoài, còn endpoint tunnel phải biết packet trong sẽ được chuyển tiếp ra đâu. Tùy loại tunnel, payload có thể là packet IP tầng 3 hoặc frame tầng 2. Điều này quyết định tunnel mang được loại traffic nào và phạm vi broadcast/link nào có thể được kéo dài.

GRE là ví dụ về encapsulation tổng quát; header cơ bản nhận diện protocol được bọc, còn extension có thể thêm key để phân biệt luồng và sequence number để hỗ trợ sắp xếp packet. PPTP trong ví dụ lịch sử của sách phối hợp GRE với PPP để tạo link point-to-point ảo. L2TP tự cung cấp tunnel nhưng không tự mã hóa traffic. IP-in-IP, GRE, L2TP, VPN dựa trên IPsec và các tunnel UDP/IPv4/IPv6 có đặc tính, độ tin cậy và mục đích khác nhau; không nên xem chúng là những lựa chọn tương đương.

## Tunnel không tự bảo mật traffic

Đóng gói chỉ tạo đường vận chuyển logic; người quan sát mạng vẫn có thể thấy endpoint ngoài, kích thước, thời điểm và lượng traffic. Nếu tunnel không có mã hóa/xác thực, packet có thể bị đọc hoặc chèn tùy theo cơ chế và vị trí tấn công. Khi cần bảo mật, phải dùng giao thức cung cấp xác thực và bảo vệ toàn vẹn/mã hóa phù hợp, như IPsec hoặc TLS ở lớp ứng dụng. Xác thực endpoint và bảo vệ khóa cũng quan trọng như chọn thuật toán.

Tunnel endpoint là một phần của trust boundary. Kẻ tấn công có thể nhắm vào khả năng chịu tải, cấu hình peer, khóa/chứng thư, hoặc tìm cách đưa traffic không được phép vào mạng phía trong. Vì vậy cần xác định rõ peer nào được phép tạo tunnel, traffic nào được phép đi qua, và log/giới hạn tài nguyên ở endpoint.

## Overhead và MTU

Header ngoài chiếm chỗ trong packet, làm giảm payload tối đa có thể mang mà không vượt MTU của đường truyền. Tunnel lồng nhau, mã hóa, UDP encapsulation hoặc tag bổ sung có thể làm overhead tăng thêm. Nếu endpoint vẫn gửi packet lớn hơn Path MTU, packet có thể bị fragment hoặc drop; ứng dụng gửi dữ liệu nhỏ vẫn chạy trong khi truyền file hay handshake lớn bị treo. Tính MTU/MSS và cho phép ICMP cần thiết cho Path MTU Discovery là một phần của thiết kế, không chỉ là tinh chỉnh sau cùng.

## Bất đối xứng và cấu hình endpoint

Tunnel hai đầu có thể đi qua các đường vật lý khác nhau; ngay cả tunnel logic đối xứng cũng không đảm bảo latency, bandwidth hay Path MTU hai chiều giống nhau. Với đường chỉ truyền một chiều, giao thức link cần trao đổi có thể không hoạt động. Một cách khắc phục là đưa traffic chiều cần hồi đáp qua tunnel trên một mạng khác, nhưng điều đó che sự bất đối xứng khỏi tầng trên chứ không xóa độ trễ hoặc giới hạn băng thông.

Tunnel cần hai đầu thống nhất endpoint, loại payload, route, policy và cơ chế xác thực. Cấu hình tự động giúp giảm thao tác thủ công nhưng không loại bỏ phụ thuộc vào NAT, firewall, DNS hoặc khả năng tương thích. Các ví dụ 6to4, Teredo, PPTP và lệnh hệ điều hành trong sách TCP/IP Illustrated phản ánh bối cảnh của ấn bản 2012; hãy kiểm tra tiêu chuẩn, hỗ trợ và khuyến nghị bảo mật hiện hành trước khi triển khai.

## Tóm tắt

- Tunnel bọc packet/frame để tạo liên kết logic qua một mạng trung gian.
- Tunnel có thể tạo overlay, nhưng cần route ở cả mạng ngoài lẫn mạng trong.
- Encapsulation không tự cung cấp mã hóa hay xác thực.
- Header bổ sung làm giảm payload hữu dụng và ảnh hưởng Path MTU.
- Endpoint, policy, cấu hình peer và đường hai chiều đều thuộc thiết kế tunnel.

## Tự kiểm tra

**Tunnel đang hoạt động nghĩa payload được mã hóa?** Không. Cần kiểm tra giao thức bảo vệ riêng.

**MTU của NIC bằng MTU dùng được bên trong tunnel?** Không; header tunnel làm giảm phần payload còn lại.

**Đường đi hai chiều giống nhau?** Không nhất thiết; định tuyến, độ trễ và Path MTU có thể bất đối xứng.

## Đọc tiếp

Xem [IPsec: IKE, ESP và transport/tunnel mode](/vi/notes/network/ipsec-ike-esp-modes/) để hiểu một bộ giao thức có xác thực và bảo vệ packet; xem [MTU và fragmentation](/vi/notes/network/ethernet-wifi-switching-mtu/) cùng [Path MTU Discovery](/vi/notes/network/path-mtu-discovery-black-hole/) để điều tra packet bị drop.

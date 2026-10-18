---
title: "IPsec, EAP và bảo vệ truy cập mạng"
category: "Network"
tags: ["network", "ipsec", "eap", "vpn", "security"]
description: "So sánh bảo vệ ở layer 2/3/transport và hiểu vai trò IKE, ESP, 802.1X/EAP."
updated: 2026-10-16
translationKey: "network/ipsec-eap-network-access"
---

TLS thường bảo vệ một kết nối ứng dụng; IPsec có thể bảo vệ packet IP theo policy; 802.1X/EAP xác thực thiết bị/user trước khi được vào LAN. Chọn tầng theo nơi cần đặt trust boundary và hệ thống cần tương tác.

## IPsec và ESP

IPsec dùng Security Association để xác định thuật toán, key, hướng và tham số bảo vệ. IKEv2 thương lượng/authenticate peer và sinh key; ESP có thể cung cấp confidentiality, integrity/authentication hoặc cả hai theo chế độ. AH xác thực một số trường IP nhưng khó tương thích với NAT vì header thay đổi.

Transport mode bảo vệ payload IP theo cách giữ header ngoài; tunnel mode bọc packet IP trong packet mới, thường dùng VPN gateway. NAT traversal encapsulate IPsec qua UDP trong một số topology.

## EAP/802.1X

802.1X kiểm soát truy cập port wired/wireless; supplicant (client), authenticator (switch/AP) và authentication server (thường RADIUS) phối hợp. EAP là framework cho method xác thực; EAP-TLS là một phương thức dùng certificate.

Authenticator có thể chỉ chuyển tiếp EAP giữa supplicant và AAA backend (pass-through), nên không nhất thiết phải tự cài mọi phương thức xác thực. EAP message có request/response và code success/failure; EAP method quyết định credential, mutual authentication và có tạo key hay không. Nếu method xuất key, MSK có thể cung cấp vật liệu khóa cho authenticator và tầng link. EMSK phải ở lại EAP peer/server, không được chuyển cho authenticator ([RFC 5247](https://www.rfc-editor.org/rfc/rfc5247.html#section-1.4)); việc cấp VLAN/role/ACL là quyết định authorization riêng, không chỉ là kết quả có mật khẩu đúng.

PANA là một cách mang EAP qua UDP/IP để tách quá trình xác thực khỏi một loại link cụ thể; nó không thay thế EAP method hay policy enforcement point. Các tên method, status chuẩn và thuật toán trong sách 2012 có phần lịch sử; khi cấu hình thực tế cần xem hỗ trợ hiện tại của supplicant, AP/switch và AAA server.

Sau xác thực, policy có thể gán VLAN/role. 802.1X không mã hóa mọi traffic Internet; WPA/802.11 link security và TLS/IPsec giải quyết mục tiêu khác.

## VPN và trust

VPN tạo tunnel nhưng không tự khiến mọi resource bên trong an toàn. Cần route, DNS, authorization, split/full tunnel policy, key rotation và thiết bị endpoint đáng tin. Split tunnel giảm traffic qua gateway nhưng làm policy và threat model phức tạp hơn.

## Tóm tắt

- TLS, IPsec và EAP đặt bảo vệ ở các tầng/vai trò khác nhau.
- IKEv2 thương lượng Security Association; ESP bảo vệ traffic IP theo mode.
- 802.1X/EAP kiểm soát quyền vào link/network, không thay TLS ứng dụng.
- VPN cần policy route/DNS/authorization ngoài việc thiết lập tunnel.
- Protocol choice cần xem NAT, endpoint, key management và interoperability.

## Tự kiểm tra

**VPN kết nối thành công nghĩa user được phép truy cập mọi subnet?** Không; route/firewall/authorization còn quyết định.

**EAP là một thuật toán mã hóa duy nhất?** Không; đó là framework với nhiều method.

**IPsec tunnel làm ứng dụng không cần TLS trong mọi trường hợp?** Không; end-to-end protection và trust endpoint khác nhau.

## Đọc tiếp

DNSSEC và DKIM xác thực dữ liệu DNS/email ở tầng ứng dụng/dịch vụ.

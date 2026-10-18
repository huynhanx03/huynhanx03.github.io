---
title: "DHCP relay, lease renewal và option"
category: "Network"
tags: ["network", "dhcp", "relay", "configuration"]
description: "Theo broadcast qua subnet, giây phút renew/rebind và các tùy chọn ảnh hưởng cấu hình client."
updated: 2026-10-16
translationKey: "network/dhcp-relay-renewal"
---

DHCPv4 client mới chưa có địa chỉ nên broadcast DHCPDISCOVER trong subnet. Router không forward broadcast mặc định; DHCP relay nhận request rồi chuyển tới server ở mạng khác, điền relay/gateway address (giaddr) để server biết subnet nguồn và chọn pool phù hợp. Reply được relay chuyển lại client. Relay thường quan trọng ở lúc client khám phá/cấp lease; khi client đã biết server, một số trao đổi renew có thể đi unicast trực tiếp.

Relay Information option (thường gọi Option 82) cho phép relay thêm ngữ cảnh như circuit ID hoặc remote ID mà client không tự cung cấp. DHCPv6 có định dạng relay riêng, bọc message trong RELAY-FORW/RELAY-REPL và có thể dùng relay lồng nhau. Relay cần được tin cậy: server có thể dùng metadata relay để chọn pool/policy, nên thông tin giả từ port không đáng tin cậy cần bị loại theo cấu hình.

## Lease T1/T2

Client renew lease với server ban đầu trước khi hết hạn (T1); nếu không được trả lời tới mốc rebind (T2), nó broadcast/đổi server theo protocol. Giá trị mặc định thường dựa trên phần của lease nhưng server có thể cấu hình. Khi lease hết mà không renew, client không nên tiếp tục dùng address theo giả định cũ.

Trong DHCPv4, T1 thường khởi đầu renewal với server cấp lease; T2 chuyển sang rebinding để có thể hỏi server khác nếu server đầu không phản hồi. Nếu lease hết, client không còn quyền dùng địa chỉ thuê đó. Không nhầm DHCPNAK (server phủ nhận địa chỉ/request hiện tại) với mất một ACK đơn lẻ; client state machine và timer quyết định bước kế tiếp.

## Option và client behavior

DHCP option có thể chứa subnet mask, router, DNS, search domain, NTP, MTU hoặc classless static route. Server và client cần tương thích; option không đồng nghĩa host sẽ áp dụng mọi giá trị nếu policy local ghi đè.

Client identifier không nhất thiết là MAC; DHCPv6 dùng DUID cùng IAID để nhận diện client và association. Relay có thể chuyển metadata cho server nhưng không phải option nào cũng gửi trong mọi message. DHCPv6 server cũng có thể trả lease/address qua IA, cung cấp thông tin stateless qua INFORMATION-REQUEST/REPLY, hoặc delegate prefix cho router bằng IA_PD.

## Bảo vệ relay và DHCP

Rogue DHCP server có thể cấp gateway/DNS sai; DHCP starvation có thể làm cạn pool. DHCP snooping trên switch có thể giới hạn phản hồi server chỉ từ port tin cậy và xây DHCP binding table, nhưng bản thân nó phụ thuộc cấu hình VLAN/port đúng và không biến MAC thành danh tính mật mã. DHCP authentication được chuẩn hóa nhưng sách ghi nhận triển khai ít do khó phân phối shared key; đừng giả định DHCP mặc định xác thực server/client.

Lease query cho phép relay/access device hỏi server về binding khi nó cần đồng bộ lại trạng thái; bulk query phục vụ lượng binding lớn. Đây là luồng vận hành hạ tầng, không phải bước bình thường trong DORA.

## Troubleshooting

Nếu client không nhận IP, kiểm tra VLAN/link, relay/helper, scope exhaustion, server logs, firewall UDP ports và duplicate address detection. IP có nhưng không vào Internet thì xem router/DNS riêng.

## Tóm tắt

- DHCP relay cho phép server ở subnet khác nhận request broadcast.
- T1 renew, T2 rebind và lease expiry quyết định lifecycle.
- DHCP options có thể cung cấp route/DNS/time/MTU nhưng client policy còn ảnh hưởng.
- giaddr/relay metadata giúp server xác định subnet và ngữ cảnh client.
- DHCP snooping giảm rủi ro rogue server khi cấu hình đúng nhưng không thay thế xác thực đầu-cuối.
- Scope exhaustion/relay/VLAN/firewall là nguồn lỗi phổ biến.
- Có IP không chứng minh gateway/DNS đúng.

## Tự kiểm tra

**Router forward DHCP broadcast tự động?** Thường cần DHCP relay/helper.

**Client giữ IP vĩnh viễn sau lease expiry?** Không theo contract DHCP.

**DHCP option 3 (router) thành công nghĩa gateway reachable?** Không; cần kiểm tra link/route/neighbor.

## Đọc tiếp

ICMP giúp chẩn đoán path sau khi client có address/route.

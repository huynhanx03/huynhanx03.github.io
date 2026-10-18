---
title: "ARP cache, proxy ARP và spoofing trong LAN"
category: "Network"
tags: ["network", "arp", "security", "lan"]
description: "Phân tích ARP cache lifecycle, proxy ARP và cách giả mạo mapping làm traffic đi sai đường."
updated: 2026-10-16
translationKey: "network/arp-cache-proxy-and-spoofing"
---

ARP resolution không hỏi mọi lần gửi packet. Host cache IP-to-MAC mapping và làm mới theo state/timeout. Mapping sai có thể khiến frame tới nhầm thiết bị dù IP route đúng.

Cache thường phân biệt entry đã phân giải với entry đang chờ phản hồi. Nếu IP on-link không tồn tại hoặc đang tắt, host có thể gửi lại ARP request; trong lúc đó entry còn ở trạng thái incomplete/pending rồi hết hạn hoặc chuyển failed. Số lần thử, thời gian chờ và cách hiển thị phụ thuộc hệ điều hành. Sách mô tả các giá trị timeout phổ biến vào thời điểm xuất bản, nhưng không nên dùng chúng làm hằng số cho mọi máy hiện nay.

Mapping động là **soft state**: nó được giữ một thời gian rồi bỏ hoặc xác minh lại để thay đổi phần cứng/topology có thể được phản ánh. Một host cũng thường học IP/MAC của requester khi nhận ARP request hợp lệ, nên request có thể cập nhật cache mà không cần đợi một packet IP từ requester.

## Proxy ARP

Router có thể trả lời ARP thay cho host khác (proxy ARP), khiến sender nghĩ peer ở cùng link và gửi frame tới router. Router sau đó forward packet. Cơ chế này hỗ trợ một số topology legacy nhưng che khuất subnet design và làm routing khó debug.

Proxy ARP từng được dùng để nối các đoạn mạng vật lý vẫn dùng cùng prefix, hoặc hỗ trợ thiết bị cũ không xử lý subnet theo cách hiện nay. Đây là bối cảnh lịch sử; thiết kế hiện đại thường nên làm rõ subnet và routing thay vì dựa vào proxy để che topology. Khi bắt gói, reply cho IP đích nhưng có MAC của router là dấu hiệu cần kiểm tra proxy ARP hoặc cấu hình đặc biệt, chứ chưa tự chứng minh có tấn công.

## Gratuitous ARP và phát hiện địa chỉ trùng

**Gratuitous ARP** thường là request trong đó sender IP và target IP giống địa chỉ host định dùng. Nó có thể giúp phát hiện xung đột và báo cho các peer cập nhật cache khi MAC thay đổi. Nhưng gratuitous ARP đơn lẻ không phải một quy trình phát hiện xung đột hoàn chỉnh.

IPv4 **Address Conflict Detection (ACD)** phân biệt probe với announcement. Probe dùng sender IP `0.0.0.0` và target IP là địa chỉ đang kiểm tra, nhờ vậy peer không học nhầm candidate address từ probe. Nếu không thấy xung đột, host gửi announcement nêu địa chỉ mình bắt đầu sử dụng, rồi tiếp tục quan sát ARP để phát hiện xung đột xuất hiện sau đó. Chi tiết số probe, khoảng ngẫu nhiên và phản ứng phụ thuộc RFC/triển khai; điểm cốt lõi là probe kiểm tra trước khi dùng, announcement báo việc bắt đầu dùng.

## ARP spoofing

ARP không có authentication mặc định. Attacker trên cùng broadcast domain có thể gửi unsolicited reply quảng bá MAC của mình cho gateway IP, khiến một phần traffic đi qua attacker. HTTPS bảo vệ payload ứng dụng khi certificate validation đúng nhưng attacker vẫn có thể drop/observe metadata.

ARP reply không cần phải là câu trả lời cho request vừa gửi; vì vậy host có thể bị lừa nhận mapping giả. Kịch bản thường gặp là attacker quảng bá MAC của mình cho IP gateway, khiến traffic rời host đi qua attacker. Đây có thể dẫn tới nghe lén traffic không mã hóa, sửa/chuyển tiếp traffic, hoặc từ chối dịch vụ. Mức ảnh hưởng phụ thuộc vị trí attacker, forwarding và bảo vệ đầu-cuối.

Static ARP entry không phải ranh giới bảo mật đáng tin cậy nếu implementation vẫn cho phép unsolicited reply thay thế entry đó. Sách nêu đây là lỗi/hành vi có ở một số hệ thống; trước khi dựa vào static mapping như biện pháp bảo vệ, cần xác minh chính sách cập nhật neighbor của nền tảng đang chạy. Static mapping diện rộng cũng làm failover và thay NIC khó vận hành.

Với host nhiều interface, kiểm tra còn cần gắn mapping với đúng interface/VLAN. Một lỗi hoặc cấu hình sai khiến thông tin ARP của interface này ảnh hưởng interface khác có thể đưa traffic sang segment sai. Bài học thực hành là đọc neighbor theo interface và đối chiếu route/interface trả lời; các sysctl cụ thể trong sách thuộc Linux thời kỳ đó, không phải hướng dẫn lệnh hiện hành.

## Phòng vệ

Dynamic ARP Inspection/port security, DHCP snooping, VLAN segmentation, static neighbor entries trong một số use case và end-to-end TLS/IPsec giảm rủi ro theo tầng. Static ARP quy mô lớn khó vận hành và không giải quyết mọi attack.

## Tóm tắt

- ARP cache tăng hiệu quả nhưng mapping có lifetime/state.
- Proxy ARP trả lời thay peer và có thể làm topology khó hiểu.
- ARP reply không xác thực nên cùng LAN có thể spoof mapping.
- Gratuitous ARP báo một mapping; ACD probe/announcement là quy trình phát hiện xung đột rõ ràng hơn.
- Switch protection/segmentation và end-to-end crypto bổ trợ nhau.

## Tự kiểm tra

**TLS ngăn attacker ARP spoof làm rớt traffic?** Không; TLS có thể bảo vệ nội dung/identity nhưng attacker vẫn gây DoS.

**Proxy ARP chứng minh subnet mask của host đúng?** Không.

**Static ARP là giải pháp quy mô lớn đơn giản?** Không; quản trị mapping và failover khó.

## Đọc tiếp

Với IPv6, Neighbor Discovery có thêm RA/NS/NA và security considerations riêng.

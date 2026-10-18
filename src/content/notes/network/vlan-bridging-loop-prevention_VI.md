---
title: "VLAN, bridge và ngăn vòng lặp layer 2"
category: "Network"
tags: ["network", "vlan", "switching", "stp"]
description: "Hiểu access/trunk port, VLAN tagging và vì sao bridge cần spanning tree để tránh broadcast storm."
updated: 2026-10-16
translationKey: "network/vlan-bridging-loop-prevention"
---

VLAN chia một switch vật lý thành các broadcast domain logic. Port access thường gắn với một VLAN cho endpoint; trunk mang nhiều VLAN qua một link bằng tag 802.1Q. Native VLAN và tag handling cần cấu hình nhất quán hai đầu.

## Bridge và switching loop

Switch là bridge nhiều cổng. Nếu có đường layer 2 vòng, broadcast/unknown unicast có thể lặp vô hạn vì Ethernet frame không có TTL. MAC table cũng có thể flap giữa các port.

Spanning Tree Protocol (STP) phát hiện topology loop và block một số path để tạo cây không vòng; link dự phòng được mở lại khi topology đổi. RSTP hội tụ nhanh hơn STP cổ điển. Cấu hình root bridge, edge port và BPDU guard ảnh hưởng ổn định/security.

### STP chọn cây nào?

Switch trao đổi **BPDU** chứa bridge ID, root ID và cost tới root. Bridge ID thấp nhất được bầu làm root bridge; các switch khác chọn root port có đường cost thấp nhất về root, rồi chọn designated port cho mỗi segment. Port dự phòng không forward data để tránh vòng. Cost và bridge priority có thể làm thay đổi cây, nên root bridge cần được đặt có chủ đích trong mạng quản trị.

Khi topology đổi, STP phải cập nhật port state và MAC forwarding database. RSTP giữ cùng mục tiêu nhưng phát hiện mất kết nối nhanh hơn, dùng trao đổi proposal/agreement để đưa một số đường point-to-point vào forwarding mà không chờ đủ timer kiểu STP cổ điển. RSTP có trạng thái discarding/learning/forwarding; edge port đi thẳng tới forwarding nếu không nhận BPDU, nên cần BPDU Guard hoặc policy tương đương khi cắm edge port. **MSTP** cho phép ánh xạ VLAN vào nhiều spanning-tree instance để tránh buộc mọi VLAN dùng cùng một cây. Các chi tiết timer/field của sách theo chuẩn cũ; cấu hình thực tế tùy switch và phiên bản chuẩn.

## VLAN không phải mã hóa

VLAN cô lập broadcast ở layer 2 theo switch config, nhưng không mã hóa traffic và không tự thay firewall layer 3. Misconfigured trunk/native VLAN hoặc switch compromise có thể phá isolation.

## Tóm tắt

- VLAN phân chia broadcast domain; 802.1Q tag trunk nhiều VLAN.
- Switch loop gây broadcast storm/MAC flapping.
- STP/RSTP block đường tạo loop và giữ redundancy.
- VLAN là segmentation, không phải encryption/security boundary tuyệt đối.

## Tự kiểm tra

**VLAN 10 và 20 có thể giao tiếp IP trực tiếp?** Cần routing/policy giữa subnet, tùy cấu hình.

**Ethernet loop tự dừng như IP TTL?** Không; frame layer 2 không có TTL tương đương.

**Trunk port chỉ chở một VLAN?** Có thể nhiều VLAN theo allowed list/tagging.

## Đọc tiếp

ARP/ND phân giải peer trong mỗi VLAN/link sau khi route chọn next hop.

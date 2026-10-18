---
title: "VLAN access/trunk và spanning tree"
category: "Network"
tags: ["network", "ethernet", "vlan", "switching"]
description: "Hiểu access port, trunk 802.1Q và spanning tree ngăn vòng lặp layer 2 trong topology có đường dư."
updated: 2026-10-16
translationKey: "network/vlan-trunk-spanning-tree"
---

VLAN chia một switch fabric thành broadcast domain logic. Access port thường gắn thiết bị đầu cuối vào một VLAN; trunk mang nhiều VLAN giữa switch, router hoặc hypervisor. Cấu hình hai đầu không khớp có thể khiến frame đi sai VLAN hoặc bị drop.

## 802.1Q tag

Ethernet trunk thường gắn tag VLAN ID vào frame. Native VLAN/untagged traffic tùy cấu hình vendor; mismatch có thể tạo lỗ hổng hoặc kết nối khó chẩn đoán. VLAN ID chỉ có ý nghĩa trong phạm vi layer 2; muốn giao tiếp giữa VLAN cần routing/policy layer 3.

Tag 802.1Q thêm 4 byte giữa source MAC và EtherType: TPID nhận diện tag, còn Tag Control Information chứa PCP 3 bit để đánh dấu priority, DEI 1 bit cho chỉ dấu discard eligibility, và VID 12 bit. VID 0 dùng cho priority tag không gán VLAN thông thường; VID 4095 được dành riêng, nên dải VLAN thường dùng là 1–4094. Việc gắn priority không tự bảo đảm QoS: thiết bị trên đường đi phải ánh xạ và áp dụng policy tương ứng. Tag tăng kích thước frame layer 2 nhưng thường không làm đổi cấu hình IP MTU 1500 của payload.

## Vòng lặp và spanning tree

Đường dự phòng giữa switch tạo vòng lặp layer 2: broadcast có thể quay vòng và nhân bản, MAC table flapping. Spanning Tree Protocol (STP) trao đổi BPDU rồi chọn topology không vòng, đưa một số port vào trạng thái blocking/discarding. Nếu root bridge hoặc port role thay đổi, topology hội tụ lại.

RSTP hội tụ nhanh hơn STP cổ điển trong nhiều trường hợp. PortFast/edge mode giúp host port lên nhanh, nhưng bật trên đường nối switch có thể gây loop; BPDU Guard thường bảo vệ edge port.

## Chẩn đoán

Kiểm tra VLAN membership, trunk allowed list, native VLAN, STP root/port state, MAC table và counters ở cả hai đầu. Packet capture trên host có thể không hiện tag do NIC offload; switch mirror/SPAN hoặc tắt offload tạm thời có thể cần thiết.

## Tự kiểm tra

**VLAN tự định tuyến giữa các subnet?** Không.

**Trunk luôn tag mọi frame?** Native/untagged behavior phụ thuộc cấu hình.

**Đường dư layer 2 luôn tăng độ tin cậy mà không tác dụng phụ?** Không; cần loop prevention.

## Đọc tiếp

Routing layer 3 kết nối các VLAN và áp dụng route/policy giữa các prefix.

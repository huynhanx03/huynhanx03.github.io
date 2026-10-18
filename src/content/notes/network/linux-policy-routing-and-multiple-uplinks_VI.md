---
title: "Policy routing và nhiều uplink trên Linux"
category: "Network"
tags: ["network", "linux", "routing"]
description: "Hiểu rule chọn routing table theo nguồn hoặc mark, và vì sao nhiều gateway mặc định có thể tạo đường đi bất đối xứng."
updated: 2026-10-16
translationKey: "network/linux-policy-routing-and-multiple-uplinks"
---

Một routing table duy nhất thường chọn đường theo đích. Máy có VPN, nhiều interface hoặc hai uplink có thể cần chọn đường dựa trên source address, packet mark hay policy khác. Linux policy routing dùng rule để chọn bảng route cần tra trước khi quyết định next hop.

## Rule và bảng

`ip rule` liệt kê rule có priority; `ip route show table NAME` xem bảng. Kernel áp dụng rule theo thứ tự, rồi tìm route trong bảng tương ứng. `ip route get DEST from SOURCE` giúp kiểm tra lựa chọn khi source cụ thể.

Firewall mark (fwmark) có thể gắn packet vào policy table; mark cần được đặt nhất quán cho cả flow. Reverse path filtering nghiêm có thể loại packet hợp lệ nếu route ngược không khớp interface nhận, nhất là cấu hình asymmetric multi-homing.

## Đường đi bất đối xứng

Request có thể đi ra ISP A nhưng response về ISP B. Stateful firewall, NAT hoặc routing bất đối xứng ở giữa có thể drop flow. Source NAT phải phù hợp uplink và return path; chỉ thêm hai default route không đảm bảo cân bằng tải đúng.

## Chẩn đoán

Ghi lại source/destination, bảng rule, route lookup, conntrack/NAT và capture trên từng interface. Kiểm tra network manager nào tạo cấu hình để thay đổi được lưu bền. Thử từng uplink riêng rồi mới bật policy nhiều đường.

## Tự kiểm tra

**Linux luôn chọn default route metric thấp nhất trên toàn bộ bảng?** Rule có thể chọn bảng khác trước.

**Hai default gateway tự tạo load balancing ổn định?** Không.

**Asymmetric routing chỉ là vấn đề hiệu năng?** Có thể làm firewall stateful hoặc NAT drop kết nối.

## Đọc tiếp

Conntrack gắn state và NAT mapping với flow, nên đường về cần phù hợp policy firewall.

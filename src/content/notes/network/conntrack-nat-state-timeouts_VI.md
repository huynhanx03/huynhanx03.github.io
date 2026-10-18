---
title: "Conntrack, NAT state và timeout của firewall"
category: "Network"
tags: ["network", "firewall", "nat", "conntrack"]
description: "Theo dõi connection tracking trong firewall stateful, quan hệ NAT với flow state và cách timeout gây lỗi kết nối."
updated: 2026-10-16
translationKey: "network/conntrack-nat-state-timeouts"
---

Firewall stateless đánh giá từng packet theo header hiện tại; firewall stateful lưu trạng thái flow để nhận biết packet thuộc kết nối đã thấy. Linux netfilter dùng connection tracking (conntrack) cho nhiều tính năng stateful và NAT. Trạng thái này là bảng trong kernel, có giới hạn kích thước và timeout.

## State và chiều packet

Conntrack phân loại flow theo tuple địa chỉ/port/protocol cùng zone và metadata. `NEW`, `ESTABLISHED`, `RELATED` là các state thường gặp trong rule; chúng mô tả quan hệ packet với state table, không phải handshake TCP hoàn chỉnh được xác minh tuyệt đối.

NAT thường gắn mapping với conntrack để dịch nhất quán packet hai chiều. Vì vậy packet reply có thể được dịch ngược theo mapping đã tạo. Khi state hết hạn hoặc bảng đầy, packet có thể bị drop dù rule có vẻ cho phép.

## Timeout và chẩn đoán

UDP cũng có conntrack state nhưng không có FIN đóng kết nối như TCP; idle timeout dọn entry. Flow lâu không gửi packet có thể mất mapping. Tăng timeout bừa bãi làm bảng lớn hơn và có thể tăng rủi ro tài nguyên.

`conntrack -L`/`conntrack -E` (nếu cài) quan sát entry/event; `nft list ruleset` xem policy; kernel log và counter kiểm tra drop. Khi NAT lỗi, đối chiếu tuple trước/sau dịch và capture ở cả hai interface.

## Tự kiểm tra

**`ESTABLISHED` luôn chứng minh TCP đã hoàn tất handshake đúng?** Không; đó là trạng thái firewall theo dấu packet đã quan sát.

**NAT stateless trong mọi triển khai phổ biến?** Không; mapping thường dựa trên conntrack state.

**UDP không có state vì không kết nối?** Ứng dụng UDP không có connection handshake, nhưng firewall vẫn có thể theo dõi flow state.

## Đọc tiếp

Rule nftables kết hợp hook, chain, priority và conntrack state để áp policy theo từng hướng.

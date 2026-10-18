---
title: "Firewall Linux: nftables, chain và connection state"
category: "Network"
tags: ["linux", "network", "firewall", "nftables"]
description: "Hiểu nftables table/chain/hook, default policy, stateful rule và cách không tự khóa đường SSH."
updated: 2026-10-16
translationKey: "network/linux-firewall-nftables"
---

nftables là framework firewall hiện đại trong Linux; `nft` cấu hình rule được kernel thực thi tại hook network. Distro có thể dùng frontend như firewalld/UFW để sinh rule. Trước khi chỉnh, xem ai đang quản policy để không tạo hai nguồn cấu hình xung đột.

## Table, chain và hook

Table nhóm chain. Base chain gắn với hook như input, output hoặc forward; regular chain không có hook riêng mà được gọi bằng jump/goto. Nhiều base chain có thể cùng nằm trên một hook và được xét theo priority. Accept ở một chain chưa bảo đảm packet qua được chain sau; drop thì kết thúc xử lý packet ([nftables manual](https://netfilter.org/projects/nftables/manpage.html)). Rule match interface, address, protocol, port, conntrack state và verdict accept/drop/reject/jump. Rule order có thể quan trọng.

`input` xử lý traffic tới host, `output` traffic do host tạo, `forward` traffic đi qua router/container host. DNAT/SNAT đặt ở NAT hooks khác với filter chain.

## Stateful policy

Rule thường cho traffic thuộc established/related state để response của outbound connection quay về. Initial inbound connection cần rule riêng. Conntrack table có timeout/capacity; nhiều UDP flow hoặc scan có thể gây áp lực.

## An toàn khi remote

Lưu cấu hình trước, thêm rule cho SSH/management trước khi áp default drop, dùng timed rollback hoặc console ngoài băng. Test IPv4 và IPv6; rule chỉ áp family này có thể để family kia lọt.

## Tóm tắt

- nftables dùng table/chain/hook và verdict trong kernel.
- Input/output/forward xử lý traffic tới host, từ host và qua host.
- NAT và filter là chức năng khác nhau.
- Conntrack state cho phép response flow nhưng không thay inbound policy.
- Remote firewall update cần rollback và kiểm tra IPv4/IPv6.

## Tự kiểm tra

**Rule accept established mở port mới từ Internet?** Không; state phụ thuộc flow đã được thiết lập.

**NAT chain thay thế filter chain?** Không.

**Thay firewall qua SSH không thể khóa mình?** Có thể; luôn chuẩn bị rollback.

## Đọc tiếp

NFS/SMB cũng cần firewall ports và authentication policy phù hợp.

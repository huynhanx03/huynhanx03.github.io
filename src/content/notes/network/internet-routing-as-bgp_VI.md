---
title: "Internet routing: ISP, AS và BGP"
category: "Network"
tags: ["network", "routing", "bgp", "internet"]
description: "Mở rộng route table từ LAN tới liên mạng toàn cầu, hiểu autonomous system và policy BGP."
updated: 2026-10-16
translationKey: "network/internet-routing-as-bgp"
---

Router trong LAN thường có default gateway. Trên Internet, các mạng do tổ chức/ISP vận hành kết nối qua exchange, transit provider và peering. Một **Autonomous System (AS)** là mạng dưới một chính sách routing chung, nhận dạng bằng ASN.

## Intra-domain và inter-domain

IGP như OSPF/IS-IS thường trao đổi route bên trong một AS theo cost/topology. BGP trao đổi prefix giữa AS và áp policy kinh tế/quản trị. BGP chọn đường không chỉ theo đường ngắn nhất vật lý; local preference, AS path, communities và policy ảnh hưởng.

## Prefix announcement và reachability

AS quảng bá prefix nào có thể tới được. Route leak hoặc hijack có thể khiến traffic đi sai hướng dù IP protocol hoạt động đúng. RPKI origin validation giúp kiểm tra ASN được phép originate prefix theo ROA; nó không xác nhận toàn bộ AS path hay loại mọi misconfiguration.

## Peering và transit

Peering là trao đổi traffic giữa hai mạng theo thỏa thuận; transit mua reachability tới phần còn lại Internet. BGP policy quyết định route nào được nhập/quảng bá. Hai mạng có thể có route asymmetry, nên request và response đi đường khác.

## Tóm tắt

- Internet là liên kết nhiều AS, không phải một route table tập trung duy nhất.
- IGP thường vận hành bên trong AS; BGP trao đổi inter-domain policy.
- BGP route selection xét policy, không chỉ latency/độ dài.
- RPKI kiểm tra origin prefix theo ROA, không xác thực toàn path.
- Asymmetric routing và route leak ảnh hưởng chẩn đoán.

## Tự kiểm tra

**BGP luôn chọn đường ít hop nhất?** Không; policy thường quyết định.

**RPKI hợp lệ nghĩa route path hoàn toàn an toàn?** Không.

**Ping đi và về cùng route?** Không đảm bảo.

## Đọc tiếp

Ứng dụng nhìn thấy kết quả DNS/IP, nhưng packet capture có thể cho thấy path thực khác dự đoán.

---
title: "802.1X và EAP: xác thực trước khi vào mạng"
category: "Network"
tags: ["network", "802.1x", "eap", "authentication"]
description: "Theo supplicant, authenticator và RADIUS; phân biệt EAP framework với EAP method và link encryption."
updated: 2026-10-16
translationKey: "network/eap-8021x-access-control"
---

802.1X kiểm soát quyền truy cập port Ethernet hoặc Wi-Fi trước khi client được vào mạng bình thường. Supplicant chạy trên endpoint; authenticator (switch/AP) kiểm soát port; authentication server (thường RADIUS) quyết định identity/policy.

## EAP framework

EAP là framework vận chuyển authentication method, không phải một thuật toán. EAP-TLS dùng certificate; PEAP/TTLS tạo tunnel rồi xác thực bên trong theo cấu hình. Phương thức yếu hoặc kiểm tra server certificate sai có thể cho phép credential theft.

Authenticator chuyển EAP message giữa client và server, thường qua EAPOL trên link và RADIUS phía mạng. Sau auth, server có thể trả VLAN/role/ACL attributes.

## Port state và guest access

Trước auth, port có thể chỉ cho phép EAP/control traffic; sau auth policy mở quyền. Guest VLAN/quarantine xử lý thiết bị không xác thực. Fail-open/fail-closed policy ảnh hưởng availability khi RADIUS down.

## Encryption khác authentication

WPA2/3 link encryption bảo vệ radio frames theo association key; 802.1X/EAP xác thực/derive key trong enterprise mode. Wired 802.1X xác thực port nhưng không tự mã hóa Ethernet frame. TLS ứng dụng vẫn cần thiết cho end-to-end.

## Tóm tắt

- Supplicant, authenticator và RADIUS server phối hợp.
- EAP là framework; EAP-TLS/PEAP là methods khác nhau.
- Certificate validation phía client quan trọng.
- VLAN/ACL có thể được cấp động sau authentication.
- Port authentication và link/application encryption là bảo đảm khác nhau.

## Tự kiểm tra

**EAP là cipher suite?** Không.

**802.1X wired luôn mã hóa frame?** Không.

**EAP success chứng minh user được mọi quyền?** Không; authorization policy quyết định.

## Đọc tiếp

Ghép EAP với firewall segmentation và TLS trong kiến trúc zero-trust có policy nhiều lớp.

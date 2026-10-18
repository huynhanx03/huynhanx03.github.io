---
title: "Certificate, CA và vòng đời key trong PKI"
category: "Network"
tags: ["network", "security", "pki", "certificate"]
description: "Hiểu X.509 chain, hostname validation, revocation và trách nhiệm vận hành private key."
updated: 2026-10-16
translationKey: "network/pki-certificates-and-key-lifecycle"
---

Public Key Infrastructure (PKI) liên kết public key với danh tính thông qua certificate và chain CA. Client tin một tập trust anchor, kiểm chữ ký từng certificate lên chain tới anchor, rồi kiểm hostname/time/usage theo policy.

## X.509 chain

Leaf certificate thường chứa subject/SAN, public key, validity interval, key usage và issuer. Intermediate CA ký leaf; root CA được trust store cài sẵn. Root self-signed không tự đáng tin chỉ vì chữ ký hợp lệ; trust đến từ cài đặt/policy client.

Hostname verification cần khớp SAN theo quy tắc client; CN-only legacy behavior có thể bị từ chối. Certificate hợp lệ cho một hostname không tự chứng minh backend hiện tại là service mong muốn nếu app trỏ nhầm tên.

Certificate còn có thời hạn, serial number, issuer, public key và extensions quy định phạm vi sử dụng. `Basic Constraints` phân biệt CA với end-entity; `Key Usage`/`Extended Key Usage` giới hạn thao tác hoặc vai trò; SAN có thể chứa nhiều DNS name; AIA/CDP trỏ tới thông tin issuer hoặc trạng thái. Extension được đánh dấu critical phải được client hiểu và chấp nhận, nếu không certificate path cần thất bại theo quy tắc xác thực. Certificate chỉ ràng buộc identity với key trong policy đã ký; nó không cấp quyền ứng dụng tự động.

Web of trust là mô hình phi tập trung dựa trên endorsement giữa người dùng; PKI kiểu CA xây chain phân cấp từ leaf qua intermediate tới trust anchor đã có trong máy. Chữ ký hợp lệ trên từng mắt xích chưa đủ: client còn phải kiểm đường dẫn, thời hạn, mục đích, danh tính/hostname và policy.

## Expiry, revocation và renewal

Certificate hết hạn cần gia hạn trước hạn và reload service đúng cách. Revocation qua CRL/OCSP có các trade-off availability/privacy/cache; một số client soft-fail hoặc không kiểm tra trực tuyến. Không dựa vào revocation như cách duy nhất thu hồi secret/key.

CRL là danh sách đã ký của CA, thường chứa serial bị thu hồi và mốc cập nhật; OCSP trả trạng thái cho certificate cụ thể. Cả hai vẫn đòi hỏi client tin chữ ký/trust chain và quyết định xử lý khi không lấy được trạng thái. Certificate bị thu hồi không xóa private key đã lộ, nên phải thay key/certificate và xử lý mọi nơi đang dùng secret đó. Attribute certificate là cấu trúc khác, dùng mang thuộc tính/ủy quyền mà không chứa public key của chủ thể; không nhầm nó với certificate định danh public key.

## Private key

Private key phải được bảo vệ khỏi đọc/backup/log trái phép; dùng HSM/KMS khi threat model yêu cầu. Rotation cần rollout overlap để client/server có thời gian cập nhật. Một certificate có thể bị copy tới nhiều server; cần biết phạm vi compromise.

## Tóm tắt

- Certificate nối public key với identity qua CA chain.
- Trust anchor đến từ trust store/policy, không chỉ từ chữ ký toán học.
- Hostname, thời hạn và key usage đều cần validate.
- Revocation/renewal có semantics vận hành và availability khác nhau.
- Private key lifecycle là phần cốt lõi của bảo mật TLS/IPsec.

## Tự kiểm tra

**Certificate chain ký đúng nghĩa client tin?** Chưa; chain phải kết thúc ở trust anchor và hostname/policy đúng.

**Certificate cho `api.example.com` dùng được cho mọi subdomain?** Không trừ khi SAN/wildcard rules cho phép.

**OCSP luôn được kiểm tra và bắt buộc fail closed?** Client behavior khác nhau.

## Đọc tiếp

Quay lại [TLS](/vi/notes/network/network-security-foundations-tls/) để ghép PKI vào handshake.

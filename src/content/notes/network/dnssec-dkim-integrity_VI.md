---
title: "DNSSEC và DKIM: xác thực DNS và email"
category: "Network"
tags: ["network", "dnssec", "dkim", "email security"]
description: "Hiểu chain of trust DNSSEC và chữ ký DKIM, cùng những gì mỗi cơ chế không bảo đảm."
sources:
  - title: "DNS Security Introduction and Requirements (RFC 4033)"
    url: "https://www.rfc-editor.org/rfc/rfc4033.html"
  - title: "Resource Records for the DNS Security Extensions (RFC 4034)"
    url: "https://www.rfc-editor.org/rfc/rfc4034.html"
  - title: "Protocol Modifications for the DNS Security Extensions (RFC 4035)"
    url: "https://www.rfc-editor.org/rfc/rfc4035.html"
  - title: "DNS64: DNS Extensions for Network Address Translation from IPv6 Clients to IPv4 Servers (RFC 6147)"
    url: "https://www.rfc-editor.org/rfc/rfc6147.html"
  - title: "Secret Key Transaction Authentication for DNS (TSIG) (RFC 2845)"
    url: "https://www.rfc-editor.org/rfc/rfc2845.html"
  - title: "DNS Request and Transaction Signatures (SIG(0)) (RFC 2931)"
    url: "https://www.rfc-editor.org/rfc/rfc2931.html"
  - title: "Secret Key Establishment for DNS (TKEY) (RFC 2930)"
    url: "https://www.rfc-editor.org/rfc/rfc2930.html"
  - title: "DomainKeys Identified Mail (DKIM) Signatures (RFC 6376)"
    url: "https://www.rfc-editor.org/rfc/rfc6376.html"
  - title: "Cryptographic Algorithm and Key Usage Update to DKIM (RFC 8301)"
    url: "https://www.rfc-editor.org/rfc/rfc8301.html"
  - title: "A New Cryptographic Signature Method for DKIM (RFC 8463)"
    url: "https://www.rfc-editor.org/rfc/rfc8463.html"
updated: 2026-10-17
translationKey: "network/dnssec-dkim-integrity"
---

DNSSEC và DKIM dùng chữ ký số để xác thực dữ liệu trong các hệ thống khác nhau. DNSSEC xác thực record DNS theo chain of trust; DKIM gắn chữ ký vào một số header/body email theo domain gửi. Không cơ chế nào mã hóa nội dung hay tự chứng minh người dùng cụ thể là đáng tin.

## DNSSEC chain

Zone ký record set bằng private key; DNSKEY/RRSIG cùng DS ở zone cha nối trust chain từ trust anchor của resolver. NSEC/NSEC3 có thể chứng minh một tên/record không tồn tại theo cách protocol định nghĩa.

Resolver validating kiểm tra chữ ký/thời hạn/chain. Nếu dữ liệu signed không hợp lệ, câu trả lời có thể bị coi bogus và trả SERVFAIL. Key rollover, delegation và registrar DS record cần vận hành đồng bộ.

Trong query, bit `DO` nằm trong OPT của EDNS và cho biết client muốn nhận các record DNSSEC. Bit `CD` trong DNS header cho recursive resolver biết client muốn nhận dữ liệu kể cả khi validation tại resolver thất bại, để phía client có thể tự kiểm tra. Trong response, bit `AD` là xác nhận của resolver rằng dữ liệu liên quan đã được xác thực. Client chỉ nên tin cờ này khi tin resolver và có đường kết nối an toàn tới resolver đó ([RFC 4035](https://www.rfc-editor.org/rfc/rfc4035.html)).

Resolver validating phân loại dữ liệu là secure, insecure, bogus hoặc indeterminate. Một delegation không có DS có thể được xác nhận là insecure; nhưng nếu zone đã được xác thực là secure mà thiếu chữ ký cần thiết, dữ liệu có thể là bogus. Vì vậy, cần diễn giải việc không thấy chữ ký theo trạng thái của chain of trust.

DNSKEY công bố public key trong zone; DS ở zone cha chứa digest để nối key của zone con vào chain; RRSIG ký RRset. NSEC/NSEC3 giúp resolver xác thực câu trả lời phủ định, chẳng hạn tên hoặc loại record không tồn tại. NSEC lộ thứ tự tên zone nên có thể cho phép zone enumeration. NSEC3 băm tên, nhưng không biến DNS thành bí mật: tên đoán được vẫn có thể thử, và DNSSEC không cung cấp confidentiality hay DoS protection. DNSSEC xác thực dữ liệu DNS, không xác thực người dùng ứng dụng.

DNSSEC và transaction authentication bảo vệ hai việc khác nhau. TSIG dùng secret chung để xác thực một DNS transaction như dynamic update hoặc zone transfer; SIG(0) dùng key pair; TKEY hỗ trợ thiết lập key trong một số thiết kế. Chúng không tự xác nhận nội dung zone đúng, trong khi DNSSEC bảo vệ nguồn gốc/integrity của RRset nhưng không tự cấp quyền cập nhật zone. Có thể phối hợp cả hai.

DNS64 có thể tổng hợp AAAA từ A. Bản ghi AAAA tổng hợp không phải RRset gốc được ký, nên resolver phải phối hợp việc tổng hợp với DNSSEC validation; nếu không, client validating có thể xem dữ liệu tổng hợp là bogus. [RFC 6147](https://www.rfc-editor.org/rfc/rfc6147.html) mô tả cách DNS64 tương tác với DNSSEC và giới hạn của cơ chế này.

## DKIM

Mail sender chọn một số header/body canonicalization rồi ký bằng private key. Public key được công bố trong DNS dưới selector. Receiver tra key, kiểm chữ ký và có thể dùng kết quả cùng SPF/DMARC để quyết định xử lý.

DKIM chứng minh message được ký bởi key tương ứng và một số nội dung không đổi theo quy tắc; nó không chứng minh human author hoặc bảo đảm không phishing. Forwarding/list modification có thể ảnh hưởng chữ ký tùy nội dung thay đổi.

Selector `s=` và signing domain `d=` xác định TXT record public key theo tên dạng `<selector>._domainkey.<domain>`. Header `h=` liệt kê các header field được ký; `bh=` là digest của body, còn `b=` chứa chữ ký trên các header field đó cùng header `DKIM-Signature` đã canonicalize (với giá trị `b=` được để trống khi tính chữ ký) ([RFC 6376](https://www.rfc-editor.org/rfc/rfc6376.html)). Canonicalization cho phép một số thay đổi định dạng phổ biến mà chữ ký vẫn hợp lệ, nhưng không thể bảo đảm mọi phần nội dung/metadata email đều được ký. DKIM xác nhận domain sở hữu key đã ký, không nhất thiết là tác giả hiển thị hoặc mailbox người gửi. SPF và DKIM có thể bổ trợ nhau; chính sách nhận thư (ví dụ DMARC) là lớp quyết định riêng.

## Trust và quản trị key

Chữ ký chỉ hữu ích nếu public key/chain được phân phối qua nguồn tin cậy và private key không bị lộ. Rotation, revoke, TTL cache và incident response cần được thiết kế. Thuật toán hash và chữ ký có thể bị loại bỏ khi không còn an toàn; DKIM đã cập nhật yêu cầu thuật toán qua RFC 8301 và RFC 8463.

## Tóm tắt

- DNSSEC xác thực DNS data qua chain; không mã hóa query.
- DKIM xác nhận nội dung/header email đã được ký bởi domain key theo selector.
- TSIG xác thực transaction DNS; nó không thay DNSSEC xác thực RRset.
- DNSSEC không mã hóa, không ngăn DoS và NSEC có thể làm lộ tên trong zone.
- Cả hai không chứng minh con người gửi là tốt hay nội dung an toàn.
- DNS key/DS rollover cần đồng bộ và giám sát.
- Trust phụ thuộc bảo vệ private key và kiểm tra đúng public key.

## Tự kiểm tra

**DNSSEC làm DNS query riêng tư?** Không.

**DKIM pass nghĩa email không phải phishing?** Không; attacker có thể ký domain của họ.

**Có public key là đủ tin chữ ký?** Cần tin nguồn phân phối và chain validation.

## Đọc tiếp

Topic Network Services nối bảo mật với firewall/NAT và các dịch vụ tên miền.

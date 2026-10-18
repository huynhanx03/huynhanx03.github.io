---
title: "DNS message format, zone transfer và dynamic update"
category: "Network"
tags: ["network", "dns", "edns", "zone"]
description: "Đọc query/response flags, section, EDNS0, truncation và cơ chế đồng bộ zone."
sources:
  - title: "Domain Names - Implementation and Specification (RFC 1035)"
    url: "https://www.rfc-editor.org/rfc/rfc1035.html"
  - title: "Extension Mechanisms for DNS (EDNS(0)) (RFC 6891)"
    url: "https://www.rfc-editor.org/rfc/rfc6891.html"
  - title: "DNS Transport over TCP (RFC 7766)"
    url: "https://www.rfc-editor.org/rfc/rfc7766.html"
  - title: "Incremental Zone Transfer in DNS (RFC 1995)"
    url: "https://www.rfc-editor.org/rfc/rfc1995.html"
  - title: "A Mechanism for Prompt Notification of Zone Changes (RFC 1996)"
    url: "https://www.rfc-editor.org/rfc/rfc1996.html"
  - title: "Dynamic Updates in the Domain Name System (RFC 2136)"
    url: "https://www.rfc-editor.org/rfc/rfc2136.html"
  - title: "Protocol Modifications for the DNS Security Extensions (RFC 4035)"
    url: "https://www.rfc-editor.org/rfc/rfc4035.html"
  - title: "Secret Key Transaction Authentication for DNS (TSIG) (RFC 2845)"
    url: "https://www.rfc-editor.org/rfc/rfc2845.html"
  - title: "DNS Request and Transaction Signatures (SIG(0)) (RFC 2931)"
    url: "https://www.rfc-editor.org/rfc/rfc2931.html"
updated: 2026-10-17
translationKey: "network/dns-message-zones-and-updates"
---

DNS message có header với transaction ID, flags, số lượng record ở các section và payload gồm Question, Answer, Authority, Additional. Response code phân biệt thành công, NXDOMAIN, SERVFAIL, REFUSED và trạng thái khác. Client cần kiểm tra response có khớp query đang chờ không; DNSSEC validation, nếu được bật, là bước xác thực dữ liệu riêng.

## Đọc một DNS message từ header đến câu trả lời

Header DNS dài 12 byte. Transaction ID giúp ghép response với query đang chờ; nó không phải bằng chứng xác thực. Các cờ quan trọng gồm QR (query hay response), Opcode (loại thao tác), AA (câu trả lời authoritative), TC (message bị cắt), RD (client yêu cầu recursion), RA (server có hỗ trợ recursion), AD/CD (trạng thái liên quan DNSSEC validation) và RCODE. Khi chẩn đoán, cần xem cả cờ lẫn RCODE: `NOERROR` vẫn có thể không có câu trả lời mong muốn, còn `NXDOMAIN` khác với `SERVFAIL`.

Mỗi DNS message có Question, Answer, Authority và Additional. Mỗi resource record mang owner name, type, class, TTL, độ dài RDATA và phần dữ liệu RDATA. Những record cùng owner, class và type tạo thành một RRset; DNSSEC ký theo RRset chứ không ký riêng một record đơn lẻ. Tên trong message có thể dùng compression pointer trỏ về vị trí trước đó để giảm kích thước. EDNS(0) thêm OPT pseudo-record trong Additional. Client gửi query quảng bá UDP payload tối đa mà nó nhận được; OPT cũng mang các option như DNSSEC DO bit. Đây là metadata của message, không phải record dữ liệu thông thường.

Query thông thường thường thử UDP trước. Nếu response có cờ TC, client có thể hỏi lại qua TCP; TCP cũng dùng cho AXFR và các response lớn. Vì vậy, chỉ cho phép UDP/53 qua firewall có thể làm một số truy vấn thất bại. Kích thước UDP trong EDNS(0) là giới hạn client quảng bá, không phải kích thước bảo đảm truyền được trên toàn path; fragmentation IP và thiết bị mạng có thể làm response lớn kém tin cậy.

## Query và response

Question nêu QNAME, QTYPE và QCLASS. Answer chứa record trả lời; Authority có thể chứa delegation/SOA; Additional có dữ liệu phụ như glue. Một resolver có thể trả CNAME chain cùng record đích hoặc làm query tiếp theo.

## Zone transfer và notify

AXFR truyền toàn zone; IXFR truyền thay đổi incremental khi server có journal. Primary có thể gửi [NOTIFY (RFC 1996)](https://www.rfc-editor.org/rfc/rfc1996.html) để secondary biết cần kiểm tra serial. [IXFR được mô tả trong RFC 1995](https://www.rfc-editor.org/rfc/rfc1995.html). Transfer phải được giới hạn server/identity; mở AXFR không chủ đích có thể lộ cấu trúc zone.

Secondary còn dựa vào các trường SOA như serial, refresh, retry và expire để quản lý đồng bộ khi NOTIFY không đến hoặc không được dùng. NOTIFY chỉ báo có khả năng đã đổi dữ liệu; secondary vẫn kiểm tra SOA serial rồi mới quyết định transfer. AXFR chạy trên TCP và gửi toàn bộ zone; IXFR trao đổi các thay đổi quanh serial cũ/mới, nhưng có thể cần rơi về AXFR nếu lịch sử thay đổi không còn. Serial phải tăng theo quy ước mà hệ thống quản trị zone hỗ trợ. Cần giới hạn ai được phép yêu cầu transfer và giám sát trạng thái secondary để tránh dữ liệu hết hạn hoặc phục vụ bản cũ.

## Dynamic update

DNS UPDATE cho phép thêm/xóa record theo điều kiện, hữu ích cho DHCP/DDNS. Server cần xác thực update qua policy/key và giới hạn zone. Không cho phép update unauthenticated từ toàn Internet.

Theo [RFC 2136](https://www.rfc-editor.org/rfc/rfc2136.html), update nhắm một zone và có thể kèm prerequisite để thao tác chỉ chạy khi trạng thái hiện tại còn đúng. Prerequisite có thể yêu cầu RRset đang tồn tại (có hoặc không ràng buộc giá trị), không tồn tại, hoặc tên đã/chưa được dùng. Phần update có thể thêm một RR, xóa một RRset, xóa mọi RRset tại tên, hoặc xóa một RR cụ thể. Server kiểm điều kiện trước; nếu prerequisite sai thì từ chối cả thao tác thay vì áp dụng một phần. Đây là cơ chế giúp nhiều client cập nhật tên mà giảm nguy cơ ghi đè thay đổi của nhau.

RFC 2136 DNS UPDATE khác với API của nhà cung cấp Dynamic DNS. Cả hai đều có thể cập nhật địa chỉ thay đổi, nhưng API thương mại có thể là giao thức riêng. Dù dùng cách nào, quyền cập nhật phải gắn với danh tính hoặc policy chặt; [TSIG](https://www.rfc-editor.org/rfc/rfc2845.html) và [SIG(0)](https://www.rfc-editor.org/rfc/rfc2931.html) là các cơ chế xác thực thông điệp; xem thêm bài bảo mật DNS.

## Tóm tắt

- DNS message có header/flags và các section question/answer/authority/additional.
- EDNS0 mở rộng khả năng message; truncation có thể yêu cầu TCP retry.
- AXFR/IXFR đồng bộ zone, NOTIFY báo secondary kiểm tra.
- Dynamic update cần auth/ACL rõ.
- Firewall phải xét TCP/UDP DNS theo yêu cầu.

## Tự kiểm tra

**DNS chỉ dùng UDP/53?** Không; TCP/53 cần thiết cho nhiều trường hợp.

**Additional record luôn authoritative?** Không; section phụ vẫn cần được diễn giải theo protocol/trust.

**DDNS update mở cho client tùy ý có an toàn?** Không; attacker có thể sửa namespace.

## Đọc tiếp

DNSSEC ký RRset và xác thực theo chain of trust, còn DNS message vẫn có thể truyền qua UDP/TCP.

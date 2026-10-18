---
title: "DNS record, query và rủi ro bảo mật"
category: "Network"
tags: ["network", "dns", "dnssec", "security"]
description: "Đọc A/AAAA/CNAME/MX/TXT, hiểu UDP/TCP DNS, dynamic update và cache poisoning ở mức khái niệm."
sources:
  - title: "Domain Names - Implementation and Specification (RFC 1035)"
    url: "https://www.rfc-editor.org/rfc/rfc1035.html"
  - title: "Clarifications to the DNS Specification (RFC 2181)"
    url: "https://www.rfc-editor.org/rfc/rfc2181.html"
  - title: "A DNS RR for Specifying the Location of Services (RFC 2782)"
    url: "https://www.rfc-editor.org/rfc/rfc2782.html"
  - title: "Negative Caching of DNS Queries (RFC 2308)"
    url: "https://www.rfc-editor.org/rfc/rfc2308.html"
  - title: "Extension Mechanisms for DNS (EDNS(0)) (RFC 6891)"
    url: "https://www.rfc-editor.org/rfc/rfc6891.html"
  - title: "DNS Transport over TCP (RFC 7766)"
    url: "https://www.rfc-editor.org/rfc/rfc7766.html"
  - title: "DNS Security Introduction and Requirements (RFC 4033)"
    url: "https://www.rfc-editor.org/rfc/rfc4033.html"
  - title: "DNS64: DNS Extensions for Network Address Translation from IPv6 Clients to IPv4 Servers (RFC 6147)"
    url: "https://www.rfc-editor.org/rfc/rfc6147.html"
  - title: "Dynamic Updates in the Domain Name System (RFC 2136)"
    url: "https://www.rfc-editor.org/rfc/rfc2136.html"
updated: 2026-10-17
translationKey: "network/dns-records-protocol-security"
---

DNS message có question, answer, authority và additional sections; record type xác định dữ liệu nào được hỏi. Query thông thường gửi UDP trước, nhưng TCP cũng là transport bắt buộc phải hỗ trợ và cần cho zone transfer cũng như một số response lớn. EDNS(0) (Extension Mechanisms for DNS) thêm option và cho client gửi query quảng bá kích thước UDP tối đa mà nó có thể nhận ([RFC 6891](https://www.rfc-editor.org/rfc/rfc6891.html)); đây không phải cam kết rằng mọi response đều vừa với kích thước ấy.

## Record phổ biến

- **A:** IPv4 address.
- **AAAA:** IPv6 address.
- **CNAME:** alias tới canonical name, không thể dùng tùy tiện cùng mọi record tại cùng owner name.
- **MX:** mail exchanger với preference.
- **NS:** nameserver của zone/delegation.
- **TXT:** text tùy mục đích như SPF/DKIM verification, nhưng giới hạn và semantics tùy application.
- **PTR:** reverse lookup.

Record DNS chỉ cung cấp dữ liệu; service phải xử lý và xác thực nó theo mục đích. TXT không mặc định là “text bảo mật”.

## Ý nghĩa và giới hạn của một số record

NS chỉ ra nameserver có thẩm quyền cho zone hoặc phần được delegate. Khi nameserver nằm bên trong chính domain đang được delegate, resolver có thể cần glue address từ zone cha để tìm được nameserver đó mà không rơi vào vòng phụ thuộc. Glue là dữ liệu hỗ trợ bootstrap, không nên nhầm với câu trả lời authoritative cuối cùng.

SOA mô tả thông tin quản trị zone, gồm primary server, email quản trị theo cú pháp DNS, serial, các timer refresh/retry/expire và trường MINIMUM. MINIMUM tham gia xác định TTL của câu trả lời âm để resolver cache NXDOMAIN/NODATA ([RFC 2308](https://www.rfc-editor.org/rfc/rfc2308.html)); nó không phải timer refresh.

PTR dùng cho reverse lookup dưới `in-addr.arpa` (IPv4) hoặc `ip6.arpa` (IPv6). Reverse DNS được quản lý theo vùng địa chỉ và không tự chứng minh hostname đó sở hữu địa chỉ.

MX có preference: số thấp hơn được thử trước, với nhiều máy có cùng preference có thể tạo lựa chọn phân tải. MX target cần là tên máy phù hợp, không phải CNAME tùy tiện. TXT là các chuỗi văn bản có semantics do ứng dụng quy định; SPF, xác minh domain và các ứng dụng khác có thể cùng dùng TXT, vì vậy cần đọc cú pháp của đúng ứng dụng.

SRV có thể công bố priority, weight, port và service target để client tìm dịch vụ ([RFC 2782](https://www.rfc-editor.org/rfc/rfc2782.html)); tên owner cho biết service và transport. NAPTR cho phép chọn hoặc viết lại tên dịch vụ linh hoạt hơn, nhưng biểu thức và quy trình DDDS làm cấu hình phức tạp. Nếu ứng dụng chỉ cần host/port, cơ chế đơn giản hơn thường dễ vận hành.

## DNS không phải cơ sở dữ liệu thư mục tổng quát

DNS tối ưu cho phân phối và cache các RR theo tên, không cung cấp truy vấn tùy ý phong phú để tìm thuộc tính. LDAP là giao thức truy vấn/sửa một directory tree gồm entry và attribute; tên miền có thể được ánh xạ vào các thành phần `dc`, nhưng LDAP và DNS giải quyết hai nhu cầu khác nhau. Ví dụ doanh nghiệp có thể giữ ánh xạ tên/IP trong DNS, còn tìm người dùng, phòng ban hay quyền truy cập trong LDAP/Active Directory.

## Split DNS, DNS64 và khả năng mở rộng

Split DNS trả view khác nhau tùy mạng hoặc danh tính client, thường để máy nội bộ thấy tên/địa chỉ private trong khi client Internet chỉ thấy dịch vụ công khai. Đây là chính sách phân phối dữ liệu, không phải mã hóa; cấu hình sai có thể làm lộ tên nội bộ hoặc khiến VPN dùng nhầm resolver.

DNS64 hỗ trợ client IPv6-only truy cập một số dịch vụ IPv4-only: resolver tổng hợp AAAA từ A bằng prefix dịch đã cấu hình, thường đi cùng NAT64. Địa chỉ tổng hợp không có nghĩa máy đích thật sự có IPv6. DNS64 có tương tác tinh tế với DNSSEC vì nội dung AAAA được tổng hợp; thiết kế phải xét cách validator và translator phối hợp.

RR type mới có thể được chuyển tiếp như dữ liệu opaque bởi phần mềm chưa hiểu type đó, miễn là phần mềm xử lý đúng quy tắc protocol. Proxy DNS nên chuyển tiếp record mà không tự ý diễn giải/sửa dữ liệu; nếu buộc cắt message, phải báo truncation để client có thể thử TCP. Đây là nguyên tắc tương thích quan trọng khi DNS được mở rộng.

## Rủi ro DNS cần phân biệt

Tấn công vào DNS thường nhắm tính sẵn sàng (làm resolver/authoritative quá tải) hoặc tính toàn vẹn (đưa câu trả lời giả vào cache hay giả làm nameserver). Response lớn hơn query có thể bị lợi dụng để khuếch đại lưu lượng nếu nguồn bị giả mạo và resolver mở; giới hạn recursion cho client tin cậy, chống giả mạo địa chỉ nguồn, rate limiting và bảo vệ hạ tầng authoritative giúp giảm rủi ro. Cache poisoning nhắm tính toàn vẹn của dữ liệu resolver lưu; các cơ chế bảo vệ cụ thể được giải thích ở phần sau.

Các ví dụ tấn công, TLD, nhà cung cấp DDNS và trạng thái triển khai nêu trong TCP/IP Illustrated phản ánh bối cảnh của ấn bản sách (2011), không phải danh sách hoặc đánh giá hiện trạng. Cơ chế nền tảng vẫn hữu ích để học, còn quyết định vận hành cần kiểm tra tiêu chuẩn và cấu hình hiện hành.

## UDP, TCP, truncation và zone transfer

Response lớn hơn khả năng client nhận có thể bị truncate, client có thể retry bằng TCP ([RFC 7766](https://www.rfc-editor.org/rfc/rfc7766.html)). DNS over TCP không chỉ dành cho zone transfer. AXFR/IXFR chuyển dữ liệu zone giữa nameserver có kiểm soát.

Dynamic DNS update cho phép cập nhật record qua protocol nếu server policy cho phép. Open resolver hoặc zone transfer mở rộng có thể bị lạm dụng; cấu hình ACL, authentication và rate limit theo threat model.

## Cache poisoning và DNSSEC

Resolver cache poisoning nhắm làm resolver lưu record giả. Transaction ID, source port entropy, bailiwick checking và DNSSEC là các lớp phòng vệ khác nhau. DNSSEC dùng chữ ký để xác thực tính toàn vẹn/nguồn gốc dữ liệu DNS theo chain of trust; nó không mã hóa query và không che tên người dùng khỏi resolver.

DNSSEC validation cần key rollover, trust anchor và vận hành chính xác. Một domain có record signed sai có thể bị resolver validating trả SERVFAIL; debug cần phân biệt authoritative answer với validation failure.

## LLMNR/mDNS và split DNS

mDNS giải quyết tên cục bộ trên link; LLMNR là cơ chế name resolution cục bộ ở một số môi trường. Chúng không thay DNS hierarchy toàn cầu. Split DNS có thể trả câu trả lời khác trong VPN/corporate network; policy resolver quyết định zone gửi tới đâu.

## Tóm tắt

- Record type định nghĩa dữ liệu; A/AAAA là địa chỉ, CNAME alias, MX mail.
- DNS dùng UDP và TCP; large/truncated responses có thể retry TCP.
- Zone transfer/update cần ACL và authentication phù hợp.
- DNSSEC xác thực dữ liệu DNS theo chain, không mã hóa query.
- mDNS/LLMNR và split DNS có phạm vi khác DNS public.

## Tự kiểm tra

**DNSSEC giấu domain khỏi ISP?** Không; DNSSEC xác thực, không mã hóa.

**DNS chỉ chạy trên UDP?** Không.

**SERVFAIL luôn nghĩa authoritative server không tồn tại?** Không; có thể validation hoặc resolver failure.

## Đọc tiếp

Firewall và NAT xử lý state/translation khác DNS; xem connection tracking.

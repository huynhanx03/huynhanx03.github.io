---
title: "Chẩn đoán DNS: NXDOMAIN, SERVFAIL và cache"
category: "Network"
tags: ["network", "dns", "troubleshooting"]
description: "Phân biệt lỗi tên không tồn tại, resolver thất bại và timeout; lần theo cache, delegation, DNSSEC và search domain."
updated: 2026-10-16
translationKey: "network/dns-troubleshooting-nxdomain-servfail"
---

Thông báo “DNS lỗi” có thể che nhiều trường hợp khác nhau. NXDOMAIN nghĩa là tên được hỏi không tồn tại theo câu trả lời nhận được; SERVFAIL cho biết resolver không thể hoàn tất truy vấn; timeout thường nghĩa là không nhận được phản hồi đúng hạn. Cần biết câu hỏi nào được gửi tới resolver nào.

## Tách từng lớp

`getent hosts name` đi qua NSS của hệ điều hành và phản ánh hành vi ứng dụng nhiều hơn `dig`. `dig name A @resolver` kiểm tra trực tiếp DNS server; `dig +trace name` lần theo delegation. Nếu `dig` thành công nhưng ứng dụng thất bại, xem search domain, `/etc/hosts`, NSS order, proxy hoặc cache riêng của ứng dụng.

NXDOMAIN có thể do gõ sai tên, tên chưa tồn tại hoặc negative cache cũ. Nếu tên tồn tại nhưng không có loại record được hỏi, kết quả thường là `NOERROR` với Answer rỗng (NODATA), không phải NXDOMAIN ([RFC 2308](https://www.rfc-editor.org/rfc/rfc2308.html#section-2.2)). SERVFAIL có thể do authoritative server không reachable, delegation lỗi, DNSSEC validation thất bại hoặc resolver quá tải. Timeout có thể do UDP/TCP 53 bị chặn, route sai hay server không phản hồi.

## UDP/TCP và DNSSEC

DNS thường bắt đầu bằng UDP; response lớn, truncated (TC) hoặc một số thao tác dùng TCP. Chặn TCP/53 có thể làm query lớn thất bại dù query nhỏ hoạt động. DNSSEC validation failure thường xuất hiện dưới dạng SERVFAIL ở validating resolver; so sánh resolver tin cậy và kiểm tra chain/signature.

## Quy trình

Ghi FQDN, loại record, resolver, timestamp, source network và response code. So sánh authoritative với recursive resolver; kiểm tra TTL/cache; thử UDP/TCP và kiểm tra cả IPv4/IPv6. Không flush toàn bộ cache trước khi ghi nhận trạng thái vì sẽ xóa bằng chứng hữu ích.

## Tự kiểm tra

**NXDOMAIN đồng nghĩa không nhận được packet?** Không.

**DNS chỉ dùng UDP?** Không.

**`dig` thành công chứng minh ứng dụng resolve giống vậy?** Không; ứng dụng có thể dùng NSS, cache hoặc policy khác.

## Đọc tiếp

Recursive resolution và TTL giải thích vì sao record mới không xuất hiện đồng đều ngay lập tức.

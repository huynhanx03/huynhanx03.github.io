---
title: "DNS recursive resolver và delegation"
category: "Network"
tags: ["network", "dns", "resolver"]
description: "Theo dõi câu hỏi DNS từ stub resolver qua cache đệ quy tới root, TLD và authoritative server."
updated: 2026-10-16
translationKey: "network/dns-recursive-resolution-delegation"
---

Khi ứng dụng cần địa chỉ của tên miền, nó thường hỏi stub resolver của hệ điều hành. Stub gửi truy vấn tới recursive resolver được cấu hình; resolver có thể trả từ cache hoặc tự lần theo DNS hierarchy để tìm câu trả lời authoritative.

## Delegation theo cây tên

Resolver chưa biết `www.example.com` có thể hỏi root server nơi tìm TLD server, rồi hỏi TLD server nơi tìm authoritative nameserver của zone `example.com`. Authoritative server trả record hoặc delegation tiếp theo. Root không biết mọi host; nó biết cách chỉ resolver xuống các zone con.

## Recursive và iterative query

Client thường yêu cầu recursive resolver làm việc thay mình (recursion desired). Resolver sau đó gửi iterative query, mỗi server trả dữ liệu nó quản lý hoặc referral tới nơi phù hợp. Cờ AA cho biết câu trả lời authoritative trong ngữ cảnh response; referral và glue record giúp resolver liên hệ nameserver tiếp theo.

## Cache, TTL và negative answer

Resolver cache record theo TTL, giảm độ trễ và tải. Thay đổi authoritative DNS không xóa cache ngay; resolver có thể giữ bản cũ tới khi TTL hết. Negative caching giữ kết quả “không tồn tại” trong thời gian được chỉ định. Vì thế sau khi sửa record, cần kiểm tra resolver cụ thể và TTL còn lại.

`dig name A`, `dig @server name A`, `dig +trace name` giúp quan sát từ resolver đã chọn hoặc lần theo delegation. `+trace` không mô phỏng hoàn toàn mọi chính sách của resolver doanh nghiệp.

## Tự kiểm tra

**Root DNS trả IP cho mọi website?** Không; root trả thông tin delegation.

**Sửa authoritative record làm mọi resolver thấy ngay?** Không; cache có thể còn hiệu lực.

**Recursive resolver và authoritative server luôn là cùng máy?** Không.

## Đọc tiếp

DNS record và zone file mô tả dữ liệu; DNSSEC giúp xác thực nguồn dữ liệu trong chuỗi delegation.

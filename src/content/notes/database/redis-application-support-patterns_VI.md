---
title: "Log, thống kê, tra cứu IP và cấu hình với Redis"
category: "Database"
description: "Xây các tiện ích ứng dụng từ capped log và counter đến IP lookup, service discovery và config."
updated: 2026-10-17
translationKey: "database/redis-application-support-patterns"
---

Redis có thể làm lớp hỗ trợ cho ứng dụng: lưu log gần đây, gom thống kê, ánh xạ IP sang vùng địa lý hoặc phân phối cấu hình. Các ví dụ này dạy cách chọn structure theo truy vấn. Chúng không tự tạo ra hệ thống log/audit bền vững hay control plane đáng tin; retention, nguồn dữ liệu và hành vi khi Redis lỗi vẫn phải xác định.

## Log gần đây và log thường gặp

Một list hoặc Stream có thể giữ một cửa sổ log gần đây, trim theo số entry hoặc thời gian để giới hạn RAM. Dùng field riêng cho timestamp, severity, service và correlation ID giúp lọc/điều tra. Nếu log là bằng chứng audit, gửi bản đầy đủ tới hệ lưu trữ log bền vững; Redis ring buffer chỉ giữ phần gần đây và có thể mất dữ liệu.

“Log phổ biến” có thể tổng hợp cùng loại message bằng hash counter hoặc sorted set. Cần chuẩn hóa message để biến động ID không tạo hàng triệu key riêng, nhưng không bỏ mất biến quan trọng như error code. Tách metric aggregate khỏi raw event để biết cái nào cần giữ chi tiết.

## Counter và khám phá thống kê

Counter theo event/key/time bucket dùng `INCRBY`; sorted set có thể lưu thứ hạng hoặc mức độ gần đây. Khi đọc nhiều bucket để thống kê, dùng pipeline hoặc script có giới hạn; không kéo một collection khổng lồ về client. Chọn TTL theo cửa sổ phân tích. Nếu cần tổng hợp chính xác qua restart hoặc tính lại theo nhiều chiều, event stream/warehouse phù hợp hơn một counter duy nhất.

## IP-to-city lookup

IP database thường ánh xạ dải địa chỉ thành range số nguyên rồi binary-search trên dữ liệu đã sắp xếp. Redis có thể giữ range→location hoặc shard theo prefix để tra nhanh. Địa chỉ IPv4 và IPv6 cần biểu diễn nhất quán; text lexical order không tự tương đương numeric order. Data provider có license, cập nhật và chất lượng khác nhau; cache kết quả không sửa được dữ liệu nguồn đã lỗi thời.

## Config và service discovery

Redis có thể lưu cấu hình runtime có version, timestamp, owner và TTL; consumer subscribe invalidation hoặc poll theo revision. Cấu hình quan trọng cần validate trước publish và giữ fallback cuối cùng đã biết tốt. Nếu mất Redis, service phải có hành vi rõ thay vì khởi động với giá trị mặc định nguy hiểm.

Dùng một Redis riêng cho mỗi component có thể cô lập workload, nhưng tăng số cluster/connection và vận hành. Dùng chung một server giảm footprint nhưng tạo noisy neighbor, chung eviction/failure domain và quyền truy cập rộng. Chọn theo blast radius, security, memory policy và SLA. Client connection manager cần giới hạn pool, timeout, reconnect/backoff và health check; reconnect storm cũng là tải.

## Thiết kế nguồn sự thật và retention

Ghi lại: dữ liệu nào là derived, TTL bao lâu, ai cập nhật, version/key migration thế nào, dữ liệu nào cần backup và điều gì xảy ra khi miss. Đặt prefix rõ, giữ cardinality có giới hạn, bảo vệ secret bằng ACL/TLS và không dùng Redis làm config authority duy nhất nếu control plane cần HA mạnh hơn.

Nội dung tương ứng với *Redis in Action*, ch. 5; current docs: [Streams](https://redis.io/docs/latest/develop/data-types/streams/), [sorted sets](https://redis.io/docs/latest/develop/data-types/sorted-sets/), [key expiration](https://redis.io/docs/latest/commands/expire/) và [security](https://redis.io/docs/latest/operate/oss_and_stack/management/security/).

## Tự kiểm tra

**Capped log trong Redis có đáp ứng audit compliance?** Chỉ khi retention, durability và khả năng truy xuất đáp ứng yêu cầu; thường cần sink bền vững.

**Có nên cache cấu hình không kiểm tra version?** Không; consumer cần biết cấu hình mới hơn, stale và fallback state.

**Một Redis chung luôn rẻ hơn nhiều Redis riêng?** Nó giảm số instance nhưng tăng tranh chấp, blast radius và chia sẻ eviction/failure policy.

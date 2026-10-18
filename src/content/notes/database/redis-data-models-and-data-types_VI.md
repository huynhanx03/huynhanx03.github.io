---
title: "Mô hình dữ liệu và kiểu dữ liệu Redis"
category: "Database"
description: "Chọn Redis structure theo thao tác cần làm, từ string và hash đến stream, JSON và kiểu chuyên biệt."
updated: 2026-10-17
translationKey: "database/redis-data-models-and-data-types"
---

Redis lưu dữ liệu theo key–value, nhưng value không chỉ là một chuỗi byte. Mỗi key gắn với kiểu dữ liệu có các lệnh và độ phức tạp riêng. Thiết kế tốt bắt đầu từ câu hỏi ứng dụng cần thao tác gì: đọc cả object, tăng counter nguyên tử, lấy top-N, kiểm tra membership hay tiêu thụ sự kiện theo consumer group?

## Chọn structure theo thao tác

| Kiểu | Dùng khi | Ví dụ lệnh/ý nghĩa |
| --- | --- | --- |
| String | Cache value, token, counter, bitmap | `GET`, `SET`, `INCR`, `GETEX` |
| Hash | Các field của một object | `HGET`, `HSET`, `HINCRBY` |
| List | Thứ tự hai đầu, hàng đợi đơn giản | `LPUSH`, `RPOP`, blocking pop |
| Set | Membership duy nhất, giao/hợp/tập con | `SADD`, `SISMEMBER`, `SINTER` |
| Sorted set | Xếp hạng theo score, lịch ưu tiên | `ZADD`, `ZRANGE`, `ZRANK` |
| Stream | Log sự kiện có ID, consumer group | `XADD`, `XREADGROUP`, `XACK` |
| Geospatial / probabilistic | Khoảng cách/tọa độ hoặc ước lượng membership/count | `GEO*`, HyperLogLog, Bloom/Cuckoo tùy module/edition |

Redis hiện còn có JSON, time series và vector sets ở các bản/offerings hỗ trợ; xác minh module, edition và phiên bản server trước khi dựa vào chúng. Không mặc định mọi kiểu trong trang docs có mặt trên một Redis OSS server bất kỳ.

## Redis phù hợp khi cấu trúc thao tác là một phần của bài toán

Redis đáng cân nhắc khi ứng dụng cần thao tác thường xuyên trên working set đủ nhỏ để trả chi phí RAM, và một data structure của Redis làm cho thao tác đó rõ ràng: tăng counter, quản lý membership, lấy phần tử ở hai đầu list, duy trì top-N theo score hoặc chuyển message bằng consumer group. Redis thường giữ dữ liệu trong bộ nhớ để phục vụ nhanh; persistence có thể ghi dữ liệu ra đĩa, nhưng không khiến mọi cấu hình có durability tương đương MySQL/PostgreSQL.

Một lựa chọn phổ biến là dùng Redis như **bản dẫn xuất** của database chính: cache, leaderboard, session hay search index được tính lại từ nguồn chuẩn. Cách này giảm tải và cho truy vấn phù hợp, nhưng cần freshness, invalidation, rebuild và behavior khi Redis mất dữ liệu. Nếu Redis là **nguồn chuẩn**, phải định nghĩa RPO/RTO, persistence/fsync, backup, replication failover, memory budget, eviction và recovery trước khi đưa dữ liệu quan trọng vào đó. Replica giúp phục vụ đọc và chuyển vai trò; nó không phải backup độc lập.

Redis không thay thế SQL tổng quát. Nếu ứng dụng cần join tùy ý, constraint quan hệ, truy vấn ad hoc trên dữ liệu rộng, hoặc dataset lớn hơn mức RAM kinh tế, database quan hệ/kho dữ liệu có thể phù hợp hơn. Có thể dùng hai hệ thống cùng lúc, nhưng khi đó phải chỉ rõ source of truth, luồng đồng bộ, thứ tự update, xử lý delete, idempotency và cách phát hiện lệch.

## Năm cấu trúc giải quyết năm kiểu câu hỏi

Giả sử một ứng dụng lưu bài viết, vote và nhóm chủ đề:

- Bài viết cần đọc/sửa field như title, author, timestamp: dùng **Hash** cho object nhỏ, hoặc lưu bản serialized nếu thường đọc toàn bộ và không cần sửa field riêng.
- Counter vote cần tăng nguyên tử: dùng **String integer** với `INCRBY`; nếu counter phải đổi cùng metadata trong hash, cân nhắc `HINCRBY` và gom update vào transaction/script.
- Danh sách user đã vote cần membership duy nhất: dùng **Set**; `SADD` trả cho biết member mới được thêm hay đã tồn tại.
- Dòng công việc có thứ tự xử lý hai đầu: **List** có push/pop; nếu cần ID, consumer group, pending/reclaim thì chọn **Stream** thay vì ép list thành log.
- Bài viết cần xếp hạng theo điểm hoặc thời gian: dùng **Sorted set** với ID bài là member, score là khóa sắp xếp. Một member chỉ xuất hiện một lần; cập nhật score sẽ đổi vị trí.

Mỗi kiểu biểu diễn một tập operation. Nếu câu hỏi là “ai đã vote?” thì membership Set phù hợp; nếu là “ai nằm trong top 20?” thì Sorted set phù hợp. Một key không cần tự chứa toàn bộ object nếu nhiều kiểu truy vấn cần index khác nhau, nhưng mỗi secondary structure thêm chi phí ghi, RAM, expiration và recovery.

## Ví dụ: đếm lượt xem theo bài

```text
INCR article:42:views
GET  article:42:views
```

`INCR` là thao tác nguyên tử trên một key và trả giá trị mới. Nhưng counter vẫn cần quyết định về reset, overflow/mô hình integer, thời hạn, cardinality và persistence. Nếu cần tổng hợp theo ngày, có thể dùng key theo ngày hoặc stream/event log; ghi một counter không thay thế nguồn dữ liệu audit.

## Key cũng là schema

Đặt prefix có quy tắc (`user:42`, `session:abc`, `article:42:views`), thống nhất encoding ID và phân định keyspace theo tenant/environment. Redis key là binary-safe nhưng quy ước dễ đọc giúp quản trị. Tránh gom mọi dữ liệu vào một key khổng lồ nếu cần cập nhật độc lập; tránh hàng triệu key nhỏ không có ngân sách memory/TTL.

Object có thể lưu bằng hash hoặc JSON value. Hash phù hợp đọc/sửa field độc lập; JSON thuận tiện truy vấn/cập nhật path nếu module hỗ trợ. Lưu serialized blob đơn giản nhưng cập nhật một field phải đọc-ghi toàn object và có thể ghi đè cập nhật đồng thời. Chọn theo access pattern và kích thước, không theo sở thích cú pháp.

## Complexity, encoding và memory

Đọc O(1) không nói hết chi phí. Một lệnh trả 100.000 phần tử có thể tạo latency/mạng lớn dù cấu trúc truy cập nhanh. Một số structure dùng compact encoding cho collection nhỏ rồi chuyển representation khi vượt ngưỡng; chi tiết là implementation và có thể đổi theo version. Theo dõi `MEMORY USAGE`, `INFO memory`, latency và benchmark dữ liệu thật.

Mỗi key có overhead, expiry metadata, allocator fragmentation và replication/AOF costs. Dùng TTL có chính sách rõ, tránh cache stampede, đo kích thước value và đặt eviction/memory budget. Redis có thể chứa dữ liệu bền vững, nhưng độ bền phụ thuộc persistence, replication và failure assumptions; đừng mặc định cache-only hay database-durable.

## Lập trình an toàn với key

Các lệnh nhận key thường chạy atomic từng command; chuỗi `GET` rồi `SET` từ client không atomic. Dùng `SET ... NX/EX`, transaction `WATCH/MULTI/EXEC`, hoặc script khi cần kiểm tra-cập nhật không thể tách. Với Cluster, nhiều key trong transaction/script cần ở cùng hash slot; hash tag như `{user:42}` có thể nhóm chúng nhưng tạo hotspot nếu lạm dụng.

*Redis in Action* ch. 1, 3 và 9 giới thiệu kiểu dữ liệu và các pattern; ví dụ lịch sử được điều chỉnh theo docs hiện hành: [data types](https://redis.io/docs/latest/develop/data-types/), [commands](https://redis.io/docs/latest/commands/), [keyspace](https://redis.io/docs/latest/develop/use/keyspace/).

## Tự kiểm tra

**Muốn lấy top score và thứ hạng, chọn list hay sorted set?** Sorted set biểu diễn member duy nhất cùng score và hỗ trợ truy vấn thứ hạng.

**Một Redis command atomic có làm cả chuỗi client commands atomic?** Không; dùng transaction/script hoặc thiết kế một command nguyên tử.

**Redis JSON luôn có sẵn trong mọi deployment?** Không; kiểm tra server, module/edition và version.

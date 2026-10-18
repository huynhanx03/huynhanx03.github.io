---
title: "Redis cho cache, counter và dữ liệu ứng dụng"
category: "Database"
description: "Thiết kế cache, expiration, invalidation, counter, thống kê và cấu hình dùng chung mà không tạo stale-data trap."
updated: 2026-10-18
translationKey: "database/redis-caching-counters-and-application-support"
---

Cache giảm việc lặp lại một công việc đắt, nhưng thêm một bản sao dữ liệu cần giữ đồng bộ về mặt nghiệp vụ. Redis giúp đọc nhanh; ứng dụng vẫn phải quyết định giá trị nào được cache, cache khi nào hết hạn, ai invalidation và điều gì xảy ra khi Redis không sẵn sàng.

## Cache-aside cơ bản

Ứng dụng đọc Redis; cache miss thì đọc nguồn chính, ghi kết quả kèm TTL rồi trả về. Khi ghi nguồn chính, ứng dụng có thể invalidate key hoặc cập nhật cache. Invalidate thường an toàn hơn cập nhật nhiều bản sao, nhưng có race: một reader cũ đọc database trước, writer invalidate sau, reader cũ ghi stale value lại. Có thể dùng version key, write-through, lock/single-flight hoặc chấp nhận stale window theo yêu cầu.

```text
GET cache → hit: return
         → miss: read primary DB → SET cache with TTL → return
DB write → invalidate/update cache
```

TTL giới hạn thời gian stale tối đa nhưng không thay invalidation. TTL đồng loạt làm cache stampede; thêm jitter, request coalescing, stale-while-revalidate hoặc rate limiting. Khi Redis mất kết nối, fallback database cần có giới hạn để tránh biến cache failure thành database overload.

## Counter, rate limit và thống kê

`INCR` là counter nguyên tử đơn giản. Rate limit fixed-window có thể đếm theo key bucket và TTL; request ở ranh giới hai bucket có thể được phép nhiều hơn dự định. Sliding window/log hoặc token bucket chính xác hơn nhưng tốn state/compute hơn. Hãy xác định semantics (per user/IP, timezone/window, retry, distributed replicas) trước khi chọn pattern.

Các ví dụ trong *Redis in Action* gồm analytics, IP lookup và shared configuration. Với thống kê xấp xỉ, HyperLogLog đếm distinct với sai số; bitmap lưu trạng thái theo ID compact khi miền ID phù hợp. Cache query/result phải cân nhắc privacy, tenant keying và invalidation khi schema/dependency đổi.

### Log gần nhất và log phổ biến

Một danh sách log gần đây có thể dùng List theo từng component và severity: `LPUSH recent:api:error <entry>` rồi `LTRIM ... 0 99` giữ 100 dòng mới nhất. Đây là ring buffer quan sát nhanh, không phải kho log đầy đủ: entry cũ bị xóa có chủ đích, Redis có thể restart/evict, và log không có guarantee giao nhận như hệ thống log chuyên dụng. Giữ timestamp, request/trace ID và giới hạn độ dài payload; tránh ghi token, password, thông tin cá nhân hoặc message có thể rất lớn.

Để tìm lỗi lặp nhiều, có thể đếm tần suất message trong ZSET theo cửa sổ thời gian rồi chuyển “giờ hiện tại” sang “giờ trước” khi đổi bucket. Việc rollover cùng với ghi event cần transaction hoặc một thiết kế idempotent để hai worker không cùng đổi bucket mất dữ liệu. Chuẩn hóa message trước khi đếm (ví dụ bỏ request ID) nếu không mỗi dòng thành một member khác. Dùng log pipeline/collector chuyên dụng khi cần lưu bền, phân quyền, full-text search hoặc truy vấn qua nhiều máy; Redis chỉ có thể giữ một mẫu/cửa sổ gần nhất.

Trong ví dụ của sách, `common:<component>:<severity>:start` ghi mốc giờ hiện tại. Khi sang giờ mới, writer dùng `WATCH` trên key mốc này, đưa ZSET của giờ trước sang `:last`, cập nhật mốc, rồi tăng điểm message của giờ mới. Nếu hai writer cùng rollover, một transaction nhận `WatchError` và thử lại với trạng thái mới. Cùng transaction, code còn ghi một bản vào danh sách recent để một event vừa xuất hiện có thể được xem ở cả hai góc: “vừa xảy ra” và “lặp lại nhiều”. Đọc `:last` chỉ cho biết bucket giờ liền trước, không phải lịch sử lâu dài.

### Counter theo nhiều độ phân giải

Một counter theo thời gian có thể gom event vào bucket 1 giây, 5 giây, 1 phút, 5 phút, 1 giờ, 5 giờ và 1 ngày để dashboard xem cả xu hướng ngắn lẫn dài; đây là bộ độ phân giải minh họa trong sách, cần chọn theo dashboard thực tế. Khóa có thể gồm precision và tên counter; Hash lưu `bucket_timestamp → count`, còn index liệt kê counter đang tồn tại. Khi ghi, tính `floor(timestamp / precision) × precision`, rồi `HINCRBY` bucket. Các precision nên được chọn theo câu hỏi dashboard và ngân sách cardinality, không cần nhân bản mọi metric ở mọi độ phân giải.

Hash giữ lịch sử bucket lâu dài thì không thể gắn TTL vào từng field. Job cleanup phải xóa bucket cũ, bỏ counter rỗng khỏi index và chịu được chạy trùng/đồng thời; hoặc đổi layout để mỗi bucket là key riêng có TTL. Cleanup interval, sample count và timezone phải thống nhất để ranh giới ngày/giờ không lệch giữa writer và reader. Khi đọc, chỉ lấy khoảng cần vẽ thay vì `HGETALL` toàn lịch sử.

Chương 5 minh họa giữ khoảng 120 mẫu cho mỗi độ phân giải. ZSET `known:` chứa từng cặp `precision:name` với score 0 để worker quét counter theo thứ tự ổn định mà không lưu danh sách trùng. Worker tính cutoff bằng `now − sample_count × precision`, tìm các timestamp cũ hơn rồi xóa field tương ứng. Counter 1–5 giây có thể được dọn theo nhịp một phút; counter 5 phút mỗi 5 phút, 1 giờ mỗi giờ, 5 giờ mỗi 5 giờ và 1 ngày mỗi ngày. Trước khi bỏ entry khỏi `known:`, worker dùng `WATCH` để xác nhận Hash vẫn rỗng; nếu writer vừa thêm sample, cleanup phải giữ entry đăng ký. Cách sách dùng `HKEYS` rồi sort có chi phí tăng theo số bucket, nên lịch sử lớn cần chia key theo thời gian hoặc dùng cấu trúc hỗ trợ đọc/xóa range hiệu quả hơn. `EXPIRE` áp dụng cho cả key, không tự xóa từng field Hash.

### Thống kê tổng hợp và thời gian xử lý

Từ `count`, `sum`, `sumsq`, `min`, `max` có thể tính average và độ lệch chuẩn mẫu mà không lưu mọi phép đo. `sum`/`sumsq` tăng bằng counter; min/max có thể cập nhật bằng conditional logic hoặc merge aggregate. Bản sách dùng ZSET như một túi field có score và `ZUNIONSTORE` để merge min/max; đây là kỹ thuật tận dụng command, nhưng khó hiểu hơn Hash và cần kiểm tra semantics/precision trước khi dùng. Công thức phương sai từ `sumsq - sum²/count` có thể mất chính xác do triệt tiêu số gần nhau; dùng thuật toán online hoặc metrics backend nếu độ chính xác thống kê quan trọng.

Trong ví dụ, số liệu được nhóm theo `context` và `type`, chẳng hạn `ProfilePage` + `AccessTime`. Key hiện tại giữ giờ này; sau rollover, `:last` giữ giờ liền trước. Khi ghi mẫu, code tạo hai ZSET tạm (một cho min, một cho max), rồi dùng `ZUNIONSTORE` với phép gộp tương ứng để cập nhật cực trị mà không đọc-sửa-ghi cả aggregate. Sau đó xóa key tạm và tăng `count`, `sum`, `sumsq`. Tên tạm phải tránh va chạm và cần cleanup khi lỗi; retry qua nhiều lệnh không được cộng cùng mẫu hai lần. Score ZSET có precision hữu hạn, nên đây là ví dụ cấu trúc dữ liệu chứ không phải ledger số học chính xác vô hạn.

Một helper đo thời gian thực thi có thể tự ghi metric cho route/query/template rồi cập nhật ZSET top chậm. Ví dụ ba lần đo `/search` là 40, 70 và 100 ms thì average hiện tại là 70 ms; ZSET xếp route theo average, còn aggregate giữ count/sum/min/max để hiểu thêm phân bố. Sách giữ 100 context chậm nhất và gợi ý log mẫu vượt hai độ lệch chuẩn như một bài tập; ngưỡng này cần đủ mẫu và không thay percentile/tail latency. Ghi rõ đơn vị; đo duration bằng clock monotonic (`time.monotonic()` trong Python) để điều chỉnh đồng hồ hệ thống không tạo thời lượng âm/dài bất thường; giới hạn cardinality tên context và tránh user ID/path tùy ý làm số key tăng vô hạn. Code mẫu đặt phần ghi sau `yield`, nên exception trong block có thể làm mất phép đo; helper thực tế nên chốt duration trong `try/finally`, giữ nguyên exception và ghi cả outcome/error. Top chậm là index dẫn xuất; cập nhật trung bình và xóa phần tử cũ phải đồng bộ đủ tốt với metric gốc.

## Tra IP thành thành phố: bài toán tìm khoảng

Ví dụ trong sách biến IPv4 dạng `a.b.c.d` thành số nguyên 32-bit: `a×256³ + b×256² + c×256 + d`. ZSET lưu mỗi đầu khoảng IP làm score và member phải duy nhất: sách ghép city ID với số thứ tự dòng vì nhiều range có thể trỏ về cùng city. Khi tra, bỏ hậu tố duy nhất để lấy city ID gốc; Hash ánh xạ ID đó sang tên thành phố, vùng và quốc gia. Với IP cần tra, lấy member có score lớn nhất nhưng không vượt IP bằng reverse score range giới hạn một kết quả; sau đó đọc Hash để lấy thông tin.

Đây là một ứng dụng của Sorted set cho “tìm mốc gần nhất bên trái”, không phải chỉ xếp hạng. Import cần kiểm tra header, khoảng trùng/lệch, city ID rỗng, encoding và version dataset; bản GeoLite được nêu trong sách là dữ liệu/lịch sử cũ, phải dùng nguồn hiện tại với điều khoản phù hợp. Ví dụ chỉ xử lý IPv4; IPv6 cần biểu diễn rộng hơn và cần xác định proxy/CDN nào cung cấp client IP đáng tin. Địa chỉ IP cho biết vị trí ước lượng, không chứng minh nơi ở của người dùng.

## Cấu hình runtime và service discovery

Một cờ bảo trì có thể được lưu trong Redis để nhiều process nhận thay đổi mà không redeploy từng file. Đọc Redis mỗi request sẽ tạo tải và làm request phụ thuộc vào control store; cache cục bộ trong thời gian ngắn giảm tải nhưng làm thời gian lan truyền thay đổi bằng TTL đó. Chọn rõ staleness budget, default khi Redis lỗi, schema/version cấu hình và cách rollback; cấu hình nhạy cảm cần ACL, mã hóa, audit và secret manager phù hợp.

Có thể giữ endpoint/config từng component dưới key namespace riêng và tạo connection pool tương ứng. Bản sách đề xuất một Redis server cho từng loại workload để dễ mở rộng; hiện thực tế cần cân nhắc chi phí vận hành, isolation, `maxmemory`/eviction, persistence và blast radius. Chỉ tách logical database không tạo isolation tài nguyên hay security boundary. Redis cũng không thể là nguồn duy nhất chứa thông tin cần để kết nối tới chính Redis; bootstrap endpoint phải đến từ config/deployment system khác.

Ứng dụng nên cache cấu hình trong process, refresh định kỳ hoặc nhận invalidation, rồi cập nhật client/pool khi version đổi. Khi thay endpoint, cần drain connection cũ, timeout/retry có giới hạn và không tạo connection mới trên từng command. Luồng trong sách đọc `config:<type>:<component>`, giữ config cùng thời điểm kiểm tra trong process, rồi đọc lại Redis sau cache window ngắn (ví dụ 1 giây); chỉ khi giá trị đổi mới tạo connection cho component đó. Decorator gắn tên component với hàm để truyền đúng connection pool lúc gọi thay vì truyền thủ công ở mọi nơi. Khi triển khai thật, validate/version config, tạo pool mới trước, chuyển request mới sang pool đó rồi drain pool cũ; cập nhật nửa chừng có thể trộn endpoint hoặc tạo reconnect storm. Redis không thể là cách duy nhất để tìm endpoint ban đầu của chính Redis directory.

Hai hàm mẫu khởi tạo thời điểm kiểm tra bằng `None`, rồi so trực tiếp với `time.time()`. Đó là mã Python 2: Python 3 báo `TypeError` khi so `None` với số. Bản hiện đại cần kiểm tra trường hợp chưa có giá trị trước phép trừ, chẳng hạn `last_checked is None or now - last_checked >= wait`; dùng đồng hồ monotonic cho khoảng refresh để đồng hồ hệ thống chỉnh giờ không làm cache sống quá lâu hoặc refresh liên tục.

## Đừng dùng cache làm nguồn sự thật vô tình

Nếu dữ liệu không thể tái tạo, phải thiết kế persistence, backup, replication, eviction và restore như database. `maxmemory` policy có thể tự xóa cache key theo eviction rule; key persistent/no-expiry cũng chịu policy tùy cấu hình. Đừng để critical state và best-effort cache chia sẻ cùng policy/memory pool nếu eviction của một bên làm hỏng bên kia.

## Đo hiệu quả

Đo hit/miss, latency p50/p95/p99, bytes/key, eviction, stale/error rate, database load và chi phí invalidation. Cache hit cao chưa chắc tốt nếu dữ liệu sai hoặc tail latency tăng do stampede. Dùng key versioning khi format thay đổi và giới hạn payload để eviction không tạo vòng lặp tải lớn.

Đọc *Redis in Action* ch. 2, 4 và 5 cùng docs [client-side caching](https://redis.io/docs/latest/develop/reference/client-side-caching/), [key expiration](https://redis.io/docs/latest/commands/expire/), [eviction](https://redis.io/docs/latest/develop/reference/eviction/), [benchmark](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/) và [latency troubleshooting](https://redis.io/docs/latest/management/optimization/latency/).

## Tự kiểm tra

**TTL có thay được invalidation khi ghi database?** Không; nó chỉ giới hạn tuổi tối đa của stale value.

**Cache miss đồng loạt có thể gây gì?** Nhiều request cùng đọc nguồn chính, làm database quá tải.

**Counter Redis có tự tạo audit log?** Không; counter chỉ lưu trạng thái tổng hợp, không lưu đầy đủ từng sự kiện.

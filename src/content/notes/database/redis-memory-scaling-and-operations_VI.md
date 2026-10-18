---
title: "Memory, scaling và vận hành Redis"
category: "Database"
description: "Lập ngân sách RAM, chọn eviction, shard/Cluster, bảo mật và quan sát lỗi Redis thực tế."
updated: 2026-10-17
translationKey: "database/redis-memory-scaling-and-operations"
---

Redis giữ working set trong RAM nên hiệu năng phụ thuộc không chỉ số byte value mà cả key overhead, object encoding, allocator fragmentation, replication buffer, AOF rewrite và fork copy-on-write. Chạm ngưỡng memory có thể khiến write bị từ chối hoặc key bị eviction tùy policy. Scale cần bắt đầu từ đo đạc và semantics dữ liệu.

## Memory budget và eviction

Ước lượng dataset bằng mẫu production-like, đo `MEMORY USAGE`/`INFO memory`, rồi cộng headroom cho fragmentation, client buffers, replica backlog, persistence fork và tăng trưởng. `maxmemory` không nhất thiết bằng toàn bộ RAM máy; hệ điều hành và process cần chỗ thở. Theo dõi `mem_fragmentation_ratio` cùng RSS và allocator stats, không kết luận chỉ từ một chỉ số.

Eviction policy như `allkeys-lru`, `allkeys-lfu`, `volatile-*`, `random` hay `noeviction` xác định key nào có thể bị bỏ khi vượt budget. LRU/LFU là xấp xỉ. Với mixed workload, tách instance hoặc namespace có policy/budget phù hợp hơn. `noeviction` giữ dữ liệu nhưng write có thể lỗi; eviction có thể âm thầm xóa state ứng dụng nếu keyspace không thiết kế cho cache.

## Encoding gọn cho collection nhỏ

Redis có thể lưu Hash/List/Sorted set nhỏ bằng encoding liên tục, ít pointer và metadata hơn hash table/linked structure thông thường. Set chỉ gồm integer nhỏ có thể dùng `intset`; từ Redis 7.2, Set nhỏ còn có thể dùng listpack. Các ngưỡng giới hạn số entry và độ dài value; khi vượt, Redis tự chuyển sang encoding bình thường mà không đổi API. Sách gọi compact encoding của List/Hash/ZSET là ziplist; Redis 7 thay chúng bằng listpack trong nhiều cấu trúc, nên phải xem config/version thay vì copy `*-max-ziplist-*` cũ.

Compact encoding giảm overhead nhưng thường phải quét/di chuyển nhiều byte khi đọc hoặc cập nhật một phần tử. Tăng threshold có thể giảm RAM mà làm p95/p99 xấu đi và tạo conversion latency khi collection vượt ngưỡng. Đo với cardinality/value gần production; `OBJECT ENCODING` xem representation và `MEMORY USAGE` ước lượng key-level cost, còn `INFO memory`/RSS cho góc nhìn toàn process. Không lấy benchmark ziplist/intset trong sách làm ngưỡng mặc định hiện nay.

Độ dài key, field và member cũng cộng dồn: hàng trăm triệu key có prefix dài có thể tốn đáng kể. Thiết kế namespace dễ quản lý trước, chỉ rút gọn nếu tiết kiệm đã đo được và vẫn tránh va chạm/khó debug. Với nhiều string ngắn dạng `namespace:id`, gom chúng vào Hash sharded đôi khi giảm overhead mỗi top-level key; đổi lại đọc `HGETALL`/scan và TTL từng value không còn đơn giản.

## Shard Hash/Set để giữ các mảnh nhỏ

Sharding ở đây chia một cấu trúc lớn thành nhiều key trên cùng Redis node để mỗi Hash/Set còn nằm trong compact encoding. Với ID số gần liên tục, shard có thể là `floor(id / shard_size)`; với key chuỗi, hash ổn định như CRC32 chọn một trong số shard đã định trước. Cùng một field luôn phải map đến cùng shard. Thay `shard_size`, hash function hoặc số shard làm đổi vị trí dữ liệu, nên cần version hóa và migration/resharding có dual-read/verify/cutover; không đổi config tùy tiện.

Sharded Hash vẫn cho `HGET`/`HSET` theo field vì biết shard, nhưng thao tác toàn bộ cần quét nhiều Hash và merge. Sharded Set cho membership/add theo member; phép union/intersection/count tổng thể phải phối hợp các shard và có thể tạo temporary data lớn. Shard ZSET khó hơn: rank/range toàn cục cần lấy ứng viên từ nhiều shard rồi merge top-K, còn rank/count chính xác thường buộc fanout rộng. Chỉ shard khi có access pattern giới hạn rõ, chấp nhận được query không hỗ trợ trực tiếp và lợi ích RAM/latency lớn hơn chi phí ứng dụng.

Ví dụ unique visitor trong sách giữ 15 chữ số hex đầu của UUID rồi đổi thành integer. Đây là số 60 bit để lưu; với UUIDv4, nibble version cố định nằm bên trong prefix này, nên còn khoảng 56 bit ngẫu nhiên. Nó vừa với signed integer của `intset`, nhưng là counter xấp xỉ: hai UUID khác nhau có thể trùng prefix và bị tính thành một visitor. Với `n` visitor độc lập và đều trên không gian `2^56`, xác suất có ít nhất một collision xấp xỉ `1 - exp(-n(n-1)/(2 × 2^56))`: khoảng **0,43% ở 25 triệu** và **35% ở 250 triệu** trong cùng khoảng đo. *Redis in Action* nêu dưới 1% ở 250 triệu và khoảng một lần mỗi 2.739 năm ở 25 triệu/ngày; hai con số đó không khớp birthday bound với 56 bit, nên không nên dùng chúng để lập ngân sách sai số. Muốn đếm chính xác thì giữ ID đầy đủ; nếu chỉ cần cardinality xấp xỉ, cân nhắc HyperLogLog. `SADD` chỉ biết member sau khi rút gọn đã xuất hiện hay chưa, không thể nhận ra collision giữa hai ID gốc. TTL đặt cho từng shard/bucket để thu hồi dữ liệu theo ngày.

## Pack bit/byte vào String

Với ID số tuần tự và mỗi entity chỉ cần vài byte cố định, `SETBIT`/`GETBIT` hoặc `SETRANGE`/`GETRANGE` biến String thành mảng có địa chỉ. Một bit biểu diễn Boolean; hai byte có thể mã hóa một mã vùng; nhiều byte có thể lưu counter nhỏ. Vị trí thường là `id × bytes_per_record`, nên ID sparse/rất lớn tạo khoảng zero và có thể làm key phình; chia thành shard trước khi offset tiến gần giới hạn kích thước String Redis.

Trước khi pack, định nghĩa schema byte: phiên bản, byte order, độ rộng từng trường, sentinel cho “unknown”, code table và cách xử lý giá trị ngoài miền. Thêm field hoặc đổi bảng mã có thể buộc rewrite toàn bộ dữ liệu; byte không tự mô tả schema như Hash. Bitmap nhanh/gọn cho ID dense, nhưng cập nhật bit xa tiêu thụ memory theo offset lớn nhất, không theo số bit đang bật.

Sách lưu quốc gia/tỉnh bằng hai byte dựa trên thứ tự trong bảng mã và đọc block để tổng hợp population. Đây là minh họa tradeoff space/query: aggregate toàn cục phải đọc mọi shard và giải mã từng record; aggregate theo nhóm cần lấy danh sách ID rồi đọc offset tương ứng. Dùng dataset/precision phù hợp, version bảng mã, test round-trip/unknown values và cân nhắc tính nhạy cảm của location. Với địa chỉ IP/geo hiện đại, kiểm tra licensing, IPv6 và độ chính xác; không coi bảng quốc gia/tỉnh cố định trong sách là nguồn dữ liệu chuẩn.

## Sharding và Redis Cluster

Sharding chia keyspace để tăng capacity/write throughput. Redis Cluster ánh xạ key vào 16.384 hash slot và phân slot qua primary; client xử lý `MOVED`/`ASK`, redirect và topology refresh. Failover dùng replica và có thể mất acknowledged writes trong async replication window. Multi-key command/script/transaction yêu cầu cùng slot; hash tag gom key liên quan nhưng có thể tạo hotspot.

Sharding làm thay đổi query: không có phép join/scan toàn cụm rẻ như một database đơn. Chọn key từ access pattern, tránh key không cân bằng, theo dõi hot slot, resharding và client support. Read scaling bằng replica có lag và consistency tradeoff.

## Observability và incident

Theo dõi latency distributions, slow log, command rate, rejected connections, blocked clients, memory/RSS/eviction, replication offset/lag, persistence fork/duration, AOF errors, keyspace size, CPU/network/disk và cluster slot health. Dùng `SLOWLOG`, `LATENCY` và `INFO` phù hợp; lệnh `KEYS *` hoặc scan quá nặng trên production có thể làm chậm server, nên dùng `SCAN` có giới hạn và hiểu tính nhất quán của iteration.

Khi latency tăng, kiểm tra command lớn/O(N), payload, pipeline batch, fork, swap, CPU saturation, network, hot key và failover. Redis command execution bị block bởi command/script dài; chia công việc hoặc chuyển sang background processing. Dùng ACL, TLS, bind/network isolation, secret rotation và không public port mặc định.

*Redis in Action* ch. 9–10 nói về cấu trúc, scaling và quản trị. Tham khảo [memory optimization](https://redis.io/docs/latest/management/optimization/memory-optimization/), [`OBJECT ENCODING`](https://redis.io/docs/latest/commands/object-encoding/), [eviction](https://redis.io/docs/latest/develop/reference/eviction/), [Cluster](https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/), [security](https://redis.io/docs/latest/operate/oss_and_stack/management/security/) và [latency monitoring](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/).

## Tự kiểm tra

**`maxmemory` có thể bằng tổng RAM host không?** Không nên; process, OS, buffers và fork cần headroom.

**Cluster có thể chạy multi-key transaction trên slot bất kỳ?** Các key liên quan cần cùng hash slot.

**`SCAN` là snapshot nhất quán của keyspace?** Không; key có thể đổi trong lúc iterate, nên xử lý duplicate/missing phù hợp.

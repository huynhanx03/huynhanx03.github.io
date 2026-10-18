---
title: "Command, transaction và scripting trong Redis"
category: "Database"
description: "Phân biệt atomic command, pipeline, MULTI/EXEC, WATCH và script/function trong Redis."
updated: 2026-10-18
translationKey: "database/redis-commands-transactions-and-scripting"
---

Một Redis command thường chạy trọn vẹn trước command kế tiếp trên cùng server, nhưng điều đó không làm một chuỗi round trip từ client thành một giao dịch. Nếu ứng dụng đọc giá trị, tính toán rồi ghi lại, client khác có thể chen vào giữa. Chọn giữa pipeline, transaction và script theo nhu cầu giảm round trip hay cần logic nguyên tử.

## Pipeline giảm round trip, không thêm atomicity

Pipeline gửi nhiều lệnh mà không đợi từng reply, rồi đọc các kết quả. Nó giảm network latency và chi phí I/O, nhưng không cô lập chuỗi lệnh khỏi client khác. Dùng khi các lệnh độc lập hoặc khi ứng dụng chấp nhận trạng thái trung gian; giới hạn batch size vì Redis phải giữ reply trong bộ nhớ cho đến khi client đọc chúng. Chia một đợt ingest lớn thành batch vừa phải thường giữ throughput tốt mà tránh response buffer tăng quá lớn.

Ví dụ đọc nhiều Hash có thể pipeline các `HMGET` rồi ghép reply theo ID ở client. Nếu một thao tác cần “đọc giá trị, kiểm tra điều kiện, rồi cập nhật” mà không cho client khác chen vào, pipeline không đủ; dùng một command atomic, `WATCH`/`MULTI` hoặc script.

## MULTI/EXEC và WATCH

Sau `MULTI`, commands được xếp hàng và chạy liên tiếp khi `EXEC` tới. Redis không rollback các command đã thực thi nếu một runtime error xảy ra; transaction đảm bảo không bị lệnh client khác xen giữa, chứ không phải rollback semantics như SQL. Lỗi cú pháp/queue có thể làm transaction bị từ chối trước khi chạy.

`WATCH key` tạo optimistic check: nếu key bị thay đổi trước `EXEC`, transaction abort và `EXEC` trả null. Client phải đọc lại, tính lại và retry có giới hạn/backoff; contention cao có thể khiến retry livelock. `WATCH` theo dõi key bị expire hoặc eviction như một thay đổi.

Một luồng cập nhật số dư có điều kiện có thể diễn ra như sau: `WATCH account:7`, đọc số dư, kiểm tra đủ tiền, `MULTI`, xếp `DECRBY account:7 20` và `INCRBY account:9 20`, rồi `EXEC`. Nếu `EXEC` abort, bắt đầu lại từ `WATCH` và đọc số dư mới; không chỉ gửi lại các command đã xếp hàng. Việc kiểm tra cả hai account và ghi cả hai chỉ an toàn nếu mọi key liên quan được watch và transaction không abort. Trong Cluster, các key của transaction nhiều key thường phải nằm cùng hash slot.

Phân biệt lỗi lúc xếp hàng với lỗi khi thực thi. Lệnh sai cú pháp hoặc một số lỗi queue có thể khiến Redis từ chối toàn transaction trước `EXEC`; lỗi kiểu dữ liệu phát sinh khi command chạy không rollback các command trước đó. Vì vậy hãy kiểm tra type/đầu vào trước, giữ transaction ngắn, và thiết kế trạng thái có thể phát hiện/khôi phục nếu một command runtime thất bại.

## Script và function

Lua script chạy trên server như một đơn vị atomic tương đối với command khác: không interleave trong lúc chạy. Script phù hợp khi cần đọc, kiểm tra rồi cập nhật một nhóm key với một network round trip. Script dài/blocking có thể làm chậm toàn server vì Redis command execution chủ yếu tuần tự; giới hạn input/loop và đặt timeout/monitoring.

Scripts phải khai báo key qua `KEYS` và dữ liệu qua `ARGV`; đặc biệt trên Cluster, key cần ở cùng slot. Tập trung logic để script ngắn, xác định và dễ retry. Redis Functions cung cấp cách lưu/triển khai function trên server ở phiên bản hỗ trợ; khác nhau về lifecycle/deployment nên kiểm tra docs version.

Tính nguyên tử không đồng nghĩa script có thể chạy tùy ý lâu: server không xử lý command client khác trong lúc script chạy. Không gọi dịch vụ mạng, không lặp trên collection không giới hạn và không đưa payload lớn vào script. Phần kiểm tra/ghi phải có giới hạn thời gian và lượng dữ liệu rõ ràng. Sau timeout phía client, script cũng có thể đã chạy xong; retry vẫn cần idempotency.

## Idempotency và retry

Timeout không cho client biết server chưa chạy hay đã chạy nhưng reply bị mất. Với `INCR`, retry có thể đếm hai lần. Thiết kế idempotency key, command set-if-absent, deduplication record hoặc transaction phù hợp. Đặt TTL cho dedup state và phân tích trường hợp server restart/failover; lưu ý key cùng dữ liệu phải chịu cùng durability guarantees.

## Expiration không phải lịch chạy chính xác

`EXPIRE`/`PEXPIRE` đặt thời hạn key, còn Redis xóa key qua expiration sampling/lazy access. Key hết hạn không đồng nghĩa callback chạy chính xác đúng mili giây; dùng queue/scheduler nếu cần thực thi công việc đúng hạn. `TTL` có kết quả đặc biệt khi key không tồn tại hoặc không có expiry. Lệnh ghi đè giá trị có thể xóa TTL nếu không dùng option giữ expiry thích hợp.

Expiry áp dụng cho cả key, không áp dụng riêng từng member trong List/Set/Hash/ZSET. Muốn member tự hết hạn, lưu timestamp trong Sorted set rồi dọn đến hạn, hoặc tách member thành key riêng có TTL. `SET` thành công thường thay giá trị và bỏ TTL cũ; `KEEPTTL` giữ TTL trên các phiên bản hỗ trợ. `TTL` trả `-2` khi key không tồn tại và `-1` khi key tồn tại nhưng không có expiry. Thời điểm hết hạn là quy tắc vòng đời, không phải đảm bảo dữ liệu đã được ghi bền xuống đĩa.

## Pub/Sub là broadcast tạm thời

Publisher gửi `PUBLISH channel message`; các client đang `SUBSCRIBE` nhận message khi chúng vẫn kết nối và đọc kịp. Kênh không lưu lịch sử, không có acknowledgment hay replay, và người subscribe đang offline sẽ bỏ lỡ message. Vì thế Pub/Sub hợp với thông báo realtime có thể mất như “cache này vừa invalidated” khi có cách đồng bộ lại trạng thái; không dùng làm hàng đợi thanh toán hay nguồn sự thật.

`PSUBSCRIBE news.*` nhận message từ mọi channel khớp pattern, chẳng hạn `news.db`; `PUNSUBSCRIBE` hủy một hoặc nhiều pattern. Luồng listener còn có event điều khiển: sau `SUBSCRIBE` hoặc `PSUBSCRIBE`, Redis gửi acknowledgment xác nhận đăng ký; sau `UNSUBSCRIBE` hoặc `PUNSUBSCRIBE`, nó gửi acknowledgment hủy đăng ký cùng số subscription còn lại. Đây không phải message nghiệp vụ do publisher gửi. Khi viết consumer, phân biệt event `subscribe`/`psubscribe`/`unsubscribe` với event `message`/`pmessage`; tên field và kiểu dữ liệu cụ thể phụ thuộc client library.

Khi cần lưu message, consumer group, pending work, acknowledgment hoặc đọc lại sau reconnect, dùng Redis Streams hay broker bền vững. Theo dõi slow subscriber và giới hạn output buffer để một subscriber đọc chậm không giữ vô hạn dữ liệu gửi chờ trong bộ nhớ. [Redis Pub/Sub docs](https://redis.io/docs/latest/develop/use-cases/pub-sub/) mô tả delivery hiện hành là at-most-once.

## SORT và chi phí truy vấn liên cấu trúc

`SORT` sắp xếp member của List, Set hoặc Sorted set; mặc định so sánh số, `ALPHA` so sánh chuỗi. `BY` có thể tra score/field ngoài theo pattern, `GET` trả field liên quan, `LIMIT` giới hạn kết quả và `STORE` ghi kết quả vào key khác. Ví dụ lịch sử của sách dùng các pattern `object_*->field` để lấy field Hash; cú pháp này và khả năng chạy trên Cluster phụ thuộc phiên bản.

`SORT` có thể phải đọc và sắp xếp collection lớn trên luồng xử lý command, nên `LIMIT 0 10` không đồng nghĩa chỉ xử lý 10 phần tử đầu. Ưu tiên ZSET nếu ứng dụng lặp lại cùng truy vấn xếp hạng; dùng `SORT` cho tập có giới hạn và đã đo latency. `SORT_RO` là biến thể chỉ đọc ở Redis hiện đại. Tra [SORT](https://redis.io/docs/latest/commands/sort/) và complexity trước khi đưa lệnh vào request nóng.

## Từ ví dụ marketplace đến invariant giao dịch

*Redis in Action* ghép `WATCH`/`MULTI`/`EXEC` thành chợ mua bán vật phẩm. Mỗi user có Hash `users:<id>` chứa số dư, Set `inventory:<id>` chứa vật phẩm đang sở hữu, còn Sorted set `market:` chứa vật phẩm rao bán với giá làm score. Khi rao bán, ứng dụng kiểm tra vật phẩm còn trong inventory, rồi trong transaction thêm listing vào market và xóa vật phẩm khỏi inventory. Khi mua, ứng dụng watch market và Hash của buyer, đọc giá hiện tại/số dư, kiểm tra listing chưa đổi và đủ tiền, rồi trong `MULTI` chuyển tiền, thêm vật phẩm vào inventory buyer và xóa listing.

Invariant cần giữ là “một vật phẩm chỉ thuộc một chủ tại một thời điểm” và “tiền buyer trừ đi bằng tiền seller cộng vào”. Nếu hai người cùng mua, chỉ transaction đầu tiên còn thấy listing đúng giá và commit; transaction còn lại abort/re-read. Nếu người bán đổi inventory trong lúc buyer đang mua, cần theo dõi các key làm điều kiện có thể đổi. Việc watch mọi key liên quan tăng contention, vì vậy xác định rõ tập dữ liệu mà invariant phụ thuộc.

`WATCH` là optimistic locking: Redis không khóa key để client khác chờ; nó cho các client chạy rồi hủy commit nếu dữ liệu bị đổi. Đặt retry deadline, giới hạn số lần và backoff; khi hết hạn trả kết quả conflict để ứng dụng báo thử lại, không lặp vô hạn. Không giữ transaction trong lúc gọi API bên ngoài hoặc chờ người dùng. Ví dụ sách minh họa primitive giao dịch, không tự cung cấp durability, ledger/audit trail, chống gian lận hay exactly-once qua failover; hệ thống giá trị cao nên lưu sổ giao dịch authoritative ở nơi đáp ứng yêu cầu đó.

## Đo hiệu năng mà không nhầm benchmark với ứng dụng

`redis-benchmark` giúp so sánh command đơn giản trong một cấu hình kiểm soát; nó không chạy logic ứng dụng, không nhất thiết dùng kích thước key/cardinality/serialization thật và không tính đầy đủ chi phí client. Kết quả trong sách được đo trên phần cứng, phiên bản, client Python và mạng thời đó; không dùng các số đó làm capacity plan hiện tại.

Benchmark workload gần ứng dụng: cùng command mix, payload, cardinality, số client đồng thời, TLS/network path, persistence, dataset đã warm, và thời gian đủ dài để thấy tail latency. Ghi throughput cùng p50/p95/p99 và error rate; thử một biến mỗi lần như pipeline batch size hoặc số kết nối. Pipeline thường giúp rõ nhất khi RTT chiếm phần lớn thời gian; batch quá lớn làm reply queue và latency của request khác tăng. Connection pool tránh mở TCP connection mỗi request nhưng cần giới hạn số kết nối.

Trong ví dụ Python của sách, một đối tượng `redis.Redis()` được tái sử dụng cho mỗi Redis server và logical database cần truy cập; client tự lấy connection từ pool, tái sử dụng socket và loại connection đã timeout. Sách ghi nhận pool của phiên bản `redis-py` lúc đó an toàn giữa các thread và sau `fork()`. Đây là thuộc tính của client/version cụ thể, không phải bảo đảm chung của Redis protocol; khi chọn thư viện hiện nay, kiểm tra cách thư viện quản lý pool trong ứng dụng nhiều thread hoặc process.

Khi có latency, đo cả client và server: `redis-cli --latency`, `SLOWLOG`, `INFO commandstats`/`latencystats`, `LATENCY DOCTOR`, CPU, memory, fork/persistence events và network. `MONITOR` có thể làm đổi kết quả và gây overhead, nên chỉ dùng điều tra ngắn trong phạm vi kiểm soát. Đọc [Redis benchmark](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/), [latency troubleshooting](https://redis.io/docs/latest/management/optimization/latency/) và [latency monitor](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency-monitor/).

Ví dụ update có điều kiện nên được gói trong script hoặc optimistic transaction, không tách thành vài request. Trong Cluster, Multi-key constraint ảnh hưởng cách chọn key naming. Chọn cơ chế theo yêu cầu: pipeline cho throughput, transaction cho chuỗi lệnh không bị xen ngang, script cho logic đọc/kiểm tra/ghi phía server, Pub/Sub cho broadcast tạm thời, Streams cho message có trạng thái. Đọc [transactions](https://redis.io/docs/latest/develop/using-commands/transactions/), [pipelining](https://redis.io/docs/latest/develop/using-commands/pipelining/), [Lua scripting](https://redis.io/docs/latest/develop/programmability/eval-intro/), [Functions](https://redis.io/docs/latest/develop/programmability/functions-intro/) và [command reference](https://redis.io/docs/latest/commands/).

## Tự kiểm tra

**Pipeline có đảm bảo command batch không bị client khác xen vào?** Không; nó chủ yếu giảm round trip.

**Redis MULTI có rollback mọi command khi một command lỗi lúc chạy?** Không; không dựa vào rollback kiểu SQL.

**Client timeout có chứng minh command chưa chạy?** Không; thiết kế retry có tính idempotent hoặc deduplicate.

**Pub/Sub có thể phát lại message cho subscriber vừa reconnect không?** Không; dùng Streams hoặc broker có lưu trữ nếu cần replay.

**`SORT key LIMIT 0 10` chỉ cần xử lý mười member đầu?** Không nhất thiết; Redis có thể phải duyệt/sắp xếp tập lớn trước khi trả phần giới hạn.

**Hai client mua cùng một listing có thể cùng trừ tiền?** `WATCH` listing và buyer làm transaction thứ hai abort sau khi dữ liệu thay đổi; ứng dụng phải đọc lại và xử lý conflict.

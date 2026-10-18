---
title: "Queue, messaging và Redis Streams"
category: "Database"
description: "Chọn list, Pub/Sub hay Streams theo nhu cầu delivery, replay, consumer group và xử lý lỗi."
updated: 2026-10-18
translationKey: "database/redis-queues-messaging-and-streams"
---

Queue không chỉ cần “đẩy” và “lấy” message. Cần hỏi message có mất được không, consumer chết giữa xử lý thì sao, có retry/dedup không, cần replay hay nhiều subscriber độc lập? Redis có nhiều primitive; semantics khác nhau nên không nên gọi tất cả là một message broker giống nhau.

## List queue đơn giản

`LPUSH` và `RPOP` tạo FIFO cơ bản, nhưng consumer có thể pop rồi crash trước khi xử lý xong khiến message mất. `BRPOP` chờ thay vì poll liên tục. Pattern chuyển message từ queue sang processing list (`LMOVE`/`BLMOVE`) cho phép reaper khôi phục việc dở dang, nhưng cần atomic move, retry count, idempotent handler và dead-letter policy.

Trong ví dụ email queue của sách, producer `RPUSH` JSON task vào cuối và worker `BLPOP` ở đầu, rồi dispatch tới callback đã đăng ký. Payload đa loại có dạng `[tên_callback, arguments]`; worker chỉ gọi callback nằm trong allowlist, không thực thi tên hàm tùy ý do message cung cấp. Việc pop bảo đảm hai worker không cùng lấy một item, nhưng không có ACK: process chết sau pop có thể làm mất task; callback lạ bị log rồi bỏ qua trong ví dụ. Nhiều queue truyền vào `BLPOP` được xét từ trái sang phải, nên có thể mô phỏng strict priority; nếu queue đầu luôn có việc thì queue sau có thể đói. Trong Redis Cluster, các key của cùng lệnh `BLPOP` phải thuộc cùng hash slot; hash tag có thể gom chúng lại nhưng cũng dồn workload vào một shard. Tách queue theo workload giúp cô lập retry, concurrency và lỗi poison message.

## Pub/Sub là tín hiệu không lưu trữ

Redis Pub/Sub gửi message tới subscriber đang kết nối. Subscriber ngắt kết nối sẽ bỏ lỡ message; không có backlog, ack hay replay. Dùng cho invalidation/hint best-effort hoặc fanout realtime khi nguồn sự thật nằm nơi khác. Không dùng cho tác vụ phải xử lý cuối cùng nếu mất một message là lỗi nghiệp vụ.

## Streams và consumer groups

`XADD` thêm entry có ID vào Stream. `XREAD` đọc từ ID; consumer group phân phối entry và theo dõi pending entries. Consumer gọi `XACK` sau khi xử lý; message chưa ack ở pending list có thể được claim bởi consumer khác sau timeout. Điều này tạo at-least-once processing: handler phải idempotent vì có thể xử lý lặp.

`XTRIM`/`MAXLEN` giới hạn log growth nhưng có thể xóa entry consumer còn cần; chọn retention theo outage/replay window. Pending entry bị bỏ quên cần monitor và quy trình claim/retry/poison-message. `XACK` không chứng minh side effect database đã commit nếu consumer ack sai thứ tự; dùng transaction/outbox/inbox hoặc idempotency ở application.

## Delayed và priority task

ZSET giữ task chưa đến hạn; poller chỉ chuyển task sang ready List, rồi worker mới claim sang processing. Script/Function ngắn có thể làm bước promotion atomic; nó không đồng nghĩa với side effect của worker exactly-once. Phải xử lý clock, lease, retry, cancellation, duplicate scheduling và queue growth. Nếu cần scheduling phức tạp, visibility timeout, ordering và durability nghiêm ngặt, so sánh Redis pattern với broker chuyên dụng.

Một thiết kế trong sách giữ task tương lai ở ZSET `delayed:` với score là thời điểm chạy, còn task đến hạn được chuyển sang List queue thông thường. Poller chỉ cần một hoặc vài process để kiểm tra member đầu tiên; khi đến hạn, nó claim/xóa task và enqueue vào hàng đợi đúng. Không giữ task chỉ trong RAM của poller vì process restart sẽ làm mất lịch. Thao tác lấy khỏi ZSET và enqueue phải atomic (script/transaction phù hợp); nếu tách ra, crash giữa hai bước làm mất task hoặc tạo bản sao. Đưa ID duy nhất vào payload để retry/dedup, và worker cần lease/reclaim cho task đã nhận nhưng chưa hoàn tất. `BLPOP` theo thứ tự queue có thể tạo priority, nhưng phải theo dõi starvation.

## Pull messaging cho một hoặc nhiều người nhận

Với người nhận offline, lưu message trong List theo user; client pull một batch khi kết nối lại rồi mới xóa/đánh dấu đã nhận. Giữ `message_id`, timestamp, sender, payload limit và retention; “đã pop khỏi List” không chứng minh app đã lưu message bền trên thiết bị. Nếu cần xác nhận từng message, giữ trạng thái delivered/acked riêng hoặc dùng Streams consumer group.

Group chat có thể lưu message theo thứ tự trong ZSET `chat:<id>` với sequence ID, danh sách thành viên/last-seen ID, và index từ user sang các chat của họ. Khi gửi, cấp sequence và ghi message trong cùng atomic operation để hai sender không đảo thứ tự hoặc ghi đè. Khi pull, tìm message có ID lớn hơn last-seen rồi cập nhật cursor. Nếu fanout bằng cách sao chép message vào inbox từng người, sender ghi nhiều lần và phải cleanup; giữ một log chung tiết kiệm bản sao nhưng mỗi người cần cursor và việc xóa phụ thuộc retention của cả group. Không có marker/ACK bền thì reconnect có thể nhận lặp hoặc bỏ sót; idempotent client xử lý message ID là cần thiết.

## Dùng Redis làm trạm chuyển file tạm thời

Chương 6 còn ghép group messaging với String keys để chuyển log file từ producer tới nhiều processor. Producer chia file thành block rồi `APPEND` vào key, gửi thông báo tên file, giới hạn tổng byte đang nằm trong Redis và chờ mọi consumer báo hoàn tất trước khi xóa. Consumer đọc theo block, giữ phần dòng cuối chưa hoàn chỉnh để nối block kế tiếp, giải nén stream nếu cần, xử lý từng dòng rồi tăng completion counter. Producer dùng counter này để biết khi nào có thể giải phóng file và gửi file tiếp, tạo backpressure.

Đây là bài học về streaming theo block, fanout, acknowledgment và giới hạn memory; Redis key không tự bảo đảm file bất biến hay xử lý exactly-once. Thiết kế cần file ID/version, checksum, consumer identity, timeout/retry, xử lý consumer chết và dọn file dở dang. Với file lớn hoặc lưu trữ dài hạn, object storage/shared filesystem cộng queue chỉ truyền metadata thường phù hợp hơn việc giữ toàn bộ bytes trong Redis memory. Các số block, RAM, compression ratio và tốc độ của sách là minh họa lịch sử, phải benchmark lại.

Sách *Redis in Action* ch. 6 và 11 minh họa queue, Pub/Sub, Streams/monitoring theo thời kỳ sách. Xác nhận semantics tại [Lists](https://redis.io/docs/latest/develop/data-types/lists/), [`BLPOP`](https://redis.io/docs/latest/commands/blpop/), [Redis Cluster hash tags](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/#hash-tags), [Pub/Sub](https://redis.io/docs/latest/develop/pubsub/), [Streams](https://redis.io/docs/latest/develop/data-types/streams/) và [consumer groups](https://redis.io/docs/latest/commands/xreadgroup/).

## Tự kiểm tra

**Pub/Sub có giao lại message khi subscriber reconnect?** Không.

**Streams consumer group bảo đảm handler chỉ chạy một lần?** Không; pending/reclaim có thể dẫn tới xử lý lặp.

**Ack trước khi database commit có an toàn?** Không; crash sau ack làm mất cơ hội retry side effect chưa commit.

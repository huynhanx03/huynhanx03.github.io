---
title: "Pull messaging, delayed task và phân phối file bằng Redis"
category: "Database"
description: "Theo dõi vòng đời message từ enqueue đến ack, xử lý task đến hạn và chia file cho worker theo nhóm."
updated: 2026-10-18
translationKey: "database/redis-pull-messaging-and-file-distribution"
---

Giả sử worker lấy email khỏi queue, gửi thành công rồi chết trước khi báo hoàn tất. Queue không biết email đã được gửi hay chưa, nên lần chạy sau có thể gửi trùng. Tình huống này cho thấy queue cần quản lý cả task đang xử lý, không chỉ nơi cất task đang chờ.

Trong mô hình **pull**, worker chủ động lấy task khi sẵn sàng; nhờ vậy worker chậm không bị đẩy thêm một backlog vô hạn. Redis cung cấp các thao tác để chuyển và lưu task, còn chính ứng dụng phải ghép chúng thành giao thức nhận việc, xác nhận, retry và khôi phục.

## FIFO queue có reclaim

Queue email cơ bản trong sách dùng `RPUSH` để thêm JSON task vào cuối List và `BLPOP` lấy từ đầu. Tiền tố `B` nghĩa là lệnh chờ khi List rỗng, thay vì worker liên tục hỏi Redis. Worker tổng quát có thể nhận từ nhiều List rồi dispatch payload `[callback, args]`; `callback` phải được chọn từ allowlist (danh sách hàm ứng dụng cho phép), không gọi tên hàm tùy ý ghi trong message.

`BLPOP` xóa task ngay khi worker nhận. Nếu worker chết trước khi gửi email, queue đã mất task; nếu email đã gửi nhưng worker chết trước khi báo xong, retry có thể gửi trùng. Queue List đơn giản chỉ phù hợp khi mất task chấp nhận được hoặc task có thể tạo lại.

Với task cần khôi phục, `BLMOVE` (Redis 6.2+) chuyển task nguyên tử từ List `ready` (đang chờ) sang List `processing` (đang được xử lý). Sau khi xử lý xong, worker **acknowledge** (ACK, xác nhận hoàn tất) rồi xóa task khỏi `processing`. Mỗi lần nhận việc có một **lease** (quyền xử lý có thời hạn); nếu hết hạn mà chưa được gia hạn, **reaper** (tiến trình thu hồi) có thể trả task về `ready` để worker khác thử lại. `BLMOVE` chỉ làm thao tác chuyển; nó không tự tạo lease, xác nhận có điều kiện hay chính sách retry. Vì thế task cần ID ổn định, token nhận việc, thời điểm nhận, số lần thử và trạng thái lỗi cuối.

| Trạng thái | Ready List | Processing List | Điều gì xảy ra |
| --- | --- | --- | --- |
| Chờ xử lý | task-42 | — | Worker chưa claim |
| Đang làm | — | task-42 | `BLMOVE` chuyển task khỏi ready trong cùng thao tác |
| Đã hoàn thành | — | — | Worker xác nhận rồi xóa khỏi processing |
| Worker chết/quá hạn | task-42 sau reclaim | — | Reaper trả task để worker khác thử lại |

Worker có thể chỉ bị pause chứ chưa chết; khi lease hết hạn, reaper giao task cho worker khác và cả hai có thể cùng chạy. Đây là **duplicate processing** (xử lý trùng). Tạo token mới cho mỗi lần nhận. ACK, gia hạn lease (**renew**) hoặc báo lỗi (**fail**) phải qua Lua/Function hay transaction: thao tác kiểm tra token hiện hành rồi mới đổi trạng thái. Nếu thiếu bước kiểm tra, worker cũ tỉnh lại có thể xóa claim của worker mới.

Token không thể dừng một side effect đã bắt đầu ở service khác. Handler vẫn cần **idempotency**: chạy lại cùng task ID không tạo thêm kết quả ngoài ý muốn. Nếu tài nguyên đích hỗ trợ **fencing**, gửi kèm generation tăng dần và để tài nguyên từ chối generation cũ. Với side effect trong SQL, ghi bản ghi inbox/dedup cùng transaction; chỉ xóa trạng thái queue sau khi commit, hoặc dùng giao thức outbox/inbox.

Trong Redis Cluster, key ready và processing của `BLMOVE` cần ở cùng hash slot. Có thể dùng `queue:{email}:ready` và `queue:{email}:processing`; phần `{email}` khiến hai key được đặt cùng slot để lệnh nhiều key hợp lệ.

## Delayed task

Sách cân nhắc ba cách rồi chọn ZSET: để worker gặp task tương lai tự chờ rồi enqueue lại sẽ giữ worker bận và làm thứ tự khó đoán; giữ lịch trong RAM poller sẽ mất khi chính process đó restart; lưu lịch trong Redis cho phép poller khác tiếp tục sau khi poller restart, miễn Redis vẫn giữ dữ liệu. Việc lịch còn sau khi **Redis server** restart/crash lại phụ thuộc persistence, replication và cấu hình durability. Member trong ví dụ sách là JSON gồm ID duy nhất, queue đích, callback và arguments; score là thời điểm chạy. Task đến hạn ngay được đưa thẳng vào List.

Trong thuật toán của sách, một poller đọc item có score nhỏ nhất bằng `ZRANGE ... 0 0 WITHSCORES`. Nếu chưa đến hạn, nó ngủ ngắn rồi thử lại. Nếu đã đến hạn, nó giải mã ID, queue, callback và arguments, lấy lock theo task ID, rồi chạy `ZREM delayed:` và `RPUSH queue:<đích>` trước khi nhả lock. Lock phối hợp nhiều poller trong đường chạy bình thường; hai lệnh chuyển key vẫn là hai thao tác riêng. Nếu process chết sau `ZREM` nhưng trước `RPUSH`, task có thể mất. Vì vậy cần phân biệt đúng ví dụ sách với cách viết hiện đại bên dưới: nếu cần cửa sổ chuyển trạng thái nhỏ hơn, dùng script ngắn kiểm tra task còn trong ZSET và còn đến hạn, rồi gỡ và enqueue trong một lần thực thi atomic. Script không phải transaction rollback: validate key type/đầu vào trước khi ghi và có cách reconcile khi lỗi runtime.

Một thiết kế hiện đại thường dùng ZSET `scheduled` với member là task ID, còn payload/trạng thái nằm trong Hash. Poller đọc member có due time nhỏ nhất. Nếu score còn ở tương lai, poller ngủ đến lần kiểm tra sau; nếu đã đến hạn, một Lua script/Function kiểm tra due time, gỡ ID khỏi ZSET và thêm vào ready List đích trong một chuyển trạng thái atomic. Sau đó worker claim qua processing list. Atomic ngăn poller khác chen giữa lúc chuyển trạng thái, nhưng không phải rollback: nếu command sau lỗi sau khi đã gỡ task, Redis không tự phục hồi command trước đó. Kiểm tra type/đầu vào trước mutation và có cách reconcile task bị lỗi. Chỉ cần một vài poller vì chúng chuyển lịch sang queue; không cần một poller cho mỗi worker.

Trong Cluster, ZSET lịch và List đích mà cùng script truy cập cũng cần cùng slot, chẳng hạn `tasks:{email}:scheduled` và `tasks:{email}:ready`. Gom key giúp thao tác atomic hợp lệ nhưng cũng tập trung một queue vào một shard; chia queue theo tenant/workload nếu một shard thành nút nóng.

Trace: `task-42` có due time 12:00 và đích `ready:high`. Lúc 11:59:59 poller thấy task chưa đến hạn nên ngủ ngắn. Sau 12:00, poller chuyển task sang `ready:high`; một worker claim nó vào processing. Nếu poller chết trước khi chuyển, task còn trong ZSET; nếu chuyển bằng các command rời rạc rồi chết giữa `ZREM` và `RPUSH`, task có thể mất. Script nguyên tử loại bỏ cửa sổ mất/nhân đôi giữa hai key, nhưng không biến side effect email/API phía worker thành exactly-once.

Vì ZSET không có blocking pop theo điều kiện “score ≤ hiện tại”, poller phải poll. Poll ít quá làm task trễ; poll liên tục làm tốn CPU/network. Có thể tăng thời gian ngủ khi chưa có task đến hạn, tính theo due time kế tiếp và đặt trần cho độ trễ. Mốc 10 ms/100 ms trong ví dụ sách là thông số minh họa từ thời điểm đó, không phải mặc định hiện hành.

### Ưu tiên task vừa đến hạn

Nếu task hẹn giờ phải chạy sớm nhất ngay khi đến hạn, sách đặt các queue delayed trước queue thường trong thứ tự `BLPOP`: `high-delayed`, `high`, `medium-delayed`, `medium`, `low-delayed`, `low`. Redis xét key từ trái sang phải và lấy item ở key không rỗng đầu tiên, nên lượng task high liên tục có thể làm task low đói vô hạn. Nếu chuyển nhiều task due lên đầu List bằng `LPUSH`, item push sau chạy trước; chọn đúng chiều push/pop hoặc sắp xếp batch để giữ thứ tự due mong muốn. Khi strict priority không công bằng, thêm aging, quota hoặc lịch phục vụ. Hệ thống cũng phải quyết định clock source, retry delay/backoff, cancellation, reschedule, expiry và cách xử lý khi nhiều task đến hạn cùng lúc. Trong Redis Cluster, các key `BLPOP` kiểm tra cùng lúc phải thuộc cùng hash slot; hash tag như `queue:{mail}:high` và `queue:{mail}:low` giúp điều đó đúng nhưng dồn các mức ưu tiên của mail vào một shard. Nếu cần phân tán tải, tách queue/consumer theo nhóm thay vì giả định một lệnh multi-key có thể quét cả cluster.

Clock skew giữa producer/worker làm lệch lịch; wall clock có thể nhảy. Retry quá nhanh tạo poison loop; đặt exponential backoff có jitter và giới hạn attempts. Dọn task hoàn thành để tránh keyspace tăng vô hạn.

Theo dõi ít nhất độ dài ready/delayed/processing, tuổi task cũ nhất, độ trễ so với due time, số lần reclaim/retry, task terminal và tốc độ hoàn thành. Queue depth thấp vẫn có thể che một task bị kẹt lâu; tuổi và thời gian trễ cho biết trải nghiệm thực tế hơn.

## Pull messaging nhiều người nhận

Pub/Sub chỉ phục vụ subscriber đang online. Pull messaging đặt message ở nơi người nhận có thể lấy sau khi reconnect. Với **một người nhận**, mailbox là List riêng của user: sender đẩy message vào đó, client lấy một batch khi poll rồi mới trim những message đã nhận. Nếu server trim trước khi thiết bị xác nhận đã lưu message, response bị mất có thể làm message biến mất; nếu nhiều request đồng thời cùng đọc rồi trim, chúng có thể đọc trùng. Cần ID message và ACK rõ ràng nếu không chấp nhận mất/trùng, hoặc dùng ready/processing/ACK như queue reclaim ở trên. Độ dài mailbox giúp phát hiện người nhận lâu không online hoặc backlog tăng; cần giới hạn mailbox và chính sách hết hạn để user bỏ ứng dụng không làm Redis phình vô hạn.

### Group chat: một log chung, cursor riêng cho từng thành viên

Sách tránh ghi một bản sao cho mỗi thành viên. Thay vào đó, mỗi chat có một log message chung và giữ cursor “đã xem đến đâu” cho từng người:

| Key | Thành viên | Ý nghĩa |
| --- | --- | --- |
| `chat:<id>` | username → score | Danh sách thành viên; score là message ID cao nhất đã fetch |
| `seen:<user>` | chat ID → score | Các chat user tham gia và cursor của user trong từng chat |
| `msgs:<id>` | message payload → score | Message có thứ tự, score là message ID |
| `ids:<id>` | integer counter | Cấp message ID tăng dần cho chat |

Tạo chat sẽ đăng ký từng thành viên ở cursor 0, thêm chat vào `seen:<user>` và ghi message mở đầu. Khi user join chat đã có nội dung, ví dụ sách đặt cursor ban đầu ở ID mới nhất; user mới thấy tin nhắn sau thời điểm join chứ không tự động đọc lại lịch sử. Khi gửi message, sách khóa theo chat quanh thao tác cấp ID rồi ghi message vào ZSET. Nếu sender không giữ khóa, hai writer có thể cấp ID và ghi dữ liệu theo thứ tự khác nhau; ở hệ thống hiện hành, nên đóng gói cấp ID + append log trong một script/Function ngắn cùng hash slot, hoặc transaction có retry.

Để fetch, server đọc danh sách `seen:<user>`, rồi pipeline truy vấn từng `msgs:<chat>` với score lớn hơn cursor tương ứng. Sau khi trả danh sách mới, nó cập nhật cursor của user và score thành viên trong `chat:<id>`. Có thể dọn mọi message đến ID nhỏ nhất mà các thành viên còn lại đã đọc: khi cursor nhỏ nhất là 25, không thành viên nào cần message 25 trở xuống nữa. Điều này tiết kiệm lưu trữ so với mailbox N bản, nhưng một thành viên offline lâu giữ cursor thấp và ghim toàn bộ log phía sau; cần retention cap, archive hoặc chính sách loại thành viên không hoạt động.

Trong code sách, cursor được cập nhật khi server fetch message, chưa phải sau ACK của thiết bị đã lưu/hiển thị nó. Nếu response bị mất sau khi Redis đã nâng cursor, lần fetch sau có thể bỏ qua message đó. Nếu nghiệp vụ cần xác nhận tới client, tách cursor đọc khỏi cursor ACK; chỉ dọn đến min ACK, không min “đã gửi response”. Khi user leave, gỡ cả cạnh thành viên và entry `seen`; nếu không còn ai, xóa log và counter, nếu còn thì tính lại mốc cleanup. Fetch, send, join, leave và cleanup chạm nhiều key nên cần một chính sách đồng bộ rõ; pipeline chỉ gộp round trip, không tự làm nhiều bước thành một giao dịch nguyên tử. Trong Cluster, các key một chat cần cùng hash slot cho script/transaction nhiều key, nhưng co-locate toàn bộ chat cũng tạo hot shard nếu group quá lớn.

Một log chung có chi phí ghi gần như một message mỗi chat, trong khi mailbox fan-out ghi N bản. Đổi lại, mỗi lần fetch phải đọc log theo cursor của nhiều chat; group lớn hoặc cursor rất lệch làm cleanup và truy vấn tốn hơn. Chọn theo kích thước group, thời gian offline, retention và yêu cầu ACK, không chỉ theo số lệnh ghi.

Redis Streams consumer group phù hợp chia work giữa consumer trong một group; nhiều nhóm có thể đọc độc lập cùng stream. Pending entries theo dõi message chưa ack; claim lại tạo at-least-once delivery. Trim phải giữ đủ replay window. Đây vẫn không phải end-to-end exactly once vì side effect ngoài Redis có thể commit nhưng ack bị mất.

## Phân phối file và batch work

### Bài toán sách: giới hạn bộ nhớ và gom dữ liệu trước khi ghi

Trong ví dụ của sách, nhiều worker cùng đọc log lớn để tính lượt truy cập theo ngày/quốc gia. Tra IP qua Redis cho từng dòng tạo hàng triệu round trip, nên mỗi worker nạp bảng IP→city vào local memory, gom counter cục bộ theo ngày/quốc gia, rồi mới gửi aggregate lên Redis. Với khoảng 10 triệu dòng một ngày và khoảng 300 quốc gia, phép gom giảm gần 10 triệu lần ghi thành khoảng 300 cập nhật cho chiều quốc gia; đây là số minh họa của dataset trong sách, không phải benchmark hiện hành.

Lý do chọn cách này là công việc cần tra IP rất nhiều lần nhưng tập bảng tra đủ nhỏ để nạp vào RAM worker. Sách ước lượng một lần chạy xử lý khoảng 7,3 tỷ dòng của hai năm dữ liệu; truy vấn Redis cho từng IP thêm round trip, còn MapReduce theo từng dòng khó chia sẻ bảng tra trong bộ nhớ giữa các record. Ví dụ callback nhận từng dòng `IP ngày giờ thao_tác`, cộng vào `aggregates[day][country]`; tín hiệu dòng rỗng báo hết một lô, lúc đó mới ghi các tổng theo ngày vào ZSET rồi xóa aggregate cục bộ. Mốc hàng triệu dòng, 300 quốc gia và tốc độ tra IP là số đo của máy/dataset thời sách; quyết định hiện nay phải đo lại và bảo đảm aggregate cục bộ có giới hạn.

Sender chọn file theo thứ tự, nối bytes vào Redis String bằng các block 128 KiB, rồi gửi tên file qua group-chat log để các worker biết file đã sẵn sàng. Sender theo dõi tổng byte của các file còn nằm trong Redis và chờ dọn file đã xong khi chạm giới hạn bộ nhớ (mặc định trong ví dụ là 1 GiB). Mỗi worker xử lý xong tăng counter `<file>:done`; sender chỉ xóa file và counter khi số hoàn tất bằng số worker dự kiến. Sau file cuối, sender phát sentinel `:done`, rồi tiếp tục đợi các file còn lại được giải phóng. Gửi thông báo sau khi toàn bộ file đã được ghi giúp worker không đọc một file đang upload dở.

Trong code sách, `waiting` và `bytes_in_redis` chỉ ở RAM sender, không phải manifest bền vững. Nếu sender khởi động lại, nó mất danh sách file cần cleanup dù key và message vẫn có thể còn trong Redis; bản thực tế cần trạng thái job/file có thể khôi phục. Hàm cleanup chỉ kiểm tra file đầu hàng. Một file chậm ở đầu có thể chặn việc giải phóng các file phía sau đã xong, làm sender chờ dù Redis còn dữ liệu có thể dọn. Từng lần `APPEND` cũng không có offset/checksum chunk để nhận biết retry sau timeout; retry mù có thể nối lặp bytes. Dùng chunk ID/offset, độ dài và checksum để tiếp tục hoặc phát hiện lần ghi trùng.

Receiver lấy tên file từ pull chat, chọn reader thường hoặc gzip, rồi đọc lần lượt block 128 KiB trực tiếp từ Redis bằng `GETRANGE` (code sách gọi API cũ `SUBSTR`). Hai offset của `GETRANGE` là zero-based và inclusive; sau mỗi lần đọc, tăng offset theo số byte thực nhận, không tăng cứng theo block size nếu có thể nhận block ngắn. Ví dụ đọc `start..start+131071`, rồi đặt `start += len(block)`. Generator ghép block với phần cuối chưa đủ dòng, chỉ yield khi thấy newline; block cuối có thể không có newline nên vẫn phải flush phần dư. Vì vậy worker xử lý được từng dòng mà không giữ cả file đã giải nén trong RAM. Với `.gz`, block Redis không khớp ranh giới gzip hay ranh giới dòng: phải gom đủ header (có thể có trường tùy chọn trải qua nhiều block), khởi tạo decoder một lần, đẩy từng block nén vào decoder rồi flush phần cuối. Sách tự phân tích gzip header và dùng raw-DEFLATE decoder; code hiện nay nên ưu tiên thư viện gzip streaming đã được kiểm thử. Tỷ lệ nén 2–5 lần được nêu trong sách là kinh nghiệm của dataset/thời điểm đó, không phải bảo đảm.

Đọc theo block không tự đặt giới hạn cho một dòng: generator của sách giữ phần bytes từ block trước đến khi gặp newline. Một record bị lỗi hoặc rất lớn, không có newline trong thời gian dài có thể làm worker dùng RAM tăng theo kích thước record. Đặt giới hạn độ dài dòng, báo lỗi rõ khi vượt giới hạn, và kiểm tra định dạng/encoding đầu vào trước khi cập nhật aggregate.

Khi xong một file, callback nhận tín hiệu flush để ghi aggregate cuối, sau đó worker báo hoàn tất để sender giải phóng bytes. Counter số lần hoàn tất trong ví dụ giả định mỗi worker báo đúng một lần; retry hoặc worker trùng có thể đếm vượt số dự kiến và làm sender không cleanup. Bản production nên dùng tập ACK theo `(file, worker)` hoặc trạng thái idempotent, có timeout/reclaim và xử lý worker rời nhóm.

Đây là pattern lịch sử hữu ích để học bounded fan-out, local aggregation, stream theo block, line framing và backpressure; sách thực sự chuyển bytes qua Redis, không chỉ chuyển metadata. Khi dùng cách này phải tính RAM, replication, persistence, network, giới hạn payload, eviction và thời gian file chờ worker. Giới hạn tổng `limit` 1 GiB trong ví dụ chỉ là budget của sender; tài liệu Redis hiện hành đặt mặc định tối đa 512 MiB cho **một String value**, nên file lớn hơn không thể nằm trong một key dù tổng budget còn trống. `GETRANGE` cũng tốn theo số byte trả về; chia block giới hạn RAM phía client nhưng vẫn tạo network và copy cost. Phải đặt giới hạn mỗi file thấp hơn giới hạn value, chia thành nhiều key/chunk có manifest, hoặc stream object storage. Một file lớn hơn budget còn có thể làm sender chờ mãi nếu không thể giải phóng đủ dung lượng; cần reject/partition file hoặc đổi transport. Với hệ thống mới, thường lưu blob ở object store rồi gửi reference/checksum/size qua Redis; worker xác minh checksum, cập nhật tiến độ idempotent và ACK theo worker ID. Nếu các key phối hợp trong script ở Redis Cluster, chúng phải cùng slot; co-location dễ atomic nhưng có thể dồn một workload lớn lên một shard.

Nếu cần phân công theo địa lý, set/bitmap có thể nhóm recipient; partition task theo shard để tránh một key nóng. Chunking giúp retry nhưng cần idempotent chunk ID, giới hạn đồng thời, expiry và cleanup. Redis điều phối công việc; file system/object storage giữ bytes bền vững.

## Khi nào chọn broker khác?

Chọn hệ queue chuyên dụng nếu cần backlog lớn, retention lâu, replay độc lập, ordering theo partition, flow control, dead-letter tooling hoặc durability mạnh. Redis phù hợp khi operation/keyspace đơn giản, latency thấp và team vận hành hiểu được failure semantics.

Các ví dụ này tổng hợp *Redis in Action*, ch. 6; đối chiếu [Lists](https://redis.io/docs/latest/develop/data-types/lists/), [`BLPOP`](https://redis.io/docs/latest/commands/blpop/), [`BLMOVE`](https://redis.io/docs/latest/commands/blmove/), [Redis job queue](https://redis.io/docs/latest/develop/use-cases/job-queue/), [Lua scripting](https://redis.io/docs/latest/develop/programmability/eval-intro/), [Redis Cluster hash tags](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/#hash-tags), [Streams](https://redis.io/docs/latest/develop/data-types/streams/), [consumer groups](https://redis.io/docs/latest/commands/xreadgroup/), [Pub/Sub](https://redis.io/docs/latest/develop/pubsub/), [Redis strings and their size limit](https://redis.io/docs/latest/develop/data-types/strings/), [`APPEND`](https://redis.io/docs/latest/commands/append/) và [`GETRANGE`](https://redis.io/docs/latest/commands/getrange/).

## Tự kiểm tra

**Worker chết sau khi side effect xong nhưng trước ACK sẽ thế nào?** Task có thể được giao lại; deduplicate side effect bằng task ID.

**Có nên đặt file vài GB trực tiếp trong Redis?** Thường không; lưu blob trong object storage và đưa reference/checksum vào queue.

**Delayed queue có thể bỏ qua clock skew?** Không; định nghĩa clock, độ chính xác và retry policy.

---
title: "String, list, set, hash và sorted set trong Redis"
category: "Database"
description: "Theo dõi thao tác thường dùng và độ phức tạp của năm structure cốt lõi qua ví dụ vote và bài viết."
updated: 2026-10-18
translationKey: "database/redis-core-structures-and-command-semantics"
---

Redis structure không chỉ là kiểu serialization. Mỗi type cung cấp một tập operation atomic và định hình cách ứng dụng truy vấn. Chọn type bằng cách viết trước câu hỏi cần trả lời, rồi chọn operation tương ứng; không chọn chỉ vì object trong code có hình dạng giống list/hash.

## String: value, counter và bit

String lưu byte sequence; `SET` có thể đặt expiry/điều kiện `NX`/`XX`, `MGET` đọc nhiều key, `INCRBY` cập nhật integer nguyên tử. Khi `INCR` key chưa tồn tại, Redis xem giá trị là 0; nếu key đang chứa chuỗi rỗng hoặc giá trị không parse được thành số, lệnh gây lỗi. `INCRBYFLOAT` dùng số dấu phẩy động, nên không phù hợp làm số tiền cần decimal chính xác. Client-side `GET` + cộng + `SET` có race, còn `INCR` gom thành một server command.

Bitmap là string được đánh địa chỉ bit; `SETBIT`/`GETBIT` map user ID sang trạng thái, `BITCOUNT` đếm bit 1. Phù hợp ID domain dense/bounded, không phải mọi ID thưa.

## List: thứ tự ở hai đầu

List hỗ trợ push/pop ở head/tail, range và blocking operations. `LPUSH` nhiều value đảo thứ tự so với thứ tự đối số quan sát ở head; xác minh semantics trước khi xây FIFO. `LTRIM` giữ recent window nhưng có thể xóa dữ liệu consumer chưa đọc. Truy cập giữa list có cost theo vị trí; đừng coi list như array random-access.

## Set: unique membership

`SADD` idempotent theo member và `SISMEMBER` kiểm tra membership; `SINTER`, `SUNION`, `SDIFF` biểu diễn nhóm/permission/cohort. Kết quả set không có thứ tự. Với set lớn, giao có thể tốn CPU/memory; chọn thứ tự query/selectivity phù hợp và giới hạn materialization. `SMEMBERS` kéo toàn tập về client, trong khi `SSCAN` iterate nhưng không phải snapshot.

## Hash: field trong object

Hash phù hợp nhiều field của một object: `HGET`, `HSET`, `HINCRBY`, `HDEL`. Field update độc lập và `HINCRBY` atomic cho field integer. Hash không enforce schema/foreign key; field names/data type là convention app. `HGETALL` có thể trả object rất lớn; dùng `HMGET` hoặc `HSCAN` nếu payload cần giới hạn.

## Sorted set: member duy nhất, score có thứ tự

Sorted set giữ member unique kèm score. `ZADD` cập nhật score; `ZRANGE`/`ZREVRANGE` lấy theo rank bắt đầu từ 0 và bao gồm hai đầu mút; `ZRANK`/`ZREVRANK` lấy vị trí. Score range lọc theo giá trị: mặc định lấy cả min và max, còn thêm `(` trước một bound để loại đúng biên đó. Khi score bằng nhau, member được sắp theo thứ tự byte/lexical. Score là floating-point double, nên không lưu integer rất lớn mà cần chính xác tuyệt đối. `ZINCRBY` atomic cập nhật điểm.

## Đọc chi tiết hơn các lệnh String

`GETRANGE key start end` dùng offset bắt đầu từ 0 và tính cả hai đầu; offset âm đếm từ cuối chuỗi. `SETRANGE` ghi từ một offset và có thể làm chuỗi dài ra; vùng trống được đệm bằng byte rỗng. Dùng các lệnh này khi định dạng dữ liệu thật sự phù hợp với thao tác theo byte, vì một chuỗi đóng gói khó đọc và khó nâng cấp hơn Hash.

`GETBIT`/`SETBIT` xem String như dãy bit. Offset bit đi từ bit cao xuống bit thấp trong mỗi byte; đọc một bit ngoài phần String hiện có trả `0`, còn ghi ở offset xa mở rộng key và có thể làm key lớn đáng kể. `BITCOUNT` đếm bit 1 theo byte range, còn `BITOP` tạo kết quả vào một key đích. Bitmap rất gọn cho tập ID dày và giới hạn được; với ID thưa, ID ngẫu nhiên lớn hoặc cần truy ngược ID, Set thường dễ kiểm soát hơn. `INCRBYFLOAT` thuận tiện cho số thập phân nhưng không thay thế kiểu decimal chính xác của hệ thống tài chính.

## List và quyết định hàng đợi

`LPUSH`/`RPUSH` nhận nhiều phần tử trong một lệnh; khi truyền nhiều phần tử cho `LPUSH`, phần tử cuối cùng trong danh sách đối số sẽ nằm ở đầu. `LRANGE` có endpoint bao gồm, và `-1` đại diện phần tử cuối. `LTRIM key 0 99` giữ lại tối đa 100 phần tử mới nhất nếu ứng dụng luôn push vào đầu; lệnh trim này xóa phần còn lại nên không dùng trên list còn cần xử lý.

Với 25 sản phẩm vừa xem gần nhất, nếu timestamp không cần cho analytics, `LPUSH viewed:<token> <item>` rồi `LTRIM ... 0 24` giữ một cửa sổ gọn hơn ZSET vì mỗi member không cần lưu score. Đổi lại, List không cho biết lúc nào item được xem; nếu cần đo recency chính xác hoặc truy vấn theo khoảng thời gian, giữ ZSET timestamp.

`BLPOP`/`BRPOP` chờ khi list rỗng; nếu truyền nhiều key, Redis xét theo thứ tự key trong lệnh và lấy từ key không rỗng đầu tiên. `RPOPLPUSH` (tên hiện đại là `LMOVE`/`BLMOVE` cho biến thể tương ứng) chuyển phần tử giữa hai list trong một thao tác. Mẫu “processing list” có thể giảm rủi ro mất việc khi worker chết sau khi pop, nhưng vẫn cần timeout, cơ chế reclaim việc treo và xử lý trùng. Nếu cần consumer group, pending entries, xác nhận và replay, Redis Streams phù hợp hơn một List thuần. Lệnh blocking cũng giữ một kết nối client ở trạng thái chờ; pool phải dành riêng đủ connection.

## Set, Hash và thao tác nhiều phần tử

`SADD` trả số member mới được thêm, nên return value có thể làm điều kiện chống trùng. Redis `SREM` trả số member đã xóa; một số client cũ trong ví dụ sách chuyển kết quả này thành boolean. `SPOP` xóa một member được chọn ngẫu nhiên; `SRANDMEMBER` chỉ đọc mẫu. Khi có `count`, dấu của count ảnh hưởng việc member trả về có lặp hay không; đừng dùng mẫu ngẫu nhiên để xây kết quả chính xác cần kiểm toán. `SMOVE` chuyển một member từ Set nguồn sang Set đích nếu nó tồn tại. `SINTER`, `SUNION`, `SDIFF` trả tập kết quả; các biến thể `*STORE` ghi kết quả vào key đích và có thể tốn thời gian/bộ nhớ theo kích thước đầu vào.

`HMGET` lấy một số field đã biết, `HGETALL` lấy cả Hash, còn `HSCAN` duyệt dần Hash lớn. Batch command giảm round trip nhưng không tự biến nhiều command thành một giao dịch. Tên `HMSET` trong sách là lịch sử: `HSET key field value [field value ...]` hiện nhận nhiều cặp field/value; kiểm tra phiên bản server và client trước khi sao chép ví dụ cũ.

## Chọn lệnh theo chi phí và kích thước

Đọc complexity trong command reference như một phần của thiết kế. `GET`/`HGET` một field thường có chi phí hằng số; `LRANGE`, `SMEMBERS`, `HGETALL`, giao Set hoặc sort có chi phí tăng theo dữ liệu được đọc hay xử lý. Một lệnh có thể rất nhanh với vài chục phần tử nhưng gây độ trễ dài khi collection tăng lên hàng triệu phần tử. Đặt giới hạn kích thước, dùng range có giới hạn, `HMGET`/`SSCAN`/`HSCAN`/`ZSCAN` khi phù hợp và đo p95/p99 trên cardinality gần thực tế.

Các lệnh `SCAN` family trả cursor chứ không phải snapshot. Một lượt đầy đủ có thể trả cùng phần tử nhiều lần; trong khi collection thay đổi, ứng dụng không nhận một ảnh nhất quán tại một thời điểm. `COUNT` chỉ là gợi ý khối lượng công việc, một lần gọi có thể trả rỗng mà cursor chưa về 0. Dùng thao tác lặp lại an toàn hoặc khử trùng lặp; không dùng `KEYS *` để quét keyspace production vì nó có thể chặn server trong thời gian dài.

## Ví dụ: vote bài viết

Set `voted:<article>` ngăn một user vote hai lần bằng `SADD`; chỉ khi return 1 mới tăng counter `score:<article>` bằng `INCRBY`. Hai lệnh riêng có crash window: user đã vào set nhưng counter chưa tăng. Lua script gộp trong Redis, hoặc dùng event log làm nguồn sự thật rồi tổng hợp. Dữ liệu set/counter phải có cùng expiry/lifecycle và policy persistence.


## Hello Redis: xếp bài theo điểm và thời gian

Chương 1 của *Redis in Action* xây một ứng dụng voting nhỏ để cho thấy các structure phối hợp thế nào. Ta lưu field bài viết trong Hash, người đã vote trong Set, còn hai Sorted set giữ thứ tự theo điểm và thời gian:

```text
HSET article:42 title "Redis data models" poster user:7 time 1760000000 votes 1
SADD voted:42 user:7
EXPIRE voted:42 604800
ZADD score: 1760000432 article:42
ZADD time:  1760000000 article:42
```

`score:` có thể dùng công thức minh họa `thời điểm đăng + 432 × số vote`, để bài mới có lợi thế và vote giữ bài nổi thêm một khoảng. Hệ số 432 trong sách phụ thuộc giả định “200 vote kéo dài bài một ngày”; nó là ví dụ sản phẩm, không phải công thức xếp hạng phổ quát. `time:` giữ thứ tự mới nhất độc lập với điểm.

Khi user vote, ứng dụng kiểm tra bài còn trong cửa sổ cho phép, rồi thêm user vào Set. Chỉ một `SADD` mới được tăng `score:` (`ZINCRBY`) và số vote trong Hash (`HINCRBY`). Nếu ba lệnh tách rời, crash hoặc retry có thể khiến Set đã đổi mà score chưa đổi, hoặc update bị lặp. Trên một Redis node, Lua script có thể kiểm tra cửa sổ + membership + cập nhật các key nguyên tử. Transaction `WATCH`/`MULTI` cũng dùng được khi xử lý conflict/retry đúng. Trên Redis Cluster, các key của script/transaction phải cùng hash slot; leaderboard toàn cục có thể cần shard leaderboard rồi merge top-N, hoặc pipeline cập nhật khác.

**Nếu cho phép down-vote hoặc đổi phiếu:** tách `voted:up:<article>` và `voted:down:<article>` thành hai Set để biểu diễn trạng thái của từng user. Phiếu mới cộng hoặc trừ `VOTE_SCORE`; đổi từ up sang down phải rút user khỏi Set up, thêm vào Set down và giảm tổng score hai lần `VOTE_SCORE`, vì dấu đổi từ `+1` sang `-1`. `SMOVE` có thể chuyển member giữa hai Set, nhưng cập nhật score và các counter khác vẫn là thao tác riêng; gói kiểm tra cửa sổ, chuyển Set và cập nhật điểm vào script/transaction để tránh trạng thái nửa chừng. Quyết định `votes` là tổng phiếu hay điểm ròng phải được nêu rõ trong schema.

Lấy trang top bài: `ZREVRANGE score: 0 24` trả ID từ score cao xuống; sau đó dùng `HMGET` theo batch hoặc `HGETALL` từng key để lấy metadata. Một query mỗi ID tạo N+1 round trip; batch hydrate một tập ID và dựng lại thứ tự theo ZSET. Chi phí phụ thuộc số phần tử được trả, vì vậy không kéo cả leaderboard về app chỉ để lấy vài mục đầu.

## Nhóm chủ đề là một index thứ hai

Bài có thể thuộc nhiều nhóm. Set `group:redis` lưu membership; khi người dùng mở nhóm, ứng dụng cần giao membership với thứ tự xếp hạng. Có hai thiết kế:

1. Duy trì `group-score:<name>` là Sorted set riêng, cập nhật nó khi bài được vote hoặc đổi nhóm. Đọc top-N nhanh, đổi lại mỗi vote phải cập nhật thêm mọi nhóm liên quan.
2. Tạo kết quả nhóm theo yêu cầu rồi cache bằng TTL ngắn. Giảm chi phí cập nhật liên tục nhưng có thể tốn CPU/RAM khi intersection lớn và phải chấp nhận kết quả cũ trong TTL.

Sách dùng Set làm membership input cho phép giao/hợp với Sorted set; member của Set được xem như có score 1. Source code Redis hiện tại cũng nhận cả `OBJ_SET` lẫn `OBJ_ZSET`, dù trang command reference mô tả input là Sorted set. Vì hợp đồng tài liệu và implementation không khớp hoàn toàn, hãy kiểm tra đúng server/version đang triển khai; nếu cần hành vi ổn định giữa phiên bản, duy trì group membership như Sorted set score 1. `ZINTERSTORE` có thể xử lý nhiều phần tử và ghi destination, nên không đặt vào hot request mà không đo cardinality/latency. Dùng key cache có version/TTL và tránh nhiều request cùng build một kết quả lớn.

Ví dụ, `z1 = {a:1, b:2, c:3}` và `z2 = {b:4, c:1, d:0}`. `ZINTERSTORE out 2 z1 z2` chỉ giữ `b,c`; aggregate mặc định `SUM` cho điểm `b=6, c=4`. `ZUNIONSTORE out 2 z1 z2 AGGREGATE MIN` giữ cả `a,b,c,d`, lần lượt có điểm `1,2,1,0`. `WEIGHTS` nhân score của từng input trước khi aggregate, nên chọn `SUM`, `MIN` hay `MAX` là một quyết định về ý nghĩa điểm chứ không chỉ cú pháp.

Đây là tradeoff giữa **ghi thêm index khi dữ liệu đổi** và **tính giao lúc đọc**. Nhóm nhỏ/ít đổi có thể cache kết quả; vote nhiều, nhóm hot hoặc latency chặt thường cần precomputed ranking. Khi xóa bài hoặc đổi nhóm, đồng bộ membership, score, time index và cache invalidation; thiếu một thao tác sẽ để lại orphan hoặc ranking sai.

## Expiration là vòng đời, không phải backup

Set người đã vote chỉ cần tồn tại trong thời gian bài còn nhận vote. `EXPIRE` gắn TTL vào cả key, sau đó Redis tự xóa key khi hết hạn. Cập nhật key có thể làm TTL thay đổi tùy semantics của command; kiểm tra TTL sau thao tác quan trọng. TTL không tự xóa member khỏi `score:` hay `time:`; vòng đời nhiều key cần được đồng bộ bằng cleanup, index pruning hoặc job bảo trì.

Nếu session chỉ cần tồn tại trong một thời gian và không cần dùng lần dọn cũ để làm analytics, có thể gắn TTL trực tiếp lên key session/cart/viewed rồi gia hạn khi hoạt động. ZSET hoạt động gần đây phù hợp hơn khi cần xóa theo giới hạn cardinality hoặc giữ lịch sử để phân tích. Đây là hai lifecycle khác nhau: TTL tự xóa nguyên key; ZSET cho phép ứng dụng chọn member cũ và đồng thời làm index truy vấn.

Trong ví dụ, article ID và member trong ZSET là chuỗi. Sau khi lấy danh sách, ứng dụng fetch Hash tương ứng. Nếu Hash bị xóa mà ZSET còn member, app thấy entry mồ côi; nếu ZSET xóa trước, article có thể còn nhưng không còn đường discovery. Xác định key nào là nguồn chuẩn và index nào có thể rebuild từ đâu.

## Ví dụ này dạy gì ngoài các command?

“Vote bài” thực chất gồm nhiều câu hỏi: bài còn mở không? user đã vote chưa? điểm mới là bao nhiêu? counter nào hiển thị? bài thuộc nhóm nào? Các câu hỏi ánh xạ vào ZSET, Set, Hash và counter. Redis làm từng thao tác nhanh và atomic ở mức command, nhưng nghiệp vụ nhiều key vẫn cần transaction/script, retry policy, Cluster slot design và repair/reconciliation. Sách giới thiệu từng bước rồi mới nói transaction ở chương sau; ứng dụng thật phải tính correctness ngay khi ghép các bước.

Nguồn: *Redis in Action*, ch. 1 và 3; [sorted sets](https://redis.io/docs/latest/data-types/sorted-sets/), [`ZINTERSTORE`](https://redis.io/docs/latest/commands/zinterstore/), [Redis source input-type check](https://github.com/redis/redis/blob/unstable/src/t_zset.c#L2712) and [Set score assignment](https://github.com/redis/redis/blob/unstable/src/t_zset.c#L2302), [`EXPIRE`](https://redis.io/docs/latest/commands/expire/), [command reference](https://redis.io/docs/latest/commands/) và [data types](https://redis.io/docs/latest/develop/data-types/).

## Tự kiểm tra

**Set có giữ insertion order?** Không.

**Sorted set score có thể biểu diễn mọi integer chính xác?** Không; score là double và precision hữu hạn.

**Hai command liên tiếp cho vote + score luôn atomic cùng nhau?** Không; dùng script/transaction hoặc event-driven reconciliation.

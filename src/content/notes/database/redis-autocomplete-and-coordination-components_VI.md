---
title: "Autocomplete, lock chi tiết và semaphore trong Redis"
category: "Database"
description: "Từ gợi ý liên hệ đến khóa theo tài nguyên, semaphore công bằng và các race cần ngăn."
updated: 2026-10-18
translationKey: "database/redis-autocomplete-and-coordination-components"
---

Một component dùng Redis thường là nhiều command được phối hợp thành giao thức nhỏ. Autocomplete cần cập nhật và lấy kết quả theo prefix; lock cần cấp/release quyền; semaphore giới hạn số worker. Tính đúng đắn nằm ở các chuyển trạng thái và race giữa command, không nằm ở tên structure.

## Autocomplete danh bạ

Với danh sách liên hệ gần đây, sorted set theo user có thể xếp liên hệ theo thời điểm dùng; truy vấn lấy top-K. Để tìm theo prefix, có thể duy trì index prefix→member. Khi tên đổi hoặc liên hệ bị xóa, mọi prefix cũ phải được gỡ; Unicode normalization, chữ hoa/thường, dấu và locale cần quy định thống nhất.

Tạo mọi prefix làm tăng storage theo tổng độ dài tên. Với query prefix dài/ngắn khác nhau, cần giới hạn candidate và trả top-K. Một lệnh lấy cả tập rồi lọc ở application có thể kéo quá nhiều bytes. Redis Search hoặc search service phù hợp hơn khi cần typo tolerance, stemming hoặc ranking phức tạp; pattern thủ công có thể dễ hiểu nhưng không tự có các feature đó.

### Danh sách ngắn và danh sách lớn

Với lịch sử trò chuyện, mỗi người dùng chỉ cần tối đa 100 liên hệ gần nhất. Một List là đủ: khi vừa nhắn với một người, xóa người đó khỏi vị trí cũ bằng `LREM`, đưa lên đầu bằng `LPUSH`, rồi `LTRIM` về 100 phần tử. Gộp ba lệnh trong `MULTI`/`EXEC` để hai request đồng thời không làm sai thứ tự hoặc giới hạn. Khi cần gợi ý, lấy danh sách nhỏ rồi lọc tiền tố trong ứng dụng. Chi phí xóa phụ thuộc chiều dài List, nhưng giới hạn 100 phần tử làm lựa chọn này dễ vận hành và tiết kiệm hơn một index lớn.

Với guild có hàng nghìn thành viên, kéo toàn bộ danh sách về ứng dụng để lọc sẽ tốn mạng và CPU. Có thể lưu tên đã chuẩn hóa trong ZSET với score đều bằng 0. Khi score bằng nhau, member được sắp theo thứ tự từ điển của bytes; vì vậy các tên bắt đầu bằng cùng prefix nằm liền nhau. Để tìm khoảng prefix `abc`, sách tạo hai member biên giả nằm ngay trước và sau các tên khớp, tìm rank của chúng bằng `ZRANK`, rồi lấy tối đa 10 kết quả nằm giữa.

Trong ví dụ chỉ có chữ thường `a`–`z`: cận trên của `abc` là `abc{`, vì `{` đứng sau `z` trong thứ tự ký tự được dùng. Cận dưới được tạo bằng cách lùi ký tự cuối của prefix rồi thêm ký tự biên; với `abc`, nó bắt đầu từ `abb{`. Nếu prefix rỗng, ký tự không thuộc tập cho phép hoặc tên có dấu, số hay ký tự ngoài ASCII, phép tính biên này không còn đúng. Khi hỗ trợ Unicode, cần chọn encoding và tập ký tự được hỗ trợ sao cho thứ tự bytes khớp với cách tạo hai cận; không thể thay đổi chữ hoa/thường hay chuẩn hóa ở bước query mà bỏ qua việc chuẩn hóa khi ghi index.

Hai truy vấn có thể cùng chèn member biên vào một ZSET. Mỗi lần dùng một UUID ngẫu nhiên nối vào hai member biên để chúng không đè lên nhau; sau khi chèn, `WATCH` ZSET, đọc rank, rồi dùng một transaction để xóa member biên và lấy khoảng kết quả. Nếu thành viên guild thay đổi giữa lúc đọc rank và lấy kết quả, transaction bị hủy và cần thử lại. Khi retry nhiều, chi phí tăng; một script ngắn có thể tuần tự hóa phép tìm khoảng, miễn các key cần thiết cùng hash slot nếu dùng Redis Cluster. Thêm hoặc rời guild chỉ cần `ZADD`/`ZREM` tên đã chuẩn hóa. Kỹ thuật member biên dùng được cho index có thứ tự khác, nhưng cần kiểm tra chính xác thứ tự collation và ký tự sentinel trước khi áp dụng.

## Lock hẹp và ownership

Lock theo resource (`lock:order:42`) cho phép hai worker xử lý hai order khác nhau đồng thời. Lock global đơn giản hơn nhưng giảm throughput. Acquire bằng `SET key token NX PX ttl`; release/renew phải compare token trong một script. Khi lock hết hạn, worker cũ vẫn có thể chạy nên side effect quan trọng cần fencing token ở hệ thống đích.

Một thao tác nhiều bước như “đọc inventory, reserve, trừ stock” nên dùng transaction database hoặc protocol có idempotency. Lock Redis không tự rollback DB, không ngăn owner cũ sau pause, và async failover có thể mất lock write. Bài lock riêng mô tả rõ assumptions và phương án thay thế.

## Counting và fair semaphore

Semaphore giới hạn tối đa N worker được dùng tài nguyên cùng lúc. Mỗi holder có token nhận diện và một **lease**: quyền sử dụng có thời hạn, cần được gia hạn khi công việc còn chạy. Basic semaphore phải atomically kiểm tra số holder, xóa lease hết hạn, rồi cấp slot. Nếu tách các bước thành commands, hai client đều có thể thấy còn slot cuối và cùng lấy.

### Từ counting semaphore đến fair semaphore

Một bản cơ bản có thể lưu các holder trong ZSET, dùng thời điểm của client làm score. Trước khi cấp slot, dọn entry cũ hơn lease, thêm token của mình, rồi lấy rank. Vì rank bắt đầu từ 0, holder chỉ vừa giới hạn khi `rank < N`; nếu không đạt điều kiện, phải gỡ token vừa thêm. Ví dụ với giới hạn 2, hai holder đang có rank 0 và 1; client thứ ba nhận rank 2 nên phải bị từ chối.

Cách này có thể cấp vượt giới hạn khi đồng hồ các host lệch nhau. Giả sử A xin trước nhưng đồng hồ A chạy nhanh 10 ms, nên ZSET ghi score của A là `12:00:00.010`. B xin sau nhưng đồng hồ B chậm hơn, ghi `12:00:00.000`. B được xếp trước A và có thể chiếm slot cuối, trong khi A vẫn nghĩ mình đang giữ suất. Thứ tự timestamp của hai máy không phải thứ tự thật sự các request tới Redis.

Để giảm vấn đề đó, sách dùng hai ZSET và một counter:

| Key trong mô hình | Member | Score / ý nghĩa |
| --- | --- | --- |
| timeout ZSET | token holder | thời điểm client xin suất; entry cũ được xem là hết lease |
| owner ZSET | cùng token | số thứ tự tăng từ counter, dùng xếp thứ tự xin suất |
| counter | — | `INCR` tạo sequence mới cho mỗi lượt xin |

Khi cấp suất, hệ thống dọn token quá hạn khỏi timeout ZSET, đồng bộ owner ZSET để chỉ giữ token còn sống, tăng counter, ghi token vào cả hai ZSET, rồi kiểm tra rank trong owner ZSET. Giả sử giới hạn là 2 và owner hiện có A:7361, B:7362. C nhận sequence 7363 nên có rank 2 và bị từ chối; sau khi A nhả suất, D nhận 7364, đứng sau B với rank 1 nên được nhận. Hai thứ tự được tách riêng: counter quyết định fairness, còn wall clock vẫn dùng phát hiện lease cũ.

Counter không làm hết mọi lỗi. Expiry vẫn phụ thuộc đồng hồ; sách dùng giả định clock giữa các host lệch trong khoảng 1–2 giây để tránh thu hồi suất đang dùng quá sớm hoặc giữ suất chết quá lâu. Đây là giả định của ví dụ, không phải bảo đảm cho mọi triển khai. Sách cũng cảnh báo counter 32-bit có thể tràn trên nền tảng Redis cũ. Redis hiện hành dùng `INCR` với số nguyên signed 64-bit, nhưng score ZSET là double nên chỉ biểu diễn chính xác mọi số nguyên đến `2^53`; nếu dùng sequence dài hạn làm score, cần theo dõi/định kỳ thay epoch an toàn khi không còn holder.

### Race cuối cùng: counter chưa đủ để giữ giới hạn

Ngay cả counter công bằng vẫn có thể cấp quá N nếu các bước bị chia thành nhiều round trip. Với giới hạn 1: A nhận sequence 7361 rồi tạm dừng trước khi thêm vào owner ZSET. B nhận 7362, thêm token, thấy mình đang ở rank 0 và bắt đầu làm việc. Sau đó A thêm sequence 7361; A cũng thấy rank 0, còn B không được báo rằng rank đã đổi. Hai client cùng nghĩ mình giữ slot duy nhất.

Vì vậy, dọn entry hết hạn, đồng bộ hai ZSET, tăng sequence, thêm token, kiểm tra rank và gỡ token bị từ chối phải nằm trong một vùng tuần tự hóa. Bản sách dùng distributed lock ngắn để bọc bước cấp suất; cách triển khai hiện đại thường dùng một Lua script hoặc Redis Function ngắn để thực hiện chuyển trạng thái nguyên tử trên một primary. Trong Redis Cluster, các key mà script truy cập phải cùng hash slot, có thể đặt tên như `sem:{remote}:leases`, `sem:{remote}:owners` và `sem:{remote}:counter`. Script chặn lệnh khác trên server trong lúc chạy nên chỉ đưa vào đó phần tính toán hữu hạn, không gọi mạng hay xử lý công việc dài. **Atomic ở đây có nghĩa lệnh khác không chen vào giữa script; nó không phải rollback.** Nếu một lệnh lỗi sau khi script đã ghi dữ liệu, các thay đổi trước lỗi không tự động được hoàn tác. Kiểm tra type/đầu vào trước khi mutation và sắp thứ tự ghi để có thể reconcile khi lỗi.

Release phải xóa token khỏi cả hai ZSET trong cùng một thao tác; chỉ xóa timeout entry có thể để lại owner mồ côi. Renewal chỉ cập nhật lease nếu token vẫn tồn tại và còn quyền; nếu không, báo mất suất thay vì hồi sinh holder đã hết hạn. Mẫu này vẫn có giới hạn failover/durability và không thay fencing ở hệ thống đích.

### Gia hạn lease nhưng không hồi sinh holder

Fair semaphore giữ cùng token trong hai ZSET: ZSET timeout có score là thời điểm hết hạn, còn ZSET owner có score là sequence quyết định thứ tự. Khi gia hạn, chỉ cập nhật thời điểm trong ZSET timeout; không cấp sequence mới vì holder vẫn phải giữ vị trí fairness cũ. Trong ví dụ sách, `ZADD` trả `1` nếu token chưa còn trong ZSET timeout. Điều đó có nghĩa lease đã bị dọn hoặc đã mất; code phải xóa token vừa thêm khỏi cả hai ZSET và báo thất bại. Nếu coi thao tác này là gia hạn thành công, một holder cũ có thể tự hồi sinh sau khi slot đã cấp cho người khác.

Gia hạn cần chạy trước hạn với khoảng đệm đủ cho network delay và scheduling pause. Nếu response timeout, client không biết lệnh đã chạy hay chưa; retry cùng token phải kiểm tra membership hiện hữu thay vì tạo một lượt acquire mới. Nếu đã mất lease, worker dừng hoặc downstream kiểm tra fencing token trước khi chấp nhận side effect.

“Fair” ở đây nghĩa các lượt xin suất được xếp theo sequence tại thời điểm vào hàng; nó không hứa mọi client cuối cùng đều được chạy. Client bị từ chối rồi thử lại tạo lượt xin mới và nhận sequence mới, nên có thể phải đứng sau các waiter khác. Muốn bảo đảm không starvation cần thêm chính sách queue, timeout, retry budget và cách xử lý client biến mất.

| Cách cấp suất | Điểm mạnh | Giới hạn chính |
| --- | --- | --- |
| Score theo clock | Ít metadata, dễ hiểu | Lệch clock có thể đảo thứ tự và cấp vượt giới hạn |
| Counter + owner ZSET | Thứ tự xin suất ổn định hơn giữa các host | Expiry vẫn dựa vào clock; nhiều round trip vẫn có race |
| Counter + thao tác atomic | Giữ invariant giới hạn tại thời điểm cấp | Tăng complexity; script phải ngắn, đúng cluster slot và vẫn cần fencing cho side effect ngoài Redis |

Fairness thêm metadata và failure cases; nếu chỉ cần giới hạn concurrency, queue chuyên dụng hoặc semaphore trong database có thể đơn giản hơn.

## Làm mới lease và race

Khi một client đang dùng slot cần renewal, script phải xác minh token, trạng thái lease và thứ tự ưu tiên trước khi gia hạn. Client timeout khi script chạy tạo kết quả không biết chắc; retry phải idempotent. Nếu mất quyền, dừng công việc hoặc để resource đích từ chối fencing token cũ.

*Redis in Action*, ch. 6, trình bày autocomplete, simple/fine-grained locks, timeout và counting/fair semaphore. Dùng [sorted sets](https://redis.io/docs/latest/develop/data-types/sorted-sets/), [INCR](https://redis.io/docs/latest/commands/incr/), [độ chính xác score của ZADD](https://redis.io/docs/latest/commands/zadd/), [Lua scripting](https://redis.io/docs/latest/develop/programmability/eval-intro/), [Redis Functions](https://redis.io/docs/latest/interact/programmability/functions-intro/), [hash tags trong Redis Cluster](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/#hash-tags) và [transaction/error semantics](https://redis.io/docs/latest/interact/transactions/) theo version hiện tại; pattern sách dùng API cũ cần chuyển đổi.

## Tự kiểm tra

**Vì sao autocomplete index phải xóa prefix cũ khi tên đổi?** Nếu không, kết quả cũ tiếp tục xuất hiện và có thể trỏ tới dữ liệu đã đổi.

**Semaphore check-count rồi insert bằng hai command có an toàn?** Không; hai client có thể cùng chiếm slot cuối. Ghép kiểm tra/cập nhật atomically.

**Fairness có miễn phí?** Không; nó cần lưu thứ tự và dọn waiter/lease, tăng write và failure cases.

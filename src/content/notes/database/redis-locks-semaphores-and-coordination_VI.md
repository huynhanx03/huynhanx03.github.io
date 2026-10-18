---
title: "Lock, semaphore và coordination bằng Redis"
category: "Database"
description: "Xây coordination có lease, token sở hữu và fencing; nhận diện giới hạn của distributed lock."
updated: 2026-10-17
translationKey: "database/redis-locks-semaphores-and-coordination"
---

Lock giúp hai worker không cùng xử lý một tài nguyên tại một thời điểm, nhưng distributed lock phải xử lý process pause, packet delay, failover và lease hết hạn. Một lệnh `SET NX` giải quyết bước cấp quyền trên một primary; nó không tự chứng minh worker còn giữ độc quyền trong toàn hệ thống.

## Lease lock tối thiểu

Mẫu cơ bản tạo token ngẫu nhiên cho owner:

```text
SET lock:invoice:42 <random-token> NX PX 10000
```

Nếu thành công, client giữ lease tối đa 10 giây. Khi release, script phải so token rồi mới xóa key; `DEL` mù có thể xóa lock mới do worker khác tạo sau khi lease cũ hết hạn. Token cũng giúp phân biệt owner khi gia hạn.

`SETNX` rồi gọi riêng `EXPIRE` là hai bước nguy hiểm: process có thể chết sau khi tạo key nhưng trước khi đặt TTL, để lại lock không hết hạn. Dùng một lệnh `SET ... NX PX` để acquire và gắn lease nguyên tử. Khi acquire thất bại, chờ có jitter rồi thử lại đến deadline; không spin liên tục và không retry mãi. Khi release hoặc renew, Lua compare-token rồi xóa/gia hạn trong cùng một bước để worker cũ không sửa lease của owner mới.

Lock theo tài nguyên lớn như `lock:market` đơn giản nhưng mọi listing/purchase đều tranh một key. Lock mảnh hơn như `lock:item:42` cho phép hai vật phẩm khác nhau được xử lý song song, nhưng thao tác nhiều vật phẩm có thể cần nhiều lock. Nếu phải acquire nhiều lock, lấy theo thứ tự khóa ổn định, đặt deadline và nhả các lock đã lấy nếu bước sau thất bại; nếu không, hai worker có thể deadlock hoặc giữ một phần tài nguyên quá lâu. Lock granularity không thể nhỏ hơn invariant nghiệp vụ: cập nhật chung một balance hoặc index toàn cục vẫn cần phối hợp đúng.

### Vì sao `WATCH` có thể chậm dưới tranh chấp

`WATCH` là optimistic concurrency control: client đọc trạng thái rồi chuẩn bị ghi; nếu key đổi trước `EXEC`, transaction bị hủy và client phải đọc lại, tính lại rồi retry. Cách này hợp khi xung đột hiếm. Trong ví dụ marketplace của *Redis in Action*, nhiều worker cùng theo dõi một ZSET `market:`; mỗi listing làm thay đổi key mà buyer đang watch, nên những giao dịch mua mặt hàng khác cũng có thể bị hủy. Khi tải tăng, retry tạo thêm request vào chính điểm nghẽn và latency tăng tiếp.

Lock tường minh biến việc tranh quyền thành hàng đợi trên vùng critical section: một worker kiểm tra rồi cập nhật item, các worker khác chờ hoặc timeout. Lock thị trường giảm số retry nhưng cũng tuần tự hóa tất cả item. Lock theo item cho phép giao dịch trên item độc lập chạy đồng thời. Sách đo 60 giây trên workload mô phỏng và thấy fine-grained lock giảm retry/latency so với `WATCH` toàn market; các con số throughput trong bảng phụ thuộc dataset và phần cứng thời đó, không phải dự báo cho deployment hiện nay. Đo bằng workload của ứng dụng, gồm queueing và p95/p99, trước khi kết luận lock nhanh hơn.

Redis không tự áp đặt lock lên dữ liệu. Mọi đường ghi phải tuân theo cùng giao thức, nếu không client khác vẫn sửa `market:` trong khi lock đang được giữ. Lock bảo vệ protocol hợp tác giữa các client; transaction của Redis chỉ tuần tự hóa các command được gửi vào nó.

## Lease không phải fencing

Worker A có lease, bị pause 15 giây; lease hết, worker B lấy lock và ghi dữ liệu. A tỉnh lại rồi vẫn ghi vì process không biết lease đã hết. Đây là stale owner. **Fencing token** tăng đơn điệu mỗi lần cấp quyền; storage đích từ chối token thấp hơn token đã thấy. Nếu tài nguyên bên ngoài không kiểm tra fencing token, Redis lock chỉ giảm xác suất chạy trùng chứ không bảo đảm side effect độc quyền.

Clock, network delay và failover làm khó việc suy luận lease. Mở rộng lock nhiều node kiểu quorum cần assumptions chặt về timing, availability và durability; không lấy một công thức từ bài blog làm bảo đảm phổ quát. Khi dữ liệu quan trọng, cân nhắc khóa/constraint trong database sở hữu resource, queue single-consumer hoặc consensus-backed coordinator.

## Semaphore và giới hạn đồng thời

Semaphore cho phép tối đa N holder. Có thể dùng sorted set với thời hạn, score và token để dọn lease hết hạn, nhưng thao tác cấp/thu hồi phải atomic và phải chống client crash, clock assumptions, duplicate token và stale holder. Redis script có thể ghép thao tác trong một node/slot; failover vẫn đặt ra durability/race assumptions.

Một thiết kế cơ bản ghi mỗi holder vào ZSET với score là thời điểm acquire, xóa lease quá hạn, rồi nhận quyền nếu rank nhỏ hơn giới hạn N. Cách này dễ sai khi máy lệch clock: worker có đồng hồ chạy nhanh có thể đẩy holder khác ra khỏi top N mà holder đó vẫn nghĩ mình đang chạy. Gắn thêm sequence tăng đơn điệu để xác định thứ tự công bằng hơn, nhưng nếu các bước “dọn, thêm owner, tính rank” tách thành nhiều round trip, hai client vẫn có thể tranh suất ở giữa các bước. Gom chúng vào script/transaction nguyên tử trên cùng node/slot và thiết kế reclaim cho holder chết.

Nếu tác vụ dài hơn lease, phải gia hạn trước hạn với margin; gia hạn chỉ thành công nếu token/owner còn đúng. Khi renew thất bại, worker dừng công việc hoặc downstream phải từ chối fencing token cũ. Release xóa cả membership và metadata holder; nếu dọn một index mà quên index kia, slot có thể bị rò rỉ hoặc semaphore cấp quá giới hạn. Fairness, expiration và correctness là yêu cầu riêng: timestamp lease tự nó không bảo đảm ba thứ đó cùng lúc.

## Renewal, timeout và cleanup

Gia hạn trước expiry bằng compare-token script, có safety margin; nếu renewal thất bại, worker phải dừng side effect hoặc kiểm tra fencing. Timeout ngắn tăng contention, timeout dài giữ tài nguyên khi worker chết. Theo dõi tuổi lock, holder, renewal failures và công việc bị bỏ dở. Dùng idempotency/outbox để xử lý tác vụ bị chạy lại.

*Redis in Action* ch. 6 giới thiệu locks/semaphores và race cases. Tài liệu hiện hành về [SET](https://redis.io/docs/latest/commands/set/), [distributed locks](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/) và [Lua](https://redis.io/docs/latest/develop/programmability/eval-intro/) giúp hiểu primitive; với correctness, đọc thêm phân tích failure model độc lập và kiểm tra storage downstream.

## Tự kiểm tra

**Vì sao release bằng `DEL` có thể sai?** Owner cũ có thể xóa lease mới đã cấp cho worker khác.

**Token ngẫu nhiên có ngăn stale worker ghi dữ liệu không?** Nó xác thực owner lúc release; muốn bảo vệ downstream cần fencing token được resource kiểm tra.

**Redis lock có làm transaction database và email trở thành atomic?** Không; dùng outbox/idempotency hoặc transaction coordinator phù hợp.

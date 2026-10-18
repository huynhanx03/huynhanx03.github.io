---
title: "Thời gian, network link và semantics gửi message"
category: "Database"
description: "Phân biệt latency với timeout, hiểu đồng hồ lệch, retry/ACK và các mức at-most-once, at-least-once, exactly-once."
updated: 2026-10-17
translationKey: "database/distributed-time-links-and-delivery"
---

Gọi một database ở máy khác trông giống gọi hàm local, nhưng lời gọi phải đi qua network, queue, CPU và storage ở cả hai phía. Khi không nhận response, client không thể tự biết request chưa tới, server chưa xử lý, transaction đã commit nhưng ACK bị mất, hay server chỉ đang chậm. Giao thức phải định nghĩa điều gì được xác nhận và retry nào an toàn.

## Độ trễ gồm nhiều chặng

Thời gian một RPC xấp xỉ tổng của client serialization, network đi, queue ở server, xử lý, disk/replica waits, network về và client decode. Mỗi phần có thể biến động. Một server phản hồi chậm không nhất thiết chết; queue đầy còn có thể khiến request mới chậm hơn, tạo retry storm và làm tải tăng thêm.

Queue hấp thụ burst ngắn nhưng có dung lượng hữu hạn. Nếu producer tạo việc nhanh hơn consumer xử lý trong thời gian dài, queue chỉ dời thời điểm overload. Backpressure, bounded concurrency, deadline propagation, cancellation và load shedding ngăn việc nhận thêm công việc không thể hoàn thành đúng SLA. Retry nên có backoff+jitter và giới hạn; retry mọi lỗi đồng thời có thể khuếch đại sự cố.

Những “fallacy” kinh điển của hệ phân tán có thể biến thành câu hỏi kiểm tra thiết kế: đường truyền có thật sự ổn định không; latency và processing có giới hạn nào; bandwidth có đủ lúc tải tăng; dữ liệu có được bảo vệ trên network không tin cậy; topology, địa chỉ và membership có thể đổi không; các node có cùng phần cứng/phần mềm không; chi phí serialization, network và vận hành là bao nhiêu; ai có quyền quản trị và góc nhìn toàn cụm? Một request fan-out tới nhiều node thường chờ node chậm nhất. Nếu không đo hàng đợi, kích thước message và mức phụ thuộc vào một authority duy nhất, hệ thống có thể hoạt động tốt trong demo nhưng vỡ khi tải hoặc topology thay đổi.

Local function thường có cost và failure trong cùng process. Remote call thêm serialization, auth, version compatibility, network partition, queueing và uncertainty về kết quả. API nên để lộ timeout/deadline, retryability, idempotency key và observability phù hợp; bọc remote call như function luôn thành công khiến caller dễ dùng sai.

## Đồng hồ hữu ích nhưng không phải sự thật chung

Mỗi node có clock riêng; clock drift, NTP adjustment và network delay làm timestamp không đảm bảo thứ tự nhân quả. Nếu node A ghi event lúc `10:00:00.100`, node B ghi event lúc `10:00:00.090`, không thể kết luận B xảy ra trước A nếu sai số clock lớn hơn khoảng cách đó. Timestamp wall-clock hữu ích cho người vận hành và TTL policy có tolerance; nó không tự tạo consensus order.

Dùng monotonic clock cho elapsed time/timeout trong một process vì wall clock có thể bị chỉnh lùi/tiến. Timeout vẫn là ngưỡng ra quyết định: ngắn thì false suspicion/failover nhiều, dài thì phát hiện chậm. Protocol cần epoch/sequence/quorum hoặc logical ordering nếu correctness cần biết thứ tự thay đổi, thay vì so timestamp từ máy khác như một thứ tự tuyệt đối.

## ACK xác nhận tầng nào?

ACK có thể nghĩa là packet tới TCP stack, message vào broker, handler bắt đầu, transaction commit, WAL flush, hay replica áp dụng/fsync. Những mốc này khác nhau. Nếu client mất response sau khi server commit, client không biết kết quả. Gửi lại một lệnh `INCR` có thể tăng hai lần; không gửi lại có thể bỏ lỡ lệnh nếu server chưa nhận.

| Semantics | Sender làm gì? | Rủi ro |
| --- | --- | --- |
| At-most-once | Gửi một lần, không retry mù | Có thể mất operation nếu message/response hỏng |
| At-least-once | Retry tới khi có ACK | Có thể xử lý duplicate |
| Effectively/exactly-once processing | Dùng ID duy nhất, lưu kết quả/dedup và commit effect cùng trạng thái xử lý | Cần retention, atomicity và retry protocol; không phải thuộc tính miễn phí của network |

Một cách làm retry-safe là client gửi idempotency key `request_id`; server lưu `(request_id,result)` trong cùng transaction với effect. Nếu request gửi lại, server trả kết quả đã lưu thay vì chạy effect lần nữa. Dedup record phải được giữ ít nhất qua retry window và cùng durability domain với dữ liệu. Nếu effect gọi hệ thống ngoài không cùng transaction, cần outbox/inbox hoặc protocol bù trừ.

TCP cung cấp byte stream đáng tin cậy trong một kết nối theo semantics của transport, nhưng không đảm bảo business operation chạy đúng một lần qua reconnect/process crash. App ACK cũng không tự chứng minh dữ liệu đã durable trên đĩa; cần biết server flush policy và phạm vi replica acknowledgment.

## Xây bảo đảm link theo từng lớp

Có thể xem giao thức gửi message như một chuỗi lớp, mỗi lớp thêm một bảo đảm và một loại trạng thái phải quản lý:

1. **Fair-loss link:** message có thể mất, trễ hoặc bị nhân đôi hữu hạn lần; link không tự tạo message chưa từng gửi. Nếu cả hai process còn đúng và sender tiếp tục gửi lại, message cuối cùng sẽ tới.
2. **Acknowledgment và retransmit:** receiver báo đã nhận bằng ID duy nhất; sender gửi lại khi chưa thấy ACK. Điều này giúp vượt qua mất gói tạm thời, nhưng sender có thể gửi lại sau khi receiver đã xử lý xong mà ACK bị mất.
3. **Khử trùng lặp và sắp thứ tự:** receiver lưu sequence number đã xử lý, bỏ message lặp và giữ message đến sớm trong buffer nếu còn thiếu số trước đó. Ví dụ nhận `3`, rồi `5`, thì giữ `5` cho đến khi `4` tới; sau đó có thể giao lần lượt `4`, `5`.
4. **Perfect link (abstraction):** protocol phía trên fair-loss link có thể cung cấp reliable delivery, no duplication và no creation cho các process còn đúng. “Perfect” ở đây mô tả hợp đồng của abstraction, không có nghĩa phần cứng không thể hỏng hay ứng dụng được xử lý đúng một lần qua mọi lần restart.

Sequence number cần được gắn với đúng sender/epoch và receiver phải lưu đủ trạng thái qua khoảng thời gian retry. Nếu process restart rồi quên số đã xử lý, message cũ có thể bị áp dụng lại. TCP cũng đánh số byte và xử lý truyền lại trong một kết nối, nhưng ranh giới reconnect hay transaction của ứng dụng thuộc lớp khác.

ACK vì vậy phải nói rõ nó xác nhận điều gì. “Đã nhận vào socket”, “đã đưa vào hàng đợi”, “đã chạy handler” và “đã commit bền vững” là các mốc khác nhau. Một hệ thống cần ACK durable có thể phải ghi log trước khi trả lời hoặc chờ đủ replica theo chính sách của nó.

## Vì sao xác nhận không thể kết thúc vô hạn?

Hai bên trao đổi message qua link có thể mất. A gửi `COMMIT?`; B nhận và trả `ACK`; A nhận ACK. Nhưng nếu B cần chắc A nhận ACK, B cần ACK cho ACK. Message cuối cùng cũng có thể bị mất. Với asynchronous link không có upper bound delivery time, không bên nào chứng minh chắc chắn message cuối đã tới chỉ từ việc chờ.

Two Generals minh họa giới hạn **common knowledge** khi link có thể mất. Nó không ngăn hệ thống thực tế dùng acknowledgment; hệ thống chọn điều kiện đủ cho semantics cần thiết, như durable log, quorum hoặc retry/dedup. Lý do không nên quảng cáo “exactly-once network delivery” là transport và process failure luôn để lại một ranh giới bất định.

## Mô hình timing và failure

Trong **asynchronous model**, không có upper bound đáng tin cho message delay hay processing; timeout không phân biệt node chết với node chậm. **Synchronous model** giả định có bound về thời gian; **partially synchronous model** cho phép bound chỉ đúng sau một khoảng hoặc sai số nhất định. Database consensus thường dựa vào eventual synchrony để vừa giữ safety vừa có cơ hội tiến triển.

Failure model cũng quan trọng: crash-stop node dừng; omission làm mất gửi/nhận message; Byzantine node tiếp tục chạy nhưng có thể gửi giá trị sai/mâu thuẫn. Một giao thức chịu crash không tự chịu Byzantine. Partition có thể bất đối xứng: A gửi được tới B nhưng chiều ngược lại không hoạt động. Crash-recovery cũng khác crash-stop; correctness phải xét process restart còn nhớ state nào và tái gia nhập cụm ra sao. Partition có thể tách các nhóm chạy độc lập, tạo write conflict hoặc buộc một phía ngừng nhận write để giữ consistency.

*Database Internals*, ch. 8, phân tích links, acknowledgments, retransmission, clocks/time, synchrony, Two Generals, FLP và failure models. Xem [Raft paper](https://raft.github.io/raft.pdf) để thấy timeout và eventual synchrony nằm trong một protocol consensus thực tế.

## Định cỡ queue theo tốc độ xử lý

Một queue hữu ích khi nó hấp thụ **burst ngắn**, không phải khi che đi tình trạng quá tải kéo dài. Giả sử consumer xử lý được 100 request/giây, nhưng producer gửi 150 request/giây trong 2 giây. Queue tăng thêm khoảng 100 request. Nếu sau burst producer giảm còn 80 request/giây, consumer có thể xử lý backlog; nếu producer tiếp tục gửi 150 request/giây, backlog sẽ tăng mãi cho đến khi hết bộ nhớ hoặc deadline.

Vì vậy, chọn giới hạn queue bằng cách đo tốc độ xử lý, thời gian chờ trong queue và latency mục tiêu. Một queue có 500 việc trước một consumer xử lý 100 việc/giây có thể thêm khoảng 5 giây chờ ngay cả khi service time của từng request rất nhỏ. Kích thước lớn có thể tăng throughput khi pipeline được nhiều giai đoạn, nhưng không làm một consumer đơn lẻ xử lý nhanh hơn. Khi chạm giới hạn, hệ thống cần backpressure, từ chối có kiểm soát hoặc load shedding để caller biết không thể nhận thêm việc.

Fan-out cũng làm chậm request theo một cách khác: nếu kết quả cần phản hồi từ nhiều server song song, thời gian hoàn tất bị chi phối bởi server chậm nhất trong nhóm. Tăng số shard hoặc dependency có thể tăng khả năng song song, nhưng cũng tăng xác suất một nhánh kéo dài tail latency. Cần đặt deadline cho toàn request và quyết định nhánh chậm có thể bị bỏ qua hay không; nếu kết quả không đầy đủ thì API phải nói rõ điều đó.

## Reordering buffer cần nhớ message nào đã tới và đã xử lý

Sequence number là một cách tạo ID duy nhất theo bộ đếm tăng dần; giao thức chỉ cần ID không trùng, nhưng nếu dùng hash thì phải xử lý khả năng collision. Ở phía nhận, cần phân biệt hai mốc:

- `n_consecutive`: số lớn nhất sao cho mọi message từ đầu tới số đó đã tới liên tục, không còn lỗ hổng.
- `n_processed`: số lớn nhất đã được đưa lên tầng ứng dụng để xử lý theo đúng thứ tự.

Ví dụ receiver đã có `3`, sau đó nhận `5`: nó biết `4` còn thiếu nên giữ `5` trong reordering buffer. Khi `4` đến, receiver có thể giao `4` rồi `5` theo FIFO. Nếu `5` được gửi lại, sequence/state đã xử lý giúp bỏ bản trùng. Trong protocol thực tế, cursor, buffer và kết quả xử lý cần được lưu đúng phạm vi restart/epoch; nếu chỉ nhớ trong RAM rồi process khởi động lại, một message cũ có thể được áp dụng lần nữa.

**Perfect link** là tên hợp đồng ở tầng abstraction: giữa hai process còn đúng, message được gửi cuối cùng được giao, không giao trùng và không tự tạo message. Nó không nói node luôn sống, dữ liệu đã commit bền vững hay business effect chỉ chạy một lần. Những điều sau cùng cần trạng thái và giao thức ở tầng ứng dụng.

## Tự kiểm tra

**Timeout chứng minh server đã crash?** Không; nó nói client chưa nhận response trong ngưỡng đã chọn.

**At-least-once nghĩa effect chỉ chạy một lần?** Không; nó cho phép duplicate để tăng khả năng giao tới nơi.

**TCP ACK chứng minh transaction đã ghi bền trên disk?** Không; ACK transport và durability commit là các tầng khác nhau.

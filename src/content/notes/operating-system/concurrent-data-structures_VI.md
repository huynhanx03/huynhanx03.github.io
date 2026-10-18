---
title: "Cấu trúc dữ liệu concurrent: từ một lock tới sharding"
category: "Operating System"
tags: ["concurrency", "data structures", "lock"]
description: "Thiết kế queue, counter và hash table an toàn khi nhiều luồng thao tác, rồi tối ưu contention có đo lường."
updated: 2026-10-17
translationKey: "operating-system/concurrent-data-structures"
---

Một cấu trúc dữ liệu tuần tự thường giả định chỉ một luồng thay đổi trạng thái tại một thời điểm. Khi nhiều thread cùng gọi `push`, `pop` hoặc cập nhật hash table, ta phải xác định các thao tác nào được quan sát như một đơn vị và những invariant nào luôn đúng.

## Bắt đầu bằng coarse-grained lock

Cách dễ kiểm chứng nhất là đặt một mutex quanh mỗi thao tác công khai. Với queue, lock giữ cho head, tail và count thay đổi nhất quán. Đây là thiết kế hợp lý cho nhiều workload; không cần lock-free chỉ vì có nhiều thread.

Điểm yếu là các thao tác độc lập cũng chờ nhau. Nếu critical section ngắn và contention thấp, chi phí có thể chấp nhận được. Đo throughput và latency trước khi chia lock.

## Fine-grained locking

Có thể dùng lock riêng cho từng bucket trong hash table, để thao tác trên bucket khác nhau chạy song song. Khi resize, cần giao thức điều phối để không thread nào nhìn cấu trúc nửa chuyển đổi. Mỗi lock nhỏ tăng khả năng song song nhưng thêm metadata, thứ tự khóa và nhánh lỗi.

Lock ordering giúp tránh deadlock: nếu thao tác cần hai lock, mọi thread phải lấy chúng theo cùng thứ tự toàn cục. Không nên khóa container trong một thứ tự dựa trên hash không ổn định nếu có thể tạo chu trình.

## Sharding và partitioning

Sharding tách trạng thái thành nhiều phần theo key hoặc worker. Ví dụ, mỗi shard có counter riêng; khi cần tổng, chương trình cộng chúng. Điều này giảm contention trên một biến nóng nhưng làm snapshot nhất quán và merge phức tạp hơn.

Một ví dụ là **sloppy counter**: mỗi CPU có local counter/lock riêng và thỉnh thoảng chuyển phần cộng dồn sang global counter. Với cập nhật đơn vị không âm và mỗi local counter được flush rồi đặt lại khi chạm threshold S, `get()` chỉ đọc global có thể thiếu tối đa `số CPU × S` đơn vị đang còn ở local counters. Nếu mỗi lần cập nhật có thể cộng một lượng lớn hơn 1, counter có thể vượt S trước khi flush; phải cộng phần overshoot tối đa vào cận sai lệch. Threshold càng thấp thì sai lệch này nhỏ hơn nhưng lock toàn cục bị tranh chấp nhiều; threshold càng cao thì cập nhật nhanh hơn nhưng giá trị global có thể cũ hơn. Nếu counter nhận cả số âm, cần phân tích cận theo quy tắc flush và biên độ cập nhật cụ thể. Chọn theo yêu cầu: telemetry có thể chịu sai số tạm thời; số dư tài khoản thì không.

Partitioning hiệu quả khi thao tác thường tập trung trong một shard. Nếu mọi request dùng cùng key, contention vẫn ở shard đó. Hash phân phối không đều cũng tạo hot spot.

## Lock-free không đồng nghĩa không chờ

Lock-free algorithm dùng atomic operation để cập nhật trạng thái mà không giữ mutex, nhưng thread vẫn có thể retry vòng lặp nhiều lần và CPU vẫn tranh cache line. Wait-free mạnh hơn: mỗi thao tác hoàn thành trong số bước hữu hạn cho từng thread theo định nghĩa thuật toán, nhưng khó xây và không phải thư viện nào cũng cung cấp.

CAS loop cần xử lý ABA, reclamation bộ nhớ và memory ordering. Một queue lock-free nhỏ nhìn có vẻ gọn nhưng có thể khó chứng minh và kém hơn mutex trên workload thực. Dùng implementation đã được kiểm chứng nếu cần.

## Chọn cấu trúc theo API và workload

Xác định trước: đọc/ghi tỷ lệ bao nhiêu, có cần thứ tự toàn cục không, queue có giới hạn không, thread có block được không, latency tail quan trọng thế nào. SPSC queue (một producer, một consumer) có giả định đơn giản hơn MPMC queue (nhiều producer/consumer); thay đổi số worker có thể làm implementation sai.

Một linked list có thể bắt đầu bằng một lock cho toàn danh sách. Chỉ chuyển sang fine-grained hoặc hand-over-hand locking sau khi đo thấy bottleneck. Khóa từng node tăng concurrency khi duyệt, nhưng chi phí acquire/release ở mỗi node có thể lớn hơn lợi ích.

Queue cũng có thể dùng một lock. Một thiết kế khác tách `head` và `tail` thành hai lock, thường cùng một dummy node, để enqueue và dequeue ít phải chờ nhau hơn. Thiết kế này vẫn cần công bố liên kết `next` an toàn giữa phía enqueue và dequeue, chẳng hạn dùng field `next` atomic với release/acquire phù hợp; hai lock riêng không tự tạo quan hệ đồng bộ cho field đó. [Pseudocode queue hai-lock của Michael–Scott](https://www.cs.rochester.edu/research/synchronization/pseudocode/queues.html) cho thấy cấu trúc cơ bản, còn implementation phải tuân theo memory model của ngôn ngữ.

Hash table thường partition theo bucket, mỗi bucket có list và lock riêng. Nhờ đó, thao tác trên các bucket khác nhau có thể chạy song song.

Thu hẹp vùng lock cũng giúp giảm lỗi nhánh hiếm: cấp phát node trước lock nếu allocator thread-safe, rồi chỉ khóa lúc nối node vào list. Với mọi return/error path, phải bảo đảm lock được nhả. Cách đúng là bắt đầu từ bản coarse-grained dễ kiểm chứng, sau đó đo rồi tối ưu phần thật sự nghẽn.

## Tóm tắt

- Bảo vệ invariant với coarse lock là điểm khởi đầu tốt.
- Fine-grained lock tăng song song nhưng làm thứ tự khóa phức tạp.
- Sharding giảm hot spot nếu workload phân phối được.
- Lock-free vẫn có retry, cache contention và vấn đề reclamation.
- Chọn theo workload và hợp đồng API; benchmark trước khi tối ưu.

## Tự kiểm tra

**Lock-free có nghĩa mọi thread luôn tiến triển đều nhau?** Không. Một thread có thể retry nhiều lần trong khi hệ thống vẫn tiến triển nhờ thread khác.

**Thay mutex bằng CAS chắc chắn giảm latency?** Không; cache line contention và retry có thể làm kết quả tệ hơn.

**Queue SPSC có thể dùng nguyên vẹn cho nhiều producer?** Không; giả định đồng thời khác làm mất bảo đảm.

## Đọc tiếp

Khi lỗi đồng thời không còn là race mà là chờ nhau mãi, xem bài về deadlock và livelock.

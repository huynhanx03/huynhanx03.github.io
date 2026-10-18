---
title: "Distributed transaction: 2PC, 3PC và các hướng giảm phối hợp"
category: "Database"
description: "Theo dõi transaction qua coordinator và nhiều shard, từ blocking commit đến Calvin, Spanner, Percolator và coordination avoidance."
updated: 2026-10-18
translationKey: "database/distributed-transaction-protocols"
---

Một lần chuyển tiền trừ tài khoản A ở shard 1 và cộng vào B ở shard 2. Nếu shard 1 commit nhưng shard 2 mất kết nối trước khi commit, tổng tiền bị sai. **Atomic commitment** buộc các participant cùng đi đến commit hoặc cùng abort; nó giả định participant không Byzantine và không tự sửa quyết định của coordinator.

Atomic commitment chỉ quyết định transaction đã đề xuất sẽ commit hay abort. Cohort không được tự thay nội dung transaction hoặc đề xuất một giá trị khác; chỉ vote xem phần việc của mình có thể commit không. Nếu một cohort vote NO, toàn transaction không commit. Để atomicity có ý nghĩa sau crash, các thay đổi phải recoverable: khi abort, dữ liệu đã chuẩn bị phải được hoàn tác; khi commit, mọi partition tham gia phải khôi phục cùng kết quả bền vững trước khi phục vụ như thể transaction đã hoàn tất.

## 2PC: rõ ràng nhưng có thể block

Coordinator và mỗi cohort ghi trạng thái bền vững vào log. Pha đầu gửi transaction, cohort kiểm tra điều kiện, ghi trạng thái prepared và vote `YES` hoặc `NO`. `YES` là lời hứa giữ thay đổi và chờ quyết định cuối, không phải commit cục bộ. Nếu có `NO`, coordinator ghi `ABORT`; chỉ khi mọi cohort `YES`, coordinator ghi `COMMIT` bền vững rồi phát quyết định.

| Thời điểm lỗi | Kết quả và lý do |
| --- | --- |
| Cohort không trả lời ở pha prepare | Coordinator không thể nhận đủ YES nên không thể commit; sau deadline, nó có thể quyết định abort thay vì để các shard tự đoán. |
| Cohort crash sau khi vote YES | Khi phục hồi, cohort phải tra quyết định bền vững từ coordinator hoặc participant khác; trạng thái prepared không cho phép nó tự suy ra commit hay abort. |
| Coordinator chết trước khi gửi prepare | Chưa có cohort nào hứa commit; coordinator thay thế có thể khởi tạo lại. |
| Coordinator chết sau khi cohort đã prepared | Cohort giữ lock và chờ vì không thể biết coordinator đã ghi COMMIT hay chưa. Đây là blocking. |
| Coordinator đã ghi COMMIT nhưng chết giữa lúc gửi thông báo | Cohort đã nhận quyết định có thể giúp các cohort khác khôi phục từ durable log; COMMIT hàm ý mọi cohort từng vote YES. |

Timeout không giúp participant phân biệt coordinator chết trước hay sau khi ghi quyết định. Tự abort sau timeout có thể mâu thuẫn với COMMIT đã bền vững. Dùng replication cho coordinator log hoặc đặt 2PC trên các replica group có thể cải thiện khả năng khôi phục, nhưng không loại bỏ state prepared và nhu cầu recovery.

### Theo dấu một lần chuyển tiền qua hai shard

Tài khoản A ở shard 1 chuyển 20 đồng sang tài khoản B ở shard 2. Coordinator ghi transaction ID và gửi `PREPARE`; mỗi shard kiểm tra số dư, ghi thay đổi cùng trạng thái prepared vào log bền vững, giữ lock rồi trả `YES`. Ở thời điểm này chưa được báo cho ứng dụng rằng chuyển khoản đã commit: cả hai shard đang chờ quyết định chung.

Khi nhận đủ hai phiếu `YES`, coordinator ghi quyết định `COMMIT` bền vững rồi gửi commit cho từng shard. Shard ghi commit, công bố thay đổi và nhả lock. Coordinator không được báo commit trước khi quyết định đã bền vững; thời điểm trả thành công so với lúc mọi participant áp dụng xong phụ thuộc semantics của transaction manager. Nếu B không đủ điều kiện, nó trả `NO`; coordinator ghi `ABORT`, và shard A phải hủy khoản trừ đã chuẩn bị. Nếu coordinator chết sau khi ghi COMMIT nhưng trước khi báo shard 2, shard 2 hỏi lại log hoặc participant khác: nó không được tự suy ra abort chỉ vì timeout.

Hai invariants cần theo dõi: mọi participant cuối cùng phải áp dụng cùng một quyết định, và participant đã trả `YES` phải giữ đủ log/lock state để áp dụng quyết định cuối sau restart. Quyết định đã commit trong coordinator log có thể đến participant chậm hơn; nếu ứng dụng đọc độc lập từ từng shard trong lúc đó, distributed isolation layer phải quyết định cách ngăn hoặc biểu diễn trạng thái chưa hoàn tất. 2PC bảo đảm atomic commitment, còn cách che trạng thái trung gian với các reader phụ thuộc transaction/isolation implementation. Đây là điều làm 2PC atomic khi khỏe mạnh, đồng thời giải thích vì sao trạng thái prepared có thể chặn tiến triển.

## 3PC: trạng thái trung gian và giả định đồng bộ

3PC có ba pha `PROPOSE → PREPARE → COMMIT/ABORT`. Ở `PROPOSE`, coordinator gửi transaction và thu vote; một phiếu NO hoặc timeout trước khi đủ vote dẫn tới abort. Nếu mọi cohort vote YES, coordinator gửi `PREPARE`; mỗi cohort ghi trạng thái đã chuẩn bị rồi ACK. Trước khi coordinator biết mọi cohort đã vào trạng thái prepared, timeout có thể khiến các cohort abort. Sau khi nhận đủ ACK prepared, protocol cho phép tiến tới commit khi coordinator hoặc participant gặp lỗi.

Khả năng này dựa trên mô hình mạng đồng bộ: độ trễ message có giới hạn và partition không làm timeout đánh lừa các node về trạng thái của nhau. Trong mạng bất đồng bộ, một nhóm có thể nhận `PREPARE` rồi timeout để commit, còn nhóm bị partition chưa nhận được lại abort. Hai nhóm khi ấy đưa ra quyết định trái nhau. 3PC giảm blocking trong failure model hẹp này, nhưng không phải cách xử lý tổng quát cho crash và partition.

## Calvin: thống nhất thứ tự trước khi thực thi

Calvin đưa transaction vào log theo thứ tự xác định trước. Mỗi transaction cần read set và write set có thể xác định đủ sớm. Scheduler biết shard nào tham gia, thu thập dữ liệu đọc cần thiết rồi chạy transaction theo cùng thứ tự trên các replica. Điều này giảm coordination trong lúc giữ lock; đổi lại có chi phí sequencing trước execution và khó xử lý transaction mà read quyết định write set.

Sequencer gom transaction thành các epoch ngắn; batch được replicate trước khi scheduler chạy. Worker xác định dữ liệu read set nằm ở node nào và các active participant giữ write set; mỗi node gửi dữ liệu đọc cục bộ tới participant cần nó, rồi các participant cùng thực thi batch và lưu kết quả. Vì input và thứ tự giống nhau, không cần gửi kết quả thực thi giữa các replica. Sequencer cần thống nhất batch/epoch, thường bằng Paxos hoặc leader replication; leader có thể giảm latency nhưng recovery cần tái dựng chính xác trạng thái của nó. Calvin phù hợp khi read/write set biết trước; một lần đọc phát sinh làm thay đổi write set cần được khai báo hoặc chia thành bước sequenced riêng.

Nếu hai transaction cùng tranh một record, thứ tự log nói bên nào chạy trước nên các replica tái hiện cùng lịch sử. Nếu một transaction cần khám phá record khác giữa lúc chạy, hệ thống phải khai báo dependency trước hoặc chia logic thành bước có thể sắp thứ tự. Deterministic execution chuyển chi phí phối hợp sang giai đoạn lập thứ tự, không làm chi phí biến mất.

## Spanner: consensus theo shard, 2PC giữa shard và commit wait

Spanner dùng Paxos group cho từng shard. Leader xử lý write, lock table hỗ trợ concurrency control; giao dịch nhiều shard phối hợp qua 2PC giữa các group. Vì thế, một nhóm participant không sẵn sàng vẫn có thể chặn transaction đa shard.

Spanner phân biệt read-write transaction, read-only transaction và snapshot read. Read-write cần leader, lock và concurrency control; snapshot ở timestamp cụ thể có thể đọc version bất biến từ replica đủ mới, còn read tại latest timestamp cần bảo đảm đã thấy commit mới nhất. Mỗi shard dùng Paxos group để lưu bền log và trạng thái transaction. Cross-shard transaction dùng 2PL để cô lập và 2PC để commit; đặt cohort là Paxos group giúp chịu được một số node thành viên hỏng, nhưng mất quorum của group vẫn chặn tiến triển.

TrueTime cung cấp khoảng `[earliest, latest]` chứa thời điểm hiện tại. Sau khi chọn commit timestamp, Spanner chờ tới lúc `earliest` vượt qua timestamp đó rồi mới trả kết quả. Commit wait giúp timestamp phản ánh thứ tự thời gian thực dù đồng hồ có độ bất định. Độ rộng uncertainty ảnh hưởng latency. Giao dịch một shard chỉ cần protocol trong group đó; snapshot/read-only có thể dùng timestamp đã chọn và tránh một số phối hợp write.

Trong cross-shard commit, participant ghi prepare cùng write timestamp vào Paxos log; coordinator chọn commit timestamp lớn hơn các prepare timestamp, replicate quyết định commit, rồi đợi uncertainty interval trôi qua trước khi trả thành công và cho phép release lock. Timestamp vì vậy không chỉ là nhãn version: commit wait đảm bảo một transaction đã trả lời trước transaction khác bắt đầu sẽ có timestamp nhỏ hơn. Đổi lại, cross-shard transaction trả thêm chi phí 2PC so với một thiết kế đã sắp thứ tự trước như Calvin.

## Percolator: transaction API trên storage phân tán

Percolator đặt value, write metadata và lock records trong các column riêng của Bigtable, dùng timestamp oracle và snapshot isolation. Transaction đọc các giá trị đã commit trước start timestamp. Snapshot nhất quán giúp tránh read skew. Ví dụ, nếu `x + y = 100`, T1 đọc `x = 70`; sau đó T2 đổi thành `x = 50, y = 50` và commit; T1 đọc tiếp sẽ thấy `y = 50` ở mức READ COMMITTED, ghép thành 120 dù không có trạng thái nhất quán nào như vậy. Snapshot isolation giữ T1 trên snapshot cũ nên lần đọc thứ hai vẫn thấy `y = 30`. Nếu hai transaction ghi cùng cell, first-committer-wins cho một bên commit; nhưng snapshot isolation vẫn có thể gặp write skew khi chúng đọc cùng invariant rồi ghi các cell khác nhau, khiến cả hai commit và cùng phá invariant.

Timestamp oracle được hỏi lúc bắt đầu và lúc commit. Ở `prewrite`, client thử lấy lock cho mọi cell sẽ ghi, chọn một primary lock để đại diện việc recovery, rồi kiểm tra xem có write mới hơn hoặc lock chưa giải phóng hay không. Các bước kiểm tra và đặt lock cần là một conditional mutation nguyên tử của Bigtable trong một RPC; nếu tách thành đọc rồi ghi riêng, hai transaction có thể cùng thấy cell còn trống và cùng chiếm nó. Nếu có conflict, transaction abort; nếu prewrite thành công ở mọi nơi, client vào pha commit, thay primary lock bằng write record trước rồi publish các secondary. Nếu client chết giữa lúc commit và transaction sau gặp một lock phụ, transaction sau kiểm tra primary để hoàn tất commit; nếu primary đã được publish thì nó tiếp tục commit các secondary còn lại. Khi hai recovery cùng đụng một lock, conditional mutation nguyên tử ngăn cả hai cùng quyết định trên một trạng thái cũ. Thứ tự publish primary/secondary là thứ cho phép recovery biết phần nào còn phải hoàn tất.

## Shard placement không đồng nghĩa với transaction

Modulo hashing `hash(key) mod N` ánh xạ đơn giản, nhưng khi số node N đổi, phần lớn key có thể chuyển nơi lưu. Consistent hashing đặt token trên vòng: key đi tới token kế tiếp; thêm hoặc gỡ token thường chỉ chuyển vùng lân cận. Virtual tokens cải thiện cân bằng nhưng không xử lý hot key. Range partition hỗ trợ range scan nhưng có thể tạo hot range; hash partition thường phân tán đều hơn nhưng range query phải hỏi nhiều shard.

Sau khi xác định shard, routing, replica ownership, snapshot migration, log catch-up và đổi routing epoch vẫn cần protocol. Consistent hashing chỉ giải quyết ánh xạ key; nó không bảo đảm atomicity cho transaction cross-shard.

## Coordination avoidance phải giữ invariant

Invariant confluence hỏi: hai node có thể cập nhật độc lập từ trạng thái hợp lệ rồi merge mà kết quả vẫn hợp lệ không? Nếu có, thao tác đó có thể tránh coordination trong điều kiện tương ứng. Nếu hai node offline đều bán chiếc ghế cuối, mỗi trạng thái riêng có vẻ hợp lệ nhưng khi merge đã bán hai vé cho một chỗ; invariant không confluent nên phải phối hợp hoặc chia quyền bán trước bằng reservation/escrow.

Một giải pháp coordination-avoiding vẫn cần bốn điều kiện: trạng thái cục bộ và trạng thái merge đều giữ invariant (**global validity**); node reachable có thể quyết định commit hoặc abort nếu operation phá invariant (**availability**); các replica cuối cùng hội tụ khi update dừng và mạng nối lại (**convergence**); và transaction cục bộ không phải chờ operation trên node khác (**coordination freedom**). Chỉ các invariant confluent mới cho phép merge trạng thái phân kỳ mà vẫn hợp lệ; các invariant khác cần coordination hoặc phân quyền trước.

### RAMP: atomic visibility mà không buộc mọi transaction chờ nhau

RAMP (*Read Atomic Multi-Partition*) giải quyết một vấn đề hẹp nhưng rất thực tế: một transaction cập nhật nhiều partition, còn reader có thể chạm vào chúng đúng lúc các cập nhật đang được phát hành. Ta muốn reader không ghép nửa trạng thái cũ với nửa trạng thái mới, nhưng cũng không muốn mọi reader và writer phải khóa nhau trong suốt các lần truyền tin giữa máy chủ.

#### Bảo đảm chính xác là gì?

Giả sử transaction `T7` đổi hai bản ghi liên quan: `x = 1` ở partition X và `y = 1` ở partition Y. Một fractured read xảy ra nếu transaction khác đọc được `x = 1` nhưng vẫn đọc `y = 0`. Với **Read Atomic (RA) isolation**, reader phải thấy cả hai ghi của `T7` hoặc không thấy ghi nào của `T7`. Các lần đọc đó vẫn tạo thành một snapshot tôn trọng ranh giới transaction.

RA không đồng nghĩa với serializability. Nó không tự ngăn hai transaction đồng thời đọc cùng một số dư rồi cùng rút tiền, cũng không bảo vệ invariant kiểu “tổng số ghế đã bán không vượt quá sức chứa”. Nó ngăn một loại bất nhất do chỉ nhìn thấy một phần write-set; nó không buộc các transaction đồng thời có một thứ tự tương đương với chạy tuần tự. Vì vậy, RA hợp với việc cập nhật hai chiều quan hệ bạn bè, bản ghi cùng chỉ mục phụ, hoặc dữ liệu gốc cùng một materialized view; nó không đủ nếu quyết định ghi phụ thuộc vào dữ liệu vừa đọc và phải giữ invariant qua cạnh tranh.

RAMP nhắm tới hai thuộc tính về khả năng mở rộng:

- **Synchronization independence:** transaction của client khác không làm transaction này phải chờ hoặc bị abort. Một transaction vẫn có thể bị chậm nếu chính nó không liên lạc được với partition mà nó cần.
- **Partition independence:** chỉ liên lạc với các partition chứa item mà transaction truy cập; transaction không phải hỏi toàn cluster chỉ để biết nơi nào đang có dữ liệu mới.

Đây là các mục tiêu của thuật toán, không phải lời hứa rằng mọi lỗi mạng đều biến mất. RAMP tách việc giữ atomic visibility khỏi việc dùng mutual-exclusion lock: read và write có thể chạy chồng lên nhau; metadata và version cho reader cách nhận ra, rồi sửa, một lần đọc bị lệch.

#### Một lần đọc bị lệch được sửa như thế nào?

Ban đầu, X lưu `x@4 = 0` và Y lưu `y@4 = 0`. `T7` muốn ghi `x@7 = 1` và `y@7 = 1`. Writer gửi pha `PREPARE` tới cả hai partition. Mỗi nơi lưu version mới cùng định danh transaction, nhưng chưa coi nó là version đã commit. Khi cả hai write đã được đặt sẵn, writer gửi quyết định commit. Mạng có thể khiến X nhận commit trước Y.

Trong khoảng ngắn đó, reader `R` hỏi cả X và Y. X trả `x@7` cùng metadata cho biết `T7` còn ghi `y`; Y mới trả `y@4`. Reader thấy metadata nói rằng `x@7` có một write cùng transaction cho `y`, trong khi version `y` vừa đọc cũ hơn. Đây là dấu hiệu fractured read. Thay vì trả ngay cặp `{x@7, y@4}`, R gửi thêm yêu cầu có định danh version cần lấy tới Y. Vì `PREPARE` đã đặt `y@7` ở đó, Y có thể trả version tương ứng; R trả `{x@7, y@7}`. Nếu lần đọc đầu chưa thấy bất kỳ write nào của `T7`, reader có thể trả snapshot cũ `{x@4, y@4}`.

`PREPARE` đặt version mới ở các partition nhưng chưa công bố chúng như dữ liệu đã commit. Khi đã prepare đủ, coordinator quyết định commit; thông điệp commit có thể đến từng partition lệch thời điểm. Trong ví dụ, X đã công bố `x@7` còn Y chưa công bố `y@7`, nên lần đọc đầu trả về version cũ của `y` cùng metadata chỉ ra sibling write còn thiếu. Reader dùng metadata để lấy đúng `y@7` đã được đặt sẵn ở Y. Lượt đọc thông thường không tự chọn một version đang prepare; bước repair chỉ lấy sibling khi metadata của một write đã commit cho thấy cần nó. Nếu transaction abort, reader không được ghép version của nó vào kết quả. Nhờ đó reader không phải đợi mọi partition đổi trạng thái cùng lúc, nhưng vẫn không quan sát một transaction bị abort hoặc chỉ một phần write-set. RAMP vẫn cần commit protocol và giữ các version cần thiết; nó tránh buộc mọi lần đọc phải chờ một khóa toàn cục.

Vì vậy, “atomic visibility” ở RAMP là bảo đảm tại ranh giới đọc: reader thấy toàn bộ write-set của transaction hoặc không thấy write nào của transaction đó. Nó không có nghĩa các page ở nhiều máy đổi trạng thái vật lý trong cùng một khoảnh khắc, và cũng không có nghĩa RAMP bỏ phối hợp khi ghi. Pha prepare/commit vẫn phối hợp việc commit; RAMP tránh bắt mọi lần đọc phải chờ một khóa toàn cục. Version cũ và version đang chờ chỉ được thu hồi khi không còn read đang chạy nào có thể cần chúng, hoặc khi cửa sổ thời gian đọc đã hết và reader quá hạn buộc phải thử lại.

#### Ba biến thể đổi metadata lấy số lượt mạng

| Biến thể | Metadata gắn với mỗi write | Read khi không có race | Khi nào phải gọi thêm? |
| --- | --- | --- | --- |
| **RAMP-Fast** | Gần như toàn bộ write-set của transaction | Thường 1 round trip | Round trip thứ hai khi metadata cho thấy có sibling version cần lấy |
| **RAMP-Small** | Timestamp của transaction | 2 round trips | Luôn dùng round thứ hai để các partition chọn version cao nhất khớp với tập timestamp reader đã thấy |
| **RAMP-Hybrid** | Bloom filter biểu diễn write-set | Thường 1 round trip, gần Fast khi ít false positive | Có thể đọc thêm nếu filter báo item có khả năng thuộc write-set; false positive chỉ gây công việc thừa, không làm sai kết quả |

Write của ba biến thể đều dùng hai round trip cho `PREPARE` rồi `COMMIT`. Đổi lại, Fast tiêu tốn metadata tăng theo số item được ghi; Small giữ metadata mỗi write gọn hơn nhưng reader luôn trả thêm một lượt mạng; Hybrid dùng Bloom filter để nằm giữa hai cách. Bloom filter được thiết kế không có false negative: nếu báo “không có”, item chắc chắn không nằm trong tập; nếu báo “có”, item có thể không nằm trong tập. Do đó false positive có thể tạo yêu cầu lấy version không tồn tại, nhưng timestamp duy nhất giúp yêu cầu ấy không biến thành một giá trị sai.

Tên “Fast” không có nghĩa luôn nhanh hơn trong mọi tải. Nếu metadata lớn làm tăng dung lượng truyền và lưu, lựa chọn khác có thể hợp hơn. Nếu read thường xuyên đụng writer đang commit, cả Fast lẫn Hybrid có thể cần lượt sửa thứ hai. Đánh đổi thật sự là kích thước metadata, số round trip và xác suất phải repair.

#### Version cũ cần được giữ bao lâu?

Reader có thể lấy version đầu tiên ở X rồi mới gửi yêu cầu lấy sibling version ở Y. Nếu Y xóa `y@7` quá sớm, lần đọc sửa không thể hoàn tất. Vì thế partition phải giữ version mà một reader đang chạy còn có thể cần. Một cách triển khai giới hạn thời gian sống tối đa của read transaction, chỉ garbage-collect version sau cửa sổ đó, và yêu cầu reader quá chậm khởi động lại. Cách khác theo dõi timestamp của các read còn hoạt động rồi chỉ dọn khi không còn reader nào có thể yêu cầu version. Cửa sổ dài làm tăng dung lượng lưu; cửa sổ ngắn dễ buộc read dài phải retry.

RAMP cũng có thể phục vụ read-write transaction nếu client khai báo trước tập dữ liệu sẽ đọc: client đọc snapshot đó trước, giữ các write cục bộ, rồi gửi toàn bộ write-set khi commit. Cách này vẫn có thể cho phép hai transaction cạnh tranh cập nhật cùng invariant vì RA không phải serializability. Khi cần giữ invariant, phải bổ sung cơ chế concurrency control phù hợp hoặc chọn mức isolation mạnh hơn.
## Tự kiểm tra

**Participant vote YES trong 2PC đã commit chưa?** Chưa; nó đã durable prepare và phải đợi quyết định.

**3PC giải quyết partition trong mạng bất đồng bộ không?** Không. Giả định timing của nó có thể sai, khiến các nhóm đưa ra quyết định khác nhau.

**Spanner chỉ dùng timestamp để transaction đa shard atomic?** Không. Timestamp/commit wait phối hợp với Paxos replication, lock/concurrency control và 2PC giữa shard.

*Database Internals*, chương 13. Đối chiếu với bài báo gốc SIGMOD 2014 của Peter Bailis và cộng sự: [Scalable Atomic Visibility with RAMP Transactions](https://www.bailis.org/papers/ramp-sigmod2014.pdf). Các thiết kế được trình bày để so sánh cơ chế và giả định; triển khai hiện tại của từng sản phẩm cần được kiểm tra theo tài liệu phiên bản tương ứng.

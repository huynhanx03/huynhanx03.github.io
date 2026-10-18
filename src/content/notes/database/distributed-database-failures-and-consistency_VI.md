---
title: "Database phân tán: lỗi mạng, failure detector và leader"
category: "Database"
description: "Hiểu vì sao node chậm không đồng nghĩa đã chết, timeout không chứng minh điều gì và leader election cần những giả định nào."
updated: 2026-10-17
translationKey: "database/distributed-database-failures-and-consistency"
---

Một primary không trả lời trong hai giây. Nó có thể đã tắt, đang dừng vì GC, bị nghẽn CPU, bị cô lập mạng, hoặc chỉ có đường truyền chậm. Replica nhìn thấy cùng một timeout nhưng không thể biết chắc nguyên nhân. Trong database phân tán, ta phải ra quyết định dù trạng thái ở xa chỉ được quan sát qua mạng không hoàn hảo.

## Gửi lại không đồng nghĩa xử lý đúng một lần

Giả sử client gửi lệnh ghi và chờ ACK. Nếu phản hồi bị mất, client không biết server chưa nhận lệnh hay đã commit nhưng ACK không tới. Gửi lại có thể thực hiện thao tác lần thứ hai; không gửi lại có thể làm mất thao tác.

Mạng có thể làm rơi, nhân đôi, trì hoãn hoặc đảo thứ tự message. Retry giúp tăng khả năng cuối cùng message tới nơi, nhưng tạo duplicate. Idempotency key, deduplication, sequence number và thao tác idempotent giúp ứng dụng xử lý retry an toàn hơn. “Exactly once” thường là thuộc tính end-to-end được xây bằng lưu trạng thái và deduplication, không phải bảo đảm ma thuật của một lần gửi message.

Bài toán Two Generals cho thấy hai phía chỉ trao đổi message có thể không đạt được kiến thức chung tuyệt đối rằng cả hai đã biết kế hoạch: ACK cũng có thể mất. Hệ thống thực tế chọn một mô hình liveness và mức chắc chắn phù hợp, thay vì đòi xác nhận vô hạn.

## Phân biệt crash, omission và lỗi tùy ý

Mô hình lỗi nói node có thể làm gì:

- **Crash fault**: node dừng và không tiếp tục trả lời.
- **Omission fault**: message gửi hoặc nhận bị mất.
- **Arbitrary/Byzantine fault**: node có thể gửi dữ liệu sai hoặc hành xử không nhất quán.

Nhiều database giả định crash/omission trong mạng tin cậy nội bộ; thuật toán chịu Byzantine tốn kém hơn và cần bài toán threat model riêng. Nêu rõ mô hình lỗi tránh áp dụng kết luận của giao thức này cho sự cố mà nó không được thiết kế để xử lý.

## Timeout tạo nghi ngờ, không tạo sự thật

Failure detector theo dõi heartbeat hoặc ping và đánh dấu node đáng nghi khi quá hạn. Timeout ngắn phát hiện lỗi nhanh hơn nhưng dễ false positive khi tải cao hoặc mạng jitter; timeout dài giảm nghi ngờ nhầm nhưng phục hồi chậm.

Phi accrual detector ước lượng mức độ đáng ngờ từ phân bố thời gian heartbeat thay vì chỉ đưa ra sống/chết tuyệt đối. Nó giúp ứng dụng chọn ngưỡng theo môi trường, nhưng vẫn là suspicion: một node bị nghi ngờ có thể đang khỏe.

Gossip lan truyền trạng thái theo từng vòng trao đổi với một tập peer. Nó tránh một điểm trung tâm và hội tụ dần, nhưng trạng thái có độ trễ, message có thể trùng, và peer view có thể không đầy đủ. Merkle tree hoặc digest giúp so sánh dữ liệu hiệu quả hơn sau khi phát hiện lệch; chúng không tự quyết định bản nào đúng.

## Một lỗi nhỏ có thể thành sự cố cả cụm

Giả sử một node chậm. Client timeout rồi mở thêm kết nối và gửi lại request; node phải xử lý cả request mới lẫn hàng đợi cũ nên càng chậm. Các peer khỏe nhận thêm lưu lượng, rồi cũng timeout. Khi node quay lại, đồng bộ dữ liệu bị bỏ lỡ có thể chiếm hết băng thông hoặc bộ nhớ. Mỗi bước riêng lẻ — retry, failover, catch-up — đều nhằm giúp hệ thống, nhưng nếu không giới hạn thì chúng khuếch đại sự cố thành **cascading failure**.

Một số hàng rào thực tế gồm giới hạn concurrency và queue, exponential backoff kèm jitter, deadline propagation, load shedding, circuit breaker có thời gian hồi phục, và giới hạn tốc độ catch-up. Circuit breaker tạm ngừng gọi một dependency đang lỗi để giảm áp lực, sau đó thử lại có kiểm soát; nó không sửa dữ liệu hay bảo đảm dependency đã khỏe. Những cơ chế này cần telemetry để biết request bị chặn, bị bỏ hay đang chờ.

Replication cũng có thể lan truyền dữ liệu sai rất hiệu quả. Nếu một record hỏng do lỗi phần mềm hoặc storage mà node không kiểm tra, cơ chế đồng bộ có thể sao chép lỗi đó sang mọi replica, thậm chí ghi đè bản tốt. Kiểm tra checksum, schema/version, invariant và nguồn gốc dữ liệu trước khi áp dụng update giúp phát hiện lỗi; checksum phát hiện hỏng bit nhưng không chứng minh nội dung nghiệp vụ là đúng.

Do đó, failure test nên làm hỏng từng đoạn của đường đi: tạo latency, mất hoặc đảo message, giới hạn bandwidth, làm đầy queue, restart node và gây lỗi filesystem. Thử riêng một node crash chưa mô phỏng được partition một chiều, response bị mất sau commit hay cụm bị quá tải khi replica catch-up. Mục tiêu là xác nhận hệ thống giữ invariant và có đường phục hồi khi một phần hoạt động sai.

## Leader election cần tránh hai leader cùng hoạt động

Trong thuật toán Bully, node có id cao hơn phản hồi cuộc bầu cử và được xem là leader; ring election truyền candidate quanh vòng. Chúng hữu ích để hiểu luồng message nhưng giả định membership và giao tiếp tương đối đơn giản.

Trong hệ thống thật, chỉ “chọn được một leader” chưa đủ. Các node cần đảm bảo leader cũ không tiếp tục ghi khi một nhóm khác đã bầu leader mới. **Fencing token**, epoch/term tăng đơn điệu hoặc quorum giúp resource từ chối thao tác của leader cũ. Một lease chỉ an toàn khi giả định đồng hồ và thời gian được kiểm soát đủ chặt.

Failure detection và election trả lời hai câu khác nhau: “ai có vẻ không phản hồi?” và “node nào được quyền điều phối?” Timeout không tự cấp quyền ghi.

## FLP và vai trò của giả định đồng bộ

Kết quả FLP nói rằng trong một hệ thống bất đồng bộ hoàn toàn, một thuật toán consensus xác định không thể bảo đảm luôn kết thúc nếu chỉ cần một node có thể crash. Nó không nói consensus không bao giờ hoạt động. Hệ thống thực tế dùng giả định như timeout cuối cùng ổn định, quorum, randomization hoặc failure detector để cung cấp liveness trong điều kiện thực tế.

Điều này giải thích vì sao consensus protocol thường có thể chờ trong mạng partition hoặc tiến triển khi có majority. Availability ở đây có điều kiện: nhóm nào có quorum, node nào được bầu, dữ liệu nào đã commit và client đang ở phía nào.

## Kiểm soát phục hồi để sự cố không lan rộng

Khôi phục cũng tạo tải. Khi một node vừa quay lại, nó có thể cần nhận một lượng lớn dữ liệu còn thiếu đúng lúc các node còn lại vẫn phục vụ request mới. Giới hạn tốc độ catch-up và điều phối lịch truyền giúp dành capacity cho traffic đang chạy; chỉ tăng số lần retry hoặc đẩy dữ liệu nhanh nhất có thể có thể làm node phục hồi sập lại.

Các hàng rào xử lý những nguyên nhân khác nhau:

| Nguy cơ | Hàng rào | Điều hàng rào không tự bảo đảm |
| --- | --- | --- |
| Client retry cùng lúc sau timeout | Backoff có jitter và giới hạn retry | Không chứng minh request trước chưa commit |
| Dependency lỗi bị gọi liên tục | Circuit breaker, deadline và giới hạn concurrency | Không sửa dependency hay dữ liệu đã sai |
| Replica nhận nội dung hỏng | Checksum và validation trước khi áp dụng | Checksum không chứng minh nội dung đúng nghiệp vụ |
| Catch-up chiếm tài nguyên của truy vấn | Giới hạn tốc độ và điều phối đồng bộ | Không giúp nếu node thiếu capacity lâu dài |
| Hotspot làm một node quá tải | Phân bổ/điều phối execution dựa trên capacity và tải quan sát được | Dự báo từ lịch sử có thể sai khi workload đổi |

Sách gợi ý kiểm thử có chủ đích bằng cách tạo latency, mất kết nối, giới hạn bandwidth, làm lệch clock, thay đổi tốc độ xử lý, restart node và mô phỏng lỗi filesystem hoặc bit rot. Toxiproxy, Chaos Monkey, CharybdeFS và CrashMonkey là những ví dụ được sách nêu; chúng minh họa từng lớp kiểm thử và có thể khác nhau về trạng thái bảo trì hiện nay. Bài kiểm thử nên xác định invariant cần giữ và quan sát cả hành vi lúc lỗi lẫn quá trình hồi phục, thay vì chỉ xác nhận service còn trả lời.

## Failure model quyết định protocol phải chịu được điều gì

Ba nhãn crash, omission và arbitrary vẫn chưa đủ nếu không nói node có thể phục hồi hay không:

| Model | Hành vi | Hệ quả cho thiết kế |
| --- | --- | --- |
| **Crash-stop** | Process dừng và không tham gia tiếp instance thuật toán hiện tại | Thuật toán thường không dựa vào việc node đó tự phục hồi giữa round |
| **Crash-recovery** | Process dừng rồi chạy lại, có thể tiếp tục từ state bền vững cũ | Cần xác định state/identity được lưu, cách phục hồi và cách bắt kịp cụm |
| **Omission** | Bước hoặc message gửi/nhận bị bỏ qua; node chậm, queue đầy hay network partition cũng có thể nhìn như omission | Node có thể trả kết quả muộn hoặc chỉ mất một chiều; đừng suy crash chỉ từ một phản hồi trễ |
| **Arbitrary/Byzantine** | Process vẫn chạy nhưng có thể gửi giá trị sai hoặc mâu thuẫn, do bug, version lệch hay đối thủ chủ ý | Cần threat model, kiểm chứng chéo và protocol Byzantine nếu phải chịu lỗi này |

Crash-recovery không đơn giản là crash-stop cộng thêm một lần khởi động. Nếu node phục hồi mà không biết operation nào đã commit, protocol có thể ghi lại quyết định cũ hoặc phát lại message. Định danh mới cũng không tự tương đương với crash-recovery nếu thuật toán dùng membership cố định và đếm số node lỗi trong một round.

Redundancy/process group có thể che một crash đơn lẻ khỏi người dùng, nhưng thường có giá: khi lỗi xảy ra, hệ thống chuyển sang đường chậm hơn để phát hiện, phục hồi hoặc tái lập state. Vì vậy, availability và latency lúc bình thường chưa nói hết hiệu năng khi có lỗi.

## Tự kiểm tra

**Nếu heartbeat timeout, có thể xóa node khỏi membership ngay không?** Có thể chọn như một chính sách, nhưng timeout chỉ là bằng chứng nghi ngờ. Cần cân nhắc false positive và hệ quả khi node vẫn đang hoạt động.

**Retry một lệnh tăng số dư có an toàn không?** Không nếu lệnh có thể được áp dụng hai lần. Dùng idempotency key, transaction với deduplication hoặc thiết kế thao tác retry-safe.

**Bầu leader mới có đảm bảo leader cũ ngừng ghi không?** Không tự động. Cần epoch/term, quorum hoặc fencing để storage/resource từ chối ghi từ leader đã hết quyền.

Nguồn đọc: *Database Internals*, chương 8–10; phần tiếp theo về replication, consensus và distributed transaction.

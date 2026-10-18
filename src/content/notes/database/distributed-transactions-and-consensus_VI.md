---
title: "Distributed transaction, consensus và phân vùng dữ liệu"
category: "Database"
description: "Theo một transaction qua nhiều node để hiểu 2PC, consensus, sharding và những cách hệ thống giảm phối hợp giữa các node."
updated: 2026-10-17
translationKey: "database/distributed-transactions-and-consensus"
---

Một đơn hàng cập nhật kho ở hai vùng và ghi sổ thanh toán ở node khác. Nếu một nơi commit còn nơi kia timeout, hệ thống có trạng thái nửa hoàn tất. Transaction trong một process có thể dùng log và lock cục bộ; khi participant nằm ở nhiều máy, coordinator phải giúp mọi bên đi tới một quyết định dù message hoặc node có thể biến mất.

## Two-phase commit hỏi mọi bên sẵn sàng rồi mới quyết định

Trong **two-phase commit (2PC)**, coordinator điều phối một transaction qua hai pha:

1. **Prepare**: coordinator yêu cầu participant ghi trạng thái prepared bền vững và trả lời rằng nó có thể commit.
2. **Commit/abort**: nếu tất cả participant trả lời yes, coordinator ghi quyết định commit bền vững rồi gửi commit; nếu có bên từ chối, coordinator ghi và gửi abort.

Participant đã prepared thường phải giữ lock hoặc tài nguyên cho tới khi biết quyết định. Nếu coordinator chết sau khi mọi bên prepared nhưng trước khi quyết định tới được, participant không thể tự đoán commit hay abort mà vẫn bảo toàn tính atomic. Đây là lý do 2PC có thể **blocking** khi coordinator hoặc network không phục hồi.

Coordinator cũng phải khôi phục quyết định từ log sau restart và gửi lại message. Participant cần trả lời duplicate message an toàn. Timeout không chứng minh coordinator đã abort; nó chỉ cho biết client chưa nhận được phản hồi.

## Three-phase commit thêm trạng thái nhưng cần giả định mạnh

**Three-phase commit (3PC)** tách thêm trạng thái trung gian để giảm một số trường hợp block nếu có giới hạn về thời gian trễ và giả định failure detector. Trong mạng asynchronous hoàn toàn, node có thể chậm tùy ý nên timeout vẫn không phân biệt được chậm với crash. 3PC không phải giải pháp phổ quát thay 2PC; điều kiện của nó phải phù hợp với môi trường triển khai.

Một cách khác là tránh distributed transaction bằng cách chuyển ranh giới nghiệp vụ, dùng saga/compensation hoặc thiết kế idempotent event flow. Những cách này không tạo atomic commit across services: chúng cho phép trạng thái trung gian và yêu cầu xử lý retry/compensation.

## Consensus giúp nhóm node đồng ý một lịch sử

Consensus yêu cầu các node quyết định cùng một giá trị hoặc thứ tự, dù một số node lỗi. Trong database, replication log cần thứ tự để replica áp dụng cùng thay đổi. **Atomic broadcast** gửi message sao cho các node giao nhận theo cùng thứ tự toàn cục; trong điều kiện phù hợp, nó có quan hệ chặt với consensus.

Paxos phân tách proposer, acceptor và learner. Các ballot/round tăng dần cùng majority quorum giúp proposer mới giữ lại quyết định đã có thể được chấp nhận. Nếu proposer thất bại, round khác có thể tiếp tục; safety phụ thuộc protocol tuân thủ đúng quorum và persistent state. Multi-Paxos tái sử dụng một leader ổn định để giảm chi phí mỗi quyết định.

Raft tổ chức quy trình dễ hình dung hơn qua term, election, log replication và commit index. Leader chỉ commit entry theo điều kiện của majority và quy tắc log; khi election mới xảy ra, các node so sánh term/index để chọn candidate đủ mới. Một client ACK chỉ nên được diễn giải theo cam kết commit của implementation, không đồng nhất với “mọi replica đã ghi ra disk”.

ZAB (Zookeeper Atomic Broadcast) dùng epoch và leader để sắp xếp cập nhật. Byzantine consensus như PBFT giải quyết mô hình node có thể hành xử tùy ý, cần quorum lớn hơn và message nhiều hơn so với crash-fault consensus. Protocol nào cũng phải nêu mô hình lỗi, membership và điều kiện liveness.

Các biến thể Fast Paxos, Flexible Paxos, Egalitarian Paxos và Generalized Paxos đổi số round trip, quorum, mức cạnh tranh hoặc loại lệnh có thể chạy đồng thời. Chúng không phải cấu hình bật nhanh; mỗi thiết kế có điều kiện safety và workload riêng.

## Consensus không tự giải quyết mọi transaction

Consensus có thể quyết định thứ tự log hoặc leader, nhưng ứng dụng vẫn cần ràng buộc transaction, isolation, index, conflict handling và retry. Một distributed SQL database có thể dùng consensus per shard, transaction coordinator giữa shard, timestamp service hoặc deterministic ordering.

Các ví dụ trong *Database Internals* cho thấy nhiều hướng:

- **Calvin** sắp thứ tự transaction trước để giảm coordination trong lúc thực thi.
- **Spanner** kết hợp replication/consensus với timestamp và giả định đồng hồ có bound để cung cấp external consistency.
- **Percolator** dùng transaction protocol trên storage phân tán để phục vụ cập nhật dữ liệu lớn.
- **Coordination avoidance** cố thiết kế transaction sao cho các thao tác độc lập không phải chờ nhau.

Đây là case study về ý tưởng, không phải hướng dẫn rằng hệ thống nội bộ hiện tại vẫn triển khai mọi chi tiết của bài báo/sách theo cùng cách.

## Sharding quyết định dữ liệu nằm ở đâu

Partitioning chia keyspace thành shard. Hash partitioning phân bố key khá đều nhưng range query khó gom; range partitioning giữ key lân cận cùng vùng nhưng có thể nóng ở một đầu. Consistent hashing ánh xạ node và key lên vòng để giảm số key phải chuyển khi membership đổi; virtual node giúp phân phối tải nhưng không xóa hot key hoặc skew.

Nếu một transaction chạm nhiều shard, chi phí phối hợp và failure surface tăng. Thiết kế schema/partition key nên xem query locality, dung lượng, tăng trưởng, hotspot và yêu cầu transaction. Cross-shard transaction có thể đúng nhưng đắt hơn transaction cục bộ.

## Chọn tính chất cần thiết trước khi chọn giao thức

Hiệu năng cục bộ và khả năng mở rộng toàn cụm chịu ảnh hưởng bởi các phần khác nhau. Storage engine và đường read/write trong một node thường quyết định mỗi node xử lý request nhanh tới đâu; giao tiếp, repair và coordination giữa các node thường giới hạn quy mô cụm và capacity tổng. Một storage engine rất nhanh vẫn không giúp được nếu khi dataset lớn nó không scale; ngược lại, atomic commit chậm có thể triệt tiêu lợi ích của storage nhanh.

Vì vậy hãy đọc hệ thống theo cả hai mặt: công việc cục bộ—storage, buffer, transaction, index—và công việc giữa node—failure detection, leader election, dissemination, anti-entropy, distributed transaction, consensus. Chúng tương tác: ví dụ transaction nhiều shard phụ thuộc cả tốc độ engine từng shard lẫn thời gian/quorum của protocol commit. Thiết kế và tuning cần tối ưu đường đi end-to-end, không chỉ một subsystem.

Hãy viết rõ điều client cần: một leader duy nhất, linearizable read, acknowledged write không mất khi một node hỏng, hay transaction atomic qua shard? Sau đó xác định quorum, fault model, latency, failure mode và recovery behavior. Câu “cần strongly consistent” chưa đủ để chọn protocol.

## Tự kiểm tra

**2PC giống consensus không?** Không. 2PC phối hợp quyết định commit của một distributed transaction và có thể block; consensus chọn một lịch sử/giá trị đồng thuận dưới mô hình lỗi riêng.

**Nếu coordinator timeout trong 2PC, participant có thể tự commit không?** Không an toàn nếu participant đã prepared nhưng chưa biết quyết định bền vững của coordinator.

**Consistent hashing có tự cân bằng mọi shard không?** Không. Nó giảm lượng key cần chuyển khi node thay đổi, nhưng key nóng và phân bố lệch vẫn cần chiến lược riêng.

Nguồn đọc: *Database Internals*, chương 13–14; các nghiên cứu gốc được liệt kê trong thư mục sách: Calvin, Spanner, Percolator, Paxos và Raft.

---
title: "2PC, distributed transaction và partitioning"
category: "Database"
description: "Theo dõi prepare/commit, coordinator failure, Calvin/Spanner/Percolator và consistent hashing qua ví dụ."
updated: 2026-10-17
translationKey: "database/distributed-transactions-and-partitioning"
---

Một transaction cập nhật hai shard phải tránh trạng thái chỉ một bên commit. Nhưng coordinator, network hay participant có thể lỗi giữa các bước. Distributed transaction là protocol giữa nhiều failure domain; chỉ đặt `BEGIN` ở application không làm hai database atomic.

## Two-phase commit

Trong **prepare phase**, coordinator gửi PREPARE; mỗi participant ghi đủ trạng thái bền vững để cam kết nếu sau này được yêu cầu, rồi vote YES/NO. Nếu có NO, coordinator yêu cầu abort. Nếu mọi bên YES, coordinator ghi decision COMMIT bền vững rồi gửi COMMIT.

Participant đã vote YES nhưng mất coordinator sẽ ở trạng thái prepared và giữ lock/resource vì chưa biết quyết định. Đây là blocking failure. Coordinator cần durable log và recovery hỏi lại; participant cần giữ trạng thái tới khi nhận quyết định. Timeout tự abort một prepared transaction có thể mâu thuẫn với COMMIT đã ghi ở coordinator.

3PC thêm pre-commit để giảm blocking dưới giả định timing/network giới hạn, nhưng asynchronous partition/crash vẫn có thể vi phạm assumptions. Không coi 3PC là cách chung để xóa distributed uncertainty.

## Calvin, Spanner và Percolator

Calvin đặt transaction order vào log trước khi thực thi để giảm coordination runtime; đổi lại cần sequencing/planning và có thể tăng latency trước execution. Spanner dùng distributed clock/TrueTime uncertainty bounds cùng Paxos replication để cung cấp external consistency; assumptions clock và quorum là cốt lõi, không chỉ “dùng timestamp”. Percolator dùng timestamp oracle, primary/secondary record và lock/commit protocol trên Bigtable để hỗ trợ transaction phân tán.

Các thiết kế này tối ưu bối cảnh khác nhau; không copy một thành phần riêng mà bỏ failure model, replication và metadata service xung quanh.

## Partitioning và consistent hashing

Partitioning chia key range/hash để tăng capacity; chọn shard key quyết định locality, skew và cross-shard transaction count. Partition cần được chia theo cả dung lượng lẫn tải: một range có nhiều dữ liệu hoặc request nóng có thể cần tách nhỏ. Range partition hỗ trợ range scan nhưng hot range có thể tập trung tải. Hash partition phân bố đều hơn nhưng range query fan-out. Consistent hashing đặt node/key trên ring; virtual nodes giúp cân bằng, membership change chỉ remap một phần key nhưng cần migration/ownership protocol.

Shard migration phải giữ routing và dữ liệu đồng bộ: xác định owner mới, copy snapshot, catch up các write phát sinh trong lúc copy, xác minh state, rồi mới đổi routing epoch để request mới đi tới owner mới; sau cutover mới dọn bản cũ. Một hệ thống có thể dual-read/write trong giai đoạn chuyển, nhưng cần quy tắc xử lý xung đột. Retry/idempotency và uniqueness toàn cục cũng cần kế hoạch. Consistent hashing chỉ định vị key; nó không tự cung cấp replica consistency hay transaction atomicity.

## Coordination avoidance

Transaction design có thể giảm cross-shard coordination bằng denormalization, co-location, single-writer partition, escrow/reservation hoặc asynchronous saga. Saga cho mỗi bước local transaction và compensating action; compensation không phải rollback vật lý và có thể thất bại. Chọn theo invariant: nếu invariant không thể tạm vi phạm, cần protocol atomic/serializable hoặc một owner duy nhất.

*Database Internals*, ch. 13, so sánh 2PC/3PC, Calvin, Spanner, Percolator, consistent hashing và coordination avoidance. Nguồn nền tảng: [Spanner paper](https://research.google/pubs/spanner-googles-globally-distributed-database/), [Calvin paper](https://cs.yale.edu/homes/thomson/publications/calvin-sigmod12.pdf).

## Tự kiểm tra

**Vì sao 2PC participant prepared có thể block?** Nó vote YES nhưng chưa biết coordinator đã quyết định commit hay abort.

**Consistent hashing có nghĩa transaction cross-shard atomic?** Không; nó chỉ ánh xạ key sang node.

**Saga compensation luôn hoàn tác y hệt?** Không; đó là business action bù trừ, có thể thất bại hoặc chỉ gần đúng.

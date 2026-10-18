---
title: "Replication, failover và MySQL trên cloud"
category: "Database"
description: "Theo dõi binlog đến replica, so sánh topology, lập kế hoạch failover và hiểu giới hạn managed database."
updated: 2026-10-17
translationKey: "database/mysql-replication-failover-and-cloud"
---

MySQL replication tạo bản sao thay đổi từ source sang replica, thường qua binary log và relay log. Nó hỗ trợ read scale-out và recovery, nhưng không tự biến nhiều node thành database đồng bộ mạnh. Cần biết mỗi event được tạo, truyền, apply và xác nhận ở đâu để tính lag và mất dữ liệu.

## Binlog và replication flow

Source ghi event vào binary log; replica I/O receiver lấy event và lưu relay log; applier thực thi thay đổi. Với row-based logging, row image mang thay đổi cụ thể; statement-based ghi câu lệnh và phụ thuộc deterministic semantics; mixed chọn theo quy tắc server. Chọn format theo workload, binlog volume, compatibility và replication correctness.

GTID gắn định danh transaction toàn cục, giúp provisioning/reposition và failover thuận hơn so với file/offset thủ công. Không làm schema migration tự đồng bộ hay khắc phục diverged data. Monitor source/applier state, executed GTID set, relay/binlog bytes, seconds/transactions behind và errors. “Seconds behind” có thể không phản ánh đúng queue/clock state.

## Topology và consistency

Single-source fanout dễ suy luận nhưng write capacity vẫn bị source giới hạn. Chain giảm connection fanout nhưng lỗi node giữa chuỗi ảnh hưởng downstream; multi-source cần xử lý conflict/order. Async replica có lag và có thể thiếu acknowledged transactions khi promote. Semisynchronous replication chờ receipt/log acknowledgment theo mode, không nhất thiết apply; timeout có thể quay lại async.

Read routing phải hiểu read-after-write: gửi session vừa ghi về primary, hoặc đợi GTID/consistency token trên replica nếu architecture hỗ trợ. Replica load có thể chậm do query analytics, disk kém hoặc apply thread. Dùng replica để backup không cô lập khỏi delete/bug bị replicate.

## Failover và high availability

Failover cần phát hiện lỗi, chọn candidate đủ mới, fence primary cũ, promote, chuyển endpoint, cập nhật client và xác minh data consistency. Nếu không fence, hai primary có thể nhận write. Failback/rejoin thường cần clone/rewind hoặc reseed; không chỉ khởi động lại node cũ.

Group Replication/InnoDB Cluster và Router cung cấp topology/group management với assumptions riêng về quorum, certification, network và recovery. Xác định RPO/RTO; diễn tập node crash, network partition, lagging replica, DNS/client pool stale, backup restore và rollback. Không tuyên bố zero data loss nếu cơ chế và test không bảo đảm.

## Capacity, sharding và cloud

Read replica tăng read capacity khi traffic có thể tách; write scaling đòi partition/sharding với routing, cross-shard transaction và rebalancing cost. Load balancer cần health check và connection drain; connection đã mở không tự chuyển node. Dự phòng capacity cho failover vì promoted replica cần gánh primary traffic.

Cloud DBaaS đổi economics và operational boundary: storage throughput, IOPS, network egress, burst limits, backup retention, maintenance window, failover SLA và quyền truy cập khác nhau theo provider. Tính chi phí ở tải thực tế và test restore/export để tránh lock-in vận hành.

*High Performance MySQL*, ch. 10–13, cùng [MySQL replication](https://dev.mysql.com/doc/refman/8.4/en/replication.html), [GTID](https://dev.mysql.com/doc/refman/8.4/en/replication-gtids.html), [semisynchronous replication](https://dev.mysql.com/doc/refman/8.4/en/replication-semisync.html), [Group Replication](https://dev.mysql.com/doc/refman/8.4/en/group-replication.html).

## Tự kiểm tra

**GTID loại bỏ replication lag?** Không; nó định danh transaction và hỗ trợ positioning, không khiến applier nhanh hơn.

**Semisync receipt nghĩa replica đã apply?** Không; receipt/flush/apply là các giai đoạn khác nhau.

**Failover có an toàn nếu chỉ đổi DNS?** Không; cần fence, chọn node, promotion, client recovery và kiểm tra consistency.

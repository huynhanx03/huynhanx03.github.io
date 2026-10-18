---
title: "Replication, backup và vận hành PostgreSQL"
category: "Database"
description: "Kết nối physical/logical replication, slot, backup, PITR, upgrade, monitoring và bảo mật."
updated: 2026-10-17
translationKey: "database/postgresql-replication-backup-and-operations"
---

Replication giữ một server phụ bắt kịp primary; backup giúp dựng lại dữ liệu sau khi lỗi hoặc thao tác sai. Hai việc liên quan WAL nhưng giải quyết failure khác nhau. Standby khỏe không bảo vệ khỏi `DROP TABLE` bị replicate; backup cũ không bảo đảm RPO thấp. Thiết kế cần cả hai và một bài diễn tập restore.

## Physical và logical replication

Physical streaming replication phát WAL để standby tái tạo cùng thay đổi ở mức cluster; thường dùng cho HA/read replica. Standby có thể nhận WAL trực tiếp hoặc qua archive. Async replication có replication lag và có thể mất các commit chưa đến standby khi primary hỏng. Synchronous replication giảm cửa sổ mất dữ liệu theo cấu hình nhưng tăng latency và có thể ảnh hưởng availability.

Logical replication phát các thay đổi table-level thông qua publication/subscription và logical decoding. Nó hữu ích cho selective replication, migration và consumer, nhưng cần replica identity, schema tương thích và giám sát slot. Nó không tự đồng bộ mọi DDL/object như physical replication. Version khác nhau có khả năng khác nhau; kiểm tra matrix chính thức trước migration.

Replication slot giữ WAL hoặc tuple cần thiết cho consumer. Slot bỏ quên gây giữ WAL và đầy disk; đặt giới hạn retention, alert bytes/lag và quy trình xử lý consumer offline. Không xóa slot tùy tiện nếu downstream còn cần nó.

## Backup và PITR

`pg_dump`/`pg_dumpall` tạo logical backup phù hợp cho export, object/table restore và migration; physical base backup sao chép data files nhất quán để dựng server cùng timeline. PITR kết hợp base backup với archive WAL liên tục và recovery target theo thời gian, transaction hoặc restore point (tùy version/cấu hình).

Xác định RPO (mức mất dữ liệu tối đa) và RTO (thời gian phục hồi chấp nhận được). Mã hóa và phân quyền backup, lưu ở failure domain khác, theo dõi archive gap/retention và định kỳ phục hồi trên môi trường sạch. Một file backup thành công nhưng chưa từng restore là giả định chưa được kiểm chứng.

## Failover, upgrade và bảo mật

PostgreSQL core cung cấp replication primitives, nhưng tự động failover/orchestration thường do công cụ ngoài đảm nhiệm. Cần fencing/STONITH hoặc cơ chế tương đương để tránh hai primary, định nghĩa promotion/rewind/rejoin, kiểm tra DNS/proxy/client retry và tránh retry ghi không idempotent. Failover không chỉ là đổi endpoint.

Major upgrade có thể dùng `pg_upgrade`, dump/restore hoặc logical migration; kiểm tra extension, collation, replication, disk, rollback window và thời gian index/ANALYZE sau nâng cấp. Minor update thường ít thay đổi tương thích hơn nhưng vẫn cần quy trình rollout và backup.

Giới hạn network exposure, dùng TLS, role ít quyền, password/authentication phù hợp, tách owner khỏi application user, quản lý secret và audit. Kiểm tra `pg_hba.conf`, quyền filesystem, extension và phiên bản đang hỗ trợ.

## Vận hành có bằng chứng

Theo dõi connection, transaction age, lock waits, query latency/rows, cache/buffer, vacuum, WAL, replication slots/lag, disk, checkpoints, backup age và restore result. Đặt alert theo ngưỡng gây hành động, không chỉ thu thập dashboard. Với sự cố, dựng timeline từ log, metrics và transaction/query identifiers; thay đổi một biến có giả thuyết rồi đo.

*PostgreSQL Internals 14* tập trung internals; chủ đề replication/backup/upgrade được nối bằng official docs hiện hành: [warm standby](https://www.postgresql.org/docs/current/warm-standby.html), [logical replication](https://www.postgresql.org/docs/current/logical-replication.html), [backup and restore](https://www.postgresql.org/docs/current/backup.html), [PITR](https://www.postgresql.org/docs/current/continuous-archiving.html), [upgrading](https://www.postgresql.org/docs/current/upgrading.html), [security](https://www.postgresql.org/docs/current/security.html).

## Tự kiểm tra

**Read replica có phải backup?** Không; lỗi logic và thao tác xóa có thể được replicate.

**Logical replication có tự replicate DDL?** Không theo nghĩa đầy đủ của physical replication; quản lý schema riêng.

**Backup có đáng tin nếu chưa thử restore?** Chưa có bằng chứng về khả năng phục hồi; phải diễn tập trong failure domain phù hợp.

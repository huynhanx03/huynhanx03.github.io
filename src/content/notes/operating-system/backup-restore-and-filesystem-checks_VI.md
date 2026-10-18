---
title: "Backup, restore và kiểm tra filesystem"
category: "Operating System"
tags: ["operating-system", "filesystem", "backup"]
description: "Phân biệt consistency check với backup, xây nguyên tắc bản sao độc lập và kiểm tra khả năng restore."
updated: 2026-10-16
translationKey: "operating-system/backup-restore-and-filesystem-checks"
---

Filesystem check sửa một số dạng inconsistency cấu trúc; nó không phục hồi file đã xóa hoặc dữ liệu bị ghi đè. Backup giữ bản sao để phục hồi sau lỗi thiết bị, thao tác nhầm hoặc sự cố bảo mật. Hai việc này giải quyết rủi ro khác nhau.

## fsck và journal recovery

Sau crash, journaling filesystem thường replay journal để khôi phục invariant metadata. `fsck` hoặc tool riêng của filesystem kiểm tra cấu trúc sâu hơn, thường cần filesystem unmount hoặc ở chế độ phù hợp. Chạy tool sửa trên filesystem đang được mount read-write có thể gây thêm hỏng.

## Backup có thể phục hồi

Backup nên độc lập failure domain, có retention/versioning, quyền ghi hạn chế và bản sao offline/immutable khi phù hợp. Snapshot trên cùng thiết bị hữu ích cho rollback nhanh nhưng không bảo vệ khỏi lỗi thiết bị hoặc attacker có quyền xóa snapshot.

Restore test kiểm tra quy trình, key, metadata, quyền và thời gian phục hồi. Backup chưa từng restore thử chỉ chứng minh dữ liệu đã được ghi ở đâu đó, không chứng minh có thể dùng lại.

## Tự kiểm tra

**Journal thay backup?** Không.

**Snapshot cùng storage chịu được hỏng storage?** Không.

**Backup job thành công chứng minh restore thành công?** Không.

## Đọc tiếp

Crash consistency giải thích filesystem recovery; application consistency còn cần phối hợp giữa file/database.

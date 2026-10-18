---
title: "Filesystem quota và dung lượng dự phòng"
category: "Operating System"
tags: ["operating-system", "filesystem", "quota"]
description: "Phân biệt quota user/group/project với block/inode capacity toàn filesystem và hiểu phần dung lượng dự phòng."
updated: 2026-10-16
translationKey: "operating-system/filesystem-quota-and-reserved-space"
---

Filesystem có thể còn dung lượng tổng thể nhưng một user hoặc project đã chạm quota. Ngược lại, một user có thể ghi tiếp dù phần dung lượng còn thấp nếu quota chưa tới. Quota là chính sách phân bổ; `df` chủ yếu cho biết tình trạng filesystem tổng.

## Block, inode và grace period

Quota có thể giới hạn block bytes, số inode hoặc cả hai. Soft limit có thể cho phép vượt tạm trong grace period; hard limit chặn ngay khi chạm. Tool hiển thị và thao tác khác nhau theo filesystem (ví dụ quota truyền thống, project quota hoặc công cụ riêng như `xfs_quota`).

## Reserved blocks

Một số filesystem dành một phần dung lượng cho root hoặc hoạt động nội bộ để giảm nguy cơ phân mảnh và giúp quản trị phục hồi khi filesystem gần đầy. Dung lượng “available” cho user thường thấp hơn tổng “free”. Reserved space không phải backup và không đảm bảo mọi ứng dụng hệ thống còn chạy khi đầy.

## Điều tra

Kiểm tra `df -h`, `df -i`, quota user/group/project, filesystem/mount đúng và file đã unlink còn mở. Đừng giảm reserved percentage hoặc tăng quota khi chưa hiểu workload; dịch vụ có thể vẫn cần khoảng trống cho journal, log và recovery.

## Tự kiểm tra

**`df` còn trống nghĩa user chắc chắn ghi được?** Không; quota có thể chặn.

**Quota byte và inode là một giới hạn?** Không.

**Reserved block là dung lượng dự phòng ngoài filesystem?** Không; nó thuộc filesystem nhưng bị giới hạn quyền sử dụng.

## Đọc tiếp

`df` và `du` khác nhau khi metadata, deleted-open file, quota hoặc reserved blocks ảnh hưởng kết quả.

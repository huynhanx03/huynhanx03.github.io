---
title: "Filesystem journal mode và dữ liệu sau crash"
category: "Operating System"
tags: ["operating-system", "filesystem", "journaling"]
description: "Phân biệt writeback, ordered và data journaling, cùng điều chúng bảo đảm và không bảo đảm sau mất điện."
updated: 2026-10-16
translationKey: "operating-system/filesystem-journal-modes-data-integrity"
---

Journaling filesystem ghi ý định thay đổi vào journal để khôi phục metadata nhất quán sau crash. Các chế độ khác nhau về việc có ghi file data vào journal hay chỉ bảo đảm thứ tự giữa data và metadata. Tên và semantics cụ thể phụ thuộc filesystem.

## Ba kiểu khái quát

- **Writeback:** metadata được journal; data write có thể chưa xuống thiết bị trước metadata commit. Sau crash, file mới có thể chứa nội dung cũ hoặc dữ liệu khác theo filesystem/device.
- **Ordered:** data liên quan được yêu cầu ghi trước khi metadata commit tham chiếu tới nó; thường tránh lộ dữ liệu cũ trong file vừa tạo nhưng không đảm bảo mọi data bền.
- **Data journaling:** data và metadata đều journal, tăng mức bảo vệ nhưng tạo thêm I/O và giảm dung lượng hữu ích.

## Giới hạn

Journal không phải transaction cho nhiều file ứng dụng, không thay `fsync`, backup hoặc checksum end-to-end. Device write cache có thể làm mất dữ liệu đã được báo hoàn tất nếu flush semantics/hardware không đúng. Sau crash, replay journal khôi phục cấu trúc nhưng không nhất thiết khôi phục nội dung cuối cùng người dùng mong muốn.

## Tự kiểm tra

**Journaling bảo đảm ứng dụng đã commit dữ liệu?** Không.

**Metadata consistency đồng nghĩa file content mới nhất còn nguyên?** Không.

**Data journaling miễn phí?** Không; tăng ghi và overhead.

## Đọc tiếp

Ứng dụng cần `fsync` và protocol cập nhật file phù hợp với durability mà nó yêu cầu.

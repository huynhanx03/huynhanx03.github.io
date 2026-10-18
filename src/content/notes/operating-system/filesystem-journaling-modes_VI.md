---
title: "Journaling mode: data, ordered và writeback"
category: "Operating System"
tags: ["filesystem", "journaling", "ext4", "crash consistency"]
description: "So sánh các mức journaling điển hình và hiểu thứ tự ghi liên quan tới dữ liệu file sau crash."
updated: 2026-10-16
translationKey: "operating-system/filesystem-journaling-modes"
---

Journaling ghi transaction để phục hồi filesystem metadata sau crash, nhưng không phải mọi mode đều ghi file content vào journal. Trong ext3/ext4, tên và semantics chính xác phụ thuộc version/configuration; ba khái niệm writeback, ordered và journal giúp hiểu trade-off.

## Writeback

Metadata transaction được journal, còn data block có thể được ghi theo thứ tự không ràng buộc tương tự. Sau crash, metadata có thể nhất quán nhưng file mới có thể lộ nội dung cũ ở block được tái sử dụng nếu ordering không bảo vệ.

## Ordered

Data được ghi trước metadata commit tham chiếu tới block mới theo quy tắc mode; giảm nguy cơ metadata trỏ tới data cũ trong một số failure. Data không được journal đầy đủ, nên không đồng nghĩa mọi byte file gần nhất được khôi phục.

## Journal mode

Data và metadata có thể được ghi vào journal trước khi vị trí chính thức cập nhật, tăng write traffic nhưng cung cấp phạm vi recovery mạnh hơn cho transaction theo mode. Nó vẫn cần hiểu flush/device semantics và không thay `fsync` hợp đồng ứng dụng.

## Chọn mode và durability

Default distro, mount options và kernel version ảnh hưởng. Filesystem tuning cần đo workload; mode “an toàn hơn” có thể tốn I/O và không bù cho controller cache không an toàn hoặc ứng dụng không sync đúng.

## Tóm tắt

- Journaling mode quyết định data nào journal và ordering nào được bảo đảm.
- Writeback tập trung metadata, data ordering yếu hơn.
- Ordered ghi data trước metadata commit trong semantics cụ thể.
- Journal mode có thể tăng write traffic.
- Không mode nào tự thay durability contract của ứng dụng/thiết bị.

## Tự kiểm tra

**Ordered mode nghĩa mọi write app đã bền?** Không.

**Journaling luôn journal file content?** Không; tùy mode.

**Chọn journal mode nhanh nhất là an toàn nhất?** Không; cần workload, failure model và device stack.

## Đọc tiếp

Kết hợp với [crash consistency](/vi/notes/operating-system/crash-consistency-and-journaling/) và [I/O durability](/vi/notes/operating-system/io-durability-contracts/).

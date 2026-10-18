---
title: "Inode, block và vì sao filesystem hết chỗ"
category: "Operating System"
tags: ["operating-system", "filesystem", "storage"]
description: "Chẩn đoán filesystem hết block, hết inode hoặc bị file đã unlink vẫn mở chiếm dung lượng."
updated: 2026-10-16
translationKey: "operating-system/filesystem-inodes-df-space"
---

Filesystem quản lý cả data blocks lẫn metadata như inode. Dung lượng byte còn trống và số inode còn trống là hai tài nguyên độc lập. Hệ thống có thể không tạo được file mới dù `df -h` còn dung lượng nếu inode đã hết.

## Block và inode

`df -h` báo block capacity; `df -i` báo inode capacity. Nhiều file nhỏ tiêu thụ nhiều inode dù tổng byte thấp. Directory tree và metadata cũng chiếm block. `du` đi qua các file đang có đường dẫn; `df` phản ánh block filesystem đã cấp.

## File đã xóa nhưng vẫn chiếm chỗ

Unlink bỏ directory entry, nhưng nếu process còn file descriptor mở thì inode/data được giữ tới khi descriptor đóng. Vì vậy `df` có thể cho thấy nhiều dung lượng dùng hơn `du`. `lsof +L1` tìm một số deleted-open files; restart/rotate đúng cách để process đóng descriptor.

## Quota và reserved blocks

Quota có thể giới hạn user/group/project trước khi filesystem toàn cục đầy. Một số filesystem giữ phần dung lượng cho root hoặc hoạt động nội bộ. Kiểm tra quota, mount, inode và open file trước khi xóa dữ liệu ngẫu nhiên.

## Tự kiểm tra

**`du` và `df` phải luôn bằng nhau?** Không.

**Hết inode nghĩa là hết byte data block?** Không.

**Xóa file lớn đang mở chắc chắn giải phóng dung lượng ngay?** Không.

## Đọc tiếp

Directory entry trỏ tới inode; hard link count quyết định khi nào dữ liệu có thể được thu hồi.

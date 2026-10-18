---
title: "mmap, file mapping và shared memory"
category: "Operating System"
tags: ["operating-system", "memory", "mmap"]
description: "Theo dõi cách mmap liên kết file với virtual address space và phân biệt private mapping với shared mapping."
updated: 2026-10-16
translationKey: "operating-system/virtual-memory-mmap-and-file-mapping"
---

`mmap` tạo một vùng virtual address gắn với file hoặc vùng anonymous. Process đọc/ghi vùng nhớ bằng load/store; page fault khiến kernel đưa trang cần thiết vào RAM. Mapping cho phép truy cập file theo offset và chia sẻ dữ liệu mà không cần mỗi thao tác gọi read/write.

## Private và shared mapping

`MAP_PRIVATE` dùng copy-on-write: nhiều process có thể cùng thấy trang ban đầu, nhưng ghi tạo bản riêng cho process. Thay đổi không được ghi ngược vào file theo semantics mapping thông thường.

`MAP_SHARED` cho phép thay đổi được nhìn thấy qua mapping chia sẻ và có thể ghi về file. Thời điểm dữ liệu được đẩy xuống storage không đồng nghĩa với việc ứng dụng đã yêu cầu durability; `msync`, `fsync` và hợp đồng filesystem/device vẫn liên quan.

## Fault và kích thước file

Mapping file lớn không nhất thiết nạp toàn bộ file. Truy cập trang chưa resident gây fault, kernel tìm dữ liệu hoặc báo lỗi. Truy cập ngoài độ dài file có thể gây `SIGBUS`; truy cập vùng không hợp lệ có thể gây `SIGSEGV`. File có thể bị truncate khi vẫn đang map, tạo lỗi khó dự đoán cho ứng dụng.

## Khi nào dùng?

Memory mapping hữu ích cho random access, parser định dạng lớn, chia sẻ trang read-only hoặc IPC được đồng bộ đúng cách. Nó không tự làm I/O miễn phí: page fault, dirty writeback, page cache, TLB và giới hạn address space vẫn tồn tại. Với file nhỏ tuần tự, buffered I/O đơn giản có thể hiệu quả và dễ xử lý lỗi hơn.

## Tự kiểm tra

**`mmap` đảm bảo file đã được ghi bền xuống đĩa sau phép gán?** Không.

**`MAP_PRIVATE` là cách chỉnh sửa file in-place?** Không.

**Mapping file lớn luôn chiếm ngay lượng RAM bằng kích thước file?** Không; trang được fault-in theo truy cập.

## Đọc tiếp

Trang file được chia sẻ với page cache; buffered I/O và direct I/O có semantics cache khác nhau.

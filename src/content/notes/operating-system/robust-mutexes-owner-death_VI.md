---
title: "Robust mutex và xử lý owner chết"
category: "Operating System"
tags: ["concurrency", "mutex", "recovery"]
description: "Hiểu vì sao process chết khi giữ shared mutex có thể để dữ liệu dang dở và cách robust mutex báo owner death."
updated: 2026-10-16
translationKey: "operating-system/robust-mutexes-owner-death"
---

Process-shared mutex có thể nằm trong shared memory và bảo vệ dữ liệu được nhiều process dùng. Nếu owner bị kill/crash khi đang giữ mutex, process khác có thể chờ vĩnh viễn trừ khi mutex/giao thức có cách phát hiện owner chết.

## Robust mutex

Với POSIX, lần lock tiếp theo có thể trả `EOWNERDEAD`; dù mã trả về khác 0, thread gọi đã **sở hữu mutex** và phải xử lý trạng thái dữ liệu không nhất quán. Nếu phục hồi thành công, gọi `pthread_mutex_consistent` trước khi unlock. Nếu unlock mà chưa gọi hàm này, mutex chuyển thành không thể khôi phục; các lần lock sau nhận `ENOTRECOVERABLE`. Xem [hợp đồng `pthread_mutex_lock`](https://pubs.opengroup.org/onlinepubs/9799919799/functions/pthread_mutex_lock.html).

Nếu không thể phục hồi invariant, báo lỗi và tái tạo vùng dữ liệu theo giao thức ứng dụng; đừng tiếp tục như chưa có gì. Robust mutex chỉ báo trạng thái owner chết và cho ứng dụng cơ hội sửa, không tự quyết định dữ liệu nào đúng.

Robustness chỉ phát hiện owner chết khi giữ lock; nó không tự rollback dữ liệu. Nếu owner chết sau khi ghi nửa cấu trúc, ứng dụng vẫn cần journal, versioning, copy-on-write hoặc transaction để phục hồi.

## Phạm vi và giới hạn

Robust mutex cần API hỗ trợ và cấu hình đúng; không phải mọi mutex mặc định robust. Process-shared, crash consistency và lifecycle shared memory phải được thiết kế đồng bộ. Lock-free algorithm cũng cần xử lý thread chết nếu operation có thể để trạng thái trung gian.

## Tự kiểm tra

**Robust mutex tự sửa dữ liệu?** Không.

**Owner chết đồng nghĩa mutex tự mở khóa mà không thông báo?** Robust API thường báo owner death để caller xử lý.

**Mutex process-private bảo vệ shared memory giữa process?** Không nếu không cấu hình process-shared phù hợp.

## Đọc tiếp

Transaction và journaling cung cấp cách khôi phục invariant sau khi thao tác bị gián đoạn.

---
title: "Process limits, file descriptor và ulimit"
category: "Operating System"
tags: ["linux", "process", "resource-limits"]
description: "Hiểu soft/hard limits, giới hạn file descriptor và process; chẩn đoán lỗi mở file hay tạo thread thất bại."
updated: 2026-10-16
translationKey: "operating-system/linux-process-limits-ulimit"
---

Process cần tài nguyên hữu hạn như file descriptor, process/thread, stack và address space. Linux có rlimit cho mỗi process và các giới hạn toàn hệ thống/cgroup. Lệnh `ulimit` hiển thị hoặc đặt một phần giới hạn trong shell rồi được kế thừa bởi process con.

## Soft và hard limit

Soft limit là mức hiện hành; hard limit là trần mà user không đặc quyền thường không thể vượt. `ulimit -n` xem số file descriptor tối đa của shell; `/proc/PID/limits` xem giới hạn process cụ thể. systemd unit có thể cấu hình `LimitNOFILE=`.

## FD exhaustion và symptom

Ứng dụng có thể nhận `EMFILE` khi process hết FD, hoặc `ENFILE` khi toàn hệ thống cạn file table. Socket, pipe, log và file tạm đều có thể giữ descriptor; code trong library cũng có thể mở chúng. Shared library được map vào memory không nhất thiết giữ một FD mở suốt thời gian sử dụng. `lsof -p PID` hoặc `/proc/PID/fd` giúp tìm FD; đếm số FD không đủ nếu có leak theo thời gian.

`fork()`/thread creation thất bại có thể do `pids.max`, `RLIMIT_NPROC`, memory/stack hoặc host limit. Trên Linux, `RLIMIT_NPROC` so tổng thread thuộc real UID của caller với giới hạn của process gọi, chứ không đếm riêng các child của process đó; UID 0 và một số capability được miễn kiểm tra này. Xem [getrlimit(2)](https://man7.org/linux/man-pages/man2/getrlimit.2.html). Tăng giới hạn khi chưa tìm leak chỉ trì hoãn lỗi và tăng khả năng cạn tài nguyên chung.

## Tự kiểm tra

**`ulimit` trong terminal luôn sửa được service đã chạy?** Không.

**Mở socket có dùng FD?** Có.

**`EMFILE` và `ENFILE` cùng phạm vi?** Không; một cái thường là per-process, cái kia system-wide.

## Đọc tiếp

Cgroup áp giới hạn theo nhóm, còn rlimit thường đi theo process và được kế thừa.

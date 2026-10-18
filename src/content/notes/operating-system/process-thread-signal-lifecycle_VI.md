---
title: "Thread, signal mask và vòng đời tiến trình Linux"
category: "Operating System"
tags: ["linux", "process", "thread", "signal"]
description: "Phân biệt process với thread trong Linux, hiểu signal process-directed/thread-directed và cách chờ tiến trình kết thúc."
updated: 2026-10-16
translationKey: "operating-system/process-thread-signal-lifecycle"
---

Linux biểu diễn task có thể lập lịch bằng cấu trúc kernel chung; process truyền thống và thread khác nhau chủ yếu ở tài nguyên được chia sẻ và cách userspace nhìn chúng. `clone` cho phép tạo task với tổ hợp chia sẻ address space, file table, signal handlers và namespace.

## Process và thread

Thread cùng process thường chia sẻ address space, file descriptors và nhiều tài nguyên, nhưng mỗi thread có stack, registers, thread ID và signal mask riêng. `getpid()` thường trả thread group ID chung; `gettid()` nhận diện thread cụ thể trên Linux.

## Signal delivery

Signal có thể hướng tới process/thread group hoặc thread cụ thể. Kernel chọn một thread không block signal để nhận signal process-directed; signal đồng bộ do lỗi instruction thường gắn với thread gây lỗi. Signal mask là theo thread, còn disposition/handler thường được chia sẻ trong process.

## Kết thúc và thu nhận trạng thái

Thread có thể kết thúc độc lập; process kết thúc khi thread group không còn thread (trừ semantics đặc biệt). Cha dùng `wait`/`waitpid` để thu trạng thái child. Nếu không reap child đã kết thúc, entry zombie còn lưu trong process table; zombie không chạy nhưng chiếm metadata.

## Tự kiểm tra

**Mọi thread có signal mask riêng?** Có trên Linux/POSIX.

**Zombie còn chiếm CPU?** Không.

**Signal do page fault có thể tùy ý chuyển cho thread khác?** Nó gắn với thread thực hiện fault.

## Đọc tiếp

Process được tạo bằng fork/exec và chịu chính sách scheduler khi runnable.

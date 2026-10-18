---
title: "Quan sát process trên Linux: trạng thái, CPU time và load average"
category: "Operating System"
tags: ["linux", "process", "monitoring", "scheduling"]
description: "Đọc ps, top, /proc và load average theo đúng ý nghĩa, tránh nhầm tải cao với CPU luôn bận."
updated: 2026-10-16
translationKey: "operating-system/linux-process-observation"
---

Scheduler quyết định ai chạy, nhưng khi máy chậm ta cần quan sát trạng thái process và tài nguyên. Lệnh `ps`, `top`, `/proc` và công cụ thống kê cung cấp các góc nhìn khác nhau; không có một cột duy nhất trả lời đầy đủ “vì sao chậm”.

## Process state không phải phần trăm CPU

Trạng thái trong `ps` thường phân biệt running/runnable, interruptible sleep, uninterruptible sleep, stopped và zombie, với ký hiệu cụ thể tùy công cụ. Một process ở trạng thái runnable có thể đang chạy hoặc đang chờ CPU. Một process ngủ có thể đang chờ I/O hoặc sự kiện đồng bộ; CPU thấp của nó không chứng minh nó khỏe.

Zombie đã kết thúc nhưng chưa được parent thu nhận, không tiêu thụ CPU như process chạy. Uninterruptible sleep thường liên quan chờ kernel/resource; gửi tín hiệu kết thúc không nhất thiết làm thao tác đang chờ biến mất ngay.

## CPU time và wall-clock time

Wall-clock time đo thời gian đồng hồ từ đầu tới cuối. User CPU time đo thời gian chạy trong user mode; system CPU time đo thời gian kernel thực hiện thay mặt process. Một công việc mất 10 giây nhưng chỉ dùng 1 giây CPU có thể dành phần lớn thời gian chờ I/O hoặc lock.

Trên đa lõi, tổng CPU time qua các thread có thể lớn hơn wall-clock duration vì nhiều thread chạy song song. Phần trăm CPU trong công cụ có thể chuẩn hóa theo một lõi hoặc toàn máy; cần đọc chú giải công cụ.

## Load average không phải CPU utilization

Load average trên Linux là số trung bình các task runnable và một số task đang chờ không ngắt được theo định nghĩa kernel, được làm mượt theo các khoảng thời gian. Nó không phải phần trăm CPU. Load 4 có thể bình thường trên máy nhiều CPU, nhưng có thể báo xếp hàng trên máy nhỏ; cũng cần xét task bị block.

So load average với số CPU logic là dấu hiệu sơ bộ, không phải kết luận. Kết hợp `uptime`, `top`, `vmstat`, thông tin I/O wait và phân tích process để tìm xem công việc đang chạy hay chờ.

## Một quy trình điều tra

1. Ghi nhận thời điểm, triệu chứng và liệu ảnh hưởng toàn máy hay một ứng dụng.
2. Dùng `ps`/`top` xác định process/thread dùng CPU hoặc giữ nhiều bộ nhớ.
3. Xem task ở trạng thái runnable, sleeping hay uninterruptible.
4. Dùng `vmstat`/`iostat`/`pidstat` khi có để phân biệt CPU, bộ nhớ và I/O.
5. Dùng `strace` hoặc tracing có chọn lọc để tìm system call chờ; tracing có overhead nên áp dụng cẩn thận.

Lệnh và cột có thể khác giữa distro/util-linux/procps. Tránh chạy `kill -9` như bước đầu: trước hết hiểu process đang làm gì, sau đó dùng tín hiệu phù hợp để yêu cầu shutdown sạch.

## Tóm tắt

- Process state, CPU time và load average đo các khía cạnh khác nhau.
- Runnable có thể đang chạy hoặc chờ CPU; sleeping thường chờ sự kiện.
- Wall time có thể lớn dù CPU time nhỏ do chờ I/O/lock.
- Load average không phải CPU percent; diễn giải cùng số CPU và trạng thái task.
- Chẩn đoán nên kết hợp nhiều công cụ theo giả thuyết cụ thể.

## Tự kiểm tra

**Load average 8 luôn đồng nghĩa CPU 800%?** Không. Load average không phải phần trăm sử dụng CPU.

**Process đang ngủ có thể là nguyên nhân độ trễ?** Có. Nó có thể đang chờ I/O hoặc lock.

**Zombie cần kill để dừng?** Nó đã dừng rồi; parent cần thu nhận trạng thái.

## Đọc tiếp

Để đọc sâu cách hệ thống ghi log và giám sát tài nguyên Linux, xem topic **Linux System**.

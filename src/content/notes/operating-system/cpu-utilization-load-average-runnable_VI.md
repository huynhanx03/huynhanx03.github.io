---
title: "Load average, CPU utilization và runnable task"
category: "Operating System"
tags: ["linux", "cpu", "monitoring"]
description: "Đọc load average đúng ngữ cảnh, phân biệt CPU bận với task chờ I/O và tìm hàng đợi runnable gây latency."
updated: 2026-10-17
translationKey: "operating-system/cpu-utilization-load-average-runnable"
---

CPU utilization cho biết thời gian core ở các trạng thái; load average trên Linux là trung bình làm mượt của số task ở trạng thái `R` (đang chạy hoặc runnable) và `D` (ngủ không thể ngắt, thường chờ I/O) trong các cửa sổ 1, 5 và 15 phút. [Tài liệu `/proc/loadavg`](https://man7.org/linux/man-pages/man5/proc_loadavg.5.html) mô tả các trạng thái được tính. Vì load không chuẩn hóa theo số logical CPU, load 4 có ý nghĩa khác trên máy 2 và 64 logical CPU. Đây chỉ là mốc so sánh sơ bộ: SMT, kiến trúc lõi không đồng nhất và mức độ bận của CPU cũng ảnh hưởng năng lực xử lý.

## Runnable và blocked

Task runnable đang chạy hoặc chờ CPU. Task blocked chờ sự kiện; nếu ở trạng thái uninterruptible `D`, task đó cũng góp vào load average dù không tranh CPU tại thời điểm ấy. Vì vậy load cao không đồng nghĩa CPU utilization cao.

## Công cụ quan sát

`uptime`/`top` cho load và CPU; `vmstat 1` cho runnable queue (`r`), blocked (`b`), CPU và swap; `mpstat` xem từng CPU; `pidstat` liên hệ process. Đọc một snapshot dễ bỏ lỡ burst; xem chuỗi thời gian cùng latency ứng dụng.

Context switch, steal time trong VM, CPU throttling cgroup và IRQ load cũng ảnh hưởng khả năng xử lý. So sánh load với core count, quota container và workload baseline trước khi đổi scheduler/priority.

## Tự kiểm tra

**Load average 8 nghĩa CPU 800%?** Không.

**CPU 100% chứng minh có đủ throughput?** Không; cần xem queue, latency và core.

**Load cao luôn do CPU-bound process?** Không; I/O-blocked task cũng có thể góp phần.

## Đọc tiếp

Cgroup quota có thể throttle process ngay cả khi host còn CPU rảnh ở core khác.

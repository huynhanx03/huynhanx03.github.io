---
title: "Preemption, timer tick và scheduler latency"
category: "Operating System"
tags: ["operating-system", "scheduler", "kernel"]
description: "Hiểu preemption point, timer tick và các nguồn gây trễ trước khi runnable task được chạy."
updated: 2026-10-16
translationKey: "operating-system/scheduler-tickless-preemption-latency"
---

Preemption cho phép kernel tạm dừng task đang chạy để cấp CPU cho task khác. Timer interrupt là một cách kernel lấy lại quyền điều khiển định kỳ, nhưng scheduler latency còn phụ thuộc trạng thái kernel, interrupt masking, ưu tiên, runqueue và CPU affinity.

## Tick và tickless

Periodic timer tick cập nhật thời gian và có thể kích hoạt scheduling. Tickless kernel giảm tick không cần thiết khi CPU idle hoặc theo cấu hình, tiết kiệm điện và giảm interrupt overhead. Timer vẫn cần cho timeout và deadline.

## Latency sources

Task runnable có thể chờ vì task ưu tiên cao hơn, lock contention, IRQ/softirq load, CPU quota throttling hoặc core pinning. Kernel preemptible configuration và real-time patch thay đổi giới hạn một số đường trễ, nhưng không biến hệ thống thành hard real-time tự động.

## Đo

Latency cần đo từ sự kiện tới lúc task thực thi, không chỉ context switch count. `perf sched`, ftrace/trace-cmd và eBPF tooling có thể truy dấu runqueue wait tùy hệ thống. Ghi cả CPU, priority, cgroup, IRQ và workload để diễn giải.

## Tự kiểm tra

**Timer tick mỗi mili giây bảo đảm mọi task được chạy trong một mili giây?** Không.

**CPU idle tickless không có timer nào?** Không; timer vẫn phục vụ deadline/sự kiện.

**PREEMPT_RT tự bảo đảm deadline ứng dụng?** Không; ứng dụng, cấu hình và phần cứng cũng phải đáp ứng.

## Đọc tiếp

Real-time policy cần kiểm soát priority, interrupt và blocking để đạt latency có giới hạn.

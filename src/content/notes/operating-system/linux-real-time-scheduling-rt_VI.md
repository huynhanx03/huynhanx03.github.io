---
title: "Linux real-time scheduling và giới hạn thực tế"
category: "Operating System"
tags: ["linux", "scheduler", "realtime"]
description: "Phân biệt policy realtime với deadline guarantee, kiểm soát starvation và thiết kế workload có giới hạn blocking."
updated: 2026-10-16
translationKey: "operating-system/linux-real-time-scheduling-rt"
---

Linux cung cấp policy realtime như FIFO/RR, nhưng việc gán priority cao không tự tạo deadline guarantee. Task realtime có thể preempt task thường và làm hệ thống đói CPU nếu chạy không nhường hoặc chờ lock không kiểm soát.

## FIFO, RR và deadline

`SCHED_FIFO` chạy tới khi block, yield hoặc bị task realtime cao hơn preempt. `SCHED_RR` thêm quantum giữa task cùng priority. `SCHED_DEADLINE` mô hình hóa runtime, deadline và period theo reservation policy trên kernel hỗ trợ. Mỗi policy có điều kiện, privilege và giới hạn riêng.

## Blocking và priority inversion

Task realtime có thể bị chặn bởi mutex, page fault, I/O hoặc interrupt dài. Priority inheritance giúp một số tình huống lock, nhưng không giải quyết mọi blocking. Memory locking, pre-fault, bounded critical section và tránh allocation/blocking trong đoạn nhạy thời gian thường cần thiết.

## Bảo vệ hệ thống

Giới hạn runtime/CPU cho RT task, cấu hình quyền `rtprio`, theo dõi watchdog và giữ đường điều khiển phục hồi. Đo worst-case/tail latency dưới tải và fault injection; average latency không chứng minh deadline được giữ.

## Tự kiểm tra

**`SCHED_FIFO` cao nhất là nhanh nhất cho mọi workload?** Không; nó có thể starve phần còn lại.

**Real-time nghĩa task luôn chạy ngay?** Không.

**Priority inheritance loại bỏ mọi blocking?** Không.

## Đọc tiếp

Scheduler latency đến từ runqueue, preemption point, interrupt và cgroup policy.

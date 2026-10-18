---
title: "Cgroup: giới hạn CPU, memory và số process"
category: "Operating System"
tags: ["linux", "cgroups", "resources"]
description: "Đọc các bộ điều khiển cgroup v2 để hiểu quota CPU, memory limit, pressure và PID limit của service/container."
updated: 2026-10-16
translationKey: "operating-system/linux-cgroups-cpu-memory-pids"
---

Cgroup nhóm process để kernel đo lường và áp chính sách tài nguyên. Bài này dùng interface cgroup v2 cho service/scope hoặc container; máy dùng cgroup v1 có path và controller khác. systemd và container runtime thường tạo cgroup cho workload. Cgroup không phải namespace: nó giới hạn hoặc accounting tài nguyên, còn namespace thay đổi những gì process nhìn thấy.

## CPU

`cpu.max` đặt quota theo chu kỳ; task có thể dùng burst trong giới hạn rồi bị throttle tới chu kỳ tiếp theo. `cpu.weight` phân chia CPU tương đối khi các nhóm cạnh tranh, không phải reservation tuyệt đối. CPU affinity giới hạn core chạy được và là cơ chế khác.

## Memory

`memory.max` đặt giới hạn cứng; khi chạm, reclaim xảy ra rồi có thể OOM trong cgroup. `memory.high` tạo ngưỡng pressure/throttling nhẹ hơn trên hệ thống hỗ trợ. `memory.current`, `memory.stat`, `memory.events` và PSI giúp thấy usage, cache, OOM và stall.

## PIDs và chẩn đoán

`pids.max` giới hạn số task (thread), không chỉ số process; một process nhiều thread cũng tiêu thụ nhiều mục trong giới hạn. Nó giúp ngăn fork bomb hoặc cấu hình quá nhiều worker. Xem [PID controller](https://docs.kernel.org/admin-guide/cgroup-v2.html#pid). Khi vượt giới hạn, tạo task mới thất bại dù RAM còn.

`systemctl show service -p ControlGroup` tìm cgroup service; đọc các file controller dưới `/sys/fs/cgroup/...` để kiểm tra giá trị thực. Container báo “CPU 100%” cần biết đó là một core, quota hay tổng host.

## Tự kiểm tra

**CPU weight bảo đảm một tỷ lệ cố định khi host nhàn?** Không.

**Memory limit container là riêng RAM vật lý?** Không; nó là chính sách accounting/reclaim ở kernel.

**Namespace thay thế cgroup?** Không.

## Đọc tiếp

Linux process monitor giúp liên kết cgroup pressure với tiến trình và triệu chứng ứng dụng.

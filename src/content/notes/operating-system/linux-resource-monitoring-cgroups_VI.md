---
title: "Giám sát tài nguyên và cgroups trên Linux"
category: "Operating System"
tags: ["linux", "monitoring", "cgroups", "resources"]
description: "Phân tích CPU, memory, I/O và hiểu cgroups giới hạn hoặc đo tài nguyên theo nhóm process."
updated: 2026-10-16
translationKey: "operating-system/linux-resource-monitoring-cgroups"
---

Process dùng tài nguyên theo nhiều cách: CPU time, resident memory, I/O và số thread. Một chỉ số cao không tự cho biết lỗi. Cần nối metric với trạng thái process, giới hạn cgroup và workload thật.

## Công cụ nhìn từ nhiều góc

- `top`/`htop`: snapshot process và CPU/memory theo thời gian.
- `vmstat`: run queue, memory, swap, block I/O và CPU tổng quát.
- `iostat`: hoạt động thiết bị block và latency/throughput theo công cụ.
- `pidstat`: số liệu theo process/thread.
- `lsof`: file/socket đang mở.
- `strace`: system call và thời gian chờ ở ranh giới kernel.

Tên cột và cách chuẩn hóa thay đổi theo phiên bản. Snapshot không đủ để kết luận; ghi lại theo thời gian lúc vấn đề diễn ra.

## Load và run queue

Run queue đông gợi ý task runnable đang chờ CPU. CPU utilization thấp cùng load cao có thể do task ở trạng thái uninterruptible wait; CPU cao có thể do tính toán hoặc spin. Xem trạng thái process và I/O wait song song.

`nice` điều chỉnh trọng số ưu tiên tương đối trên một số scheduler; nó không phải giới hạn CPU chắc chắn. Cgroups mới cung cấp phân nhóm và giới hạn/số liệu theo hierarchy.

## Cgroups

Control groups tổ chức process thành nhóm để giới hạn, phân phối và đo tài nguyên như CPU, memory, I/O và số process. Container runtime/systemd thường tạo cgroup cho workload. Kernel cgroup v1 và v2 khác interface; lệnh/path phụ thuộc cấu hình.

Giới hạn memory có thể khiến allocation thất bại hoặc kích hoạt OOM trong cgroup dù máy còn RAM. CPU quota giới hạn thời gian xử lý trung bình; bị throttling có thể tạo latency dù host tổng thể còn CPU. Cần xem metric cgroup cùng metric host.

## Quy trình tìm nút thắt

1. Xác định service và cgroup chứa process.
2. So sánh host-level resource với limit/group-level usage.
3. Phân loại CPU-bound, memory pressure, I/O wait, lock wait hoặc throttling.
4. Dùng tracing/profiling chi tiết chỉ cho vùng nghi vấn để tránh overhead không cần.
5. Điều chỉnh quota, concurrency hoặc workload rồi so sánh cùng phép đo.

## Tóm tắt

- Dùng nhiều chỉ số vì CPU, memory và I/O có thể cùng gây chậm.
- Load average không phải utilization; run queue và blocked state giúp giải thích.
- `nice` là ưu tiên tương đối, cgroup cung cấp quản lý theo nhóm.
- Cgroup limit có thể gây OOM/throttling dù host còn tài nguyên.
- Chẩn đoán phải so host-level với group-level metrics.

## Tự kiểm tra

**Host còn RAM thì process không thể bị OOM?** Sai; cgroup limit có thể thấp hơn tài nguyên host.

**CPU quota thấp chỉ ảnh hưởng throughput, không ảnh hưởng latency?** Sai; task có thể bị throttling và chờ.

**`strace` không làm thay đổi timing?** Nó thêm overhead; dùng chọn lọc.

## Đọc tiếp

Topic **Linux Tools & Environment** hướng dẫn shell và công cụ quản trị để thao tác với các subsystem này.

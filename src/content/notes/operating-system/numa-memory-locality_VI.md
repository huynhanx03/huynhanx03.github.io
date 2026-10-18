---
title: "NUMA: CPU, memory node và locality"
category: "Operating System"
tags: ["operating-system", "memory", "numa"]
description: "Hiểu vì sao truy cập RAM ở node NUMA xa chậm hơn và cách affinity/first-touch ảnh hưởng hiệu năng."
updated: 2026-10-16
translationKey: "operating-system/numa-memory-locality"
---

Trong máy NUMA, mỗi socket hoặc node có memory controller và RAM gần với một nhóm CPU. Một core có thể truy cập RAM ở node khác, nhưng độ trễ và băng thông thường kém hơn truy cập local. Kernel cần đặt thread và trang nhớ sao cho locality phù hợp.

## First-touch và placement

Chính sách first-touch thường cấp trang gần node của CPU đầu tiên ghi vào trang. Nếu một thread khởi tạo toàn bộ buffer rồi nhiều thread khác xử lý trên node khác, dữ liệu có thể remote. Interleave phân tán trang giữa node; bind cố định placement; lựa chọn phụ thuộc access pattern.

## CPU affinity và memory policy

`numactl --hardware` xem topology; `numactl --show` xem policy process; `numastat` cho thống kê local/remote. CPU affinity chỉ định core được chạy, còn memory policy điều khiển placement trang; cần phối hợp hai yếu tố.

## Vì sao locality có giới hạn

Pin thread có thể giữ cache/locality nhưng giảm scheduler flexibility, gây mất cân bằng tải và ảnh hưởng power management. Container/VM có thể nhìn NUMA topology khác host thật. Đo per-node bandwidth, remote access, latency và application tail latency trước khi pin.

## Tự kiểm tra

**NUMA node xa không truy cập được?** Truy cập được, thường với chi phí khác.

**CPU pinning tự động đặt memory gần CPU?** Không nhất thiết.

**Một policy tối ưu cho mọi workload?** Không.

## Đọc tiếp

False sharing cũng làm tăng chi phí cache giữa core, dù bộ nhớ nằm local hay remote.

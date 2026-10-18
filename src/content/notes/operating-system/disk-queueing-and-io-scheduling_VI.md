---
title: "Hàng đợi I/O và lập lịch thiết bị lưu trữ"
category: "Operating System"
tags: ["operating-system", "io", "storage"]
description: "Theo dõi request từ ứng dụng qua block layer tới thiết bị và hiểu queue depth ảnh hưởng latency/throughput ra sao."
updated: 2026-10-16
translationKey: "operating-system/disk-queueing-and-io-scheduling"
---

Khi nhiều process phát sinh I/O, request đi qua filesystem, block layer, driver và controller trước khi thiết bị xử lý. Mỗi tầng có thể xếp hàng, gộp, chia hoặc sắp lại request. Thời gian chờ queue có thể lớn hơn thời gian thiết bị thực hiện thao tác.

## Queue depth và trade-off

Queue depth cao giữ thiết bị bận và có thể tăng throughput, đặc biệt với SSD/NVMe hỗ trợ nhiều request song song. Nhưng request phải chờ lâu hơn trong queue có thể làm tail latency tăng. Queue depth thấp giảm chờ nhưng có thể để thiết bị nhàn.

Scheduler trên HDD có thể sắp request để giảm seek; với SSD, tối ưu theo vị trí cơ học ít hữu ích hơn. Linux có scheduler và policy phù hợp loại thiết bị/workload; lựa chọn mặc định của kernel thay đổi theo loại thiết bị.

## Buffered, direct và durability

Buffered write có thể được ACK cho process khi data vào page cache, trước khi storage ổn định. Writeback chạy sau. Direct I/O bỏ qua một phần page cache nhưng có yêu cầu alignment và không tự tạo durability. `fsync`/`fdatasync`, flush/FUA và bảo đảm controller quyết định semantics bền.

## Đo và khoanh vùng

`iostat -xz` cho utilization, await và queue; `pidstat -d` liên hệ I/O với process; `iotop` cho hoạt động theo process nếu có quyền. Utilization gần 100% không tự chứng minh thiết bị là bottleneck; so latency, throughput, queue depth và ứng dụng. SSD có thể xử lý nhiều queue đồng thời nên `%util` cần diễn giải theo thiết bị.

## Tự kiểm tra

**Queue depth cao luôn tốt?** Không; có thể tăng latency.

**Ghi xong `write()` đã chắc chắn xuống đĩa?** Không nhất thiết.

**`%util` 100% trên NVMe nói rõ thiết bị đã bão hòa?** Không nếu thiếu thông tin queue và latency.

## Đọc tiếp

RAID thêm nhiều thiết bị vào đường I/O nhưng cũng tạo parity, write amplification hoặc write hole tùy mức.

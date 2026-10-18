---
title: "Priority inversion và tranh chấp lock"
category: "Operating System"
tags: ["concurrency", "mutex", "priority inversion"]
description: "Tìm hiểu vì sao task ưu tiên cao có thể bị task ưu tiên thấp chặn, và các chiến lược giảm nghẽn do lock."
updated: 2026-10-16
translationKey: "operating-system/priority-inversion-and-lock-contention"
---

Một lock bảo vệ dữ liệu dùng chung, nhưng cũng tạo điểm chờ. Nếu thread giữ lock bị trì hoãn, các thread khác cùng cần lock phải đợi. Trong hệ thống có mức ưu tiên, tình huống này có thể gây priority inversion: công việc ưu tiên cao bị chặn gián tiếp bởi công việc ưu tiên thấp.

## Một kịch bản inversion

Thread thấp lấy mutex. Thread cao đến sau và phải chờ mutex đó. Trong lúc này, thread trung bình không cần mutex vẫn có thể chiếm CPU, khiến thread thấp chưa chạy lại để nhả lock. Kết quả là thread cao bị ảnh hưởng bởi thread trung bình dù hai thread này không tranh cùng dữ liệu.

Priority inheritance cho thread đang giữ lock tạm nhận mức ưu tiên cao hơn của waiter, giúp nó chạy và nhả lock. Priority ceiling là một chiến lược khác: đặt mức ưu tiên trần cho tài nguyên. Các cơ chế này hữu ích cho hệ thống thời gian thực nhưng có điều kiện áp dụng và chi phí.

## Nhìn contention bằng dữ liệu

Lock contention tăng khi critical section dài, nhiều thread cùng tranh, hoặc lock được giữ trong khi chờ I/O. Có thể đo thời gian chờ và thời gian giữ lock, số lần tranh chấp và throughput khi tăng số worker. CPU utilization cao không tự nói rằng lock là vấn đề; thread có thể đang chờ futex hoặc spinning.

## Cách giảm nghẽn

- Thu hẹp critical section, không gọi network/disk khi đang giữ lock.
- Chia lock theo shard khi dữ liệu độc lập.
- Dùng cấu trúc chuyên biệt như read-write lock khi tỷ lệ đọc/ghi phù hợp và starvation được kiểm soát.
- Gom cập nhật theo batch hoặc chuyển sang message passing nếu một thread có thể sở hữu dữ liệu.
- Giữ thứ tự lock nhất quán để giảm deadlock.

Không nên thay mutex bằng spinlock chỉ để tránh sleep. Spinning tiêu thụ CPU khi vùng tới hạn dài hoặc thread giữ lock bị deschedule. Chọn cơ chế dựa trên thời gian giữ, tải, topology và phép đo.

## Tự kiểm tra

**Inversion cần hai thread cùng tranh một lock?** Kịch bản điển hình có ba mức ưu tiên; task trung bình có thể làm chậm task thấp đang giữ lock mà task cao cần.

**Priority inheritance làm critical section ngắn hơn?** Không; nó giúp chủ lock được lập lịch để nhả lock sớm hơn.

**Spinlock luôn nhanh hơn mutex?** Không; khi phải chờ lâu, spinning lãng phí CPU.

## Đọc tiếp

Quy tắc ownership, thứ tự lock và invariant là nền tảng để thiết kế cấu trúc dữ liệu đồng thời đúng.

---
title: "CPU virtualization: trap-and-emulate, VT-x và guest state"
category: "Operating System"
tags: ["virtualization", "cpu", "hypervisor"]
description: "Theo dõi cách hypervisor chia sẻ CPU, xử lý privileged operation và chuyển giữa host với guest."
updated: 2026-10-16
translationKey: "operating-system/hypervisor-trap-and-emulate-vt-x"
---

Virtual machine chạy hệ điều hành guest như thể sở hữu CPU, nhưng hypervisor phải giữ quyền kiểm soát thật. Guest cần thực thi phần lớn instruction trực tiếp để có hiệu năng tốt; thao tác nhạy cảm phải được kiểm soát hoặc mô phỏng.

## Trap-and-emulate

Trong virtualization cổ điển, hypervisor chạy guest ở mức quyền thấp hơn. Privileged instruction gây trap; hypervisor mô phỏng hiệu ứng an toàn trên trạng thái ảo rồi tiếp tục guest. Một số kiến trúc x86 cũ có instruction nhạy cảm không trap đúng khi chạy ở mức thấp, khiến binary translation hoặc paravirtualization cần thiết.

## Hardware assist

Intel VT-x/AMD-V cung cấp chế độ guest/host, cấu trúc lưu guest state và cơ chế VM exit khi sự kiện cần hypervisor xử lý. CPU có thể chạy guest trực tiếp trong nhiều tình huống, rồi thoát khi có I/O, interrupt hoặc thao tác cấu hình cần can thiệp. VM exit có chi phí nên hypervisor cố giảm số lần thoát không cần thiết.

## CPU scheduling cho VM

VCPU là luồng thực thi ảo được host scheduler đặt lên logical CPU thật. Guest có scheduler riêng bên trong VM; vì vậy hai lớp lập lịch tương tác. VCPU runnable nhưng host không cấp CPU vẫn làm task guest chậm. Oversubscription có thể tăng utilization nhưng làm latency/steal time tăng.

## Tự kiểm tra

**Hypervisor phải mô phỏng mọi instruction?** Không; phần lớn chạy trực tiếp trên CPU.

**Một vCPU luôn tương ứng một core vật lý riêng?** Không.

**Guest có thể lập lịch thread nếu vCPU không được host chạy?** Không; guest time bị ngừng khi host chưa cấp CPU.

## Đọc tiếp

Memory virtualization thêm các lớp page table để dịch guest virtual address tới host physical memory.

---
title: "Linux kernel, user space và danh tính người dùng"
category: "Operating System"
tags: ["linux", "kernel", "user-space", "permissions"]
description: "Ghép các lớp Linux từ hardware tới process, phân biệt kernel mode với root user và hiểu vai trò UID/GID."
updated: 2026-10-16
translationKey: "operating-system/linux-kernel-user-space-and-users"
---

Một Linux system có thể nhìn theo ba lớp lớn: hardware, kernel và user space. Kernel quản lý CPU, bộ nhớ, driver và system call; user space gồm shell, service và ứng dụng. Nhiều thành phần phối hợp qua API nhưng không cần hiểu implementation bên trong nhau.

## Kernel mode và user mode

Kernel chạy ở privilege level cho phép truy cập tài nguyên phần cứng và vùng nhớ kernel. User process chạy với quyền bị giới hạn; lỗi của một ứng dụng thường chỉ làm process đó kết thúc thay vì ghi đè trực tiếp kernel memory. System call tạo lối vào có kiểm soát để yêu cầu kernel mở file, tạo process hoặc giao tiếp với thiết bị.

Kernel cũng có kernel thread để làm việc nền. Chúng không phải user process thông thường dù có thể được scheduler quản lý tương tự.

## User space không phải một tầng cứng

Các service và ứng dụng trong user space có thể gọi lẫn nhau, dựa vào daemon hoặc thư viện. Không có một thứ bậc bắt buộc cho mọi dịch vụ. Log, DNS cache, network manager, desktop service và server đều là process userspace, trừ phần chức năng được thực hiện trong kernel.

## UID, GID và root

Kernel phân quyền dựa trên UID/GID số gắn với process và file. Username chỉ là tên được userspace phân giải thành ID. Root (UID 0) có quyền rộng trong user mode, nhưng không chạy ở kernel mode; quyền root không phải quyền thực thi kernel code trực tiếp.

Service thường chạy dưới user riêng để giới hạn file và process mà nó có thể điều khiển. Group cho phép chia quyền giữa một tập user. Root access hữu ích cho quản trị nhưng mỗi lần dùng nên có phạm vi rõ.

## Tự kiểm tra

**Root user chạy ở kernel mode?** Không; root vẫn là process user mode với UID 0.

**Mọi tiến trình userspace có cùng quyền?** Không; UID, GID, capability, LSM và namespace tạo khác biệt.

**Kernel chỉ quản lý process?** Không; còn memory, devices, system call và nhiều tài nguyên khác.

## Đọc tiếp

Process là abstraction của một chương trình đang chạy; kernel lưu state và chọn khi nào cấp CPU.

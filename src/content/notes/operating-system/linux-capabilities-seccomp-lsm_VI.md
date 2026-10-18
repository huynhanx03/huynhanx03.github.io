---
title: "Capabilities, seccomp và Linux security modules"
category: "Operating System"
tags: ["linux", "security", "capabilities", "seccomp"]
description: "Phân biệt quyền root truyền thống với capabilities, lọc syscall bằng seccomp và kiểm soát mandatory access qua LSM."
updated: 2026-10-16
translationKey: "operating-system/linux-capabilities-seccomp-lsm"
---

Process chạy với UID 0 thường được xem như root, nhưng Linux chia một số quyền quản trị thành capabilities như `CAP_NET_ADMIN` và `CAP_SYS_ADMIN`. Container có thể bỏ nhiều capability để giảm hậu quả khi ứng dụng bị xâm nhập.

## Capabilities

Trong kernel, capabilities là thuộc tính theo thread, gồm các tập permitted, effective, inheritable, bounding và ambient. File executable có metadata capability riêng để quyết định quyền khi `exec`; file không mang toàn bộ các tập như thread. Xem [capabilities(7)](https://man7.org/linux/man-pages/man7/capabilities.7.html). Cấp capability đúng phạm vi hẹp hơn cấp root, nhưng capability rộng như `CAP_SYS_ADMIN` bao phủ nhiều thao tác nhạy cảm. `getcap` xem file capability; `capsh` hoặc `/proc/PID/status` giúp kiểm tra process.

## Seccomp

Seccomp-BPF lọc syscall theo số và đối số, có thể cho phép, trả lỗi hoặc kill process khi syscall không được duyệt. Nó giảm attack surface nhưng profile quá hẹp có thể phá ứng dụng; filter không thay permission hay namespace. BPF filter chỉ thấy giá trị đối số syscall, không đọc được chuỗi pathname qua con trỏ; vì thế không thể dùng nó như policy cho phép từng tên file. Xem [Seccomp BPF](https://docs.kernel.org/userspace-api/seccomp_filter.html).

## LSM

Linux Security Modules cung cấp framework policy mandatory access control. SELinux/AppArmor áp quy tắc bổ sung dựa trên label/profile; process được phép theo Unix mode bits vẫn có thể bị LSM từ chối. Log AVC/audit hoặc AppArmor denial cần được kiểm tra trước khi nới policy.

## Tự kiểm tra

**Container root luôn có mọi quyền root của host?** Không; namespace/capability/LSM có thể hạn chế.

**Seccomp kiểm tra pathname và quyền file tổng quát?** Không; nó lọc syscall và tham số ở mức phù hợp.

**Unix mode bits cho phép nghĩa là chắc chắn truy cập được?** Không nếu LSM hoặc mount policy từ chối.

## Đọc tiếp

Container security phối hợp user namespace, capabilities, seccomp, LSM và cgroup thay vì dựa vào một lớp.

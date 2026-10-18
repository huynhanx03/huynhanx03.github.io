---
title: "Linux desktop và in ấn: session, D-Bus và print queue"
category: "Operating System"
tags: ["linux", "desktop", "dbus", "printing"]
description: "Nhìn desktop như các dịch vụ user space phối hợp qua session bus, display server và hệ thống in."
updated: 2026-10-16
translationKey: "operating-system/linux-desktop-and-printing"
---

Desktop Linux không phải một chương trình đơn lẻ. Một phiên người dùng có display server/compositor, window manager, shell desktop, daemon nền và ứng dụng. Chúng chạy phần lớn ở user space và giao tiếp qua protocol/service.

## System bus và session bus

D-Bus cung cấp cơ chế gọi method, gửi signal và khám phá service. System bus phục vụ dịch vụ cấp máy với policy; session bus gắn với phiên người dùng và ứng dụng desktop. Có thể có nhiều session bus cho user khác nhau.

Tiến trình kết nối tới bus qua Unix domain socket và daemon trung gian chuyển message tới service/ứng dụng đăng ký quan tâm. System bus thường chạy từ lúc boot và nhận sự kiện cấp máy; session bus không bị giới hạn ở desktop: ứng dụng không có GUI cũng có thể dùng bus này. Nhiều hệ thống hiện đại dùng một user bus chung cho các phiên của cùng UID. Xem [dbus-daemon](https://dbus.freedesktop.org/doc/dbus-daemon.1.html). `dbus-monitor --system` và `dbus-monitor --session` giúp quan sát hai luồng khác nhau; không thấy message trên một bus không chứng minh sự kiện chưa xảy ra, vì service có thể dùng IPC khác hoặc message không được phát trên bus đó.

D-Bus không tự bảo đảm service đáng tin hoặc request được cấp quyền. Bus policy và service authorization quyết định ai được gọi gì. Log cần xem theo user/session.

## Display và ứng dụng

X11 và Wayland là các mô hình/protocol hiển thị khác nhau; compositor/window manager quản lý cửa sổ và kết xuất. Ứng dụng desktop có thể dùng toolkit và API khác nhau. Không nên giả định mọi desktop Linux đều cài cùng thành phần.

Đồ họa có driver kernel cùng thư viện user space; lỗi hiển thị có thể nằm ở driver, compositor, session, permissions hoặc ứng dụng. Chẩn đoán cần biết đang dùng stack nào.

## In ấn và filter pipeline

Hệ thống in nhận job, đưa vào queue, chuyển định dạng qua filter rồi gửi tới printer qua backend phù hợp. CUPS là một stack phổ biến; driverless printing và protocol mạng có thể thay đổi theo thiết bị.

Job kẹt có thể do queue, filter, backend, kết nối hoặc thiết bị; restart daemon không luôn xóa job hỏng. Kiểm tra queue/log và thử một file đơn giản giúp phân tách vấn đề.

## Tóm tắt

- Desktop là tập hợp dịch vụ user space, không phải kernel.
- D-Bus hỗ trợ IPC; system/session bus có phạm vi khác nhau.
- Display stack và driver khác giữa distro/desktop.
- In ấn đi qua queue, filter và backend; mỗi lớp có thể gây lỗi.
- Chẩn đoán cần xác định stack và session thực tế.

## Tự kiểm tra

**D-Bus là kernel driver?** Không; nó là cơ chế IPC trong user space cùng daemon/policy.

**Desktop environment có vai trò điều khiển process kernel scheduler?** Không; kernel scheduler vẫn quản lý CPU.

**Restart CUPS chắc chắn sửa mọi lỗi in?** Không; cần xác định job/filter/backend/printer.

## Đọc tiếp

Các bài Linux user space nối với topic **Virtualization & Containers**, nơi ranh giới process được mở rộng bằng namespace và cgroup.

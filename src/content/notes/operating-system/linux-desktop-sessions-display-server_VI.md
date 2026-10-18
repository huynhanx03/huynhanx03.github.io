---
title: "Linux desktop session, display server và user services"
category: "Operating System"
tags: ["linux", "desktop", "systemd", "display"]
description: "Phân biệt display manager với desktop session, hiểu X11/Wayland và các user service chạy trong phiên đăng nhập."
updated: 2026-10-16
translationKey: "operating-system/linux-desktop-sessions-display-server"
---

Desktop Linux gồm nhiều lớp. Display manager đưa màn hình đăng nhập; sau xác thực, session manager khởi chạy desktop environment; display server/protocol phối hợp hiển thị cửa sổ và input. Lỗi “màn hình đen” có thể nằm ở bất kỳ lớp nào.

## Session và display protocol

X11 dùng X server trung tâm và client kết nối qua protocol X; Wayland compositor quản lý display/input và client gửi buffer theo giao thức Wayland. Desktop environment như GNOME/KDE còn gồm panel, settings, file manager và dịch vụ khác. Display manager không phải desktop environment.

Trong Wayland, protocol không phải một desktop server duy nhất: compositor của desktop thực hiện vai trò quản lý cửa sổ/kết hợp buffer và cung cấp socket cho client. `WAYLAND_DISPLAY` thường nêu tên socket trong `XDG_RUNTIME_DIR`; `Xwayland` cho phép ứng dụng X11 cũ chạy như client tương thích trong phiên Wayland. Nhiều compositor dùng `libinput` để đọc sự kiện từ thiết bị `/dev/input/event*` rồi chuẩn hóa trước khi gửi tới ứng dụng. Vì vậy, thấy Xwayland chạy không có nghĩa toàn bộ desktop đang dùng Xorg.

Trong X11, biến `DISPLAY` chỉ display mà client kết nối tới, thường có dạng `:0`; nó không chỉ riêng một màn hình vật lý. Một tiến trình GUI cần đúng socket và quyền xác thực của session. Chạy một compositor Wayland lồng bên trong X có thể khiến ứng dụng tự chọn nhầm display, nhất là khi cả `WAYLAND_DISPLAY` lẫn `DISPLAY` còn được kế thừa; khi chẩn đoán, kiểm tra các biến môi trường trong đúng process/session.

## User systemd và environment

systemd có user manager cho mỗi user, quản lý service trong session hoặc linger mode. Các ứng dụng desktop có thể cần D-Bus session, `XDG_RUNTIME_DIR`, display socket và environment do session set. Chạy service bằng system manager nhưng thiếu environment desktop có thể khiến app không mở UI.

## Chẩn đoán

Phân biệt lỗi login, tạo session, compositor/GPU, display server và ứng dụng. Kiểm tra journal user/session, `systemctl --user --failed`, driver GPU và quyền socket. SSH headless session không nhất thiết có cùng display environment.

## Tự kiểm tra

**Display manager và compositor là một?** Không.

**Wayland là desktop environment?** Không; đó là protocol/display architecture.

**Service system-wide tự có display socket user?** Không.

## Đọc tiếp

Print service cũng là một hệ thống userspace độc lập, nhận job từ ứng dụng và chuyển qua queue tới thiết bị.

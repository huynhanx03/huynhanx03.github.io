---
title: "systemd: unit, dependency và thứ tự khởi động"
category: "Operating System"
tags: ["linux", "systemd", "init", "services"]
description: "Hiểu unit và dependency graph, phân biệt wants/requires với ordering và dùng systemctl an toàn."
updated: 2026-10-16
translationKey: "operating-system/systemd-units-and-boot"
---

systemd là một system manager phổ biến trên Linux, thường chạy làm PID 1. Nó khởi động dịch vụ, theo dõi process và quản lý nhiều tài nguyên qua các đối tượng gọi là **unit**. Không phải mọi Linux đều dùng systemd; trước khi chạy lệnh, xác định init đang hoạt động.

## Unit không chỉ là service

Unit có thể đại diện cho service, mount, socket, device, timer, target và loại tài nguyên khác. File unit khai báo cấu hình mong muốn; runtime state cho biết unit hiện active, failed hay đang chờ.

`systemctl status ssh.service` xem trạng thái service; `systemctl list-units` liệt kê unit đã nạp. Tên service khác theo distro, ví dụ sshd có thể được gọi `ssh` hoặc `sshd`.

## Dependency khác thứ tự

Trong unit file, `Wants=`/`Requires=` biểu diễn quan hệ kéo theo phụ thuộc với mức ràng buộc khác nhau; `After=`/`Before=` đặt thứ tự khởi động/dừng. Có dependency không tự nghĩa là chạy trước: cần khai báo ordering phù hợp.

systemd xây dependency graph và có thể khởi động các nhánh độc lập song song. Đây là cách boot nhanh hơn so với chuỗi script tuần tự, nhưng lỗi ở một unit không nhất thiết làm toàn máy dừng nếu dependency không yêu cầu.

## Target thay cho runlevel khái niệm

Target gom các unit để đạt trạng thái hệ thống như multi-user hoặc graphical. Target có thể kéo theo dịch vụ và mount. Tên target cụ thể tùy distro; xem `systemctl get-default` trước khi đổi default.

Enable/disable điều chỉnh việc tự khởi động qua symlink/dependency; start/stop tác động trạng thái hiện tại. `enable` không nhất thiết start ngay, và `start` không nhất thiết enable sau reboot.

## Quản trị an toàn

Trước khi thay unit: đọc `systemctl cat`, kiểm tra `status`, xem journal và hiểu dependency. Sau khi sửa drop-in/unit, chạy daemon-reload; restart service có thể làm gián đoạn kết nối. Nên có console/rollback khi chỉnh dịch vụ mạng từ xa.

Service sandboxing và resource controls có thể hạn chế quyền, nhưng một unit file tự khai báo không đảm bảo mọi lệnh bên trong an toàn. Môi trường production cần review user, capabilities, writable paths, secret handling và restart policy.

## Tóm tắt

- systemd quản lý unit và thường là PID 1 trên nhiều distro.
- Unit đại diện service, mount, timer, socket và nhiều loại tài nguyên.
- Dependency (`Wants`/`Requires`) khác ordering (`After`/`Before`).
- Enable khác start: một bên cấu hình boot, một bên trạng thái hiện tại.
- Đọc unit, log và dependency trước khi restart/đổi cấu hình.

## Tự kiểm tra

**`After=network.target` tự kéo network lên?** Không; ordering không tự tạo dependency kéo theo.

**`systemctl enable app` luôn khởi chạy app ngay?** Không nhất thiết; dùng start nếu cần trạng thái hiện tại.

**Restart service từ xa có rủi ro?** Có, nhất là service mạng; chuẩn bị cách khôi phục.

## Đọc tiếp

Service chạy dưới user và quyền cụ thể. Bài kế tiếp nói về account, group, permission và authentication.

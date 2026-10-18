---
title: "Môi trường user Linux: PATH, profile và quyền"
category: "Operating System"
tags: ["linux", "environment", "shell", "permissions"]
description: "Hiểu environment variable, PATH, shell startup files và sự khác nhau giữa môi trường tương tác với service."
updated: 2026-10-16
translationKey: "operating-system/linux-user-environment"
---

Một command chạy được trong terminal nhưng service báo “command not found” vì service thường có PATH và environment khác. Mỗi process nhận một tập environment variable từ parent khi được tạo; shell profile và service manager có thể sửa tập đó theo quy tắc riêng.

## Environment variable được kế thừa

`PATH` là danh sách directory shell tìm executable. `HOME`, `LANG`, proxy và biến ứng dụng khác ảnh hưởng hành vi chương trình. Biến environment được truyền tới process con nếu được export; biến shell thường không export tự động.

`PATH` an toàn cần directory tin cậy. Đưa `.` hoặc thư mục người lạ có quyền ghi lên trước có thể khiến chạy nhầm executable. Trong script quản trị, dùng đường dẫn tuyệt đối cho lệnh nhạy cảm hoặc đặt PATH rõ.

## Startup file phụ thuộc loại shell

Shell login, interactive, non-interactive và shell của script có thể đọc file cấu hình khác nhau. Bash và zsh cũng có quy tắc riêng. Vì vậy `.bashrc` không phải nơi được mọi process đọc.

Service systemd không mặc định chạy như shell login của user. Khai báo environment cần dùng trong unit/drop-in hoặc file cấu hình service theo đúng policy; tránh đặt secret trong file world-readable.

## User, group, umask và file mode

Process chạy với UID/GID và group bổ sung. `umask` loại bỏ một số quyền khi tạo file; nó không thêm quyền vượt mode mà chương trình yêu cầu. Thay đổi group thường cần phiên đăng nhập/process mới để credentials được cập nhật.

`sudo -u user command` giúp kiểm tra command dưới identity khác, nhưng environment có thể vẫn khác service. Kiểm tra working directory, HOME, PATH, umask và quyền trên mọi thành phần đường dẫn.

## Secret và environment

Environment tiện truyền cấu hình nhưng có thể bị lộ qua process inspection, crash dump, log hoặc công cụ quản trị tùy hệ thống. Với secret production, ưu tiên secret manager/file descriptor/mount được bảo vệ theo nền tảng; giới hạn quyền đọc và rotation.

## Tóm tắt

- Process kế thừa environment từ parent; không phải mọi biến shell đều export.
- PATH quyết định tìm executable và có rủi ro nếu chứa thư mục không tin cậy.
- Interactive shell, script và service đọc cấu hình khác nhau.
- UID/GID, umask, working directory và HOME ảnh hưởng hành vi.
- Environment không mặc định là nơi an toàn để lưu secret lâu dài.

## Tự kiểm tra

**Nếu biến có trong terminal thì systemd service cũng thấy?** Không; cần cấu hình service environment rõ ràng.

**`umask 077` cấp quyền 077 cho file mới?** Không; umask loại quyền khỏi mode yêu cầu.

**PATH có `.` luôn vô hại?** Không; executable trong thư mục hiện tại có thể bị chạy ngoài ý muốn.

## Đọc tiếp

Các công cụ build và package giúp biến source thành executable có thể triển khai.

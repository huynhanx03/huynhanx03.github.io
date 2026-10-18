---
title: "Shell startup và quản lý dotfiles"
category: "Operating System"
tags: ["linux", "shell", "environment"]
description: "Tách cấu hình login, interactive và noninteractive để tránh shell startup chậm hoặc service phụ thuộc dotfile."
updated: 2026-10-16
translationKey: "operating-system/linux-shell-startup-and-dotfiles"
---

Shell có nhiều chế độ chạy và mỗi chế độ đọc tập file khởi tạo khác nhau. Cấu hình đặt sai file có thể khiến biến không tồn tại trong SSH, terminal, cron hoặc script, hoặc làm shell noninteractive bị chậm vì chạy prompt/plugin.

## Bash startup

Bash login shell đọc một trong các profile files như `.bash_profile` hoặc `.profile`; interactive non-login shell thường đọc `.bashrc`. Noninteractive Bash có cơ chế riêng như `BASH_ENV` nếu được đặt. Zsh dùng file khác (`.zshenv`, `.zprofile`, `.zshrc`, `.zlogin`) và có thứ tự riêng.

Với Bash, shell login chạy `/etc/profile`, rồi chỉ chạy file đầu tiên tồn tại và đọc được trong nhóm `.bash_profile`, `.bash_login`, `.profile`. Interactive non-login Bash đọc `.bashrc`; một số distro thêm file cấu hình hệ thống, nhưng đó không phải bước bắt buộc chung của Bash. Xem [Bash startup files](https://www.gnu.org/software/bash/manual/html_node/Bash-Startup-Files). Vì đăng nhập đồ họa, terminal và SSH có thể khởi tạo shell khác nhau tùy distro/cấu hình, cần kiểm tra trong đúng cách đăng nhập mà người dùng thực sự sử dụng. Nếu muốn dùng chung cấu hình, profile có thể source `.bashrc`, nhưng phần prompt/alias phải được chặn khỏi shell không tương tác.

## Chia cấu hình

Đặt environment chung cần cho login vào profile; alias, prompt và completion chỉ cho interactive shell. Không in text/banner từ startup file khi shell dùng protocol/script; output thừa có thể phá rsync/SSH automation. Profile nên chạy nhanh, idempotent và không sửa trạng thái toàn hệ thống.

## Dotfiles có thể quản lý thế nào?

Symlink hoặc version control giúp đồng bộ cấu hình, nhưng tránh commit secret, token, host-specific path và dữ liệu runtime. Tạo backup trước khi thay file hiện tại; dùng include theo máy hoặc điều kiện rõ ràng cho khác biệt môi trường.

Giữ startup file ngắn, dễ đọc và chỉ thêm cấu hình phục vụ nhu cầu thật. Ưu tiên `~/bin` hoặc `~/.local/bin` cho lệnh riêng; không thêm `.` vào `PATH`, vì khi đó một file trùng tên trong thư mục hiện tại có thể bị chạy thay cho lệnh tin cậy. Không cần tự đặt `MANPATH` nếu việc đó làm mất các đường dẫn mặc định hệ thống. Khi thiết kế file mặc định cho nhiều user, thử bằng tài khoản mới với home sạch và kiểm tra cả login, SSH, terminal đồ họa lẫn shell chạy script.

## Tự kiểm tra

**`~/.bashrc` luôn chạy cho mọi Bash process?** Không.

**Alias trong interactive shell luôn có trong script?** Không.

**Dotfiles an toàn để public nguyên trạng?** Không nếu chứa thông tin nhạy cảm.

## Đọc tiếp

Environment process được truyền qua `exec`; systemd service cần khai báo môi trường riêng thay vì phụ thuộc shell profile.

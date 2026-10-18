---
title: "Environment, login shell và file khởi tạo"
category: "Operating System"
tags: ["linux", "shell", "environment"]
description: "Biết process nhận environment từ đâu, PATH hoạt động thế nào và vì sao terminal tương tác khác service."
updated: 2026-10-16
translationKey: "operating-system/environment-login-shell-profile"
---

Environment là tập cặp tên–giá trị được process kế thừa khi tạo process con. Nó truyền cấu hình như `PATH`, `HOME`, locale và proxy, nhưng mỗi process nhận một bản môi trường riêng; đổi trong shell hiện tại không tự sửa môi trường của process đã chạy.

## `PATH` và tìm chương trình

Khi gọi lệnh không có dấu `/`, shell tìm executable trong các thư mục của `PATH` theo thứ tự. `command -v tool` cho biết shell sẽ chọn gì; `which` có thể là chương trình riêng và không phải lúc nào cũng phản ánh alias/function. Thêm thư mục không tin cậy vào đầu `PATH` có thể khiến binary giả được chạy trước.

`export NAME=value` đưa biến vào environment của lệnh con. Gán `NAME=value command` chỉ áp dụng cho process được gọi. `env` xem hoặc dựng environment; `env -i` khởi chạy với môi trường sạch để tái hiện lỗi phụ thuộc biến ẩn.

## Login, interactive và noninteractive

Shell login có thể đọc file profile; shell tương tác đọc file cấu hình tương tác; chi tiết tên và thứ tự phụ thuộc shell. Bash thường phân biệt `.bash_profile`/`.profile` với `.bashrc`. Một terminal emulator, SSH login, cron job và systemd service có thể khởi chạy shell theo cách khác nhau.

Vì thế, lệnh chạy trong terminal nhưng thất bại khi là service thường liên quan `PATH`, `HOME`, quyền, working directory, locale hoặc thiếu TTY. Unit nên khai báo rõ `Environment=`, `EnvironmentFile=`, `WorkingDirectory=` và đường dẫn executable khi cần.

## Bí mật và chẩn đoán

Environment tiện cấu hình nhưng không phải kho bí mật hoàn hảo: có thể bị lộ qua dump, log hoặc quyền quan sát process tùy hệ thống. Không in toàn bộ environment khi chia sẻ log. Với secret quan trọng, dùng cơ chế secret phù hợp và giới hạn quyền.

Để so sánh môi trường, dùng `env | sort` cẩn thận, `printf '%s\n' "$PATH"`, `pwd`, `id` và kiểm tra cách process được khởi chạy. Đừng thêm `export` toàn cục vào mọi profile chỉ để chữa một service.

## Tự kiểm tra

**Process con đổi `PATH` có đổi `PATH` của cha không?** Không.

**Cron chắc chắn đọc `.bashrc`?** Không.

**`PATH` chỉ ảnh hưởng shell?** Nó thường được truyền cho chương trình con và thư viện có thể dùng để tìm executable.

## Đọc tiếp

Khi build phần mềm, environment, compiler, linker và đường dẫn thư viện cùng quyết định chương trình nào được tạo và chạy.

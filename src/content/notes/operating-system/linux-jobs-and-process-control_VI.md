---
title: "Process và job control trong shell"
category: "Operating System"
tags: ["linux", "process", "job control", "signals"]
description: "Phân biệt shell job với process, quản lý foreground/background và gửi signal có chủ đích."
updated: 2026-10-16
translationKey: "operating-system/linux-jobs-and-process-control"
---

Một lệnh chạy từ shell tạo process, nhưng shell còn quản lý khái niệm **job** để điều khiển pipeline/nhóm process trong phiên terminal. Job control cho phép tạm dừng việc foreground, đưa nó ra background rồi tiếp tục.

## Foreground và background

Thêm `&` thường yêu cầu shell khởi chạy job ở background; terminal prompt có thể trở lại trước khi job xong. `jobs` liệt kê job trong shell hiện tại; `fg` đưa job về foreground; `bg` tiếp tục job đang stop ở background.

Background process vẫn có thể bị dừng nếu cố đọc terminal mà không được điều khiển phù hợp. Đóng terminal có thể gửi signal tới process/session tùy shell và cấu hình; `nohup`, terminal multiplexer hoặc service manager giải quyết các nhu cầu khác nhau.

## Signal

`SIGTERM` yêu cầu process kết thúc và cho nó cơ hội cleanup; `SIGKILL` kernel áp đặt chấm dứt, không thể bị bắt/hoãn. Dùng `kill PID` mặc định thường gửi TERM; kiểm tra PID/cmdline trước khi gửi. Tín hiệu cũng có thể được gửi nhầm khi PID tái sử dụng.

Process có thể có child; shell thường chờ và thu nhận trạng thái. Zombie là child đã kết thúc nhưng chưa được parent wait; dùng `kill -9` lên zombie không có ích vì nó không chạy nữa.

## Exit status và pipeline

`$?` giữ status của lệnh gần nhất trong shell. Trong pipeline, mặc định status có thể phản ánh lệnh cuối; `set -o pipefail` trong Bash làm pipeline thất bại nếu một phần thất bại. Script cần lưu status trước khi chạy lệnh khác nếu sẽ dùng sau.

## Tóm tắt

- Job là đơn vị shell quản lý cho process/pipeline trong phiên terminal.
- `&`, `jobs`, `fg`, `bg` điều khiển foreground/background.
- TERM cho cơ hội cleanup; KILL chấm dứt cưỡng bức.
- Kiểm tra process trước khi gửi signal; zombie cần được parent thu nhận.
- Exit status pipeline phụ thuộc shell configuration.

## Tự kiểm tra

**Background job luôn sống sau khi đóng terminal?** Không đảm bảo.

**`kill -9` là cách đầu tiên nên dùng?** Không; ưu tiên shutdown sạch qua TERM/service manager.

**Zombie dùng CPU?** Không theo nghĩa process đang chạy; nó giữ trạng thái chờ parent thu nhận.

## Đọc tiếp

Khi nhiều lệnh cần trao đổi dữ liệu, dùng pipeline; với luồng phức tạp hãy ghi rõ status và error stream.

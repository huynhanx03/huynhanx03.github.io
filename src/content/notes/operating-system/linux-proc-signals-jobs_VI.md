---
title: "Quản lý process: ps, signals, jobs và wait"
category: "Operating System"
tags: ["linux", "process", "shell"]
description: "Dùng ps, kill, jobs, fg/bg và wait để điều khiển process; phân biệt gửi signal với đảm bảo process đã dừng."
updated: 2026-10-16
translationKey: "operating-system/linux-proc-signals-jobs"
---

Shell tạo job khi chạy pipeline/lệnh, còn kernel quản lý process và thread. Job control giúp một shell tương tác đưa job vào foreground/background, nhưng service hoặc script không tương tác thường cần cách quản lý vòng đời khác.

## Quan sát process

`ps -ef` hoặc `ps aux` liệt kê process theo định dạng phổ biến; `pgrep -a name` tìm theo tên; `/proc/PID` cung cấp thông tin kernel. `pstree` cho quan hệ cha-con. Process có thể thoát ngay sau lúc truy vấn, nên PID cũ có thể được tái sử dụng.

## Signal và kill

`kill PID` mặc định gửi SIGTERM, yêu cầu process kết thúc có cleanup. SIGKILL buộc kernel chấm dứt task mà process không thể xử lý, nhưng không chạy cleanup trong ứng dụng. Gửi signal thành công chỉ nghĩa kernel chấp nhận yêu cầu, không khẳng định process đã thoát; kiểm tra lại bằng `ps` hoặc `wait`.

Ưu tiên nhắm PID hoặc process group đã xác nhận. Pattern rộng như `pkill` có thể tác động process ngoài ý muốn.

## Job control và wait

Ctrl-Z gửi SIGTSTP cho foreground job; `bg` tiếp tục background, `fg` đưa lại foreground. `&` chạy lệnh nền nhưng shell vẫn có thể gửi SIGHUP khi đóng session, tùy cấu hình. `wait PID` trong shell script thu trạng thái kết thúc child; cần kiểm tra exit code.

## Tự kiểm tra

**`kill` luôn giết process?** Không; nó gửi signal.

**Background job tự thành daemon ổn định?** Không.

**SIGKILL cho ứng dụng cơ hội flush dữ liệu?** Không.

## Đọc tiếp

Service manager như systemd theo dõi process group/cgroup và khởi động lại theo policy.

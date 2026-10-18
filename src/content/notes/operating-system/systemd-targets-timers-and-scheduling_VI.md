---
title: "systemd target, timer và lịch công việc"
category: "Operating System"
tags: ["linux", "systemd", "cron"]
description: "So sánh target với runlevel, systemd timer với cron và cách điều tra job định kỳ bị bỏ lỡ."
updated: 2026-10-16
translationKey: "operating-system/systemd-targets-timers-and-scheduling"
---

systemd target gom unit để mô tả trạng thái mong muốn của máy, gần vai trò runlevel trong init cũ. `multi-user.target` thường đại diện hệ thống đa người dùng không giao diện đồ họa; `graphical.target` kéo thêm desktop stack. Target không phải service daemon.

## Timer thay cho cron ở đâu?

Cron chạy lệnh theo lịch đơn giản. systemd timer kích hoạt service unit và thừa hưởng logging, dependency, sandboxing, resource limits cùng trạng thái service. `OnCalendar=` mô tả thời gian tường minh; `OnUnitActiveSec=` chạy tương đối với lần service hoạt động.

`Persistent=true` có thể chạy job bị lỡ khi máy tắt, tùy timer loại calendar. Job định kỳ cần idempotent để chạy lại không gây hỏng dữ liệu. Với thời gian phụ thuộc network, cần hiểu target và điều kiện online; network-online target không đồng nghĩa Internet endpoint đã sẵn sàng.

## Chẩn đoán

`systemctl list-timers --all` xem lần chạy trước/kế tiếp; `systemctl status job.timer job.service` kiểm tra state; `journalctl -u job.service` xem output/error. Kiểm tra timezone, calendar expression, quyền, working directory và environment.

## Tự kiểm tra

**Target là một process?** Không; đó là unit gom quan hệ.

**Cron job và systemd timer có cùng environment interactive?** Không.

**Timer gọi service phải chạy cùng tên?** Theo mặc định thường có cùng basename, nhưng có thể cấu hình unit khác.

## Đọc tiếp

Environment service và quyền user giải thích vì sao job chạy tay nhưng thất bại theo lịch.

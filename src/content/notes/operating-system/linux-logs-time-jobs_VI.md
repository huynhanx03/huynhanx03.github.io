---
title: "Log, thời gian và tác vụ định kỳ trên Linux"
category: "Operating System"
tags: ["linux", "logging", "cron", "systemd timer"]
description: "Tìm log qua journal/syslog, phân biệt clock với timezone và chọn cron, timer hoặc one-shot job."
updated: 2026-10-16
translationKey: "operating-system/linux-logs-time-jobs"
---

Khi service lỗi, log giúp dựng lại sự kiện; nhưng timestamp sai hoặc log bị xoay/xóa có thể làm chẩn đoán khó. Linux có nhiều nguồn log, clock và scheduler tác vụ; cần hiểu chúng theo mục đích thay vì tìm mọi thứ trong một file duy nhất.

## Journal và log file

systemd-journald có thể nhận log từ kernel, service và session; `journalctl` lọc theo unit, boot và thời gian. Một số hệ thống chuyển tiếp log sang rsyslog hoặc ghi file dưới `/var/log`. Cấu hình lưu persistent hay chỉ volatile tùy distro.

Log rotation chia file lớn thành các bản nhỏ, nén hoặc xóa theo retention policy. Khi service đang ghi file đã rename, cần cơ chế reopen/logrotate phù hợp để không tiếp tục ghi vào file cũ đã bị unlink.

Log nên ghi thời điểm, mức độ, request/correlation ID và thông tin cần điều tra, nhưng không ghi secret/token hoặc dữ liệu nhạy cảm tùy tiện.

## Wall clock, monotonic clock và timezone

Wall clock thể hiện ngày giờ dân dụng, có thể được chỉnh bởi NTP hoặc admin. Monotonic clock phù hợp đo khoảng thời gian vì không lùi theo chỉnh timezone/clock. Timezone chỉ đổi cách diễn giải/hiển thị giờ; lưu timestamp UTC thường giúp trao đổi giữa hệ thống.

Đồng bộ NTP giảm lệch đồng hồ nhưng không làm mọi máy có thời gian tuyệt đối chính xác. Hệ phân tán cần chịu sai số clock và không dùng timestamp đơn độc để chứng minh thứ tự nhân quả.

## Cron, systemd timer và at

Cron phù hợp lịch lặp đơn giản; systemd timer có thể liên kết với service unit, hỗ trợ dependency, trạng thái và journal. `at` chạy một lần vào thời điểm sau. Một tác vụ định kỳ cần xử lý trường hợp chạy trùng, chạy muộn, môi trường PATH khác shell tương tác và lỗi không có terminal.

Nếu job chạy lâu hơn chu kỳ, cần tránh hai instance chồng lấp hoặc thiết kế idempotent. Lịch kiểu “mỗi giờ” khác “sau mỗi giờ kể từ lần chạy trước”; timezone và giờ mùa hè có thể ảnh hưởng cron.

## Tóm tắt

- Log có thể ở journal hoặc file, tùy cấu hình distro.
- Rotation và retention quyết định log còn truy cập được bao lâu.
- Wall clock phục vụ timestamp; monotonic clock đo khoảng thời gian.
- NTP giảm lệch chứ không tạo đồng hồ hoàn hảo.
- Cron, timer và at có semantics khác; tác vụ cần môi trường và retry rõ.

## Tự kiểm tra

**`journalctl` luôn có log từ lần boot trước?** Chỉ khi journal được lưu persistent/cấu hình phù hợp.

**NTP làm timestamp mọi máy giống nhau chính xác tuyệt đối?** Không; vẫn có sai số và độ trễ cập nhật.

**Cron job chạy trong đúng môi trường shell đăng nhập của bạn?** Không; thường environment tối giản.

## Đọc tiếp

Topic **Processes & Scheduling** đã nói scheduler CPU; Linux còn cung cấp công cụ để quan sát process và giới hạn tài nguyên.

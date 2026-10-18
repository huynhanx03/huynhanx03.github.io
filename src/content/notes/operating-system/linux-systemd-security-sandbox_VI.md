---
title: "Sandbox service bằng systemd"
category: "Operating System"
tags: ["linux", "systemd", "security"]
description: "Dùng systemd hardening options để giới hạn filesystem, syscall, capability và quyền service theo nguyên tắc tối thiểu."
updated: 2026-10-16
translationKey: "operating-system/linux-systemd-security-sandbox"
---

Systemd có thể áp một số ranh giới bảo mật cho service mà không cần tự viết sandbox. Các option giới hạn filesystem, capability, syscall và namespace giúp giảm tác động khi process bị khai thác, nhưng có thể phá ứng dụng nếu thiếu quyền cần thiết.

## Một số nhóm giới hạn

`NoNewPrivileges=true` ngăn process nhận thêm privilege qua exec trong nhiều trường hợp. `ProtectSystem=` và `ReadWritePaths=` điều chỉnh mount view; `PrivateTmp=` cô lập thư mục tạm; `ProtectHome=` giới hạn truy cập home. `CapabilityBoundingSet=` bỏ capability không cần; `SystemCallFilter=` giới hạn syscall.

## Triển khai an toàn

Bắt đầu bằng service chạy đúng chức năng và xác định file/path/network/syscall thực sự cần. Áp từng giới hạn, kiểm tra `systemd-analyze security`, log denial và regression của service. Công cụ báo mức exposure: số thấp hơn thể hiện nhiều biện pháp cô lập được bật hơn, không phải điểm chứng nhận an toàn. Nó không phân tích toàn bộ code hay nghiệp vụ của service. Xem [systemd-analyze security](https://github.com/systemd/systemd/blob/main/man/systemd-analyze.xml).

Không bật một bộ hardening mù cho mọi service: database, network daemon và desktop app có nhu cầu khác nhau. Ghi cấu hình override, giữ khả năng rollback và đo ảnh hưởng.

## Tự kiểm tra

**Exposure thấp trong `systemd-analyze security` chứng minh không có lỗ hổng?** Không; nó chỉ đánh giá một tập tùy chọn cô lập.

**Sandbox thay thế cập nhật phần mềm?** Không.

**`ReadOnlyPaths` làm file đó không thể sửa bằng mọi đường?** Giới hạn áp theo mount view của service; host/root và namespace khác có thể còn đường.

## Đọc tiếp

Capabilities, seccomp và LSM là các lớp khác nhau có thể phối hợp với service sandbox.

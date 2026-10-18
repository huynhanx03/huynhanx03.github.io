---
title: "Rescue mode, emergency mode và boot target"
category: "Operating System"
tags: ["linux", "systemd", "boot"]
description: "Phân biệt rescue với emergency mode, chọn target phục hồi và điều tra máy boot không tới multi-user."
updated: 2026-10-16
translationKey: "operating-system/linux-boot-targets-rescue-emergency"
---

Khi boot lỗi, systemd có thể đưa máy vào target phục hồi thay vì trạng thái thông thường. `rescue.target` cung cấp môi trường bảo trì tối thiểu với một số filesystem/service; `emergency.target` tối giản hơn, thường dùng khi mount nền tảng thất bại. Chi tiết phụ thuộc bản phân phối.

## Boot target và kernel parameter

GRUB có thể truyền `systemd.unit=rescue.target` hoặc `emergency.target` để thử boot vào chế độ sửa chữa. Target mặc định xem bằng `systemctl get-default`; dependency tree và unit failed giúp xác định điểm dừng. Single-user không luôn đồng nghĩa cùng một cấu hình giữa distro.

## Sửa lỗi an toàn

Kiểm tra root filesystem đã mount read-only hay read-write, xác minh UUID/fstab, journal, unit failed và disk space. Nếu cần sửa file hệ thống, mount read-write có chủ đích và backup trước thay đổi. Với lỗi mật khẩu/root, dùng console hoặc live recovery được phép; bảo vệ dữ liệu và mã hóa vẫn áp dụng.

## Tự kiểm tra

**Emergency mode là kernel panic?** Không; kernel đã chạy và userspace phục hồi được khởi động.

**Rescue target có đầy đủ mọi service?** Không.

**Đổi default target sửa lỗi filesystem?** Không.

## Đọc tiếp

Log boot và systemd dependency giúp tìm service/mount nào ngăn máy vào target mong muốn.

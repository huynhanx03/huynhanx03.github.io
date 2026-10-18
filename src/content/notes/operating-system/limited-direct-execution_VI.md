---
title: "Limited direct execution: chạy nhanh nhưng vẫn giữ quyền kiểm soát"
category: "Operating System"
tags: ["operating system", "cpu virtualization", "trap", "kernel"]
description: "Giải thích vì sao user code chạy trực tiếp trên CPU, còn system call và timer giữ lại quyền của kernel."
updated: 2026-10-16
translationKey: "operating-system/limited-direct-execution"
---

Nếu kernel mô phỏng từng lệnh user bằng phần mềm, chương trình sẽ chậm. Nhưng nếu để chương trình chạy CPU với mọi quyền, nó có thể chiếm CPU mãi hoặc sửa trạng thái hệ thống. **Limited direct execution** giải quyết bằng cách cho user code chạy trực tiếp ở user mode, đồng thời đặt các cổng kiểm soát mà CPU/kernel có thể dùng khi cần.

## User mode và kernel mode

CPU hỗ trợ mức quyền. Lệnh user thông thường chạy nhanh trực tiếp; lệnh đặc quyền như thay page table hoặc điều khiển thiết bị bị chặn. Kernel thiết lập điểm vào trap/exception an toàn trước khi chuyển CPU sang user mode.

Khi app cần dịch vụ, nó thực hiện system call; CPU chuyển vào kernel qua entry đã cấu hình. Kernel xác minh request, thực thi và return qua cơ chế đặc quyền. User code không tự chọn địa chỉ tùy ý để nhảy vào routine kernel.

## Trap table và trách nhiệm phân chia

Khi boot, kernel đăng ký handler cho system call, exception và interrupt. CPU dùng vector/ID phù hợp để vào handler. Kernel phải xác thực source và state; phần cứng chỉ cung cấp primitive chuyển quyền, không tự biết policy file permission hay process ownership.

## Timer interrupt thu hồi CPU

Nếu user process không gọi system call và chạy vòng lặp vô hạn, kernel cần cách lấy lại CPU. Timer interrupt định kỳ đưa điều khiển về kernel; scheduler có thể preempt process và chạy task khác. Nếu timer không hoạt động hoặc bị che sai, một task có thể làm hệ thống mất responsiveness.

Timer cũng tạo overhead và độ phân giải giới hạn; scheduler hiện đại dùng tickless/timer mechanisms phức tạp hơn mô hình một tick cố định.

## Tạo process an toàn

Kernel tạo address space, thiết lập stack/register ban đầu, đặt entry point và quyền cần thiết, rồi đưa process vào ready queue. Khi context switch, kernel lưu trạng thái process cũ và phục hồi trạng thái process mới; các cấu trúc/page table cập nhật theo cơ chế CPU.

## Tóm tắt

- User code chạy trực tiếp trên CPU để đạt hiệu năng.
- CPU privilege ngăn user thực hiện thao tác kernel-only.
- System call/trap là lối vào kernel được kiểm soát.
- Timer interrupt cho kernel cơ hội preempt task chiếm CPU.
- Phần cứng tạo cơ chế; kernel thực thi policy và kiểm tra quyền.

## Tự kiểm tra

**Kernel mô phỏng từng lệnh user?** Thường không; user chạy trực tiếp với quyền hạn giới hạn.

**System call là nhảy hàm thường?** Không; CPU chuyển privilege qua cơ chế đặc biệt.

**Process tự nhường CPU là cách duy nhất scheduler đổi task?** Không; timer interrupt hỗ trợ preemption.

## Đọc tiếp

Scheduler dùng các queue/weight để phân phối CPU; lottery scheduling là một mô hình chia tỷ lệ.

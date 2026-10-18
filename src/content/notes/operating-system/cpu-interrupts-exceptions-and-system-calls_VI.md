---
title: "Interrupt, exception và system call"
category: "Operating System"
tags: ["computer-architecture", "kernel", "interrupt"]
description: "Phân biệt interrupt từ thiết bị, exception do instruction và system call có chủ đích; theo dõi đường vào kernel."
updated: 2026-10-16
translationKey: "operating-system/cpu-interrupts-exceptions-and-system-calls"
---

CPU cần chuyển quyền điều khiển tới kernel khi thiết bị cần phục vụ, instruction gây lỗi hoặc chương trình yêu cầu dịch vụ hệ điều hành. Các sự kiện này không giống nhau dù đều có thể đưa CPU vào handler ở privilege cao hơn.

## Interrupt từ thiết bị

Interrupt bất đồng bộ báo sự kiện như hoàn tất I/O hoặc timer tick. CPU lưu trạng thái cần thiết, tra vector/handler và chạy kernel code. Kernel xác nhận sự kiện, cập nhật cấu trúc dữ liệu, có thể đánh thức task chờ rồi quay lại hoặc lập lịch task khác.

## Exception đồng bộ

Exception gắn với instruction đang thực thi: chia cho zero, page fault hoặc instruction không hợp lệ. Một số exception có thể phục hồi (page fault sau khi kernel nạp trang); một số được chuyển thành signal/exception của process. Synchronous fault lặp lại nếu kernel quay về mà không sửa nguyên nhân.

## System call

System call là yêu cầu có chủ đích từ userspace, ví dụ `read`, `write`, `open` hoặc `fork`. ISA cung cấp instruction/entry mechanism để vào kernel mode. Kernel kiểm tra pointer, quyền, tham số và trạng thái process trước thao tác; user pointer không thể được tin như memory kernel.

System call có thể trả lỗi thay vì hoàn tất, và một số có thể bị interrupt hoặc trả partial result. Library wrapper thường chuyển mã lỗi kernel thành quy ước API ngôn ngữ.

## Tự kiểm tra

**Page fault luôn là bug?** Không; demand paging tạo fault bình thường.

**System call và function call cùng privilege?** Thường system call chuyển privilege sang kernel.

**Device interrupt đồng bộ với instruction hiện tại?** Không; nó có thể đến bất kỳ lúc phù hợp nào.

## Đọc tiếp

Context switch có thể xảy ra sau khi xử lý interrupt hoặc system call, nhưng không phải mọi lần vào kernel đều đổi task.

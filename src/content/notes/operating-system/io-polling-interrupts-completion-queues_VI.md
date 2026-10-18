---
title: "Polling, interrupt và completion queue"
category: "Operating System"
tags: ["operating-system", "io", "interrupt"]
description: "So sánh polling với interrupt-driven I/O và hiểu completion queue giúp thiết bị xử lý nhiều request bất đồng bộ."
updated: 2026-10-16
translationKey: "operating-system/io-polling-interrupts-completion-queues"
---

Thiết bị báo hoàn tất I/O bằng interrupt hoặc để CPU kiểm tra trạng thái qua polling. Interrupt giảm việc CPU hỏi liên tục khi sự kiện thưa; polling tránh chi phí interrupt khi tải cao và latency rất nhạy. Hệ thống hiện đại thường kết hợp hai cách.

## Interrupt-driven I/O

Driver gửi request rồi thread có thể block. Khi thiết bị hoàn tất, interrupt handler xác nhận sự kiện và đánh thức waiter hoặc xử lý phần còn lại. Interrupt storm hoặc handler làm quá nhiều việc có thể chiếm CPU; deferred work xử lý phần không cần chạy ngay trong hard interrupt context.

## Polling và batching

Polling kiểm tra completion queue định kỳ hoặc liên tục. Khi queue dày, một lần kiểm tra có thể thu nhiều completion và giảm interrupt overhead. Khi tải thấp, polling liên tục lãng phí CPU; adaptive polling thay đổi hành vi theo tải.

## Async I/O

Completion queue cho phép nhiều request outstanding, mỗi request có ID và completion riêng. Ứng dụng/driver phải xử lý thứ tự hoàn tất khác thứ tự submit, timeout, cancel và buffer lifetime. Queue depth tăng parallelism nhưng cũng có thể tăng latency.

## Tự kiểm tra

**Interrupt luôn tốt hơn polling?** Không.

**I/O async bảo đảm completion theo thứ tự gửi?** Không trừ khi API/thiết bị quy định.

**Request cancel nghĩa thiết bị chắc chắn chưa ghi dữ liệu?** Không nhất thiết.

## Đọc tiếp

NVMe tận dụng nhiều submission/completion queue để khai thác parallelism của flash storage.

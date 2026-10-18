---
title: "Pattern đồng bộ: barrier, producer-consumer và rendezvous"
category: "Operating System"
tags: ["concurrency", "barrier", "producer consumer", "synchronization"]
description: "Dùng barrier để đồng bộ phase và phối hợp producer/consumer qua queue có backpressure."
updated: 2026-10-16
translationKey: "operating-system/concurrency-barrier-patterns"
---

Primitive như mutex/semaphore là công cụ; pattern mô tả cách nhiều thread dùng chúng để đạt mục tiêu. Dùng pattern quen thuộc giúp reasoning, nhưng vẫn cần kiểm tra đúng số producer/consumer, shutdown và lỗi.

## Producer-consumer bounded buffer

Queue có capacity N. Producer đợi khi queue đầy; consumer đợi khi queue rỗng. Mutex bảo vệ head/tail; condition variable dùng predicate `not_empty` và `not_full`, hoặc hai semaphore đếm slot/items. Queue bounded tạo backpressure thay vì để memory phình vô hạn.

Shutdown cần sentinel/cancellation hoặc trạng thái closed; waiter phải được đánh thức để thoát. Nếu producer lỗi mà không báo consumer, hệ thống có thể chờ mãi.

## Barrier

Barrier chia computation thành phase. Mỗi thread làm phần của phase hiện tại rồi đợi tới khi đủ N thread tới barrier; sau đó tất cả sang phase kế. Nếu một thread fail/return trước barrier, các thread khác có thể deadlock; API barrier cần cancellation/break semantics hoặc coordinator đảm bảo mọi bên tới.

Barrier đồng bộ điểm, không tự bảo vệ dữ liệu trong suốt phase. Writes trước barrier có thể được publish theo API; sau barrier vẫn cần quy tắc khi nhiều thread ghi.

## Rendezvous và pipeline

Rendezvous buộc hai bên gặp nhau để trao đổi giá trị hoặc xác nhận bước. Pipeline chia computation thành stages nối bằng queue; mỗi stage có concurrency riêng. Queue capacity điều khiển backpressure và memory use; stage chậm làm upstream queue đầy.

## Tóm tắt

- Bounded queue phối hợp producer/consumer và giới hạn memory.
- Shutdown là một phần giao thức, không chỉ đóng channel/queue tùy tiện.
- Barrier đồng bộ phase nhưng cần xử lý thread không tới.
- Pipeline có thể tăng throughput nhưng stage bottleneck giới hạn toàn hệ.
- Primitive cần gắn với predicate và lifecycle rõ.

## Tự kiểm tra

**Semaphore `items` bảo vệ queue pointers?** Không; cần mutex hoặc queue implementation concurrent.

**Barrier làm thread nào cũng hoàn thành cùng lúc?** Không; nó chỉ ngăn qua phase cho tới khi đủ participant.

**Queue lớn hơn luôn tăng throughput?** Không; nó có thể tăng latency và che downstream overload.

## Đọc tiếp

Event loop và worker pool kết hợp pattern queue/consumer ở mức ứng dụng.

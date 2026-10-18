---
title: "Cài đặt lock: spin, yield và ngủ chờ"
category: "Operating System"
tags: ["concurrency", "mutex", "spinlock", "futex"]
description: "So sánh test-and-set spinlock, yield, queue lock và mutex ngủ khi critical section ngắn hoặc dài."
updated: 2026-10-16
translationKey: "operating-system/lock-implementation-spin-wait"
---

Mutex API nói cách dùng; implementation quyết định thread chờ ra sao. Một lựa chọn là **spin**: lặp thử lock liên tục. Lựa chọn khác là block thread và để scheduler chạy task khác. Mỗi cách phù hợp workload khác nhau.

## Test-and-set spinlock

Atomic test-and-set đọc và đặt lock bit trong một thao tác. Thread thắng vào critical section; các thread khác quay vòng thử. Spin tránh syscall/sleep-wakeup nếu lock được nhả rất nhanh, nhưng tiêu CPU và gây cache-line ping-pong khi contention.

Một cặp lệnh đọc rồi ghi cờ bình thường không đủ để làm lock: hai thread có thể cùng đọc `0`, cùng chuyển sang `1`, rồi cùng vào critical section. Tắt interrupt cũng chỉ phù hợp một số đoạn kernel trên một CPU; user process không thể được quyền tắt interrupt tùy ý, cách này không khóa CPU khác trên máy đa lõi và có thể làm mất độ trễ xử lý interrupt. Cần thao tác read-modify-write atomic như test-and-set, compare-and-swap, load-linked/store-conditional hoặc fetch-add.

Test-and-set/CAS spinlock bảo đảm loại trừ tương hỗ nhưng không tự đảm bảo fairness; một waiter có thể thua mãi. Ticket lock dùng `fetch_add` cấp số thứ tự, mỗi thread chờ tới lượt mình, nên có tiến triển FIFO tốt hơn, đổi lại tất cả waiter vẫn spin trên biến lượt.

Trên một CPU đơn lõi, thread đang spin có thể ngăn owner chạy để nhả lock nếu scheduler không preempt phù hợp. Vì vậy spinlock thường chỉ hợp kernel/short critical section với giả định scheduler cụ thể.

## Yield và queue

Yield nhường CPU nhưng thread có thể được schedule lại ngay, tạo nhiều lần chuyển context mà không giải quyết contention. Ticket/queue lock cho thứ tự chờ công bằng hơn và giảm starvation, nhưng cần atomic/cache traffic.

Queue lock ngủ/đánh thức cần tránh race giữa “đưa mình vào queue và chuẩn bị ngủ” với “owner nhả lock và đánh thức waiter”. Nếu wakeup xảy ra ngay trước khi waiter thực sự park, waiter không được ngủ vĩnh viễn. Kernel API có thể cung cấp giao thức như `setpark`/`park`; futex wait kiểm tra giá trị hiện tại vẫn bằng expected trước khi ngủ, nhờ đó tránh ngủ dựa trên trạng thái đã đổi. Khi unlock, mutex có thể chuyển quyền trực tiếp cho waiter kế tiếp thay vì mở cờ rồi để mọi thread tranh lại.

## Mutex ngủ và futex

Mutex user-space có thể dùng fast path bằng atomic nếu lock rảnh; chỉ khi contention mới gọi kernel primitive như futex để sleep/wake. Như vậy thao tác uncontended tránh syscall, còn thread chờ dài không đốt CPU.

Chi tiết futex là Linux-specific; runtime/OS khác có cơ chế riêng. Priority inversion cũng cần xét: thread ưu tiên cao chờ lock của thread thấp có thể cần priority inheritance theo policy.

## Adaptive spin

Một mutex có thể spin ngắn rồi sleep nếu owner có khả năng sớm nhả. Tham số phụ thuộc CPU count, owner scheduling, critical section và contention. Không có threshold phổ quát.

### Bài thực hành: kiểm tra interleaving và chi phí chờ

Trong simulator hoặc trace lệnh, thử theo thứ tự: cờ đọc/ghi không atomic, test-and-set, Peterson cho hai thread, ticket lock, spin-then-yield và test-and-test-and-set. Với mỗi thuật toán, chủ động đặt lịch ngắt ở giữa các lệnh acquire/release; kiểm tra riêng **mutual exclusion**, **progress/deadlock** và **fairness** — đây là các thuộc tính khác nhau. Sau khi kiểm tra đúng/sai, tăng số vòng trong critical section và số thread, rồi đếm lệnh spin, yield hoặc lượt thử atomic. Một thuật toán cho kết quả đúng trong vài trace chưa chứng minh nó đúng với mọi lịch; simulator cũng chỉ mô hình hóa một tập lệnh và memory ordering nhất định.

## Tóm tắt

- Spinlock chờ bằng CPU loop; nhanh khi contention ngắn, đắt khi chờ dài.
- Yield không đảm bảo owner được chạy ngay.
- Mutex có thể dùng fast path atomic rồi ngủ kernel khi cần.
- Queue lock cải thiện fairness nhưng thêm state/traffic.
- Priority inversion và scheduler policy ảnh hưởng lock latency.
- Tính đúng, tiến triển và fairness là các câu hỏi riêng khi đánh giá lock.

## Tự kiểm tra

**Spinlock luôn nhanh hơn mutex vì không syscall?** Không; CPU burn/cache contention có thể đắt hơn.

**Yield giải quyết starvation?** Không đảm bảo.

**Futex nghĩa mọi lock uncontended vào kernel?** Thường fast path có thể ở user space; chỉ contention cần kernel.

## Đọc tiếp

Khi nhiều lock được dùng trong cấu trúc lớn, hãy xây thứ tự acquire rõ và xem deadlock.

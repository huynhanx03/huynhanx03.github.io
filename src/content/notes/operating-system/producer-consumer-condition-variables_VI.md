---
title: "Producer–consumer với condition variable"
category: "Operating System"
tags: ["concurrency", "condition-variable", "queue"]
description: "Dùng mutex và condition variable để xây bounded buffer đúng, xử lý spurious wakeup và tránh lost wakeup."
updated: 2026-10-16
translationKey: "operating-system/producer-consumer-condition-variables"
---

Bounded buffer có sức chứa hữu hạn. Producer chờ khi buffer đầy; consumer chờ khi buffer rỗng. Mutex bảo vệ trạng thái queue, condition variable cho thread ngủ cho tới khi điều kiện có thể đổi.

## Điều kiện mới là sự thật

Consumer giữ mutex rồi lặp `while queue.empty(): cond.wait(mutex)`. `wait` nguyên tử nhả mutex và ngủ; khi được đánh thức, nó lấy lại mutex trước khi tiếp tục. Sau khi queue không rỗng, consumer lấy item dưới cùng mutex.

Producer làm tương tự với điều kiện `queue.full()`. Khi thêm item, nó signal condition cho consumer; khi lấy item, nó báo producer có chỗ trống. Có thể dùng một condition với `broadcast` hoặc hai condition riêng (`notEmpty`, `notFull`) để giảm wakeup thừa.

## Vì sao dùng while, không dùng if?

Thread có thể thức dậy dù điều kiện không còn đúng (spurious wakeup), hoặc một thread khác giành item trước khi thread này lấy lại mutex. Signal chỉ báo trạng thái có thể đổi, không trao quyền sở hữu item. Vì vậy phải kiểm tra lại invariant dưới mutex.

Lost wakeup tránh được khi thay đổi predicate và kiểm tra predicate đều được bảo vệ cùng mutex. Không dùng condition variable như event lưu trữ; nếu signal xảy ra trước khi waiter ngủ, tín hiệu có thể không còn. Trạng thái thật nằm ở predicate như `queue.empty()`.

## Shutdown

Hệ thống cần biểu diễn shutdown trong trạng thái được bảo vệ, broadcast để đánh thức tất cả waiter, rồi cho thread thoát và join. Nếu chỉ signal một waiter trong lúc shutdown, các thread khác có thể ngủ mãi.

## Tự kiểm tra

**Condition signal có nghĩa chắc chắn có item dành riêng cho thread thức dậy?** Không.

**Vì sao `while` thay vì `if`?** Phải kiểm tra lại predicate sau mỗi lần thức dậy.

**Ai giữ mutex sau `wait` trở về?** Thread đã thức dậy lấy lại mutex trước khi tiếp tục.

## Đọc tiếp

Semaphore lưu đếm/tín hiệu theo semantics khác; chọn primitive theo invariant cần bảo vệ.

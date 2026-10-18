---
title: "Counting semaphore, binary semaphore và mutex"
category: "Operating System"
tags: ["concurrency", "semaphore", "mutex"]
description: "Phân biệt semaphore như bộ đếm permit với mutex có ownership, rồi chọn primitive phù hợp cho invariant."
updated: 2026-10-16
translationKey: "operating-system/semaphore-counting-binary"
---

Semaphore giữ một counter permit. `wait/P` giảm counter nếu còn permit, nếu không thì block; `post/V` tăng counter và có thể đánh thức waiter. Counting semaphore biểu diễn số tài nguyên có sẵn; binary semaphore giới hạn trạng thái về 0/1 nhưng không nhất thiết có ownership như mutex.

## Resource pool

Nếu có N kết nối trong pool, semaphore khởi tạo N permit. Mỗi worker lấy permit trước khi dùng connection và trả permit sau khi hoàn thành. Mọi đường lỗi phải trả lại permit hoặc pool sẽ rò tài nguyên logic.

## Đồng bộ producer/consumer

Semaphore `empty` đếm slot trống, `full` đếm item có sẵn, mutex bảo vệ cấu trúc queue. Thứ tự wait/post phải nhất quán để không giữ mutex khi chờ điều kiện có thể chỉ được tạo bởi thread khác đang cần mutex.

## Khác mutex

Mutex có owner và thường chỉ owner được unlock; nó biểu diễn quyền truy cập vùng tới hạn. Semaphore có thể được post bởi thread khác và biểu diễn permit/event. Dùng semaphore như mutex làm ownership và lỗi misuse khó nhận ra.

## Tự kiểm tra

**Semaphore counter có thể lớn hơn 1?** Counting semaphore có.

**Semaphore tự bảo vệ queue dữ liệu?** Không, thường cần mutex riêng.

**Thread khác có thể post permit?** Thường có theo semantics semaphore.

## Đọc tiếp

Condition variable đánh thức thread để kiểm tra predicate được bảo vệ bởi mutex, thay vì lưu permit như semaphore.

---
title: "Reader–writer lock và bài toán fairness"
category: "Operating System"
tags: ["concurrency", "locks", "fairness"]
description: "So sánh reader–writer lock với mutex, nhận diện starvation và cân nhắc chi phí trong workload thực tế."
updated: 2026-10-16
translationKey: "operating-system/reader-writer-locks-fairness"
---

Reader–writer lock cho phép nhiều reader cùng giữ lock, nhưng writer cần quyền độc quyền. Nó có thể tăng song song khi đọc nhiều và ghi ít, song không mặc nhiên nhanh hơn mutex: bookkeeping, cache contention và thời gian chờ writer đều có chi phí.

## Chính sách chờ

Một implementation reader-preferring có thể liên tục nhận reader mới, khiến writer chờ vô hạn nếu tải đọc không dừng. Writer-preferring có thể chặn reader mới khi writer đang đợi, nhưng cần xử lý starvation reader. Fair lock xếp hàng công bằng hơn nhưng có thể giảm throughput hoặc locality.

## Các rủi ro

Upgrade từ read lock sang write lock thường không nguyên tử; hai reader cùng nâng cấp có thể deadlock nếu vẫn giữ read lock. Downgrade write sang read có thể được hỗ trợ theo API nhưng cần hiểu semantics. Recursive acquisition và thứ tự lock cũng phụ thuộc implementation.

Read lock chỉ an toàn nếu dữ liệu thật sự không bị thay đổi trong lúc đọc hoặc mutation được đồng bộ riêng. Pointer tới object có thể bị giải phóng sau khi reader nhả lock; lifetime cần được quản lý bằng ownership, reference count, epoch hoặc cơ chế phù hợp.

## Chọn bằng phép đo

Dùng reader–writer lock khi có bằng chứng mutex là bottleneck, critical section đọc đủ dài để lợi ích vượt chi phí, và tỷ lệ ghi/fairness phù hợp. Với dữ liệu nhỏ, atomic snapshot, immutable structure hoặc sharding có thể tốt hơn. Đo tail latency của writer, không chỉ throughput tổng.

## Tự kiểm tra

**Nhiều reader luôn làm chương trình nhanh hơn?** Không; lock overhead và cache-line contention có thể lớn hơn.

**Reader-preferring bảo đảm writer không starvation?** Không.

**Read lock tự bảo vệ lifetime object sau khi nhả?** Không.

## Đọc tiếp

Nếu dữ liệu có thể chia vùng độc lập, sharding giảm tranh chấp bằng nhiều lock nhỏ.

---
title: "Atomic operation và memory ordering"
category: "Operating System"
tags: ["concurrency", "atomic", "memory model"]
description: "Hiểu read-modify-write, compare-and-swap, happens-before và vì sao atomic không tự bảo vệ invariant lớn."
updated: 2026-10-16
translationKey: "operating-system/atomic-operations-memory-order"
---

Atomic operation cho phép một thao tác nhỏ như đổi giá trị hoặc compare-and-swap được quan sát như một đơn vị theo hợp đồng CPU/ngôn ngữ. Nó là nền tảng cho lock và cấu trúc dữ liệu concurrent, nhưng dùng atomic đúng cần hiểu cả memory ordering.

## Read-modify-write

`fetch_add`, `exchange` và compare-and-swap (CAS) kết hợp đọc với cập nhật theo nguyên tử. CAS có dạng: nếu giá trị hiện tại bằng expected thì thay bằng desired; nếu không thì trả giá trị thật để caller thử lại.

```text
old = atomic_load(x)
repeat:
  new = old + delta
  if compare_exchange(x, old, new): break
  old = observed_value
```

Đây là pseudocode; CAS API có thể cập nhật expected argument và memory order khác nhau. Vòng retry có thể tốn CPU khi contention cao.

## Atomicity khác ordering

Atomicity bảo vệ thao tác trên chính biến theo contract. Memory ordering quy định thao tác khác có thể được quan sát trước/sau tới mức nào. Relaxed atomic đảm bảo atomicity nhưng không nhất thiết publish các ghi khác. Release/acquire thường tạo synchronization khi acquire đọc giá trị được release, thiết lập happens-before.

Sequential consistency đặt các thao tác sequentially consistent vào một thứ tự toàn phần chung, giúp reasoning dễ hơn nhưng có thể có chi phí; thứ tự này không có nghĩa mọi thao tác bộ nhớ đều được xếp vào cùng hàng. Compiler/CPU mapping thay đổi. Chọn memory order yếu hơn chỉ khi chứng minh được correctness và đo thấy lợi ích.

## Invariant nhiều biến

Nếu trạng thái gồm `pointer` và `length`, atomic pointer không tự làm cập nhật cặp đó nguyên tử. Cần lock, versioning/protocol hoặc data structure đã được chứng minh. Atomic increment một bộ đếm không đảm bảo điều kiện “không vượt giới hạn” nếu kiểm tra và cập nhật tách rời.

## Reclamation và ABA

Lock-free linked structure có thể đọc node trong khi thread khác free; cần hazard pointer, epoch/RCU hoặc cơ chế reclamation. ABA xảy ra khi giá trị đổi A→B→A, khiến CAS nghĩ state không đổi dù nội dung trung gian khác. Tagged pointer/version có thể giảm rủi ro nhưng có giới hạn wrap/architecture.

## Tóm tắt

- Atomic read-modify-write gộp cập nhật nhỏ.
- Atomicity khác memory ordering và happens-before.
- Relaxed atomic không tự publish state liên quan.
- Invariant nhiều field cần protocol rộng hơn atomic biến đơn.
- Lock-free structure phải xử lý reclamation và ABA.

## Tự kiểm tra

**Atomic counter bảo vệ object mà counter đếm?** Không; chỉ counter được cập nhật atomically.

**Acquire/release tạo thứ tự cho mọi biến dù không có synchronization relation?** Không; cần matching relation phù hợp.

**CAS loop luôn lock-free và không đói?** Không; progress guarantee phụ thuộc thuật toán, thread có thể retry mãi.

## Đọc tiếp

Lock implementation dùng atomic primitives để chuyển ownership, nhưng mutex còn có cơ chế ngủ/đánh thức.

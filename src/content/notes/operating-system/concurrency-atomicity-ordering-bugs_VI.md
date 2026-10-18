---
title: "Lỗi concurrency: atomicity, ordering và lost wakeup"
category: "Operating System"
tags: ["concurrency", "race condition", "ordering", "deadlock"]
description: "Phân loại lỗi đồng thời phổ biến và cách chuyển invariant thành cơ chế đồng bộ cụ thể."
sources:
  - title: "C++ draft: Order and consistency"
    url: "https://eel.is/c%2B%2Bdraft/atomics.order"
  - title: "The Open Group: pthread_cond_wait"
    url: "https://pubs.opengroup.org/onlinepubs/7908799/xsh/pthread_cond_wait.html"
updated: 2026-10-17
translationKey: "operating-system/concurrency-atomicity-ordering-bugs"
---

Race không chỉ tạo kết quả sai ở một biến. Một thread có thể quan sát state nửa cập nhật, signal đến trước khi waiter ngủ, hoặc các thao tác reorder làm dữ liệu publish sai thứ tự. Phân loại lỗi giúp chọn primitive đúng.

## Atomicity violation

Một thao tác logic gồm nhiều bước nhưng thread khác xen vào giữa. Ví dụ kiểm tra `balance >= amount` rồi trừ tiền: mỗi phép đọc/ghi riêng có thể atomic, nhưng toàn bộ check-then-act không atomic. Lock quanh invariant hoặc transaction phù hợp mới bảo vệ được.

## Ordering violation

Producer ghi payload rồi đặt `ready=true`; consumer thấy cờ nhưng điều đó chỉ bảo đảm payload đã được công bố nếu protocol tạo quan hệ đồng bộ phù hợp. Trong C++, truy cập đồng thời vào payload thường mà không đồng bộ có thể là data race và dẫn tới undefined behavior; với protocol dùng atomic, chỉ đọc cờ bằng relaxed vẫn không tự publish payload. Có thể dùng mutex/channel, hoặc release store cho cờ và acquire load nhận giá trị từ lần store đó ([C++ draft](https://eel.is/c%2B%2Bdraft/atomics.order)). `volatile` trong một số ngôn ngữ chỉ ngăn tối ưu hóa nhất định, không thay đồng bộ thread.

## Lost wakeup và predicate

Condition variable không lưu notification để waiter nhận sau. Nếu predicate được bảo vệ bởi cùng một mutex, waiter kiểm tra nó trong vòng `while` rồi gọi `wait`; API nhả mutex và đưa waiter vào trạng thái ngủ theo một thao tác nguyên tử. Producer cũng khóa mutex đó để đổi predicate, rồi notify. Khi thức dậy, waiter lấy lại mutex và kiểm tra predicate lần nữa, vì notification không bảo đảm điều kiện vẫn đúng lúc nó chạy ([The Open Group](https://pubs.opengroup.org/onlinepubs/7908799/xsh/pthread_cond_wait.html)).

## Lock order và deadlock

Hai thread lấy lock theo thứ tự ngược có thể tạo chu trình. Áp thứ tự toàn cục, gom lock hoặc chuyển sang ownership/message passing. Lock hierarchy cần được tài liệu hóa và giữ nhất quán trên mọi đường code.

## Tìm lỗi

- Vẽ state/invariant và liệt kê mọi reader/writer.
- Đánh dấu synchronization edge: mutex, atomic, channel, join.
- Xem lifetime/reclamation khi pointer chia sẻ.
- Dùng race detector/thread sanitizer và stress schedule; chúng giúp tìm lỗi nhưng không chứng minh absence.
- Tạo deterministic test/barrier để ép interleaving nghi vấn khi có thể.

## Tóm tắt

- Atomicity violation làm thao tác nhiều bước bị xen ngang.
- Ordering violation làm dữ liệu publish không đúng quan hệ.
- Lost wakeup do predicate check và wait không đồng bộ.
- Lock order không nhất quán gây deadlock.
- Công cụ phát hiện hỗ trợ nhưng invariant và memory model vẫn phải hiểu.

## Tự kiểm tra

**Mỗi biến atomic nghĩa check-then-act an toàn?** Không.

**`volatile` luôn đủ cho producer-consumer?** Không.

**Race detector pass nghĩa không có race?** Không; nó chỉ quan sát các execution được chạy.

## Đọc tiếp

Barrier và producer-consumer là các pattern phối hợp phổ biến; xem cách tổ chức đồng bộ theo phase.

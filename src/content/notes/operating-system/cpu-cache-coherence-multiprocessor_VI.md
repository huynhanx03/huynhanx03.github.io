---
title: "Cache coherence giữa nhiều lõi"
category: "Operating System"
tags: ["cpu", "cache coherence", "multiprocessor", "memory model"]
description: "Hiểu cache line ownership, invalidation, false sharing và khác biệt giữa coherence với consistency."
sources:
  - title: "C++ draft: Order and consistency"
    url: "https://eel.is/c%2B%2Bdraft/atomics.order"
updated: 2026-10-17
translationKey: "operating-system/cpu-cache-coherence-multiprocessor"
---

Mỗi CPU core có thể giữ cache line riêng. Nếu core 0 ghi một địa chỉ mà core 1 đang cache, các bản sao phải được phối hợp để core không đọc mãi giá trị cũ. Cache coherence protocol theo dõi ownership/state của line để duy trì quy tắc nhất quán cho cùng một địa chỉ.

## Invalidate/update protocol

Một hướng là khi ghi, gửi invalidate tới cache khác; core ghi giành quyền sở hữu line. Lõi khác khi đọc lại phải fetch phiên bản mới. Giao thức MESI-like là mô hình phổ biến, nhưng state cụ thể khác theo CPU.

## False sharing

Hai thread sửa biến độc lập nhưng cùng cache line. Coherence truyền line qua lại dù không có logical data sharing — false sharing. Padding/alignment hoặc partition per-core có thể giúp, nhưng làm tăng memory footprint và cần đo.

## Coherence khác memory consistency

Coherence giúp các core thống nhất cách nhìn những lần ghi vào cùng một địa chỉ. Memory consistency còn quy định quan hệ thứ tự giữa các thao tác trên những địa chỉ khác nhau. Ví dụ, với hai `std::atomic<int>` ban đầu bằng 0, thread A lần lượt ghi `x=1` rồi `y=1` bằng `memory_order_relaxed`; thread B đọc được `y=1` vẫn có thể đọc `x=0`. Hai atomic riêng lẻ đều coherent, nhưng thao tác relaxed không tạo quan hệ đồng bộ nối hai lần ghi. Nếu B đọc `y` bằng acquire và lần đọc đó nhận giá trị từ lần ghi release của A, quan hệ đồng bộ có thể làm lần ghi `x` trước đó hiển thị với B ([C++ draft](https://eel.is/c%2B%2Bdraft/atomics.order)). Vì vậy coherence không thay lock/atomic có ordering phù hợp khi cần publish một nhóm trạng thái.

## Scalability và traffic

Một counter toàn cục có thể serialize do line ownership dù phép tăng atomic. Sharding counter giảm write sharing rồi merge kết quả sau. Các thuật toán lock-free cũng tạo coherence traffic, không loại contention phần cứng.

## Tóm tắt

- Coherence phối hợp cache line của cùng address giữa core.
- Invalidation/ownership tạo traffic khi nhiều core ghi.
- False sharing do biến độc lập cùng line.
- Coherence không thay memory-order synchronization.
- Sharding giảm hot line nhưng cần merge/consistency.

## Tự kiểm tra

**Cache coherent nghĩa mọi thread luôn thấy mọi ghi ngay theo code order?** Không; memory model và synchronization vẫn quan trọng.

**False sharing là race condition?** Không nhất thiết; có thể code đúng nhưng hiệu năng kém.

**Atomic increment tránh coherence traffic?** Không; nó cần quyền sở hữu line.

## Đọc tiếp

Liên kết với [atomic operations](/vi/notes/operating-system/atomic-operations-memory-order/) và scheduling đa lõi.

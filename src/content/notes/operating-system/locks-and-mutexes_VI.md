---
title: "Lock và mutex: bảo vệ invariant dùng chung"
category: "Operating System"
tags: ["concurrency", "lock", "mutex", "synchronization"]
description: "Dùng mutual exclusion đúng cách, tránh race, lock quá rộng và các lỗi vòng đời khóa."
updated: 2026-10-16
translationKey: "operating-system/locks-and-mutexes"
---

Mutex cho phép tối đa một thread sở hữu lock tại một thời điểm. Thread khác muốn vào critical section phải chờ. Dùng lock đúng giúp bảo vệ invariant của dữ liệu chia sẻ; dùng sai có thể gây deadlock, nghẽn hoặc race vẫn còn.

Trong POSIX, mutex phải được khởi tạo trước khi dùng (initializer tĩnh hoặc `pthread_mutex_init`) và chỉ hủy bằng `pthread_mutex_destroy` khi không còn thread nào giữ, chờ hoặc dùng nó trong thao tác đồng bộ; [POSIX quy định hủy mutex đang được tham chiếu là undefined behavior](https://pubs.opengroup.org/onlinepubs/9799919799/functions/pthread_mutex_destroy.html). Kiểm tra mã trả về của init/lock/unlock; wrapper chỉ `assert` phù hợp với chương trình mà dừng hẳn khi lỗi là lựa chọn chấp nhận được. `trylock` trả ngay nếu lock đang bận; `timedlock` chờ tới thời hạn. Chúng có trường hợp dùng nhưng không nên thay thế lock thông thường nếu không có lý do rõ.

Đánh giá một lock cần nhìn ba mặt: **correctness** (có loại trừ tương hỗ không), **fairness** (thread có thể đói vô hạn không) và **performance**. Đo riêng trường hợp không contention, nhiều thread tranh trên một CPU, và nhiều CPU tranh cùng lock; một lock có fast path tốt vẫn có thể rất tốn khi contention cao.

## Bảo vệ invariant, không chỉ dòng ghi

Giả sử queue có `head`, `tail` và số phần tử. Một thao tác enqueue có thể cập nhật cả ba trường. Nếu lock chỉ bao quanh phép tăng count mà không bao quanh liên hệ giữa các trường, thread khác có thể thấy trạng thái nửa cập nhật.

```text
lock(queue)
  kiểm tra queue và cập nhật các trường liên quan
unlock(queue)
```

Vùng critical section nên đủ rộng để invariant không bị quan sát sai, nhưng không nên giữ lock qua I/O chậm hoặc gọi code không kiểm soát nếu có thể tránh.

## Lock có semantics về thứ tự bộ nhớ

Lock không chỉ ngăn hai thread vào cùng vùng. Việc unlock rồi lock lại cùng mutex tạo quan hệ đồng bộ theo API/memory model, giúp thread sau quan sát các ghi trước đó đúng quy tắc. Một cờ boolean tự viết không tự tạo bảo đảm này; compiler/CPU có thể reorder nếu không dùng primitive phù hợp.

Đừng tự chế spinlock bằng vòng `while(flag)` trên biến thường. Cần atomic operation, memory ordering đúng và cân nhắc lịch chạy. Mutex được hệ điều hành/runtime tối ưu hóa cho nhiều trường hợp.

## Granularity: một lock lớn hay nhiều lock nhỏ?

Một lock lớn đơn giản hóa reasoning nhưng làm nhiều thread chờ nhau, hạn chế song song. Nhiều lock nhỏ tăng khả năng chạy đồng thời nhưng làm thứ tự acquire phức tạp và tăng nguy cơ deadlock.

Hãy bắt đầu từ cấu trúc dữ liệu và invariant. Tối ưu lock contention sau khi profile cho thấy đó là nút thắt. Sharding dữ liệu theo key hoặc dùng queue riêng có thể giảm tranh chấp tốt hơn việc thêm lock tùy tiện.

## Các lỗi thường gặp

- **Quên unlock:** thường nên dùng defer/RAII/scope guard tùy ngôn ngữ.
- **Unlock bởi thread không sở hữu:** vi phạm hợp đồng mutex.
- **Giữ lock quá lâu:** làm tăng latency của thread khác.
- **Gọi callback khi đang giữ lock:** callback có thể lấy lock khác hoặc quay lại cùng cấu trúc.
- **Đọc dữ liệu ngoài lock:** race còn tồn tại dù phần ghi có lock.
- **Dùng một lock cho mọi thứ:** dễ tạo contention toàn cục.

## Mutex khác semaphore

Mutex biểu diễn quyền sở hữu độc quyền; thread thường lock rồi chính nó unlock. Semaphore biểu diễn số permit/tài nguyên, và thao tác signal/wait có thể do thread khác thực hiện theo bài toán. Dùng nhầm semaphore thay mutex có thể làm ownership khó hiểu; dùng mutex để đếm nhiều slot lại sai abstraction.

## Tóm tắt

- Mutex bảo vệ critical section và invariant dữ liệu.
- Lock/unlock còn tạo quan hệ đồng bộ bộ nhớ theo API.
- Lock granularity là đánh đổi giữa đơn giản và khả năng song song.
- Quên unlock, gọi callback trong lock và truy cập ngoài lock là nguồn lỗi phổ biến.
- Chọn mutex cho mutual exclusion; semaphore cho số lượng permit/signal phù hợp.

## Tự kiểm tra

**Chỉ khóa lúc ghi là đủ nếu có thread đọc?** Không nhất thiết; mọi truy cập xung đột phải theo quy tắc đồng bộ.

**Một lock bao quanh cả hàm luôn an toàn hơn?** Nó có thể đơn giản hơn nhưng dễ kéo dài critical section và tạo contention.

**Lock bảo vệ biến nhưng không bảo vệ invariant liên quan thì cấu trúc đã an toàn?** Chưa; invariant phải được cập nhật/quan sát như một đơn vị logic.

## Đọc tiếp

Khi thread cần đợi một điều kiện như “queue không rỗng”, condition variable phối hợp với mutex hiệu quả hơn polling.

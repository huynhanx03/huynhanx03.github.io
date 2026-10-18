---
title: "Condition variable: ngủ cho tới khi điều kiện có thể đúng"
category: "Operating System"
tags: ["concurrency", "condition variable", "mutex"]
description: "Hiểu wait/signal, vòng lặp kiểm tra predicate và vì sao notification không phải dữ liệu."
sources:
  - title: "The Open Group: pthread_cond_wait"
    url: "https://pubs.opengroup.org/onlinepubs/7908799/xsh/pthread_cond_wait.html"
updated: 2026-10-17
translationKey: "operating-system/condition-variables"
---

Nếu consumer liên tục hỏi “queue đã có phần tử chưa?”, nó tiêu CPU khi queue rỗng. Condition variable cho phép thread ngủ và được đánh thức khi có thông báo rằng trạng thái liên quan có thể đã đổi.

Condition variable không lưu predicate thay cho chương trình. Điều kiện thật nằm trong dữ liệu được bảo vệ bởi mutex, ví dụ `queue.size() > 0`. Notification chỉ báo “hãy kiểm tra lại”; thread phải đọc trạng thái dưới lock.

## Mẫu producer-consumer

```text
consumer:
  lock(mutex)
  while queue rỗng:
    wait(condition, mutex)
  lấy phần tử khỏi queue
  unlock(mutex)

producer:
  lock(mutex)
  thêm phần tử vào queue
  signal(condition)
  unlock(mutex)
```

Các API thường bảo đảm `wait` nhả mutex nguyên tử khi bắt đầu ngủ và lấy lại mutex trước khi return. Producer dùng cùng mutex để đổi predicate, nên không thể chen vào khoảng giữa lúc consumer kiểm tra predicate và lúc consumer bắt đầu chờ ([The Open Group](https://pubs.opengroup.org/onlinepubs/7908799/xsh/pthread_cond_wait.html)). Cần xác nhận semantics của ngôn ngữ/API cụ thể.

## Vì sao phải dùng `while`, không dùng `if`?

Thread có thể tỉnh dậy dù điều kiện vẫn sai (spurious wakeup), một thread khác có thể lấy phần tử trước, hoặc notification được gửi cho nhiều waiter nhưng chỉ có một phần tử. Vòng `while` kiểm tra lại predicate sau khi lấy mutex bảo vệ.

`if (queue rỗng) wait(); lấy phần tử` có thể đọc queue rỗng sau khi thức dậy và gây lỗi. Đây là lỗi logic phổ biến khi coi notification như thể nó mang theo một phần tử.

## Signal, broadcast và lost wakeup

`signal` thường đánh thức một waiter; `broadcast` đánh thức nhiều waiter. Chọn theo số thread có thể tiến triển. Broadcast dễ gây thundering herd nếu nhiều thread tranh cùng một điều kiện.

Trong Mesa semantics (cách dùng phổ biến), signal chỉ chuyển waiter sang trạng thái sẵn sàng; nó không trao mutex ngay và không đảm bảo predicate còn đúng khi waiter chạy. Waiter phải lấy lại lock rồi kiểm tra điều kiện trong `while`. Hoare semantics giả định waiter được chạy ngay khi signal, nhưng khó triển khai hơn và không phải semantics POSIX thông thường. Giữ mutex khi cập nhật predicate và signal là cách dễ reasoning, dù một số trường hợp API cho phép signal sau khi nhả lock.

Lost wakeup có thể xảy ra nếu kiểm tra predicate không đồng bộ rồi mới bắt đầu wait: producer đổi predicate và signal ở khoảng giữa, consumer bắt đầu ngủ sau notification và có thể ngủ mãi. Cả waiter lẫn producer phải dùng cùng mutex khi kiểm tra hoặc đổi predicate; `wait` nhả mutex và bắt đầu chờ nguyên tử theo semantics API, nên notification không thể lọt vào khoảng trống đó.

Đôi khi một condition variable phục vụ nhiều predicate khác nhau, và `signal` có thể đánh thức waiter không đủ điều kiện tiến triển. Nếu không có cách chọn đúng waiter, **covering condition** dùng `broadcast`: mọi thread thức dậy, lấy lock và tự kiểm tra lại predicate. Cách này đúng nhưng có thể đánh thức dư; nếu broadcast là cách duy nhất để code chạy, hãy kiểm tra xem predicate/condition variable đã được tách đúng chưa.

## Khi `signal` đánh thức nhầm waiter

Giả sử hai thread đợi cấp phát lần lượt 20 và 10 byte. Khi chỉ có 15 byte được giải phóng, `signal` có thể đánh thức thread cần 20 byte. Thread đó kiểm tra predicate, thấy vẫn thiếu bộ nhớ rồi ngủ lại; thread cần 10 byte vẫn ngủ dù nó đã có thể chạy. Nếu không thể chọn waiter phù hợp, `broadcast` đánh thức cả hai để mỗi thread tự kiểm tra. Đây là covering condition: đổi thêm lần chạy và tranh lock để giữ đúng tính chất, nhưng có thể tạo thundering herd khi nhiều waiter cùng tỉnh mà chỉ một số ít tiến triển.

Monitor gắn dữ liệu và các thao tác của nó với một mutex ngầm: chỉ một thread ở trong monitor tại một thời điểm. Có thể dựng semaphore đếm bằng monitor: `wait` chờ trong khi số permit bằng 0 rồi giảm một; `post` tăng permit và signal một waiter. Khi viết bằng pthreads, monitor ngầm trở thành mutex tường minh; `pthread_cond_wait` nhận mutex, nhả nó khi ngủ và lấy lại trước khi trả về.

Một số ngôn ngữ cung cấp monitor ở mức ngôn ngữ. Java dùng `synchronized` để bảo vệ phương thức/đối tượng. Condition variable duy nhất kiểu `wait/notify` đời đầu có thể đánh thức nhầm loại waiter trong producer-consumer; `notifyAll` làm giải pháp đúng nhưng có thể đánh thức dư. Nhiều condition variable hoặc `Condition` riêng cho từng predicate giúp chọn nhóm waiter chính xác hơn.

## Timeout và hủy

Wait có timeout cần kiểm tra predicate lần nữa sau khi thức dậy; timeout không chứng minh điều kiện không thể xảy ra ngay sau đó. Hủy thread đang chờ cần đảm bảo mutex và invariant không bị bỏ trong trạng thái sai. Dùng cleanup theo API thay vì giả định thread biến mất mà không có hậu quả.

## Tóm tắt

- Predicate được lưu trong trạng thái ứng dụng; condition variable chỉ phối hợp chờ.
- Wait thường nhả mutex khi ngủ và lấy lại trước khi tiếp tục.
- Luôn kiểm tra predicate trong vòng `while` sau khi thức dậy.
- Signal không phải dữ liệu và không đảm bảo điều kiện chắc chắn đúng.
- Broadcast, timeout và cancellation cần được thiết kế theo số waiter và invariant.

## Tự kiểm tra

**Nhận signal có nghĩa chắc chắn queue có dữ liệu?** Không. Predicate phải được kiểm tra lại dưới mutex.

**Dùng `if` thay `while` được không?** Không an toàn vì wakeup giả hoặc thread khác có thể lấy tài nguyên trước.

**Condition variable thay thế mutex?** Không; mutex bảo vệ predicate và trạng thái chia sẻ.

## Đọc tiếp

Semaphore cũng cho phép đợi, nhưng nó lưu số permit thay vì gắn trực tiếp với predicate tùy ý.

---
title: "Semaphore: đếm permit và phối hợp công việc"
category: "Operating System"
tags: ["concurrency", "semaphore", "synchronization"]
description: "Dùng counting semaphore để giới hạn tài nguyên và signal sự kiện, đồng thời phân biệt với mutex."
updated: 2026-10-16
translationKey: "operating-system/semaphores"
---

Semaphore là một primitive đồng bộ có giá trị đếm. `wait` lấy một permit; nếu chưa có permit, caller chờ. `post`/`signal` thêm permit và có thể đánh thức waiter. Counting semaphore phù hợp để mô hình hóa số slot hoặc số tài nguyên có thể dùng đồng thời.

## Semaphore giới hạn tài nguyên

Giả sử pool có 5 kết nối. Khởi tạo semaphore với 5 permit. Mỗi worker lấy một permit trước khi mượn kết nối và trả permit khi xong. Nếu mọi đường truy cập đều tuân thủ giao thức này, worker thứ sáu sẽ chờ thay vì mượn kết nối thứ sáu. Semaphore chỉ giới hạn các worker có dùng nó; code bỏ qua permit vẫn có thể vượt giới hạn của pool.

Nếu caller quên trả permit trên nhánh lỗi, sức chứa hiệu dụng giảm dần; dùng scope cleanup/finally/defer tùy ngôn ngữ. Cần đảm bảo mỗi lần lấy permit có đúng một lần trả, kể cả timeout hoặc hủy.

## Semaphore báo hiệu producer-consumer

Có thể dùng semaphore `items` ban đầu bằng 0: producer thêm phần tử rồi post; consumer wait trước khi lấy phần tử. Queue vẫn cần bảo vệ cấu trúc nội bộ bằng mutex nếu nhiều producer/consumer cùng truy cập. Semaphore đếm số item có thể lấy, nhưng không tự bảo vệ liên kết head/tail.

Trong bounded buffer dung lượng `N`, khởi tạo `empty = N`, `full = 0`. Producer wait `empty`, khóa mutex chỉ quanh thao tác ghi slot/index, nhả mutex rồi post `full`. Consumer làm đối xứng: wait `full`, khóa khi lấy item/cập nhật index, nhả mutex rồi post `empty`. Không giữ mutex trong lúc wait `full` hoặc `empty`: nếu consumer ngủ khi vẫn giữ mutex thì producer không thể vào để tạo item và đánh thức nó — deadlock.

Semaphore có thể phối hợp join/event với giá trị khởi đầu 0. Nếu child post trước khi parent wait, permit vẫn được giữ; parent wait sau sẽ tiêu thụ permit và đi tiếp. Đây khác condition variable: signal không có waiter không được ghi nhớ, nên predicate phải lưu riêng và được bảo vệ bằng mutex.

Một triển khai giáo dục có thể xây semaphore từ mutex + condition variable + counter: `wait` ngủ trong `while (value <= 0)`, `post` tăng counter và signal. Chi tiết biểu diễn số waiter bên trong semaphore tùy implementation; caller chỉ nên dựa vào API contract.

Một counting semaphore không nhất thiết có ownership như mutex. Theo nhiều API, thread khác có thể post để báo sự kiện. Đó là lý do semaphore có thể dùng để đồng bộ producer với consumer, nhưng cũng khiến lỗi permit khó truy nguyên nếu giao thức không rõ.

## Mutex hay semaphore?

| Cần biểu diễn | Primitive phù hợp thường gặp |
| --- | --- |
| Chỉ một thread được vào vùng tới hạn | Mutex |
| Tối đa N hoạt động đồng thời | Counting semaphore |
| Ngủ cho tới predicate ứng dụng đúng | Condition variable + mutex |
| Chờ thread kết thúc | Join/future |

Đây là hướng chọn, không thay API cụ thể. Binary semaphore có thể giống mutex về số permit nhưng semantics ownership và khả năng dùng khác nhau. Dùng đúng abstraction làm invariant dễ hiểu hơn.

## Rủi ro khi thiết kế permit

- Khởi tạo sai số permit làm hệ thống cho quá nhiều hoặc quá ít tác vụ.
- Post lặp làm vượt giới hạn nếu semaphore không có cap.
- Quên post gây rò permit và treo waiter.
- Thứ tự acquire nhiều semaphore có thể tạo deadlock.
- Timeout cần xử lý rõ tác vụ đã lấy permit chưa.

## Tóm tắt

- Semaphore biểu diễn số permit; wait lấy, post trả/thêm.
- Dùng để giới hạn tài nguyên hoặc phối hợp sự kiện theo giao thức rõ ràng.
- Queue dùng với semaphore thường vẫn cần mutex bảo vệ cấu trúc.
- Ownership và semantics không giống mutex.
- Mỗi acquire cần vòng đời release chính xác trên mọi nhánh.

## Tự kiểm tra

**Semaphore bằng 1 luôn giống mutex?** Không nhất thiết; ownership semantics có thể khác.

**Semaphore `items` thay thế lock cho queue?** Không; nó đếm item sẵn có, còn cấu trúc queue vẫn cần bảo vệ.

**Muốn giới hạn pool 10 resource thì khởi tạo bao nhiêu permit?** Thường là 10, nhưng cần đảm bảo mỗi permit gắn với đúng một resource và được trả khi giải phóng.

## Đọc tiếp

Kết hợp lock, semaphore và tài nguyên theo thứ tự không nhất quán có thể tạo [deadlock](/vi/notes/operating-system/deadlocks-and-livelocks/).

---
title: "Acquire/release và happens-before"
category: "Operating System"
tags: ["concurrency", "atomic", "memory-model"]
description: "Nối atomic operation với thứ tự quan sát giữa thread; hiểu acquire/release và tránh tin vào thứ tự source code."
updated: 2026-10-16
translationKey: "operating-system/memory-ordering-acquire-release"
---

Compiler và CPU có thể đổi thứ tự memory operation khi vẫn bảo toàn kết quả đơn thread. Trên nhiều core, hai thread có thể quan sát các truy cập theo thứ tự khác nhau nếu không có synchronization. Memory model định nghĩa thứ tự nào được phép và primitive nào tạo quan hệ happens-before.

## Release và acquire

Thread producer ghi dữ liệu rồi store cờ bằng release. Thread consumer load cờ bằng acquire; nếu load đọc giá trị release tương ứng, các ghi trước release được bảo đảm nhìn thấy sau acquire. Atomic chỉ trên cờ thôi chưa đủ nếu chọn memory order quá yếu hoặc dữ liệu khác không có quan hệ đồng bộ.

## Relaxed

Relaxed atomic bảo đảm thao tác trên chính atomic object là atomic và có modification order, nhưng không tạo ordering cho dữ liệu khác. Nó phù hợp counter độc lập, không làm cờ publish dữ liệu an toàn.

## Fence và lock

Mutex thường cung cấp acquire khi lock thành công và release khi unlock theo API; code không cần tự đặt fence thay thế. Fence không sửa data race nếu không có atomic protocol nhất quán. Ngôn ngữ như C/C++ có undefined behavior cho data race trên biến thường.

## Tự kiểm tra

**Atomic relaxed publish object khác an toàn?** Không tự động.

**Acquire/release có nghĩa flush mọi cache xuống RAM?** Không; đó là semantics ordering/coherence theo memory model.

**Đọc source theo thứ tự là đủ?** Không nếu thiếu synchronization.

## Đọc tiếp

Lock và condition variable cung cấp synchronization cấp cao hơn, dễ lập luận hơn thao tác atomic thủ công.

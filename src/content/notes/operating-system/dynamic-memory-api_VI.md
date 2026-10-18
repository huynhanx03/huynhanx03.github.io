---
title: "Dynamic memory API: malloc, free, realloc và lifetime"
category: "Operating System"
tags: ["memory", "malloc", "heap", "allocation"]
description: "Hiểu hợp đồng cấp phát động, ownership, lỗi use-after-free và khác biệt giữa API với VM."
updated: 2026-10-16
translationKey: "operating-system/dynamic-memory-api"
---

Dynamic memory API cho phép chương trình yêu cầu vùng có kích thước xác định lúc chạy. Trong C, `malloc` trả pointer hoặc NULL, `free` trả vùng theo hợp đồng allocator, `calloc` cấp và zero-initialize theo semantics, `realloc` thử đổi kích thước. Đây là API user-space; không phải thao tác map trực tiếp một block vật lý mỗi lần gọi.

## Ownership và lifetime

Sau `malloc`, caller chịu trách nhiệm dùng vùng trong giới hạn và giải phóng đúng một lần khi không còn ai tham chiếu. `free` không xóa pointer ở mọi nơi; pointer khác tới cùng vùng trở thành dangling. Dùng sau free là use-after-free; giải phóng hai lần có thể làm hỏng allocator.

Một ownership rule rõ giúp giảm lỗi: một component sở hữu vùng, các component khác mượn trong thời gian xác định; hoặc dùng reference counting/GC/runtime phù hợp. Borrowed pointer phải ghi rõ có được giữ qua return hay không.

## `realloc` và pointer cũ

`realloc(p, n)` có thể mở rộng tại chỗ hoặc cấp vùng mới rồi copy. Khi thành công, pointer cũ không nên tiếp tục dùng; khi thất bại và `n > 0`, vùng cũ thường vẫn hợp lệ theo C semantics. Gán thẳng kết quả vào `p` có thể làm mất pointer cũ khi cấp phát thất bại:

```c
void *tmp = realloc(p, new_size);
if (tmp != NULL) p = tmp;
```

Mẫu thực tế cần xử lý trường hợp size 0 theo chuẩn/libc được dùng.

## Integer overflow và kích thước

Khi cấp `count * sizeof(item)`, kiểm tra phép nhân không vượt `SIZE_MAX`. Nếu overflow, allocator nhận vùng quá nhỏ trong khi code ghi nhiều item, gây corruption. Dùng helper kiểm tra overflow và validate input trước cấp phát.

Một số lỗi C phổ biến không bị compiler phát hiện: dùng pointer chưa cấp phát làm đích ghi; xin thiếu một byte cho chuỗi C (cần chỗ cho ký tự `\0`); dùng `sizeof(pointer)` khi định cấp phát mảng thay vì `count * sizeof(*pointer)`; hoặc đọc vùng mới cấp phát bằng `malloc` trước khi khởi tạo. `calloc` zero-initialize vùng theo hợp đồng của nó, nhưng không thay thế việc xác định trạng thái hợp lệ của từng trường dữ liệu.

`free` chỉ được gọi với pointer hợp lệ do allocator cấp và chưa được giải phóng; không truyền pointer vào giữa một object, địa chỉ stack hay cùng block hai lần. Trả pointer tới biến local trong stack của hàm đã return cũng sai vì lifetime của biến đã kết thúc. Với tiến trình ngắn hạn, kernel thu hồi toàn bộ address space khi process kết thúc; với server chạy lâu, leak tích lũy có thể làm cạn tài nguyên. Dù vậy, dọn ownership rõ ràng vẫn giúp code dễ kiểm tra và tái sử dụng.

## API cấp phát khác với memory mapping

Allocator quản lý object nhỏ; `mmap` thường ánh xạ vùng page và có thể map file/anonymous memory. Runtime có thể dùng `mmap` bên dưới allocator. Hai API có lifetime, alignment và semantics khác nhau.

Các hàm `brk`/`sbrk` là giao diện thấp cấp mà một số allocator dùng để mở rộng heap; ứng dụng thông thường không nên gọi trực tiếp vì có thể xung đột với allocator đang quản lý cùng vùng. `mmap` phù hợp cho các trường hợp ánh xạ vùng độc lập hoặc file, nhưng cần tuân thủ riêng cách căn trang, quyền và giải phóng mapping.

## Thực hành: tìm lỗi lifetime

Tạo các ví dụ nhỏ có null dereference, leak, ghi vượt cuối mảng, đọc sau `free` và gọi `free` với pointer không hợp lệ. Dùng debugger để xem vị trí lỗi và một công cụ phân tích bộ nhớ như AddressSanitizer hoặc Valgrind để phát hiện các lớp lỗi khác nhau. Sau đó viết vector động dùng `realloc`, xử lý trường hợp cấp phát thất bại mà không làm mất pointer cũ, rồi kiểm tra lại leak và truy cập ngoài biên.

Chạy thử có thể minh họa lỗi nhưng không làm undefined behavior trở nên dự đoán được; kết quả chạy một lần không chứng minh chương trình an toàn.

## Tóm tắt

- Dynamic allocation cần ownership/lifetime rõ.
- `free` làm pointer cũ không còn an toàn; pointer alias cũng dangling.
- `realloc` có thể di chuyển; xử lý failure và pointer cũ đúng.
- Tính kích thước cấp phát phải chống integer overflow.
- malloc allocator và VM page mapping là hai tầng khác nhau.

## Tự kiểm tra

**`free(p)` đặt mọi bản sao pointer thành NULL?** Không.

**`realloc` luôn giữ địa chỉ cũ?** Không; vùng có thể di chuyển.

**Cấp phát thành công nghĩa mọi page đã chiếm RAM?** Không nhất thiết; overcommit/demand paging có thể hoãn cấp vật lý.

## Đọc tiếp

Allocator cần chọn block và gộp vùng trống; xem các chiến lược free-space management.

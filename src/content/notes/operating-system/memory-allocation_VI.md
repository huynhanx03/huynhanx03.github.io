---
title: "Cấp phát bộ nhớ: allocator quản lý vùng trống ra sao?"
category: "Operating System"
tags: ["memory", "allocator", "heap"]
description: "Khám phá free list, kích thước cấp phát, fragmentation và những chi phí ẩn của allocation."
updated: 2026-10-16
translationKey: "operating-system/memory-allocation"
---

Khi chương trình yêu cầu một vùng nhớ, runtime hoặc allocator cần tìm chỗ phù hợp, đánh dấu vùng đó đang được dùng và trả địa chỉ cho caller. Khi vùng được giải phóng, allocator phải ghi nhận nó có thể dùng lại. Đây là một phần của quản lý heap; nó khác với ánh xạ page ảo sang frame mà kernel/MMU xử lý.

## Từ yêu cầu của chương trình tới khối bộ nhớ

Chương trình có thể yêu cầu một số byte tùy ý, nhưng allocator thường quản lý các block theo size class, alignment hoặc slab. Cấp phát 17 byte có thể tiêu thụ nhiều hơn 17 byte vì metadata, căn chỉnh và cách làm tròn. Con số cụ thể phụ thuộc allocator và runtime.

Allocator có thể lấy một vùng lớn từ kernel rồi chia nhỏ để phục vụ nhiều yêu cầu. Vì thế, một lần `malloc` không nhất thiết dẫn tới system call; nhiều lần cấp phát nhỏ có thể được xử lý ở user space từ vùng đã có. Khi cần thêm vùng hoặc thu hồi, allocator tương tác với kernel bằng cơ chế phù hợp hệ thống.

## Free list và lựa chọn block

Một mô hình dạy học là free list: danh sách các khối đang trống. Khi cần `n` byte, thuật toán tìm block vừa đủ hoặc lớn hơn, tách phần dư nếu đáng làm, rồi ghi metadata. Các chiến lược như first fit hoặc best fit giúp thảo luận đánh đổi, nhưng allocator sản xuất thường dùng cấu trúc chuyên biệt, cache theo luồng và nhiều vùng quản lý.

Tách block quá nhỏ có thể tạo nhiều mảnh khó dùng; giữ block lớn làm tăng lãng phí nội bộ. Khi hai block trống liền nhau, gộp chúng có thể giảm phân mảnh, nhưng không phải mọi block trống đều liền nhau.

## Hai kiểu phân mảnh

**External fragmentation** xảy ra khi tổng dung lượng trống lớn nhưng nằm trong nhiều khoảng rời rạc, không đáp ứng yêu cầu lớn. **Internal fragmentation** là phần thừa bên trong block đã cấp, chẳng hạn làm tròn tới size class.

Ví dụ, nếu allocator quản lý các khối 16 byte và chương trình xin 18 byte, có thể phải cấp khối 32 byte; 14 byte còn lại bên trong block không thể cấp riêng theo cấu trúc đó. Đây là minh họa, không phải khẳng định mọi allocator dùng size class 16 byte.

## Cấp phát, vòng đời và an toàn

Allocator không biết đối tượng nào còn được chương trình dùng nếu ngôn ngữ yêu cầu giải phóng tường minh; caller phải đảm bảo không dùng sau khi free và không giải phóng lặp. Runtime có GC lại dựa vào reachable object để thu hồi, nhưng vẫn có thể giữ vùng đã giải phóng để tái sử dụng thay vì trả ngay cho hệ điều hành.

Vị trí heap hay stack không tự quyết định tốc độ. Một heap allocation có thể rẻ nếu dùng fast path và object chết nhanh; stack frame có thể lớn hoặc gây áp lực cache. Cần đo thời gian cấp phát, khối lượng object sống và chi phí GC/allocator trước khi tối ưu.

## Khi nào vùng nhớ quay về hệ điều hành?

Allocator thường giữ một phần vùng trống để phục vụ yêu cầu sau, giảm chi phí xin trang mới. Do đó, giải phóng object không đồng nghĩa RSS của tiến trình giảm ngay. Một vùng lớn có thể chỉ trả về kernel khi điều kiện bố trí và chính sách allocator cho phép; vùng nằm giữa các object còn sống khó trả riêng.

RSS là lượng trang resident mà tiến trình đang dùng theo cách đo của hệ điều hành; nó không đơn giản là tổng kích thước object hữu ích. Khi điều tra memory leak, xem cả heap profile, object còn reachable, page resident và hành vi allocator.

## Tóm tắt

- Allocator phục vụ yêu cầu object và quản lý vùng trống; kernel quản lý ánh xạ trang vật lý.
- Một yêu cầu cấp phát không nhất thiết gọi kernel mỗi lần.
- Metadata, alignment và size class làm dung lượng tiêu thụ khác số byte được xin.
- Fragmentation và vòng đời ảnh hưởng khả năng tái sử dụng/thu hồi.
- Free object có thể vẫn nằm trong vùng allocator giữ lại nên RSS chưa giảm.

## Tự kiểm tra

**Gọi `free` đảm bảo RAM lập tức được trả về hệ điều hành?** Không. Allocator có thể giữ vùng để tái sử dụng.

**Mọi allocation động đều chậm vì system call?** Không. Nhiều cấp phát được phục vụ từ vùng allocator đã nhận.

**Heap lớn chứng minh có memory leak?** Chưa. Cần phân biệt object còn sống, cache hợp lệ, vùng allocator giữ lại và trang resident.

## Đọc tiếp

Xem [stack và heap](/vi/notes/operating-system/stack_vs_heap/) để phân biệt vòng đời dữ liệu với vị trí cấp phát; bài đó dùng ví dụ Go.

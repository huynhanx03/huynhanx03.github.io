---
title: "Paging và page table: ánh xạ bộ nhớ theo từng trang"
category: "Operating System"
tags: ["memory", "paging", "page table"]
description: "Theo dõi cách chia địa chỉ thành page number và offset, rồi ánh xạ trang ảo sang frame vật lý."
updated: 2026-10-16
translationKey: "operating-system/paging-page-tables"
---

Nếu ánh xạ từng byte ảo sang từng byte vật lý, bảng ánh xạ sẽ khổng lồ. Paging chia không gian địa chỉ thành các khối có kích thước cố định gọi là **page**; RAM vật lý cũng chia thành các **frame** cùng kích thước. Bảng trang ánh xạ page ảo sang frame vật lý.

Page và frame có cùng kích thước, nhưng là hai khái niệm khác nhau: page thuộc không gian địa chỉ ảo; frame là vị trí trong RAM. Kích thước trang do kiến trúc/hệ điều hành hỗ trợ quyết định, không nên giả định chỉ có một kích thước.

## Tách địa chỉ thành số trang và offset

Giả sử minh họa dùng page 4 KiB = 4096 byte. Offset trong trang cần 12 bit vì `2^12 = 4096`. Địa chỉ ảo được hiểu như:

```text
virtual address = virtual page number | offset
```

MMU tra virtual page number trong page table để tìm frame tương ứng. Offset giữ nguyên vì vị trí bên trong page được bảo toàn:

```text
page table[virtual page number] = physical frame number
physical address = physical frame number | offset
```

Ví dụ, nếu một page ảo ánh xạ tới frame vật lý 20 và offset là 37, byte cần truy cập nằm ở offset 37 trong frame 20. Đây là minh họa số học; địa chỉ thật còn phụ thuộc độ rộng địa chỉ và cách phân trang của CPU.

## Page table chứa gì?

Một **page-table entry (PTE)** thường có số frame và các bit điều khiển, ví dụ trang có hiện diện trong RAM không, được đọc/ghi/thực thi không, có thể truy cập ở user mode không, và một số trạng thái như accessed/dirty. Bộ bit cụ thể khác nhau theo kiến trúc.

PTE có thể biểu diễn một trang chưa resident hoặc một ánh xạ đặc biệt. Kernel thiết lập và thay đổi bảng trang; phần cứng dùng nó khi thực thi. Nếu PTE không cho phép thao tác, CPU phát sinh page fault/protection fault để kernel xử lý.

Trong mô hình bảng tuyến tính đơn giản, phần cứng lấy VPN từ địa chỉ, rồi tính vị trí PTE bằng `page-table base + VPN × sizeof(PTE)`. PTE hợp lệ cung cấp frame để ghép với offset. PTE invalid thường có nghĩa địa chỉ đó không thuộc vùng được map; PTE hợp lệ nhưng quyền không cho phép thao tác thì gây lỗi bảo vệ. Trên kiến trúc thật, bit và cách phân loại fault chi tiết hơn, nhưng hai trường hợp này giúp hiểu vì sao không phải mọi lỗi địa chỉ đều cùng một loại.

Bảng trang trong RAM cũng tạo chi phí thời gian: nếu không có cache translation, một lần truy cập dữ liệu cần đọc PTE trước rồi mới đọc/ghi dữ liệu. Instruction fetch cũng cần translation. TLB được thêm vào để cache các ánh xạ dùng gần đây; khi TLB hit, không cần đọc PTE từ RAM cho từng reference.

## Bảng trang nhiều cấp giải quyết vấn đề kích thước

Không gian địa chỉ rộng khiến một bảng phẳng có entry cho mọi page tiêu tốn nhiều RAM, kể cả vùng chưa dùng. Nhiều kiến trúc dùng page table nhiều cấp: cấp trên trỏ tới các bảng con, chỉ tạo nhánh cần thiết. Điều này tiết kiệm chỗ cho không gian thưa nhưng làm việc tra cứu phức tạp hơn.

Một địa chỉ có thể được chia thành nhiều trường index:

```text
index cấp 1 | index cấp 2 | ... | page offset
```

MMU lần theo cấu trúc đó để lấy PTE cuối. Số cấp và độ rộng từng index phụ thuộc kiến trúc; hệ điều hành có thể hỗ trợ page lớn để giảm số entry trong một số workload.

## Nội bộ không đồng nghĩa tốn RAM như kích thước ảo

Paging loại bỏ external fragmentation trong cách cấp frame cố định kích thước: một tiến trình không cần các frame liền nhau. Nhưng trang cuối của một vùng có thể còn byte chưa dùng, tạo internal fragmentation. Page table cũng tiêu thụ RAM, và việc cấp page không có nghĩa toàn bộ phần cuối trang được chương trình sử dụng.

Mặt khác, ánh xạ vật lý rời rạc vẫn có thể dùng địa chỉ ảo liên tục. Đây là điểm giúp kernel và allocator trình bày vùng nhớ tiện dụng dù RAM vật lý phân bố phức tạp.

## Quyền trang bảo vệ code và dữ liệu

Kernel có thể cho một vùng chỉ đọc hoặc không thực thi. Ví dụ, mã chương trình thường không cần quyền ghi; stack thường không cần quyền thực thi theo chính sách bảo vệ hiện đại. Quyền cụ thể phụ thuộc nền tảng và cấu hình.

Khi chương trình ghi vào page chỉ đọc, lỗi bảo vệ giúp ngăn hành vi sai hoặc truy cập trái phép. Cơ chế copy-on-write là trường hợp đặc biệt: hai tiến trình tạm chia sẻ trang chỉ đọc; khi một bên ghi, kernel tạo bản sao riêng rồi cập nhật ánh xạ.

## Tóm tắt

- Paging ánh xạ các page ảo thành frame vật lý có cùng kích thước.
- Địa chỉ chia thành số trang và offset; ánh xạ thay đổi phần số trang, giữ nguyên offset.
- PTE chứa frame cùng quyền và trạng thái cần thiết.
- Page table nhiều cấp tiết kiệm chỗ cho không gian địa chỉ thưa.
- Paging tránh yêu cầu vùng vật lý liên tục nhưng vẫn có chi phí bảng trang và internal fragmentation.

## Tự kiểm tra

**Page và frame là cùng một đối tượng?** Không. Page là khối ảo; frame là khối RAM vật lý.

**Paging đảm bảo không có lãng phí bộ nhớ nào?** Không. Trang cuối có thể chưa dùng hết và page table cũng tốn chỗ.

**Offset có bị thay đổi khi dịch địa chỉ?** Không; MMU tìm frame tương ứng rồi giữ vị trí bên trong trang.

## Đọc tiếp

Page table nhiều cấp vẫn phải được tra nhanh. Bài [TLB và dịch địa chỉ](/vi/notes/operating-system/tlb-address-translation/) giải thích cache chuyên dụng cho các ánh xạ gần đây.

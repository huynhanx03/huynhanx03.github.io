---
title: "Kích thước page table và ánh xạ địa chỉ thưa"
category: "Operating System"
tags: ["memory", "page table", "paging", "address space"]
description: "Tính chi phí page table phẳng và hiểu multi-level table, huge page cùng không gian địa chỉ thưa."
updated: 2026-10-17
translationKey: "operating-system/page-table-size-and-multilevel"
---

Page table phẳng có một entry cho mọi virtual page trong không gian được hỗ trợ. Với địa chỉ 32-bit và page 4 KiB, có `2^32 / 2^12 = 2^20` page. Nếu mỗi PTE 4 byte, một bảng liên tục cần 4 MiB cho mỗi process, kể cả phần lớn address space chưa dùng.

Con số trên là minh họa giả định, không mô tả mọi CPU/OS. Với địa chỉ 64-bit, không gian khả dụng lớn hơn nhiều và cấu trúc phẳng sẽ càng lãng phí.

## Multi-level page table

Chia chỉ số virtual page thành các trường theo cấp. Trong ví dụ hai cấp, page directory entry (PDE) cho biết bảng con tương ứng có tồn tại và nằm ở frame nào; các entry trong bảng con (PTE) mới cho biết page ảo ánh xạ tới frame nào và với quyền gì. Nếu PDE không hợp lệ thì không có bảng con cần tra. Nếu PDE hợp lệ, phần index còn lại chọn PTE. Bit valid ở PDE vì thế nói rằng có ít nhất một PTE hợp lệ trong vùng bảng con; nó không thay cho bit valid của từng PTE.

Bảng con thường được chia sao cho mỗi mảnh vừa một page vật lý. Ví dụ minh họa: địa chỉ 14-bit có page 64 byte nên offset chiếm 6 bit, còn VPN 8 bit. Nếu mỗi PTE 4 byte, page table tuyến tính có 256 entry (1 KiB), tức 16 page table pages. Chia VPN thành 4 bit directory index và 4 bit table index cho phép directory trỏ tới từng page bảng con; nếu chỉ code, heap và stack ở hai đầu đang dùng, hệ thống chỉ cần giữ những mảnh bảng chứa mapping đó cùng directory, thay vì đủ 16 trang liên tiếp.

Không gian sparse tiết kiệm nhiều metadata và bảng con có thể đặt ở các frame bất kỳ, nhưng page walk phức tạp hơn. TLB hit vẫn trả mapping trực tiếp; khi miss, bảng hai cấp cần đọc PDE rồi PTE, nhiều hơn một lần đọc so với bảng tuyến tính. Càng nhiều cấp càng tiết kiệm được vùng bảng không dùng nhưng tăng công tra cứu khi miss. Đây là đánh đổi thời gian–không gian.

Đổi lại, page walk có thể phải đọc nhiều cấp bảng. TLB cache translation gần đây; hardware page walker và page-walk cache giảm chi phí trên kiến trúc hỗ trợ. Cache miss đồng thời ở các cấp làm truy cập chậm.

## Huge pages

Page lớn gom nhiều vùng thành mapping lớn hơn, giảm số PTE và TLB pressure. Đánh đổi là cấp phát/compact khó hơn, fragmentation tăng và granularity protection/CoW lớn hơn. Transparent huge pages có policy kernel tự chọn; explicit huge pages yêu cầu application/admin quản lý.

## Kernel mapping và chia sẻ bảng

Kernel có thể dùng một số mapping chung ở nhiều address space để chuyển vào kernel hiệu quả, với quyền bảo vệ phù hợp. Process có thể chia sẻ page table mapping thư viện hoặc shared memory. COW/fork có thể chia sẻ page ban đầu rồi copy khi ghi.

## Các cách tổ chức khác

Một số hệ thống lịch sử kết hợp segmentation và paging: mỗi segment có page table riêng, còn base/bounds của segment trỏ tới và giới hạn bảng đó. Điều này loại bỏ entry cho khoảng trống lớn giữa code, heap và stack, nhưng giữ giả định phân chia address space theo segment; heap thưa bên trong một segment vẫn có thể lãng phí, và page table có kích thước biến đổi gây lại external fragmentation.

Inverted page table đảo chiều tổ chức: giữ một bảng chung với một entry cho mỗi frame vật lý, entry ghi process/address space và virtual page đang chiếm frame đó. Cấu trúc này giảm metadata phụ thuộc số virtual page, nhưng tìm mapping từ địa chỉ ảo khó hơn; thường cần hash lookup thay vì quét tuyến tính. Page table cũng cần RAM. Một số thiết kế có thể đưa page table của process đang không chạy ra storage; kernel phải đưa chúng trở lại RAM trước khi process được chạy. Đây không phải bước thay page thường gặp trong mỗi lần truy cập bộ nhớ; xem [ghi chú bài giảng về paging](https://cs.nyu.edu/~gottlieb/courses/2000s/2009-10-fall/os2250/lectures/lecture-11.html).

### Bài thực hành: lần theo page walk

Với mỗi cấu hình, tính số bit offset từ page size, số bit VPN còn lại, số PTE chứa được trong một page bảng (page size chia kích thước PTE), rồi chia VPN thành index của các cấp. Sau đó tự lần một địa chỉ qua directory và bảng con, kiểm tra kết quả bằng một page-table simulator nếu có. So sánh một, hai và ba cấp: mỗi cấp thêm điều kiện nào để tiếp tục walk, bao nhiêu cấp có thể được bỏ qua khi PDE không hợp lệ, và có bao nhiêu bảng con cần cấp cho một address space chỉ dùng code/heap/stack ở vài vùng. Một walk sâu hơn làm TLB miss đắt hơn; nó không làm mỗi truy cập chậm như vậy khi đã có TLB hit.

## Tóm tắt

- Page table phẳng tiêu tốn entry ngay cả cho address space thưa.
- Multi-level table chỉ tạo bảng con cho vùng được dùng, đổi lại page-walk sâu hơn.
- PDE trỏ tới mảnh page table; PTE ánh xạ page cụ thể sang frame và quyền.
- Inverted page table tiết kiệm metadata theo frame vật lý nhưng cần tra cứu ngược hiệu quả.
- TLB/page-walk cache giảm chi phí dịch lặp lại.
- Huge page giảm translation pressure nhưng tăng granularity và fragmentation.
- Mapping chung có quyền riêng; chia sẻ không có nghĩa cho mọi process quyền ghi.
- Tính số entry/page và tách VPN thành index giúp kiểm tra từng bước của page walk.

## Tự kiểm tra

**Không gian địa chỉ 64-bit làm page table phẳng rẻ hơn?** Ngược lại, số page tiềm năng rất lớn.

**Huge page luôn giảm memory usage?** Nó giảm metadata nhưng có thể lãng phí data page.

**TLB thay page table?** Không; nó cache một phần kết quả dịch.

## Đọc tiếp

Page table cho biết mapping nhưng kernel còn phải quyết định trang nào resident và xử lý swap.

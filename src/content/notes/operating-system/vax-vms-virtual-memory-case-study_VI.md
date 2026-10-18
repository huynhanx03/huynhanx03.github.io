---
title: "Case study VAX/VMS: page fault, working set và backing store"
category: "Operating System"
tags: ["memory", "virtual memory", "case study", "vms"]
description: "Dùng thiết kế VAX/VMS lịch sử để thấy paging policy, working set và crash recovery gắn với nhau ra sao."
updated: 2026-10-16
translationKey: "operating-system/vax-vms-virtual-memory-case-study"
---

Một case study lịch sử hữu ích không phải để học lệnh VAX đang dùng hằng ngày, mà để xem nguyên lý paging vận hành khi bị ràng buộc bởi kiến trúc cụ thể. VAX/VMS kết hợp phần cứng dịch địa chỉ, working set theo process và backing store để quản lý RAM hữu hạn.

## Address space và phần cứng VAX

VAX-11 dùng địa chỉ ảo 32-bit và page 512 byte, nên địa chỉ gồm VPN 23-bit và offset 9-bit. Hai bit cao của VPN chọn một trong ba vùng:

- **P0**: vùng process thấp, chứa chương trình và heap; vùng này phát triển về địa chỉ cao hơn.
- **P1**: vùng process cao, chứa stack người dùng; stack phát triển về địa chỉ thấp hơn, hướng về P0.
- **S**: system space chứa kernel code/data được bảo vệ và dùng chung trong address space của các process.

Page 0 của user space không được map. Một null pointer có giá trị địa chỉ 0; lần truy cập sẽ tìm page 0 invalid, trap vào kernel và thường làm process nhận lỗi. Guard page như vậy giúp phát hiện lỗi con trỏ sớm.

Mỗi process có page table riêng cho P0 và P1. Thanh ghi base của segment trỏ đến page table; bounds cho biết số entry hợp lệ. Vùng S được map chung, nên khi context switch kernel đổi các thanh ghi P0/P1 theo process mới nhưng giữ mapping hệ thống. PTE có quyền bảo vệ để user mode không thể đọc/ghi tùy tiện vùng kernel. Vì page table người dùng nằm trong kernel virtual memory, page table của P0/P1 cũng có thể bị paging khi áp lực RAM cao; việc dịch một địa chỉ có thể cần truy cập system page table trước khi lần tới page table người dùng, còn TLB giúp tránh phần lớn chuỗi tra cứu đó.

## Working set theo process

Mỗi process có **resident set size (RSS)** tối đa: số page được phép giữ trong RAM. Khi vượt giới hạn, VMS lấy page cũ nhất khỏi FIFO riêng của process. Chính sách FIFO đơn thuần không biết trang nào vừa được truy cập, nhưng nó không cần hardware reference bit — điều quan trọng với VAX, vì PTE của VAX không có bit này.

Để giảm page-in tốn kém của FIFO, VMS đưa page vừa rời resident set vào một trong hai danh sách toàn cục second chance: danh sách page sạch và danh sách page bẩn. Process khác cần frame có thể lấy page sạch từ đầu danh sách; page sạch có thể bỏ vì nội dung gốc còn trên file. Nếu process sở hữu page fault lại trước khi page bị cấp cho process khác, nó có thể thu hồi page từ danh sách và tránh đọc đĩa. Kích thước các danh sách second-chance ảnh hưởng độ gần của segmented FIFO với LRU.

Chỉ nhìn kích thước address space không nói được RAM cần ngay. Locality theo thời gian quyết định subset page đang hoạt động.

## Backing store và page-in/page-out

Trang code/file-backed có thể đọc lại từ file; trang anonymous bẩn cần nơi giữ nội dung khi không resident. Hệ thống tổ chức swap/backing storage để nạp lại khi fault. VAX dùng page 512 byte, nhỏ hơn kích thước I/O hiệu quả của đĩa; do đó các page bẩn được gom thành đợt ghi lớn. Grouping giảm số lần I/O nhỏ và tận dụng tốt hơn thiết bị lưu trữ.

Vì không có hardware reference bit, VMS có thể xấp xỉ mức độ sử dụng bằng cách tạm đánh dấu page không truy cập được trong PTE, đồng thời giữ quyền thật trong metadata của kernel. Lần process chạm page sẽ trap; kernel nhận ra page vốn hợp lệ, khôi phục quyền và xem trap đó là bằng chứng page vừa được dùng. Cách này tạo overhead trên lần chạm đầu sau mỗi chu kỳ, nên phải cân bằng giữa lấy mẫu thường xuyên và chi phí trap.

Nếu workload liên tục thay đổi working set lớn hơn RAM, paging tăng và CPU làm ít công việc ứng dụng — thrashing. Chính sách admission/working set phải cân bằng throughput toàn hệ với latency từng process.

## Tối ưu trì hoãn: demand-zero và copy-on-write

Khi mở rộng heap, kernel không cần cấp và zero page ngay. Với **demand-zero**, kernel chỉ ghi nhận vùng mới như một page chưa truy cập; lần đọc/ghi đầu tiên mới gây trap để lấy frame, xóa sạch nội dung cũ vì lý do bảo mật, rồi map vào process. Nếu chương trình không bao giờ chạm page đó, công cấp phát được tránh hoàn toàn.

Với **copy-on-write (COW)**, hai address space ban đầu có thể cùng map một page chỉ đọc. Nếu chỉ đọc thì không cần copy. Khi một bên ghi, protection fault báo cho kernel; kernel cấp page mới, copy nội dung và đổi mapping của bên ghi sang bản riêng. `fork()` dùng ý tưởng này để tránh sao chép ngay toàn bộ address space, nhất là khi process sớm gọi `exec()` và thay phần lớn nội dung bằng chương trình mới.

## Bài học thiết kế

- Address translation và page fault là cơ chế; policy working set/replacement quyết định cách dùng.
- Segmented FIFO giới hạn RSS theo process, rồi cho page second chance qua danh sách sạch/bẩn toàn cục.
- Backing source khác nhau cho code, file-mapped và anonymous pages.
- Reference bit có thể được xấp xỉ bằng protection trap, nhưng phải cân bằng độ chính xác và overhead.
- Demand-zero và COW trì hoãn cấp/copy page đến khi có truy cập thật.
- Batch/cluster I/O có thể tăng throughput nhưng không xóa độ trễ.
- Kiến trúc CPU giới hạn page table và quyền mà OS có thể dùng.
- Case study lịch sử giúp thấy nguyên lý, không nên sao chép policy vào kernel hiện đại.

## Tóm tắt

- VAX/VMS minh họa policy working-set trong hệ virtual memory thực.
- Resident set cần điều chỉnh theo locality và memory pressure.
- Page source quyết định có cần swap write hay file read.
- Thrashing là vấn đề tổng nhu cầu working set vượt RAM.
- Cơ chế và policy cần được tách khi phân tích hệ thống.

## Tự kiểm tra

**Process có 1 GiB address space luôn cần 1 GiB RAM?** Không; chỉ subset resident cần thiết phải ở RAM.

**Page fault luôn phải đọc swap?** Không; có thể zero-fill hoặc đọc từ file/cache.

**VMS dùng LRU chính xác?** Không. Nó dùng segmented FIFO và second-chance lists, một thiết kế phù hợp với phần cứng thiếu reference bit và nhu cầu giới hạn RSS.

**Thuật toán VMS lịch sử là policy tối ưu cho Linux hiện nay?** Không; workload/phần cứng/kernel khác.

## Đọc tiếp

Đối chiếu lịch sử triển khai với [Levy và Lipman, “Virtual Memory Management in the VAX/VMS Operating System”](https://pages.cs.wisc.edu/~swift/classes/cs736-fa06/papers/vax-vms.pdf), rồi kết nối các cơ chế với [page replacement và thrashing](/vi/notes/operating-system/page-replacement-and-thrashing/).

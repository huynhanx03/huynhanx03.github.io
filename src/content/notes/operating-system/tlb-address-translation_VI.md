---
title: "TLB: tăng tốc dịch địa chỉ ảo"
category: "Operating System"
tags: ["memory", "tlb", "paging", "mmu"]
description: "Hiểu translation lookaside buffer, TLB miss, context switch và vì sao locality ảnh hưởng dịch địa chỉ."
sources:
  - title: "Linux kernel documentation: Process Addresses"
    url: "https://docs.kernel.org/mm/process_addrs.html"
updated: 2026-10-17
translationKey: "operating-system/tlb-address-translation"
---

Page table cho phép dịch địa chỉ ảo nhưng có thể cần nhiều lần đọc bộ nhớ để lần theo từng cấp. Nếu mỗi lần lấy một lệnh lại phải tra bảng trang từ RAM, chính hoạt động dịch địa chỉ sẽ thêm độ trễ đáng kể.

CPU thường dùng **Translation Lookaside Buffer (TLB)**, một cache nhỏ giữ các ánh xạ địa chỉ ảo sang frame vừa dùng. TLB không thay page table; nó lưu kết quả tra cứu gần đây để MMU tìm nhanh hơn.

## TLB hit và TLB miss

Khi có địa chỉ ảo:

1. MMU kiểm tra TLB theo các phần địa chỉ liên quan, như virtual page number và định danh không gian địa chỉ.
2. Nếu tìm thấy entry hợp lệ và quyền phù hợp (**TLB hit**), MMU có thể lấy frame mà không lần lại page table trong RAM.
3. Nếu không có (**TLB miss**), phần cứng có thể đi bộ page table hoặc trap vào kernel, tùy kiến trúc.
4. Sau khi tìm ánh xạ, entry có thể được đưa vào TLB để lần truy cập sau dùng lại.

TLB miss không đồng nghĩa dữ liệu không có trong RAM. Nó có thể chỉ là ánh xạ chưa được cache trong TLB. Ngược lại, page fault có thể xảy ra nếu page chưa resident hoặc quyền không hợp lệ. Phân biệt hai loại này rất quan trọng khi đọc số liệu hiệu năng.

## TLB locality

TLB dựa vào hai dạng locality. **Temporal locality**: trang vừa dùng có khả năng sớm được dùng lại, như vòng lặp lặp lại trên cùng vùng dữ liệu. **Spatial locality**: sau khi đọc một địa chỉ, chương trình thường sớm truy cập địa chỉ gần nó; một mảng liên tiếp tận dụng điều này vì nhiều phần tử cùng page. Ví dụ, mảng 10 số nguyên 4 byte bắt đầu ở offset 4 của trang 16 byte sẽ chạm ba page: lần đầu của mỗi page miss, các phần tử tiếp theo trong page hit. Nếu lặp lại vòng quét khi các mapping còn trong TLB, các truy cập có thể hit hết.

Nhưng nếu working set gồm nhiều page hơn TLB giữ được, entry liên tục bị thay thế; tỷ lệ miss tăng. Số page mà TLB có thể bao phủ vì thế ảnh hưởng hiệu năng của truy cập ngẫu nhiên. Page lớn có thể tăng coverage, đổi lại fragmentation và granularity quản lý lớn hơn.

Khi cài entry mới, TLB phải thay một entry cũ. LRU tận dụng ý tưởng entry lâu không dùng có thể ít cần hơn; random đơn giản và đôi khi tránh các mẫu truy cập xấu của LRU (chẳng hạn xoay tuần tự qua nhiều page hơn số entry một đơn vị).

## Ai xử lý TLB miss?

Tùy kiến trúc, hardware có thể tự đi bộ page table rồi nạp mapping vào TLB, hoặc phát sinh exception để kernel xử lý. Với software-managed TLB, handler tra page table, ghi entry bằng lệnh đặc quyền rồi quay lại chạy lại chính instruction gây miss. Đây là điểm khác với system call thông thường, vốn tiếp tục từ instruction sau trap. Handler phải tránh tự gây miss lặp đi lặp lại; một số kiến trúc dành mapping/entry cố định cho mã và dữ liệu handler.

TLB entry thường giữ VPN, PFN, quyền truy cập và một số bit trạng thái; TLB nhỏ fully associative có thể so sánh VPN song song với các entry. Valid bit của TLB cho biết entry cache có thể được dùng hay không. Ở nhiều kiến trúc, present/valid bit của PTE cho biết page hiện có ánh xạ dùng được trong RAM; kernel còn giữ metadata vùng địa chỉ (VMA trên Linux) để quyết định địa chỉ đó có hợp lệ với process hay không. Tên bit và ý nghĩa chi tiết thay đổi theo kiến trúc, nên không nên đồng nhất một bit “valid” ở TLB với tính hợp lệ của toàn vùng địa chỉ ([Linux: Process Addresses](https://docs.kernel.org/mm/process_addrs.html)).

Một vòng lặp quét vùng nhớ rất lớn có thể chạm nhiều trang dù mỗi lần đọc một phần tử. Kích thước page lớn có thể giảm số page cần ánh xạ, song có đánh đổi về fragmentation, khả năng cấp phát và quản lý. Không có lựa chọn tối ưu chung cho mọi workload.

## TLB và context switch

Hai tiến trình có thể dùng cùng địa chỉ ảo nhưng ánh xạ khác nhau. Giải pháp đơn giản là flush TLB khi đổi page table/context; tiến trình mới sẽ chịu cold misses khi chạm các page. ASID cho phép gắn entry với định danh address space để nhiều tiến trình cùng giữ mapping trong TLB, miễn phần cứng chọn đúng ASID hiện hành. Các mapping chia sẻ code có thể trỏ tới cùng physical frame dù VPN của mỗi tiến trình khác nhau.

Điều này tạo một phần chi phí cho context switch, nhưng không nên suy rằng mọi lần chuyển tiến trình sẽ xóa toàn bộ cache và TLB. Cơ chế hiện đại phức tạp hơn mô hình đơn giản “switch xong thì mọi thứ lạnh”.

## TLB và chi phí bộ nhớ thực tế

Hiệu năng truy cập phụ thuộc cả cache dữ liệu và dịch địa chỉ. Một lần truy cập có thể hit TLB nhưng miss cache dữ liệu; hoặc miss TLB nhưng page vẫn nằm trong RAM. Phần mềm profiling có thể cung cấp bộ đếm cho TLB, cache và page fault, nhưng tên và cách diễn giải cần đối chiếu với tài liệu bộ xử lý.

Nếu chương trình chậm, đừng kết luận ngay “thiếu RAM” từ một chỉ số đơn lẻ. Xem tổng thể resident set, page fault, cache/TLB miss, CPU utilization và mẫu truy cập trước khi thay page size hoặc cấu trúc dữ liệu.

## Thực hành: quan sát working set của TLB

Tạo một vùng nhớ lớn, chạm một phần tử ở mỗi page rồi lặp lại phép truy cập đủ lâu để thời gian đo ổn định. Tăng dần số page được chạm và vẽ thời gian trung bình theo working set. Một điểm tăng chi phí có thể gợi ý TLB cấp nào đó đã quá tải, nhưng không trực tiếp cho biết dung lượng entry chính xác.

Khởi tạo vùng nhớ trước khi đo để giảm nhiễu do demand-zero/page fault; đảm bảo compiler không xóa vòng lặp; pin thread vào một CPU nếu mục tiêu là so sánh trên cùng TLB; lặp nhiều lần và ghi nhận độ dao động. Cache, prefetch, page size, frequency scaling và nhiều tầng TLB đều ảnh hưởng kết quả, nên benchmark minh họa xu hướng chứ không thay tài liệu CPU hay performance counter.

## Tóm tắt

- TLB cache các ánh xạ địa chỉ, giúp tránh tra lại page table thường xuyên.
- TLB miss khác page fault: một bên là thiếu entry cache, bên kia liên quan trạng thái/quyền page.
- Locality của các page ảnh hưởng hit rate của TLB.
- Context switch cần phân biệt không gian địa chỉ, nhưng không luôn xóa sạch mọi trạng thái.
- Cache dữ liệu và TLB là các tầng khác nhau; cần đo đúng loại sự kiện.

## Tự kiểm tra

**TLB miss có nghĩa trang đã bị đẩy ra khỏi RAM?** Không. Ánh xạ có thể chỉ vắng khỏi TLB.

**TLB hit bảo đảm dữ liệu nằm trong L1 cache?** Không. TLB cache ánh xạ; cache dữ liệu giữ nội dung bộ nhớ.

**Tăng kích thước page luôn làm chương trình nhanh hơn?** Không. Nó có thể giảm áp lực TLB nhưng tăng lãng phí và ảnh hưởng cấp phát.

## Đọc tiếp

Sau khi hiểu dịch địa chỉ, ta xem chuyện gì xảy ra khi page hợp lệ nhưng chưa resident: [Demand paging và page fault](/vi/notes/operating-system/demand-paging-page-faults/).

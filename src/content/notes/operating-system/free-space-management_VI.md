---
title: "Free-space management: fit, split và coalesce"
category: "Operating System"
tags: ["memory", "allocator", "fragmentation", "free list"]
description: "So sánh first fit, best fit, splitting, coalescing và cách alignment ảnh hưởng allocator."
updated: 2026-10-16
translationKey: "operating-system/free-space-management"
---

Allocator phải tìm vùng trống đủ lớn cho yêu cầu, ghi nhận vùng đã cấp và tái sử dụng khi caller giải phóng. Cấu trúc quản lý free space quyết định tốc độ tìm kiếm, phân mảnh và metadata overhead.

## First fit và best fit

First fit tìm từ đầu danh sách tới block đầu tiên đủ lớn; đơn giản nhưng có thể để lại nhiều mảnh nhỏ gần đầu. Best fit tìm block nhỏ nhất vẫn đủ; nó cố giảm phần dư cho một allocation nhưng cần tìm sâu và có thể tạo mảnh rất nhỏ khó dùng.

Worst fit lấy block trống lớn nhất rồi giữ phần dư lớn; dù nghe có vẻ tránh mảnh vụn, cách này thường vừa tốn công quét toàn danh sách vừa cho kết quả phân mảnh kém. Next fit tiếp tục tìm từ vị trí lần trước để tránh dồn các mảnh nhỏ ở đầu danh sách. Với first fit, giữ free list theo địa chỉ có thể giúp tìm neighbor để coalesce dễ hơn.

Segregated lists dành các danh sách riêng cho kích thước thường gặp. Slab allocator là biến thể dùng nhiều trong kernel: cache các kiểu object thường dùng (như inode hoặc lock), lấy slab từ allocator tổng quát khi cần và trả slab về khi các object bên trong không còn dùng. Một số slab allocator giữ object đã giải phóng ở trạng thái khởi tạo để tránh lặp lại chi phí khởi tạo/hủy.

Buddy allocator bắt đầu từ vùng có kích thước lũy thừa hai, chia đôi đệ quy tới block nhỏ nhất vẫn chứa được yêu cầu. Khi free, nó kiểm tra block buddy cùng kích thước; nếu cả hai đều trống thì gộp, rồi tiếp tục kiểm tra ở cấp lớn hơn. Quan hệ địa chỉ có cấu trúc này làm coalescing nhanh và dễ xác định, nhưng cấp phát theo bậc hai có thể lãng phí phần bên trong block (internal fragmentation).

Không có heuristic tốt nhất cho mọi phân phối kích thước/vòng đời. Quét linked list có thể chậm khi danh sách lớn; allocator nâng cao dùng cây cân bằng hoặc cấu trúc khác và đánh đổi độ phức tạp để tăng tốc hoặc mở rộng tốt trên workload đa luồng.

## Split và coalesce

Nếu block trống lớn hơn yêu cầu, allocator có thể split thành block cấp phát và block dư. Khi block được free, coalescing gộp các free neighbor để tạo vùng lớn. Coalescing tức thời đơn giản cho allocation kế tiếp, nhưng metadata/layout có chi phí.

API `free(ptr)` không nhận kích thước, nên allocator phải suy ra kích thước từ metadata gắn với block. Một cách phổ biến là đặt header ngay trước vùng trả về cho chương trình. Header có thể giữ kích thước và giá trị kiểm tra; khi `free` nhận con trỏ, allocator lùi lại tới header, kiểm tra metadata rồi đưa toàn bộ block — gồm cả header — trở lại vùng trống. Vì vậy yêu cầu `N` byte thường cần một block lớn hơn `N`.

Free list không nhất thiết nằm trong một vùng metadata riêng. Khi block đã trống, chính phần bộ nhớ trống có thể chứa các liên kết `next` và kích thước của node. Nhờ vậy allocator không cần gọi lại `malloc` để cấp phát node cho danh sách đang quản lý heap. Khi block được cấp phát, allocator tách phần cần dùng (kể cả header) khỏi free chunk; khi `free`, nó nối block lại vào danh sách. Nếu chỉ nối mà không nhập các vùng địa chỉ kề nhau, heap có thể trông như còn nhiều mảnh nhỏ dù tổng dung lượng trống đủ lớn. Coalescing khôi phục các vùng liền kề thành extent lớn hơn.

Trong các allocator thực tế, boundary tag hoặc metadata tương đương giúp xác định neighbor; cách bố trí cụ thể thay đổi theo allocator. Metadata hỏng do ghi tràn có thể làm allocator lỗi hoặc tạo lỗ hổng an toàn bộ nhớ.

## Alignment và size class

Một số kiểu dữ liệu cần alignment để CPU truy cập đúng/hiệu quả; allocator làm tròn size/alignment và lưu metadata. Size class giúp tìm nhanh nhưng phần dư trong block là internal fragmentation. Các block được phân phối trong arena/page, nên giải phóng object nhỏ không đồng nghĩa trả page cho kernel.

## Đánh giá allocator

Đo allocation rate, latency percentile, fragmentation, memory resident và số object sống trên workload. Một microbenchmark lặp cùng size có thể chỉ đo fast path; workload thật có size/lifetime đa dạng hơn.

### Bài thực hành: quan sát free list

Giữ cùng một chuỗi cấp phát/giải phóng rồi đổi first fit, best fit và worst fit. Ghi lại block được chọn, phần dư sau split và số lần phải quét danh sách; sau đó đổi thứ tự free list giữa theo địa chỉ và theo kích thước. Tiếp theo chạy chuỗi dài hơn với coalescing bật/tắt, đồng thời tăng tỷ lệ block đang được giữ. Quan sát vì sao cùng tổng dung lượng trống nhưng một yêu cầu lớn vẫn thất bại khi vùng trống bị phân mảnh. Kết quả phụ thuộc trace và cách sắp danh sách, nên một lần chạy không chứng minh policy nào tốt nhất nói chung.

## Tóm tắt

- Fit policy quyết định block trống nào được chọn.
- Split tận dụng block lớn; coalesce gộp neighbor trống.
- Size class/alignment đánh đổi tốc độ với internal fragmentation.
- Free object có thể chưa trả page về kernel.
- Benchmark cần phản ánh kích thước và lifetime thật.
- So sánh allocator bằng cùng trace, nhưng đổi fit policy, thứ tự danh sách và coalescing.

## Tự kiểm tra

**Best fit luôn giảm tổng fragmentation?** Không; mảnh nhỏ vẫn có thể tích lũy và scan tốn chi phí.

**Coalesce gộp mọi block trống trên heap?** Chỉ những vùng liên tiếp và compatible theo allocator.

**Free object nhỏ làm RSS giảm ngay?** Không nhất thiết.

## Đọc tiếp

Ở cấp kernel, page table cũng cần quản lý dung lượng hiệu quả cho địa chỉ thưa.

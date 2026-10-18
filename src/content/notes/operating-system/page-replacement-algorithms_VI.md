---
title: "Page replacement: OPT, FIFO, LRU và Clock"
category: "Operating System"
tags: ["memory", "page replacement", "lru", "paging"]
description: "Mô phỏng chuỗi page reference để so sánh fault count và trade-off của các chính sách thay trang."
updated: 2026-10-16
translationKey: "operating-system/page-replacement-algorithms"
---

Giả sử có 3 frame và reference string `1, 2, 3, 1, 4, 1, 2`. Mỗi lần page không resident là fault; khi đầy, policy chọn trang bị thay. Ví dụ giúp thấy thuật toán ảnh hưởng fault count, nhưng workload thực có locality và page size phức tạp hơn.

RAM có thể được xem như cache của các page ảo. Mục tiêu thường là giảm miss/page fault, nhưng fault cần đọc từ storage thường đắt hơn truy cập page đang resident rất nhiều. Mô hình kỳ vọng đơn giản là `E[T] = P(hit) × T_hit + P(fault) × T_fault`, trong đó `T_hit` và `T_fault` là tổng thời gian phục vụ có điều kiện cho từng trường hợp. Vì `T_fault` thường lớn, tỷ lệ fault nhỏ vẫn có thể chi phối thời gian trung bình. Đây chỉ là mô hình giản lược: fault có thể được xử lý không cần storage, và chi phí còn phụ thuộc tầng backing cùng trạng thái hệ thống.

## OPT

OPT thay page sẽ được dùng xa nhất trong tương lai. Với chuỗi ví dụ, trước khi cần page 4, frame giữ 1,2,3; tương lai sau đó dùng 1,2 nhưng không dùng 3, nên OPT thay 3. OPT là lower bound để so sánh, không triển khai được vì kernel không biết tương lai. Khi báo hit rate của thuật toán thực, so với OPT trên cùng chuỗi giúp biết còn cách biệt bao xa.

## FIFO

FIFO thay page được nạp lâu nhất. Nó đơn giản nhưng page cũ có thể vẫn được dùng thường xuyên. FIFO có thể gặp Belady anomaly: tăng số frame đôi khi làm fault count tăng với một số chuỗi.

Một chuỗi tham chiếu page được phân tích qua ba loại miss thường gặp trong nghiên cứu cache: **compulsory/cold-start** là lần đầu chạm page; **capacity** xảy ra vì số frame không đủ giữ tập đang dùng; **conflict** trong cache phần cứng do giới hạn vị trí theo set. Page cache của OS thường fully associative nên không gặp conflict miss theo nghĩa set-associative này. FIFO không có stack property: tăng sức chứa có thể làm số miss tăng (Belady anomaly); LRU có stack property nên số page được giữ với N frame là tập con của tập giữ với N+1 frame.

## LRU và Clock

LRU thay page ít được dùng gần đây, tận dụng temporal locality. Exact LRU cần cập nhật thứ tự mỗi memory reference, không chỉ lúc fault; làm việc này quá thường xuyên có thể tốn đáng kể. Clock xấp xỉ LRU bằng vòng frame và reference bit: page vừa được dùng được “second chance”, bit xóa rồi tiếp tục quét tới page có bit 0. Random và FIFO đôi khi chống được mẫu tuần tự xoay qua N+1 page khi cache chứa N page tốt hơn LRU, nên policy cần được xem theo workload chứ không chỉ theo trực giác.

Clock có thể xét thêm dirty bit. Page sạch thường có thể bỏ và đọc lại từ nguồn; page bẩn cần ghi ra trước khi frame được tái dùng. Vì vậy policy đôi khi ưu tiên page chưa được dùng gần đây và sạch, rồi mới chọn page bẩn nếu cần.

Page replacement là policy chọn nạn nhân; hệ điều hành còn có policy khi nào nạp page. Demand paging đợi lần truy cập đầu tiên, còn prefetching nạp trước khi cần dựa trên dự đoán locality. Đoán sai sẽ tốn I/O và bộ nhớ. Gom các lần ghi page bẩn thành batch có thể giảm chi phí thiết bị lưu trữ.

## Đếm fault đúng cách

Kết quả phụ thuộc số frame ban đầu, quy tắc nạp, có tính fault lần đầu hay không và chuỗi reference. Thay một biến trong chương trình có thể chạm nhiều page. Fault count không trực tiếp bằng thời gian vì page source, cache, device và concurrency khác nhau.

## Thực hành: chính sách nào hợp với chuỗi nào?

Tạo hai chuỗi tham chiếu có cùng độ dài: một chuỗi chọn page gần như ngẫu nhiên, chuỗi còn lại lặp lại một nhóm page nhỏ rồi thỉnh thoảng chuyển sang nhóm khác. Chạy mỗi chuỗi với FIFO, LRU, Clock và OPT; giữ nguyên trace, chỉ đổi policy hoặc số frame. Ghi fault count thành bảng, sau đó vẽ số fault theo số frame.

Khi đọc kết quả, kiểm tra ba điều: OPT có làm mốc dưới lý tưởng không; FIFO có xuất hiện Belady anomaly trên trace nào không; và LRU/Clock có tận dụng được reuse trong trace có locality không. Thử thay đổi kích thước nhóm page thường dùng để quan sát working set tăng thì cần thêm frame ra sao. Không kết luận từ một trace duy nhất: chính chuỗi truy cập quyết định policy nào có lợi.

## Tóm tắt

- OPT là lower bound lý tưởng; FIFO dễ cài nhưng không xét locality.
- LRU tận dụng recency, Clock xấp xỉ với reference bit.
- Belady anomaly là phản ví dụ cho FIFO khi tăng frame.
- Fault count cần assumptions rõ.
- Runtime latency phụ thuộc nguồn page và tầng I/O.

## Tự kiểm tra

**LRU luôn ít fault hơn FIFO với mọi chuỗi?** Không có kết luận từ mọi thuật toán; so theo chuỗi cụ thể.

**OPT dùng được trong kernel?** Không biết reference tương lai.

**Ít page fault hơn luôn đồng nghĩa nhanh hơn?** Không nhất thiết; chi phí fault khác nhau.

## Đọc tiếp

Nếu working set vượt RAM, policy tốt vẫn không tránh được thrashing.

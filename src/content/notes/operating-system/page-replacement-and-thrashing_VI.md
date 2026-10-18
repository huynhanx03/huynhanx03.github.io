---
title: "Page replacement, swap và thrashing"
category: "Operating System"
tags: ["memory", "page replacement", "swap", "thrashing"]
description: "Hiểu kernel chọn trang nào để thay, khi nào ghi trang ra swap và vì sao thiếu working set gây thrashing."
updated: 2026-10-17
translationKey: "operating-system/page-replacement-and-thrashing"
---

RAM hữu hạn, còn tổng working set của các tiến trình có thể lớn hơn RAM. Khi cần frame mới, kernel phải quyết định trang nào nên rời khỏi bộ nhớ. **Page replacement** chọn nạn nhân; nếu page chứa dữ liệu đã bị sửa và không thể phục hồi từ nguồn khác, nội dung có thể cần ghi ra swap hoặc backing store.

## Trang sạch và trang bẩn

Trang sạch chưa bị sửa so với nguồn phục hồi, chẳng hạn file gốc. Kernel có thể bỏ bản resident và đọc lại sau. Trang bẩn chứa thay đổi chưa được ghi về backing store — có thể là file/page cache hoặc swap. Trước khi tái sử dụng frame, kernel phải bảo toàn nội dung bằng cách ghi ra backing store hoặc dùng cơ chế khác; điều này không đồng nghĩa dữ liệu đã bền qua mất điện.

Bit dirty giúp theo dõi trạng thái ghi, nhưng chi tiết quản lý cache file và writeback phụ thuộc kernel/filesystem. Swap là một phần của chiến lược bộ nhớ ảo, không phải phép cộng đơn giản khiến máy có tốc độ RAM lớn hơn.

## Chính sách thay trang và locality

Thuật toán lý tưởng OPT loại trang sẽ không được dùng lâu nhất trong tương lai, nhưng kernel không biết tương lai. Các chính sách thực tế xấp xỉ dựa trên lịch sử sử dụng, tuổi trang, working set và áp lực toàn hệ thống.

LRU là mô hình hữu ích: trang ít được dùng gần đây có thể ít cần sớm. Tuy nhiên, triển khai LRU chính xác cho mọi truy cập tốn chi phí; hệ thống thường dùng biến thể hoặc tín hiệu xấp xỉ. Clock/second chance là ví dụ giáo dục về việc dùng bit referenced để tránh loại trang vừa dùng.

Hiệu quả của replacement phụ thuộc **locality**. Nếu tiến trình luân phiên giữa hai vùng dữ liệu lớn hơn RAM dành cho nó, bất kỳ chính sách nào cũng có thể phải nạp/loại trang liên tục. Không thuật toán thay trang nào biến working set vượt quá tài nguyên thành truy cập nhanh.

## Working set và thrashing

Working set là tập page mà tiến trình đang cần tích cực trong một khoảng thời gian. Nếu tổng nhu cầu resident của các tiến trình vượt RAM khả dụng, chúng có thể liên tục gây fault để nạp page rồi lại đẩy page khác ra. Máy dành nhiều thời gian cho paging thay vì công việc ứng dụng — đó là **thrashing**.

Một phản ứng khả dĩ là admission control: giảm số tiến trình chạy đồng thời hoặc tạm hoãn một phần tải để working set của nhóm còn lại vừa bộ nhớ. Một số hệ thống dùng phản ứng khác như OOM killer để giảm áp lực nhanh, nhưng chọn và kết thúc tiến trình có thể làm hỏng trải nghiệm hoặc công việc đang chạy. Không có policy thay trang nào tự giải quyết được tình trạng tổng working set vượt RAM lâu dài.

Dấu hiệu có thể gồm page fault và I/O paging tăng, độ trễ cao, trong khi CPU utilization giảm hoặc dao động. Không phải mọi máy dùng swap đều thrashing: swap có thể chứa page ít dùng trong lúc ứng dụng vẫn hoạt động tốt.

## Swap không phải RAM thứ hai có cùng đặc tính

Swap cho kernel nơi lưu tạm page anonymous khi áp lực bộ nhớ tăng. Thiết bị lưu trữ chậm hơn RAM nhiều bậc về latency, nên thường xuyên phải đọc lại từ swap có thể làm tương tác rất chậm. Tốc độ thật phụ thuộc thiết bị, workload, nén bộ nhớ và chính sách kernel.

Tắt swap không luôn giải quyết vấn đề; khi thiếu RAM, kernel vẫn cần thu hồi trang, có thể kết thúc tiến trình hoặc làm hệ thống kém ổn định. Dung lượng swap phù hợp tùy workload và mục tiêu (ví dụ hibernation cần điều kiện riêng), không có một tỷ lệ vàng chung.

## Chẩn đoán có thứ tự

1. Xác định máy chậm toàn cục hay chỉ một tiến trình.
2. Xem memory available, RSS, page fault và swap-in/swap-out theo thời gian.
3. Kiểm tra workload có tăng đột biến hoặc memory leak không.
4. Tìm tiến trình đang giữ nhiều trang hoặc tạo áp lực lớn.
5. Điều chỉnh tải, giới hạn tài nguyên hoặc dung lượng sau khi hiểu nguyên nhân.

Các công cụ Linux hiển thị số liệu khác nhau; một snapshot đơn lẻ không nói được xu hướng. Cần quan sát trong đúng khoảng thời gian vấn đề xảy ra.

## Tóm tắt

- Page replacement chọn trang để giải phóng frame.
- Trang bẩn cần được bảo toàn về backing store trước khi frame được tái sử dụng; điều đó chưa chắc đã bền qua mất điện.
- Swap hỗ trợ lưu page ít hoạt động nhưng không có tốc độ của RAM.
- Thrashing xảy ra khi hệ thống liên tục chuyển trang do working set không vừa tài nguyên.
- Có swap không đồng nghĩa có vấn đề; cần xem page-in/page-out và độ trễ.

## Tự kiểm tra

**Máy có swap là đang thiếu RAM trầm trọng?** Không nhất thiết; có thể chứa trang ít dùng.

**LRU chính xác luôn là chính sách kernel sử dụng?** Không. Đó là mô hình; hệ thống thực dùng chính sách/heuristic tùy implementation.

**Thêm swap có làm workload truy cập ngẫu nhiên nhanh như tăng RAM không?** Không; swap giúp sức chứa và khả năng xử lý áp lực, nhưng truy cập lưu trữ có latency khác RAM.

## Đọc tiếp

Nối với [demand paging và page fault](/vi/notes/operating-system/demand-paging-page-faults/) để xem kernel xử lý một lần chạm trang cụ thể.

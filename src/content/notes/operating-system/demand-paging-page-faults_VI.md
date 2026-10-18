---
title: "Demand paging và page fault: nạp dữ liệu khi cần"
category: "Operating System"
tags: ["memory", "demand paging", "page fault", "virtual memory"]
description: "Theo một page fault hợp lệ từ trap vào kernel tới lúc tiến trình tiếp tục, và phân biệt với truy cập sai."
updated: 2026-10-16
translationKey: "operating-system/demand-paging-page-faults"
---

Không cần nạp toàn bộ dữ liệu của chương trình vào RAM trước khi nó chạy. Hệ điều hành có thể thiết lập không gian địa chỉ rồi chỉ đưa một page vào RAM khi chương trình chạm tới. Cách này gọi là **demand paging**.

Lần đầu truy cập page chưa resident tạo **page fault**. Tên gọi nghe như lỗi, nhưng page fault là một sự kiện phần cứng báo cho kernel; nó có thể là bước bình thường của demand paging hoặc là truy cập vi phạm.

## Đường đi của một page fault hợp lệ

1. CPU phát sinh địa chỉ ảo và MMU phát hiện ánh xạ chưa có trong RAM.
2. CPU dừng luồng thực thi hiện tại và chuyển quyền vào kernel, kèm thông tin về địa chỉ cùng nguyên nhân.
3. Kernel kiểm tra địa chỉ có thuộc vùng hợp lệ và thao tác có đúng quyền không.
4. Nếu hợp lệ, kernel tìm nội dung: có thể tạo trang zero-fill, đọc từ file được ánh xạ hoặc đưa trang từ backing store vào RAM.
5. Kernel cập nhật page table, có thể làm mới trạng thái dịch địa chỉ, rồi cho lệnh gây fault chạy lại.

Nếu địa chỉ không hợp lệ hoặc quyền truy cập sai, kernel không thể sửa bằng cách nạp trang. Nó báo lỗi cho tiến trình, thường dẫn tới signal/exception như segmentation fault trên Unix-like systems. Tên signal không tiết lộ cơ chế paging bên dưới.

## Vì sao cần cho lệnh chạy lại?

Lệnh bị dừng trước khi hoàn tất truy cập bộ nhớ. Sau khi kernel tạo ánh xạ cần thiết, CPU có thể thử lại lệnh như thể việc chờ trang là một phần trong quá trình phục vụ truy cập. Nếu kernel đã ghi trạng thái sai hoặc cho phép tiếp tục trước khi dữ liệu sẵn sàng, chương trình sẽ quan sát kết quả không đúng.

Đây là một ví dụ về hợp đồng giữa phần cứng và hệ điều hành: phần cứng phát hiện điều kiện đặc biệt; kernel quyết định có thể xử lý hay phải báo lỗi; sau đó trạng thái được khôi phục để tiếp tục hoặc kết thúc.

## File-backed và anonymous page

Page có thể gắn với một file: kernel đọc nội dung tương ứng khi cần, và page sạch có thể được nạp lại từ file nếu bị loại khỏi RAM. Vùng anonymous như heap/stack thường không có file gốc; kernel có thể tạo page ban đầu với giá trị zero và dùng swap khi cần lưu tạm nội dung.

Copy-on-write cho phép nhiều tiến trình chia sẻ page ban đầu chỉ đọc. Khi một bên ghi, page fault đặc biệt cho kernel biết cần tạo bản riêng. Fork vì vậy có thể tránh sao chép ngay toàn bộ bộ nhớ; chi phí phát sinh khi page bị sửa.

## Page replacement và trang bẩn

Nếu RAM thiếu chỗ, kernel có thể chọn page ít cần hơn để giải phóng frame. Trang sạch có thể bị bỏ nếu nội dung phục hồi được từ file; trang bẩn phải được ghi lại trước khi frame dùng cho dữ liệu khác. Chính sách thay thế hiện đại xét lịch sử truy cập và nhiều yếu tố khác; không nên hình dung hệ thống luôn dùng một thuật toán LRU lý tưởng đơn giản.

Nếu các tiến trình liên tục cần lại những page vừa bị loại, máy phải đọc/ghi trang quá nhiều. Đây là hiện tượng thrashing: CPU có thể ít làm công việc hữu ích dù hệ thống đang bận I/O bộ nhớ.

## “Có page fault” không đồng nghĩa máy đang lỗi

Một chương trình mới khởi động có thể tạo page fault để nạp code/data theo nhu cầu. Đếm tổng page fault mà không phân biệt minor/major hoặc loại truy cập có thể gây hiểu nhầm. Một fault được phục vụ từ RAM/file cache khác chi phí với việc phải đọc thiết bị lưu trữ.

Khi chẩn đoán chậm, cần xem tần suất và loại fault, lượng RAM, working set và I/O đĩa cùng lúc. Một chương trình có fault ban đầu bình thường; fault liên tục do thiếu RAM mới là dấu hiệu cần điều tra thêm.

## Tóm tắt

- Demand paging nạp hoặc tạo page khi chương trình chạm tới.
- Page fault là trap để kernel xử lý, không mặc định là lỗi chương trình.
- Kernel xác thực vùng/quyền, lấy nội dung, cập nhật ánh xạ rồi tiếp tục hoặc báo lỗi.
- Page có thể gắn với file, anonymous, copy-on-write hoặc cần ghi ra swap.
- Tần suất fault cao có thể gây thrashing; cần phân loại và đo trước khi kết luận.

## Tự kiểm tra

**Mọi page fault đều làm chương trình crash?** Không. Nhiều fault được kernel phục vụ bình thường.

**Copy-on-write có sao chép toàn bộ bộ nhớ ngay khi fork?** Thường không; các page được chia sẻ trước và sao chép khi có ghi theo cơ chế phù hợp.

**Page sạch trong RAM có thể luôn bỏ ngay không?** Nếu có nguồn phục hồi phù hợp thì có thể bỏ, nhưng chính sách chọn trang còn phụ thuộc kernel và workload.

## Đọc tiếp

Tiếp theo trong topic **Memory** là cách hệ điều hành lựa chọn page để giữ lại, dùng swap và nhận biết áp lực bộ nhớ.

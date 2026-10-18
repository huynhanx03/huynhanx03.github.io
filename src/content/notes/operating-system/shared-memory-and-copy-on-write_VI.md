---
title: "Bảo vệ và chia sẻ bộ nhớ: quyền trang, mmap và copy-on-write"
category: "Operating System"
tags: ["memory", "protection", "mmap", "copy-on-write"]
description: "Tìm hiểu quyền đọc/ghi/thực thi, ánh xạ file và cách nhiều tiến trình chia sẻ trang an toàn hơn."
updated: 2026-10-16
translationKey: "operating-system/shared-memory-and-copy-on-write"
---

Không gian địa chỉ riêng cách ly tiến trình, nhưng hệ điều hành đôi khi cần chia sẻ dữ liệu có chủ đích: thư viện dùng chung, vùng giao tiếp giữa tiến trình hoặc file được ánh xạ vào bộ nhớ. Chia sẻ giúp tránh sao chép không cần thiết, song đặt ra câu hỏi ai được đọc, ai được ghi và khi nào thay đổi trở nên nhìn thấy.

## Quyền trang là ranh giới truy cập

Ánh xạ bộ nhớ thường có các quyền như đọc, ghi và thực thi, cùng quyền user/kernel. CPU kiểm tra quyền khi lệnh truy cập. Ánh xạ code chỉ đọc giúp ngăn ghi đè lệnh; vùng dữ liệu không thực thi giảm một lớp rủi ro khi dữ liệu bị diễn giải nhầm thành code.

Quyền trang là một lớp phòng vệ, không phải ranh giới bảo mật duy nhất. Chương trình có lỗi vẫn có thể làm hỏng dữ liệu của chính nó; kernel và phần cứng có thể có lỗ hổng; quyền của file và chính sách process còn tham gia.

## File-backed mapping

`mmap` trên Unix-like systems ánh xạ một phần file vào không gian địa chỉ. Chương trình có thể đọc/ghi vùng đó như bộ nhớ; kernel nạp page theo nhu cầu và quản lý quan hệ với file. Đây là mô hình tiện cho truy cập ngẫu nhiên hoặc chia sẻ, nhưng không có nghĩa toàn file được đọc ngay.

Ý nghĩa của ghi vào mapping phụ thuộc cờ ánh xạ và loại file. Shared mapping có thể chia sẻ thay đổi giữa tiến trình và được ghi lại theo quy tắc hệ thống; private mapping thường tách thay đổi theo copy-on-write. Không nên suy rằng mọi lần ghi đã được lưu bền vững tức thì.

## Copy-on-write

Sau `fork`, parent và child có thể ban đầu cùng ánh xạ những page vật lý với quyền chỉ đọc. Nếu một tiến trình thử ghi, page fault báo rằng cần tách bản sao. Kernel cấp frame mới, sao chép nội dung, cập nhật page table của bên ghi và tiếp tục lệnh.

Lợi ích là tránh sao chép mọi trang ngay khi tạo process. Nếu child sớm `exec` chương trình khác, nhiều trang cũ có thể chưa bao giờ được copy. Chi phí phát sinh theo số trang thực sự bị ghi; workload ghi toàn bộ vùng lớn vẫn phải trả chi phí sao chép.

## Shared memory không đồng nghĩa dữ liệu an toàn

Hai tiến trình cùng ánh xạ một vùng có thể đọc/ghi nhanh mà không cần gửi từng byte qua socket. Nhưng nếu chúng cập nhật cùng cấu trúc đồng thời, vẫn cần giao thức đồng bộ liên tiến trình, atomic operation hoặc lock phù hợp. Mapping không tự tạo thứ tự, tính nguyên tử hay tính nhất quán ở mức nghiệp vụ.

Ngoài ra cần quản lý vòng đời đối tượng chia sẻ, quyền truy cập, kích thước cấu trúc và xử lý khi một bên chết giữa thao tác. Shared memory giảm một số chi phí truyền dữ liệu nhưng tăng yêu cầu thiết kế.

## Tóm tắt

- Quyền trang giới hạn cách user code đọc, ghi hoặc thực thi vùng nhớ.
- File mapping cho phép truy cập nội dung file qua địa chỉ ảo và nạp page theo nhu cầu.
- Copy-on-write trì hoãn sao chép cho tới lần ghi đầu tiên.
- Shared memory không tự cung cấp đồng bộ hay bảo đảm nghiệp vụ.
- Ghi vào mapping không tự chứng minh dữ liệu đã bền vững trên thiết bị.

## Tự kiểm tra

**Private mapping đồng nghĩa kernel không bao giờ đọc dữ liệu từ file?** Không. Nội dung ban đầu vẫn có thể đến từ file; điểm khác là thay đổi ghi được tách theo quy tắc mapping.

**Copy-on-write làm `fork` miễn phí?** Không. Nó trì hoãn một phần chi phí; tạo bảng trang, quản lý tiến trình và các lần ghi vẫn có chi phí.

**Hai process cùng map một vùng thì không cần lock?** Sai nếu có truy cập xung đột; vẫn cần giao thức đồng bộ.

## Đọc tiếp

Các chủ đề về [process và system call](/vi/notes/operating-system/process-model/) sẽ nối cơ chế bộ nhớ với vòng đời tiến trình.

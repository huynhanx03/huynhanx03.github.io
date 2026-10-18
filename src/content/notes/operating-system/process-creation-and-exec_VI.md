---
title: "Tạo process: fork, exec và wait"
category: "Operating System"
tags: ["process", "fork", "exec", "unix"]
description: "Hiểu ba thao tác tạo, thay chương trình và thu nhận kết quả tiến trình trong mô hình Unix."
updated: 2026-10-17
translationKey: "operating-system/process-creation-and-exec"
---

Trong Unix-like systems, tạo process thường được dạy qua ba thao tác: `fork` tạo process con từ trạng thái của parent; `exec` thay image đang chạy bằng chương trình khác; `wait` giúp parent thu nhận trạng thái kết thúc của child. Chúng là các API theo họ Unix, không phải quy tắc của mọi hệ điều hành.

## `fork`: tạo một nhánh thực thi mới

Sau `fork`, parent và child tiếp tục chạy từ điểm sau lời gọi. Chúng nhận giá trị trả về khác nhau để phân biệt vai trò: parent nhận PID child, child nhận 0; lỗi thường được báo riêng. Hai process có không gian địa chỉ logic riêng dù ban đầu nội dung có thể được chia sẻ vật lý nhờ copy-on-write.

File descriptor được kế thừa theo quy tắc hệ điều hành và thường cùng tham chiếu tới open file description, nên offset hoặc trạng thái file có thể được chia sẻ. Đây là chi tiết dễ gây bất ngờ nếu giả định child nhận bản sao độc lập hoàn toàn của mọi tài nguyên.

```c
pid_t pid = fork();
if (pid < 0) {
    /* xử lý lỗi */
} else if (pid == 0) {
    /* child */
} else {
    /* parent: pid là PID child */
}
```

Đây là mã C minh họa, cần header và xử lý lỗi đúng trong chương trình thật. Sau `fork`, không nên giả định thứ tự chạy giữa parent và child nếu không có đồng bộ.

Nếu process có nhiều thread, child chỉ giữ lại thread gọi `fork`; trạng thái mutex do thread khác giữ có thể bị sao chép thành trạng thái khóa mà child không thể tự mở. Theo POSIX, trước khi gọi `exec`, child chỉ nên gọi các hàm async-signal-safe. Vì vậy đoạn giữa `fork` và `exec` cần rất ngắn; xem [`fork(2)`](https://man7.org/linux/man-pages/man2/fork.2.html).

## `exec`: thay image chương trình

Nhóm hàm `exec` nạp executable mới vào process hiện tại. PID thường giữ nguyên; code, dữ liệu và không gian địa chỉ được thay bằng image mới. Nếu `exec` thành công, nó không quay về dòng lệnh cũ. Nếu thất bại, hàm trả lỗi để chương trình hiện tại xử lý.

Kết hợp thường gặp là child `fork` rồi `exec` để chạy lệnh khác. Shell có thể thiết lập pipe, chuyển hướng file descriptor, rồi để child thực thi chương trình mục tiêu. Cách này tách việc dựng process khỏi việc chọn executable.

## `wait`: parent thu nhận kết quả

Khi child kết thúc, kernel giữ một lượng thông tin tối thiểu để parent biết trạng thái thoát. Parent gọi `wait`/`waitpid` để thu nhận thông tin đó; nếu chưa sẵn sàng, lời gọi có thể chờ. Process kết thúc nhưng chưa được parent thu nhận thường được gọi là zombie — nó không còn chạy và không giữ toàn bộ không gian địa chỉ như process sống.

Parent không bắt buộc phải chờ ngay. Có thể xử lý các công việc khác rồi thu nhận child sau. Nếu parent kết thúc trước, hành vi tái gán child phụ thuộc hệ điều hành và cơ chế quản lý tiến trình.

## Vì sao API này hữu ích?

Tách `fork`, cấu hình tài nguyên, `exec` và `wait` cho phép shell kết hợp chương trình, pipeline và chuyển hướng. Mỗi child có thể nhận file descriptor đã được chuẩn bị trước khi image mới bắt đầu. Hệ điều hành vẫn cần kiểm tra quyền thực thi, môi trường và giới hạn tài nguyên.

### Bài thực hành: nối các API thành một pipeline

Viết chương trình nhỏ tạo child bằng `fork`, gọi một biến thể `exec` trong child và thu nhận trạng thái bằng `waitpid` ở parent. So sánh danh sách đối số truyền theo mảng với dạng truyền từng đối số; xác minh `exec` thành công thì child không chạy tiếp đoạn code cũ. Sau đó mở file trước `fork` để quan sát hai process kế thừa descriptor và cùng tham chiếu trạng thái mở; thêm đồng bộ để phân biệt thứ tự được bảo đảm với thứ tự tình cờ. Cuối cùng tạo hai child, nối `pipe` vào stdout/stdin và đóng các đầu pipe không dùng ở từng process, nếu không EOF có thể không tới. Đây là các phép thử để hiểu semantics Unix; chi tiết lỗi, buffering và API khả dụng phụ thuộc hệ điều hành/runtime.

Trên hệ thống khác, tạo process có thể qua API một bước hoặc cơ chế khác. Ngôn ngữ runtime cũng có thể cung cấp abstraction riêng. Khi viết code đa nền tảng, dùng API được runtime hỗ trợ thay vì giả định semantics Unix.

## Tóm tắt

- `fork` tạo child và parent tiếp tục độc lập sau điểm gọi.
- Copy-on-write có thể tránh sao chép ngay toàn bộ nội dung bộ nhớ.
- `exec` thay chương trình đang chạy trong process hiện tại; thành công thì không return.
- `wait` thu nhận trạng thái child đã kết thúc.
- File descriptor và tài nguyên kế thừa có semantics cần kiểm tra.
- `waitpid` chọn child cụ thể; pipe ghép output/input giữa process qua file descriptor.

## Tự kiểm tra

**`exec` tạo PID mới?** Thông thường không; nó thay image trong process hiện tại.

**Parent và child chạy theo thứ tự cố định sau `fork`?** Không nếu không có đồng bộ.

**Zombie là process đang tiếp tục chạy nền?** Không. Nó đã kết thúc; kernel giữ trạng thái chờ được thu nhận.

## Đọc tiếp

Khi nhiều process cùng sẵn sàng, scheduler quyết định ai dùng CPU. Bài tiếp theo xây dựng các mục tiêu lập lịch.

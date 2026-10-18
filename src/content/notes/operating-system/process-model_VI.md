---
title: "Process: chương trình đang chạy và trạng thái của nó"
category: "Operating System"
tags: ["process", "operating system", "resource management"]
description: "Phân biệt chương trình với process, theo dõi trạng thái tiến trình và vai trò của process control block."
updated: 2026-10-16
translationKey: "operating-system/process-model"
---

Một tệp thực thi nằm trên đĩa là chương trình tĩnh. Khi hệ điều hành tạo một môi trường thực thi cho chương trình đó, ta có **process**: một đơn vị đang chạy với trạng thái CPU, không gian địa chỉ, quyền hạn và các tài nguyên liên quan.

Cùng một tệp có thể được chạy nhiều lần thành nhiều process. Mỗi process có thể có dữ liệu và luồng thực thi riêng, dù một số trang code chỉ đọc có thể được chia sẻ vật lý để tiết kiệm RAM.

## Process gồm những gì?

Ở mức khái niệm, process có:

- trạng thái CPU cần để tiếp tục, như program counter và thanh ghi;
- không gian địa chỉ cùng ánh xạ bộ nhớ;
- danh tính, quyền truy cập và thông tin lập lịch;
- tài nguyên đang mở như file descriptor và socket;
- một hay nhiều thread thực thi.

Kernel giữ metadata cần để quản lý process, thường được gọi chung là process control block (PCB) trong mô hình giáo khoa. Tên cấu trúc và nơi lưu thật tùy kernel. PCB không nhất thiết chứa toàn bộ nội dung RAM của process; nó giữ thông tin điều khiển và tham chiếu tới tài nguyên.

## Cơ chế và chính sách

Một cơ chế trả lời “làm thế nào”: ví dụ context switch lưu trạng thái thread này rồi khôi phục trạng thái thread khác. Chính sách trả lời “chọn ai”: ví dụ scheduler chọn runnable process nào tiếp theo. Tách hai phần giúp thay thuật toán lập lịch mà không phải viết lại cơ chế chuyển CPU.

## Các trạng thái phổ biến

Một sơ đồ đơn giản:

```text
New → Ready → Running → Exit
         ↑       ↓
         └── Blocked
```

- **New:** đang được tạo.
- **Ready:** đủ điều kiện chạy nhưng đang chờ CPU.
- **Running:** đang được một CPU thực thi.
- **Blocked/Waiting:** chờ sự kiện như I/O, khóa hoặc dữ liệu.
- **Exit:** đã kết thúc; kernel còn có thể giữ một ít thông tin để parent thu nhận trạng thái.

Trong Unix, process mới thường bắt đầu ở trạng thái tạo ban đầu rồi trở thành runnable. Khi kết thúc, nó có thể ở trạng thái zombie trong lúc kernel giữ exit status chờ parent gọi `wait`; zombie không còn chạy và không giữ toàn bộ address space.

Hệ thống thật có thêm trạng thái và phân biệt chi tiết. Một process có thể có nhiều thread; mỗi thread có trạng thái chạy riêng, còn nhiều tài nguyên được chia sẻ ở cấp process.

## Vì sao process đang chạy lại bị dừng?

Process có thể tự nhường CPU khi chờ I/O hoặc khóa. Timer interrupt cho kernel cơ hội thu hồi CPU sau một khoảng chạy, để một process không chiếm bộ xử lý mãi. Lỗi nghiêm trọng hoặc tín hiệu cũng có thể làm tiến trình dừng/kết thúc.

Khi process chuyển từ running sang ready, kernel lưu trạng thái cần thiết để sau này tiếp tục. Nếu nó chờ sự kiện, kernel đánh dấu blocked và chỉ đưa trở lại ready khi sự kiện phù hợp xảy ra. Process blocked không thể chạy chỉ vì CPU đang rảnh: nó còn thiếu sự kiện cần thiết.

### Bài thực hành: theo dấu process chạy và chờ I/O

Vẽ trace theo từng bước cho hai process: một process chạy vài lệnh CPU, process kia phát yêu cầu I/O rồi chờ. Với mỗi thời điểm, ghi process nào đang running, ready hay blocked và khi nào thiết bị hoàn tất I/O. Sau đó đổi thứ tự tạo process; so sánh policy “chỉ đổi process khi process hiện tại kết thúc” với “đổi ngay khi nó chờ I/O”, rồi đổi xem process vừa hoàn tất I/O có chạy lại tức thì hay xếp sau process đang chạy. Đo cả thời gian hoàn tất và khoảng CPU bị bỏ trống. Bài tập này cho thấy state transition quyết định cơ hội overlap CPU/I/O; trace cụ thể còn phụ thuộc scheduler và thời điểm hoàn tất thiết bị.

## Process và thread

Process thường là ranh giới tài nguyên và bảo vệ; thread là luồng thực thi có trạng thái CPU riêng. Các thread trong cùng process thường chia sẻ không gian địa chỉ và file descriptor, nên trao đổi dữ liệu thuận tiện nhưng cần đồng bộ khi đọc/ghi chung.

Hai process thường cách ly địa chỉ với nhau hơn; giao tiếp cần cơ chế như pipe, socket hoặc shared memory. Mô hình process/thread cụ thể thay đổi giữa hệ điều hành; không nên suy rằng mọi thread ánh xạ một-một với một thực thể kernel nếu chưa biết runtime.

## Tóm tắt

- Chương trình là nội dung tĩnh; process là môi trường thực thi đang được quản lý.
- Kernel theo dõi trạng thái CPU, bộ nhớ, danh tính, quyền và tài nguyên.
- Cơ chế thực hiện thao tác; chính sách chọn quyết định như process nào được chạy.
- Ready chờ CPU; blocked chờ sự kiện khác.
- Exit status có thể được giữ tới khi parent thu nhận child.
- Timer và interrupt giúp hệ điều hành lấy lại quyền điều khiển.
- Khi một process block vì I/O, chạy process khác có thể che thời gian thiết bị đang làm việc.
- Process thường là ranh giới tài nguyên; thread là luồng thực thi bên trong.

## Tự kiểm tra

**Process blocked có được scheduler chọn chạy ngay không?** Không, trước tiên sự kiện chờ phải hoàn thành và đưa nó về trạng thái sẵn sàng.

**Hai lần chạy cùng chương trình có phải cùng một process?** Không; thông thường đó là hai process với trạng thái thực thi riêng.

**Mỗi process chỉ có một thread?** Không. Process có thể chứa nhiều thread.

## Đọc tiếp

Để xin dịch vụ từ kernel, process dùng system call. Bài kế tiếp giải thích ranh giới user mode/kernel mode.

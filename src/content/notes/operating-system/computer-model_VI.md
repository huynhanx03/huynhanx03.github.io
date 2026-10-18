---
title: "Máy tính hoạt động như thế nào: từ chương trình đến phần cứng"
category: "Operating System"
tags: ["computer architecture", "operating system", "fundamentals"]
description: "Theo một chương trình qua các lớp phần mềm và phần cứng để hiểu hệ điều hành đứng ở đâu."
updated: 2026-10-16
translationKey: "operating-system/computer-model"
---

Khi bấm chạy một chương trình, ta chỉ thấy một việc đơn giản: cửa sổ mở ra, dữ liệu xuất hiện. Bên dưới là nhiều thành phần phối hợp: chương trình được lưu thành tệp, hệ điều hành nạp nó vào bộ nhớ, CPU thực hiện lệnh, còn thiết bị lưu trữ và màn hình nhận các yêu cầu vào/ra.

Muốn học hệ điều hành, trước tiên cần có một bản đồ chung. Ta sẽ đi từ phần mềm mà người dùng nhìn thấy xuống tới các thành phần vật lý, rồi quay lại xem hệ điều hành kết nối hai phía ra sao.

## Một chương trình đi qua nhiều lớp

Hãy hình dung một ứng dụng đọc tệp và in kết quả:

```text
Người dùng
   ↓ yêu cầu mở tệp
Ứng dụng
   ↓ thư viện và system call
Hệ điều hành / kernel
   ↓ driver và bộ điều khiển thiết bị
SSD, RAM, CPU, màn hình
```

Ứng dụng không cần biết SSD được cấu tạo từ loại chip nhớ nào. Nó yêu cầu hệ điều hành mở một đường dẫn và đọc một số byte. Kernel kiểm tra quyền truy cập, tìm dữ liệu qua filesystem, yêu cầu driver làm việc với bộ điều khiển lưu trữ, rồi đưa dữ liệu vào bộ nhớ để chương trình sử dụng.

Các lớp giúp mỗi phần có một hợp đồng tương đối ổn định. Chương trình gọi `read`, không trực tiếp điều khiển điện áp của chip SSD. Driver biết cách nói chuyện với thiết bị; filesystem tổ chức tên và nội dung tệp; kernel phân xử quyền truy cập và chia sẻ tài nguyên. Lớp trừu tượng làm giảm số chi tiết mà mỗi thành phần phải hiểu, nhưng không làm các chi phí bên dưới biến mất.

## Phần cứng cung cấp tài nguyên, không tự quyết định cách dùng

CPU thực hiện các lệnh máy. RAM giữ dữ liệu và lệnh đang được dùng. Thiết bị lưu trữ giữ dữ liệu lâu hơn khi tắt máy. Thiết bị mạng chuyển dữ liệu giữa máy này và máy khác. Mỗi loại có tốc độ, cách truy cập, giới hạn và lỗi riêng.

Một máy hiện đại có thể có nhiều lõi CPU, nhiều mức cache, nhiều thiết bị lưu trữ và nhiều tiến trình cùng chạy. Phần cứng cung cấp khả năng chạy song song, nhưng chương trình và hệ điều hành phải phối hợp để dùng chúng. Nếu hai tiến trình cùng ghi vào một vùng dữ liệu mà không có quy tắc đồng bộ, phần cứng nhanh hơn không làm kết quả trở nên đúng.

## Hệ điều hành là người quản lý và người cung cấp giao diện

Hệ điều hành có hai vai trò liên quan:

1. **Quản lý tài nguyên:** chia thời gian CPU, bộ nhớ, thiết bị và dữ liệu giữa nhiều chương trình.
2. **Cung cấp trừu tượng:** cho chương trình giao diện nhất quán để tạo tiến trình, cấp phát bộ nhớ, đọc tệp và giao tiếp.

Kernel là phần lõi chạy với quyền cao, có thể truy cập và điều khiển nhiều tài nguyên phần cứng. Các chương trình bình thường chạy ở user mode với quyền hạn hẹp hơn. Khi cần một thao tác được bảo vệ, chương trình yêu cầu kernel qua system call. Chuyển sang kernel không có nghĩa toàn bộ ứng dụng biến thành kernel; kernel xử lý yêu cầu rồi trả quyền điều khiển về chương trình.

Hệ điều hành không nhất thiết là toàn bộ những gì ta gọi là “môi trường máy tính”. Shell, giao diện đồ họa, công cụ quản trị và thư viện có thể là chương trình riêng chạy phía trên kernel. Ranh giới cụ thể tùy hệ thống, nhưng phân biệt kernel với ứng dụng giúp ta biết thành phần nào đang chịu trách nhiệm.

## Hai ví dụ cho thấy các lớp phối hợp thế nào

### Mở một tệp

Ứng dụng gửi yêu cầu mở đường dẫn. Kernel kiểm tra danh tính và quyền, tra cấu trúc filesystem, rồi yêu cầu thiết bị lưu trữ đọc dữ liệu nếu dữ liệu chưa có trong cache. Khi hoàn tất, ứng dụng nhận một file descriptor để tiếp tục đọc.

Nếu đường dẫn không tồn tại, lỗi được trả về từ lớp filesystem/kernel. Nếu thiết bị lỗi, nguồn lỗi có thể thấp hơn. Cùng một thao tác `open` vì thế che giấu nhiều công việc, nhưng vẫn có thể thất bại vì các điều kiện bên dưới.

### Gửi dữ liệu qua mạng

Ứng dụng đưa byte vào một socket. Kernel đặt dữ liệu vào các cấu trúc mạng, chọn đường đi và giao tiếp với driver của card mạng. Card mạng truyền tín hiệu qua môi trường vật lý. Máy đích xử lý các lớp tương ứng theo chiều ngược lại.

Ứng dụng không tự gửi “một gói IP” chỉ bằng cách gọi hàm ghi. Socket và giao thức giúp thống nhất giao diện, còn kernel cùng thiết bị thực hiện phần lớn công việc vận chuyển.

## Trừu tượng có giới hạn

Giao diện thống nhất không bảo đảm mọi thiết bị giống hệt nhau. Một thao tác đọc tệp có thể rất nhanh nếu dữ liệu nằm trong RAM cache, hoặc chậm nếu phải chờ thiết bị. Một lần ghi có thể chỉ đưa dữ liệu vào bộ đệm, chưa chắc đã tồn tại bền vững trên thiết bị. Một lần gửi dữ liệu không chứng minh máy nhận đã xử lý nó.

Khi chẩn đoán vấn đề, hãy hỏi thao tác đang đi qua lớp nào và bảo đảm nào đã được xác nhận. “Lệnh thành công” có thể chỉ có nghĩa là yêu cầu được chấp nhận, không phải mọi hậu quả đã hoàn tất. Các chủ đề I/O, filesystem và mạng sẽ làm rõ từng trường hợp.

## Tóm tắt

- Chương trình tương tác với phần cứng thông qua nhiều lớp phần mềm.
- Kernel quản lý tài nguyên và cung cấp giao diện được bảo vệ cho ứng dụng.
- Driver chuyển yêu cầu chung thành thao tác phù hợp với thiết bị.
- Trừu tượng giảm phụ thuộc vào chi tiết phần cứng nhưng không xóa chi phí, độ trễ hay lỗi.

## Tự kiểm tra

**Ứng dụng có trực tiếp điều khiển SSD khi gọi hàm đọc tệp không?** Thông thường không. Ứng dụng gọi giao diện hệ điều hành; kernel, filesystem và driver phối hợp với thiết bị.

**Kernel và giao diện desktop có phải một thứ không?** Không nhất thiết. Giao diện desktop thường là các chương trình chạy phía trên kernel.

**Nếu system call trả về thành công thì dữ liệu đã chắc chắn nằm bền vững trên SSD chưa?** Chưa thể kết luận; ý nghĩa chính xác phụ thuộc thao tác và hợp đồng đồng bộ dữ liệu.

## Đọc tiếp

Tiếp theo: [Lệnh máy và ISA](/vi/notes/operating-system/instruction-set-architecture/), rồi đến [CPU thực thi một chương trình](/vi/notes/operating-system/cpu-execution/).

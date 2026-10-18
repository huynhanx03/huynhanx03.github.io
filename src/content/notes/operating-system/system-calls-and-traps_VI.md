---
title: "System call, trap và ranh giới user mode/kernel mode"
category: "Operating System"
tags: ["system call", "kernel", "protection", "process"]
description: "Theo yêu cầu của ứng dụng vào kernel, cách CPU chuyển quyền và vì sao system call không đơn giản là lời gọi hàm."
updated: 2026-10-16
translationKey: "operating-system/system-calls-and-traps"
---

Ứng dụng cần đọc tệp, tạo process hoặc gửi dữ liệu mạng, nhưng không được trực tiếp thao tác tùy ý lên thiết bị và bộ nhớ của máy. **System call** là giao diện có kiểm soát để chương trình yêu cầu kernel thực hiện những dịch vụ đó.

Một lời gọi thư viện như `read()` có thể chuẩn bị tham số rồi đi qua system call tương ứng. API thư viện và system call không nhất thiết là một-một: thư viện có thể kiểm tra dữ liệu, gộp thao tác hoặc dùng cơ chế khác tùy hệ điều hành.

## Chuyển quyền điều khiển

Chương trình user chạy với quyền hạn giới hạn. Khi gọi system call, nó đặt mã dịch vụ và tham số theo ABI rồi thực hiện lệnh trap/syscall được CPU hỗ trợ. CPU chuyển sang kernel mode, chọn điểm vào an toàn và lưu trạng thái để kernel xử lý. Kernel kiểm tra pointer, tham số, danh tính và quyền trước khi truy cập tài nguyên.

Sau khi xử lý, kernel ghi kết quả hoặc lỗi theo quy ước ABI rồi trả quyền về user mode. Ứng dụng không thể tự nâng quyền chỉ bằng cách nhảy tới địa chỉ kernel; phần cứng và cấu hình bảng trang tạo ranh giới bảo vệ.

## System call, trap, interrupt và exception

- **System call:** yêu cầu dịch vụ chủ động từ chương trình.
- **Interrupt:** sự kiện bất đồng bộ, thường từ thiết bị hoặc timer, cần CPU chú ý.
- **Exception/fault:** điều kiện phát sinh khi đang thực thi lệnh, như chia cho zero hoặc page fault.
- **Trap:** thuật ngữ kiến trúc cho cơ chế chuyển điều khiển đặc biệt; cách phân loại chính xác khác nhau giữa tài liệu và ISA.

Các sự kiện đều có thể đưa CPU vào kernel, nhưng nguyên nhân và cách tiếp tục khác nhau. Timer interrupt giúp scheduler lấy lại CPU; page fault cho kernel cơ hội nạp trang hoặc báo lỗi; system call bắt đầu từ yêu cầu của ứng dụng.

## Vì sao system call có chi phí?

Chuyển mode cần lưu/khôi phục trạng thái và chạy logic kernel. Thao tác có thể còn chờ thiết bị hoặc bị lập lịch lại. Tuy nhiên, không nên mặc định mỗi system call đều đắt ngang nhau: system call ngắn có thể hoàn tất nhanh, còn `read` từ thiết bị chậm có thể block. Gộp nhiều thao tác đôi khi giảm overhead, nhưng thay đổi semantics và buffering cũng cần được tính.

Kernel phải kiểm tra dữ liệu đến từ user space. Pointer có thể không hợp lệ hoặc vùng nhớ có thể thay đổi giữa các lần kiểm tra; API kernel cần xử lý an toàn. Điều này giải thích vì sao system call có giới hạn và lỗi rõ ràng thay vì tin mọi tham số từ ứng dụng.

## Lỗi được trả về qua hợp đồng

Nếu file không tồn tại, quyền bị từ chối hoặc socket đã đóng, kernel trả trạng thái lỗi. Wrapper thư viện có thể biến nó thành giá trị trả về, mã lỗi hoặc exception tùy ngôn ngữ. Ứng dụng cần phân biệt lỗi có thể retry, lỗi cấu hình và lỗi vĩnh viễn.

Không phải mọi lỗi đều có nghĩa kernel thất bại toàn bộ thao tác. Một lời gọi ghi trả số byte nhỏ hơn yêu cầu có thể là ghi một phần; caller có thể cần tiếp tục. Hãy đọc hợp đồng API thay vì coi return code thành công như bảo đảm mọi byte đã tới đích cuối.

## Tóm tắt

- System call cho user program yêu cầu kernel làm việc được bảo vệ.
- CPU chuyển quyền theo cơ chế kiến trúc; kernel kiểm tra tham số và quyền.
- System call, interrupt và exception có nguồn gốc khác nhau dù đều có thể vào kernel.
- Chi phí phụ thuộc công việc; chờ I/O khác với chuyển mode đơn thuần.
- Kết quả system call có semantics cụ thể, gồm cả thành công một phần và lỗi.

## Tự kiểm tra

**Gọi hàm thư viện luôn là system call?** Không. Hàm có thể chỉ chạy trong user space hoặc gọi system call khi cần.

**Interrupt và system call giống nhau vì đều vào kernel?** Không. Interrupt thường bất đồng bộ; system call bắt đầu từ yêu cầu chủ động của chương trình.

**System call ghi thành công nghĩa dữ liệu đã đến máy nhận qua mạng?** Không. Nó chỉ bảo đảm theo hợp đồng của tầng gửi, không thay thế ACK ứng dụng hay xác nhận xử lý bên nhận.

## Đọc tiếp

Tiếp theo: cách tạo và kết thúc process bằng các thao tác như `fork`, `exec` và `wait`.

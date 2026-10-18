---
title: "Log Linux: journal, syslog và xoay vòng log"
category: "Operating System"
tags: ["linux", "logging", "journalctl"]
description: "Biết log được thu thập ở đâu, lọc theo thời gian và dịch vụ, và vì sao log cần rotation."
updated: 2026-10-16
translationKey: "operating-system/linux-journal-logging-rotation"
---

Khi một dịch vụ lỗi, log là bản ghi theo thời gian về điều hệ thống đã quan sát. Linux có thể ghi log vào journal của systemd, chuyển tiếp qua syslog hoặc ghi thành file dưới `/var/log`. Không phải máy nào cũng lưu log theo cùng một cách.

## Journal và file log

`journald` nhận thông điệp từ kernel, service và ứng dụng. Tùy cấu hình, journal có thể chỉ nằm trong bộ nhớ đến lần boot kế tiếp hoặc được lưu bền trên đĩa. `journalctl` đọc các bản ghi này, có thể lọc theo boot, unit, mức ưu tiên hoặc khoảng thời gian.

Các file như `/var/log/auth.log`, `/var/log/syslog` hay log riêng của ứng dụng do bản phân phối và dịch vụ quyết định. Syslog daemon có thể nhận thông điệp rồi ghi chúng vào file hoặc chuyển tiếp tới máy log tập trung. Hãy xác nhận nơi ghi trên máy đang điều tra thay vì mặc định một đường dẫn.

Trong mô hình syslog truyền thống, ứng dụng thường gửi thông điệp qua Unix socket `/dev/log`; daemon có thể ghi cục bộ hoặc nhận/gửi log qua mạng để tập trung nhiều máy. Facility phân loại nguồn (ví dụ kernel hoặc mail), còn severity/priority mô tả mức độ khẩn cấp. Journal lưu thêm trường có cấu trúc và metadata do systemd gắn vào. Trường `PRIORITY` dùng cùng thang severity với syslog: 0 là emergency, 7 là debug; tên hiển thị có thể khác theo công cụ. Xem [journal fields](https://github.com/systemd/systemd/blob/main/man/systemd.journal-fields.xml).

Log qua mạng cần xác thực nguồn và bảo vệ đường truyền nếu có dữ liệu nhạy cảm. Mã hóa transport vẫn không chứng minh nội dung do ứng dụng gửi là trung thực; log cần được xem là bằng chứng có nguồn gốc và giới hạn tin cậy, không phải chân lý tuyệt đối.

## Đọc log có mục tiêu

- `journalctl -b`: log của lần boot hiện tại.
- `journalctl -b -1`: lần boot trước nếu journal được lưu bền.
- `journalctl -u ssh.service --since today`: log của một unit từ đầu ngày.
- `journalctl -p warning..alert`: giới hạn theo mức ưu tiên.
- `journalctl -f`: theo dõi log mới.
- `dmesg -T`: thông điệp kernel, thường hữu ích khi tìm lỗi thiết bị.

Hãy ghi lại thời điểm và múi giờ, sau đó đối chiếu log ứng dụng, service, kernel và network. Một dòng “failed” thường chỉ là triệu chứng; các dòng ngay trước nó có thể chứa lỗi gốc.

## Rotation và dung lượng

File log tăng không giới hạn sẽ chiếm đầy filesystem. Log rotation đổi tên hoặc nén file cũ, tạo file mới và xóa dữ liệu quá hạn theo chính sách. Công cụ phổ biến là `logrotate`; journal có giới hạn dung lượng riêng. Nếu tiến trình giữ file đã bị xóa mở, `du` và `df` có thể cho số liệu khác nhau cho đến khi tiến trình đóng file.

Không nên xóa log đang được tiến trình ghi một cách tùy tiện. Dùng cơ chế rotation/reopen của dịch vụ, giữ lại thời gian đủ để điều tra, và tránh ghi bí mật như token hay mật khẩu vào log.

## Tự kiểm tra

**`journalctl -b` xem log của lần boot nào?** Lần boot hiện tại.

**Log file đã bị xóa mà dung lượng chưa giảm có thể do đâu?** Process vẫn giữ file descriptor mở.

**Rotation chỉ để tiết kiệm dung lượng?** Nó còn giúp quản lý thời gian lưu, nén và chuyển giao file cho tiến trình ghi.

## Đọc tiếp

Khi log cho thấy máy thiếu tài nguyên, hãy nối dấu thời gian với CPU, memory, I/O và giới hạn cgroup.

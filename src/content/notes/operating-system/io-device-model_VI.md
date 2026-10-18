---
title: "I/O device: từ system call tới thiết bị"
category: "Operating System"
tags: ["io", "device", "driver", "operating system"]
description: "Theo đường đi của một yêu cầu I/O qua system call, kernel, driver, controller và thiết bị."
updated: 2026-10-16
translationKey: "operating-system/io-device-model"
---

Ứng dụng thường yêu cầu đọc một file hoặc ghi ra socket, không điều khiển tín hiệu điện của ổ đĩa hay card mạng. Hệ điều hành biến yêu cầu mức cao thành các lệnh phù hợp với thiết bị thông qua nhiều lớp: API, kernel subsystem, driver, controller và phần cứng.

## Một yêu cầu đọc đi qua đâu?

```text
ứng dụng → system call → filesystem/block layer → driver
         → controller/device → hoàn tất → dữ liệu trả về
```

Đường cụ thể tùy loại thiết bị. Lệnh đọc file có thể được đáp ứng từ page cache mà không truy cập đĩa; nếu cần thiết bị, kernel xếp request, driver cấu hình controller và chờ hoàn tất. Một syscall có thể block, hoàn tất một phần hoặc trả lỗi.

## Register và memory-mapped I/O

Thiết bị có thanh ghi điều khiển và trạng thái. CPU/driver có thể truy cập qua vùng địa chỉ I/O hoặc cơ chế chuyên biệt của kiến trúc. Memory-mapped I/O khiến một số địa chỉ được dùng để nói chuyện với thiết bị, nhưng không có nghĩa truy cập chúng giống RAM thông thường; thứ tự, cacheability và side effect cần theo quy tắc nền tảng.

Driver chuyển thao tác chung thành giao thức riêng của thiết bị: chuẩn bị buffer, cấu hình lệnh, phát request và xử lý hoàn tất/lỗi. Tách driver giúp phần còn lại của kernel dùng interface thống nhất, nhưng lỗi driver vẫn có thể ảnh hưởng kernel.

## Polling, interrupt và DMA

Với **polling**, CPU hỏi thiết bị lặp đi lặp lại xem đã xong chưa. Cách này đơn giản nhưng có thể lãng phí nếu thời gian chờ dài. **Interrupt** để thiết bị báo khi cần CPU xử lý; quá nhiều interrupt nhỏ lại tạo overhead.

**DMA** cho phép controller chuyển một khối dữ liệu giữa thiết bị và bộ nhớ mà CPU không phải copy từng byte. CPU vẫn thiết lập vùng/buffer, bảo đảm quyền và xử lý hoàn tất. Trên hệ thống có cache không đồng nhất, kernel/driver cần tuân thủ quy tắc đồng bộ cache và thiết bị.

## Buffering, caching và queueing

Buffer hấp thụ chênh lệch tốc độ hoặc gom dữ liệu thành khối. Cache giữ bản sao để phục vụ đọc lặp lại. Queue sắp xếp nhiều request và có thể cải thiện hiệu suất thiết bị. Chúng có thể tăng độ trễ nhìn thấy hoặc làm phát sinh câu hỏi “ghi thành công đã bền vững chưa?”. Tầng nào xác nhận hoàn tất phải được hiểu theo hợp đồng cụ thể.

## Tóm tắt

- I/O đi qua API/kernel subsystem, driver, controller và thiết bị.
- Page cache có thể phục vụ file mà không gọi thiết bị.
- Driver quản lý giao thức thiết bị; register I/O có quy tắc riêng, không phải RAM thường.
- Polling, interrupt và DMA là các cách phối hợp hoàn tất I/O.
- Buffer/cache/queue đổi hiệu năng và semantics quan sát được.

## Tự kiểm tra

**Mọi `read()` đều đọc trực tiếp đĩa?** Không; có thể dữ liệu đã ở cache.

**DMA nghĩa là CPU không tham gia I/O?** Không; CPU/driver vẫn thiết lập và xử lý request.

**Interrupt luôn hiệu quả hơn polling?** Không. Đánh đổi phụ thuộc tần suất và thời gian chờ.

## Đọc tiếp

Đĩa là thiết bị có latency và cách xếp request riêng; tiếp theo là mô hình HDD/SSD.

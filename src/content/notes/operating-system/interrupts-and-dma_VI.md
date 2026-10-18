---
title: "Interrupt và DMA: để CPU không phải chờ từng byte"
category: "Operating System"
tags: ["interrupt", "dma", "io", "device"]
description: "Phân tích interrupt handler, deferred work và DMA trong một lần truyền dữ liệu thiết bị."
updated: 2026-10-17
translationKey: "operating-system/interrupts-and-dma"
---

CPU có thể gửi request tới thiết bị rồi đợi, nhưng chờ bận liên tục sẽ lãng phí chu kỳ tính toán. Interrupt và DMA cho phép thiết bị báo sự kiện và chuyển dữ liệu theo khối, để CPU làm việc khác trong lúc I/O đang diễn ra.

## Thiết bị có giao diện và giao thức riêng

CPU, RAM và thiết bị thường nối qua các lớp interconnect khác nhau. Bộ nhớ cần băng thông cao nên nằm gần CPU; bus nhanh thường tốn kém và bị giới hạn về chiều dài/kết nối, trong khi bus ngoại vi chậm hơn có thể nối nhiều thiết bị. Đây là một mô hình khái niệm; máy hiện đại dùng nhiều loại fabric và controller khác nhau.

Thiết bị cũng có hai mặt: **giao diện** mà driver nhìn thấy và **phần triển khai bên trong**. Một giao diện minh họa có thanh ghi trạng thái, lệnh và dữ liệu. Driver kiểm tra thiết bị sẵn sàng, chuyển dữ liệu, ghi lệnh rồi nhận completion hoặc lỗi qua status/interrupt. Thiết bị thật có thể dùng queue, descriptor, doorbell hay protocol phức tạp hơn, nhưng nguyên tắc vẫn là driver phải tuân thủ giao thức của nó.

## Chọn polling hay interrupt?

Polling đọc thanh ghi trạng thái lặp đi lặp lại cho tới khi thiết bị sẵn sàng. Cách này đơn giản và có thể nhanh nếu thao tác hoàn tất gần như ngay lập tức; với thiết bị chậm, CPU chỉ tốn thời gian quay vòng kiểm tra.

Interrupt đảo cách chờ: kernel gửi yêu cầu, cho tiến trình ngủ hoặc chạy việc khác, rồi thiết bị báo khi có kết quả. Như vậy CPU và thiết bị có thể làm việc chồng lấp. Nhưng interrupt cũng có chi phí vào handler, đổi tiến trình và quay lại. Khi thiết bị rất nhanh, chi phí đó có thể lớn hơn việc polling vài lần. Một cách kết hợp là polling trong một khoảng ngắn rồi mới chuyển sang chờ interrupt.

Ở tải mạng cao, mỗi gói tin tạo một interrupt có thể khiến CPU chỉ lo xử lý interrupt mà không kịp chạy ứng dụng để tiêu thụ gói tin. Polling có kiểm soát hoặc gộp nhiều completion thành một interrupt giúp giảm overhead; đổi lại, gộp lâu làm tăng latency. Vì thế không có một chế độ luôn tốt nhất: lựa chọn phụ thuộc tốc độ thiết bị, tải và mục tiêu latency.

## Interrupt đi vào kernel như thế nào?

Thiết bị phát tín hiệu interrupt. CPU lưu đủ trạng thái, chuyển sang handler đã đăng ký và vào chế độ đặc quyền. Handler xác định nguồn, đọc trạng thái thiết bị, xác nhận interrupt và thực hiện phần công việc cần nhanh.

Không nên làm công việc dài hoặc có thể block trong hard interrupt handler. Kernel thường đẩy phần xử lý nặng sang cơ chế deferred work như softirq/workqueue tùy hệ thống. Interrupt có thể bị mask, gộp hoặc phân phối lên CPU khác.

## DMA chuyển dữ liệu theo vùng

Driver chuẩn bị buffer và mô tả vùng bộ nhớ cho controller. Thiết bị DMA đọc/ghi vùng đó rồi báo hoàn tất. CPU tránh copy từng byte nhưng vẫn cần quản lý lifetime buffer, quyền truy cập, đồng bộ và lỗi.

Trên hệ có IOMMU, thiết bị có thể được giới hạn vào vùng địa chỉ DMA được ánh xạ. Đây là lớp bảo vệ bổ sung, không nên giả định mọi thiết bị/máy có cùng cấu hình. Dữ liệu từ thiết bị cần được xem là đầu vào không đáng tin nếu protocol không xác thực.

## Ordering và coherency

CPU, cache và thiết bị có thể quan sát bộ nhớ theo cách cần đồng bộ. Driver phải đảm bảo descriptor được ghi xong trước khi báo thiết bị bắt đầu; sau khi DMA hoàn tất, CPU phải thấy dữ liệu mới. API kernel cung cấp memory barrier/cache sync phù hợp nền tảng.

Code user space không nên tự thay thế các primitive driver bằng cách ghi vào địa chỉ thiết bị tùy tiện. Một lỗi ordering có thể hiếm khi xảy ra, khó tái hiện và phụ thuộc kiến trúc.

## Driver che giấu giao thức riêng của thiết bị

Các thiết bị có thanh ghi và giao thức khác nhau. Driver chứa phần hiểu giao thức đó; subsystem phía trên gọi giao diện chung, chẳng hạn block read/write, thay vì tự biết cách điều khiển từng loại ổ. Cách phân lớp này giúp filesystem dùng được nhiều thiết bị qua cùng một giao diện.

Đổi lại, giao diện chung có thể làm mất chi tiết mà một thiết bị cụ thể cung cấp, ví dụ mã lỗi giàu thông tin bị rút gọn thành lỗi I/O chung. Driver cũng là phần mềm chạy trong vùng đặc quyền, nên lỗi ở đây có thể ảnh hưởng toàn hệ thống. Khi điều tra sự cố, cần phân biệt lỗi ứng dụng/filesystem, lỗi block layer và lỗi driver/controller thay vì gom tất cả thành “ổ đĩa hỏng”.

Một driver đĩa đơn giản thường chờ thiết bị sẵn sàng, ghi địa chỉ block và số sector vào thanh ghi, phát lệnh đọc/ghi, rồi xử lý completion. Với đọc, handler lấy dữ liệu và đánh thức tiến trình đang chờ; sau đó driver có thể khởi chạy request kế tiếp trong hàng đợi. Thứ tự cụ thể tùy giao thức và driver, nhưng vòng đời request–completion này là mẫu hữu ích để hiểu I/O bất đồng bộ.

## Interrupt storm và tối ưu hóa

Thiết bị tốc độ cao có thể tạo nhiều interrupt. Interrupt moderation/coalescing có thể gộp sự kiện, giảm CPU overhead nhưng tăng latency mỗi packet. MSI-X cho phép nhiều vector để phân phối tải. Đây là các quyết định driver/thiết bị; khi tuning cần xem throughput, latency và phân bố CPU.

## Tóm tắt

- Interrupt báo CPU về sự kiện; handler cần ngắn và xử lý phần nặng theo cơ chế phù hợp.
- Polling hợp với thao tác rất nhanh; interrupt giúp CPU làm việc khác khi thiết bị chậm. Có thể kết hợp polling ngắn với interrupt.
- DMA truyền khối dữ liệu giữa thiết bị và RAM, giảm công việc copy của CPU.
- Driver quản lý buffer lifetime, địa chỉ, quyền và đồng bộ.
- Driver giấu giao thức riêng sau giao diện subsystem chung, nhưng lớp trừu tượng có thể làm mất một số chi tiết thiết bị.
- Ordering giữa CPU và thiết bị cần barrier/cache sync theo API nền tảng.
- Gộp interrupt giảm overhead nhưng có thể tăng latency; tải interrupt quá cao còn có thể làm đói ứng dụng.

## Tự kiểm tra

**DMA xong thì CPU chắc chắn nhìn thấy dữ liệu mới ngay?** Driver phải tuân thủ quy tắc coherency và đồng bộ phù hợp.

**Interrupt handler có nên chờ đĩa hoàn tất?** Không; handler không nên block theo kiểu thông thường.

**Gộp interrupt chỉ có lợi?** Nó giảm overhead nhưng đổi lại độ trễ.

## Đọc tiếp

Áp dụng các khái niệm này vào thiết bị lưu trữ trong bài HDD, SSD và latency.

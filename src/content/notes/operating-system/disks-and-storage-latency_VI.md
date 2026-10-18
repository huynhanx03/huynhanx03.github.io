---
title: "Đĩa, SSD và latency của lưu trữ"
category: "Operating System"
tags: ["storage", "disk", "ssd", "io"]
description: "So sánh đặc tính HDD và SSD, đọc thời gian truy cập và hiểu vì sao I/O ngẫu nhiên khác I/O tuần tự."
updated: 2026-10-16
translationKey: "operating-system/disks-and-storage-latency"
---

CPU có thể thực hiện hàng tỷ chu kỳ trong thời gian ổ lưu trữ tìm một block. Đặc tính của thiết bị định hình cách hệ điều hành xếp I/O, cache dữ liệu và báo độ trễ cho ứng dụng.

## HDD: vị trí cơ học quyết định phần lớn latency

Ổ cứng quay cần đưa đầu đọc tới track phù hợp và chờ sector quay tới. Thời gian gồm seek time, rotational latency và truyền dữ liệu. Request ngẫu nhiên rải rác thường tốn nhiều lần di chuyển; request tuần tự tận dụng vị trí hiện tại và truyền nhiều block liên tục.

## Đĩa trình bày một dãy block

Hệ điều hành thường truy cập ổ qua các block logic được đánh địa chỉ, rồi yêu cầu đọc/ghi một hay nhiều block. Filesystem không cần điều khiển trực tiếp từng track và đầu đọc; firmware/controller đảm nhiệm phần bố trí vật lý. Kích thước sector logic/vật lý và các bảo đảm ghi phụ thuộc thiết bị. Không nên suy ra một lần ghi nhiều block là nguyên tử: mất điện giữa chừng có thể để lại cập nhật dở dang. Xem [crash consistency và journaling](./crash-consistency-and-journaling_VI.md) để hiểu filesystem xử lý cập nhật nhiều block như thế nào.

Chi tiết bố trí vật lý giải thích một số tối ưu trong mô hình HDD cổ điển. **Track skew** đặt sector đầu của track kế tiếp lệch đi để đầu đọc có thời gian chuyển track mà không lỡ sector; **zone recording** đặt nhiều sector hơn ở các track ngoài vì chu vi lớn hơn. Chúng có thể cải thiện đọc tuần tự và băng thông theo vùng, nhưng firmware/controller hiện đại che phần lớn hình học này khỏi hệ điều hành; không nên suy ra hiệu năng chỉ từ địa chỉ LBA.

Có thể ước lượng thời gian một request bằng tổng ba phần: `T_io ≈ T_seek + T_rotation + T_transfer`. Với tốc độ quay `RPM`, một vòng mất `60 / RPM` giây; nếu sector đến ngẫu nhiên, thời gian quay trung bình xấp xỉ nửa vòng. Ví dụ ổ 10.000 RPM cần khoảng 6 ms cho một vòng, nên rotational latency trung bình khoảng 3 ms. Con số thực tế còn tùy vị trí, cache và cơ chế firmware.

Vì seek và chờ quay có chi phí cố định lớn, một request nhỏ ngẫu nhiên có thể chậm hơn nhiều so với truyền tuần tự cùng lượng dữ liệu. Khi có thể, gom các block liền kề thành request lớn và truy cập tuần tự để chi phí seek/rotation được chia trên nhiều byte. Disk cache cũng có thể đọc trước cả track hoặc trì hoãn xác nhận ghi; write-back nhanh hơn nhưng chỉ an toàn nếu flush và hợp đồng durability được xử lý đúng.

Scheduler I/O có thể sắp xếp request để giảm di chuyển đầu đọc, nhưng tối ưu fairness và latency vẫn quan trọng. Một hàng đợi quá dài làm thiết bị bận tốt nhưng khiến request cá nhân chờ lâu.

## SSD: không có đầu đọc cơ học nhưng vẫn có giới hạn

Flash SSD truy cập theo page và xóa theo erase block; controller quản lý ánh xạ, wear leveling, garbage collection và sửa lỗi. Đọc ngẫu nhiên thường tốt hơn HDD, nhưng latency vẫn khác giữa workload và trạng thái thiết bị. Ghi kéo dài có thể bị ảnh hưởng bởi garbage collection, cache và dung lượng trống.

Không nên suy rằng SSD có latency bằng 0 hoặc mọi loại I/O đều như nhau. Queue depth, kích thước request, durability flush, thermal throttling và controller đều ảnh hưởng.

## IOPS, bandwidth và latency

- **Bandwidth:** lượng byte truyền trong một đơn vị thời gian.
- **IOPS:** số thao tác I/O mỗi giây.
- **Latency:** thời gian một request hoàn tất.

Request lớn tuần tự có thể tăng bandwidth nhưng IOPS thấp hơn; request nhỏ ngẫu nhiên có thể quan tâm IOPS/latency. Queue depth tăng đôi khi làm throughput tốt hơn nhưng tail latency xấu đi. Benchmark cần đúng kích thước block, tỷ lệ đọc/ghi, độ sâu queue và điều kiện cache.

## Cache và write durability

Page cache có thể trả dữ liệu nhanh mà chưa chạm thiết bị. Ghi thường được buffer rồi flush sau; nếu ứng dụng cần bảo đảm durability, nó phải dùng API đồng bộ phù hợp và filesystem/device phải thực hiện đúng hợp đồng. Lệnh ghi thành công không tự đồng nghĩa dữ liệu sống sót qua mất điện.

## Tóm tắt

- HDD chịu chi phí seek và rotational latency; I/O tuần tự giảm di chuyển.
- Có thể ước lượng HDD I/O bằng seek + rotational delay + transfer; random I/O thường bị chi phối bởi hai khoản đầu.
- Gộp block liền kề cải thiện hiệu quả; write-back cache có thể ảnh hưởng durability.
- SSD loại bỏ phần cơ học nhưng controller, erase block, garbage collection và flush vẫn tạo độ trễ.
- IOPS, bandwidth và latency đo các khía cạnh khác nhau.
- Queue depth có thể tăng throughput nhưng kéo dài tail latency.
- Cache và writeback ảnh hưởng cả hiệu năng lẫn durability.

## Tự kiểm tra

**SSD làm I/O ngẫu nhiên nhanh vô hạn?** Không; vẫn có latency và giới hạn controller/flash.

**IOPS cao chứng minh mỗi request có độ trễ thấp?** Không; throughput và latency là thước đo khác nhau.

**`write()` thành công luôn bảo đảm dữ liệu qua mất điện?** Không nhất thiết; cần semantics đồng bộ/bền vững phù hợp.

## Đọc tiếp

Khi nhiều đĩa được ghép lại để cân bằng hiệu năng và chịu lỗi, ta có RAID.

---
title: "Disk scheduling: sắp xếp request và giới hạn throughput"
category: "Operating System"
tags: ["storage", "disk scheduling", "io"]
description: "So sánh FCFS, SSTF và SCAN cho HDD, đồng thời xem vì sao queue depth đổi latency."
updated: 2026-10-16
translationKey: "operating-system/disk-scheduling-and-queues"
---

Nhiều process có thể gửi block I/O cùng lúc. Block layer/device queue cần quyết định request nào tới thiết bị trước. Trên HDD, vị trí đầu đọc làm thứ tự request ảnh hưởng seek; trên SSD, locality cơ học giảm nhưng queueing và controller parallelism vẫn quan trọng.

## FCFS và SSTF

FCFS phục vụ theo thứ tự đến, dễ công bằng nhưng seek nhiều. Shortest Seek Time First chọn request gần vị trí hiện tại; nó giảm seek trung bình trong một mô hình nhưng request xa có thể starvation và vị trí tương lai thay đổi theo cơ chế đĩa.

Hệ điều hành thường không thấy hình học đĩa hay vị trí đầu đọc chính xác, nên SSTF thường được xấp xỉ bằng chọn block gần nhất theo địa chỉ. Khoảng cách block không tính thời gian quay: request cần seek ngắn hơn đôi khi phải đợi sector quay gần trọn vòng. Shortest Positioning Time First (SPTF, còn gọi SATF) cân nhắc cả seek lẫn rotational delay; ổ đĩa biết vị trí đầu đọc và layout tốt hơn host nên có thể tự sắp thứ tự chính xác hơn.

## SCAN/elevator

SCAN di chuyển đầu đọc theo một hướng phục vụ các request trên đường, rồi quay lại như thang máy. C-SCAN quét theo một hướng rồi trở về đầu, giúp độ chờ đồng đều hơn giữa vùng trong và ngoài. F-SCAN cố định tập request cho một lượt quét, để request mới đến gần đầu đọc không liên tục chen trước request cũ ở xa. Các biến thể này hạn chế starvation của SSTF nhưng vẫn không tính chính xác rotational delay.

Scheduler còn có thể gộp hai request liền kề thành một request lớn để giảm overhead. Một scheduler work-conserving phát ngay khi có việc; scheduler có thể chủ động chờ ngắn nếu dự đoán request tốt hơn sắp tới, nhưng chờ lâu làm tăng latency và quyết định thời điểm không đơn giản. Trên hệ thống hiện đại, OS có thể gửi nhiều request đang chờ cho controller; firmware thiết bị có thêm thông tin về head position/layout để tối ưu thứ tự bên trong.

SATF nhìn trước trong một **cửa sổ request** có giới hạn. Cửa sổ rộng cho nhiều lựa chọn vị trí hơn, nhưng tăng thời gian chờ và chi phí xếp lịch; lựa chọn tốt nhất ở bước kế tiếp cũng chưa chắc tạo ra lịch tổng thể tốt nhất. Một biến thể bounded SATF xử lý lần lượt từng nhóm hữu hạn để giới hạn việc request mới liên tục chen trước request cũ. Đây là trade-off giữa hiệu năng định vị, fairness và thời gian chờ; thuật toán tối ưu trên mô hình HDD cần thông tin vị trí mà OS hiện đại thường không có đầy đủ.

## Thực hành: đo thứ tự phục vụ

Giữ nguyên trace request rồi tính riêng seek, rotational delay và transfer time cho từng request. Đổi seek rate và tốc độ quay để xem phần nào chi phối tổng thời gian; so FCFS, SSTF và SATF trên cùng trace, nhất là khi request gần đầu đọc nhưng sector chưa quay tới. Thử các request liên tiếp qua ranh giới track rồi thêm track skew để tránh phải chờ vòng quay gần đủ sau seek. Với mô hình nhiều zone, tính bandwidth sectors/time cho từng vùng vì track ngoài có thể chứa nhiều sector hơn track trong.

Sau đó tăng/giảm số request scheduler được nhìn trước, tạo trace khiến một request xa liên tục bị đẩy lại, rồi so SATF với bounded SATF về throughput và thời gian chờ. Cuối cùng thử tìm trace mà lựa chọn greedy tốt nhất ở bước hiện tại làm tổng lịch chậm hơn một lịch khác. Những phép thử này giúp thấy rằng thông tin vị trí, kích thước cửa sổ, rotational delay và fairness đều ảnh hưởng quyết định; kết quả chỉ đúng trong giả định của mô hình, còn ổ thật có firmware, cache, geometry và queue riêng.

## Queue depth và latency

Queue sâu cho controller nhiều lựa chọn để sắp xếp và tận dụng song song, tăng throughput. Nhưng request phải chờ lâu hơn ở queue, tail latency tăng. NVMe có nhiều queue/cpu affinity; SATA/SCSI stack và controller có đặc tính khác.

## Tóm tắt

- Disk scheduler sắp request để cân bằng locality, fairness và throughput.
- SSTF giảm seek trong mô hình nhưng có thể starve request xa.
- SCAN/elevator phục vụ theo hướng, giảm dao động đầu đọc.
- Queue depth cao có thể tăng throughput nhưng xấu latency.
- Chính sách phụ thuộc HDD/SSD, controller và kernel.

## Tự kiểm tra

**SSTF luôn công bằng nhất?** Không; request xa có thể chờ lâu.

**Queue depth tối đa luôn nhanh nhất?** Không; latency và contention có thể tăng.

**SSD không cần queue scheduling?** Vẫn cần quản lý queue và mức song song, dù không có seek cơ học.

## Đọc tiếp

RAID ghép nhiều device, thêm trade-off parity, redundancy và rebuild.

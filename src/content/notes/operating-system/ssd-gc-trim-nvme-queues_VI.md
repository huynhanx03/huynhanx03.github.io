---
title: "SSD, garbage collection, TRIM và NVMe queue"
category: "Operating System"
tags: ["operating-system", "ssd", "nvme"]
description: "Hiểu flash translation layer, garbage collection, discard/TRIM và cách queue NVMe ảnh hưởng hiệu năng."
updated: 2026-10-16
translationKey: "operating-system/ssd-gc-trim-nvme-queues"
---

SSD ánh xạ logical block address sang flash page/block qua Flash Translation Layer (FTL). NAND thường ghi theo page nhưng xóa theo erase block; cập nhật dữ liệu đòi hỏi ghi vùng mới rồi thu hồi block cũ. Controller chạy garbage collection để gom live page và giải phóng block.

## Từ NAND thô đến giao diện block

Filesystem nhìn thấy các LBA có thể đọc/ghi; NAND bên dưới lại đọc theo page, lập trình page sau khi block đã được erase, và erase cả erase block. Page đã lập trình không thể ghi đè tùy ý: controller phải giữ dữ liệu còn sống, xóa block rồi ghi lại. Các trạng thái khái niệm thường gồm invalid, erased và valid. Để giảm program disturbance, thiết bị thường lập trình các page theo thứ tự trong block. Nhiều chip chạy song song để tăng băng thông.

FTL chuyển yêu cầu LBA thành thao tác vật lý, giữ bảng ánh xạ trong RAM và phải khôi phục được bảng sau mất điện. Một cách là gắn metadata vào vùng OOB của page rồi quét NAND lúc khởi động; cách này tốn thời gian trên ổ lớn, nên một số thiết kế dùng log/checkpoint để phục hồi nhanh hơn.

Ghi kiểu append-only phân tán ghi mới ra page trống và cập nhật ánh xạ. Ghi đè làm phiên bản cũ thành garbage. Khi GC chọn block có page chết, nó xác định page còn sống bằng cách so metadata của page với bảng ánh xạ, chép page sống sang vùng log mới rồi erase block cũ. Block chỉ có page chết là rẻ để thu hồi; càng nhiều page sống thì càng nhiều copy và write amplification. Overprovisioning tạo vùng dự phòng để GC trì hoãn hoặc chạy nền, nhưng không loại bỏ chi phí.

## Đánh đổi của bảng ánh xạ

- **Page mapping:** tra cứu và cập nhật linh hoạt, nhưng bảng lớn. Ví dụ trong sách, 1 TiB với entry 4 byte cho mỗi 4 KiB cần xấp xỉ 1 GiB RAM cho mapping.
- **Block mapping:** bảng nhỏ hơn, nhưng ghi một page nhỏ buộc copy các page sống khác trong block sang block mới.
- **Hybrid mapping:** data block dùng mapping theo block, còn một số log block dùng mapping theo page. Khi nhập log vào data block, *switch merge* phù hợp hoàn toàn; *partial merge* phải copy phần còn lại từ data block; *full merge* gom dữ liệu từ nhiều block. Hai kiểu merge sau làm thêm I/O và có thể tăng mạnh write amplification.

Các con số và sơ đồ FTL ở OSTEP là mô hình giải thích được xuất bản năm 2015, không phải cam kết rằng mọi SSD hiện đại dùng đúng một thuật toán. Ý chính còn hữu ích là ranh giới giao diện block che giấu việc NAND phải erase theo block, nên hiệu năng phụ thuộc mapping, GC, song song hóa và khoảng trống sẵn có.

## TRIM/discard

Khi file bị xóa, filesystem có thể gửi discard/TRIM để báo block logical không còn dữ liệu cần giữ. Nếu thông tin này tới SSD, FTL có thể bỏ qua copy các page không còn dùng khi garbage collection. Discard không đảm bảo dữ liệu bị xóa an toàn; secure erase là vấn đề khác.

## Queue và latency

NVMe hỗ trợ nhiều submission/completion queue và request song song. Queue depth cao có thể tăng throughput nhưng gây tail latency; garbage collection nội bộ, thermal throttling và write amplification ảnh hưởng hiệu năng theo thời gian. Benchmark ngắn sau khi xóa cache không đại diện cho tải sustained.

## Theo dõi

`nvme list`, `smartctl`, `iostat` và số liệu filesystem giúp kiểm tra thiết bị, sức khỏe và tải. SMART attribute phụ thuộc vendor; không diễn giải một giá trị raw mà thiếu tài liệu. Firmware, nhiệt độ, over-provisioning và workload random write đều quan trọng.

## Tự kiểm tra

**TRIM xóa vật lý dữ liệu an toàn?** Không đảm bảo.

**SSD không cần garbage collection?** Cần để thu hồi erase block.

**NVMe nhiều queue nghĩa mọi workload nhanh hơn?** Không.

## Đọc tiếp

Write amplification và endurance giải thích vì sao workload ghi có thể tiêu thụ tuổi thọ flash.

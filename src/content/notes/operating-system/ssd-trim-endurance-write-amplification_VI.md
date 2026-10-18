---
title: "SSD: TRIM, wear leveling và write amplification"
category: "Operating System"
tags: ["storage", "ssd", "trim", "flash"]
description: "Hiểu flash erase block, discard/TRIM, garbage collection và vì sao host writes khác NAND writes."
updated: 2026-10-16
translationKey: "operating-system/ssd-trim-endurance-write-amplification"
---

Flash SSD ghi page nhưng xóa theo erase block lớn hơn. Controller cần biết block logic nào không còn chứa data hữu ích để thu hồi flash. Filesystem/device có thể gửi discard/TRIM, báo rằng các LBA được đánh dấu có thể bỏ; nó không phải lệnh xóa bảo mật.

## Garbage collection và wear leveling

Controller di chuyển page còn sống khỏi erase block, xóa block rồi tái sử dụng. Wear leveling phân phối erase cycles để tránh vài vùng bị mòn sớm. Khi SSD gần đầy hoặc có nhiều data sống, GC cần copy nhiều hơn.

## Write amplification

Host có thể ghi một amount bytes nhưng controller ghi nhiều hơn do copy/GC/metadata. Tỷ lệ NAND writes trên host writes gọi write amplification. Overprovisioning, free space, workload tuần tự/ngẫu nhiên và TRIM ảnh hưởng tỷ lệ.

## Endurance và SMART

SSD có endurance rating và health counters như percentage used/media errors theo chuẩn/vendor. Counters khác nhau giữa thiết bị; một giá trị bình thường không loại trừ lỗi sắp xảy ra. Monitoring, backup và replacement policy vẫn cần.

## Tóm tắt

- Flash xóa theo erase block; controller quản mapping và GC.
- TRIM/discard báo LBA không còn cần, giúp thu hồi hiệu quả.
- Write amplification làm NAND writes lớn hơn host writes.
- Free space/overprovisioning ảnh hưởng hiệu năng dài hạn.
- SMART/health counter cần diễn giải theo vendor và backup policy.

## Tự kiểm tra

**TRIM xóa dữ liệu an toàn chống forensic?** Không; không phải secure erase guarantee.

**Ghi 1 TB từ host nghĩa NAND ghi đúng 1 TB?** Không; write amplification.

**SSD khỏe hôm nay nghĩa không cần backup?** Không.

## Đọc tiếp

Đưa đặc tính device vào benchmark latency/IOPS cùng filesystem cache.

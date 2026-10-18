---
title: "RAID rebuild, scrubbing và failure mode"
category: "Operating System"
tags: ["operating-system", "raid", "storage"]
description: "Hiểu rebuild sau hỏng ổ, latent sector error và vì sao RAID không thay thế backup hay kiểm tra integrity."
updated: 2026-10-17
translationKey: "operating-system/raid-rebuild-scrubbing-and-failure-modes"
---

RAID dùng redundancy để giữ dịch vụ hoặc dữ liệu khi một số thiết bị hỏng, tùy cấp RAID. Khi thay ổ, hệ thống rebuild dữ liệu/parity lên ổ mới. Quá trình này đọc nhiều dữ liệu từ các ổ còn lại, có thể kéo dài và tăng tải đúng lúc mảng đang yếu nhất.

## Rebuild và rủi ro

RAID 1 sao chép dữ liệu; RAID 5/6 tính lại dữ liệu từ parity. Trong lúc rebuild, thêm một lỗi vượt mức redundancy có thể làm mất dữ liệu hoặc phần lớn mảng inaccessible. Mảng lớn có thể gặp unreadable sector tiềm ẩn khi đọc toàn bộ dữ liệu; RAID không tự sửa được nếu không có nguồn redundancy/integrity đủ.

Latent-sector error (LSE) là block không đọc được và thiết bị báo lỗi; khác với silent corruption, khi thiết bị trả dữ liệu sai nhưng không báo. Khi rebuild RAID 4/5 sau khi mất cả ổ, hệ thống phải đọc các ổ còn lại; một LSE trong stripe cần tái dựng có thể làm rebuild thất bại nếu chỉ còn một parity. Hai parity như RAID 6/RAID-DP thêm khả năng chịu lỗi đồng thời, nhưng không loại bỏ mọi dạng corruption hay lỗi vượt quá redundancy.

## Scrub và checksum

Scrub đọc các vùng định kỳ để phát hiện inconsistency hoặc lỗi đọc trước khi dữ liệu lâu ngày không được chạm tới. Với parity RAID, có thể so sánh và sửa parity, nhưng nếu không có checksum nội dung thì hệ thống có thể không biết bản nào là dữ liệu đúng khi phát hiện mismatch. Checksum gắn với block identity còn giúp phát hiện block ghi nhầm địa chỉ; checksum chỉ nằm cạnh data không nhất thiết phát hiện lost write nếu data cũ và checksum cũ cùng còn nguyên. Filesystem như ZFS/Btrfs có checksum end-to-end cho một số loại dữ liệu và có thể tự sửa khi có bản sao hợp lệ.

## RAID không phải backup

RAID không bảo vệ khỏi xóa nhầm, ransomware, hỏng metadata, mất host/controller, lửa hoặc lệnh ghi sai được nhân bản lên mọi mirror. Backup cần bản sao độc lập, versioning/retention và thử restore.

## Tự kiểm tra

**RAID 1 bảo vệ khỏi xóa file?** Không; xóa được nhân bản.

**Parity mismatch luôn cho biết bản dữ liệu nào đúng?** Không nếu không có checksum hoặc bản sao authoritative.

**Rebuild chỉ là thao tác metadata nhẹ?** Không; nó đọc và ghi lượng dữ liệu lớn.

## Đọc tiếp

Durability yêu cầu hiểu flush, write cache và controller; RAID chỉ là một phần đường lưu trữ.

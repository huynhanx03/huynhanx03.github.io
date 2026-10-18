---
title: "RAID: hiệu năng, dung lượng và khả năng chịu lỗi"
category: "Operating System"
tags: ["storage", "raid", "reliability"]
description: "Hiểu striping, mirroring, parity và vì sao RAID không thay thế backup."
updated: 2026-10-16
translationKey: "operating-system/raid-redundancy-and-performance"
---

RAID kết hợp nhiều thiết bị lưu trữ thành một cấu hình để đạt một số mục tiêu: tăng throughput, tăng khả năng tiếp tục hoạt động khi ổ hỏng, hoặc cả hai. Mỗi mức RAID có đánh đổi về dung lượng hữu ích, hiệu năng và kiểu lỗi có thể chịu.

## Striping và mirroring

**Striping** chia block dữ liệu qua nhiều ổ. Nó có thể tăng băng thông khi request song song, nhưng không tự cung cấp redundancy: hỏng một thành viên có thể làm mất volume tùy cấu hình.

**Mirroring** giữ bản sao trên nhiều ổ. Đọc có thể phân phối; ghi cần cập nhật bản sao theo semantics controller/software. Mirror thường chịu hỏng một thành viên trong mỗi cặp, nhưng không bảo vệ khỏi xóa nhầm, mã độc, lỗi phần mềm hoặc mất cả enclosure.

## Parity và chi phí ghi

RAID parity dùng thông tin dư thừa để tái tạo dữ liệu khi một ổ hỏng. Với XOR đơn parity, dữ liệu thiếu có thể tính từ các block còn lại và parity block. Nhiều ghi nhỏ có thể cần đọc/ghi dữ liệu cùng parity, tạo write penalty. Cache/controller có thể giảm một số chi phí nhưng không xóa giới hạn.

RAID 5 thường chịu một ổ hỏng; RAID 6 dùng hai parity và có thể chịu hai ổ hỏng trong cấu hình chuẩn. RAID 10 kết hợp mirror và stripe, dùng dung lượng khác và có kiểu chịu lỗi phụ thuộc ổ nào hỏng. Luôn xác minh mức RAID và implementation thực tế.

## Rebuild và nguy cơ thứ cấp

Sau khi thay ổ hỏng, rebuild đọc lượng lớn dữ liệu từ các ổ còn lại và ghi lên ổ mới. Trong thời gian đó, hiệu năng giảm và một lỗi bổ sung có thể làm volume không phục hồi được tùy mức RAID. Ổ lớn, tải nặng và thời gian rebuild dài làm vận hành cần giám sát.

RAID không phải backup. Nó không giữ lịch sử phiên bản và không giúp khôi phục file đã bị xóa/ghi đè đồng bộ lên mọi bản sao. Backup cần độc lập về lỗi, có version và được thử khôi phục.

## Phần cứng, phần mềm và quan sát

RAID có thể triển khai bằng controller phần cứng hoặc phần mềm trong kernel. Cần hiểu nơi đặt metadata, quy trình thay ổ, cache write policy, battery/flash protection và cảnh báo health. “Volume còn mount được” không chứng minh mọi ổ đều khỏe.

## Tóm tắt

- Striping tăng phân phối dữ liệu nhưng không tự có redundancy.
- Mirroring giữ bản sao; parity dùng thông tin dư thừa để tái tạo một số lỗi.
- RAID level đánh đổi dung lượng, hiệu năng và số lỗi chịu được.
- Rebuild là giai đoạn rủi ro và có thể ảnh hưởng hiệu năng.
- RAID duy trì khả dụng trước một số lỗi ổ; backup mới hỗ trợ phục hồi lịch sử dữ liệu.

## Tự kiểm tra

**RAID 1 là backup?** Không; xóa hoặc ghi sai có thể được phản chiếu sang bản còn lại.

**RAID 0 chịu được hỏng một ổ?** Thông thường không; dữ liệu phân tán qua các thành viên.

**RAID 6 có thể mất hai ổ bất kỳ trong mọi implementation mà vẫn luôn an toàn?** Phải xét cấu hình, lỗi đồng thời và tình trạng dữ liệu; RAID không thay quy trình backup/restore.

## Đọc tiếp

RAID cung cấp thiết bị logic; filesystem bên trên tổ chức file và directory.

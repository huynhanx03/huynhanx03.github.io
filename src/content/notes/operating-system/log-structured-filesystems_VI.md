---
title: "Log-structured filesystem: ghi tuần tự và cleaning"
category: "Operating System"
tags: ["filesystem", "log structured", "storage"]
description: "Hiểu ghi metadata/data như log mới, checkpoint và segment cleaning trong LFS."
updated: 2026-10-16
translationKey: "operating-system/log-structured-filesystems"
---

Log-structured filesystem (LFS) ghi thay đổi thành các segment tuần tự thay vì cập nhật block tại chỗ. Ý tưởng này tận dụng throughput ghi tuần tự, đặc biệt trong workload nhiều ghi nhỏ. Khi ghi phiên bản mới, block cũ trở thành stale nhưng chưa thể tái sử dụng ngay.

LFS đệm cả data lẫn metadata trong RAM rồi ghi segment lớn liên tục. Ghi từng block liên tiếp nhưng cách nhau lâu vẫn có thể mất gần một vòng quay giữa các lệnh; gom chúng thành một lượt ghi lớn mới amortize được seek/rotation. Trong mô hình HDD đơn giản, nếu positioning time là `T_position`, peak rate là `R_peak`, muốn đạt tỷ lệ `F` của peak thì cần segment xấp xỉ `D = (F / (1-F)) × R_peak × T_position`. Đây là công thức minh họa trade-off: càng gần peak thì cần buffer lớn và thời gian chờ lâu hơn.

## Inode map và checkpoint

LFS cần tìm phiên bản mới nhất của inode/data. Inode map nối inode logical tới vị trí block hiện tại; checkpoint lưu điểm khởi đầu để mount/recovery nhanh. Ghi checkpoint định kỳ và log metadata giúp phục hồi sau crash.

Checkpoint region trỏ tới các phần inode map mới nhất; inode map ánh xạ inode number tới vị trí inode hiện hành; inode lại chỉ tới data block. Sau khi checkpoint region và inode map đã cache, truy cập inode chỉ thêm tra cứu mapping. Directory vẫn lưu tên → inode number như Unix thông thường, nên cập nhật vị trí inode không buộc phải sửa mọi directory entry từ nó lên tận root. Indirection này tránh recursive update problem của hệ thống không ghi đè tại chỗ.

## Segment cleaning

Khi log đầy, cleaner đọc segment, xác định block còn live, copy chúng sang segment mới rồi tái sử dụng segment cũ. Nếu segment có nhiều dữ liệu live, cleaning tốn nhiều I/O và làm giảm write throughput. Policy chọn victim ảnh hưởng hiệu năng lâu dài.

Để biết một block còn live không, segment summary ghi inode number và offset file của mỗi block. Cleaner tra inode map tới inode mới nhất, rồi kiểm tra inode còn trỏ offset đó tới đúng địa chỉ block cũ hay không. Version number có thể giúp loại nhanh dữ liệu của file đã xóa/truncate. Policy cổ điển ưu tiên clean segment lạnh có ít block sống; segment nóng thường tự tạo nhiều block cũ khi tiếp tục bị ghi đè, nên đợi lâu có thể có lợi. Lịch clean có thể chạy định kỳ, lúc đĩa rảnh hoặc khi cần chỗ trống.

## Crash recovery

Checkpoint region (CR) là điểm bắt đầu cố định để tìm inode map. Để CR không bị ghi dở, LFS giữ hai bản và luân phiên cập nhật; header/body/trailer có timestamp cho phép chọn bản mới nhất còn nhất quán sau crash. Khi reboot, hệ thống dùng checkpoint cuối đã hợp lệ rồi có thể **roll forward** quét các segment mới hơn để tìm update hợp lệ kể từ checkpoint.

Các phiên bản cũ tạo garbage nhưng cũng có thể biến thành lịch sử/snapshot nếu filesystem giữ lại chúng. Cách này giảm áp lực phải clean ngay, nhưng cần chính sách giới hạn và thu hồi version cũ để dung lượng không cạn.

## Trade-off

Sequential append tăng hiệu quả ghi nhưng random read cần tra mapping; filesystem cần xử lý snapshot/version và garbage collection. SSD đã có flash translation layer và garbage collection riêng, nên LFS trên SSD có thể tương tác với controller; không tự động luôn tốt hơn filesystem thường.

## Tóm tắt

- LFS ghi update tuần tự thành log segment.
- Gom đủ nhiều update trong một segment giúp amortize positioning cost của HDD.
- Inode map/checkpoint tìm bản mới và hỗ trợ recovery.
- Checkpoint region → inode map → inode → data; mapping tránh cập nhật dây chuyền directory khi inode di chuyển.
- Block cũ thành stale; cleaner gom live block để thu hồi segment.
- Segment summary cùng inode map/inode xác định block live; hot/cold policy ảnh hưởng chi phí cleaning.
- Cleaning cost phụ thuộc tỷ lệ live data và policy.
- Hai checkpoint region và roll-forward hỗ trợ phục hồi sau crash.
- SSD/controller có tầng garbage collection riêng cần xét.

## Tự kiểm tra

**LFS không bao giờ phải ghi đè/clean?** Nó ghi append nhưng cần cleaning để tái sử dụng dung lượng.

**Log-structured luôn tốt trên SSD?** Không; mapping/GC ở filesystem và device tương tác phức tạp.

**Checkpoint chứa mọi dữ liệu file?** Không; nó hỗ trợ định vị metadata/log state.

## Đọc tiếp

So sánh LFS với journaling và copy-on-write để hiểu các cơ chế crash consistency.

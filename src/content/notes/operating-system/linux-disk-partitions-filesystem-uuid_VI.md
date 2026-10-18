---
title: "Disk, partition, filesystem và UUID"
category: "Operating System"
tags: ["linux", "storage", "filesystem", "partition"]
description: "Lần theo thiết bị block từ disk tới partition, filesystem và mount; chọn định danh bền vững khi cấu hình boot."
updated: 2026-10-16
translationKey: "operating-system/linux-disk-partitions-filesystem-uuid"
---

Disk là thiết bị block; partition chia không gian thành vùng; filesystem tạo cấu trúc file trên partition hoặc volume khác; mount gắn filesystem vào cây thư mục. Các lớp này có thể được bỏ qua hoặc thay bằng LVM, RAID, encryption hay network block device.

## Định danh

`/dev/sda` là tên kernel có thể thay đổi theo thứ tự phát hiện. UUID nhận diện filesystem, PARTUUID nhận diện partition; label là tên do quản trị đặt. `lsblk -f`, `blkid` và `findmnt` liên kết các lớp này.

## Phân vùng và format

GPT lưu partition table với GUID và hỗ trợ đĩa lớn/nhiều partition hơn MBR. Partition table không phải filesystem. `mkfs` tạo filesystem metadata và có thể làm mất dữ liệu cũ; `mount` không tự format. Trước mọi thao tác ghi, xác minh đúng device, dung lượng, model, serial, mount và backup.

Partition table chỉ ghi ranh giới các vùng trên disk. MBR có giới hạn lịch sử bốn mục primary; một mục có thể làm extended partition chứa các logical partition. GPT lưu thêm thông tin như tên/GUID của partition. Cột “filesystem” mà công cụ hiển thị có thể được dò từ nội dung partition, không nhất thiết là trường filesystem trong partition table.

Sau khi công cụ user space sửa bảng, kernel cần đọc lại để cập nhật các block device đại diện partition. Công cụ có thể yêu cầu kernel đọc lại theo cách khác nhau; nếu partition đang được sử dụng, kernel có thể từ chối cập nhật. `fdisk` thường cho xem lại thay đổi trước khi ghi khi thoát bằng lệnh xác nhận; một số chế độ công cụ khác áp dụng từng lệnh ngay. Luôn đọc hướng dẫn của phiên bản đang dùng và xác nhận đúng disk trước khi ghi bảng.

Địa chỉ CHS (cylinder-head-sector) là mô hình hình học đĩa cũ; ổ hiện đại dùng LBA để đánh số block logic, nên số cylinder mà thiết bị báo thường không phản ánh hình học vật lý thật. Với SSD, căn chỉnh partition theo ranh giới phù hợp giúp tránh một thao tác nhỏ phải chạm nhiều page nội bộ. Công cụ phân vùng hiện đại thường căn chỉnh mặc định; có thể xem offset partition trong `/sys/block/<disk>/<partition>/start` (đơn vị kernel báo cần được hiểu đúng theo hệ thống).

## Mount bền vững

`/etc/fstab` thường dùng UUID để mount ổn định qua boot. Sai UUID hoặc filesystem type có thể đưa máy vào emergency mode; option như `nofail` thay đổi cách boot xử lý thiết bị vắng mặt. Thử mount từng entry và kiểm tra `findmnt` trước reboot.

## Tự kiểm tra

**Partition table và filesystem là một?** Không.

**`mkfs` chỉ đăng ký filesystem mà không đụng dữ liệu?** Nó ghi metadata và có thể phá dữ liệu cũ.

**Tên `/dev/sdX` luôn ổn định?** Không.

## Đọc tiếp

LVM đặt thêm lớp logical volume giữa partition/device và filesystem.

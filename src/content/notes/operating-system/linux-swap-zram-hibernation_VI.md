---
title: "Swap file, zram và hibernation"
category: "Operating System"
tags: ["linux", "memory", "swap"]
description: "Phân biệt swap disk với zram và swap dùng cho hibernation; kiểm tra kích thước, priority và resume device."
updated: 2026-10-16
translationKey: "operating-system/linux-swap-zram-hibernation"
---

Linux có thể dùng partition/file trên storage làm swap, hoặc nén trang trong RAM bằng zram. Swap disk giải phóng RAM nhưng I/O chậm; zram đổi CPU để giữ thêm dữ liệu nén trong memory. Đây là lựa chọn khác nhau theo workload và không tạo RAM vật lý mới.

## Swap device và priority

`swapon --show` liệt kê swap đang dùng; `free` cho tổng quan. Kernel có thể có nhiều swap area với priority khác nhau. Swap file cần được tạo trên filesystem hỗ trợ đúng semantics; một số filesystem cần bước chuẩn bị riêng.

## Hibernation

Hibernation ghi image RAM xuống swap hoặc thiết bị được cấu hình rồi tắt máy. Resume cần kernel/initramfs tìm đúng resume device, swap đủ chỗ theo workload và encryption setup tương thích. Swap hoạt động bình thường không chứng minh hibernation đã cấu hình.

## zram

zram tạo block device nén trong RAM, thường dùng swap. Nó hữu ích khi dữ liệu nén tốt và CPU còn dư; dữ liệu khó nén hoặc CPU bận làm lợi ích thấp. zswap là cache nén trước swap backing khác, semantics khác zram.

## Tự kiểm tra

**zram tạo dung lượng RAM miễn phí?** Không; nó nén dữ liệu và tiêu thụ CPU/RAM.

**Swap disk nhanh bằng RAM?** Không.

**Có swap nghĩa hibernation hoạt động?** Không.

## Đọc tiếp

Memory pressure và OOM behavior cho biết swap có giúp workload hay chỉ che thrashing.

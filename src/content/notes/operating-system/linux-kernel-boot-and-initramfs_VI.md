---
title: "Kernel, bootloader và initramfs: Linux bắt đầu chạy ra sao?"
category: "Operating System"
tags: ["linux", "kernel", "boot", "initramfs"]
description: "Lần theo đường đi từ firmware đến kernel và root filesystem, đồng thời biết chỗ kiểm tra khi máy không khởi động."
updated: 2026-10-16
translationKey: "operating-system/linux-kernel-boot-and-initramfs"
---

Khi bật máy, Linux chưa thể lập tức chạy ứng dụng. Firmware phải tìm thiết bị khởi động; bootloader nạp kernel; nhiều hệ thống dùng một môi trường tạm để tìm và gắn root filesystem thật. Mỗi chặng có trách nhiệm riêng, nên lỗi khởi động thường được khoanh vùng theo thứ tự này.

## Từ firmware đến bootloader

Firmware (BIOS hoặc UEFI) khởi tạo phần cứng cơ bản rồi chọn mục khởi động theo cấu hình. Với UEFI, một EFI System Partition chứa chương trình `.efi`; GRUB thường cung cấp menu để chọn kernel và tham số dòng lệnh. Máy dùng BIOS có thể đi qua mã khởi động trên đĩa trước khi tới GRUB.

Bootloader không phải Linux kernel. Nó chọn và nạp kernel cùng initramfs vào bộ nhớ, rồi chuyển quyền điều khiển. Tham số kernel như `root=`, `ro` hoặc `quiet` ảnh hưởng giai đoạn kernel khởi động.

## Kernel và initramfs

Kernel khởi tạo bộ nhớ, bộ lập lịch, driver thiết yếu và các subsystem. Nhưng root filesystem thật có thể nằm trên NVMe cần driver, trong volume mã hóa, LVM hoặc thiết bị mạng. Kernel chưa thể đọc nơi chứa chính hệ thống nếu thiếu các thành phần đó.

Initramfs là root filesystem nhỏ được nạp cùng kernel. Một chương trình khởi tạo trong đó có thể nạp module, mở khóa ổ mã hóa, ghép RAID/LVM, rồi tìm và mount root thật. Sau đó nó chuyển sang hệ thống thật bằng `switch_root` hoặc cơ chế tương đương. Initramfs không phải filesystem gốc lâu dài.

## PID 1 và userspace

Khi initramfs có `/init`, kernel đã chạy nó với PID 1 trước khi root thật sẵn sàng. Chương trình này chuẩn bị root rồi chuyển quyền điều khiển sang init của hệ thống bằng `exec`, vẫn giữ PID 1. Nếu không có `/init` trong initramfs, kernel có thể mount root rồi chạy init trực tiếp. Trên nhiều bản phân phối, init cuối cùng là systemd, dựng dịch vụ và target để người dùng đăng nhập. Xem [tài liệu initramfs của kernel](https://docs.kernel.org/filesystems/ramfs-rootfs-initramfs.html).

## Khoanh vùng lỗi khởi động

Nếu không thấy đĩa trong firmware, hãy kiểm tra phần cứng và thứ tự boot. Nếu thấy GRUB nhưng không thấy kernel phù hợp, kiểm tra cấu hình boot và phân vùng EFI. Nếu kernel panic khi tìm root, tập trung vào `root=`, driver lưu trữ, initramfs, UUID, mã hóa và cấu hình LVM/RAID. Nếu đã tới emergency mode, kernel đã chạy; lỗi thường nằm ở mount, filesystem hoặc dịch vụ userspace.

Các công cụ thường hữu ích sau khi vào được hệ thống gồm `journalctl -b`, `dmesg`, `lsblk -f`, `blkid`, `findmnt` và `systemctl --failed`. Từ một bản live USB, có thể kiểm tra filesystem và cấu hình trên đĩa mà không cần boot vào hệ thống đó.

## Tự kiểm tra

**Bootloader có phải kernel không?** Không. Bootloader nạp kernel và chuyển quyền điều khiển.

**Vì sao cần initramfs nếu đã có kernel?** Kernel có thể cần driver hoặc logic userspace để tìm, mở khóa và ghép root filesystem.

**GRUB hiện menu nghĩa là Linux đã chạy chưa?** Chưa; đó mới là bootloader.

## Đọc tiếp

Khi userspace bắt đầu, systemd nhận vai trò PID 1 và quản lý unit, dependency cùng các dịch vụ.

---
title: "Device tree: firmware, kernel và userspace"
category: "Operating System"
tags: ["linux", "devices", "kernel"]
description: "Theo dõi cách firmware mô tả phần cứng, kernel tạo device model và userspace nhận sự kiện qua sysfs/udev."
updated: 2026-10-16
translationKey: "operating-system/linux-userspace-proc-sysfs-device-tree"
---

Kernel không thể giả định mọi máy có cùng thiết bị hay địa chỉ phần cứng. Kernel nhận mô tả phần cứng từ ACPI hoặc Device Tree, đồng thời có thể khám phá thiết bị qua bus enumeration như PCI/USB. Kernel kết hợp các nguồn này để khởi tạo driver và xây device model. Userspace như udev tiếp nhận event để tạo node và tên dễ dùng.

## Device tree và ACPI

Device tree phổ biến trên nhiều hệ thống embedded/ARM để mô tả CPU, bus, memory và thiết bị. ACPI thường gặp trên PC/server, mô tả cấu hình và power management. Driver dùng firmware data cùng ID bus/device để bind tới phần cứng.

## Từ kernel tới userspace

Kernel phát uevent khi thiết bị xuất hiện hoặc thay đổi. Udev áp rule dựa trên thuộc tính sysfs, đặt quyền, tạo symlink ổn định và gọi helper phù hợp. `/dev` node có thể được tạo động; không nên xem tên node tạm thời là định danh bền vững.

## Điều tra

`udevadm info`, `udevadm monitor`, `lspci -nnk`, `lsusb`, sysfs và `dmesg` cho các tầng khác nhau. Nếu thiết bị thấy trên bus nhưng driver không bind, kiểm tra ID/firmware/module; nếu driver bind nhưng app không truy cập, kiểm tra node, permission và service.

## Tự kiểm tra

**Udev là một phần của kernel?** Không; nó là userspace daemon xử lý event.

**Device tree và driver là một?** Không; tree mô tả phần cứng, driver điều khiển nó.

**Có `/dev` node chứng minh driver hoạt động đầy đủ?** Không.

## Đọc tiếp

Kernel module và driver quyết định cách thiết bị được điều khiển sau khi phát hiện.

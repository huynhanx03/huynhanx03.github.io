---
title: "Linux boot: từ firmware tới kernel"
category: "Operating System"
tags: ["linux", "boot", "uefi", "kernel"]
description: "Lần theo trình tự firmware, bootloader, kernel, initramfs và tiến trình PID 1 khi Linux khởi động."
updated: 2026-10-16
translationKey: "operating-system/linux-boot-process"
---

Khi bật máy, Linux chưa chạy ngay. Firmware khởi tạo phần cứng và tìm chương trình boot; bootloader nạp kernel; kernel khởi tạo subsystem và tìm root filesystem; cuối cùng chương trình init khởi động dịch vụ user space.

## Firmware và bootloader

Firmware như BIOS/UEFI kiểm tra/khởi tạo phần cứng rồi chọn thiết bị hoặc mục boot. Bootloader như GRUB có thể hiển thị menu, chọn kernel và truyền command line/initramfs. Cách nạp khác nhau giữa legacy BIOS và UEFI; Secure Boot thêm bước kiểm tra chữ ký theo cấu hình.

Bootloader không phải kernel. Nó chuẩn bị môi trường để kernel bắt đầu, nhưng không quản lý process user sau khi hệ thống đã lên.

GRUB có cách gọi và đánh địa chỉ thiết bị riêng; chữ `root` trong cấu hình GRUB có thể chỉ nơi GRUB tìm file kernel, còn tham số Linux `root=` chỉ filesystem mà kernel phải mount làm `/`. Chúng là hai khái niệm khác nhau dù cùng dùng tên `root`. Trên UEFI, bootloader thường là file `.efi` trong EFI System Partition; trên BIOS/MBR có thể cần nhiều giai đoạn nạp vì vùng mã ban đầu rất nhỏ. GRUB là một lựa chọn phổ biến, không phải thành phần bắt buộc duy nhất.

Nhiều distro tạo `grub.cfg` từ các file cấu hình và script khác; sửa trực tiếp file được sinh có thể bị ghi đè. Dùng quy trình cấu hình của distro rồi tạo lại cấu hình theo tài liệu của phiên bản đang chạy.

## Kernel và initial RAM filesystem

Kernel khởi tạo bộ nhớ, CPU, interrupt, driver và các subsystem cần thiết. Để tìm root filesystem, kernel có thể cần module hoặc công cụ chưa có trên root disk ban đầu. **initramfs** cung cấp một filesystem tạm trong RAM với driver/script cần để khám phá thiết bị, mở mã hóa/RAID/LVM nếu cấu hình, rồi chuyển root sang filesystem thật.

Nếu kernel không tìm được root device, lỗi có thể nằm ở boot parameter, driver, UUID, initramfs hoặc cấu hình storage. Dòng log console thường giúp xác định bước cuối thành công.

Kernel command line hiện tại nằm ở `/proc/cmdline`. `journalctl -k` xem log kernel của lần boot hiện tại; `journalctl -k -b -1` thường xem lần boot trước nếu journal lưu log persistent. Nếu không có systemd-journald, `dmesg` hoặc log kernel của distro có thể cung cấp thông tin tương tự.

## PID 1 và user space

Nếu initramfs có `/init`, kernel chạy chương trình đó với PID 1 ngay trong môi trường tạm. Sau khi tìm và mount root thật, nó có thể chuyển root rồi `exec` init của hệ thống, giữ nguyên PID 1. Khi không dùng initramfs có `/init`, kernel có thể mount root rồi chạy init trực tiếp. Trên nhiều distro hiện đại, init cuối cùng là systemd; hệ thống khác có thể dùng init khác. PID 1 tiếp tục khởi chạy dịch vụ và quản lý vòng đời chúng. Xem [tài liệu initramfs của kernel](https://docs.kernel.org/filesystems/ramfs-rootfs-initramfs.html).

Nếu init không chạy hoặc thoát không đúng, hệ thống có thể dừng ở emergency shell hoặc kernel panic tùy lỗi. Vì PID 1 chịu trách nhiệm đặc biệt, hành vi signal và dọn dẹp của nó có quy tắc riêng.

## Cách điều tra lỗi boot

1. Xác định lỗi trước hay sau khi bootloader khởi chạy kernel.
2. Ghi lại thông báo kernel và kernel command line.
3. Kiểm tra root device, UUID, driver và initramfs.
4. Nếu tới user space, xem trạng thái unit/init và journal.
5. Thay từng yếu tố có thể đảo lại, tránh chỉnh partition/bootloader khi chưa có bản sao cấu hình.

Boot có nhiều tầng; “màn hình đen” chưa chỉ ra tầng nào hỏng. Distro và firmware khác nhau, nên hướng dẫn sửa cụ thể cần dựa trên log và layout máy.

## Tóm tắt

- Firmware chọn và khởi chạy bootloader.
- Bootloader nạp kernel cùng tham số và có thể truyền initramfs.
- Kernel khởi tạo driver/subsystem; initramfs giúp tìm và mount root.
- Kernel khởi chạy PID 1 để đưa user space lên.
- Lỗi boot cần định vị theo tầng từ firmware tới init.

## Tự kiểm tra

**GRUB là thành phần quản lý dịch vụ sau khi Linux boot xong?** Không; nó là bootloader.

**initramfs là root filesystem lâu dài?** Thường không; đó là môi trường tạm hỗ trợ boot tới root thật.

**PID 1 luôn là systemd?** Không; tùy hệ thống.

## Đọc tiếp

Trên hệ dùng systemd, PID 1 quản lý unit và thứ tự dịch vụ như thế nào? Xem bài kế tiếp.

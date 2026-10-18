---
title: "Linux storage: partition, filesystem, mount và LVM"
category: "Operating System"
tags: ["linux", "storage", "mount", "lvm"]
description: "Theo tầng block device tới mount point, đọc fstab/UUID và hiểu vai trò của swap cùng LVM."
updated: 2026-10-16
translationKey: "operating-system/linux-storage-mounts"
---

Linux thống nhất nhiều filesystem thành một cây đường dẫn bắt đầu từ `/`. Một filesystem trên partition hoặc volume được nối vào cây tại **mount point**. Đường dẫn file vì vậy không nhất thiết tiết lộ thiết bị vật lý đang chứa nó.

## Từ thiết bị tới mount point

```text
thiết bị block → partition/volume → filesystem → mount point → pathname
```

Ổ vật lý có thể chứa partition table; partition lại chứa filesystem hoặc được ghép thành LVM logical volume. UUID giúp tham chiếu filesystem ổn định hơn tên `/dev/sdX`, vốn có thể đổi theo thứ tự phát hiện.

`lsblk -f` xem thiết bị, filesystem và UUID; `blkid` đọc metadata; `findmnt` xem cây mount. Cần xác nhận target trước khi chạy lệnh tạo filesystem vì thao tác format phá dữ liệu trên đối tượng được chọn.

## Mount và `/etc/fstab`

Mount gắn filesystem vào một directory. Các mount options điều chỉnh quyền, cách diễn giải và hành vi I/O. `/etc/fstab` mô tả mount cần thiết lúc boot và một số tùy chọn; cú pháp sai có thể làm boot chờ hoặc vào emergency mode.

Để mount, hệ thống cần biết nguồn (thiết bị/UUID hoặc nguồn logic), loại filesystem và mount point. `mount` hiển thị các filesystem hiện đang gắn; một số nguồn như `proc`, `sysfs`, `devtmpfs` và `tmpfs` là filesystem ảo hoặc trong bộ nhớ, không phải partition có dữ liệu trên disk. `umount` tháo filesystem khỏi cây, và có thể thất bại khi process còn dùng nó.

Một số filesystem đặc biệt khác có mục đích riêng: `overlay` ghép nhiều directory thành một cây nhìn thấy được và thường được dùng trong container; `squashfs` là filesystem chỉ đọc, lưu nội dung nén và có thể được mount qua loop device. `tmpfs` dùng RAM và có thể dùng swap theo cấu hình, nên vẫn có giới hạn tài nguyên; nó không phải nơi lưu dữ liệu bền vững qua reboot.

`mkfs` là giao diện gọi công cụ tạo filesystem tương ứng, chẳng hạn `mkfs -t ext4` gọi trình tạo ext filesystem. Tạo filesystem ghi cấu trúc mới lên thiết bị, vì thế chỉ làm với partition/volume đã xác định đúng và dữ liệu cũ không còn cần giữ.

Sau khi sửa, có thể kiểm tra cấu hình bằng công cụ hệ thống và thử mount có kế hoạch rollback. Trên systemd, mount có thể được chuyển thành unit. Không mount vào directory đang chứa dữ liệu cần thiết mà không hiểu dữ liệu cũ sẽ bị che khuất trong thời gian mount.

## LVM và tầng trừu tượng

Logical Volume Manager gom physical volume thành volume group rồi cấp logical volume. Nó cho phép thay đổi kích thước/ghép thiết bị linh hoạt hơn partition tĩnh, nhưng filesystem phía trên phải hỗ trợ resize tương ứng và thao tác cần đúng thứ tự.

LVM không tự bảo vệ khỏi hỏng thiết bị và không thay RAID/backup. Snapshot LVM là cơ chế theo dõi block thay đổi với giới hạn dung lượng và hiệu năng; không mặc định là backup độc lập.

## Swap

Swap có thể là partition hoặc file được kernel dùng để giữ page ít hoạt động. Dung lượng phù hợp tùy áp lực RAM, workload, hibernation và chính sách máy. Theo dõi paging thực tế thay vì chỉ nhìn phần trăm swap đã dùng.

`/etc/fstab` có sáu trường: nguồn, mount point, filesystem type, options, trường tương thích với `dump`, và thứ tự kiểm tra filesystem lúc boot. Các trường cuối vẫn cần giá trị đúng định dạng dù hệ thống hiện đại có thể ít dùng chúng. `UUID=` giúp cấu hình không phụ thuộc thứ tự `/dev/sdX`; `noauto` bỏ qua entry trong `mount -a`, còn options như `ro`, `nosuid`, `nodev` và `noexec` thay đổi khả năng ghi hoặc diễn giải nội dung. Kiểm tra hành vi theo `mount(8)` và cấu hình distro trước khi áp dụng.

## Tóm tắt

- Mount nối filesystem vào cây pathname thống nhất.
- UUID bền hơn thứ tự tên device nhưng vẫn cần kiểm tra target.
- `fstab` khai báo mount; sai cấu hình có thể ảnh hưởng boot.
- LVM tạo lớp volume linh hoạt nhưng không tự tạo redundancy/backup.
- Swap bổ sung backing cho page ít dùng, không có tốc độ RAM.

## Tự kiểm tra

**`/home` nhất thiết nằm cùng partition với `/`?** Không; có thể là filesystem riêng được mount.

**LVM snapshot là backup ở thiết bị khác?** Không nhất thiết; thường nằm trong cùng storage pool.

**Tên `/dev/sdb` giữ nguyên sau reboot?** Không đảm bảo; dùng nhận dạng ổn định và xác minh.

## Đọc tiếp

Nếu mount hoặc dịch vụ boot lỗi, log và dependency giúp xác định tầng gặp vấn đề.

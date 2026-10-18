---
title: "Kernel module, driver và thiết bị Linux"
category: "Operating System"
tags: ["linux", "kernel", "driver", "module"]
description: "Phân biệt driver built-in và module, theo dõi thiết bị từ kernel tới /dev, và xử lý module theo cách có thể kiểm chứng."
updated: 2026-10-16
translationKey: "operating-system/linux-kernel-modules-and-devices"
---

Driver là phần mềm điều khiển hoặc giao tiếp với thiết bị. Trong Linux, driver có thể được biên dịch trực tiếp vào kernel hoặc nạp như kernel module. `/dev` chứa special file để userspace truy cập thiết bị; file này là điểm giao tiếp, không phải bản thân driver hay dữ liệu thiết bị.

## Từ phần cứng tới `/dev`

Kernel phát hiện thiết bị qua bus hoặc firmware, ghép driver phù hợp rồi công bố sự kiện. Với thiết bị character/block, kernel cấp major/minor number. Trên hệ dùng devtmpfs, kernel thường tạo node cơ bản; udev nhận sự kiện, áp quyền và tạo symlink theo rule, đồng thời có thể quản lý node khi cần. Có thiết bị khác được điều khiển qua sysfs, socket hoặc API riêng thay vì một node đơn giản.

Tên như `/dev/nvme0n1` và `/dev/sda` phản ánh cách kernel nhận diện thiết bị, nhưng có thể thay đổi theo cấu hình. UUID, label hoặc symlink được thiết lập ổn định thích hợp hơn cho cấu hình mount lâu dài.

## Vì sao ổ USB và SATA có thể đi qua lớp SCSI

Tên `/dev/sdX` không chứng minh thiết bị bên dưới là phần cứng SCSI cổ điển. Linux dùng lớp SCSI chung cho nhiều thiết bị lưu trữ. Một thiết bị USB storage thường gửi lệnh SCSI được đóng gói qua USB; driver USB storage làm cầu nối giữa hai subsystem. Ổ SATA có thể được đưa vào cùng lớp qua `libata`, nơi chuyển yêu cầu SCSI từ lớp trên thành lệnh ATA cho thiết bị SATA. Vì vậy cây trong `/sys` có thể lần từ block device qua SCSI tới USB hoặc SATA. Xem [libATA SCSI translation](https://docs.kernel.org/driver-api/libata.html#libata-scsi-translation-emulation).

Ở mức khái niệm, subsystem SCSI có ba lớp: driver lớp thiết bị (như `sd` cho disk hoặc `sr` cho optical media), lớp trung gian quản lý và định tuyến lệnh, rồi driver host adapter/phần cứng. Tách lớp giúp cùng một loại thao tác lưu trữ hoạt động trên nhiều bus và controller. Lệnh `lsscsi` có thể cho thấy host, bus, target và logical unit; `lsusb` giúp quan sát phía USB.

Phần lớn ứng dụng dùng đường dẫn block thông thường như `/dev/sda`. Một số thiết bị còn có generic SCSI interface `/dev/sg*`, cho phép chương trình userspace gửi lệnh SCSI trực tiếp khi cần thao tác đặc thù. Đây là giao diện chuyên dụng, không phải cách đọc/ghi file thông thường.

## Module và dependency

`lsmod` cho module đang nạp; `modinfo driver` xem metadata; `modprobe driver` nạp module và dependency; `modprobe -r driver` thử gỡ khi không còn được sử dụng. Module có thể thất bại do thiếu firmware, sai phiên bản kernel, Secure Boot hoặc thiết bị không khớp.

`dmesg` và journal kernel thường cho lý do cụ thể. Việc thêm module vào cấu hình boot làm thay đổi hệ thống ở các lần khởi động sau; trước đó nên thử nạp tạm và xác nhận thiết bị hoạt động.

## Quyền truy cập và an toàn

Quyền trên `/dev` kiểm soát process nào có thể gửi lệnh tới thiết bị. Quy tắc udev có thể đặt group hoặc mode; cấp quyền rộng bừa bãi có thể cho ứng dụng truy cập trực tiếp thiết bị, bỏ qua lớp bảo vệ thông thường. Container thường cần device allowlist riêng thay vì chia sẻ toàn bộ `/dev`.

Không tự xóa node `/dev` để “sửa driver”: udev có thể tạo lại node, còn nguyên nhân thường ở module, firmware, quyền hoặc thiết bị. Hãy so sánh trạng thái phần cứng, log kernel, sysfs và node tương ứng.

## Tự kiểm tra

**`/dev/sda` có phải driver không?** Không; đó là node đại diện thiết bị block.

**`lsmod` liệt kê mọi driver kể cả built-in?** Không; nó chủ yếu liệt kê module đang nạp.

**Thấy node trong `/dev` chứng minh ổ đĩa đã mount?** Không; cần kiểm tra filesystem và mount table.

**Ổ `/dev/sda` nhất thiết là ổ SCSI thật?** Không; SATA và USB storage cũng có thể được trình bày qua lớp SCSI của Linux.

## Đọc tiếp

Thiết bị block thường đi qua device mapper, LVM hoặc lớp filesystem trước khi ứng dụng đọc file.

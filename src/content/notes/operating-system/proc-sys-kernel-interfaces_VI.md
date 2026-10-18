---
title: "/proc, /sys và giao diện kernel"
category: "Operating System"
tags: ["linux", "procfs", "sysfs", "kernel"]
description: "Phân biệt thông tin process trong procfs với mô hình thiết bị trong sysfs, và đọc các giao diện kernel an toàn."
updated: 2026-10-16
translationKey: "operating-system/proc-sys-kernel-interfaces"
---

Linux cung cấp nhiều thông tin kernel qua filesystem ảo. Tên giống file nhưng nội dung có thể được tạo khi đọc và phản ánh trạng thái hiện tại; ghi vào một số nút có thể thay đổi cấu hình kernel. Vì vậy, cần biết mình đang đọc loại giao diện nào trước khi sửa.

## `/proc`: process và trạng thái kernel

`/proc` thường chứa một thư mục cho mỗi PID, như `/proc/1234/`. `status` mô tả trạng thái và bộ nhớ ở dạng dễ đọc; `cmdline` chứa đối số process; `fd/` liên kết tới file descriptor đang mở; `maps` cho biết các vùng địa chỉ ảo được ánh xạ. Một số file như `/proc/meminfo`, `/proc/cpuinfo` và `/proc/interrupts` cung cấp thống kê toàn hệ thống.

Các con số ở `/proc/PID/stat` có định dạng gọn và một số trường phụ thuộc kernel; công cụ như `ps` thường giúp đọc dễ hơn. PID namespace cũng có nghĩa một process có thể thấy PID khác nhau từ những namespace khác nhau.

## `/sys`: thiết bị, driver và thuộc tính

`sysfs` biểu diễn thiết bị, bus, driver và quan hệ giữa chúng. `/sys/devices` phản ánh cây thiết bị; `/sys/class` gom thiết bị theo chức năng; `/sys/bus` và `/sys/module` cho biết bus và module. Udev quan sát sự kiện và tạo tên thiết bị trong `/dev`, còn sysfs là nơi thể hiện mô hình kernel.

Một số thuộc tính sysfs cho phép cấu hình, nhưng đây là giao diện có quy tắc riêng của kernel/driver. Không nên ghi giá trị chỉ vì file cho phép ghi: hãy kiểm tra tài liệu của thuộc tính, kiểu dữ liệu, phạm vi và tác động.

## `/proc/sys` và sysctl

Các tham số điều chỉnh kernel thường được trình bày dưới `/proc/sys/`. Lệnh `sysctl -a` liệt kê; `sysctl net.ipv4.ip_forward` đọc một tham số; ghi tạm thời có thể đổi trạng thái hiện tại. Để lưu qua reboot, bản phân phối thường dùng file cấu hình trong `/etc/sysctl.d/` rồi nạp lại bằng `sysctl --system`.

Thay đổi runtime có thể biến mất khi reboot. Ngược lại, cấu hình bền vững có thể được nạp lại dù ta nghĩ mình chỉ thử tạm. Ghi rõ nơi thay đổi, giá trị cũ và cách khôi phục.

## Tự kiểm tra

**`/proc/1234` là thư mục dữ liệu tĩnh trên đĩa?** Thường không; procfs cung cấp dữ liệu kernel động.

**Udev và sysfs là một?** Không. Sysfs thể hiện mô hình thiết bị của kernel; udev xử lý sự kiện userspace và quy tắc tên/quyền trong `/dev`.

**Thay đổi `sysctl` runtime có tự tồn tại sau reboot?** Không, trừ khi được lưu trong cấu hình bền vững.

## Đọc tiếp

Phân vùng và volume lưu trữ cũng có nhiều lớp; LVM giúp quản lý dung lượng logic trên các thiết bị vật lý.

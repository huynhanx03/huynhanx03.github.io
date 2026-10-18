---
title: "Thiết bị trong Linux: /dev, sysfs và udev"
category: "Operating System"
tags: ["linux", "devices", "udev", "kernel"]
description: "Phân biệt device node với thiết bị vật lý, khám phá sysfs và cách udev phản ứng với sự kiện thiết bị."
updated: 2026-10-16
translationKey: "operating-system/linux-devices-udev"
---

Trong Linux, nhiều thiết bị xuất hiện dưới dạng đường dẫn trong `/dev`, nhưng file ở đó không phải bản thân phần cứng. Device node là một giao diện để kernel định tuyến thao tác tới driver tương ứng.

## Device file và major/minor number

Device node chứa loại và số major/minor để kernel chọn driver/device. Tên như `/dev/sda` hay `/dev/nvme0n1` là quy ước quan sát phổ biến, không đảm bảo mọi máy dùng cùng tên/thứ tự.

Một số thiết bị có tên ổn định hơn qua UUID, serial hoặc symlink do udev tạo. Script quản trị không nên mặc định ổ USB luôn là `/dev/sdb`; thứ tự phát hiện có thể thay đổi.

Không phải mọi thiết bị đều có node trong `/dev`: card mạng thường được dùng qua giao diện socket và tên interface như `eth0` hoặc `enp3s0`, chứ không được mở như `/dev/...`. Vì vậy, `/dev` là một phần của giao diện thiết bị Linux, không phải danh sách đầy đủ mọi phần cứng.

### Character device và block device

Character device thường cung cấp luồng byte hoặc thao tác đặc thù; terminal và cổng nối tiếp là ví dụ. Block device cho phép truy cập dữ liệu theo vị trí trong các khối, như ổ đĩa. Device node lưu loại thiết bị cùng major/minor number; kernel dùng các số này để định tuyến thao tác đến driver. Named pipe cũng có thể được tạo bằng `mknod`, nhưng không có major/minor như device node.

### Terminal thật, terminal ảo và pseudoterminal

Kernel cung cấp giao diện terminal thống nhất. Terminal ảo như `/dev/tty1` gắn với một virtual console; pseudoterminal như `/dev/pts/0` mô phỏng giao diện terminal bằng phần mềm, thường được dùng bởi cửa sổ terminal đồ họa hoặc SSH. `/dev/tty` là tên tham chiếu đến controlling terminal của tiến trình hiện tại, nếu tiến trình có terminal điều khiển. Một tiến trình chạy nền có thể không có terminal.

Các cổng serial thường xuất hiện dưới tên `/dev/ttyS*`, `/dev/ttyUSB*` hoặc `/dev/ttyACM*`. Chúng vẫn là terminal device, nhưng cần cấu hình baud rate, flow control và quyền truy cập phù hợp; tên cụ thể phụ thuộc thiết bị và hệ thống.

## sysfs biểu diễn thiết bị và quan hệ

`/sys` là filesystem ảo do kernel cung cấp, phơi bày thuộc tính thiết bị, driver, bus và quan hệ cha-con. Nó giúp công cụ khám phá trạng thái mà không cần đọc register phần cứng trực tiếp. Nội dung có thể thay theo kernel và driver.

Device tree trong sysfs cho thấy cùng thiết bị có thể được nhìn qua nhiều subsystem: USB bus, SCSI layer, block device. Linux có thể trình bày thiết bị USB storage qua SCSI abstraction dù phần cứng không phải ổ SCSI cổ điển.

## udev xử lý hotplug

Kernel phát uevent khi thiết bị được thêm/bỏ hoặc thuộc tính thay đổi. Trên hệ thống hiện đại, `devtmpfs` giúp kernel tạo node cơ bản kịp thời trong quá trình boot. `udev` daemon ở user space nhận uevent, đọc thuộc tính của thiết bị, áp rule, thiết lập quyền và tạo symlink bổ sung như `/dev/disk/by-id/...`. Tách hai vai trò này giúp thiết bị có node sớm mà vẫn cho phép user space áp chính sách và tên dễ nhận biết.

Rule có thể so khớp theo tên kernel, subsystem và thuộc tính. Trong cú pháp udev, `==` và `!=` là điều kiện; `=` gán giá trị, còn `+=` thêm giá trị, chẳng hạn thêm symlink. Có thể xem thuộc tính đã biết bằng `udevadm info --query=all --name=/dev/...` và theo dõi sự kiện mới bằng `udevadm monitor --property`. Rule mặc định của distro thường nằm trong thư mục hệ thống; rule tùy chỉnh được đặt ở thư mục cấu hình của hệ thống. Chi tiết đường dẫn và cú pháp nên kiểm tra trong `udev(7)` vì có thể khác theo phiên bản.

Rule cần tránh hành động chậm/lặp lại nguy hiểm trong lúc thiết bị đang thay đổi. Công cụ `udevadm monitor` giúp quan sát event; `udevadm info` đọc thuộc tính để xây rule. Cú pháp và lệnh cần kiểm tra theo distro.

## Quyền truy cập

Device node có owner, group và mode như file khác. Quyền truy cập quyết định user có thể mở thiết bị, nhưng device-specific permission và policy desktop có thể thay đổi qua session. Không chạy lệnh ghi thiết bị thô nếu chưa xác định chính xác target; ghi nhầm có thể phá partition hoặc dữ liệu.

## Tóm tắt

- `/dev` chứa node giao tiếp với driver, không phải file dữ liệu thông thường.
- Major/minor định tuyến thao tác; tên device có thể đổi theo thứ tự phát hiện.
- `/sys` bộc lộ thuộc tính và topology thiết bị của kernel.
- `devtmpfs` cung cấp node cơ bản; udev xử lý sự kiện ở user space, áp quy tắc và tạo liên kết bổ sung.
- `/dev/pts` chứa pseudoterminal; không phải mọi thiết bị, như interface mạng, đều có device node.
- Quyền device node và lệnh ghi thô cần được kiểm tra cẩn thận.

## Tự kiểm tra

**`/dev/sda` luôn là ổ trong đầu tiên?** Không; thứ tự có thể thay đổi.

**Device node chứa toàn bộ dữ liệu thiết bị?** Không; nó là giao diện tới driver/kernel.

**`/sys` là thư mục bình thường ghi file xuống đĩa?** Không; phần lớn là giao diện kernel dạng filesystem ảo.

## Đọc tiếp

Thiết bị và driver được khởi tạo trong quá trình boot; tiếp theo là đường đi từ firmware tới kernel.

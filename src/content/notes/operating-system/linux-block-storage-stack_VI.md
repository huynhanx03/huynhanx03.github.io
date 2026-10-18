---
title: "Linux block storage stack: device, partition, mapper và filesystem"
category: "Operating System"
tags: ["linux", "block device", "device mapper", "storage"]
description: "Theo request từ filesystem qua block layer tới NVMe/SCSI và các lớp mapper/RAID."
updated: 2026-10-16
translationKey: "operating-system/linux-block-storage-stack"
---

Khi đọc hoặc ghi file trên filesystem lưu trữ block, thao tác có thể đi qua VFS, filesystem, page cache, block layer, device mapper và driver trước khi tới controller. Lần đọc trúng page cache không cần request xuống thiết bị; filesystem mạng hoặc filesystem trong RAM có đường đi khác. Các lớp cho phép ghép encryption, LVM, RAID và thiết bị khác nhau mà filesystem vẫn dùng block interface.

## Block device và partition

Block device biểu diễn vùng storage có khả năng đọc/ghi theo block/sector. Partition table mô tả các vùng logic trên device; filesystem được tạo trên partition hoặc logical volume. NVMe/SCSI naming phản ánh bus/namespace topology, không phải thứ tự vốn có.

## Device mapper

Device mapper ánh xạ block logical sang device khác. LVM dùng nó cho logical volumes; dm-crypt mã hóa block; multipath chọn giữa nhiều đường tới storage; RAID layer có thể stripe/mirror. Nhiều tầng xếp chồng làm latency/error path khó debug hơn.

## Request và completion

Filesystem phát block request; block layer merge/split/schedule theo queue; driver gửi command tới controller; completion quay ngược lên. Error status có thể được retry hoặc trả cho caller theo policy. Device timeout thường cần phân biệt với filesystem corruption.

## Tóm tắt

- Block I/O đi qua nhiều tầng từ VFS/page cache tới driver/controller.
- Device mapper tạo volume logic cho LVM/encryption/multipath.
- Request có thể merge/split và hoàn tất bất đồng bộ.
- Lỗi thiết bị, timeout và filesystem error là các lớp khác nhau.
- Topology thật nên kiểm tra bằng `lsblk`, `dmsetup`, `nvme`/SCSI tools phù hợp.

## Tự kiểm tra

**Filesystem luôn nằm trực tiếp trên ổ vật lý?** Không; có thể nằm trên mapper/RAID/encryption.

**Tên `/dev/dm-0` nói rõ volume nào?** Không; dùng mapper metadata/symlink để xác định.

**Block error đồng nghĩa dữ liệu đã mất chắc?** Cần xem retry, redundancy và filesystem recovery.

## Đọc tiếp

RAID và device mapper xây lớp logic; endurance/write behavior của SSD vẫn ở bên dưới.

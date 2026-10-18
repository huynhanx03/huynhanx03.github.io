---
title: "LVM và device mapper: lớp dung lượng linh hoạt"
category: "Operating System"
tags: ["linux", "storage", "lvm"]
description: "Theo dõi cách physical volume, volume group và logical volume ánh xạ xuống block device, cùng quy trình kiểm tra an toàn."
updated: 2026-10-16
translationKey: "operating-system/linux-lvm-device-mapper"
---

Phân vùng đĩa chia thiết bị thành các vùng cố định. LVM thêm một lớp quản lý: nhiều vùng vật lý có thể tạo thành pool, rồi logical volume được cấp từ pool đó. Hệ thống file vẫn cần được tạo trên logical volume và mount như bình thường.

## Ba khái niệm chính

- **Physical Volume (PV):** thiết bị hoặc partition được LVM quản lý.
- **Volume Group (VG):** pool dung lượng hợp nhất từ một hay nhiều PV.
- **Logical Volume (LV):** thiết bị block logic được cấp từ VG.

Device mapper hiện thực các ánh xạ block ở kernel; LVM quản lý metadata và cấu hình các ánh xạ đó. LVM không tự tạo bản sao dữ liệu, không thay RAID và không thay backup.

VG được chia thành các physical extent (PE) có kích thước cố định; LV được cấp từ các extent này rồi hiện ra như block device. Dung lượng đã cấp cho LV khác với dung lượng filesystem thực tế đang dùng bên trong nó. `pvs`, `vgs`, `lvs` cho các góc nhìn lần lượt theo PV, VG và LV; `vgdisplay` hoặc `lvdisplay` cung cấp thêm metadata khi cần điều tra.

LVM2 chủ yếu là bộ công cụ user space: nó đọc metadata PV/VG/LV, tính ra các đoạn ánh xạ rồi nạp chúng vào device mapper trong kernel. Kernel xử lý I/O bằng cách ánh xạ offset của LV sang block ở một hay nhiều PV. `dmsetup info` và `dmsetup table` có thể giúp kiểm tra kết quả ánh xạ khi cần chẩn đoán tầng thấp; đa số thao tác quản trị thường dùng lệnh LVM thay vì sửa bảng device mapper trực tiếp.

## Theo dấu một filesystem

Một đường đi có thể là `NVMe → partition → PV → VG → LV → filesystem → mount point`. Lệnh `lsblk -f` cho sơ đồ block/filesystem; `pvs`, `vgs`, `lvs` đọc các lớp LVM; `findmnt` cho biết mount point. Khi có vấn đề, lần theo từng lớp để thấy thiết bị nào thiếu hoặc đầy.

## Thay đổi dung lượng có điều kiện

Mở rộng LV cần VG còn extents trống hoặc thêm PV. Sau đó filesystem thường phải được mở rộng riêng; thứ tự và khả năng online tùy filesystem. Thu nhỏ rủi ro hơn: filesystem phải hỗ trợ thao tác đó, thường cần unmount và phải thu nhỏ filesystem trước LV để không cắt mất dữ liệu.

Một số bản `lvresize` có tùy chọn phối hợp resize filesystem (ví dụ `-r`), nhưng vẫn phải xác minh filesystem, mount state và hỗ trợ của công cụ trên hệ thống thực tế. Tăng kích thước LV không tự động có nghĩa filesystem đã dùng hết phần mới; giảm LV khi filesystem chưa thu nhỏ trước có thể cắt dữ liệu.

Không chạy lệnh `pvcreate`, `lvremove` hay định dạng trên thiết bị khi chưa xác nhận chính xác tên thiết bị, mount, backup và metadata. Tên `/dev/sdX` có thể đổi giữa các lần boot; UUID hoặc đường dẫn ổn định giúp tránh nhầm.

## Snapshot không phải backup

LVM snapshot thường dùng copy-on-write hoặc thin provisioning để ghi lại trạng thái tại một thời điểm. Nó có thể hỗ trợ backup nhất quán hoặc kiểm thử, nhưng snapshot cùng VG vẫn phụ thuộc vào cùng storage. Pool snapshot đầy hoặc thiết bị hỏng có thể làm snapshot mất tác dụng; cần quy trình backup độc lập.

## Tự kiểm tra

**LV có phải filesystem không?** Không; LV là block device, cần filesystem hoặc nội dung phù hợp khác.

**LVM snapshot thay thế backup ngoại vi?** Không.

**Thu nhỏ LV rồi mới thu nhỏ filesystem có an toàn không?** Không; thứ tự sai có thể cắt dữ liệu filesystem.

## Đọc tiếp

Sau khi hiểu lớp block và logical volume, hãy xem filesystem, mount option và cách kernel phân giải đường dẫn.

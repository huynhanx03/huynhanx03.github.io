---
title: "Filesystem implementation: block, inode và free space"
category: "Operating System"
tags: ["filesystem", "block allocation", "inode"]
description: "Khám phá superblock, inode, bitmap, block dữ liệu và các cách filesystem ánh xạ file lớn."
updated: 2026-10-16
translationKey: "operating-system/filesystem-implementation"
---

Ứng dụng nhìn thấy file và directory; thiết bị lưu trữ làm việc theo block. Filesystem phải ánh xạ các khái niệm logic sang block, quản lý block đang dùng và cập nhật metadata sao cho mount lại được sau khi máy khởi động.

## Các vùng metadata cơ bản

Một filesystem truyền thống có thể chứa superblock với thông tin tổng quan, inode table, bitmap/free-space map và các block dữ liệu. Filesystem hiện đại có thể dùng cây, extent, journal, checksum và cấu trúc khác; sơ đồ cổ điển giúp hiểu vai trò, không mô tả chính xác mọi định dạng.

Inode cần ánh xạ offset trong file sang block dữ liệu. Cách đơn giản dùng direct pointers cho file nhỏ và indirect block nhiều cấp cho file lớn. Filesystem hiện đại thường dùng extent: một dải liên tiếp trên đĩa được mô tả bằng điểm bắt đầu và độ dài, giảm metadata khi file liên tục.

## Cấp phát block

Bitmap dùng một bit cho mỗi block để biết đang trống hay đã cấp; cấu trúc khác có thể dùng free list hoặc cây. Khi ghi file, filesystem chọn block, cập nhật ánh xạ inode, dung lượng và metadata. Nếu cập nhật bị ngắt giữa chừng, cấu trúc có thể không nhất quán nếu thiếu cơ chế phục hồi.

Chọn block gần nhau thường cải thiện locality, nhưng file có thể phân mảnh khi hệ thống dùng lâu. Allocation cần cân bằng tìm kiếm nhanh, gộp vùng trống và khả năng mở rộng.

## Thực hành: suy luận từ trạng thái đĩa

Trong một filesystem mô phỏng nhỏ, chạy cùng một workload với nhiều random seed rồi so trạng thái trước/sau để suy ra block và inode được cấp theo quy tắc nào. Tiếp đó giảm số data block xuống rất ít, rồi giảm số inode ở một lượt riêng; dự đoán thao tác nào còn thành công và thao tác nào thất bại.

Hai giới hạn này khác nhau: hết data block có thể chặn việc mở rộng nội dung, còn hết inode có thể chặn tạo thêm file dù vẫn còn nhiều block dữ liệu. Đừng chỉ nhìn tổng dung lượng còn trống; hãy xác định loại metadata hay tài nguyên nào đã cạn.

## Directory là dữ liệu có cấu trúc

Directory có thể bắt đầu như danh sách tên-entry; khi lớn, tìm kiếm tuyến tính chậm nên filesystem dùng index/cây. Directory cũng cần quy tắc cho `.`/`..`, hard link và cập nhật nguyên tử ở mức cần thiết.

Tên file và inode tách nhau giúp rename trong cùng filesystem có thể chủ yếu cập nhật directory entry thay vì sao chép data. Di chuyển qua filesystem khác thường cần copy rồi xóa vì inode/block mapping thuộc hai filesystem riêng.

## Cache và writeback

Kernel thường cache dữ liệu file và metadata trong RAM. Đọc lặp lại có thể tránh thiết bị; ghi có thể được gom và flush sau. Điều này tăng tốc nhưng khiến trạng thái trên RAM và thiết bị lệch nhau trong một khoảng thời gian.

Ứng dụng cần durability phải dùng các primitive đồng bộ đúng và hiểu semantics của filesystem/thiết bị. `close()` không phải lúc nào cũng tương đương “đã bền vững qua mất điện”.

## Lần theo I/O lạnh và chi phí metadata

Khi cache trống, `open("/foo/bar")` có thể phải đọc inode và directory data ở từng cấp pathname để tìm inode cuối cùng. Sau đó `read` đi từ inode tới block dữ liệu; bitmap cấp phát không cần thiết cho lần đọc thông thường vì inode đã chỉ ra các block thuộc file. Cache dentry, inode và dữ liệu làm các lần truy cập lặp lại rẻ hơn đáng kể.

Ghi vào vùng file mới có thể cần thêm I/O cho bitmap data, inode mapping và block nội dung. Tạo file còn cần inode mới cùng directory entry; nếu directory phải mở rộng, cần thêm block và cập nhật cấu trúc liên quan. Trong mô hình VSFS không cache, một write cấp block mới có thể gây nhiều thao tác metadata bên cạnh data write. Đây là lý do write buffering, batching, journaling và allocation policy quan trọng; số I/O cụ thể của filesystem thật khác theo cache, layout, transaction và implementation.

## Tóm tắt

- Filesystem ánh xạ file logic vào block và metadata trên thiết bị.
- Inode/extent/pointer cấu trúc liên hệ giữa file offset và data blocks.
- Bitmap/free-space structures theo dõi dung lượng trống.
- Locality và fragmentation ảnh hưởng số lần truy cập thiết bị.
- Cache/writeback tăng tốc nhưng đặt ra yêu cầu durability và phục hồi.
- Cold `open` có thể đọc cấu trúc từng cấp pathname; đọc dữ liệu bình thường không cần tra bitmap cấp phát.
- Ghi block mới và tạo file khuếch đại I/O do cần cập nhật bitmap, inode và directory metadata.

## Tự kiểm tra

**Inode thường chứa toàn bộ nội dung file?** Không; nó chứa metadata và thông tin ánh xạ tới block/extent.

**Bitmap trống nhiều nghĩa có một vùng liền đủ lớn?** Không nhất thiết; các block có thể rời rạc.

**Filesystem cache chỉ cache nội dung, không metadata?** Nhiều metadata cũng được cache.

## Đọc tiếp

Locality là nguyên tắc quan trọng khi đặt block và thiết kế filesystem hiệu năng cao.

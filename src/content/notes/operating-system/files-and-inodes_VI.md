---
title: "File, directory và inode: filesystem biểu diễn tên ra sao?"
category: "Operating System"
tags: ["filesystem", "inode", "directory", "storage"]
description: "Phân biệt tên file với đối tượng file, lần theo directory entry, inode, descriptor và hard link."
updated: 2026-10-16
translationKey: "operating-system/files-and-inodes"
---

Đường dẫn `/home/linh/report.txt` trông như tên duy nhất của một file. Bên dưới, filesystem thường tách **tên trong directory** khỏi metadata và nội dung file. Phân biệt các lớp này giúp hiểu hard link, rename, unlink và vì sao một file đã xóa vẫn chiếm dung lượng.

## Directory ánh xạ tên sang đối tượng

Directory là cấu trúc dữ liệu ánh xạ tên entry tới inode hoặc đối tượng tương ứng của filesystem. Một inode lưu metadata như loại file, quyền, chủ sở hữu, kích thước và tham chiếu tới block dữ liệu theo implementation. Tên `report.txt` thường nằm trong directory cha, không phải là danh tính duy nhất được lưu bên trong inode.

Một path được kernel phân giải từng thành phần: tìm `home`, rồi `linh`, rồi `report.txt`, đồng thời kiểm tra quyền traverse directory. Symlink làm quá trình có thể tiếp tục theo target khác. Mount point nối namespace directory với filesystem khác.

## File descriptor không phải inode

`open()` trả về file descriptor là một số nhỏ trong bảng của process. Descriptor tham chiếu tới trạng thái open-file trong kernel, gồm offset hiện tại và flags; trạng thái đó liên hệ với inode/open object. Nhiều descriptor sau `dup` hoặc `fork` có thể dùng chung open-file description và chia sẻ offset.

Vì thế, file descriptor `3` không phải tên file hay inode number. Đóng descriptor giảm tham chiếu; file object vẫn có thể còn sống nếu có descriptor khác hoặc hard link.

## Hard link, symbolic link và unlink

Hard link là một tên directory khác trỏ tới cùng inode. Xóa một tên bằng `unlink` giảm link count; dữ liệu chỉ có thể được thu hồi khi không còn tên và không còn tham chiếu mở cần thiết. Một chương trình đang giữ descriptor có thể tiếp tục đọc file sau khi tên cuối đã unlink.

Symlink là một đối tượng riêng chứa đường dẫn target. Target có thể không tồn tại; symlink cũng có thể trỏ qua filesystem khác, còn hard link thường bị giới hạn theo filesystem và loại đối tượng.

## Metadata và nội dung

Metadata gồm quyền, owner/group, timestamp, size và block mapping tùy filesystem. Một thao tác `stat` trả metadata; đọc file truy cập nội dung. Hai tên khác nhau có thể cùng inode; cùng tên theo thời gian có thể trỏ tới inode khác sau khi xóa và tạo lại.

Filesystem có thể lưu metadata và data ở nhiều block, dùng cache để tăng tốc. Trạng thái trên đĩa có thể chưa đồng bộ tức thì với cache; tính bền vững thuộc topic crash consistency.

## Từ inode tới block dữ liệu

Một filesystem kiểu UNIX thường chia volume thành vùng metadata và vùng data. Mô hình học tập VSFS đặt superblock (mô tả kích thước và vị trí các vùng), bitmap inode, bitmap data, inode table và data region. Khi mount, kernel đọc superblock để biết layout; bitmap cho biết inode/block nào đang rảnh. Filesystem thực tế có thể dùng cây hoặc cấu trúc khác thay bitmap, nên đây là mô hình giúp hiểu nguyên tắc, không phải layout bắt buộc cho mọi filesystem.

Inode cần ánh xạ offset trong file sang block trên thiết bị. Mô hình pointer dùng một số direct pointer cho file nhỏ và indirect block nhiều tầng khi file lớn; cách này truy cập ngẫu nhiên được nhưng tốn metadata và có thể cần thêm lần đọc indirect block. Extent lưu cặp vị trí bắt đầu và độ dài cho dải block liên tục, gọn khi file được bố trí thành đoạn dài nhưng cần quản lý khi file phân mảnh. Linked allocation tiết kiệm metadata trực tiếp nhưng truy cập block giữa/cuối file kém nếu phải lần theo chuỗi; FAT đưa bảng liên kết vào vùng dễ cache hơn.

## Đường đọc một pathname

Khi cache chưa có dữ liệu, `open("/foo/bar")` phải lần từ root: tìm inode của root, đọc block directory để tìm `foo`, lấy inode của `foo`, rồi tiếp tục tìm `bar` và đọc inode cuối. Sau kiểm tra quyền, kernel tạo file descriptor cho process. `read` dùng inode để tìm block ứng với file offset, lấy dữ liệu rồi cập nhật offset. Caches như dentry, inode và page cache có thể làm các lần truy cập sau không cần đọc lại cấu trúc từ thiết bị.

## Tóm tắt

- Directory entry nối tên với đối tượng file; inode giữ metadata và liên hệ tới data.
- Filesystem cần mô tả volume, theo dõi inode/block trống, lưu inode và ánh xạ file tới data block.
- Direct/indirect pointers, extents và linked allocation đổi chác giữa truy cập ngẫu nhiên, metadata và khả năng gom block liên tục.
- File descriptor là handle của process, không phải pathname/inode.
- Hard link là tên bổ sung cho cùng inode; symlink là file chứa đường dẫn.
- `unlink` xóa tên, còn thu hồi data phụ thuộc link và reference còn lại.
- Một process có thể tiếp tục dùng file đã unlink thông qua descriptor đang mở.

## Tự kiểm tra

**Tên file nằm trong inode?** Thường directory lưu tên và tham chiếu tới inode.

**Xóa file là xóa ngay mọi byte data?** Không; tên bị gỡ, còn thời điểm thu hồi phụ thuộc reference và filesystem.

**Hai descriptor cùng trỏ một file luôn có offset riêng?** Không; nếu chia sẻ cùng open-file description, offset có thể dùng chung.

## Đọc tiếp

Bài sau đi vào block allocation và cấu trúc nội bộ filesystem.

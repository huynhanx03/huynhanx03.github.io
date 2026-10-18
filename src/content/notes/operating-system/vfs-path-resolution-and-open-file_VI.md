---
title: "VFS, path lookup và trạng thái file đang mở"
category: "Operating System"
tags: ["linux", "filesystem", "vfs", "file descriptor"]
description: "Theo pathname qua dentry/inode tới open file description và phân biệt cache namespace với dữ liệu trên đĩa."
sources:
  - title: "Linux man-pages: lseek(2)"
    url: "https://man7.org/linux/man-pages/man2/lseek.2.html"
updated: 2026-10-17
translationKey: "operating-system/vfs-path-resolution-and-open-file"
---

Linux hỗ trợ nhiều filesystem qua Virtual Filesystem (VFS), một lớp interface để syscall như `open`, `read`, `stat` làm việc với ext4, XFS, NFS, procfs và loại khác. VFS cung cấp object/operation chung; filesystem cụ thể thực hiện semantics riêng.

Ở mức khái niệm, file là dãy byte có tên định danh thấp cấp (thường gắn với inode); directory ánh xạ tên dễ đọc sang đối tượng bên dưới. Tên như `report.txt` chỉ là quy ước: filesystem thường không xác minh phần mở rộng có khớp nội dung hay không. UNIX dùng cùng cây tên để truy cập nhiều loại tài nguyên, nhưng một tên trong namespace không có nghĩa mọi đối tượng phía sau đều là file dữ liệu trên đĩa.

Không phải filesystem nào cũng đọc dữ liệu từ disk. `procfs`, `sysfs` và `devpts` là các filesystem đặc biệt cung cấp giao diện kernel hoặc thiết bị trong cây pathname. FUSE cho phép triển khai filesystem ở user space thông qua giao diện kernel, hữu ích cho các hệ thống file không cần đưa toàn bộ logic vào kernel. VFS giữ API truy cập chung, nhưng không làm cho độ trễ, độ bền dữ liệu hay quyền sở hữu của mọi filesystem trở nên giống nhau.

## Path lookup

Kernel bắt đầu từ root hoặc current working directory, tra từng component. Dentry cache giữ quan hệ tên-directory để tăng tốc lookup; inode cache giữ metadata object. Cache miss có thể cần filesystem/device/network. Permission được kiểm tra qua path và credentials.

Symlink khiến lookup tiếp tục theo target; mount point đổi filesystem được đi vào. Namespace mount có thể làm cùng path nhìn khác giữa process.

## File descriptor và open file description

Mỗi process có bảng descriptor; số FD là handle nhỏ. Descriptor tham chiếu tới open file description trong kernel, chứa flags và file offset, rồi tới inode/file operation. `dup` hoặc fork có thể chia sẻ open file description; hai FD vì vậy có thể dùng chung offset.

`pread`/`pwrite` dùng offset chỉ định, tránh thay đổi shared file offset theo kiểu `read`/`write`. Descriptor inheritance và close-on-exec ảnh hưởng child process.

`read`/`write` tuần tự thường cập nhật offset hiện tại; trên descriptor có thể seek như regular file, `lseek` đổi offset trong trạng thái file đang mở nhưng không tự di chuyển đầu đọc hay phát I/O. Pipe, FIFO và socket không có offset truy cập ngẫu nhiên nên `lseek` thất bại với `ESPIPE` trên Linux ([lseek(2)](https://man7.org/linux/man-pages/man2/lseek.2.html)). Một lần đọc/ghi sau đó có thể khiến HDD phải seek tùy vị trí block thật. Khi cần kiểm tra chương trình gọi syscall nào, `strace` trên Linux có thể hiện tên syscall, đối số và mã trả về; đó là cách nối hành vi API của ứng dụng với đường đi trong kernel.

## Thực hành với API file

Để hiểu các API thực sự cung cấp gì, thử viết ba công cụ nhỏ: lệnh `stat` in kích thước, block đã cấp và link count; lệnh liệt kê thư mục dùng `opendir`/`readdir` rồi bổ sung chế độ chi tiết bằng `stat`; và một phiên bản `tail -n` đọc từ gần cuối file bằng `lseek` thay vì nạp toàn bộ file vào RAM. Sau đó viết phép duyệt cây thư mục đệ quy như một phiên bản tối giản của `find`.

Khi làm, xử lý riêng lỗi quyền, file biến mất giữa lúc liệt kê và `stat`, symlink, thư mục lồng nhau, file rỗng và file không có newline cuối. Các trường hợp này cho thấy API trả về những quan sát tại một thời điểm; cây thư mục có thể thay đổi trong lúc chương trình đang duyệt.

## VFS không xóa khác biệt semantics

Network filesystem, procfs và local disk đều có thể mở qua `open`, nhưng latency, locking, durability và error behavior khác nhau. API chung làm code portable hơn trong một số phạm vi, không khiến file trở thành abstraction có semantics giống hệt.

## Tóm tắt

- VFS cung cấp interface chung cho nhiều filesystem.
- Dentry/inode cache tăng tốc path lookup/metadata.
- FD là index process table, open file description giữ offset/flags.
- Directory ánh xạ tên người dùng sang đối tượng; phần mở rộng tên file chỉ là quy ước.
- `dup`/fork có thể chia sẻ offset; pread/pwrite tránh shared sequential offset.
- `lseek` đổi offset logic trong kernel, không đồng nghĩa disk seek hay I/O ngay lúc gọi.
- Cùng syscall có latency/durability khác theo filesystem.

## Tự kiểm tra

**FD 5 có cùng giá trị ở mọi process là cùng file?** Không; FD number chỉ có ý nghĩa trong bảng process.

**Hai FD sau `dup` luôn có offset độc lập?** Không; chúng thường cùng open file description.

**VFS làm NFS giống ổ cục bộ?** Không; semantics remote vẫn còn.

## Đọc tiếp

Kernel cache file data trong page cache; buffered I/O và direct I/O có đường đi khác.

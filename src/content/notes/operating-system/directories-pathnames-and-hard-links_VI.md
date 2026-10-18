---
title: "Directory, pathname, hard link và symbolic link"
category: "Operating System"
tags: ["operating-system", "filesystem", "inode"]
description: "Hiểu directory là ánh xạ tên tới inode, phân biệt hard link với symlink và lần theo đường dẫn qua mount point."
updated: 2026-10-16
translationKey: "operating-system/directories-pathnames-and-hard-links"
---

Trong Unix-like, tên file không phải chính file. Directory là một cấu trúc dữ liệu ánh xạ tên sang inode; inode giữ metadata và tham chiếu tới nội dung hoặc cấu trúc lưu trữ. Nhiều tên có thể trỏ tới cùng một inode.

Ứng dụng đọc directory qua giao diện riêng như `opendir`/`readdir`, thay vì ghi byte tùy ý vào directory như file thường. Entry thường cho biết tên và inode; muốn biết đầy đủ quyền, owner hay kích thước, chương trình gọi thêm `stat`. Directory mới có các entry đặc biệt `.` (chính nó) và `..` (cha); vì thế `rmdir` chỉ xóa directory rỗng, còn `mkdir` tạo directory mới.

## Hard link

Hard link là một directory entry khác trỏ tới cùng inode. Hai tên này có cùng nội dung và metadata inode; xóa một tên chỉ bỏ một liên kết. Dữ liệu có thể được giải phóng khi link count về 0 và không còn process nào mở file.

Hard link thường không vượt filesystem vì inode chỉ có ý nghĩa trong filesystem đó. Nhiều filesystem cũng cấm hard link tới directory để tránh vòng lặp trong cây thư mục.

## Symbolic link

Symlink là một file đặc biệt chứa pathname đích. Nó có thể vượt filesystem và trỏ tới directory, nhưng đích có thể bị xóa hoặc đổi tên, tạo dangling link. `ln -s target link` tạo symlink; `readlink` xem nội dung path mà link lưu. Path tương đối trong symlink được diễn giải từ thư mục chứa symlink.

## Pathname và mount

Path tuyệt đối bắt đầu từ `/`; path tương đối được diễn giải từ current working directory của process. Khi kernel phân giải từng thành phần, quyền search (`x`) trên các directory cha quyết định khả năng đi xuyên qua cây. Mount point làm một filesystem khác xuất hiện tại một directory, che nội dung cũ ở điểm đó cho tới khi unmount.

`stat` xem metadata inode; `lstat` xem chính symlink thay vì dereference; `findmnt` cho biết mount chứa path. Hai path khác nhau có thể cùng inode; so sánh device và inode giúp kiểm tra hard link.

`unlink` gỡ một tên khỏi directory và giảm link count; file chỉ được thu hồi khi không còn hard link và không còn tham chiếu đang mở. `rm` gọi thao tác unlink cho file; nó không xóa directory tree bằng một syscall duy nhất. Mount đặt root của filesystem khác vào một mount point trong cây chung; nội dung cũ tại mount point bị che trong lúc mount đang hoạt động.

## Tự kiểm tra

**Xóa một hard link có lập tức xóa dữ liệu?** Chỉ khi không còn directory link nào và không process nào giữ file mở.

**Symlink chứa inode đích?** Không; nó chứa một pathname.

**`x` trên directory có giống quyền chạy file?** Với directory, nó cho phép search/traverse.

**Vì sao `rmdir` từ chối directory còn file bên trong?** Directory entry phải được gỡ trước khi directory rỗng bị xóa.

## Đọc tiếp

Kernel đi từ pathname tới inode qua VFS, mount namespace, quyền và cache đường dẫn.

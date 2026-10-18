---
title: "Mount namespace và đường dẫn trong Linux"
category: "Operating System"
tags: ["linux", "filesystem", "mount namespace", "path"]
description: "Hiểu mount tree, bind mount, namespace và vì sao cùng pathname có thể nhìn thấy filesystem khác."
updated: 2026-10-16
translationKey: "operating-system/filesystem-mount-namespace"
---

Linux có một cây pathname thống nhất cho mỗi mount namespace. Mount gắn filesystem vào một directory; sau mount, nội dung trước đó trong mount point bị che khi nhìn từ namespace đó nhưng chưa bị xóa khỏi thiết bị.

## Bind mount

Bind mount làm một cây con hiện ra ở path khác mà không copy file. Container runtime dùng mount namespace và bind mounts để đưa thư mục host vào container. Read-only flag và propagation policy quyết định thay đổi có được ghi hoặc truyền giữa namespace không.

## Mount namespace

Namespace tạo góc nhìn mount riêng cho process group. Hai process có thể cùng `/etc` nhưng thấy cây mount khác nhau. User namespace/capability ảnh hưởng quyền thực hiện mount; một container không mặc định có thể mount tùy ý host resource.

## Vòng đời và an toàn

Unmount thất bại nếu resource còn được dùng (busy), chẳng hạn cwd, open file hoặc nested mount. Lazy unmount tách mount khỏi namespace ngay nhưng resource sống tới khi hết reference; nó không đồng nghĩa đã cleanup tức thì.

Trước bind mount, kiểm tra source, target, quyền ghi và symlink. Một container được mount host path writable có thể sửa host data trong phạm vi quyền thực tế.

## Tóm tắt

- Mount xây cây pathname, không nhất thiết di chuyển/copy data.
- Bind mount bộc lộ cùng subtree tại path khác.
- Mount namespace cho process nhóm góc nhìn filesystem riêng.
- Unmount busy phản ánh reference còn sống; lazy detach không xóa tức thì.
- Writable host mount mở quyền sửa dữ liệu host.

## Tự kiểm tra

**Mount lên directory đang có file sẽ xóa file cũ?** Không; nó che khuất trong góc nhìn mount.

**Bind mount là bản sao độc lập?** Không; cùng nội dung underlying.

**Unmount busy nghĩa kernel lỗi?** Thường có process/reference đang dùng.

## Đọc tiếp

Mount namespace là một trong các primitive nền tảng của container.

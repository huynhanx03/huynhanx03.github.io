---
title: "Mount option và filesystem namespace"
category: "Operating System"
tags: ["operating-system", "filesystem", "mount"]
description: "Hiểu mount namespace, bind mount và tùy chọn read-only/noexec/nodev/nosuid trong kiểm soát filesystem."
updated: 2026-10-16
translationKey: "operating-system/mount-options-and-filesystem-namespace"
---

Mount gắn filesystem hoặc một cây thư mục vào một vị trí trong namespace. Hai process có thể nhìn cấu trúc mount khác nhau nếu ở mount namespace riêng. Container thường dùng tính năng này để tạo view filesystem được chọn lọc mà không cần một kernel riêng.

## Bind mount và propagation

Bind mount đưa một file hoặc directory đã tồn tại vào vị trí khác; nó không copy nội dung. Recursive bind có thể bao gồm mount con. Mount propagation quyết định sự kiện mount/unmount có truyền giữa namespace hay không; cấu hình sai có thể làm mount host xuất hiện hoặc không xuất hiện trong container.

## Tùy chọn bảo vệ

- `ro`: chặn ghi qua mount này, nhưng process đặc quyền có thể remount tùy policy.
- `noexec`: không cho chạy executable trực tiếp từ mount; không ngăn mọi cách đọc mã rồi diễn giải.
- `nodev`: không diễn giải device node trên mount.
- `nosuid`: bỏ tác dụng setuid/setgid trên mount.

Các option giảm bề mặt tấn công nhưng không thay quyền Unix, LSM, capability hay kiểm soát nguồn dữ liệu. `findmnt -o TARGET,SOURCE,FSTYPE,OPTIONS` cho trạng thái mount thực tế.

## fstab và thứ tự boot

`/etc/fstab` mô tả mount bền vững. UUID/LABEL ổn định hơn tên device thay đổi. Mount network hoặc removable device cần option phù hợp để boot không bị chặn; kiểm tra bằng `findmnt --verify` nếu hỗ trợ và thử mount có kiểm soát trước reboot.

## Tự kiểm tra

**Bind mount tạo bản sao độc lập?** Không; nó gắn lại cùng nội dung.

**`noexec` ngăn đọc file script?** Không.

**Mount namespace là filesystem mới?** Không; nó là view mount riêng.

## Đọc tiếp

Container kết hợp mount namespace với user, PID và network namespace để cô lập process.

---
title: "User, group, permission và PAM trên Linux"
category: "Operating System"
tags: ["linux", "permissions", "authentication", "pam"]
description: "Phân biệt nhận dạng, xác thực và phân quyền; đọc UID/GID, mode bits, sudo và vai trò PAM."
updated: 2026-10-16
translationKey: "operating-system/linux-users-permissions-pam"
---

Kernel cần biết process đang đại diện cho ai để quyết định có được đọc file, bind socket hay gửi signal cho process khác. Linux dùng UID/GID và credentials của process; chương trình đăng nhập và dịch vụ xác thực giúp thiết lập danh tính ban đầu.

## Nhận dạng, xác thực, phân quyền

- **Identification:** người dùng khai báo danh tính, ví dụ username.
- **Authentication:** hệ thống kiểm tra người đó có sở hữu danh tính, bằng password, key hoặc cơ chế khác.
- **Authorization:** quyết định danh tính đó được làm gì trên resource.

Một lần login thành công không đồng nghĩa có quyền root. Quyền truy cập file thường xét UID/GID, mode bits, ACL và policy khác.

## UID, GID và quyền file

Kernel chủ yếu xét số UID/GID, không dựa riêng vào tên hiển thị. File có owner, group và bit đọc/ghi/thực thi cho owner, group, others. Quyền execute trên directory thường cho phép traverse/search; vì vậy quyền directory khác cách đọc nội dung file.

Process có real, effective và saved UID, cùng group IDs và credentials khác. Effective UID thường ảnh hưởng các phép kiểm tra quyền; real UID lưu danh tính gọi process trong nhiều ngữ cảnh; saved UID cho phép một số chương trình đặc quyền tạm đổi rồi khôi phục identity theo quy tắc kernel. Chi tiết syscall nào dùng credential nào phụ thuộc thao tác; không nên suy ra toàn bộ “chủ process” chỉ từ một cột `ps`. `sudo` là chương trình userspace dùng đặc quyền được cấp để đổi identity và áp policy, không phải username hay password mà kernel tự xác thực.

## `/etc/passwd`, shadow và group

`/etc/passwd` thường có bảy trường phân tách bằng dấu `:`: username, dấu/placeholder mật khẩu, UID, primary GID, thông tin mô tả, home directory và login shell. Trên hệ shadow password, dấu `x` thường báo thông tin xác thực nằm trong `/etc/shadow`; chuỗi khóa account cụ thể tùy công cụ và distro. `/etc/group` ánh xạ group name sang GID và có thể liệt kê thành viên bổ sung. Nhiều hệ thống tra cứu account qua NSS nên dữ liệu còn có thể đến từ LDAP/SSSD thay vì chỉ file cục bộ. Công cụ quản trị như `useradd`, `usermod`, `passwd` giữ định dạng nhất quán hơn sửa tay.

Tài khoản dịch vụ hoặc pseudo-user có UID riêng để process chạy với quyền giới hạn, dù chúng không cho đăng nhập tương tác. Trong kernel, UID 0 mang ý nghĩa đặc biệt; tên `root` là quy ước userspace thường được ánh xạ tới UID đó. Username và password thuộc lớp userspace: kernel thực thi quyền trên credentials số, còn PAM/NSS và dịch vụ login xử lý xác thực, ánh xạ và policy.

## PAM

Pluggable Authentication Modules (PAM) cung cấp framework để dịch vụ login gọi các module kiểm tra danh tính, account policy, session và password update. Cấu hình sai có thể khóa user khỏi máy hoặc mở rộng quyền ngoài ý muốn. Distro có cấu hình và module khác nhau; trước khi sửa, giữ phiên root/console còn hoạt động và sao lưu file.

PAM cấu hình theo service, thường trong `/etc/pam.d/`; mỗi dòng kết hợp loại tác vụ, control rule và module. Các stack có thể gồm `auth` (xác thực), `account` (trạng thái/điều kiện account), `password` (đổi credential) và `session` (thiết lập/dọn phiên). Các module chạy theo thứ tự; `required` ghi nhận lỗi nhưng vẫn chạy các rule sau, `requisite` dừng ngay khi lỗi, còn `sufficient` có thể kết thúc thành công sớm nếu các điều kiện trước đó không thất bại. Cú pháp nâng cao và include khác nhau theo distro, nên đọc toàn stack trước khi thay đổi.

PAM tập trung nhiều hơn vào authentication, account và session policy; authorization cuối cùng vẫn do kernel và ứng dụng thực thi theo cơ chế riêng. Một module PAM thành công không tự cấp quyền đọc mọi file. Vì stack có thứ tự và control flow, cấu hình sai có thể khóa user khỏi máy; giữ console/phiên khôi phục và kiểm tra cấu hình distro trước khi áp dụng.

## Tóm tắt

- Username là tên; kernel thường kiểm tra UID/GID credentials.
- Authentication chứng minh danh tính; authorization quyết định quyền.
- Mode bits, ACL, group và quyền traverse directory cùng ảnh hưởng truy cập.
- `sudo` cấp quyền theo policy, có log; tránh chạy mọi thứ dưới root.
- PAM là framework cho auth/account/session, cấu hình sai có thể làm hỏng login.

## Tự kiểm tra

**Tên user `alice` quyết định quyền trực tiếp?** Kernel chủ yếu xét UID/GID và credentials.

**Có quyền đọc file thì chắc chắn mở được nếu directory cha không cho traverse?** Không; quyền trên path components cũng quan trọng.

**PAM thành công nghĩa process có quyền root?** Không; identity và authorization là các bước khác.

## Đọc tiếp

Quản trị hệ thống còn cần log, đồng bộ thời gian và lên lịch tác vụ.

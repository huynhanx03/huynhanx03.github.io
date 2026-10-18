---
title: "UID, group, sudo và xác thực người dùng"
category: "Operating System"
tags: ["linux", "users", "permissions", "pam"]
description: "Theo dõi danh tính số, group membership, sudo policy và vai trò của PAM trong quá trình đăng nhập."
updated: 2026-10-16
translationKey: "operating-system/linux-user-groups-sudo-authentication"
---

Kernel quyết định quyền dựa trên danh tính số như UID và GID, không dựa vào tên hiển thị. Username được phân giải qua cơ sở dữ liệu cục bộ hoặc dịch vụ như LDAP/SSSD; cùng tên không đảm bảo cùng UID giữa hai máy.

## UID, group và file permission

Process mang real/effective UID cùng group IDs. File giữ owner UID/GID và mode bits cho owner, group, others. `id` cho danh tính hiện tại; `getent passwd name` hoặc `getent group group` truy vấn nguồn NSS đang cấu hình. Thay đổi group membership thường chỉ áp dụng cho session mới.

`chmod` đổi permission, `chown` đổi owner, `umask` lọc các bit mặc định khi tạo file. ACL có thể cấp quyền bổ sung ngoài mode bits và khiến kết quả khó đoán nếu chỉ nhìn `ls -l`; `getfacl` xem ACL.

## sudo và đặc quyền tối thiểu

`sudo` cho phép user được ủy quyền chạy lệnh với danh tính khác, thường là root. Policy xác định ai được chạy lệnh nào và có cần xác thực không. Tránh dùng `sudo` cho cả shell tùy tiện nếu chỉ cần một thao tác; ghi rõ lệnh giúp audit và giảm sai sót.

Root có quyền vượt nhiều kiểm tra thông thường, nên lệnh sai có thể xóa hoặc thay đổi toàn hệ thống. Kiểm tra user, target path và thiết bị trước thao tác phá hủy.

## PAM và đăng nhập

PAM là framework module cho xác thực và các bước account/session. Ứng dụng như login, sudo hoặc SSH có thể đi qua stack PAM khác nhau. Lỗi đăng nhập có thể do password, account lock/expiry, policy PAM, home directory, shell hoặc dịch vụ danh tính từ xa.

Không sửa file PAM bằng thao tác thử nghiệm khi chưa có console dự phòng: cấu hình sai có thể khóa mọi lần đăng nhập. Đọc log auth và kiểm tra cấu hình trước khi áp dụng.

## Tự kiểm tra

**Kernel dùng username để so quyền?** Chủ yếu dùng UID/GID số.

**Thêm user vào group có hiệu lực trong process session đang chạy?** Thường cần session mới hoặc cập nhật credentials có chủ đích.

**PAM chỉ xác minh mật khẩu?** Không; stack có thể xử lý account, session và policy khác.

## Đọc tiếp

Quyền filesystem và namespace có thể được kết hợp với cgroup/capability để giới hạn service hoặc container.

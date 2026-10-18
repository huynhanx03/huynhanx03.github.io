---
title: "SMB/CIFS và chia sẻ file giữa Linux, Windows"
category: "Network"
tags: ["network", "smb", "cifs", "file sharing"]
description: "Hiểu SMB share, Samba server, mount.cifs, identity mapping và ranh giới quyền trên file mạng."
updated: 2026-10-16
translationKey: "network/smb-cifs-linux-file-sharing"
---

SMB là protocol chia sẻ file/printer phổ biến trong môi trường Windows; Linux có thể làm client/server qua Samba và mount share bằng CIFS. Mount thành công chưa chứng minh quyền file phía server khớp với quyền POSIX nhìn ở client.

## Share và identity

Server export một share với ACL/share permission; bên trong file còn có permission/ACL riêng. User được xác thực qua account/local domain/Kerberos tùy môi trường. Mapping UID/GID, SID và ACL ảnh hưởng cách Linux hiển thị owner/mode.

Với Samba server nhỏ, cấu hình share thường nằm trong `smb.conf`; phần `[global]` giữ thiết lập chung, còn `[ten-share]` khai báo đường dẫn và chính sách của từng share. `browseable = no` chỉ ẩn share khỏi danh sách duyệt, không thay thế kiểm soát truy cập. `valid users`, giới hạn interface/firewall và quyền file trên Linux mới quyết định ai thực sự truy cập được. Không bật guest cho share ghi nếu không có lý do và giới hạn rõ ràng.

Tài khoản Samba và tài khoản Unix liên quan nhưng không mặc nhiên là cùng một kho mật khẩu. Trong cấu hình dùng passdb cục bộ, người dùng thường cần account Unix hợp lệ rồi được thêm vào cơ sở dữ liệu Samba bằng công cụ quản trị tương ứng. Đồng bộ đổi mật khẩu giữa hai hệ thống là một chính sách riêng; bật nó mà không hiểu hệ quả có thể làm người dùng bất ngờ mất khả năng đăng nhập.

Ở phía client dòng lệnh, `smbclient -L server` liệt kê share mà tài khoản được phép thấy; `smbclient //server/share` cho phép truyền file tương tác. Mount qua CIFS tiện cho ứng dụng dùng đường dẫn thông thường, nhưng credential phải đi qua file bảo vệ chặt, keyring hoặc cơ chế xác thực phù hợp, không đặt password thẳng trong command line.

## Client mount

`mount.cifs` cần server/share, credential mechanism và mount options. Không đặt password plaintext trong command line/log; dùng credential file với permission chặt, keyring hoặc Kerberos theo môi trường. Network reconnect, SMB dialect và signing/encryption policy quyết định tương thích/bảo mật.

## Failure semantics

Network partition có thể làm thao tác file treo hoặc trả lỗi; cache/oplock/lease giúp hiệu năng nhưng consistency khác ổ cục bộ. Retry write có thể tạo kết quả chưa rõ nếu response mất. Ứng dụng không nên giả định file lock/rename qua SMB hoàn toàn giống local filesystem.

## Chọn cách truy cập file mạng

Không phải mọi workload đều hợp với filesystem từ xa. Đọc tuần tự một file lớn thường tận dụng buffering tốt; mở và cập nhật ngẫu nhiên hàng nghìn file nhỏ bị ảnh hưởng nhiều bởi latency. Giữ source tree hoặc dữ liệu tương tác thường xuyên trên ổ local có thể nhanh hơn.

SSHFS là lựa chọn user-space gọn cho chia sẻ Linux đơn giản khi máy chủ đã cho phép SFTP: nó dùng SSH để gắn thư mục từ xa vào mount point. Đổi lại, mã hóa và chuyển đổi qua user-space tạo overhead, và thiết lập nhiều người dùng có giới hạn. Cloud storage mount thường dùng FUSE; đó là lớp chương trình user-space trung gian chứ không phải filesystem local có cùng hiệu năng/semantics. Với bất kỳ lựa chọn nào, cân nhắc xác thực, mã hóa, quyền và hành vi khi kết nối đứt.

## Tóm tắt

- SMB share và file ACL là hai lớp quyền.
- Samba giúp Linux làm client/server SMB.
- UID/GID mapping ảnh hưởng cách nhìn owner tại client.
- Credential cần lưu an toàn; negotiation SMB dialect/signing quan trọng.
- Network failure/cache làm semantics khác local file.

## Tự kiểm tra

**Share permission cho phép đọc nghĩa mọi file trong share đọc được?** File ACL/permission còn có thể chặn.

**SMB mount hoạt động nghĩa write đã bền vững?** Cần xem protocol/server/storage contract.

**Password trong mount command an toàn vì chỉ admin thấy?** Có thể lộ qua process list/history/log.

## Đọc tiếp

So sánh với NFS/AFS để hiểu file sharing protocol và consistency model.

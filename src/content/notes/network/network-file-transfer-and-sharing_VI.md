---
title: "Chọn cách truyền và chia sẻ tệp qua mạng"
category: "Network"
tags: ["network", "file transfer", "file sharing", "filesystem"]
description: "Phân biệt gửi bản sao với gắn filesystem từ xa, rồi chọn giao thức theo cách dùng, hệ điều hành và mức độ tin cậy của mạng."
translationKey: "network/network-file-transfer-and-sharing"
---

Khi hai máy cần trao đổi tệp, trước hết hãy hỏi: máy nhận cần **một bản sao**, hay cần **truy cập một thư mục từ xa như filesystem đang gắn trên máy mình**? Hai nhu cầu này trông giống nhau khi mở tệp, nhưng khác về kết nối, cache, lỗi và quyền ghi.

| Nhu cầu | Cách thường dùng | Điều cần cân nhắc |
| --- | --- | --- |
| Gửi hoặc lấy một vài tệp | SCP hoặc SFTP qua SSH | Thích hợp cho thao tác trực tiếp; quyền và xác thực vẫn do máy chủ quyết định. |
| Chuyển cây thư mục lặp lại hoặc đồng bộ theo đợt | `rsync`, thường chạy qua SSH | Có thể chỉ gửi phần thay đổi; kiểm tra đường dẫn và chạy thử trước khi dùng tùy chọn xóa. |
| Chia sẻ thư mục giữa Windows và Linux | SMB qua Samba hoặc CIFS | Phải hiểu riêng quyền share, tài khoản Samba và quyền file ở Linux. |
| Gắn thư mục Linux từ xa với ít cấu hình | SSHFS qua FUSE | Tiện cho phạm vi nhỏ; vẫn chịu độ trễ mạng và chi phí chuyển qua user space. |
| Gắn filesystem từ máy chủ lưu trữ/NAS trong mạng được quản lý | NFS | Hợp với môi trường có chính sách mạng và quyền truy cập phù hợp; lỗi mạng làm ngữ nghĩa khác ổ đĩa cục bộ. |
| Gắn dịch vụ lưu trữ đám mây | Filesystem dựa trên FUSE | Giao diện giống thư mục không có nghĩa hiệu năng, tính nhất quán hay độ bền giống filesystem cục bộ. |
| Tạm cho máy khác tải một thư mục | HTTP server dùng ngắn hạn | Chỉ mở trong phạm vi cần thiết; không phơi dịch vụ tạm ra mạng không tin cậy. |

## Bản sao khác với filesystem từ xa

`rsync`, SCP và SFTP chuyển dữ liệu giữa hai đầu. Sau khi lệnh hoàn tất, máy nhận có một bản sao mà nó có thể dùng độc lập, tùy chính sách đồng bộ đã chọn. Ngược lại, NFS, SMB và SSHFS cho phép truy cập cây tệp qua kết nối đang hoạt động. Khi mạng chậm hoặc mất kết nối, thao tác đọc/ghi có thể chậm, lỗi hoặc để ứng dụng phải xử lý trạng thái chưa rõ.

Vì vậy, đừng chọn NFS chỉ vì muốn “copy cho tiện”, cũng đừng kỳ vọng một bản rsync tự cập nhật như thư mục đang được mount. Nếu nhiều máy cùng sửa dữ liệu, cần xác định rõ ai được ghi, cách xử lý xung đột, thời điểm thay đổi nhìn thấy ở máy khác và cách phục hồi sau lỗi.

## Quyền và ranh giới tin cậy

Giao thức truyền an toàn không tự quyết định ai được sửa tệp ở đích. SSH bảo vệ kết nối SCP/SFTP hoặc rsync-over-SSH, nhưng tài khoản từ xa vẫn cần quyền tối thiểu. Với SMB, việc mount thành công không chứng minh danh tính và quyền POSIX ở client khớp với chính sách trên server. Với NFS, giới hạn client, export và firewall phải phù hợp với mạng sử dụng.

Trước khi chia sẻ, giới hạn địa chỉ/interface và người dùng được phép truy cập; tránh guest hoặc quyền ghi rộng nếu không có lý do cụ thể. Với thao tác đồng bộ có thể xóa dữ liệu, xem trước thay đổi và bảo đảm bản sao lưu độc lập.

## Chọn nhanh

- Cần gửi một lần: dùng SCP/SFTP.
- Cần chuyển lặp lại một cây thư mục: cân nhắc rsync.
- Cần nhiều máy làm việc trên cùng một cây tệp: cân nhắc SMB hoặc NFS theo hệ điều hành và chính sách truy cập.
- Cần mount gọn cho một người dùng/một máy: SSHFS có thể đủ, nhưng không thay thế thiết kế lưu trữ dùng chung quy mô lớn.
- Cần lưu trữ từ xa qua nhiều địa điểm hoặc nhiều người dùng: xem đây là bài toán kiến trúc riêng về danh tính, đồng bộ, xung đột, độ bền và phục hồi; một giao thức mount đơn lẻ không giải quyết hết.

## Đọc tiếp

- [rsync: chuyển file và đồng bộ thư mục an toàn](/vi/notes/network/rsync-file-transfer-and-safe-sync/)
- [SMB/CIFS giữa Linux và Windows](/vi/notes/network/smb-cifs-linux-file-sharing/)
- [NFS: filesystem từ xa và cache consistency](/vi/notes/network/nfs-remote-file-semantics/)
- [NFS: RPC, mount và khác biệt giữa v3 với v4](/vi/notes/network/nfs-rpc-mount-and-v4/)

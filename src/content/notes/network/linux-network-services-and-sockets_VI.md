---
title: "Network service trên Linux: socket, daemon và systemd"
category: "Network"
tags: ["linux", "network", "socket", "systemd", "service"]
description: "Nối socket API với daemon, port, inetd-style activation, service account và firewall."
updated: 2026-10-16
translationKey: "network/linux-network-services-and-sockets"
---

Network service là process nhận request qua socket. Socket là file descriptor với address family, protocol và trạng thái; server bind/listen/accept TCP hoặc bind nhận UDP. Kernel chuyển packet tới socket theo địa chỉ/port và trạng thái.

Với TCP, server giữ một **listening socket** để chờ kết nối. `accept()` tạo socket riêng cho từng kết nối đã nhận; socket nghe tiếp tục phục vụ kết nối mới. Một server đơn giản có thể `fork()` worker cho từng client, nhưng tạo process liên tục tốn chi phí. Server tải cao thường giữ sẵn worker hoặc dùng event loop/thread pool. UDP không có kết nối TCP để `accept()`; process đọc datagram từ socket và xử lý từng message.

Không phải socket nào cũng đi qua IP. **Unix domain socket** kết nối process trên cùng máy bằng địa chỉ cục bộ (thường là pathname như `/run/...sock`, đôi khi là socket không tên), không cần interface, route hay cấu hình mạng. Nó có thể dùng kiểu stream hoặc datagram tương tự cách API socket tổng quát hoạt động, và quyền truy cập pathname có thể góp phần kiểm soát ai kết nối được. D-Bus và một số database dùng kiểu IPC này; `lsof -U` giúp tìm socket Unix đang mở. Loopback IP (`127.0.0.1`/`::1`) vẫn là IP networking qua kernel, còn Unix socket là một họ IPC riêng.

## Daemon lifecycle

Service có thể chạy nền liên tục hoặc được systemd socket-activated: systemd mở/listen socket rồi khởi động process khi có kết nối. Cách activation giảm process idle nhưng không phù hợp mọi service và cần hiểu socket unit/service dependency.

`systemctl status`, journal và socket list giúp biết service có chạy, bind port nào và log gì. Service có thể bind loopback, wildcard hoặc interface cụ thể; firewall/NAT quyết định traffic có tới được.

## Quyền và privilege separation

Service nên chạy với user riêng và quyền tối thiểu. Nếu cần bind privileged port hoặc đọc file riêng, cấp capability/permission cụ thể thay vì chạy toàn bộ daemon dưới root. Secret, working directory và writable path cần bảo vệ.

## SSH như một network service

OpenSSH minh họa rõ hai vai trò: `ssh` là client mở kết nối, `sshd` là server lắng nghe (thường trên TCP/22). Server có host key riêng để client xác minh danh tính máy; user key là một cơ chế xác thực người dùng khác. Client lưu host key đã chấp nhận trong `known_hosts`. Nếu key đột nhiên đổi, có thể là máy được cài lại, nhưng cũng có thể là giả mạo/MITM: xác minh fingerprint qua kênh đáng tin trước khi cập nhật bản ghi, đừng xóa cảnh báo theo thói quen.

Cấu hình server thường nằm dưới `/etc/ssh/`; tên service là `ssh` hoặc `sshd` tùy distro. Trước khi reload/restart từ xa, kiểm tra cấu hình bằng `sshd -t`, xác nhận cổng/interface đang bind và giữ một đường truy cập khôi phục. `systemctl status` cùng `ss -ltnp` hoặc `lsof -iTCP -sTCP:LISTEN` giúp liên hệ unit với listener thực tế. Socket activation có thể được cấu hình, nhưng server thông thường chạy như daemon riêng; đừng mặc định một trong hai cách.

## inetd và socket activation

inetd/xinetd truyền connection tới process được khởi chạy theo request; systemd có cơ chế socket activation hiện đại hơn. Cả hai tách việc giữ listener khỏi process service trong một số trường hợp. Không phải service nào cũng hỗ trợ nhận socket truyền vào; cấu hình mismatch khiến process mở port thứ hai hoặc không nhận được request.

## Tóm tắt

- Socket nối process với TCP/UDP endpoint do kernel quản.
- Service có thể bind/listen liên tục hoặc được socket-activate.
- Bind address xác định network scope; firewall vẫn cần policy.
- Dùng user/capability tối thiểu cho daemon.
- Xác minh service unit và socket unit cùng log.

## Tự kiểm tra

**Process chạy nghĩa port đang public trên Internet?** Không; bind address, firewall, routing/NAT quyết định.

**Socket activation làm mọi daemon khởi động nhanh hơn?** Không; cần hỗ trợ và workload phù hợp.

**Chạy daemon root là cách đơn giản an toàn?** Không; giảm privilege giảm phạm vi khi bị lỗi.

## Đọc tiếp

Khi service lỗi, packet capture và công cụ socket giúp phân biệt handshake, firewall và application.

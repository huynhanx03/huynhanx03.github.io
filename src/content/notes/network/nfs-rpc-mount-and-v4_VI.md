---
title: "NFS: RPC, mount và khác biệt giữa v3 với v4"
category: "Network"
tags: ["network", "nfs", "linux"]
description: "Theo dõi NFS từ RPC và mount protocol đến namespace v4, rồi liên hệ cấu hình client/server với firewall."
updated: 2026-10-16
translationKey: "network/nfs-rpc-mount-and-v4"
---

NFS cho phép client truy cập file trên server qua giao diện filesystem. Bên dưới, client và server trao đổi các thao tác như lookup, read, write và getattr bằng RPC. Mô hình này giúp ứng dụng dùng file API quen thuộc, nhưng latency, cache và lỗi mạng khiến hành vi khác đĩa cục bộ.

## RPC và mount

NFSv3 thường dùng ONC RPC và có thể cần portmapper/rpcbind cùng mount daemon để client tìm dịch vụ và export. Một số cổng được cấp động, nên firewall phải cho phép toàn bộ đường điều khiển cần thiết hoặc cấu hình cổng tĩnh.

NFSv4 tích hợp cơ chế mount/namespace vào giao thức hơn, thường dùng TCP 2049 và giảm phụ thuộc vào các dịch vụ cổng phụ. Cấu hình firewall vì vậy có thể đơn giản hơn, nhưng vẫn cần cho phép đúng client/server và các luồng cần thiết.

## Export, identity và quyền

Server quyết định thư mục nào được export và client nào được truy cập. Quyền Unix, UID/GID và cách ánh xạ danh tính ảnh hưởng kết quả; cùng tên user trên hai máy không bảo đảm cùng số UID. `root_squash` thường ánh xạ root từ client thành tài khoản ít quyền hơn, hạn chế quyền root từ xa.

`showmount` hữu ích với một số cấu hình v3 nhưng không phải phép thử tổng quát cho mọi server v4. Client thường mount bằng tên export và tùy chọn protocol; kiểm tra `findmnt`, `nfsstat` và log kernel/systemd khi gặp lỗi.

## Hành vi lỗi và độ bền

Mount hard có thể tiếp tục retry khi server mất kết nối; tiến trình chạm filesystem có thể chờ lâu. Mount soft có thể trả lỗi cho ứng dụng sau retry, nhưng ứng dụng phải xử lý lỗi ghi một cách an toàn. Chọn tùy chọn theo semantics dữ liệu, không chỉ theo cảm giác “đỡ treo”.

Cache thuộc tính và dữ liệu giúp giảm round-trip, nhưng làm khả năng nhìn thấy thay đổi của client khác phức tạp hơn. NFS không tự biến thao tác nhiều file thành transaction. Ứng dụng cần chịu được stale handle, timeout, retry và kết quả không xác định sau đứt mạng.

## Tự kiểm tra

**NFSv4 luôn cần rpcbind như NFSv3?** Thường không theo cách triển khai phổ biến; v4 tích hợp nhiều chức năng và thường dùng 2049.

**Cùng username có nghĩa UID/GID giống nhau?** Không.

**Soft mount luôn an toàn hơn vì không chờ lâu?** Không; nó có thể trả lỗi I/O mà ứng dụng không xử lý đúng.

## Đọc tiếp

AFS dùng callback để cache theo hướng khác; so sánh giúp thấy thiết kế consistency ảnh hưởng workload ra sao.

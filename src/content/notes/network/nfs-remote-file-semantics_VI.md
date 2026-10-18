---
title: "NFS: filesystem từ xa và cache consistency"
category: "Network"
tags: ["network", "nfs", "distributed filesystem"]
description: "Hiểu client/server NFS, remote procedure, file handle và những khác biệt consistency so với ổ cục bộ."
updated: 2026-10-16
translationKey: "network/nfs-remote-file-semantics"
---

NFS cho phép client truy cập file trên server qua giao diện gần với filesystem local. Kernel client chuyển thao tác thành request qua mạng; server kiểm tra handle/quyền, truy cập filesystem thật và trả kết quả. Mạng thêm latency, timeout, retry và lỗi server vào semantics.

## File handle và protocol

NFS dùng file handle opaque để server/client định danh đối tượng export; client không nhất thiết gửi pathname tuyệt đối cho mỗi thao tác. Mount negotiation xác định export, protocol version và option. NFSv3 thường dựa nhiều vào stateless request model; NFSv4 thêm stateful features/lease, locking và compound operations.

Mô hình NFSv2 kinh điển làm rõ vì sao stateless giúp server phục hồi nhanh: mỗi request mang đủ file handle, offset, count và dữ liệu cần thiết, nên server không phải giữ file descriptor/current offset cho từng client. Handle thường kết hợp định danh volume, inode và generation để handle cũ không vô tình truy cập inode mới được cấp lại. Client vẫn giữ FD và file offset cục bộ, rồi biến thao tác POSIX thành request độc lập.

## Cache consistency

Client cache file attributes/data để giảm round trip. Client khác có thể sửa file, nên cache visibility không giống RAM shared variable tức thì. Attribute cache timeout, close-to-open behavior và protocol version/configuration ảnh hưởng thời điểm thấy cập nhật.

Trong mô hình close-to-open, client đẩy dirty data lên server khi file được đóng; client khác mở lại sau đó có thể thấy update. Để tránh dùng cache cũ, client kiểm tra attributes như thời điểm sửa file; attribute cache giảm số `GETATTR` round-trip nhưng tạo một khoảng ngắn có thể trả bản stale. Vì vậy “đã close” và “client khác thấy ngay” còn phụ thuộc version, cache timeout và cấu hình.

Ứng dụng cần phối hợp nếu nhiều client ghi đồng thời cùng file. NFS locking/lease không biến ứng dụng thành transaction database.

## Failure và retry

Server restart hoặc network partition khiến request timeout. Client có thể retry; thao tác idempotent dễ phục hồi hơn. Một thao tác ghi có thể tới server nhưng response bị mất, khiến client không biết kết quả đã commit chưa. “Hard/soft mount” có semantics/risks khác nhau; chọn theo yêu cầu thay vì tắt retry để né treo.

WRITE có thể retry an toàn hơn khi request ghi cùng bytes vào cùng offset; lặp phép “ghi giá trị” có cùng hiệu ứng, còn lặp thao tác tương đối như “tăng counter” thì không. Tạo directory là ví dụ khó: request đầu đã thành công nhưng reply mất, lần retry có thể trả “đã tồn tại”, khiến client khó phân biệt trạng thái cuối. Server NFSv2 vì thế phải xác định rõ điểm bền vững trước khi trả thành công cho WRITE; nếu ACK khi data chỉ ở RAM rồi server crash, client tưởng đã ghi xong nhưng server mất update.

## Bảo mật và vận hành

Export policy, UID mapping, Kerberos/security flavor, firewall và network trust ảnh hưởng quyền. Cấu hình `no_root_squash` có thể cấp quyền rất rộng cho root client; cần hiểu threat model. Theo dõi latency, retransmission, server load và mount options.

## Tóm tắt

- NFS đưa file operation qua RPC/network tới server.
- NFSv3/v4 khác về state, lease, locking và protocol features.
- Cache cải thiện hiệu năng nhưng consistency phụ thuộc protocol/config.
- Timeout tạo trạng thái không rõ; retry cần xét idempotency.
- Export/authentication options quyết định bảo mật, không chỉ mount thành công.

## Tự kiểm tra

**NFS mount được nghĩa ghi đã bền vững?** Không; cần semantics sync/durability cụ thể.

**Hai client cùng ghi file có transaction isolation?** Không tự động.

**Timeout chứng minh write chưa tới server?** Không; server có thể đã xử lý và response bị mất.

## Đọc tiếp

AFS dùng cache callback và volume/location architecture khác để scale namespace toàn tổ chức.

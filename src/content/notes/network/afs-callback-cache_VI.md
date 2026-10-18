---
title: "AFS: callback caching và namespace phân tán"
category: "Network"
tags: ["network", "afs", "distributed filesystem", "cache"]
description: "Khám phá kiến trúc AFS, volume/location service và callback-based cache consistency."
updated: 2026-10-16
translationKey: "network/afs-callback-cache"
---

Andrew File System (AFS) được thiết kế để chia sẻ file qua mạng trong môi trường nhiều client. Nó giảm server load và latency bằng cache mạnh ở client, đồng thời dùng callback để báo client khi dữ liệu cache không còn hợp lệ.

## Từ AFSv1 sang AFSv2

AFSv1 tải toàn bộ file về cache trên đĩa client khi mở; đọc/ghi tiếp theo đi qua filesystem cục bộ, và file đã sửa được gửi lại khi đóng. Nhưng client vẫn phải hỏi server `TestAuth` xem bản cache còn mới không, còn `Fetch`/`Store` gửi pathname để server tự đi qua directory tree. Cả validation lặp lại lẫn path traversal khiến server CPU/network thành bottleneck.

AFSv2 dùng callback và file identifier (FID). Client tải directory theo từng component, cache local và nhận callback cho từng đối tượng; các lần mở sau kiểm tra callback cục bộ thay vì polling server. FID giúp request trỏ tới volume/file/uniquifier mà không cần gửi lại pathname đầy đủ. Đổi lại, server phải giữ callback state và xử lý recovery khi client hoặc server mất liên lạc.

## Namespace và volume

AFS cung cấp namespace toàn cục, trong đó volume là đơn vị quản trị/di chuyển dữ liệu. Location service giúp client tìm server đang chứa volume. Client cache file trên local disk, không chỉ RAM, để giảm tải và hỗ trợ truy cập lặp.

## Callback consistency

Server cấp callback cho client đang cache object; khi object thay đổi, server báo callback break để client invalidate hoặc cập nhật cache. Nếu callback server/client mất kết nối, timeout/lease và validation lại cần khôi phục đúng trạng thái.

Mô hình này phù hợp workload đọc nhiều, ghi ít hơn. Nhiều client ghi xung đột và failure network làm consistency phức tạp; cache callback không phải shared memory trong suốt.

Thiết kế AFS giả định nhiều file được truy cập tuần tự/toàn bộ và ít bị chia sẻ đồng thời. Vì thế tải toàn file rất hợp khi mở lại file lớn, nhưng kém hiệu quả với truy cập vài block hoặc append nhỏ vào log lớn: client có thể phải tải rồi ghi trả cả file. Callback/cache consistency cũng không cung cấp transaction hay khóa ứng dụng; workflow như nhiều client cùng sửa source cần lock hoặc protocol phối hợp riêng.

### Bài thực hành: lần theo callback và lịch ghi

Với simulator AFS hoặc một trace nhỏ, ghi riêng giá trị file server-side, bản local của từng client, trạng thái callback và sự kiện open/read/write/close. Bắt đầu bằng một client ghi rồi đóng file; sau đó thêm client thứ hai đang giữ cache và xem khi nào callback bị break, lần đọc kế tiếp phải kiểm tra lại ở đâu. Cuối cùng cho hai client cùng mở, sửa và đóng file theo các thứ tự khác nhau; so lịch ngẫu nhiên với lịch cố định để tìm các kết quả đọc và giá trị cuối có thể xảy ra. Không suy diễn thứ tự vận hành thực từ một trace duy nhất: callback và cache state là distributed protocol, còn lịch mạng có thể đổi kết quả quan sát.

Theo mô hình AFS cổ điển, khi một client đóng file đã sửa, toàn bộ file được gửi lên server; server cập nhật bản lưu và break callback của client khác. Process cùng máy có thể thấy ghi mới ngay, còn client khác thường chỉ thấy sau lần close/đổi callback rồi mở lại. Nếu hai client cùng sửa, bản được đóng sau có thể ghi đè toàn bộ bản kia (last closer wins); cần file-level locking hoặc cơ chế phối hợp của ứng dụng nếu không chấp nhận điều đó.

Server restart làm mất callback table trong RAM; client phải xem cache là không đáng tin cho tới khi xác thực lại. Client reboot cũng có thể bỏ lỡ callback break, nên cần hỏi server trước khi dùng bản cache cũ. Cơ chế này đổi polling liên tục của NFS-style attribute cache lấy state/recovery phức tạp hơn.

## So với NFS khái quát

NFS thường được biết với thao tác file theo request và attribute/data cache timeout; AFS nhấn mạnh client caching và callback invalidation cùng namespace/volume management. Cả hai đều cần xử lý auth, partition, retry và cache freshness. Cấu hình/version hiện đại có thể khác mô tả lịch sử.

## Tóm tắt

- AFS tổ chức file trong namespace và volume có thể định vị trên server.
- Client cache mạnh để giảm network round trip.
- Callback báo cache không còn hợp lệ khi dữ liệu đổi.
- Callback/lease failure cần validation và phục hồi.
- Cache toàn file giúp đọc lặp nhanh nhưng ghi/đọc một phần file lớn có thể tốn băng thông dư thừa.
- Close-to-open là consistency model, không thay thế lock/transaction khi ghi đồng thời.
- Chọn AFS-style whole-file cache hay NFS-style block I/O theo workload; đo pattern thật trước khi chọn.
- Network filesystem có consistency/failure semantics khác local FS.
- Khi phân tích AFS, lần theo cache từng client, callback, close và thứ tự lịch riêng rẽ.

## Tự kiểm tra

**Callback cache nghĩa client luôn thấy update tức thì?** Không; mất message/partition và protocol recovery cần xét.

**AFS cache mạnh hơn nghĩa server không cần quản lý quyền?** Không; authentication/authorization vẫn thiết yếu.

**NFS/AFS ứng xử như RAM shared?** Không; latency, cache và failure mạng tạo semantics khác.

## Đọc tiếp

Container network tạo interface/bridge/NAT riêng; xem bài sau để liên hệ namespace với kết nối service.

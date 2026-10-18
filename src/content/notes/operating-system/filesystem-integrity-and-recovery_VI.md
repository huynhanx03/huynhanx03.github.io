---
title: "Filesystem integrity: checksum, kiểm tra và phục hồi dữ liệu"
category: "Operating System"
tags: ["filesystem", "integrity", "recovery", "storage"]
description: "Phân biệt nhất quán cấu trúc với tính toàn vẹn dữ liệu, hiểu checksum, fsck, snapshot và backup."
updated: 2026-10-17
translationKey: "operating-system/filesystem-integrity-and-recovery"
---

Sau crash, filesystem có thể mount được nhưng một số file vẫn hỏng; hoặc data còn nguyên nhưng metadata làm tên file không truy cập được. Cần phân biệt **consistency** của cấu trúc, **integrity** của nội dung và **durability** của dữ liệu đã xác nhận ghi.

## Kiểm tra cấu trúc và fsck

Công cụ kiểm tra filesystem có thể đối chiếu inode, directory, block allocation và metadata. Nếu phát hiện sai lệch, nó có thể sửa theo quy tắc filesystem, nhưng việc sửa có thể chọn một cách diễn giải trong khi dữ liệu gốc đã mất một phần. Thông thường, không chạy `fsck` trên filesystem đang được mount: kernel và công cụ kiểm tra có thể cùng thay đổi dữ liệu, khiến trạng thái không nhất quán và gây hỏng thêm. Kiểm tra hướng dẫn của filesystem cụ thể và bảo đảm filesystem được tháo mount hoặc ở trạng thái an toàn trước khi sửa.

Trên họ ext2/ext3/ext4, `fsck` thường nhận diện loại filesystem rồi gọi công cụ như `e2fsck`. Tên `fsck` là giao diện chung; chi tiết kiểm tra và tùy chọn phụ thuộc filesystem.

Journal giúp phục hồi transaction metadata; fsck kiểm tra sâu hơn khi cần. Chúng có mục tiêu khác nhau và không thay nhau hoàn toàn.

## Checksum phát hiện corruption

Checksum/hash lưu dấu vết của block hoặc object để phát hiện nội dung thay đổi ngoài dự kiến. Một checksum mạnh hơn có thể giảm xác suất va chạm nhưng vẫn không tự phục hồi dữ liệu. Filesystem có redundancy hoặc replication mới có thể dùng bản khác để sửa lỗi; các thiết kế như copy-on-write checksummed tree kết hợp phát hiện với cơ chế phục hồi tùy cấu hình.

Lỗi đọc không sửa được (latent sector error) thường được thiết bị báo rõ; mirror/parity có thể lấy hoặc tái tạo block khác nếu redundancy còn đủ. Corruption im lặng nguy hiểm hơn: disk trả block đọc được nhưng là nội dung sai, nên cần checksum để phát hiện rồi mới chọn bản phục hồi. Checksum đơn giản như XOR nhanh nhưng có thể bỏ sót các thay đổi bù trừ; Fletcher/CRC phát hiện nhiều mẫu lỗi hơn nhưng không có checksum hữu hạn nào loại bỏ hoàn toàn collision. Checksum phát hiện lỗi, không tự chứng minh dữ liệu đúng nếu checksum và data cùng bị thay.

Checksum cần gắn với đúng block. Metadata checksum có thể kèm identity/vị trí dự kiến (ví dụ file, block offset hoặc device address) để phát hiện misdirected write, nơi nội dung hợp lệ bị ghi nhầm chỗ. Lost write khác: thiết bị báo hoàn tất nhưng vẫn giữ block cũ; checksum nằm cạnh chính block cũ có thể vẫn khớp. Một cách phát hiện là giữ checksum ở metadata cha (inode/indirect block) hoặc read-after-write, tùy kiến trúc và chi phí.

Scrub đọc định kỳ cả dữ liệu ít được truy cập để checksum được kiểm tra trước khi lỗi tích lũy ở mọi bản sao. Scrub có thể tìm LSE/corruption và dùng redundancy phục hồi, nhưng tốn I/O, nên lịch và tốc độ cần cân bằng với tải thực. Checksumming cũng tiêu tốn CPU và chỗ lưu checksum; lưu checksum tách khỏi data có thể cần thêm I/O, còn kiểm checksum khi copy có thể giảm overhead CPU.

Checksum không chống được attacker có thể sửa cả dữ liệu lẫn checksum: họ có thể tính lại dấu kiểm. Muốn xác thực nội dung trước một bên không có khóa, cần cơ chế có khóa như MAC/HMAC hoặc chữ ký số, đồng thời phải bảo vệ khóa và thông tin xác thực. Đây là mục tiêu khác với phát hiện lỗi ngẫu nhiên bằng checksum; xem [RFC 2104 về HMAC](https://www.rfc-editor.org/rfc/rfc2104.html).

## Snapshot và backup

Snapshot ghi lại trạng thái tại một thời điểm theo cơ chế copy-on-write hoặc volume manager. Snapshot hữu ích để rollback thao tác hoặc tạo điểm nhất quán, nhưng thường ở cùng hệ thống lưu trữ nên không bảo vệ khỏi hỏng thiết bị, ransomware hay lỗi quản trị phá toàn volume.

Backup cần có bản sao độc lập, lịch sử phiên bản, kiểm soát truy cập và quy trình khôi phục đã diễn tập. Một backup chưa từng restore thử chỉ là giả thuyết về khả năng khôi phục.

## Tóm tắt

- Consistency cấu trúc khác integrity nội dung và durability.
- Journal hỗ trợ phục hồi transaction; checker phát hiện/sửa bất nhất theo filesystem.
- Checksum phát hiện sai lệch nhưng không tự phục hồi.
- LSE được báo lỗi đọc; corruption im lặng cần checksum để phát hiện trước khi dùng redundancy phục hồi.
- Identity trong checksum phát hiện block ghi nhầm vị trí; metadata checksum có thể phát hiện lost write.
- Scrub kiểm tra định kỳ dữ liệu ít được đọc, với chi phí I/O/CPU.
- Snapshot thuận tiện rollback nhưng không phải bản sao độc lập.
- Backup cần version, cách ly lỗi và thử khôi phục định kỳ.

## Tự kiểm tra

**Checksum có thể khôi phục file hỏng?** Không nếu không có bản dữ liệu dư thừa phù hợp.

**Snapshot trong cùng ổ bảo vệ khi ổ hỏng?** Không.

**Mount thành công chứng minh toàn bộ nội dung file đều đúng?** Không; nó chỉ cho biết filesystem có thể được truy cập ở mức nào đó.

## Đọc tiếp

Sau filesystem trên đĩa cục bộ, topic Network sẽ mở rộng sang filesystem phân tán và truy cập file qua mạng.

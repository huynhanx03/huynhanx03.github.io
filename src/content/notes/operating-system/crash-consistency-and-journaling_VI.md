---
title: "Crash consistency và journaling: phục hồi sau khi mất điện"
category: "Operating System"
tags: ["filesystem", "journaling", "crash consistency"]
description: "Phân tích cập nhật nhiều block, write ordering, journaling và giới hạn durability mà ứng dụng cần biết."
updated: 2026-10-16
translationKey: "operating-system/crash-consistency-and-journaling"
---

Tạo file có thể cần cập nhật directory entry, inode, bitmap và block dữ liệu. Nếu máy mất điện sau khi chỉ một phần được ghi xuống thiết bị, filesystem có thể thấy trạng thái không nhất quán: tên trỏ tới block chưa cấp, hoặc block bị cấp nhưng không còn file nào tham chiếu.

## Atomicity ở mức nào?

Một syscall có thể được ứng dụng nhìn như một thao tác, nhưng filesystem phải sửa nhiều block. Thiết bị không nhất thiết ghi tất cả cùng lúc. **Crash consistency** hỏi: sau crash ở bất kỳ thời điểm nào, cấu trúc nào còn hợp lệ và dữ liệu nào được giữ?

`write()` thành công thường nói kernel đã nhận một số byte; dữ liệu có thể còn trong cache. `fsync()`/primitive tương ứng yêu cầu đồng bộ theo hợp đồng hệ thống, nhưng cần đồng bộ đúng file và directory khi tạo/rename để bảo đảm metadata cần thiết. Chi tiết portability và filesystem phải được kiểm tra.

Ví dụ append một block mới có thể phải ghi ba thứ: block dữ liệu mới, inode đã tăng size/trỏ tới block đó, và bitmap đánh dấu block đã cấp. Nếu chỉ inode được ghi, nó có thể trỏ vào dữ liệu rác và bitmap vẫn nói block còn trống; nếu chỉ bitmap được ghi, block thành vùng bị chiếm nhưng không file nào sở hữu. Một số thứ tự ghi có thể chỉ làm mất phần append mới, số khác tạo inconsistency hoặc space leak. Vì vậy “syscall là một thao tác” không có nghĩa các block vật lý được cập nhật nguyên tử.

## Journaling

Filesystem journal ghi trước một log các metadata update hoặc transaction, rồi áp dụng chúng vào vị trí chính thức. Sau crash, recovery đọc journal để hoàn tất hoặc bỏ thao tác chưa commit theo protocol. Journaling metadata giúp cấu trúc filesystem phục hồi nhanh, nhưng không tự bảo đảm mọi data của ứng dụng đã bền vững.

Trong mô hình redo logging, transaction được ghi theo pha: ghi transaction begin và nội dung update vào journal; chỉ sau khi nội dung log bền mới ghi commit/end marker; rồi checkpoint các block mới về vị trí chính thức. Khi mount lại, transaction chưa có commit marker bị bỏ qua; transaction đã commit nhưng checkpoint dang dở được replay. Việc ghi log và commit marker phải có ordering bền vững; nếu thiết bị có write cache, chỉ chờ lệnh ghi hoàn tất có thể chưa đủ. Filesystem dùng flush/barrier hoặc cơ chế tương ứng để duy trì thứ tự, và protocol phụ thuộc implementation.

Để ghi nhiều block transaction hiệu quả, log cần nhận diện transaction hoàn chỉnh (ví dụ bằng commit marker và checksum), thay vì giả định một lệnh ghi lớn được ghi theo đúng thứ tự từng phần. Sau commit, crash trong lúc checkpoint không làm mất transaction: recovery có thể ghi lại các block đã được commit.

Journal hữu hạn thường được dùng như vòng tròn: transaction đã checkpoint có thể được đánh dấu giải phóng để tái sử dụng vùng log. Filesystem cũng có thể gom nhiều thay đổi vào một transaction chung, tránh ghi lặp cùng bitmap/inode/directory khi nhiều thao tác xảy ra gần nhau. Đổi lại, gom lâu làm tăng khoảng thời gian dirty state chỉ tồn tại trong RAM.

Trong metadata-only journaling, file data không được ghi vào journal. Để inode sau recovery không trỏ tới block chưa ghi dữ liệu, ordered mode buộc data block đến đĩa trước khi transaction metadata được commit. Writeback mode có ordering yếu hơn; journal có thể làm metadata nhất quán nhưng không nhất thiết giữ nội dung mới nhất. Journal cả data và metadata giảm rủi ro về nội dung nhưng tăng write traffic vì data được ghi vào log rồi checkpoint thêm lần nữa.

Tái sử dụng block tạo một trường hợp tinh vi: transaction cũ trong journal có thể chứa directory/data của block đã được giải phóng, trong khi block đó được cấp lại cho file mới. Replay mù transaction cũ có thể ghi đè dữ liệu mới. Một số journal xử lý bằng revoke record để báo recovery không replay nội dung cũ của block đó.

## fsck sửa gì và vì sao chậm?

Filesystem checker thường chạy trước khi cho phép truy cập filesystem. Nó kiểm tra superblock (có thể dùng bản sao dự phòng), quét inode/indirect block để dựng lại bitmap cấp phát, đối chiếu inode và link count với directory tree, tìm block bị trỏ trùng hoặc ngoài phạm vi, và xác minh directory entry. Inode còn được cấp nhưng không có directory tham chiếu có thể được đưa vào `lost+found` tùy công cụ/filesystem.

Checker có thể phục hồi cấu trúc metadata nhưng không thể suy ra nội dung người dùng đúng nếu block đã chứa dữ liệu rác. Quét toàn volume tốn thời gian theo kích thước filesystem; journaling rút ngắn recovery bằng cách tập trung vào transaction dang dở, còn checker đầy đủ vẫn hữu ích cho loại lỗi journaling không giải quyết.

## Các hướng thiết kế khác

Soft Updates duy trì consistency bằng cách áp thứ tự ghi giữa các cấu trúc, chẳng hạn ghi block được trỏ tới trước inode chứa pointer. Cách này tránh journal data nhưng cần hiểu chính xác quan hệ phụ thuộc của từng filesystem. Copy-on-write ghi phiên bản mới vào block trống, rồi đổi root pointer để công bố cây mới; không ghi đè bản cũ tại chỗ. Hai cách này đổi độ phức tạp, I/O và thu hồi không gian theo các hướng khác nhau.

Sách cũng nêu hai hướng nghiên cứu ít phổ biến hơn: backpointer-based consistency thêm tham chiếu ngược để phát hiện quan hệ pointer không khớp khi đọc; optimistic crash consistency cho phép phát nhiều ghi rồi dùng checksum/cơ chế nhận diện để phát hiện transaction dang dở. Đây là ví dụ về thiết kế, không phải giao diện phổ quát cần giả định có trên mọi filesystem.

Một số filesystem journal data đầy đủ; số khác chỉ journal metadata hoặc dùng copy-on-write tree. Chế độ journaling và thứ tự ghi ảnh hưởng semantics/hiệu năng. Không nên khái quát từ tên “journal” rằng mọi file content luôn được bảo toàn.

## Ordering và flush

Để transaction đúng, filesystem/device cần đảm bảo ghi theo thứ tự cần thiết. Write barrier, flush và force unit access là các khái niệm liên quan tới thứ tự/bền vững; cache thiết bị có thể làm dữ liệu chưa thật sự tới media khi OS nghĩ thao tác đã xong nếu không dùng đúng cơ chế.

Đây là ranh giới giữa ứng dụng, filesystem, block layer, driver và thiết bị. Durability là thuộc tính xuyên suốt nhiều tầng, không chỉ một lần gọi hàm.

## Atomic rename và mẫu cập nhật file

Mẫu phổ biến là ghi nội dung vào file tạm, đồng bộ file, rename vào vị trí chính thức rồi đồng bộ directory theo semantics cần thiết. Rename trong cùng filesystem thường cung cấp tính nguyên tử cho việc đổi tên quan sát được, nhưng không tự đảm bảo nội dung đã bền vững nếu bỏ qua flush.

Mẫu chính xác phụ thuộc OS, filesystem và yêu cầu ứng dụng. Dữ liệu quan trọng nên có protocol được tài liệu hóa và kiểm thử crash/recovery.

## Tóm tắt

- Một thao tác file có thể sửa nhiều block; crash giữa chừng cần recovery.
- Block data, inode và bitmap có thể lệch nhau nếu crash giữa các lần ghi.
- Journaling ghi log để khôi phục nhất quán, nhưng phạm vi data được journal khác nhau.
- Redo journal commit rồi checkpoint; chỉ replay transaction đã commit.
- Journal có thể batch transaction và tái dùng log dạng vòng; ordered mode ghi data trước commit metadata.
- Revoke record ngăn replay dữ liệu cũ sau khi block đã được cấp lại.
- fsck dựng lại/đối chiếu metadata nhưng cần quét rộng và không sửa được nội dung dữ liệu đã mất.
- Soft Updates dùng thứ tự ghi; copy-on-write ghi bản mới rồi chuyển root.
- Recovery từ journal thường quét log thay vì toàn volume; các hướng nghiên cứu khác dùng backpointer hoặc kiểm tra optimistic.
- `write()` thành công không đồng nghĩa durability; cần primitive đồng bộ phù hợp.
- Ordering/flush cần được duy trì xuyên filesystem, driver và thiết bị.
- Rename nguyên tử về namespace không tự bảo đảm nội dung đã bền vững.

## Tự kiểm tra

**Filesystem journaling bảo đảm mọi dữ liệu ứng dụng không mất sau mất điện?** Không nhất thiết; nhiều chế độ chỉ journal metadata.

**Gọi `fsync` một file luôn bảo đảm tên mới của file tồn tại sau crash?** Có thể cần đồng bộ directory theo semantics của hệ thống.

**Atomic rename đồng nghĩa transaction database?** Không; nó có phạm vi và bảo đảm khác.

## Đọc tiếp

Bài cuối trong nhóm filesystem xem checksum, integrity và các lớp phòng vệ dữ liệu.

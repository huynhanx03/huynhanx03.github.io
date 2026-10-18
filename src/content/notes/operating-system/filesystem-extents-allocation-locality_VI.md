---
title: "Cấp phát file, extent và locality"
category: "Operating System"
tags: ["operating-system", "filesystem", "storage"]
description: "So sánh block allocation, extent và locality; hiểu fragment, metadata overhead và vì sao bố trí dữ liệu ảnh hưởng I/O."
updated: 2026-10-16
translationKey: "operating-system/filesystem-extents-allocation-locality"
---

Filesystem biến file có độ dài thay đổi thành các block trên thiết bị. Cách ánh xạ logical offset trong file tới block vật lý ảnh hưởng hiệu năng tuần tự, truy cập ngẫu nhiên, overhead metadata và khả năng chống phân mảnh.

## Cấp phát theo block và extent

Ánh xạ từng block trực tiếp dễ biểu diễn nhưng file lớn cần nhiều entry. Extent mô tả một dải block liên tiếp bằng điểm bắt đầu và độ dài, giảm metadata khi file được cấp thành vùng liền nhau. Cây hoặc cấu trúc chỉ mục có thể giữ nhiều extent cho file bị phân mảnh.

Một file có thể rỗng ở một số vùng (sparse file): logical offset tồn tại nhưng chưa có block dữ liệu tương ứng. Đọc vùng đó trả về byte zero theo semantics filesystem mà không cần lưu các zero bytes. `du` và `stat` vì vậy có thể cho kích thước logic và dung lượng chiếm chỗ khác nhau.

## Locality và fragmentation

Đĩa quay chịu chi phí seek và rotation, nên đặt block gần nhau có thể giảm độ trễ đọc tuần tự. SSD không có seek cơ học, nhưng locality vẫn ảnh hưởng số lệnh, queueing, cache và write amplification. Fragmentation tăng số vùng phải truy xuất, song tác động phụ thuộc thiết bị và workload.

Filesystem có thể trì hoãn cấp phát (delayed allocation) để nhìn thấy nhiều thao tác ghi rồi chọn vùng lớn hơn. Điều này cải thiện extent nhưng có nghĩa lỗi dung lượng có thể xuất hiện muộn hơn lúc ứng dụng gọi write. `fsync` và các durability contract vẫn quyết định khi dữ liệu được yêu cầu ổn định.

## Dung lượng metadata và file nhỏ

File nhỏ có thể vẫn cần inode, directory entry, journal record và block metadata. Nhiều file nhỏ vì thế có thể cạn inode trước khi hết data blocks. Kiểm tra `df -h` cho block capacity và `df -i` cho inode capacity.

## Tự kiểm tra

**Extent là gì?** Mô tả một vùng block liên tục bằng vị trí và độ dài.

**Sparse file có thể có kích thước logic lớn nhưng chiếm ít block?** Có.

**SSD khiến locality hoàn toàn vô nghĩa?** Không; cơ chế ảnh hưởng khác đĩa quay nhưng số I/O và layout vẫn quan trọng.

## Đọc tiếp

Sau cấp phát, journaling và crash consistency quyết định metadata/file nào còn hợp lệ sau mất điện.

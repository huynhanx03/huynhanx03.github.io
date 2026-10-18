---
title: "fsync, rename và cập nhật file an toàn"
category: "Operating System"
tags: ["operating-system", "filesystem", "durability"]
description: "Phân biệt atomic rename với durability, rồi xây quy trình ghi file chống crash dựa trên file tạm và đồng bộ thư mục."
updated: 2026-10-17
translationKey: "operating-system/filesystem-fsync-rename-atomicity"
---

Ứng dụng thường cần thay file cấu hình mà không để reader thấy nội dung viết dở. Ghi trực tiếp file cũ có thể để lại trạng thái một phần nếu process crash. Tạo file tạm cùng filesystem rồi rename giúp chuyển tên nguyên tử trên nhiều filesystem phổ biến, nhưng atomicity không đồng nghĩa dữ liệu đã bền qua mất điện.

## Quy trình cập nhật

1. Tạo file tạm ngay trong directory chứa file đích. Cùng filesystem là điều kiện để rename nguyên tử; cùng directory giúp quy trình đồng bộ directory rõ ràng hơn.
2. Ghi đầy đủ nội dung, đặt metadata cần giữ như quyền truy cập, rồi kiểm tra lỗi của các thao tác.
3. Gọi `fsync` trên file tạm và kiểm tra kết quả để yêu cầu dữ liệu cùng metadata của file ổn định.
4. Rename file tạm lên đường dẫn đích và kiểm tra lỗi.
5. Gọi `fsync` trên directory chứa file đích và kiểm tra kết quả để yêu cầu thay đổi directory entry ổn định. `fsync` file không tự đảm bảo tên file đã bền; xem [`fsync(2)`](https://man7.org/linux/man-pages/man2/fsync.2.html).

Nếu file tạm nằm ở directory khác, rename vẫn có thể nguyên tử khi cùng filesystem, nhưng cả directory nguồn và directory đích đều thay đổi; cần cân nhắc đồng bộ cả hai. Chi tiết durability phụ thuộc filesystem, mount option, kernel, device cache và hardware. `fdatasync` có thể đủ khi metadata không ảnh hưởng cách đọc dữ liệu; chọn theo contract ứng dụng.

## Atomicity khác durability

Atomic rename đảm bảo observer thấy tên cũ hoặc tên mới thay vì trạng thái rename một nửa. Nếu mất điện trước khi metadata được flush, kết quả sau boot vẫn phụ thuộc filesystem/device. Ghi nhiều file riêng rẽ cũng không tạo transaction nguyên tử xuyên nhiều file.

## Tự kiểm tra

**Rename nguyên tử có nghĩa nội dung chắc chắn bền?** Không.

**File tạm nên ở filesystem khác?** Không; rename xuyên filesystem thường không nguyên tử và có thể thất bại.

**`fsync(file)` luôn đủ để làm bền tên mới?** Có thể cần sync directory sau rename.

## Đọc tiếp

Journaling bảo vệ metadata theo các chế độ khác nhau nhưng không thay durability contract của ứng dụng.

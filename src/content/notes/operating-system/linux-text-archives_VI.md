---
title: "Đọc log và gói file: grep, tail, tar và compression"
category: "Operating System"
tags: ["linux", "text tools", "archives", "compression"]
description: "Kết hợp công cụ dòng lệnh để lọc log, theo dõi file và hiểu archive khác compression."
updated: 2026-10-16
translationKey: "operating-system/linux-text-archives"
---

Unix cung cấp nhiều chương trình nhỏ thao tác trên stream văn bản. Ghép chúng bằng pipe thường nhanh hơn viết một công cụ lớn cho tác vụ đơn giản, nhưng cần chú ý encoding, quoting và status lỗi.

## Lọc và theo dõi log

`grep -n` tìm dòng khớp và hiển thị line number; `tail -f` theo dõi file đang tăng; `less` cho phép cuộn; `sort | uniq -c` nhóm các dòng giống nhau sau khi sắp xếp. Nếu log được rotate bằng rename, `tail -f` có thể tiếp tục theo file descriptor cũ; `tail -F` thường theo tên file và mở lại khi thay đổi.

Regex cơ bản của `grep` khác PCRE; ký tự đặc biệt cần quote để vừa tránh shell expansion vừa giữ pattern đúng.

## Archive không giống compression

`tar` gom nhiều path, metadata và nội dung thành một archive; gzip/xz/zstd nén stream. `.tar.gz` thường có nghĩa tar rồi gzip, không phải một định dạng tar “nén sẵn” theo cùng lớp.

```sh
tar -czf backup.tar.gz directory/
tar -tzf backup.tar.gz
```

Trước khi giải nén archive không tin cậy, liệt kê nội dung và kiểm tra path. Archive có thể chứa đường dẫn bất thường hoặc file lớn gây cạn dung lượng; chạy extract trong thư mục giới hạn quyền.

## Dung lượng và integrity

Compression giảm dung lượng khi dữ liệu có cấu trúc dư thừa; dữ liệu đã nén/mã hóa thường giảm ít. Hash/checksum có thể phát hiện thay đổi file nhưng không chứng minh nguồn đáng tin nếu hash lấy từ cùng nguồn không xác thực.

## Tóm tắt

- `grep`, `tail`, `less`, `sort` và `uniq` ghép thành pipeline phân tích log.
- `tail -F` hữu ích khi file log bị rotate/đổi tên.
- `tar` archive nhiều file; gzip/xz/zstd nén.
- Xem nội dung archive trước khi extract dữ liệu không tin cậy.
- Checksum phát hiện thay đổi nhưng authenticity cần nguồn tin cậy.

## Tự kiểm tra

**`.gz` có thể lưu directory tree và permission một cách độc lập?** Gzip nén một stream; tar thường lưu cây file/metadata.

**Hash đúng chứng minh file đến từ tác giả tin cậy?** Chỉ khi hash được lấy qua kênh xác thực.

**`tail -f` luôn theo file mới sau rotation?** Không nhất thiết; hành vi phụ thuộc option và cách rotate.

## Đọc tiếp

Topic Linux Tools tiếp tục với build, linker và package cài đặt.

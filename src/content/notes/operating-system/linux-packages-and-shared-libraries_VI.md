---
title: "Package manager, shared library và executable"
category: "Operating System"
tags: ["linux", "packages", "linker"]
description: "Phân biệt package với executable, hiểu dynamic linker tìm thư viện thế nào và điều tra lỗi thiếu dependency."
updated: 2026-10-16
translationKey: "operating-system/linux-packages-and-shared-libraries"
---

Một chương trình chạy được thường phụ thuộc vào executable, shared library, cấu hình và dữ liệu. Package manager quản lý cách cài, nâng cấp và gỡ các file này theo metadata dependency; nó không chỉ tải một file binary.

## Package và dependency

Các họ phân phối dùng định dạng và công cụ riêng, như Debian packages với `apt`/`dpkg`, RPM packages với `dnf`/`rpm`. Package manager biết phiên bản, nguồn repository, quan hệ dependency và file thuộc package nào. Trộn repository hoặc cài package không phù hợp bản phân phối có thể làm dependency không nhất quán.

Trước khi cài, xem package đến từ repository nào và script cài đặt có tác động gì. Khi gỡ, cấu hình người dùng có thể được giữ lại; trạng thái thực tế phụ thuộc công cụ và tùy chọn.

## Dynamic linker

Executable ELF có thể tham chiếu thư viện động. Dynamic loader đọc metadata và tìm shared object theo cache, cấu hình hệ thống, đường dẫn nhúng hoặc environment như `LD_LIBRARY_PATH` tùy trường hợp. `ldd` thường hữu ích để xem dependency, nhưng không nên chạy tùy tiện trên binary không tin cậy vì cách triển khai có thể thực thi code.

`readelf -d` xem dynamic section; `ldconfig -p` liệt kê cache thư viện; `file` nhận diện định dạng. Lỗi “cannot open shared object” có thể do package thiếu, kiến trúc sai, loader path hoặc cache chưa cập nhật.

## Static và dynamic linking

Static linking gói phần cần thiết vào executable, có thể làm file lớn hơn và giảm một số dependency runtime. Dynamic linking chia sẻ thư viện giữa nhiều chương trình và cho phép cập nhật thư viện chung, nhưng runtime cần đúng loader và ABI. Cập nhật thư viện cần cân nhắc tương thích ứng dụng.

## Tự kiểm tra

**Package manager có chỉ quản lý executable chính?** Không; package thường chứa nhiều file và metadata.

**`LD_LIBRARY_PATH` là cách bền vững tốt nhất để sửa mọi lỗi thư viện?** Không; nó có thể gây nạp nhầm phiên bản và làm môi trường khó tái hiện.

**Static binary luôn hoàn toàn độc lập?** Không nhất thiết; vẫn có thể phụ thuộc kernel, dữ liệu, plugin hoặc cấu hình.

## Đọc tiếp

Quy trình compile và link biến source thành executable theo nhiều giai đoạn có thể kiểm tra riêng.

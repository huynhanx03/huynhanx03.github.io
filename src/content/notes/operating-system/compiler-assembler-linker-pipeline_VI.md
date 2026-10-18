---
title: "Từ source tới executable: compiler, assembler và linker"
category: "Operating System"
tags: ["linux", "build", "compiler", "linker"]
description: "Theo dõi preprocessing, compilation, assembly và linking; nhận diện symbol, object file và lỗi ở từng giai đoạn."
updated: 2026-10-16
translationKey: "operating-system/compiler-assembler-linker-pipeline"
---

Lệnh build thường che nhiều giai đoạn. Source có thể đi qua preprocessor, compiler tạo assembly hoặc object, assembler mã hóa instruction, rồi linker kết hợp object và thư viện thành executable. Biết giai đoạn nào lỗi giúp thu hẹp nguyên nhân.

## Object file và symbol

Object file ELF chứa machine code, section như `.text`/`.data`, symbol table và relocation cần linker hoàn tất. Header có kiến trúc, loại file và metadata. `file`, `readelf -h/-S/-s` xem cấu trúc; `nm` liệt kê symbol.

Compiler có thể tạo object riêng cho từng source file. Linker giải quyết symbol tham chiếu giữa object/library, đặt section và ghi relocation cuối. Undefined reference thường là symbol thiếu hoặc thứ tự/link flags sai; duplicate symbol nghĩa có nhiều định nghĩa xung đột.

Trong Makefile, target mô tả artifact cần tạo còn dependency cho biết file nào phải mới hơn; `make` chỉ chạy lại các bước bị ảnh hưởng theo đồ thị dependency. Các macro quen thuộc gồm `CC`, `CPPFLAGS`, `CFLAGS`, `LDFLAGS` và `LDLIBS`. Recipe thường phải thụt bằng tab trong GNU make. Target `clean` thường xóa output build; target `install` có thể chép file vào các thư mục hệ thống, vì vậy hãy xem trước lệnh bằng `make -n install` và kiểm tra đường dẫn trước khi chạy thật.

## Static và dynamic

Static library thường là archive object được linker lấy phần cần thiết. Shared library được nạp runtime qua dynamic loader. `-L` tìm thư viện lúc link; `-lfoo` chọn tên thư viện; runtime loader path là câu chuyện khác. Thành công khi link không đảm bảo executable tìm được `.so` lúc chạy.

## Reproducibility

Compiler version, flags, environment, generated files và dependency ảnh hưởng binary. Build system như make/ninja chỉ tái chạy các bước theo dependency graph đã khai báo; dependency thiếu có thể tạo build sai khi incremental. Clean build hữu ích để kiểm tra tính đầy đủ nhưng không phải lý do xóa artifacts người dùng tùy tiện.

## Tự kiểm tra

**Assembler và linker làm cùng một việc?** Không.

**`-L` giải quyết runtime shared library?** Không; nó chủ yếu ảnh hưởng linker lúc build.

**Object file đã là executable hoàn chỉnh?** Thường chưa.

## Đọc tiếp

Dynamic loader đọc metadata executable và nạp shared library trước khi chuyển quyền cho chương trình.

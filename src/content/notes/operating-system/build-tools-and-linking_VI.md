---
title: "Build chương trình: compiler, object file và linker"
category: "Operating System"
tags: ["linux", "compiler", "linker", "build"]
description: "Theo source C qua preprocessing, compilation, assembly, linking và cài đặt thư viện/runtime."
updated: 2026-10-16
translationKey: "operating-system/build-tools-and-linking"
---

Source code không được CPU thực thi trực tiếp. Toolchain chuyển source qua nhiều định dạng, giải quyết tham chiếu giữa module và tạo executable theo ABI/định dạng hệ thống.

## Các bước chính

```text
source → preprocess → compile → assemble → object files → link → executable
```

Preprocessor xử lý include/macro trong C; compiler tạo assembly hoặc biểu diễn trung gian; assembler tạo object file với lệnh máy và relocation; linker ghép object, giải quyết symbol và thư viện. Compiler có thể gộp/bỏ bước ở cách gọi thực tế.

Object file thường có code/data chưa biết địa chỉ cuối cùng. Relocation ghi vị trí cần linker/loader điều chỉnh. Static linking đưa phần thư viện vào executable; dynamic linking tham chiếu shared library được loader ánh xạ khi chạy.

## ABI và symbol

Application Binary Interface quy định gọi hàm, cách truyền tham số, layout dữ liệu và tương tác binary ở một nền tảng. Hai module phải tương thích ABI để ghép an toàn. Thay đổi struct public hoặc compiler flags có thể phá ABI dù source nhìn gần giống.

Symbol là tên hàm/biến mà linker giải quyết. Undefined reference thường nghĩa thiếu object/library hoặc thứ tự/link option sai. Shared library version mismatch có thể gây lỗi lúc load/runtime.

## Make và dependency graph

Build system mô tả target phụ thuộc source/header và lệnh tạo output. Make chỉ chạy target khi dependency thay đổi theo timestamp; khai báo thiếu dependency có thể giữ binary cũ dù code đổi. Build sạch giúp chẩn đoán nhưng không thay dependency graph đúng.

Build tái lập cần cố định compiler/tool version, dependency, flags, environment và input. Build cache tăng tốc nhưng key phải tính đủ đầu vào; nếu không, artifact cũ có thể được tái dùng nhầm.

## Package và cài đặt

`make install` có thể ghi file vào prefix hệ thống; package manager theo dõi file và dependency tốt hơn. Cài source thủ công khiến việc gỡ/nâng cấp khó xác định. Trên server, ưu tiên artifact có version và quy trình rollback.

Ưu tiên gói của distribution khi nó đáp ứng nhu cầu: distro thường tích hợp dependency với hệ thống và phát hành bản vá bảo mật theo quy trình của họ. Tự build từ source hữu ích khi cần cấu hình, phiên bản hoặc prefix riêng, nhưng người vận hành phải tự theo dõi cập nhật, provenance, dependency và gỡ bỏ. Tránh thay file package-managed tùy tiện vì lần cập nhật sau có thể ghi đè thay đổi hoặc làm trạng thái hệ thống khó kiểm tra.

Khi build từ source archive, trước hết đọc `README`/`INSTALL` và xem danh sách nội dung archive để biết nó bung vào thư mục nào; không giải nén tùy tiện vào cây source hoặc thư mục dùng chung. Với Autoconf, `./configure --prefix=/opt/app-version` kiểm tra toolchain/dependency và sinh cấu hình build; sau đó build, chạy kiểm tra được cung cấp, rồi xem trước `make -n install`. Prefix riêng giúp giới hạn nơi cài, nhưng vẫn cần ghi nhận file và dependency để nâng cấp/gỡ có kiểm soát. Cài thủ công vào `/usr` có thể ghi đè hoặc xung đột với file do distro quản lý.

Một số dự án cho phép build ngoài source tree để thử nhiều cấu hình mà không làm bẩn thư mục mã nguồn. Khi dependency ở vị trí riêng, `CPPFLAGS` thường dùng cho header (`-I`), `LDFLAGS` cho đường dẫn linker (`-L`), còn `pkg-config --cflags --libs ten-goi` có thể cung cấp flags chuẩn từ metadata `.pc`. Không nhầm `-L` lúc link với đường dẫn runtime của shared library. Nếu `configure` thất bại, `config.log` thường chứa lệnh kiểm tra và lỗi gốc; đọc phần cuối quanh lần kiểm tra thất bại thay vì chỉ dựa vào thông báo tổng quát.

Khi có patch, xem file và đường dẫn bị tác động ở đầu patch rồi áp dụng từ đúng thư mục gốc; lỗi hỏi “File to patch” thường là đang đứng sai chỗ hoặc patch không khớp phiên bản source. Khi build lỗi, tìm lỗi compiler/linker đầu tiên: các dòng `make ... Error` phía sau thường chỉ là lỗi dây chuyền. Thiếu header có thể cần development package hoặc `CPPFLAGS=-I...`; thiếu symbol khi link thường cần object/library phù hợp, chứ không phải sửa runtime loader.

Môi trường ảo cấp ngôn ngữ như Python `venv` giải quyết xung đột package của một ứng dụng bằng interpreter/package directory riêng và thường được kích hoạt bằng cách sửa `PATH` trong shell hiện tại. Nó không tạo kernel hay cô lập process như container, cũng không phải máy ảo hypervisor. Chọn lớp phù hợp: venv cho dependency Python, container cho môi trường process/filesystem/network dùng chung kernel, VM khi cần guest OS/kernel riêng.

## Tóm tắt

- Toolchain biến source thành object/executable qua nhiều bước.
- Linker giải quyết symbol và relocation; loader xử lý executable/shared library lúc chạy.
- ABI quyết định binary compatibility bên ngoài cú pháp source.
- Build graph chính xác và dependency pinning hỗ trợ build đáng tin cậy.
- Package manager giúp theo dõi cài đặt và gỡ bỏ hơn thao tác thủ công.

## Tự kiểm tra

**Compiler luôn tạo executable hoàn chỉnh từ một file source?** Không; thường cần linker ghép object/dependency.

**Build sạch sửa được dependency bị khai báo thiếu?** Nó có thể che lỗi tạm thời, nhưng graph vẫn sai.

**Cùng source luôn cho binary giống byte-by-byte?** Không nếu compiler, flags, timestamps, environment hoặc dependency khác.

## Đọc tiếp

Linux user space còn có desktop session, D-Bus và hệ thống in; chúng là các dịch vụ phối hợp chứ không nằm trong kernel.

---
title: "Kiến trúc 64-bit: register, pointer và giới hạn địa chỉ"
category: "Operating System"
tags: ["computer architecture", "64-bit", "memory", "abi"]
description: "Phân biệt độ rộng register với địa chỉ vật lý, theo dõi ABI và các hệ quả bộ nhớ của con trỏ lớn."
updated: 2026-10-16
translationKey: "operating-system/64-bit-architecture-and-addressing"
---

“CPU 64-bit” thường nói ISA có register/instruction semantics rộng hơn 32 bit, nhưng không có nghĩa mọi pointer dùng đủ 64 bit địa chỉ vật lý. CPU có thể implement virtual/physical address width nhỏ hơn độ rộng register; OS, ABI và page table đặt giới hạn khác nhau.

## Address width và address space

Không gian địa chỉ lý thuyết 64-bit có `2^64` địa chỉ byte, nhưng hardware/OS thường chỉ triển khai một số bit canonical/usable. Virtual address layout có user/kernel range, ASLR gap và guard region. Physical RAM tối đa cũng do platform/CPU giới hạn riêng.

## Không phải mọi thứ đều rộng gấp đôi

64-bit chủ yếu mở rộng số nguyên tổng quát và khả năng biểu diễn địa chỉ. Instruction encoding không tự nhiên dài gấp đôi; chương trình vẫn có thể trộn toán hạng 8/16/32/64-bit, còn FPU và vector register có quy tắc độ rộng riêng. Địa chỉ ảo và vật lý thực sự được CPU hỗ trợ cũng có thể hẹp hơn register 64-bit. Vì thế cần hỏi riêng: register nào rộng bao nhiêu, instruction dùng kiểu toán hạng nào, và phần cứng/OS triển khai bao nhiêu bit địa chỉ.

Một điểm lịch sử quan trọng là x86-64 mở rộng ISA x86, thêm register tổng quát và chế độ 64-bit trong khi vẫn cho OS 64-bit chạy nhiều ứng dụng x86 cũ ở compatibility mode. IA-64/Itanium là ISA riêng, nên chạy phần mềm x86 cũ cần cơ chế tương thích khác. Khả năng giữ phần mềm hiện có là một yếu tố lớn trong việc mở rộng ISA; mode và chi tiết tương thích cụ thể phụ thuộc kiến trúc/OS.

## ABI và data model

64-bit ABI quyết định kích thước pointer, `long`, alignment, calling convention và struct layout. LP64 và LLP64 là hai mô hình phổ biến khác nhau; binary compatibility phụ thuộc ABI, không chỉ ISA. Serialize struct raw giữa máy/ABI khác nhau không an toàn.

## Trade-off bộ nhớ

Pointer rộng hơn có thể làm cấu trúc chứa nhiều pointer lớn hơn, tăng lượng dữ liệu chiếm cache và băng thông bộ nhớ cần dùng. Đổi lại, process có không gian địa chỉ lớn hơn và có thể thao tác với dữ liệu lớn hơn. Compiler có thể tối ưu cách bố trí, nhưng thiết kế cấu trúc dữ liệu vẫn ảnh hưởng đáng kể.

## Tóm tắt

- 64-bit register width không đồng nghĩa 64-bit physical address đầy đủ.
- Virtual và physical address width là giới hạn khác nhau.
- ABI quyết định pointer/data layout và calling convention.
- Pointer rộng tăng addressability nhưng có thể tăng memory footprint.
- Binary/file format phải định nghĩa width/endian rõ để portable.

## Tự kiểm tra

**CPU 64-bit có thể có physical address width <64?** Có.

**Mọi pointer 64-bit process dùng hết bit?** Không; canonical/user layout giới hạn.

**Cùng ISA 64-bit nghĩa binary ABI tương thích?** Không chắc.

## Đọc tiếp

Vì sao nhiều thế hệ CPU vẫn giữ binary cũ chạy được? Xem bài [Tiến hóa kiến trúc CPU](/vi/notes/operating-system/cpu-architecture-evolution/).

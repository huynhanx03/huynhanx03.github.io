---
title: "Assembly, addressing mode và lời gọi hàm"
category: "Operating System"
tags: ["computer architecture", "assembly", "abi", "stack"]
description: "Đọc lệnh assembly, phân biệt addressing mode và theo dõi register/stack qua một lời gọi hàm."
updated: 2026-10-16
translationKey: "operating-system/assembly-addressing-and-calls"
---

Assembly là cách viết dễ đọc hơn của lệnh máy, nhưng vẫn gắn với một ISA cụ thể. `mov`, `add`, `load` hay `branch` không có cùng cú pháp và semantics trên mọi kiến trúc. Compiler thường sinh assembly trước hoặc qua intermediate representation rồi mới mã hóa thành bytes.

## Addressing mode

Lệnh có thể lấy toán hạng từ immediate constant, register, địa chỉ bộ nhớ trực tiếp hoặc địa chỉ tính từ base/index/offset. Ví dụ giả mã `load r1, [r2 + 8]` đọc dữ liệu ở địa chỉ `r2+8`; một ISA có thể dùng cú pháp khác hoặc giới hạn kiểu truy cập.

Addressing mode ảnh hưởng số lệnh, khả năng biểu đạt và độ phức tạp giải mã. Lệnh có nhiều dạng không đồng nghĩa chương trình thực thi nhanh hơn; vi kiến trúc quyết định cách giải mã/dispatch.

## Lời gọi hàm là hợp đồng ABI

Khi gọi hàm, caller và callee cần thống nhất nơi đặt argument/result, register nào phải giữ, register nào có thể bị ghi đè, cách căn stack và cách quay về. ABI định nghĩa quy ước này.

Một prologue/epilogue khái niệm có thể lưu register cần thiết, tạo stack frame, cấp local space rồi phục hồi trước return. Compiler tối ưu có thể bỏ frame pointer, giữ dữ liệu trong register hoặc inline hàm; không phải hàm nào cũng tạo frame theo sơ đồ giáo khoa.

## Stack frame và đệ quy

Mỗi lời gọi chưa hoàn tất cần đủ trạng thái để tiếp tục sau return. Đệ quy tạo nhiều activation record, thường trên stack của thread. Độ sâu lớn hoặc frame lớn có thể làm cạn stack; tail-call optimization có thể giảm frame trong điều kiện compiler/ABI cho phép, không được giả định mọi ngôn ngữ đều thực hiện.

Pointer tới local variable chỉ hợp lệ trong vòng đời phù hợp của nó. Ngôn ngữ/compile model quyết định có escape/heap allocation hay lỗi dangling pointer.

## Từ assembly tới process

Executable chứa code, data và metadata loader dùng để map section, resolve dynamic library và thiết lập entry point. Loader không nhất thiết nạp toàn bộ file ngay; paging demand có thể đưa page vào khi chạm.

## Tóm tắt

- Assembly là notation cho ISA, không độc lập kiến trúc.
- Addressing mode quy định toán hạng được lấy ở đâu.
- ABI điều phối register, argument, result và stack giữa hàm.
- Stack frame là mô hình cho trạng thái lời gọi; compiler có thể tối ưu khác.
- Loader map executable vào process; page có thể nạp theo nhu cầu.

## Tự kiểm tra

**Mọi lời gọi hàm luôn đẩy toàn bộ biến local lên stack?** Không; register/inlining/optimization thay đổi.

**Cùng mnemonic `add` luôn có cùng encoding?** Không; ISA và operand form quyết định.

**Executable được đọc toàn bộ vào RAM trước khi chạy?** Không nhất thiết; loader có thể demand-page.

## Đọc tiếp

CPU thực hiện nhiều lệnh qua pipeline; để duy trì throughput, các thiết kế hiện đại dùng superscalar và dynamic scheduling.

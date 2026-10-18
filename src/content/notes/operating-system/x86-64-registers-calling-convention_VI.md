---
title: "x86-64 register, stack và calling convention"
category: "Operating System"
tags: ["computer-architecture", "x86-64", "assembly"]
description: "Đọc register và stack trong lời gọi hàm x86-64, phân biệt quy ước gọi với tập lệnh CPU."
updated: 2026-10-16
translationKey: "operating-system/x86-64-registers-calling-convention"
---

Instruction set định nghĩa các thao tác CPU có thể thực hiện; calling convention là thỏa thuận phần mềm về cách truyền tham số, giữ register và trả kết quả. Cùng một ISA có thể dùng ABI khác nhau tùy hệ điều hành và nền tảng.

## Register và stack frame

x86-64 có general-purpose registers 64-bit như RAX, RBX, RCX, RDX, RSI, RDI, RSP và RBP, cùng nhiều register khác. RSP trỏ vùng stack hiện tại; stack thường phát triển về địa chỉ thấp hơn. Compiler có thể dùng RBP làm frame pointer hoặc dùng register đó cho mục đích khác khi tối ưu.

Stack frame có thể giữ return address, local data và register cần lưu, nhưng tối ưu compiler có thể bỏ frame pointer hoặc giữ biến trong register. Vì vậy assembly thực tế không nhất thiết khớp sơ đồ giáo khoa từng biến một.

## ABI và hàm

Calling convention quy định register nào truyền tham số/return value, register nào caller-saved hay callee-saved, căn chỉnh stack và cách xử lý variadic function. System V AMD64 ABI (Linux/macOS phổ biến) và Windows x64 ABI khác nhau ở register tham số, shadow space và một số quy tắc khác.

Caller-saved register có thể bị hàm gọi ghi đè; caller phải lưu nếu còn cần giá trị. Callee-saved register phải được hàm khôi phục trước khi trả về. Tuân ABI cho phép object code từ compiler/thư viện khác nhau gọi lẫn nhau.

## System call khác function call

Function call thường đổi instruction pointer trong cùng privilege level. System call đi qua cơ chế kiến trúc để vào kernel mode; kernel ABI quy định register chứa syscall number/arguments và cách báo lỗi. Đừng nhầm convention gọi hàm userspace với convention syscall.

## Tự kiểm tra

**Tập lệnh CPU định nghĩa register tham số cho mọi ngôn ngữ?** Không; ABI/calling convention quy định cách dùng.

**RBP luôn là frame pointer?** Không.

**System call chỉ là function call tới một địa chỉ?** Không; nó chuyển privilege qua cơ chế CPU được kiểm soát.

## Đọc tiếp

Định dạng instruction, addressing mode và cách biểu diễn dữ liệu giúp đọc assembly cụ thể hơn.

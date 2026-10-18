---
title: "Bit, byte và cách CPU biểu diễn số nguyên"
category: "Operating System"
tags: ["computer architecture", "binary", "integer representation"]
description: "Từ bit và hệ hexadecimal tới số không dấu, bù hai, tràn số và endianness."
updated: 2026-10-16
translationKey: "operating-system/binary-data-and-integer-representation"
---

CPU lưu dữ liệu dưới dạng bit. Một bit có hai trạng thái được diễn giải là 0 hoặc 1; nhóm 8 bit thường gọi là byte. Từ các bit, kiến trúc định nghĩa cách biểu diễn số, ký tự, địa chỉ và lệnh. Cùng một dãy bit có thể mang ý nghĩa khác tùy instruction và kiểu dữ liệu.

## Nhị phân và hexadecimal

Trong hệ nhị phân, mỗi vị trí có trọng số lũy thừa của 2. `1011₂ = 8 + 0 + 2 + 1 = 11₁₀`. Hexadecimal dùng cơ số 16; một chữ số hex tương ứng đúng 4 bit, nên dễ đọc dump bộ nhớ: `0x2F` = `0010 1111₂` = 47.

Địa chỉ thường được in ở dạng hex vì ngắn gọn. Prefix `0x` là cách ghi phổ biến chứ không phải một giá trị đặc biệt trong CPU.

## Số nguyên không dấu và bù hai

Với n bit unsigned, biểu diễn từ 0 tới `2^n - 1`. N bit không thể biểu diễn mọi số nguyên; cộng quá giới hạn có thể wrap theo semantics phần cứng/ngôn ngữ hoặc bị kiểm tra/undefined tùy ngôn ngữ.

Signed integer phổ biến dùng **two's complement**. Với n bit, phạm vi thường `-2^(n-1)` tới `2^(n-1)-1`. Bit cao nhất góp phần giá trị âm; số âm được tạo bằng đảo bit rồi cộng 1. Ví dụ 8-bit: `-1` là `11111111`, `-2` là `11111110`.

Phép cộng phần cứng có thể giống nhau cho signed và unsigned; cách diễn giải cờ overflow và semantics ngôn ngữ khác nhau. Signed overflow trong C không được phép suy luận theo wrap đơn giản nếu chuẩn coi hành vi đó undefined.

## Tràn số

Với 8-bit unsigned, `255 + 1` wrap thành 0 trong modulo 256. Với signed 8-bit, cộng `127 + 1` không thể biểu diễn trong phạm vi. CPU có thể đặt flag overflow; compiler/ngôn ngữ quyết định cách chương trình được phép quan sát.

Khi tính allocation size, offset hoặc packet length, overflow có thể biến số lớn thành số nhỏ rồi dẫn tới buffer quá ngắn. Kiểm tra giới hạn trước phép nhân/cộng khi dữ liệu đến từ input.

## Endianness

Endian mô tả thứ tự byte của số nhiều byte trong bộ nhớ. Big-endian đặt byte cao trước; little-endian đặt byte thấp trước. Một số giao thức mạng quy định network byte order riêng; code cần chuyển đổi thay vì đọc struct theo endian host một cách mù.

Endianness không thay thứ tự bit bên trong mọi phép tính CPU. Nó là quy tắc tổ chức byte trong một giá trị đa byte.

## Tóm tắt

- Hex biểu diễn gọn các nhóm 4 bit.
- N bit chỉ biểu diễn được một miền hữu hạn; signed/unsigned có miền khác.
- Two's complement là cách biểu diễn signed phổ biến.
- Tràn số có semantics phần cứng và ngôn ngữ khác nhau; có thể gây lỗi bảo mật.
- Endianness quyết định thứ tự byte trong memory/protocol.

## Tự kiểm tra

**`0xFF` luôn là -1?** Không; còn phụ thuộc độ rộng và diễn giải signed/unsigned.

**Signed overflow trong mọi ngôn ngữ đều wrap?** Không.

**Little-endian nghĩa CPU xử lý bit từ phải sang trái?** Không; nó nói thứ tự byte trong memory.

## Đọc tiếp

Lệnh máy thao tác với các biểu diễn này qua addressing mode và thanh ghi.

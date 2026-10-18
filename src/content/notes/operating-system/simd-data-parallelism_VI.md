---
title: "SIMD: cùng một lệnh trên nhiều phần tử dữ liệu"
category: "Operating System"
tags: ["cpu", "simd", "vectorization", "parallelism"]
description: "Hiểu vector register/lane, điều kiện compiler vectorize và giới hạn bởi alignment, dependency, bandwidth."
updated: 2026-10-16
translationKey: "operating-system/simd-data-parallelism"
---

SIMD (Single Instruction, Multiple Data) áp dụng một phép toán lên nhiều lane dữ liệu trong vector register. Thay vì cộng từng phần tử qua nhiều lệnh scalar, CPU có thể cộng nhiều cặp cùng lúc nếu dữ liệu và dependency phù hợp.

## Vector lane

Vector 256-bit có thể chứa 8 số float 32-bit; một phép add vector thực hiện 8 phép cộng lane theo ISA đó. Đây là ví dụ dung lượng register, không bảo đảm throughput mỗi chu kỳ hoặc tốc độ ứng dụng tăng đúng 8 lần.

## Vectorization

Compiler có thể vectorize loop khi iteration độc lập, pointer aliasing không phá dependency, alignment/stride phù hợp và remainder xử lý được. Conditional branching trong loop có thể dùng mask hoặc làm vectorization khó.

## Phép toán trong lane và giữa lane

Vector register là các lane được đóng gói trong một vùng bit rộng cố định. Ví dụ vector 128-bit có thể biểu diễn 16 số nguyên 8-bit, 8 số nguyên 16-bit hoặc 4 giá trị 32-bit; ISA quy định kiểu lane và phép toán. Phép toán **theo từng lane** cộng/so sánh/logic các phần tử tương ứng giữa hai vector. Phép toán **giảm** gộp nhiều lane thành một kết quả, còn **permute/shuffle** đổi vị trí hoặc chọn lane từ vector đầu vào theo mask/control vector. Các nhóm này có chi phí và hỗ trợ ISA khác nhau.

Một lưu ý lịch sử từ sách: AltiVec/VMX của PowerPC có lệnh permute nhận vector điều khiển riêng, trong khi SSE đời đầu dùng định dạng toán hạng khác. Đây là ví dụ về cách thiết kế ISA tạo thuận lợi hoặc thêm bước cho compiler; không suy ra rằng mọi ISA hay extension hiện nay có cùng giới hạn.

## Giới hạn

- Memory bandwidth hoặc cache miss có thể là bottleneck.
- Dependency chain ngăn xử lý lane song song.
- Unaligned/irregular data giảm hiệu quả tùy ISA.
- CPU feature extension khác nhau; binary cần runtime dispatch để chạy đa nền tảng.
- Tần số CPU có thể giảm dưới vector-heavy workload do power/thermal policy.

## Tóm tắt

- SIMD xử lý nhiều lane dữ liệu dưới một instruction.
- Vector width không bằng speedup end-to-end.
- Compiler cần dependency/aliasing/layout phù hợp.
- Memory bandwidth và power limit có thể giới hạn lợi ích.
- Portable code cần dispatch feature hoặc thư viện abstraction.

## Tự kiểm tra

**256-bit vector luôn làm loop nhanh gấp 8 lần?** Không.

**Mọi CPU x86 hỗ trợ cùng AVX extension?** Không; feature cần kiểm tra.

**SIMD là multicore parallelism?** Không; đó là data parallelism trong execution unit của CPU.

## Đọc tiếp

Đo performance cùng benchmark workload để biết SIMD thực sự có lợi không.

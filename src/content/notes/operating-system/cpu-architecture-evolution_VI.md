---
title: "Tiến hóa kiến trúc CPU: ISA, tương thích và vi kiến trúc"
category: "Operating System"
tags: ["cpu", "isa", "microarchitecture", "compatibility"]
description: "Phân biệt kiến trúc tập lệnh với thế hệ CPU, hiểu CISC/RISC, compatibility và lý do benchmark cần thực tế."
updated: 2026-10-16
translationKey: "operating-system/cpu-architecture-evolution"
---

CPU qua nhiều thế hệ thường giữ tương thích phần mềm nhưng thay đổi sâu ở bên trong. Một ISA có thể tồn tại lâu, trong khi vi kiến trúc bổ sung pipeline, cache, dự đoán nhánh, thực thi ngoài thứ tự và SIMD.

## Power wall và sự dịch chuyển từ xung nhịp sang song song

Tăng xung nhịp làm transistor chuyển trạng thái thường xuyên hơn; tăng mật độ transistor cũng có thể làm công suất trên mỗi diện tích tăng. Ngoài công suất động khi mạch chuyển trạng thái, transistor còn rò điện khi nhàn rỗi, tạo công suất tĩnh. Nhiệt và giới hạn điện năng khiến cách tăng hiệu năng chủ yếu bằng xung nhịp ngày càng khó mở rộng. Vì vậy CPU hiện đại kết hợp nhiều hướng: giảm công việc thừa, cải thiện IPC/ILP, quản lý điện năng và dùng nhiều lõi khi phần mềm có thể song song. Không có một hướng nào tự động tăng tốc mọi workload.

**Multi-core** đặt nhiều core trên cùng chip; hệ điều hành nhìn thấy các đơn vị thực thi có thể chạy các thread khác nhau đồng thời. Các core có thể có cache riêng, cache dùng chung hoặc tổ hợp cả hai. Cache dùng chung có thể giúp trao đổi dữ liệu và chia sẻ working set, nhưng đồng thời tạo tranh chấp băng thông/capacity; cache riêng giảm tranh chấp trực tiếp nhưng cần coherence khi chia sẻ dữ liệu. Nhiều core chỉ tăng thông lượng nếu có đủ công việc song song và phần mềm đồng bộ đúng.

Trong tài liệu CPU, phân biệt **ISA**, **microarchitecture** và **implementation/product**: ISA là hợp đồng lệnh mà phần mềm nhìn thấy; microarchitecture là cách core thực hiện hợp đồng đó; một product cụ thể chọn cấu hình cache, số core, tần số và các thành phần khác. Cùng một ISA có thể có nhiều microarchitecture, và cùng một họ microarchitecture có thể có nhiều implementation. Các tên và sơ đồ Pentium M/Core Duo/Core 2 trong sách là case study lịch sử, không phải mô tả các CPU hiện nay.

## CISC và RISC là xu hướng lịch sử

CISC thường gắn với tập lệnh phong phú và encoding/operand phức tạp; RISC nhấn mạnh dạng lệnh đơn giản, register nhiều và load/store architecture. Nhưng CPU hiện đại làm mờ đối lập: x86 có thể decode lệnh phức tạp thành micro-ops; ARM/RISC-V cũng có extension và pipeline phức tạp.

Nhãn CISC/RISC không dự đoán trực tiếp hiệu năng, điện năng hay độ dễ lập trình. Cần xem compiler, vi kiến trúc và workload.

## Tương thích và ABI

Giữ ISA/ABI tương thích cho phép binary cũ chạy trên CPU mới trong giới hạn. CPU mới có thể thêm extension mà chương trình cần feature detection trước khi dùng. ABI khác OS/format executable có thể ngăn binary chạy dù ISA tương thích.

Emulation/translation cho phép chạy code ISA khác, đổi lại overhead và giới hạn tương thích. Virtualization thường chạy guest cùng ISA trực tiếp qua hypervisor; emulation toàn hệ thống rộng hơn.

## SIMD và data parallelism

SIMD thực hiện cùng thao tác trên nhiều lane dữ liệu, phù hợp vector/matrix/audio/image workloads. Compiler có thể vectorize loop nếu aliasing/dependency cho phép. SIMD width và instruction extension khác theo CPU; binary portable cần dispatch phù hợp.

## Vì sao benchmark phải nêu môi trường

Kết quả phụ thuộc CPU model, memory, compiler, flags, OS scheduler, nhiệt độ, power policy và dữ liệu. Xung nhịp boost không cố định; thermal/power limit làm tần số thay đổi. Benchmark micro không đại diện toàn ứng dụng.

## Tóm tắt

- ISA ổn định có thể được nhiều vi kiến trúc triển khai khác nhau.
- CISC/RISC là cách nhìn lịch sử, không đủ dự đoán CPU hiện đại.
- ISA compatibility khác ABI, OS ABI và executable format.
- SIMD khai thác song song dữ liệu nhưng cần feature compatibility.
- Benchmark phải ghi nền tảng và workload.

## Tự kiểm tra

**Binary x86 chạy được trên mọi OS x86?** Không; ABI, loader, library và privilege environment cũng cần phù hợp.

**RISC luôn nhanh hơn CISC?** Không; tên ISA không quyết định hiệu năng thực tế.

**SIMD làm mọi vòng lặp nhanh gấp vector width?** Không; dependency, memory và remainder giới hạn.

## Đọc tiếp

Các quan sát về CPU sẽ quay lại trong Processes & Scheduling và Virtualization.

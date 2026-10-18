---
title: "Lập lịch đa lõi: affinity, cân bằng tải và locality"
category: "Operating System"
tags: ["scheduling", "multiprocessor", "cpu affinity"]
description: "Tìm hiểu thách thức khi scheduler phân phối task lên nhiều lõi và giữ dữ liệu gần nơi đang chạy."
updated: 2026-10-17
translationKey: "operating-system/multiprocessor-scheduling"
---

Trên máy nhiều lõi, scheduler không chỉ hỏi “task nào chạy tiếp?” mà còn “task đó nên chạy trên lõi nào?”. Một lựa chọn có thể cân bằng tải nhưng làm mất cache locality; một lựa chọn giữ task trên cùng lõi có thể khiến lõi khác rảnh trong khi hàng đợi nơi đó quá tải.

## Global queue và per-CPU queue

Một hàng đợi toàn cục giúp mọi CPU lấy task từ cùng nơi, nhưng cần đồng bộ trên cấu trúc chung và có thể gây contention. Hàng đợi riêng mỗi CPU giảm tranh chấp, song task có thể bị dồn lệch nếu tải thay đổi.

Scheduler hiện đại thường kết hợp hàng đợi cục bộ với cân bằng tải định kỳ hoặc khi cần. Chi tiết và thuật toán phụ thuộc hệ điều hành, cấu hình topology và phiên bản kernel.

Một cách phân phối lại tải là **work stealing**: CPU/queue đang ít việc thỉnh thoảng kiểm tra queue khác và lấy một số task khi chênh lệch đủ lớn. Kiểm tra quá thường xuyên làm tăng đồng bộ và chi phí tìm kiếm; quá thưa để tải mất cân bằng lâu hơn. Migration vì thế là quyết định đánh đổi giữa tận dụng CPU và giữ cache/NUMA locality, không chỉ là “chuyển task sang lõi rảnh”.

## CPU affinity và cache locality

Task vừa chạy trên CPU 0 có thể đã để dữ liệu của nó trong cache gần CPU 0. Nếu chuyển sang CPU 1, một phần dữ liệu phải được nạp hoặc cache coherence phải trao đổi nội dung. **CPU affinity** là tập CPU mà task được phép chạy; affinity có thể hạn chế migration.

Pin task vào một lõi đôi khi có ích cho workload nhạy locality, nhưng có thể gây tải lệch và làm scheduler mất linh hoạt. Chỉ dùng affinity khi đo cho thấy vấn đề và hiểu cấu hình NUMA/cache của máy.

## NUMA và vị trí bộ nhớ

Ở hệ NUMA, mỗi socket có vùng RAM gần hơn về độ trễ so với RAM trên socket khác. Task chạy ở một node nhưng đọc phần lớn bộ nhớ thuộc node xa có thể chịu chi phí truy cập cao. Scheduler và allocator cố gắng giữ CPU với bộ nhớ gần nhau, nhưng việc di chuyển process hoặc dữ liệu có thể phá locality.

NUMA locality khác cache locality: một bên là vị trí RAM tương đối giữa node, một bên là bản sao dữ liệu trong cache. Cả hai đều có thể ảnh hưởng hiệu năng trên workload lớn.

## Load balancing và fairness

Khi một CPU có nhiều task ready còn CPU khác rảnh, kernel có thể migrate task. Migration giúp dùng thêm lõi nhưng cũng phát sinh chi phí lập lịch và mất locality. Scheduler phải cân bằng giữa tải, ưu tiên, affinity và nhóm tài nguyên.

Task có nhiều thread runnable đôi khi nhận tổng CPU time nhiều hơn task chỉ có một thread, tùy chính sách scheduler. Cgroup, priority và cách scheduler tính fairness đều ảnh hưởng. Thêm lõi không làm throughput tăng tuyến tính nếu các thread cùng chờ lock, memory bandwidth hoặc một phần tuần tự; dùng định luật Amdahl và profiling để tìm giới hạn.

## Tóm tắt

- Lập lịch đa lõi bao gồm chọn task và chọn CPU.
- Hàng đợi toàn cục giảm lệch tải nhưng tăng tranh chấp; hàng đợi cục bộ cần cân bằng.
- Affinity giữ locality nhưng quá chặt có thể làm tải mất cân bằng.
- NUMA khiến vị trí bộ nhớ tương đối với CPU quan trọng.
- Task nhiều thread có thể nhận phần CPU khác task ít thread tùy scheduler và resource control.
- Thêm lõi không giúp tuyến tính khi workload bị giới hạn bởi lock, băng thông hoặc phần tuần tự.

## Tự kiểm tra

**Pin mọi worker vào một lõi có đảm bảo nhanh hơn?** Không; có thể tạo nghẽn và bỏ phí lõi khác.

**Task migrate CPU chỉ mất thời gian đổi PC?** Không; cache và locality bộ nhớ cũng có thể bị ảnh hưởng.

**Máy có 8 lõi chạy chương trình nhanh gấp 8 lần?** Chỉ trong điều kiện lý tưởng về song song và tài nguyên; thường không đạt.

## Đọc tiếp

Topic **Concurrency & Synchronization** sẽ giải thích vì sao nhiều thread cùng chạy lại phải chờ lock hoặc dữ liệu chung.

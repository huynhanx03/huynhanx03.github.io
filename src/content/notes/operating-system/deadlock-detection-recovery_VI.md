---
title: "Phát hiện và phục hồi deadlock"
category: "Operating System"
tags: ["concurrency", "deadlock", "resource"]
description: "Khi hệ thống không ngăn deadlock từ đầu, có thể phát hiện chu trình và chọn cách phục hồi với chi phí được kiểm soát."
updated: 2026-10-16
translationKey: "operating-system/deadlock-detection-recovery"
---

Deadlock xảy ra khi một tập process/thread chờ tài nguyên theo chu trình và không thành viên nào có thể tiến tới nhả tài nguyên. Nếu hệ thống không áp dụng prevention/avoidance, có thể định kỳ tìm chu trình rồi phục hồi.

## Phát hiện

Với một instance mỗi loại tài nguyên, wait-for graph có chu trình thì có deadlock. Với nhiều instance, cần thuật toán xét available resources, allocation và request; chu trình đơn giản chưa đủ kết luận.

Trong ứng dụng, lock graph có thể được instrument để phát hiện thứ tự khóa đảo ngược. Production system có thể quan sát thread dump và trạng thái futex/lock, nhưng một snapshot không luôn chứng minh deadlock: thread có thể đang chờ tiến trình I/O hợp lệ.

## Phục hồi

Có thể hủy một task, rollback transaction, preempt tài nguyên hoặc restart một service. Chọn nạn nhân dựa trên độ ưu tiên, công việc đã hoàn thành, khả năng rollback và tác động dữ liệu. Preemption không khả thi với mọi tài nguyên; hủy thread đang giữ mutex có thể để dữ liệu ở trạng thái hỏng.

Timeout giúp phát hiện chờ lâu nhưng không tự giải quyết consistency. Cần cleanup handler, transaction boundary hoặc supervisor có thể restart an toàn.

## Tự kiểm tra

**Timeout nghĩa là deadlock chắc chắn?** Không; có thể chỉ là thao tác chậm.

**Hủy một thread đang giữ lock luôn an toàn?** Không.

**Cycle trong đồ thị luôn chứng minh deadlock với nhiều instance mỗi loại resource?** Không đơn giản như trường hợp một instance.

## Đọc tiếp

Prevention thường phá một điều kiện cần của deadlock bằng thứ tự lock hoặc quy tắc cấp phát.

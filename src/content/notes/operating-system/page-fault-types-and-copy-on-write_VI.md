---
title: "Page fault: demand-zero, file-backed và copy-on-write"
category: "Operating System"
tags: ["operating-system", "memory", "page-fault"]
description: "Phân biệt page fault hợp lệ với lỗi bảo vệ, và theo dõi xử lý demand-zero, file mapping cùng COW."
updated: 2026-10-16
translationKey: "operating-system/page-fault-types-and-copy-on-write"
---

Page fault là exception khi translation không thể hoàn tất theo page table hiện tại. Nó không tự nói trang “không có trong RAM” hay chương trình sai; kernel phải xem địa chỉ, quyền truy cập và mapping để quyết định hành động.

## Các đường xử lý phổ biến

- **Demand-zero:** địa chỉ thuộc vùng hợp lệ nhưng chưa có trang riêng. Kernel cấp trang zeroed (hoặc dùng zero page cho đọc) và cập nhật mapping.
- **File-backed:** trang thuộc mapping file nhưng chưa resident. Kernel đọc từ page cache/storage, có thể chặn thread chờ I/O.
- **Copy-on-write:** trang được chia sẻ read-only. Khi ghi, kernel cấp/copy trang riêng rồi đổi mapping và quyền.
- **Protection fault:** truy cập ngoài vùng hoặc vi phạm quyền (ví dụ ghi trang read-only không phải COW); kernel có thể gửi signal như `SIGSEGV`.

## Chi phí

Minor fault được xử lý mà không cần đọc từ thiết bị lưu trữ, chẳng hạn page đã có trong page cache hoặc kernel chỉ cần cấp trang và cập nhật mapping. Major fault cần chờ I/O từ storage và thường đắt hơn nhiều. Cách phân loại chi tiết phụ thuộc hệ điều hành; fault rate cao có thể đến từ working set lớn, memory pressure, mẫu truy cập mapping hoặc một ứng dụng mới khởi động.

## Tự kiểm tra

**Mỗi page fault đều cần đọc đĩa?** Không.

**COW ghi vào trang chia sẻ luôn báo segmentation fault?** Không; kernel có thể cấp bản riêng.

**Fault trên địa chỉ hợp lệ chắc chắn major?** Không.

## Đọc tiếp

Swap và reclaim xử lý pressure khi số trang resident vượt RAM khả dụng.

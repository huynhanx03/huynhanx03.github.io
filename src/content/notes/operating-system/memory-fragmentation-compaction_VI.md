---
title: "Memory fragmentation, compaction và huge pages"
category: "Operating System"
tags: ["operating-system", "memory", "linux"]
description: "Phân biệt fragmentation vùng nhớ user/kernel, hiểu compaction gom trang vật lý và trade-off của huge pages."
sources:
  - title: "Transparent Hugepage Support"
    url: "https://docs.kernel.org/admin-guide/mm/transhuge.html"
  - title: "Memory Management APIs — Page mobility and placement hints"
    url: "https://docs.kernel.org/core-api/mm-api.html"
updated: 2026-10-16
translationKey: "operating-system/memory-fragmentation-compaction"
---

Fragmentation xảy ra khi vùng trống bị chia thành nhiều mảnh, khiến cấp phát liên tục lớn khó dù tổng dung lượng trống đủ. Ở userspace allocator, fragmentation làm heap giữ nhiều trang dù ứng dụng không dùng hết. Ở physical memory, kernel có thể thiếu dải trang liên tục cho một số DMA/huge-page request.

## Compaction

Kernel compaction di chuyển trang có thể di chuyển để tạo vùng liên tục. Di chuyển tốn CPU, cần phối hợp mapping và không phải mọi trang đều movable. Reclaim giải phóng trang; compaction sắp xếp lại trang—hai cơ chế khác nhau nhưng có thể phối hợp.

## Huge pages

Huge page dùng mapping lớn hơn page cơ sở, giảm số TLB entry cần cho vùng memory lớn. Nhưng cấp phát khối lớn khó hơn, memory waste có thể tăng; khi copy-on-write, kernel có thể phải sao chép page lớn hoặc tách mapping thành page nhỏ trước, tùy loại page và tình huống. Việc gom/di chuyển page để tạo huge page cũng có thể gây latency. Transparent Huge Pages (THP) cho kernel tự promotion/demotion theo policy; hugetlb page thường cần cấu hình và quản lý rõ hơn.

## Chẩn đoán

`/proc/buddyinfo`, `vmstat`, THP counters và PSI có thể giúp phân tích; số liệu phụ thuộc kernel. Không suy ra fragmentation chỉ từ RAM còn ít. Đo latency và workload trước khi bật/tắt THP hoặc reserve huge page.

## Tự kiểm tra

**Reclaim và compaction giống nhau?** Không.

**Huge page luôn giảm bộ nhớ dùng?** Không.

**Tổng RAM trống đủ nghĩa cấp phát contiguous lớn chắc chắn thành công?** Không.

## Đọc tiếp

NUMA placement quyết định node nào cung cấp page và locality của CPU tới vùng nhớ.

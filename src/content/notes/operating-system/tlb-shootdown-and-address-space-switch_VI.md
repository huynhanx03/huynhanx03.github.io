---
title: "TLB shootdown và chuyển address space"
category: "Operating System"
tags: ["operating-system", "memory", "tlb", "multiprocessor"]
description: "Hiểu vì sao thay đổi page table cần vô hiệu hóa translation cache trên một hay nhiều core."
updated: 2026-10-16
translationKey: "operating-system/tlb-shootdown-and-address-space-switch"
---

TLB cache ánh xạ virtual address sang physical address cùng quyền truy cập. Khi kernel đổi page table, bản dịch cũ trong TLB có thể không còn hợp lệ. Nếu CPU dùng bản cũ, nó có thể truy cập sai trang hoặc bỏ qua quyền mới; vì vậy kernel phải invalidate translation tương ứng.

## Local invalidation và address space

Khi thread chuyển sang address space khác, kiến trúc có thể yêu cầu flush TLB hoặc dùng tag address-space ID để giữ entry của nhiều process mà không nhầm lẫn. ASID/PCID giảm flush toàn bộ, nhưng entry vẫn cần được đồng bộ khi mapping thay đổi.

## Shootdown đa core

Một process có thể chạy trên nhiều core và mỗi core có TLB riêng. Nếu page table được sửa trong lúc core khác giữ entry cũ, kernel cần gửi interrupt/IPI để yêu cầu core đó invalidate. Đây là TLB shootdown. Đồng bộ này có latency và tăng khi mapping bị thay đổi thường xuyên hoặc trên nhiều core.

Unmap page là ví dụ quan trọng: trước khi tái sử dụng physical frame cho dữ liệu khác, kernel phải bảo đảm không core nào tiếp tục truy cập nó qua translation cũ. Batching invalidation có thể giảm chi phí nhưng phải giữ đúng thứ tự và an toàn.

## Hiệu năng và quan sát

Huge pages có thể giảm áp lực TLB cho vùng lớn và liên tục, nhưng tăng granularity, tốn bộ nhớ nếu sử dụng không phù hợp và có thể làm thay đổi reclaim/compaction. Mapping/unmapping hàng loạt có thể gây nhiều shootdown. Tối ưu cần đo workload, TLB miss và chi phí kernel, không chỉ bật huge pages theo mặc định.

## Tự kiểm tra

**Sửa page table tự làm mọi TLB entry trên mọi core biến mất?** Không.

**TLB shootdown liên quan IPI?** Thường có trên hệ đa core để yêu cầu core khác invalidate.

**Huge page luôn nhanh hơn?** Không; lợi ích và chi phí tùy workload.

## Đọc tiếp

Copy-on-write cũng thay đổi quyền mapping và có thể tạo page fault khi process ghi vào trang được chia sẻ.

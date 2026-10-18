---
title: "Page cache, buffered I/O và direct I/O"
category: "Operating System"
tags: ["filesystem", "page cache", "io", "linux"]
description: "Hiểu read/write qua page cache, writeback và lý do O_DIRECT không phải đường tắt luôn nhanh."
updated: 2026-10-16
translationKey: "operating-system/page-cache-buffered-direct-io"
---

Buffered file I/O thường đi qua page cache của kernel. Đọc có thể được phục vụ từ RAM; ghi cập nhật cache rồi được writeback xuống thiết bị sau. Cơ chế này giảm truy cập thiết bị và gom I/O, nhưng ứng dụng cần hiểu dirty data/durability.

## Read cache và readahead

Kernel giữ page gần đây và có thể prefetch page kế tiếp khi nhận diện truy cập tuần tự. Truy cập ngẫu nhiên lớn có thể làm cache hit thấp hoặc đẩy dữ liệu hữu ích khác ra. `posix_fadvise`/cơ chế tương ứng gợi ý pattern nhưng không bắt buộc kernel tuân tuyệt đối.

## Writeback

Write syscall có thể hoàn tất khi bytes đã vào page cache. Kernel writeback theo policy; dirty page được ghi theo thời điểm/áp lực. `fsync` yêu cầu đồng bộ phù hợp nhưng metadata/directory/device cache vẫn cần hiểu contract.

## Direct I/O

`O_DIRECT` cố gắng tránh page cache cho data path trong một số hệ thống, yêu cầu alignment và có semantics riêng với concurrent buffered I/O. Nó có thể hữu ích với database quản lý cache riêng, nhưng không tự nhanh hơn; alignment sai có thể trả error, còn I/O nhỏ/metadata vẫn có chi phí.

## Tóm tắt

- Page cache giữ data file trong RAM và tăng tốc read/write.
- Writeback khiến syscall complete sớm hơn durable media write.
- Readahead giúp tuần tự nhưng có thể lãng phí với random workload.
- Direct I/O có alignment/semantics riêng và cần benchmark.
- Cache coherence giữa direct và buffered access cần tránh trộn tùy tiện.

## Tự kiểm tra

**Đọc file lần hai luôn chạm SSD?** Không; page cache có thể trả dữ liệu.

**O_DIRECT đồng nghĩa không qua kernel?** Không; vẫn qua kernel/block/driver path.

**Buffered write return nghĩa thiết bị đã commit?** Không.

## Đọc tiếp

Page cache nối với memory pressure/reclaim và filesystem durability.

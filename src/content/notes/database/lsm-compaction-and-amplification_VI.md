---
title: "LSM compaction, SSTable và write amplification"
category: "Database"
description: "Đi theo put/get/delete qua memtable và level, so sánh compaction và đo read/write/space amplification."
updated: 2026-10-17
translationKey: "database/lsm-compaction-and-amplification"
---

LSM tree đổi random in-place update thành ghi tuần tự và merge theo lô. Một `put` thường vào WAL rồi memtable; khi memtable đầy, freeze thành sorted run/SSTable. Đọc kiểm tra memtable, immutable memtables và file từ level mới đến cũ, chọn version mới nhất theo sequence number. Tombstone biểu diễn delete cho đến khi compaction chứng minh không còn bản cũ cần thiết.

## Lookup và Bloom filter

SSTable có data blocks được sort cùng index/metadata để định vị range key. Bloom filter trả lời “chắc chắn không có” hoặc “có thể có”; false positive gây thêm disk read, false negative không được phép. Filter chỉ giảm đọc file không có key; khi key thật ở nhiều run, vẫn cần reconciliation.

Range scan merge-iterate nhiều sorted run; nhiều level/file làm heap/iterator work tăng. Compaction kết hợp record cùng key theo sequence/tombstone, xóa version cũ khi snapshot/replica policy cho phép.

## Leveled và size-tiered compaction

Size-tiered gom nhiều run kích thước gần nhau thành run lớn: write throughput tốt hơn nhưng nhiều version của key có thể nằm ở nhiều run và space amplification cao. Leveled giới hạn overlap giữa các file ở level, giúp read amplification thấp hơn; mỗi compaction có thể rewrite nhiều bytes, tăng write amplification. Tiered/leveled hybrid chọn điểm cân bằng.

### Nhìn compaction qua key range

Trong leveled design, file L0 mới flush thường overlap nhau. Khi đủ ngưỡng, engine chọn một hoặc nhiều L0 files và mọi file L1 overlap key range của chúng, merge rồi ghi output L1 theo range không overlap. Ví dụ L0 có `[a,m]`, `[h,z]`; compaction phải xét cả file L1 có `[g,n]` và `[q,t]` vì hai vùng giao nhau. L1/L2 tiếp tục compact theo file overlap ở level kế; capacity thường tăng theo cấp số nhân để dữ liệu cũ dần xuống bottommost level.

Đổi lại, một key nóng có thể bị viết qua nhiều level; compaction cần đủ dung lượng tạm cho output trong lúc input còn phục vụ read. Nếu write nhanh hơn compaction, L0 file/overlap tăng, read phải dò nhiều nơi rồi write stall để bảo vệ disk khỏi debt vô hạn. Backpressure là cơ chế bảo vệ, không tự chứng minh nguyên nhân duy nhất là thiếu thread.

Size-tiered gom run theo kích thước, thường giảm việc rewrite liên tục cùng một key nhưng giữ nhiều version/files hơn. Có thể xảy ra **table starvation**: output nhỏ vì tombstone loại nhiều dữ liệu, không đạt ngưỡng tầng tiếp theo; tombstone cũ còn lâu và read phải xét thêm. Một số workload time-series dùng time-window compaction: file được gom theo khoảng thời gian để có thể bỏ cả file đã hết TTL mà không rewrite từng record, nhưng chỉ an toàn khi dữ liệu/expiration phù hợp và không còn snapshot cần chúng.

Amplification phải đo theo workload: **write amplification** là bytes ghi storage/bytes logical write; **read amplification** là bytes/IO đọc cho một kết quả; **space amplification** là physical bytes/logical live data. Giảm một đại lượng thường tăng đại lượng khác; RUM conjecture mô tả tradeoff giữa read/update/memory trong cấu trúc index.

So B-tree với LSM cần tách nguồn write amplification. B-tree có thể ghi lại page mỗi update/flush, trong khi LSM ghi lại record sống qua compaction; kết quả phụ thuộc page size, cache, update locality, value size, retention/tombstone, level policy và thiết bị. Không dùng một benchmark `put/s` để kết luận tổng chi phí: đo bytes/device, read p99, compaction debt và dung lượng đỉnh.

RUM (Read, Update, Memory) là mô hình để hỏi một cấu trúc đang giảm read cost bằng cách tiêu tốn memory/update ra sao. Nó là khung tradeoff chứ không phải định luật cấu hình cho mọi engine. Bloom filter tăng memory để giảm file reads; compaction tăng writes để giảm số version cần reconcile; trì hoãn compaction giữ nhiều space nhưng giảm rewrite ngay lúc này.

## Concurrency và compaction debt

Background compaction cạnh tranh disk bandwidth với foreground query. Nếu write rate vượt compaction capacity, L0 file chồng lên, stall/backpressure bắt đầu và latency tăng. Monitor pending compaction bytes, L0 count, write stall, disk utilization và tombstone age. Thêm thread không giúp khi disk đã saturated.

Memtable thường dùng skip list hoặc structure ordered khác để hỗ trợ concurrent insert và range iteration. Immutable SSTable giúp reader không khóa ghi; manifest/version metadata atomically công bố file mới, còn obsolete file chỉ xóa sau khi reader cũ không còn dùng.

## Bitcask và WiscKey

Bitcask ghi append log rồi giữ in-memory hash index key→file offset; lookup nhanh nhưng RAM index tỷ lệ key count, compaction reclaim record cũ. WiscKey tách key/value: LSM merge key/value-log pointer nhỏ, value log append riêng, giảm bytes merge; garbage collection value log phức tạp và read cần thêm seek.

## Log stacking trên flash

Database LSM, filesystem journaling và SSD Flash Translation Layer đều có thể log/relocate pages. Khi nhiều tầng cùng log, một logical write bị rewrite qua từng tầng (write amplification stacking). TRIM/discard, alignment, open-channel SSD và host-managed placement thay assumptions. Hiểu stack từ DB đến device trước khi suy ra durability/performance từ “sequential write”.

*Database Internals*, ch. 7, trình bày SSTable/Bloom/skiplist, compaction, amplification, Bitcask/WiscKey và flash log stacking. Đọc cùng [RocksDB overview](https://github.com/facebook/rocksdb/wiki/RocksDB-Overview) để thấy một LSM implementation hiện đại.

## Tự kiểm tra

**Bloom filter false positive có làm query sai?** Không; nó chỉ khiến đọc thêm, còn false negative mới làm mất kết quả.

**Leveled compaction luôn tốt hơn tiered?** Không; thường đổi write amplification lấy read/space tradeoff.

**Tombstone xóa ngay mọi SSTable version?** Không; nó phải được merge qua các file liên quan trước khi version cũ an toàn biến mất.

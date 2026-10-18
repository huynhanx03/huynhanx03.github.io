---
title: "Bitcask, WiscKey và các tầng log của storage"
category: "Database"
description: "So sánh log append không thứ tự với LSM sort key/value, rồi lần write amplification từ database xuống SSD."
updated: 2026-10-17
translationKey: "database/lsm-unordered-stores-and-log-stacking"
---

SSTable sort record theo key để hỗ trợ range scan, nhưng mỗi lần flush phải sort và compaction phải merge. Nếu workload chủ yếu đọc point key và value lớn, có thể tách **thứ tự key** khỏi **vị trí value**: giữ key trong index có thứ tự, append value vào log. Hai thiết kế trong *Database Internals* cho thấy lợi ích và phần chi phí bị dời đi.

## Bitcask: keydir trong RAM, value append vào log

Bitcask ghi record `(key,value,metadata)` vào cuối data file theo insertion order. Keydir là hash map trong RAM ánh xạ mỗi key sang offset của record mới nhất. `put(k,v2)` append `v2`, rồi cập nhật keydir; record cũ của `k` vẫn nằm trong log nhưng không còn reachable qua keydir. Get là tra hash map rồi đọc offset.

Ưu điểm là write tuần tự, point lookup nhanh và có thể không cần WAL riêng nếu log file chính là nguồn phục hồi. Giới hạn: keydir phải vừa RAM và cần rebuild/kiểm chứng khi restart; dữ liệu không sort nên không hỗ trợ range scan hiệu quả. Compaction đọc các log segment, giữ record còn sống theo keydir/tombstone, ghi segment mới rồi cập nhật offset. Crash trong lúc chuyển segment cần manifest/commit protocol để không mất cả bản cũ lẫn mới.

## WiscKey: sort key, append value

WiscKey giữ key và pointer tới value trong LSM tree, còn value được ghi append vào **value log (vLog)**. Khi compaction, LSM chủ yếu di chuyển key nhỏ cùng pointer thay vì ghi lại payload lớn. Get tìm key trong LSM rồi theo pointer tới vLog; range scan vẫn theo thứ tự key nhưng có thể đọc value rời rạc.

Đổi lại, vLog chứa value cũ/deleted sau update. Garbage collection phải biết offset nào còn được key tree tham chiếu, đọc value log và di chuyển value sống, rồi cập nhật pointer. Có thể theo dõi segment head/tail để tránh quét toàn bộ file, nhưng phải phối hợp concurrent write và compaction. Thiết kế hợp khi value lớn, key nhỏ và update/delete pattern cho phép GC; value nhỏ hoặc point reads nhiều có thể làm extra seek lấn át phần tiết kiệm.

| Thuộc tính | Bitcask | WiscKey |
| --- | --- | --- |
| Key index | Hash map trong RAM | LSM tree trên storage |
| Value placement | Cùng append log với key | Append vLog riêng, key giữ pointer |
| Range scan | Không có thứ tự key | Có thứ tự key; value fetch có thể random |
| Chi phí chính | RAM/rebuild keydir và compaction | GC vLog, pointer update và extra value read |

## Log stacking: append ở lớp trên chưa chắc append ở thiết bị

Một write có thể qua nhiều tầng: database WAL, memtable flush, SSTable compaction, filesystem journal/writeback, block layer, SSD FTL. Mỗi lớp có thể copy, reorder, buffer và garbage-collect độc lập. Logical append ở LSM vẫn có thể tạo nhiều physical writes ở compaction, filesystem và FTL; ghi nhiều stream không aligned còn gây fragmentation và read-modify-write.

Trong NAND, page có thể program nhưng erase phải theo block. FTL map logical page tới physical page, chuyển page còn sống khỏi block trước khi erase và cân bằng wear. Filesystem journal cũng giữ metadata/data log riêng. Nếu database compaction rewrite một lượng dữ liệu rồi filesystem/FTL lại di chuyển những page đó, tổng write amplification có thể cao hơn con số đo ở database layer.

Vì vậy đo từ cả hai góc: logical bytes của ứng dụng, bytes do database ghi, device writes/SMART hoặc telemetry phù hợp, latency và backlog compaction. Alignment, discard/TRIM behavior, filesystem và thiết bị có thể đổi kết quả. Đưa WAL ra device riêng đôi khi cô lập I/O, nhưng chỉ hữu ích sau khi đo bottleneck và hiểu durability topology.

## LLAMA và phối hợp giữa access method với storage layer

Một storage layer “không biết” file nào là key/value hay delta chỉ có thể relocate bytes; nó có thể gom nhiều delta thành một vùng liên tục nhưng reader vẫn phải replay delta. LLAMA là ví dụ nghiên cứu về storage log-structured, latch-free và **access-method aware** cho Bw-tree: khi garbage collection đã đọc các delta của một logical node, nó có thể hợp nhất chúng vào base node mới luôn. Điều này vừa thu hồi page cũ vừa giảm chain mà reader phải replay.

Đây là lợi ích của việc tầng storage hiểu semantics mà tầng trên dùng, nhưng coupling tăng và API phải xác định ai chịu trách nhiệm về version, atomic publication, recovery và reclamation. Open-Channel SSD trong sách là hướng nghiên cứu cho phép phần mềm kiểm soát placement/GC thay một phần FTL; khả năng hỗ trợ phần cứng và giao diện thay đổi theo thời kỳ, nên hãy coi đây là kiến trúc lịch sử/nghiên cứu chứ không phải mặc định triển khai hiện nay.

*Database Internals*, ch. 7, đặt Bitcask, WiscKey, flash translation, filesystem logging, LLAMA và Open-Channel SSD trong cùng câu chuyện về nơi dữ liệu được append, sort, relocate và reclaim.

## Tự kiểm tra

**Bitcask tìm range `key > x` hiệu quả như LSM không?** Không; keydir là hash map, không giữ thứ tự.

**WiscKey loại bỏ compaction/GC?** Không; nó giảm payload được rewrite trong LSM nhưng value log vẫn cần thu hồi value chết và sửa pointer.

**LSM append nghĩa device writes cũng chỉ append?** Không; compaction, filesystem và FTL có thể ghi lại/di chuyển dữ liệu nhiều lần.

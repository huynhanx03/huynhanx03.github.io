---
title: "LSM lookup, SSTable và hợp nhất phiên bản"
category: "Database"
description: "Lần theo get/range scan qua memtable và SSTable, dùng filter/index block, rồi giải quyết update và tombstone."
updated: 2026-10-17
translationKey: "database/lsm-lookup-and-reconciliation"
---

Một key trong LSM có thể tồn tại ở nhiều nơi: memtable hiện tại, memtable đang flush và vài SSTable. Read không dừng ở file đầu tiên chứa key theo thứ tự tùy tiện; nó phải xét **độ mới**, sequence number/timestamp, snapshot mà transaction nhìn thấy và tombstone. Nếu bỏ một phiên bản cũ quá sớm hoặc chọn sai bản, dữ liệu cũ có thể sống lại.

## Tìm point key mà không mở mọi file

Engine thường đi qua các bước từ rẻ tới đắt:

1. Kiểm tra mutable memtable và immutable memtable đang chờ flush.
2. Dùng metadata SSTable như min/max key để bỏ qua file nằm ngoài key range.
3. Dùng Bloom filter để loại file/block chắc chắn không chứa key.
4. Tìm block gần đúng trong sparse index hoặc index block.
5. Đọc data block, tìm key và kiểm tra sequence/tombstone.

Bloom filter trả `definitely absent` hoặc `maybe present`: false positive chỉ gây thêm đọc, false negative không được phép. Sparse index giữ fence key cho mỗi block thay vì một pointer cho từng record; nó giảm RAM nhưng cần đọc block sau khi chọn range. Block cache có thể giữ data/index/filter block nóng. Một filter tốt không làm query có key mới nhất ở nhiều run miễn phí: vẫn phải so sánh candidate versions ở các nguồn cần thiết.

Ví dụ key `customer:42` có thể không nằm trong range của SSTable A, Bloom filter của B nói chắc chắn không có, còn C nói có thể có. Chỉ cần mở block của C để kiểm tra; khi tìm được record, engine vẫn so với memtable và các nguồn mới hơn trước khi trả kết quả.

### Bloom filter: bit array, hash và false positive

Bloom filter khởi đầu bằng mảng bit toàn 0. Khi thêm key, tính nhiều hàm băm và bật bit tại từng vị trí; khi kiểm tra, nếu có ít nhất một bit 0 thì key chắc chắn chưa được thêm. Nếu tất cả bit đều 1, key chỉ **có thể** có mặt: nhiều key khác nhau có thể đã bật trùng những vị trí ấy. Ví dụ mảng 16 bit: `key1` bật `{3,5,10}`, `key2` bật `{5,8,14}`; `key3` tạo `{3,10,14}` nên filter trả có thể có dù key3 chưa từng được thêm — false positive. `key4` tạo `{5,9,15}`; hai bit 9 và 15 còn 0 nên filter kết luận chắc chắn vắng mặt.

False positive chỉ làm engine đọc/kiểm tra thêm; false negative sẽ làm mất dữ liệu nên filter phải được xây/đọc nhất quán với table. Mảng lớn hơn so với số key thường giảm va chạm nhưng tốn RAM; thêm hash function giúp phân biệt đến một mức nào đó nhưng tăng CPU và không thể tối ưu vô hạn. SSTable bất biến biết trước tập key khi build, nên có thể chọn kích thước filter theo table. Range metadata trước Bloom filter có thể loại file rẻ hơn; filter chủ yếu tránh mở file có range chồng với key nhưng thật ra không chứa key.

## Multiway merge cho range scan

Mỗi nguồn đã sort có iterator/cursor riêng. Đặt phần tử đầu mỗi iterator vào min-heap. Mỗi bước lấy key nhỏ nhất, tiến iterator nguồn đó rồi đưa phần tử kế tiếp vào heap. Với `k` nguồn và `n` record đã tiêu thụ, chọn phần tử tốn xấp xỉ `O(log k)` mỗi bước; lợi ích là không cần nạp toàn bộ dữ liệu vào RAM để sort lại.

Giả sử ba nguồn theo thứ tự từ mới tới cũ:

| Nguồn | Các record |
| --- | --- |
| memtable | `b → B2 (seq 10)` |
| SSTable mới | `a → A2 (seq 8)`, `c → DELETE (seq 9)` |
| SSTable cũ | `a → A1 (seq 2)`, `b → B1 (seq 5)`, `c → C1 (seq 3)` |

Merge iterator gặp `a` ở hai nguồn; giữ `A2` vì sequence 8 mới hơn `A1`. Gặp `b`, chọn `B2` từ memtable thay `B1`. Với `c`, tombstone seq 9 che `C1`, nên output range scan không có `c`. Kết quả logic là `a→A2, b→B2`. Thứ tự nguồn có thể là hint, nhưng conflict resolution phải dựa trên version semantics của engine, không đoán theo tên file.

Một range tombstone che cả khoảng key, ví dụ `[b,d)`. Nó phải được áp dụng cùng point record và ranh giới file; nếu bỏ tombstone khi vẫn còn SSTable cũ chứa `c`, key `c` có thể xuất hiện lại. TTL cũng cần semantics rõ: expiration tạo tombstone hay lọc theo thời gian đọc, và khi nào có thể loại bản cũ phụ thuộc snapshot/replica/compaction policy.

## SSTable được tổ chức ra sao?

SSTable thường bất biến và chứa data block sort theo key cùng index/filter/metadata. Footer hoặc meta index dẫn tới các block metadata; sparse index ánh xạ fence key sang block offset. Đọc một point key: mở metadata, xác định block range, đọc compressed block, giải nén vào memory và tìm key bên trong. Một key lớn có thể vượt block boundary hoặc dùng prefix compression/shared prefix để giảm size; format cần đủ metadata để decode độc lập.

Compression giảm bytes disk/cache nhưng block phải giải nén khi đọc; dictionary/prefix state có thể làm access phụ thuộc phần trước nên block boundary được chọn để giới hạn decode. Offset index cho biết compressed offset/size và uncompressed size. Kích thước block nhỏ tăng metadata/I/O call nhưng giảm read amplification khi lấy ít record; block lớn tăng throughput tuần tự nhưng đọc dư nhiều bytes cho point lookup.

## Flush và table view phải đổi an toàn

Khi memtable đạt ngưỡng, writer cần chuyển sang memtable mới ngay; memtable cũ vẫn phải đọc được trong lúc flush. File đích chưa hoàn thành không được đưa vào read view. Sau khi SSTable ghi xong, engine atomically publish manifest/table version mới để readers thấy SSTable và bỏ immutable memtable tương ứng khỏi view. Chỉ sau publication an toàn mới có thể trim WAL segment chứa các write đã được flush.

Compaction cũng tạo view mới: file cũ tiếp tục phục vụ reader đang mở; file output phải ghi xong và kiểm chứng metadata trước khi publication; obsolete file chỉ xóa khi reader không còn reference. Nếu đồng thời nhiều compaction chọn cùng input, cần reservation/version checks để tránh hai output cạnh tranh. Đây là correctness protocol, không chỉ là housekeeping.

*Database Internals*, ch. 7, giải thích lookup, iterator merge, reconciliation, SSTable/filter và concurrent table-view publication. Đọc cùng [RocksDB overview](https://github.com/facebook/rocksdb/wiki/RocksDB-Overview) để xem cách một implementation hiện đại diễn đạt block, table và compaction concepts.

## Tự kiểm tra

**Bloom filter nói `maybe present` có nghĩa record chắc chắn ở file?** Không. Nó chỉ có nghĩa cần đọc/kiểm tra thêm.

**Hai SSTable có cùng key thì lấy file nào trước?** Chọn theo version/sequence và snapshot semantics; không dựa riêng vào tên file hoặc thứ tự iterator.

**Có thể xóa WAL khi memtable bắt đầu flush?** Chưa. WAL chỉ được trim sau khi data file hoàn tất và publication bảo đảm nó đã thay memtable trong recovery/read view.

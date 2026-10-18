---
title: "LSM tree và lưu trữ tối ưu cho ghi"
category: "Database"
description: "Theo một lần ghi từ WAL và memtable tới SSTable, rồi xem compaction đổi chi phí đọc, ghi và dung lượng ra sao."
updated: 2026-10-17
translationKey: "database/lsm-and-write-optimized-storage"
---

Một B-tree cập nhật có thể phải tìm page đúng, khóa hoặc bảo vệ page đó, sửa nó và ghi các thay đổi xuống storage. Với workload ghi lớn, nhiều lần ghi ngẫu nhiên có thể đắt. LSM tree tổ chức đường ghi theo hướng khác: ghi tuần tự vào log và bộ nhớ trước, rồi ghi các file đã sắp xếp thành những đợt lớn.

## Đường đi của một lần ghi

Một triển khai LSM thường có write-ahead log (WAL) để phục hồi, một hoặc nhiều cấu trúc trong RAM gọi là memtable, và các file bất biến đã sắp xếp trên storage, thường gọi là SSTable.

Khi nhận `put(k, v)`, engine thường ghi record vào WAL trước theo quy tắc durability đang cấu hình, sau đó cập nhật memtable. Khi memtable đầy, nó được đóng băng và flush thành SSTable mới. File được ghi tuần tự, đã sắp theo key, nên nhiều workload tránh được sửa page ngẫu nhiên tại chỗ.

Memtable cần giữ thứ tự để hỗ trợ point lookup và range iteration trước khi flush. Một cấu trúc phổ biến là **skip list**: node có nhiều forward pointer ở các level; node cao giúp nhảy qua đoạn lớn, node thấp nối từng phần tử. Chiều cao chọn ngẫu nhiên nên kỳ vọng search/insert gần `O(log n)` mà không cần rotation. Đổi lại, node nhỏ phân bổ rải rác có thể kém cache-friendly so với B-tree node đóng gói liền nhau.

Có thể tổ chức LSM thành hai thành phần lớn—memtable cộng một disk tree/file—và merge phần tương ứng mỗi lần flush, hoặc nhiều immutable SSTable rồi compaction định kỳ. Hai thành phần giảm số nơi cần đọc nhưng flush phải merge nhiều hơn; nhiều thành phần ghi flush gọn hơn nhưng read/compaction có nhiều run hơn. Mỗi flush phải chuyển writer sang memtable mới, giữ memtable cũ đọc được và chỉ công bố SSTable sau khi hoàn tất.

Trong biến thể hai thành phần kiểu LSM ban đầu, disk component có thể là B-tree bất biến với page được lấp đầy dày. Khi flush một vùng/subtree từ memtable, engine tìm vùng tương ứng trong disk tree, merge hai luồng đã sort và ghi một subtree mới; subtree cũ chỉ được thay sau khi output hoàn tất. Đây giống copy-on-write ở chỗ không sửa page cũ tại chỗ, nhưng buffer memtable giúp gộp nhiều write trước khi trả chi phí merge. Thiết kế nhiều thành phần giữ disk tables thành các run riêng: flush rẻ hơn, còn compaction gom nhiều run sau đó. Hai cách khác nhau ở thời điểm trả merge cost và số nguồn read cần xét.

Xóa thường được biểu diễn bằng tombstone thay vì xóa ngay mọi bản sao cũ. Một key có thể xuất hiện trong memtable và nhiều file vì các phiên bản mới hơn che các phiên bản cũ. Engine phải biết thứ tự phiên bản để trả về giá trị mới nhất hoặc kết luận key đã bị xóa.

Secondary index cũng phải theo lifecycle của data: có thể có index trong memory cho memtable và index riêng cho mỗi SSTable; flush/compaction phải tạo hoặc hợp nhất phần index tương ứng. Việc index đi cùng immutable table giúp publication/version đồng bộ hơn, nhưng query phụ có thể phải tìm/merge nhiều index view rồi quay về primary key để lấy row. “Thêm index” trong LSM vì thế có thể tăng memory, flush work và compaction work.

### Lần theo một thao tác trong skip list

Tìm key bắt đầu ở level cao nhất: đi sang phải khi key kế tiếp còn nhỏ hơn key cần tìm; khi gặp key lớn hơn, hạ xuống level thấp hơn từ node hiện tại. Lặp lại tới level 0 để tìm key hoặc vị trí chèn. Các level thưa giúp bỏ qua nhiều node; level 0 vẫn giữ toàn bộ key theo thứ tự. Số level bị chặn theo kích thước tối đa của memtable, còn chiều cao node được chọn ngẫu nhiên lúc insert.

Khi chèn, thuật toán lưu predecessor ở mỗi level liên quan, tạo node có chiều cao đã chọn, rồi nối các forward pointer tương ứng. Delete đảo các pointer của predecessor qua node kế tiếp ở từng level; nó không cần cân bằng bằng rotation như tree. Ví dụ level thấp nhất chứa `1→3→5→7→10`, còn level trên có `1→5→10`: tìm `7` đi `1→5`, thấy `10` vượt quá thì hạ level tại `5`, rồi bước tới `7`. Đây là lý do skip list có search kỳ vọng logarithmic dù cấu trúc là linked list nhiều tầng.

Concurrency vẫn cần protocol: nếu writer cập nhật nhiều level, reader không được coi node là hoàn tất trước khi các liên kết cần thiết đã được publish. Một thiết kế có thể dùng cờ `fully_linked` đặt sau khi CAS cài xong mọi pointer; node bị xóa cũng cần reclamation an toàn như reference counting/hazard pointers để reader đang giữ pointer không truy cập vùng đã giải phóng. Những chi tiết này phụ thuộc implementation; skip list không tự động trở thành concurrent-safe chỉ nhờ có nhiều level.

### Secondary index gắn với vòng đời SSTable

Mô hình **SSTable-Attached Secondary Index (SASI)** được sách dùng làm ví dụ: mỗi SSTable có index thứ cấp riêng, được tạo cùng lúc memtable flush thành table; memtable đang hoạt động cũng có index trong memory. Khi query theo field không phải primary key, engine tìm key trong các index view của memtable và các SSTable, hợp nhất candidate giống lookup LSM, rồi dùng primary key lấy record. Compaction tạo SSTable mới thì tạo index tương ứng; index cũ được thay cùng table cũ khi view mới publish.

Ưu điểm là index đi theo đúng lifecycle của immutable table, không phải cập nhật một cấu trúc global tại chỗ cho mỗi record. Đổi lại, query/index build/flush phải tính trên nhiều component; secondary index tăng RAM, thời gian flush và bytes compaction, và candidate vẫn cần reconcile theo version. SASI ở đây là ví dụ triển khai trong sách, không phải khẳng định mọi bản Cassandra hiện nay dùng cùng implementation hay semantics.

## Đọc phải hợp nhất nhiều nguồn

Một lookup có thể kiểm tra memtable, immutable memtable đang chờ flush, rồi các SSTable từ mới tới cũ. Engine dùng metadata như min/max key, sparse index, cache và Bloom filter để bỏ qua file không thể chứa key. Bloom filter có thể báo “chắc chắn không có” hoặc “có thể có”; nó không gây false negative nhưng có thể có false positive.

Khi một truy vấn tìm nhiều key theo thứ tự, engine cần merge-iterate nhiều luồng đã sắp xếp. Đây là lý do số run/file ảnh hưởng tới độ trễ đọc và số lần chạm storage. Tăng số tầng hoặc số file có thể giúp ghi tiếp tục tuần tự nhưng khiến việc đọc phải xét nhiều nơi hơn.

## Compaction thu gọn lịch sử

**Compaction** hợp nhất các SSTable, chọn phiên bản còn hiệu lực, loại bỏ tombstone khi an toàn và tạo file mới. Công việc nền này giúp hạn chế số file phải đọc nhưng tiêu thụ CPU, I/O và dung lượng tạm thời. Trong lúc compaction chạy, hệ thống có thể cạnh tranh tài nguyên với truy vấn và ghi của ứng dụng.

Hai chiến lược phổ biến tạo ra những đánh đổi khác nhau:

- **Size-tiered compaction** giữ các file/run có kích thước gần nhau rồi hợp nhất chúng thành run lớn hơn. Nó thường ghi lại ít dữ liệu hơn mỗi đợt, nhưng có thể giữ nhiều phiên bản và dùng thêm dung lượng.
- **Leveled compaction** chia dữ liệu thành các level với giới hạn kích thước và phạm vi key được kiểm soát. Nó thường giữ ít dữ liệu trùng lặp hơn và cho phép tìm kiếm giới hạn file tốt hơn, nhưng một key có thể bị ghi lại qua nhiều lần compaction.

Tên và chi tiết của chiến lược khác nhau giữa engine. Thực tế có thể dùng hybrid, compaction theo tier ở tầng thấp rồi leveled ở tầng cao, hoặc các biến thể theo workload. Vì vậy không có một chính sách thắng cho mọi dữ liệu.

## Đọc, ghi và dung lượng được đánh đổi

LSM thường giảm ghi ngẫu nhiên tại đường đi foreground, nhưng compaction ghi lại dữ liệu đã tồn tại. **Write amplification** mô tả lượng byte storage phải ghi so với byte ứng dụng yêu cầu ghi. **Read amplification** là lượng công việc đọc thêm để tìm kết quả. **Space amplification** là dung lượng vật lý cần dùng so với dữ liệu hữu ích hiện tại.

Đây là ba chiều có liên hệ. Tăng compaction có thể giảm số file cần xét khi đọc nhưng tăng ghi nền. Trì hoãn compaction có thể giảm áp lực ghi ngay lúc này nhưng làm tăng file, tombstone, đọc và dung lượng. Định lý RUM nhắc rằng read, update/write và memory có những đánh đổi; nó là khung suy nghĩ, không phải công thức cấu hình.

Một Bloom filter lớn có thể giảm lần đọc file không liên quan, nhưng tốn RAM. Cache block giúp tăng hit rate, nhưng cache quá nhỏ hoặc workload đổi liên tục sẽ làm lợi ích thấp. Chọn cấu hình cần workload thực: tỷ lệ get/put/delete, kích thước value, phân bố key, read-after-write, độ trễ yêu cầu và tốc độ storage.

## Các họ lưu trữ liên quan

Bitcask minh họa log-structured key-value store: dữ liệu mới được append tuần tự vào log, còn index trong RAM ánh xạ key tới vị trí mới nhất. Cách này phù hợp khi value nhỏ/đọc theo key và index vừa RAM; compaction log cần loại bản cũ và có chi phí riêng.

WiscKey tách key khỏi value lớn để compaction chủ yếu di chuyển key nhỏ, còn value được ghi trong log riêng. Điều này có thể giảm write amplification cho value lớn nhưng khiến truy vấn phải theo con trỏ sang vùng value và việc garbage collection phức tạp hơn.

Các tầng bên dưới cũng có log và gom dữ liệu: filesystem journal, SSD flash translation layer, RAID controller hoặc ứng dụng. Nếu nhiều tầng cùng gom và ghi lại dữ liệu mà không biết chính sách của nhau, latency và write amplification có thể tăng. “Append-only” ở một tầng không có nghĩa toàn bộ stack không ghi lại dữ liệu.

## Khi nào LSM đáng cân nhắc?

LSM phù hợp với một số workload có nhiều ghi, ghi theo key và chấp nhận compaction nền. B-tree có thể phù hợp hơn khi cần lookup/range ổn định trên dữ liệu đã tổ chức, hoặc khi độ trễ read cần ít tầng hợp nhất. Kết luận phải phụ thuộc implementation, thiết bị và workload đo được.

Khi theo dõi một LSM, quan sát write stall, số file mỗi level, pending compaction bytes, độ trễ p95/p99, cache hit, Bloom filter usefulness, dung lượng tombstone và tốc độ ghi storage. Một hệ thống báo ghi nhanh nhưng compaction tụt xa có thể chỉ đang trì hoãn chi phí.

## Tự kiểm tra

**Vì sao LSM vẫn ghi nhiều byte xuống đĩa dù foreground chủ yếu append?** Vì compaction hợp nhất và ghi lại các key/value còn sống qua nhiều file.

**Bloom filter trả lời “có thể có” thì có nghĩa key chắc chắn tồn tại không?** Không. Cần đọc file để xác nhận; chỉ câu trả lời “chắc chắn không” mới bỏ qua file an toàn.

**Tombstone có thể xóa ngay không?** Không phải lúc nào cũng được. Một bản sao cũ ở file khác có thể làm key sống lại nếu tombstone bị bỏ trước khi compaction hợp nhất phạm vi liên quan an toàn.

Nguồn đọc: *Database Internals*, chương 7, gồm LSM, SSTable, Bloom filter, skiplist, compaction, Bitcask, WiscKey và tương tác giữa các tầng log.

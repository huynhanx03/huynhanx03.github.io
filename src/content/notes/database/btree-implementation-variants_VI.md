---
title: "B-tree trên đĩa: split, merge và các biến thể"
category: "Database"
description: "Đi sâu separator key, page split/merge, bulk loading và đánh đổi giữa copy-on-write, lazy, FD-tree và Bw-tree."
updated: 2026-10-17
translationKey: "database/btree-implementation-variants"
---

B-tree được thiết kế để giảm số lần đọc page: mỗi node chứa nhiều key nên fanout cao và chiều cao thấp. Nhưng mỗi insert có thể làm page đầy, split và truyền separator lên parent; delete có thể tạo page thưa cần merge/redistribute. Trên đĩa, thuật toán phải cân bằng số I/O, write amplification, concurrency và recovery.

## Separator và tìm kiếm

Internal page giữ separator phân chia khoảng key và child pointer. Tìm key bắt đầu root, binary-search separator, theo child xuống leaf. Range scan tìm leaf đầu tiên rồi đi theo sibling link. Node cao và key dài làm giảm fanout; compression prefix giữa key liền kề tiết kiệm chỗ nhưng tăng CPU decode.

## Split lan truyền

Khi leaf đầy, engine phân phối key qua hai page, sửa sibling links/high key nếu có, rồi đưa separator mới vào parent. Parent đầy thì split tiếp; có thể lan đến root và tạo level mới. Nếu insert append tăng dần, rightmost page thường là điểm nóng; split 50/50 có thể để nửa page trái đầy và page phải gần trống. Bulk load sắp sort trước rồi xây level theo batch để tận dụng page density tốt hơn.

Delete có thể redistribute từ sibling hoặc merge. Merge giảm tree height nhưng ghi nhiều page và parent; lazy deletion hoãn cleanup để giảm write. Fragmentation và free-space reuse phụ thuộc engine. Update variable-size key có thể chuyển cell/overflow và split ngoài dự tính.

### Lần theo một split

Giả sử để minh họa một leaf giữ tối đa ba key, hiện có `[10, 20, 30]`, và ta insert `25`:

1. Search từ root tới leaf theo separator, rồi xác nhận page đầy.
2. Cấp page mới và phân phối bốn key đã sort, ví dụ trái `[10, 20]`, phải `[25, 30]`. Phân phối chính xác tùy split policy và kích thước byte của record.
3. Sửa sibling link/high key nếu implementation dùng chúng để giữ search đúng trong lúc parent chưa cập nhật.
4. Đưa separator biểu diễn boundary giữa hai leaf lên parent. Search key `25` phải chọn page phải; range scan đi qua sibling link phải thấy đủ các key theo thứ tự.
5. Nếu parent cũng đầy, lặp split lên tầng trên. Nếu root split, tạo root mới và tree height tăng một.

Concurrent reader có thể đang đi theo path cũ khi split xảy ra; latch coupling, sibling links/high keys hoặc versioned page mapping là một phần của correctness. Recovery cũng phải biết split đã hoàn tất đến bước nào nếu crash giữa chừng. Các thiết kế B-link, COW và delta khác nhau ở chi tiết publish thay đổi dù cùng phải giữ ordered search.

## Metadata page quyết định navigation

Page header thường giữ page type/level, số cell, ranh giới vùng trống và cờ trạng thái; magic number hoặc version giúp phát hiện page đọc sai loại/format. Checksum phát hiện một số corruption nhưng không tự sửa dữ liệu. Việc diễn giải header là engine-specific, vì vậy không nên sửa byte trực tiếp trong file database.

Một slotted page có thể giữ cell theo thứ tự insert, còn slot-offset array giữ thứ tự logic theo key. Binary search chạy trên array đã sắp xếp: lấy slot giữa, dereference offset để đọc key, so sánh rồi thu hẹp nửa còn lại. Cách này tránh di chuyển mọi cell khi chèn ở giữa, nhưng mỗi lần compare có thêm indirection và slot array cũng phải cập nhật.

Internal node có N separator nhưng thường N+1 child pointer: pointer cuối cùng không có separator phía sau. Một implementation có thể lưu pointer tận cùng trong header; B-link tree có thể biểu diễn bằng **high key** (upper bound của node) cùng sibling pointer. Nếu search đi vào node cũ sau split và key lớn hơn high key, nó đi sang right sibling. Cơ chế này giúp concurrent split không cần mọi reader lập tức quay lại parent đã cập nhật.

### Khi nào dùng rightmost pointer, khi nào dùng high key?

Một node có `N` separator phải định tuyến tới `N + 1` child. Pointer cuối không được ghép với separator nào, nên implementation phải biểu diễn nó riêng. Một cách là đặt **rightmost pointer** trong page header. Nếu child ngoài cùng bên phải bị split, parent chèn separator cho boundary mới và thay pointer ngoài cùng bằng page mới ở phía phải; mọi child pointer vẫn phải trỏ đúng khoảng key.

Một cách khác dùng **high key** làm cận trên của khoảng mà page hiện tại phục vụ, cùng link sang sibling phải. Nếu reader đang đi theo parent cũ và đến page có high key nhỏ hơn key cần tìm, nó đi sang sibling. Nhờ vậy reader có thể hoàn tất lookup trong khi parent đang được cập nhật. Link hai chiều giúp đi ngược khi cần, nhưng split/merge phải sửa cả `next` của page hiện tại lẫn `prev` của sibling kế tiếp; đó là một ghi chéo page và có thể cần latch/lock bổ sung. High key không thay separator ở parent: hai phần này phối hợp để xử lý trạng thái chuyển tiếp của split.

## Key/payload lớn và overflow page

Page có kích thước cố định nhưng key/value variable-length. Nếu cho payload lớn chiếm hết page, node có thể hết byte trước khi đạt giới hạn số entry. Một số format giới hạn phần payload inline rồi nối overflow page; chuỗi overflow phải quản lý link, free space và giải phóng khi record bị thay/xóa. Search thường giữ đủ prefix/key material ở page chính để so sánh, còn đọc record lớn phải truy cập overflow chain.

Ví dụ một B-tree page 4 KiB có thể giữ hàng chục key ngắn nhưng chỉ vài payload dài. Inline toàn bộ payload sẽ làm fanout rơi, tăng tree height; spill payload giữ navigation node gọn hơn nhưng fetch value tốn thêm I/O. Nếu gần như mọi record đều là blob lớn, object/blob store riêng thường phù hợp hơn là giả định overflow miễn phí.

## Breadcrumbs, rebalance và fast append

Để split leaf rồi cập nhật parent, engine cần đường quay lên. Có thể lưu parent pointer (phải sửa khi parent split/merge) hoặc giữ **breadcrumbs** trong stack lúc đi từ root xuống leaf. Stack ghi các node/child position đã đi qua, rồi được pop để lan split ngược lên. Nếu parent đã thay đổi đồng thời, saved position có thể stale; phải xác minh lại key/range trước khi dùng.

Trước khi split/merge, engine có thể chuyển một số entry giữa sibling để cải thiện occupancy. B*-tree có thể phân phối hai node đã đầy sang ba node khoảng hai phần ba; đổi lại phải khóa/cập nhật nhiều sibling và separator hơn. Auto-increment key có thể cho **right-most fast path**: nếu insert luôn lớn hơn key hiện tại, engine có thể thao tác trên leaf phải đã cache thay vì tìm lại root. Đây là tối ưu cho workload append, không giúp random key hay update.

Với dữ liệu đã sort, bulk load ghi leaf theo page rồi tạo các tầng parent bottom-up; nó có thể xây toàn bộ leaf trước khi dựng parent, tránh split/merge thông thường trong lúc nạp và chỉ cần giữ đường từ leaf đang điền tới root trong RAM. Dữ liệu immutable có thể lấp page đầy hơn vì không cần chừa chỗ cho cập nhật tương lai; cây mutable thường phải giữ khoảng trống để giảm split về sau.

Insert tăng đơn điệu có **fast path** khi khóa mới lớn hơn các khóa ở rightmost leaf và page còn chỗ: engine có thể dùng leaf phải đã cache, bỏ qua việc đọc lại toàn path từ root. Nếu page phải đã đầy và key mới luôn là lớn nhất, một số implementation như quick-balance có thể cấp leaf phải mới thay vì chia đôi page thành hai nửa; page mới ban đầu thưa nhưng các append kế tiếp sẽ lấp nó. Cách này chỉ có lợi khi dữ liệu thật sự append theo thứ tự; insert muộn với key nhỏ hơn cần đường tìm và split thông thường.

Page compression có tradeoff riêng: nén từng page cho phép đọc/giải nén độc lập, trong khi nén cả file có thể buộc giải nén vùng lớn để tìm một page. Page nén nhỏ hơn block truyền có thể vẫn khiến thiết bị đọc thêm byte cùng block; page trải qua nhiều block có thể cần thêm một lần đọc. Nén tăng mật độ cache/I/O nhưng tiêu thụ CPU và memory cho buffer nén/giải nén. Chọn theo kích thước block, pattern truy cập và số đo trên dữ liệu thật.

## Fragmentation và thu hồi page

Một cell bị xóa hoặc bị phiên bản mới che khuất có thể vẫn còn bytes trên page. Miễn là reader/transaction còn quyền nhìn thấy phiên bản đó, engine không thể tùy tiện ghi đè; sau khi không còn reader cần dữ liệu cũ, cell trở thành garbage có thể thu hồi. Mất pointer khỏi slot làm cell không còn reachable trong cây nhưng chưa tự gom các mảnh free lại với nhau. Vì thế tổng free bytes có thể đủ mà không có vùng contiguous đủ lớn cho insert.

Compaction/vacuum đọc cell còn live, viết lại chúng theo thứ tự logic, cập nhật slot/offset rồi ghi page mới. Page hoàn toàn trống có thể vào **free page list/freelist** để tái sử dụng; metadata freelist phải được ghi bền và phục hồi nhất quán sau crash, nếu không cùng một page có thể bị cấp cho hai record. Rewriting page cũng có thể đổi vị trí vật lý, nên mọi pointer ngoài page phải dùng indirection hoặc được cập nhật theo quy tắc của engine.

Bảo trì có chi phí: đọc/ghi page, contention, WAL, và có thể ảnh hưởng latency. Theo dõi page split, index size, dead tuples/garbage, free-space reuse và latency rồi chọn cơ chế rebuild/vacuum theo engine. Backup/recovery phải bảo vệ cả metadata/free-list changes để page không bị cấp phát cho hai object sau crash.

## Biến thể theo đường ghi

**Copy-on-write** ghi node mới thay node cũ rồi đổi root pointer; snapshot đọc root cũ an toàn, nhưng update path ghi lại nhiều node và cần reclaim version cũ. LMDB là ví dụ mmap/COW.

**Lazy B-tree** tích lũy thay đổi trong delta/buffer rồi batch apply; giảm random writes nhưng đọc phải reconcile delta và compaction có thể gây spike. WiredTiger dùng update structures khác theo version.

**FD-tree** giữ một component nóng nhỏ và nhiều sorted runs; fractional cascading giúp search xuyên các run. Ghi bền tuần tự hơn nhưng read/merge amplification tăng.

**Bw-tree** dùng mapping table từ logical page ID sang physical page và delta chain immutable; update qua CAS tránh latch page thông thường. Chain cần consolidate/GC, mapping update contention và crash consistency vẫn phức tạp.

**Cache-oblivious tree** dùng layout đệ quy như van Emde Boas để hoạt động tốt qua nhiều block size mà không biết page size trước; triển khai/updates phức tạp hơn B-tree chuẩn.

## Ba trục để đọc một storage engine

Phần đầu của *Database Internals* dùng ba câu hỏi để so sánh cấu trúc lưu trữ: **buffering** trì hoãn hoặc gom các lần ghi ở đâu; **immutability** có ghi đè dữ liệu cũ hay tạo phiên bản/file mới; và **ordering** có giữ key theo thứ tự để tìm range hay không. Đây là các trục độc lập, không phải ba loại engine loại trừ nhau.

Buffering giảm write amplification trước mắt vì nhiều thay đổi được gộp, nhưng có thể đẩy công việc sang flush/compaction. Immutability giúp reader tiếp tục đọc phiên bản ổn định và thường cho phép page đầy hơn, nhưng cần dọn bản cũ và có thể tạo deferred write amplification. Không giữ thứ tự giúp append đơn giản, như Bitcask; giữ thứ tự hỗ trợ range scan nhưng cần sắp xếp/merge, như LSM. COW là một ngoại lệ hữu ích: nó tạo page immutable mới nhưng copy và sắp lại path để vẫn duy trì thứ tự B-tree.

Khi chọn thiết kế, hãy đánh dấu cả ba trục rồi hỏi workload chấp nhận trả chi phí ở đâu: đường ghi foreground, đường đọc, dung lượng tạm hay maintenance. Cách nhìn này giải thích được nhiều thiết kế mới bằng cách kết hợp các ý đã biết thay vì học mỗi tên như một cấu trúc hoàn toàn riêng.

## Mỗi biến thể đổi một loại công việc nào?

### Copy-on-write: công bố root mới

Khi sửa một leaf, COW copy leaf đó và copy từng ancestor trên đường về root; các nhánh không đổi được dùng lại. Writer tạo một cây mới song song cây cũ rồi atomically publish root mới. Reader đã bắt đầu có thể tiếp tục đi trên root cũ mà không thấy page sửa dở; reader mới dùng root mới. Khi reader cũ kết thúc, page chỉ thuộc phiên bản cũ mới có thể được reclaim.

Ví dụ cập nhật một key trong cây cao 4 tầng thường tạo ít nhất các page dọc path đó, thay vì ghi đè page mà reader đang dùng. Đổi lại có page duplication tạm thời, write amplification theo chiều cao cây và cần theo dõi reader/version để không thu hồi page quá sớm. LMDB là ví dụ memory-mapped COW; append-style design không cần sibling links nên range scan có thể phải quay lên parent để tìm leaf kế tiếp. COW đơn giản hóa reader synchronization, nhưng không có nghĩa nhiều writer cùng publish độc lập mà không phối hợp.

Trong mô tả của *Database Internals*, LMDB truy cập trực tiếp dữ liệu qua memory map, copy branch page trên root-to-leaf path và giữ root hiện tại cùng root transaction đang xây. Reader cũ tiếp tục dùng version cũ; page cũ chỉ tái sử dụng sau khi reader tham chiếu nó kết thúc. Đây là thiết kế cụ thể của LMDB, không suy ra mọi COW engine đều bỏ page cache, WAL hay checkpoint.

### Cập nhật node được biểu diễn thế nào trong memory?

Engine có thể thao tác trực tiếp trên bytes của page đã cache/mmap; materialize page thành object/native struct rồi serialize khi flush; hoặc dùng wrapper thay đổi backing buffer ngay khi gọi method. Object representation dễ viết logic nhưng giữ đồng thời bytes và object tốn RAM; direct buffer tiết kiệm bản sao nhưng cần kiểm soát alignment, lifetime và concurrent access. Giữ file image, cached page và in-memory representation thành các lifecycle riêng còn cho phép gom update rồi reconcile sau.

### Lazy B-tree: buffer rồi reconcile

Một cách tránh cập nhật page ngay là materialize page thành cấu trúc memory riêng và giữ delta trong update buffer. Trong thiết kế kiểu WiredTiger được sách mô tả, read kết hợp base page với update buffer để thấy version mới; khi flush, reconciliation gộp thay đổi vào page image, có thể split nếu kết quả quá lớn. Background thread làm phần structural work, giảm việc foreground request phải ghi từng page ngay.

LA-Tree mở rộng ý tưởng bằng buffer theo subtree: insert vào buffer gần root; buffer đầy thì batch changes xuống tầng thấp hơn; khi chạm leaf, áp dụng nhiều thay đổi cùng lúc. Batch giảm I/O ngẫu nhiên và split lặp, nhưng lookup phải xét buffer trên đường đi hoặc merge state, và flush tạo đợt công việc nền. Vì vậy cần đo read amplification và flush latency cùng write throughput.

### FD-tree: head tree cộng sorted runs

FD-tree giữ một mutable head B-tree nhỏ và các run immutable đã sort. Khi head đầy, records chuyển thành run; merge theo tầng kích thước tăng dần để giới hạn số run. Delete được ghi bằng tombstone để che item cũ ở các run dưới, và tombstone chỉ bỏ được khi compaction chắc chắn đã đi qua mọi bản bị che.

Tìm kiếm qua nhiều run có thể tốn binary search ở mỗi tầng. Fractional cascading thêm bridge/fence: sau search ở tầng trên, con trỏ dẫn tới vùng gần đúng ở tầng kế, giảm search lại từ đầu. Bridge tốn space và phải được tạo lại khi merge. Hệ thống đổi random page update thành append/merge tuần tự, nhưng trả bằng read/space amplification và công việc compaction—cùng nhóm đánh đổi với LSM.

Hãy hình dung các tầng là những mảng đã sort. Tìm key trong mảng trên bằng binary search; tại vị trí gần key, bridge đưa ta xuống một khoảng nhỏ ở mảng kế tiếp. Mảng thấp hơn không cần binary search lại từ đầu, và khoảng cách giữa các bridge được khống chế bằng cách lấy mẫu phần tử từ tầng dưới đưa lên tầng trên. Ví dụ trong các dãy `[12, 24, 25, 30, 32, 34, 39]` và `[16, 22, 25, 26, 28, 30, 35]`, khi tìm `28`, lần tìm ở tầng đầu xác định đoạn quanh `25–30`; bridge giúp bắt đầu lần tìm tiếp theo gần vùng tương ứng. Đổi lại, các phần tử cầu và con trỏ chiếm chỗ, đồng thời phải được dựng lại khi run merge.

### Bw-tree: delta chain và mapping table

Bw-tree giữ base node bất biến và mỗi update thêm delta node mới vào đầu chain. Logical page ID đi qua mapping table in-memory để resolve tới physical base/delta mới nhất. Writer tạo delta rồi dùng compare-and-swap để thay mapping pointer; nếu hai writer cùng kỳ vọng pointer cũ, chỉ một CAS thành công, writer kia đọc lại và thử lại. Reader dựng trạng thái node bằng cách áp dụng delta từ mới tới base.

Khi chain dài, consolidate thành base mới rồi cập nhật mapping. Split có thể công bố sibling bằng split delta trước khi parent cập nhật; reader đi ngang nhờ link đó để không bỏ sót key. Merge cũng cần giai đoạn công bố nội dung hợp nhất rồi sửa parent. Page cũ không được giải phóng ngay vì reader lock-free có thể còn giữ pointer; epoch-based reclamation chờ mọi reader của epoch cũ kết thúc. “Lock-free” ở node update không xóa nhu cầu xử lý contention, retry, structural modification hay garbage collection.

Structural modification operation (SMO) vẫn cần nhiều bước. Khi split, engine hợp nhất delta để biết nội dung hiện tại, tạo sibling mới, thêm split delta chứa separator/link vào node cũ, rồi mới cài child pointer vào parent. Trong khoảng giữa hai bước cuối, reader có thể gặp trạng thái half-split và đi theo sibling link. Merge gắn nội dung node phải vào node trái trước rồi mới xóa liên kết tới node phải ở parent. Các thread có thể gặp SMO chưa xong và cùng giúp hoàn tất; abort delta trên parent tuần tự hóa những lần split/merge cạnh tranh. Đây là phối hợp qua trạng thái bất biến và CAS, không có nghĩa mọi structural change là một CAS duy nhất.

### Cache-oblivious: layout qua nhiều tầng cache

Cache-aware B-tree chọn node/page size theo một transfer unit; cache-oblivious layout cố hoạt động tốt mà không hard-code block/cache-line size. van Emde Boas layout đặt subtree liên quan vào đoạn liên tục đệ quy; cấu trúc dynamic có thể dùng packed array với gap phân bố theo density threshold. Insert cần dời phần tử để tạo gap; khi density quá cao/thấp, rebuild vùng. Đây là ý tưởng cho locality đa tầng, nhưng update/relocation và triển khai thực tế phức tạp, không mặc định là lựa chọn production.

## So sánh theo nơi trả chi phí

| Thiết kế | Ghi trả chi phí ở đâu? | Đọc trả chi phí ở đâu? | Dọn dẹp |
| --- | --- | --- | --- |
| COW | Copy path và giữ version cũ tạm thời | Reader chọn root version | Reclaim khi không còn reader cũ |
| Lazy buffers | Batch flush/reconcile nền | Merge base với delta buffers | Reconcile, split/merge |
| FD-tree | Append run rồi compaction nhiều tầng | Tìm nhiều run, bridge giúp giảm tìm lại | Merge tombstone và run |
| Bw-tree | Append delta và CAS mapping | Replay delta chain | Consolidate, epoch GC |
| Cache-oblivious | Relocate/rebuild vùng khi density lệch | Locality theo layout đệ quy | Rebuild packed region |

Không thiết kế nào bỏ được công việc; chúng chỉ dời công việc giữa foreground write, read path và maintenance. Chọn theo độ lệch read/write, latency tail, concurrency, memory, crash recovery và giới hạn space amplification.

Không có biến thể thắng mọi workload. COW hợp snapshot/read concurrency, lazy/delta phù hợp append-heavy hoặc write buffering, B-tree chuẩn có access predictability. Đánh giá cả p99, storage amplification, recovery, range scans và compaction.

*Database Internals*, ch. 2, 4 và 6, phân tích B-tree cơ bản, page split/merge và variants (LMDB, WiredTiger, FD-tree, Bw-tree, cache-oblivious). Xem thêm note [B-tree index và maintenance](./btree-indexes-and-maintenance).

## Tự kiểm tra

**Vì sao separator được đẩy lên parent khi leaf split?** Nó tạo ranh giới để search chọn đúng child.

**COW update có ghi đúng một page không?** Thường ghi các node trên root-to-leaf path rồi đổi root.

**Lazy update loại bỏ write amplification?** Không; nó dời và gom write, còn merge/reconciliation vẫn phải xảy ra.

---
title: "Buffer pool, page replacement và ARIES recovery"
category: "Database"
description: "Từ page cache, eviction policy và WAL semantics đến ba pha analysis, redo và undo của ARIES."
updated: 2026-10-18
translationKey: "database/buffer-management-and-aries-recovery"
---

Database không thể đọc page từ đĩa cho mỗi lần truy vấn, nên giữ page trong buffer pool. Buffer manager quyết định page nào ở RAM, pin trong lúc dùng, và khi thiếu chỗ page nào bị đẩy ra. Cùng lúc, recovery phải đảm bảo page bẩn không được ghi trước log cần thiết. Hai phần này liên kết chặt: eviction policy ảnh hưởng I/O, còn WAL protocol bảo vệ durability.

## Buffer hit, pin và dirty page

Khi query cần page, buffer pool tìm page ID. Hit thì dùng frame trong RAM; miss thì chọn frame có thể tái sử dụng, ghi page bẩn nếu cần rồi đọc page mới. Pin/reference count ngăn frame bị thay khi operation đang dùng; latch bảo vệ nội dung page khỏi concurrent mutation. Pin/latch không phải transaction lock.

Database có thể dùng buffer pool riêng thay vì để kernel page cache quản lý file. Nếu cả hai cache cùng giữ một page, dữ liệu có thể chiếm RAM hai lần và engine khó kiểm soát eviction; một số engine dùng direct I/O để tránh lớp cache của kernel. Đây là đánh đổi giữa quyền quản lý I/O/memory của database với yêu cầu alignment, behavior và durability của hệ điều hành/storage. Page đã pin phải chờ được unpin mới thành candidate; dirty page có thể được background writer flush trước khi cần tái sử dụng để tránh eviction phải chờ I/O ngay trên đường query.

### Hai lớp cache và cách chọn đường I/O

Hãy hình dung cùng một block dữ liệu có thể nằm trong buffer pool của database và kernel page cache. Hai bản cache có thể tránh được một số lần đọc vật lý, nhưng dùng RAM cho cùng dữ liệu và khiến engine khó dự đoán phần nào sẽ bị đẩy ra trước. `O_DIRECT` trên một số hệ điều hành giảm hoặc bỏ qua việc cache nội dung file ở kernel, giúp tránh double buffering; yêu cầu căn chỉnh địa chỉ/kích thước và hỗ trợ cụ thể phụ thuộc hệ điều hành, filesystem, thiết bị và engine.

`O_DIRECT` không đồng nghĩa dữ liệu đã bền trên thiết bị. Durability vẫn cần đường flush phù hợp như `fsync`/`fdatasync`, và thiết bị phải báo đúng trạng thái ghi. Vì vậy, đừng chọn direct I/O chỉ để tăng hit ratio hay vì một benchmark tổng quát. Ví dụ, MySQL 8.4 mô tả `innodb_flush_method` theo nền tảng và khuyến nghị đo trên workload, phần cứng giống production; PostgreSQL lại dựa vào cả `shared_buffers` lẫn cache của hệ điều hành. Đây là quyết định theo engine và workload, không phải quy tắc chung.

Kernel cũng có thể nhận gợi ý truy cập tuần tự/ngẫu nhiên qua `posix_fadvise`, nhưng gợi ý không buộc kernel phải giữ hay loại page nào. Memory mapping (`mmap`) cho phép chương trình truy cập file qua địa chỉ bộ nhớ, song page vẫn chịu sự quản lý của kernel page cache; ứng dụng database đổi bớt quyền tự quản lý cache/writeback lấy cách truy cập khác. Khi đọc tài liệu hoặc benchmark, hãy hỏi rõ đường I/O nào đang được dùng, cache nào được tính, và phép đo có lạnh/ấm cache hay không.

Dirty page đã đổi so với disk. Database có thể dùng steal (flush page chứa thay đổi chưa commit) hoặc no-steal; force (flush mọi page transaction khi commit) hoặc no-force. Steal cần undo để rollback dữ liệu chưa commit; no-force cần redo để phục hồi commit đã acknowledge nhưng data page chưa ghi. WAL thường phải bền trước dirty page (write-ahead rule).

Page cache tách địa chỉ logic của cây chỉ mục khỏi vị trí page trong RAM: nó nhận page ID, tìm frame đang chứa page hoặc đọc page từ địa chỉ lưu trữ tương ứng, rồi trả buffer cho storage engine. Vì page trong RAM có thể nằm ở frame bất kỳ, thứ tự frame không cần giống thứ tự page trên đĩa. Engine có thể **prefetch** các leaf kế tiếp khi range scan để I/O bắt đầu trước lúc query cần page. Ngược lại, page chỉ đọc cho một lần scan dài có thể được đẩy ra sớm; PostgreSQL dùng circular buffer cho một số sequential scan lớn. Pin các node gần root có thể giữ tầng trên của B-tree trong RAM, giảm số lần phải xuống đĩa. Các thay đổi cấu trúc được gom trong cache cũng có thể được ghi thành ít lần I/O hơn.

## FIFO, LRU, CLOCK và scan pollution

Chính sách thay page tác động đến số lần đọc đĩa, nhưng “thêm cache luôn giảm eviction” không đúng với mọi thuật toán: **Bélády’s anomaly** mô tả trường hợp tăng số frame lại làm tăng page fault với một số replacement policy. FIFO chỉ nhìn thứ tự page được nạp nên có thể đẩy root page ra trước dù root được dùng thường xuyên. LRU chuyển page vừa được truy cập về cuối hàng đợi, nhưng cập nhật danh sách trên mỗi hit có thể tranh chấp khi nhiều thread chạy đồng thời.

CLOCK-sweep đặt page cùng access bit trong vòng tròn. Kim đồng hồ bỏ qua page đang được tham chiếu; với page không được tham chiếu, bit 1 được hạ về 0 để cho page thêm một cơ hội, còn bit đã là 0 thì page có thể thành victim candidate. Cách quét này rẻ hơn exact LRU; circular buffer và compare-and-swap giúp cập nhật gọn, dù hành vi thực tế tùy biến thể. Chính sách hai hàng đợi như 2Q tách lần chạm đầu khỏi page đã được dùng lại; LRU-K dùng K lần tham chiếu gần nhất để ước lượng độ nóng.

LFU nhìn tần suất thay vì độ mới. TinyLFU dùng histogram gọn để ước lượng tần suất mà không cần lưu toàn bộ lịch sử. Trong mô hình của sách, page mới vào admission queue, page chưa chứng minh được khả năng tái sử dụng nằm ở probation, và page được truy cập lại có thể lên protected. Khi muốn giữ page mới, hệ thống so tần suất của nó với victim; page chỉ được giữ nếu có tín hiệu tái sử dụng tốt hơn. Protected đầy thì một page có thể quay về probation. Cơ chế này giúp scan một lượt ít lấn át page nóng, nhưng histogram bị giới hạn và workload đổi vẫn có thể làm dự đoán sai.

Sequential scan lớn có thể đẩy working set ra khỏi cache (scan pollution). Buffer pool có thể dùng scan-resistant region, pinning hoặc cơ chế riêng theo engine; application cũng có thể chunk query/giới hạn scan. Cache policy phải cân bằng workload, không chỉ tối đa hit ratio tổng.

## ARIES: analysis, redo, undo

ARIES là mô hình recovery dựa trên WAL với LSN, dirty-page table và transaction table. Sau crash:

1. **Analysis** bắt đầu từ checkpoint, tái dựng transaction đang chạy và page bẩn cùng `recLSN` sớm nhất.
2. **Redo** bắt đầu từ LSN nhỏ nhất cần thiết, lặp lại history để đảm bảo mọi update đã phản ánh vào page; pageLSN giúp bỏ qua record đã áp dụng.
3. **Undo** đi ngược log của transaction chưa commit, ghi compensation log record (CLR) để undo có thể resume nếu lại crash.

Ví dụ transaction ghi page A rồi page B, commit record chưa flush lúc crash. Recovery redo có thể phát lại cả hai update, sau đó undo transaction loser để state cuối không chứa thay đổi chưa commit. Transaction commit trước crash sẽ được redo kể cả page chưa flush.

### Theo dấu `recLSN`, `pageLSN` và CLR

Ba pha chỉ cho biết thứ tự lớn; để biết recovery quyết định trên từng record ra sao, hãy theo dõi một log nhỏ. Giả sử log có các record: LSN 10, T1 sửa page P từ 4 thành 5; LSN 20, T2 sửa page Q; LSN 30, T1 commit; LSN 40, T2 sửa P từ 5 thành 8; máy dừng trước khi T2 commit. Khi crash, P có thể đã nằm trên disk ở trạng thái LSN 10, còn Q có thể chưa được ghi.

**Analysis** đọc từ checkpoint, dựng transaction table (T1 đã commit, T2 còn hoạt động) và dirty page table. Nếu lần đầu P bị sửa là LSN 10 thì `recLSN(P)=10`; nếu Q lần đầu bị sửa ở LSN 20 thì `recLSN(Q)=20`. Giá trị `recLSN` là điểm sớm nhất mà page có thể thiếu một cập nhật, không phải LSN mới nhất của page. Vì vậy redo bắt đầu từ `min(recLSN)=10`, thay vì đọc log cũ hơn mà không page nào cần.

**Redo repeats history**, nên nó xét cả update của T2 dù T2 chưa commit. Với mỗi update hoặc CLR, trước hết record phải thuộc một page còn trong dirty page table và nằm ở/ sau `recLSN` của page. Sau đó recovery đọc page: nếu `pageLSN` trên page đã bằng hoặc lớn hơn LSN của record, thay đổi ấy đã có mặt và được bỏ qua; nếu nhỏ hơn, recovery áp dụng redo rồi đặt `pageLSN` bằng LSN vừa áp dụng. Trong ví dụ, P đang ở LSN 10 nên record 40 được phát lại thành giá trị 8. Đây không phải commit nhầm T2: mục tiêu redo là tái tạo đúng trạng thái ngay tại thời điểm crash trước khi loại bỏ transaction chưa hoàn tất.

**Undo** chỉ xử lý loser như T2. Nó lần theo `prevLSN` của T2 theo thứ tự ngược, hoàn tác update P rồi update Q. Mỗi thao tác hoàn tác tạo một **compensation log record (CLR)** có thể redo nhưng không bị undo lần nữa; CLR lưu `undoNextLSN`, tức record trước đó mà lần undo tiếp theo cần xử lý. Nếu crash sau khi ghi CLR cho LSN 40 nhưng trước khi undo LSN 20, recovery redo CLR để giữ P ở giá trị 5, rồi khi undo tiếp tục từ `undoNextLSN=20`. Nhờ vậy lần recovery sau không hoàn tác P lần thứ hai.

`recLSN` thu hẹp vùng scan; `pageLSN` ngăn áp dụng cùng thay đổi hai lần lên một page; CLR ghi lại tiến độ undo. Ba mốc trả lời ba câu hỏi khác nhau, nên không thể thay một mốc bằng mốc kia. Đây là walk-through giải thích chi tiết ARIES từ mô hình chương 5; thuật toán đầy đủ còn quy định cấu trúc transaction table, dirty page table, log chain, fuzzy checkpoint, partial rollback và các quy tắc WAL. Xem [bài báo ARIES gốc](https://www.cs.cmu.edu/~15849g/readings/mohan92.pdf).

Trong pha Redo, mỗi log record được kiểm tra theo thứ tự; các điều kiện sau giúp tránh đọc hoặc áp dụng thừa:

| Record muốn redo | Quyết định | Lý do |
| --- | --- | --- |
| Page không có trong dirty page table | Bỏ qua | Recovery không ghi nhận cập nhật nào có thể còn chưa flush cho page này kể từ checkpoint. |
| LSN của record nhỏ hơn `recLSN(page)` | Bỏ qua | Record trước mốc này không thể là cập nhật đầu tiên còn thiếu trên page. |
| `pageLSN` trên disk ≥ LSN của record | Bỏ qua | Page đã chứa record đó hoặc một thay đổi mới hơn. |
| Page còn dirty, record ≥ `recLSN`, và `pageLSN` nhỏ hơn record | Áp dụng redo | Đây là thay đổi có thể còn thiếu để phục hồi trạng thái tại thời điểm crash. |

Đây là thứ tự kiểm tra ở mức page; recovery còn xét loại record, log chain và trạng thái transaction. `recLSN` giới hạn vùng log có thể cần xem, còn `pageLSN` quyết định page cụ thể đã nhận thay đổi hay chưa.

Ba mốc thường bị nhầm: **log record đã được tạo**, **log đã được flush bền**, và **data page đã được flush**. WAL yêu cầu log liên quan phải bền trước khi page bẩn được ghi; commit policy quyết định lúc nào ACK được gửi. `pageLSN` cùng checksum giúp nhận biết replay/torn-page issues nhưng không bù cho storage giả vờ đã flush khi chưa bền.

Checkpoint giảm phần log phải scan nhưng không phải snapshot toàn database hay ranh giới bỏ được WAL cũ ngay lập tức. Log truncation phụ thuộc checkpoint, backup/replication và consumer cần log.

Trong fuzzy checkpoint kiểu ARIES, hệ thống ghi `begin_checkpoint`, tiếp tục cho transaction chạy, rồi ghi `end_checkpoint` có transaction table và dirty-page table. Log header chỉ trỏ tới checkpoint sau khi phần cần thiết đã được hoàn tất theo protocol. Vì page có thể được flush bất đồng bộ, recovery vẫn dùng `recLSN` của dirty page để biết redo phải bắt đầu từ đâu; checkpoint không khẳng định mọi page trước đó đã sạch. Fuzzy checkpoint giảm thời gian dừng ghi so với dừng hệ thống để flush toàn bộ, đổi lại recovery phải xử lý checkpoint table và phần log còn liên quan.

## Thay đổi semantics log

WAL là cấu trúc append-only; mỗi record nhận một **LSN** tăng đơn điệu. Record được gom trong log buffer rồi flush tuần tự. Transaction chỉ được xác nhận commit sau khi log đã bền tới commit LSN. Điều này khác với data page đã được ghi: transaction có thể commit trong khi page vẫn dirty trong cache. Checkpoint giúp thu hẹp log cần đọc khi khởi động, nhưng log chỉ được cắt bỏ khi mọi page cần thiết đã được đồng bộ và không còn backup, replica hay consumer nào cần đoạn log đó. Fuzzy checkpoint ghi điểm bắt đầu và kết thúc cùng transaction table và dirty-page table; transaction vẫn tiếp tục trong lúc checkpoint chạy.

**Physical log** lưu before/after image hoặc byte change của page; redo trực tiếp nhưng gắn với layout. **Logical log** lưu thao tác như “thêm record X cho key Y”; nó diễn tả undo ở mức thao tác nhưng phải định nghĩa trạng thái được phép áp dụng và bảo toàn thứ tự/idempotence. Engine có thể phối hợp logical undo với physical redo. Shadow paging là lựa chọn khác: ghi page mới theo copy-on-write rồi công bố bằng cách chuyển con trỏ từ bản cũ sang bản mới.

Durability còn phụ thuộc việc hệ điều hành và thiết bị lưu trữ thật sự thực hiện flush. `fsync` yêu cầu đồng bộ dữ liệu xuống storage, nhưng lỗi I/O và cách hệ điều hành báo lỗi có thể tinh vi; database phải thiết kế, kiểm tra và phản ứng với lỗi flush thay vì giả định một lời gọi thành công chứng minh mọi page đã được ghi đúng.

### Lỗi `fsync` có thể đến muộn và phụ thuộc hệ điều hành

Với buffered I/O, một lệnh `write` có thể chỉ đưa dữ liệu vào page cache của kernel. Lỗi thật chỉ xuất hiện khi kernel ghi page đó ra thiết bị; vì thế ứng dụng có thể nhìn thấy lỗi ở một lần `fsync` sau đó, thậm chí từ file descriptor khác đang mở cùng file. Trên Linux, kernel 4.13 cải thiện cơ chế ghi nhớ và báo lỗi writeback: phần lớn filesystem cục bộ báo lỗi cho các descriptor đang mở khi lỗi được ghi nhận. Descriptor mở sau đó không nhất thiết nhìn thấy lỗi cũ; filesystem mạng có thể theo dõi chính xác descriptor gây ghi lỗi hơn. Vì vậy hành vi không thể khái quát cho mọi filesystem và phiên bản.

Đây không chỉ là vấn đề log cảnh báo. Sau writeback failure, một số hệ điều hành có thể không biết chính xác dữ liệu nào còn ở page cache; gọi `fsync` lần nữa có thể báo thành công dù write trước đã bị quên. PostgreSQL 14 mặc định `data_sync_retry=off`: lỗi flush data file dẫn tới PANIC và dừng server để tránh tiếp tục dựa trên trạng thái không chắc chắn. Bật `data_sync_retry` cho phép server báo lỗi rồi thử flush ở checkpoint sau, nhưng chỉ nên cân nhắc sau khi hiểu semantics của OS/storage. Tài liệu PostgreSQL 14 cũng cảnh báo riêng rằng khi đồng bộ các file trước crash recovery, Linux trước 5.8 có thể không báo một số lỗi I/O cho PostgreSQL; thông báo có thể chỉ nằm trong kernel log. Khi flush fail, xử lý nguyên nhân phần cứng/filesystem và phục hồi bằng WAL theo runbook; đừng coi lần `fsync` retry thành công là bằng chứng dữ liệu đã an toàn.

Đoạn này tách ba điểm thường bị gộp: write được kernel nhận, lỗi writeback được quan sát, và dữ liệu thực sự bền trên thiết bị. Đọc [PostgreSQL 14 error handling](https://www.postgresql.org/docs/14/runtime-config-error-handling.html), [Linux `fsync(2)`](https://man7.org/linux/man-pages/man2/fsync.2.html), và [Linux VFS writeback errors](https://www.kernel.org/doc/html/latest/filesystems/vfs.html#handling-errors-during-writeback) theo đúng OS/filesystem triển khai.

Recovery phải xử lý torn page, checksum, partial write, doublewrite/copy-on-write và disk flush semantics theo engine. Vì vậy WAL, checkpoint và buffer eviction là một protocol chung: page dirty không thể bị quên trước khi log còn khả năng tái tạo hoặc hoàn tác thay đổi.

*Database Internals*, ch. 5, dùng ARIES làm khung recovery và phân tích cache replacement. Đối chiếu engine-specific semantics trong [InnoDB redo log](https://dev.mysql.com/doc/refman/8.4/en/innodb-redo-log.html), [`innodb_flush_method` của MySQL 8.4](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html#sysvar_innodb_flush_method), [PostgreSQL 14 resource consumption](https://www.postgresql.org/docs/14/runtime-config-resource.html), [Linux page cache](https://docs.kernel.org/6.10/mm/page_cache.html), [PostgreSQL WAL](https://www.postgresql.org/docs/current/wal-intro.html) và [SQLite atomic commit](https://www.sqlite.org/atomiccommit.html).

## Tự kiểm tra

**Vì sao no-force cần redo?** Commit có thể bền nhưng page của nó chưa được flush trước crash.

**Vì sao steal cần undo?** Page có thể chứa thay đổi chưa commit đã được ghi xuống disk.

**CLOCK là LRU chính xác?** Không; đó là xấp xỉ ít overhead hơn.

---
title: "Shared buffer, eviction và WAL mode PostgreSQL"
category: "Database"
description: "Hiểu clock-sweep buffer cache, bulk I/O, checkpoint, full-page image và các mức wal_level."
updated: 2026-10-18
translationKey: "database/postgresql-buffer-cache-and-wal-modes"
---

PostgreSQL đọc page vào shared buffers rồi backend thao tác trên buffer; kernel page cache có thể giữ thêm bản file. Một buffer hit không nói dữ liệu ở CPU cache, còn một `shared read` không chắc tạo physical disk read. Khi chẩn đoán, tách buffer hit/read, OS cache và storage I/O.

## Buffer lookup và clock sweep

Shared buffer directory ánh xạ relation/fork/block sang buffer ID. Backend pin buffer khi dùng; buffer có thể bị thay khi không pin. PostgreSQL dùng clock-sweep với usage count làm xấp xỉ recency thay vì exact LRU. Victim selection cần buffer không pin; nếu tất cả bị pin hoặc dirty page không flush kịp, backend có thể chờ.

Page dirty cần WAL flush trước khi data page được ghi. Background writer chủ động ghi buffer để giảm backend tự flush; checkpointer ghi tập page liên quan checkpoint. Too many tiny checkpoints tăng I/O; quá ít có thể tạo write burst/recovery dài. `max_wal_size` là target mềm, checkpoint còn do timeout/force conditions.

## Bulk scan và local buffers

Sequential scan lớn có thể đẩy các page hữu ích khỏi cache. Trong phần triển khai PostgreSQL 14 mà sách mô tả, bulk-read ring được dùng cho sequential scan khi bảng lớn hơn `shared_buffers / 4`; ring là 32 page, nên một bảng 4.097 page được đọc qua scan chỉ giữ khoảng 32 page trong shared cache. Index scan không dùng ring này và có thể đưa cả bảng lẫn index vào cache. Các ngưỡng/kích thước là chi tiết implementation của phiên bản và cấu hình trong sách, không phải cam kết phổ quát cho mọi release.

Ring không khóa page trong một cache riêng: page vẫn nằm trong shared buffers và thao tác khác có thể dùng chúng. Khi vòng định tái sử dụng một buffer đang pin hoặc có usage count cao, nó tách buffer đó khỏi ring rồi lấy buffer khác; scan không phải chờ ghi một dirty page chỉ để lấy chỗ. Hai sequential scan đồng thời có thể cùng dùng ring hiện có để tránh I/O dư. Bulk-write ring trong ví dụ sách áp dụng cho `COPY`, `CREATE TABLE AS SELECT`, materialized-view creation và một số table rewrite; mặc định 16 MB nhưng bị giới hạn tối đa bằng `shared_buffers / 8`. Vacuum có ring riêng 256 KiB (32 page) khi scan toàn bảng mà không dùng visibility map. Ring cũng không luôn giúp: `UPDATE`/`DELETE` làm page liên tục dirty, còn toasted values đi theo index nên bỏ qua bulk-read ring.

Temporary table dùng local buffers riêng thay shared buffers. `pg_prewarm` có thể nạp dữ liệu trước, nhưng page vẫn có thể bị eviction; warm chỉ có ích nếu working set phù hợp với cache và OS/storage state được hiểu. Với PostgreSQL 14, `pg_prewarm` còn có autoprewarm worker: khi module được nạp qua `shared_preload_libraries`, worker ghi định danh các page trong shared buffers vào `autoprewarm.blocks` định kỳ và nạp lại chúng sau restart. Đây là danh sách page để làm nóng cache, không phải snapshot chứa dữ liệu hay lời hứa rằng page vẫn resident; xem [PG14 pg_prewarm docs](https://www.postgresql.org/docs/14/pgprewarm.html).

Buffer hit ratio riêng lẻ không chứng minh performance: data có thể ở OS cache, query có thể hit nhiều buffer nhưng CPU-heavy, hoặc cache miss là expected scan. Đọc `EXPLAIN (BUFFERS)`, `pg_stat_io`/stats theo version và host I/O cùng nhau.

## WAL record và checkpoint

WAL record có record header, resource manager info và payload; logical position LSN tăng theo byte stream. Checkpoint ghi redo point, flush buffer cần thiết và lưu control state. Crash recovery bắt đầu từ checkpoint redo point và replay WAL. Full-page image sau checkpoint chống torn page; `wal_compression` có thể giảm WAL bytes nhưng dùng CPU.

`fsync=off` có thể gây unrecoverable corruption sau OS crash/power loss; `synchronous_commit=off` có nghĩa commit có thể mất gần đây nhưng database vẫn recoverable. `full_page_writes=off` giảm WAL nhưng storage torn-write assumption trở thành rủi ro. Không dùng các setting này như tuning thông thường.

## WAL levels

`wal_level=minimal` sinh đủ WAL cho crash recovery trong workload/operations hỗ trợ nhưng không hỗ trợ streaming replication/PITR giống `replica`; `logical` bổ sung thông tin cần cho logical decoding và tăng WAL. Giá trị thấp hơn có thể bị ràng buộc khi bật archive/replication/slot. Kiểm tra docs release hiện hành và downtime/restart requirement.

Đo WAL bytes, checkpoint timing, `pg_stat_bgwriter`/`pg_stat_checkpointer` và `pg_stat_wal` theo release. Khi WAL tăng, tìm bulk update/index build/full-page images/replication slot retention thay vì chỉ tăng disk.


### Ba mức wal_level giữ lại những gì?

Có thể xem `wal_level` như lượng thông tin WAL giữ để phục vụ các nhu cầu ngày càng rộng. `minimal` giữ crash recovery cho các thao tác được hỗ trợ nhưng bỏ log row-level cho một số bulk operation trên relation mới tạo hoặc vừa truncate trong cùng transaction; dữ liệu của thao tác được ghi trực tiếp theo quy trình riêng. Trace trong sách: `TRUNCATE`, sau đó insert nhiều row trong cùng transaction vượt `wal_skip_threshold`, rồi commit. `pg_waldump` thấy file relation được tạo, thay đổi catalog/index và commit, nhưng không thấy record cho toàn bộ data load. Nếu thao tác crash giữa chừng, transaction/catalog chưa commit nên dữ liệu mới không được coi là hợp lệ.

Điều này khiến `minimal` không phù hợp với PITR hay physical replication: backup có thể cần replay WAL qua nhiều checkpoint, còn replica cần nhận mọi thay đổi dữ liệu cùng thông tin transaction/lock để phục vụ snapshot nhất quán. `replica` bổ sung thông tin standby, như trạng thái transaction đang chạy và lock cần thiết; đây là mức phổ biến cho archive/streaming standby. `logical` bổ sung thông tin để logical decoding và logical replication. Các mức cao hơn bao gồm thông tin của mức dưới, nhưng có thể tạo nhiều WAL hơn.

Trong PostgreSQL 14, đổi `wal_level` cần restart; mức `minimal` còn không tương thích với một số cấu hình replication như `max_wal_senders` khác 0. Mọi ngưỡng và điều kiện cụ thể phụ thuộc release. Đừng giảm level chỉ để tiết kiệm disk khi còn cần archive/PITR, replica vật lý, hoặc logical consumer. `wal_level` cũng không phải nút “độ bền”: crash recovery vẫn là nhu cầu khác với lượng thông tin cần để sao chép/giải mã.

*PostgreSQL Internals 14*, Part II, giải thích buffer design/hit/miss/eviction, checkpoints, background writer và WAL levels. Tham khảo [WAL configuration](https://www.postgresql.org/docs/current/runtime-config-wal.html), [resource consumption](https://www.postgresql.org/docs/current/runtime-config-resource.html), [monitoring I/O](https://www.postgresql.org/docs/current/monitoring-stats.html).


## Đọc sâu Chapters 9–11: cache miss, checkpoint và durability

### Một lần đọc đi qua hai cache

Mỗi shared buffer có tag định danh relation/fork/block, trạng thái dirty, pin count và usage count. Backend tra buffer mapping để biết page đã resident chưa. Pin giữ buffer khỏi bị chọn làm victim trong lúc backend đang sử dụng; content lock phối hợp đọc/ghi nội dung page; mapping/buffer-header locks bảo vệ metadata rất ngắn. Đây là các mức đồng bộ khác nhau: pin không phải row lock, content lock không phải transaction lock.

Khi miss, backend cần một buffer trống hoặc victim qua clock sweep. Sweep giảm usage count rồi chọn buffer không pin; dirty victim phải được ghi trước khi tái sử dụng. PostgreSQL có thể dùng OS page cache bên dưới nên `shared read` chỉ nói page không có trong shared buffers, không chứng minh thiết bị vật lý đã đọc. Vì vậy đặt `shared_buffers` theo một công thức cố định hoặc chỉ nhìn hit ratio dễ sai. Hãy so working set, `EXPLAIN (BUFFERS)`, cache hit/miss, OS memory và I/O theo workload.

Bulk scan có thể dùng ring buffer để hạn chế quét một bảng lớn đẩy hot pages khỏi cache. Backend chia sẻ ring với thao tác phù hợp nếu cùng scan; temporary relation có local buffer pool; `pg_prewarm` nạp trước dữ liệu nhưng không bảo đảm nó ở lâu hay storage đã warm. Cache warming chỉ đáng làm khi biết nhóm page thường được truy cập và đã đo cold-start.


### Theo dấu cache hit, cache miss và pin

Buffer lookup dùng khóa ghép từ relation file, fork và block number để tìm buffer ID trong hash table. Hash table giúp tìm nhanh một page cụ thể; nó không tự liệt kê thuận tiện mọi page của một relation, nên khi cần loại toàn bộ page khỏi cache PostgreSQL còn phải có đường xử lý riêng. Nếu tìm thấy entry, backend pin buffer rồi mới dùng page. Nhiều backend có thể cùng pin một buffer; khi pin count còn lớn hơn 0, buffer không được thay bằng page khác. Pin bảo vệ vòng đời buffer, còn content lock bảo vệ nội dung page — hai khái niệm này không thay thế nhau.

Có thể đọc `EXPLAIN (ANALYZE, BUFFERS)` như một trace nhỏ. Nếu plan báo `shared hit=1`, page cần cho scan đã có trong shared buffers. Sau restart cache rỗng, lần đọc tương tự có thể báo `shared read=1`; điều đó có nghĩa PostgreSQL phải đưa page vào shared buffers. Vì PostgreSQL dùng buffered I/O, dữ liệu vẫn có thể đến từ OS page cache chứ chưa chắc từ thiết bị vật lý. Một scan còn có thể làm page dirty nếu nó cập nhật hint bit. Vì vậy, `hit`, `read`, `dirtied` nói về thao tác buffer của PostgreSQL, không phải phép đo đầy đủ I/O ở tầng thiết bị.

Pin count và usage count cũng khác nhau. Pin đang giữ buffer không bị thay; usage count cho clock-sweep biết page đã được dùng gần đây đến mức nào. Ví dụ sách quan sát page có usage count tăng sau khi đọc, rồi mở cursor để giữ pin khi cursor còn cần page. Khi VACUUM thường gặp một page đang pin, nó có thể bỏ qua page đó trong lượt hiện tại; thao tác cần quyền cleanup/freeze mạnh hơn có thể phải chờ pin được thả. Khi cursor đóng hoặc transaction kết thúc, pin giảm về 0. INSERT có thể sửa page đang resident và đánh dấu buffer dirty; PostgreSQL thường trì hoãn ghi page đó xuống file để gộp công việc đọc/ghi.

Khi không còn free buffer, clock hand đi qua các buffer, giảm usage count và chọn buffer không pin có count về 0. Page có count cao được thêm cơ hội ở lại cache; đây là xấp xỉ recency/frequency chứ không phải LRU chính xác. Nếu victim dirty, nó phải được ghi trước khi buffer được tái sử dụng. Khi chưa có victim phù hợp, sweep có thể đi thêm vòng; pin lâu hoặc ghi dirty chậm đều có thể tăng chờ. Theo dõi cache theo relation có thể dùng `pg_statio_*`; đo thời gian I/O phụ thuộc cấu hình `track_io_timing` ở phiên bản tương ứng.

Sách cũng đặt shared buffer cạnh OS page cache. PostgreSQL 14 đọc/ghi relation qua buffered file I/O, nên một page miss trong shared buffers vẫn có thể được phục vụ từ RAM của hệ điều hành. Direct I/O và asynchronous I/O được bàn như một hướng kiến trúc để giảm sao chép và chờ, nhưng chúng đòi hỏi xử lý riêng prefetching và khác biệt giữa các OS; đừng đọc đoạn thảo luận này như mô tả đường I/O PostgreSQL 14 đang dùng.


### Chọn kích thước cache và làm ấm có đo lường

Kích thước `shared_buffers` không có con số đúng cho mọi máy. Mục tiêu lý tưởng là working set thường dùng vừa trong cache, đồng thời chừa chỗ cho dữ liệu chỉ đọc một lần. Cache quá nhỏ khiến các page nóng đẩy nhau ra; cache quá lớn lại lấy RAM khỏi OS cache và làm tăng chi phí quản lý. Sách nêu 1/4 RAM như điểm bắt đầu để thử nghiệm, không phải công thức bắt buộc. Hãy kiểm tra workload đại diện trên môi trường gần production, thay đổi từng bước rồi so latency, I/O và eviction. `shared_buffers` được cấp phát lúc server khởi động nên thay đổi tham số cần restart.

`pg_buffercache` giúp xem buffer đang giữ relation nào, usage count ra sao và bao nhiêu phần trăm relation đang resident. Đây là ảnh chụp có thể dao động giữa các lần truy vấn; nên lặp lại vài lần, nhưng không polling liên tục vì extension phải chạm/khóa buffer để quan sát. Page có usage count lớn hơn một chỉ là một heuristic “đang nóng”, không phải khẳng định chính xác về tần suất nghiệp vụ. Ví dụ sách có thể cache toàn bộ table và index nhưng các page ấy ít được dùng sau khi scan; “đang nằm trong RAM” khác “đang được workload dùng thường xuyên”.

Sau restart, `pg_prewarm` có thể nạp trước page đã chọn vào shared buffers hoặc OS cache. Cơ chế autoprewarm của PostgreSQL 14 có thể ghi danh sách page ra `autoprewarm.blocks` và nạp lại sau lần khởi động kế tiếp; danh sách này chỉ định danh page cần làm nóng, không chứa nội dung page. Nạp cả relation chỉ hợp lý khi có căn cứ rằng working set sẽ dùng nó ngay; nếu không, việc prewarm có thể đẩy page quan trọng khác ra ngoài.

Temporary table dùng local buffer của session thay shared buffers. Cơ chế nhìn chung vẫn cần tra page, pin và eviction, nhưng không cần khóa metadata giữa process khác vì chỉ session sở hữu table đó truy cập. `temp_buffers` giới hạn local buffer memory cho mỗi session; nó khác `temp_file_limit`, vốn giới hạn file tạm dùng cho dữ liệu trung gian của query như sort/hash spill. Trong `EXPLAIN (BUFFERS)`, local hit/read không cùng nhóm với shared hit/read.

### WAL record và redo boundary

WAL record có header, transaction ID, resource manager và payload mô tả thao tác; một record có thể chạm nhiều block. LSN là byte position trong stream của toàn cluster, không phải transaction number. Page lưu `pd_lsn`: recovery so sánh LSN để tránh áp dụng redo đã có. Một page sau khi ghi mới cần đủ WAL bền vững đến LSN của page; data page có thể ghi sau commit.

Checkpoint chụp dirty page cần thiết và cập nhật redo point/control state sau khi đảm bảo thứ tự WAL-before-data. Khi crash, startup đọc checkpoint gần nhất, replay record từ redo point, và quyết định transaction chưa commit là aborted theo trạng thái xid. Checkpoint quá gần nhau tăng write amplification/full-page images; quá xa làm recovery lâu, giữ WAL nhiều và có thể tăng burst khi checkpoint buộc flush nhiều buffer. `checkpoint_timeout` và `max_wal_size` tác động nhưng là mục tiêu/trigger, không phải hard quota đơn giản.

### WAL mode là ranh giới bảo vệ

Commit đồng bộ thường phải đợi WAL flush, không phải heap page flush. Group commit cho nhiều transaction cùng chia một lần sync; async commit bỏ chờ local flush cho transaction đó, giảm latency nhưng có thể mất các commit gần nhất khi OS/máy sập. Nó không giống `fsync=off`: fsync off bỏ giả định độ bền cần cho recovery và có thể làm hỏng cluster sau power loss.

`full_page_writes` ghi full-page image đầu tiên sau checkpoint để recovery sửa torn write; `wal_log_hints` có thể làm tương tự cho hint-bit changes theo cấu hình. Data checksums giúp phát hiện hỏng page, không sửa được page và cần thiết lập phù hợp lúc initdb. WAL level `minimal`, `replica`, `logical` là các lượng thông tin khác nhau; chọn `logical` vì cần decoding/replication chứ không phải vì nó “bền hơn”. Những tên view, process metrics và tham số trong sách cần kiểm tra theo release PostgreSQL đang chạy; các mặc định thay đổi qua thời gian.

Trong thực hành, nối `pg_stat_wal`, checkpoint statistics, `pg_stat_io`/I/O counters của version, `pg_stat_database` và OS metrics; so bytes WAL mỗi transaction, checkpoint duration, backend fsync và latency commit. PostgreSQL 14 refs: [buffer configuration](https://www.postgresql.org/docs/14/runtime-config-resource.html), [WAL configuration](https://www.postgresql.org/docs/14/runtime-config-wal.html), [WAL internals](https://www.postgresql.org/docs/14/wal-internals.html), [reliability](https://www.postgresql.org/docs/14/wal-reliability.html).

## Tự kiểm tra

**Buffer hit có chứng minh page không đọc từ disk?** Không kết luận độc lập; OS page cache và các metric khác cũng liên quan.

**WAL `minimal` phù hợp standby streaming?** Không; replication cần WAL level phù hợp.

**Tắt fsync giống tắt synchronous_commit?** Không; fsync off có thể làm crash hỏng database, khác với mất commit gần đây.

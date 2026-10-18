---
title: "WAL, buffer cache và khôi phục trong PostgreSQL"
category: "Database"
description: "Theo đường ghi từ shared buffers đến WAL, checkpoint, crash recovery và khôi phục theo thời điểm."
updated: 2026-10-18
translationKey: "database/postgresql-wal-buffer-cache-and-recovery"
---

Một transaction PostgreSQL có thể báo commit trước khi mọi data page đã được ghi vào file heap. Điều đó vẫn an toàn nếu **Write-Ahead Log (WAL)** chứa đủ thông tin bền vững để phục hồi. WAL ghi lại thay đổi theo thứ tự; data page bẩn có thể được ghi sau. Đây là lý do WAL vừa là cơ chế crash recovery, vừa là nền tảng cho replication và point-in-time recovery.

## Shared buffers và WAL

Backend tìm page trong shared buffers; nếu page chưa có thì đọc vào. UPDATE thay đổi page trong RAM và đánh dấu dirty. Trước khi một dirty page được ghi ra storage, WAL record tương ứng phải được flush ít nhất đến LSN cần thiết: đó là quy tắc write-ahead. Khi commit đồng bộ, PostgreSQL chờ WAL commit record được flush theo durability setting; không cần flush ngay mọi heap page của transaction.

WAL được chia thành segment và record. LSN (Log Sequence Number) là vị trí logic tăng dần. Page lưu LSN gần nhất áp dụng; recovery có thể so sánh WAL và page để phát lại thay đổi phù hợp. `full_page_writes` giúp bảo vệ trước torn page bằng cách ghi ảnh page đầu tiên sau checkpoint; nó tăng lượng WAL nhưng không thay thế backup hay kiểm tra storage.


## WAL ghi gì, và record được tìm thế nào?

WAL cần ghi mọi thay đổi mà nếu mất trước khi page được flush thì có thể làm mất tính nhất quán: thay đổi page trong buffer cache, trạng thái commit/rollback, và các thao tác tạo/xóa file relation. Bảng unlogged và temporary table không có cùng bảo đảm crash-recovery như table logged; dữ liệu của chúng được xử lý theo vòng đời riêng. Hash index chỉ được WAL-log từ các phiên bản PostgreSQL mới hơn lịch sử ban đầu mà sách nhắc tới; đừng áp dụng chú thích cũ của sách cho release hiện hành.

Về logic, WAL là một luồng record có độ dài biến đổi. Header cho biết transaction liên quan, resource manager diễn giải record, độ dài/checksum và liên kết record trước; payload có thể là phần dữ liệu cần thay trên page. Resource manager của heap, từng loại index và transaction status biết cách đọc loại record của mình. WAL do đó không phải một tập câu SQL có thể đọc lại trực tiếp; `pg_waldump` là công cụ giải mã record để kiểm tra hoạt động ở mức thấp.

WAL buffer là vùng shared memory đệm record trước khi ghi ra WAL segment. `wal_buffers` điều khiển dung lượng theo release và có mặc định tự chọn; tăng quá mức không tự làm commit nhanh hơn nếu bottleneck ở nơi khác. Khi workload ghi thay đổi, `pg_current_wal_insert_lsn()` tiến lên. LSN là offset byte 64-bit trong stream cluster-wide, thường hiển thị dạng hai số hex cách nhau bởi dấu `/`; trừ hai giá trị `pg_lsn` cho biết lượng WAL byte được tạo trong khoảng đó.

Một trace theo sách: sau `UPDATE`, insert LSN tăng và `pageinspect` cho thấy `pd_lsn` trên heap page bằng LSN record cuối cùng đã sửa page. `COMMIT` tạo record tiếp theo nhưng có thể chưa ghi heap page xuống file. Nếu đo khoảng cách insert LSN trước/sau một workload, ta có thể ước lượng WAL bytes mỗi workload/thời gian — dữ liệu hữu ích khi lập kế hoạch checkpoint và archive, nhưng phải đo dưới traffic đại diện.

Trên đĩa, WAL nằm trong `pg_wal` thành các segment có tên mã hóa timeline và vị trí trong stream; segment size thường được xác lập lúc `initdb`, không phải tham số runtime tùy ý. `pg_walfile_name_offset()` ánh xạ LSN sang file/offset, `pg_ls_waldir()` liệt kê file và `pg_waldump` đọc record trong một LSN range. Đây là công cụ chẩn đoán; không sửa hoặc xóa thủ công WAL đang được cluster quản lý.

## Checkpoint đánh dấu một tập page, không đóng băng hệ thống

Ở đầu checkpoint, checkpointer ghi một số metadata ngắn và gắn tag cho những buffer đang dirty tại thời điểm bắt đầu. Sau đó nó duyệt các buffer có tag và ghi page; backend cũng có thể ghi một page trước checkpointer. Page không bị evict chỉ vì checkpoint ghi nó. Trong lúc chạy, transaction tiếp tục: page đã ghi có thể dirty lại, nhưng dirty mới đó không được tính vào tập tag của checkpoint đang diễn ra.

Checkpoint chỉ hoàn tất sau khi mọi page thuộc tập ban đầu đã được ghi. Khi đó PostgreSQL mới ghi checkpoint-completion record và cập nhật `pg_control` sang checkpoint hoàn tất; REDO point là LSN ở đầu checkpoint. Trước thời điểm hoàn tất, `pg_control` vẫn trỏ checkpoint trước. Vì vậy crash giữa chừng phải recovery từ mốc cũ hơn để không bỏ qua thay đổi mà một page trên đĩa còn cần.

Trong ví dụ sách, một UPDATE làm hơn 4.000 buffer dirty; `CHECKPOINT` khi hệ thống yên khiến số dirty buffer về 0. `pg_waldump` cho thấy completion record chứa redo LSN; `pg_controldata` hiển thị checkpoint location và REDO location tương ứng. Trên workload đang chạy, số dirty có thể tăng lại ngay trong hoặc sau checkpoint, nên không nên mong mọi buffer luôn ở trạng thái sạch.

## Checkpoint và crash recovery

Checkpoint không phải một lần dừng hệ thống rồi flush toàn bộ page cùng lúc. Ở đầu checkpoint, PostgreSQL ghi nhanh metadata cần thiết và đánh dấu các buffer đang dirty. Checkpointer sau đó ghi những page đã được đánh dấu; backend có thể ghi một page trước checkpointer. Trong lúc đó transaction vẫn tiếp tục và page mới có thể lại thành dirty, nhưng page mới không nằm trong tập đánh dấu của checkpoint này.

Chỉ khi mọi buffer dirty ở thời điểm bắt đầu đã được ghi xong thì checkpoint mới hoàn tất và điểm REDO mới được phép tiến tới checkpoint đó. `pg_control` tiếp tục trỏ checkpoint cũ cho đến lúc completion được ghi bền; crash giữa chừng vì vậy vẫn dùng redo point cũ, không bỏ qua WAL mà một page trên đĩa còn cần. Có thể hình dung: checkpoint A hoàn tất; checkpoint B bắt đầu đánh dấu page P; P được flush nhưng Q chưa xong thì server crash—recovery vẫn lấy A làm mốc. Nếu B hoàn tất trước crash, recovery mới dùng mốc của B. Xem [PG14 checkpoint docs](https://www.postgresql.org/docs/14/sql-checkpoint.html) và [control checkpoint fields](https://www.postgresql.org/docs/14/functions-info.html).

Checkpoint quá dày làm tăng I/O/WAL; quá thưa kéo dài recovery và cần nhiều WAL hơn. Background writer và checkpointer ghi dirty buffers; backend cũng có thể phải tự ghi page trong một số tình huống.

Sau crash, PostgreSQL đọc checkpoint gần nhất rồi replay WAL còn lại để đưa data files về trạng thái nhất quán. Vì vậy WAL chứa thông tin redo, không phải bản sao đầy đủ để tùy tiện phục hồi bất kỳ thời điểm nào. Muốn PITR cần base backup cộng với chuỗi WAL liên tục đến thời điểm mục tiêu.


## Startup recovery đọc WAL như thế nào?

Sau khi server khởi động, startup process đọc trạng thái cluster trong `pg_control`. Nếu lần dừng trước không sạch, nó bắt đầu redo từ REDO LSN của checkpoint hoàn tất gần nhất; khi khôi phục từ base backup, `backup_label` có thể cung cấp điểm bắt đầu theo backup. Startup đọc WAL theo thứ tự và áp dụng record lên page tương ứng. Với record thông thường, page LSN cho biết thay đổi đó đã có chưa: nếu page đã ở LSN mới hơn thì không replay lại thao tác cũ. Full-page image là trường hợp đặc biệt có thể thay toàn bộ page để sửa trạng thái torn write; transaction-status bit cũng có thể được đặt theo cách idempotent.

Recovery thao tác trên buffer cache tương tự cập nhật bình thường. WAL còn mô tả thao tác file để relation bị thiếu có thể được tạo lại theo đúng trình tự. Khi redo xong, PostgreSQL xử lý lại các relation unlogged theo initialization fork rồi chạy checkpoint để trạng thái vừa phục hồi được bảo vệ trên đĩa. Transaction đang chạy lúc crash không cần một pha “undo” riêng trong quy trình này: vì transaction không còn process sống và không có commit record, các row version của nó không được xem là committed.

Dừng `immediate` mô phỏng crash: cluster vẫn ghi trạng thái “in production”, nên lần start kế tiếp phải recovery. Dừng bình thường cho client kết thúc rồi tạo shutdown checkpoint; cluster được đánh dấu “shut down” và lần start kế tiếp không cần redo như sau crash. Dùng `pg_controldata` để xem trạng thái/checkpoint, log startup để đọc `redo starts`, `redo done`, và `pg_waldump` để quan sát record. Các thao tác này giúp hiểu recovery; không nên dùng cách kill/cắt điện trên production để thử.

## Background writer và checkpoint cùng giảm áp lực flush

Nếu backend cần victim là dirty page, backend có thể phải tự ghi page và chờ. Checkpointer xử lý page thuộc checkpoint, còn background writer (bgwriter) cố gắng làm sạch trước các buffer có khả năng bị eviction sớm. Trong mô tả sách cho PostgreSQL 14, bgwriter có clock hand riêng, không giảm usage count, và ghi page khi buffer không pin, dirty, usage count bằng 0. Như vậy eviction có cơ hội chọn victim đã sạch; bgwriter không thay thế checkpoint vì checkpoint phải bảo đảm tập page của mình đã bền trước khi REDO point tiến lên.

Checkpoint tuning cần cân bằng ba thứ: lượng WAL giữ lại, thời gian recovery chấp nhận được và khả năng ghi page của storage. `checkpoint_timeout` giới hạn thời gian giữa các checkpoint định kỳ; `max_wal_size` là ngưỡng mềm có thể kích hoạt checkpoint sớm khi workload tạo WAL nhanh. `checkpoint_completion_target` phân tán việc ghi trên khoảng thời gian giữa các checkpoint, giúp tránh burst; nó không nên được đặt mà không theo dõi liệu checkpoint trước có kịp hoàn thành hay không. Có thể dùng chênh lệch hai insert LSN để đo tốc độ WAL thực tế rồi suy ra khoảng WAL sinh ra trong một interval, thay vì lấy con số cấu hình sách áp vào mọi máy.

Trong PostgreSQL 14, log với `log_checkpoints` ghi số buffer được ghi, thời gian write/sync, WAL file được thêm/xóa/tái chế và khoảng cách WAL giữa các checkpoint. `pg_stat_bgwriter` cho biết checkpoint theo lịch (`checkpoints_timed`) so với checkpoint bị yêu cầu (`checkpoints_req`), buffer do checkpointer/bgwriter/backend ghi, backend fsync và số lần bgwriter chạm giới hạn `maxwritten_clean`. Nhiều checkpoint bị yêu cầu, hoặc backend tự ghi nhiều buffer so với hai tiến trình nền, là dấu hiệu cần kiểm tra workload, WAL target, storage và cấu hình. Tên view/cột đã thay đổi ở các PostgreSQL release mới, nên truy vấn dashboard phải theo version.

## Synchronous commit là ranh giới durability

`synchronous_commit` quyết định transaction đợi WAL local flush hay thêm điều kiện xác nhận từ synchronous standby theo cấu hình. Tắt local wait có thể giảm latency nhưng server crash có thể làm mất commit vừa trả thành công; dữ liệu vẫn nhất quán sau recovery nhưng ứng dụng có thể mất acknowledged transaction. Đồng bộ tới standby có ngữ nghĩa khác nhau tùy `synchronous_standby_names` và mức chờ; receipt, flush và apply không phải cùng một thời điểm.

Đừng diễn giải “commit thành công” tách khỏi durability policy, replication topology và failure domain. Kiểm tra setting ở session/database/server, standby state và tài liệu version đang chạy.


## Độ bền qua các cache của hệ điều hành và thiết bị

Một lệnh ghi thành công chưa chắc bytes đã nằm trên môi trường không mất dữ liệu. Dữ liệu có thể đang ở OS page cache, cache của thiết bị hoặc cache của controller; mỗi tầng có lịch flush riêng. PostgreSQL cần yêu cầu đồng bộ thực sự cho WAL commit record trước khi báo synchronous commit hoàn tất. Data page có thể flush muộn hơn, nhưng checkpoint cũng phải bảo đảm ghi data/file operation bền vững trước khi công bố checkpoint hoàn tất. Nếu controller có cache được bảo vệ bằng pin/battery, chính sách này có thể thay đổi hiệu năng mà vẫn giữ durability; nếu phần cứng báo flush thành công nhưng không thực hiện, phần mềm không thể tự khôi phục lời hứa đó.

`wal_sync_method` chọn cách đồng bộ WAL phù hợp với OS/filesystem; `pg_test_fsync` giúp đo các phương án trên máy đích. Chọn theo benchmark và bảo đảm của thiết bị thật, không theo kết quả máy khác. `fsync=off` bỏ yêu cầu đồng bộ mà recovery dựa vào, nên mất điện/crash có thể làm mất WAL cần thiết hoặc hỏng database. Đừng nhầm nó với `synchronous_commit=off`: chế độ sau cho phép mất một số transaction vừa được xác nhận nhưng vẫn giữ crash recovery đến trạng thái nhất quán.

## Synchronous và asynchronous commit khác nhau ở điểm chờ

Với synchronous commit, client đợi WAL commit record được flush bền vững trước khi nhận trả lời. Nhiều transaction có thể tận dụng group commit để chia sẻ chi phí sync. PostgreSQL 14 có `commit_delay`/`commit_siblings` để trì hoãn rất ngắn trong workload nhiều transaction ngắn nhằm gom thêm commit vào một lần sync; mặc định không chờ và chỉ nên cân nhắc sau khi đo.

Với `synchronous_commit=off`, client có thể nhận trả lời trước local WAL flush; walwriter ghi WAL nền theo chu kỳ. Điều này hạ latency ở một số workload, nhưng nếu máy sập có thể mất phần WAL gần nhất và các commit đã trả thành công trong khoảng đó. Sách dùng `3 × wal_writer_delay` như ước lượng bảo thủ theo thuật toán/configuration PostgreSQL 14 của ví dụ, không phải lời hứa thời gian mất dữ liệu cố định cho mọi cấu hình. WAL cần cho một dirty page sắp bị eviction vẫn có thể bị flush sớm để giữ quy tắc WAL-before-data. Có thể đặt mức commit theo transaction cho loại tác vụ chấp nhận rủi ro, nhưng phải phân loại theo invariant nghiệp vụ.

Sách đo một workload pgbench cụ thể và thấy async commit nhanh hơn đáng kể; số TPS/latency phụ thuộc máy, filesystem, số client và workload nên chỉ minh họa cơ chế, không phải mức tăng dự kiến. Luôn đo cả throughput, p95/p99 latency, acknowledged-transaction loss window và khả năng phục hồi trước khi đổi policy.

## Checksums phát hiện hỏng dữ liệu, không tự chữa nó

WAL record có checksum để phát hiện hỏng record; data checksums có thể phát hiện nhiều dạng hỏng page. Với PostgreSQL 14, checksum page được bật lúc `initdb` hoặc thao tác ngoại tuyến bằng `pg_checksums` khi server dừng. Nó chỉ được kiểm tra khi page được đọc; corruption có thể tồn tại lâu và đi vào mọi backup trước khi bị phát hiện. Một page toàn zero vẫn có thể trông hợp lệ, và checksum không bao phủ mọi file/fork như transaction-status storage. Vì vậy checksum bổ sung cho backup/replica/scrub, không thay thế chúng.

`full_page_writes` ghi một full-page image lần đầu page bị sửa sau checkpoint, để recovery có thể thay page torn trước khi áp dụng record nhỏ tiếp theo. FPI làm WAL tăng, nhất là ngay sau checkpoint; `wal_compression` có thể giảm bytes bằng CPU. Tỷ lệ FPI và lợi ích compression trong sách đến từ benchmark/pg_waldump cụ thể, không thể dự đoán giống nhau cho workload khác: nếu page được sửa lặp nhiều lần giữa các checkpoint, tỷ trọng FPI giảm. Đừng tắt `full_page_writes` chỉ để giảm dung lượng WAL. Nếu checksum báo lỗi, ưu tiên khôi phục từ bản sao lành; `ignore_checksum_failure` chỉ có thể giúp đọc thử một số page rủi ro và không sửa dữ liệu.

## WAL cho backup và replication

Physical streaming replication truyền WAL để standby replay cùng thay đổi; archive command có thể lưu WAL ra nơi bền vững. Replication slot giữ các WAL cần thiết cho consumer, nhưng slot bị bỏ quên có thể làm đĩa đầy. Logical decoding biến WAL thành change stream theo publication/subscription hoặc consumer khác; đây là giao diện dữ liệu có filtering/replica identity và giới hạn riêng, không phải raw byte copy.

PITR cần backup base nhất quán, WAL archive đầy đủ, timeline/target phù hợp và quy trình restore đã diễn tập. Chỉ bật archive mà không theo dõi khoảng trống, dung lượng và khả năng khôi phục chưa tạo thành backup đáng tin.

## Quan sát và cấu hình

Theo dõi `pg_stat_wal`, checkpoint statistics, tốc độ WAL, replication lag, retained bytes, buffer hit, dirty buffers và I/O. Thay `shared_buffers`, `wal_buffers`, `max_wal_size`, `checkpoint_timeout` hay `synchronous_commit` theo workload và ràng buộc durability; không dùng một cấu hình mẫu như con số tối ưu phổ quát. Đo latency commit cùng throughput và recovery time.

*PostgreSQL Internals 14*, Part II, trình bày shared buffers, WAL, checkpoints và recovery. Tài liệu hiện hành: [WAL introduction](https://www.postgresql.org/docs/current/wal-intro.html), [WAL configuration](https://www.postgresql.org/docs/current/runtime-config-wal.html), [continuous archiving and PITR](https://www.postgresql.org/docs/current/continuous-archiving.html), [streaming replication](https://www.postgresql.org/docs/current/warm-standby.html).

## Tự kiểm tra

**Vì sao commit có thể xong trước khi heap page được ghi?** WAL commit record đã được flush theo policy; dirty page có thể được ghi sau và phục hồi bằng replay.

**WAL archive một mình có đủ phục hồi PITR?** Không; cần base backup và WAL liên tục từ backup đến mục tiêu.

**Synchronous replication luôn đợi standby apply transaction?** Không. Điều kiện đợi phụ thuộc cấu hình; nhận, flush và apply là các mốc khác nhau.

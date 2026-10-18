---
title: "Replication, mở rộng và high availability trong MySQL"
category: "Database"
description: "Hiểu binary log, GTID, replica lag, read scale-out, sharding và các lựa chọn HA của MySQL cùng giới hạn failover của từng mô hình."
updated: 2026-10-18
translationKey: "database/mysql-replication-scaling-and-ha"
---

Thêm một MySQL replica có thể tăng capacity đọc và tạo thêm bản dữ liệu để phục hồi. Nhưng replica không tự động là backup, synchronous copy hay failover an toàn. Trước khi triển khai, cần quyết định ghi được xác nhận khi nào, replica có thể trễ bao lâu, ai promote primary và ứng dụng gửi traffic sang node mới bằng cách nào.

## Binary log đưa transaction tới replica

Source ghi event vào binary log. Replica receiver đọc event và ghi relay log; applier thực thi thay đổi. Với **statement-based replication**, log ghi câu lệnh; kết quả có thể lệch nếu statement phụ thuộc nondeterminism, thứ tự hoặc môi trường. Với **row-based replication**, log ghi row change; event rõ hơn nhưng có thể lớn. **Mixed** chọn format theo trường hợp. Chọn format theo semantics, volume, compatibility và khả năng debug.

Replication mặc định bất đồng bộ: source commit và trả lời trước khi biết replica đã nhận hay apply event. Replica lag có hai phần: event chưa được nhận và event đã nhận nhưng chưa apply. Read từ replica có thể stale; read-after-write có thể cần đọc từ source, chờ GTID đã apply hoặc dùng chính sách consistency phù hợp.

`SHOW REPLICA STATUS`, Performance Schema replication tables và error log giúp theo dõi receiver/applier, source connection, worker errors và delay. Lag theo giây có thể không đáng tin khi workload ngừng ghi; theo dõi GTID/position và thời gian transaction cuối cùng khi cần.

### Nhận event và apply event là hai hàng đợi riêng

Trên source, một binlog dump thread gửi event cho mỗi kết nối replica. Trên replica, receiver/I/O thread ghi event xuống relay log; applier/SQL thread đọc relay log rồi thực thi transaction. Receiver chạy nhanh không có nghĩa applier theo kịp. Nếu relay log tăng liên tục nhưng transaction apply không tăng tương ứng, điểm nghẽn nằm ở apply hoặc tài nguyên của replica. MySQL hiện hỗ trợ parallel applier workers cho các transaction có thể chạy song song; thứ tự commit, xung đột trên cùng dữ liệu và transaction lớn vẫn giới hạn mức song song.

Thông báo `START REPLICA` thành công chỉ cho biết lệnh đã khởi động thread; thread có thể chưa kết nối được source hoặc dừng ở event lỗi ngay sau đó. Kiểm tra trạng thái channel, error log và worker errors sau khi khởi động. Tên biến/lệnh đổi từ `slave` sang `replica` trong các bản hiện hành, dù một số tên cũ vẫn có thể xuất hiện trong metadata và compatibility interfaces.

### Khởi tạo replica cần khớp snapshot với log position

Replica mới phải bắt đầu từ snapshot nhất quán của source và biết chính xác binary log position hoặc GTID set tương ứng. Nếu lấy file copy tại một thời điểm nhưng lấy position tại thời điểm khác, replica có thể bỏ mất hoặc chạy lặp thay đổi. Dùng cơ chế snapshot/backup tạo được cặp dữ liệu và vị trí đồng nhất; giữ binary logs đủ lâu để replica bắt kịp; sau đó kiểm tra đã apply tới transaction mong muốn.

Replication account chỉ cần quyền replication cần thiết, dùng mật khẩu/TLS theo môi trường và không dùng account quản trị chung. `server_id` phải duy nhất trong topology. Lưu cấu hình source, vị trí, snapshot identifier, GTID set, filter và bước kiểm tra thành runbook có thể lặp lại; `SHOW REPLICA STATUS` báo thread chạy không chứng minh dữ liệu đã hoàn toàn đúng.

### Chọn format log và hiểu giới hạn filter

Statement-based ghi statement SQL nên có thể tiết kiệm binlog, nhưng kết quả cần giống nhau trên source và replica. Random value, thời gian, thứ tự không ổn định, trigger, SQL mode, collation hoặc khác biệt engine có thể làm hai bên nhận kết quả khác. Row-based ghi row changes nên thường tái hiện kết quả xác định hơn, nhưng log có thể lớn, nhất là khi cập nhật nhiều cột/row; nó cũng ảnh hưởng cách xem lại log và khôi phục dữ liệu. Mixed chọn cách ghi theo loại statement. Đừng chọn chỉ theo dung lượng; kiểm tra semantics, bandwidth, retention và công cụ recovery.

Replica có thể ghi tiếp transaction đã nhận vào binary log của chính nó bằng `log_replica_updates`, để downstream replica đọc tiếp. Mọi server cần ID duy nhất để chặn event quay vòng. Replication filter theo database/table tạo replica không đầy đủ: nếu promote node đó làm source, phần bị filter không tự xuất hiện. Đặt filter từ lúc thiết kế topology, ghi rõ dữ liệu node có và không có, và kiểm tra câu cross-database/DDL theo format log.

## Setup, log và durability của replication

### File log và độ bền của luồng replication

Ở source, transaction đã commit được ghi thành chuỗi binlog event theo thứ tự commit mà replication cần bảo toàn. Receiver trên replica yêu cầu event từ vị trí hoặc GTID đã biết rồi ghi vào relay log; applier đọc relay log và áp thay đổi vào storage engine. Hai luồng độc lập nên relay log có thể tăng dù receiver vẫn nhận đều: backlog khi đó nằm ở apply, không phải mạng.

Binlog vừa là nguồn để replica tiếp tục đọc, vừa phục vụ point-in-time recovery. File `.index` là danh sách binlog file MySQL đang quản lý, không phải index có thể tùy tiện xóa. Relay log là event chờ apply; metadata receiver/applier giữ vị trí riêng. Vì vậy cần retention/purge phù hợp, dung lượng đĩa đủ cho outage dự kiến, và không xóa file trực tiếp khi server còn quản lý chúng. Nếu replica làm relay, `log_replica_updates` ghi event đã apply vào binlog của nó để downstream đọc tiếp.

`sync_binlog=1` trong sách nhằm đồng bộ binlog khi commit để giảm cửa sổ mất event sau crash; đổi lại là thêm I/O. Đây là một phần của durability end-to-end cùng InnoDB redo flush, filesystem, controller và thiết bị. Replica metadata và relay-log recovery cũng phụ thuộc release. Chọn theo RPO, xác minh flush semantics trên đường thực tế, rồi thử crash/restart; không sao chép nguyên bộ setting “recommended” của MySQL 5.x sang MySQL 8.4.

Replica có thể đặt read-only để hạn chế ghi ngoài luồng replication; `super_read_only` thêm guardrail cho thao tác quản trị thông thường. Promotion vẫn phải là bước có chủ đích: fence writer cũ, thay đổi role/routing bằng runbook, rồi kiểm tra writer duy nhất. Tự khởi động replication sau sự cố hữu ích khi metadata được phục hồi đúng, nhưng không thay thế crash-safe replication.

### Snapshot và replication position phải là một cặp

Một bản copy dữ liệu chỉ khớp với log position/GTID tại đúng thời điểm snapshot được chụp. `mysqldump --single-transaction` tạo consistent view cho bảng transactional, nhưng không làm bảng nontransactional nhất quán và không tự bảo toàn position. Physical backup, storage snapshot hay clone cũng phải mang metadata tương ứng. Khi dựng replica, khôi phục snapshot, cấu hình source/GTID position, bật receiver/applier, rồi xác minh GTID đã execute và kiểm tra lỗi; hai thread đang chạy không chứng minh dữ liệu đúng.

Ví dụ `CHANGE MASTER TO`, `master.info`, file position và startup option trong sách thuộc MySQL cũ. Dùng cú pháp `CHANGE REPLICATION SOURCE TO`, GTID auto-position khi phù hợp, metadata repository hiện hành và công cụ backup/clone hỗ trợ release đang chạy. Nguyên tắc không đổi: dữ liệu và điểm bắt đầu phải đến từ cùng một snapshot nhất quán.

## GTID đơn giản hóa định vị transaction

Global Transaction Identifier gắn danh tính duy nhất cho transaction để source và replica theo dõi transaction nào đã execute. GTID auto-position giúp replica yêu cầu phần transaction còn thiếu mà không phải cấu hình file/offset thủ công; nó đơn giản hóa failover và scale-out.

GTID không tự sửa dữ liệu lệch và không làm replication synchronous. Provisioning replica vẫn cần snapshot nhất quán và giữ quan hệ giữa data với GTID set. Không tự inject hoặc skip transaction trừ khi hiểu rõ tính nhất quán; bỏ một event có thể làm dữ liệu sai nhưng replication tiếp tục xanh.

## Read scale-out không chia write load tự động

### Topology và filter cần ownership dữ liệu rõ ràng

Source–many replicas dễ hiểu nhưng mỗi replica thêm receiver connection, binlog traffic và chi phí quản lý trên source. Relay/distribution replica gom downstream connections, nhưng khi relay lỗi nhiều replica cùng mất đường nhận event. Tree topology giảm kết nối trực tiếp nhưng tăng hop; cần theo dõi lag từng tầng và biết node nào đủ mới để làm source sau failover.

Active-active không có nghĩa hai node cùng ghi tùy ý. Hai update đồng thời có thể được apply theo thứ tự khác ở hai phía mà không sinh lỗi. Active-passive chỉ an toàn khi writer duy nhất được cưỡng chế bằng fencing/routing và schema change có thứ tự. Ring phải chống event quay vòng bằng server identity, nhưng vẫn khó xác định nguồn dữ liệu authoritative sau đứt mạng hoặc promote sai. Tách ownership theo keyspace/tenant giảm conflict nếu invariant đó được giữ ở application lẫn vận hành.

### Một cặp ghi đồng thời có thể làm hai primary lệch nhau mà không báo lỗi

Giả sử hai primary cùng bắt đầu với `x = 1`. Primary A chạy `x = x + 1`, còn B chạy `x = x * 2`. A thấy kết quả `2`; B cũng thấy `2`. Khi event từ B được apply trên A, A tính thành `4`. Khi event từ A được apply trên B, B tính thành `3`. Cả hai câu lệnh đều hợp lệ nên replication có thể vẫn chạy, nhưng hai bản sao kết thúc ở `4` và `3`.

Đây là lý do auto-increment offset chỉ tránh một số va chạm khóa, không giải quyết xung đột nghiệp vụ. Nếu cần nhiều writer, phải có ownership không chồng lấn hoặc một cơ chế phát hiện/giải quyết xung đột có quy tắc rõ ràng; nếu không, dùng một writer được fencing.

Replication filters tạo bản sao không đầy đủ. Filter database trong statement logging có thể dựa vào default database hiện hành, không chỉ tên bảng ghi đầy đủ; row logging có quy tắc khác theo event. Filter table cũng có thể bỏ bảng mà statement khác phụ thuộc. Trước khi dùng filter, lập truth table theo log format, filter, default database, fully-qualified table và loại DDL/DML; chạy test trên đúng release. Ghi rõ replica nào không được promote làm source tổng quát.

MySQL hiện hỗ trợ multi-source channels, trong khi sách nói tính năng này chưa có. Mỗi channel giữ luồng receiver/relay/applier riêng nhưng không tạo thứ tự toàn cục giữa nguồn, không tự xử lý key collision và không biến transaction xuyên nguồn thành atomic. Dùng khi mỗi source sở hữu schema/keyspace tách biệt và collision policy được thiết kế trước.

Mô hình source ghi, replicas đọc phù hợp workload nhiều read ít write. Đọc từ replica chấp nhận staleness; write vẫn tập trung trên source. Nhiều replicas làm source gửi nhiều binary log bytes và tăng connection/network load. Relay hoặc chain replicas có thể giảm áp lực source nhưng thêm hop và độ trễ.

MySQL replication filters có thể gửi database/table khác nhau tới replica khác nhau, nhưng filter tạo ra bản dữ liệu không đầy đủ và có thể khó failover. Replica phục vụ analytics có thể bị query nặng làm chậm applier nếu dùng chung tài nguyên. Đặt vai trò riêng, giới hạn read workload và theo dõi lag.

Topology source–many replicas dễ hiểu và hợp read scale-out, nhưng source tạo binlog và gửi cho từng replica. Một relay/distribution replica với `log_replica_updates` có thể gom downstream, đổi lại thêm một hop và failure point. Replica chạy report nặng có thể cạnh tranh I/O/CPU với applier; cân nhắc node riêng hoặc pipeline analytics thay vì để query dài đẩy lag lên.

Active-active/master-master không tự giải quyết conflict. Nếu hai bên cùng ghi một key, thứ tự apply có thể tạo lost update hoặc dừng replication. Chỉ dùng khi quyền ghi không chồng lấn hoặc conflict được giải quyết tường minh; auto-increment offset/increment chỉ giải quyết một dạng trùng ID, không giải quyết conflict dữ liệu. Ring topology làm event có thể quay lại và tăng độ khó khôi phục. Mọi topology cần server ID, `log_replica_updates`, GTID/log-position, quy tắc routing và người chịu trách nhiệm chọn một writer khi lỗi.

Sách mô tả MySQL chưa hỗ trợ multi-source. MySQL 8.4 hiện hỗ trợ nhiều replication channels trên một replica, mỗi channel có receiver, relay log và applier riêng. Channel giúp tập hợp nguồn độc lập, nhưng không tự xử lý collision giữa hai nguồn có cùng key, transaction xuyên nguồn, thứ tự tổng thể hay schema khác nhau. Thiết kế namespace/filter rõ ràng, theo dõi từng channel và chỉ dùng khi ownership dữ liệu được tách có chủ ý.

Muốn tăng write throughput thường cần **sharding/partitioning ở application hoặc middleware**: route tenant/key tới shard, quản lý thay đổi shard, transaction cross-shard, unique key toàn cục, migration và hotspot. Replication một nguồn nhiều replica không biến thành write scale-out.

Capacity plan cần tính số byte binlog source sinh ra, băng thông truyền, tốc độ receiver và tốc độ apply trong giờ cao điểm. Lag tăng khi một tầng nhận việc nhanh hơn khả năng xử lý. Worker song song hữu ích khi transaction độc lập; transaction lớn, DDL lâu, lock conflict hoặc query nặng trên replica vẫn có thể tạo lag đáng kể. Giữ headroom thay vì vận hành replica sát 100% apply capacity, nếu không một burst ngắn có thể mất hàng giờ để bắt kịp.

## Semisynchronous và failover

Semisynchronous replication có thể chờ ít nhất một replica báo đã nhận và ghi log transaction trước khi source trả commit, theo cấu hình/plugin. Nó tăng độ bền so với async nhưng không chờ replica apply transaction và cũng không tự chọn/promote replica. Nếu source lỗi, phải xác định replica nào có GTID đầy đủ, tránh split-brain, redirect client và xử lý source cũ trước khi cho join lại. [Tài liệu semisynchronous](https://dev.mysql.com/doc/refman/8.4/en/replication-semisync.html) mô tả điều kiện và giới hạn.

Thứ tự chờ còn phụ thuộc `rpl_semi_sync_source_wait_point`. Trong MySQL 8.4, mặc định `AFTER_SYNC`: source ghi và đồng bộ binlog, chờ replica xác nhận đã nhận event, rồi mới commit vào storage engine và trả kết quả cho client. Với `AFTER_COMMIT`, source commit trước rồi mới đợi ACK trước khi báo thành công cho client. Ở cả hai chế độ, ACK không có nghĩa replica đã apply transaction; timeout có thể khiến source quay về asynchronous replication. Vì vậy cần theo dõi trạng thái semisynchronous đang thực sự hoạt động, không chỉ việc plugin đã bật.

**Delayed replica** cố ý chờ một khoảng để giúp undo lỗi logic hoặc lệnh xóa nhầm, miễn thời gian phát hiện nhỏ hơn delay. Nó không thay thế backup: lỗi có thể phát hiện muộn hơn, replica có thể hỏng cùng hạ tầng, và restore vẫn cần thử.

Theo dõi `Retrieved_Gtid_Set` và `Executed_Gtid_Set`, hoặc vị trí receive/execute, để biết event còn đợi ở relay log hay chưa được lấy từ source. `Seconds_Behind_Source` có thể bằng 0 khi không có transaction mới dù bản sao chưa được xác minh, và có thể dao động quanh transaction dài; ghép nó với tuổi event cuối, queue applier, throughput, error và GTID. Read-after-write có thể gửi lần đọc tới source hoặc dùng GTID của write để chờ replica chạy `WAIT_FOR_EXECUTED_GTID_SET()` tới khi transaction được apply; đặt timeout và fallback để request không chờ vô hạn.

Failover runbook cần kiểm tra replica state/GTID, chọn candidate đủ mới, fence hoặc dừng primary cũ, promote một node, cập nhật router/DNS/proxy, xác nhận ghi duy nhất và sau đó rebuild topology. “Replica IO thread đang chạy” không chứng minh nó đã apply mọi transaction.

Trước promote, so GTID set của candidate, xác định transaction source cũ đã xác nhận nhưng node mới chưa có, rồi quyết định rõ RPO chấp nhận được. Fence primary cũ trước khi mở write trên node mới; nếu hai primary cùng nhận write, repair thường khó hơn downtime ngắn. Repoint replicas bằng cách phù hợp topology/version, kiểm tra app reconnect và retry transaction idempotent, rồi mới khôi phục node cũ. GTID giúp định vị khác biệt; nó không tự chọn candidate đúng hay ghép hai nhánh ghi đã phân kỳ.

Đừng chữa replication error bằng `skip` máy móc. Trước hết đọc event, statement/row và trạng thái transaction để biết dữ liệu đang sai ở bên nào. Nếu cần repair, sửa dữ liệu có chủ ý rồi tiếp tục; nếu độ lệch rộng hoặc không xác định, dựng lại từ snapshot nhất quán thường an toàn hơn. So checksum/row samples cần lưu ý concurrent writes; repair cũng cần xác nhận source of truth, không chỉ làm hai checksum tạm thời bằng nhau.

## High availability: replication, membership và routing

MySQL Group Replication dùng group membership, message ordering và conflict detection để nhiều server giữ bản dữ liệu; chế độ primary-single-writer khác multi-primary về nơi chấp nhận write. Nó cần majority để tiến triển trong các quyết định nhóm. Group Replication không tự chuyển connection client; router, connector hoặc middleware phải route lại sau lỗi.

InnoDB Cluster ghép Group Replication, MySQL Shell AdminAPI và MySQL Router thành một cách triển khai/route. Nó giảm công việc tự nối thành phần nhưng vẫn cần hiểu quorum, network latency, certification conflicts, recovery, backup, upgrades và client retry. Xem [Group Replication](https://dev.mysql.com/doc/refman/8.4/en/group-replication.html), [InnoDB Cluster](https://dev.mysql.com/doc/mysql-shell/8.4/en/mysql-innodb-cluster.html) và [Router](https://dev.mysql.com/doc/mysql-router/8.4/en/).

Các kỹ thuật HA cũ trong sách như MHA, heartbeat/shared storage, DRBD hoặc VIP có thể còn tồn tại trong hệ thống, nhưng không nên mặc định là lựa chọn khuyến nghị hiện nay. Cần phân tích single point of failure, fencing, split-brain, data loss window, promote time và cách app xử lý transaction đang mở.

Replication có thể sai hoặc dừng vì statement không deterministic, schema khác nhau, transaction chạm bảng nontransactional, rollback qua nhiều engine, temporary table/connection state, filter hoặc khác biệt engine. Row-based logging giảm một số rủi ro do statement semantics nhưng không sửa filter sai, schema thiếu, dữ liệu sẵn có lệch hay transaction nguồn không được ghi bền vững. Giữ schema và engine tương thích theo chủ đích, kiểm thử DDL/upgrade trên topology thật, và cảnh báo khi applier dừng dù receiver còn chạy.

## Điều tra sai lệch, error và lag

Replication có thể dừng do duplicate key, missing row, schema mismatch hoặc event không áp dụng được. Nó cũng có thể tiếp tục chạy nhưng dữ liệu sai nếu statement hợp lệ tạo kết quả khác ở hai bên. Nondeterministic function, thứ tự không được bảo đảm, SQL mode/collation khác nhau, temporary table, trigger, filter, khác storage engine và ghi trực tiếp trên replica đều cần kiểm tra. Row-based thường làm mismatch lộ ra khi before-image không khớp, nhưng không phải checksum toàn database.

Đừng bỏ qua error chỉ để trạng thái xanh. Lưu error/event/GTID, xác định source of truth, đánh giá transaction thiếu và các transaction sau đó, rồi sửa có chủ ý hoặc rebuild từ snapshot. Công cụ skip kiểu cũ có thể vượt transaction không mong muốn hoặc làm sai GTID history; cách khắc phục phụ thuộc format log, version và replication mode. Checksum/row comparison phải tính đến concurrent writes, locks và giới hạn công cụ.

Lag là queueing: nếu event đến nhanh hơn apply, backlog tăng; sau burst, replica chỉ bắt kịp khi apply throughput cao hơn tốc độ event mới. Transaction dài, DDL, lock contention, hot row, I/O chậm hoặc query analytics có thể nghẽn. Đo transactions/bytes nhận và áp mỗi giây, relay-log growth, worker utilization, transaction age, disk latency và binlog retention. Thêm worker không giúp khi việc phụ thuộc cùng thứ tự hoặc lock; giảm tải, tách vai trò hay tăng tài nguyên có thể hiệu quả hơn.

### Tính headroom: replica cũng phải chạy lại toàn bộ write

Một replica không chỉ phục vụ SELECT. Nó còn phải apply những write mà source đã xử lý; vì thế thêm replica không chia phần write đó ra. Ví dụ trong sách giả sử một server xử lý được 1.000 query/giây. Tải ban đầu là 800 read và 200 write; khi tải đọc tăng gấp đôi, workload trở thành 1.600 read và 400 write mỗi giây. Source phải xử lý 400 write. Mỗi replica cũng phải apply 400 write, chiếm khoảng 40% năng lực của nó, nên chỉ còn chỗ cho khoảng 600 read/giây. Hai replica chỉ phục vụ được 1.200 read; cần ba replica mới vượt 1.600 read. Tổng cộng phải có một source và ba replica để đáp ứng khoảng gấp đôi workload ban đầu.

Nếu workload tăng gấp bốn, giả sử có 3.200 read và 800 write mỗi giây, mỗi replica mất 80% năng lực để apply write và chỉ còn khoảng 200 read. Cần khoảng 16 replica đọc, cộng source, để phục vụ 3.200 read. Ví dụ cố tình đơn giản: nó bỏ qua chi phí network/binlog, ghi tuần tự, khác biệt engine và replica chậm hơn source. Không dùng con số này để sizing máy; dùng nó để thấy vì sao thêm replica có lợi suất giảm nhanh và không scale write. Khi write gần chạm trần source, phải giảm write, tối ưu transaction hoặc phân vùng/shard dữ liệu để các node thực sự sở hữu phần write khác nhau.

### Ước lượng khả năng bắt kịp sau một burst

Một phép thử trong sách là tạo backlog có chủ đích trên replica kiểm soát được, rồi đo tốc độ nó bắt kịp. Nếu dừng apply một giờ, trong lúc source vẫn phát sinh transaction, lúc mở lại replica phải xử lý cả phần mới sinh trong giờ dừng lẫn write đang đến. Nếu nó xóa backlog và trở về hiện tại sau thêm một giờ, nó đã apply lượng tương đương hai giờ write trong một giờ chạy: throughput gần gấp đôi arrival rate, tức khoảng 50% apply capacity đang được dùng trong điều kiện thử.

Có thể mô hình hóa đơn giản: source tạo backlog với tốc độ `λ` transaction/giây, replica apply tổng cộng `μ` transaction/giây, và replica phải bắt kịp khi `μ > λ`. Sau khi dừng `D` giây, backlog ban đầu xấp xỉ `λD`; trong lúc catch up, write mới vẫn đến, nên thời gian bắt kịp gần `T = λD / (μ − λ)`. Nếu `μ` chỉ nhỉnh hơn `λ`, một burst nhỏ cũng mất lâu để hồi phục; nếu `μ ≤ λ`, replica không bao giờ bắt kịp khi tải tiếp tục như vậy. Đây là mô hình gần đúng: transaction có kích thước/chi phí không đều, lock, DDL, network và cache làm tốc độ thực tế thay đổi.

Không dừng replica production để thử nếu chưa đánh giá RPO, retention binlog, dung lượng relay log và khả năng tạo lại replica. Dùng replica thử nghiệm hoặc khoảng tải an toàn. Ngoài lag trung bình, quan sát độ cao và độ rộng của các lag spike: spike hồi phục chậm dần thường báo headroom đang cạn. Duy trì dư địa để apply burst, chạy maintenance và tiếp nhận workload sau failover; node chạy sát 100% khi bình thường thường không đủ capacity khi một node biến mất.

Một số lỗi trông giống nhau ở bảng trạng thái nhưng nằm ở tầng khác nhau. Nếu receiver liên tục retry event lớn, so `max_allowed_packet` và kích thước event giữa source/replica. Nếu relay log tăng mà receiver khỏe, kiểm tra apply queue, dung lượng đĩa và tốc độ I/O; đầy đĩa có thể làm receiver hoặc cả server dừng. Nếu replica ở xa bị tụt lại dù CPU còn rảnh, đo băng thông thực tế và tốc độ sinh binlog ở giờ cao điểm. Khi thêm nhiều replica, nhớ rằng source phải phục vụ từng luồng dump riêng; event rất lớn có thể làm tải và bộ nhớ tăng đột biến. Chẩn đoán từ error log, trạng thái receiver/applier và xu hướng dung lượng trước khi đổi cấu hình.

Read-after-write có thể route về source hoặc lấy GTID của write rồi chờ replica apply tới đó. Cần timeout và fallback: đọc source, chờ có giới hạn hoặc trả trạng thái phù hợp nghiệp vụ. Không kết luận consistency chỉ từ `Seconds_Behind_Source=0` khi source yên, replica vừa reconnect hoặc timestamp không thể hiện queue; đối chiếu received/executed GTID, transaction mới nhất và backlog.

## Cloud là mô hình dịch vụ, không phải thuộc tính consistency

MySQL managed service có thể cung cấp backup, failover, replicas, monitoring và storage replication. Phạm vi phụ thuộc dịch vụ/edition: ai quản lý OS, được đặt biến nào, backup giữ bao lâu, endpoint chuyển ra sao, failover có thể mất bao nhiêu ghi và có thể truy cập binlog/replica không. Dùng một dịch vụ cloud không tự làm ứng dụng retry-safe hoặc dữ liệu strongly consistent.

## Tự kiểm tra

**Replica có thể đọc stale sau khi source trả commit?** Có, với async replication; commit source không xác nhận replica đã nhận hoặc apply.

**Semisynchronous có nghĩa mọi replica đã commit?** Không. Source chờ acknowledgement từ số replica cấu hình là đã nhận/ghi log; chúng có thể chưa apply transaction.

**Group Replication tự chuyển client sang primary mới không?** Không. Client cần Router, connector, load balancer hoặc middleware phù hợp.

Nguồn đọc: *High Performance MySQL*, chương 10; [MySQL 8.4 replication](https://dev.mysql.com/doc/refman/8.4/en/replication.html), [replication threads](https://dev.mysql.com/doc/refman/8.4/en/replication-threads.html), [relay logs](https://dev.mysql.com/doc/refman/8.4/en/replica-logs.html), [GTID functions](https://dev.mysql.com/doc/refman/8.4/en/gtid-functions.html), [multi-source channels](https://dev.mysql.com/doc/refman/8.4/en/replication-channels.html), Group Replication và InnoDB Cluster docs. Phần scaling, HA và cloud được phát triển tiếp ở các note/chương tương ứng.

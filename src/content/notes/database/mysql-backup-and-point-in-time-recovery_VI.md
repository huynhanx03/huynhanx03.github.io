---
title: "Thiết kế backup nhất quán và point-in-time recovery cho MySQL"
category: "Database"
description: "Từ RPO/RTO đến snapshot, binlog và restore drill: chọn backup phù hợp, bảo vệ tính nhất quán và phục hồi đúng trạng thái."
updated: 2026-10-18
translationKey: "database/mysql-backup-and-point-in-time-recovery"
---

Backup là khả năng quay lại một trạng thái dữ liệu có ích sau khi phần còn lại của hệ thống đã thất bại. File được tạo thành công chưa chứng minh dữ liệu có thể restore; replica còn chạy cũng chưa chứng minh có thể lấy lại dữ liệu trước một lệnh xóa. Hãy thiết kế backup từ điều cần phục hồi, rồi thử phục hồi trong thời gian hệ thống có thể chấp nhận.

## Định nghĩa phạm vi, RPO và RTO

Trước khi chọn tool, trả lời ba câu hỏi:

1. **Phục hồi cái gì?** Toàn instance, một database, một table, một số row, schema, stored routine/event, user/privilege hay một transaction bị lỗi?
2. **Có thể mất bao nhiêu dữ liệu?** Đây là **RPO**. Nếu chỉ có full backup lúc 01:00, dữ liệu sau thời điểm đó có thể mất. Giữ binlog liên tục và an toàn có thể đưa điểm phục hồi sát hơn.
3. **Có thể ngừng dịch vụ bao lâu?** Đây là **RTO**. RTO gồm dựng máy, cấp storage/quyền, tải backup, prepare/recovery, replay binlog, kiểm tra nghiệp vụ và chuyển traffic; không chỉ thời gian copy file.

Viết policy rõ ràng để đội trực khi sự cố không phải tự đoán. Một endpoint có thể chấp nhận phục hồi chậm hơn, còn ledger hoặc thanh toán có thể cần RPO thấp và quy trình audit nghiêm ngặt. Tách các lớp dữ liệu có yêu cầu khác nhau giúp giữ chi phí hợp lý.

Backup phục vụ nhiều việc hơn khôi phục server chết: xóa nhầm hoặc thay đổi schema sai, sửa bug bằng cách so dữ liệu cũ, audit lịch sử, nâng cấp, chuyển nền tảng và dựng môi trường kiểm thử gần production. Mỗi mục đích có thể cần độ chi tiết và thời gian lưu khác nhau.

## Backup và recovery là hai công việc khác nhau

**Backup** tạo và giữ bản có thể dùng. **Restore** là đưa dữ liệu từ bản đó vào nơi MySQL có thể đọc. **Recovery** là toàn bộ quá trình đưa một chức năng hoặc server trở lại hoạt động: chọn bản, restore, cấu hình, khởi động, chạy crash recovery, replay log, làm nóng cache, xác minh ứng dụng và khôi phục traffic.

InnoDB crash recovery sau mất điện dùng redo/undo để hoàn tất phần đã commit và rollback phần chưa commit. Nó chỉ xử lý trạng thái engine sau crash; nó không khôi phục bảng bị `DROP`, không quay lại trước bug ứng dụng và không thay thế PITR. Đây là hai nghĩa recovery khác nhau.

Đừng dùng nhãn “hot/warm/cold” nếu chưa nói rõ mức ảnh hưởng. Một phương pháp có thể giữ server online nhưng khóa ghi vài giây, dùng CPU/I/O mạnh trong hàng giờ, hoặc cho phép đọc trong lúc dump. Hãy đo cụ thể lock duration, backup duration, resource impact và restore duration.

## Replica, RAID và snapshot không thay backup

Replica giúp có thêm node và có thể giảm tải khi lấy backup, nhưng thường nhận cả `DROP TABLE`, update sai và corruption. RAID hoặc storage mirror giữ bản sao block, nên cũng sao chép dữ liệu bị hỏng. Snapshot tạo một góc nhìn tại thời điểm cụ thể nhưng vẫn có thể nằm cùng tài khoản, vùng hoặc quyền bị xâm phạm với source.

Hãy bảo vệ bản backup khỏi cùng failure domain: lưu ngoài máy/volume nguồn, giới hạn quyền ghi/xóa, bảo vệ credential/key độc lập, và có bản lưu khác region hoặc offline theo yêu cầu. Encryption cần có quy trình giữ và khôi phục key; nếu mất key, file an toàn nhưng không dùng được.

Replica vẫn hữu ích như **nguồn tạo backup**: backup trên replica có thể tránh tải và lock trên primary. Nhưng cần kiểm tra replica đã apply đúng điểm dữ liệu, không bị filter hoặc divergence; lưu position/GTID và metadata replication tương ứng. Một replica bị chậm có thể không kịp lịch backup tiếp theo. Delayed replica tạo khoảng thời gian để dừng trước khi lệnh phá hoại được apply, nhưng chỉ bảo vệ trong khoảng delay và vẫn cần backup.

## Chọn logical, physical hay snapshot

| Cách | Điểm mạnh | Chi phí và giới hạn | Thường phù hợp |
| --- | --- | --- | --- |
| Logical SQL dump | Dễ đọc/biến đổi, chọn database/table/row, portable giữa máy và engine | Server phải đọc/serialize; dump lớn có thể tốn CPU/network; restore parse SQL, ghi row và dựng index nên chậm, đôi khi khó dự báo | Dataset nhỏ/vừa, di chuyển version/platform, khôi phục một phần hoặc kiểm tra nội dung |
| Delimited export | `LOAD DATA` thường nạp nhanh hơn nhiều câu `INSERT`; phù hợp batch import/export | Phải giữ schema, charset, delimiter, escaping, NULL/timezone và thứ tự; `INTO OUTFILE` tạo file ở host MySQL, cần quyền/file path | Data load lớn hoặc trao đổi bảng theo định dạng có kiểm soát |
| Physical/raw backup | Sao chép page/file và thường restore nhanh, gọn hơn cho data lớn | Phải nhất quán cả file, redo và metadata; phụ thuộc version/platform/layout; không phải lúc nào cũng granular theo table | Dataset lớn, RTO ngắn, tool có protocol prepare/restore rõ |
| Filesystem/storage snapshot | Chụp trạng thái volume nhanh; rút ngắn thời gian cần giữ lock; có thể copy snapshot sau đó | Snapshot không phải bản backup thứ hai; copy-on-write cần headroom; nhiều volume không chắc cùng thời điểm; phải hiểu crash recovery | Volume layout hỗ trợ snapshot nhất quán và quy trình được diễn tập |

Không có một lựa chọn thắng cho mọi trường hợp. Nhiều hệ thống dùng physical full/incremental thường xuyên để restore nhanh, binlog để tiến tới thời điểm gần hơn, và logical dump định kỳ để có bản portable/khôi phục object. Incremental giảm bytes lưu/truyền nhưng buộc recovery ghép đúng chuỗi. Nếu một base hoặc incremental hỏng, các bản kế tiếp có thể không dùng được; full backup định kỳ và kiểm tra từng generation giảm phụ thuộc dây chuyền.

### Incremental và differential khác nhau ở mốc so sánh

**Full backup** lưu một bản nền độc lập. **Incremental backup** lưu phần thay đổi kể từ lần backup gần nhất, bất kể lần đó là full hay incremental. **Differential backup** lưu phần thay đổi kể từ full backup gần nhất. Vì vậy incremental thường nhỏ hơn mỗi ngày nhưng tạo một chuỗi dài hơn khi restore; differential tăng dần kích thước tới lần full tiếp theo nhưng chỉ cần bản full và differential mới nhất.

Ví dụ: full vào Chủ nhật; incremental vào thứ Hai và thứ Ba; differential vào thứ Hai và thứ Ba. Restore bản incremental thứ Ba cần full Chủ nhật rồi apply incremental thứ Hai và thứ Ba theo thứ tự. Restore bản differential thứ Ba chỉ cần full Chủ nhật và differential thứ Ba. Nếu một mắt xích incremental thiếu hoặc hỏng, không thể giả vờ chuỗi đã phục hồi đầy đủ; kiểm tra manifest, thứ tự, checksum và điểm dữ liệu của từng thành phần.

Một physical-backup tool có thể định nghĩa “incremental” theo page/LSN hoặc cơ chế riêng, nên đừng suy từ tên gọi sang cách ghép file. Ghi rõ base backup, các generation phụ thuộc vào nó, tool/version và coordinate binlog/GTID. Sau khi dựng được base, replay binlog từ coordinate đó tới recovery target để đạt PITR; incremental chain và binlog làm hai việc khác nhau.

Với logical dump lớn, cân nhắc tách schema/data và chia theo table/chunk để có thể kiểm tra hoặc khôi phục một phần. File SQL monolithic trộn DDL và data, statement khổng lồ, và khó lọc khi cần sửa một table. Delimited format có thể nạp nhanh hơn, nhưng encoding/escaping và schema phải khớp. Một con số dump-time không dự báo restore-time: index build, foreign-key checks, redo volume và giới hạn I/O làm restore khác đáng kể.

## Snapshot phải nhất quán ở cấp transaction lẫn file

Có hai yêu cầu riêng:

- **Data consistency:** các bảng liên quan đại diện cho một trạng thái logic thống nhất. Nếu payment được backup nhưng invoice tương ứng ở thời điểm khác, ứng dụng có thể nhận một tổ hợp không tồn tại trong production.
- **File consistency:** từng file và tập file phối hợp với nhau phải tạo ra trạng thái engine có thể recovery. Copy từng datafile và redo log ở các thời điểm khác nhau có thể tạo bộ file không khớp.

`mysqldump --single-transaction` tạo consistent read cho transactional tables như InnoDB mà không khóa chúng trong suốt dump. Nó không bảo đảm MyISAM/MEMORY nhất quán, và DDL đồng thời như `ALTER`, `DROP`, `RENAME`, `TRUNCATE` có thể làm hỏng tính hợp lệ của kết quả. Lập lịch thay đổi schema, giữ metadata consistency và dùng đúng lựa chọn coordinate khi cần tạo replica từ dump. Cú pháp và quyền cần xác minh theo MySQL release.

Global read lock (`FLUSH TABLES WITH READ LOCK`) có thể chặn ghi và gây hàng đợi, nhất là khi còn statement dài hoặc nhiều bảng cần flush. Đừng dùng nó như một bước “nhanh” mà không đo lock wait/lock duration. Với engine transactional, một snapshot nhất quán thường tránh giữ global lock lâu; nontransactional tables cần kế hoạch riêng hoặc loại bỏ dần khỏi workload quan trọng.

Raw copy khi `mysqld` đang chạy không tự trở thành backup hợp lệ. Snapshot filesystem có thể tạo một view crash-consistent tại một thời điểm; sau restore, InnoDB cần chạy recovery trên bộ data và redo phù hợp. Đặt data/redo cần thiết vào failure/snapshot boundary được hỗ trợ, giữ lại metadata tương ứng, monitor dung lượng copy-on-write và test mở bản sao trên một instance cô lập. Chụp snapshot nhanh chỉ là bước bắt đầu; phải copy nó sang backup storage độc lập trước khi xóa snapshot.

### COW snapshot và ước lượng headroom

LVM snapshot là một logical view tại thời điểm tạo, không phải bản sao vật lý đầy đủ ngay lập tức. Lúc đầu, snapshot đọc block chưa đổi từ volume gốc. Khi MySQL ghi lần đầu vào một block sau thời điểm snapshot, LVM lưu phiên bản cũ vào vùng copy-on-write; những lần ghi tiếp vào cùng block không cần lưu thêm phiên bản cũ. Vì vậy dung lượng cần dựa trên các block khác nhau bị ghi trong lúc giữ snapshot mở, không phải kích thước toàn database.

Ước lượng ban đầu bằng `tỷ lệ ghi vào block mới × tốc độ ghi × thời gian copy`, rồi cộng headroom. Ví dụ trong sách: nếu 10 MB/s ghi và khoảng một nửa chạm block mới trong một giờ, vùng snapshot cần khoảng `0.5 × 10 × 3,600 = 18,000 MB`, cộng phần dự phòng. Khi vùng COW đầy, snapshot có thể trở nên không dùng được và job đọc snapshot lỗi. Snapshot còn tăng I/O seek và làm cả MySQL lẫn tiến trình copy chậm; đo với workload thật thay vì dùng benchmark cũ của sách làm sizing.

### Snapshot ngắn khóa và snapshot InnoDB không khóa

Muốn giảm thời gian giữ global read lock, bố trí toàn bộ InnoDB data và redo cần thiết trong cùng consistency boundary. Nếu cần khôi phục cả table definition, đưa datadir/metadata vào snapshot đó hoặc backup schema riêng. Nhiều logical volume được chụp tuần tự không tự tạo cùng một thời điểm; cần storage hỗ trợ consistency group hoặc một quy trình điều phối tương đương.

Với quy trình có lock, giữ lock chỉ đủ để chốt trạng thái/coordinate cần thiết và tạo snapshot; sau đó nhả lock rồi mới copy dữ liệu lâu dài sang kho backup. InnoDB background thread vẫn có thể ghi trong lúc lock bảng, nên snapshot giống bộ file sau một crash bình thường. Đây là lý do phải chụp data và redo cùng nhau: lúc khởi động bản copy cô lập, InnoDB dùng recovery để áp phần transaction đã commit chưa kịp ghi vào data page. Mở bản copy và kiểm tra engine/tables khi tạo backup giúp phát hiện sớm file hỏng và rút ngắn lần restore thật.

Quy trình không global lock chỉ phù hợp khi workload/engine cho phép và metadata không transactional không bị thay đổi trong lúc chụp. Sách mô tả cách lấy binary-log coordinate từ recovery của snapshot ở các phiên bản thời đó; hiện nay cần lấy coordinate theo cơ chế được tài liệu đúng phiên bản hỗ trợ. Sách cũng cảnh báo prepared XA transaction và `server_id` khác nhau trong đường phục hồi cũ; xem đây là rủi ro phụ thuộc phiên bản và luôn xác minh snapshot trên một server cô lập trước khi công nhận backup.

## Bản backup bao gồm gì ngoài các row?

Lập manifest theo recovery target, có thể gồm:

- schema, data, views, triggers, routines, events và các cấu hình cần để chạy;
- version MySQL, plugins, charset/collation, SQL mode và parameter set;
- users/grants, secrets/certificate references và quy trình lấy lại key;
- binary logs, GTID/position và replication topology/metadata cần thiết;
- job schedule, scripts, file mapping, network/DNS assumptions và runbook;
- backup timestamp, consistency point, tool/version, checksum và encryption metadata.

Không phải mọi thứ nên đóng vào một archive. Data, binlog và system configuration có thể cần retention, encryption và quyền khác nhau. Nhưng restore procedure phải chỉ ra nơi lấy từng mảnh. Backup file có data mà không có schema, grants, key hay version đúng vẫn có thể không đưa ứng dụng trở lại hoạt động.

## Binary log: nối base backup đến recovery point

PITR cần một base backup có consistency coordinate rõ ràng, binlog liên tục từ coordinate đó đến target, và vị trí dừng đúng. Trong MySQL 8.4 binary logging bật mặc định, nhưng điều này không có nghĩa binlog còn tồn tại ngoài máy hoặc được giữ đủ lâu. Copy binlog sang failure domain khác thường xuyên; nếu RPO tối đa là 15 phút, khoảng mất binlog do chưa archive phải nhỏ hơn budget đó.

Retention phải thỏa đồng thời PITR window, lag tối đa của replica, thời gian tạo replica mới và audit requirement. Auto-purge giải quyết disk usage, không biết ý nghĩa backup của bạn. Trước khi purge, xác nhận bản sao ngoài máy đã nhận đủ log, mọi replica cần thiết đã đi qua đoạn log đó, và retention policy vẫn đáp ứng restore window. Không xóa log bằng lệnh filesystem tùy tiện làm metadata index lệch.

Trong log có event/position, GTID, timestamp và row/statement representation tùy format. Timestamp giúp khoanh vùng; event position hoặc GTID boundaries thường hữu ích hơn khi cần dừng chính xác. Row-based event không luôn hiện thành SQL dễ đọc. Trước khi replay, hãy xác định timezone, transaction boundaries, database filters và có đủ quyền thực thi event.

## Ví dụ PITR sau khi xóa nhầm một bảng

Giả sử full backup tại 01:00 đã test, binlog đã archive liên tục tới 14:00, và lệnh xóa nhầm chạy lúc 13:42. Không restore đè ngay primary. Tạo instance cô lập cùng major version/config tương thích, restore bản 01:00, kiểm tra coordinate, replay binlog tới ngay trước transaction xóa, rồi dừng.

Sau đó so row count, schema, foreign-key/business invariants và truy vấn ứng dụng. Nếu chỉ cần khôi phục một bảng, có thể trích bảng từ instance phục hồi thay vì bỏ toàn bộ thay đổi production sau 01:00. Nhưng nếu các transaction sau thời điểm xóa có cập nhật đồng thời bảng đó và bảng khác, merge một bảng cũ có thể tạo trạng thái không nhất quán. Cần hiểu quan hệ dữ liệu, giao dịch bị tác động và cách sửa nghiệp vụ trước khi cutover.

RPO của backup/binlog có thể gần 13:42 trong ví dụ, nhưng RTO vẫn gồm cấp máy, tải backup, replay gần 13 giờ log, validation và cutover. Đo replay throughput trên data tương tự production. Nếu job restore mất 20 giờ trong khi RTO là 2 giờ, tăng tần suất base backup hoặc chọn physical/incremental strategy phù hợp; đừng chỉ tăng tốc độ tạo dump.

### Dùng delayed replica để recovery nhanh

Delayed replica có thể rút ngắn recovery nếu sự cố được phát hiện trước lúc lệnh bị delay apply. Dừng applier trước event lỗi, xác định event/transaction chính xác, rồi tạo nguồn phục hồi hoặc extract dữ liệu theo runbook đã thử. Không dùng các hướng dẫn cũ như `SQL_SLAVE_SKIP_COUNTER` một cách máy móc; tên lệnh và cơ chế replication thay đổi theo version, và skip event sai có thể che giấu divergence. MySQL 8.4 hỗ trợ chạy replica tới một binlog position hoặc GTID bằng `START REPLICA ... UNTIL`; hãy kiểm tra trạng thái applier và coordinate sau khi dừng, vì chọn sai mốc có thể áp qua event cần tránh.

### Dùng log server để dựng lại một bảng

Nếu cần lấy lại một bảng nhưng vẫn giữ phần lớn trạng thái hiện tại của server, có thể dựng một replica phục hồi riêng: restore backup gần nhất sang một máy cách ly, cho máy này đọc binlog từ đúng coordinate của backup, rồi áp replication filter chỉ cho bảng cần cứu. Dừng replica ngay trước transaction phá hoại, kiểm tra bảng trên máy phục hồi, sau đó xuất và nhập bảng đã dựng lại theo kế hoạch merge có kiểm soát. Log server ở đây là nguồn cung cấp binlog; nó không tự quyết định dữ liệu nào an toàn để ghép lại.

Filter không hiểu quan hệ nghiệp vụ giữa các bảng. Với statement-based logging, một câu lệnh nhiều bảng có thể chạy trên trạng thái khác với ban đầu và tạo kết quả khác. Row-based logging ghi thay đổi theo từng row nên tránh được chính kiểu sai lệch khi chạy lại câu lệnh trên state khác, nhưng vẫn phải kiểm tra filter, DDL, trigger và invariant liên bảng theo đúng phiên bản. Nếu một transaction cập nhật nhiều bảng cùng nhau, khôi phục một bảng riêng có thể làm mất tính nhất quán dù các row của bảng đó được phát lại chính xác. Không chạy thử phương án này trên production; hãy so sánh kết quả và kiểm thử các truy vấn/invariant trước khi merge. Sách dùng cú pháp `START SLAVE` cũ; MySQL 8.4 dùng `START REPLICA` và cơ chế replication filter hiện hành.

## Restore drill là phép thử của backup

Mỗi backup generation cần kiểm tra tự động độc lập với process tạo backup: job exit status, tuổi bản mới nhất, size bất thường, checksum, upload completion, encryption key availability và binlog gap. Một lần “backup job xanh” không đủ nếu process không đọc lại dữ liệu hoặc upload bị cắt giữa chừng.

Định kỳ restore vào môi trường cách ly và theo hết đường phục hồi:

1. Lấy artifact/key/manifest từ storage như thể source đã mất.
2. Provision đúng version/extension/config và disk capacity.
3. Restore raw hoặc logical backup, chạy prepare/crash recovery khi tool yêu cầu.
4. Replay binlog tới target và ghi lại coordinate cuối.
5. Kiểm tra schema, object, row count, checksums mẫu và invariants nghiệp vụ.
6. Khởi chạy application smoke test, đo cache warmup và latency.
7. Diễn tập chuyển endpoint, client reconnect, rollback và rebuild replica.
8. Ghi wall-clock time, nhân lực, bytes, CPU, I/O và lỗi; cập nhật policy/runbook.

Giữ server phục hồi cách ly hoặc read-only cho tới khi validation hoàn tất. Với raw restore, khôi phục owner/permission đúng trước khi start, theo dõi error log xuyên suốt startup, rồi xác nhận InnoDB đã hoạt động và các table truy vấn được; process mở port chưa chứng minh engine phục hồi thành công. Việc load một dump có thể tiếp tục sau statement lỗi mà không abort; kiểm tra exit status và log, không suy ra mọi câu lệnh đã thành công chỉ vì command kết thúc.

### Chép file dữ liệu không giống nhau giữa các storage engine

“Có đủ file” chưa có nghĩa là “có một bộ dữ liệu nhất quán”. Trước khi chép raw backup, hãy xác định storage engine, layout tablespace, phiên bản server và consistency protocol của công cụ backup. Đừng trộn file lấy từ nhiều thời điểm hoặc ghép datafile mới với redo log cũ tùy tiện: InnoDB cần một bộ file có thể cùng đi qua crash recovery, không phải vài file riêng lẻ trông có vẻ liên quan.

Trong layout MyISAM được sách mô tả, dữ liệu và index nằm ở các file riêng như `.MYD` và `.MYI`; thay file khi table đang mở có thể khiến server giữ trạng thái cũ hoặc gây lỗi. Phải đóng table an toàn — dừng ghi, đóng/flush table theo cách phù hợp với phiên bản, hoặc dừng server — rồi mới thay đúng bộ file. Tên file và cách lưu metadata thay đổi theo release; MySQL hiện đại không dùng `.frm` như các phiên bản cũ, nên đừng sao chép máy móc lệnh của sách sang server hiện tại.

InnoDB phức tạp hơn vì table có thể phụ thuộc system/shared tablespace, data dictionary, redo và metadata của instance. Nếu khôi phục cả instance, dừng MySQL rồi đưa về một bộ physical backup tương thích; chạy bước prepare/apply-log mà backup tool yêu cầu trước khi start. Nếu chỉ cứu một table từ file-per-table tablespace, đó là quy trình transportable tablespace với các bước đã kiểm tra như export/discard/import, không phải chép `.ibd` vào datadir. MySQL 8.4 yêu cầu `innodb_file_per_table`; page size phải khớp, và khi chuyển giữa hai instance thì cả hai phải cùng GA release/version. Schema, row format và cấu hình `DATA DIRECTORY` cũng có thể quyết định import có hợp lệ không. Với foreign key, engine không tự xác minh constraint khi import; phải export các bảng liên quan tại cùng một điểm logic và tự kiểm tra quan hệ sau đó. Xem [MySQL 8.4: Importing InnoDB Tables](https://dev.mysql.com/doc/refman/8.4/en/innodb-table-import.html) để biết điều kiện hiện hành.

Sau khi đặt file đúng chỗ, sửa owner/permission theo cấu hình máy, khởi động khi chưa nhận traffic, đọc error log và xác nhận engine, schema, bảng cùng dữ liệu đều truy cập được. Nếu chưa chắc bộ file tương thích, giữ nguyên bản gốc và thử trên thư mục/instance riêng; đừng thử bằng cách ghi đè bản duy nhất còn lại.

### Nạp logical backup cần kiểm soát lỗi và phạm vi

SQL dump là chương trình SQL có thể thực thi, không chỉ là một khối dữ liệu. Hãy xem cấu trúc dump để biết nó tạo database/table nào, có `DROP` hay `CREATE` object không, và có chứa schema, data hay cả hai. Nếu cần khôi phục một table, tách schema/data hoặc dump từng table từ đầu sẽ dễ kiểm soát hơn việc lọc vài dòng khỏi file khổng lồ. Lệnh `SOURCE` trong mysql client có thể tiếp tục sau statement lỗi; khi dùng nó, hãy đọc kết quả và log thay vì coi lần nạp là atomic.

Với dump dạng delimited, khôi phục bằng `LOAD DATA` hoặc `mysqlimport` với delimiter, escape, character set, thứ tự cột và quy tắc dòng khớp lúc export. Với file nén lớn, stream giải nén có thể tránh một lượt ghi trung gian, nhưng pipeline cần truyền được lỗi của mọi tiến trình (`pipefail` ở shell phù hợp), ghi nhận số row/warning và giữ nguyên artifact nguồn. Named pipe phụ thuộc hệ điều hành và quyền truy cập; ví dụ FIFO trong sách không phải lệnh portable cho mọi môi trường.

Trước khi nạp, quyết định có cần ghi restore vào binary log để replica nhận dữ liệu hay không; đừng tắt binary logging theo thói quen. Chia dữ liệu lớn thành batch/transaction hợp lý, theo dõi dung lượng log và chi phí rollback, rồi xác minh object, row count và invariant sau mỗi phạm vi quan trọng. Nếu PITR còn phải replay log, hãy xác định điểm bắt đầu, điểm dừng và phạm vi database/table để không làm lẫn thứ tự sự kiện.

## Chọn backup tool theo consistency protocol

Tên tool không nói đủ bản backup có restore được hay không; cần hiểu tool chép file nào, lấy redo/binlog coordinate ra sao, bước **prepare** có áp log để làm nhất quán file không, và lúc restore cần dừng server hay không. Trong edition sách mô tả, MySQL Enterprise Backup được trình bày là physical backup cho InnoDB khi server vẫn chạy, không cần stop hay lock nhưng tạo thêm tải; sách liệt kê nén, incremental và stream sang máy khác. Percona XtraBackup cũng chạy ngoài server: một luồng theo dõi redo trong khi data file được copy, không cần query MySQL; sau khi copy xong, bước prepare áp redo theo crash-recovery để đưa các file chụp ở những thời điểm khác nhau về trạng thái nhất quán. Bản prepared chứa transaction đã commit đến điểm kết thúc copy. Đây là mô tả của edition, không suy ra mọi chi tiết hiện hành của tool.

`mylvmbackup` minh họa consistency window ngắn của LVM snapshot: lấy global read lock, tạo snapshot, nhả lock, rồi dùng `tar` nén dữ liệu trong snapshot và xóa snapshot sau khi hoàn tất. Tính nhất quán dựa vào thời điểm chụp và engine/log protocol; tar một thư mục đang được ghi không thay thế bước snapshot. Zmanda Recovery Manager minh họa lớp quản lý bao quanh dump, LVM hoặc physical backup để lên lịch, xác minh và phục hồi. `mydumper` minh họa logical dump/load đa luồng; song song có thể rút thời gian nhưng tăng tải I/O/CPU và cần kiểm tra consistency/restore. `mysqldump` phù hợp khi cần SQL portable hoặc restore phạm vi nhỏ, nhưng restore dataset lớn có thể lâu hơn nhiều thời gian tạo dump.

Đừng tin một lệnh copy file chỉ vì nó tạo archive thành công. Sách nêu `mysqlhotcopy` và một số công cụ cũ có thể copy `.ibd` riêng lẻ rồi tạo ảo giác rằng InnoDB đã được backup; datafile cần đúng metadata, redo và quy trình engine-aware. Các tên `mysqlhotcopy`, `mk-parallel-dump`, `mylvmbackup`, cùng cách gọi tool trong sách là lịch sử; trước khi dùng bất kỳ công cụ nào, kiểm tra hỗ trợ cho release/topology hiện tại và chứng minh được bằng restore drill.

Script backup cũng là một phần của consistency protocol. Dùng fail-fast và kiểm tra exit code từng bước; lấy inventory table/schema an toàn thay vì liệt kê rồi khóa từng table qua một khoảng thời gian có race với DDL; ghi lại timestamp, tool/version, binlog/GTID position của source và replica nếu có; chỉ rotate/purge log khi retention đã được xác nhận. Một truy vấn metadata nặng như liệt kê trạng thái mọi table có thể làm server tải cao, nên đo trước trên instance lớn.

### Các bước script phải kiểm soát

Một script đáng tin cần xử lý cả điều khiển lẫn dữ liệu: parse option bằng thư viện chuẩn để có help/validation thống nhất; bật strict error handling; đặt DBI/client ở chế độ lỗi rõ ràng; lấy credential từ option file hoặc secret manager thay vì source code, shell history hay process arguments. Kiểm tra host, port, database, tool version, quyền, output directory, dung lượng trống và retention policy trước bước có side effect. Lệnh shutdown chỉ khởi động quy trình dừng; trước khi copy raw files, chờ service manager/process xác nhận server đã dừng hoàn toàn.

Khi tạo inventory, phân biệt database/schema thật với system schema hoặc mục filesystem như `lost+found`; xử lý views cùng table thay vì giả định mọi đối tượng đều có thể copy như table vật lý. `SHOW TABLE STATUS` có thể rất chậm trên InnoDB lớn, nên chỉ gọi khi workflow thực sự cần metadata đó. Đừng lấy danh sách rồi khóa từng table nối tiếp như thể toàn bộ backup cùng một thời điểm: DDL có thể tạo/đổi/xóa object giữa các bước, và object mới có thể lọt khỏi snapshot logic.

Nếu workflow cần khóa và flush, khóa một tập đã xác định hoặc dùng global read lock theo consistency protocol; đo thời gian chờ và giữ lock ngắn nhất có thể. `FLUSH LOGS` quay sang log mới, giúp manifest bắt đầu tại ranh giới file tiện hơn, nhưng cũng đóng/mở log liên quan; trước đó bảo đảm log cũ đã được archive và retention không xóa lịch sử cần cho PITR. Ghi coordinate gắn với consistency point. Với MySQL 8.4, source lấy binlog position/GTID bằng `SHOW BINARY LOG STATUS`, replica lấy trạng thái channel/applier bằng `SHOW REPLICA STATUS`; script có thể không chạy được một lệnh tùy role/quyền, nên lưu trạng thái có thể lấy được và ghi rõ lệnh nào không áp dụng. Tên `SHOW MASTER STATUS`/`SHOW SLAVE STATUS` trong sách là cú pháp cũ.

## Bảo vệ corruption và giới hạn repair

InnoDB crash recovery xử lý crash bình thường; corruption có thể đến từ RAM/storage, thiết bị báo flush sai, firmware/cache không có bảo vệ, bug hoặc sai thao tác. Mức hỏng quyết định cách cứu:

- **Secondary index hỏng:** thường có thể dựng lại index từ clustered data nếu row gốc còn đọc được.
- **Clustered index hỏng:** ảnh hưởng chính các row; có thể phải dump theo range nhỏ để bỏ qua page gây crash, và chấp nhận thiếu phần không đọc được.
- **System structure hỏng:** redo/transaction log, undo area hay data dictionary có thể buộc dump phần còn cứu được rồi dựng lại từ backup tốt.

Nếu InnoDB không khởi động, `innodb_force_recovery` là cơ chế khẩn cấp để cố đọc/xuất dữ liệu, không phải cách repair để tiếp tục production. Giá trị 0 là startup bình thường; mức 1–6 lần lượt tắt thêm một phần kiểm tra/recovery để server có thể mở đủ lâu cho việc trích dữ liệu. Ở MySQL 8.4, các mức có ý nghĩa sau:

| Mức | Điều bị bỏ qua | Hệ quả cần hiểu |
| ---: | --- | --- |
| 1 | Bỏ qua phát hiện một số trang hỏng và cố để `SELECT` đi qua record/page hỏng | Có thể đọc được phần dữ liệu còn nguyên; kết quả dump có thể thiếu phần hỏng. |
| 2 | Dừng master thread và purge thread | Tránh crash lặp trong background/purge; không phải trạng thái vận hành bình thường. |
| 3 | Không rollback transaction sau crash recovery | Transaction chưa hoàn tất có thể còn dấu vết; dump phải được xem là nguồn trích xuất khẩn cấp. |
| 4 | Không merge change buffer; không tính một số table statistics | InnoDB chuyển read-only; file dữ liệu có thể bị hỏng vĩnh viễn và secondary index có thể cần dựng lại. |
| 5 | Không đọc undo log khi khởi động, nên có thể coi transaction chưa hoàn tất như đã commit | Có thể lộ trạng thái không nhất quán và làm hỏng file dữ liệu. |
| 6 | Không redo log để roll forward | Page giữ trạng thái cũ, có thể làm hỏng thêm B-tree và cấu trúc khác. |

Ở mọi mức khác 0, MySQL 8.4 chặn `INSERT`, `UPDATE`, `DELETE`; mức 4 trở lên được xem là read-only và mức 4+ có thể làm hỏng vĩnh viễn datafile. Bắt đầu từ 1, chỉ tăng từng mức nếu lần trước chưa khởi động/đọc được; thử mức 4+ trên một bản sao vật lý riêng trước khi cân nhắc bất kỳ production instance nào. Khi đọc được, dump dữ liệu ra nơi khác rồi dựng lại từ backup/schema sạch; đừng hạ cờ rồi tiếp tục dùng data directory như thể đã repair. Nếu corruption chặn việc đọc toàn bảng, thử trích các range nhỏ; đôi khi đọc theo khóa chính giảm dần lấy được phần nằm sau vùng hỏng, nhưng kết quả không được bảo đảm và cần kiểm tra chéo.

Sách mô tả mức 1–6 và xem mức tới 4 là ít nguy hiểm hơn trong bối cảnh phiên bản xuất bản. Không áp dụng lời khuyên đó cho MySQL 8.4: manual hiện hành cảnh báo mức 4 trở lên có thể làm hỏng vĩnh viễn file dữ liệu. Luôn theo tài liệu đúng release và ưu tiên restore backup tốt hơn tự cứu system structure.

Tránh sửa backup gốc trong lúc phân tích. Giữ bản copy, lưu logs/coordinates, hash file và ghi lại thao tác. Nếu không chắc bộ file nhất quán, ưu tiên backup đã kiểm chứng hơn là ép một data directory hỏng tiếp tục chạy.

## Truyền backup lớn mà vẫn kiểm soát được lỗi

Một file backup đi từ nguồn đến đích có thể bị giới hạn bởi CPU nén, tốc độ đọc/ghi, băng thông mạng, mã hóa SSH hoặc tốc độ giải nén. Cách tuần tự “nén ra file → copy file → giải nén” thường đọc và ghi dữ liệu trung gian nhiều lần. Pipeline cho phép các bước chạy đồng thời và giảm I/O trung gian:

```bash
set -o pipefail
gzip -1 -c backup.sql | ssh backup-host 'cat > backup.sql.gz.tmp'
```

Ví dụ trên chỉ minh họa luồng dữ liệu; script production cần kiểm tra exit status, xác thực host, quyền file, dung lượng đĩa và dọn file tạm khi thất bại. Chỉ đổi tên file tạm thành tên chính thức sau khi stream hoàn tất và kiểm tra thành công. Nếu cần giải nén phía đích, thêm bước giải nén trong pipeline và vẫn ghi vào đường dẫn staging. Nén nhanh có thể tiết kiệm CPU và chỉ tăng dung lượng truyền ít; nén mạnh có thể làm CPU trở thành nút thắt. Chỉ benchmark trên cấu hình tương tự production.

SSH cung cấp mã hóa và xác thực peer khi cấu hình đúng, đổi lại có chi phí CPU. Truyền thô bằng `nc` bỏ qua bảo vệ này; không dùng trên mạng không tin cậy hoặc khi dữ liệu nhạy cảm. `rsync` hữu ích khi cần tiếp tục/chỉ gửi phần khác biệt, nhưng hiệu quả phụ thuộc khả năng tận dụng delta và trạng thái file đích. Với file backup bất biến, copy nguyên khối có thể đơn giản hơn.

Kiểm tra thành công phải bao gồm exit code của cả pipeline, kích thước/dung lượng dự kiến, checksum so sánh hai đầu khi threat model cần, và khả năng đọc/restore backup. CRC của gzip giúp phát hiện một số lỗi truyền ngẫu nhiên; nó không thay thế checksum mật mã khi cần kiểm tra identity/tampering. Không copy trực tiếp các file InnoDB đang hoạt động như thể chúng là một snapshot nhất quán; dùng physical-backup tool có hỗ trợ engine hoặc cơ chế snapshot được khóa/điều phối đúng.

Trước khi chạy song song nhiều luồng, hãy đo CPU, disk queue/latency, network throughput và I/O của MySQL. Thêm worker khi tài nguyên còn dư có thể rút thời gian; chạy quá nhiều luồng có thể làm backup tranh tài nguyên với workload chính và kéo dài cả hai.

## Tự kiểm tra

**Backup full tối qua đáp ứng RPO 5 phút?** Không. Cần binlog liên tục có thể khôi phục, giữ ngoài failure domain nguồn và kiểm tra độ trễ archive.

**`--single-transaction` làm mọi engine/table nhất quán?** Không. Nó áp dụng snapshot cho transactional tables; DDL đồng thời và nontransactional tables vẫn cần kế hoạch riêng.

**Snapshot là backup hoàn chỉnh ngay khi tạo?** Không. Cần copy ra nơi độc lập, đủ copy-on-write headroom trong lúc copy và test restore/recovery.

**PITR hoàn tất khi binlog replay xong?** Chưa. Còn validation, warmup, endpoint cutover, client reconnect và xác nhận RTO/RPO thực tế.

**Có thể đặt `innodb_force_recovery=4` vì sách nói mức này ít nguy hiểm không?** Không nên áp lời khuyên cũ cho MySQL 8.4. Manual hiện hành xem mức 4 trở lên là nguy hiểm với datafile; thử trên bản sao riêng và tăng từng nấc chỉ để trích dữ liệu.

**Mức 3 và 5 giống nhau vì đều bỏ rollback?** Không. Mức 3 bỏ transaction undo sau crash recovery; mức 5 bỏ đọc undo log khi khởi động và có thể coi transaction chưa hoàn tất là đã commit, nên rủi ro khác và cao hơn.

Nguồn chính: *High Performance MySQL*, chương 15, PDF tr. 692–693 (trang in 662–663) về script building blocks và PDF tr. 686–688 (trang in 656–658) về crash recovery, dạng corruption và mức `innodb_force_recovery`. Tool như `mylvmbackup`, `mysqlhotcopy`, Maatkit, cờ `expire_logs_days` và ví dụ replication commands trong sách thuộc phiên bản lịch sử, cần đối chiếu trước khi chạy. Nội dung hiện hành được so với tài liệu MySQL 8.4 về [backup and recovery](https://dev.mysql.com/doc/refman/8.4/en/backup-and-recovery.html), [backup types](https://dev.mysql.com/doc/refman/8.4/en/backup-types.html), [backup methods](https://dev.mysql.com/doc/refman/8.4/en/backup-methods.html), [mysqldump](https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html), [PITR](https://dev.mysql.com/doc/refman/8.4/en/point-in-time-recovery.html), [binary-log retention/purge](https://dev.mysql.com/doc/refman/8.4/en/replication-options-binary-log.html), [`SHOW BINARY LOG STATUS`](https://dev.mysql.com/doc/refman/8.4/en/show-binary-log-status.html), [`SHOW REPLICA STATUS`](https://dev.mysql.com/doc/refman/8.4/en/show-replica-status.html), [START REPLICA UNTIL](https://dev.mysql.com/doc/refman/8.4/en/start-replica.html), [table-level replication filters](https://dev.mysql.com/doc/refman/8.4/en/replication-rules-table-options.html), [server shutdown](https://dev.mysql.com/doc/refman/8.4/en/server-shutdown.html), và [các mức ép InnoDB recovery](https://dev.mysql.com/doc/refman/8.4/en/forcing-innodb-recovery.html).

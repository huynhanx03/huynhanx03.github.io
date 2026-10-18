---
title: "Vacuum, freezing và bảo trì PostgreSQL"
category: "Database"
description: "Vì sao PostgreSQL cần vacuum, autovacuum làm gì và cách phòng transaction ID wraparound."
updated: 2026-10-17
translationKey: "database/postgresql-vacuum-freezing-and-maintenance"
---

PostgreSQL giữ phiên bản cũ của row để snapshot đang chạy có thể đọc đúng dữ liệu. Khi không còn snapshot nào cần chúng, các tuple chết có thể được thu hồi để tái sử dụng. **VACUUM** thực hiện phần dọn dẹp này và duy trì metadata; nó không đơn giản là lệnh “nén bảng”. Bỏ vacuum lâu ngày vừa làm tăng dung lượng, vừa có thể khiến hệ thống phải dừng ghi để chống transaction ID wraparound.

## VACUUM thường làm gì?

`VACUUM` quét heap và index theo các cơ chế tương ứng, nhận diện tuple không còn cần thiết, cho phép page dùng lại không gian, cập nhật free-space/visibility maps và cập nhật thông tin transaction visibility. Không gian thường được giữ trong relation để lần ghi sau dùng lại; VACUUM thường không trả toàn bộ dung lượng đó về filesystem.

`VACUUM (ANALYZE)` còn thu thập thống kê cho planner. `ANALYZE` riêng chỉ cập nhật thống kê chọn mẫu, không dọn tuple chết. `VACUUM FULL` viết lại relation để thu gọn file nhưng cần khóa mạnh và thêm dung lượng tạm; đây là thao tác bảo trì có downtime/impact, không phải lịch chạy hằng ngày.

## Autovacuum và ngưỡng

Autovacuum launcher theo dõi database và khởi chạy worker cho table cần vacuum hoặc analyze. Ngưỡng dựa trên số row chết cộng với một tỷ lệ của table (các tham số như `autovacuum_vacuum_threshold`, `autovacuum_vacuum_scale_factor`), cùng các điều kiện riêng cho analyze và wraparound. Vì scale factor nhân với kích thước, một bảng rất lớn có thể tích lũy nhiều row chết trước khi chạm ngưỡng mặc định.

Điều chỉnh nên dựa vào tốc độ update/delete, kích thước table, thời gian vacuum, I/O, dead tuples và độ mới của thống kê. Có thể đặt tham số theo table để xử lý bảng nóng/lớn, nhưng tăng worker hoặc giảm ngưỡng làm tăng I/O và cạnh tranh CPU. `autovacuum` không nên bị tắt như cách chữa chậm query; cần tìm liệu nguyên nhân là workload, horizon bị giữ, thiếu tài nguyên hay ngưỡng chưa phù hợp.

Với PostgreSQL 14, ngưỡng UPDATE/DELETE mặc định xấp xỉ `50 + 0.2 × pg_class.reltuples`. Vì `reltuples` là ước lượng, bảng một tỷ row có thể chờ khoảng 200.000.050 dead tuple trước ngưỡng tỷ lệ; cấu hình riêng của table và ngưỡng XID có thể đổi thời điểm chạy. Đây là lý do nên tính và đo theo từng bảng lớn, không sao chép một scale factor cho mọi table.

## Transaction ID và freezing

PostgreSQL dùng XID 32-bit và so sánh chúng theo vòng tròn. Nếu hệ thống chạy quá khoảng nửa vòng số XID mà chưa xử lý tuple cũ, row từng được tạo trong quá khứ có thể bị hiểu nhầm là row “ở tương lai”. **Freezing** đánh dấu tuple còn sống là đã commit từ rất lâu, nên nó không còn phụ thuộc vào việc XID cũ được tái sử dụng. Freeze khác cleanup: cleanup thu hồi phiên bản row chết; freeze giữ phiên bản còn sống an toàn qua các vòng XID.

Server theo dõi cutoff `pg_class.relfrozenxid` cho từng table và cutoff database `pg_database.datfrozenxid`. Autovacuum sẽ bị buộc chạy khi table tiến gần tuổi an toàn, kể cả khi autovacuum thông thường bị tắt. PostgreSQL 14 còn có các mốc riêng cho tuple đủ tuổi để freeze, aggressive scan, forced vacuum và failsafe ưu tiên an toàn; xem [các pha VACUUM và freezing XID](/vi/notes/database/postgresql-vacuum-phases-and-freezing/) để hiểu bảng ngưỡng, `all_visible`/`all_frozen`, MultiXact và cách đọc tuổi từng table. Nếu bảo vệ thất bại, hệ thống có thể từ chối transaction mới để tránh hỏng tính đúng đắn.

Theo dõi `age(relfrozenxid)` theo table, `age(datfrozenxid)` theo database, tuổi MultiXact (`relminmxid`/`datminmxid`), log autovacuum và tiến độ vacuum. Một transaction lâu, prepared transaction hoặc replication slot cũ có thể giữ horizon khiến vacuum không tiến được; tìm nguyên nhân trước khi chỉ tăng worker hay ngưỡng. Đừng đợi đến cảnh báo wraparound nghiêm trọng mới xử lý.

## Horizon bị giữ và bloat

Một transaction mở quá lâu giữ snapshot cũ; replication slot có thể giữ WAL và horizon; standby có thể trì hoãn cleanup để bảo vệ query đang chạy. Khi đó vacuum có thể chạy nhưng không thu hồi được những phiên bản vẫn còn khả năng được tham chiếu. Tìm transaction/slot/replica giữ horizon bằng thống kê và catalog, rồi xử lý đúng chủ thể. Xóa slot đang hoạt động có thể làm replica không thể tiếp tục đồng bộ.

Bloat là phần không gian relation chưa thể tái sử dụng hoặc phình do cập nhật/xóa và đặc điểm workload. Đo bằng công cụ phù hợp thay vì chỉ nhìn kích thước file; phân biệt bloat table, index, TOAST và WAL. Reindex hoặc rewrite có chi phí khóa, I/O và dung lượng; chọn công cụ online thích hợp và thử trên bản sao.

## Đo mật độ trước khi quyết định rewrite

Kích thước file lớn chưa đủ để kết luận table đang bloat. Một relation có thể lớn vì nó thật sự chứa nhiều dữ liệu; ngược lại, hai table cùng kích thước nhưng một table có ít tuple hữu ích hơn sẽ cần nhiều page hơn cho cùng một truy vấn quét toàn bộ. Cần nhìn đồng thời kích thước, số tuple sống, tuple chết và khoảng trống có thể dùng lại.

`pgstattuple` đọc toàn bộ relation rồi ước lượng chính xác số byte dành cho tuple sống, tuple chết và free space. Đổi lại, phép đo phải đọc nhiều dữ liệu nên bản thân nó có thể tốn I/O. `pgstattuple_approx` tận dụng visibility map để bỏ qua các page đã biết là all-visible và ước lượng phần còn lại; kết quả nhanh hơn nhưng không phải phép đo chính xác tuyệt đối. Đây là extension, cần cài trong database trước khi gọi.

Với B-tree, `pgstatindex` cho biết các chỉ số như `avg_leaf_density`, mức sử dụng trung bình của leaf page, và `leaf_fragmentation`, mức độ các leaf page không còn liền nhau theo thứ tự vật lý. Nó cũng phải đọc index nên hãy coi đây là thao tác quan sát có chi phí, không phải truy vấn nhẹ để chạy liên tục. Tỷ lệ giữa kích thước relation và số byte dữ liệu lấy từ catalog chạy nhanh hơn, nhưng chỉ là dấu hiệu thô: nó không trực tiếp cho biết mỗi page chứa bao nhiêu tuple hữu ích.

Sách minh họa bằng một table ban đầu khoảng 67 MB và index khoảng 109 MB. Sau khi xóa 90% row rồi chạy VACUUM thường, kích thước file gần như giữ nguyên; mật độ tuple sống được đo khoảng 9.13% ở table và 6.71% ở index. Sau `VACUUM FULL`, ví dụ đó còn khoảng 6,904 kB và 6,504 kB, với mật độ lần lượt khoảng 91.23% và 91.08%. Đây là kết quả của dữ liệu và phiên bản trong ví dụ sách, không phải ngưỡng phổ quát để đem so với production. Điều cần rút ra là VACUUM thường làm page trống có thể tái sử dụng, còn rewrite mới gom tuple sống vào ít page hơn và thu nhỏ file.

## VACUUM FULL viết lại relation

VACUUM thường giữ page trống bên trong relation để lần INSERT/UPDATE sau dùng lại. Nếu các page trống nằm ở cuối file, một số page có thể được cắt khỏi relation và trả dung lượng cho hệ điều hành; khoảng trống rải rác bên trong file thường không làm file nhỏ đi. Vì thế, VACUUM có thể giảm công việc ghi về sau mà kích thước file vẫn không đổi.

`VACUUM FULL` tạo một bản viết lại gọn hơn của table, rồi xây lại các index tương ứng. Trong lúc làm, bản cũ và bản mới cùng tồn tại, nên cần dự trù thêm dung lượng trống đáng kể. Lệnh giữ `ACCESS EXCLUSIVE` lock trên table: cả truy vấn đọc lẫn ghi đều phải chờ. Nó có thể hữu ích khi cần trả dung lượng thật sự về filesystem và số liệu cho thấy relation đang thưa, nhưng cái giá là thời gian khóa, I/O và disk headroom. Nếu chỉ muốn reclaim không gian để table tự dùng lại, VACUUM thường thường phù hợp hơn.

Có thể theo dõi thao tác rewrite bằng `pg_stat_progress_cluster`; tên view lịch sử có chữ “cluster” vì VACUUM FULL dùng cơ chế viết lại relation liên quan đến `CLUSTER`. Hãy đọc phase cùng các bộ đếm của view thay vì suy ra tiến độ chỉ từ phần trăm dung lượng. Sau rewrite, tuple được freeze trong quá trình xây bản mới với chi phí tăng thêm nhỏ, nhưng điều đó không đồng nghĩa visibility map đã đánh dấu mọi page là `all_visible` hoặc `all_frozen`. Một lần VACUUM sau đó có thể cập nhật các trạng thái page này. Đừng nhầm việc freeze tuple với việc đánh dấu page cho index-only scan.

Trước khi chọn rewrite, hãy trả lời ba câu: cần giảm dung lượng trên filesystem hay chỉ cần chỗ trống dùng lại; phép đo nào cho thấy phần dữ liệu hữu ích thấp; và hệ thống có đủ disk tạm cùng khoảng bảo trì để khóa table không? Nếu câu trả lời chưa rõ, tiếp tục thu thập số liệu và xử lý nguyên nhân giữ horizon trước.


## Các cách rebuild khác và cách giảm thời gian gián đoạn

`CLUSTER table USING index_name` viết lại table theo thứ tự của một index. Điều đó có thể giúp một số truy vấn index đọc các row gần nhau hơn trên đĩa, nhưng thứ tự vật lý không được duy trì khi table tiếp tục INSERT/UPDATE. `CLUSTER` cũng cần khóa mạnh trong toàn bộ quá trình và có yêu cầu dung lượng tạm tương tự rewrite. Đây là lựa chọn có mục tiêu cụ thể, không phải “bật clustering” vĩnh viễn.

`REINDEX` xây lại index mà không viết lại heap table. Dùng nó khi vấn đề nằm ở index và đã có số liệu phù hợp; nó không thu gọn phần heap bloat. Các chế độ online như `REINDEX CONCURRENTLY` giảm thời gian khóa ghi theo quy trình nhiều bước, nhưng không loại bỏ mọi khóa ngắn hay chi phí I/O/disk. Luôn kiểm tra hỗ trợ của phiên bản PostgreSQL đang chạy.

Nếu cần xóa toàn bộ row, `TRUNCATE` thường tạo file rỗng mới nhanh hơn `DELETE` tất cả row rồi chờ VACUUM dọn. Nhưng `TRUNCATE` có ngữ nghĩa khác: nó khóa table, có hành vi khác với từng row bị xóa đối với trigger, foreign key và MVCC; hãy chọn theo yêu cầu ứng dụng, không chỉ theo tốc độ.

Khi không thể khóa table lâu, công cụ như `pg_repack` tạo bản mới trong khi ứng dụng tiếp tục ghi, ghi lại các thay đổi phát sinh rồi đồng bộ trước bước hoán đổi cuối. Vì phải theo dõi và phát lại thay đổi, cách này phức tạp hơn, cần thêm dung lượng và vẫn cần khóa ngắn ở đầu/cuối; extension cũng phải tương thích đúng với phiên bản server. `pgcompacttable` theo hướng khác: dịch chuyển row dần về đầu file bằng các UPDATE không đổi giá trị, xen giữa là VACUUM để thu hồi page ở cuối. Cách này tránh cần một bản rebuild đầy đủ nhưng chậm, tạo thêm write/I/O và không phải lựa chọn nhẹ nhàng miễn phí.

## Ngăn bloat do snapshot dài và đợt cập nhật lớn

Một transaction chỉ đọc vẫn có thể giữ snapshot cũ. Nếu trong lúc đó workload khác liên tục UPDATE/DELETE, vacuum không thể xóa các phiên bản mà snapshot ấy còn có thể nhìn thấy. Tách tải đọc sang replica có thể giảm áp lực trên primary trong một số kiến trúc, nhưng đổi lại là chi phí vận hành, độ trễ replication và khả năng đọc dữ liệu chưa mới. Trước hết hãy kiểm tra transaction thực sự cần giữ lâu hay ứng dụng/driver vô tình để transaction mở.

Sách nêu `old_snapshot_threshold` để giới hạn tuổi snapshot: sau ngưỡng, truy vấn cũ có thể nhận lỗi `snapshot too old` nếu cần đọc page đã thay đổi. Đây là một cơ chế có đánh đổi về tính khả dụng của snapshot, không phải cách sửa transaction bị rò rỉ; xác nhận tính năng còn tồn tại và hành vi của phiên bản server trước khi dựa vào nó. `idle_in_transaction_session_timeout` là biện pháp khác: nó hủy session đang idle bên trong transaction sau thời gian cấu hình, nhưng không thay thế việc quản lý transaction trong ứng dụng.

Một đợt UPDATE toàn bảng tạo version mới trước khi vacuum kịp thu hồi version cũ, khiến kích thước có thể tăng mạnh. Với table sách minh họa 50.000 row, thêm một cột trạng thái rồi đổi giá trị cả table làm `pg_table_size` tăng từ khoảng 6,936 kB lên 14 MB. Thay vì một transaction khổng lồ, xử lý theo batch nhỏ, commit giữa các batch để vacuum có cơ hội tái sử dụng page. Mẫu sau chọn và khóa tối đa một batch; `SKIP LOCKED` bỏ qua row worker khác đang giữ để worker này xử lý row khác:

```sql
WITH batch AS (
  SELECT id
  FROM items
  WHERE NOT processed
  ORDER BY id
  LIMIT 1000
  FOR UPDATE SKIP LOCKED
)
UPDATE items AS i
SET processed = true
FROM batch
WHERE i.id = batch.id;
```

Commit mỗi batch, chạy/để autovacuum xử lý theo nhịp phù hợp, rồi tiếp tục đến khi hết row. Batch nhỏ làm giảm lượng version chết dồn cùng lúc và giúp dừng/chạy lại linh hoạt; đổi lại có thêm transaction và cần thiết kế tiêu chí chọn row sao cho tiến trình không bỏ sót. Đây không bảo đảm file lập tức nhỏ đi: mục tiêu trước mắt là tái sử dụng page và tránh một đỉnh bloat lớn.

## Quy trình thực tế

Khi thấy table tăng nhanh: kiểm tra write rate, dead tuples, lần vacuum/analyze gần nhất, log autovacuum, transaction lâu và replication slot. Xác nhận thống kê planner có cũ không. Chỉ tăng tài nguyên/đổi ngưỡng sau khi hiểu bottleneck, rồi theo dõi thời gian xử lý và tác động đến latency.

Sách *PostgreSQL Internals 14*, Part I, giải thích vacuum, visibility và freezing. Tài liệu: [routine vacuuming](https://www.postgresql.org/docs/14/routine-vacuuming.html), [VACUUM](https://www.postgresql.org/docs/14/sql-vacuum.html), [CLUSTER](https://www.postgresql.org/docs/14/sql-cluster.html), [REINDEX](https://www.postgresql.org/docs/14/sql-reindex.html), [progress reporting](https://www.postgresql.org/docs/14/progress-reporting.html#VACUUM-PROGRESS-REPORTING), [pgstattuple](https://www.postgresql.org/docs/14/pgstattuple.html), [autovacuum configuration](https://www.postgresql.org/docs/14/runtime-config-autovacuum.html), [transaction ID wraparound](https://www.postgresql.org/docs/14/routine-vacuuming.html#VACUUM-FOR-WRAPAROUND) và [monitoring statistics](https://www.postgresql.org/docs/14/monitoring-stats.html).

## Tự kiểm tra

**VACUUM thường có làm file table nhỏ lại ngay không?** Không; nó thường đánh dấu không gian để relation tái sử dụng.

**`ANALYZE` có xóa tuple chết không?** Không. Nó thu thập thống kê; `VACUUM` mới xử lý cleanup.

**Có thể tắt autovacuum khi nó tạo I/O?** Chỉ tắt mà không thay quy trình bảo trì sẽ tích lũy tuple chết và tăng rủi ro wraparound. Hãy điều chỉnh workload/tài nguyên/ngưỡng theo số liệu.

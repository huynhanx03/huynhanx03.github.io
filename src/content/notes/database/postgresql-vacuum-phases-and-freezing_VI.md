---
title: "Các pha VACUUM, autovacuum và freezing XID"
category: "Database"
description: "Theo dõi heap scan, index cleanup, truncation, analyze, freeze age và rebuild trong PostgreSQL."
updated: 2026-10-18
translationKey: "database/postgresql-vacuum-phases-and-freezing"
---

VACUUM không phải một bước duy nhất. Nó phải xác định tuple chết an toàn theo transaction horizon, gỡ tham chiếu khỏi index, thu hồi heap space và cập nhật visibility/free-space metadata. Với table lớn, cách chia phase quyết định I/O, thời gian lock và mức write có thể tiếp tục.

## Heap scan và index cleanup

Heap scan dùng visibility map để bỏ qua page đã biết là an toàn, tìm các tuple chết vượt qua transaction horizon, và có thể cập nhật thông tin visibility/freeze. TID của mỗi tuple chết được đưa vào một mảng trong bộ nhớ. VACUUM chưa thể xóa tuple khỏi heap ở thời điểm này, vì một hoặc nhiều index vẫn có thể trỏ tới TID đó.

Mảng TID có giới hạn. Trong PostgreSQL 14, `maintenance_work_mem` giới hạn bộ nhớ cho manual VACUUM; autovacuum dùng `autovacuum_work_mem` nếu được đặt, nếu không dùng `maintenance_work_mem`, và bộ sưu tập TID có trần 1 GB. Nếu mảng đầy trước khi heap scan kết thúc, VACUUM chạy một chu kỳ trên các index để xóa entry trỏ tới TID đã thu thập, rồi quét heap để đánh dấu tuple tương ứng có thể tái sử dụng. Sau đó nó tiếp tục heap scan từ vị trí dở dang. Bảng nhiều dead tuple vì thế có thể cần nhiều chu kỳ index/heap; tăng memory có thể giảm số lượt quét index nhưng làm tăng memory của từng VACUUM worker.

Index không có đường tra cứu tổng quát từ heap TID ngược về index entry, nên index vacuum thường phải quét từng index để đối chiếu danh sách TID chết. PostgreSQL 14 có thể bỏ index cleanup khi chỉ có rất ít tuple chết (`INDEX_CLEANUP AUTO`), vì chi phí quét index có thể lớn hơn lợi ích tức thời. Nhưng entry chết và line pointer chưa được dọn sẽ còn tích lũy nếu cleanup bị bỏ liên tục. Parallel vacuum có thể xử lý các index đủ lớn song song: index phải vượt `min_parallel_index_scan_size` (mặc định PG14 là 512 kB), tối đa một worker cho mỗi index đủ điều kiện, và tổng worker còn bị giới hạn bởi `PARALLEL` cùng `max_parallel_maintenance_workers`. Nếu chỉ có một index đủ lớn thì không có nhiều index để chạy song song.

Heap cleanup chỉ tái sử dụng line pointer sau khi index entry tương ứng đã được dọn; đồng thời cập nhật free-space map và visibility map. Ở pha cuối, VACUUM có thể truncate các page rỗng ở đuôi relation để trả block về filesystem. Chi tiết implementation PostgreSQL 14 trong sách thử lấy `ACCESS EXCLUSIVE` lock tối đa 5 giây và chỉ truncate nếu tail rỗng chiếm ít nhất 1/16 relation hoặc dài ít nhất 1.000 page; đây là heuristic theo phiên bản, không phải ngưỡng hợp đồng của mọi PostgreSQL release. `vacuum_truncate` có thể tắt thao tác truncation nếu lock ngắn này gây ảnh hưởng. Hầu hết VACUUM thường vẫn giữ nguyên kích thước file.

`VACUUM` thường chạy cùng DML với lock nhẹ hơn `VACUUM FULL`, nhưng vẫn gây I/O và cần cleanup lock. Theo dõi `phase`, `max_dead_tuples`, `num_dead_tuples`, `index_vacuum_count`, heap blocks scanned/vacuumed và elapsed trong `pg_stat_progress_vacuum`. `index_vacuum_count` tăng nhiều lần cho thấy mảng TID bị đầy và phải chạy nhiều chu kỳ index/heap; index phase kéo dài gợi ý chi phí quét index, còn truncation kéo dài có thể là chờ lock ở cuối bảng.

### Trace: VACUUM gặp horizon bị giữ

Tạo một version row cũ, rồi cập nhật row để có version mới. Nếu không có reader nào cần version cũ, `VACUUM` có thể loại version cũ khỏi heap, dọn entry index tương ứng, chuyển slot heap sang `unused`, và cập nhật FSM. Nếu các tuple còn lại trên page visible với mọi snapshot, page có thể được ghi `all_visible` trong visibility map; đây là điều kiện hữu ích cho index-only scan, nhưng một lần ghi tiếp theo sẽ xóa trạng thái all-visible.

Bây giờ giữ một transaction ở session A sau khi nó đã được cấp XID và giữ horizon; session B cập nhật cùng một row hai lần rồi chạy `VACUUM`. Tuổi snapshot/horizon mới là điều quyết định, không phải việc A đang chạy query liên tục hay đang chờ ở prompt:

```sql
-- Session A: bắt đầu snapshot trước khi Session B cập nhật.
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT id FROM vac WHERE id = 1; -- giữ transaction/snapshot mở

-- Session B: cập nhật cùng row cần theo dõi.
UPDATE vac SET s = 'B' WHERE id = 1;
UPDATE vac SET s = 'C' WHERE id = 1;
VACUUM VERBOSE vac;
```

Giả sử `vac` là table thử nghiệm có row `id = 1` và không có query khác đang giữ snapshot cũ.

Trong trace của sách PostgreSQL 14, vacuum verbose thấy một version chết nhưng chưa thể dọn vì `oldest xmin` bị transaction khác giữ; các version còn sống vẫn phải giữ. Vì vậy index entry và heap version tương ứng chưa thể bị thu hồi an toàn. Khi session A `COMMIT`, horizon tiến lên; lần `VACUUM` sau dọn được version chết, xóa index reference và đánh dấu line pointer heap có thể tái sử dụng. Các dòng số đếm của `VACUUM VERBOSE` phụ thuộc trạng thái table, snapshot và phiên bản, nên hãy đọc chúng như bằng chứng cho lần chạy cụ thể, không phải ngưỡng cố định.

Trace này tách ba việc thường bị gộp làm một: version đã **không visible với snapshot mới**, version đã **không còn cần với bất kỳ snapshot nào**, và bytes/index references đã **được thu hồi vật lý**. Một transaction giữ horizon có thể khiến bước thứ hai chưa đúng; lúc đó VACUUM không được phép hoàn tất bước thứ ba.

### Cost-based throttling điều tiết VACUUM

VACUUM có thể chạy không giữ độc quyền table, nhưng page scan và page dirty vẫn tranh I/O, buffer cache và CPU với workload. PostgreSQL gán một **cost** ước lượng cho page activity: trong ví dụ PostgreSQL 14 của sách, buffer hit tốn 1 unit, đọc page từ disk tốn 2 unit, và làm dirty page sạch tốn thêm 20 unit. Khi tổng cost chạm `vacuum_cost_limit`, tiến trình ngủ `vacuum_cost_delay` rồi tiếp tục. Đây là bộ điều tiết theo công việc ước lượng, không phải giới hạn chính xác số IOPS hoặc thời gian query.

Default PostgreSQL 14 của manual VACUUM là `vacuum_cost_delay = 0` và `vacuum_cost_limit = 200`, nên tiến trình không ngủ vì cost limit; khi delay bằng 0 thì chỉnh limit không tạo throttling hữu hiệu. Autovacuum có `autovacuum_vacuum_cost_delay` và `autovacuum_vacuum_cost_limit` riêng; giá trị `-1` kế thừa tham số manual. Sách ghi default delay 2 ms cho autovacuum. Khi nhiều worker cùng chạy, cost limit được chia sẻ/phân bổ giữa chúng để tổng tải duy trì gần ngân sách cấu hình; tăng worker mà không tăng ngân sách tương ứng có thể không tăng tốc đáng kể. Table và TOAST table có thể override delay/limit riêng.

Điều chỉnh cần nhìn cả tốc độ hoàn tất lẫn tác động lên user query. Tăng cost delay hoặc hạ limit giảm áp lực tức thời nhưng VACUUM lâu hơn, có thể để dead tuple và XID age tăng. Giảm delay/tăng limit giúp cleanup nhanh hơn nhưng tiêu thụ tài nguyên và có thể đẩy latency lên. Tham số là núm điều chỉnh mức độ, không thay thế việc tìm horizon bị giữ hay xử lý backlog.

### Đọc progress để nhận ra vacuum phải quét nhiều lượt

`pg_stat_progress_vacuum` cho biết phase hiện tại và tiến độ như `heap_blks_total`, `heap_blks_scanned`, `heap_blks_vacuumed`, `max_dead_tuples`, `num_dead_tuples` và `index_vacuum_count`. Tiến độ có thể nhảy theo từng đoạn: khi mảng TID đầy, VACUUM dừng heap scan để quét các index rồi quay lại heap. Do đó tỷ số `heap_blks_vacuumed / heap_blks_total` không luôn tăng đều.

Nếu `index_vacuum_count` lớn hơn 1, mảng dead TID không chứa được mọi tuple của lượt heap scan nên tiến trình phải lặp index cleanup và heap cleanup. Trong ví dụ sách, `maintenance_work_mem = 1MB` cùng khoảng 500 nghìn row được update khiến vacuum phải chạy ba lượt index scan; số cụ thể thay đổi theo tuple size, số index và page layout. Có thể giảm số lượt bằng VACUUM thường xuyên hơn để mỗi lần tích lũy ít dead tuple hơn, hoặc tăng bộ nhớ nếu hệ thống còn ngân sách; đổi lại mỗi worker có thể giữ nhiều memory hơn.

Để theo dõi autovacuum sau khi hoàn tất, `log_autovacuum_min_duration = 0` ghi mọi lần chạy. Log có thể cho thấy số index scan, page bị bỏ qua, dead/nonremovable tuples, oldest xmin, buffer/WAL usage và elapsed time. Dùng progress view để xem việc đang chạy; dùng log để điều tra các lần đã xong. Không so hai lần chạy bằng mỗi tổng thời gian: workload, cache warmth, số dead TID, lock wait và I/O đều có thể khác.

## ANALYZE và autovacuum thresholds

`ANALYZE` lấy mẫu column để cập nhật null fraction, distinct, MCV và histogram cho planner. Tăng statistics target giúp skew/multimodal data chính xác hơn nhưng tăng catalog/storage/analyze cost. Extended statistics nắm quan hệ nhiều column khi selectivity độc lập giả định sai.

Autovacuum launcher chọn table dựa trên dead tuple count và scale factor, insert-triggered vacuum/analyze, tuổi XID và freeze rules. Table nhỏ có thể bị threshold cố định chi phối; table khổng lồ thì scale factor tạo số dead tuple rất lớn. Table-level tuning giúp, nhưng vacuum cost delay/throttle ảnh hưởng tốc độ cleanup. Giảm delay/tăng worker tăng I/O/CPU.

### Launcher chia việc cho worker ra sao?

Trong PostgreSQL 14, autovacuum cần cả `autovacuum = on` và `track_counts = on` để dùng thống kê chọn table. Launcher kiểm tra các database theo `autovacuum_naptime`, rồi khởi chạy worker cho database có việc; tổng số worker đang chạy bị giới hạn bởi `autovacuum_max_workers`. Một worker kết nối vào một database, lập danh sách relation cần vacuum/analyze rồi xử lý từng relation; worker bổ sung có thể xử lý relation khác khi backlog dài. Mức song song này giúp nhiều table tiến triển cùng lúc, nhưng không có nghĩa một autovacuum worker tự chia heap scan của cùng table cho nhiều worker.

Danh sách vacuum có thể gồm table thường, materialized view và TOAST table; danh sách analyze gồm table thường và materialized view, không gồm TOAST table. Storage parameters của table và TOAST table có thể được cấu hình riêng, chẳng hạn `autovacuum_enabled` và ngưỡng tương ứng. Manual `VACUUM` có tùy chọn/điều kiện parallel index cleanup; sách PostgreSQL 14 lưu ý autovacuum không dùng cách chạy nhiều worker song song để xử lý nhiều index của cùng relation. Đừng suy ra giới hạn đó áp dụng cho mọi cơ chế autovacuum của các phiên bản mới hơn.

`autovacuum_work_mem` kiểm soát bộ nhớ thu thập TID chết cho worker; nếu là `-1`, worker dùng `maintenance_work_mem`. Vì mỗi worker có thể giữ mảng riêng, ngân sách bộ nhớ tiềm năng tăng theo số worker đang chạy. Tăng `autovacuum_max_workers` mà không tính memory, I/O, CPU và lock contention có thể khiến maintenance tranh tài nguyên với workload thay vì làm bảng sạch nhanh hơn. Cũng lưu ý tắt autovacuum thường không tắt được worker bảo vệ chống XID/MultiXact wraparound.

### Tự tính ngưỡng thay vì đoán

Với vacuum do `UPDATE`/`DELETE`, PostgreSQL 14 ước lượng ngưỡng bằng:

```text
autovacuum_vacuum_threshold
+ autovacuum_vacuum_scale_factor × pg_class.reltuples
```

Default PostgreSQL 14 là `50 + 0.2 × reltuples`. `reltuples` là ước lượng số tuple trong catalog, không phải bộ đếm chính xác. Bảng 100 nghìn row vì vậy có ngưỡng khoảng 20.050 dead tuple; bảng 1 tỷ row có ngưỡng khoảng 200.000.050. Cùng default có thể hợp lý với bảng nhỏ nhưng để bảng lớn tích lũy quá nhiều dead tuple.

`INSERT` có ngưỡng vacuum riêng: `autovacuum_vacuum_insert_threshold + autovacuum_vacuum_insert_scale_factor × reltuples`, mặc định PG14 là `1000 + 0.2 × reltuples`. Loại vacuum này có thể đánh dấu page insert-only là all-visible và hỗ trợ freeze tuple. `ANALYZE` dùng ngưỡng khác: `autovacuum_analyze_threshold + autovacuum_analyze_scale_factor × reltuples` (mặc định `50 + 0.1 × reltuples`), nên không thể dùng ngưỡng vacuum để đoán khi planner statistics được làm mới.

Ngưỡng chỉ khiến launcher xem xét table, không đảm bảo worker bắt đầu đúng ngay con số đó: thống kê có sai số, launcher chạy theo chu kỳ, worker có giới hạn, và `reloptions` có thể ghi đè cấu hình server. Tuổi XID cũng có thể buộc vacuum sớm hơn. Khi điều tra, đối chiếu `pg_class.reltuples`, `pg_stat_all_tables.n_dead_tup`, settings hiệu lực và storage parameters của table; đừng nhân default với số row ứng dụng báo về rồi coi đó là thời điểm chạy chính xác.

### Trace: ngưỡng thay đổi khi `reltuples` được cập nhật

Ở table vừa tạo hoặc vừa `TRUNCATE`, `pg_class.reltuples` có thể là `-1`: PostgreSQL chưa có ước lượng cardinality, không phải table thật sự chứa số row âm. Khi tính trigger, giá trị âm được coi như 0. Với default PostgreSQL 14, table này vì vậy bắt đầu ở ngưỡng dead tuple `50 + 0.2 × 0 = 50` và ngưỡng insert `1000 + 0.2 × 0 = 1000`.

Sau khi autoanalyze chạy và ước lượng `reltuples = 1000`, ngưỡng thay đổi thành khoảng 250 dead tuple, 1.200 insert và 150 row modification cho autoanalyze. Nếu sau đó 251 row bị update/delete, bộ đếm thống kê có thể vượt ngưỡng 250; khi table cho phép autovacuum, worker sẽ chọn nó ở lượt kiểm tra thích hợp. Trình tự này cho thấy threshold phụ thuộc đồng thời vào **counter sự kiện** và **ước lượng kích thước**; vì thế table mới có thể được xử lý sớm để tạo thống kê ban đầu, rồi ngưỡng tăng sau khi thống kê có mặt.

Con số này là trace trong sách, không phải dự báo thời điểm chính xác: counter có thể trễ hoặc chỉ là ước lượng, launcher kiểm tra theo chu kỳ, worker có thể đang bận, và per-table `reloptions` có thể đổi các hệ số. Với TOAST table, tên storage parameter có tiền tố `toast.`; đừng so giá trị global với table-specific threshold rồi xem như cùng cấu hình.

## Freeze và wraparound

XID thông thường là bộ đếm 32-bit. PostgreSQL so sánh chúng theo vòng tròn modulo `2^32`: với một XID bất kỳ, xấp xỉ nửa không gian được xem là quá khứ và nửa còn lại là tương lai. Vì vậy hệ thống phải xử lý một tuple trước khi tuổi XID của nó vượt khoảng hai tỷ transaction; nếu không, một row rất cũ có thể trông như row được tạo trong tương lai và biến mất khỏi các snapshot.

Điều quan trọng là so **tuổi tương đối**, không so con số XID bằng phép `<` thông thường. Ví dụ, sau khi bộ đếm đi qua giới hạn, XID `5` có thể mới hơn XID `4,294,967,290` dù con số nhỏ hơn. Có thể hình dung các XID nằm trên mặt đồng hồ: nửa vòng phía sau là quá khứ, nửa phía trước là tương lai. Sau hơn nửa vòng, một XID cũ sẽ rơi vào vùng bị hiểu là tương lai — đó là lý do giới hạn an toàn khoảng hai tỷ chứ không phải chờ đủ bốn tỷ.

PostgreSQL dùng `FullTransactionId` 64-bit có thêm epoch để theo dõi các vòng XID trong một số cấu trúc nội bộ, nhưng tuple header vẫn lưu XID 32-bit cho `xmin`/`xmax`; ghi 64-bit cho mọi transaction ID sẽ làm mọi tuple nặng thêm. Epoch giúp hệ thống biết vòng nào đang diễn ra, nhưng không làm một `xmin` cũ trong tuple miễn nhiễm wraparound. Freeze mới là cách xác nhận row đã cũ đến mức có thể bỏ qua XID đó.

### Freeze thay đổi điều gì?

`xmin` ghi transaction đã tạo phiên bản row. Khi transaction đó đủ cũ và chắc chắn đã commit trước mọi snapshot hiện tại, VACUUM có thể **freeze** phiên bản: từ đó visibility không cần dựa vào tuổi `xmin` thông thường nữa. Trên PostgreSQL 14, freeze được nhận ra qua tổ hợp hint bit committed và aborted của `xmin`; đây là marker đặc biệt, không có nghĩa transaction vừa commit vừa abort. Giá trị `xmin` gốc vẫn còn để kiểm tra/debug. Database nâng cấp từ trước PostgreSQL 9.4 vẫn có thể gặp `xmin = 2` (`FrozenTransactionId`) theo cách cũ.

Freeze áp dụng cho `xmin` của phiên bản còn sống. Nó không “đóng băng `xmax`”: một phiên bản đã bị xóa hoặc thay thế sẽ được dọn theo transaction horizon khi không snapshot nào còn cần nó. Đây là hai việc khác nhau: **freeze giữ row sống an toàn qua nhiều vòng XID; vacuum cleanup loại row chết khi đã an toàn**.

Visibility map có hai trạng thái đáng phân biệt. `all_visible` nói mọi tuple trên page hiện nhìn thấy được với mọi transaction; VACUUM thường có thể bỏ qua page đó. `all_frozen` mạnh hơn: page không còn tuple nào cần freeze. Vì vậy một page có thể `all_visible = true` nhưng `all_frozen = false`. Khi cần vacuum mạnh (aggressive), PostgreSQL vẫn quét các page chưa `all_frozen`; freeze map giúp bỏ qua những page đã hoàn tất và ghi nhớ tiến độ giữa các lần chạy.

### `all_visible` chưa đồng nghĩa với đã freeze

Một page vừa được vacuum có thể chỉ đạt `all_visible = true`: mọi version hiện có đều nhìn thấy được, nhưng `xmin` của chúng còn quá mới để freeze. Ordinary VACUUM được phép bỏ qua page này ở lần sau, nên dù transaction age của một tuple tăng dần, nó có thể chưa được freeze cho tới khi page bị ghi lại hoặc tới lúc cần aggressive vacuum. Khi UPDATE làm page thay đổi, visibility bit bị xóa; một VACUUM thường tiếp theo có thể xét các tuple đủ tuổi trên page vừa bị sửa. Nếu dữ liệu gần như bất biến, aggressive vacuum theo `relfrozenxid` sẽ quét page chưa `all_frozen` để hoàn tất việc freeze.

Trong trace của sách, table vừa insert dữ liệu được vacuum và hai page trở thành all-visible nhưng chưa all-frozen. Giảm `vacuum_freeze_min_age` xuống 1 không khiến lần vacuum kế tiếp freeze page còn all-visible: page đó bị visibility map bỏ qua. Khi update một row trên page 0, page mất all-visible; VACUUM có thể freeze tuple cũ đủ tuổi ở đó nhưng vẫn bỏ page 1. Chỉ aggressive vacuum mới bỏ qua all-visible map để xét page chưa all-frozen. Ví dụ này cho thấy **visibility là điều kiện cho reader; freezing là điều kiện bảo vệ XID**.

### Bốn ngưỡng điều khiển lịch freeze

Các ngưỡng dưới đây là mặc định được mô tả cho PostgreSQL 14 trong sách và manual tương ứng; hãy kiểm tra cấu hình của cluster trước khi áp dụng con số này cho hệ thống khác.

| Thời điểm | PostgreSQL 14 | Ý nghĩa |
| --- | ---: | --- |
| Có thể freeze tuple | `vacuum_freeze_min_age = 50M` | Chỉ freeze `xmin` đã ít nhất bằng tuổi này. Chờ lâu hơn tránh làm công việc vô ích với row sắp bị update lần nữa. |
| Vacuum aggressive | `vacuum_freeze_table_age = 150M` | Khi tuổi cutoff đủ cao, scan mọi page chưa `all_frozen`, kể cả page visibility map cho phép vacuum thường bỏ qua. Điều kiện xét đến hiệu số `vacuum_freeze_table_age - vacuum_freeze_min_age`. |
| Ép autovacuum chống wraparound | `autovacuum_freeze_max_age = 200M` | Buộc vacuum table trước khi XID cũ vượt vùng an toàn. Cơ chế bảo vệ này vẫn khởi chạy dù autovacuum thông thường bị tắt. |
| Failsafe ưu tiên freeze | `vacuum_failsafe_age = 1.6B` | Khi gần nguy cơ wraparound, VACUUM bỏ cost delay và có thể bỏ index cleanup để hoàn tất freeze heap sớm. Đây là chế độ khẩn cấp, không phải mục tiêu vận hành thường ngày. |

Các giá trị tuổi không có nghĩa mọi table được quét đúng tại con số đó. Vacuum thường có thể xử lý tuple chết trước; aggressive scan có thể đến từ nhiều điều kiện; worker còn phụ thuộc lịch launcher và tài nguyên. `vacuum_freeze_table_age` cũng bị chặn tối đa ở 95% `autovacuum_freeze_max_age` trong PostgreSQL 14. Đẩy `autovacuum_freeze_max_age` lên cao kéo dài thời gian lưu trạng thái commit trong `pg_xact` (và commit timestamp nếu bật), đổi lại giảm số lần forced vacuum trên bảng tĩnh. Đổi giá trị cluster-wide này cần restart PostgreSQL; cấu hình storage parameter có thể hạ ngưỡng cho table cụ thể.

`relfrozenxid` trong `pg_class` là cutoff: mọi tuple được tạo bởi XID cũ hơn cutoff đều được bảo đảm đã freeze. Nó chỉ tiến lên sau một lượt scan bao phủ toàn bộ các page có thể còn XID chưa freeze; scan thường không đủ nếu bỏ qua page chỉ vì page đang all-visible. `datfrozenxid` trong `pg_database` là cutoff an toàn của database, về cơ bản bị chi phối bởi table có `relfrozenxid` cũ nhất. Một table bị bỏ quên vì thế có thể giữ tuổi freeze của cả database không tiến lên.

```sql
SELECT c.oid::regclass AS relation,
       GREATEST(age(c.relfrozenxid), age(t.relfrozenxid)) AS xid_age,
       GREATEST(mxid_age(c.relminmxid), mxid_age(t.relminmxid)) AS multixact_age
FROM pg_class AS c
LEFT JOIN pg_class AS t ON c.reltoastrelid = t.oid
WHERE c.relkind IN ('r', 'm')
ORDER BY xid_age DESC
LIMIT 20;

SELECT datname,
       age(datfrozenxid) AS xid_age,
       mxid_age(datminmxid) AS multixact_age
FROM pg_database
ORDER BY xid_age DESC;
```

Đọc `xid_age` cùng log autovacuum và `pg_stat_progress_vacuum`; đừng chỉ nhìn một con số database-level. Transaction mở lâu, prepared transaction hoặc replication slot giữ `xmin` có thể khiến tuple chưa đủ an toàn để cleanup. Slot/replica cũ còn có thể giữ WAL. Tìm đúng horizon đang bị giữ trước khi tăng ngưỡng hay worker.

### MultiXact cũng có giới hạn tuổi

PostgreSQL dùng MultiXact khi nhiều transaction cùng khóa một row; tuple lưu mã MultiXact trong `xmax`, còn danh sách transaction thành viên được lưu riêng dưới `pg_multixact`. Đây là bộ đếm hữu hạn độc lập với XID, nên chỉ theo dõi `relfrozenxid` là chưa đủ. `relminmxid`, `datminmxid`, `mxid_age()` và các tham số `vacuum_multixact_freeze_*`/`autovacuum_multixact_freeze_max_age` theo dõi và dọn tuổi MultiXact. Aggressive vacuum cũng xử lý MultiXact; áp lực có thể đến từ tuổi mã hoặc dung lượng member storage tăng cao. Khác XID wraparound, cạn MXID chặn một số thao tác ghi cần row lock, không phải mọi transaction ghi.

## Manual freezing

### `VACUUM (FREEZE)` cho table đã có dữ liệu

`VACUUM (FREEZE)` yêu cầu freeze các tuple đủ điều kiện ngay trong lần chạy và thực hiện scan mạnh để cập nhật cutoff. Nó hữu ích khi có chủ đích bảo trì; không nên chạy lặp lại vô điều kiện vì freeze row sắp bị thay đổi sẽ tạo thêm việc, còn bỏ index cleanup thường xuyên sẽ để dead index entries tích tụ. Nếu mục tiêu là freeze heap sớm, có thể cân nhắc `VACUUM (FREEZE, INDEX_CLEANUP OFF)` hoặc storage parameter tương ứng; cách này trì hoãn cleanup index entry, không phải lịch bảo trì thường ngày.

### `COPY FREEZE` trong initial load có kiểm soát

Với dữ liệu nạp ban đầu, `COPY ... FROM ... WITH (FREEZE)` có thể ghi tuple đã freeze và đánh dấu page phù hợp ngay từ đầu. PostgreSQL 14 chỉ cho phép khi table được tạo hoặc `TRUNCATE` trong cùng subtransaction, không có cursor mở và transaction không giữ snapshot cũ; chưa hỗ trợ partitioned table. Các session khác có thể thấy dữ liệu ngay sau khi lệnh nạp thành công, kể cả snapshot cũ, nên tùy chọn này phá quy tắc MVCC visibility thông thường. Chỉ dùng khi tính chất batch load và thời điểm công bố dữ liệu đã được kiểm soát.

Với row có giá trị đủ lớn để được chuyển sang TOAST table, đừng giả định freeze ở heap chính đã xử lý toàn bộ TOAST storage. Sách ghi `COPY FREEZE` chưa hỗ trợ TOAST table trong phiên bản mô tả; các page trong TOAST relation có thể vẫn cần VACUUM để cập nhật visibility metadata. Vì vậy data load có thể giúp heap chính tránh vacuum trong thời gian dài nhưng vẫn không loại hết maintenance cho relation phụ.

Nếu log báo database phải vacuum trước khi hết tuổi XID, xử lý ngay. Trong PostgreSQL 14, cảnh báo wraparound bắt đầu khoảng 40 triệu XID trước điểm nguy hiểm; khi khoảng cách giảm xuống dưới 3 triệu, server từ chối cấp XID mới cho transaction ghi để bảo toàn dữ liệu. Tìm transaction/prepared transaction và slot cũ đang giữ horizon, kiểm tra table có cutoff cũ, sau đó chạy VACUUM thường thích hợp để tiến cutoff. Nếu cluster đã chặn ghi, giải phóng horizon bị giữ và vacuum table/database cần thiết; không cần chuyển sang single-user mode trong tình huống thông thường. Không dùng `VACUUM FULL` để chữa wraparound vì nó cần XID và rewrite relation; `VACUUM FREEZE` cũng có thể làm nhiều việc hơn cần thiết trong tình huống cứu hộ. Sau khi hệ thống trở lại bình thường, sửa cấu hình/lịch autovacuum và theo dõi để cảnh báo không lặp lại.

## Khi routine vacuum không đủ

`VACUUM FULL` rewrite table và cần ACCESS EXCLUSIVE lock, tạm disk lớn; index được rebuild theo rewrite. Alternatives như `pg_repack` (extension/tool ngoài), `CLUSTER`, `REINDEX CONCURRENTLY` áp dụng cho vấn đề khác nhau và có điều kiện riêng. Ước lượng dung lượng gấp đôi hoặc hơn, replication lag và downtime trước khi chạy.

Để giảm downtime, có thể tạo table/index mới song song, copy theo batch, dual-write/catch-up, đổi tên atomically qua migration, rồi cleanup; mỗi bước có crash/retry window và constraint cần giữ. Đừng xóa relation file hoặc ép truncate page thủ công.

*PostgreSQL Internals 14*, chương 6–7, tr. 120–158, giải thích routine VACUUM, autovacuum, monitoring, XID wraparound, freezing, freeze ages, aggressive/forced/failsafe vacuum và freeze lúc nạp dữ liệu. Chi tiết PostgreSQL 14 được đối chiếu với [routine vacuuming và wraparound/MultiXact](https://www.postgresql.org/docs/14/routine-vacuuming.html#VACUUM-FOR-WRAPAROUND), [autovacuum thresholds/workers](https://www.postgresql.org/docs/14/runtime-config-autovacuum.html), [VACUUM options và failsafe](https://www.postgresql.org/docs/14/sql-vacuum.html), [vacuum cost-based delay](https://www.postgresql.org/docs/14/runtime-config-vacuum.html), [COPY FREEZE](https://www.postgresql.org/docs/14/sql-copy.html#SQL-COPY-FREEZE), [VACUUM memory](https://www.postgresql.org/docs/14/runtime-config-resource.html) và [vacuum progress](https://www.postgresql.org/docs/14/progress-reporting.html#VACUUM-PROGRESS-REPORTING).

## Tự kiểm tra

**Vì sao vacuum dọn index trước khi heap page tái sử dụng?** Index entry cũ cần được loại để không trỏ tới tuple space sắp dùng lại.

**Scale factor 0.2 trên table 1 tỷ row nghĩa gì?** Với default PostgreSQL 14, ngưỡng dead tuple ước tính là `50 + 0.2 × 1.000.000.000`, tức khoảng 200.000.050; số tuple là ước lượng và ngưỡng khác đi nếu table override setting.

**VACUUM FULL chỉ là vacuum thường mạnh hơn?** Không; nó rewrite relation, cần lock/disk khác hẳn.

**Page `all_visible` đã chắc chắn `all_frozen` chưa?** Chưa. `all_visible` cho phép vacuum thường bỏ qua page; aggressive vacuum vẫn cần xét page chưa được đánh dấu `all_frozen`.

**Vì sao phải theo dõi `relminmxid` ngoài `relfrozenxid`?** Nhiều transaction cùng khóa row tạo MultiXact, có bộ đếm tuổi và vùng lưu trữ riêng; áp lực wraparound có thể đến từ MXID dù tuổi XID còn thấp.

**Có nên bật `COPY FREEZE` cho mọi lần import?** Không. Điều kiện transaction/table khá chặt và row có thể hiển thị cho snapshot cũ ngay sau khi load; chỉ dùng cho batch initial load đã kiểm soát.

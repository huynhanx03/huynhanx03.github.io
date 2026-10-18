---
title: "Scan, join, hash và sort trong PostgreSQL"
category: "Database"
description: "Giải thích cách PostgreSQL đọc table/index, chọn join algorithm, spill hash/sort và phối hợp parallel worker."
updated: 2026-10-18
translationKey: "database/postgresql-scans-joins-and-sorting"
---

Execution plan là cây operator; mỗi node tiêu thụ row từ node con và tạo row cho node cha. Hiểu thuật toán của node giúp đọc plan thay vì chỉ ghi nhớ tên. Chọn plan phụ thuộc cardinality estimate, page locality, memory budget và chi phí khởi tạo so với tổng kết quả.

## Table và index scan

Sequential scan đọc page heap theo thứ tự vật lý; phù hợp khi phần lớn table cần trả về hoặc index fetch ngẫu nhiên quá đắt. Parallel sequential scan chia block range cho worker; startup/coordination cost khiến nó không hợp query rất nhỏ. Worker count, table size và parallel-safe function/transaction restrictions giới hạn song song.

Index scan đi theo key rồi heap TID để đọc tuple. Nếu matching rows nằm gần nhau trên disk (high correlation), heap I/O tốt hơn; nếu rải rác, random fetch đắt. Index-only scan lấy column từ index nhưng cần visibility map xác nhận page all-visible; nếu chưa, vẫn heap fetch. Bitmap scan gom TID rồi sort theo heap block để giảm random I/O, nhưng bitmap có thể lossy và cần recheck predicate.

## Nested loop và memoize

Nested loop chạy outer rows, rồi tìm matching inner rows. Hợp khi outer ít và inner có index; nếu outer estimate thấp nhưng actual rất lớn, `loops` phình. Parameterized inner scan dùng giá trị outer row. `Memoize` cache kết quả inner cho parameter lặp; hit/miss/eviction phụ thuộc distinct parameter và memory.

Semi join chỉ cần biết có match; anti join cần biết không có match; outer join giữ row không match. Non-equi join (ví dụ khoảng thời gian) có ít access path hơn equality. Cartesian product do điều kiện join thiếu có thể sinh N×M row.

## Hash join

Hash join build hash table từ một phía theo join key, rồi probe bằng phía kia. Nếu bảng hash vừa memory, một pass hiệu quả; nếu vượt `work_mem`, PostgreSQL chia batch và ghi partition ra temp file (multi-pass). `EXPLAIN ANALYZE` báo batches/temp read-write; tăng `work_mem` toàn cục có thể nhân theo operation/worker/query nên cần budget.

Parallel hash join chia sẻ hash table theo coordination; memory và skew của key ảnh hưởng. Key phổ biến tạo bucket nóng; build side không nhỏ như estimate có thể spill nặng.

## Sort, merge và grouping

Quicksort trong memory sắp tất cả; top-N heapsort giữ K phần tử tốt nhất khi `LIMIT K`; external merge sort tạo runs trên disk rồi merge; incremental sort tận dụng prefix đã có order. Merge join đọc hai input đã sort cùng join key và tiến đồng thời; nếu sort cần spill thì lợi ích có thể mất.

`GROUP BY`/`DISTINCT` có thể dùng hash aggregate hoặc sort/group. Hash aggregate cần memory cho group cardinality; spill hỗ trợ phụ thuộc version/plan. `ORDER BY ... LIMIT` có thể dừng sớm khi index cung cấp thứ tự, nếu không phải xử lý/sort candidate trước.

## EXPLAIN như một câu chuyện

Đọc leaf-to-root; ghi lại estimated/actual rows, loops, buffers, temp I/O, sort method, hash batches và workers. Node cha thấy rows đã lọc từ node con, nên sai số sớm lan lên cả cây. Không chọn index chỉ từ tên node; query cần trả bao nhiêu row và physical locality mới quyết định.

*PostgreSQL Internals 14*, Part IV, trình bày scans, nested loop, hash joins, parallel plans, sort/top-N/external/incremental và merge. Xem [parallel query](https://www.postgresql.org/docs/current/parallel-query.html), [using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html) và [planner cost constants](https://www.postgresql.org/docs/current/runtime-config-query.html).


## Chương 18 và 20–23: vì sao một plan chọn đường này

### Table access method và parallel scan

PostgreSQL tách table access method khỏi executor để hỗ trợ cách lưu relation khác nhau; heap là method mặc định. Sequential scan không đơn giản là “plan tệ”: nếu query cần tỷ lệ lớn row, đọc page liên tiếp và lọc tại executor thường rẻ hơn đi index rồi nhảy tới heap. Parallel sequential scan chia vùng block cho workers; leader có thể vừa điều phối vừa xử lý một phần. Worker khả dụng bị giới hạn bởi cấu hình, CPU, transaction context, function parallel-safety, relation/plan shape và số worker đang dùng toàn cluster.

`Gather` gom tuple từ workers; `Gather Merge` giữ thứ tự khi mỗi worker phát stream đã sort. Parallel plan thêm startup/coordination/tuple-transfer cost, nên table nhỏ hoặc query nhiều serial work có thể chậm hơn. Một node không parallel-safe có thể chặn parallelism phía trên nó; xem `Workers Planned` so `Workers Launched`, không giả định planner cấp được đúng số.

### Index scan, index-only và bitmap

Index scan lấy TID theo thứ tự index rồi truy cập heap; correlation cao giữa index key và vị trí heap làm I/O gần tuần tự, correlation thấp có thể gây nhiều random page visits. Index-only scan chỉ bỏ heap fetch khi index chứa mọi column cần và visibility map đánh dấu page all-visible; nếu VM chưa đủ mới, plan vẫn phải kiểm tra heap. `INCLUDE` tăng payload trong leaf và có thể phình index.

Bitmap scan gom TID từ một hay nhiều index, kết hợp bitmap AND/OR, rồi đọc heap page theo vị trí để giảm random I/O. Bitmap có thể lossy khi hết bộ nhớ: nó ghi “page có thể có match” thay vì từng tuple và executor recheck predicate trên heap. Vì vậy `Rows Removed by Index Recheck` có thể là hệ quả bình thường của bitmap lossy, không nhất thiết lỗi index. Bitmap không giữ order của B-tree; cần sort riêng nếu query yêu cầu.

### Nested loop và Memoize

Nested loop chạy inner plan cho mỗi row outer. Nó hợp khi outer nhỏ hoặc inner parameterized index lookup rẻ; estimated outer rows sai làm số lần inner chạy bùng nổ. Memoize cache kết quả inner theo parameter key: nếu outer lặp lại cùng key, có thể lấy cache thay vì chạy lại index/scan. Cache có eviction/budget và chỉ có lợi khi key lặp; kiểm tra hit/miss/eviction trong EXPLAIN ANALYZE. Semi join dừng sau match đầu, anti join tìm “không có match”; outer join phải giữ row không match với NULL nên optimizer không thể đổi thứ tự tùy ý như inner join.

### Hash join: memory, batching và parallel

Hash join xây hash table từ build side rồi probe bằng side kia. Nếu vừa `work_mem × hash_mem_multiplier`, một pass tránh spill; nếu không, dữ liệu được partition thành batch và ghi file tạm để xử lý nhiều lượt. Batch count tăng làm thêm I/O; skew có thể khiến một batch lớn dù tổng estimate hợp lý. PostgreSQL có thể điều chỉnh số batch runtime. Với parallel hash, workers phối hợp shared hash table hoặc batch partition theo plan; cần tính tổng memory/worker và contention.

`EXPLAIN (ANALYZE, BUFFERS)` cho biết Hash Batches, memory usage và temp read/write; các con số thay đổi theo release. Đừng tăng `work_mem` toàn server chỉ để sửa một hash node: setting có thể nhân theo mỗi operation × worker × query đồng thời.

### Merge, sort và grouping

Merge join cần hai input đã có thứ tự theo join key; nó tiến dần qua sorted streams và xử lý nhóm duplicate key. Index order có thể tránh sort, còn sort riêng có thể đáng giá nếu nhiều row cùng được đọc. Sort vừa memory dùng quicksort; `ORDER BY ... LIMIT N` có thể dùng top-N heapsort; dữ liệu quá lớn tạo sorted runs trên đĩa rồi merge. Incremental sort tận dụng prefix order có sẵn, sắp từng nhóm thay vì toàn relation. Parallel sort chia phần việc nhưng vẫn phải merge kết quả.

Hash aggregation giữ group table trong memory và có thể spill/batch; sort aggregation dùng input order và gom nhóm liên tiếp. `DISTINCT`, `GROUP BY`, merge join và ORDER BY cùng chia sẻ lợi ích của order, nhưng plan phải cân bằng số row, sort cost và memory. Với query chậm, đọc plan từ scan lên: estimated/actual rows, loops, buffers, heap fetch, recheck, temp I/O, worker count. Chương sách nhấn mạnh so phương án bằng workload representative; ép `enable_*` chỉ là thí nghiệm để hiểu cost.

Nguồn PostgreSQL 14: [parallel plans](https://www.postgresql.org/docs/14/parallel-query.html), [index scans](https://www.postgresql.org/docs/14/index-scanning.html), [using EXPLAIN](https://www.postgresql.org/docs/14/using-explain.html), [resource configuration](https://www.postgresql.org/docs/14/runtime-config-resource.html).

## Đọc sâu cardinality join, hash batching và sort

### Join estimate bắt đầu từ đâu

Khi join hai cột bằng nhau, planner cần ước lượng bao nhiêu giá trị ở hai phía có thể khớp. Một baseline trong sách là giả định phân phối đều: selectivity xấp xỉ `min(1 / nd1, 1 / nd2)`, với `nd1` và `nd2` là số giá trị distinct được ước lượng ở hai đầu. Nói dễ hiểu, phía có ít giá trị distinct hơn thường giới hạn số nhóm có thể ghép; sau đó planner nhân với quy mô hai input để ra số row join dự kiến. Đây là mô hình, không phải đếm chính xác.

Giả định đều dễ sai khi join key lệch hoặc hai bảng có tương quan. Foreign key giúp planner hiểu một số quan hệ key và thường làm ước lượng join đáng tin hơn, nhất là key ghép. MCV có thể tinh chỉnh phần giá trị phổ biến khi thống kê hai đầu hỗ trợ; histogram đơn cột không tự mô tả cặp giá trị giữa hai bảng. PostgreSQL 14 không áp dụng extended statistics để ước lượng selectivity của join giữa các relation, nên đừng kỳ vọng `CREATE STATISTICS` sửa mọi sai số join.

Trong plan nested loop, xem cả `actual rows` lẫn `loops` ở inner node. Ví dụ outer có 2 row và inner trả 4 row mỗi lần thì inner thực hiện hai lần; đừng đọc `actual rows=4 loops=2` thành chỉ có bốn lần xử lý. Estimate outer thấp hơn thực tế có thể nhân số lần index lookup, làm một plan trông rẻ trên giấy thành tốn kém lúc chạy.

### Hash join: từ một batch đến spill

Hash Join có một ranh giới startup quan trọng: trước khi trả row đầu tiên, PostgreSQL phải đọc build side và dựng hash table. Planner thường đặt phía nhỏ hơn vào bảng băm để giảm footprint; query chỉ chọn vài cột cũng có thể làm hash table hẹp đi. Vì thế `SELECT *` có thể vừa tăng dữ liệu phải chuyển, vừa làm build side lớn hơn.

Nếu hash table vừa ngân sách, plan có `Batches: 1`: Hash node đọc build side, tính hash key, giữ dữ liệu trong memory; Hash Join lần lượt probe bằng từng row của phía còn lại. Nếu không vừa `work_mem × hash_mem_multiplier`, dữ liệu được chia theo hash thành nhiều batch. Build rows của batch đang xử lý ở lại memory, batch khác được ghi tạm; outer rows cũng được chia để chỉ so với batch cùng số. Batch tăng thêm đồng nghĩa thêm lượt đọc/ghi temp.

Khi xem `EXPLAIN (ANALYZE, BUFFERS)`, so `Batches` với `Batches: 1`, `Memory Usage`, cùng `temp read`/`temp written`. Batch lớn hơn 1 không tự chứng minh query có vấn đề: cần xem thời gian và I/O trong workload. Nhưng `Batches` tăng so với dự kiến có thể báo statistics cũ, estimate sai hoặc key skew. `log_temp_files` giúp ghi nhận file tạm; `temp_file_limit` giới hạn dung lượng file tạm của một backend process và query có thể bị hủy khi chạm ngưỡng. Đừng xem setting này là cách làm join hết spill; nó là giới hạn bảo vệ tài nguyên.

PostgreSQL có thể tăng số batch khi thực thi phát hiện build hash table lớn hơn dự kiến; trong mô tả PG14 của sách, số batch được tăng theo lũy thừa hai và không giảm lại trong cùng lần chạy. Nếu dữ liệu lệch, chia thêm batch có thể không giải quyết được: các row có cùng hash value vẫn rơi cùng batch. Một batch nóng vì thế có thể vượt ngân sách mong muốn. Khi chẩn đoán, kiểm tra estimate-vs-actual, MCV/skew của join key, độ rộng row cần giữ và temp I/O trước khi tăng `work_mem`.

### Parallel Hash khác Hash Join chạy dưới Gather

Một Hash Join thường đặt trong parallel plan có thể khiến mỗi worker dựng bản hash riêng; phần bộ nhớ này nhân theo số process tham gia. `Parallel Hash` phối hợp dựng một bảng băm dùng chung, với ngân sách có thể cộng từ các process, nên tránh việc lặp lại toàn bộ hash table. Nhưng nhiều worker vẫn tiêu thụ thêm CPU, bộ nhớ và đồng bộ; hãy dùng `Workers Launched`, memory và thời gian thực tế thay vì chỉ nhìn chữ `Parallel`.

Nếu parallel hash vừa memory, workers cùng xây bảng chung rồi probe các phần outer rows được chia. Nếu không vừa, PG14 dùng cách xử lý nhiều batch riêng: các process ghi partition của cả build side lẫn probe side ra temp trước, rồi workers nhận từng batch để build và join. Cơ chế nhiều pha này giảm tranh chấp trên một hash table khổng lồ nhưng tăng I/O. Đây là chi tiết phụ thuộc implementation/version; hãy đối chiếu plan và tài liệu của server đang chạy trước khi suy ra memory budget chính xác.

### Sort có thể bắt đầu trả kết quả sớm đến đâu

Sort thường phải đọc hết input trước khi trả thứ tự hoàn chỉnh. `ORDER BY ... LIMIT K` có thể dùng top-N heapsort: giữ K ứng viên tốt nhất và cập nhật heap khi đọc các row sau. Cách này giảm lượng trạng thái cần giữ, nhưng vẫn phải xem mọi input nếu không có access path đã sắp sẵn. Với input `n`, công việc gần `O(n log K)`, không phải `O(K)`.

Nếu dữ liệu không vừa memory, external sort tạo các run đã sắp xếp trong memory, ghi chúng ra file tạm rồi merge. Merge nhiều run có thể cần nhiều pass; mỗi pass tăng dung lượng đọc/ghi. Trong `EXPLAIN (ANALYZE, BUFFERS)`, `Sort Method: external merge`, `Disk`, `temp read` và `temp written` cho thấy đường đi này. `log_temp_files` bổ sung kích thước file tạm ở log. Số byte spill không bằng chính xác `work_mem` thiếu bao nhiêu: tuple width, số run, merge fan-in và cách ghi file đều ảnh hưởng. `work_mem` còn áp dụng riêng cho nhiều node và query đồng thời, nên tăng global có thể làm áp lực bộ nhớ tăng theo concurrency.

Incremental Sort dùng prefix đã có thứ tự. Nếu index đã trả `total_amount` theo thứ tự mà query cần `(total_amount, book_date)`, executor chia stream thành các nhóm cùng `total_amount`, rồi sort `book_date` trong từng nhóm. Nhóm đầu tiên được sort xong có thể bắt đầu trả row trước khi toàn relation được xử lý; memory thường thấp hơn sort toàn bộ. `Presorted Key`, `Full-sort Groups` và `Pre-sorted Groups` cho biết nhóm nào phải sort đầy đủ, nhóm nào tận dụng prefix. Phân phối lệch khiến kích thước các nhóm khác nhau; incremental sort không miễn phí và planner vẫn phải ước lượng số nhóm.

`Gather` thu row theo thứ tự worker gửi đến nên không bảo toàn thứ tự sort toàn cục. Nếu cần vừa chạy song song vừa giữ `ORDER BY`, dùng plan `Gather Merge`: mỗi worker phát dãy đã sort, leader ghép các đầu dãy bằng cấu trúc heap nhỏ. Điều này có chi phí so sánh/điều phối; luôn dựa vào `ORDER BY` trong SQL để cam kết thứ tự kết quả, không dựa vào thứ tự tình cờ của một plan.

Nguồn sách cho phần này: *PostgreSQL Internals 14*, Part IV, pp. 408–409 (join estimate), 420–439 (hash join/batching/parallel hash), và 443–460 (merge/sort/incremental sort/Gather Merge). Xem tài liệu PostgreSQL 14 về [planner statistics](https://www.postgresql.org/docs/14/planner-stats.html), [parallel query](https://www.postgresql.org/docs/14/parallel-query.html), [EXPLAIN](https://www.postgresql.org/docs/14/using-explain.html), và [resource configuration](https://www.postgresql.org/docs/14/runtime-config-resource.html).


## Đọc sâu Chương 18: heap scan, chi phí và parallel plan

### Table access method là ranh giới mở rộng

Executor không cần biết mọi chi tiết lưu row của một table: table access method (table AM) cung cấp thao tác scan/insert/update/delete/lock, định dạng tuple và quy tắc visibility. Các phần như buffer manager, I/O, optimizer/executor và index interface vẫn do PostgreSQL core cung cấp; table AM có thể dùng chúng theo cách khác. Trong PostgreSQL 14, `heap` là table AM đi kèm mặc định. Sách nhắc `zheap` như thử nghiệm hướng đến update tại chỗ và lưu undo riêng để giảm bloat, còn `zedstore` là ý tưởng columnar cho analytic workload. Đây là ví dụ về khả năng mở rộng ở thời điểm sách viết, không phải lựa chọn built-in có thể bật trong production hiện nay.

### Sequential scan và mô hình cost

`Seq Scan` đi qua heap pages theo thứ tự vật lý; synchronized scan có thể cho scan đồng thời nhập vào buffer ring đang dùng thay vì luôn bắt đầu block 0. Scan tuần tự thường hợp khi cần phần lớn row: đọc page liên tiếp, tận dụng prefetch/OS cache và lọc row tại executor. Selectivity thấp theo nghĩa “điều kiện giữ lại ít row” thường làm index hấp dẫn; nếu cần nhiều row rải rác, index rồi heap fetch có thể đắt hơn sequential scan.

Planner tách chi phí đọc page và xử lý row. `seq_page_cost` làm mốc cho page đọc tuần tự; `random_page_cost` phản ánh page fetch ngẫu nhiên; `cpu_tuple_cost`/`cpu_operator_cost` tính phần xử lý tuple/điều kiện. Những con số là thang cost tương đối, không phải benchmark trực tiếp. Tỷ lệ phù hợp tùy storage, cache hit và workload; SSD thường làm random-vs-sequential gap khác HDD, nhưng đặt cost quá thấp có thể làm planner chọn plan tệ khi working set không nằm trong cache. Thay cost chỉ sau khi đo workload representative và xem plan/actual I/O.

Filter trong `EXPLAIN` cho biết điều kiện được áp sau khi scan lấy tuple; `rows` là estimate kết quả còn lại, còn `Rows Removed by Filter` trong `EXPLAIN ANALYZE` cho biết số thật bị loại. Nếu heap đọc rất nhiều block để giữ rất ít row, xem index/access path và estimate; nếu cần phần lớn table, con số đó không tự chứng minh sequential scan sai.

### Parallel scan chia block và gom kết quả

PostgreSQL dùng leader cùng parallel workers; worker thực hiện phần plan được đánh dấu parallel và gửi tuple về `Gather`/`Gather Merge`. Leader cũng có thể tham gia xử lý khi không bận nhận dữ liệu. Parallel sequential scan chia block range giữa các process, vẫn đọc page tuần tự bên trong từng vùng. Với aggregation, workers thường tạo `Partial Aggregate`, `Gather` gom kết quả rồi `Finalize Aggregate` hoàn tất phép tính — không phải mọi query đều gửi tất cả row thô lên leader.

Lợi ích phải bù chi phí khởi tạo worker và truyền tuple. `parallel_setup_cost` cộng chi phí khởi chạy; `parallel_tuple_cost` phản ánh chuyển row về leader. Do đó table nhỏ hoặc nhiều serial work có thể chậm hơn nếu parallel hóa. Trong PG14, planner chỉ cân nhắc parallel table scan khi ước lượng bytes vượt `min_parallel_table_scan_size`; nếu không đặt `parallel_workers` riêng trên relation, số worker dự kiến tăng theo bậc logarit của table size so với ngưỡng. `max_parallel_workers_per_gather` giới hạn từng Gather, còn số worker toàn cluster và số worker đang bận có thể làm `Workers Launched` thấp hơn `Workers Planned`. Các mặc định/công thức là chi tiết phiên bản; xem plan và cấu hình server.

### Khi nào PostgreSQL không parallel hóa?

Plan cần khả năng chia nhỏ công việc và không được phụ thuộc trạng thái riêng của một backend. Trong PostgreSQL 14, parallel query thường bị loại với câu ghi, query chạy qua cursor/portal cần pause-resume, function `PARALLEL UNSAFE` (mặc định cho nhiều user-defined function), một số subplan phụ thuộc row ngoài, hoặc materialized CTE/scan không thể chia theo điều kiện tương ứng. Một số command như `CREATE TABLE AS` có thể parallelize phần SELECT nhưng bước ghi row vẫn tuần tự. Temporary table dùng local buffers của session nên không có parallel scan giống shared relation. Kiểm tra `proparallel`, node gây ranh giới, và `Workers Planned/Launched`; đừng chỉ tăng worker count khi plan vốn không parallel-safe.

## Đọc sâu Chương 20: một index scan thật sự tốn gì?

### Index scan đi qua cả index lẫn heap

Access method trả từng TID thỏa điều kiện index. Indexing engine dùng TID đọc heap page, kiểm tra tuple có nhìn thấy theo snapshot không, rồi mới lấy cột cần trả. Vì thế `Index Cond` là điều kiện index có thể thu hẹp; `Filter` là điều kiện còn phải áp trên tuple. Một query lọc bằng index nhưng vẫn đọc heap nhiều có thể tốn hơn Seq Scan. Nếu ứng dụng đã biết TID, `Tid Scan` đi thẳng đến tuple trong heap mà không cần index.

Ước lượng index scan gồm chi phí đọc/xử lý trang index và chi phí lấy heap tuple. Phần index phụ thuộc method, kích thước và selectivity. Phần heap phụ thuộc số row cần lấy và correlation giữa thứ tự TID do index trả với thứ tự vật lý trong heap. Khi correlation gần ±1, nhiều TID liên tiếp có thể nằm trên các page lân cận; khi gần 0, một chuỗi kết quả có thể nhảy qua nhiều page. Planner cân nhắc cả khả năng các page nằm trong cache bằng `effective_cache_size` — đây chỉ là giả định cho cost, không cấp phát bộ nhớ. `random_page_cost`, `seq_page_cost`, CPU costs và statistics vì vậy phải phản ánh tương đối workload, không phải con số benchmark tuyệt đối.

Đừng coi correlation cao là bảo đảm query trả row theo thứ tự: UPDATE tạo tuple version mới ở nơi khác, scan có thể chọn plan khác, và thứ tự SQL chỉ được đảm bảo khi có `ORDER BY`.

### Index-only scan không đồng nghĩa heap không bao giờ được đọc

Index-only scan cần index chứa mọi giá trị query yêu cầu và access method có thể trả chúng. Nhưng index PostgreSQL không lưu visibility của từng tuple. Executor kiểm tra visibility map: page all-visible thì có thể trả dữ liệu ngay từ index; nếu bit chưa được đặt, phải vào heap để xác nhận. `EXPLAIN (ANALYZE, BUFFERS)` hiển thị `Heap Fetches`; số lớn có thể giải thích vì sao plan mang tên Index Only Scan nhưng vẫn đọc heap. VACUUM giúp cập nhật visibility map sau khi page đủ điều kiện, nhưng write mới có thể xóa trạng thái all-visible.

### Bitmap scan đổi thứ tự TID lấy locality

Bitmap Index Scan thu các TID thành bitmap trong memory; Bitmap Heap Scan duyệt heap block theo số block tăng dần, mỗi page tối đa một lần trong lượt đó. Cách này thường hữu ích hơn index scan thường khi nhiều row khớp nhưng phân bố rải rác: nó gom random fetch thành thứ tự page dễ đọc hơn. Đổi lại, bitmap cần startup để dựng xong và không giữ order của index; `ORDER BY` có thể cần Sort riêng.

Bitmap AND/OR kết hợp nhiều index đơn. Bitmap chính xác giữ TID từng tuple. Khi vượt ngân sách `work_mem` dành cho bitmap, PostgreSQL có thể chuyển một số vùng sang lossy: mỗi bit đại diện một page thay vì tuple, rồi recheck predicate trên các tuple page đó. `Recheck Cond` có thể xuất hiện cả khi bitmap chính xác; `Heap Blocks: exact/lossy` và `Rows Removed by Index Recheck` cho biết thực tế. Recheck nhiều chưa hẳn index sai: có thể chỉ là đánh đổi memory cho I/O. Tuy nhiên, sách PG14 lưu ý bitmap rất lớn không được tiếp tục nén vô hạn hoặc spill bitmap ra disk; memory cap có thể bị vượt để giữ toàn bộ kết quả bitmap.

### Parallel index scan: phần nào được chia?

Parallel B-tree index scan chia việc duyệt leaf pages giữa workers; parallel index-only thêm bước bỏ heap access cho page all-visible. Parallel bitmap scan khác: một process dựng bitmap index tuần tự trước, sau đó `Parallel Bitmap Heap Scan` chia các heap page để workers xử lý. Do đó không thấy chữ `Parallel` ở Bitmap Index Scan không có nghĩa toàn bộ bitmap plan chạy một luồng.

Trong parallel plan, CPU tuple processing có thể chia, nhưng page I/O không giảm theo cùng tỷ lệ vì các worker vẫn phối hợp truy cập pages. So `Workers Planned` và `Workers Launched`, partial/final aggregate, buffers và thời gian thực. Không suy ra “nhiều worker hơn luôn nhanh hơn”.

### Chọn scan là đường cong, không phải bảng xếp hạng

Selectivity rất thấp thường thuận lợi cho index scan; nhiều row, correlation thấp làm heap fetch ngẫu nhiên đắt nên Seq Scan có thể thắng. Bitmap scan nằm ở khoảng giữa khi nhiều TID phân tán nhưng có thể gom theo heap page. Index-only scan có thể rất rẻ nếu cover đủ dữ liệu và phần lớn heap page all-visible; nếu visibility map lạnh, nó thoái về gần index scan thường. Các đường cong trong sách là định tính: cache, page size, row width, thiết bị, statistics và `work_mem` làm điểm giao thay đổi. Chỉ so plan trên workload representative và ghi cả actual buffers/time.

Nguồn sách: *PostgreSQL Internals 14*, Chương 20, pp. 376–399. Xem tài liệu PostgreSQL 14 về [index cost estimation](https://www.postgresql.org/docs/14/index-cost-estimation.html), [index-only scans](https://www.postgresql.org/docs/14/indexes-index-only-scans.html), [partial indexes](https://www.postgresql.org/docs/14/indexes-partial.html), [EXPLAIN](https://www.postgresql.org/docs/14/using-explain.html), và [planner cost constants](https://www.postgresql.org/docs/14/runtime-config-query.html).

## Đọc sâu Chương 21: Nested Loop, Materialize và Memoize

### Phân biệt loại join với thuật toán join

`INNER`, `LEFT`, `FULL`, semi-join và anti-join mô tả kết quả logic cần giữ. Nested Loop, Hash Join và Merge Join là thuật toán vật lý tạo kết quả đó. Một thuật toán chỉ hỗ trợ một số loại logic: Nested Loop tự nhiên hỗ trợ inner/left/semi/anti, nhưng không thể giữ mọi row ở cả hai phía nên không thực hiện full join theo cách này. Planner có thể đổi hình dạng SQL tương đương thành cùng một join node; `EXISTS` thường thành semi-join, còn `NOT EXISTS` thành anti-join.

### Hai vòng lặp và giá của mỗi lần gọi inner

Nested Loop duyệt từng row outer; với mỗi row, nó gọi inner để tìm row khớp. Row outer trở thành parameter của inner scan, ví dụ `ticket_flights.ticket_no = tickets.ticket_no`. Đây là parameterized path: index lookup bên trong có thể rất rẻ nếu outer chỉ vài row. Nhưng nếu outer estimate sai từ 2 thành 200.000, inner scan có thể bị gọi quá nhiều lần.

Trong `EXPLAIN ANALYZE`, xem `loops` ở node inner. `actual rows` thường là trung bình mỗi lần lặp; để ước lượng tổng lượng row node tạo, nhân `actual rows × loops` (có thể có làm tròn). Ví dụ inner `actual rows=4 loops=2` nghĩa trung bình 4 row trong mỗi hai lần gọi, tổng khoảng 8 row. Thời gian node cũng thường là trung bình mỗi loop; đọc đúng định dạng và tránh cộng thời gian cha-con hai lần vì thời gian cha đã bao gồm con.

Inner không parameterized có thể được bọc trong `Materialize`: executor đọc child một lần, giữ kết quả để các vòng outer tiếp theo đọc lại. Nếu vượt phần memory được phép, Materialize có thể spill ra file tạm; khác với Memoize, nó giữ cả stream chung chứ không phân cache theo key.

### Memoize cache theo parameter, không phải cache query chung

`Memoize` phù hợp khi inner scan nhận cùng parameter nhiều lần. Lần đầu với key `aircraft_code='SU9'` chạy index lookup rồi lưu tập row; lần sau dùng lại kết quả. Cache là theo giá trị parameter, có memory budget gắn với `work_mem` và `hash_mem_multiplier`, dùng eviction kiểu LRU gần đúng. Một key có quá nhiều kết quả không thể cache trọn thì bị bỏ qua để tránh giữ cache dở dang.

Trong `EXPLAIN ANALYZE`, đọc `Cache Key`, `Hits`, `Misses`, `Evictions`, `Overflows`, `Memory Usage`. Nếu outer có 113 row nhưng key chỉ có một giá trị, kỳ vọng gần 1 miss và 112 hits. Nhiều distinct key, eviction hoặc overflow làm lợi ích giảm. `enable_memoize` chỉ nên tắt tạm để so sánh chẩn đoán; không nên ép/tắt toàn cục trước khi hiểu phân bố key và estimate.

### Semi/anti và outer join thay đổi điều kiện dừng

Semi-join chỉ cần một match cho mỗi outer row; executor dừng inner ngay khi tìm thấy row đầu tiên. Anti-join giữ outer row chỉ khi đã chứng minh inner không có match; cũng có thể dừng ngay khi tìm thấy một match. Bởi vậy `EXISTS`/`NOT EXISTS` có thể rẻ hơn join thường nếu chỉ cần trả row bên trái, đồng thời tránh nhân bản row bên trái khi bên phải có nhiều match.

Left join phải trả outer row kể cả khi không có match và điền NULL phía inner. Join condition và filter sau join không tương đương: `ON` xác định match, `WHERE` chạy sau khi outer join đã tạo NULL row. Đưa điều kiện từ `ON` sang `WHERE` có thể vô tình biến LEFT JOIN thành inner-like filter. Nested Loop asymmetric: outer được quét hết, inner chỉ được tìm theo điều kiện; thuật toán này không thể tự bảo toàn toàn bộ inner rows như right/full join.

### Cardinality và cost của join

Nếu outer có `N` row và mỗi row ghép trung bình `M` row, kết quả dự kiến gần `N×M` trước khi xét điều kiện. Với foreign key đã khai báo, planner có thêm thông tin quan hệ parent/child; nếu không, baseline equi-join dùng số distinct của hai key và giả định phân bố đều. MCV có thể cải thiện phần key phổ biến, nhưng giả định vẫn có thể sai do skew, NULL hoặc tương quan.

Nested Loop startup cost thường cộng startup của hai child. Total cost gồm đọc outer, lần đọc ban đầu và các lần đọc lại inner, cùng chi phí tạo row kết quả. Với parameterized inner, mỗi outer row có lookup riêng. Với Materialize/Memoize, số lần gọi lại không đồng nghĩa số lần đọc lại toàn bộ child. Hãy đối chiếu estimate với `actual rows`, `loops`, cache counters, buffer và temp I/O.

Nested Loop có thể nằm trong parallel plan: outer scan được chia giữa workers; mỗi worker xử lý các row outer của mình và gọi inner tuần tự theo từng parameter. Điều này không có nghĩa một lần inner lookup được nhiều worker cùng chia. Join điều kiện bất đẳng thức cũng có thể dùng Nested Loop, nhưng nếu không có index phù hợp, executor phải thử nhiều cặp row — gần Cartesian product rồi lọc — nên số cặp có thể tăng theo tích hai input.

Nguồn sách: *PostgreSQL Internals 14*, Chương 21, pp. 400–419. Xem [EXPLAIN](https://www.postgresql.org/docs/14/using-explain.html), [planner statistics](https://www.postgresql.org/docs/14/planner-stats.html), và [parallel plans](https://www.postgresql.org/docs/14/parallel-query.html).

## Đọc sâu Chương 22–23: aggregation, merge join và cách chọn thuật toán

### HashAggregate không chỉ dành cho GROUP BY

HashAggregate gom row theo khóa group bằng hash table. Nó cũng có thể thực hiện `DISTINCT` hoặc loại duplicate sau `UNION`; `Append` chỉ nối hai input nên chưa tự khử trùng lặp. Nếu số nhóm nhỏ, hash table gọn dù input rất lớn. Nếu distinct cardinality cao, bảng băm vượt ngân sách `work_mem × hash_mem_multiplier` thì node chia key theo partition, ghi row vào temp file rồi xử lý từng partition. Đọc `Batches`, `Memory Usage`, `Disk Usage` và `temp read/write`: một batch không có nghĩa input ít, mà số key duy nhất đủ ít để state gọn.

Khác hash join, aggregate không cần giữ nguyên từng row input để ghép với input khác. Các giá trị đi vào hash state, và key phổ biến có thể được gom sớm; hash aggregate không cần cơ chế skew bucket đầu như hash join. HashAggregate cũng có thể xuất hiện theo dạng `Partial HashAggregate` trong worker rồi `Finalize Aggregate` ở leader; không phải aggregate nào cũng parallel-safe hay giảm được nhiều row.

### GroupAggregate, Unique và MixedAggregate dùng thứ tự sẵn có

Nếu input đã sort theo group key — chẳng hạn B-tree index trả đúng order — `GroupAggregate` chỉ cần giữ trạng thái của group hiện tại, xử lý một lượt và thường không cần hash table lớn. `Unique` loại duplicate liên tiếp khỏi stream đã sort, có thể dùng index-only scan và không cần dựng hash set. Nếu chưa có thứ tự phù hợp, Sort phía trước có thể tốn RAM/temp I/O; lợi ích của group-by-order phải tính cả chi phí tạo order.

`GROUPING SETS`, `ROLLUP` và `CUBE` yêu cầu nhiều cách nhóm cùng input. PostgreSQL có thể phối hợp hash key, sort key và group key trong `MixedAggregate`; đừng diễn giải tên node là chỉ “hash” hay chỉ “sort”. Ví dụ nhóm cùng lúc theo `aircraft_code`, `flight_no` và hash theo `departure_airport` có thể dùng sort stream cho hai nhóm và hash state cho nhóm còn lại. Kiểm tra toàn bộ keys và Sort node bên dưới.

### Merge Join: hai luồng có thứ tự, một lượt tiến

Merge Join nhận hai input đã sắp theo join key, giữ con trỏ ở row hiện tại mỗi phía, bỏ qua key nhỏ hơn và phát các cặp khớp. Duplicate key cần xử lý thành nhóm: mỗi row của một phía phải ghép với mọi duplicate phù hợp phía kia. Nếu index cung cấp sẵn thứ tự, merge có thể bắt đầu sớm và tránh memory lớn; nếu phải Sort cả hai phía, startup tăng vì sort phải tiêu thụ input trước.

Trong mô tả PG14 của sách, merge condition cần equality/merge-compatible operator class. Inner/left merge join có thể giữ thứ tự hữu ích; right/full join có thể làm mất order do NULL-extended rows và cần Sort lại. Parallel merge join không có node algorithm riêng: outer input có thể chia worker, nhưng mỗi worker phải scan inner input đầy đủ; right/full merge join không được parallel trong phiên bản sách.

### Chọn giữa Nested Loop, Hash và Merge bằng hình dạng workload

- Nested Loop bắt đầu trả row nhanh và hợp với outer nhỏ, inner lookup rẻ/có index; với outer lớn và lookup tốn kém, số vòng lặp bùng lên.
- Hash Join thường scan hai input lớn một lượt nếu hash table vừa memory; phải dựng xong build side trước row kết quả đầu, và spill nhiều batch làm thêm temp I/O. Chỉ hợp equi-join với kiểu key hash được.
- Merge Join có thể xử lý luồng nhỏ hoặc lớn, ít memory khi input đã sorted/indexed, nhưng cần equality-compatible keys; Sort bổ sung có thể làm nó đắt hơn hash.

Đây là xu hướng, không phải quy tắc tuyệt đối: selectivity, startup latency, ordering cần trả về, distinct/skew, memory, correlation, cache và temp I/O đổi điểm giao. Planner vẫn ước lượng, vì vậy hãy so actual plan trên câu query và concurrency thật. Không tắt `enable_hashjoin`, `enable_mergejoin` hay `enable_nestloop` như một cách sửa mặc định; có thể tắt tạm để hiểu một phương án đối chứng.

Nguồn sách: *PostgreSQL Internals 14*, Chương 22 pp. 440–442 và Chương 23 pp. 443–466. Xem [aggregate execution](https://www.postgresql.org/docs/14/runtime-config-query.html), [using EXPLAIN](https://www.postgresql.org/docs/14/using-explain.html), và [parallel plans](https://www.postgresql.org/docs/14/parallel-query.html).

## Tự kiểm tra

**Index scan luôn tốt hơn sequential scan?** Không; nhiều random heap fetch có thể đắt hơn đọc tuần tự.

**Hash join spill có thể do gì?** Build side lớn hơn estimate/memory hoặc key cardinality/skew khác dự đoán.

**LIMIT 10 luôn chỉ xử lý 10 row?** Không; nếu không có access path ordered, engine có thể phải đọc/sort nhiều candidate.

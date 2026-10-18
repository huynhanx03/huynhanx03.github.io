---
title: "Index MySQL: chọn thứ tự và hiểu access path"
category: "Database"
description: "Thiết kế index InnoDB cho equality, range, sort và covering query; cân bằng khả năng đọc với chi phí ghi và khóa."
updated: 2026-10-18
translationKey: "database/mysql-indexes-and-access-paths"
---

Trong MySQL, index là một phần của thiết kế truy vấn và của storage engine. `CREATE INDEX` không tự đảm bảo query nhanh: optimizer phải tin rằng index rẻ hơn, cấu trúc phải phù hợp điều kiện, và engine vẫn có thể cần đọc row từ clustered index. Ta sẽ bắt đầu từ đường truy vấn rồi chọn index kiểm chứng được.

## Các loại index giải quyết câu hỏi khác nhau

InnoDB dùng B-tree cho primary và secondary index. B-tree hỗ trợ equality, range, prefix và thứ tự key phù hợp. Hash index không phải access method tùy chọn chung cho InnoDB; MEMORY engine hỗ trợ hash và B-tree với hành vi riêng. R-tree phục vụ dữ liệu spatial ở engine/tính năng hỗ trợ; FULLTEXT lập chỉ mục token văn bản và có semantics tìm kiếm riêng. Không chọn type theo tên mà cần xem toán tử truy vấn có được hỗ trợ.

Một ứng dụng đôi khi tự dựng hash index bằng bảng phụ lưu hash và giá trị gốc. Hash collision bắt buộc phải xác minh giá trị gốc; lưu hash làm khóa duy nhất mà bỏ giá trị thật có thể trả nhầm kết quả. Bảng phụ thêm consistency, cleanup và transaction work nên chỉ dùng khi có use case đo được.

Với một giá trị chuỗi rất dài như URL, có thể lưu thêm hash để index equality lookup nhỏ hơn. Nhưng hash chỉ tạo tập ứng viên: hai URL khác nhau có thể cùng hash, vì vậy truy vấn cần cả điều kiện hash lẫn URL gốc để xác minh. Đồng thời phải duy trì hash cùng transaction với URL; cách này đổi dung lượng index lấy thêm cột và invariant cần giữ.

**Prefix-compressed index** trong chương sách là đặc tính MyISAM lịch sử: các key trong block có chung phần đầu được lưu bằng cách ghi đủ key đầu rồi mã hóa phần khác nhau của key sau. Nó giảm bytes index và tăng số key có thể nằm trong cache, đổi lại cần giải nén khi đọc. Không suy ra rằng InnoDB B-tree cũng dùng cùng kiểu nén; engine và version quyết định layout thực tế.


### B-tree làm được gì, và mỗi cột đóng góp tới đâu

Ở mức trực quan, B-tree giữ key có thứ tự trong các page; node trong dẫn đường tới leaf, còn leaf nối tới dữ liệu theo cách engine định nghĩa. Đây là lý do một B-tree có thể tìm key, đi tiếp qua một vùng key liên tục, và trả kết quả theo thứ tự. Leaf không nhất thiết giữ cùng kiểu row pointer: MyISAM cũ dùng vị trí row; InnoDB clustered leaf giữ row, còn secondary leaf giữ secondary key cộng primary key.

Với index `(last_name, first_name, dob)`, các query có thể tận dụng đường key liên tục theo những cách sau: giá trị đầy đủ cả ba cột; prefix `(last_name)` hoặc `(last_name, first_name)`; prefix ký tự như `last_name LIKE 'Sm%'`; range trên `last_name`; hoặc equality trên `last_name` và range trên cột kế tiếp. Ngược lại, tìm chỉ theo `first_name`, chỉ theo `dob`, hay theo suffix tên không có vị trí bắt đầu phù hợp nên không thể seek như mong muốn. Bỏ qua `first_name` cũng không tạo được một vùng liên tục cho `(last_name, dob)`.

Range đầu tiên thường kết thúc phần key có thể dùng để thu hẹp một range liên tục. Ví dụ `(a,b,c)` với `a = ? AND b > ? AND c = ?`: `a` và range `b` tạo vùng scan; `c` không tiếp tục thu hẹp cùng một vùng. Tuy nhiên `c` vẫn có thể giúp kiểm tra index entry, index condition pushdown (ICP) hoặc cover output tùy plan/version. Phân biệt “dùng để seek/range”, “lọc trong index”, và “trả dữ liệu không lookup row” thay vì nói suffix hoàn toàn vô dụng. MySQL hiện hành hỗ trợ ICP để lọc điều kiện có thể đọc từ index entry trước khi lấy full row; xem [manual 8.4](https://dev.mysql.com/doc/refman/8.4/en/index-condition-pushdown-optimization.html).

`IN (...)` là danh sách nhiều equality values dù `EXPLAIN` có thể ghi access type `range`; nó không giống một khoảng liên tục `>`, `<` hay `BETWEEN`. Trong một số query, nhiều equality ở prefix cho phép dùng các cột kế tiếp tốt hơn một range mở. `OR`/`AND` trên các index riêng có thể được optimizer giải bằng Index Merge (union/intersection), nhưng tạo và ghép row candidates cũng tiêu CPU, memory và I/O. So với composite index hoặc scan trên workload đồng thời; plan ghi `index_merge` không tự chứng minh đó là lựa chọn tốt nhất.

## B-tree composite theo leftmost prefix

Index `(tenant_id, status, created_at)` được sắp theo `tenant_id`, rồi `status`, rồi `created_at`. Nó có thể giúp truy vấn lọc prefix `tenant_id`, hoặc `tenant_id` và `status`, sau đó range/order theo `created_at`. Nó không thay thế index `(status)` cho query chỉ lọc status, vì các giá trị status bị chia theo tenant trước.

Chọn thứ tự cột bằng workload: điều kiện equality, range, sort, nhóm tenant và độ phân biệt dữ liệu. Cột có cardinality cao không luôn phải đứng đầu; query prefix nào được dùng thường xuyên mới quan trọng. Với **prefix index** trên chuỗi, engine chỉ lưu phần đầu của giá trị; độ dài khai báo tính theo ký tự với chuỗi thường nhưng giới hạn index tính theo byte, nên character set nhiều byte làm hai con số khác nhau. Giới hạn cụ thể còn tùy engine và row format.

Prefix index cần đủ dài để phân biệt phần lớn giá trị trong dữ liệu thật. Có thể thử nhiều độ dài bằng cách so `COUNT(DISTINCT LEFT(city, n)) / COUNT(*)` trên representative sample, rồi đối chiếu kích thước và query latency. Tỷ lệ này chỉ là thống kê trung bình: nếu vài prefix phổ biến tạo hot range, cần xem phân bố theo prefix chứ không chỉ một con số. Nếu chuỗi tìm kiếm dài hơn prefix, index loại candidate không khớp nhưng engine vẫn phải kiểm tra giá trị đầy đủ của candidate còn lại. Vì index không lưu phần đuôi, nó không cover query cần cả chuỗi, không thể bảo đảm thứ tự `ORDER BY city` giữa hai giá trị trùng phần đầu, và không đủ để dùng Loose Index Scan gom chính xác theo toàn bộ giá trị. Query vẫn có thể dùng index để tìm candidate; điều đó khác với dùng index để trả toàn bộ kết quả, thứ tự hay nhóm.

Điều kiện cũng cần để optimizer truy cập được key. Với index trên `created_at`, viết `DATE(created_at) = '2026-10-17'` thường không cho một range trực tiếp trên giá trị gốc. Hãy biến nó thành khoảng nửa mở: `created_at >= '2026-10-17' AND created_at < '2026-10-18'`. Tương tự, `LIKE '%tail'` không có prefix cố định để B-tree seek; đổi index không sửa được một predicate vốn không có thứ tự key phù hợp.

Nếu workload lặp lại truy vấn **đuôi** như tìm email thuộc domain `@example.com`, có thể biến đuôi thành đầu bằng cách đảo chuỗi lúc lưu. Khi đó `alice@example.com` thành `moc.elpmaxe@ecila`; tìm các giá trị bắt đầu bằng `moc.elpmaxe@` là một prefix range mà B-tree có thể xét. Cách của sách là lưu cột đảo và duy trì bằng trigger. Với MySQL 8.4 có thể dùng generated column có index, ví dụ:

```sql
CREATE TABLE account (
  email VARCHAR(320) NOT NULL,
  reversed_email VARCHAR(320)
    GENERATED ALWAYS AS (REVERSE(email)) STORED,
  KEY idx_reversed_email (reversed_email)
);

SELECT email
FROM account
WHERE reversed_email LIKE CONCAT(REVERSE('@example.com'), '%');
```

Đây là mẹo cho suffix cố định, không biến B-tree thành full-text hoặc arbitrary-substring index. Hãy kiểm tra collation/case-folding để phép đảo vẫn khớp semantics mong muốn; wildcard trong suffix đầu vào cũng phải được escape đúng. Generated-column index được optimizer hỗ trợ trong [MySQL 8.4](https://dev.mysql.com/doc/refman/8.4/en/generated-column-index-optimizations.html).

**Selectivity** của predicate là phần trăm row còn lại sau khi lọc; càng ít row khớp, index thường càng có ích. **Cardinality** của index là ước lượng số giá trị khác nhau. Hai con số liên hệ nhưng không thay thế nhau: một `status` có bốn giá trị có cardinality thấp, song trong một tenant chỉ một giá trị có thể cực kỳ hiếm. Chọn thứ tự index từ query cụ thể, prefix cần hỗ trợ, sort và phân bố từng nhóm; đừng dùng một thống kê toàn bảng như luật cố định.


## Chọn access method theo hình dạng phép tìm

- **B-tree:** lựa chọn phổ thông cho equality, range, prefix và ordering tương thích. Equality với key đầy đủ có thể tới một điểm; range đọc một vùng liên tiếp. Cấu trúc này không biến `LIKE '%suffix'` thành seek vì phần đầu không biết.
- **Hash:** một số engine, như MEMORY, có thể cung cấp hash index. Hash ngắn gọn và tốt cho equality (`=`, `IN`, null-safe equality theo hỗ trợ), nhưng không giữ thứ tự nên không hỗ trợ range, prefix hay `ORDER BY`; hash của composite key cần đủ thành phần. Khi va chạm, engine phải kiểm tra giá trị gốc. InnoDB không có hash index do người dùng khai báo thay cho B-tree; adaptive hash của InnoDB là cơ chế nội bộ riêng.
- **Spatial R-tree:** dùng bounding rectangles/không gian nhiều chiều cho predicate geometry được hỗ trợ; nó không có leftmost-prefix giống B-tree. Đây là access method chuyên biệt, cần spatial column, SRID/semantics và predicate tương thích. MySQL 8.4 hỗ trợ SPATIAL index ở InnoDB và MyISAM; xem [manual spatial analysis](https://dev.mysql.com/doc/refman/8.4/en/optimizing-spatial-analysis.html).
- **FULLTEXT:** index token hóa văn bản để tìm từ/term theo mode của engine, không phải tìm substring tùy ý như `LIKE '%word%'`. Token length, stopword, parser/ngôn ngữ, ranking và update cost ảnh hưởng kết quả. MySQL 8.4 hỗ trợ FULLTEXT cho InnoDB và MyISAM trên CHAR/VARCHAR/TEXT; xem [InnoDB full-text indexes](https://dev.mysql.com/doc/refman/8.4/en/innodb-fulltext-index.html).
- Sách nêu fractal tree của TokuDB, Patricia trie của ScaleDB và engine phân tích như InfiniDB/Infobright. Đây là ví dụ lịch sử cho thấy storage engine có thể chọn data structure khác vì workload riêng; tên sản phẩm/khả năng cụ thể phải kiểm tra hiện trạng, không xem là lựa chọn MySQL mặc định.

Không có index nào “nhanh nhất” độc lập với query. Với bảng nhỏ, table scan có thể rẻ hơn; bảng rất lớn có thể cần partition/pruning, clustering, summary hoặc data skipping thay vì một index row-by-row quá lớn.

## Clustered index thay đổi nơi row nằm

Trong InnoDB, table data được tổ chức theo clustered index, thường là primary key. Leaf của clustered B-tree giữ row cùng metadata transaction/MVCC; primary index chính là tổ chức dữ liệu của bảng. Ngược lại, MyISAM giữ data file riêng theo thứ tự lưu row và B-tree leaf trỏ tới vị trí row; primary key ở đó là unique index, không làm row được cluster theo key. Secondary index InnoDB chứa primary-key value làm locator thay vì địa chỉ vật lý. Vì thế secondary leaf thường rộng hơn, nhưng khi row di chuyển/page split thì không phải sửa mọi pointer vật lý. Một lookup qua secondary index InnoDB có thể cần hai đường page: secondary leaf rồi clustered leaf. Nếu query cần nhiều row rải rác, lookup ngẫu nhiên có thể đắt hơn scan.

Primary key ngắn giúp giảm kích thước các secondary index. Khóa tăng tuần tự thường thêm về một phía cây, còn khóa ngẫu nhiên phân tán insert; page split và locality phụ thuộc fill, buffer và workload. Chọn id vì tính toàn cục hay khả năng đoán cũng phải cân bằng physical cost.


### Khi nào B-tree có thể trả đúng thứ tự

Index scan có thể tránh sort nếu equality prefix cố định phần trước và các cột còn lại khớp thứ tự `ORDER BY`. Ví dụ index `(tenant_id, created_at, order_id)` có thể phục vụ `WHERE tenant_id = ? ORDER BY created_at, order_id`; nhưng thứ tự trộn ASC/DESC, bỏ một key ở giữa, sort theo cột ngoài index, hoặc join-order không phù hợp có thể cần sort bổ sung. Sau một range trên cột trước, optimizer thường không dùng suffix làm một thứ tự tổng quát mới như thể prefix đã cố định. Range predicate ở một index và sort theo index khác cũng thường cạnh tranh: một access path không thể đồng thời thu hẹp tùy ý một vùng và phát ra thứ tự độc lập.

Index-ordered scan không luôn nhanh hơn filesort. Nếu query phải tra clustered row ngẫu nhiên cho hàng trăm nghìn entry, sort candidate gọn rồi fetch kết quả hoặc table scan có thể tốt hơn. Lợi ích rõ nhất khi range nhỏ, covering, hay `ORDER BY ... LIMIT` cho phép dừng sau ít entry. `EXPLAIN` dùng từ “filesort” cho bước sort bổ sung; nó không bảo đảm sort đã spill xuống disk.

## Covering index tránh một số lần đọc row

Giả sử query lọc `tenant_id`, sắp theo `created_at` và chỉ trả `order_id`. Nếu secondary index chứa đủ các cột cần lọc, sắp và trả kết quả, engine có thể đọc trực tiếp từ leaf mà không quay lại clustered index cho từng row. Trong InnoDB, secondary leaf vốn đã chứa primary key; thêm payload khác để cover query có thể giảm row lookup nhưng làm index rộng hơn, tăng buffer-pool footprint, dung lượng ghi và chi phí bảo trì. Vì vậy hãy cân nhắc covering theo query class cụ thể, không thêm mọi cột vào mọi index.

Covering và **index condition pushdown (ICP)** là hai điều khác nhau. Covering nghĩa là index đã có đủ dữ liệu để trả kết quả; ICP cho phép storage engine kiểm tra một số điều kiện từ index entry trước khi lấy full row, nhưng vẫn có thể cần lấy row sau đó. Sách mô tả MySQL cũ có thể fetch row trước một residual filter; hành vi hiện tại phụ thuộc plan và version. Kiểm tra `EXPLAIN ANALYZE`, actual rows, `Using index` và `Using index condition` thay vì suy ra từ danh sách cột.

Nếu query cần cột rộng nhưng chỉ trả ít row, **deferred lookup** có thể đọc ID/sort key từ index, áp dụng filter và `LIMIT`, rồi mới lấy full row cho kết quả cuối. Nó giảm lookup cho candidate bị loại; nếu hầu như mọi candidate đều được trả, derived table/join bổ sung có thể tốn hơn. Đo cả hai dạng với dữ liệu và concurrency đại diện.


Có một ngoại lệ quan trọng với insert theo thứ tự: đây thường là cách nạp tuần tự hiệu quả và giữ locality, nhưng tải ghi đồng thời lớn có thể dồn mọi insert vào leaf cuối của primary B-tree hoặc tranh chấp cơ chế cấp `AUTO_INCREMENT`. Đây là hot spot có thể giới hạn concurrency. Chỉ khi lock/wait metrics chứng minh nó mới cân nhắc đổi key/distribution hoặc chế độ insert; khóa ngẫu nhiên giảm một hot leaf nhưng tăng split, random I/O và kích thước index. Đây là đánh đổi giữa local contention và toàn cục locality, không có quy tắc ID tuần tự luôn tốt.

## Index ảnh hưởng lock và ghi

InnoDB thường khóa record hoặc range index được scan cho locking read/update/delete. Trong một số isolation và predicate range, gap/next-key locks ngăn insert vào phạm vi. Index phù hợp có thể làm phạm vi scan nhỏ hơn; index thiếu hoặc điều kiện khó sargable có thể khiến nhiều row/range bị kiểm tra và khóa hơn. Quan sát `EXPLAIN`, lock wait và deadlock, không chỉ số row cuối cùng.

Mỗi index tăng chi phí insert/delete và update indexed column. Index thừa còn chiếm buffer pool, disk, redo và thời gian backup. Index trùng prefix đôi khi có thể hợp nhất nhưng phải xét sort direction, uniqueness, collation, optimizer behavior và workload khác.


Khi đọc statistic, nhớ cardinality trong `SHOW INDEX` là ước lượng, không phải count chính xác của từng value. Index/column skew có thể khiến average estimate sai với tenant hoặc user ngoại lệ; sau bulk load hay phân bố đổi lớn có thể chạy `ANALYZE TABLE`, rồi so estimated với actual rows trong `EXPLAIN ANALYZE`. Tác động của `ANALYZE`, histogram và sampling khác theo phiên bản.

**Observer effect trong MySQL 5.5-era:** InnoDB ước lượng cardinality bằng cách lấy mẫu page. Theo sách, những lệnh tưởng như chỉ quan sát—`SHOW INDEX`, `SHOW TABLE STATUS`, một số truy vấn `INFORMATION_SCHEMA`, thậm chí autocomplete của client—có thể kích hoạt resampling khi `innodb_stats_on_metadata` bật. Trên bảng lớn hoặc storage chậm, việc đo có thể tự tạo I/O, lock và load; số liệu vừa xem cũng có thể vừa bị tính lại. Vì vậy một monitoring poll dày có thể làm query plan chập chờn thay vì chỉ ghi nhận vấn đề.

Đây là hành vi cần gắn với phiên bản và chế độ thống kê, không bê nguyên kết luận của MySQL 5.5 sang mọi server. Trong [MySQL 8.4](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html), biến vẫn tồn tại nhưng chỉ tác động non-persistent statistics và mặc định `OFF`; persistent statistics mặc định bật. Khi điều tra production, kiểm tra `innodb_stats_persistent`, setting thực tế và manual của đúng release trước khi quy một lần `SHOW INDEX` cho spike.

Phân biệt ba dạng fragmentation: row bị chia mảnh; page/key liền logic nhưng tản vật lý; và page chứa nhiều free space. Chúng ảnh hưởng point lookup, range scan và full scan khác nhau. `OPTIMIZE TABLE`, rebuild index/table hoặc dump/reload có thể lấy lại space/ordering nhưng tiêu I/O, temporary disk, lock và replica capacity; chọn theo engine/version và kiểm tra trước/sau. Khi nghi corruption, tìm nguyên nhân ở disk/RAM/filesystem, thao tác file ngoài MySQL, crash hoặc bug; lưu bản sao và recovery path trước. `REPAIR TABLE` không phải quy trình chữa InnoDB.

## Thống kê và maintenance

Optimizer dựa vào cardinality estimate và index statistics. Nếu dữ liệu lệch hoặc thay đổi mạnh, `ANALYZE TABLE` có thể cập nhật thống kê; quyết định tạo index vẫn cần plan. MySQL có invisible index để kiểm tra tác động bỏ index mà chưa drop cấu trúc, trong version hỗ trợ.

Không sửa table corruption bằng lệnh maintenance tổng quát khi chưa xác định engine và tình trạng. `CHECK TABLE`, `REPAIR TABLE` và `OPTIMIZE TABLE` có semantics khác theo engine. `REPAIR TABLE` không phải công cụ sửa InnoDB như với MyISAM. Với InnoDB, `OPTIMIZE TABLE` có thể rebuild table; thực hiện có chi phí I/O, space và metadata lock cần tính trước. Tham khảo [index optimization](https://dev.mysql.com/doc/refman/8.4/en/optimization-indexes.html), [InnoDB indexes](https://dev.mysql.com/doc/refman/8.4/en/innodb-indexes.html), [ANALYZE TABLE](https://dev.mysql.com/doc/refman/8.4/en/analyze-table.html), [invisible indexes](https://dev.mysql.com/doc/refman/8.4/en/invisible-indexes.html), [spatial indexes](https://dev.mysql.com/doc/refman/8.4/en/optimizing-spatial-analysis.html) và maintenance docs đúng engine.


Trong case study, sách thiết kế search form với rất nhiều filter tùy chọn. Thay vì tạo một index cho mọi tổ hợp, hãy đếm query pattern thực tế rồi chọn các prefix thường dùng; filter ít chọn lọc và ít xuất hiện đôi khi rẻ hơn để kiểm tra sau khi một prefix chính đã thu hẹp tập. `IN(...)` trên dimension ít giá trị có thể giúp một query dùng lại index với equality prefix khi người dùng không chọn dimension đó, nhưng tích các list có thể bùng số nhánh/range; giới hạn kích thước và đo CPU/plan. Đặt range như `age BETWEEN ...` gần cuối vì suffix sau range ít dùng để thu hẹp seek; nhiều range độc lập phải chọn range nào cắt candidate tốt hơn, hoặc dùng một cờ gần đúng như `active` rồi giữ điều kiện thời gian chính xác như residual filter.

Với `ORDER BY`/`LIMIT` sâu, index phù hợp có thể trả thứ tự và dừng sớm; còn `OFFSET` lớn vẫn phải bước qua các entry bị bỏ. Hạn chế độ sâu page nếu sản phẩm cho phép, hoặc dùng keyset pagination. Deferred join đọc PK và sort key qua covering index, bỏ qua các candidate trước khi lấy full row; nó đặc biệt hữu ích khi payload rộng và chỉ một phần nhỏ cuối cùng được trả về.

## Giải case nhiều điều kiện và sort

Cho query lọc `tenant_id`, một khoảng `created_at`, `status`, rồi sort theo `created_at`. Ta không nên tạo index theo thứ tự cột xuất hiện trong SQL. Hãy phân loại predicate equality/range, query nào phải dùng prefix, số dòng dự kiến, sort và dữ liệu trả về. Bắt đầu với một index candidate, xem `EXPLAIN`, đo read latency và write throughput; thêm index riêng chỉ khi query khác chứng minh cần.

Nếu query có hai điều kiện range độc lập, một B-tree composite thường không thể dùng cả hai để thu hẹp thành một vùng liên tiếp như ta mong đợi. Có thể chọn range quan trọng hơn, dùng Index Merge nếu optimizer thấy phù hợp, hoặc thay đổi query/schema. Case study trong sách nhấn mạnh test các dạng filter và sort thực tế thay vì tạo “một index khổng lồ” đoán trước mọi query.

## Theo dõi một truy vấn tìm kiếm qua từng quyết định

Giả sử trang order lọc tenant và trạng thái, lấy đơn trong một khoảng ngày, sort mới nhất trước và trả 30 dòng:

```sql
SELECT order_id, created_at, total
FROM orders
WHERE tenant_id = 42
  AND status = 'paid'
  AND created_at >= '2026-10-01'
  AND created_at <  '2026-11-01'
ORDER BY created_at DESC, order_id DESC
LIMIT 30;
```

Một ứng viên là `(tenant_id, status, created_at, order_id)`: equality prefix đưa scan vào tenant/trạng thái; ngày tạo tiếp tục thành range; thứ tự ngày và id có thể hỗ trợ thứ tự kết quả nếu direction và optimizer plan tương thích. `total` chưa nằm trong index nên mỗi kết quả có thể cần lookup row. Nếu read latency chứng minh lookup này đắt, thử thêm `total` để cover, nhưng so cả kích thước index và write throughput.

Thêm predicate `total > 500` không đồng nghĩa engine có thể cắt một vùng nhỏ trên cùng B-tree sau khi đã vào range của `created_at`. Nếu `total` chưa nằm trong index, engine phải đọc row để kiểm tra; nếu nó được thêm vào index sau các sort key, ICP có thể loại bớt row lookup nhưng scan vẫn có thể đi qua nhiều entry trong range ngày. Hai range với phân bố rất lệch có thể đảo thứ tự cột tối ưu; đo số candidate thực tế và plan thay vì áp quy tắc “cột chọn lọc nhất luôn đứng đầu”.

Nếu điều kiện tách thành hai index riêng, optimizer có thể cân nhắc Index Merge để ghép các row candidate. Điều đó không luôn nhanh: nó có thể phải đọc nhiều entry, giữ/ghép danh sách row ID và tăng CPU/bộ nhớ. So với composite index và table scan trên cùng workload; đừng ép Index Merge chỉ vì query có nhiều predicate.

Với form tìm kiếm có filter tùy chọn, một index `(sex, country, region, city, age)` chỉ hữu ích khi query có leftmost prefix phù hợp. Tạo index cho mọi tổ hợp filter làm writes và storage phình ra. Hãy lấy query log/profile, nhóm các pattern phổ biến, dùng `EXPLAIN ANALYZE` cho các pattern quan trọng rồi chọn vài index phục vụ phần lớn tải. Dữ liệu lệch — như một tenant hoặc user có rất nhiều dòng — cần kiểm tra riêng vì ước lượng trung bình có thể che outlier.

Đừng phân trang bằng `OFFSET 500000` nếu có thể tiếp tục từ key cuối đã nhận. Với order ổn định `(created_at, order_id)`, keyset pagination thêm điều kiện sau vị trí trước:

```sql
WHERE tenant_id = 42
  AND status = 'paid'
  AND (created_at, order_id) < (?, ?)
ORDER BY created_at DESC, order_id DESC
LIMIT 30;
```

Nếu cần payload rộng, deferred lookup có thể trước tiên lấy các ID và sort key từ index, giới hạn còn 30 dòng, rồi đọc full row cho các ID đó. Kỹ thuật này giảm việc fetch row cho những candidate bị bỏ qua, nhưng phải đảm bảo query ngoài giữ đúng thứ tự và không đổi semantics khi có update đồng thời.

## Đọc thống kê và gỡ index có bằng chứng

`SHOW INDEX`/`INFORMATION_SCHEMA.STATISTICS` cho cardinality ước lượng, không phải cam kết chính xác số dòng mỗi giá trị. Sau bulk load hoặc thay đổi phân bố lớn, `ANALYZE TABLE` cập nhật key statistics; histogram có thể giúp optimizer ước lượng phân bố của cột. Các thao tác này có chi phí và không đảm bảo plan mới sẽ nhanh hơn. So `EXPLAIN` với `EXPLAIN ANALYZE`, kiểm tra actual rows/time và workload sau khi cập nhật.

Index duplicate cùng thứ tự cột thường lặp chi phí bảo trì. Index `(a,b)` có thể phục vụ một số truy vấn dùng prefix `a`, nhưng index `(a)` vẫn có thể hữu ích nếu nó nhỏ hơn đáng kể hoặc workload/unique semantics khác. Trước khi xóa index ít thấy dùng, kiểm tra lịch sử đủ dài để bao phủ batch, report và job định kỳ; số liệu usage vừa reset hoặc chỉ lấy từ một node có thể đánh lừa. Trong MySQL hỗ trợ invisible indexes, có thể làm index invisible rồi quan sát plan/latency trước khi drop; theo dõi query critical và replica workload trong thời gian đủ đại diện.

Fragmentation có thể là row bị tách thành nhiều phần, page liền logic nhưng phân tán vật lý, hoặc page chứa nhiều khoảng trống. Chúng ảnh hưởng point lookup, range scan và full scan khác nhau. Chương sách ghi nhận MyISAM có thể gặp cả ba dạng, còn InnoDB trong phiên bản được mô tả di chuyển/ghi lại row ngắn thành một mảnh; đây là chi tiết engine/version, không nên khái quát cho mọi layout hiện tại.

Sách nêu `OPTIMIZE TABLE` hoặc dump/reload như cách rebuild phổ quát theo engine, nhưng hiệu quả cụ thể khác nhau: có engine rebuild index theo thứ tự, trong khi cách rebuild InnoDB cũ chủ yếu tái tạo clustered data; muốn tái tạo secondary index có thể phải drop/add lại chúng. Ví dụ `ALTER TABLE ... ENGINE=...`, tùy chọn Percona `expand_fast_index_creation` và `XtraBackup --stats` thuộc hệ sinh thái/phiên bản tại thời điểm xuất bản, không phải quy trình mặc định cho MySQL 8.4. Trước khi chọn công cụ, xem thuật toán online/copy và phạm vi rebuild được hỗ trợ trong version thực tế.

Đừng chạy `OPTIMIZE TABLE` chỉ vì file có vẻ lớn. Đo read/write, page usage, free space và thời gian rebuild. Nén page quá chặt có thể làm các update tiếp theo gây page split/reorganization, khiến latency tăng cho đến khi dữ liệu đạt trạng thái ổn định mới. Rebuild có thể cần temporary disk, I/O, lock và gây replica lag; lợi ích phải lớn hơn chi phí và rủi ro trong cửa sổ vận hành. Corruption cần điều tra phần cứng, filesystem và đường backup trước khi chạy lệnh sửa; lệnh maintenance của MyISAM không phải quy trình phục hồi InnoDB.


### Ba lợi ích cấu trúc và chi phí index

B-tree đem lại ba lợi ích liên quan nhau: giảm số row phải xét bằng cách đi nhanh tới candidate; đọc key gần nhau theo thứ tự để cải thiện locality và tránh một số bước sort/group; và trả kết quả chỉ từ index nếu index cover đủ dữ liệu. Một cách chấm độ phù hợp trong sách gọi đây là **three-star index**: một sao nếu các row liên quan nằm gần nhau trong index, sao thứ hai nếu thứ tự index khớp thứ tự query, sao thứ ba nếu index chứa đủ cột để không cần lookup row. Đây là cách suy luận access path, không phải cam kết query sẽ nhanh hơn.

Không phải query nào cũng đạt đủ ba sao với kích thước index hợp lý. Ví dụ `ORDER BY` trộn ASC/DESC có thể không khớp thứ tự key; thêm mọi cột để cover sẽ làm index lớn và ghi đắt. Khi đó chọn tradeoff tốt nhất theo workload, hoặc cân nhắc summary/denormalized data nếu query quan trọng không thể phục vụ hiệu quả bằng index. Index vẫn làm tăng dung lượng, buffer-pool pressure, redo, backup và write maintenance; chỉ thêm khi chỉ ra được query class và metric cần cải thiện.

Bỏ index “duplicate” giống hệt nhau thường an toàn sau khi xác nhận constraint; index “redundant” theo leftmost prefix cần xem semantics. `(a,b)` có thể đáp ứng lookup theo `a`, nhưng `(a)` nhỏ hơn, có thể nhanh hơn cho scan/cache hoặc hỗ trợ constraint/ordering khác. Trong InnoDB, secondary leaf có implicit PK; `(a)` gần như có ordering `(a, PK)`, còn `(a,b)` đổi suffix trước PK, nên query `WHERE a=? ORDER BY PK` có thể cần filesort sau khi thêm `b`. So actual workload trước khi gộp.

## Tự kiểm tra

**Vì sao index `(a,b)` không nhất thiết giúp query chỉ lọc `b`?** Key được sắp theo `a` trước; toàn bộ giá trị `b` không tạo một vùng liên tục trên tree.

**`EXPLAIN` ghi `Using filesort` nghĩa là sort luôn dùng disk?** Không. Đây là thuật ngữ cho bước sort bổ sung; dữ liệu có thể sort trong memory hoặc spill tùy kích thước và cấu hình.

**Nếu index được tạo nhưng optimizer không dùng, có nên ép hint?** Trước tiên kiểm tra thống kê, selectivity, type/collation, parameter và plan. Hint có thể lỗi thời khi dữ liệu đổi.

Nguồn đọc: *High Performance MySQL*, chương 5 và case study chương 6; [MySQL index optimization](https://dev.mysql.com/doc/refman/8.4/en/optimization-indexes.html), [column indexes and prefix indexes](https://dev.mysql.com/doc/refman/8.4/en/column-indexes.html), [ORDER BY optimization](https://dev.mysql.com/doc/refman/8.4/en/order-by-optimization.html), [GROUP BY optimization](https://dev.mysql.com/doc/refman/8.4/en/group-by-optimization.html), [InnoDB indexes](https://dev.mysql.com/doc/refman/8.4/en/innodb-indexes.html).

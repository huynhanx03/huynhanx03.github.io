---
title: "Partition, view, routine và feature nâng cao của MySQL"
category: "Database"
description: "Hiểu partitioning, foreign key, stored code, charset, full-text và XA cùng các giới hạn phiên bản hiện tại."
updated: 2026-10-17
translationKey: "database/mysql-advanced-features-and-version-changes"
---

MySQL có nhiều feature mở rộng SQL, nhưng mỗi feature thêm một quy tắc về optimizer, transaction, deployment hoặc vận hành. Đọc sách phiên bản cũ cần tách hai việc: học mục đích của feature và xác minh feature còn tồn tại, đã đổi ngữ nghĩa hay bị thay thế trong MySQL 8.4.

## Partitioning không tự làm query nhanh

Partition chia một logical table thành phần vật lý theo range/list/hash/key. Pruning chỉ giúp khi predicate cho phép MySQL loại partition; query không lọc partition key vẫn có thể scan nhiều phần. Partition hữu ích cho lifecycle/drop data, locality hoặc quản trị, nhưng làm tăng DDL, index maintenance và complexity.

MySQL 8.4 có giới hạn engine/key: partitioning được hỗ trợ cho InnoDB và NDB; InnoDB partitioned tables không hỗ trợ foreign key theo các giới hạn manual hiện hành. Partition key còn phải tham gia mọi unique key. Thiết kế schema, FK và partition cùng lúc; đừng áp công thức từ MySQL 5.x.

Partitioned InnoDB cũng không hỗ trợ `FULLTEXT` index hoặc tìm kiếm full-text. Đây là ví dụ rõ cho thấy partition không phải lớp trong suốt có thể ghép với mọi feature: thiết kế phải xét cả khóa duy nhất, foreign key, loại index và engine trước khi tạo bảng.

Hãy xem partition như cách đưa truy vấn đến gần một nhóm dữ liệu, không phải một B-tree khổng lồ tự tìm đến từng row. Mỗi partition có index riêng. Nếu bảng partition theo `created_at` nhưng query chỉ lọc `customer_id = 42`, server có thể phải tìm trong index của nhiều partition. Index tốt không thay thế partition pruning.

Partition theo thời gian thường hữu ích khi vòng đời dữ liệu khớp với ranh giới partition: có thể bỏ dữ liệu cũ nhanh bằng `DROP PARTITION`. Nhưng `REORGANIZE PARTITION` có thể phải chép row. Nhiều partition làm tăng chi phí metadata, mở bảng và DDL; giới hạn cụ thể phụ thuộc release và engine, nên kiểm tra manual thay vì lấy con số trong sách cũ làm mặc định.

Với `PARTITION BY RANGE (YEAR(created_at))`, predicate cần giúp optimizer suy ra partition. Giá trị `NULL` hoặc bất thường có thể làm tập partition phải kiểm tra rộng hơn. So sánh `EXPLAIN`, đặc biệt cột `partitions`, trước và sau khi thêm điều kiện trên partition key. Nếu join lặp index lookup trên bảng partitioned mà không prune được, chi phí đó nhân theo số vòng lặp.

Có hai chiến lược khác nhau: prune xuống ít partition rồi scan tuần tự khi dữ liệu lịch sử rất lớn và ít nóng; hoặc cô lập vùng nóng nhỏ để working set cùng index nằm trong bộ nhớ. Đây là giả thuyết workload, không phải quy tắc bỏ index cho bảng lớn. Đo page/row đã đọc, write time, partition bị chạm và thời gian bảo trì trên dữ liệu đại diện.

### MERGE table là một cơ chế lịch sử riêng

MERGE storage engine (`MRG_MyISAM`) gom nhiều bảng MyISAM có cấu trúc tương ứng để đọc như một tập hợp. Nó không phải partitioning của InnoDB. Các bảng con vẫn truy cập riêng được, index phải khớp, và primary key ở từng bảng không đảm bảo uniqueness trên toàn bộ tập hợp. Một lookup có thể phải mở nhiều bảng con. MySQL 8.4 vẫn tài liệu hóa engine này, nhưng với ứng dụng mới nên đánh giá InnoDB partitioning, sharding hoặc bảng hợp nhất theo workload; không chọn MERGE chỉ vì tên giống partition.

## View và foreign key

View là query được lưu tên, không mặc định là materialized result cache. Merge/temptable algorithm và updatability ảnh hưởng optimizer và write. View giúp abstraction/security nhưng có thể che join/aggregation đắt. MySQL không cung cấp materialized view tự refresh như một tính năng cốt lõi; summary table cần quy trình cập nhật.

Trong plan, xem optimizer có thể gộp định nghĩa view vào query ngoài (`MERGE`) hay phải tạo kết quả trung gian (`TEMPTABLE`). Với temporary result, filter ở ngoài không phải lúc nào cũng được đẩy xuống dưới; view có aggregation trước filter có thể xử lý thừa nhiều row. View không có index độc lập: index phải nằm trên bảng nền. Dùng `EXPLAIN` cho query thật để thấy join, sort và temporary table sau khi view được mở rộng.

Foreign key bảo vệ referential integrity ở engine hỗ trợ. Với InnoDB, index và lock khi kiểm tra constraint ảnh hưởng write; cascade có thể lan nhiều row. Chọn ON DELETE/UPDATE theo invariant, index cột liên quan, test transaction và tránh coi FK là thay thế validation business ở mọi tầng.

Khi thêm row có foreign key, InnoDB cần tìm khóa cha trong index và đảm bảo khóa cha không biến mất giữa lúc kiểm tra. Insert có thể chờ transaction đang xóa hoặc sửa row cha; `ON DELETE CASCADE` còn tạo thêm công việc và lock trên bảng con. Khi điều tra lock wait, hãy lần theo cả quan hệ constraint. Constraint ngăn orphan đáng tin cậy hơn việc chỉ kiểm tra ở application, đổi lại có index, write work và coupling giữa bảng.

## Stored code, prepared statements, UDF và plugin

Procedure/function, trigger và event scheduler đặt logic gần dữ liệu, hữu ích cho tác vụ atomic/schema-local nhưng có thể làm logic khó version, test và phân phối. Trigger chạy trong transaction của statement gọi nó; side effect ngoài DB không trở thành atomic. Cursor phù hợp xử lý tuần tự tập kết quả nhưng thường kém set-based SQL.

Stored procedure hợp với nhiều bước gần dữ liệu khi giảm round trip đáng kể hoặc cần ranh giới quyền truy cập rõ. Trigger hợp với invariant cục bộ cần giữ qua mọi đường ghi; vì chạy ngầm theo statement, phải ghi rõ side effect và tính đến nó khi debug transaction. Trigger không làm cho HTTP call hay message publish thành một phần của transaction MySQL. Muốn giao nhận side effect đáng tin cậy, ghi outbox row trong transaction rồi phát message bằng worker.

Event scheduler chạy tác vụ theo lịch nhưng không đảm bảo exactly-once: cần tính tới chạy trễ, overlap, retry và idempotency. Cursor server-side đọc tuần tự; nếu biểu đạt được bằng `UPDATE`, `INSERT ... SELECT` hay JOIN theo tập hợp, dạng set-based thường tránh vòng lặp và round trip. Trong procedure, đóng cursor và xử lý điều kiện hết dữ liệu rõ ràng.

Prepared statements tách query structure và parameter, giúp chống SQL injection và tái sử dụng parse/plan theo khả năng server/client. Chúng không đảm bảo query nhanh; kiểm tra plan và parameter behavior. UDF/plugin mở rộng server nhưng đưa code native vào failure/security boundary lớn; cần ABI/version, deployment và crash isolation.

Parameter thay được value như `WHERE id = ?`, không thay được tên bảng, tên cột hay keyword. Nếu identifier phải chọn động, dùng allowlist. Driver có thể giả lập prepared statement phía client hoặc dùng binary protocol phía server; xác nhận hành vi của driver. Reuse giúp giảm truyền SQL và parse, nhưng plan vẫn phụ thuộc index, dữ liệu và release. Nếu tham số lệch phân bố mạnh, đo các giá trị đại diện.

UDF và plugin chạy trong process của database. Lỗi native có thể làm sập server; ABI hoặc module-loading thay đổi có thể ảnh hưởng upgrade và bảo mật. Chỉ đưa phép tính vào server khi có lợi ích đo được so với application, có build đúng phiên bản, kiểm thử lỗi và kế hoạch triển khai đồng bộ. Quyền cài hoặc nạp module nên được bảo vệ như quyền thay binary.

## Charset, collation, full-text và XA

Charset quy định encoding; collation quy định so sánh/sort/case behavior. Server, database, table, column và connection có defaults riêng. Mismatch có thể gây conversion, index không được dùng như dự đoán hoặc so sánh khác nhau. Ghi charset rõ khi tạo schema và test Unicode/accents.

Database-level default không đảm bảo mọi connection cùng thiết lập. Kiểm tra `character_set_client`, `character_set_connection`, `character_set_results`, charset/collation của cột và hai vế khi JOIN. Với UTF-8 đa byte, `LENGTH(text)` đếm byte còn `CHAR_LENGTH(text)` đếm ký tự; giới hạn byte và ký tự không giống nhau.

Full-text index có tokenizer, stopword và ranking riêng; phù hợp search text cơ bản nhưng không tương đương search service cho mọi ngôn ngữ/query. XA là distributed transaction protocol, có prepare/recovery state và coordinator dependency; cân nhắc 2PC blocking, timeout và heuristic recovery trước khi bật.

Full-text tìm theo token, không phải `LIKE '%word%'` có index. Tokenizer, độ dài token, stopword, ngôn ngữ và ranking quyết định kết quả. InnoDB hiện hỗ trợ full-text, dù sách mô tả giai đoạn MyISAM là lựa chọn chính. Hãy thử dữ liệu và ngôn ngữ thật; so sánh search service nếu cần typo tolerance, autocomplete hoặc ranking phức tạp. Không chọn MyISAM chỉ vì full-text: tính cả locking và crash recovery.

MySQL có natural-language mode để tìm cụm từ tự nhiên và Boolean mode để viết điều kiện như `+mysql -legacy`: từ có `+` phải xuất hiện, từ có `-` phải vắng mặt. Boolean mode không tự sắp theo độ liên quan; natural-language mode có ranking riêng. Cả hai bị ảnh hưởng bởi stopword và cấu hình token. `MATCH(title, body)` cần một FULLTEXT index phù hợp với chính tập cột đó; index chỉ chứa `body` không tự phục vụ mọi biểu thức MATCH.

Full-text index lưu cấu trúc phục vụ token, không thay thế nội dung row và không phải covering index. Tìm theo phrase hoặc lọc thêm một điều kiện rất chọn lọc như `author_id` có thể vẫn phải đọc nhiều row ứng viên rồi kiểm tra tiếp. Sort theo cột khác relevance thường cần filesort. Việc sửa một document dài cũng cập nhật nhiều token trong index, nên đo cả tốc độ search lẫn write. Nếu thay đổi `innodb_ft_min_token_size`, stopword hoặc parser, cần làm theo hướng dẫn rebuild index của release. Sách có các workaround như ghép token filter vào nội dung được index; hãy xem chúng là kỹ thuật đặc thù cần benchmark, không phải mẫu schema mặc định.

XA dùng two-phase commit: coordinator yêu cầu participant `PREPARE`, ghi nhận quyết định commit rồi yêu cầu hoàn tất. Sau crash, participant có thể còn transaction đã prepared và cần coordinator recovery để commit hoặc rollback. Đây là trạng thái bền vững ở giữa quy trình; cần theo dõi transaction in-doubt, timeout, retry và recovery. Chỉ dùng khi invariant thực sự cần atomic commit giữa nhiều resource. Nếu chấp nhận eventual consistency, outbox/saga thường dễ vận hành hơn. Không suy từ sách cũ rằng phải tắt một biến cấu hình cụ thể; việc phối hợp InnoDB với binary log thay đổi theo release.

Tách XA do ứng dụng điều phối qua nhiều resource khỏi two-phase commit nội bộ của server. MySQL cần phối hợp commit InnoDB với binary log để crash recovery và replication không nhìn thấy transaction đã rollback. Trong MySQL 8.4, InnoDB luôn bật hỗ trợ two-phase commit này; `sync_binlog=1` giúp đồng bộ binary log xuống đĩa trước commit theo durability policy. Không tắt cơ chế phối hợp nội bộ chỉ vì ứng dụng không gọi lệnh `XA`.

## Query cache và phiên bản

*High Performance MySQL* ch. 7 mô tả query cache lịch sử. Query cache đã bị remove từ MySQL 8.0; `SQL_CACHE` đã bỏ và `SQL_NO_CACHE` bị deprecated/no effect trong 8.4. Không xây hệ thống hiện tại quanh directive đó. Kiểm tra release note/manual cho mọi feature legacy.

Query cache cũ lưu kết quả cho câu query khớp chính xác và invalidates entry khi bảng liên quan thay đổi. Một lần ghi có thể làm mất nhiều kết quả đã cache. Cache dùng chung còn gây contention khi concurrency cao; phân mảnh bộ nhớ, pruning và invalidation có thể làm server khựng. Hit ratio cao không chứng minh cache có lợi: so latency, throughput và contention dưới tải đọc-ghi gần production. Bài học còn giá trị là cache ở đúng tầng và đo chi phí invalidation. Với cache application, thiết kế TTL, stale data và stampede; với cache ngoài, xác định key, giới hạn dung lượng và cách refresh.

Trong các phiên bản còn query cache, sách đo hit/miss, entry bị prune, free block và fragmentation thay vì chỉ nhìn tổng dung lượng. Những counter `Qcache_*` đó đã bị gỡ cùng feature, nên không áp dashboard cũ lên server hiện tại. Câu hỏi phù hợp ngày nay là cache nào đang giảm database work, chi phí invalidation ra sao, và dữ liệu cũ tối đa bao lâu được chấp nhận.

## Đọc sâu các cơ chế trong chương 7

### Partition: lớp điều phối nằm trước storage engine

Sách mô tả partition như một lớp bao quanh nhiều handler của storage engine. Ở tầng SQL, ứng dụng vẫn thấy một bảng logic; bên dưới, mỗi partition có cấu trúc và index riêng. Vì vậy, index trên bảng partitioned không phải một B-tree toàn cục: truy vấn phải chọn partition trước, rồi mới tìm bằng index của partition đó.

Điều này giải thích cả lợi ích lẫn chi phí. `INSERT` biết giá trị row nên chọn một partition đích. `DELETE` cần tìm row; `UPDATE` có thể phải tìm row ở partition cũ, tính lại khóa partition và chuyển row sang partition khác. Truy vấn đọc có thể prune partition nếu điều kiện suy ra được tập partition cần xét. Sách mô tả phiên bản cũ mở và thiết lập handler trên nhiều partition trước khi prune; chi tiết thực thi thay đổi theo phiên bản, nhưng số partition bị chạm và chi phí mỗi lần định tuyến vẫn cần đo.

RANGE gom dữ liệu theo khoảng có thứ tự, hợp với thời gian hoặc số tăng dần và thao tác bỏ cả khoảng cũ. LIST ánh xạ giá trị vào nhóm rời rạc. HASH phân phối giá trị qua số partition để dàn tải, nhưng không tự giúp truy vấn theo range. KEY dùng hash do MySQL chọn trên cột khóa. RANGE COLUMNS cho phép phân hoạch theo cột trực tiếp trong phiên bản hỗ trợ. Subpartition chia tiếp một partition, nhưng làm tăng số đối tượng cần quản lý và không tự làm truy vấn nhanh hơn.

Một thiết kế theo năm có thể giữ các năm cũ riêng và một partition `MAXVALUE` làm nơi nhận dữ liệu vượt dự kiến. Partition `NULL`/giá trị không hợp lệ có thể rơi vào vùng đầu theo quy tắc biểu thức, làm truy vấn tưởng chỉ cần một vùng nhưng thực tế phải kiểm tra thêm. Trước khi dùng bảng cho retention, hãy định nghĩa rõ cách tạo partition mới, xử lý catch-all, xóa partition cũ, backup, restore và rollback DDL.

Partition pruning là bước lọc thô. Nếu bảng chia theo ngày mà câu lệnh chỉ lọc `customer_id`, mỗi vòng lookup join có thể phải kiểm tra index của nhiều partition. Nếu partition key được bọc trong hàm, optimizer có thể không suy ra range; hãy viết predicate trực tiếp trên cột ngày và kiểm tra `EXPLAIN`/`EXPLAIN PARTITIONS`. MySQL hiện đại đã hỗ trợ pruning với một số biểu thức mà bản sách chưa làm được, vì vậy hãy kiểm tra manual đúng release.

### Biểu thức partition là một phần của ngữ nghĩa schema

Trong MySQL 8.4, partitioning expression chịu giới hạn cụ thể theo loại partition. `RANGE`/`LIST` thông thường cần biểu thức cho kết quả integer hoặc `NULL`; `RANGE COLUMNS` và `LIST COLUMNS` cho phép dùng trực tiếp một số kiểu như `DATE`, `DATETIME` và chuỗi; `KEY` dùng phép băm nội bộ và chấp nhận nhiều kiểu cột MySQL hợp lệ, trừ `TEXT`/`BLOB` hoặc cột dùng index prefix. Không thể gọi stored function, UDF/plugin hoặc dùng biến trong biểu thức. Vì vậy, `PARTITION BY RANGE (YEAR(created_at))` hợp lệ nhưng không phải mọi hàm có vẻ deterministic đều dùng được.

Có một rủi ro ít thấy khi tạo bảng: kết quả của biểu thức có thể phụ thuộc `sql_mode`, nhưng bảng partitioned không lưu mode dùng lúc tạo. Đổi mode về sau có thể khiến thao tác với bảng thất bại hoặc làm cách phân phối row khác đi. MySQL cảnh báo khả năng bảng không truy cập được, mất hoặc hỏng dữ liệu; source và replica cũng nên dùng cùng `sql_mode` để partition expression cho cùng kết quả. Hãy giữ mode ổn định và kiểm tra phép tính partition trước migration.

Giới hạn hiện hành của MySQL 8.4 là tối đa 8.192 partition cho bảng không dùng NDB, tính cả subpartition. Đây là trần kỹ thuật, không phải mục tiêu thiết kế: manual lưu ý hàng trăm partition đã có thể không phù hợp vì metadata, file handle và overhead. Số lượng nên xuất phát từ query pruning, retention và chi phí DDL đo được.

Khi bảng vượt quá working set, partitioning đôi khi cho phép quét tuần tự một vùng lạnh, hoặc giữ partition nóng và index của nó trong RAM. Đây là chiến lược vật lý phụ thuộc workload. Index trên mọi partition có thể tốn nhiều dung lượng, random I/O và công ghi; bỏ index thì các query cần tìm row lẻ có thể chậm nghiêm trọng. Hãy so sánh hai phương án bằng dữ liệu đại diện. Bỏ partition cũ thường nhanh vì loại cả đơn vị dữ liệu; `REORGANIZE` có thể phải di chuyển row. Quá nhiều partition làm tăng metadata, mở bảng, file descriptor ở engine cũ, DDL và công định tuyến; con số giới hạn cũ của sách không phải mục tiêu hiện tại.

### MERGE table không có tính chất của một bảng toàn cục

Ví dụ trong sách tạo hai bảng MyISAM, mỗi bảng đều có `PRIMARY KEY(a)`, rồi gom chúng vào một MERGE table. Kết quả vẫn có thể chứa hai row cùng `a`: tính duy nhất chỉ được đảm bảo trong từng bảng con. MERGE cũng không hợp nhất index thành một index toàn cục; truy vấn có thể phải hỏi nhiều bảng con rồi gộp kết quả.

Các bảng con phải là MyISAM và có định nghĩa cột/index tương thích. Thay đổi một bảng con có thể làm MERGE table không dùng được; một số thao tác như `REPLACE` và `AUTO_INCREMENT` có hạn chế. `INSERT_METHOD=FIRST/LAST` chọn bảng nhận ghi, không phải cơ chế phân phối hay cân bằng tải. Điểm khác với partition là bảng con vẫn là bảng riêng, có thể được đưa vào nhiều tập MERGE hoặc thao tác riêng, nhưng đổi lại ứng dụng phải tự giữ schema và tính toàn vẹn. Đây chủ yếu là kiến thức về một cơ chế lịch sử; khi đánh giá hệ thống mới, so với bảng InnoDB, partitioning hoặc sharding theo yêu cầu thực.

### View có thể là phép viết lại hoặc một bước materialize

`ALGORITHM=MERGE` cho phép optimizer ghép query bên ngoài với định nghĩa view để tối ưu chung. `TEMPTABLE` tạo kết quả trung gian; ở bản sách, view có `GROUP BY`, `DISTINCT`, aggregate hoặc `UNION` thường rơi vào dạng này vì không còn quan hệ một-một đơn giản giữa row đầu vào và row kết quả. Query bên ngoài có thể không đẩy được predicate xuống view trong bản cũ, và bảng tạm không có index như bảng nền.

MySQL hiện đại có derived-condition pushdown trong một số trường hợp, nhưng điều đó không biến view thành materialized view hay đảm bảo filter luôn được đẩy xuống. Dùng `EXPLAIN` với query thật; tìm derived/materialized operation, temporary table, sort và lượng row trước/sau filter. Index vẫn đặt trên bảng nền. Một view ngắn về mặt cú pháp có thể che một phép nối hoặc tổng hợp lớn, nên cần đo query đã mở rộng.

View thường chỉ update được khi mỗi row kết quả ánh xạ rõ về một row ở một bảng nền. Aggregate, `GROUP BY`, `DISTINCT`, `UNION` và một số phép nối phá vỡ ánh xạ đó. Với view join có thể update, MySQL chỉ cho sửa một bảng nền trong một statement. `WITH CHECK OPTION` buộc row mới hoặc row sau update vẫn thỏa điều kiện của view; nếu thiếu, một update hợp lệ trên bảng nền có thể làm row biến khỏi view. View không có trigger `INSTEAD OF` để tự định nghĩa cách ghi cho view không updatable.

View vẫn hữu ích để che cột nhạy cảm bằng quyền `GRANT` trên view, hoặc làm lớp tương thích khi đổi schema theo từng đợt. Một view được đặt tên đặc biệt để giả lập view tạm vẫn là đối tượng schema dùng chung, không có vòng đời riêng theo connection; tên, quyền và dọn dẹp phải được quản lý cẩn thận. Lưu định nghĩa dễ đọc trong migration/source control vì định nghĩa lưu trong server có thể được chuẩn hóa và mất định dạng/comment ban đầu.

### Foreign key: integrity được giữ bằng lookup, index và lock

Khi ghi khóa ngoại ở bảng con, InnoDB phải tìm khóa cha bằng index và giữ khóa phù hợp để row cha không bị xóa giữa transaction. Như vậy, câu lệnh tưởng chỉ ghi một bảng có thể chờ hoặc deadlock qua bảng khác. Cascade update/delete còn phát sinh công việc theo từng row và có thể mở rộng lock footprint.

Index cho FK không miễn phí: nó chiếm page, làm tăng ghi và có thể ít chọn lọc. Tuy nhiên, FK không mặc định là “chậm”; kiểm tra toàn vẹn trong server có thể rẻ và đáng tin hơn nhiều lần round trip ở application, còn cascade có thể tránh tự viết quy trình cập nhật thiếu nhất quán. Hãy chọn constraint theo invariant, theo dõi lock wait/deadlock, và đo chi phí bằng workload thật. Nếu chỉ cần giới hạn một enum nhỏ, cân nhắc `ENUM`, `CHECK` (theo release) hoặc constraint phù hợp thay cho tạo bảng mã và index chỉ để FK.

Trigger tự viết để giả lập FK phải xử lý race condition. Chỉ `SELECT` xem row cha tồn tại rồi insert row con là chưa đủ: transaction khác có thể xóa cha giữa hai thao tác. Cần khóa và isolation phù hợp, hoặc dùng FK native. Vì vậy, lời khuyên trong sách rằng có thể bỏ FK để lấy tốc độ phải được cân bằng với tính đúng đắn và chi phí phục hồi dữ liệu lỗi.

### Stored code, trigger, event và cursor có chi phí khác nhau

Procedure/function chạy gần dữ liệu, có thể gom nhiều thao tác nhỏ thành một lần gọi, giảm network round trip và parse overhead. Sách benchmark một triệu insert tuần tự và thấy procedure nhanh hơn client gửi từng query; con số đó thuộc cấu hình cũ, còn nguyên tắc cần kiểm tra là latency và lượng request giảm được. Stored code cũng có thể gom quyền truy cập hoặc đặt invariant gần dữ liệu. Đổi lại, deploy, debug, profiling, replication và phân phối tải trở nên gắn chặt với database. Function trong query còn khó ước lượng cost và có thể được gọi nhiều lần hơn dự đoán.

Trigger chạy ngầm cho từng row, nên một `UPDATE` nhiều row có thể kích hoạt lượng lớn thao tác phụ. Nó hữu ích khi invariant phải được giữ đồng bộ ngay trong cùng transaction. Với InnoDB, thay đổi do trigger tham gia transaction gọi nó; với engine không transactional, lỗi sau trigger không nhất thiết rollback phần trước. Trigger cũng có thể tạo deadlock khó nhìn thấy. Sách nêu một mẹo `ROW_COUNT()` để giả lập trigger cấp statement; đây là hành vi tình cờ/không đảm bảo, không dùng làm thiết kế production.

Stored procedure/trigger có thể chứa comment, nhưng việc tạo đối tượng qua một số client có thể làm mất comment thường. Sách chỉ ra versioned comment như một cách bảo toàn comment trong tool cũ; đây là chi tiết của client/server đời đó. Trong dự án hiện tại, giữ source có format trong migration và kiểm tra định nghĩa sau deploy; đừng dùng comment giả executable như cơ chế tài liệu chính.

Event scheduler là lịch chạy bên trong MySQL, gần với cron nhưng gắn với server. Event không nhận input từ connection và có thể chạy chồng lên lần trước nếu công việc dài. Nếu vẫn dùng, thiết kế tác vụ idempotent, có lock/lease chống overlap, ghi trạng thái chạy và quyết định event có chạy trên replica hay không. Một lock phải được nhả kể cả khi procedure lỗi; cần handler/cleanup rõ ràng. Không coi lịch chạy là bảo đảm exactly-once.

Cursor MySQL trong stored procedure là read-only, forward-only và materialize toàn bộ query khi `OPEN`. Vì thế fetch một row rồi đóng cursor vẫn có thể đã đọc và chép cả nghìn row vào temporary table. Temporary table có thể spill ra disk, nhất là khi có `BLOB`/`TEXT` hoặc vượt ngưỡng bộ nhớ. Nếu chỉ cần vài row, giới hạn query bằng `LIMIT`; nếu cần xử lý tập hợp, ưu tiên SQL set-based hoặc chia batch có ranh giới rõ.

### Prepared statement: ba giao diện cần phân biệt

Server-side prepared statement gửi template một lần rồi truyền parameter khi execute bằng binary protocol. Driver phía client có thể giả lập prepare bằng cách thay value vào SQL text và gửi lại query biasa; giao diện nhìn giống nhau nhưng không có cùng round trip, binding hoặc bảo vệ ở server. Giao diện SQL (`PREPARE`, `EXECUTE`, `DEALLOCATE PREPARE`) cho phép tạo dynamic SQL trong procedure, nhưng vẫn chạy trên text protocol.

Parameter đại diện cho literal value. Nó không thể thay identifier như schema/table/column, keyword hoặc cả mệnh đề SQL. Với tên bảng động, ghép chuỗi sau khi xác thực identifier bằng allowlist và quote đúng theo driver/server. Không nối trực tiếp input người dùng vào câu SQL. SQL-level prepare hữu ích cho identifier hoặc `LIMIT` động khi cú pháp không cho placeholder, nhưng việc ghép chuỗi làm an toàn phụ thuộc kiểm soát đầu vào.

Prepare có thể giảm parse và truyền lại query text khi lặp, nhưng không phải mọi quyết định tối ưu đều cố định. Theo sách, optimizer có bước lúc prepare, lúc execute đầu, và mỗi execution vì parameter có thể đổi partition pruning, range/ref access, join order hay constant folding. Server-side statement sống theo connection; pool cần giữ đúng lifecycle và deallocate để tránh rò statement. Nếu chỉ chạy một lần, chi phí prepare và các lượt trao đổi bổ sung có thể lớn hơn phần tiết kiệm. Hãy xác minh driver thật sự dùng server-side prepare và benchmark số lần lặp, query size, payload cùng concurrency.

### UDF và plugin nằm trong failure boundary của server

Stored function viết bằng SQL khác UDF viết native theo ABI của server. UDF có thể làm phép tính nhanh hoặc gọi thư viện hệ điều hành, nhưng chạy trong process database và có thể truy cập bộ nhớ native. Lỗi thread-safety, buffer hoặc ABI có thể làm sập server hay làm hỏng dữ liệu. UDF thường không nên truy cập bảng như một thao tác cùng transaction; dùng cho phép tính thuần khi có lợi ích đo được, đóng gói/build theo release, kiểm tra nguồn và có quy trình rollback.

Plugin mở rộng nhiều điểm hơn: authentication, audit, parser full-text, daemon, procedure và bảng `INFORMATION_SCHEMA`. Mỗi loại có lifecycle, quyền và tác động khác nhau. Daemon plugin có thể mở network port; parser plugin thay cách tách token; audit plugin quan sát sự kiện truy vấn. Trước khi cài, xác định code chạy trong process nào, cần privilege gì, sống qua restart/upgrade ra sao, ảnh hưởng replication thế nào và cách gỡ khi lỗi.

### Charset và collation tham gia vào so sánh và kế hoạch query

Charset mô tả cách byte mã hóa ký tự; collation mô tả cách so sánh, sắp xếp và xử lý hoa/thường. Defaults hình thành theo tầng server → database → table → column, nhưng chỉ column quyết định encoding của giá trị lưu. Connection lại có bộ setting riêng cho query đi vào, chuỗi trung gian và kết quả trả ra. `SET NAMES` chỉ đổi phía server nếu client library vẫn gửi byte theo charset cũ thì dữ liệu có thể sai hoặc tạo lỗ hổng khi escape.

Khi JOIN hoặc so sánh hai cột khác charset/collation, MySQL có thể phải convert một vế. Nếu conversion được áp lên indexed column, index có thể không còn dùng như dự kiến. Index chỉ hỗ trợ thứ tự của collation mà nó được xây; `ORDER BY col COLLATE ...` khác collation index có thể cần filesort. Hãy đồng nhất charset/collation cho khóa so sánh và kiểm tra `EXPLAIN`, `SHOW FULL COLUMNS`, `CHARSET()`, `COLLATION()` khi debug.

Encoding đa byte khiến số byte khác số ký tự: `LENGTH()` đếm byte, `CHAR_LENGTH()` đếm ký tự. Bản sách dùng ví dụ UTF-8 ba byte và giới hạn key của MyISAM cũ; MySQL hiện nay có `utf8mb4`, giới hạn index phụ thuộc engine/page size/release. Giữ lại bài học: byte length, character count, prefix index và kích thước temporary buffer là những đại lượng khác nhau; đừng áp con số cũ. Khi import/export, xác định encoding ở cả client, connection và file, rồi thử ký tự đa byte thực tế thay vì chỉ chữ ASCII.

### Full-text search là một pipeline lập chỉ mục riêng

Full-text search chuyển chuỗi thành token, lọc stopword/độ dài theo parser, rồi tìm document qua inverted index. Natural-language mode trả độ liên quan dựa trên term frequency và độ phổ biến trong collection; từ xuất hiện quá nhiều có thể bị xem như không hữu ích. Boolean mode cho phép bắt buộc `+`, loại `-`, giảm trọng số `~`, prefix `*`, nhóm điều kiện và phrase. Boolean result không tự sắp theo relevance. Cú pháp và cách tính ranking tùy engine/version; ví dụ sách là MyISAM-era.

Một FULLTEXT index đại diện cho đúng tập cột và parser được khai báo. Nó không ghi đủ vị trí token để trả mọi phrase/proximity query trực tiếp; phrase có thể cần đọc các row ứng viên để xác minh. Index không chứa toàn văn row nên không covering; điều kiện thường (`author_id`, date) có thể được lọc sau khi full-text đã tạo candidate set, và sort theo cột khác relevance có thể filesort. Với workload lọc rất chọn lọc, cách nhúng token lọc vào text như sách minh họa chỉ là workaround để benchmark, có nguy cơ đồng bộ sai và không thay được mô hình index thông thường.

Token length và stopword quyết định cả chất lượng lẫn kích thước. Bỏ từ ngắn làm index nhỏ hơn nhưng truy vấn `CD player` có thể mất nghĩa; bỏ từ phổ biến giúp tốc độ nhưng có thể loại thuật ngữ quan trọng. Thay đổi parser, stopword hoặc ngưỡng thường cần rebuild index. Sửa văn bản dài có thể cập nhật nhiều posting; index lớn ngoài RAM dễ chậm và phân mảnh. Đo query phổ biến, query không kết quả, candidate count, write cost và độ trễ p95. Khi cần typo tolerance, proximity ranking, đa ngôn ngữ hoặc scale phân tán, cân nhắc search engine chuyên dụng thay vì ép database làm mọi việc.

### XA của ứng dụng khác với phối hợp commit nội bộ

Application XA cần coordinator và participant: tất cả participant prepare trước, coordinator ghi quyết định, rồi mới yêu cầu commit. Nếu coordinator mất hoặc participant còn trạng thái prepared, giao dịch có thể bị treo chờ recovery; timeout và retry phải giữ nguyên transaction identity. XA là atomicity ở nhiều resource với chi phí round trip và khả năng blocking, không phải giao thức tự chạy một mình.

Internal two-phase commit phối hợp engine transaction với binary log để dữ liệu và replication log nhất quán sau crash. Nó không đồng nghĩa ứng dụng đang dùng XA. Các cấu hình trong sách theo MySQL cũ đã đổi; ở MySQL 8.4 không tắt internal coordination theo hướng dẫn lịch sử. Chọn XA khi cần invariant atomic thật sự qua participant tương thích; nếu không, transaction cục bộ cùng outbox/saga thường dễ phục hồi hơn.

### Query cache cũ tra theo query text và quản lý pool bộ nhớ riêng

Cache lịch sử cần phân biệt chính xác statement và connection context. Query tương đương về ý nghĩa nhưng khác text/case/spacing có thể không cùng entry; một số loại query bị đánh dấu uncacheable. Khi bảng thay đổi, cache invalidates toàn bộ entry phụ thuộc bảng đó, không phân tích row nào thực sự ảnh hưởng kết quả. Điều này đơn giản nhưng ghi nhỏ có thể làm mất nhiều kết quả.

Trong cơ chế cũ, cache lookup diễn ra rất sớm, trước khi server parse đầy đủ SQL; vì thế server không thể dựa vào việc hiểu mọi biểu thức để chứng minh query an toàn. Nó nhận diện loại câu lệnh ở mức đơn giản, sau đó một số construct hoặc trạng thái session làm query không cache được. Điều này giải thích vì sao “query có nondeterministic function” không nhất thiết bị phát hiện bằng cách phân tích hàm lúc lookup; server có thể chạy query rồi quyết định không lưu kết quả. Quy tắc chính xác phụ thuộc release cũ và chỉ có giá trị để hiểu lịch sử.

Pool cache chứa query text, mapping bảng–result, metadata block và result. Entry được cấp qua các block; xóa hoặc thay kích thước để lại khoảng trống nhỏ, gây fragmentation. Bộ nhớ lớn hơn không luôn tốt: invalidation/pruning dưới global mutex có thể chặn cả cache lookup và ghi. Các chỉ số lịch sử như hit, insert, low-memory prune và free blocks chỉ hữu ích khi gắn với throughput/latency và read-write mix; hit rate đơn lẻ có thể đánh lừa.

Sách khuyên đo ở concurrency gần production, cân nhắc giới hạn dung lượng/result và tắt cache khi write-heavy hoặc mutex contention lớn. Nó cũng mô tả batch write để giảm số lần invalidation, nhưng batch quá lớn có thể tạo pause dài. Các cách đó giúp hiểu design tradeoff của cache invalidation, không phải cấu hình MySQL 8.4 vì query cache đã bị loại bỏ. Cache hiện đại nên đặt ở tầng phù hợp, với key, TTL, giới hạn bộ nhớ, invalidation và hành vi khi cache miss được thiết kế rõ.

Tương tác InnoDB–query cache trong sách phụ thuộc MVCC: transaction visibility và lock trên bảng quyết định transaction nào được đọc hoặc ghi entry. Khi transaction giữ lock rồi commit, bộ đếm transaction liên quan đến bảng có thể khiến transaction cũ không còn dùng cache cho bảng đó; `SELECT ... FOR UPDATE` cũng làm query liên quan không cache được trong thời gian lock. Cơ chế cụ thể này đã biến mất cùng query cache, nhưng bài học là một cache ở server phải tôn trọng snapshot và trạng thái khóa, không chỉ nội dung row hiện tại.

Nguồn: *High Performance MySQL*, ch. 7; [partitioning limitations](https://dev.mysql.com/doc/refman/8.4/en/partitioning-limitations.html), [partition types](https://dev.mysql.com/doc/refman/8.4/en/partitioning-types.html), [partition pruning](https://dev.mysql.com/doc/refman/8.4/en/partitioning-pruning.html), [MERGE engine](https://dev.mysql.com/doc/refman/8.4/en/merge-storage-engine.html), [view algorithms](https://dev.mysql.com/doc/refman/8.4/en/view-algorithms.html), [view updatability](https://dev.mysql.com/doc/refman/8.4/en/view-updatability.html), [derived-condition pushdown](https://dev.mysql.com/doc/refman/8.4/en/derived-condition-pushdown-optimization.html), [foreign keys](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html), [stored objects](https://dev.mysql.com/doc/refman/8.4/en/stored-objects.html), [prepared statements](https://dev.mysql.com/doc/refman/8.4/en/prepare.html), [full-text search](https://dev.mysql.com/doc/refman/8.4/en/fulltext-search.html), [character sets](https://dev.mysql.com/doc/refman/8.4/en/charset.html), [XA](https://dev.mysql.com/doc/refman/8.4/en/xa.html), [binary-log durability and internal two-phase commit](https://dev.mysql.com/doc/refman/8.4/en/binary-log.html).

## Tự kiểm tra

**Tạo partition có tự pruning mọi query?** Không; query cần predicate tương thích với partition key.

**View có cache kết quả?** Không mặc định; nó là query abstraction.

**Sách cũ nói query cache giúp query lặp nhanh; có dùng directive trong MySQL 8.4?** Không; query cache đã bị gỡ khỏi MySQL hiện đại.

**Partition có thay index không?** Không. Nó loại vùng dữ liệu ở độ hạt thô; index vẫn có thể cần để tìm row trong partition còn lại.

**Prepared statement có parameterize tên cột không?** Không. Parameter đại diện cho value; identifier phải chọn từ allowlist.

**Foreign key chỉ ảnh hưởng câu ghi trực tiếp trên bảng cha?** Không. Constraint và cascade có thể khóa hoặc cập nhật row ở bảng liên quan.

**XA và outbox xử lý atomicity theo cùng cách?** Không. XA tìm atomic commit giữa participant hỗ trợ protocol; outbox ghi ý định trong transaction cục bộ rồi giao nhận bất đồng bộ.

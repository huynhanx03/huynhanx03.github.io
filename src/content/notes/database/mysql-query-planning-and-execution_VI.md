---
title: "Từ request đến execution plan trong MySQL"
category: "Database"
description: "Theo một câu SQL qua protocol, optimizer và storage engine; đọc plan bằng cách so sánh ước lượng với số dòng thực tế."
updated: 2026-10-17
translationKey: "database/mysql-query-planning-and-execution"
---

Một câu `SELECT` gửi từ ứng dụng không đi thẳng tới B-tree. MySQL phải nhận request, phân tích cú pháp, xác định bảng và quyền, chọn cách đọc dữ liệu, thực thi plan qua storage engine rồi gửi kết quả về client. Query chậm có thể tốn thời gian ở bất kỳ đoạn nào: chờ connection, đọc nhiều page, lặp lookup trong join, sort, giữ lock hoặc truyền một result set lớn.

## Đường đi của một câu query

Với classic protocol, client gửi command/query trên một connection. Server parse SQL thành cấu trúc nội bộ, resolve tên cột/bảng và kiểm tra quyền, rồi chuẩn hóa một số biểu thức. Optimizer xem schema, index, thống kê và điều kiện query để chọn access path, thứ tự join, sort/group strategy và các phép biến đổi phù hợp. Kết quả là execution plan gồm các operation/iterator.

Executor chạy plan. Một số thao tác cần server layer; thao tác đọc hoặc sửa row đi qua handler interface tới storage engine như InnoDB. Engine tìm page, kiểm tra record/visibility và trả hàng phù hợp. Server áp dụng những filter hoặc expression còn lại, đóng gói metadata/row theo protocol, rồi gửi tới client. Client còn phải nhận bytes, giải mã row và có thể chuyển đổi thành object; tổng thời gian request vì vậy không giống riêng thời gian executor.

```text
Client → protocol command → parse/resolve → optimizer + statistics
       → execution iterators ↔ storage-engine handlers/pages
       → result metadata/rows → network → client
```

Process state như `Sending data` trong một số phiên bản có thể bao gồm scan, filter, đọc row và chuẩn bị result; đừng hiểu tên state là server chỉ đang gửi bytes qua mạng. Các state/instrument thay đổi theo version. Với MySQL 8.4, dùng Performance Schema statement/stage/wait events để điều tra có cấu trúc; tương quan query với network và application trace nếu thời gian endpoint vẫn cao.

## Optimizer chọn plan dựa trên ước lượng

Optimizer không thử chạy mọi plan hoàn chỉnh rồi chọn plan nhanh nhất. Nó dùng **cost model** và thống kê để ước tính công việc: số row phù hợp với predicate, số lần lookup, chi phí scan/index, sort, join và các operation khác. Từ đó nó so một số plan ứng viên. Estimates là dự đoán từ metadata/sample, nên dữ liệu lệch, histogram thiếu hoặc thống kê cũ có thể làm quyết định khác với workload thật.

Giả sử query lấy đơn gần đây của một tenant rồi nối `order_items`. Với nested-loop join, MySQL có thể đọc nhóm order trước, rồi với mỗi order tra item qua index. Nếu có 40 order và mỗi lookup trả trung bình 3 item, inner iterator có thể chạy khoảng 40 lần và tạo khoảng 120 row trước các bước kế tiếp. Nếu optimizer ước lượng chỉ có 2 order nhưng thực tế có 40.000, một inner lookup tưởng rẻ có thể lặp hàng chục nghìn lần.

Thứ tự join phụ thuộc vào ước lượng cardinality và điều kiện. Bắt đầu từ bảng có ít row phù hợp thường có lợi, nhưng không phải quy tắc duy nhất: covering index, sort order, join condition và chi phí đọc row cũng quan trọng. MySQL 8.4 có nhiều chiến lược join, gồm nested-loop variants và hash join khi điều kiện phù hợp; optimizer không nhất thiết chọn hash join chỉ vì query có equality. Xem plan thực tế trước khi đổi query.

## Đọc plan như cây công việc

`EXPLAIN` cho biết chiến lược mà optimizer dự định dùng. Hỏi theo thứ tự:

1. Bảng nào được truy cập trước và tại sao thứ tự này hợp với filter/join?
2. Mỗi iterator dùng scan, lookup hay range nào? Có key nào được chọn và điều kiện nào còn dư?
3. Bao nhiêu row được ước lượng vào/ra từng bước? Có sort, temporary table, materialize hay filter muộn không?
4. Inner side của join chạy bao nhiêu lần? Một lookup nhỏ nhân với hàng trăm nghìn loops vẫn thành nhiều công việc.
5. Query trả bao nhiêu row/byte và client có thật sự cần chúng không?

Trong MySQL 8.4, `EXPLAIN ANALYZE` thực thi câu `SELECT` và hiển thị iterator cùng actual rows, loops, thời gian và estimate. So từ đầu cây tới node đầu tiên có sai lệch lớn. Chẳng hạn optimizer dự đoán predicate khớp 20 row, nhưng actual là 80.000; các node phía sau có thể chậm vì đã nhận đầu vào lớn hơn dự kiến, nên sửa query ở cuối cây có thể không giải quyết gốc vấn đề.

Rows và time của iterator cần đọc cùng loops. Nếu inner node trả trung bình 3 row qua 40.000 loops, nó có thể xử lý xấp xỉ 120.000 row. Thời gian iterator có thể bao gồm thời gian con theo cách hiển thị của plan, nên không cộng máy móc mọi con số để ra endpoint latency. `EXPLAIN ANALYZE` có overhead và thực thi câu lệnh được hỗ trợ. Với `SELECT`/`TABLE`, chọn query đọc an toàn và môi trường chịu được tải; với `UPDATE`/`DELETE` nhiều bảng, câu lệnh thực sự thay đổi dữ liệu nên chỉ chạy trên dữ liệu thử có thể khôi phục.

## Khi estimate lệch, tìm dữ liệu optimizer đang thiếu

Kiểm tra kiểu/collation join key, index, null fraction, cardinality, skew theo tenant/status và tần suất dữ liệu đổi. `ANALYZE TABLE` cập nhật key distribution; histogram có thể mô tả phân bố của một cột khi thống kê index trung bình chưa đủ. Những thao tác này cũng có chi phí và không sửa được mọi estimate, nên hãy chạy lại plan sau khi cập nhật.

Nếu `EXPLAIN` vẫn không giải thích vì sao access path bị loại, optimizer trace có thể cho biết transformation, range và cost consideration mà optimizer xét. Đây là dữ liệu chẩn đoán, không phải plan dùng trực tiếp để sửa query. Hãy quay lại kiểm tra thống kê và workload trước khi thêm hint.

Hint như `JOIN_ORDER`, `JOIN_INDEX` hoặc `MAX_EXECUTION_TIME` có thể hữu ích khi đã chứng minh vấn đề cụ thể; chúng cũng làm SQL phụ thuộc vào layout/dữ liệu hiện tại. Một hint tốt cần một metric chứng minh, query regression coverage phù hợp và người chịu trách nhiệm xem lại sau thay đổi schema, phân bố dữ liệu hoặc nâng version. Optimizer là cost-based, nhưng không có đầy đủ thông tin về mọi future workload.

## Nối plan với thời gian người dùng chờ

Execution plan giải thích cách server làm việc, nhưng không hiển thị đầy đủ connection pool queue, network latency, client decoding hoặc thời gian ứng dụng xử lý trước/sau query. So endpoint trace với statement digest/time trong Performance Schema. Nếu server statement nhanh mà endpoint chậm, tìm ở app, pool, network hoặc số round trip. Nếu actual rows/loops lớn, tập trung giảm công đọc/join. Nếu thời gian dồn ở lock/wait, index mới có thể không giải quyết blocker.

Các khái niệm lâu bền trong sách gồm query plan, estimates, join order và đo thực tế. Hành vi thuật toán, state names, hash join, optimizer switches và format `EXPLAIN` thay đổi theo MySQL release; dùng [MySQL 8.4 EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/explain.html), [EXPLAIN output](https://dev.mysql.com/doc/refman/8.4/en/explain-output.html), [execution plans](https://dev.mysql.com/doc/refman/8.4/en/execution-plan-information.html), [derived-table materialization](https://dev.mysql.com/doc/refman/8.4/en/derived-table-optimization.html), [cost model](https://dev.mysql.com/doc/refman/8.4/en/cost-model.html), [optimizer controls](https://dev.mysql.com/doc/refman/8.4/en/controlling-optimizer.html) và [Performance Schema](https://dev.mysql.com/doc/refman/8.4/en/performance-schema.html) để kiểm tra hành vi hiện hành.

## Đọc bảng EXPLAIN truyền thống từ trái sang phải

Appendix D của *High Performance MySQL* giải thích bảng `EXPLAIN` dạng truyền thống qua các cột. Chúng vẫn hữu ích để nhận diện ý định plan, nhưng format và tên loại SELECT thay đổi theo phiên bản. MySQL 8.4 còn có `TREE` và `JSON`; `TREE` diễn tả quan hệ cha-con rõ hơn và là format của `EXPLAIN ANALYZE`.

- `id` nhóm các block SELECT trong một query phức tạp. Đừng đọc nó như thứ tự thời gian; subquery, derived table và UNION có cấu trúc riêng.
- `select_type` mô tả vai trò block như SIMPLE, PRIMARY, SUBQUERY, DERIVED hoặc UNION trong các bản cũ. Một số nhãn đã được đổi/deprecate ở release mới. Dùng TREE/JSON để hiểu materialization, semijoin hoặc subquery transformation thực tế.
- `table` là nguồn dữ liệu ở bước đó: table thật, derived result, union result hoặc `NULL` khi bước được tính mà không cần table. Alias tự join có thể xuất hiện thành hai lần truy cập khác nhau.
- `partitions` nêu partition mà optimizer dự kiến đọc nếu partitioning áp dụng. Nếu query đáng lẽ chỉ chạm partition hẹp nhưng plan liệt kê nhiều vùng, kiểm tra predicate có cho phép pruning không.
- `type` là tên lịch sử cho access method/join access, không phải kiểu dữ liệu SQL. `const`, `eq_ref`, `ref`, `range`, `index`, `ALL` thường mô tả từ lookup rất chọn lọc tới scan rộng, nhưng không nên xếp hạng độc lập với kích thước bảng, số lần lặp và số hàng cần trả.
- `possible_keys` là các index optimizer cân nhắc, không phải lời hứa rằng chúng phù hợp. `key` là index được chọn; `NULL` có thể đồng nghĩa scan hoặc không cần truy cập table.
- `key_len` cho biết độ dài phần key dùng trong lookup, tính bằng byte và phụ thuộc nullability/charset/type. Nó không nói index “tốt” hay số cột được dùng theo cách trực quan; so với định nghĩa index và `ref`.
- `ref` chỉ giá trị/cột dùng để so với index key, chẳng hạn constant hoặc column từ bước trước.
- `rows` là estimate số hàng cần kiểm tra ở bước đó; trong nested loop, phải hiểu nó cùng với loops và phần còn lại của plan. `filtered` ước lượng tỷ lệ còn lại sau điều kiện. Hai estimate có thể sai khi stats thiếu hoặc dữ liệu lệch.
- `Extra` chứa ghi chú như `Using index` (covering), `Using where`, `Using temporary`, `Using filesort` hoặc điều kiện pushed down. “Filesort” không có nghĩa chắc chắn sort xuống disk; “temporary” cũng không luôn nói temporary table lớn. Xác minh bằng runtime data và instrumentation.

Ví dụ đọc một join: optimizer quét `customer` theo range tạo khoảng 500 row, sau đó tra `orders` bằng `ref`, estimate 2 row cho mỗi customer. Dự kiến cỡ 1.000 row inner work; nếu `EXPLAIN ANALYZE` báo 500 loops nhưng 40 row mỗi loop, tổng việc thực tế lớn hơn khoảng 20 lần. Kiểm tra sai lệch đầu tiên và dữ liệu skew trước khi thêm index hoặc hint.

`EXPLAIN FORMAT=TRADITIONAL`, `FORMAT=TREE` và `FORMAT=JSON` phục vụ nhu cầu khác nhau. TREE giúp đọc thứ tự operator và hash join; JSON thuận tiện cho máy/so sánh có cấu trúc; traditional gọn cho nhiều table lookup. Trong MySQL 8.4, default format còn chịu ảnh hưởng của `explain_format`. Hãy chỉ định format rõ trong tài liệu sự cố để snapshot có thể tái lập.

`EXPLAIN ANALYZE` vừa lập plan vừa thực thi câu lệnh để thu timing/rows/loops. Trong MySQL 8.4, nó hỗ trợ `SELECT`, `TABLE`, cùng `UPDATE` và `DELETE` nhiều bảng; nó không hỗ trợ mọi dạng DML. Câu ghi có thể sửa dữ liệu, tạo I/O/lock và chạy trigger, nên chỉ đo trên dữ liệu thử có thể khôi phục. Nó không biến thời gian server thành latency người dùng: client/network/pool còn ở ngoài phạm vi. Lệnh `EXPLAIN` thường có thể lập plan cho `INSERT`, `REPLACE`, `UPDATE` và `DELETE` mà không thực thi câu lệnh đó.

### DML phải được đọc như DML

Ở phiên bản sách mô tả, `EXPLAIN` chủ yếu nhận `SELECT`, nên tác giả đề xuất viết một `SELECT` gần giống câu `UPDATE` để xem access path. Cách đó có thể chọn covering index mà câu ghi thật không dùng được: `UPDATE` còn phải đọc giá trị mới, sửa clustered record và các secondary index, kiểm tra constraint, chạy trigger, giữ lock, ghi undo/redo và tạo binlog. Nếu bản MySQL hỗ trợ `EXPLAIN UPDATE/DELETE/INSERT/REPLACE`, hãy explain chính câu lệnh thật để xem plan của optimizer. Kết quả vẫn là kế hoạch dự kiến, không phải mô phỏng đầy đủ chi phí thực thi hay side effect của trigger/routine.

Trong MySQL 8.4, `EXPLAIN ANALYZE` thực thi `SELECT`, `TABLE` hoặc một số DML: `UPDATE`/`DELETE` nhiều bảng. Nó không hỗ trợ mọi câu ghi, nhưng với dạng được hỗ trợ thì đây vẫn là câu lệnh thật và có thể sửa dữ liệu; chỉ dùng trên dữ liệu thử có thể khôi phục. Lệnh `EXPLAIN` thường lập plan cho `SELECT`, `INSERT`, `REPLACE`, `UPDATE` và `DELETE` mà không thực thi câu đó. Sau khi xem plan ghi, benchmark riêng trên dữ liệu thử và theo dõi lock, undo/redo, replication cùng thời gian hoàn tất.

### EXPLAIN với derived table và subquery

Sách cảnh báo một `EXPLAIN` đôi khi phải tạo temporary table từ subquery trong `FROM` trước khi lập plan cho query ngoài; trên MySQL 5.5, việc đó có thể làm chính lệnh `EXPLAIN` tốn nhiều tài nguyên. MySQL 5.6 bổ sung deferred materialization. Trong MySQL 8.4, optimizer trì hoãn materialize derived table tới lúc kết quả thật sự cần; với `EXPLAIN` thường, query không được execute nên một derived table có thể không bao giờ cần materialize. `EXPLAIN ANALYZE` chạy câu được hỗ trợ (`SELECT`, `TABLE`, hoặc `UPDATE`/`DELETE` nhiều bảng) và có thể buộc bước đó xảy ra; với DML, nó có thể sửa dữ liệu. Phân biệt phiên bản và loại `EXPLAIN` trước khi chạy trên query/view lớn.

Plan cũng không mô tả đầy đủ mọi hành vi runtime: logic bên trong trigger, stored function hay UDF có thể thêm công việc; một số tối ưu hóa chỉ rõ khi thực thi; ước lượng và cột `Extra` là tóm tắt có giới hạn. Dùng Performance Schema, statement history và phép đo runtime để nối phần plan nhìn thấy với thời gian, wait và side effect thực tế.


## Thời gian phản hồi gồm cả thời gian chờ

Khi người dùng nói “query mất 800 ms”, con số đó có thể bắt đầu từ lúc ứng dụng gọi database và kết thúc khi ứng dụng nhận đủ kết quả. Thời gian này gồm **thời gian phục vụ** (server parse, đọc, join, sort và tạo kết quả) cùng **thời gian chờ** (đợi connection trong pool, lock, CPU, I/O, network hoặc một request khác đang giữ tài nguyên). Một câu query chạy 30 ms trong database vẫn có thể khiến endpoint mất 500 ms nếu pool chờ lâu hoặc ứng dụng gọi database nhiều lần.

Sách dùng số hàng đã kiểm tra và số hàng trả về làm dấu hiệu ban đầu. Đọc 100.000 hàng để trả 20 là đáng điều tra, nhưng tỷ lệ này không phải phán quyết: phép lọc hiếm có thể phải xét nhiều index entry; hàng rộng tốn nhiều byte hơn hàng nhỏ; join có thể lặp lookup nhiều lần. Hãy hỏi riêng: server đọc bao nhiêu hàng và trang, mỗi bước lặp bao nhiêu lần, kết quả chuyển về client nặng bao nhiêu byte? Sau đó so thời gian trong database với thời gian đầu cuối của request.

Đừng yêu cầu dữ liệu chỉ để bỏ nó đi. Chọn cột cần dùng thay cho `SELECT *`, lọc theo điều kiện tận dụng được index, và thêm `LIMIT` nếu giao diện thực sự chỉ cần một phần kết quả. `LIMIT` giảm công việc khi engine có thể dừng sớm, nhưng không cứu được mọi query: nếu phải sort toàn bộ tập hợp trước, server vẫn có thể đọc và sắp xếp nhiều hàng rồi mới lấy vài hàng đầu.

## Từ câu lệnh đến kết quả qua protocol

Trong luồng cổ điển, client gửi SQL trên connection. Server phân tích cú pháp, kiểm tra tên bảng/cột và quyền, rồi optimizer tạo kế hoạch. Execution engine chạy các iterator trong kế hoạch; thao tác đọc/ghi đi qua giao diện handler tới storage engine. Cuối cùng server mã hóa metadata và từng hàng để gửi lại. Vì thế thời gian chạy SQL trong database không đại diện đầy đủ cho thời gian API.

Server thường có thể gửi hàng đầu tiên trước khi tạo xong toàn bộ result set, nếu kế hoạch cho phép streaming. Ở phía client, chế độ buffered đọc hết kết quả vào RAM ứng dụng; connection được giải phóng sớm hơn nhưng bộ nhớ tăng theo kích thước kết quả. Chế độ unbuffered cho ứng dụng đọc từng phần, giảm RAM client, nhưng connection vẫn bận trong lúc ứng dụng xử lý hàng. Nếu ứng dụng đọc cursor đồng thời gọi API chậm hoặc làm công việc lâu, connection và tài nguyên server bị giữ lâu hơn. Chọn chế độ theo kích thước kết quả, cách tiêu thụ và vòng đời connection của driver.

Trong protocol cổ điển, server gửi các hàng trong response; nếu ứng dụng chỉ đọc 10 hàng rồi dừng vòng lặp, việc đó tự nó không yêu cầu server dừng query. `LIMIT 10` mới đặt giới hạn ở phía server. Driver có thể hủy statement theo cách riêng, nhưng đó là thao tác khác và có chi phí. Đừng dựa vào việc “chỉ fetch vài hàng” để tránh tạo toàn bộ result set.

Trạng thái process list như `Sending data` thay đổi theo phiên bản và có thể gồm đọc, lọc, join lẫn chuẩn bị kết quả; tên đó không chứng minh server chỉ đang gửi bytes. Dùng Performance Schema xem statement, stage và wait event, rồi ghép với trace ứng dụng để tìm phần thời gian nằm ngoài database.

## Optimizer dựng kế hoạch như thế nào

Optimizer nhận thông tin schema, index và thống kê do storage engine cung cấp. Thống kê có thể gồm số trang, cardinality, độ dài khóa và phân bố giá trị. Từ đó nó ước lượng chi phí của các cách truy cập, thứ tự join, sort hay materialization. Đây là dự đoán, không phải kết quả đo: dữ liệu lệch theo tenant, histogram thiếu hoặc statistics cũ đều có thể khiến dự đoán sai. Cost model cũng không biết đầy đủ mọi thứ đang xảy ra trong ứng dụng hay tải cạnh tranh bên ngoài query.

Một số phép rewrite xác định được từ biểu thức và schema, như rút gọn điều kiện hằng hoặc nhận ra hai cột bằng nhau qua `JOIN`. Lựa chọn khác phụ thuộc giá trị predicate, thống kê và dữ liệu hiện tại nên cần ước lượng lại khi chạy. Prepared statement có thể dùng lại phần công việc ổn định nhưng vẫn phải chọn đường truy cập phù hợp với giá trị và tình trạng dữ liệu; đừng giả định plan lần đầu luôn tốt cho mọi tham số. Cặp khái niệm “static” và “dynamic optimization” trong sách giúp phân biệt hai loại quyết định này, dù nội bộ thay đổi theo release.

Optimizer cost chỉ là thước đo gần đúng. Sách gợi ý ước lượng cận trên thời gian query bằng cách xem plan cần bao nhiêu random/sequential page access rồi nhân với latency thiết bị. Đây không phải dự báo chính xác vì cache, concurrency, CPU và queue thay đổi, nhưng giúp phát hiện plan có số lần đọc vật lý khó đạt mục tiêu latency. So dự đoán với Performance Schema, buffer-pool/cache state và benchmark trên workload đại diện.

Sách mô tả chiến lược join của MySQL thời 5.5 chủ yếu như nested loops. Hình dung bảng ngoài trả về ba khách hàng; với mỗi khách hàng, bảng trong được tra qua index; mỗi match tạo thành một hàng ghép. Nếu inner lookup trả trung bình 4 hàng và được gọi 30.000 lần, công việc trung gian có thể khoảng 120.000 hàng. Với `LEFT JOIN`, nếu không tìm thấy hàng bên trong, kết quả vẫn có một hàng với các cột phía trong là `NULL`. Derived table hoặc nhánh `UNION` có thể materialize kết quả trung gian, nhưng optimizer hiện đại có thể merge một số derived table; chỉ nhìn cú pháp là chưa đủ để đoán.

Join order thường là quyết định lớn. Trong ví dụ sách, bắt đầu từ 200 actor rồi dò index sang hai bảng cần khoảng 200 lượt; bắt đầu từ 951 film cần khoảng 951 lượt. Vì vậy optimizer có thể đảo thứ tự bảng so với thứ tự viết. Với nhiều bảng, số thứ tự khả dĩ tăng nhanh; optimizer dùng heuristic để giới hạn thời gian lập kế hoạch, nên đôi khi vẫn chọn chưa tốt. `STRAIGHT_JOIN` hoặc hint có thể khóa lựa chọn, nhưng lựa chọn đó có thể tệ đi khi dữ liệu và phiên bản thay đổi.

MySQL 8.4 còn có hash join cho equality join phù hợp, bên cạnh nested-loop strategy. Hash join dựng bảng băm từ một phía rồi dò từng hàng phía kia; nó có thể hữu ích khi không có index phù hợp, nhưng tốn bộ nhớ và có thể không hợp với workload cụ thể. Xem strategy trong `EXPLAIN`/`EXPLAIN ANALYZE`, đừng suy ra chỉ từ chữ `JOIN`. [Tài liệu hash join 8.4](https://dev.mysql.com/doc/refman/8.4/en/hash-joins.html) mô tả điều kiện và cách xác nhận plan.

## Sort, executor và tên gọi dễ gây hiểu nhầm

Nếu index không tạo được thứ tự cần thiết, MySQL dùng filesort. Tên này chỉ tên thuật toán, không khẳng định chắc chắn phải ghi file xuống đĩa. Sách mô tả các đường sort cũ: giữ pointer cùng khóa sort rồi đọc lại hàng, hoặc giữ luôn các cột kết quả trong vùng sort. Đây là đánh đổi giữa đọc lại dữ liệu và dùng nhiều bộ nhớ. Thuật toán và biến cấu hình thay đổi theo phiên bản; ý bền vững là sort càng nhiều hàng và giữ mỗi hàng càng rộng thì càng đắt. `Using filesort` cần được xem cùng số hàng, buffer và runtime; nó không tự động có nghĩa “sort trên disk”. Với `ORDER BY` trên nhiều bảng hoặc sau join, sort có thể chỉ diễn ra sau khi tạo tập trung gian.

Execution engine đi theo cây operator/iterator và gọi handler khi cần thao tác của storage engine. Nó có thể đọc range, yêu cầu hàng kế tiếp, áp filter, dừng sớm hoặc dùng join strategy khác nhau. Một bảng được tham chiếu nhiều lần có thể có nhiều handler context. Phân biệt server layer với storage engine giúp giải thích tại sao cùng SQL chịu chi phí khác nhau tùy engine: giao diện đọc/ghi chung, nhưng layout trang, index và locking bên dưới khác nhau.

## Gắn nhãn đúng cho kiến thức lịch sử

Query cache là ví dụ rõ về kiến thức theo phiên bản. Sách giải thích việc cache toàn bộ result theo câu query và vô hiệu hóa khi dữ liệu liên quan đổi. Đây là bối cảnh hữu ích cho server cũ, nhưng MySQL loại bỏ query cache từ 8.0. Vì vậy `SQL_CACHE`/`SQL_NO_CACHE` trong sách không phải cách tăng tốc MySQL hiện nay. [Lịch sử tính năng bị loại bỏ](https://dev.mysql.com/doc/refman/8.0/en/added-deprecated-removed.html).

Tương tự, nhãn `DEPENDENT SUBQUERY`, khẳng định UNION luôn materialize, giới hạn join và chi tiết filesort trong sách mô tả optimizer cũ. MySQL mới có thể chuyển `IN`/`EXISTS` thành semijoin hoặc antijoin, rồi chọn materialization hay chiến lược khác theo điều kiện và cost. Giữ bài học về số vòng lặp và hàng trung gian, nhưng kiểm tra plan thật trên phiên bản đang chạy. [Phép biến đổi semijoin/antijoin 8.4](https://dev.mysql.com/doc/refman/8.4/en/semijoins-antijoins.html).

## Tự kiểm tra

**`EXPLAIN` thường có chạy query để đo kết quả thật không?** Không; `EXPLAIN ANALYZE` mới chạy statement để quan sát iterator, nên cần xem tác động trước khi dùng.

**Một inner lookup có ba row là rẻ?** Có thể, nhưng phải nhân với loops; ba row lặp hàng chục nghìn lần vẫn là tải lớn.

**Optimizer estimate sai thì nên thêm hint ngay?** Chưa. Kiểm tra skew, key/collation, statistics và actual plan; hint chỉ nên dùng khi đã chứng minh lỗi lựa chọn và có cách xem lại.

Nguồn đọc: *High Performance MySQL*, chương 6; [MySQL 8.4 EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/explain.html) và [Performance Schema](https://dev.mysql.com/doc/refman/8.4/en/performance-schema.html).

---
title: "MVCC, snapshot và vòng đời tuple trong PostgreSQL"
category: "Database"
description: "Giải thích vì sao PostgreSQL giữ nhiều phiên bản row, snapshot nhìn thấy dữ liệu nào và UPDATE tạo ra điều gì."
updated: 2026-10-18
translationKey: "database/postgresql-mvcc-snapshots-and-tuples"
---

Giả sử một giao dịch đang đọc số dư 100 trong khi giao dịch khác đổi số dư thành 130. PostgreSQL thường không bắt reader đứng chờ writer chỉ để đọc dữ liệu nhất quán. MVCC (multi-version concurrency control) giữ phiên bản tuple và cho mỗi câu lệnh/giao dịch một snapshot để quyết định phiên bản nào nhìn thấy được.

## Snapshot trả lời câu hỏi “phiên bản này có nhìn thấy được không?”

Mỗi tuple heap có metadata transaction, tiêu biểu là `xmin` và `xmax`. `xmin` là XID tạo phiên bản; `xmax` thường là XID xóa/thay thế nó. Snapshot không phải bản sao toàn bộ bảng. Nó ghi ranh giới XID và tập transaction đang hoạt động tại lúc chụp để executor có thể tái dựng dữ liệu mà transaction đó được phép nhìn thấy.

### Cấu trúc snapshot: `xmin`, `xmax` và `xip_list`

Ở PostgreSQL 14, có thể xem snapshot bằng `pg_current_snapshot()`. Dạng hiển thị `xmin:xmax:xip_list` gồm:

- `xmin`: ranh giới dưới, thường là XID nhỏ nhất của transaction đang hoạt động.
- `xmax`: ranh giới trên loại trừ, bằng một đơn vị sau XID hoàn tất cao nhất tại thời điểm chụp. XID từ đây trở lên chưa hoàn tất lúc chụp (có thể còn chạy hoặc chưa được cấp) nên không visible.
- `xip_list`: các XID transaction cấp cao đang chạy trong khoảng hai ranh giới lúc chụp. Danh sách không bao gồm subtransaction XID; virtual XID không tham gia kiểm tra visibility row.

Để xét một phiên bản được tạo bởi XID `x`, trước hết transaction status phải cho biết insert đã commit; insert đã abort không visible. Nếu `x < xmin`, nó không còn transaction nào đang chạy tại thời điểm snapshot nên thay đổi đã commit của nó thuộc trạng thái đã quan sát. Nếu `xmin <= x < xmax`, thay đổi chỉ visible khi `x` không nằm trong `xip_list` và transaction đã commit. Nếu `x >= xmax`, transaction đó chưa hoàn tất tại thời điểm chụp (có thể đang chạy hoặc chưa tồn tại), nên snapshot không thấy thay đổi của nó. Khi xét `xmax` của phiên bản cũ, cũng phải hỏi transaction xóa đã commit trước snapshot chưa: nếu chưa, lần xóa chưa visible và phiên bản cũ còn có thể được đọc.

Commit timestamp không quyết định visibility. PostgreSQL giữ danh sách transaction đang chạy trong ProcArray shared memory; snapshot chụp danh sách ấy để còn biết ai đang active kể cả sau khi transaction đó hoàn tất. WAL có record commit/abort phục vụ recovery, nhưng không phải bảng lịch sử cho phép dựng tùy ý snapshot quá khứ. Vì vậy chỉ còn tuple cũ trên page không đủ để hỏi “database trông thế nào lúc 10:05?”; hệ thống không giữ đầy đủ trạng thái active tại mọi thời điểm như một temporal database.

### Trace: vì sao một snapshot chỉ thấy một phiên bản

Giả sử transaction `790` đang mở, transaction `791` đã insert Bob rồi commit. Một reader tạo snapshot hiển thị `790:792:790`: ranh giới dưới là `790`, ranh giới trên là `792`, còn `790` vẫn active. Sau khi snapshot đã được chụp, `790` commit; một transaction mới `792` cập nhật Bob từ 100 lên 200. Snapshot không đổi hồi tố:

| Tuple | `xmin` | `xmax` | Kết quả với snapshot `790:792:790` | Lý do |
| --- | ---: | ---: | --- | --- |
| Alice được insert bởi `790` | 790 | 0 | Không visible | `790` nằm trong `xip_list` lúc chụp, dù nó commit sau đó. |
| Bob phiên bản cũ | 791 | 792 | Visible | `791` đã commit và không ở `xip_list`; thao tác xóa bởi `792` nằm ngoài snapshot. |
| Bob phiên bản mới | 792 | 0 | Không visible | `792` bằng ranh giới trên, nên thay đổi bắt đầu sau snapshot. |

Snapshot này thấy Bob ở mức 100: nó loại Alice đang được tạo bởi transaction active, giữ phiên bản Bob cũ, và bỏ qua phiên bản Bob mới. Đây là lý do cần lưu `xip_list`, chứ chỉ ghi lại “thời điểm bắt đầu đọc” là chưa đủ.

### Lệnh trong cùng transaction và cursor

Transaction hiện tại có thể nhìn thấy write của chính nó trước khi commit, nhưng thứ tự lệnh vẫn quan trọng. Header tuple lưu `cmin` (command tạo) và `cmax` (command xóa); PostgreSQL thường gói chúng trong một command ID để tiết kiệm chỗ, và dùng ComboCID nếu cùng transaction vừa tạo vừa xóa một tuple. Snapshot còn có command counter nội bộ để không cho một câu query/cursor nhìn thấy thay đổi xảy ra sau ranh giới của chính câu đó.

Ví dụ, cursor được mở để đếm row rồi transaction insert thêm một row. Cursor tiếp tục dùng snapshot của lúc mở, nên lần `FETCH` sau không tự thêm row mới vào kết quả chỉ vì cùng transaction đã insert nó. Điều này không mâu thuẫn với việc một statement kế tiếp trong transaction có thể thấy write trước đó. `cmin`/`cmax` là chi tiết visibility để chẩn đoán, không phải timestamp hay thứ tự toàn cục giữa các transaction.

## UPDATE thường tạo phiên bản mới

Một update thông thường đánh dấu phiên bản cũ đã bị thay thế và ghi phiên bản mới. Reader đang dùng snapshot cũ còn có thể cần bản cũ, nên không thể xóa ngay. DELETE cũng đánh dấu tuple thay vì lập tức dọn bytes. Các phiên bản không còn cần cho bất kỳ snapshot hợp lệ nào sẽ được vacuum thu hồi để dùng lại không gian.

```sql
BEGIN;
UPDATE account SET balance = 130 WHERE id = 7;
-- Một reader có snapshot cũ vẫn có thể đọc phiên bản balance = 100.
COMMIT;
```

Đây là mô hình khái niệm; không nên dựa vào địa chỉ tuple hay chi tiết ghi page để viết ứng dụng. Khóa hàng vẫn được dùng để điều phối các writer xung đột, dù reader thông thường không khóa row theo kiểu chặn writer.

## Mức cô lập ảnh hưởng snapshot

Ở `READ COMMITTED`, mỗi statement thường nhận snapshot mới. Một transaction có thể thấy kết quả commit giữa hai câu SELECT của chính nó. Ở `REPEATABLE READ`, snapshot ổn định trong transaction; PostgreSQL triển khai mức này theo snapshot isolation, mạnh hơn yêu cầu SQL chuẩn ở một số điểm nhưng vẫn cho phép write skew ở một số lịch sử. `SERIALIZABLE` dùng Serializable Snapshot Isolation (SSI) để phát hiện cấu hình phụ thuộc nguy hiểm và có thể hủy một transaction; ứng dụng phải retry toàn bộ transaction bị serialization failure.

Isolation không thay thế invariant ở schema. Constraint unique, foreign key và check giúp bảo vệ quy tắc dữ liệu; tuy vậy logic nhiều bước vẫn cần hiểu transaction, khóa và retry. `SELECT ... FOR UPDATE` khóa row được chọn để phối hợp cập nhật; nó không biến mọi đọc thành serializable.

## HOT update và pruning

Nếu cập nhật không đổi column được index tham chiếu và page còn chỗ, PostgreSQL có thể thực hiện HOT (heap-only tuple) update: tuple mới ở cùng page, không cần thêm entry mới vào mọi index. Điều kiện này giúp giảm ghi index nhưng không phải lời hứa cho mọi update. Index thêm nhiều column có thể làm mất cơ hội HOT.

Pruning dọn các phiên bản chết ngay trong page khi có thể, còn vacuum xử lý rộng hơn và cập nhật visibility/free-space metadata. Một transaction lâu hoặc replication slot giữ horizon cũ có thể khiến phiên bản cũ còn cần thiết, làm bảng phình lên. Cơ chế vacuum/freeze được giải thích riêng trong bài [Vacuum, freezing và bảo trì](./postgresql-vacuum-freezing-and-maintenance).

## Virtual transaction, savepoint và lỗi

### Virtual XID tồn tại trong thời gian transaction chạy

Transaction cần một định danh để lock manager và các backend khác theo dõi nó ngay cả trước khi có XID thật. PostgreSQL cấp một **virtual transaction ID (VXID)** gồm process/backend ID và một sequence cục bộ. VXID được quản lý trong shared memory, không ghi vào tuple hay lưu trên disk; khi transaction kết thúc, nó biến mất và sequence có thể được dùng lại về sau.

Một transaction chỉ đọc thường chưa cần XID thật. Trong PostgreSQL 14, `pg_current_xact_id_if_assigned()` trả `NULL` cho tới khi transaction cần XID; khi bắt đầu ghi, nó nhận XID thật. Vì thế `pg_stat_activity` có thể cho thấy transaction đang active với virtual ID nhưng cột XID chưa được cấp. “Chưa có XID thật” không đồng nghĩa “không có snapshot”: một read-only transaction vẫn có snapshot và vẫn có thể giữ horizon trong lúc đọc.

### Savepoint tạo subtransaction

`SAVEPOINT` cho phép hủy một phần công việc mà vẫn tiếp tục transaction ngoài. PostgreSQL thực hiện điều này bằng **subtransaction** (transaction con), chứ không tạo một transaction độc lập có thể commit riêng. Mỗi subtransaction có XID riêng, thường lớn hơn XID của transaction cha; Quan hệ cha-con được lưu dưới `pg_subtrans` trong data directory và đọc/ghi qua các buffer SLRU trong shared memory. `pg_current_xact_id()` trả XID của transaction ngoài, không phải XID con. Trong PostgreSQL 14, status của subtransaction được ghi riêng; status record của child có thể mang cả bit committed và aborted, còn trạng thái cuối cùng được xác định theo parent. Nếu parent abort, thay đổi của mọi child cũng bị xem là abort.

Thử theo dõi ba lần ghi:

```sql
BEGIN;
INSERT INTO t(value) VALUES ('FOO');
SAVEPOINT sp;
INSERT INTO t(value) VALUES ('XYZ');
ROLLBACK TO SAVEPOINT sp;
INSERT INTO t(value) VALUES ('BAR');
COMMIT;
```

`ROLLBACK TO SAVEPOINT` vẫn giữ mốc `sp`; các lệnh tiếp theo có thể tiếp tục trong một subtransaction mới, còn `RELEASE SAVEPOINT` bỏ mốc nhưng giữ thay đổi phía sau nó. Kết quả logic sau commit là `FOO` và `BAR`; `XYZ` không visible vì subtransaction chứa nó đã bị rollback. Điều đó không có nghĩa bytes của `XYZ` bị xóa ngay khỏi heap page: tuple vật lý có thể còn nằm đó với trạng thái transaction khiến mọi snapshot bỏ qua nó, rồi pruning/VACUUM mới thu hồi slot khi an toàn. Đây là khác biệt giữa **rollback về mặt visibility** và **xóa bytes tức thì**. Subtransaction còn được dùng ngầm bởi savepoint, exception trong PL/pgSQL và một số tính năng khác; PostgreSQL không hỗ trợ `BEGIN` lồng nhau như autonomous transaction.

### Lỗi làm transaction bị aborted

Nếu một statement lỗi trong transaction block, PostgreSQL đánh dấu transaction đó aborted. Các command tiếp theo bị từ chối cho tới `ROLLBACK` hoặc rollback về savepoint gần nhất. Lý do là statement có thể đã ghi một phần tuple trước khi gặp lỗi; tiếp tục như thể statement không xảy ra sẽ phá tính atomic của statement và transaction. `COMMIT` khi transaction đã ở trạng thái lỗi kết thúc bằng rollback, không cứu các lệnh thành công trước đó khỏi việc rollback toàn transaction.

Ví dụ, một statement có thể cập nhật row đầu rồi mới gặp lỗi ở row sau:

```sql
BEGIN;
UPDATE t SET s = repeat('X', 1 / (id - 4)); -- gặp division by zero ở id = 4
SELECT * FROM t; -- bị từ chối: current transaction is aborted
COMMIT;           -- kết thúc bằng ROLLBACK
```

Không dựa vào thứ tự scan để biết row nào đã được xử lý trước lỗi. Điểm cần nhớ là toàn transaction đã vào trạng thái lỗi, nên không statement nào được phép tiếp tục đọc phần thay đổi dở dang.

`psql` có `ON_ERROR_ROLLBACK` để tự tạo savepoint trước mỗi command trong transaction; nếu command lỗi, client rollback về savepoint rồi cho phép gõ tiếp. Chế độ này tắt mặc định vì mỗi savepoint có overhead. Đây là tiện ích của `psql`, không phải PostgreSQL tự âm thầm giữ transaction tiếp tục sau mọi lỗi; ứng dụng dùng driver cần chủ động rollback transaction hoặc savepoint.
## Khi nào cần giữ lâu?

`xmin` của các snapshot đang dùng tạo nên **transaction horizon**. Horizon một mình chưa đủ: VACUUM còn phải xét trạng thái transaction. Tuple được tạo bởi transaction đã abort là dead; version bị thay thế/xóa chỉ được thu hồi khi thao tác đó đã commit và không snapshot active nào còn có thể nhìn thấy version cũ. `xmin` của tuple cũ tự nó không chứng minh tuple đã chết. PostgreSQL lấy horizon xa nhất (XID cũ nhất) trong các transaction liên quan. Khi horizon tiến lên, VACUUM có thể chứng minh thêm phiên bản không còn visible với reader nào và thu hồi chúng.

Một snapshot ở `REPEATABLE READ`/`SERIALIZABLE` thường được giữ tới cuối transaction. Một transaction có XID thật ở `READ COMMITTED` cũng có thể giữ horizon trong lúc đang `idle in transaction`, dù không chạy operator. Ngược lại, transaction chỉ có virtual XID ở `READ COMMITTED` thường giữ horizon khi operator đang chạy; virtual transaction không có snapshot active thì không cần giữ horizon, dù trường quan sát `backend_xmin` có thể còn phản ánh snapshot cũ trong một số tình huống của phiên bản sách. Đây là lý do phải phân biệt “connection đang mở”, “transaction đang mở”, “đã được cấp XID thật” và “đang giữ snapshot”.

Horizon cấp database là XID cũ nhất còn được transaction trong database bảo vệ. Nó ảnh hưởng tới mọi bảng thường trong database, kể cả bảng transaction đó chưa đọc. Catalog dùng horizon cấp cluster vì catalog chung phục vụ nhiều database; temporary table chỉ cần xét transaction của process sở hữu nó. Một cursor/snapshot/exported snapshot hoặc replication slot có thể kéo horizon dài và khiến dead tuples tích tụ.

Theo dõi `pg_stat_activity.backend_xmin`, tuổi transaction, trạng thái `idle in transaction`, replication slots, dead tuples và log autovacuum. Nếu vacuum không thu hồi được, trước hết tìm transaction/horizon đang giữ nó. Ép vacuum mạnh hay xóa file không giải quyết nguyên nhân và có thể gây downtime hoặc mất dữ liệu.

## Snapshot riêng cho system catalog

Catalog là các bảng PostgreSQL dùng để mô tả schema, cột, index và constraint, nhưng một truy vấn catalog không đơn giản dùng lại snapshot dữ liệu của câu lệnh ứng dụng. Nếu DDL vừa commit thêm constraint, thao tác tra catalog cần đủ mới để thấy định nghĩa đó; dùng snapshot cũ có thể làm server xử lý theo metadata lỗi thời. PostgreSQL vì vậy lấy catalog snapshot đủ fresh cho việc tra cứu. Có thể hình dung như mỗi catalog query có snapshot riêng, nhưng implementation còn cache catalog và snapshot để tránh chi phí tạo mới liên tục.

Điều này không có nghĩa transaction thường được phép đọc mọi thay đổi dữ liệu sau snapshot. Schema change có lock/đồng bộ riêng: nếu transaction khác đang giữ lock xung đột trên bảng, DDL phải chờ. Snapshot cho user rows và quy tắc làm mới catalog metadata phục vụ hai mục tiêu khác nhau.

## Chia sẻ cùng snapshot cho nhiều worker

Khi nhiều transaction phải đọc đúng cùng một trạng thái — ví dụ `pg_dump` chạy song song — khởi động “gần cùng lúc” không đảm bảo chúng lấy cùng snapshot. Transaction xuất snapshot tạo một định danh bằng `pg_export_snapshot()` và phải tiếp tục sống trong lúc worker import nó. Worker phải bắt đầu ở `REPEATABLE READ` hoặc `SERIALIZABLE` và gọi `SET TRANSACTION SNAPSHOT` trước query đầu tiên:

```sql
-- Worker xuất snapshot
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT count(*) FROM accounts; -- lấy snapshot cho transaction này
SELECT pg_export_snapshot();  -- giữ transaction mở khi worker khác import

-- Worker nhập snapshot, trước câu query đầu tiên
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET TRANSACTION SNAPSHOT '00000004-0000006E-14';
SELECT count(*) FROM accounts;
```

Hai worker cùng nhìn điểm xuất phát. Nếu worker xuất snapshot xóa row sau khi export, worker nhập vẫn nhìn theo snapshot đã chia sẻ; visibility thông thường vẫn áp dụng và token không làm thay đổi sau đó trở nên visible. Token hết hiệu lực khi transaction xuất snapshot kết thúc. Vì vậy worker phải import kịp trước khi exporter commit/rollback; đổi lại exporter giữ lâu có thể làm chậm horizon và VACUUM.

Sách *PostgreSQL Internals 14*, Part I, trình bày snapshot, transaction ID, tuple versions, catalog visibility, exported snapshots, HOT và pruning. Đối chiếu theo đúng release ở [transaction isolation PostgreSQL 14](https://www.postgresql.org/docs/14/transaction-iso.html), [snapshot info](https://www.postgresql.org/docs/14/functions-info.html#FUNCTIONS-PG-SNAPSHOT), [snapshot synchronization/export](https://www.postgresql.org/docs/14/functions-admin.html#FUNCTIONS-SNAPSHOT-SYNCHRONIZATION), [routine vacuuming](https://www.postgresql.org/docs/14/routine-vacuuming.html) và [heap-only tuples](https://www.postgresql.org/docs/14/storage-hot.html), [SAVEPOINT](https://www.postgresql.org/docs/14/sql-savepoint.html), [ROLLBACK TO SAVEPOINT](https://www.postgresql.org/docs/14/sql-rollback-to.html), and [psql error rollback](https://www.postgresql.org/docs/14/app-psql.html#APP-PSQL-ERROR-ROLLBACK).

## Tự kiểm tra

**`790:792:790` nói snapshot đã ghi nhớ điều gì?** XID `790` vẫn active khi snapshot chụp; `792` là ranh giới trên chưa hoàn tất; các transaction trong `xip_list` không được coi là đã commit tại thời điểm đó.

**Nếu XID đang nằm trong `xip_list` commit sau khi snapshot được tạo, snapshot cũ có nhìn thấy thay đổi không?** Không. Trạng thái active được chụp lại, không thay đổi hồi tố.

**Vì sao transaction lâu có thể làm VACUUM giữ tuple cũ ở bảng nó chưa đọc?** Vì horizon là ranh giới cấp database, không chỉ áp dụng lên các row transaction đó đã truy vấn.

**Vì sao reader có thể thấy 100 sau khi writer đã ghi 130?** Snapshot của reader được tạo trước commit writer, nên phiên bản cũ vẫn là phiên bản hợp lệ đối với nó.

**UPDATE xong có thể xóa tuple cũ ngay không?** Không nếu snapshot còn có thể cần tuple đó; dọn dẹp phải chờ đến khi an toàn.

**`REPEATABLE READ` bảo đảm mọi invariant nghiệp vụ?** Không. Snapshot ổn định không tự bảo vệ mọi quy tắc liên hàng; dùng constraint, locking hoặc SERIALIZABLE phù hợp và xử lý retry.

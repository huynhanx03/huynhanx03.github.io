---
title: "Transaction, lock và MVCC của InnoDB"
category: "Database"
description: "Theo dõi autocommit, consistent read, undo/redo, row lock và deadlock trong một transaction MySQL."
updated: 2026-10-18
translationKey: "database/mysql-transactions-locking-and-innodb-mvcc"
---

InnoDB phải cho nhiều transaction đọc và ghi cùng lúc mà vẫn bảo vệ dữ liệu. Nó kết hợp MVCC cho consistent read với lock cho thao tác ghi/xung đột. Hiểu hai cơ chế riêng giúp giải thích vì sao SELECT thường không chặn UPDATE, nhưng một SELECT ... FOR UPDATE có thể tạo lock wait.

## Ranh giới transaction và autocommit

MySQL thường bật autocommit: mỗi statement thành công là một transaction độc lập nếu không mở transaction tường minh. `START TRANSACTION` gom nhiều statement đến `COMMIT`/`ROLLBACK`. Một transaction giữ lock đến khi hoàn tất; vì vậy mở transaction rồi chờ user/network có thể làm lock và row version tồn tại lâu.

DDL có implicit commit ở nhiều trường hợp; không giả định có thể rollback mọi migration như DML. Một session khác có isolation/config riêng, nên kiểm tra session variables và trạng thái transaction của connection pool. Khi dùng connection pool, trả connection về pool lúc còn transaction mở là lỗi nghiêm trọng.

## MVCC và undo log

InnoDB lưu thông tin transaction/version để consistent read có thể dựng bản cũ từ undo records. Writer thay đổi record mới; reader tạo read view quyết định transaction nào đã commit và version nào visible. Undo phục vụ rollback và đọc phiên bản trước; purge dọn undo không còn cần sau khi snapshot lâu nhất đi qua.

Ví dụ, T1 mở consistent snapshot rồi đọc balance=100; T2 cập nhật lên 130 và commit. T1 có thể đọc lại 100 theo snapshot, còn transaction mới đọc 130. Ở `READ COMMITTED`, mỗi consistent read thường lấy snapshot mới; ở `REPEATABLE READ`, snapshot consistent read ổn định hơn trong transaction. Locking read có quy tắc khác consistent read và có thể đợi writer.

### Hai loại SELECT có thể nhìn hai phiên bản khác nhau

Giả sử row `account(id=7)` đang có `balance=100`, isolation là `REPEATABLE READ`:

| Thời điểm | Session T1 | Session T2 |
| --- | --- | --- |
| 1 | `START TRANSACTION;` | |
| 2 | `SELECT balance FROM account WHERE id=7;` → `100`; read view của T1 được tạo | |
| 3 | | `UPDATE account SET balance=130 WHERE id=7; COMMIT;` |
| 4 | Cùng câu `SELECT` thường đọc consistent snapshot → `100` | |
| 5 | `SELECT balance FROM account WHERE id=7 FOR UPDATE;` là locking read, cần trạng thái hiện tại để khóa và có thể trả `130` | |

Vì vậy, đừng trộn consistent read và locking read rồi giả định chúng luôn dùng cùng một snapshot. Nếu ứng dụng cần “đọc số dư rồi quyết định ghi”, hãy dùng locking read trong transaction ngắn hoặc cập nhật có điều kiện như `UPDATE ... WHERE balance >= amount`, rồi kiểm tra số row bị ảnh hưởng. Cách sau thường gói kiểm tra và thay đổi thành một statement; quy tắc nghiệp vụ phức tạp vẫn có thể cần transaction và lock rõ ràng. Luôn xác định isolation, thời điểm read view được tạo và loại câu SELECT trước khi giải thích kết quả.

## Row lock, gap/next-key và isolation

InnoDB row locks gắn với index record mà query truy cập. Nếu không có index phù hợp, scan nhiều record có thể khóa/kiểm tra nhiều hơn dự kiến. Với range predicate, `REPEATABLE READ` có thể dùng next-key lock (record cộng khoảng gap) để ngăn phantom insert theo điều kiện; chi tiết phụ thuộc query plan và isolation. Gap lock không đơn giản là “khóa row chưa tồn tại”.

`SELECT ... FOR UPDATE` phù hợp khi đọc rồi cập nhật cùng record; `FOR SHARE` cần semantics đọc có khóa. Đặt điều kiện và index chính xác để phạm vi khóa nhỏ. Đừng giữ lock trong lúc gọi API ngoài.

### Index quyết định những khoảng nào bị khóa

Giả sử `account.id` là primary key và bảng có các ID `10` và `20`. Trong transaction `REPEATABLE READ`, truy vấn khóa theo khoảng có thể phải bảo vệ cả khoảng index đã quét, không chỉ hai row trả về:

```sql
-- Session T1
START TRANSACTION;
SELECT * FROM account WHERE id BETWEEN 10 AND 20 FOR UPDATE;

-- Session T2: có thể phải chờ T1
INSERT INTO account (id, balance) VALUES (15, 500);
```

`id=15` chưa tồn tại, nhưng nó nằm giữa hai key trong vùng range. InnoDB dùng next-key lock (record cộng gap phía trước) để ngăn insert tạo phantom trong vùng đã khóa. Nếu T1 tìm một hàng bằng unique key đầy đủ, thường chỉ cần khóa record đã tìm thấy; nếu dùng non-unique/range predicate, lock có thể bao phủ các index record mà execution plan đã scan, kể cả record sau đó bị loại bởi điều kiện còn lại. Vì vậy `WHERE` hẹp trên giấy không đảm bảo lock hẹp: kiểm tra index và plan, rồi quan sát `data_locks`.

Ở `READ COMMITTED`, InnoDB thường tắt gap locking cho search/index scan thông thường, nên phantom có thể xuất hiện; gap lock vẫn được dùng cho kiểm tra foreign key và duplicate key. Chọn isolation theo invariant cần bảo vệ, không chỉ để giảm lock wait. Thay đổi index cũng có thể thay đổi vùng scan và lock footprint dù SQL không đổi.

## Redo, commit và crash recovery

Redo log ghi đủ thay đổi để InnoDB phát lại; dirty data page có thể flush sau. Commit durability phụ thuộc redo flush policy, binary log coordination và storage flush semantics. `innodb_flush_log_at_trx_commit` cùng `sync_binlog` thay đổi tradeoff; giá trị yếu hơn có thể mất giao dịch vừa acknowledged khi crash/power loss. Kiểm tra cả OS/storage cache.

Undo và redo có vai trò khác nhau: undo hỗ trợ rollback/old versions, redo phục hồi thay đổi đã log. Khi update, buffer pool giữ page trong memory; background flush/checkpoint giới hạn recovery work. Không copy nóng file data thay backup được.

## Deadlock và hỗn hợp storage engine

Deadlock xảy ra khi transaction giữ lock chéo. InnoDB phát hiện và rollback một victim; ứng dụng cần retry toàn transaction khi lỗi deadlock, dùng consistent lock order và giữ transaction ngắn. Lock wait timeout thường không có nghĩa transaction toàn phần tự rollback như deadlock; xử lý rollback rõ ràng theo policy.

### Truy vết deadlock bằng hai account

Giả sử hai session chuyển tiền giữa account 1 và 2, nhưng lấy lock theo thứ tự ngược nhau:

Đoạn dưới là **lịch hai session** để đọc theo từng hàng, không phải một script chạy trong cùng connection. Hai transaction đã cập nhật row riêng trước khi yêu cầu row còn lại:

```sql
-- T1                           -- T2
START TRANSACTION;              START TRANSACTION;
UPDATE account                  UPDATE account
SET balance = balance - 10      SET balance = balance - 20
WHERE id = 1;                   WHERE id = 2;
-- T1 giữ row 1                 -- T2 giữ row 2

UPDATE account                  UPDATE account
SET balance = balance + 10      SET balance = balance + 20
WHERE id = 2;                   WHERE id = 1;
-- T1 chờ T2                    -- T2 cần row 1 do T1 giữ
```

Sau hai câu cuối, cạnh chờ là `T1 → T2` (T1 cần row 2) và `T2 → T1` (T2 cần row 1), tạo chu trình. InnoDB chọn một victim để phá chu trình; transaction còn lại có thể tiếp tục sau khi lock được giải phóng. Ứng dụng không nên tiếp tục từ giữa transaction đã lỗi: rollback/retry **toàn bộ thao tác chuyển tiền** với cùng invariant, giới hạn số lần retry và backoff có jitter. Nếu mọi code path khóa `id` tăng dần (1 rồi 2), thứ tự nhất quán loại bỏ chu trình dạng này, dù deadlock vẫn có thể đến từ index/foreign-key lock hoặc đường code khác.

Một deadlock khác với lock wait timeout: timeout cho biết một request đã chờ quá lâu, nhưng có thể không tồn tại chu trình. Trong MySQL, khi phát hiện deadlock, InnoDB rollback victim; khi timeout, mặc định thường chỉ rollback statement gây timeout, trừ khi cấu hình `innodb_rollback_on_timeout` yêu cầu rollback cả transaction. Ứng dụng cần chủ động đưa transaction về trạng thái xác định trước khi tái sử dụng connection.

Transaction chạm bảng InnoDB và MyISAM không có một rollback atomic thống nhất vì MyISAM không transactional. Giữ engine transactional cho dữ liệu cần invariant cùng nhau.

## Cách điều tra

Dùng `performance_schema.data_locks`, `data_lock_waits`, `SHOW ENGINE INNODB STATUS`, process list và slow query evidence để tìm blocker. Đọc transaction age, SQL, index, lock mode và wait graph. Không chỉ tăng timeout; tìm query/transaction tạo phạm vi khóa lớn.

*High Performance MySQL*, ch. 1, giải thích kiến trúc, transaction, MVCC và lock; current behavior: [InnoDB transaction model](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html), [consistent reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html), [locking reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html), [locks set by statements](https://dev.mysql.com/doc/refman/8.4/en/innodb-locks-set.html), [gap and next-key locks](https://dev.mysql.com/doc/refman/8.4/en/innodb-next-key-locking.html), [deadlocks](https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlocks.html), and [InnoDB parameters](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html).

## Tự kiểm tra

**MVCC có nghĩa writer không cần lock?** Không; MVCC hỗ trợ versioned reads, còn writer xung đột vẫn cần lock.

**Vì sao thiếu index có thể làm lock wait rộng hơn?** Scan phải xem nhiều index record/row để tìm kết quả và có thể đặt lock trên phạm vi lớn hơn.

**Deadlock có nên retry một statement riêng?** Thường retry toàn bộ transaction để logic được thực hiện trên state nhất quán.

---
title: "Lock mode PostgreSQL và đọc deadlock graph"
category: "Database"
description: "So sánh relation/row lock modes, multitransaction, wait queue và cách phân tích hai lịch sử deadlock thường gặp."
updated: 2026-10-17
translationKey: "database/postgresql-lock-modes-and-deadlock-examples"
---

PostgreSQL có lock manager cho lock transaction/object và cơ chế khác cho latch trên memory. Một câu `UPDATE` thường có relation lock `ROW EXCLUSIVE` cộng row lock trên tuple; hai lớp này bảo vệ hai điều khác nhau. Khi DDL chờ, xem relation lock; khi hai writer chờ cùng row, xem tuple lock/wait transaction.

## Relation lock modes

Các mode phổ biến gồm `ACCESS SHARE` (SELECT), `ROW SHARE` (locking SELECT), `ROW EXCLUSIVE` (INSERT/UPDATE/DELETE), `SHARE UPDATE EXCLUSIVE` (một số maintenance), `SHARE`, `SHARE ROW EXCLUSIVE`, `EXCLUSIVE`, `ACCESS EXCLUSIVE` (nhiều DDL). Ma trận tương thích xác định mode nào xung đột; một mode tên “ROW EXCLUSIVE” là relation-level, không phải khóa từng row.

Lock thường được giữ đến transaction end, kể cả statement đã xong. `LOCK TABLE` có thể xin mode rõ; DDL như `ALTER TABLE` thường cần mode mạnh. Một transaction dài có thể giữ `ACCESS SHARE` và chặn DDL đang đợi `ACCESS EXCLUSIVE`; sau khi DDL đứng đầu queue, request mới cũng có thể phải xếp sau, tạo cảm giác SELECT bị treo.

### Tra xung đột relation lock

Bảng dưới đây dùng `X` khi mode ở hàng (request mới) xung đột với mode đang giữ ở cột. Ô trống nghĩa là hai transaction có thể giữ chúng đồng thời trên cùng relation. Tên có chữ `ROW` vẫn là **table/relation lock**, không phải row lock.

| Request ↓ / Đang giữ → | AS | RS | RX | SUE | S | SRE | E | AE |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ACCESS SHARE (AS) |  |  |  |  |  |  |  | X |
| ROW SHARE (RS) |  |  |  |  |  |  | X | X |
| ROW EXCLUSIVE (RX) |  |  |  |  | X | X | X | X |
| SHARE UPDATE EXCLUSIVE (SUE) |  |  |  | X | X | X | X | X |
| SHARE (S) |  |  | X | X |  | X | X | X |
| SHARE ROW EXCLUSIVE (SRE) |  |  | X | X | X | X | X | X |
| EXCLUSIVE (E) |  | X | X | X | X | X | X | X |
| ACCESS EXCLUSIVE (AE) | X | X | X | X | X | X | X | X |

Một vài cách đọc giúp nhớ hậu quả thay vì thuộc cả bảng:

- `SELECT` lấy `ACCESS SHARE`, nên chỉ bị `ACCESS EXCLUSIVE` chặn.
- `INSERT`/`UPDATE`/`DELETE` lấy `ROW EXCLUSIVE`; chúng cùng chạy được với nhau, nhưng xung đột với `SHARE` của `CREATE INDEX` thường. `CREATE INDEX CONCURRENTLY` dùng `SHARE UPDATE EXCLUSIVE`, cho phép DML thường tiếp tục nhưng không cho một số thao tác bảo trì khác chạy đồng thời.
- `ACCESS EXCLUSIVE` xung đột với mọi mode; `TRUNCATE`, `DROP TABLE` và nhiều DDL cần mode này.

Một hàng đợi mạnh cũng ảnh hưởng request tương thích: nếu `ACCESS EXCLUSIVE` đang chờ trước, SELECT mới có thể đứng sau nó để không làm DDL chờ vô hạn.

## Row locks và multitransactions

Row lock modes biểu diễn mức xung đột: `FOR KEY SHARE`, `FOR SHARE`, `FOR NO KEY UPDATE`, `FOR UPDATE`. Ví dụ update non-key column thường xung đột ít hơn thay primary/unique key. PostgreSQL có thể lưu locker transaction ID trong tuple; waiter chờ transaction kết thúc thay vì một lock object riêng cho mọi tuple.

Nhiều transaction cùng lock một row dùng multitransaction (MultiXact). Table lớn có thể chịu pressure từ MultiXact ID wraparound tương tự XID; vacuum/freeze và monitor tuổi MultiXact là một phần vận hành.

### Ma trận tương thích row lock

| Request ↓ / Đang giữ → | KEY SHARE | SHARE | NO KEY UPDATE | UPDATE |
| --- | --- | --- | --- | --- |
| KEY SHARE |  |  |  | X |
| SHARE |  |  | X | X |
| NO KEY UPDATE |  | X | X | X |
| UPDATE | X | X | X | X |

`UPDATE` là mode mạnh nhất. `NO KEY UPDATE` vẫn tương thích với `KEY SHARE`, nên foreign-key check có thể giữ tham chiếu trong lúc transaction khác đổi cột không phải key. Mode yếu hơn tăng concurrency, nhưng chỉ đúng khi thao tác thật sự không sửa key được dùng bởi unique index/foreign key.

### Vì sao hàng đợi row lock phức tạp?

Thông tin row lock nằm trong `xmax` của tuple, nên riêng tuple không chứa một danh sách waiter. PostgreSQL 14 kết hợp tuple state với heavyweight tuple lock và transaction-ID lock để xếp người chờ:

1. T1 đang giữ `FOR NO KEY UPDATE` trên một row.
2. T2 muốn `UPDATE` cùng row: T2 lấy heavyweight tuple lock làm chỗ xếp hàng rồi chờ XID của T1.
3. T3 và T4 cũng muốn sửa row: họ xếp sau T2 trên tuple lock.
4. T1 commit; T2 tiếp tục và tạo phiên bản row mới. Ở `READ COMMITTED`, T3/T4 đọc lại phiên bản rồi kiểm tra điều kiện. Các waiter có thể chuyển sang chờ XID của T2; từ đây hàng đợi ban đầu không còn là FIFO tuyệt đối và những waiter có thể đua nhau khi T2 kết thúc.

Ở `REPEATABLE READ`/`SERIALIZABLE`, thay đổi row sau snapshot có thể làm transaction chờ nhận serialization failure. Ứng dụng phải retry toàn transaction. Đây là chi tiết implementation của PostgreSQL 14; đừng suy ra rằng một tuple lock tạo fairness tuyệt đối cho mọi mức isolation.

### Request tương thích có thể đi trước

Mode tương thích có thể được cấp dù một waiter mạnh hơn đang chờ. Ví dụ T1 giữ `FOR KEY SHARE`, T2 xin `FOR UPDATE` nên phải chờ, nhưng T3 cũng xin `FOR KEY SHARE` và tương thích với T1. Request của T3 có thể được cấp trước T2. Nếu nhiều request nhẹ tiếp tục đến, writer có thể chờ rất lâu. Đây là starvation theo mode, khác deadlock: không có chu trình chờ để detector hủy.

Ma trận hai tầng giúp PostgreSQL giảm tranh chấp và xếp nhiều waiter, nhưng không đảm bảo fairness tuyệt đối khi mode tương thích liên tục đi trước. Với row nóng, giảm thời gian transaction, tránh giữ lock trong lúc gọi service ngoài, và theo dõi tuổi waiter/blocker. Queue ở application hoặc một writer được điều phối có thể hữu ích nếu workload liên tục tranh cùng một row; `NOWAIT`/timeout chỉ giới hạn thời gian chờ chứ không làm tăng thông lượng của row đó.

## Deadlock qua hai update

T1 update row A rồi B; T2 update B rồi A. Sau mỗi bước, T1 giữ A chờ B, T2 giữ B chờ A. PostgreSQL phát hiện chu trình và abort một transaction sau `deadlock_timeout`. Sắp xếp lock theo cùng thứ tự ID làm một lịch sử chờ tuần tự, không thành cycle.

Deadlock cũng có thể xảy ra giữa relation locks, foreign key checks, advisory locks hoặc nhiều index/table. Log deadlock mô tả process, SQL và lock type. Retry victim toàn transaction; nếu retry không giới hạn, overload lại tăng.

### Tự tạo lịch sử deadlock bằng hai session

Chuẩn bị hai hàng trong bảng tài khoản:

```sql
CREATE TABLE accounts (id integer PRIMARY KEY, balance integer NOT NULL);
INSERT INTO accounts VALUES (1, 1000), (2, 1000);
```

Mở hai session. Chạy từng bước theo thứ tự dưới đây; dừng tại các điểm chờ để chuyển sang session còn lại:

| Bước | Session A | Session B |
| --- | --- | --- |
| 1 | `BEGIN;` |  |
| 2 | `UPDATE accounts SET balance = balance - 100 WHERE id = 1;` |  |
| 3 |  | `BEGIN;` |
| 4 |  | `UPDATE accounts SET balance = balance - 100 WHERE id = 2;` |
| 5 | `UPDATE accounts SET balance = balance + 100 WHERE id = 2;` — chờ B |  |
| 6 |  | `UPDATE accounts SET balance = balance + 100 WHERE id = 1;` — chờ A; PostgreSQL phát hiện cycle |

Sau bước 4, A giữ row 1 và B giữ row 2. Ở bước 5, A đợi row 2 do B giữ. Bước 6 tạo cạnh chờ ngược lại: B đợi row 1 do A giữ. Vòng `A → B → A` không thể tự tiến triển, nên deadlock detector chọn một transaction làm victim; session đó nhận lỗi và transaction cần `ROLLBACK`. Transaction còn lại tiếp tục sau khi victim nhả lock. Không dựa vào giả định session nào luôn bị chọn.

Nếu cả hai chuyển khoản theo cùng thứ tự ID, chẳng hạn luôn lock tài khoản nhỏ hơn trước, một transaction sẽ đợi transaction kia nhưng không tạo chu trình. Thứ tự nhất quán giảm deadlock; nó không loại bỏ mọi deadlock có thể phát sinh từ các lock khác trong cùng transaction.


## Hai câu lệnh UPDATE có thể khóa row khác thứ tự

Một câu `UPDATE` không khóa trước toàn bộ row rồi mới sửa; executor tìm và cập nhật row từng bước. Hai lệnh cập nhật nhiều row có thể vì thế deadlock nếu plan của chúng đi qua row theo thứ tự khác nhau. Ví dụ một lệnh dùng sequential scan đi theo thứ tự heap, còn lệnh kia dùng index scan trên index giảm dần. Lệnh thứ nhất khóa row đầu rồi row kế; lệnh thứ hai khóa row cuối rồi đi ngược. Khi mỗi bên cần row đã bị bên kia giữ, wait-for graph tạo chu trình dù mỗi SQL statement trông như một thao tác đơn.

Sách dựng lại lịch sử bằng bảng ba row, một hàm `pg_sleep` làm chậm phép tính và `pgrowlocks` để quan sát row owner. Kết quả cụ thể phụ thuộc plan, thứ tự vật lý, index và timing — planner không cam kết thứ tự khóa ổn định chỉ vì query có cùng văn bản. Bài học không phải ép `enable_seqscan` trong production, mà là không giả định UPDATE hàng loạt tự có thứ tự khóa toàn cục. Nếu nhiều transaction sửa cùng nhóm row, hãy khóa trước theo một thứ tự khóa chuẩn (thường key tăng dần), chia batch có kiểm soát, giữ transaction ngắn và vẫn retry toàn transaction khi deadlock xảy ra.

## Wait queue, NOWAIT và SKIP LOCKED

Waiter xếp hàng và lock manager phải tránh starvation/không tương thích phía trước. `NOWAIT` trả lỗi ngay khi lock không lấy được; `SKIP LOCKED` bỏ row đang bị lock, hữu ích queue worker nhưng kết quả không phải snapshot đầy đủ. Không dùng SKIP LOCKED cho báo cáo cần mọi row.

Advisory locks tự tạo namespace 64-bit/int key; chúng không liên quan tự động đến table/row lock. Predicate SIREAD của SSI cũng không phải blocking row lock. Spinlock/LWLock bảo vệ shared memory và thường hiện qua wait events khác.

## Chẩn đoán

Join `pg_locks` với `pg_stat_activity` và `pg_blocking_pids()`, nhóm theo blocking tree. Xem transaction age, query start, wait event, lock mode và application name. Query PID blocker có thể đang `idle in transaction`; không thấy SQL active không có nghĩa không giữ lock. Trước khi cancel/terminate, biết rollback scope và client retry behavior.

Truy vấn sau ghép mỗi backend đang bị block với các blocker trực tiếp. `blocked_for` đo thời gian query hiện tại đã chạy; `blocker_xact_age` cho biết transaction giữ lock đã mở bao lâu:

```sql
SELECT blocked.pid AS blocked_pid,
       blocked.application_name AS blocked_app,
       now() - blocked.query_start AS blocked_for,
       blocked.wait_event_type,
       blocked.wait_event,
       blocker.pid AS blocker_pid,
       blocker.application_name AS blocker_app,
       blocker.state AS blocker_state,
       now() - blocker.xact_start AS blocker_xact_age,
       blocked.query AS blocked_query,
       blocker.query AS blocker_query
FROM pg_stat_activity AS blocked
CROSS JOIN LATERAL unnest(pg_blocking_pids(blocked.pid)) AS p(blocker_pid)
JOIN pg_stat_activity AS blocker ON blocker.pid = p.blocker_pid
ORDER BY blocker.xact_start NULLS LAST;
```

Nếu blocker đang `idle in transaction`, đọc `blocker_query` như câu lệnh gần nhất của session chứ không phải câu đang hoạt động. Một dòng cho biết quan hệ chờ trực tiếp; muốn hiểu cả chuỗi thì lần tiếp từ mỗi blocker có PID cũng đang chờ. Đừng kết luận transaction nào nên hủy chỉ từ thời lượng: kiểm tra chủ sở hữu workload và tác động rollback trước.

*PostgreSQL Internals 14*, Part III, mô tả heavyweight, row, multitransaction, advisory/predicate, spin/LWLock và wait sampling. Đối chiếu ma trận với [explicit locking PostgreSQL 14](https://www.postgresql.org/docs/14/explicit-locking.html); xem [explicit locking hiện hành](https://www.postgresql.org/docs/current/explicit-locking.html), [lock monitoring](https://www.postgresql.org/docs/current/monitoring-locks.html) và [pg_locks](https://www.postgresql.org/docs/current/view-pg-locks.html).

## Tự kiểm tra

**`ROW EXCLUSIVE` có phải row lock?** Không; đó là relation-level mode.

**`SKIP LOCKED` có bảo đảm lấy mọi row?** Không; row đang bị lock sẽ bị bỏ qua.

**Vì sao consistent lock order giảm deadlock?** Nó loại bỏ chu trình chờ kiểu A→B và B→A.

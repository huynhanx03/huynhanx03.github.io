---
title: "Lock, concurrency và chẩn đoán chờ trong PostgreSQL"
category: "Database"
description: "Phân biệt table lock, row lock, predicate lock và các khóa nội bộ; lần theo blocking và deadlock."
updated: 2026-10-18
translationKey: "database/postgresql-locks-and-concurrency"
---

MVCC cho phép nhiều reader tiếp tục đọc snapshot trong khi writer tạo phiên bản mới, nhưng không loại bỏ mọi xung đột. Hai writer sửa cùng một row vẫn phải phối hợp; DDL có thể chờ transaction đang dùng table; executor và buffer manager cần khóa nội bộ để bảo vệ cấu trúc dùng chung. Tìm đúng loại lock giúp phân biệt “query chậm” với “query đang chờ”.

## Table lock và row lock

Mỗi lệnh SQL lấy một table-level lock mode; các mode có ma trận tương thích. `SELECT` thường lấy `ACCESS SHARE`, còn nhiều thao tác DDL lấy mode xung đột mạnh hơn. Table lock thường không khóa mọi row; nó bảo vệ quan hệ ở mức operation và được giữ đến hết transaction.

`UPDATE`, `DELETE`, `SELECT ... FOR UPDATE/SHARE` có thể lấy row-level lock. Row lock chặn writer/locker xung đột, nhưng ordinary SELECT dùng MVCC thường tiếp tục đọc phiên bản phù hợp. Một thao tác update còn lấy table lock tương ứng. `FOR UPDATE` phù hợp khi transaction đọc rồi sửa row và phải ngăn writer cạnh tranh; giữ khóa ngắn để giảm hàng đợi.

Advisory lock là khóa do ứng dụng định nghĩa, có thể dùng khóa session hoặc transaction. PostgreSQL không tự áp đặt ý nghĩa business cho key; mọi client liên quan phải cùng quy ước. Tránh dùng advisory lock thay constraint nếu invariant có thể biểu diễn bằng unique/foreign key.

## Predicate lock và SERIALIZABLE

Ở `SERIALIZABLE`, SSI theo dõi quan hệ đọc/ghi có thể tạo lịch sử không serializable. Predicate/SIREAD lock là dấu vết đọc để phát hiện xung đột; chúng không nhất thiết chặn writer ngay như row lock. PostgreSQL có thể hủy một transaction để giữ tính đúng đắn. Ứng dụng cần retry transaction khi nhận serialization failure và bảo đảm side effect ngoài database không bị lặp an toàn.

## Deadlock và thứ tự khóa

Deadlock xảy ra khi T1 giữ A và chờ B, còn T2 giữ B và chờ A. PostgreSQL phát hiện chu trình sau thời gian chờ và hủy một bên. Giữ thứ tự truy cập row/table nhất quán, transaction ngắn, và retry lỗi deadlock giúp giảm tác động. Tăng `deadlock_timeout` chỉ đổi thời điểm kiểm tra/chi phí log, không sửa chu trình.

```text
T1: lock account 1 ── waits for account 2
T2: lock account 2 ── waits for account 1
                         ↑ cycle → abort one transaction
```

## Khóa nội bộ khác row lock

Spinlock, lightweight lock (LWLock), buffer pin và predicate lock phục vụ cấu trúc nội bộ hoặc snapshot tracking. Một backend chờ LWLock không đồng nghĩa một transaction khác đang giữ row cần sửa. Dùng wait event và stack/monitoring để chẩn đoán trước khi thay query. Không can thiệp trực tiếp vào shared memory.

## Tìm ai đang chờ

Kết hợp `pg_stat_activity`, `pg_locks`, `pg_blocking_pids(pid)`, `wait_event_type`, `wait_event`, `query_start` và transaction age. Log lock wait/deadlock đủ context. Một session `idle in transaction` có thể giữ lock hoặc snapshot dù hiện không chạy câu SQL. Trước khi terminate backend, xác định chủ sở hữu, tác động rollback và request đang chờ; terminate có thể gây rollback lớn nhưng đôi lúc là cách khôi phục có kiểm soát.

Sách *PostgreSQL Internals 14*, Part III, trình bày lock modes, wait queues, multitransaction và LWLock. Bảng mode khớp [explicit locking PostgreSQL 14](https://www.postgresql.org/docs/14/explicit-locking.html); chẩn đoán hiện hành xem [explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html), [monitoring locks](https://www.postgresql.org/docs/current/monitoring-locks.html), [SSI](https://www.postgresql.org/docs/current/transaction-iso.html#XACT-SERIALIZABLE) và [system statistics](https://www.postgresql.org/docs/current/monitoring-stats.html), and [PostgreSQL 14 lock-management settings](https://www.postgresql.org/docs/14/runtime-config-locks.html).


## Cơ chế sâu từ Parts III: khóa đối tượng và khóa bộ nhớ


### Lock bảo vệ tài nguyên nào và sống bao lâu?

Lock có thể bảo vệ object nghiệp vụ như relation, page, tuple hoặc tài nguyên trừu tượng do ứng dụng đặt tên; lock nội bộ có thể bảo vệ hash table, buffer hay cấu trúc shared memory. Khi tài nguyên phân cấp từ table → page → tuple, lock thô ở cấp table dễ quản lý nhưng hạn chế concurrency; lock mịn cho phép nhiều thao tác độc lập hơn nhưng tốn metadata và đồng bộ hơn. PostgreSQL dùng nhiều cơ chế thay vì áp một loại lock cho mọi phạm vi.

Heavyweight lock thường sống đến hết transaction, có nhiều mode, queue, deadlock detection và hiển thị trong `pg_locks`. Lock ngắn như LWLock/spinlock thường bảo vệ vùng shared memory trong thời gian rất ngắn và không nhất thiết được biểu diễn như một lock nghiệp vụ trong `pg_locks`. Không thấy một row lock trong view không chứng minh không có chờ; waiter có thể đang đợi transaction ID của owner.

Trong PostgreSQL 14, `max_locks_per_transaction` là sizing input cho shared lock table; dung lượng pool liên quan đến giá trị này nhân với `max_connections`, và không phải giới hạn cứng rằng một transaction riêng lẻ chỉ được lấy đúng từng ấy lock. Các transaction dùng chung pool, nên tổng nhu cầu đồng thời mới quan trọng. Thay sizing setting cần restart. Tăng chúng khi chưa có bằng chứng có thể làm tăng shared-memory footprint mà không xử lý blocker hoặc contention.

Mỗi transaction giữ exclusive lock trên virtual transaction ID của chính nó; khi có XID thật, lock tương ứng cũng xuất hiện. Process khác có thể yêu cầu shared lock trên transaction ID để đợi transaction commit/abort. Trong `pg_locks`, đọc `locktype`, resource ID, `mode` và `granted` cùng nhau: lock chưa được cấp (`granted=false`) là request đang chờ; một transactionid lock có thể giải thích tại sao waiter đang chờ dù tuple không hiện thành một row trong view.

### Lock relation và hàng đợi heavyweight

Relation lock bảo vệ thao tác trên table, index và một số object khác; PostgreSQL giữ lock lâu thường đến hết transaction. Các mode khác nhau không chỉ biểu thị “đọc” và “ghi”: ví dụ `ACCESS SHARE` của SELECT tương thích với phần lớn thao tác nhưng xung đột với `ACCESS EXCLUSIVE`; `ROW EXCLUSIVE` của INSERT/UPDATE/DELETE không chặn SELECT thông thường; `SHARE UPDATE EXCLUSIVE` được VACUUM dùng để cùng tồn tại với truy vấn và DML thường nhưng loại trừ một số maintenance khác. Để hiểu DDL bị chặn, xem cả lock đang giữ lẫn lock mạnh đang chờ phía trước.

Heavyweight lock được quản lý trong shared memory và xuất hiện trong `pg_locks`. Một backend có thể giữ nhiều lock; `max_locks_per_transaction` là sizing input cho shared lock table, không phải giới hạn số row lock trong transaction. Khi transaction cần chờ transaction khác, PostgreSQL có thể giữ lock trên transaction ID/virtual transaction ID. Vì vậy `pg_locks` có dòng `transactionid` hoặc `virtualxid`; đừng kết luận chỉ từ việc không thấy row-level lock.

Wait queue có thứ tự để request tương thích mới không vượt mặt vô hạn một request mạnh hơn đang chờ. Hệ quả là SELECT nhẹ phía sau một `ACCESS EXCLUSIVE` đang đợi có thể bị queue dù SELECT không xung đột với writer hiện tại. Đây là lý do lock timeout/DDL rollout cần tính đến hàng đợi và blocker chain, không chỉ xem transaction đang giữ lock.

### Row lock nằm trong tuple; chờ thì cần heavyweight lock

Do MVCC, reader không khóa tuple để đọc phiên bản cũ. Row lock thường ghi thông tin transaction/mode trong tuple header qua `xmax` và các hint bits. Các khóa row yếu/mạnh cho phép phân biệt update không đổi key với update key, và có thể tương thích với một số kiểu `SELECT FOR ...`. Khi nhiều transaction cùng giữ row lock, `xmax` có thể trỏ tới MultiXact lưu nhiều member và mode thay vì một transaction đơn.

Tuple header không phải hàng đợi. Khi backend muốn khóa một row đang được transaction khác giữ, nó phải chờ heavyweight lock trên transaction ID; khi owner kết thúc, waiter thức dậy, đọc lại tuple/version và kiểm tra lại điều kiện. Ở Read Committed, UPDATE/SELECT FOR UPDATE có thể tìm phiên bản mới rồi đánh giá lại predicate. Vì vậy hotspot một row có thể tạo queue dài dù mỗi thao tác rất ngắn; `SKIP LOCKED` hữu ích cho worker claim hàng nhưng cố ý bỏ qua row đang bận, còn `NOWAIT` trả lỗi tức thì để caller thử sau.

Ví dụ chuyển hai tài khoản nên khóa theo ID tăng dần. Nếu T1 khóa A rồi đợi B, còn T2 khóa B rồi đợi A, wait-for graph có chu trình và deadlock detector hủy một transaction. Retry toàn transaction đã rollback, không chỉ lặp câu SQL cuối. Chuẩn hóa thứ tự tài nguyên giảm chu trình nhưng vẫn phải xử lý deadlock còn sót lại.

### Khóa khác relation/tuple

Transaction-ID lock cho phép chờ commit/abort; virtual transaction ID đại diện transaction trước khi nó có XID bền. Advisory lock dùng khóa ứng dụng do caller diễn giải, có session-level hoặc transaction-level lifetime; nó chỉ phối hợp được với code cùng tuân thủ quy ước. Không dùng nó làm rào bảo vệ nếu có writer bỏ qua advisory protocol.

Relation extension lock phối hợp việc nhiều backend cấp page mới ở cuối relation, tránh hai backend đồng thời mở rộng cùng một biên. Index access method còn có khóa page/bucket riêng; loại index quyết định thời gian giữ lock và concurrency. Serializable Snapshot Isolation dùng predicate/SIREAD locks để ghi nhận vùng dữ liệu đã đọc, kể cả row/page/range không tồn tại thành tuple để khóa. Chúng không chặn writer như khóa truyền thống; PostgreSQL phát hiện dependency cycle nguy hiểm và abort transaction để bảo vệ serializability. `pg_locks` có thể hiển thị nhiều granularity, nhưng SIREAD không phải bằng chứng đang block.



### Object lock, relation extension và page lock

Heavyweight lock kiểu `object` bảo vệ object trong system catalog không được biểu diễn như relation lock thông thường. Trong `pg_locks`, resource được nhận diện bởi bộ `database`, `classid`, `objid`: database cho biết phạm vi database (hoặc 0 cho object dùng chung toàn cluster), `classid` chỉ catalog mô tả loại object, còn `objid` là OID của object đó. Ví dụ tạo table có thể giữ lock trên schema `public` để transaction khác không xóa schema giữa chừng; thao tác xóa object còn cần lock độc quyền trên object và các dependency liên quan.

Khi heap table hết chỗ trong page hiện có, backend cần thêm page ở cuối relation file. Relation-extension heavyweight lock đảm bảo chỉ một backend cấp phần mở rộng tại một thời điểm; nó cũng được dùng trong một số bước vacuum index để ngăn thêm page trong lúc quét. Khóa này thường được nhả ngay sau khi phần mở rộng được tạo, không chờ transaction kết thúc và không tham gia wait-for graph như lock transaction thông thường. PostgreSQL 14 có thể cấp thêm nhiều heap page trong một lượt để giảm tranh chấp; B-tree index là ngoại lệ thường mở rộng từng page. Nếu extension kéo dài quá `deadlock_timeout`, vẫn có thể phát sinh kiểm tra deadlock dù bản thân extension lock không tạo cạnh chờ thông thường.

Page-level heavyweight lock hiếm hơn; sách mô tả nó trong luồng GIN. Với `fastupdate`, từ mới được ghi nhanh vào pending list rồi chuyển theo lô vào cấu trúc chính. Một thao tác chuyển pending entries cần khóa độc quyền metapage để tránh hai worker cùng merge; thao tác này không chặn các truy vấn sử dụng index bình thường như thể toàn index bị khóa. Lock page được thả khi thao tác xong, không giữ đến cuối transaction.

### Advisory lock có giao thức do ứng dụng sở hữu

Advisory lock phù hợp khi tài nguyên cần phối hợp không có row/relation tương ứng, nhưng database không tự lấy nó thay ứng dụng. Hai client chỉ được bảo vệ nếu mọi đường code đều dùng cùng một key và cùng quy tắc acquire/release. Có thể biến tên tài nguyên thành key số bằng hash, nhưng phải cân nhắc collision và chọn encoding ổn định giữa các process.

Tên hàm `pg_advisory_*` gợi ý cách dùng: `lock` có thể chờ, `try` thử lấy mà không chờ, `unlock` nhả khóa, `share` dùng mode chia sẻ, `xact` giữ đến hết transaction. Nếu không có `xact`, nhiều advisory lock sống đến hết session nên `COMMIT` không tự nhả; phải gọi unlock hoặc đóng session. Chọn transaction scope thường dễ quản lý hơn, còn session scope hữu ích khi khóa bao trùm nhiều transaction nhưng dễ rò nếu connection pool tái sử dụng session.

### Predicate lock mô tả vùng đọc, không giữ độc quyền

Trong SSI, PostgreSQL ghi nhận các vùng mà transaction `SERIALIZABLE` đã đọc bằng `SIReadLock`, hiển thị trong `pg_locks`. Đây không phải khóa chặn `INSERT` hay `UPDATE`: chúng ghi lại quan hệ đọc–ghi để PostgreSQL phát hiện một tổ hợp transaction có thể tạo lịch sử không serializable. Một cặp reader/writer riêng lẻ chưa chắc làm transaction abort; nếu các dependency tạo cấu trúc nguy hiểm, một transaction có thể bị kết thúc với SQLSTATE `40001`, và ứng dụng phải retry **toàn bộ transaction** từ đầu. Nếu invariant phụ thuộc vào các transaction liên quan, chúng cũng phải tham gia mức `SERIALIZABLE`; transaction ở isolation yếu hơn không được SSI bảo vệ theo cùng cách.

Vùng SIREAD phụ thuộc execution plan, nên predicate trong SQL không luôn tương ứng với một lock chính xác trên đúng tập row:

| Plan đọc | Dấu vết SIREAD có thể thấy | Hệ quả |
| --- | --- | --- |
| Sequential scan với `WHERE n > 100` | Relation-level | Theo dõi cả relation dù filter chỉ lấy một phần row |
| B-tree index scan với `WHERE n BETWEEN 1000 AND 1001` | Các tuple đọc và page lá của index/range liên quan | Theo dõi hẹp hơn nhưng vẫn bao phủ vùng có thể sinh phantom |

SIREAD không ngăn writer chèn `n=150`. Nó ghi nhận rằng lần ghi đó có thể tác động đến kết quả nếu thứ tự transaction đảo lại. Vì vậy hãy đọc `EXPLAIN` cùng các dòng `SIReadLock` trong `pg_locks`: một đổi plan từ index scan sang sequential scan có thể làm vùng ghi nhận rộng hơn và tăng khả năng abort bảo thủ.

Để không cạn bộ nhớ predicate lock, PostgreSQL có thể promote nhiều lock nhỏ thành lock lớn hơn: các tuple trên một page thành page lock, rồi nhiều tuple/page của cùng relation thành relation lock. Ngưỡng do `max_pred_locks_per_page` và `max_pred_locks_per_relation` điều khiển. Khi vùng theo dõi bị mở rộng, các ghi không thật sự tạo anomaly vẫn có thể khiến một transaction bị abort (**false positive**); tính đúng đắn được giữ, nhưng throughput và retry cost có thể xấu đi. Tăng ngưỡng có thể giảm promote nhưng làm tăng nhu cầu bộ nhớ. `max_pred_locks_per_transaction` định cỡ trung bình object lock trong shared predicate-lock table; nó **không** phải giới hạn số row được lock. PostgreSQL 14 mặc định lần lượt là 2 row/page, `-2` cho ngưỡng relation theo tỷ lệ, và 64 object/transaction trung bình; hãy xác nhận với cấu hình server trước khi điều chỉnh.

SIREAD đôi khi còn sống sau khi transaction đọc đã commit, cho đến khi các transaction đọc/ghi chồng lấn không còn cần dependency đó. Transaction `SERIALIZABLE READ ONLY` có thể được xác định là an toàn để tránh hoặc giải phóng predicate lock. Nếu ứng dụng khai báo `SERIALIZABLE READ ONLY DEFERRABLE`, PostgreSQL có thể đợi trước khi đọc để lấy một safe snapshot; startup chậm hơn đổi lấy việc kết quả đọc không phải bỏ đi do serialization anomaly.

### Spinlock, LWLock và khóa transaction

Heavyweight locks bảo vệ object nghiệp vụ qua transaction. Spinlock và lightweight lock (LWLock) bảo vệ cấu trúc shared memory như buffer mapping, buffer header, WAL insertion và process arrays. Spinlock chỉ có exclusive mode, dùng atomic instruction để quay đợi; nếu tranh chấp kéo dài, process có thể nhường CPU rồi thử lại. Nó không có deadlock detection hay instrumentation, nên phải được PostgreSQL core giữ cực ngắn và cài đặt đúng. LWLock có shared/exclusive mode để đọc/sửa cấu trúc; khác spinlock, LWLock có thể được quan sát qua wait events. Theo mô tả của PostgreSQL 14 trong sách, LWLock không bảo đảm thứ tự FIFO cho các waiter; dưới contention cao, việc waiter nào được chạy trước có thể thiếu công bằng. Giữ LWLock lâu, nhất là quanh I/O, có thể làm nghẽn dù query không chờ row/table lock. Buffer I/O lock báo page đang được đọc/ghi, khác với transaction lock trên tuple.

Đọc `pg_stat_activity.wait_event_type`/`wait_event` theo thời gian để phân biệt `Lock`, `LWLock`, `IO`, `BufferPin`, `Client` hay `IPC`. Một snapshot không cho biết tần suất; lấy mẫu định kỳ hoặc extension wait sampler để thấy phân bố. Chẩn đoán nên nối PID đang chờ với PID blocker, query/transaction age, relation/object và event; tránh chỉ nhìn top wait một lần. PostgreSQL 14 docs: [explicit locking](https://www.postgresql.org/docs/14/explicit-locking.html), [lock monitoring](https://www.postgresql.org/docs/14/monitoring-locks.html), [transaction isolation](https://www.postgresql.org/docs/14/transaction-iso.html), and [lock-management settings](https://www.postgresql.org/docs/14/runtime-config-locks.html).


### Lock nào bảo vệ buffer cache và WAL buffer?

Tên lock giúp lần một wait về đúng cấu trúc. Trong buffer cache, buffer mapping locks bảo vệ các partition của hash table ánh xạ relation/fork/block tới buffer; khóa shared cho tra cứu, exclusive cho đổi mapping. Buffer header spinlock bảo vệ metadata rất nhỏ như trạng thái buffer; một số bộ đếm có thể cập nhật bằng atomic operation. BufferContent lock bảo vệ nội dung page trong lúc đọc/sửa tuple; pin giữ buffer khỏi eviction nhưng không thay content lock. BufferIO state báo page đang được đọc/ghi để backend khác biết phải đợi I/O hoàn tất. Buffer strategy spinlock bảo vệ free-list/clock hand.

WAL buffer cũng có mapping, nhưng sách mô tả nó dùng một WALBufMapping LWLock vì cache nhỏ và truy cập có thứ tự hơn. WALWrite lock điều phối việc ghi WAL page. Khi tạo WAL record, backend đặt chỗ theo thứ tự bằng spinlock trên insert position; sau khi reservation xong, nhiều backend có thể điền payload đồng thời qua các LWLock thuộc WALInsert tranche. Đây là các điểm bảo vệ khác nhau; thấy wait event `WALWrite` không tự nói bottleneck là cùng một thứ với wait trên `WALInsert`.

### Đọc wait event và lấy mẫu đúng cách

`pg_stat_activity` cho snapshot của wait hiện tại, thường không phải lịch sử cộng dồn. `wait_event_type` nhóm loại chờ như `Lock`, `LWLock`, `BufferPin`, `IO`, `Client`, `IPC`, `Extension`, `Activity` và `Timeout`; `wait_event` cụ thể hóa tên sự kiện. Background worker nằm ở `Activity` khi đang nghỉ trong vòng lặp bình thường, còn `ClientRead` thường có nghĩa backend đang đợi client gửi lệnh kế tiếp — không nhất thiết là database đang nghẽn. `log_lock_waits` ghi các heavyweight-lock wait vượt `deadlock_timeout`, hữu ích để lưu bằng chứng qua thời gian.

Một ô `wait_event` trống chỉ có nghĩa view không ghi nhận một wait event được instrument tại thời điểm chụp; nó không chứng minh toàn bộ thời gian backend đều làm việc hữu ích. Một số chờ phụ thuộc phiên bản hoặc đường code có thể chưa được instrument, nên tổng thời gian truy vấn có thể lớn hơn thời gian giải thích được từ wait event.

Để có phân bố theo thời gian, cần sampling định kỳ hoặc extension như `pg_wait_sampling`. Sample thưa sẽ bỏ lỡ wait ngắn; tăng tần suất cải thiện khả năng bắt nhưng tăng overhead, còn session tồn tại ngắn gần như không đủ thời gian để tạo mẫu đáng tin. Profile count chỉ ước lượng thời gian khi biết sampling period và giả định mỗi sample đại diện khoảng thời gian tương ứng. Tên event và khả năng instrument thay đổi theo release. Hãy gộp sample với blocker chain, SQL, transaction age và host I/O, thay vì xem một event count như nguyên nhân gốc.

## Tự kiểm tra

**Một SELECT thông thường có bị UPDATE chặn không?** Thường không vì MVCC, nhưng DDL/table lock hoặc các tình huống khác vẫn có thể tạo chờ.

**Predicate lock luôn chặn writer?** Không. Trong SSI nó chủ yếu giúp phát hiện phụ thuộc nguy hiểm; transaction có thể bị abort sau đó.

**Deadlock timeout lớn hơn có loại deadlock?** Không. Nó thay thời điểm phát hiện, không thay thứ tự chờ.

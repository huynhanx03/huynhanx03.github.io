---
title: "Concurrency trong database: MVCC, lock và deadlock"
category: "Database"
description: "Theo hai giao dịch cùng chạm một dữ liệu để phân biệt isolation, MVCC, lock và latch; hiểu deadlock xuất hiện ra sao và database xử lý thế nào."
updated: 2026-10-17
translationKey: "database/concurrency-control-mvcc-and-locks"
---

Hai khách hàng cùng mua chiếc ghế cuối cùng. Cả hai đọc số lượng là 1, cả hai trừ đi 1, và hệ thống ghi nhận hai đơn. Mỗi câu SQL có thể chạy thành công nhưng kết quả chung vi phạm quy tắc nghiệp vụ. Database cần một mô hình concurrency control để quyết định giao dịch nào được nhìn thấy thay đổi nào, giao dịch nào phải chờ, và lịch thực thi nào được phép commit.

## Một transaction nhìn thấy lịch chạy nào?

Nếu chạy từng transaction một theo một thứ tự cố định, ta có **serial schedule**. Thực tế database chạy xen kẽ thao tác để tận dụng CPU, I/O và nhiều kết nối. Mục tiêu của isolation là giới hạn các kết quả xen kẽ không hợp lệ theo mức bảo đảm của sản phẩm.

Một vài anomaly thường gặp:

- **Dirty read**: đọc thay đổi chưa commit của transaction khác; nếu transaction kia rollback, giá trị đã đọc chưa từng trở thành dữ liệu đã commit.
- **Non-repeatable read**: đọc cùng một dòng hai lần nhưng thấy một giá trị khác sau khi transaction khác commit cập nhật.
- **Phantom**: chạy lại điều kiện lọc và thấy tập dòng khớp đã đổi do insert/delete của transaction khác.
- **Lost update**: hai giao dịch cùng đọc một giá trị cũ rồi ghi kết quả riêng; lần ghi sau xóa mất hiệu ứng của lần trước.
- **Dirty write**: một giao dịch ghi đè giá trị chưa commit của giao dịch khác. Nếu giao dịch đầu rollback, database khó khôi phục đúng giá trị mà giao dịch sau đã dựa vào; hệ quản trị thường phải ngăn dirty write.
- **Write skew**: hai giao dịch đọc các dòng khác nhau nhưng cùng dựa vào một điều kiện tổng thể; mỗi giao dịch sửa một dòng riêng và cùng làm điều kiện đó sai.

Tên isolation level không đủ để suy ra mọi hành vi. Chuẩn SQL mô tả các mức bằng hiện tượng, nhưng hệ quản trị có thể dùng snapshot, khóa hoặc cơ chế khác. PostgreSQL, chẳng hạn, xử lý Read Uncommitted như Read Committed và Repeatable Read ngăn thêm phantom; MySQL InnoDB có hành vi snapshot và khóa phạm vi riêng. Hãy đọc cam kết của engine cụ thể, như [PostgreSQL isolation](https://www.postgresql.org/docs/current/transaction-iso.html) và [InnoDB isolation](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html).

## MVCC giữ nhiều phiên bản để reader có snapshot

**Multiversion Concurrency Control (MVCC)** giữ nhiều phiên bản của một hàng trong một khoảng thời gian. Thay vì bắt reader và writer luôn chặn nhau trên cùng dữ liệu, database quyết định phiên bản nào hiển thị cho snapshot của transaction.

Ví dụ, transaction A bắt đầu trước khi B cập nhật `quantity` từ 4 xuống 3. A có thể tiếp tục đọc phiên bản cũ theo snapshot, trong khi transaction mới bắt đầu sau commit của B đọc phiên bản mới. Cách chọn snapshot khác nhau theo sản phẩm và isolation level: một statement snapshot không nhất thiết giống snapshot giữ suốt transaction.

MVCC giảm một số xung đột đọc/ghi nhưng không loại bỏ mọi lock. Hai writer sửa cùng một dòng vẫn cần phối hợp; DDL, khóa rõ ràng và các thao tác trên cấu trúc vật lý cũng có thể chờ. Phiên bản cũ phải được giữ tới khi không snapshot hợp lệ nào cần nó, rồi mới có thể thu hồi. PostgreSQL gọi quá trình quản lý tuple cũ là vacuum; các engine khác có purge hoặc garbage collection riêng.

## Lock bảo vệ xung đột logic

Lock gắn với dữ liệu hoặc đối tượng mà transaction muốn truy cập. Shared lock cho phép nhiều reader tương thích; exclusive lock thường loại trừ writer khác. Một truy vấn `SELECT ... FOR UPDATE` thường báo trước ý định cập nhật và giữ lock tới ranh giới transaction, nhưng tên lệnh và tập đối tượng bị khóa phụ thuộc engine.

Nếu transaction cần nhiều dòng, thứ tự lấy lock có thể tạo deadlock:

1. A khóa dòng 1.
2. B khóa dòng 2.
3. A chờ dòng 2 đang do B giữ.
4. B chờ dòng 1 đang do A giữ.

Không transaction nào tự tiến lên được. Database phát hiện chu trình chờ và hủy một transaction làm nạn nhân. Ứng dụng cần xử lý lỗi deadlock và, khi thao tác có thể thử lại, chạy lại **toàn bộ** đơn vị công việc với giới hạn/backoff phù hợp. Chỉ thử lại câu lệnh cuối có thể dùng dữ liệu đã đổi hoặc thiếu các bước trước.

Khóa phạm vi như gap/next-key lock có thể ngăn insert vào khoảng index để bảo vệ predicate dưới một số isolation level. Nó cũng có thể làm insert hợp lệ phải chờ. Vì lock thường đi theo access path, index được chọn có thể ảnh hưởng phạm vi bị quét và bị khóa.

## Latch bảo vệ cấu trúc trong RAM

**Latch** thường là primitive đồng bộ ngắn hạn để bảo vệ cấu trúc bộ nhớ dùng chung, chẳng hạn buffer page hoặc node index. Lock giao dịch thường bảo vệ ý nghĩa logic lâu hơn và được giữ qua nhiều thao tác SQL; latch bảo vệ tính toàn vẹn của cấu trúc lúc thread đang đọc hoặc sửa nó.

Trong lúc tìm key qua B-tree, thread có thể latch parent rồi child. Nếu child đã an toàn và thao tác không thể làm split lan lên parent, một kỹ thuật như latch crabbing có thể nhả latch parent sớm. Quy tắc an toàn phụ thuộc thao tác và cấu trúc; nhả quá sớm có thể khiến reader theo con trỏ đã lỗi thời.

B-link tree bổ sung high key và sibling link để reader có thể đi ngang khi cấu trúc thay đổi trong một số tình huống. Đây là kỹ thuật giảm khóa chặt ở node, không phải lời hứa rằng mọi cập nhật không cần phối hợp.

## OCC và PCC chọn thời điểm phát hiện xung đột

**Pessimistic concurrency control** giả định xung đột có khả năng xảy ra và khóa trước hoặc trong lúc thao tác. Nó tránh một phần công việc bị lặp nhưng có thể làm request chờ và tạo deadlock.

**Optimistic concurrency control (OCC)** để các transaction làm việc mà không giữ lock dài, sau đó kiểm tra ở giai đoạn validate/commit xem dữ liệu đọc có bị thay đổi xung đột không. Nếu có, transaction bị từ chối và phải thử lại. OCC hợp với một số workload ít xung đột; khi nhiều transaction tranh cùng dữ liệu, chi phí retry có thể lớn.

MVCC, lock và OCC không phải ba lựa chọn loại trừ nhau. Một hệ quản trị có thể dùng MVCC cho snapshot read, lock cho write conflict, latch cho page trong RAM, và optimistic validation cho Serializable.

## Đọc một schedule để kiểm tra serializability

Một **schedule** là thứ tự các thao tác database thực sự chạy; phần tính toán thuần không chạm state được lược khỏi lịch. Schedule serializable nếu kết quả tương đương một thứ tự chạy transaction lần lượt. Với conflict serializability, ta chỉ xét cặp thao tác ở hai transaction khác nhau, trên cùng item, trong đó ít nhất một thao tác là write. Thứ tự conflict tạo cạnh trong precedence graph: nếu `T1` thao tác trước `T2` trên cùng item, vẽ `T1 → T2`. Graph không chu trình thì có thứ tự topo tương đương; có chu trình thì schedule không conflict-serializable.

Ví dụ, `T1: read(x), write(x)` và `T2: read(x), write(x)` xen kẽ thành `r1(x), r2(x), w1(x), w2(x)`. Các conflict tạo cạnh cả `T1 → T2` (r1 trước w2) lẫn `T2 → T1` (r2 trước w1), nên có chu trình. Cả hai cùng đọc giá trị cũ rồi ghi kết quả riêng có thể làm mất update. Khóa, validation hoặc serialization graph test phải chặn/hủy một lịch như vậy.

Các anomaly giúp quan sát một số lịch sai, còn serializability là tiêu chí tổng quát hơn. Snapshot isolation ngăn hai transaction ghi cùng một item bằng first-committer-wins, nhưng vẫn có thể write skew nếu transaction ghi item khác nhau. Vì vậy “không thấy dirty read” chưa chứng minh application invariant được bảo toàn.

## OCC có ba pha và vẫn cần điểm commit tuần tự

Trong OCC, transaction chạy read phase trên context riêng, thu read set và write set; validation kiểm tra xem các transaction chạy chồng có làm read set cũ hoặc gây xung đột write hay không; write phase mới công bố kết quả hợp lệ. Nếu validation thất bại, transaction bỏ context và chạy lại từ đầu. Khi validation thường thành công, tránh giữ lock dài; khi contention cao, retry và work bị bỏ phí có thể làm throughput giảm.

Validation vẫn có critical section: các commit phải được kiểm tra theo một thứ tự nhất quán để hai transaction cùng không vượt qua phép kiểm tra bằng một state đã cũ. OCC không có nghĩa “không có khóa/coordination”; nó chuyển phần lớn phát hiện xung đột về cuối transaction.

## Timestamp ordering và hai pha khóa

Timestamp ordering cấp thứ tự logic cho transaction. Với mỗi item, hệ thống theo dõi timestamp lớn nhất từng đọc (`readTS`) và ghi (`writeTS`). Nếu transaction cũ hơn muốn đọc một value đã bị transaction mới ghi, hoặc ghi value đã được transaction mới đọc, nó bị abort để không phá thứ tự timestamp. Một write cũ hơn `writeTS` có thể bị bỏ qua như giá trị lỗi thời theo **Thomas Write Rule** thay vì abort. Transaction bị abort phải chạy lại với timestamp mới; dùng lại timestamp cũ có thể khiến nó chắc chắn bị abort lần nữa. Cách này có thể abort nhiều transaction, nhưng không tạo wait cycle như lock-based scheme.

**Two-phase locking (2PL)** có pha growing chỉ lấy thêm lock và pha shrinking chỉ nhả lock; sau lần nhả đầu tiên không được lấy lock mới. Quy tắc áp dụng cho việc lấy/nhả lock, không cấm transaction thực thi thao tác trong cả hai pha. Biến thể conservative 2PL yêu cầu lấy đủ lock trước khi chạy, có thể từ chối transaction sớm nhưng làm giảm concurrency. 2PL khác **two-phase commit**: 2PL điều khiển xung đột transaction trên database; 2PC phối hợp quyết định commit giữa các participant phân tán. Deadlock thường được tìm bằng wait-for graph; chu trình là deadlock. Hệ thống có thể kiểm tra định kỳ hoặc mỗi khi đồ thị thêm cạnh chờ. Timeout là cách đơn giản nhưng có thể hủy giao dịch chậm dù không deadlock; conservative 2PL tránh chờ bằng cách không bắt đầu khi chưa lấy đủ lock.

Nếu muốn phòng deadlock theo timestamp tuổi transaction, **wait-die** cho transaction cũ chờ transaction trẻ, còn transaction trẻ cần lock do transaction cũ giữ thì abort. **Wound-wait** cho transaction cũ hủy transaction trẻ đang giữ lock; transaction trẻ có thể chờ transaction cũ. Hai rule ép mọi cạnh chờ theo một chiều tuổi, tránh chu trình; transaction bị abort phải retry và cần giữ timestamp/ưu tiên phù hợp để tránh starvation.

## Reader-writer latch và latch crabbing trên cây

Reader-writer latch cho nhiều thread cùng giữ shared latch để đọc page; writer cần exclusive latch và phải chờ reader/writer khác. Khi page chỉ được đọc, exclusive latch sẽ giảm concurrency mà không tăng safety. Một số primitive dùng blocking queue; với critical section rất ngắn, spin/queue lock có thể tránh context switch nhưng đốt CPU khi phải chờ lâu. Lựa chọn phụ thuộc thời gian giữ latch và tải contention.

Upgradeable latch bắt đầu ở shared mode rồi chuyển lên exclusive khi phát hiện cần sửa cấu trúc. Nếu hai reader cùng nâng cấp, cả hai có thể chờ nhau; implementation thường giới hạn một upgrader hoặc buộc một thread nhả rồi retry. Upgrade giảm thời gian giữ exclusive latch cho đường đọc, nhưng cần quy tắc để tránh deadlock lúc nâng cấp.

Trong **latch crabbing**, thread đi từ root xuống, latch node con trước rồi mới nhả node cha. Với insert, nếu child không đầy nên split không thể lan lên parent, có thể nhả latch cha. Với delete, nếu child còn đủ key để không underflow/merge, parent cũng có thể nhả. Nếu node con có thể gây split/merge lan lên, giữ latch trên đường đi để sửa parent an toàn. Vì structural change ít khi lan tới root, root có thể được latch lạc quan; nếu node split trong lúc descend, thread phát hiện qua high key/sibling và chase pointer hoặc retry.

B-link tree dùng high key và sibling link để search đi sang sibling đúng khi parent pointer chưa kịp cập nhật sau split. Một node có thể ở trạng thái half-split: page mới và sibling link đã publish, parent separator sẽ được thêm sau. Reader so key với high key; nếu key vượt biên, nó đi ngang, tránh bỏ sót key. Cách này cho phép search chạy đồng thời với một số structural modification và tránh giữ latch từ leaf ngược lên root lâu hơn cần thiết.

## Chuyển đảm bảo thành quy tắc nghiệp vụ

Quay lại ghế cuối cùng, chỉ đọc tồn kho rồi giảm ở câu lệnh sau có thể tạo race. Một giải pháp là cập nhật có điều kiện:

```sql
UPDATE inventory
SET quantity = quantity - 1
WHERE product_id = 17 AND quantity > 0;
```

Ứng dụng kiểm tra số dòng được cập nhật. Nếu bằng 0, sản phẩm đã hết hoặc không tồn tại. Trong schema nhiều bảng, các bước liên quan vẫn phải nằm trong transaction phù hợp. Tùy yêu cầu, có thể cần ràng buộc, row lock, isolation cao hơn, hoặc retry serialization failure.

Chọn cơ chế sau khi xác định bất biến: “không bán quá số lượng”, “mỗi bác sĩ trực ít nhất một ca”, hay “một idempotency key chỉ ghi nhận một lần”. Sau đó dựng lịch xen kẽ có thể phá điều kiện, đọc isolation semantics, và thử cách database thật sự thực hiện thao tác.

## Tự kiểm tra

**MVCC có nghĩa là writer không bao giờ chờ reader?** Không nên khái quát như vậy. Một số read/write không chặn nhau, nhưng vẫn có lock khác, DDL, vacuum hoặc tài nguyên gây chờ.

**Deadlock có nghĩa một transaction viết sai không?** Không nhất thiết. Mỗi thao tác có thể hợp lệ riêng; chu kỳ chờ khiến database phải hủy một bên. Ứng dụng cần coi deadlock là lỗi có thể xảy ra trong concurrency và xử lý theo thiết kế.

**Nếu bật Serializable thì có thể bỏ logic retry?** Không. Serializable có thể phát hiện lịch không tương đương tuần tự bằng cách hủy một transaction; ứng dụng phải xử lý kết quả đó.

Nguồn đọc: *Database Internals*, chương 5; *High Performance MySQL*, chương 1 và 5; *PostgreSQL 14 Internals*, phần I và III; tài liệu isolation và lock của từng hệ quản trị.

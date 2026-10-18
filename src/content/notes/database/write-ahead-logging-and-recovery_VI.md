---
title: "WAL, buffer cache và phục hồi sau crash"
category: "Database"
description: "Hiểu vì sao database ghi log trước page dữ liệu, transaction commit được xác nhận lúc nào và recovery dựng lại trạng thái sau khi tiến trình dừng đột ngột ra sao."
updated: 2026-10-17
translationKey: "database/write-ahead-logging-and-recovery"
---

Database có thể báo transaction đã commit trước khi page chứa dữ liệu mới được ghi xuống file bảng. Nếu máy mất điện ngay sau đó, dữ liệu mới nằm ở đâu? Câu trả lời thường là write-ahead log (WAL) hoặc redo log: database ghi đủ thông tin phục hồi vào log bền vững trước, rồi mới ghi page dữ liệu dần dần.

## Buffer cache tách cập nhật logic khỏi ghi page vật lý

Đọc page từ storage thường đắt hơn truy cập RAM, nên engine giữ các page gần đây trong **buffer pool/cache**. Khi transaction sửa page, bộ nhớ chứa page trở thành dirty. Việc commit không bắt buộc phải ghi ngay tất cả page dirty xuống vị trí cuối cùng của file bảng; engine có thể xác nhận commit sau khi phần log cần thiết đã bền vững.

Buffer manager phải chọn page nào có thể thay thế khi cache đầy. FIFO loại page vào sớm nhất; LRU ước lượng page ít được dùng gần đây; CLOCK dùng bit tham chiếu để giảm chi phí quản lý chính xác; LFU xem tần suất truy cập. Workload có vòng quét lớn có thể làm hỏng cache của dữ liệu nóng, nên engine thường có chính sách riêng cho scan hoặc page loại đặc biệt. Không thuật toán thay thế đơn giản nào dự đoán hoàn hảo lần truy cập tiếp theo.

Trong lúc thread sửa page, latch bảo vệ nội dung trong RAM. Một page đang được ghi hoặc pin có thể chưa được evict. Khóa transaction và latch page giải quyết hai phạm vi khác nhau.

## Quy tắc write-ahead

WAL áp dụng một quy tắc cốt lõi: trước khi ghi page dữ liệu xuống nơi lưu bền, phải bảo đảm log mô tả các thay đổi tương ứng đã được ghi bền. Khi transaction cần trả lời `COMMIT`, database phải tuân thủ chính sách durability của sản phẩm và cấu hình. Ở cấu hình đồng bộ thông thường, log commit được flush tới ranh giới bền vững trước khi trả lời thành công; chế độ asynchronous có thể nới lỏng điều đó.

Log record thường mang thứ tự như LSN (log sequence number). Page ghi lại LSN cuối cùng đã áp dụng. Nhờ vậy recovery biết log nào cần phát lại cho page, tránh phụ thuộc vào việc transaction đã kịp ghi data page hay chưa.

Hai kiểu thông tin log thường gặp:

- **Redo log/physiological log** mô tả thay đổi dữ liệu đủ để áp dụng lại lên page, thường gắn với page và vị trí cụ thể.
- **Logical hoặc operation log** mô tả thao tác ở mức cao hơn, như “tăng bộ đếm” hoặc “thêm record”; recovery cần diễn giải thao tác theo ngữ nghĩa.

Nhiều engine trộn mức log hoặc có log riêng cho mục tiêu khác nhau. Không nên giả định một hệ thống dùng đúng một kiểu log cho mọi việc.

Một hướng khác là **shadow paging**: thay page cũ bằng bản copy mới, giữ page mới chưa công bố cho tới khi transaction thành công, rồi đổi một root/pointer để publish. Nếu crash trước pointer flip, page cũ vẫn là phiên bản đang thấy; nếu flip đã bền, page mới trở thành phiên bản hiện hành. Cách này giảm nhu cầu undo log kiểu truyền thống cho page đó nhưng copy page/tree và quản lý page cũ có thể tốn chi phí, tạo fragmentation và làm cập nhật nhiều page khó gộp hiệu quả. WAL append log và shadow paging đều cần quy tắc atomic/durable khi công bố kết quả; không có cách nào miễn phí.

## Vì sao recovery cần cả redo lẫn undo?

Database thường cho phép **steal**: buffer manager có thể ghi page chứa thay đổi chưa commit ra storage để giải phóng bộ nhớ. Nếu transaction sau đó abort, recovery cần loại bỏ thay đổi chưa commit. Ngược lại, với **no-force**, transaction commit không buộc mọi page của nó phải xuống storage ngay; nếu crash, recovery cần redo thay đổi đã commit nhưng chưa xuất hiện trên page.

Kết hợp steal và no-force đòi hỏi cả undo lẫn redo. Một thiết kế kiểu ARIES lưu log đủ để khôi phục và thực hiện ba pha khái niệm:

1. **Analysis**: đọc từ checkpoint để dựng transaction nào còn hoạt động và page nào có thể cần redo.
2. **Redo**: phát lại lịch sử cần thiết để đưa page về trạng thái đã ghi nhận trong log.
3. **Undo**: lùi các transaction chưa commit, đồng thời ghi compensation log records để chính quá trình undo có thể phục hồi nếu lại crash.

Đây là mô hình giải thích, không có nghĩa mọi database triển khai ARIES nguyên dạng. Một số engine dùng thiết kế redo/undo, page-oriented logging hoặc snapshot khác nhau.

## Checkpoint giới hạn công việc phục hồi

Nếu recovery phải quét toàn bộ log kể từ khi database ra đời, thời gian khởi động có thể quá dài. Checkpoint ghi lại thông tin giúp recovery bắt đầu từ vùng log gần hơn. Checkpoint không đồng nghĩa mọi page đã được ghi sạch và mọi transaction đều kết thúc; ý nghĩa chính xác phụ thuộc engine.

Checkpoint quá dày có thể tăng I/O và tạo đợt ghi dồn; checkpoint quá thưa có thể kéo dài recovery và làm WAL cần giữ nhiều hơn. Engine điều tiết background writer và checkpoint để cân bằng throughput, latency và thời gian khôi phục.

PostgreSQL gọi log phục hồi của mình là WAL; [tài liệu WAL](https://www.postgresql.org/docs/current/wal.html) mô tả durability, checkpoint, recovery, cấu hình và WAL levels. InnoDB có redo/undo và cơ chế checkpoint riêng; xem [redo log của InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-redo-log.html). Các khái niệm chung giống nhau, nhưng file, cấu hình và bảo đảm commit không thể bê nguyên từ hệ này sang hệ kia.

## Recovery không thay thế backup

Crash recovery đưa database về trạng thái nhất quán theo log hiện có. Nó không thể phục hồi dữ liệu đã bị xóa hợp lệ, ghi đè sai hoặc mất cùng với mọi bản sao bền vững. Backup và point-in-time recovery cần một bản nền cùng log được lưu và quản lý đúng cách.

Replication cũng không tự thay thế backup: thao tác xóa nhầm có thể được sao chép sang replica. Thiết kế phục hồi cần xác định sự cố nào phải chịu được, mất tối đa bao nhiêu dữ liệu chấp nhận được (RPO), khôi phục trong bao lâu (RTO), và đã thử restore gần đây chưa.

## Đọc một tình huống crash

Giả sử transaction T đổi số dư 10 thành 7. Engine ghi log mô tả thay đổi, rồi log commit được flush. Page bảng vẫn đang dirty trong buffer. Máy crash. Khi khởi động, recovery tìm log commit, xác định page chưa phản ánh thay đổi rồi redo để trạng thái sau phục hồi có số dư 7. Nếu T chưa commit, recovery phải undo hoặc không làm thay đổi chưa commit trở thành trạng thái cuối.

Ví dụ này bỏ qua chi tiết checksum, page torn write, group commit, replica acknowledgment và storage device cache. Khi cần đánh giá độ bền thực tế, phải đọc cấu hình sync/flush của engine, filesystem, thiết bị và replication topology.

## Tự kiểm tra

**Vì sao database chưa ghi page dữ liệu mà có thể trả lời commit thành công?** Vì log chứa đủ thông tin phục hồi đã được ghi bền theo chính sách durability.

**Checkpoint có xóa nhu cầu giữ log không?** Không. WAL có thể cần cho crash recovery, replication hoặc point-in-time recovery; chỉ loại bỏ phần log khi mọi consumer và yêu cầu retention cho phép.

**Nếu recovery chạy xong thì đã có backup hợp lệ chưa?** Chưa. Recovery xử lý crash từ log hiện có; backup phục vụ mất dữ liệu, lỗi người dùng và phục hồi tới một thời điểm.

Nguồn đọc: *Database Internals*, chương 5; *PostgreSQL 14 Internals*, phần II; tài liệu WAL của PostgreSQL và redo log của InnoDB.

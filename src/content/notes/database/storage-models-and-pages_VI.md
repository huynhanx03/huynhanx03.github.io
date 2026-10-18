---
title: "Database lưu dữ liệu như thế nào: row, column và page"
category: "Database"
description: "Theo dữ liệu từ bản ghi logic xuống các khối lưu trữ để hiểu row store, column store, page, buffer và vì sao bố cục vật lý ảnh hưởng hiệu năng."
updated: 2026-10-17
translationKey: "database/storage-models-and-pages"
---

Ứng dụng yêu cầu “đơn hàng số 42”, nhưng ổ đĩa không biết đơn hàng là gì. Nó chỉ đọc và ghi các vùng byte. Database phải biến ý nghĩa logic của một dòng thành định dạng vật lý, tìm đúng vùng chứa dòng đó, đưa vùng ấy vào bộ nhớ và giữ cho các cập nhật có thể phục hồi sau lỗi.

## Một request đi qua DBMS ra sao?

Trong mô hình client/server, ứng dụng gửi query qua transport tới database node. Query processor parse và validate cú pháp/đối tượng; access control kiểm tra quyền; optimizer dùng schema, statistics và data placement để chọn execution plan. Execution engine chạy các operator trong plan, có thể gọi storage engine cục bộ hoặc gửi công việc tới node khác trong cluster.

Storage engine thường phối hợp nhiều bộ phận: transaction manager theo dõi begin/commit/abort; lock/concurrency manager giải quyết xung đột; access method như heap, hash hay B-tree tìm dữ liệu; buffer manager giữ page đang dùng trong RAM; recovery manager dùng log để khôi phục sau crash. Tên module và ranh giới thay đổi theo sản phẩm, và tối ưu hiệu năng có thể ghép chúng chặt hơn sơ đồ khái niệm.

Điều này giúp đặt câu hỏi đúng khi chậm: client chờ network hay server queue? Optimizer chọn sai plan? Lock manager đang đợi? Buffer manager miss liên tục? Storage device chậm? Nếu chỉ nhìn thời gian tổng, các nguyên nhân khác nhau dễ bị nhầm thành “database chậm”.

Ví dụ `SELECT total FROM orders WHERE id=42`: transport nhận request; parser kiểm tra SQL; quyền được xác thực; optimizer so sánh table scan với primary-key lookup; execution engine gọi access method; B-tree tìm page chứa key; buffer manager trả page từ cache hoặc yêu cầu đọc; transaction/MVCC kiểm tra version nhìn thấy; kết quả quay về client. Mỗi bước có thể trở thành bottleneck khác nhau và có metric riêng.

## Workload là một trục phân loại khác

**OLTP** thường xử lý nhiều request ngắn, giao dịch nhỏ và point/range lookup; **OLAP** thường quét dữ liệu lớn để aggregate; **HTAP** kết hợp cả hai nhưng phải xử lý cạnh tranh tài nguyên giữa scan/ingest và giao dịch tương tác. Một database cũng có thể tách hot data thường truy cập, cold history lưu lâu và blob lớn sang cách lưu khác. Đây là các mô hình workload chứ không phải loại file format bắt buộc: row/column layout, RAM/disk và SQL/NoSQL là những trục phân loại khác nhau.

## Từ bảng đến file và page

Một DBMS thường phân biệt ít nhất ba lớp: cấu trúc logic mà ứng dụng truy vấn, cấu trúc lưu trữ của storage engine, và thiết bị hoặc filesystem cuối cùng giữ byte. Cùng một `SELECT` có thể đi qua parser, optimizer, access method, buffer manager rồi mới yêu cầu đọc page từ hệ điều hành.

Đĩa và SSD đều truyền dữ liệu theo đơn vị lớn hơn một giá trị SQL đơn lẻ. Database gom nhiều bản ghi hoặc mục index vào **page** (còn gọi là block trong một số ngữ cảnh). Page là đơn vị phổ biến để cache, đọc, ghi và quản lý không gian. Kích thước và định dạng page phụ thuộc engine; đừng giả định mọi database dùng cùng kích thước.

Một bảng lớn có thể trải trên nhiều page. Engine cần cách tìm page, tìm dòng bên trong page, và xử lý khi dòng lớn hơn phần trống còn lại. Nó cũng cần phân biệt page dữ liệu với page index và metadata. Ở PostgreSQL, tài liệu [page layout](https://www.postgresql.org/docs/current/storage-page-layout.html) mô tả header, item identifier và vùng dữ liệu; InnoDB có định dạng record và page riêng được ghi trong [tài liệu InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-physical-structure.html).

Database dùng file format riêng để tối ưu đồng thời ba mục tiêu: giảm metadata/space trên mỗi record, tìm record với ít bước/page transfer, và cập nhật ít byte/page nhất có thể. Index là cấu trúc phụ trợ map search key tới row hoặc primary key; nó tốn chỗ và phải được cập nhật cùng dữ liệu, nhưng tránh scan toàn table. Data file thường giữ record, index file giữ đường tra; index-organized engine có thể gộp hai vai trò này trong cùng cây.

## Vì sao thiết kế disk-resident khác cấu trúc trong RAM?

HDD phải di chuyển đầu đọc và chờ platter quay để tới vị trí khác; random seek có thể đắt hơn nhiều so với đọc một dải block liền nhau. Vì vậy cấu trúc trên HDD cố giảm số lần nhảy và tận dụng sequential I/O. SSD không có đầu đọc cơ học nên random read thường bớt bất lợi, nhưng page/block transfer, queue depth, controller parallelism và write amplification vẫn quan trọng.

NAND flash thường đọc/ghi theo page nhưng erase theo block lớn hơn. Controller dùng Flash Translation Layer (FTL) ánh xạ logical block tới physical page, gom garbage và dời page còn sống trước khi erase block; do đó write nhỏ/ngẫu nhiên có thể thành nhiều công việc nội bộ. Filesystem và database còn tạo lớp buffering/logging bên trên. Hệ quả: “SSD nhanh” không có nghĩa mọi random write miễn phí, và benchmark nên dùng thiết bị, filesystem, queue và block size giống production.

## Database chạy chủ yếu trong RAM hay trên disk?

Disk-based DBMS giữ phần lớn dataset trên SSD/HDD và dùng RAM làm cache hoặc vùng xử lý tạm. Main-memory DBMS giữ dữ liệu hoạt động chủ yếu trong RAM; điều đó giảm latency và cho phép cấu trúc tối ưu riêng cho truy cập bộ nhớ, nhưng RAM đắt hơn và mất nội dung khi process/máy dừng. “In-memory” không tự trả lời durability: hệ cần quy định log, snapshot, backup và recovery.

### Durability của hệ thống lưu dữ liệu chính trong RAM

Một luồng phổ biến là ghi thay đổi vào write-ahead log trước khi ACK, rồi cập nhật snapshot trên disk theo batch. Snapshot/checkpoint rút ngắn log cần replay khi restart: nếu snapshot mới nhất tương ứng thời điểm T, recovery nạp snapshot T rồi replay log sau T. Database trên disk cũng dùng RAM cho buffer pool, nhưng không tương đương main-memory engine có layout, pointer và concurrency control được thiết kế quanh RAM.

## Row store và column store

### Row layout: lấy nhiều field từ một số ít record

Với **row-oriented storage**, các cột của cùng một dòng nằm gần nhau. Khi ứng dụng lấy toàn bộ một đơn hàng theo khóa, engine có thể đọc một số page chứa đủ các cột của dòng. Bố cục này phù hợp với nhiều workload giao dịch: đọc hoặc sửa một số dòng, thường xuyên thao tác trên nhiều thuộc tính của mỗi dòng.

### Column layout: quét ít field trên nhiều record

Với **column-oriented storage**, các giá trị của cùng một cột được lưu gần nhau. Truy vấn phân tích tính tổng một cột trên hàng triệu dòng có thể đọc chủ yếu cột đó thay vì kéo mọi cột vào bộ nhớ. Giá trị gần nhau cũng thường nén tốt. Đổi lại, dựng lại một dòng đầy đủ có thể cần đọc nhiều vùng cột, và cập nhật từng ô có thể đòi hỏi xử lý khác.

### Vectorization, layout lai và giới hạn theo workload

Không nên biến khác biệt này thành luật “OLTP luôn row, analytics luôn column”. Engine có thể dùng layout lai, lưu cột riêng cho một số trường, hoặc tối ưu nhiều dạng truy vấn. Câu hỏi đúng là workload chủ yếu đọc/ghi đơn vị nào, quét bao nhiêu dữ liệu, và engine thực sự tổ chức page ra sao.

Columnar scan còn có thể xử lý nhiều giá trị cùng type bằng vectorized operation, nén tốt hơn nhờ các giá trị tương tự nằm cạnh nhau, và chỉ đọc cột cần dùng. Row layout thường lợi khi lấy nhiều field của ít record; column layout lợi khi quét nhiều record nhưng chỉ cần vài field. Khi query phải reconstruct row hoặc cập nhật một ô liên tục, chi phí có thể đổi chiều.

### Wide-column store không đồng nghĩa với columnar analytics

**Wide-column store không phải columnar analytics store.** Bigtable/HBase-style model tra theo row key rồi tổ chức column family, qualifier và version timestamp. Một row có thể có những qualifier thưa khác nhau; column family thường là đơn vị bố trí/lưu riêng. Thiết kế row key quyết định locality và range scan, nên prefix key có thể tạo hot region nếu write tập trung một đầu. Mô hình này hợp truy cập theo key hoặc dãy key có chủ đích; nó không tự thay thế relational join hay columnar aggregate.

## Bên trong một page

Page cần metadata để database biết phiên bản định dạng, số mục, vị trí vùng trống và những thông tin bảo vệ tính toàn vẹn. Một thiết kế phổ biến cho page chứa bản ghi có độ dài thay đổi là **slotted page**:

1. Header nằm ở đầu page.
2. Mảng slot ghi vị trí và độ dài của từng cell.
3. Các cell thường được đặt từ phía cuối page, còn slot mở rộng từ phía đầu.
4. Khoảng trống ở giữa được dùng cho insert hoặc update.

Slot gián tiếp tới cell thay vì buộc vị trí cell cố định. Khi bản ghi di chuyển trong cùng page để dọn chỗ, engine có thể cập nhật slot mà không phải thay mọi tham chiếu bên ngoài tới vị trí dữ liệu đó. Bố cục cụ thể khác nhau giữa các engine.

Một cell chứa các trường đã mã hóa. Giá trị số có thể dùng biểu diễn nhị phân; chuỗi có thể cần độ dài và encoding; giá trị nullable cần cách đánh dấu null; cờ có thể được đóng gói để tiết kiệm chỗ. Định dạng phải hỗ trợ đọc đúng qua thay đổi phiên bản và phát hiện lỗi như page bị hỏng. Vì vậy file format, checksum, alignment và quy tắc nâng cấp là một phần của thiết kế storage, không phải chi tiết trang trí.

Nếu một giá trị variable-length không vừa page, engine có thể lưu phần lớn nội dung ở vùng ngoài trang và giữ con trỏ hoặc metadata trong bản ghi chính. Cách làm này giúp giới hạn kích thước tuple/page nhưng có thể khiến một truy vấn phải đọc thêm I/O. PostgreSQL dùng TOAST cho các giá trị lớn; các hệ khác có cơ chế riêng.

## Index là một cấu trúc lưu trữ khác

Index không phải danh sách miễn phí gắn bên ngoài bảng. Nó là cấu trúc dữ liệu có page riêng, khóa sắp xếp hoặc bucket, con trỏ tới dòng, metadata và chi phí bảo trì. Tùy engine, bảng có thể là heap riêng với secondary index trỏ tới tuple, hoặc dữ liệu của bảng được tổ chức theo primary index. Secondary index khi đó có thể trỏ tới khóa chính thay vì vị trí dòng trực tiếp.

Điều này giải thích vì sao primary key rộng có thể làm nhiều secondary index lớn hơn trong một số engine, và vì sao thay đổi index cần ghi thêm dữ liệu. Chi tiết phụ thuộc sản phẩm: ví dụ InnoDB tổ chức dữ liệu bảng theo clustered index, còn PostgreSQL heap và index có vòng đời riêng. Phần [B-tree và index](../database/btree-indexes-and-maintenance/) đi tiếp vào cách cấu trúc index tìm khóa.

### Data file có thể tổ chức theo heap, hash hoặc key order

Data file có thể là **heap** (record thường theo thứ tự ghi), **hash-organized** (bucket chọn theo hash key), hoặc **index-organized** (record nằm trong cây theo key). Heap append thuận tiện nhưng cần index để tìm; hash thuận equality nhưng không có range order; index-organized hỗ trợ range theo key nhưng insert/update phải giữ cây.

### Index file và record locator

Secondary index có thể trỏ trực tiếp tới offset/row locator, hoặc lưu primary key rồi đi qua primary index. Con trỏ trực tiếp giảm một bước read nhưng phải cập nhật khi record di chuyển; indirection tốn thêm lookup nhưng cho phép tầng storage di chuyển record mà ít sửa mọi secondary index. Đây là trade-off giữa read path và write/maintenance cost. InnoDB dùng clustered primary index làm cấu trúc row chính; PostgreSQL heap và index là các relation riêng.


### Primary index có thể tạo thêm một bước indirection

Tên gọi **primary key** và **primary index** mô tả hai việc khác nhau. Primary key là quy tắc ở mức dữ liệu: giá trị phải định danh duy nhất một dòng. Primary index là cấu trúc vật lý giúp tìm dòng theo khóa đó hoặc theo khóa được engine chọn làm đường truy cập chính. Nhiều hệ thống dùng primary key để dựng primary index, nhưng ràng buộc SQL và cách lưu page không phải một.

### Clustered order và vị trí vật lý của row

**Clustered** mô tả quan hệ giữa thứ tự của index và vị trí các dòng. Khi các dòng được đặt theo thứ tự của một search key, index đó clustered theo key ấy; index không quyết định thứ tự vật lý của dòng được gọi là nonclustered hoặc unclustered trong ngữ cảnh tương ứng. Index-organized table đặt dòng ngay trong cấu trúc index nên clustered theo khóa tổ chức. Một engine khác có thể giữ heap riêng nhưng vẫn cố duy trì locality theo một index. Thuật ngữ có khác biệt giữa sản phẩm, vì vậy khi đọc tài liệu cần xem nó nói về thứ tự dòng, leaf chứa payload hay cách secondary index trỏ tới dòng.

Nếu index được tổ chức theo key nhưng dữ liệu nằm ở file riêng, index entry cần đủ thông tin để định vị record: có thể là offset, row locator hoặc bucket ID. Khi record được dời, offset cũ có thể mất hiệu lực. Một tầng indirection qua primary key giảm số nơi phải sửa lúc di chuyển dữ liệu, đổi lại truy vấn secondary index có thể cần thêm một lần tra. Một số thiết kế lai lưu cả offset và key: thử offset trước, rồi fallback qua key nếu vị trí đã thay đổi. Đây là quyết định về chi phí đọc so với chi phí cập nhật index, không có lựa chọn tối ưu cho mọi workload.

### Update và delete có thể để lại phiên bản cũ

Không phải storage engine nào cũng sửa hoặc xóa ngay byte cũ trong page. Với một số cấu trúc log-structured, lần cập nhật tạo entry mới cho cùng key; lần xóa tạo **tombstone** chứa key cùng thông tin phiên bản hoặc thời điểm. Khi đọc, engine phải chọn giá trị mới nhất còn hợp lệ và không để bản cũ hiện lại chỉ vì nó nằm ở file khác.

Phần dữ liệu bị bản mới che khuất vẫn chiếm chỗ cho tới khi quá trình dọn dẹp đọc các vùng liên quan, giữ lại phiên bản còn sống, rồi ghi chúng sang vùng mới. LSM gọi phần việc này là compaction; cấu trúc khác có cơ chế thu hồi riêng. Vì thế một phép `DELETE` có thể hoàn tất với marker nhỏ, trong khi thu hồi dung lượng diễn ra sau đó. Nếu dọn tombstone quá sớm khi replica hoặc run cũ vẫn còn bản ghi trước đó, dữ liệu đã xóa có thể xuất hiện lại.
## Ba trục để so sánh storage engine

Thay vì chỉ học tên cấu trúc, hãy hỏi ba câu:

| Trục | Câu hỏi | Đánh đổi thường gặp |
| --- | --- | --- |
| Buffering | Có gom write trong memory trước khi flush block không? | Batch amortize I/O nhưng phần chưa flush cần log/recovery và dùng memory. |
| Mutability | Page/file được sửa tại chỗ hay tạo immutable run/page mới? | In-place giảm copy nhưng cần concurrency/recovery; immutable hỗ trợ snapshot nhưng cần merge/GC. |
| Ordering | Record được lưu theo key hay insertion/append order? | Theo key hỗ trợ range scan; append order thuận cho ghi tuần tự nhưng query cần index/merge khác. |

Ba trục tương đối độc lập: B-tree có thể dùng buffering; Bw-tree lấy cảm hứng B-tree nhưng dùng immutable delta; LSM kết hợp memtable, immutable sorted files và compaction. Chúng giúp giải thích vì sao hai engine cùng gọi index là B-tree vẫn có write path và maintenance rất khác nhau.

## Bộ nhớ đệm thay đổi số lần chạm storage

Database thường giữ page trong buffer cache để tránh đọc lại từ thiết bị. Nếu truy vấn cần page đang có trong cache, đó là cache hit. Nếu chưa có, engine phải đọc page; khi cache đầy, nó cần chọn page có thể loại bỏ. Cơ chế này giúp cả thiết bị chậm hơn RAM lẫn SSD nhanh hơn RAM, vì I/O vẫn có latency và bandwidth hữu hạn.

Một truy vấn đọc 100 dòng không nhất thiết tạo 100 lần đọc đĩa. Nhiều dòng có thể nằm chung page, page có thể đã ở cache, và access pattern có thể đọc tuần tự. Ngược lại, index lookup rời rạc trên nhiều page có thể gây nhiều cache miss dù tổng số dòng trả về nhỏ. Để hiểu hiệu năng, cần phân biệt số dòng logic với số page thực sự được chạm.

## Dữ liệu logic không tiết lộ hết bố cục vật lý

Hai bảng có cùng schema SQL vẫn có thể dùng layout, page size, nén và cách định vị khác nhau. Bố cục vật lý ảnh hưởng tới write amplification, locality, cache hit, khả năng nén, kích thước index và công việc vacuum/compaction.

Khi chẩn đoán, bắt đầu từ workload: truy vấn cần những cột nào, lọc theo khóa nào, đọc tuần tự hay nhảy giữa page, ghi theo thứ tự hay ngẫu nhiên, và cập nhật có làm dòng lớn lên không? Sau đó mới xem thống kê cache, I/O, kích thước index và trạng thái storage của đúng engine. Đừng suy ra một cấu hình tối ưu chỉ từ sơ đồ bảng.

Nguồn nền tảng: *Database Internals*, chương 1 và 3; *PostgreSQL 14 Internals*, phần giới thiệu về file, page, tuple và TOAST.

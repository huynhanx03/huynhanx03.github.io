---
title: "Tối ưu MySQL ở tầng ứng dụng và cache"
category: "Database"
description: "Theo dấu request qua web, application và MySQL; giảm round trip, chọn cache có lợi và đặt mỗi workload vào đúng thành phần."
updated: 2026-10-18
translationKey: "database/mysql-application-optimization-and-caching"
---

Một query chạy trong 5 ms không đảm bảo request hoàn thành trong 5 ms. Request còn phải qua browser, web server, hàng đợi, connection pool, nhiều round trip, xử lý dữ liệu và truyền response. Nếu MySQL chỉ chiếm một phần nhỏ của tổng latency, tối ưu thêm index sẽ không cải thiện đáng kể điều người dùng cảm nhận.

## Bắt đầu từ request người dùng đang chờ

Đặt một trace hoặc timeline cho request: thời gian ở gateway/web server, queue, chờ connection, từng lượt tới MySQL, xử lý application, gọi dịch vụ khác và gửi response. Dùng correlation ID để liên kết các tầng, sampling để tránh ghi mọi request với chi phí lớn, và không đưa secret hoặc dữ liệu nhạy cảm vào log.

Phân biệt **thời gian phục vụ** với **thời gian chờ**. Query có thể chỉ chạy 8 ms nhưng nằm 300 ms trong pool queue; một API có thể không chờ database mà bị chậm khi serializing payload; browser có thể mất thời gian render sau khi server đã trả lời. Đo p50, p95 và p99 cùng throughput/error rate: average có thể che giấu những request ít gặp nhưng gây timeout.

Khi tìm thấy tầng chậm, xác định nguyên nhân bằng dữ liệu thay vì suy đoán. Nếu MySQL dùng 20% request time, giảm một nửa thời gian query chỉ tiết kiệm 10% tổng latency theo Amdahl’s law. Nếu phần chậm là connection queue hoặc mạng, thay đổi index sẽ không sửa nó.

## Câu hỏi ở tầng application trước khi scale

Kiểm tra xem ứng dụng có tạo quá nhiều process/worker, giữ chúng lâu hơn cần thiết, lấy nhiều dữ liệu hơn màn hình dùng, hoặc làm công việc sai tầng hay không. Một endpoint lấy 1.000 dòng rồi hiển thị 10 có thể đang overfetch; nhưng nếu 990 dòng còn lại được dùng lại trong cùng request hoặc được đưa vào cache có chủ đích thì việc lấy thêm có thể hợp lý. Đo bytes, CPU, query count và latency để chọn. Tái sử dụng kết nối khi phù hợp và tránh round trip chỉ để ping trước query, chọn lại database hay gửi thiết lập đã có thể cấu hình mặc định trong driver. Ví dụ `SET NAMES` và Java driver trong sách thuộc thời kỳ xuất bản; ngày nay hãy đặt charset qua API/client config được hỗ trợ và xác nhận liveness bằng health check phù hợp, không thêm query thăm dò trước từng thao tác.

Đặt công việc đúng nơi. Database làm tốt việc lọc, join và aggregate dữ liệu gần nơi lưu trữ. Application có thể phù hợp hơn cho regular expression phức tạp, định dạng response hoặc logic cần nhiều service. “Đẩy hết vào SQL” và “đưa hết ra application” đều có thể làm nhiều dữ liệu đi qua mạng hơn, tăng lock hoặc tốn CPU.

## Số query không phải mục tiêu độc lập

**N+1 query** xảy ra khi ứng dụng lấy danh sách bản ghi rồi gửi thêm query cho từng bản ghi. Với 50 đơn hàng, một query lấy danh sách cộng 50 query lấy dòng hàng tạo 51 round trip. Join, batch fetch hoặc data loader có thể giảm số lượt mạng và tận dụng khả năng join của database.

Nhưng mục tiêu không phải luôn là ít query nhất. Một join nhiều collection có thể nhân bản row, tạo payload lớn và làm khó cache từng đối tượng. Có trường hợp tách thành vài query batch giúp tránh lock, giữ cache granular hơn hoặc chạy những phần độc lập song song. So sánh tổng bytes, round trip, execution plan, xử lý app và khả năng nhất quán, không chỉ đếm câu SQL.

Với ORM, hãy kiểm tra SQL thật được tạo ra. Lazy loading trong vòng lặp, implicit query khi truy cập property, `SELECT *`, pagination sâu và count không cần thiết thường ẩn chi phí. Log query digest hoặc trace theo endpoint để biết request nào tạo nhiều query và dữ liệu nào được bỏ đi.

## Connection pool vừa giảm overhead vừa giữ trạng thái

Pool tái sử dụng kết nối và giới hạn số session cạnh tranh trên MySQL. Pool quá nhỏ tạo hàng đợi trong application; pool quá lớn làm tăng context switching, bộ nhớ theo connection, số transaction đồng thời và contention. Kích thước pool nên dựa trên throughput và thời gian phục vụ thực tế, không lấy số worker ứng dụng làm mặc định.

Đo pool wait, số kết nối active/idle, timeout, transaction duration và queue length. Nếu request giữ connection trong khi gọi API khác hoặc xử lý file, pool bị chiếm dù MySQL đang rảnh. Điều này càng dễ gặp khi mỗi worker giữ sẵn kết nối tới nhiều database server nhưng tại một thời điểm chỉ dùng một nơi; gom thao tác theo server và nhả kết nối trước công việc chờ lâu để tránh giữ chỗ vô ích. Giữ transaction ngắn và chỉ mượn connection khi chuẩn bị chạy SQL.

Connection là một session có trạng thái: transaction mở, temporary table, session variable, isolation level, SQL mode, user variable, prepared statement và advisory lock. Khi trả connection về pool, ứng dụng cần commit/rollback đúng và reset trạng thái cần thiết. Nếu không, request sau có thể nhận session còn transaction hoặc thiết lập của request trước. Pool theo tenant hoặc workload cũng cần giới hạn công bằng để một nhóm không chiếm hết connection.

Kết nối dài hạn giảm handshake lặp, nhưng giữ quá nhiều connection nhàn rỗi có thể dùng tài nguyên và làm lộ session state lâu hơn. Pooling là cách quản lý có giới hạn; “persistent connection” không nên có nghĩa mỗi worker mở một kết nối vô thời hạn mà không có sizing, health check, timeout và recycle. Hãy đo chi phí connect trong môi trường thật trước khi chọn.

| Cách dùng | Connection tồn tại thế nào? | Lợi ích chính | Rủi ro cần quản lý |
| --- | --- | --- | --- |
| Mở mới cho mỗi lần dùng | Tạo rồi đóng sau request/thao tác | Ít trạng thái sống sót giữa caller | Handshake/DNS/port churn; có thể tốn khi request nhiều |
| Persistent theo worker | Mỗi process giữ connection của riêng nó | Bỏ bớt chi phí connect khi worker dùng lại thường xuyên | Connection nhàn rỗi bị nhân theo số worker/server; session state tồn tại lâu |
| Connection pool | Một nhóm connection có giới hạn được mượn/trả cho request | Giới hạn session đồng thời và chia sẻ connection | Queue khi pool nhỏ; lộ transaction/temp table/setting nếu trả connection chưa reset |

Sách xem persistent connection chỉ hợp trong một số trường hợp đặc biệt: connect qua mạng chậm, mỗi kết nối chỉ phục vụ một hoặc hai query rất nhanh nhưng được mở thường xuyên, hoặc client sắp cạn ephemeral port. Đây là dấu hiệu để đo đúng chi phí kết nối, không phải lý do bật persistent mặc định. Nếu bottleneck nằm ở phân giải tên, thread cache hay backlog, hãy xử lý đúng tầng và đối chiếu tài liệu của phiên bản MySQL hiện hành.

Timeout và retry cần được thiết kế cùng pool. Nếu database chậm, request timeout rồi retry ngay có thể tạo retry storm và làm queue lớn hơn. Dùng deadline end-to-end, retry có giới hạn/jitter, backpressure và circuit breaker phù hợp. Một transaction mất kết nối sau khi gửi COMMIT có kết quả không xác định với client; cần idempotency key hoặc đọc lại trạng thái nghiệp vụ trước khi thử lại.

## Web tier có thể giới hạn database trước cả MySQL

Worker web tiêu thụ RAM và CPU. Nếu mỗi process chứa runtime nặng, tạo quá nhiều worker sẽ gây áp lực bộ nhớ; một request static có thể chiếm worker đắt như request động. Tách static delivery khỏi dynamic application, giới hạn concurrency theo capacity và xem worker đang chờ client hay đang thực thi code.

Keep-alive hữu ích vì tái sử dụng kết nối HTTP, nhưng một client gửi/đọc rất chậm có thể chiếm worker nếu server model và timeout không phù hợp. Buffering ở proxy/reverse proxy giúp ứng dụng hoàn tất response nhanh rồi để lớp ngoài gửi dần; event-driven server có thể xử lý nhiều kết nối chờ với ít worker hơn. Chọn theo workload, không theo tên sản phẩm.

Giảm bytes cũng giảm network time: nén response dạng text khi tổng chi phí CPU thấp hơn lợi ích băng thông; cache asset tĩnh ở browser/CDN/proxy; version filename hoặc content hash để cache lâu mà deploy mới vẫn đổi URL. Đặt expiration và invalidation rõ ràng. Cache quá lâu không có versioning làm client dùng HTML, CSS và JavaScript thuộc các release khác nhau.

## Concurrency cao có thể làm latency tệ hơn

Concurrency là số request đồng thời, không phải tốc độ xử lý. Hãy hình dung một CPU cần một giây để xử lý mỗi request và nhận 100 request cùng lúc. Nếu xử lý lần lượt, throughput là một request mỗi giây và request cuối chờ lâu; nếu chia thời gian CPU cho 100 request, tổng công việc vẫn là 100 giây, nhưng nhiều request đều tiến triển chậm và context switching còn thêm chi phí.

Trong hệ thống thật, một số request đang chờ I/O nên concurrency có thể giúp che latency; nhưng khi CPU, storage hoặc database đã bão hòa, tăng concurrency chủ yếu tạo queue. Sau điểm throughput đạt đỉnh, latency thường tăng nhanh trong khi throughput đứng yên hoặc giảm. Thử nhiều giới hạn concurrency với workload đại diện, giữ điều kiện warmup ổn định, và chọn điểm thỏa SLO chứ không chỉ điểm có request đồng thời nhiều nhất.

## Cache chỉ đáng dùng khi tiết kiệm lớn hơn chi phí

Cache có chi phí lookup, serialize, network, memory, write/update và invalidation. Nếu gộp chi phí đọc cache thành `Cread`, mô hình cho một request là:

`Cwith = Cread + P(hit) × Ccache-response + P(miss) × (Corigin + Cstore) + Cinvalidation-amortized`

`Corigin` là chi phí tạo dữ liệu ở hệ nguồn; `Cstore` gồm serialize và ghi cache khi miss; `Cinvalidation-amortized` phân bổ chi phí làm mới/xóa theo thời gian. Cùng đo ở một đơn vị như latency hoặc CPU cost. Không nên so một cache hit riêng với một lần query nguồn nếu phép đo bỏ qua miss và công việc cập nhật.

Ví dụ: origin mất 8 ms, cache read mất 0,2 ms, trả object từ cache thêm 0,3 ms, ghi cache khi miss tốn 0,2 ms; hit rate là 90%. Trung bình xấp xỉ `0,2 + 0,9×0,3 + 0,1×(8+0,2) = 1,29 ms`, thấp hơn 8 ms nếu không cache. Nhưng nếu cache mất, origin vẫn phải chịu tải của toàn bộ request; lợi ích trung bình không nói rằng miss path hoặc cache outage là rẻ.

Chỉ thêm cache nếu tổng này thấp hơn việc tạo và trả dữ liệu mỗi lần, và độ cũ của kết quả phù hợp yêu cầu. Cache trong process/local memory thường nhanh nhưng khó đồng bộ giữa nhiều node; distributed memory như Redis/memcached lớn và chia sẻ được nhưng thêm network/availability; cache trên disk hợp nội dung lớn, bền hoặc tĩnh nhưng không nhất thiết nhanh hơn server memory. Cache gần người dùng thường giảm nhiều chặng hơn, nhưng có thể khó purge hoặc mang dữ liệu riêng tư ra nhiều biên.

### Từ cache của database tới cache application

Cache có thể nằm ngay trong MySQL hoặc ở các tầng phía trên. Buffer pool giữ page để giảm đọc storage; cache/summary table do ứng dụng duy trì có thể sống qua lần restart và được thiết kế để lọc, sort, join hay đếm nhanh.

Cache ở tầng application còn có thể lưu kết quả đã xử lý một phần, như đoạn HTML headline, nên cache hit tiết kiệm cả việc đọc dữ liệu lẫn việc dựng nội dung. Đổi lại, nhiều biến thể theo khu vực hay người dùng cần thêm memory, làm hit rate từng biến thể thấp hơn và khiến dependency khó invalidate hơn. Một map trong request cũng có thể memoize lookup bị lặp lại mà không cần thêm round trip tới cache service.

Một **passive cache** chỉ trả object nếu có sẵn, nếu không báo miss; application phải tự tạo dữ liệu rồi lưu lại. Một **active cache** che giấu đường miss: nó chuyển request tới origin để tạo kết quả, lưu kết quả rồi trả về. Reverse proxy là ví dụ active; ứng dụng cũng có thể xây đường này quanh một cache passive. Active cache giảm logic lặp trong caller, nhưng origin chậm hoặc cache miss đồng loạt vẫn có thể tạo tải dồn.

### Chọn nơi đặt cache

Cache ở browser hoặc CDN có thể tránh cả request tới origin; reverse proxy giúp nhiều user dùng chung response. Cache trong process có lookup nhanh nhưng mỗi worker có thể giữ một bản khác nhau, thường chỉ tồn tại trong request/process, và mất dữ liệu khi process restart.

Shared memory trên cùng máy cho phép nhiều process web dùng chung một bản nhỏ, chẳng hạn danh sách ít đổi hoặc bảng ánh xạ shard, nhưng không tự đồng bộ sang máy khác. Distributed memory như memcached hoặc Redis dễ mở rộng và tránh nhân bản cùng object trên từng host, đổi lại mỗi lookup đi qua mạng và phụ thuộc thêm một service. Khi thêm/bớt node cache, cần có cách phân phối lại key để tránh làm xáo trộn quá nhiều object; consistent hashing giảm lượng key phải chuyển nhưng không loại bỏ việc xử lý node lỗi.

Disk cache hợp object lớn, khó giữ trong RAM hoặc nội dung tĩnh cần tồn tại lâu hơn process. Chọn tầng gần client nhất đáp ứng freshness, kích thước, khả năng purge và độ sẵn sàng cần thiết; nếu ghép nhiều tầng thì phải định nghĩa cách chúng hết hạn cùng nhau.

Chọn object và key theo dependency. Cache toàn trang dễ phục vụ nhưng thay đổi một giá có thể buộc dựng lại nhiều trang. Cache ID danh sách kết quả rồi cache từng sản phẩm tránh lặp object và cho phép invalidate theo sản phẩm; đổi lại phải lấy danh sách ID rồi fetch nhiều object. Gộp lần fetch bằng multi-get giúp tránh biến một cache hit thành hàng trăm round trip. Sách nêu ước lượng cũ khoảng 0,3 ms mỗi lượt tới cache và kể trang có khoảng 1.000 lượt đọc tuần tự; phép nhân 0,3 ms × 1.000 là 0,3 giây, không phải 3 giây như con số ở trang kế tiếp của sách. Nếu các lượt đọc chạy song song hoặc được gộp, wall-clock latency không bằng tổng đơn giản này. Hãy giữ bài học về số round trip và batching, không dùng các con số xuất bản thời đó làm benchmark hiện nay. Cache hierarchy có thể đặt L1 local nhỏ trước L2 distributed; cần chấp nhận hai tầng có thể có phiên bản khác nhau và xác định invalidation/TTL giữa chúng.

### Cache invalidation và miss path

Invalidate khi ghi có thể làm một lần ghi phải xóa hàng triệu object phụ thuộc. Có hai cách cập nhật tường minh: **write-invalidate** đánh dấu bản cache cũ hết hạn để lần đọc sau tạo lại; **write-update** ghi luôn dữ liệu mới vào cache, hữu ích khi writer đã có sẵn kết quả đắt tiền. Job nền cũng có thể làm mới object trước khi user cần.

Kiểm tra freshness khi đọc hoặc gắn version/timestamp vào object có thể dàn chi phí ra nhiều request, nhưng mỗi lần đọc thêm một bước kiểm tra. Ví dụ trong sách: cache `blog_stats` với `user_version=0`; khi user đăng bài, tăng version lên 1. Lần đọc sau so version của thống kê với version user; lệch thì tính lại. Version đặt ở phạm vi user rất đơn giản nhưng có thể invalidated rộng hơn cần thiết: sửa nội dung một bài cũng có thể làm mới thống kê chỉ đếm số bài. Khi object phụ thuộc nhiều nguồn, lưu version từng dependency — như `user_ver=1234` và `book_ver=5678` cho danh sách bình luận — rồi refresh khi một trong hai đổi. Version phải đến từ nguồn đủ tin cậy; nếu cả version lẫn object chỉ được đọc từ cache cũ, phép so sánh có thể xác nhận nhầm một dữ liệu đã stale.

Với search result đã cache bằng danh sách ID, một sản phẩm có thể vẫn còn trong danh sách dù nội dung mới không còn khớp từ khóa. Nếu việc membership chính xác quan trọng, phải kiểm tra version hoặc chạy lại search.

TTL giúp giới hạn tuổi cache nhưng không đảm bảo freshness ngay lập tức. TTL đồng bộ trên nhiều key có thể tạo cache stampede; thêm jitter, single-flight/coalescing, stale-while-revalidate hoặc refresh nền. Nếu cache mất và hit rate trước đó là 90%, database có thể nhận lượng việc đọc lớn gấp khoảng mười lần. Đo tải khi cache trống, đặt giới hạn fallback và xác định chức năng nào có thể degraded.

Miss path cũng là một phần của latency. Nếu cache miss phải tạo một báo cáo mất 30 giây, latency trung bình có thể đẹp nhưng một nhóm user chịu trải nghiệm rất tệ. Pregenerate nội dung bằng job nền, giữ stale version để phục vụ trong lúc refresh, hoặc tính trước phần chung. Pre-generation làm miss path ngắn hoặc loại bỏ nó, đồng thời tránh nhiều request cùng đổ vào tạo lại một object vừa hết hạn; chỉ nên tạo trước phần được yêu cầu nhiều hoặc tốn kém vì làm vậy cần memory/disk và tài nguyên build. Cần kiểm tra freshness, queue backlog và hành vi khi job lỗi.

Disk cache hữu ích với object lớn hoặc nội dung tĩnh khó giữ trong RAM. Một cách trong sách là cho web server gọi error handler khi URL ảnh sinh động chưa có file: handler tạo ảnh, ghi file rồi trả nội dung hoặc redirect; request sau đọc file đã có. Cùng ý tưởng có thể dùng cho JavaScript chứa headline được sinh sẵn. Cách này cần xử lý đồng thời khi nhiều request cùng tạo key, ghi file theo kiểu an toàn, giới hạn dung lượng, TTL/purge và bảo vệ đường dẫn. Nếu muốn LRU theo thời điểm truy cập, filesystem phải ghi nhận access time; sách lưu ý việc đó có thể tăng I/O và gợi ý dùng filesystem trong RAM cho kiểu cache này. Filesystem cache không tự có chính sách LRU hay invalidation đúng.

## Chọn đúng thành phần cho từng loại công việc

MySQL là hệ quản trị quan hệ/OLTP đa dụng, không phải lựa chọn tốt nhất cho mọi loại truy cập. Lưu file ảnh lớn trong BLOB có thể làm backup, replication và đường đọc phức tạp; filesystem/object storage có thể phù hợp hơn, còn metadata và quyền truy cập vẫn ở MySQL. Đổi lại, một số hệ thống dùng MySQL replication để phân phối ảnh tới nhiều máy, nên lựa chọn còn tùy đường phục vụ và vận hành.

Full-text search và ranking thường hợp với inverted index chuyên dụng như Lucene/Sphinx hơn truy vấn quan hệ thuần. Với NDB Cluster, sách nêu NDB API như một đường truy cập cho dữ liệu hẹp như session hoặc đăng ký user, dù không nhất thiết phù hợp để thay toàn bộ database ứng dụng.

Sách cũng kể trường hợp chuyển key-value ghi tốc độ cao sang Redis vì replica MySQL tụt lại dù primary vẫn xử lý được, và dùng Redis cho queue; đây là trải nghiệm theo workload và thời kỳ xuất bản, không phải bằng chứng Redis luôn nhanh hơn. Hadoop có thể xử lý tập dữ liệu lớn hoặc bán cấu trúc cùng MySQL trong một kiến trúc lai. Với graph traversal hay tree relationship, mô hình quan hệ cũng có thể không phải cách thể hiện phù hợp nhất.

Tách workload đem thêm ranh giới consistency. Nếu ảnh upload thành công nhưng transaction lưu metadata rollback, cần dọn object mồ côi hoặc retry. Nếu Redis queue chứa job mà MySQL transaction chưa commit, worker có thể không tìm thấy dữ liệu; transactional outbox hoặc quy trình reconciliation có thể cần thiết. Một component mới còn cần backup, capacity, security, monitoring và người trực. So sánh tổng chi phí và lỗi vận hành với việc giữ workload trong MySQL.

Sách mô tả HandlerSocket và memcached protocol access vào InnoDB như cách bỏ qua một phần SQL/server path; đó là ví dụ lịch sử theo phiên bản MySQL 5.6. Đừng chọn plugin cũ chỉ vì benchmark QPS cao. Nếu cân nhắc access path đặc biệt, kiểm tra hỗ trợ release, transaction semantics, quyền, observability, client ecosystem và khả năng bảo trì. MySQL X Protocol/Document Store hay một cache bên ngoài đều có tradeoff riêng; benchmark phải giữ cùng durability, key distribution và workload.

MySQL cũng cho phép mở rộng bằng storage engine chuyên biệt hoặc engine làm cầu nối tới hệ thống khác. Ví dụ SphinxSE trong sách đưa truy vấn tìm kiếm qua giao diện storage engine tới Sphinx. Đây là một ranh giới tích hợp khác với việc chỉ tạo plugin xử lý request: cần đánh giá semantics giao dịch, lỗi khi hệ thống phía sau không sẵn sàng, khả năng tương thích phiên bản và công cụ vận hành trước khi chọn.

## Search engine là read model được build từ dữ liệu gốc

Appendix F dùng Sphinx để minh họa một nguyên tắc còn hữu ích: search engine chuyên dụng có thể giữ inverted index và thuộc tính phục vụ tìm kiếm, xếp hạng, filter, sort hoặc group nhanh; MySQL vẫn là nơi lưu dữ liệu giao dịch chuẩn. Sách mô tả Sphinx ở thời điểm xuất bản. Tài liệu công khai của Sphinx hiện ghi bản 2.2.11; với behavior và lựa chọn triển khai hiện hành, hãy đối chiếu manual của Manticore Search, dự án được tạo năm 2017 để tiếp nối Sphinx. Kiểm tra phiên bản, giao thức, bảo mật và đường migration; đừng mặc định API cũ, SphinxSE hay MySQL wire protocol là một ứng dụng MySQL đầy đủ.

Trong mô hình của sách, cấu hình data source xác định câu SQL lấy dữ liệu, còn index ánh xạ mỗi row thành document: khóa chính thành document ID ổn định, text thành field để lập chỉ mục, số/ngày thành attribute để filter hoặc sort. Search engine có thể giữ cấu trúc đảo và thuộc tính mà không giữ bản text gốc; vì thế kết quả thường chứa ID, score và attributes, còn nội dung hiển thị phải được hydrate từ MySQL theo lô. Credentials trong ví dụ config là minh họa cũ; không chép mật khẩu vào file cấu hình được commit.

Vì index search là dữ liệu dẫn xuất, thiết kế đường đồng bộ trước khi tối ưu tốc độ:

1. Chọn nguồn chuẩn, khóa định danh ổn định và trường nào được phép index.
2. Build snapshot với watermark/cursor rõ ràng; mọi document phải có version hoặc thời điểm cập nhật để xử lý thay đổi đến trong lúc build.
3. Bắt thay đổi sau watermark bằng CDC/binlog, outbox hoặc cơ chế replay phù hợp; xử lý delete bằng tombstone.
4. Build index mới riêng, so số document, sample fields, checksum/aggregate và query kết quả.
5. Chuyển alias/route sang index đã xác nhận; giữ index cũ đủ lâu để rollback. Theo dõi indexing lag và tính đầy đủ sau cutover.

Nếu chỉ chạy lại query `SELECT` định kỳ để reindex, cần biết snapshot có nhất quán hay không, MySQL chịu tải ra sao, và thay đổi nào bị bỏ lỡ giữa lần đọc. Ranged indexing theo ID giúp giới hạn query và áp back-pressure, nhưng ID tăng không đảm bảo thứ tự update hay bắt được delete. Các con số rebuild vài phút trong case study Sphinx của sách thuộc dataset/hardware cũ, không phải sizing hiện hành.

Sách mô tả mô hình `main + delta`: index lớn được rebuild ít thường xuyên, còn phần dữ liệu mới/thay đổi được đưa vào index nhỏ và cập nhật thường hơn; khi ghép kết quả phải xử lý document trùng và ưu tiên phiên bản mới. Ý tưởng này giúp hiểu tradeoff giữa freshness và chi phí rebuild, nhưng cấu hình index/rotation cụ thể phụ thuộc engine hiện dùng. Attribute thay đổi được có thể có đường cập nhật riêng trong một số engine; đừng nhầm việc cập nhật attribute với cập nhật nội dung full-text đã được token hóa.

## Trả kết quả search mà không tạo N+1

Search engine thường trả document ID, score và một số indexed attributes; nội dung chuẩn hoặc thông tin nhạy cảm có thể vẫn nằm trong MySQL. Lấy cả batch ID bằng một query như `WHERE id IN (...)`, sau đó dựng lại thứ tự theo danh sách ranking của search engine. Không chạy một query cho mỗi kết quả. Nếu dữ liệu thay đổi giữa lúc index và lúc hydrate, một ID có thể đã bị xóa hoặc không còn thỏa điều kiện nghiệp vụ; app phải định nghĩa rõ chấp nhận bỏ kết quả, retry hay refresh index.

Filter và sort trên attribute trong search index có thể giảm việc phải hydrate nhiều row, nhưng tạo một consistency boundary: giá/visibility/category có thể cũ hơn database chính. Với điều kiện liên quan quyền, tồn kho hoặc trạng thái bảo mật, xác thực lại ở nguồn chuẩn trước khi hiển thị hoặc thực thi hành động. Phân trang sâu cần cursor/search-after hoặc chiến lược phù hợp thay vì offset lớn; xác định behavior khi index được cập nhật giữa các trang.

## Ranking, attribute và filter tạo thành một query pipeline

Relevance không chỉ là số lần xuất hiện từ khóa. Sách giải thích phrase proximity: vị trí và khoảng cách giữa từ có thể đẩy một cụm từ khớp sát lên trên tài liệu chỉ lặp lại từng từ rời rạc; BM25 lại cân nhắc tần suất trong document và độ hiếm trong collection. Cách kết hợp và thứ tự ưu tiên là cấu hình engine, có chi phí CPU và không phù hợp như nhau với mọi truy vấn. Với tag cloud, chẳng hạn, vị trí kề nhau có thể không mang ý nghĩa. Chọn ranker bằng bộ truy vấn và kết quả kỳ vọng cụ thể.

Attributes là dữ liệu phụ có kiểu để sort/filter/group; multi-valued attribute (MVA) cho phép một document gắn nhiều ID như tag hay category. Filter trên attribute có thể loại ứng viên trước các bước ranking tốn kém, nhưng attribute trong index có thể cũ hơn nguồn chuẩn. Một tập giá trị rời rạc, chọn lọc đôi khi có thể biểu diễn như token/filter term, song chỉ nên làm sau khi đo và bảo đảm ngữ nghĩa không đổi. Snippet/highlight, collation, query expansion và cách token hóa ngôn ngữ cũng ảnh hưởng trực tiếp chất lượng kết quả.

## Facet, group và distributed search có thể mất độ chính xác

Full-text relevance, field filter và sort theo attribute là các nhiệm vụ khác nhau. Search engine có thể xử lý top-N hiệu quả vì nó chỉ cần giữ tập ứng viên giới hạn; nhưng group/facet phân tán có thể cần gửi aggregate thay vì mọi document. Giới hạn RAM, top-K mỗi shard, duplicate document, refresh lệch thời điểm hoặc approximate distinct có thể làm count không chính xác tuyệt đối. Nếu kết quả điều khiển tiền, quota hay kiểm kê, đừng dùng phép đếm approximate làm dữ liệu chuẩn.

Distributed search chạy nhiều shard song song rồi merge top results. Latency tổng thường chịu ảnh hưởng của shard chậm nhất, network và merge. Một query filter hẹp theo tenant có thể chỉ cần shard/partition phù hợp; query toàn cục phải fan-out. Có thể tách index theo thời gian nóng/lạnh, nhưng phải bảo đảm query bao phủ đúng khoảng và loại trùng ở biên. Nhiều daemon/partition có thể giảm phạm vi lỗi hoặc tăng mức song song, đồng thời làm tăng RAM, vận hành, fan-out và mức độ phức tạp của rebuild.

Khi ứng dụng cần nhiều result set trên cùng tập dữ liệu—chẳng hạn cùng một query nhưng sort khác nhau, hoặc sort kết hợp group—gửi chúng trong một multi-query nếu engine hỗ trợ. Engine có thể dùng chung lần đọc/scan và giảm round trip; không bảo đảm mọi engine đều thực thi song song hay cho cùng một lợi ích. Đo tổng CPU, latency và dữ liệu trả về thay vì suy từ số request giảm.

## Giới hạn tài nguyên và failure boundary

Indexing batch tranh CPU, network và I/O với MySQL; truy vấn tìm kiếm tranh tài nguyên với indexing trên search node. Giới hạn concurrency, batch size, thời gian query và tốc độ đọc nguồn; back-pressure khi search lag. Có timeout/fallback có chủ đích để search outage không làm cạn worker web hoặc tạo retry storm. Cache kết quả theo query có thể giảm tải cho nhóm phổ biến, nhưng phải xác định key, TTL, invalidation và khả năng kết quả cũ.

Đặt giới hạn riêng cho số query đồng thời và ngân sách từng query; giới hạn thời gian hoặc số candidate có thể giữ node khỏi bị một truy vấn nặng chiếm hết, nhưng đổi lại kết quả có thể thiếu hoặc bị dừng sớm. Điều tốc độ indexing bằng chunk/range, giới hạn kích thước batch và I/O để job rebuild không tranh cạn tài nguyên với truy vấn production. Các tên option trong sách thuộc Sphinx đời cũ; ánh xạ sang công cụ hiện tại theo tài liệu đúng phiên bản.

Đặt SLO riêng cho MySQL và search: indexing lag, freshness, query p95/p99, timeout, lỗi từng shard, document count, disk usage và thời gian rebuild. Search index thường có thể dựng lại, nhưng việc dựng lại phải nằm trong RTO thực tế và không làm database nguồn quá tải. Replica index tăng khả năng phục vụ, còn backup hoặc snapshot index giúp rút ngắn rebuild; cả hai cần test recovery.

## Bài học từ các case study cũ

Sách kể các ứng dụng dùng Sphinx để tìm full text, lọc nhiều thuộc tính, tính top-N/group phân tán, và dựng trước kết quả JOIN cho trang web. Bài học có thể giữ lại là đo trên workload thật: nhiều index ít chọn lọc có thể khiến write amplification ở database đắt; một search index chuyên dụng có thể là read model phù hợp; batching tránh round trip từng row; approximate result đôi khi đủ cho analytics; hot/cold partition có thể tận dụng locality. Các tên công ty, số lượng node, dữ liệu 1.5 TB, tỷ lệ cache hay hiệu năng trong sách là ảnh chụp lịch sử, không phải bằng chứng rằng sản phẩm hiện tại sẽ cho cùng kết quả.

Trước khi chọn search engine, so schema/query cần thiết, ngôn ngữ/tokenizer, cập nhật gần-real-time, exactness của facet, backup/rebuild, access control, tenancy, sharding, failure recovery và chi phí vận hành. Benchmark bằng query distribution, update rate, dữ liệu lệch, cold start và tail latency; so cả chi phí đồng bộ/recovery chứ không chỉ tốc độ một query.

## Quy trình tối ưu một endpoint

1. Ghi lại user-facing SLO, request volume và phân bố latency/error.
2. Trace mẫu request để tách queue, pool wait, DB, application, network và render.
3. Kiểm tra query count, rows/bytes đọc, payload trả, transaction duration và retry.
4. Sửa công việc thừa ở đúng tầng; xác minh execution plan/query result không đổi ngoài ý muốn.
5. Nếu thêm cache, mô tả key dependencies, freshness, invalidation, miss path, outage behavior và memory limit.
6. Chạy load test warm/cold với concurrency tăng dần; theo dõi throughput, p95/p99, queue và database load.
7. Triển khai có metric, rollback và kiểm tra sau phát hành; so sánh business SLO chứ không chỉ số query.

## Tự kiểm tra

**Ít query hơn luôn nhanh hơn?** Không. Bớt round trip có ích, nhưng join tạo row/payload dư hoặc query đơn lớn có thể tốn hơn vài batch nhỏ.

**Pool càng lớn càng tốt?** Không. Pool quá lớn làm tăng concurrency và contention; pool quá nhỏ lại xếp hàng ở application. Cần đo cả hai phía.

**Cache hit rate cao chứng minh cache hữu ích?** Không. Lookup, invalidation và độ cũ có thể tốn hơn tính lại; cache mất cũng có thể làm MySQL quá tải.

**Thêm Redis hoặc search engine chỉ là chuyện tốc độ?** Không. Bạn đang thêm một nguồn state, consistency boundary, backup và quy trình recovery.

Nguồn: *High Performance MySQL*, chương 14 và Appendix F. Các ví dụ Apache/mod_php, YSlow, HandlerSocket, Sphinx, NDB API và công cụ profiling trong sách phản ánh thời điểm xuất bản; dùng chúng như case study và chọn công cụ tương thích với stack hiện tại. Tài liệu Sphinx công khai là manual 2.2.11; Manticore xác nhận đây là dự án tiếp nối, nhưng đã phát triển độc lập. Xem [Sphinx 2.2.11 manual](https://sphinxsearch.com/docs/current.html), [Manticore installation/introduction](https://manual.manticoresearch.com/Installation/Installation), [Manticore distributed search](https://manual.manticoresearch.com/Searching/Distributed_searching), [MySQL full-text search](https://dev.mysql.com/doc/refman/8.4/en/fulltext-search.html), [replication](https://dev.mysql.com/doc/refman/8.4/en/replication.html), và tài liệu chính thức của web server/cache/client framework đang triển khai.

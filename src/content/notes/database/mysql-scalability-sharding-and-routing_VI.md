---
title: "Mở rộng MySQL: capacity, sharding và routing"
category: "Database"
description: "Phân biệt performance với scalability, chọn cách scale theo workload và thiết kế shard/routing để giữ truy vấn gần dữ liệu."
updated: 2026-10-17
translationKey: "database/mysql-scalability-sharding-and-routing"
---

Khi một website chậm, “mua thêm server” nghe có vẻ đơn giản. Nhưng nếu mọi request vẫn ghi vào một MySQL primary, thêm replica chỉ tăng chỗ đọc; nó không làm primary nhận được nhiều write hơn. Muốn chọn đúng hướng, trước tiên cần phân biệt ba câu hỏi: một request mất bao lâu, hệ thống xử lý được bao nhiêu request mỗi giây, và khi thêm tài nguyên thì throughput tăng được bao nhiêu.

## Performance, capacity và scalability là ba thứ khác nhau

**Performance** thường được nhìn qua response time của một request. **Capacity** là lượng công việc hệ thống xử lý được trong một khoảng thời gian mà latency và error vẫn nằm trong ngưỡng chấp nhận. Nếu tăng tải tới mức throughput tối đa nhưng p99 đã vượt SLA, đó không phải capacity có thể phục vụ production.

**Scalability** mô tả capacity thay đổi ra sao khi thêm tài nguyên. Nếu gấp đôi server chỉ tăng throughput 1,5 lần, hệ thống có scale nhưng không tuyến tính. Hai dạng chi phí thường làm kết quả kém đi: phần việc phải tuần tự hóa, và phần trao đổi/tranh chấp tăng giữa các worker. Ví dụ, nhiều worker cùng ghi vào một counter nóng có thể tranh lock; thêm shard theo tenant giúp giảm tranh chấp nếu tenant phân bố đều.

Universal Scalability Law là một mô hình giúp suy nghĩ về phần tuần tự và “crosstalk” giữa worker. Nó không dự báo chính xác mọi ứng dụng: working set có thể vượt RAM, một query có thể đổi độ phức tạp, hoặc cache vừa đủ làm hiệu năng tăng đột ngột. Dùng đường cong throughput–concurrency–node count để phát hiện điểm diminishing returns; coi mô hình là khung giải thích, rồi kiểm tra bằng workload thật.

Tải cũng không chỉ là số request. Dataset có thể tăng, một vài tenant có thể hoạt động hơn hẳn, một nhóm dữ liệu liên kết có thể cần được truy vấn cùng nhau, hoặc query mix thay đổi khi sản phẩm thêm tính năng. Trung bình đều nhau trên giấy không có nghĩa request trong thực tế đều nhau.

## Tăng một node trước khi chia dữ liệu

Trước khi sharding, tìm cách giảm lượng việc phải làm: sửa query đọc quá nhiều row, thêm index phù hợp, tránh N+1, batch round trip, giảm payload, cache dữ liệu có thể stale và archive dữ liệu ít dùng. Nếu workload vẫn phù hợp một node, tăng RAM, CPU hoặc storage có thể rẻ và dễ vận hành hơn nhiều node.

Scale up có giới hạn về giá, latency giữa các tài nguyên và mức sử dụng hiệu quả. Nhiều core chỉ giúp khi workload có thể chạy song song; chúng không tự làm một đoạn query tuần tự nhanh lên. Scale out bằng read replica phù hợp cho workload nhiều read, nhưng write vẫn đi vào source và đọc có thể stale. Scale out bằng sharding mới chia cả dữ liệu lẫn write work, đồng thời đưa routing, migration và consistency vào application.

Quy tắc thực tế là trì hoãn sharding tới khi có bằng chứng một node hoặc write workload đã chạm giới hạn kinh tế/kỹ thuật. Sharding làm những việc từng là một transaction, một JOIN hay một unique constraint thành bài toán nhiều node. Kiến trúc “phòng xa” quá sớm có thể khiến mỗi feature và lần deploy khó hơn trước khi hệ thống cần capacity đó.

## Shard key là quyết định về đường đi của query

Một shard là một đơn vị dữ liệu đặt trên một node; nhiều shard có thể cùng nằm trên một server. Function sharding tách các phần sản phẩm ít liên quan; data sharding tách các row theo một key. Hệ thống lớn thường dùng cả hai: ví dụ tách billing khỏi analytics, sau đó shard dữ liệu user của billing.

Shard key tốt trả lời được hai việc: row mới thuộc shard nào, và query cần tìm row thì đi tới đâu. Mục tiêu là query quan trọng chạm ít shard nhất mà dữ liệu vẫn cân bằng. Chọn key theo sơ đồ quan hệ và query thường gặp, không chỉ theo cột có nhiều giá trị. Nếu `user_id` quyết định hầu hết truy vấn, đặt user, profile và các post của user cùng shard giúp đọc một user bằng một lượt gọi.

Nhưng comment có thể được đọc theo `post_id`. Nếu comment chỉ được shard theo `user_id`, trang post có thể cần hỏi nhiều shard. Có vài lựa chọn: chấp nhận fan-out cho truy vấn ít dùng; lưu một bản rút gọn/index theo post ở shard khác; hoặc dùng hai data store với ownership rõ. Nhân đôi dữ liệu tăng write, consistency và repair work; chỉ làm nếu query cần thiết đủ quan trọng.

Các shard không nhất thiết phải có kích thước giống hệt nhau, nhưng cần tránh một shard quá nóng hoặc quá lớn. Tenant lớn có thể phá giả định hash phân bố đều. Đo số row, dung lượng, write rate, p95/p99 và query fan-out theo từng shard; average toàn hệ thống có thể che hotspot.

## Cấp shard: hash cố định hay directory động?

Với **fixed allocation**, hàm như `hash(tenant_id) % N` quyết định shard. Cách này nhanh, đơn giản và không cần directory lookup. Nhược điểm là đổi `N` làm nhiều key ánh xạ sang vị trí mới; khi data đã lớn, reshard có thể cần di chuyển phần lớn dữ liệu. Nếu dùng modulo trực tiếp, cân nhắc tạo nhiều logical buckets hơn số server rồi ánh xạ bucket sang node.

Với **dynamic allocation**, directory lưu `tenant_id → shard_id`. Có thể chuyển một tenant hoặc shard nhỏ sang node khác mà không đổi key. Đổi lại directory trở thành dependency cần cache, HA và consistency; cache mapping cũ có thể gửi write tới node không còn sở hữu dữ liệu.

Một chiến lược pha trộn dùng hash để chọn bucket rồi directory ánh xạ bucket tới node. Nó giữ số mapping nhỏ hơn map từng row, nhưng vẫn cho phép di chuyển bucket. Dù chọn cách nào, hãy tách khái niệm **logical shard** khỏi **physical node** để rebalance không buộc application biết topology cụ thể.

Nhiều ứng dụng còn cần dữ liệu global như currency, feature flag hoặc danh mục thành phố. Chỉ giữ global node nếu lưu lượng và mức sẵn sàng cho phép; nếu dữ liệu nhỏ, cache hoặc replicate có kiểm soát có thể tốt hơn. Tránh để mọi request shard phải gọi một directory/global database đang trở thành bottleneck mới.

## Những thứ sharding làm khó hơn

Foreign key không thể kiểm tra quan hệ giữa hai node như một transaction cục bộ. JOIN xuyên shard phải được chia thành nhiều query rồi ghép ở application hoặc một hệ phân tích khác. `COUNT`, sort, pagination và aggregate toàn hệ thống có thể phải fan-out tới nhiều shard, thu nhiều kết quả trung gian rồi merge. Đặt read model, summary table hoặc search index riêng nếu những truy vấn này quan trọng và lặp lại.

Transaction trong một shard vẫn có thể dùng InnoDB transaction. Transaction qua nhiều shard cần coordinator/2PC hoặc một quy trình eventual consistency như saga/outbox; cả hai đều phức tạp hơn. Nếu nghiệp vụ thường cần cập nhật nhiều entity cùng lúc, shard key nên đặt các entity đó gần nhau hoặc cân nhắc lại data model.

ID cũng cần được tạo mà không va chạm giữa node. Có thể dùng ID chứa shard/time component, range allocator, UUID/ULID hoặc dịch vụ cấp ID. Mỗi cách có trade-off: UUID rộng và có thể phân tán insertion trong B-tree; allocator tập trung có thể nghẽn; clock-based ID cần xử lý clock skew và rollback. Hãy xác định uniqueness scope, thứ tự cần thiết, index cost và hành vi khi node restart trước khi chọn.

Cross-shard retry cần idempotency. Khi timeout, application có thể không biết transaction đã commit ở shard hay chưa. Dùng request ID/dedup record và trạng thái có thể tra cứu; không giả định retry lại cùng request luôn vô hại.

## Di chuyển shard cần một quy trình cutover

Shard nhỏ dễ chuyển node và rebalance hơn một shard khổng lồ. Một lần di chuyển an toàn cần xác định owner hiện tại, tạo bản đích, copy snapshot, bắt kịp các thay đổi xảy ra trong lúc copy, chuyển routing ở một mốc nhất quán, rồi xác nhận read/write trước khi xóa bản cũ. Cơ chế cụ thể có thể là read-only window, change log, replication hoặc công cụ migration; invariant quan trọng là không mất write và không cho hai node cùng nhận write độc lập.

Giữ mapping có version hoặc generation để request cũ bị từ chối/redirect sau cutover. Chuẩn bị rollback route và điều kiện hủy trước khi bắt đầu. Theo dõi replication/copy lag, checksum, row count, latency và error; chỉ dọn nguồn khi đã qua thời gian xác nhận. Shard nhỏ hơn thường giúp di chuyển đơn giản hơn, nhưng quá nhiều shard tăng metadata, job bảo trì và fan-out.

## Load balancing phải hiểu database state

Load balancer có thể phân phối connection, nhưng một connection lâu dài có thể phục vụ nhiều query; số connection không phải lượng công việc. Random/round-robin dễ triển khai, least-connections có thể dồn connection mới vào server vừa khởi động với cache lạnh, còn “fastest response” bị đánh lừa bởi query mix hoặc replica lag. Health check chỉ kiểm tra port mở không đảm bảo server có thể nhận write hoặc applier đang theo kịp.

Application thường hiểu query và session tốt hơn proxy chung: route write về primary, read-only query tới replica phù hợp, giữ session trên cùng replica khi cần cache locality, và gửi read-after-write về source. Có thể dùng GTID wait hoặc version token để chờ replica đạt freshness cần thiết, kèm timeout rồi fallback. Không route mọi SELECT sang replica một cách mù quáng.

Khi đưa server mới vào pool, làm nóng cache và kiểm tra replication trước khi tăng traffic. Khi bỏ node, drain connection và transaction đang chạy thay vì cắt đột ngột. Hãy thử cả lúc server khỏe, replica trễ, node mất kết nối và một phần pool hỏng; load balancing có thể tăng availability nếu quyết định đúng, nhưng cũng có thể nhân tải lên node còn sống khi failover.

## Đọc sâu: mô hình scalability, phân bổ shard và fan-out

Universal Scalability Law (USL) mô hình hóa throughput tương đối khi tăng số worker/node `N`: `C(N) = N / (1 + σ(N−1) + κN(N−1))`. `σ` đại diện phần công việc phải tuần tự hóa; `κ` đại diện chi phí tương tác/crosstalk giữa các worker. Khi `κ` gần 0, seriality làm đường cong tiến tới bão hòa. Khi crosstalk đáng kể, thêm node có thể khiến throughput giảm sau một điểm. Đây là mô hình khớp đường benchmark, không phải cam kết của production; thay đổi working set, query mix, skew hoặc storage có thể làm đường cong đổi dạng. Đo throughput cùng p95/p99 ở nhiều mức concurrency/node và không extrapolate xa khỏi vùng đo.

### Chọn partition key từ truy vấn và quan hệ

Vẽ entity relationship cùng các query quan trọng để thấy dữ liệu nào cần được đọc/cập nhật cùng nhau. Quan hệ trong schema không bắt buộc phải shard cùng nhau nếu ứng dụng hiếm khi join; ngược lại, một truy vấn thường xuyên qua nhiều quan hệ là dấu hiệu các entity nên cùng shard. Partition key nên có thể xác định ngay khi insert, ổn định theo vòng đời dữ liệu và có trong query để định tuyến. Nếu key có thể đổi, một lần đổi key có thể tương đương di chuyển dữ liệu giữa shard.

Khi có hai chiều truy cập quan trọng, có thể cần bản sao được tổ chức theo key thứ hai: ví dụ dữ liệu gốc theo `user_id`, read projection theo `post_id`. Khi đó cần xác định bản nào authoritative, cách truyền cập nhật, cách phát hiện stale copy và quy trình rebuild. Không nhân đôi toàn bộ entity chỉ vì một báo cáo cần truy vấn khác; có thể dùng summary/read model hoặc fan-out có giới hạn.

Query fan-out có chi phí tăng theo số shard được hỏi, nhưng latency không luôn là tổng latency từng shard: nếu hỏi song song, thường bị chi phối bởi shard chậm nhất cộng thời gian merge. Tuy nhiên fan-out làm tăng tổng CPU/connection/IO, dễ tạo tail latency và khuếch đại một node chậm thành request chậm. Đặt giới hạn shard được hỏi, timeout từng nhánh, merge có thứ tự, xử lý partial failure rõ ràng và theo dõi số shard/request.

### Logical shard, physical node và chiến lược cấp phát

Fixed allocation ánh xạ key trực tiếp bằng hash/range/modulo. Nó không cần lookup nhưng thêm node thường buộc di chuyển nhiều key. Consistent hashing giảm lượng key đổi chủ nhưng cần xử lý virtual node, phân bố không đều, hot shard và rebalancing; nó không tự giải quyết thay đổi schema hay cutover an toàn.

Dynamic allocation dùng directory ánh xạ tenant/bucket tới node. Directory cho phép chuyển nhóm dữ liệu nhỏ mà giữ nguyên key, nhưng trở thành dữ liệu control-plane cần backup, HA, cache invalidation và cách xử lý mapping version. Hybrid thường hash vào nhiều logical bucket rồi map bucket sang physical node; đây là lớp gián tiếp giúp rebalance dần. Explicit allocation hữu ích khi tenant lớn cần pin thủ công, nhưng tăng thao tác vận hành và nguy cơ quy tắc đặc biệt bị quên.

Đặt nhiều logical shard trên một physical node giúp dời từng phần thay vì cả node. Có thể dùng database/table riêng, nhiều MySQL instance hoặc schema có shard identifier; lựa chọn ảnh hưởng giới hạn connection, buffer pool, backup, DDL và blast radius. Quá ít shard tạo đơn vị di chuyển lớn; quá nhiều shard làm tăng metadata, migration job, connection và query fan-out. Chọn kích thước theo tốc độ tăng dữ liệu và thời gian rebalance có thể chấp nhận.

Rebalance là migration có thể thất bại giữa chừng, không chỉ là phép tính lại hash. Quy trình thường là reserve destination, copy snapshot, stream delta/change log, xác minh, chuyển owner generation, chặn write tới owner cũ, rồi dọn sau thời gian an toàn. Phải xử lý retry và request đang bay qua cutover: generation/fencing token giúp node cũ từ chối lệnh sau khi mất ownership. Theo dõi copy lag và write amplification; chạy một shard nhỏ thử trước, có abort và rollback path.

### ID toàn cục và giao dịch xuyên shard

Global ID có thể lấy từ allocator trung tâm, cấp range theo batch, ghép node/shard bits, hoặc dùng UUID/ULID. Allocator trung tâm đơn giản nhưng phụ thuộc mạng và HA; batch giảm round trip nhưng bỏ phí số khi process chết; ID ghép node bits cần quản trị danh tính node và bit allocation; timestamp-based IDs có thể lệch/thứ tự bất thường khi clock skew hoặc clock rollback. UUID giảm phối hợp nhưng key dài và UUID ngẫu nhiên làm B-tree locality kém. Định nghĩa uniqueness cần toàn cục hay chỉ trong tenant/shard trước khi chọn.

Cross-shard transaction có thể dùng 2PC khi mọi participant và coordinator hỗ trợ semantics cần thiết, nhưng coordinator failure, lock duration và recovery làm vận hành phức tạp. Saga chia nghiệp vụ thành transaction cục bộ với bước bù; compensation không phải rollback vật lý và có thể thất bại riêng. Outbox đảm bảo event được ghi cùng transaction cục bộ rồi phát lại an toàn. Chọn theo invariant nghiệp vụ, khả năng chấp nhận trạng thái trung gian, idempotency và quy trình repair; tránh tuyên bố “exactly once” chỉ từ message broker.

## Scaling bằng consolidation, clustering và tách dữ liệu nguội

Consolidation gom nhiều service/database instance lên ít máy để tận dụng tài nguyên, giảm chi phí và có thể dùng flash/RAM hiệu quả hơn. Đổi lại, tranh chấp I/O/CPU, noisy neighbor và blast radius lớn hơn; virtualization overhead tùy công nghệ và thường lộ rõ hơn khi storage rất nhanh. Giới hạn từng instance, đo contention và kiểm tra một máy hỏng ảnh hưởng bao nhiêu workload.

Clustered SQL systems trong sách (NDB Cluster, Clustrix, ScaleBase, GenieDB, Akiban) là các ví dụ của thời điểm xuất bản, không phải một nhóm sản phẩm đồng nhất còn được khuyến nghị. Chúng khác nhau về shared-nothing, SQL compatibility, transaction/isolation, query pushdown, synchronous replication và giới hạn JOIN/aggregate. Khi đánh giá một distributed SQL/database product hiện nay, kiểm tra consistency/transaction semantics, failure domains, repartition, query planner, operational tooling, export path và workload benchmark thay vì suy ra khả năng chỉ từ “MySQL compatible”.

Scaling back cũng là một phần của kế hoạch. Archive hoặc tách dữ liệu ít truy cập giúp cache và index nóng gọn hơn, nhưng purge/archive phải giữ quan hệ cần thiết, quyền truy cập, retention pháp lý và khả năng restore. Có thể tách active/inactive rows bằng table/partition/read model, nhưng nếu mỗi query vẫn quét cả hai vùng thì lợi ích giảm. Lập kế hoạch chuyển dữ liệu ra trước khi storage hoặc index đã quá lớn.

## Các cách route request và giới hạn của health check

Route trực tiếp từ application cho phép biết transaction/session và quyết định read freshness, nhưng application phải quản lý topology, connection pool, retry và failover. DNS thay endpoint dễ triển khai nhưng client/resolver cache TTL có thể giữ IP cũ; thay IP/VIP nhanh hơn trong một số mạng nhưng phụ thuộc ARP, routing, fencing và nền tảng. Đừng dùng endpoint đổi được như cơ chế duy nhất để đảm bảo một writer.

Middleman/proxy tạo endpoint ổn định và có thể drain pool, kiểm tra node, pool connection hoặc tách read/write. Nhưng proxy không tự hiểu mọi SQL/session state; transaction đang mở, temporary table, prepared statement, user variable và connection affinity có thể khiến chuyển server giữa chừng sai semantics. Kiểm tra chính xác nó làm gì khi node chết và transaction chưa nhận được response: retry có thể chạy lặp write.

Round-robin phân phối lượt đều nhưng không theo tải; least-connections nhìn số connection chứ không phải query cost; weighted routing phản ánh khác biệt capacity; latency-based routing có thể ưu tiên node cache nóng nhưng bị đánh lừa bởi workload. Connection pooling và query-aware routing thường cần kết hợp. Health check nên kiểm tra vai trò, read-only/write readiness, replication freshness, disk pressure và khả năng xử lý query tối thiểu; tránh probe quá nặng hoặc biến probe thành tải đáng kể.

Khi thêm node, đưa vào trạng thái warm-up: sync schema, xác minh replication/GTID, cho cache đầy dần và tăng traffic theo bước. Khi loại node, stop nhận connection mới, chờ/drain transaction, theo dõi pool còn sống và mới tháo. Giữ capacity dự phòng để khi mất node, phần còn lại không bị đẩy qua điểm p99/error tăng vọt. Load balancer không tạo thêm capacity khi toàn pool đã bão hòa.

## Chọn bước mở rộng theo bằng chứng

1. Xác định loại tải đang chạm giới hạn: read, write, data size, tenant skew hay query toàn cục.
2. Dùng trace, query digest, host metrics và latency phân vị để tìm phần việc có thể bỏ hoặc giảm.
3. Tối ưu schema/query, giới hạn concurrency, cache hoặc archive khi phù hợp.
4. Thêm read replica nếu có thể chấp nhận consistency policy; đo lag và chi phí source gửi binlog.
5. Chỉ shard khi write/data đã vượt một node; chọn key từ query và ownership, định nghĩa ID, cross-shard operation, rebalance và recovery trước khi migrate.
6. Đo lại throughput và p95/p99 sau mỗi thay đổi, đồng thời thử lỗi và cache lạnh.

Nguồn: *High Performance MySQL*, ch. 11; [MySQL replication](https://dev.mysql.com/doc/refman/8.4/en/replication.html), [partitioning](https://dev.mysql.com/doc/refman/8.4/en/partitioning.html), [Group Replication](https://dev.mysql.com/doc/refman/8.4/en/group-replication.html). Sản phẩm sharding, cluster và load balancer được nêu trong sách có thể đã đổi trạng thái; chọn công cụ hiện hành theo feature, failure model và chi phí vận hành.

## Tự kiểm tra

**Thêm read replica có tăng write capacity không?** Không; nó giúp phân tải read, còn write vẫn được tạo ở source trừ khi dữ liệu được partition/shard.

**Shard key chỉ cần phân phối đều row?** Không; query thường dùng phải định tuyến tới ít shard, và key không được tạo hotspot.

**Hash modulo 16 có thể đổi thành modulo 32 mà không di chuyển dữ liệu?** Thường không; phần lớn key có thể đổi vị trí, trừ khi có lớp logical bucket/mapping hỗ trợ.

**Load balancer thấy ít connection nghĩa là node rảnh?** Không nhất thiết; một connection có thể chạy query rất nặng, và health/lag cũng cần được tính đến.

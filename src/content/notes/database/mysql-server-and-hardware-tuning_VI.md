---
title: "Cấu hình MySQL, hệ điều hành và phần cứng"
category: "Database"
description: "Lập budget memory, tune I/O/concurrency theo workload và xác định giới hạn CPU, disk, network, filesystem."
updated: 2026-10-17
translationKey: "database/mysql-server-and-hardware-tuning"
---

Một biến MySQL không thể bù cho giới hạn CPU, storage hoặc application architecture. Cấu hình tốt bắt đầu bằng giới hạn tài nguyên của host, workload và SLA. MySQL 8.4 có default và biến đổi qua release; coi cấu hình trong sách như giả thuyết để đo chứ không phải giá trị mặc định hiện hành.

## Memory budget trước khi chỉnh buffer

Tổng RAM cần dành cho OS, MySQL global buffers, per-connection buffers, thread/temporary memory, replication, backup agent và page cache tùy storage stack. Một setting như `sort_buffer_size` hay `join_buffer_size` có thể được cấp nhiều lần theo session/query; tăng toàn cục có thể làm nhiều connection đồng thời gây OOM.

InnoDB buffer pool giữ data/index pages; chọn theo working set và memory còn lại, quan sát hit/miss/eviction và physical reads. Đặt buffer pool bằng gần hết RAM có thể khiến OS swap hoặc backup/replication không còn headroom. InnoDB redo log, change buffer, adaptive hash và các cache khác có behavior/version config riêng.

## I/O, redo và concurrency

Redo capacity/flush policy, doublewrite, flushing threads, dirty-page targets và checkpoint behavior ảnh hưởng commit latency và crash recovery. Đặt durability theo RPO; không hy sinh flush chỉ để benchmark đẹp. SSD giảm random read latency nhưng cần endurance, queue depth, fsync và latency dưới sustained writes được xác nhận. RAID/SAN/NAS thêm controller/cache/network failure assumptions.

Concurrency setting không nên tăng chỉ vì CPU nhiều core. Theo dõi active threads, runnable queue, lock waits, context switches, temp tables, disk queue và throughput. Too many connections tạo memory và scheduler overhead; pool connection ở app và giới hạn concurrency theo capacity.

## CPU, filesystem và network

CPU selection phụ thuộc single-thread latency, core count, cache, NUMA và workload. Query mix/crypto/compression có profile khác nhau. Với NUMA, memory locality và server binding có thể quan trọng; chỉ cấu hình sau benchmark và hiểu platform.

Filesystem alignment, mount option, fsync/barrier semantics, disk scheduler và swap behavior phải phù hợp storage/OS hiện tại. Đừng tắt swap/OOM protection theo mẹo cũ mà không hiểu failure mode. Network replication và client traffic cần bandwidth, packet loss/latency, MTU và TLS overhead được đo.

Replica có thể cần CPU/RAM/disk khác primary nếu chịu read traffic, relay log, backup hoặc analytics. Cloud instance thay đổi noisy-neighbor, burst credit, storage IOPS/throughput cap, egress và autoscaling tradeoff. Managed DB giới hạn quyền kernel/config và thay đổi cách backup/failover vận hành.

## Tìm đúng nút thắt trước khi mua hoặc chỉnh máy

Một metric xấu có thể là hậu quả của tài nguyên khác. Thiếu RAM làm buffer pool liên tục đẩy page ra rồi đọc lại; nhìn thấy disk bận chưa chắc disk là nguyên nhân gốc. CPU thấp có thể do query đang chờ lock, network hoặc I/O; CPU cao có thể do xử lý dữ liệu thật hoặc do workload đã gây quá nhiều row reads. Hãy ghép query latency/rows examined với CPU run queue, lock waits, memory pressure, storage latency và network trước khi kết luận.

Phân biệt throughput của toàn server với latency của một request. Nhiều core có thể tăng số query nhỏ chạy đồng thời, nhưng không làm một query tuần tự nhanh hơn theo tỷ lệ. Khi runnable tasks xếp hàng, thêm core hoặc tăng tốc mỗi core có thể giúp; khi query chờ latch/lock, CPU nhanh hơn đôi khi rút ngắn critical section; khi chờ storage, cần giảm I/O hoặc cải thiện storage. Nếu throughput giảm khi tăng concurrency, tranh chấp shared resource hoặc queueing có thể đang lấn át lợi ích của thêm worker.

Hãy thử truy vết một tình huống giả định: sau khi dữ liệu tăng, p95 của cùng một truy vấn tăng mạnh. Disk bận khiến ta dễ kết luận ổ đĩa chậm; CPU cũng có thể cao vì server phải xử lý nhiều lần đọc page. So sánh các khoảng thời gian có cùng query plan và lượng hàng được quét: nếu `Innodb_buffer_pool_reads` tăng nhanh so với `Innodb_buffer_pool_read_requests`, đồng thời storage `await` và queue tăng, working set có thể đã vượt phần cache hữu ích. Khi đó, thêm core không loại bỏ các lần đọc vật lý. Hãy kiểm tra kích thước working set, page eviction và headroom RAM; thử thay đổi một yếu tố trên replica hoặc môi trường thử nghiệm rồi đo lại cùng workload. Nếu physical reads và latency giảm mà lượng công việc truy vấn giữ nguyên, giả thuyết thiếu cache được củng cố. Nếu physical reads không tăng, tiếp tục kiểm tra CPU thực sự bận tính toán, memory bandwidth/NUMA, lock waits và network. Đây là ví dụ chẩn đoán, không phải ngưỡng cấu hình cố định.

CPU model, cache, memory bandwidth, NUMA, hyper-threading và I/O interconnect đều ảnh hưởng kết quả. Dùng benchmark trên đúng version MySQL, engine, query mix và concurrency để so sánh. Benchmark CPU-only không dự báo được OLTP bị kìm bởi storage; benchmark một query không dự báo được server khi hàng trăm connection cùng hoạt động.

## Working set quyết định memory-to-disk balance

Không nhất thiết toàn bộ database phải nằm trong RAM. Working set là những page workload cần lặp lại trong khoảng thời gian quan tâm. Có thể ước lượng nó theo một giờ/ngày làm việc rồi so với buffer pool và quan sát page churn, physical reads cùng p95 latency. Một workload scan tuần tự báo nhiều byte đọc chưa chắc hưởng lợi bằng workload random lookup nếu working set random đang liên tục bị eviction.

Random I/O trên HDD thường trả giá bằng seek/rotation; sequential scan tận dụng được throughput. SSD giảm đáng kể random-read latency nhưng vẫn có giới hạn về write amplification, garbage collection, firmware/controller, endurance và latency tail. Vì vậy hãy benchmark sau khi thiết bị vào steady state, với block size, read/write mix, queue depth, fsync và lượng dữ liệu gần production; không dựa riêng vào con số tuần tự lớn nhất của nhà sản xuất. Cache giúp tránh physical reads, nhưng không thể bỏ qua durable writes: commit vẫn phải đáp ứng chính sách flush đã chọn.

## RAID, SAN và nhiều volume

RAID vừa ghép dung lượng/throughput vừa thay đổi failure mode. RAID 10 thường có hành vi write dễ dự đoán hơn RAID parity cho nhiều OLTP workload, nhưng không có cấu hình tốt cho mọi tải. Parity cần thêm công việc khi ghi nhỏ; RAID controller write-back cache chỉ an toàn khi có bảo vệ mất điện và được xác nhận flush semantics. Theo dõi degraded array, rebuild time và latency trong lúc rebuild; RAID không thay backup hay bản sao ở failure domain khác.

Chia data, redo và binary log ra volume riêng chỉ giúp khi chúng thật sự có đường I/O độc lập. Nhiều partition/volume vẫn có thể cùng dùng controller, bus, SSD pool hoặc SAN queue. SAN/NAS có ích cho capacity, snapshot, di chuyển và quản trị tập trung, nhưng thêm network hop, shared contention và latency cao hơn cho random I/O. Trước khi chọn, thử workload có nhiều random reads và synchronous writes, lúc cache nóng/lạnh, đồng thời thử hành vi khi đường mạng/storage degraded. Replica cần storage theo workload riêng: apply log tuần tự hay một luồng, backup, và read query có thể khiến thiết bị phù hợp khác primary.

## Hệ điều hành và đọc tín hiệu

Filesystem, direct I/O, readahead, disk scheduler và network stack phải được kiểm tra cùng MySQL và storage hiện tại. InnoDB có buffer pool và read-ahead riêng; bật cache ở nhiều tầng có thể giúp hoặc cạnh tranh RAM, nên không áp mount option của phiên bản Linux hay ổ đĩa cũ sang máy mới. Giữ journaling và write barriers/flush theo yêu cầu durability, xác nhận hỗ trợ filesystem cho snapshot/backup, và chỉ đổi TCP buffer/queue khi đo được giới hạn network. Tên disk scheduler cũng thay đổi theo kernel; benchmark scheduler mặc định trước khi sửa.

`vmstat` giúp nhìn runnable queue (`r`), task blocked (`b`), hoạt động swap-in/swap-out (`si`/`so`), CPU user/system/idle và I/O wait. Swap đã dùng (`swpd`) chỉ là trạng thái; swap đang phát sinh liên tục mới cho thấy áp lực hiện tại. `iostat -x` cho read/write rate, queue và latency (`await`); đọc số liệu từng block device, không cộng mù device mapper với thiết bị nền. `%util` không phải thước đo bão hòa đáng tin cho mọi RAID, SAN hay NVMe có xử lý song song. Lấy nhiều mẫu sau khoảng khởi động, đối chiếu với Performance Schema và application traces, rồi phân loại:

- CPU-bound: CPU bận, runnable queue tăng, storage latency thấp.
- I/O-bound: query chờ page, storage latency/queue cao; kiểm tra read/write mix và cache miss.
- Memory pressure: swap-in/out, major faults hoặc RSS chạm giới hạn; giảm allocation hoặc thêm RAM sau khi tìm nguyên nhân.
- Idle nhưng request chậm: tìm lock, pool queue, network, DNS hoặc giới hạn ở application.

Các ví dụ `vmstat`/`iostat` trong sách dùng kernel và thiết bị cũ. Dùng tên cột tương đương trên OS hiện tại, đọc đơn vị và sampling interval, và không coi một mẫu đơn lẻ là kết luận.

## Đọc sâu: CPU, cache và độ trễ storage

Khi chọn CPU, hãy tách hai câu hỏi: một request cần hoàn thành nhanh đến đâu và toàn hệ thống cần xử lý bao nhiêu request đồng thời. Core nhanh hơn thường giúp đường xử lý tuần tự và giảm latency; nhiều core giúp tăng throughput khi query độc lập có thể chạy song song. Nếu luồng làm việc bị khóa bởi một mutex/latch, một core nhanh hơn có thể rút ngắn đoạn tranh chấp, còn thêm core đôi khi chỉ làm nhiều worker cùng chờ. Khi CPU không bận nhưng query chậm, hãy tìm nơi chờ trước khi mua CPU.

Tên model CPU không nói hết hiệu năng. Cache CPU giữ dữ liệu gần core; memory bandwidth và NUMA quyết định tốc độ truy cập RAM khi nhiều core cùng làm việc. Hai máy có cùng số core có thể khác nhau vì xung nhịp, cache, số socket, đường nối giữa socket, memory channel và giới hạn hypervisor. Trên NUMA, một thread chạy ở socket này nhưng cấp phát RAM ở socket khác phải đi qua interconnect; locality kém làm latency tăng và throughput giảm. Đo trên đúng máy, đúng mức đồng thời và đúng loại truy vấn.

Một điểm dễ chẩn đoán nhầm là memory bandwidth: core có thể bận chờ dữ liệu từ RAM, khiến workload trông giống CPU-bound dù phép tính không phải phần tốn nhất. Khi công cụ hỗ trợ, đối chiếu cycles/instructions, cache miss, memory bandwidth và NUMA locality; nếu cải thiện locality hoặc giảm data movement giúp query nhanh lên, thêm core có thể không giải quyết gốc vấn đề.

Sách cũng nhấn mạnh giới hạn address space của hệ 32-bit: dù máy có thể nhìn thấy nhiều RAM hơn nhờ PAE, một tiến trình 32-bit vẫn chỉ có không gian địa chỉ ảo hữu hạn (lý thuyết tối đa 4 GiB, phần user process thực tế thường thấp hơn). Đây là lý do lịch sử khiến MySQL lớn cần OS/process 64-bit. Với MySQL 8.4, chọn platform và package còn được hỗ trợ theo release; kiến trúc 64-bit không tự làm workload nhanh hơn, nhưng cho phép tiến trình sử dụng vùng nhớ lớn mà thiết kế server cần.

Storage có các lớp cache: buffer pool, page cache của OS, cache controller và cache bên trong thiết bị/SAN. Mỗi lớp có dung lượng, chính sách eviction và cam kết durability khác nhau. Cache read nhỏ ở RAID controller thường không giữ được working set lớn; read-ahead ở controller có thể trùng với dự đoán của InnoDB và đẩy page hữu ích ra. Write-back cache có thể gom nhiều lần ghi nhỏ thành lần ghi lớn, nhưng chỉ được coi là bền nếu có pin/battery/capacitor hoặc cơ chế bảo vệ tương đương, và đường flush/fsync thực sự được tôn trọng. Không đánh đổi bảo đảm commit để lấy số benchmark.

## Flash: vì sao benchmark dễ gây hiểu nhầm

Flash đọc theo đơn vị nhỏ khá nhanh, nhưng ghi phải xử lý erase block lớn hơn. Thiết bị thường gom dữ liệu mới vào trang trống, rồi dọn và tái sử dụng block; dọn dẹp nền, wear leveling và garbage collection khiến hiệu năng ghi phụ thuộc dung lượng còn trống, lịch sử ghi và mức song song. Write amplification là tỷ lệ byte ghi vào flash so với byte ứng dụng yêu cầu. Ghi random, thiết bị gần đầy hoặc workload kéo dài có thể làm tỷ lệ này tăng, giảm endurance và tạo latency tail.

Sách phân biệt SLC và MLC theo số bit mỗi cell, cùng endurance danh nghĩa. Đây là phân loại và con số của thời kỳ xuất bản; thiết bị hiện đại còn có TLC/QLC, controller, firmware, over-provisioning và bảo đảm endurance riêng. Hãy so sánh mức ghi được bảo đảm (TBW/DWPD), power-loss protection, latency p99/p999 và chính sách bảo hành của đúng model, không áp con số chu kỳ ghi trong sách cho SSD ngày nay.

Một benchmark flash cần đưa thiết bị vào steady state và ghi rõ block size, read/write ratio, random/sequential pattern, queue depth, fsync/barrier, dung lượng đã dùng, thời gian warm-up và nhiệt độ nếu liên quan. IOPS ở block nhỏ không thể đổi thẳng thành MB/s ở block lớn. Đọc/write cache có thể làm benchmark ngắn trông nhanh nhưng không đại diện hiệu năng sau khi cache đầy. Thử cả lúc chạy liên tục, lúc flush, và ở tải đồng thời gần production. SSD SATA còn có thể bị nghẽn ở controller/interconnect; thiết bị PCIe/NVMe có đường nhanh hơn nhưng vẫn có giới hạn CPU, queue và thermal throttling.

Flash có ích nhất khi workload bị random-read latency hoặc working set vượt RAM; nó cũng có thể giúp replica áp log chậm do một luồng. Nó không tự động là lựa chọn tốt cho mọi ghi tuần tự: redo/binlog cần throughput bền, flush đúng hạn và độ bền phù hợp. Một lớp flash cache như Flashcache trong sách chỉ là cache trước storage chậm: hit nhanh hơn HDD nhưng vẫn chậm hơn flash trực tiếp, miss vẫn đi xuống lớp nền, và hit ratio không chứng minh p99 tốt. Flashcache, PCIe card, SLC/MLC, tên sản phẩm và thông số InnoDB trong chương là ví dụ lịch sử; hãy áp dụng nguyên lý và kiểm tra cơ chế hiện tại thay vì sao chép recipe.

## RAID, SAN và bố trí volume: đọc failure mode cùng hiệu năng

RAID 0 chỉ striping, không có dự phòng; RAID 1 mirror; RAID 5 dùng parity phân tán và phải đọc/tính/ghi parity cho nhiều lần ghi nhỏ; RAID 10 striping các mirror nên thường dễ dự đoán hơn cho OLTP, đổi lại tốn dung lượng. RAID 50 ghép parity group rồi striping, tăng quy mô nhưng vẫn giữ chi phí parity và rủi ro rebuild. Những tên level này không thay đổi nguyên lý, nhưng hiệu năng thực tế phụ thuộc controller, stripe layout, cache và tải. Một số controller triển khai “RAID 10” như nhiều mirror nối tiếp mà không striping; kiểm tra layout thực tế.

Khi một disk hỏng, array vào trạng thái degraded; các lần đọc có thể cần tái tạo dữ liệu, còn rebuild cạnh tranh I/O với database và kéo dài thời gian có nguy cơ lỗi tiếp. Theo dõi SMART/controller alerts, rebuild progress, consistency scrub/patrol read và hot spare. Lập kế hoạch thời gian rebuild trên array lớn. RAID bảo vệ trước một số lỗi thiết bị, nhưng không bảo vệ khỏi xóa nhầm, lỗi phần mềm, ransomware, hỏng controller, mất site hay corruption được ghi đồng bộ; cần backup kiểm chứng và bản sao failure domain khác.

Stripe chunk size và cache policy phải được đo với workload. Chunk quá nhỏ có thể khiến một request chạm nhiều disk; quá lớn có thể làm cache lãng phí hoặc giảm song song. Cache read-ahead của controller đôi khi nhân đôi read-ahead của database; cache write-back giúp synchronous writes bằng cách gom chúng, nhưng phải có bảo vệ mất điện. Hardware RAID và software RAID có thể khác về queueing, serialization, visibility và phục hồi; không có lựa chọn thắng tuyệt đối. Đo end-to-end trên cả filesystem, controller, thiết bị và database.

SAN/NAS hữu ích khi cần dung lượng lớn, snapshot, di chuyển dữ liệu và vận hành tập trung. Đổi lại, đường I/O đi qua fabric/network và lớp chia sẻ; latency của request nhỏ, random, đồng bộ có thể chi phối trước khi bandwidth tối đa đạt mức cao. SAN cache lớn có thể che vấn đề trong thời gian thường ngày, nhưng một scan, purge hoặc cache-cold restart làm lộ độ trễ nền. Đánh giá IOPS, MB/s, concurrency, p95/p99 latency, cache hit, behavior khi path/controller fail và chi phí khôi phục. SAN không tự tạo HA: nó có thể trở thành failure domain chung, nên phải có đường/controller/storage dự phòng và diễn tập.

Tách data, redo, binlog, relay log hay temporary files sang volume riêng chỉ tăng năng lực khi có tài nguyên độc lập ở phía dưới. Hai mount point có thể cùng chia sẻ một SSD pool, HBA, controller, switch hoặc SAN. Tách log có thể giới hạn một số trường hợp cùng mất data và log, nhưng phải xét backup, flush ordering và recovery. Chọn replica theo việc nó làm: một replica chuyên apply có thể nhạy latency ghi; replica phục vụ analytics cần CPU/RAM/read capacity; backup replica có tải tuần tự khác primary.

## Network, filesystem, scheduler và swap trong bối cảnh lịch sử

Network latency cộng dồn qua hop, switch, congestion và queue; throughput tổng không bằng tổng tốc độ cổng nếu nhiều luồng cùng đi qua một uplink. Với nhiều connection nhỏ, backlog, connection establishment, retransmission và socket limits có thể đáng kể; với result set lớn, bandwidth và TCP window mới nổi bật. Trước khi tăng sysctl, đo RTT, packet loss/retransmits, queue drops, số connection, socket exhaustion và băng thông tại từng hop. Các giá trị `somaxconn`, port range và `tcp_max_syn_backlog` nêu trong sách là theo hệ Linux cũ; kiểm tra kernel và workload triển khai.

Filesystem ảnh hưởng journaling, metadata contention, direct I/O, fsync và recovery sau crash. `O_DIRECT` có thể tránh page cache trùng với InnoDB buffer pool, nhưng còn phụ thuộc filesystem, alignment và release. Read-ahead ở OS/filesystem có thể hữu ích cho scan hoặc bị trùng với InnoDB. Journal mode, barrier và mount option thay đổi ý nghĩa durability; lựa chọn “nhanh hơn” không an toàn nếu database nghĩ flush đã bền nhưng storage chưa ghi bền. Kiểm tra khả năng snapshot/backup cùng phiên bản filesystem/LVM.

Tên và hành vi disk scheduler thay đổi theo kernel và loại thiết bị. Controller, SAN, SSD/NVMe có thể tự xếp lịch; scheduler ở host đôi khi thêm queueing thay vì cải thiện thứ tự. Sách khuyến nghị scheduler nhất định cho kernel cũ; trong hệ hiện đại hãy kiểm tra scheduler khả dụng, queue depth, latency tail và benchmark mặc định so với phương án khác. Tương tự, một thread mỗi connection khiến số thread lớn ảnh hưởng scheduler và memory; connection pool giúp giữ concurrency hữu ích thay vì chỉ tăng số worker chờ.

Swap đang hoạt động (`si`/`so`) nguy hiểm cho database vì engine có thể tin rằng page ở RAM trong khi OS phải đọc nó từ disk, kéo dài critical section và gây hàng loạt chờ. Nhưng tổng swap đã dùng không đồng nghĩa đang swap, và tắt swap hoàn toàn có thể biến spike thành OOM kill. Theo dõi swap-in/out, major faults, memory PSI/pressure, RSS và OOM events; giữ đủ headroom và đặt chính sách OOM theo cách vận hành của host. `memlock` cũng không phải công tắc an toàn: khóa quá nhiều RAM có thể làm OS hoặc tiến trình khác thiếu bộ nhớ.

## Đọc ví dụ vmstat/iostat mà không mắc bẫy chỉ số

`vmstat` cần nhiều mẫu; mẫu đầu thường là trung bình từ lúc boot, còn các mẫu sau gần với tốc độ trong khoảng lấy mẫu. `r` là runnable tasks, `b` là tasks đang ngủ không ngắt được; `si`/`so` đo swap I/O hiện tại, khác với `swpd` là lượng swap đang chiếm. `wa` biểu thị CPU idle trong khi có I/O đang chờ, không nói riêng ổ đĩa nào hay query nào chịu trách nhiệm. `st` trên VM giúp thấy thời gian hypervisor lấy CPU khỏi máy ảo.

`iostat` cũng thường đưa mẫu đầu là average từ boot. Các cột request/s, bytes/s, queue depth và `await` cần đọc cùng sampling interval và device stack. `%util` của sách là khoảng thời gian có ít nhất một I/O đang chạy; với RAID/NVMe song song, 100% không có nghĩa thiết bị đạt giới hạn throughput. Công thức concurrency trong sách dùng `svctm`; cột này đã bị bỏ/không đáng tin trên nhiều phiên bản sysstat mới, nên đừng tái sử dụng công thức mù quáng. Dùng telemetry hiện hành của kernel, thiết bị và cloud provider; đối chiếu queue, latency, throughput và saturation.

Các case trong sách cho một cách đọc hữu ích: CPU-bound có user/system CPU và runnable queue cao; I/O-bound thường có blocked tasks và I/O wait nhưng cần xác nhận latency thiết bị; swapping thể hiện si/so liên tục; idle-but-slow thường cần tìm lock, network, connection pool hoặc ứng dụng. Đây là dấu hiệu để lập giả thuyết, không phải luật kết luận. Ghép từng mẫu với query latency, Performance Schema, trace và sự kiện workload cùng thời điểm.

## Quy trình tune

Đo baseline, xác định resource bão hòa, chọn một setting liên quan, load test đại diện, theo dõi query latency lẫn host metrics, rồi giữ hoặc rollback. Ghi version, config diff, warm-up và durability policy. Chạy cả steady state và incident/failover; benchmark chỉ ở cache-warm state có thể bỏ sót recovery bottleneck.

*High Performance MySQL*, ch. 8–9 và 13, trình bày server variables, memory/I/O/concurrency, OS/hardware và cloud. Dùng [InnoDB parameters](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html), [InnoDB disk I/O optimization](https://dev.mysql.com/doc/refman/8.4/en/optimizing-innodb-diskio.html), [memory use](https://dev.mysql.com/doc/refman/8.4/en/memory-use.html), [server system variables](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html), [server status variables](https://dev.mysql.com/doc/refman/8.4/en/server-status-variables.html), và tài liệu của OS/storage đang triển khai cùng [các nền tảng được MySQL 8.4 hỗ trợ](https://www.mysql.com/support/supportedplatforms/database.html).

## Tự kiểm tra

**`innodb_buffer_pool_size` càng lớn càng tốt?** Không; cần headroom và workload phải hưởng lợi từ cache.

**Có thể nhân `sort_buffer_size` chỉ với số query?** Nó có thể được cấp theo connection/operation; concurrency có thể nhân memory mạnh.

**Cloud DB có thể tune kernel như máy tự quản?** Thường không; service boundary thay quyền và trách nhiệm vận hành.

**Ổ đĩa có `%util` cao chắc chắn đã bão hòa?** Không; RAID, SAN và NVMe có thể xử lý nhiều request song song, nên phải đọc latency, queue và throughput cùng nhau.

**Database lớn hơn RAM có nghĩa là cần mua RAM bằng đúng kích thước database?** Không; working set và kiểu truy cập quyết định RAM đem lại bao nhiêu lợi ích.

**Tắt swap có tự giải quyết memory pressure?** Không; trước hết tìm allocation gây áp lực và giữ đủ headroom để host không rơi vào OOM.

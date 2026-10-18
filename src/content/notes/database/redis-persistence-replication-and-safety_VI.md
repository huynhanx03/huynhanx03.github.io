---
title: "Persistence, replication và độ bền dữ liệu Redis"
category: "Database"
description: "So sánh RDB/AOF, hiểu fork và rewrite, replication async cùng cửa sổ mất acknowledged write."
updated: 2026-10-18
translationKey: "database/redis-persistence-replication-and-safety"
---

Redis có thể phục vụ cache có thể tạo lại hoặc dữ liệu mà ứng dụng không muốn mất. Hai mục tiêu cần durability policy khác nhau. Persistence tạo bản lưu trên đĩa; replication giữ replica; cả hai đều không phải lời hứa rằng mọi write đã được client nhận sẽ tồn tại qua mọi lỗi.

## RDB snapshot

RDB tạo snapshot point-in-time của dataset. Nó gọn để backup hoặc nạp nhanh và sinh ra ít ghi liên tục hơn, nhưng lỗi giữa các snapshot có thể làm mất thay đổi gần nhất. `BGSAVE` thường fork process con để ghi; copy-on-write khiến page bị thay đổi sau fork phải được giữ riêng, nên bộ nhớ tăng theo mức write trong lúc save. Fork chậm hoặc thiếu memory có thể gây latency/OOM.

Snapshot cần phân biệt với backup đã kiểm chứng. Redis tạo file tạm và thay file đích sau khi quá trình save hoàn tất; nhưng nếu chỉ còn một bản trên cùng volume, lỗi volume vẫn xóa cả dữ liệu chính và snapshot. Copy snapshot ra nơi độc lập, kiểm tra checksum/metadata, thử load trên một instance riêng và ghi nhận thời gian phục hồi. Với workload write-heavy, đo peak memory trong lúc fork vì copy-on-write có thể làm tổng RAM vượt mức dataset đang dùng.

Redis có thể tự chụp theo ngưỡng số lần ghi trong một khoảng thời gian, hoặc nhận `BGSAVE` thủ công. Quy tắc trong sách như `save 900 1` chỉ minh họa cách đọc cấu hình: ít nhất một thay đổi trong 900 giây thì bắt đầu snapshot; đó không phải lịch backup mỗi 15 phút hay cam kết snapshot hoàn tất trong khoảng đó. `BGSAVE` giữ server tiếp tục phục vụ lệnh trong lúc child process ghi file, còn `SAVE` đồng bộ chặn xử lý client đến khi hoàn tất. Chọn theo mức chấp nhận pause, không theo giả định rằng “background” đồng nghĩa không tốn tài nguyên.

## AOF và rewrite

AOF ghi command stream để phát lại; `appendfsync` đặt tradeoff giữa latency và khoảng mất dữ liệu khi crash (`always`, `everysec`, `no` có ý nghĩa theo OS/fsync). AOF thường dễ hiểu và replay nhưng có thể lớn. Rewrite tạo file AOF tương đương dataset hiện tại thay vì giữ lịch sử dài; quá trình có thể dùng fork/copy-on-write. RDB và AOF có thể bật cùng nhau; khôi phục ưu tiên file nào phụ thuộc version/configuration, hãy xác nhận tài liệu.

Rewrite không đơn giản là xóa file đang được ghi. Redis tiếp tục nhận write trong khi tạo base mới, giữ phần tăng thêm ở incremental log, rồi đổi manifest để lần khởi động sau ghép đúng các phần. Từ Redis 7, AOF dùng nhiều file cùng manifest; không tự xóa một file theo suy đoán. Nếu file cuối bị cắt do disk full, `redis-check-aof` có thể sửa phần đuôi trong tình huống được hỗ trợ, nhưng hãy sao lưu trước khi sửa file gốc. Theo dõi dung lượng trống, rewrite duration, fsync latency và lỗi ghi.

Sách cũng chỉ ra một failure mode ít thấy hơn: thao tác xóa AOF rất lớn có thể khiến hệ điều hành bận lâu vì phải giải phóng nhiều block. Đây là chi tiết của cách lưu file Redis thời sách xuất bản, không phải lý do để tự xóa file AOF hiện đại; từ Redis 7, hãy để Redis quản lý base, incremental files và manifest. Khi cần dọn dung lượng, xác định đúng phiên bản, trạng thái rewrite và quy trình backup trước.

Các mode fsync là chính sách rủi ro khác nhau: `always` yêu cầu đồng bộ thường xuyên nhất và có thể đẩy latency/IO lên; `everysec` thường là thỏa hiệp thông dụng nhưng vẫn có cửa sổ mất dữ liệu khi kernel, máy hoặc ổ đĩa lỗi; `no` giao thời điểm flush cho OS nên độ trễ thấp hơn nhưng RPO khó dự đoán. Tên mode không bảo đảm phần cứng đã giữ dữ liệu nếu controller/drive nói sai về flush. AOF rewrite gom nhiều lần cập nhật cùng key thành trạng thái cuối để giảm dung lượng và thời gian replay; nó vẫn cần disk headroom, CPU, fork và copy-on-write. Khi khởi động, Redis dùng file persistence phù hợp theo cấu hình/version; kiểm tra log và quy trình restore thực tế thay vì tự đoán file nào sẽ được dùng.

## Replication không đồng bộ

Redis replication thường bất đồng bộ: primary xác nhận command trước khi replica nhận và áp dụng. Primary hỏng đột ngột có thể làm mất acknowledged write nếu failover chọn replica chưa có write đó. `WAIT` yêu cầu số replica xác nhận offset nhưng không biến replication thành consensus hay đảm bảo dữ liệu đã fsync bền vững trên mọi node. `WAITAOF` ở version hỗ trợ có thể chờ fsync theo điều kiện cụ thể; đọc đúng guarantees và giới hạn.

Replica nhớ replication ID và offset đã áp dụng. Khi kết nối lại, `PSYNC` xin phần còn thiếu trong replication backlog; nếu lịch sử không còn trong backlog hoặc ID không khớp, hai bên phải full resync. Full sync tạo snapshot, truyền dataset và đồng thời buffer write mới để phát tiếp sau khi replica nạp xong; vì vậy nó dùng disk, network, CPU và memory đáng kể. Backlog quá nhỏ so với thời gian outage/write rate làm tăng full sync. Xem `INFO replication`, `ROLE`, offset, lag và trạng thái sync thay vì chỉ kiểm tra TCP connection.

Full sync là một bản chụp cộng phần phát sinh. Replica kết nối và yêu cầu đồng bộ; primary bắt đầu hoặc tái sử dụng snapshot, đồng thời giữ write mới trong backlog; sau khi gửi xong snapshot, primary phát backlog để replica bắt kịp rồi chuyển sang stream trực tiếp. Replica đang nhận snapshot chưa chắc đã có dữ liệu mới nhất, nên socket kết nối không đủ để quyết định route read. Các replica đến trước khi snapshot bắt đầu gửi có thể dùng chung một lượt snapshot/backlog; replica đến sau mốc đó có thể cần lượt riêng. Nhiều lượt đồng thời làm tăng chi phí fork, RAM, disk và network. Với Redis thời sách xuất bản, tác giả khuyên primary chỉ dùng khoảng 50–65% RAM hệ thống để còn chỗ cho fork và backlog; đây là số liệu lịch sử, không phải công thức sizing hiện tại. Hãy đo peak memory theo dataset và write rate của bản Redis đang chạy. Có thể nối replica thành cây để giảm số luồng trực tiếp từ primary, nhưng replica phía dưới phụ thuộc độ sẵn sàng và độ trễ của node trung gian. Redis OSS replication chuẩn là primary→replica, không phải hai primary tự đồng bộ hai chiều.

Để kiểm tra một write quan trọng, sách dùng token duy nhất: ghi token sau dữ liệu trên primary, đợi replica link ở trạng thái up, đợi token xuất hiện ở replica, rồi tối đa khoảng một giây chờ hàng đợi fsync trống; cuối cùng xóa token và dọn các token cũ còn sót. Trình tự này dạy cách tách ba mốc “primary xử lý”, “replica nhận” và “đĩa đồng bộ”. Cách polling field nội bộ `INFO` trong sách phụ thuộc Redis phiên bản cũ, giả định thời gian fsync và không phải giao thức durability nên dùng ngày nay. Với Redis hiện hành, hiểu giới hạn chính xác của `WAIT` và `WAITAOF`; ngay cả khi chờ replica, ứng dụng vẫn phải xác định điều gì được xác nhận, có được fsync hay không, và chuyện gì xảy ra khi failover chọn replica khác.

Failover thêm một vấn đề khác: Sentinel/Cluster chọn primary mới theo cơ chế riêng, nhưng không thể thu hồi dữ liệu đã mất khỏi nhánh cũ. Client phải xử lý reconnect, retry idempotent và trường hợp reply bị mất sau khi write đã chạy. Hiểu fencing và quyền ghi sau failover theo topology deployment.

Replica cũng có thể phục vụ read với lag, nhưng read-after-write không tự bảo đảm nếu đọc từ replica. Replication backlog hỗ trợ partial resynchronization; nếu gap quá lớn, replica cần full sync và tải lại snapshot.

## Failover, backup và test phục hồi

Sentinel/Cluster/orchestrator có thể promote replica, nhưng topology/failure detection không thể biết mọi client đã nhận write nào. Chọn RPO/RTO thực tế, cấu hình persistence, giữ backup ngoài instance, theo dõi replication lag/AOF errors/fork latency/disk và diễn tập khôi phục. `appendonly yes` trên một máy không thay backup độc lập; replica không chống thao tác xóa bị propagate.

Quy trình thủ công trong sách lấy snapshot từ replica, chuyển bản sao sang máy thay thế, khởi động node mới rồi trỏ replica cũ vào primary mới. Đây là bài học về thứ tự thao tác và nguồn dữ liệu dùng để dựng lại node; lệnh `SLAVEOF` trong sách là tên cũ, Redis hiện dùng thuật ngữ primary/replica và `REPLICAOF`. Trong production, failover thủ công cần xác nhận node cũ đã bị fence hoặc không thể nhận write trước khi mở primary mới, nếu không hai nhánh có thể nhận ghi độc lập. Thường nên để Sentinel/Cluster quản lý promotion và discovery; vẫn phải hiểu replica được chọn có thể thiếu write cuối. Không copy file persistence đang được ghi như thể đó là snapshot nhất quán.

RPO là lượng write tối đa có thể mất; RTO là thời gian đến khi dịch vụ phục hồi. RDB interval, AOF fsync, replication lag, thời gian phát hiện lỗi, chọn replica, nạp snapshot và đổi endpoint đều góp phần vào hai con số này. Kế hoạch cần kiểm thử cả “khôi phục được file” lẫn “ứng dụng tiếp tục đúng”: tạo backup, xác minh hash, nạp vào instance cô lập, chạy kiểm tra invariant, đo thời gian và diễn tập quay lui.

Khi nghi file hỏng, cần phân biệt kiểm tra cấu trúc với sửa chữa. Bộ kiểm tra AOF có thể cắt bỏ command không đầy đủ đầu tiên khi chạy chế độ sửa; phần sau command đó sẽ không được replay, nên hãy giữ bản gốc và ước lượng lượng dữ liệu có thể mất. Bộ kiểm tra RDB giúp phát hiện snapshot lỗi nhưng không thể tái tạo phần dữ liệu bị hỏng; vì vậy nhiều backup độc lập và thử restore quan trọng hơn việc trông chờ một lệnh repair. Tên và cách gọi công cụ kiểm tra thay đổi theo bản phát hành; xác nhận đúng binary của Redis đang dùng.

*Redis in Action* ch. 4 bàn persistence và replication; docs hiện hành: [Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/), [replication](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/), [WAIT](https://redis.io/docs/latest/commands/wait/), [WAITAOF](https://redis.io/docs/latest/commands/waitaof/).

## Tự kiểm tra

**Bật RDB có bảo đảm không mất dữ liệu vừa ghi?** Không; snapshot interval quyết định một phần cửa sổ mất dữ liệu.

**Replica ACK rồi thì write chắc chắn nằm trên đĩa?** Không; receipt/apply/fsync là các trạng thái riêng.

**Persistence thay được backup?** Không; lỗi logic, xóa nhầm hoặc corruption có thể được lưu tiếp.

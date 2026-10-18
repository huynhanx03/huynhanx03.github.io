---
title: "Thiết kế độ sẵn sàng cao và failover cho MySQL"
category: "Database"
description: "Tách availability khỏi backup và replication, chọn redundancy theo failure domain, rồi thiết kế failover có kiểm soát dữ liệu và ứng dụng."
updated: 2026-10-17
translationKey: "database/mysql-high-availability-and-failover"
---

Một cụm có nhiều máy chủ chưa chắc đã sẵn sàng cao. Nếu bản sao chậm, endpoint không đổi được, hai máy cùng nhận ghi, hoặc đội vận hành không biết cách phục hồi, hệ thống vẫn có thể ngừng phục vụ. Thiết kế high availability (HA) bắt đầu từ câu hỏi cụ thể hơn: người dùng chịu được bao lâu khi chức năng quan trọng không hoạt động, và có thể chấp nhận mất bao nhiêu dữ liệu?

## Availability là trải nghiệm của người dùng

Availability thường được biểu diễn bằng tỷ lệ thời gian dịch vụ hoạt động. Mục tiêu 99.9% trong một năm cho phép khoảng 8 giờ 46 phút downtime; 99.99% còn khoảng 52 phút; 99.999% còn khoảng 5 phút. Đây là ngân sách cho cả lỗi hạ tầng, triển khai, vận hành và phục hồi, không phải cam kết rằng một máy chủ riêng lẻ không hỏng.

Con số “máy chủ đang chạy” cũng chưa đủ. Nếu máy chủ vừa khởi động nhưng cache lạnh khiến request vượt timeout, với người dùng dịch vụ vẫn đang lỗi. Availability nên được định nghĩa theo chức năng và ngưỡng chất lượng: ví dụ, 99.95% request đọc hồ sơ phải thành công trong 300 ms, còn báo cáo nội bộ có thể chấp nhận trễ vài phút.

Đừng gộp availability với ba mục tiêu khác:

- **Redundancy** là có thành phần dự phòng.
- **Durability** là dữ liệu đã xác nhận vẫn tồn tại sau lỗi.
- **Load balancing** là phân phối tải giữa các thành phần.

Một replica có thể tăng redundancy nhưng vẫn trễ; một bản backup tăng khả năng phục hồi dữ liệu nhưng không giúp chuyển traffic trong vài giây. Hãy đặt riêng **RTO** (thời gian tối đa để khôi phục) và **RPO** (lượng dữ liệu tối đa có thể mất). Chúng biến mong muốn “HA cao” thành tiêu chí có thể thiết kế và kiểm chứng.

## Tính chi phí của downtime trước khi mua thêm máy

Không phải mọi chức năng cần cùng một mức availability. Nếu trang thanh toán ngừng hoạt động, thiệt hại mỗi phút có thể lớn hơn trang lịch sử đơn hàng. Chia hệ thống thành các luồng quan trọng và không quan trọng giúp tập trung đầu tư vào nơi có rủi ro cao.

Một cách ưu tiên đơn giản là ước lượng:

`mức phơi nhiễm rủi ro ≈ xác suất sự cố × thiệt hại khi sự cố xảy ra`

Đây không phải công thức dự đoán chính xác; nó giúp so sánh việc hết dung lượng đĩa, lỗi phần cứng hiếm gặp và một schema migration rủi ro. Mỗi nấc “thêm một số 9” thường tốn nhiều hơn nấc trước vì đòi hỏi dự phòng ở nhiều tầng, kiểm thử thường xuyên và quy trình trực 24/7. Hãy so chi phí giảm downtime với chi phí downtime thực tế, thay vì chọn mục tiêu lớn nhất theo cảm tính.

## Giảm sự cố và giảm thời gian khôi phục

Downtime thường đến từ nhiều nguyên nhân kết hợp: đầy đĩa, SQL chạy ngoài dự kiến, schema hoặc index kém, replication lệch, thao tác nhầm, lỗi phần cứng, cấu hình hoặc thay đổi chưa kiểm thử. Cách cải thiện HA có hai hướng bổ sung nhau:

- Tăng **MTBF**: kéo dài thời gian giữa các sự cố bằng kiểm soát thay đổi, kiểm tra nâng cấp, quyền tối thiểu, giám sát dung lượng và tính toàn vẹn dữ liệu.
- Giảm **MTTR**: rút ngắn thời gian phát hiện, chẩn đoán và khôi phục bằng metric có lịch sử, runbook rõ ràng, backup đã thử restore và failover đã diễn tập.

Sách dẫn số liệu từ một tập incident mà tác giả từng phân tích: khoảng 35% liên quan môi trường vận hành, khoảng 35% do vấn đề hiệu năng, 20% do replication, phần còn lại do mất/hỏng dữ liệu và nguyên nhân khác. Đây là quan sát từ các hệ thống họ hỗ trợ ở thời điểm sách xuất bản, không phải tỷ lệ phổ quát cho mọi database. Những nguyên nhân cụ thể đáng chú ý gồm hết dung lượng đĩa, SQL chạy tệ hoặc server có hành vi lỗi, schema/index không phù hợp, dữ liệu source–replica đã khác nhau, và `DROP TABLE` khi không có bản backup dùng được. Bài học vận hành là replication cũng có thể là nguồn gây downtime; thêm dự phòng mà thiếu kiểm tra và phục hồi độc lập có thể làm sự cố lan rộng hơn.

Một số việc ít hào nhoáng thường ngăn được nhiều sự cố: cảnh báo disk space trước khi đầy, kiểm tra trạng thái RAID và backup, thử phục hồi dữ liệu định kỳ, ghi lại cấu hình, test schema/query trước production, và rà soát thay đổi. Sau incident, xem lại toàn bộ chuỗi điều kiện góp phần gây lỗi. Root-cause review có ích, nhưng sự cố hiếm khi chỉ có một nguyên nhân và giải pháp “thêm một lớp cluster” không sửa được mọi lớp yếu.

Theo dõi chỉ số có thể dẫn đến hành động, như lỗi kết nối, latency theo phân vị, replication queue, dung lượng, I/O wait và trạng thái backup. Một cache hit ratio thấp tự nó chưa chắc là incident. Nếu cảnh báo liên tục sai, người trực sẽ quen bỏ qua cả cảnh báo đúng. Hãy kiểm tra cả đường đi của alert: metric được thu, ngưỡng phát hiện, người nhận và khả năng xác nhận đã nhận.

## Tìm failure domain và single point of failure

Vẽ đường từ request tới dữ liệu: ứng dụng, connection pool, proxy/router, MySQL, filesystem, volume, controller, nguồn điện, mạng và vùng triển khai. Một thành phần là **single point of failure (SPOF)** nếu lỗi của nó làm chức năng quan trọng ngừng hoạt động mà không có đường thay thế.

Hai máy chủ cùng một rack vẫn có thể cùng mất điện; hai VM khác nhau nhưng cùng host vật lý có chung failure domain; hai replica ở hai vùng nhưng dùng chung DNS, credential, pipeline deploy hoặc người vận hành có thể cùng bị ảnh hưởng. Lỗi phần mềm, lệnh xóa nhầm và dữ liệu bị hỏng cũng lan qua replication. Vì vậy, redundancy phải xét nơi lỗi bắt nguồn và phạm vi lỗi có thể lan tới, không chỉ đếm số node.

Giữ headroom cũng là một dạng dự phòng. Nếu mọi máy đã chạy sát giới hạn, một máy hỏng sẽ dồn tải sang các máy còn lại và làm chúng quá tải theo. Công suất dự phòng phải đủ xử lý workload failover đã định, bao gồm peak thực tế và tác động của cache lạnh.

## Chọn cách dự phòng đúng với rủi ro

### Replica MySQL: bản sao có thể chạy, nhưng cần theo dõi độ trễ

Asynchronous replica thường đã chạy và có thể được promote nhanh. Nó giúp rút ngắn MTTR so với khởi động một máy từ đầu, đồng thời tạo lựa chọn cho read scale-out. Đổi lại, transaction mới nhất có thể chưa được gửi hoặc apply khi source hỏng. Nếu cần giới hạn khoảng mất dữ liệu, phải định nghĩa cách đo lag/GTID, quy trình chọn replica đủ mới và điều kiện chấp nhận mất transaction.

Semisynchronous replication thêm bước chờ replica xác nhận đã nhận và ghi event vào relay log. Điều này cải thiện khả năng transaction đã commit tồn tại ở hơn một nơi, nhưng xác nhận mặc định không có nghĩa replica đã apply transaction. Timeout có thể làm source trở lại asynchronous tùy cấu hình. Độ trễ mạng cũng đi thẳng vào độ trễ commit. Đọc đúng wait point và hành vi version đang chạy trước khi tuyên bố RPO.

### Shared storage và replicated disk: bảo vệ đường lưu trữ

SAN/shared storage hoặc block replication có thể cho standby truy cập cùng dữ liệu hay một bản sao block-level. Chúng giải quyết một số dạng hỏng máy/đĩa, nhưng không tự làm một MySQL data directory an toàn để nhiều instance cùng mở. MySQL/InnoDB cần một cơ chế cluster được thiết kế để phối hợp ghi; không bật hai `mysqld` độc lập cùng truy cập một bộ file dữ liệu.

Storage replication đồng bộ có thể tăng latency ghi vì commit phụ thuộc đường truyền và thiết bị phía standby. Nó cũng sao chép corruption, lệnh xóa nhầm và mã độc như dữ liệu hợp lệ. Standby vừa khởi động có cache lạnh và vẫn cần filesystem/database recovery. Một SAN dự phòng vẫn có thể hỏng ở failure domain chung. Hãy xem đây là một lớp bảo vệ hoặc phương tiện phục hồi, không thay backup độc lập và restore test.

Sách nêu một cách dùng DRBD có mục tiêu hẹp: replicate thiết bị chứa binary log. Khi máy đang chạy source hỏng, có thể mở các binlog còn giữ được trên node dự phòng bằng một log server, đưa các replica khác tiến tới vị trí mới nhất có thể khôi phục, rồi promote một replica. Cách này giữ lại chuỗi thay đổi để giảm mất dữ liệu và hỗ trợ recovery; nó không biến node dự phòng thành MySQL primary nóng, nên vẫn có thời gian khởi động, recovery và chuyển vai trò. Binlog chỉ hữu ích nếu được đồng bộ bền vững, định danh/position được xác minh và runbook đã diễn tập.

### Synchronous cluster: xác nhận dữ liệu đi kèm chi phí phối hợp

Trong replication đồng bộ thực sự, transaction chỉ được xác nhận sau khi các node theo protocol đã nhận/commit dữ liệu. Mức bảo vệ cụ thể tùy sản phẩm và cấu hình: số thành viên cần xác nhận, durable flush, quorum, hành vi khi partition và điều kiện client nhận success. “Synchronous” không phải từ đồng nghĩa với “không thể mất dữ liệu”; cần đọc semantics chính xác.

MySQL Group Replication/InnoDB Cluster hiện dùng membership và quorum để xử lý thành viên, recovery và bầu primary trong single-primary mode. Nhóm cần đa số để tiến triển; mất quorum có thể khiến một phía dừng ghi thay vì cho cả hai phía độc lập nhận ghi. Điều này bảo vệ tính nhất quán bằng cách hy sinh khả năng tiến triển ở minority. Với primary mới còn backlog, consistency mode như `BEFORE_ON_PRIMARY_FAILOVER` có thể chặn request cho tới khi backlog được apply, đổi lại thời gian phục hồi request dài hơn.

Hãy xét ba thành viên A, B, C. Mạng chia A khỏi B và C. Sau khi hệ thống phát hiện A không còn reachable và cập nhật membership, B+C có 2/3 phiếu nên có thể tiếp tục; A chỉ thấy một thành viên và không có đa số để xác nhận quyết định mới. Nếu A từng là primary, đừng chỉ nhìn majority rồi xóa A khỏi cấu hình: so sánh GTID và trạng thái transaction trước khi ép nhóm mới, vì primary cũ có thể chứa transaction chưa hiện diện ở B hoặc C. MySQL cảnh báo loại primary có extra transactions khỏi group có thể làm mất các transaction đó. Chỉ force membership sau khi xác minh các node bị loại thực sự đã dừng; nếu A vẫn sống trong partition riêng, ép B+C tiếp tục có thể tạo hai nhóm ghi.

Quorum không loại bỏ nhu cầu kiểm tra network, khả năng restart, provisioning node mới và diễn tập mất đa số. Cụm nhiều node cũng tăng chi phí truyền, lưu trữ và vận hành. Hãy kiểm tra khả năng chịu lỗi đúng topology; ví dụ cụm hai thành viên không có đa số nếu mất kết nối giữa hai bên.

#### NDB và Percona XtraDB Cluster giải các bài toán khác nhau

**MySQL NDB Cluster** dùng storage engine NDB với các data node phối hợp và lưu dữ liệu có bản sao trong nhóm node; SQL node là lớp MySQL Server gửi truy vấn vào cluster. Vì đây là một engine và kiến trúc phân tán riêng, NDB không phải cách bật đồng bộ cho một data directory InnoDB đang có. Chọn nó khi mô hình dữ liệu, loại truy vấn, giới hạn engine và yêu cầu vận hành phù hợp; kiểm tra chính xác tính năng và cấu hình trong tài liệu NDB của phiên bản triển khai.

**Percona XtraDB Cluster (PXC)** dựa trên InnoDB/Galera write-set replication. Mỗi node thường giữ toàn bộ dataset; transaction được chứng nhận theo write set, nên hai transaction ghi chồng cùng row có thể khiến một bên bị từ chối/rollback thay vì tự hợp nhất. Nhóm cần quorum để ghi; node mất kết nối có thể phải đồng bộ state trước khi tham gia lại. Mô hình này cho phép nhiều node nhận request, nhưng không làm write conflict biến mất, cũng không khiến tốc độ ghi nhanh hơn node chậm nhất trên đường commit. Sách mô tả phiên bản PXC cũ, vì vậy các chi tiết triển khai, state transfer và rolling schema upgrade phải kiểm tra theo tài liệu PXC hiện hành.

## Thiết kế failover như một quy trình có hàng rào

Failover là chuyển workload khỏi thành phần lỗi sang thành phần dự phòng. **Switchover** thường là chuyển có kế hoạch; **failback** là đưa dịch vụ về node/vai trò cũ sau khi phục hồi. Failover rút ngắn downtime nhưng làm hệ thống mất một phần dự phòng cho đến khi dựng lại standby. Nên có kế hoạch khôi phục capacity dự phòng, không dừng ở việc “đã chuyển được traffic”.

Một quy trình thủ công hay tự động đều cần những bước logic tương tự:

1. **Phát hiện và xác nhận:** phân biệt node chết với mạng chập chờn, query chậm, hay ứng dụng không kết nối được.
2. **Chọn candidate:** xem GTID đã nhận/execute, apply backlog, dữ liệu bị filter, khả năng chịu tải và mức RPO có thể chấp nhận.
3. **Fence writer cũ:** chặn node cũ nhận ghi bằng cơ chế đáng tin cậy như quyền điều khiển, network/storage fencing hoặc membership/quorum theo sản phẩm. Không chỉ dựa vào ping timeout.
4. **Promote và xác minh:** đổi vai trò theo replication coordinates/GTID, kiểm tra node mới writable, schema và dữ liệu trọng yếu.
5. **Chuyển endpoint và phục hồi client:** cập nhật router/VIP/service discovery hoặc cấu hình ứng dụng; đóng hoặc tái tạo connection cũ, retry theo giới hạn và idempotency.
6. **Theo dõi và tái lập dự phòng:** kiểm tra error/latency/lag, giữ node cũ cách ly cho tới khi biết trạng thái dữ liệu, rồi rejoin/reseed và diễn tập lại.

Nếu không fence được primary cũ, cả primary cũ và mới có thể nhận write. Khi mạng quay lại, không có phép ghép tự động nào đảm bảo giải quyết mọi xung đột. “Chọn máy còn sống” vì thế chưa phải quy trình failover an toàn.

Replication manager hoặc script tự động có thể giảm thời gian thao tác, nhưng cũng có quyền gây ra hậu quả lớn nếu nhận diện nhầm lỗi, chọn sai candidate hoặc đổi sai replication position. Sách kể các sự cố với công cụ thời đó như MMM và xem MHA như một công cụ mới cần thận trọng; không nên lấy đánh giá sản phẩm ấy làm kết luận hiện nay. Với bất kỳ orchestrator nào, hãy kiểm thử network partition, hai node cùng tưởng mình là primary, stale GTID, timeout và client đang có transaction mở; log quyết định promote và giữ fencing độc lập với health check đơn giản.

## Endpoint chuyển đi không có nghĩa mọi client đã chuyển

Floating IP/VIP có thể chuyển địa chỉ trong cùng mạng, nhưng ARP cache, switch và quyền hệ điều hành ảnh hưởng thời gian hội tụ. DNS phụ thuộc TTL, resolver cache và connection pool; sửa DNS không di chuyển kết nối TCP đã mở. Proxy/middleman tạo endpoint ổn định nhưng trở thành một thành phần cần dự phòng, giám sát và sizing. Chuyển giữa hai data center qua proxy có thể giữ ứng dụng chạy nhưng tăng latency nếu application vẫn ở vùng cũ.

Cho ứng dụng biết cách xử lý lỗi kết nối, nhưng tránh để mỗi service tự có một thuật toán promote database khác nhau. Tập trung quyền chọn writer ở một control plane hoặc quy trình có fencing; ở phía ứng dụng, đóng connection lỗi, retry transaction an toàn, giới hạn thời gian chờ và có thể giảm tính năng không thiết yếu. Không retry mù một transaction đã mất kết nối giữa lúc server commit và lúc client nhận phản hồi: client không biết commit có xảy ra không. Dùng idempotency key hoặc truy vấn lại trạng thái nghiệp vụ để quyết định.

Replica cũng có thể “sống” nhưng chưa sẵn sàng nhận workload. Nó có thể còn backlog, thiếu cache nóng, có dung lượng/CPU khác hoặc đang phục vụ analytics. Hãy chạy workload đọc có kiểm soát để hiểu khả năng, theo dõi cache và latency, đồng thời giữ headroom sau khi promote.

## Ví dụ: source mất kết nối mạng

Giả sử source mất liên lạc với ứng dụng nhưng vẫn chạy và có thể ghi cục bộ. Replica cách đó 10 giây có thể đã nhận phần lớn transaction. Nếu chỉ đổi DNS sang replica, ứng dụng có thể ghi vào replica trong khi source vẫn nhận ghi từ một số client cũ. Khi mạng hồi phục, hai nhánh dữ liệu không thể được ghép chỉ bằng cách đổi vai trò.

Quy trình an toàn cần xác định đây là partition hay source đã chết, ngăn source cũ nhận ghi, chọn replica theo transaction đã nhận/apply và mức mất dữ liệu được phép, promote một writer, chuyển endpoint, buộc client làm mới connection, rồi kiểm tra transaction nghiệp vụ. Nếu không thể chứng minh candidate đủ mới, đội trực cần đưa ra quyết định có chủ đích giữa chờ khôi phục source và chấp nhận RPO lớn hơn; tự động hóa không thể tạo ra dữ liệu mà chưa được replicate.

## Diễn tập để kiểm chứng cam kết

Một runbook nên chứa điều kiện kích hoạt, người có quyền promote, cách fence, cách chọn candidate, cách đổi endpoint, lệnh/metric kiểm chứng, hướng xử lý transaction chưa rõ kết quả và điều kiện rejoin node cũ. Diễn tập cả lỗi thường gặp lẫn tình huống khó: lag tăng, receiver còn chạy nhưng applier dừng, mất quorum, stale DNS, connection pool giữ socket cũ, disk gần đầy, node mới có cache lạnh và backup cần restore.

Đo RTO từ lúc người dùng bắt đầu bị ảnh hưởng tới khi chức năng đạt SLO trở lại, không dừng đồng hồ ở lúc process MySQL khởi động. Đo RPO bằng transaction nghiệp vụ thực sự mất hoặc còn lại sau recovery, không chỉ bằng một số “seconds behind”. Ghi lại thời gian từng bước, backlog, số retry, lỗi trùng và lỗi mất dữ liệu để cải thiện thiết kế.

## Tự kiểm tra

**Replica luôn là backup chứ?** Không. Lệnh xóa, lỗi ứng dụng và corruption có thể được replicate; cần backup có lịch sử và đã thử restore.

**Semisynchronous đồng nghĩa replica đã apply trước khi client nhận thành công?** Không nhất thiết. MySQL semisync xác nhận receipt/ghi relay log theo wait point, còn applier commit là giai đoạn khác.

**Có thể failover chỉ bằng cách chuyển VIP/DNS?** Không. Phải chọn đúng dữ liệu, fence writer cũ, promote đúng cách và làm mới connection phía client.

**Thêm node luôn tăng availability?** Không. Node mới có thể dùng chung failure domain, làm thiết kế phức tạp hơn hoặc tạo thêm failure mode. Hãy kiểm tra toàn đường request và khả năng quorum/recovery.

*High Performance MySQL*, chương 12, là nguồn cho các khái niệm availability, downtime, MTBF/MTTR, SPOF, shared/replicated storage, đồng bộ, replication redundancy và các kiểu failover. Tên công cụ và đánh giá sản phẩm trong sách phản ánh thời điểm xuất bản; mô tả hiện hành được đối chiếu với [MySQL 8.4 Group Replication](https://dev.mysql.com/doc/refman/8.4/en/group-replication.html), [quorum và network partition](https://dev.mysql.com/doc/refman/8.4/en/group-replication-network-partitioning.html), [consistency khi primary failover](https://dev.mysql.com/doc/refman/8.4/en/group-replication-configuring-consistency-guarantees.html), [NDB Cluster FAQ](https://dev.mysql.com/doc/refman/8.4/en/faqs-mysql-cluster.html), [semisynchronous replication](https://dev.mysql.com/doc/refman/8.4/en/replication-semisync.html), và [PXC certification](https://docs.percona.com/percona-xtradb-cluster/8.0/certification.html).

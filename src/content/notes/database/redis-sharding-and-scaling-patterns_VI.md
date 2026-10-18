---
title: "Scale Redis: replica, shard và truy vấn nhiều key"
category: "Database"
description: "Chọn read scaling hay write sharding, định tuyến key, vận hành reshard và chia truy vấn phức tạp."
updated: 2026-10-18
translationKey: "database/redis-sharding-and-scaling-patterns"
---

Redis scale theo ba hướng: phục vụ thêm lượt đọc bằng replica, chia dữ liệu để tăng dung lượng/write, và thiết kế lại truy vấn phải gom kết quả từ nhiều shard. Mỗi hướng đổi một loại chi phí và guarantee khác nhau.

## Chương 10: scale từng loại tải

Trước khi thêm máy, hãy xác định tải nào chạm giới hạn. Một máy có thể đủ RAM nhưng không đủ read QPS; có thể đọc ổn nhưng write bị nghẽn; hoặc dữ liệu và write đã chia được nhưng một truy vấn cần hợp nhất toàn bộ kết quả. Ba trường hợp này cần ba cách xử lý khác nhau.

Trước khi scale ngang, sách khuyến nghị loại bớt công việc có thể tránh: giới hạn bytes trả về, dùng đúng kiểu dữ liệu và range, nén payload lớn sau khi cân CPU, dùng pipeline/connection pool, tách các component ít liên quan sang instance khác, gộp writes analytics trong ứng dụng khi có thể, và tính cả tốc độ ghi AOF/đĩa. Nếu `WATCH`/`MULTI` trở thành điểm nghẽn, xem lại transaction boundary, lock hoặc Lua thay vì chỉ thêm shard. Đây là checklist để xác nhận bottleneck là capacity của một node, không phải query/data model chưa phù hợp.

### Tăng năng lực đọc bằng replica

Replica là bản sao nhận thay đổi bất đồng bộ từ primary. Đưa các truy vấn đọc độc lập sang replica có thể tăng tổng read capacity, nhưng câu trả lời có thể cũ hơn primary. Vì vậy, dashboard chấp nhận trễ có thể đọc replica; kiểm tra số dư ngay sau giao dịch hoặc đọc sau khi vừa ghi nên đi primary, hoặc dùng một giao thức chờ replication phù hợp với yêu cầu.

Một điểm sách nhấn mạnh là chi phí đồng bộ ban đầu. Khi replica mới kết nối hoặc cần đồng bộ lại, primary có thể tạo snapshot rồi truyền toàn bộ dữ liệu. Nhiều replica cùng cần full sync làm tăng CPU, bộ nhớ copy-on-write, disk I/O và băng thông; network bão hòa có thể làm tăng latency cho cả client và khiến replica đang chạy bị rớt kết nối. Có thể phân tầng replica để một node nhận dữ liệu từ primary rồi phục vụ bản sao ở xa, hoặc dùng nén/mạng riêng khi link chậm. Đổi lại, replication tree tăng số đường lỗi và làm failover phức tạp. Đây là lựa chọn topology phải đo bằng thời gian sync, bytes truyền, lag và latency, không dựa vào số node.

Sách cũng nhắc Redis Sentinel như một tiến trình giám sát riêng: các Sentinel theo dõi primary/replica, trao đổi thông tin, rồi phối hợp chọn một replica để promote khi primary lỗi và chuyển các replica còn lại sang primary mới. Sentinel có thể phát thông báo hoặc gọi script do người vận hành cấu hình. Cơ chế phát hiện, quorum và failover cần được hiểu theo release hiện chạy; ví dụ lịch sử trong sách không thay cho thiết kế quorum, split-brain và kiểm thử failover của một triển khai hiện đại. Một chi tiết ứng dụng khác: kết quả search cache được tạo cục bộ trên replica nên request muốn tái sử dụng cache phải quay lại cùng replica; sticky routing giúp điều đó nhưng cũng tạo tải lệch và cần xử lý khi node đổi.

Trước khi scale đọc, giảm lượng dữ liệu trả về, chọn đúng cấu trúc, giới hạn range, gom lệnh bằng pipeline có giới hạn và nén payload lớn nếu CPU cho phép. Replica không chữa được một lệnh O(N), một hot key hay query đang gửi quá nhiều byte. Cấu hình replica hiện hành thường read-only; đọc replica trong Cluster phải chấp nhận khả năng stale rõ ràng.

### Chia write và dung lượng

Khi một primary đã chạm giới hạn RAM hoặc write throughput, đặt một phần dữ liệu lên mỗi shard. Chương sách xây connection decorator nhận `component` và key, tra cấu hình shard rồi đưa connection đúng node vào hàm. Ý tưởng vẫn hữu ích: logic chọn shard nằm ở một router dùng chung, không rải mapping khắp code. Khi vận hành thật, mapping cần version, phân phối nhất quán, quan sát từng shard, xử lý node chuyển trạng thái và quy tắc retry.

Nếu tăng trưởng dự kiến nhanh nhưng ban đầu dữ liệu còn ít, có thể tạo trước nhiều shard logic rồi đặt nhiều shard trên cùng máy hoặc trong nhiều logical database; sau đó tách chúng ra nhiều host mà không đổi quy tắc định tuyến. Số `256` trong sách chỉ minh họa kế hoạch tăng trưởng, không phải mặc định. Cần cân bằng chi phí shard rỗng/metadata và độ phức tạp vận hành với việc tránh remap quá nhiều key khi tăng số shard. Nếu chạy nhiều process trên một host, mỗi process phải có port và file persistence riêng.

Hash modulo N đơn giản: `shard = hash(key) % N`, nhưng đổi N thường làm phần lớn key chuyển nơi lưu. Consistent hashing hoặc slot map giảm/kiểm soát chuyển dịch. Redis Cluster dùng slot cố định và redirect để client tìm node đúng; ứng dụng vẫn cần xử lý resharding và retry. Không tự động gán mọi key cùng logic nghiệp vụ vào cùng shard nếu truy vấn đa key, transaction hoặc script cần chúng hoạt động cùng nhau.

Một shard logic không bắt buộc phải là một máy vật lý riêng: có thể chạy nhiều Redis process trên một host để tận dụng thêm core khi workload bị giới hạn bởi một process, miễn là còn CPU/network/I/O và mỗi process có port cùng đường dẫn snapshot/AOF riêng. Đây chỉ tăng throughput nội máy; nó không thêm RAM vật lý hay khả năng chịu mất host, và các process vẫn tranh cùng disk/network.

Sharding tăng tổng dung lượng và phân phối write, nhưng biến thao tác cục bộ thành thao tác phân tán. Mỗi lần move key có thể cần dual routing, copy, kiểm tra số lượng, watermark, cutover và rollback. Một lần timeout sau khi server đã nhận write khiến client không biết write đã chạy hay chưa; chỉ retry an toàn khi operation idempotent hoặc có request ID để khử trùng.

### Tìm kiếm phân tán và hợp nhất top-K

Chương 7 dựng chỉ mục tìm kiếm trong Redis. Khi một node không đủ query throughput, có thể nhân bản index sang các replica. Nhưng các query kiểu `SUNIONSTORE`, `SINTERSTORE`, `ZINTERSTORE` tạo key kết quả nên không còn là read thuần. Sách thời Redis 2.6 đề xuất bật ghi trên replica để tạo kết quả tạm; tài liệu Redis hiện hành nói writable replica là cơ chế lịch sử, không khuyến nghị vì dữ liệu ghi cục bộ có thể lệch primary và mất khi restart/resync. Ưu tiên command trả kết quả trực tiếp như `SUNION`/`ZINTER`, `SORT_RO` hoặc `EVAL_RO` khi phù hợp và có trong version đang chạy; nếu buộc phải tạo cache tạm, chạy ở node có thẩm quyền ghi và TTL rõ ràng. Khi index không còn vừa một shard, tài liệu được gán vào shard theo document ID để dữ liệu của document ở cùng nơi.

Một truy vấn phân tán có ba pha: chạy điều kiện trên từng shard, lấy đủ candidate kèm sort field/score, rồi merge và cắt trang toàn cục. Trong thuật toán `SORT` của sách, muốn trả trang 91–100 thì mỗi shard trước hết phải tìm 100 kết quả đầu của query cục bộ, rồi đọc giá trị field dùng để sắp xếp cho từng document; coordinator ghép các cặp `(document_id, sort_value)`, sắp xếp lại và mới cắt trang 91–100. Điều này cần thiết vì sau một lượt tìm kiếm ta không còn biết candidate toàn cục đến từ shard nào. Với numeric sort, các giá trị được chuẩn hóa về kiểu số thập phân; giá trị thiếu được quy ước là `0`. Với string sort, giá trị thiếu thành chuỗi rỗng. Đó là quy tắc của ví dụ, không phải thứ tự đúng cho mọi sản phẩm: ứng dụng phải chọn semantics cho NULL, kiểu trộn và tie-break rồi dùng nhất quán ở từng shard. Nếu dùng ZSET đã tính score, mỗi shard trả member kèm score đến `start + num`; coordinator merge theo chiều tăng/giảm score rồi lấy trang cần thiết.

Lấy riêng `num` kết quả từ mỗi shard sẽ không đủ nếu trang bắt đầu sau offset 0 hoặc các kết quả tốt nhất tập trung ở shard khác. Tổng count là tổng count cục bộ chỉ khi tập dữ liệu không trùng và mọi shard dùng cùng điều kiện. Cách đơn giản trong sách truy vấn tuần tự từng shard; chạy song song có thể giảm thời gian chờ nhưng làm tăng tải đồng thời, và tổng latency vẫn phụ thuộc shard chậm nhất. Cần giới hạn số candidate và bộ nhớ coordinator khi shard count tăng.

Chi phí fan-out tăng theo số shard; merge giữ nhiều candidate trong bộ nhớ và độ trễ thường bị quyết định bởi shard chậm nhất. Các shard cũng có thể quan sát dữ liệu ở thời điểm khác nhau. Dùng parallel fan-out, top-K có giới hạn và cursor riêng cho từng shard khi phù hợp; nhưng phải xác định tính đúng của candidate bound. Nếu truy vấn ngày càng giống search engine, việc tự xây distributed index và merge có thể đắt hơn dùng hệ thống tìm kiếm chuyên dụng.

### Chia timeline và đồ thị theo cách khác nhau

Timeline của một user có thể đặt toàn bộ key vào shard theo user ID. Home/list timeline thường bị giới hạn số entry nên chỉ cần phân bố các key; profile timeline có thể tăng không giới hạn, nên cần giới hạn retention hoặc chia nhỏ theo thời gian/segment. Giới hạn 1.000/20.000 trong sách là lựa chọn minh họa, không phải ngưỡng phổ quát.

Followers/following khó hơn timeline: một user nổi tiếng có thể có tập follower rất lớn. Chia danh sách theo `hash(follower_id)` phân tán phần tử, nhưng các thao tác thêm/xóa/đếm/trang phải biết shard nào liên quan. Nếu quan hệ hai chiều phải được ghi vào cùng shard, chuẩn hóa cặp ID trước khi băm giúp hai bên chọn cùng nơi. Đọc trang theo score cần hỏi từng shard lấy tối đa K ứng viên rồi merge; chi phí tăng theo shard count.

Trong ví dụ sách, score của quan hệ là thời điểm follow. Cursor `score > last_seen` cho phép lấy trang tiếp theo từ từng shard rồi merge K phần tử; nó tránh phải đọc từ rank 0 đến offset sâu trên mọi shard như pagination theo vị trí. Sách dùng `ZRANGEBYSCORE`; từ Redis 6.2, lệnh này được thay bằng `ZRANGE ... BYSCORE`. Nhưng cursor chỉ có score sẽ sai khi nhiều quan hệ có cùng timestamp. Giả sử trang kết thúc ở score `1700000000` và member `user-42`, còn `user-57` cũng có score ấy: truy vấn score lớn hơn `1700000000` bỏ qua `user-57`; truy vấn từ score ấy trở lên có thể trả lại `user-42`.

Vì vậy, thứ tự trang phải được xác định bằng cặp `(score, member)`. Redis sắp member cùng score theo thứ tự từ điển. Mỗi shard có thể đọc cả nhóm ở score biên, giữ những member đứng sau cursor theo quy tắc tie-break đã chọn, rồi tiếp tục sang score kế tiếp; sau đó coordinator merge các ứng viên và phát cursor cuối cùng. Nếu một score có quá nhiều member, đọc cả nhóm có thể tốn kém: khi ấy cần chia nhỏ nhóm bằng một chỉ mục phụ/khóa theo bucket hoặc mã hóa thứ tự ổn định vào thiết kế dữ liệu. Đừng chỉ thêm ID vào cursor nếu truy vấn thực tế vẫn không thể tìm phần còn lại của nhóm cùng score. Khi có record được thêm/xóa giữa hai request, cursor ổn định thứ tự nhưng không tự tạo snapshot; sản phẩm phải chọn semantics như chấp nhận thay đổi, giữ watermark thời gian hoặc lưu snapshot ngắn hạn.

Khi một tài khoản đăng bài, fan-out ghi bài vào home timeline của follower theo lô. Đọc follower list theo cursor/score, nhóm các timeline cùng shard đích, rồi pipeline `ZADD` bài viết và lệnh trim timeline trong cùng nhóm. Nếu đã xử lý một lô nhưng vẫn còn follower, enqueue job tiếp theo với cursor; sau khi hết follower thì xử lý lượt list timeline nếu cần. Đây là cấu trúc cụ thể trong chương sách: đọc page từ follower shards, gom write theo timeline shard để giảm kết nối/lượt gọi, rồi tiếp tục nền theo lô. Cách này tránh một công việc khổng lồ giữ worker quá lâu, nhưng tạo eventual consistency: bài có thể chưa xuất hiện ở mọi feed. Retry cần idempotent theo post ID; quá trình rebuild/catch-up cần watermark và dedup. User có lượng follower cực lớn có thể dùng pull-on-read hoặc chiến lược hybrid để tránh write hotspot.

Các pattern scale trong *Redis in Action*, ch. 10, được đối chiếu với [Redis scaling](https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/), [replication và giới hạn writable replica](https://redis.io/docs/latest/manual/replication/), [Cluster specification](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/), [ZRANGE theo score](https://redis.io/docs/latest/commands/zrange/) và [client-side caching](https://redis.io/docs/latest/develop/reference/client-side-caching/).

## Tự kiểm tra mở rộng

**Replica mới có thể gây latency dù chỉ phục vụ đọc?** Có. Full sync tiêu thụ CPU, I/O và network của primary; nhiều lần sync đồng thời có thể ảnh hưởng toàn hệ.

**Vì sao lấy top 20 từ mỗi shard không luôn cho trang 20–39?** Vì offset toàn cục đòi hỏi candidate đủ sâu trên từng shard; sau khi hợp nhất và sắp xếp mới biết phần tử nào đứng ở vị trí toàn cục.

**Sharding follower list thay đổi điều gì?** Một thao tác từng là một ZSET thành fan-out hoặc merge qua shard; cần định nghĩa pagination, count, retry và thứ tự rõ ràng.

## Tự kiểm tra

**Replica read có read-after-write guarantee?** Không mặc định; lag có thể trả state cũ.

**Modulo N có ổn định khi thêm shard?** Không; nhiều key đổi node.

**Mỗi shard lấy top 10 có luôn đủ để tìm top 10 toàn cục?** Không với ranking/filter tùy ý; cần phân tích candidate bound và merge.

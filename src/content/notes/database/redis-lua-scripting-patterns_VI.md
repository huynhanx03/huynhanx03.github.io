---
title: "Lua scripting Redis: atomic workflow và sharded list"
category: "Database"
description: "Đưa check-and-update lên server, triển khai script an toàn và hiểu các giới hạn Cluster, retry, blocking."
updated: 2026-10-18
translationKey: "database/redis-lua-scripting-patterns"
---

Lua đưa thao tác cần kiểm tra state rồi cập nhật nhiều key về gần dữ liệu. Script có thể giảm round trip và loại bỏ race giữa các client, nhưng phải ngắn, validate trước khi ghi và tuân thủ quy tắc key/slot của Cluster.

## Chương 11: đưa một thao tác nhiều bước vào Lua

Lua hữu ích khi một quyết định phụ thuộc state hiện tại của Redis và phải cập nhật nhiều key liên quan trong cùng một lượt. Thay vì client đọc, tính, rồi gửi nhiều lệnh qua mạng, script nhận danh sách key trong `KEYS`, tham số trong `ARGV`, đọc state, kiểm tra điều kiện và ghi kết quả. Chẳng hạn tạo status có thể đọc tên đăng nhập, cấp ID, ghi Hash của status và tăng bộ đếm bài viết trong một lần gọi.

### Atomicity giúp gì và không giúp gì

Redis không chạy command khác xen giữa thời gian script chạy. Vì thế hai client không thể cùng đọc một giá trị cũ rồi cùng quyết định mua món hàng cuối. Nhưng Lua không phải transaction có rollback: nếu script đã ghi một key rồi lệnh sau lỗi, write trước đó không tự được hoàn tác. Hãy kiểm tra input, tồn tại key, kiểu dữ liệu, quyền và điều kiện nghiệp vụ trước các write có thể lỗi; giữ script ngắn, giới hạn số phần tử và viết theo thứ tự dễ phục hồi.

Script cũng chạy tuần tự trên server. Vòng lặp không giới hạn hoặc một `ZRANGE` rất lớn chặn các client khác trong suốt thời gian đó. Atomicity là khoảng thời gian không bị xen ngang, không phải chạy song song hay đảm bảo latency thấp. Đo thời gian script và tải p95/p99; giới hạn batch.

Nếu script chạy quá lâu, Redis không tự ngắt nó ngay khi chạm ngưỡng vì có thể script đã ghi một phần state. Redis chuyển sang trạng thái báo `BUSY` cho lệnh thông thường. `SCRIPT KILL` chỉ dừng được script chưa ghi dữ liệu; nếu script đã ghi, dừng cưỡng bức đòi hỏi tắt server bằng `SHUTDOWN NOSAVE`, có nguy cơ mất dữ liệu chưa lưu. Ngưỡng hiện hành được cấu hình bằng `busy-reply-threshold`; tên `lua-time-limit` trong sách thuộc phiên bản cũ. Vì vậy, giới hạn kích thước công việc và thử script trước khi triển khai là biện pháp an toàn chính, không phải dựa vào cơ chế timeout để tự cứu.

### Ví dụ: tạo status bằng một lượt gọi

Bản client trong sách cần hai đợt trao đổi: đọc login và cấp ID trước, sau đó mới ghi Hash của status và tăng bộ đếm bài viết. Script chuyển phần phụ thuộc state Redis vào server: đọc login từ key user, dừng nếu user không tồn tại, tăng khóa ID, tạo key status, ghi các trường status, rồi tăng bộ đếm của user. Client chỉ truyền key user và key bộ đếm qua `KEYS`, còn nội dung bài qua `ARGV`.

Thứ tự này giảm round trip và đảm bảo client khác không chen vào giữa lúc kiểm tra user, cấp ID, và ghi các cấu trúc liên quan. Tuy vậy, tên `status:<id>` được tạo bên trong script; trên Cluster, các key phải được thiết kế trước để khai báo đầy đủ và cùng slot. Nếu vẫn muốn Redis cấp ID, có thể lưu các status thành field trong một Hash theo user đã khai báo sẵn; hoặc để client tạo ID duy nhất rồi truyền key status cụ thể qua `KEYS`. Nếu một lệnh ghi lỗi sau khi các lệnh trước đã chạy, Redis không tự rollback chúng, nên kiểu key, tham số, và điều kiện lỗi cần được kiểm tra trước lần ghi đầu.

### KEYS, ARGV và script cache

Khai báo mọi key mà script sẽ truy cập trong `KEYS`; dữ liệu đầu vào không phải key truyền trong `ARGV`. Điều này giúp Redis Cluster kiểm tra slot và client hiểu script chạm vào đâu. Với thao tác nhiều key trên Cluster, các key thường cần cùng hash slot; hash tag `{...}` có thể cố định phần liên quan vào một slot nhưng cũng có thể tạo hot slot. Bài sharded LIST trong sách tính tên shard bên trong Lua nên không tuân theo quy tắc khai báo key/slot hiện đại của Cluster; xem nó như bài học về cấu trúc, không sao chép nguyên xi vào Cluster.

`EVAL` gửi source mỗi lần; `SCRIPT LOAD` và `EVALSHA` gửi hash để gọi script đã cache. Cache không phải dữ liệu bền: restart, failover hoặc `SCRIPT FLUSH` có thể làm mất script, nên xử lý `NOSCRIPT` bằng cách nạp lại rồi gọi an toàn. Từ Redis 7 có Redis Functions phù hợp khi muốn triển khai logic có tên trong server; vẫn cần versioning, rollout và kiểm soát quyền. Tránh tạo source khác nhau cho từng request vì làm cache phình và khó theo dõi.

### Lock và semaphore

Acquire lock cần một lệnh nguyên tử đặt token nếu key chưa tồn tại, đồng thời gắn lease; release chỉ xóa nếu token trong key vẫn thuộc đúng owner. Đặt `SET key token NX PX ttl` giúp acquire không để lại lock vĩnh viễn nếu client chết. Script compare-token rồi delete gom bước kiểm tra/xóa thành một thao tác. Token ngăn client cũ xóa lock mới, nhưng lease hết hạn không ngăn tiến trình cũ tiếp tục ghi vào hệ thống khác; khi cần bảo vệ tài nguyên ngoài Redis, fencing token tăng dần và được tài nguyên đích kiểm tra mới giải quyết được stale owner.

Semaphore biểu diễn các holder bằng ZSET: script dọn lease hết hạn, đếm holder, thêm ID duy nhất nếu còn slot. Vì các bước chạy liên tiếp trong script, hai client không thể cùng chiếm slot cuối. Bản Lua trong sách bỏ bộ đếm và lock phụ: client có script acquire chạy trước sẽ được xét trước, nên thứ tự tuần tự của server giải quyết race và tạo tính công bằng mà bản nhiều bước phải tự dựng. Script refresh chỉ gia hạn ID vẫn còn trong ZSET; release xóa đúng ID của holder. Thời gian client lệch nhau có thể làm lease bị thu hồi sớm/muộn; thiết kế renewal, timeout và xử lý holder chết rõ ràng. Số liệu benchmark trong sách chỉ phản ánh phần cứng/client của thời điểm đó; lợi ích bền vững hơn là giảm round trip và retry contention.

### Thay WATCH trong autocomplete và marketplace

Autocomplete trong sách chèn tạm hai sentinel vào ZSET, tìm rank của chúng, lấy tối đa 10 tên trong khoảng, rồi xóa sentinel trong một script. Tính nguyên tử tránh nhiều client làm thay đổi rank giữa lúc tìm và xóa. Sentinel cần collision-free và cleanup ngay cả khi xử lý lỗi; với Redis Cluster các key liên quan phải cùng slot. Nếu chỉ cần prefix lookup bền vững hoặc dữ liệu lớn, cấu trúc chuyên dụng có thể phù hợp hơn thao tác sentinel trên ZSET.

Trong marketplace, một script đọc giá listing và số dư buyer, xác nhận listing còn tồn tại và số dư đủ, rồi chuyển tiền, ghi item vào inventory và xóa listing. Việc gom check-and-update ngăn bán trùng hoặc chi quá số dư trong một Redis instance. Hãy xác định rõ kiểu tiền (integer minor units), key type, seller/buyer khác nhau, và kiểm tra tất cả trước lần ghi đầu. Script không bao trùm SQL, thanh toán ngoài, email hay nhiều shard; kết quả timeout cần request ID và trạng thái có thể tra cứu để client không tạo giao dịch lặp.

Các bảng đo trong chương cho thấy xu hướng trên cấu hình thử nghiệm của tác giả: benchmark autocomplete 10 client ghi nhận khoảng 6.141 lần hoàn tất trong 10 giây với `WATCH` so với 128.217 với Lua; benchmark marketplace 5 người bán và 5 người mua ghi nhận 116 nghìn listing/111 nghìn giao dịch với fine-grained lock, so với 505 nghìn/480 nghìn với Lua trong 60 giây. Các con số phụ thuộc mạnh vào Redis, client, máy và cách benchmark thời đó; chỉ nên đọc như bằng chứng về việc giảm round trip/retry trong bài thử, không dùng làm dự báo throughput.

### Sharded LIST không tự thành queue đầy đủ

Sách đặt hai khóa String `<list>:first` và `<list>:last` để trỏ tới shard đầu/cuối; payload nằm trong `<list>:<shard-id>`, với ID shard tăng liên tiếp. Khi List rỗng, hai con trỏ bằng nhau; nếu có nhiều shard, chỉ hai shard ở biên mới có thể chưa đầy, còn mọi shard ở giữa phải đầy. Nếu hai con trỏ trùng nhau, độ dài là `LLEN` của shard đó; nếu khác nhau, với dung lượng tối đa `M`, số phần tử suy ra từ `LLEN` hai đầu cộng `(last - first - 1) × M`, miễn invariant này được giữ.

Push chia input thành các lô tối đa 64 phần tử trong ví dụ, rồi script đẩy vào shard hiện tại đến gần ngưỡng compact-encoding. Sách chừa một vị trí vì Redis 2.6 xử lý client đang chờ blocking pop sau khi script hoàn tất; nếu nhồi kín trong script, item được chuyển ngay cho waiter có thể làm shard vượt ngưỡng. Khi shard không còn chỗ, script tăng/giảm con trỏ đầu-cuối để dùng shard kế tiếp. Con số 64 và ngưỡng ziplist là cấu hình lịch sử; nguyên tắc là giới hạn batch và kiểm tra semantics của release.

Pop lấy từ shard ở đầu tương ứng. Nếu shard vừa rỗng, script kiểm tra hai con trỏ: nếu chúng trùng nhau thì List đã hết; nếu còn shard khác, dịch con trỏ qua shard kế tiếp và thử pop tại đó. Metadata chỉ đúng nếu mọi push/pop đi qua cùng giao thức nguyên tử.

Blocking pop mới là phần mong manh. Script tự nó không thể chờ như `BLPOP`, nên ví dụ lặp nonblocking pop, đọc con trỏ, rồi pipeline một script kiểm tra lại endpoint ngay trước `BLPOP`/`BRPOP` tối đa một giây. Nếu endpoint đã đổi, script đẩy một giá trị giả vào shard cũ để blocking pop thức dậy và client thử lại. Có một khoảng race giữa kiểm tra và lệnh blocking tiếp theo: consumer khác có thể lấy giá trị giả hoặc client có thể chờ nhầm shard. Transaction `MULTI/EXEC` không giải quyết được vì blocking pop bên trong transaction chạy như pop không blocking; do đó đây là best-effort workaround của sách, không phải queue có semantics blocking đáng tin cậy.

Redis script không thể block chờ như `BLPOP` trong khi server cần tiếp tục xử lý lệnh khác. Mô phỏng bằng giá trị giả, polling hay timeout ngắn có race và không giữ thứ tự toàn cục. Mỗi shard chỉ giữ thứ tự cục bộ. Nếu cần consumer group, ack, pending recovery, replay hoặc global order, dùng Redis Streams hoặc broker phù hợp. Đây là ví dụ lịch sử hữu ích để hiểu giới hạn sharding; không bê nguyên mã Python 2, cấu hình ziplist cũ hoặc chiến thuật blocking của sách vào production hiện đại.

Nội dung Chương 11 trong *Redis in Action* được đối chiếu với tài liệu chính thức về [Lua scripting](https://redis.io/docs/latest/develop/programmability/eval-intro/), [script cache và EVALSHA](https://redis.io/docs/latest/develop/programmability/eval-intro/#evalsha), [SCRIPT KILL](https://redis.io/docs/latest/commands/script-kill/), [Redis Functions](https://redis.io/docs/latest/develop/programmability/functions-intro/) và [quy tắc multi-key trong Cluster](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/).

## Tự kiểm tra mở rộng

**Script atomic nghĩa là mọi ghi đều rollback nếu lệnh cuối lỗi?** Không. Atomicity ngăn command khác xen ngang; write đã thực hiện không tự hoàn tác.

**Vì sao phải đưa key vào `KEYS`?** Để server và Cluster biết key nào được truy cập, kiểm tra slot và định tuyến đúng.

**Lua semaphore xử lý hai client tranh slot cuối ra sao?** Toàn bộ dọn lease, đếm và thêm holder chạy tuần tự trong một script nên client thứ hai thấy kết quả sau client thứ nhất.

**Vì sao script sharded LIST trong sách không dùng nguyên trạng với Cluster?** Script tự tính key shard động, trong khi Cluster cần các key được khai báo và multi-key script phải đáp ứng quy tắc slot.

## Tự kiểm tra

**Lua atomic có rollback write khi lỗi giữa script?** Không; command khác không xen ngang, nhưng write trước lỗi không tự rollback.

**Script timeout phía client có nghĩa server đã dừng?** Không; outcome có thể không rõ, nên cần dedup/idempotency.

**Một sharded list vẫn bảo đảm FIFO toàn cục?** Không; thứ tự mặc định chỉ trong từng shard.

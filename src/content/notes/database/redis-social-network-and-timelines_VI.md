---
title: "Mạng xã hội, follower và timeline bằng Redis"
category: "Database"
description: "Mô hình hóa user, status, follow graph, home timeline và streaming với lựa chọn fan-out cụ thể."
updated: 2026-10-18
translationKey: "database/redis-social-network-and-timelines"
---

Một timeline là bài toán kết hợp quan hệ theo dõi với thứ tự thời gian và quyền hiển thị. Trong thiết kế của chương 8, profile và status nằm trong Hash; `following:<uid>` và `followers:<uid>` là ZSET với user ID làm member, thời điểm follow làm score; timeline cũng là ZSET chứa status ID theo thời điểm đăng. Điểm thời gian ở quan hệ follow cho phép lấy follower theo thứ tự và phân trang khi fan-out. Có thể chọn Set nếu chỉ cần membership, nhưng khi đó cần một index riêng cho thứ tự hoặc cursor. Câu hỏi quyết định thiết kế feed là tạo feed lúc user đăng (fan-out on write) hay lúc người đọc mở app (fan-out on read).

## User, status và quan hệ follow

Hash `user:<id>` lưu login, tên hiển thị, số follower/following, số bài đăng và thời điểm tạo. Hash `users:` ánh xạ login viết thường sang ID để tìm tên và ngăn trùng khác hoa thường. Hàm tạo user khóa theo login đã chuẩn hóa trước khi kiểm tra rồi cấp ID, tránh hai request đồng thời tạo cùng tên. Mẫu sách có nhánh phát hiện login đã tồn tại rồi return trước lệnh nhả lock; TTL ngắn giới hạn thời gian giữ khóa, nhưng code thực tế nên đặt release trong `finally`.

Thông tin nhạy cảm như email và password hash không nên nằm trong Hash thường được đọc để render profile. Status có ID riêng cùng author, thời điểm, nội dung và metadata tùy chọn; user ID và login được chép vào status để đọc bài không phải tải profile riêng.

`following:<uid>` và `followers:<uid>` là hai chỉ mục ngược nên thao tác follow/unfollow phải giữ chúng và bộ đếm trong profile nhất quán. Follow request, block, private account và unfollow đều thay đổi quyền; feed cache cần invalidation để nội dung riêng tư không còn xuất hiện.

Khi follow, ví dụ sách kiểm tra cạnh đã tồn tại, thêm hai chiều quan hệ, tính lại hai bộ đếm, rồi chép tối đa 1.000 status gần nhất từ profile timeline của người được follow sang home timeline và trim feed. Unfollow làm ngược lại: xóa cả hai cạnh, cập nhật bộ đếm rồi gỡ các status gần đây của người đó khỏi home timeline. Đây là snapshot ban đầu để người mới follow thấy bài ngay; các bài mới về sau đến qua fan-out. Nhiều lệnh được gom bằng pipeline để giảm round trip, nhưng các bước nhiều key phải có ranh giới nhất quán và chính sách retry rõ ràng.

Sau edit/delete, các feed đã nhận có thể vẫn giữ ID cũ. Ví dụ Chương 8 chỉ xóa status Hash, gỡ ID khỏi profile và home timeline của tác giả, rồi để bước đọc bỏ ID mồ côi ở feed follower; sách đặt bài dọn zombie IDs thành exercise. Xóa đồng bộ mọi bản copy tốn kém khi fan-out lớn, nên có thể dọn theo batch hoặc dùng tombstone/version để ẩn ngay rồi dọn sau. Quyết định phải cân bằng chi phí, quyền riêng tư và thời gian giữ nội dung đã xóa.

## Home timeline bằng sorted set

Feed key `feed:<user>` chứa status ID với score là timestamp; query lấy mới nhất bằng reverse range và phân trang bằng cursor. Dùng timestamp đơn thuần có thể trùng; kết hợp sequence/tie-break ổn định. Giữ giới hạn top-N để memory có trần. Hydrate status từ cache/database theo batch, nhưng tôn trọng thứ tự và lọc status đã xóa/quyền riêng.

Pagination bằng offset dễ trượt khi item mới được chèn đầu danh sách. Cursor theo `(score,id)` giúp tiếp tục trước mốc đã thấy. Read path cần xử lý entry stale, post từ user bị block và user unfollow trong khi request đang chạy.

## Fan-out on write và celebrity

Khi author đăng, hệ thống trước tiên tạo Hash status và thêm ID vào profile timeline, rồi fan-out on write đẩy ID vào feed follower. Ví dụ sách cập nhật ngay tối đa 1.000 follower trong request đăng bài; nếu còn follower, nó lên lịch task nền để tiếp tục theo lô 1.000. Mỗi feed được trim về 1.000 ID mới nhất. Như vậy user thường có read path nhanh, còn phần lớn chi phí nằm ở write; với celebrity, task nền tránh giữ request mở lâu nhưng vẫn tạo write amplification và backlog. Fan-out on read giữ post ở author timeline rồi merge khi đọc, giảm số lần ghi nhưng tăng query cost.

Hybrid thường push cho follower bình thường và pull các celebrity khi đọc. Quy tắc cần nhất quán để không duplicate/miss: phân loại author, watermark của feed, merge order, retry fan-out và dedup ID. Backfill hoặc rebuild feed phải chạy theo batch và rate limit để không làm nóng Redis/database.

## Fan-out theo batch: cursor phải đi qua tập follower đang thay đổi

Code Chương 8 lưu follower thành ZSET với thời điểm follow làm score, rồi phân trang `ZRANGEBYSCORE` để fan-out theo lô. Nếu lô dừng giữa nhiều follower có cùng score `t`, lần sau bắt đầu từ `t` sẽ đọc lại các member ở đầu nhóm đó vì cận score mặc định inclusive; `ZADD` làm ghi lặp an toàn nhưng task có thể không tiến. Đổi sang cận `> t` thì lại bỏ sót những member còn lại cũng có score `t`.

Fan-out cần cursor phân biệt được cả score lẫn member. Một cách rõ ràng là giữ index phụ chỉ phục vụ fan-out: mọi follower có cùng score `0`, member là user ID đã chuẩn hóa; đọc `ZRANGE fanout:<author> (last-id + BYLEX LIMIT 0 1000` rồi lưu member cuối làm cursor. `BYLEX` chỉ xác định thứ tự khi tất cả score bằng nhau, nên index này tách khỏi ZSET follower có score thời gian dùng cho UI. Nếu chọn cách lưu khác, vẫn phải chứng minh batch tiếp theo bắt đầu sau đúng cặp `(score, member)` mà không bỏ/đọc lặp.

Tập follower có thể đổi khi job đang chạy. Nếu một follower mới được thêm vào phía trước cursor, job đang quét có thể không bao giờ gặp họ; nếu thêm phía sau cursor, họ có thể nhận bài dù chỉ vừa follow sau lúc tác giả đăng. Vì vậy, cần chốt semantics bằng một mốc thời gian/generation: fan-out job xử lý snapshot follower tại thời điểm post, còn follower mới nhận bài theo chính sách backfill riêng. Unfollow cũng có race: worker có thể đã đọc một user vào batch, rồi ghi bài vào feed sau khi cạnh follow bị xóa. Tốt nhất, kiểm tra cạnh follow và ghi feed trong cùng thao tác nguyên tử (nếu dùng Lua/Function trên Cluster, các key phải cùng hash slot). Nếu không có ranh giới nguyên tử đó, dùng generation để vô hiệu hóa công việc cũ và buộc read path xác minh quyền trước khi trả status; kiểm tra rồi ghi bằng hai lệnh riêng vẫn còn race. Với private account, không được dựa vào việc “đã xóa khỏi feed” làm ranh giới authorization. Cursor, retry và unfollow cần idempotent, có snapshot semantics và đường reconcile rõ ràng.

## Streaming API và filtering

Streaming API giải quyết một luồng request khác với trang timeline: kết nối HTTP được giữ mở và trả từng event khi có bài phù hợp. Trước khi viết filter, cần quyết định event nào được phát, ai được xem và client được lọc theo tiêu chí nào. Chương 8 chỉ phát event tạo/xóa status; quyền truy cập được để lại như quyết định sản phẩm. Ví dụ server dùng handler riêng cho GET sample và POST filter, đọc identifier cùng tham số lọc, trả lỗi khi endpoint/đầu vào không hợp lệ, rồi mở HTTP chunked response để gửi từng status. Đây là mã Python 2 và server minh họa, không phải thiết kế triển khai hiện đại hoàn chỉnh.

Khi tạo hoặc xóa status, ứng dụng publish payload lên channel `streaming:status:`. Mỗi kết nối có subscriber riêng, chạy filter rồi chuyển chunk cho client. Nếu socket client đóng, generator dừng và subscriber cần được đóng/reset; subscriber chậm cũng có thể làm output buffer tăng, nên sách nhắc giới hạn buffer cho nhóm Pub/Sub theo tải và số kết nối. Pub/Sub không lưu event: client mất kết nối sẽ bỏ lỡ bài, vì vậy stream này không thay thế mailbox/cursor có replay. Nếu cần reconnect liên tục, hãy dùng log có ID/cursor như Redis Streams hoặc một broker phù hợp, đồng thời đặt retention. Bản thân hai bước “ghi status rồi publish” trong pipeline không tạo một outbox bền vững; crash giữa cập nhật dữ liệu và publish có thể khiến stream không nhận event dù status đã tồn tại.

Các filter trong sách dùng bộ lọc ở phía server. Sample filter tạo một thứ tự giả ngẫu nhiên từ identifier của client, giữ một tỷ lệ bucket theo `status_id % 100`; cùng identifier sẽ chọn cùng bài, nên sự kiện xóa có thể được ghép với cùng tập người nhận mà không lưu ma trận client–status. Track filter tách nội dung thường thành token viết thường: các từ trong một nhóm phải cùng xuất hiện, còn các nhóm khác nhau được nối bằng OR. Follow filter khớp bài do tài khoản được chọn đăng hoặc bài có nhắc `@username`. Location filter đọc tọa độ tùy chọn và kiểm tra nó nằm trong một hay nhiều hình chữ nhật `[kinh độ min, vĩ độ min, kinh độ max, vĩ độ max]`. Cách tách từ theo khoảng trắng không hiểu đầy đủ dấu câu/ngôn ngữ; filter vị trí cũng cần xác thực dữ liệu và ranh giới tọa độ.

Khi xóa bài, sách publish cùng payload status có cờ `deleted`; subscriber chạy lại filter gốc rồi gửi một tombstone chỉ gồm ID và trạng thái xóa. Cách này tránh lưu danh sách người đã nhận bài. Tuy vậy, nếu listener mất kết nối đúng lúc publish, thông báo xóa không được phát lại; read path vẫn phải kiểm tra trạng thái hiện tại và quyền truy cập. Identifier trong query chỉ là định danh trong ví dụ, không phải bằng chứng xác thực. Mọi stream production cần xác thực client, kiểm tra quyền ở server, giới hạn tốc độ và lọc/redact payload trước khi phát.

## Đánh đổi lưu trữ và quyền riêng tư

Follower graph có độ lệch phân bố; một celebrity key có thể rất lớn/hot. Shard graph/feed theo user nhưng multi-key query khó hơn. Thiết kế TTL hay retention cho feed, trạng thái xóa, export và data erasure. Đừng xem Redis là graph database tổng quát; pattern set hợp adjacency đơn giản, nhưng truy vấn nhiều bước có thể cần service khác.

Các chủ đề dựa trên *Redis in Action*, ch. 8; tài liệu hiện hành về [sorted sets](https://redis.io/docs/latest/develop/data-types/sorted-sets/), [sets](https://redis.io/docs/latest/develop/data-types/sets/) và [Streams](https://redis.io/docs/latest/develop/data-types/streams/) và [`ZRANGE BYLEX`](https://redis.io/docs/latest/commands/zrange/) giải thích primitive và điều kiện lex range.

## Tự kiểm tra

**Vì sao celebrity làm fan-out on write khó scale?** Một status phải ghi vào số lượng feed rất lớn.

**Offset pagination có ổn định khi có post mới?** Không; item mới dịch offset. Dùng cursor và tie-break.

**Xóa một status có nghĩa là xóa ngay khỏi mọi feed?** Không dễ khi đã fan-out; cần cleanup, tombstone/filter và chính sách privacy rõ.

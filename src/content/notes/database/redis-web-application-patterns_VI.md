---
title: "Redis trong ứng dụng web: session, giỏ hàng và cache"
category: "Database"
description: "Thiết kế key và luồng đọc ghi cho đăng nhập, cookie, shopping cart, page cache, row cache và analytics."
updated: 2026-10-18
translationKey: "database/redis-web-application-patterns"
---

Một ứng dụng bán hàng có thể dùng Redis để giảm truy vấn lặp lại, giữ session và hỗ trợ giỏ hàng. Mỗi pattern cần trả lời ba câu: dữ liệu có thể dựng lại từ đâu, thao tác nào phải nguyên tử, và khi nào bản sao cũ không còn được chấp nhận. Redis giúp thao tác nhanh; ranh giới nhất quán vẫn do ứng dụng thiết kế.

## Session và cookie đăng nhập

Cookie trên browser nên chứa một định danh ngẫu nhiên, khó đoán; server giữ session tương ứng trong Redis. Ví dụ key `session:<token>` có thể là hash gồm user ID, thời gian tạo và một số metadata. Không đưa mật khẩu hay dữ liệu bí mật trực tiếp vào key. Token cần entropy đủ, cookie cần `Secure`, `HttpOnly`, `SameSite` và TLS.

Cookie ký số có thể mang dữ liệu đã ký để server kiểm tra tính toàn vẹn, nhưng chữ ký không làm dữ liệu bí mật; revoke/đổi quyền cũng khó nếu không có version hoặc danh sách thu hồi. Token ngẫu nhiên chỉ là tham chiếu; server-side session có thể revoke bằng cách xóa key và lưu thêm metadata, đổi lại cần lookup và storage. Dù chọn cách nào, không tin dữ liệu client chỉ vì nó được encode; kiểm tra chữ ký, expiry, scope và quyền ở server.

Mỗi request có thể gia hạn TTL nếu session còn hợp lệ, nhưng sliding expiration làm người dùng hoạt động giữ key lâu vô hạn nếu không có absolute expiry. Lưu thời điểm hết hạn cứng cùng TTL trượt hoặc giới hạn thời gian đăng nhập. Logout xóa session; đổi quyền/thu hồi credential cần invalidation hoặc version check. Khi Redis mất dữ liệu, quy định người dùng đăng nhập lại an toàn thay vì khôi phục session không xác thực.

### Session gần đây, item đã xem và dọn dữ liệu cũ

Chương 2 bổ sung một ZSET `recent:sessions`: member là token, score là thời điểm hoạt động gần nhất. Khi request tới, ứng dụng cập nhật token → user trong Hash và timestamp trong ZSET; nếu có item, thêm item vào `viewed:<token>` với score timestamp rồi trim để chỉ giữ 25 item gần nhất. Đây là danh sách phục vụ giao diện, không phải audit log.

Có hai cách dọn session. TTL xóa key sau thời gian không hoạt động, phù hợp session thuần. Nếu cần giới hạn tối đa N session và giữ dữ liệu phân tích gần đây, ZSET cho phép xóa member cũ nhất theo lô cho đến khi cardinality dưới ngưỡng. Worker phải xóa mọi key phụ thuộc token (`session`, `viewed`, `cart`) và member index; thao tác cần idempotent, có giới hạn batch và tránh hai worker tranh cùng mục. Giới hạn 10 triệu session trong sách là ngưỡng ví dụ, không phải cấu hình khuyến nghị.

## Shopping cart và cập nhật cạnh tranh

Giỏ hàng có thể biểu diễn bằng hash `cart:<user>` với product ID là field, số lượng là value. `HINCRBY` cập nhật số lượng nguyên tử cho một field. Tuy nhiên, tính giá, tồn kho, coupon và checkout không thể dựa vào cart cache: lúc đặt hàng phải đọc nguồn sự thật, kiểm tra lại giá/tồn kho và ghi đơn trong transaction ở database chính.

Nếu request cung cấp số lượng cuối cùng, dùng `HSET` để thay quantity; nếu request là “cộng thêm N”, dùng `HINCRBY`. Phân biệt hai semantics để retry không vô tình cộng số lượng nhiều lần.

Giỏ hàng ẩn danh có token riêng rồi cần merge vào cart đã đăng nhập. Quy tắc merge phải nói rõ số lượng cộng, thay thế hay giới hạn; chạy nhiều request merge đồng thời cần transaction/script hoặc xử lý idempotent. TTL cho cart cũ làm sạch dữ liệu nhưng phải phù hợp vòng đời sản phẩm và yêu cầu khôi phục.

## Page cache và row cache

Page cache lưu HTML/JSON theo URL, locale, quyền và query parameters đã chuẩn hóa. Nếu key bỏ sót tenant, locale hoặc authorization scope, dữ liệu người này có thể hiện cho người khác. Row cache lưu object theo ID; query tổng hợp nhiều row vẫn cần query database hoặc một cache entry riêng có invalidation rõ.

Cache-aside thường đọc Redis, miss thì lấy từ DB rồi `SET` TTL. Khi ghi DB, invalidate sau commit; nếu invalidate trước commit, reader có thể nạp giá trị cũ trong lúc transaction chưa commit. Dù invalidate sau commit, reader cũ vẫn có thể ghi stale data trở lại. Versioned key hoặc cache generation giảm race; nếu chấp nhận stale window thì đặt TTL và đo.

Cache một danh sách kết quả làm invalidation khó hơn cache một row. Cần xác định sự kiện nào làm danh sách thay đổi và phạm vi key bị ảnh hưởng. Không dùng `KEYS pattern` để tìm xóa key trên production lớn; duy trì index key hoặc generation namespace.

Cache toàn trang phù hợp với route public hoặc nội dung gần tĩnh; bỏ qua trang cá nhân, giỏ hàng, checkout và page có dữ liệu quyền riêng. TTL 5 phút trong sách chỉ là ví dụ về freshness window. Key phải hash request đã chuẩn hóa và chứa mọi biến ảnh hưởng nội dung; nếu thiếu locale, query filter, experiment hoặc role, response có thể sai hoặc rò dữ liệu.

## Làm mới row cache theo lịch

Với row hay đổi như số hàng khuyến mãi còn lại, cache toàn trang có thể stale quá lâu nhưng đọc database mỗi request lại tạo tải. Chương 2 minh họa worker làm mới row theo lịch: ZSET `cache:schedule` dùng row ID làm member và thời điểm cần refresh làm score; ZSET `cache:interval` giữ chu kỳ refresh cho row. Worker lấy row tới hạn, đọc từ nguồn chính, serialize vào `cache:row:<id>`, rồi đặt lịch tiếp theo thành `now + interval`. Interval ngắn cho row hot, dài cho row ít đổi; interval ≤ 0 xóa row khỏi hai index và cache.

Trong listing của sách, worker **đặt lịch lần kế tiếp trước khi đọc DB và ghi cache**. Nếu thao tác đọc hoặc ghi lỗi, lần chạy sau có thể không thử lại ngay mà chờ hết interval mới; nếu exception thoát khỏi vòng lặp, worker còn có thể dừng hẳn. Đây là thứ tự minh họa trong code thời sách, không phải quy tắc bắt buộc của refresh-ahead. Một worker bền hơn chỉ đánh dấu lần refresh hoàn tất sau khi đọc và ghi thành công; khi thất bại, giữ việc ở trạng thái đến hạn hoặc lên lịch retry có backoff, ghi log/metric và tiếp tục xử lý row khác.

Đây là **refresh-ahead**, không đảm bảo freshness tuyệt đối. Worker chậm, DB lag hoặc lỗi giữa read và write tạo cache trễ. Nhiều worker cần claim/lock có lease hoặc shard lịch; nếu row bị xóa ở nguồn, phải dọn cache và schedule. Dùng version từ nguồn để worker cũ không ghi đè bản mới hơn. Inventory, giá cuối cùng và quyền truy cập vẫn cần kiểm tra tại transaction quan trọng; cache stale không được quyết định ai mua được hàng.

JSON trong ví dụ giúp debug và hỗ trợ nhiều ngôn ngữ, nhưng cần version schema, giới hạn payload và tránh cho client sửa field tùy ý. Nếu cần update một field nguyên tử thường xuyên, hash hoặc structure khác có thể phù hợp hơn một blob.

## Analytics và leaderboard đơn giản

Page view có thể dùng `INCR` theo route/time bucket; một ZSET có thể lưu item làm member và số lượt xem làm score để tìm trang phổ biến. Trong ví dụ của sách, mỗi request thêm item vào `viewed:<token>` để lưu 25 item gần nhất rồi tăng một ZSET toàn cục `viewed:` bằng score âm; vì score nhỏ đứng trước, item được xem nhiều xuất hiện gần đầu. Mỗi 5 phút worker xóa phần từ rank 20.000 trở đi, sau đó dùng `ZINTERSTORE` với chính ZSET và weight `0.5` để giảm một nửa điểm còn lại. `can_cache()` cho cache trang sản phẩm chỉ khi ID nằm trong top 10.000; nhờ vậy không phải giữ toàn bộ 100.000 trang trong RAM. Đây là popularity có decay để trang mới có cơ hội nổi lên, không phải tổng view chính xác. Các ngưỡng là ví dụ của site trong sách.

Nếu phần HTML vẫn chiếm nhiều RAM, sách gợi ý nén payload sau khi đo CPU/network, dùng edge-side includes để tách phần động khỏi trang, hoặc bỏ whitespace dư trong template. Mỗi cách đổi CPU, latency, độ phức tạp render và invalidation; áp dụng theo profile thực tế thay vì nén mọi response mặc định.

Câu hỏi cần chốt: đếm request hay người dùng duy nhất, xử lý bot/retry thế nào, độ chính xác cần đến đâu và dữ liệu giữ bao lâu? Counter/ranking tổng hợp không phải event log; nếu cần audit hoặc tính lại, ghi event vào log/queue bền vững rồi tổng hợp. Rescale định kỳ có thể mất thông tin về tần suất thật; không dùng score decayed làm số liệu pháp lý/tài chính.

## Khi Redis không khả dụng

Không phải mọi cache miss đều nên fallback đồng loạt xuống database. Dùng timeout ngắn, bulkhead, request coalescing, stale response có điều kiện hoặc giới hạn concurrency. Theo dõi hit rate cùng DB QPS, cache error, stale rate và p95/p99; một cache hit rate cao vẫn không tốt nếu invalidation sai.

Các pattern này diễn giải lại *Redis in Action*, ch. 2, bằng nguyên tắc bảo mật và failure handling hiện hành. Đọc thêm [key expiration](https://redis.io/docs/latest/commands/expire/), [sorted sets](https://redis.io/docs/latest/data-types/sorted-sets/), [client-side caching](https://redis.io/docs/latest/develop/reference/client-side-caching/) và tài liệu session/cookie của framework đang dùng.

## Tự kiểm tra

**Nên lưu toàn bộ thông tin xác thực trong cookie không?** Không; cookie mang token định danh, server giữ trạng thái và cookie có thuộc tính bảo vệ.

**Cart có phải nguồn giá và tồn kho khi checkout?** Không; kiểm tra lại dữ liệu chính tại thời điểm đặt hàng.

**Invalidation sau commit loại bỏ mọi stale write race?** Không; reader đã tải bản cũ trước đó vẫn có thể ghi lại. Cần version/generation hoặc stale window được chấp nhận.

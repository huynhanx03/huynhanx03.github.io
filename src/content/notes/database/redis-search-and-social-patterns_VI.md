---
title: "Tìm kiếm, quảng cáo và social pattern với Redis"
category: "Database"
description: "Học inverted index, autocomplete, ranking, ad targeting, feed và voting; nhận diện chi phí fan-out."
updated: 2026-10-18
translationKey: "database/redis-search-and-social-patterns"
---

Các chương 7–8 của *Redis in Action* xây tính năng tìm kiếm, ad targeting và social từ các structure cơ bản. Giá trị của chúng nằm ở cách biến yêu cầu sản phẩm thành tập hợp, thứ hạng và quan hệ; chi tiết API/module của sách có thể cũ. Trước khi chọn Redis, xác định dữ liệu nào là nguồn sự thật, mức mới cần thiết, cách sửa/xóa và độ lớn của index.

## Inverted index và autocomplete

Inverted index ánh xạ token → tập document. Redis Set hỗ trợ intersection/union cho truy vấn đơn giản; Sorted set có thể xếp hạng theo score; application phải lo tokenize, normalize Unicode, stopword, cập nhật và xóa token cũ. Giao nhiều tập có thể đắt khi cardinality lớn; đo số phần tử trung gian và giới hạn query.

Autocomplete có thể lưu prefix → ứng viên đã sắp hạng hoặc dùng sorted set/lexicographic range. Prefix ngắn thường có cardinality lớn; giới hạn độ dài, top-K, locale và cập nhật score. Đây là pattern tự xây chứ không tương đương search engine có stemming, typo tolerance, facets và ranking phong phú.

### Hai cách autocomplete trong Redis in Action

Với address book, mỗi user chỉ cần 100 liên hệ gần đây: lưu thứ tự đó trong List, lấy danh sách nhỏ về application rồi lọc `startsWith(prefix)`. Ưu điểm là cập nhật thêm/xóa đơn giản và dữ liệu gọn; nhược điểm là mỗi truy vấn chuyển toàn bộ danh sách ứng viên sang app và chỉ tìm trong cửa sổ gần đây. Giới hạn này là một phần của thiết kế sản phẩm, không phải autocomplete đầy đủ trên mọi liên hệ.

Với guild có nhiều thành viên, sách đưa mọi username vào ZSET với cùng score để Redis sắp member theo thứ tự từ điển, rồi tìm đoạn tên bắt đầu bằng prefix. Nếu dùng `ZRANGE ... BYLEX`, các member phải có cùng score; tạo cận dưới/cận trên theo quy tắc byte của encoding và lấy khoảng nửa mở `[min,max)`. Không tự tăng ký tự cuối theo ASCII nếu cho phép Unicode, dấu, chữ hoa/thường hoặc locale khác nhau: collation, normalization và byte ordering có thể làm ranh giới sai. Chuẩn hóa tên nhất quán khi ghi và query, xác định chính sách dấu/hoa thường, giới hạn kết quả, và dùng `ZRANK`/range có giới hạn để không tải toàn bộ guild.

List gần đây phù hợp danh sách cá nhân nhỏ, còn ZSET lexicographic phù hợp tập tên có thể duyệt theo thứ tự. Cả hai là prefix matching đơn giản; typo tolerance, tokenization/ngôn ngữ, relevance ranking và faceting cần search engine hoặc index chuyên biệt.

## Từ văn bản đến inverted index

Thay vì mỗi truy vấn phải đọc mọi tài liệu để tìm từ, inverted index lưu `token → tập document ID`. Khi lập chỉ mục, tokenize văn bản, chuẩn hóa cùng một cách với query, loại stop words nếu chúng không giúp phân biệt, rồi `SADD doc:<token> <id>`. Query `redis cache` lấy giao `SINTER doc:redis doc:cache`; `redis OR cache` lấy hợp; `redis -cache` lấy hiệu. Mỗi phép tập hợp trả đúng kiểu matching đã chọn: AND của từ không tự hiểu cụm từ, thứ tự, stemming, phủ định ngữ nghĩa hay relevance.

Query parser của sách dùng `+` để nhóm synonym thành một hợp trước khi giao với nhóm từ khác, và `-` để loại tập kết quả không mong muốn sau cùng. Đây là cú pháp riêng của ví dụ, cần parse/escape rõ ràng để ký tự trong query không biến thành cú pháp ngoài ý muốn. Nếu không có token dương, chính sách nên là từ chối query hoặc giới hạn kết quả, thay vì vô tình trả cả corpus.

Giao/lấy hợp có thể tạo kết quả trung gian lớn. Ví dụ sách ghi kết quả vào key tạm có ID ngẫu nhiên và TTL để tái dùng khi sort/paginate rồi tự dọn. Ứng dụng cần namespace theo tenant/quyền truy cập, giới hạn thời gian sống và kích thước, tránh key dự đoán được; TTL là cleanup chứ không phải cơ chế phân quyền. Khi tài liệu đổi/xóa, phải gỡ ID khỏi token index cũ rồi thêm index mới một cách nhất quán, nếu không search trả document stale hoặc mồ côi. Tokenization tiếng Anh ASCII trong code sách không xử lý tốt Unicode, ngôn ngữ có dấu, stemming, phrase hay typo.

## Xếp hạng kết quả bằng nhiều index

`SORT` hữu ích khi result set nhỏ và thứ tự đến từ field trong Hash; có thể sắp theo update time, vote count hay title, rồi giữ ID kết quả tạm cho pagination. Nhưng mỗi lần sort có thể đọc metadata ngoài và collection lớn gây CPU/latency. Với truy vấn lặp lại, tạo ZSET cho các thuộc tính xếp hạng và giao với result IDs để chỉ giữ ứng viên phù hợp. Score kết hợp bằng trọng số, ví dụ `score = 0.7 × normalized_votes + 0.3 × recency`; trọng số và normalization là quyết định sản phẩm, phải đo trên dữ liệu và theo dõi tie.

Kết quả ZSET có thể sort tăng/giảm và phân trang theo rank; lưu kết quả tạm kèm TTL để trang kế không tính lại. Tuy nhiên dữ liệu nguồn có thể đổi giữa hai trang, nên xác định chấp nhận snapshot ngắn hay cursor trên index đang thay đổi. ZSET score là double, nên không nhồi nhiều trường số lớn vào score với giả định mọi thứ giữ chính xác.

Sách còn biến chuỗi thành số để dùng ZSET sort. Ví dụ mã hóa tối đa sáu ký tự ASCII đầu: tùy chọn lowercase trước, đổi từng ký tự thành mã số, dùng `-1` đệm cho phần thiếu, rồi cập nhật `score = score × 257 + (mã_ký_tự + 1)`. Cơ số 257 giữ chỗ cho giá trị byte và phân biệt ký tự NUL với phần đệm. Cuối cùng nhân score với 2 rồi cộng 1 nếu chuỗi dài hơn sáu ký tự; bit này phân biệt các chuỗi như `robber` và `robbers`, nhưng không phân biệt `robbers` với `robbery` vì phần khác nhau nằm sau sáu ký tự đầu. Mã hóa dùng khoảng 49 bit, nằm trong vùng score double còn biểu diễn chính xác theo giả định của ví dụ.

Cách này chỉ bảo toàn thứ tự của tiền tố trong miền ký tự được chọn; chuỗi dài hơn có cùng sáu ký tự đầu sẽ hòa điểm, còn Unicode, locale/collation khác và dữ liệu lớn hơn miền chính xác của double cần cách khác. Score từ chuỗi cũng không còn là đại lượng có ý nghĩa để cộng với vote hay recency. Với tên cần thứ tự từ điển, lexicographic range trên ZSET đồng score thường trực tiếp hơn; với sort theo nhiều trường, dùng tie-break rõ ràng hoặc search engine/database phù hợp.

## Ad targeting: từ điều kiện đến giá trị kỳ vọng

Mỗi quảng cáo có type `CPM`, `CPC` hoặc `CPA`, bid/base value, vị trí được phép và các term nội dung. Vị trí là điều kiện bắt buộc: các Set như `idx:req:country:VN`/`idx:req:city:...` được union để tạo ads đủ điều kiện. Term của quảng cáo là điều kiện tùy chọn; ZSET theo term giữ bonus score. Lưu riêng dữ liệu quảng cáo, term index, giá trị gốc và thống kê view/click/action để có thể rebuild index và giải thích điểm.

Phạm vi của sách cần được giữ rõ: ví dụ tập trung vào chọn quảng cáo và học điểm từ tương tác, còn budgeting và account requirements được nói rõ là chưa xử lý. Vì thế, thứ hạng eCPM không phải bước trừ tiền hay giữ chỗ ngân sách. Hệ thống thực tế cần một giao dịch riêng để kiểm tra ngân sách còn lại, áp dụng frequency cap và reserve impression mà không cho hai request đồng thời vượt giới hạn.

Đưa mọi loại bid về estimated CPM để so cùng đơn vị:

```text
eCPM(CPM) = bid đã tính cho 1000 views
eCPM(CPC) = bid_per_click × (clicks / views) × 1000
eCPM(CPA) = bid_per_action × (actions / views) × 1000
```

Nếu CPC bid là $0.25, CTR 0.2%, eCPM kỳ vọng là `$0.25 × 0.002 × 1000 = $0.50`. Với CPA bid $3 và xác suất chuyển đổi 10% sau click, eCPM là `$3 × 0.002 × 0.1 × 1000 = $0.60`. Quảng cáo mới chưa có dữ liệu cần prior/global baseline; nếu lấy CTR quan sát bằng 0 ngay từ đầu, nó sẽ không bao giờ được chọn để có cơ hội học (cold start).

Khi target, lọc theo location trước, rồi cộng bonus từ term khớp vào base eCPM. Sách xấp xỉ bonus nhiều term bằng trung bình min/max bonus và dùng giao với tập location trước khi hợp các bonus để giảm phần tử phải xét. Đây là heuristic dễ dạy, không phải ước lượng thống kê chuẩn; nếu không có term khớp thì phải trả base score, không đưa nhầm quảng cáo từ index rỗng.

Mỗi impression sinh `target_id` gắn với quảng cáo và các term đã khớp. Khi người dùng click hoặc hoàn tất action, hệ thống dùng ID này để tìm đúng impression gốc; nếu không giữ được mối liên hệ đó, click có thể bị tính cho sai quảng cáo hoặc sai ngữ cảnh. Trong ví dụ sách, tập term đã khớp có TTL 15 phút; khi có click/action trong cửa sổ đó, code gia hạn TTL để action theo sau click còn được gán cho impression. Đây là attribution window đơn giản, không phải bảo đảm giao dịch: retry, click lặp và action tới muộn cần ID sự kiện, dedup và chính sách hết hạn rõ. Sách lưu lượt xem và click/action ở ba mức: toàn hệ thống theo loại quảng cáo, từng quảng cáo, và từng cặp quảng cáo–term. Nhờ đó, một quảng cáo mới có thể dùng tỷ lệ chung làm baseline trước khi có đủ dữ liệu riêng.

Quy trình học trong sách diễn ra theo đợt: ghi nhận impression, rồi click/action; định kỳ tính lại eCPM của từng quảng cáo từ bid và tỷ lệ quan sát; sau đó tính eCPM khi quảng cáo xuất hiện cùng từng term. Chênh lệch giữa eCPM theo term và eCPM nền của quảng cáo trở thành bonus cho term đó. Khi request sau khớp term, bonus tham gia xếp hạng. Code sách gọi bước cập nhật tổng hợp sau mỗi 100 lượt phân phối, còn click/action có thể kích hoạt cập nhật sớm hơn; đó là cách gom việc trong ví dụ, không phải tần suất phù hợp cho mọi workload. Đây là cách quy thuộc tương quan đơn giản: nó không chứng minh term gây ra click, và thống kê ít mẫu rất nhiễu. Vì vậy, trong hệ thực tế cần smoothing/prior, ngưỡng tin cậy, cửa sổ attribution, dedup, bot filtering và decay theo thời gian; có thể xử lý log bất đồng bộ để request quảng cáo không phải chờ cập nhật toàn bộ chỉ số. Ngân sách và frequency cap vẫn là invariant giao dịch riêng, không được bảo đảm bằng eCPM.

## Job matching: đảo câu hỏi để dùng inverted index

Cách ngây thơ duyệt từng job rồi so `required_skills − candidate_skills`; tốn công theo toàn bộ số job mỗi lần tìm. Đảo index thành `skill:<name> → tập job yêu cầu kỹ năng đó`. Hợp các tập skill của candidate để biết mỗi job khớp bao nhiêu kỹ năng; một ZSET khác lưu tổng số skill bắt buộc của từng job. Trừ điểm đã khớp khỏi tổng yêu cầu; job có phần thiếu bằng 0 là job mà candidate đáp ứng đủ các skill bắt buộc.

Đây là exact match trên tập kỹ năng, không xếp hạng seniority, mức thành thạo, synonym hay “must-have” so với “nice-to-have”. Chuẩn hóa tên skill và version của vocabulary, tách điều kiện bắt buộc/tùy chọn, thêm location/authorization nếu cần, và đưa những yếu tố đó thành filter/score tách biệt. Nếu số job/skill lớn, lọc theo location/nhóm trước, giới hạn kết quả trung gian, hoặc dùng search index chuyên dụng.

## Ad targeting và voting

Targeting chọn quảng cáo theo giao tập thuộc tính người dùng, campaign và budget; campaign eligibility, frequency cap và budget decrement cần cập nhật nhất quán. Dùng bitmaps/sets để biểu diễn nhóm phù hợp khi miền ID và kích thước hợp lý. Không để race giữa hai request làm vượt budget; dùng script/transaction và kiểm tra side effect.

Voting/rating có thể dùng Set để bảo đảm mỗi user chỉ vote một lần, Sorted set để rank hoặc hash để lưu trạng thái. Cần định nghĩa thay đổi vote, chống abuse, thời gian cửa sổ, tie-break và rebuild score. Đừng coi score Redis là ledger nếu cần audit.

## News feed: fan-out on write hay read

Fan-out on write đẩy post vào feed follower lúc tạo: đọc nhanh nhưng write amplification cao và tài khoản có hàng triệu follower tạo celebrity problem. Fan-out on read trộn post lúc đọc: ghi nhẹ hơn nhưng latency/compute tăng. Hybrid thường dùng push cho follower thường và pull cho tài khoản lớn, với cursor pagination, dedup, ranking và refresh semantics được thiết kế rõ.

### User, status và hai loại timeline

Mô hình trong Chương 8 tách Hash `user:<id>` khỏi Hash `status:<id>`. Một Hash tổng hợp có thể chứa login/name/counters; index `users:` ánh xạ login đã chuẩn hóa sang ID. Tạo user cần bảo vệ tính duy nhất của login trước khi cấp ID. Counter `followers`, `following`, `posts` là dữ liệu dẫn xuất từ graph/timeline; nếu lưu riêng để đọc nhanh, phải có đường reconcile khi thao tác retry hoặc process chết giữa chừng.

Status có ID duy nhất, tác giả, login snapshot, nội dung, thời gian và metadata. Profile timeline là ZSET chứa status ID với timestamp làm score; home timeline cũng là ZSET nhưng chứa ID từ những người user theo dõi. Tách object khỏi timeline giúp dữ liệu bài không bị nhân bản, còn timeline chỉ là index có thể rebuild. Khi đọc, lấy ID theo thứ tự mới nhất rồi batch fetch Hash; bỏ qua ID đã bị xóa. Giới hạn timeline giữ memory bounded. Offset pagination kiểu page 1/page 2 có thể lặp hoặc bỏ status khi có bài mới chèn giữa hai request; production thường dùng cursor `(timestamp, id)`.

### Follow, unfollow và đồng bộ timeline

Lưu `following:<uid>` và `followers:<uid>` để có thể đi graph theo cả hai hướng. Khi follow, ghi hai cạnh, cập nhật counters và chép một cửa sổ status gần nhất từ profile người được follow vào home timeline; khi unfollow, gỡ cạnh hai phía và xóa status của người đó khỏi timeline hiện tại. Các cập nhật liên quan cần atomic/idempotent hoặc có reconcile; nếu không, count có thể lệch khỏi graph. Đặt giới hạn số bài seed và giữ home timeline tối đa N entry để thao tác không tăng vô hạn.

Khi user đăng bài, tạo status và thêm vào profile ZSET trước, rồi syndicate ID vào home timeline follower. Với tài khoản thường, fanout đồng bộ hoặc một batch nhỏ cho trải nghiệm mới ngay; với tài khoản rất nhiều follower, đưa phần còn lại vào task queue theo batch. Đây là tradeoff write amplification và độ mới: fanout async khiến một số timeline nhận bài trễ hoặc worker chạy lặp. Dùng status ID làm dedup member, retry idempotent, giới hạn batch/backpressure, theo dõi lag và có cách rebuild/reconcile timeline. Ngưỡng 1,000 follower trong sách chỉ là con số ví dụ từ thời điểm viết.

Xóa status cần kiểm tra đúng owner và cập nhật object, timeline cùng counter. Trong ví dụ Chương 8, code xóa Hash status và gỡ ID khỏi profile timeline cùng home timeline của chính tác giả; nó không đi qua tất cả follower để xóa bản sao đã fan-out. Home timeline của follower còn ID mồ côi, nhưng bước đọc lấy Hash rỗng rồi bỏ ID đó. Sách để bài tập riêng về dọn các ID này. Hệ thống lớn có thể dọn theo batch hoặc giữ tombstone để reader ẩn ngay; phải tính quyền riêng tư, retry idempotent và counter không bị giảm lặp. Khi streaming, phát sự kiện xóa có payload cần thiết trước khi xóa Hash để filter có thể nhận diện đúng status; tuyệt đối không phát field nhạy cảm cho subscriber không được phép xem.

### Streaming API và event filtering

Streaming API trả một HTTP response dài, gửi từng event theo chunk thay vì gom thành một response. Sách publish event post/delete vào Redis Pub/Sub; listener subscribe, lọc theo sample/follow/keyword/location rồi ghi chunk cho client. Sample trong sách tạo tập bucket từ seed là client ID rồi xét `status_id % 100`, nên cùng một status vẫn được chọn cho cùng client khi sự kiện post hoặc delete được lọc lại. Khi xóa, publisher gửi payload status đã đánh dấu deleted; consumer chạy lại cùng filter để báo xóa cho đúng nhóm client từng đủ điều kiện, thay vì lưu danh sách mọi client đã nhận từng status. Cơ chế này chỉ tái tạo quyết định filter, không bảo đảm client đang offline sẽ nhận được event. Track filter cần quy định AND/OR giữa từ; follow filter có thể xét tác giả và mention; location filter cần kiểm tra điểm nằm trong bounding box và xác định thứ tự longitude/latitude.

Pub/Sub chỉ gửi cho subscriber đang kết nối: disconnect hoặc buffer vượt giới hạn có thể làm mất event; nó không phải log để replay. Client streaming cần xác thực/quyền truy cập, rate limit, giới hạn số filter, timeout/heartbeat, hủy subscription khi client đóng socket, xử lý slow consumer và giới hạn output buffer. Redis connection cho Pub/Sub thường tách khỏi pool command thường. Nếu client cần resume từ event ID, đảm bảo delivery hoặc audit, hãy ghi event vào Streams/Kafka hay dùng outbox rồi phục vụ stream từ log bền vững. Không để lỗi broadcast làm hỏng transaction tạo status.

## Feature hiện đại và ranh giới

Redis Search/Query, JSON, vector search và time series có sẵn trong một số distributions/offerings; khả năng, giấy phép và deployment thay đổi theo sản phẩm. Xác minh docs/edition hiện hành. Pattern thủ công trong sách giúp học data modeling nhưng khi yêu cầu text search phức tạp tăng, dedicated search service có thể đơn giản và chính xác hơn.

Nguồn: *Redis in Action*, ch. 6–8; [Redis data types](https://redis.io/docs/latest/develop/data-types/), [`ZRANGE BYLEX`](https://redis.io/docs/latest/commands/zrange/), [Redis Stack](https://redis.io/docs/latest/operate/oss_and_stack/), và tài liệu module tương ứng với deployment đang dùng.

## Tự kiểm tra

**Inverted index có nghĩa mỗi từ khóa giữ toàn bộ document text?** Thường nó giữ ID/tập document và metadata cần cho matching/ranking.

**Fan-out on write có chi phí ở đâu?** Mỗi post phải cập nhật nhiều feed; write amplification và celebrity account làm chi phí tăng.

**Pattern thủ công thay thế được search engine mọi trường hợp?** Không; tokenization, ranking, typo tolerance và cập nhật phức tạp có thể cần hệ chuyên dụng.

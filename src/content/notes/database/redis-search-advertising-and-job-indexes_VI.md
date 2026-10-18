---
title: "Search, quảng cáo và job index trên Redis"
category: "Database"
description: "Dựng inverted index, xếp hạng, target quảng cáo và tìm việc; hiểu chi phí cập nhật và chọn module hiện đại."
updated: 2026-10-17
translationKey: "database/redis-search-advertising-and-job-indexes"
---

Tìm kiếm bắt đầu bằng một câu hỏi tưởng đơn giản: “những document nào khớp?” Nhưng một hệ search còn phải chuẩn hóa văn bản, xếp hạng, lọc, cập nhật và xử lý document bị xóa. Redis cơ bản có thể dạy inverted index bằng Set và ranking bằng Sorted Set; khi yêu cầu lớn hơn, Redis Search hoặc search engine chuyên dụng cung cấp nhiều semantics mà tự ghép structure không có.

## Inverted index bằng Set

Giả sử document 17 chứa các từ `database`, `index`, `storage`. Ta lưu `term:database → {17,...}`, `term:index → {17,...}`. Query “database AND index” lấy intersection; OR lấy union. Trước khi ghi, text cần tokenize, lowercase, normalize Unicode, bỏ stopword theo ngôn ngữ và có thể stemming. Những bước này phải giống nhau khi index và query.

Set intersection có thể tốn chi phí theo số phần tử tham gia; thứ tự operand/chọn tập nhỏ trước ảnh hưởng lượng dữ liệu trung gian. Update document phải bỏ ID khỏi các term cũ rồi thêm term mới. Nếu crash giữa hai bước, index tạm thời sai; cần script, versioned rebuild hoặc source of truth để tái tạo. Xóa document cũng phải xóa mọi posting và key rỗng.

## Sắp xếp kết quả

Sau khi có candidate IDs, lọc theo quyền, trạng thái và thuộc tính; sau đó xếp hạng. Sorted Set biểu diễn member duy nhất cùng numeric score, tốt cho score đã tính sẵn. Non-numeric sort như tên cần mapping/normalized sort key; locale-aware collation không tự có từ Redis score. `ZINTERSTORE`/`ZUNIONSTORE` có thể kết hợp score nhưng tạo collection trung gian và write amplification.

Một query tốt giới hạn candidate sớm, top-K và dữ liệu trả về. Đưa toàn bộ kết quả lên application để sort thường tốn network/RAM. Cũng cần tie-break ổn định để pagination không nhảy khi score bằng nhau.

## Ad targeting

Ad server có thể lập index campaign theo thuộc tính target như country, topic, device. Request lấy intersection candidate, loại campaign hết ngân sách/đã quá frequency cap, tính score theo bid/relevance rồi chọn quảng cáo. Tương tác người dùng cập nhật số impression/click và có thể điều chỉnh model.

Budget decrement phải chống race: hai request cùng đọc còn một impression rồi cả hai phục vụ. Dùng atomic script/transaction cho phần check-and-reserve, nhưng không giữ script dài. Logging impression/click nên là event có ID để deduplicate và tính billing; counter tổng hợp riêng không đủ audit. Privacy/consent và thời hạn dữ liệu người dùng phải nằm trong thiết kế.

## Job search theo từng job và theo index

Approach từng job duyệt jobs rồi kiểm tra thuộc tính — dễ hiểu nhưng cost tăng tuyến tính theo toàn bộ dữ liệu mỗi query. Inverted index theo skill/location/seniority thu hẹp candidate rồi rank; tradeoff là write/update phải giữ index đồng bộ. Range salary/date cần sorted structure phù hợp chứ Set intersection đơn thuần không biểu diễn range hiệu quả.

## Khi chọn Redis Search

Tự xây index hợp để học hoặc query domain nhỏ, đơn giản. Khi cần phrase/proximity, stemming, typo tolerance, facets, schema/index management hoặc relevance phức tạp, đánh giá Redis Search/Query nếu edition hỗ trợ hoặc dùng search engine. Migration từ sách phải kiểm tra API, module availability, licensing và cluster behavior ở deployment hiện hành.

Các chủ đề đến từ *Redis in Action*, ch. 7; tham khảo [Sets](https://redis.io/docs/latest/develop/data-types/sets/), [Sorted Sets](https://redis.io/docs/latest/develop/data-types/sorted-sets/) và tài liệu Redis Search cho đúng edition.

## Tự kiểm tra

**Inverted index query AND làm gì?** Tìm giao các posting lists của token đã chuẩn hóa.

**Vì sao cập nhật index nhiều key có thể lỗi giữa chừng?** Redis atomic command không làm cả chuỗi command thành transaction; cần script/transaction hoặc rebuild strategy.

**Counter impression đủ để tính billing?** Không nếu cần dedup/audit; cần event identity và durable record.

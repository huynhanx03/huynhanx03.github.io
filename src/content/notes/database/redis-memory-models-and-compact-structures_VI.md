---
title: "Tiết kiệm RAM với encoding, shard và dữ liệu đóng gói trong Redis"
category: "Database"
description: "Hiểu compact encoding, chi phí collection lớn, sharded hash/set và cách đóng gói bit mà vẫn giữ khả năng cập nhật."
updated: 2026-10-18
translationKey: "database/redis-memory-models-and-compact-structures"
---

Redis tối ưu dữ liệu nhỏ bằng representation gọn, rồi có thể đổi sang representation phù hợp hơn khi collection lớn lên. Vì vậy hai key có cùng số logical item đôi khi dùng RAM và tốc độ khác nhau. Đây là chi tiết implementation phụ thuộc version; mục tiêu của người thiết kế là giảm overhead có đo được mà không làm thao tác đọc/ghi trở nên quá đắt. Compact encoding là một lựa chọn theo kích thước, không phải lúc nào cũng là encoding “tốt hơn”.

## Compact encoding và ngưỡng chuyển đổi

### Compact encoding tiết kiệm bộ nhớ như thế nào

Một linked list thông thường cần node, pointer tới node trước/sau, pointer tới chuỗi và metadata cho từng giá trị. Ziplist đời cũ thay các node riêng bằng một dãy byte liên tiếp: mỗi entry ghi độ dài entry trước, encoding/độ dài entry hiện tại rồi payload. Khi đọc tuần tự, dữ liệu nằm sát nhau; Redis tránh được nhiều pointer và allocation. Trong ví dụ 3-byte string của sách, linked-list node tốn khoảng 21 byte overhead trên nền 32-bit, còn ziplist chỉ khoảng 2 byte overhead cho mỗi entry. Đây là phép tính minh họa theo layout/kiến trúc cũ, không phải dự báo RAM chính xác trên máy hiện nay.

Đổi lại, entry nằm giữa dãy có thể cần decode, re-encode hoặc dịch phần byte sau nó khi ghi. Intset lưu số nguyên theo thứ tự trong mảng đặc thù; lookup có thể dùng binary search, nhưng thêm/xóa phần tử vẫn phải dịch dữ liệu. Nếu giới hạn entry hoặc độ dài value bị vượt, Redis chuyển sang representation tổng quát hơn. Chuyển đổi giúp collection tiếp tục mở rộng, nhưng tạo thêm chi phí bộ nhớ và có thể làm một lệnh vượt ngưỡng mất thời gian hơn bình thường.

Sách mô tả Redis 2.6 với các ngưỡng mặc định lịch sử sau:

| Cấu trúc trong sách | Ngưỡng số entry | Ngưỡng độ dài mỗi entry | Ghi chú |
| --- | ---: | ---: | --- |
| LIST (ziplist) | 512 | 64 byte | Vượt một trong hai giới hạn sẽ chuyển khỏi ziplist. |
| HASH (ziplist) | 512 | 64 byte | Mỗi field và value phải nằm trong giới hạn encoding. |
| ZSET (ziplist) | 128 | 64 byte | Giới hạn entry thấp hơn do mỗi member có thêm score. |
| SET (intset) | 512 | Không áp dụng | Mọi member phải là số nguyên thập phân phù hợp kiểu số nguyên có dấu của build. |

Không dùng bảng này như cấu hình hiện hành. Tài liệu Redis hiện tại ghi nhận Hash và ZSET dùng cấu hình `*-max-listpack-*`; Set nhỏ có thể dùng intset, và từ Redis 7.2 còn có listpack cho Set nhỏ. Ví dụ các default hiện tại được tài liệu nêu là Hash 512 entry/64 byte, ZSET 128/64, intset 512; Redis 7.2 bổ sung listpack Set 128 entry/64 byte. List có quicklist/listpack-node settings riêng. Đọc cấu hình của đúng bản Redis trước khi tune.

Một thí nghiệm trong sách cố ý nâng giới hạn ziplist lên rất cao rồi đo thao tác chuyển phần tử giữa hai đầu List: khoảng 50 nghìn lệnh/giây với 1 nghìn entry, 17 nghìn với 50 nghìn entry và chỉ khoảng 550 với 100 nghìn entry. Đây là kết quả Redis 2.6 trên phần cứng xuất bản thời đó, không phải benchmark dự báo cho server hiện nay. Nó minh họa điểm quan trọng: cấu trúc gọn có thể giảm allocation/RAM nhưng một thao tác thay đổi có thể phải dịch nhiều byte, nên latency tăng mạnh khi collection phình ra.

Đo representation thực tế bằng `OBJECT ENCODING`, mức dùng gần đúng theo key bằng `MEMORY USAGE`, và latency với cardinality/value length gần production. Đánh giá cả p95/p99 và thời gian chuyển encoding; đừng tăng ngưỡng chỉ vì RSS giảm trong một microbenchmark.

## Chia Hash/Set theo shard để giữ từng mảnh nhỏ

Sharding trong chương này chia một logical Hash/Set thành nhiều key trên cùng Redis node để mỗi phần vẫn đủ nhỏ cho compact encoding. Với ID số tuần tự, shard có thể là `floor(id / shard_size)`; các ID gần nhau nằm chung một Hash. Với key chuỗi tùy ý, chọn số shard từ số phần tử dự kiến và kích thước mục tiêu, rồi dùng `CRC32(key) mod shard_count`. Lookup vẫn nhanh vì client tính được shard từ field/member, nhưng thao tác toàn collection cần đọc nhiều shard rồi ghép kết quả.

Sách minh họa Hash tra cứu city ID: một Hash lớn khoảng 320 nghìn record dùng xấp xỉ 44 MB trên máy 64-bit; chia thành shard 1.024 mục, đặt ngưỡng ziplist đủ cho value dài nhất và dùng compact encoding giảm ví dụ xuống khoảng 12 MB. Đây là dữ liệu/bản Redis cũ; tỷ lệ 70% không áp dụng cho mọi schema. Giá trị ngắn làm phần metadata chiếm tỷ lệ lớn hơn nên thường có tiềm năng tiết kiệm cao hơn.

`shard_size`, số phần tử dự kiến và hash function là một phần của layout dữ liệu. Đổi một trong số đó có thể đổi vị trí của rất nhiều member; version hóa cấu hình và lập kế hoạch reshard/copy/verify/cutover trước. Numeric sharding hợp ID dày, tăng đều; UUID rút gọn hay ID ngẫu nhiên thưa cần hash để không tạo shard ID khổng lồ và thưa. Trong ví dụ unique visitor của sách, tác giả thêm tiền tố không phải số trước ID 56-bit để ép hàm shard chọn đường hash thay vì coi ID như dãy tuần tự.

Hash/Set còn giữ được các thao tác theo một field/member; merge, cardinality toàn cục hoặc set algebra cần fan-out. ZSET khó shard hơn: `ZRANK`, `ZRANGE`, score range/count và xóa theo rank/score đều cần tổng hợp shard để trả kết quả toàn cục. Nếu chỉ cần top/bottom nhỏ, có thể giữ auxiliary top/bottom ZSETs có giới hạn; còn query xếp hạng tùy ý thường mất lợi ích latency. Chia List cũng cần phối hợp hai đầu/ blocking semantics; trong sách, API List sharded đầy đủ được để sang ví dụ Lua ở chương sau.

## Đóng gói bit/byte vào String

String của Redis có thể dùng như mảng byte ngẫu nhiên truy cập. `SETBIT`/`GETBIT` lưu cờ theo ID; `SETRANGE`/`GETRANGE` ghi/đọc record cố định nhiều byte. Bitmap hợp ID dày và có giới hạn; ID lớn nhưng thưa làm key dài đến offset cao nhất chứ không chỉ theo số bit đang bật. Cần định nghĩa byte order, bit numbering và giới hạn độ dài String theo đúng release.

Ví dụ của sách lưu location của user có ID tuần tự bằng hai byte: byte đầu là index country, byte hai là index state/province trong bảng mã tương ứng. Mã `0` được dành cho “chưa biết”; giá trị index thực tăng 1 để không nhầm country đầu tiên với byte zero của String mới. Với `2^20` user mỗi shard, shard ID là `floor(user_id / 2^20)`, vị trí record là `(user_id mod 2^20) × 2`, rồi ghi bằng `SETRANGE`. Một shard đầy có khoảng 2 MiB payload và tránh tạo hàng triệu key cho từng user.

Thử tính với `user_id = 1.048.579`: vì `2^20 = 1.048.576`, user này nằm ở shard `1`, tại vị trí `3` trong shard. Mỗi record dài hai byte nên offset là `3 × 2 = 6`; hai byte cần đọc hoặc ghi là offset `6` và `7`. ID đầu tiên trong shard có offset `0`, vì vậy phép chia vừa chọn shard vừa giữ layout liên tục. Nếu ID có khoảng trống lớn, String phải chứa phần đệm đến offset đó; cách này hợp ID dày, gần tuần tự hơn ID ngẫu nhiên thưa.

Đọc một nhóm user đã biết ID có thể batch `GETRANGE` theo offset qua pipeline; sách gom các lệnh theo từng 1.000 ID để hạn chế round trip. Tính aggregate toàn bộ thì đọc các block liên tiếp của từng shard rồi giải mã từng cặp byte, bỏ qua record chưa khởi tạo hoặc code nằm ngoài bảng hợp lệ. Một ZSET phụ giữ ID lớn nhất từng được ghi để xác định shard/block cuối cần quét. Ví dụ của sách cập nhật watermark bằng một ZSET tạm có UUID, sau đó hợp nhất vào ZSET watermark với phép lấy `max` và xóa key tạm; key riêng tránh các lần cập nhật dùng chung tên tạm. Với một nhóm con, đọc đúng offset của từng ID sẽ rẻ hơn quét hết, nhưng chi phí tăng theo kích thước nhóm và số round trip nếu không batch. Đóng gói tiết kiệm key/object overhead nhưng schema trở nên opaque: thêm field, đổi codebook, phân biệt unknown và xử lý overflow cần migration có version, kiểm tra round-trip và cách giải mã dữ liệu cũ.

## Tổng hợp trên shard

Nếu counter nằm ở nhiều shard, đọc từng shard rồi cộng có thể tạo kết quả không nhất quán theo thời điểm; ghi một request vào một shard cũng cần chống retry duplicate. Aggregation định kỳ hoặc stream sự kiện có thể phù hợp hơn. Với Redis Cluster, một lệnh chỉ thấy key ở slot/node theo routing; không giả định global atomicity.

*Redis in Action*, ch. 9, tr. 210–227, giải thích ziplist/intset, chi phí collection compact dài, sharded Hash/Set, giới hạn ZSET sharding và String bit/byte packing. Các ngưỡng legacy và số đo trong sách được giữ làm ví dụ theo Redis 2.6, không phải sizing hiện tại. Đối chiếu [Redis memory optimization](https://redis.io/docs/latest/management/optimization/memory-optimization/), [CONFIG GET](https://redis.io/docs/latest/commands/config-get/), [OBJECT ENCODING](https://redis.io/docs/latest/commands/object-encoding/) và [String commands](https://redis.io/docs/latest/develop/data-types/strings/).

## Tự kiểm tra

**Compact encoding luôn nhanh hơn?** Không; ít overhead nhưng thao tác trên collection lớn có thể tốn hơn.

**Vượt ngưỡng entry hay độ dài thì Redis làm gì?** Redis chuyển sang representation tổng quát hơn; kiểm tra config và đo latency ở lần chuyển đổi, đừng chỉ nhìn bộ nhớ sau chuyển.

**Bitmap tốt cho tập ID rất thưa và lớn?** Thường không; các khoảng bit không dùng vẫn chiếm không gian.

**Sharding làm update logical object luôn atomic?** Không; nhiều bucket tạo thao tác đa key, có constraint slot và coordination riêng.

**Có nên chia ZSET lớn rồi tiếp tục gọi `ZRANK` như trước?** Không thể giả định vậy; rank toàn cục cần ghép thông tin từ các shard hoặc giữ index top/bottom phụ theo query đã giới hạn.

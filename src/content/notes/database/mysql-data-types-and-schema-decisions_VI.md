---
title: "Chọn data type và thiết kế schema MySQL"
category: "Database"
description: "So sánh kích thước, miền giá trị, collation, NULL và cách chọn identifier cho InnoDB schema."
updated: 2026-10-18
translationKey: "database/mysql-data-types-and-schema-decisions"
---

Data type là một quyết định về correctness, storage, index size, sorting và protocol giữa database với ứng dụng. Chọn theo miền giá trị thật và phép toán cần làm, không theo giá trị lớn nhất có thể tưởng tượng. Sai type có thể overflow, so sánh sai, mất precision hoặc làm index lớn thêm trên mọi row.

## Integer và identifier

`TINYINT`, `SMALLINT`, `INT`, `BIGINT` khác nhau về miền lưu trữ; `UNSIGNED` tăng phía dương nhưng không dùng được cho mọi phép trừ/negative. Chọn width có headroom dựa trên tăng trưởng và semantics. `AUTO_INCREMENT` phù hợp ID nội bộ; UUID phân tán tránh coordinator nhưng rộng hơn, random UUID có thể làm clustered index page split/cache locality kém. UUIDv7/time-ordered IDs giảm random insertion nhưng cần support/version và không nên dùng để giấu thông tin nhạy cảm.

Có thể tự tính miền để khỏi chọn theo cảm giác. `TINYINT` signed chứa từ −128 đến 127; `TINYINT UNSIGNED` chứa từ 0 đến 255. Cả hai vẫn dùng một byte: `UNSIGNED` đổi cách diễn giải miền, không làm cột lớn hơn. Nếu cột lưu số dư, phép trừ có thể tạo số âm nên unsigned chưa chắc đúng; nếu lưu số lần retry không âm, unsigned có thể diễn tả miền tự nhiên hơn. Tương tự, `INT(11)` trong ví dụ cũ không có nghĩa là 11 chữ số hay một miền rộng hơn `INT`: đó là display width, không giới hạn giá trị, và display width cho integer đã deprecated trong MySQL 8.4. Đừng dùng nó để định kích thước ID.

InnoDB clustered primary key chứa row data; secondary index chứa primary key làm pointer. Primary key rộng làm mọi secondary index lớn hơn. Chọn PK ngắn, immutable và unique; nếu primary key có business meaning thường thay đổi, cân nhắc surrogate key cùng unique constraint cho business key.

## Exact number, approximate number và tiền

`DECIMAL(p,s)` giữ decimal exact theo precision/scale định nghĩa; `FLOAT`/`DOUBLE` là binary floating-point approximate. Giá tiền có thể lưu integer minor units (cent) với currency rõ hoặc DECIMAL phù hợp quy tắc rounding. Không cộng float rồi mong kết quả tiền exact. Kiểm tra range, rounding và overflow ở ứng dụng lẫn database.

`p` là tổng số chữ số, `s` là số chữ số sau dấu thập phân. Vì vậy `DECIMAL(5,2)` có miền thông thường từ `-999.99` đến `999.99`, không phải năm chữ số ở mỗi phía. MySQL 8.4 lưu `DECIMAL` dạng nhị phân và gom tối đa chín chữ số vào bốn byte; `DECIMAL(18,9)` cần bốn byte cho chín chữ số nguyên và bốn byte cho chín chữ số lẻ. Dấu chấm không chiếm một byte riêng trong phần dữ liệu này. Chi tiết này khác phép tính minh họa trong sách; dùng bảng storage theo đúng phiên bản thay vì cộng độ dài chuỗi hiển thị. `DECIMAL` chính xác không có nghĩa miền là vô hạn: chọn đủ `p`, `s` và quy tắc làm tròn, rồi kiểm tra overflow ở biên.

## String, collation và binary

`CHAR` có độ dài cố định semantics padding; `VARCHAR` lưu variable-length với overhead length; `TEXT/BLOB` cho payload lớn nhưng có thể ảnh hưởng row layout, off-page storage, sort/temp và index prefix. `ENUM` compact nhưng đổi danh sách cần DDL và thứ tự nội bộ không giống tự nhiên; dùng khi domain ổn định và hiểu migration cost.

`ENUM` lưu một tập giá trị cố định và có thứ tự nội bộ theo vị trí khai báo. Vì vậy `ORDER BY status` có thể xếp theo vị trí trong danh sách thay vì alphabet; thêm giá trị vào giữa cũng cần xem lại semantics của dữ liệu và DDL. Nếu thứ tự hiển thị là quy tắc giao diện, ghi quy tắc đó rõ hoặc dùng lookup/sort key riêng. Tránh dùng `ENUM` làm ID phổ quát nếu danh sách có thể thay đổi độc lập với schema.

`BIT` và `SET` có thể gói cờ, nhưng biểu diễn qua driver và phép đọc/so sánh dễ gây bất ngờ. Với một tập cờ ổn định, cột integer làm bitmask có thể dễ tương tác hơn nếu ứng dụng định nghĩa mask, kiểm tra bit và kiểm tra bit chưa dùng. Đổi lại, một bitmask khó ràng buộc từng quyền bằng FK và khó truy vấn từng cờ hơn bảng quan hệ. Chọn cách lưu theo cách dữ liệu được kiểm tra, không chỉ theo số byte.

Charset định nghĩa cách encode; collation quyết định case/accent sensitivity, equality và order. `utf8mb4` hỗ trợ Unicode đầy đủ; không dựa vào default thay đổi giữa version/database/connection. Kiểm tra collation của column tham gia JOIN/unique/index để tránh conversion và semantics không như mong đợi. Dữ liệu opaque/hash/file dùng binary type, không text collation.

Schema sinh từ ORM hoặc migration generator vẫn cần review. Kiểm tra cột có cùng ý nghĩa dùng cùng kiểu và collation, index có key phù hợp, độ dài `VARCHAR` có thật sự cần thiết, và các constraint có được tạo ở database hay chỉ kiểm tra trong application. Một bảng có hàng trăm cột có thể tăng chi phí xử lý row và khiến các thao tác khó quản lý; nhóm thuộc tính ít dùng hoặc thay đổi khác nhịp có thể cần mô hình khác, nhưng không nên gom mọi thứ vào JSON chỉ để giảm số cột.

## Date, time, NULL và bit

`DATE`, `TIME`, `DATETIME`, `TIMESTAMP` khác miền giá trị, cách chuyển timezone và hành vi tự khởi tạo/cập nhật. `DATETIME` giữ giá trị lịch như đã nhập và không tự đổi theo timezone; `TIMESTAMP` chuyển từ timezone session sang UTC khi lưu và ngược lại khi đọc, nhưng có range hẹp hơn (đến năm 2038 trong MySQL 8.4). Vì vậy, chọn `TIMESTAMP` không chỉ vì kích thước nhỏ hơn: dữ liệu lịch tương lai xa hay thời điểm pháp lý cần xét range và policy rõ. Với thời điểm tuyệt đối, thường chuẩn hóa input về UTC; với lịch địa phương như “mở cửa lúc 09:00”, giữ semantics local cùng timezone riêng thay vì giả làm một instant.

Sách mô tả MySQL cũ chỉ lưu temporal tới giây, nhưng MySQL hiện hành hỗ trợ fractional seconds đến microsecond (`TIME(fsp)`, `DATETIME(fsp)`, `TIMESTAMP(fsp)`, `fsp` tối đa 6). Chọn precision theo độ chính xác nghiệp vụ và thứ tự sự kiện, vì phần lẻ tốn thêm storage. Không tự mã hóa epoch vào `BIGINT` trừ khi có lý do tương thích/định dạng cụ thể; kiểu temporal giữ được phép toán và biểu diễn dễ đọc hơn. [Manual MySQL 8.4](https://dev.mysql.com/doc/refman/8.4/en/datetime.html) mô tả range, timezone và fractional seconds; [bảng storage](https://dev.mysql.com/doc/refman/8.4/en/storage-requirements.html) thể hiện chi phí theo precision.

NULL biểu diễn unknown/absent, không bằng 0/rỗng; `=` không match NULL, dùng `IS NULL`, và unique index có quy tắc NULL riêng. `NOT NULL` giúp ràng buộc invariant và có thể giảm branch. Boolean trong MySQL thường là alias numeric nhỏ; `BIT` có representation/driver behavior cần xác nhận.


“Tránh NULL” là lời khuyên tối ưu có điều kiện, không phải luật dữ liệu. Nếu miền giá trị có trạng thái chưa biết/chưa cung cấp, hãy dùng `NULL` thay vì giá trị ma thuật như `-1`, chuỗi rỗng hoặc ngày `0000-00-00`; sentinel có thể va vào giá trị hợp lệ và buộc mọi query nhớ ngoại lệ. `NULL` của SQL tạo logic ba giá trị nên predicate, aggregate và unique constraint cần hiểu rõ. Đặt `NOT NULL` khi miền dữ liệu thật sự yêu cầu có giá trị, không chỉ để tránh xử lý `NULL`.

### Lưu ý cụ thể theo từng kiểu

- Số nguyên MySQL có `TINYINT`, `SMALLINT`, `MEDIUMINT`, `INT`, `BIGINT` lần lượt rộng 8, 16, 24, 32, 64 bit; signed và unsigned dùng cùng lượng byte nhưng miền khác. Chọn đủ headroom và dùng cùng type, width, signedness cho FK/join hai phía để tránh implicit conversion hoặc range mismatch.
- Sách nêu integer arithmetic thường dùng giá trị 64-bit; với MySQL 8.4, phép tính số nguyên dùng signed `BIGINT` hoặc chuyển sang `DOUBLE` tùy biểu thức. Vì thế, đừng dựa vào `BIGINT UNSIGNED` lớn hơn `2^63−1` để thực hiện phép toán số học an toàn; xác định miền kết quả, cast có chủ đích khi phù hợp, và kiểm tra overflow/rounding trên phiên bản chạy thật. Display width như `INT(11)` không tăng miền lưu trữ và đã deprecated trong MySQL 8.4.
- `FLOAT`/`DOUBLE` là số gần đúng; `DECIMAL(p,s)` là số thập phân chính xác trong precision đã khai báo nhưng phép tính có chi phí khác. Tiền nên dùng đơn vị nhỏ nhất bằng integer hoặc `DECIMAL` theo quy tắc làm tròn. Chọn theo semantics trước, tối ưu sau.
- `CHAR` hợp giá trị ngắn, gần đồng độ dài hoặc ít cập nhật; `VARCHAR` hợp độ dài thay đổi nhưng row update có thể gây phân mảnh tùy engine. Semantics trailing spaces phụ thuộc version/type; binary `BINARY`/`VARBINARY` so byte và padding bằng zero byte, còn text áp charset/collation. Tối đa độ dài khai báo không phải bytes luôn được cấp cho mỗi row ở mọi engine. Giá trị `VARCHAR` có thêm byte lưu độ dài thực tế: thường một byte nếu giới hạn cột tối đa 255 byte, hai byte nếu lớn hơn; charset nhiều byte khiến số ký tự tối đa và số byte tối đa khác nhau. Dù một hàng ngắn có thể chỉ lưu vài ký tự, khai báo quá rộng vẫn có thể làm một số đường sort/temporary-table tốn RAM hơn vì server phải dự trù theo metadata. Vì vậy `VARCHAR(200)` không nhất thiết tốn 200 byte trên disk cho mỗi giá trị, nhưng cũng không miễn phí trong mọi execution path.
- `TEXT` có charset/collation, `BLOB` lưu bytes; mỗi loại có họ kích thước từ `TINY...` tới `LONG...`, với prefix lưu độ dài phụ thuộc dung lượng tối đa. InnoDB có thể để payload lớn ngoài page chính. Chỉ mục thường cần prefix length, không thể yêu cầu một B-tree thông thường index toàn bộ payload tùy ý; index prefix giúp lọc ứng viên nhưng có thể phải đọc row để so phần còn lại. Sách nói việc sort BLOB/TEXT chỉ xét tối đa `max_sort_length` byte đầu, nên các giá trị có prefix dài giống nhau cần tie-breaker nếu ứng dụng đòi thứ tự ổn định. Trong các engine/version lịch sử, text lớn còn có thể khiến temporary table phải xuống disk. MySQL 8.4 TempTable hỗ trợ BLOB/TEXT trong một số in-memory internal temporary table; không áp nguyên trạng giới hạn cũ “có TEXT thì bắt buộc disk”. Xem [điều kiện temporary table hiện hành](https://dev.mysql.com/doc/refman/8.4/en/internal-temporary-tables.html), xác nhận giới hạn prefix/sort theo version và đo query cụ thể.
- `ENUM` lưu giá trị theo index của thứ tự khai báo: cách viết gọn nhưng thứ tự `ORDER BY` là thứ tự enum, không phải alphabet hay quy tắc business tự động. Thay đổi danh sách cần migration và join giữa `ENUM` với `VARCHAR` có thể cần conversion. Dùng cho miền nhỏ, ổn định; lookup table rõ hơn khi giá trị có metadata, quan hệ hoặc vòng đời độc lập.
- `BIT` có khác biệt biểu diễn theo server/driver/engine; kiểm tra bytes nhận được chứ đừng mặc định đó là ký tự `'0'`/`'1'`. `SET` gói nhiều cờ nhưng schema chứa danh sách cho phép, tra cứu/index và thay đổi definition có tradeoff. Integer bitmask cho phép mở bit mà không DDL, nhưng mapping chuyển sang code và khó diễn đạt constraint/permission riêng; bảng quan hệ thích hợp hơn khi từng quyền cần query, audit hoặc FK.

Các ví dụ trong sách về storage của `ENUM`, `BIT`, `CHAR/VARCHAR` và temporary table phụ thuộc MySQL/engine đời cũ; coi chúng là lời nhắc kiểm tra encoding/layout và phép đo trên release hiện hành, không phải cam kết byte-for-byte.

### BLOB/TEXT trong query và filesort

`BLOB`/`TEXT` không chỉ làm row lớn hơn. Nếu query buộc server materialize payload dài vào temporary result hoặc sort buffer, một phần chi phí có thể đến từ copy bytes, memory pressure, spill và I/O đọc external page. Sách mô tả bản MySQL cũ phải đưa một số temporary table chứa BLOB xuống disk; MySQL 8.4 TempTable hỗ trợ BLOB/TEXT trong một số trường hợp, nên hãy đọc `EXPLAIN`, Performance Schema và counter spill theo release thay vì áp lại quy tắc cũ.

Chỉ chọn cột cần trả về. Nếu kết quả cần sắp xếp theo thời gian rồi mới hiển thị body, hãy tìm page/key theo điều kiện và thứ tự trước, sau đó fetch payload cho số row thực sự cần. Với preview, `SUBSTRING(body, ...)` có thể giảm lượng dữ liệu trung gian, nhưng phải giữ semantics của lọc/sắp xếp và không làm mất phần văn bản dùng để phân biệt kết quả. Covering index giúp khi query có thể trả từ index mà không đọc payload; nếu cần toàn bộ BLOB thì cuối cùng vẫn phải đọc row.

`max_length_for_sort_data` và `max_sort_length` trong sách điều khiển chi tiết thuật toán sort của phiên bản cũ. Sort record có thể giữ cả cột cần thiết hoặc giữ key rồi đọc row lần nữa; cột `VARCHAR` tính theo độ dài khai báo trong một số đường đi, còn text dài có thể chỉ tham gia bằng prefix. Đổi biến sort không phải thay thế cho giảm dữ liệu cần sort, index phù hợp, `LIMIT`, hay kiểm tra sort merge passes. Tên biến có thể vẫn tồn tại nhưng semantics/optimizer strategy cần đối chiếu manual MySQL 8.4 trước khi chỉnh.

### Kiểu định danh và schema sinh tự động

Identifier thường xuất hiện trong join, lookup, PK và FK nên độ rộng/kiểu của nó lan ra nhiều index. Dùng cùng type, signedness và collation ở mọi bảng liên quan. Integer thường gọn và dễ tăng tuần tự; chuỗi có thể có ý nghĩa nghiệp vụ nhưng rộng, chịu collation và khó đổi. `ENUM`/`SET` thường không phù hợp làm định danh giữa các miền thay đổi độc lập. Hash/UUID ngẫu nhiên rải insert vào index; UUID time-ordered có thể cải thiện locality nhưng phải đánh giá khả năng đoán thứ tự, tính duy nhất và support thực tế.

Kiểm tra kỹ schema ORM/migration tự sinh: cột dùng chung ý nghĩa có type/collation khớp, không cấp `VARCHAR` quá rộng mặc định, không biến mọi thuộc tính thành EAV/property rows khiến query cần nhiều self-join, và constraint thực sự được tạo trong database. Sách ghi nhận cả chi phí decode row buffer ở bảng hàng trăm cột và giới hạn 61 bảng trong một join ở MySQL của thời điểm xuất bản; số cụ thể/optimizer thay đổi theo phiên bản, nhưng dấu hiệu rộng hàng trăm cột, nhiều join, EAV hoặc type mismatch vẫn cần đo trên phiên bản đích.

Với dữ liệu đặc thù như IPv4, dotted decimal chỉ là cách trình bày; có thể encode thành số 32-bit nếu chỉ cần IPv4. Khi cần IPv6 hoặc hỗn hợp địa chỉ, dùng biểu diễn/hàm phù hợp như `INET6_ATON()`/`INET6_NTOA()` thay vì cắt chuỗi vào `VARCHAR(15)`; kiểm tra constraint và format canonical trong ứng dụng. [MySQL 8.4 IPv6 support](https://dev.mysql.com/doc/refman/8.4/en/ipv6-support.html).

## Schema, normalization và migration

Normalize để mỗi fact có một nguồn đúng, giảm update anomaly; denormalize khi đọc có bottleneck đo được và có update/reconciliation plan. Cache/summary/counter table phải có cách rebuild. Foreign key/unique/check constraints bảo vệ invariant tại database; application validation vẫn cần cho UX nhưng không thay race-safe constraint.

ALTER TABLE có thể instant, in-place hoặc copy/rebuild tùy operation/engine/version; metadata lock vẫn có thể chặn. Đọc `ALGORITHM`/`LOCK` support ở version mục tiêu, estimate disk/temp/replica lag, thử trên staging và rollout theo backward-compatible expand/migrate/contract.

*High Performance MySQL*, ch. 4, bàn numeric/string/date/bit types, identifiers, gotchas, normalization, cache/summary/counter và ALTER. Đối chiếu [data type storage requirements](https://dev.mysql.com/doc/refman/8.4/en/storage-requirements.html), [character sets](https://dev.mysql.com/doc/refman/8.4/en/charset.html), [online DDL](https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl-operations.html).

Các con số cụ thể về integer/`DECIMAL` được đối chiếu với [MySQL 8.4 integer types](https://dev.mysql.com/doc/refman/8.4/en/integer-types.html), [numeric type attributes](https://dev.mysql.com/doc/refman/8.4/en/numeric-type-attributes.html), [fixed-point types](https://dev.mysql.com/doc/refman/8.4/en/fixed-point-types.html), và [storage requirements](https://dev.mysql.com/doc/refman/8.4/en/storage-requirements.html).

## Tự kiểm tra

**Tiền nên dùng FLOAT?** Thường không nếu cần decimal exact; dùng integer minor units hoặc DECIMAL theo quy tắc.

**UUID luôn làm primary key tốt nhất?** Không; size và insert locality tác động mọi secondary index.

**Đổi VARCHAR sang TEXT chỉ đổi giới hạn length?** Không; row layout, off-page storage, sorting và index behavior có thể đổi.

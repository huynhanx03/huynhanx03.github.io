---
title: "File format, page layout và tính toàn vẹn của dữ liệu"
category: "Database"
description: "Từ binary encoding đến slotted page, cell, version và checksum khi lưu dữ liệu bền vững."
updated: 2026-10-17
translationKey: "database/database-file-formats-and-page-integrity"
---

File database là giao thức giữa các phiên bản phần mềm và bytes trên thiết bị lưu trữ. Một page phải cho engine biết record bắt đầu ở đâu, field có kiểu/độ dài nào, page thuộc format nào và liệu bytes có bị hỏng. Nếu format chỉ hoạt động khi mọi record có cùng kích thước, lưu `text` hay record thay đổi sẽ lãng phí hoặc buộc page phải di chuyển dữ liệu.

## Binary encoding và variable-length data

Integer có thể lưu fixed-width hoặc variable-length; string cần length prefix, delimiter/escaping hoặc offset table. Fixed-width dễ truy cập trực tiếp nhưng tốn chỗ; variable-length tiết kiệm cho giá trị nhỏ nhưng cần parse và có giới hạn chiều dài. Endianness, signed representation, alignment và encoding charset cần được quy định nếu file được đọc qua version/platform khác.

Ví dụ một integer 32-bit `0xAABBCCDD` có bytes `AA BB CC DD` theo big-endian và `DD CC BB AA` theo little-endian. Reader dùng sai byte order vẫn đọc đủ bốn byte nhưng ra giá trị khác; format phải khai báo rõ, không dựa vào CPU hiện tại. Float/double cũng cần định nghĩa encoding (thường IEEE 754), NaN và signed zero nếu chúng ảnh hưởng so sánh/index.

Chuỗi có thể lưu `length + bytes` để biết độ dài trực tiếp, hoặc kết thúc bằng sentinel như NUL; sentinel phải escape nếu byte đó có thể xuất hiện trong dữ liệu. Trong fixed schema, field position/type có thể ngầm định để không ghi tên cột lặp lại. Với variable fields, lưu length hoặc `(offset,length)` giúp nhảy trực tiếp tới field thay vì parse toàn bộ field đứng trước.

Boolean, enum và flags có thể bit-pack; format phải nói rõ bit order và reserved bits để mở rộng sau này. Không dựa vào struct layout của compiler nếu chưa chuẩn hóa padding/alignment.

Flag là tập bit độc lập: mask `0000_0100` có thể bật bằng OR, kiểm tra bằng AND và tắt bằng AND với mask đảo. Enum là một giá trị mutually exclusive; flag cho nhiều thuộc tính cùng lúc. Cần giữ reserved bits và quy tắc unknown enum để reader mới/cũ xử lý file tương lai có chủ đích.


## Từ field đến cell bytes

Trong RAM, chương trình có thể theo một pointer tới object; trong file, reader phải biết byte nào bắt đầu field và byte nào kết thúc nó. Vì vậy format cần mô tả cách serialize từng kiểu, thứ tự field và quy tắc tính offset. Nếu page có kích thước cố định `P`, page ID `i` thường được ánh xạ tới vùng bắt đầu ở offset `i × P`; offset của cell lại tính tương đối từ đầu page. **Page ID và cell offset là hai cấp địa chỉ khác nhau**: page ID chọn block trong file, còn cell offset tìm cell bên trong block ấy.

Một file có thể bắt đầu bằng header chứa magic bytes, version và metadata cần để diễn giải các page; phần còn lại chia thành page cố định, đôi khi có trailer hoặc lookup table. Reader thường đọc header trước, xác nhận format, rồi dùng page ID hoặc index để lấy page. Dùng page kích thước cố định làm phép định vị đơn giản, nhưng không có nghĩa mọi database dùng cùng kích thước hoặc cùng cấu trúc header.

Các field số có thể có kích thước cố định để reader tính vị trí trực tiếp. Ví dụ, record gồm `employee_id:uint32`, `status:uint8`, `name_length:uint16` và `name:bytes[name_length]`. Với `name = "An"` mã hóa ASCII, reader đọc năm byte đầu theo quy ước endian đã định, lấy `name_length = 2`, rồi đọc hai byte kế tiếp. Nếu reader bỏ qua trường length hoặc dùng endian khác, dữ liệu phía sau sẽ bị lệch dù file vẫn có đủ byte.

Một format thường chọn kích thước số rõ ràng, chẳng hạn `byte = 8 bit`, `short = 16 bit`, `int = 32 bit`, `long = 64 bit`; tên kiểu trong ngôn ngữ không phải lúc nào cũng bảo đảm độ rộng cố định trên mọi nền tảng. Với IEEE 754, `float32` có bit dấu, số mũ và phần fraction; giá trị như `0.1` thường chỉ xấp xỉ được. Nếu số là khóa so sánh hoặc tiền, cần chọn representation và quy tắc so sánh phù hợp thay vì cho rằng mọi số thực có biểu diễn thập phân chính xác. Với chuỗi, length trong format thường đo số byte; phải thống nhất encoding như UTF-8 và không nhầm số byte với số ký tự.

Với cell B-tree, page metadata có thể cho biết tất cả cell là internal key cell hay leaf key/value cell, nên không phải lặp loại cell ở từng entry. Một internal cell có thể gồm `[key_size][child_page_id][key_bytes]`; leaf cell có thể gồm `[key_size][value_size][key_bytes][record_bytes]`. Kích thước header cố định cho phép tính điểm bắt đầu của key và value; phần byte sau đó có độ dài theo hai trường size. Nếu các cell trên cùng page đồng nhất, metadata như loại cell hoặc kiểu key có thể đặt một lần ở page header.

Địa chỉ được lưu trên disk không nhất thiết là địa chỉ bộ nhớ của process. Page ID cần qua map/cache để tới byte offset trong file; offset nội bộ page tương đối với page start và có thể dùng số nhỏ hơn. Khi đọc cấu trúc nhị phân, cần xác định rõ field nào là page ID, field nào là offset, đơn vị của chúng là byte hay block, và chúng có hợp lệ sau khi page bị di chuyển hay không.

## Slotted page

Một page phổ biến chứa header ở đầu, slot/line-pointer directory tăng từ đầu page và payload cell tăng từ cuối. Slot trỏ tới offset/length của record. Khi record bị xóa, slot có thể đánh dấu dead; payload còn lại để vùng trống. Compaction di chuyển payload và cập nhật slot, giúp record ID ổn định hơn offset vật lý.

Ví dụ insert `Tom`, rồi `Leslie`, rồi `Ron`: payload có thể được append theo thứ tự đó, còn slot directory giữ logical key order `[Leslie, Ron, Tom]` để binary search. Khi chèn ở giữa, page chỉ phải dịch slot pointer thay vì dịch mọi payload byte. Một slot ID chỉ ổn định trong lifetime do format quy định; slot đã thu hồi có thể tái sử dụng, nên TID cần generation/version nếu stale reference phải được phân biệt.

Ví dụ page 8 KiB có header 64 byte, slot directory 20×4 byte và cell payload 7 KiB; phần còn lại là free space. Nếu record 2 bị xóa, có thể tái dùng slot hoặc compact vùng cell. Index trỏ tới (page,slot) thay vì byte offset giúp page sắp xếp lại dữ liệu mà không sửa mọi index pointer.

Theo ví dụ key có thứ tự, hãy append cell theo thứ tự `Tom`, `Leslie`, `Ron`. Vùng payload có thể giữ thứ tự ghi đó; directory thì sắp pointer theo key: trước khi thêm `Ron`, nó trỏ lần lượt tới `Leslie` rồi `Tom`. Khi thêm `Ron`, cell mới được ghi ở vùng payload còn trống, còn pointer của nó được chèn giữa hai slot hiện có. Ta chỉ dịch các pointer trong directory, không phải dời toàn bộ bytes của `Tom` để giữ thứ tự tìm kiếm.

Free space có thể giữ thành danh sách các lỗ `(offset,size)`. First-fit lấy lỗ đầu đủ lớn nhưng có thể để lại nhiều mảnh nhỏ; best-fit chọn lỗ vừa nhất nhưng phải tìm kiếm/lưu thứ tự phù hợp. Nếu tổng bytes trống đủ mà không có đoạn liên tục đủ lớn, compact bằng cách chép cell còn sống lại gần nhau. Nếu compact vẫn thiếu chỗ, phải split page hoặc cấp overflow page.

## Cell và overflow

Cell cần biểu diễn key/value, child pointer, record flags và variable payload. B-tree internal cell có separator key và child; leaf cell có value/row pointer. Key dài làm giảm fanout và tăng chiều cao tree. Record quá lớn có thể overflow sang page riêng hoặc TOAST-like object; thao tác đọc thêm I/O và cần lifecycle cleanup.

## Versioning, checksums và crash

Một **magic number** là dãy byte cố định để reader nhận ra loại file hoặc page; nó giúp phát hiện nhầm format nhưng không chứng minh toàn bộ nội dung hợp lệ. Version cần được đọc bằng phần header có layout ổn định. Sau khi biết version, reader chọn quy tắc giải mã tương ứng; hệ thống có thể hỗ trợ một vài format cũ hoặc yêu cầu rewrite khi nâng cấp. Việc nhận ra đúng version chưa đảm bảo ghi dở dang có thể phục hồi.

Page/file header có magic/version để phát hiện sai format. Version upgrade có thể dùng in-place migration, rewrite, hoặc hỗ trợ đọc nhiều format; chọn lựa ảnh hưởng rollback và downtime. Checksum phát hiện page bytes lệch so với checksum lưu, nhưng không khôi phục nội dung. Cần backup, replica/checksum repair hoặc error-correcting storage.

CRC phát hiện tốt một số pattern lỗi truyền/lưu như burst corruption nhưng không phải bằng chứng chống giả mạo. Hash mật mã phù hợp kiểm tra integrity dưới threat model đối kháng; encryption/authentication cần MAC hoặc authenticated encryption. Một checksum mỗi page còn giúp cô lập lỗi page để không phải kết luận cả file hỏng, nhưng recovery phải có nguồn bản đúng để sửa.

Torn write xảy ra khi một page bị ghi một phần lúc mất điện. Doublewrite buffer, full-page WAL image, copy-on-write hay atomic sector assumptions giải quyết ở lớp khác nhau. Checksum và torn-write protection bổ sung nhau: checksum báo hỏng; recovery/duplicate copy giúp phục hồi.

## Data file và index file

Một engine có thể đặt row và index cùng file (clustered) hoặc row data riêng còn index trỏ đến record. Primary index là indirection nếu leaf không chứa row. Tách data/index file giúp quản trị nhưng tạo thêm pointer/lifecycle. Page format và index format cần tương thích để backup/replica/copy tránh trộn bytes của version khác.

*Database Internals*, ch. 1 và 3, giải thích page/file format, binary encoding, slotted pages, variable-length value, versioning và checksum. *PostgreSQL Internals 14* phần introduction mô tả page/tuple cụ thể PostgreSQL; không dùng generic layout thay cho format engine thật.

## Tự kiểm tra

**Checksum có sửa được page hỏng?** Không; nó chỉ phát hiện sai lệch.

**Index trỏ byte offset có lợi gì?** Truy cập trực tiếp, nhưng page compaction có thể buộc sửa pointer; slot indirection tránh một phần vấn đề.

**Version byte ở file header đủ cho mọi migration?** Không; cần định nghĩa đọc, ghi, rollback, mixed-version và crash behavior.

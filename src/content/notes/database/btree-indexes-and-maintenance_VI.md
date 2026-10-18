---
title: "B-tree và index: từ một khóa đến page dữ liệu"
category: "Database"
description: "Theo dõi cách B-tree tìm, thêm và xóa khóa trên storage theo page; hiểu index giúp truy vấn nào, làm phát sinh chi phí gì và các biến thể đổi điều gì."
updated: 2026-10-17
translationKey: "database/btree-indexes-and-maintenance"
---

Giả sử bảng có vài trăm triệu đơn hàng. Một truy vấn tìm `order_id = 4207` không thể quét từng dòng và chờ hợp lý. Index cần thu hẹp vùng tìm kiếm theo một số ít lần đọc page, đồng thời vẫn cập nhật được khi đơn mới xuất hiện hoặc đơn cũ bị xóa. B-tree là một cấu trúc phổ biến vì giữ khóa có thứ tự và có độ sâu nhỏ khi mỗi page chứa nhiều khóa.

## Vì sao không dùng cây nhị phân thông thường?

Cây tìm kiếm nhị phân có thể tìm trong O(log n) phép so sánh nếu được cân bằng. Nhưng node nhỏ nằm rải rác trong bộ nhớ có thể gây nhiều lần đọc storage. Với database, mỗi lần phải lấy một page chưa có trong cache thường đắt hơn rất nhiều phép so sánh trong RAM.

Nếu insert key theo thứ tự tăng vào một BST không tự cân bằng, cây có thể thành chuỗi: lookup tệ nhất tăng từ O(log n) lên O(n). AVL/red-black tree dùng rotation sau insert/delete để phục hồi giới hạn chiều cao, nhưng node vẫn có ít child và mỗi bước có thể chạm một vị trí rời rạc. B-tree giảm số tầng bằng cách đặt nhiều separator trong một page; một lookup có thể làm nhiều comparison trong RAM sau mỗi lần page được nạp.

Trong RAM, child pointer thường là địa chỉ có thể dereference trực tiếp. Trên disk, cấu trúc thường lưu offset hoặc page ID; muốn theo pointer tới page chưa cache, database phải đọc cả page chứ không chỉ vài byte quanh key. Gom nhiều node BST vào cùng page cải thiện locality, nhưng cây vẫn có fan-out thấp và cân bằng có thể buộc di chuyển node, sửa pointer. B-tree thiết kế node để tận dụng page transfer: nhiều separator cùng nằm trong một page, nhờ đó giảm số lần phải đi ra storage.

B-tree đặt nhiều khóa và con trỏ trong một node/page. Mỗi node có thể có hàng trăm con, tùy kích thước khóa và page. Độ sâu vì vậy thường nhỏ: một lần tìm có thể đi từ root qua vài internal pages rồi tới leaf. O(log n) vẫn mô tả số tầng theo cỡ dữ liệu, nhưng hệ số fan-out lớn mới là lý do thực tế cần ít lần chạm page.

### Tách số lần đọc page khỏi số phép so sánh

Giả sử internal page chứa xấp xỉ 100 separator và leaf page chứa khoảng 100 entry. Với cỡ một triệu entry, root có thể trỏ tới khoảng 100 internal pages, chúng trỏ tới khoảng 10.000 leaf pages. Tìm một key chạm khoảng ba page nếu root không cache; mỗi page cần binary search khoảng `log2(100)`, tức gần 7 phép so sánh trong RAM. Đây chỉ là mô hình minh họa: separator size, occupancy, duplicate keys và cache làm số thực tế đổi.

Do đó `O(log n)` che đi hai chi phí khác nhau: số page transfer gần bằng tree height, còn số comparison cộng dồn trong các node cũng logarithmic theo số key. Root/internal pages thường được giữ nóng trong buffer cache, nên truy vấn thực tế có thể chỉ đọc leaf từ storage; nhưng cache miss, I/O queue và random read vẫn quyết định tail latency.

## Khi nào gọi là B-tree, khi nào là B+ tree?

Tên **B-tree** thường được dùng cho cả họ cây nhiều nhánh. Ở dạng B-tree tổng quát, key và value có thể nằm ở node trong lẫn node lá. Trong **B+ tree**, node trong chỉ giữ separator để định tuyến; record hoặc entry dữ liệu nằm ở leaf. Vì mọi đường tìm đều đi tới leaf, thời gian tìm ổn định theo chiều cao cây. Nhiều index database mang tên B-tree thực chất dùng quy tắc gần B+ tree; khi cần mô phỏng một thao tác, phải theo đúng quy ước của implementation.

Nếu một node có tối đa `N` separator thì nó cần tối đa `N + 1` con. Cây được giữ cân bằng bằng giới hạn mức lấp đầy của node; với nhiều B-tree, node không-root thường phải giữ ít nhất khoảng một nửa capacity. Root có ngoại lệ vì cây nhỏ có thể chỉ gồm một root/leaf. Ngưỡng chính xác tùy định nghĩa order và cách engine tính byte thay vì số key. Điểm quan trọng là node không được rỗng tùy ý: giới hạn occupancy giữ chiều cao thấp, còn split, mượn và merge phục hồi giới hạn sau insert/delete.


Internal node không nhất thiết chứa toàn bộ bản ghi. Nó chứa các khóa phân cách và con trỏ xuống child. Với các khoảng `(-∞, 20)`, `[20, 50)`, `[50, +∞)`, khóa tìm kiếm quyết định child tiếp theo. Leaf giữ mục index ở mức cuối; mục đó có thể chứa giá trị, row identifier hoặc khóa chính tùy storage engine.

Nếu một internal node có N separator, nó cần N+1 child pointer để biểu diễn khoảng trước key đầu, các khoảng giữa key và khoảng sau key cuối. Ví dụ separator `[20, 50]` định nghĩa ba vùng; bỏ pointer cuối sẽ khiến không có đường tới key từ 50 trở lên. Một số implementation lưu pointer cuối riêng trong header hoặc biểu diễn biên trên bằng high key; chi tiết xem bài [B-tree trên disk](./btree-implementation-variants_VI.md).

Khi tìm khóa 42, ta so sánh tại root, chọn khoảng chứa 42, đi xuống child và lặp cho tới leaf. Nếu leaf có khóa, index trả về dữ liệu hoặc địa chỉ cần để đọc dòng. Nếu không có, truy vấn kết thúc sau khi đã kiểm tra leaf phù hợp; không phải đi tìm mọi page khác.

Một biến thể thường dùng nối các leaf theo thứ tự. Điều này giúp range scan tiếp tục từ leaf đầu tiên thỏa điều kiện sang các leaf kế tiếp, thay vì quay lại root cho từng khóa. Vì vậy B-tree không chỉ hỗ trợ equality lookup; nó còn hữu ích cho `<`, `>`, `BETWEEN`, tiền tố có thứ tự và `ORDER BY` nếu thứ tự cột phù hợp.

## Insert có thể làm cây tách page

Nếu leaf còn chỗ, insert đặt khóa vào đúng thứ tự. Nếu page đầy, engine chia mục giữa hai page và đưa separator lên parent. Nếu parent cũng đầy, việc tách có thể lan lên các tầng. Root split làm cây tăng thêm một tầng.

Ví dụ page chứa khóa `[10, 20, 30, 40]` nhưng chỉ còn chỗ cho bốn mục. Chèn `25` có thể tạo hai leaf `[10, 20]` và `[25, 30, 40]`, rồi cập nhật parent bằng separator thích hợp. Chi tiết chính xác tùy thuật toán: B-tree và B+ tree khác nhau ở nơi giữ khóa dữ liệu, quy ước separator và cách leaf liên kết.

Một split gồm: tìm leaf và insertion point; cấp page; chia entry quanh split point; đặt separator và pointer mới vào parent; rồi hoàn tất insert ở leaf đúng phía theo separator. Nếu parent đầy, split tiếp tục lên trên; split root tạo root mới. B-tree internal split có thể **promote** separator làm boundary và bỏ nó khỏi child, trong khi B+ tree giữ key/value ở leaf theo convention riêng. Khi đọc implementation, luôn xác định convention trước khi mô phỏng bằng tay.

Chèn nhiều khóa tăng dần thường có hành vi khác chèn khóa ngẫu nhiên. Bulk loading có thể tạo leaf gần đầy theo thứ tự, giảm số split ban đầu. Nhưng page quá đầy có thể làm cập nhật sau này tốn split; fill factor là một lựa chọn workload, không phải con số tối ưu chung.

### Theo dấu một lần split và một lần mượn khóa

Hãy xem một B+ tree nhỏ có leaf chứa tối đa ba entry. Sau một số lần chèn, cây có root separator `30` và hai leaf nối với nhau: `[10, 20] → [30, 40, 50]`.

Với capacity ba, bắt đầu từ một leaf `[10, 20, 30]`. Chèn `40` tạo danh sách tạm `[10, 20, 30, 40]`; cây chia thành `[10, 20] → [30, 40]`, và parent nhận separator `30` theo quy ước B+ tree đang dùng. Chèn tiếp `50` làm leaf phải thành `[30, 40, 50]`. Bây giờ muốn tìm `35`, ta so với `30` ở root, đi sang leaf phải, rồi xác nhận `35` chưa có giữa `30` và `40`. Range `18` đến `35` bắt đầu ở leaf trái, đọc `20`, đi qua sibling link, đọc `30`, rồi dừng trước `40`.

Giả sử node thường phải có ít nhất hai entry. Xóa `20` làm leaf trái còn `[10]`, thấp hơn ngưỡng. Nếu leaf phải có ba entry, nó có thể cho mượn entry nhỏ nhất là `30`: hai leaf trở thành `[10, 30] → [40, 50]`, và separator tại parent đổi thành `40`. Nếu sibling không thể cho mượn mà hai leaf ghép lại vừa capacity, cây merge chúng và xóa separator/pointer tương ứng ở parent. Nếu parent cũng thiếu entry, việc sửa có thể tiếp tục đi lên; khi root chỉ còn một child, cây có thể giảm một tầng.

Đây là trace để hiểu invariant, không phải đặc tả của mọi B-tree. B-tree cổ điển có thể **đẩy** separator lên và bỏ nó khỏi node con; B+ tree thường giữ bản separator ở leaf và sao chép boundary lên parent. Hãy kiểm tra leaf capacity, minimum occupancy và quy tắc separator trước khi dùng trace để suy luận một engine cụ thể.

## Delete, merge và page trống

Xóa mục khỏi leaf chưa chắc làm page được trả ngay về hệ điều hành. Cây cần giữ điều kiện cân bằng và có thể mượn khóa từ sibling hoặc gộp các page khi mức lấp đầy xuống thấp. Trong hệ ghi đồng thời, cấu trúc cần tránh để một reader đang đi xuống cây nhìn thấy con trỏ không còn hợp lệ. Một số engine trì hoãn tái cân bằng hoặc dùng cơ chế khác để giảm đồng bộ.

Trong merge internal pages, separator tương ứng ở parent thường được kéo xuống giữa hai nhóm child; pointer đến page bị bỏ cũng phải xóa. Underflow có thể lan lên parent giống split lan lên khi overflow. Nếu hai sibling không thể gộp vì tổng entry vượt capacity, redistribute một số entry rồi cập nhật separator thay vì ép merge.

Ngay cả khi cây đúng về logic, cập nhật và xóa có thể để lại page ít dùng, mục dead hoặc vùng trống. Engine cần vacuum, page compaction, merge, rebuild hoặc maintenance tùy loại index. Không nên chạy lệnh “rebuild” chỉ vì thấy một page không đầy: cần hiểu engine thu hồi chỗ trống ra sao và thao tác có khóa, I/O hay downtime thế nào.

## Index phục vụ truy vấn nào?

B-tree phù hợp khi toán tử cần thứ tự khóa: so sánh bằng, khoảng, prefix theo collation phù hợp hoặc sắp xếp. Composite index `(tenant_id, created_at)` thường phục vụ điều kiện bắt đầu từ `tenant_id`, rồi lọc/sắp xếp `created_at`; nó không tự động tương đương với index chỉ trên `created_at`.

Index **covering** chứa đủ cột để trả kết quả mà không đọc heap/table trong một số engine và trường hợp. Index có thể làm truy vấn đọc ít page hơn nhưng tăng dung lượng, ghi thêm mỗi lần insert/update, tốn cache và tạo thêm công việc bảo trì. Mỗi index cần trả lời một workload thật.

Index không đảm bảo optimizer sẽ dùng nó. Nếu truy vấn trả về phần lớn bảng, đọc tuần tự có thể rẻ hơn nhiều lần random lookup. Thống kê sai hoặc dữ liệu lệch cũng làm optimizer ước lượng số dòng không chính xác. Hãy xem execution plan và đo workload trước/sau, thay vì xem sự hiện diện của index như bằng chứng truy vấn đã nhanh.

## Vì sao mỗi engine có cách tổ chức riêng?

Một số B-tree biến thể đổi chính sách cập nhật để giảm ghi tại chỗ hoặc giảm khóa:

- **Copy-on-write tree** ghi các page mới khi cập nhật, rồi công bố root mới. Reader có thể tiếp tục dùng cây cũ, nhưng cập nhật tạo thêm ghi và cần thu hồi phiên bản cũ an toàn.
- **Lazy B-tree** gom hoặc trì hoãn một số thay đổi cấu trúc để giảm số page phải ghi ngay; đổi lại, đọc hoặc bảo trì cần xử lý trạng thái tích lũy.
- **FD-tree và log-structured tree variants** dùng nhiều run đã sắp xếp, đẩy ghi theo batch và hợp nhất sau; chúng nằm gần họ LSM hơn cây B-tree cập nhật trực tiếp.
- **Bw-tree** dùng delta/update chain và thao tác nguyên tử như compare-and-swap để giảm khóa node; nó phải định kỳ hợp nhất chain và thu hồi bộ nhớ an toàn.
- **Cache-oblivious layouts** sắp page để tận dụng locality qua nhiều mức cache mà không cố định vào một kích thước cache duy nhất; kết quả phụ thuộc workload và cách biến thể được triển khai.

Đây là các hướng thiết kế, không phải bảo đảm của mọi database mang tên B-tree. Database Internals mô tả những ví dụ như LMDB, WiredTiger và Bw-tree để cho thấy cùng một mục tiêu tìm khóa có thể đổi cách ghi, đồng bộ và thu hồi page.

## B-tree không phải mọi loại index

Hash index tối ưu equality theo cách khác nhưng không cung cấp thứ tự range. GiST, GIN, SP-GiST và BRIN nhắm tới những miền dữ liệu hoặc cách tìm khác nhau. PostgreSQL mô tả chúng như các access method có operator class riêng; MySQL cũng có các loại index và quy tắc theo storage engine. Ta sẽ học cấu trúc đó trong topic của từng sản phẩm thay vì gọi tất cả là B-tree.

## Tự kiểm tra

**Vì sao B-tree có fan-out lớn lại giảm lần đọc storage?** Vì mỗi internal page điều hướng tới nhiều child, nên một tầng bao phủ lượng khóa lớn hơn cây nhị phân.

**Có index trên `created_at` nghĩa là truy vấn `ORDER BY created_at` luôn nhanh không?** Không. Optimizer xét số dòng, thứ tự index, điều kiện lọc, chi phí đọc heap và thống kê. Cần kiểm tra plan cùng dữ liệu thật.

**Thêm index có thể làm hệ thống chậm đi không?** Có. Mỗi lần ghi có thể phải cập nhật thêm cấu trúc, dùng thêm cache và dung lượng. Chỉ tạo index có workload biện minh.

Nguồn đọc: *Database Internals*, chương 2, 4 và 6; *High Performance MySQL*, chương 5; [B-tree PostgreSQL](https://www.postgresql.org/docs/current/btree.html) và [cách kiểm tra index usage](https://www.postgresql.org/docs/current/indexes-examine.html).

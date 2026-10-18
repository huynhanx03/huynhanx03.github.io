---
title: "Segment tree và Fenwick tree: cập nhật điểm, hỏi tổng đoạn"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/segment-fenwick-trees"
series: "DSA nâng cao"
seriesOrder: 9
tags: ["segment-tree", "fenwick-tree", "range-query", "lazy-propagation"]
description: "Hai cách lưu tổng trên các đoạn và sự khác nhau giữa truy vấn tĩnh, cập nhật điểm và lazy propagation."
draft: false
updated: 2026-10-15
---

Tổng tiền tố trả tổng đoạn bằng một phép trừ. Nhưng nếu sửa a[2], mọi prefix sau vị trí ấy đều có thể phải đổi, tốn O(n). Khi cập nhật và truy vấn xen kẽ nhiều lần, ta muốn giữ những tổng trung gian sao cho một thay đổi chỉ ảnh hưởng ít ô.

Segment tree và Fenwick tree cùng cho cập nhật điểm, truy vấn tổng đoạn O(log n), bộ nhớ O(n). Chúng chọn các đoạn được lưu khác nhau. Hiểu đoạn của mỗi ô quan trọng hơn nhớ công thức nhảy index.

## Segment tree chia mỗi đoạn thành hai phần

Mỗi node giữ tổng một đoạn nửa mở `[l,r)`. Với độ dài lớn hơn 1, chia tại `m=l+(r-l)/2`; trái giữ `[l,m)`, phải `[m,r)`. Lá là một phần tử. Invariant cơ bản là tổng cha bằng tổng các phần tử trong đoạn, được gộp từ hai con khi không có nhãn lazy đang chờ theo biến thể ở phần sau.

Với a=`[3,-2,5,1,4,0,2,6]`, gốc `[0,8)` giữ 19. Con `[0,4)` giữ 7, `[4,8)` giữ 12. Muốn tổng `[2,5)`, không cần đọc cả gốc hay từng phần tử: tách thành `[2,4)` có 6 và `[4,5)` có 4, kết quả 10.

Một hàm query tại node có ba trường hợp. Không giao đoạn hỏi thì trả 0, phần tử đơn vị của phép cộng. Node nằm trọn trong đoạn hỏi thì dùng tổng đã lưu. Giao một phần thì đi xuống hai con rồi cộng. Chọn đúng trường hợp cho phép bỏ qua cả vùng hoặc dùng sẵn kết quả thay vì quét lại.

```note-visualization
{"id":"segment-query","preset":"normal"}
```

Ở mỗi độ sâu, chỉ số ít node ở biên truy vấn còn giao một phần; các node giữa đã được nhận trọn và dừng. Hai đường biên cùng số vùng phủ giữa có tổng O(log n) node cần xét theo bậc. Vì vậy truy vấn một đoạn liên tiếp O(log n), không phải “mọi node cây” hay O(log² n). Nếu yêu cầu xuất từng phần tử thay vì một tổng, phải cộng lượng output.

## Cập nhật điểm sửa một đường tổ tiên

Đổi a[2] từ 5 thành 8 làm delta=3. Lá `[2,3)` đổi, rồi `[2,4)` từ 6 thành 9, `[0,4)` từ 7 thành 10, gốc từ 19 thành 22. Các node không chứa index 2 không bị ảnh hưởng. Query `[2,5)` lúc này trả 13.

```note-visualization
{"id":"segment-update","preset":"normal"}
```

Một đường có O(log n) node, nên update O(log n). Build bằng lá rồi gộp từng node một lần là O(n). Cài đệ quy thường cấp khoảng 4n ô; bản lặp có thể đưa lá vào vùng kích thước lũy thừa hai kế tiếp. Cả hai O(n) bộ nhớ, nhưng cách ánh xạ index khác; không trộn quy tắc con của hai layout.

Mảng rỗng cần quy ước không tạo đoạn lá giả và từ chối update index. Đoạn hỏi hợp lệ thường `0≤ql≤qr≤n`; đoạn rỗng trả 0. Loại số cần chứa mọi tổng và phép nhân cập nhật, không chỉ mỗi giá trị đầu vào.

Có thể đổi tổng thành min/max bằng một phép gộp kết hợp và phần tử đơn vị phù hợp: +∞ cho min, -∞ cho max. Với phép gộp không giao hoán như nối chuỗi, vẫn cần giữ thứ tự trái trước phải. Segment tree không yêu cầu luôn lấy được kết quả đoạn bằng phép trừ hai prefix.

## Lazy propagation hoãn việc sửa con nhưng không hoãn đáp án cha

Muốn cộng delta cho cả `[ql,qr)`, đi từng điểm sẽ tốn theo độ dài đoạn. Khi node nằm trọn trong vùng update, tăng sum bằng `delta×(r-l)` và cộng delta vào nhãn lazy. Sum node đã phản ánh thay đổi toàn đoạn; các con có thể chưa phản ánh phần nhãn ấy cho đến khi được đẩy xuống.

Nếu sau đó query chỉ một phần của node, phải push nhãn: cập nhật sum/lazy của hai con với độ dài từng con rồi xóa nhãn ở cha. Sau khi sửa một phần ở con, pull tổng cha lại từ con. Invariant cần nói rõ tổng node là đúng với mọi cập nhật tác động lên nó, còn nhãn ghi thay đổi chưa truyền xuống; không đòi sum con luôn bằng dữ liệu đầy đủ khi còn nhãn ở cha.

Ví dụ cộng 2 cho `[0,4)` làm sum node ấy tăng 8 mà chưa sửa từng lá. Hỏi `[2,3)` sau đó cần đẩy +2 xuống đúng đường để không trả giá trị cũ. Các thao tác update/query đoạn theo schema này O(log n).

Gán cả đoạn khác cộng cả đoạn. Gán mới có thể ghi đè cập nhật trước; cộng sau gán phải điều chỉnh giá trị được gán. Nhãn không chỉ là một con số cộng chung cho mọi loại thao tác. Cần thiết kế phép hợp thành đúng thứ tự trước khi gộp hai tính năng vào một cây.

## Fenwick lưu các khối kết thúc theo bit cuối

Fenwick dùng index 1-based. `lowbit(i)=i & -i` là giá trị bit 1 thấp nhất của i; `tree[i]` giữ tổng đoạn đóng `[i-lowbit(i)+1,i]`.

| i | lowbit | Đoạn được giữ |
| ---: | ---: | --- |
| 1 | 1 | 1..1 |
| 2 | 2 | 1..2 |
| 3 | 1 | 3..3 |
| 4 | 4 | 1..4 |
| 5 | 1 | 5..5 |
| 6 | 2 | 5..6 |
| 7 | 1 | 7..7 |
| 8 | 8 | 1..8 |

Prefix đến 7 lấy tree[7] cho 7..7, lùi `7-1=6` lấy 5..6, lùi `6-2=4` lấy 1..4 rồi về 0. Các khối không chồng, nối đủ 1..7; vì mỗi lần bỏ một bit 1, có O(log n) bước.

```note-visualization
{"id":"fenwick-query","preset":"normal"}
```

Thêm delta tại i đi lên bằng `i+=lowbit(i)` để sửa các khối có chứa điểm đó. Với i=3 trên n=8, cập nhật tree[3],tree[4],tree[8]. Đây là những node chứa index 3 trong phân hoạch Fenwick. Dừng khi vượt n; i ban đầu phải từ 1, vì lowbit(0)=0 sẽ không tiến.

```note-visualization
{"id":"fenwick-update","preset":"normal"}
```

Update và prefix O(log n), vùng tree O(n). Gán điểm thành value mới cần biết giá trị cũ để tính delta, hoặc có cách lấy nó. Tổng đoạn đóng `[l,r]` là `prefix(r)-prefix(l-1)`; với mảng 0-based, dùng index Fenwick i+1. Cần phân biệt query `[2,5)` của segment ở trên tương ứng những phần tử index 2,3,4, tức Fenwick 3..5.

Fenwick chuẩn rất gọn cho cộng/tổng. Phép cộng kết hợp, giao hoán và có nghịch đảo cho việc trừ prefix. Chỉ nói “có tính kết hợp” chưa đủ hứa mọi phép gộp hỗ trợ cùng cách update/range của Fenwick. Min có thể có biến thể cho điều kiện update hạn chế, nhưng không có nghịch đảo để suy min đoạn từ hai prefixMin. Segment tree thuận tiện hơn khi cần gộp tổng quát hoặc nhiều loại tác vụ đoạn.

## Tự kiểm tra

**1.** Vì sao query `[2,5)` trên 8 phần tử lấy `[2,4)` và `[4,5)`? **2.** Fenwick update 5 đi qua ô nào tới n=8? **3.** Vì sao không dùng `prefixMin(r)-prefixMin(l-1)`?

**Giải thích:** Hai đoạn rời nhau phủ đúng các index 2,3,4; các node ngoài vùng trả đơn vị 0 và vùng phủ trọn dùng sum. Update 5 đi 5→6→8→16 rồi dừng, mỗi ô giữ một khối có chứa 5. Phép trừ không đảo được phép min: prefix trước l có thể chứa minimum che hết thông tin các giá trị trong đoạn, nên hai con số prefix không đủ khôi phục đáp án. Cần cấu trúc hoặc hợp đồng khác.

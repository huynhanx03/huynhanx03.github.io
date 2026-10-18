---
title: "B-tree và B+ tree: cây nhiều nhánh cho dữ liệu trên trang"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/b-trees"
series: "DSA nâng cao"
seriesOrder: 7
tags: ["b-tree", "b-plus-tree", "external-memory", "index"]
description: "Vì sao tăng số nhánh giảm I/O và cách split, merge giữ các nút đủ đầy."
draft: false
updated: 2026-10-15
---

Một BST cân bằng trong RAM cần O(log n) bước pointer. Nếu mỗi bước lại phải đọc một trang từ thiết bị lưu trữ, số lần đi xuống ấy có thể là chi phí lớn. B-tree đưa nhiều khóa và nhiều pointer con vào một node, thường bố trí theo trang, để mỗi trang đọc được giúp bỏ qua nhiều miền khóa.

Ta cần phân biệt số I/O trang với số phép so sánh CPU. Hệ số nhánh lớn B làm chiều cao theo bậc `O(log_B n)`; bên trong trang vẫn phải tìm khóa hoặc chọn con. Lợi ích của hình cây nhiều nhánh đến từ mô hình truy cập theo trang, không phải mọi thao tác trong node có chi phí bằng 0.

## Chốt một quy ước trước khi đếm khóa

“Order” và “degree” được các tài liệu dùng khác nhau. Ở đây dùng minimum degree t≥2. Mỗi node không phải gốc chứa từ t-1 đến 2t-1 khóa theo thứ tự. Node trong có số con bằng số khóa+1. Gốc không rỗng có ít nhất một khóa; nếu là node trong thì có ít nhất hai con. Mọi lá ở cùng độ sâu.

Với các khóa k1<k2 trong một node, ba con lần lượt giữ khóa nhỏ hơn k1, giữa k1 và k2, lớn hơn k2, theo chính sách khóa phân biệt ở bài. Tìm target bằng cách xác định vùng hoặc gặp đúng khóa, rồi chỉ xuống một con. Không được kiểm tra thứ tự các khóa trong node mà quên miền khóa của cả cây con.

Một node trong không phải gốc có ít nhất t con. Cùng điều kiện mọi lá cùng độ sâu, số node/khóa cần để có chiều cao h tăng theo t^h, nên chiều cao logarithmic. Nếu cho một nhánh rỗng sớm và một nhánh kéo dài tùy ý, cận này mất; điều kiện lá cùng tầng là phần của tính cân bằng.

## Split giữ mức đầy bằng cách đẩy median lên

Node đầy có 2t-1 khóa. Split lấy khóa giữa lên cha, hai node còn lại có t-1 khóa mỗi bên. Các pointer con được chia theo các khoảng khóa tương ứng. Trước khi đi xuống, tách con đang đầy để tới lá luôn còn chỗ; đó là một cách chèn từ trên xuống.

Với t=2, tối đa 3 khóa một node. Chèn 1,2,3 ban đầu cho gốc lá `[1,2,3]`. Trước khi chèn 4, gốc đầy nên tạo gốc mới `[2]`, con trái `[1]`, con phải `[3]`. Đi về phải và chèn 4 được `[3,4]`. Toàn cây có hai lá cùng độ sâu và mọi node không gốc giữ ít nhất một khóa.

```note-visualization
{"id":"btree-insert","preset":"normal"}
```

Tách gốc là cách chiều cao tăng một tầng; không có một lá đơn lẻ tự tăng độ sâu khác các lá. Nếu split một con đầy trong node cha, khóa giữa thêm vào cha cùng pointer con mới; thuật toán top-down bảo đảm cha còn chỗ để nhận. Chỉ chia danh sách khóa mà không cập nhật các con sẽ làm mất đường tìm dữ liệu.

## Xóa cần mượn hoặc gộp trước khi hụt mức tối thiểu

Xóa ở lá đơn giản nếu vẫn đủ t-1 khóa. Nhưng nếu một con chỉ đang có t-1 khóa, xóa thêm sẽ hụt. Một cách cài củng cố con trước khi đi xuống: mượn qua cha từ anh em có đủ dư, hoặc gộp con với một anh em và khóa phân cách ở cha.

Ví dụ t=2, cha `[2]`, con `[1]` và `[3]`. Hai con đều ở tối thiểu. Gộp chúng với khóa 2 thành `[1,2,3]`; gốc cũ rỗng và chỉ còn một con nên có thể hạ con ấy làm gốc mới. Sau đó xóa 1 còn `[2,3]`. Chiều cao toàn cây giảm một tầng, các lá vẫn cùng độ sâu.

Mượn cần chuyển khóa phân cách của cha xuống con thiếu và đưa một khóa biên của anh em lên cha; nếu là node trong còn chuyển pointer con biên. Không thể đưa tùy một khóa từ anh em sang mà không điều chỉnh separator, vì miền tìm kiếm sẽ sai.

Xóa khóa ở node trong có thể thay bằng predecessor/successor khi phía tương ứng có đủ khóa để tiếp tục, hoặc gộp hai con qua khóa ấy rồi xóa bên trong vùng gộp. Các nhánh cài đặt đầy đủ nhiều hơn ví dụ; invariant mức đầy và thứ tự quyết định nhánh nào hợp lệ.

Một đường tìm/cập nhật chạm O(log_t n) trang theo mô hình mỗi node một trang, với công việc split/merge theo mỗi tầng và kích thước node. CPU trong node có thể dùng tìm tuyến tính hoặc nhị phân; phải tính thêm theo t nếu t không được xem là tham số cố định của trang.

## B+ tree giữ dữ liệu ở lá để quét khoảng

B+ tree đặt bản ghi hoặc pointer bản ghi ở lá. Node trong chỉ giữ khóa phân cách và pointer con. Lá thường nối theo thứ tự: sau khi tìm lá chứa điểm đầu khoảng, có thể đi qua các lá kế tiếp để xuất các khóa tới điểm cuối.

Nếu hỏi khóa 42, đi từ gốc xuống lá rồi tìm trong lá. Nếu hỏi 42..80, không cần tìm từ gốc lại cho từng khóa: tìm vị trí đầu rồi quét. Chi phí gồm đường đi ban đầu cộng số trang kết quả/đường lá phải đọc; không nên báo mọi range scan chỉ O(log n) bất kể lượng dữ liệu xuất.

```note-visualization
{"id":"bplus-range","preset":"normal"}
```

Khóa phân cách có thể xuất hiện ở cả node trong và lá vì chúng có vai trò định tuyến. Khi split lá B+, dữ liệu vẫn cần ở lá; cách chọn/copy separator khác với việc di chuyển median dữ liệu khỏi node trong một B-tree cổ điển. Quy tắc “khóa bằng separator đi con nào”, mức đầy và cách split/merge phụ thuộc bản cài; cần dùng nhất quán.

Node trong không chứa payload thường giữ được nhiều separator hơn trong cùng trang, giúp giảm chiều cao theo workload/kích thước khóa. Đây là lý do phổ biến cho chỉ mục theo trang, không phải cam kết mọi B+ luôn ít I/O hơn mọi B-tree ở mọi truy vấn.

## Một cây chỉ mục chưa đủ thành storage engine

B-tree/B+ phù hợp disk hoặc page cache; với ít dữ liệu trong RAM, quản lý trang và code phức tạp có thể không đáng. Nếu dữ liệu phải tồn tại qua crash và có nhiều luồng cập nhật, còn cần khóa/latch, persistence, recovery, logging như WAL và thứ tự ghi. Cây giữ đúng invariant trong một lần chạy chưa tự bảo đảm các thuộc tính ấy.

## Tự kiểm tra

**1.** Với t=2, tại sao split `[1,2,3]` không cho một phía rỗng? **2.** Khi gốc rỗng sau merge cần làm gì? **3.** Vì sao B+ thuận tiện cho range scan?

**Giải thích:** Median 2 lên cha và hai phía còn 1 khóa, đúng mức t-1; đẩy sai vị trí có thể làm một con hụt mức. Gốc trong chỉ còn một con cần chuyển gốc về con ấy; trường hợp cây hết khóa là cây rỗng theo biểu diễn được chọn. Lá B+ nối theo thứ tự cho phép tiếp tục từ điểm bắt đầu qua các trang liên quan, nhưng vẫn phải trả chi phí đọc/xuất kết quả.

Đọc thêm: [David Galles, University of San Francisco: B-trees](https://www.cs.usfca.edu/~galles/cs245/lecture/lecture20.pdf) dùng quy ước maximum degree; cần đổi quy ước trước khi so số khóa với minimum degree t ở đây.

---
title: "Heavy-Light Decomposition: hỏi và sửa dữ liệu trên đường đi của cây"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/heavy-light-decomposition"
series: "DSA nâng cao"
seriesOrder: 24
tags: ["tree", "heavy-light-decomposition", "path-query", "segment-tree"]
description: "Chia cây thành các chuỗi nặng để biến truy vấn trên đường đi thành ít truy vấn đoạn."
draft: false
updated: 2026-10-15
---

Segment tree hiểu một đoạn liên tiếp của mảng, còn đường giữa hai nút cây có thể đi lên một nhánh rồi xuống nhánh khác. Nếu đưa toàn bộ đường vào từng query bằng DFS, ta vẫn phải thăm nhiều nút. Heavy-Light Decomposition (HLD) chọn cách chia cây sao cho mỗi đường được ghép từ ít đoạn mảng.

Bài này xét cây cố định, có nhiều lần hỏi/cập nhật giá trị trên đường. Ta dùng chuỗi nặng, mỗi chuỗi lưu theo độ sâu trong một mảng và có cấu trúc đoạn riêng. Giá trị ở nút và phép gộp là tổng trước; các biến thể cạnh/hướng sẽ được tách rõ sau đó.

## Cạnh nhẹ làm bài toán nhỏ đi ít nhất một nửa

Duyệt cây có gốc, tính `size[v]`. Với mỗi nút, chọn một con có cây con lớn nhất làm con nặng; nếu đồng hạng chọn một tùy quy ước. Các cạnh tới con còn lại là cạnh nhẹ. Nối liên tiếp các cạnh nặng tạo chuỗi; một nút không có cạnh nặng từ cha bắt đầu chuỗi mới.

Nếu con nhẹ `y` của `x` có `size[y]>size[x]/2`, không con khác nào lớn bằng nó được, nên nó phải được chọn nặng, mâu thuẫn. Vì vậy đi xuống một cạnh nhẹ làm kích thước cây con ít nhất giảm một nửa. Đường gốc–lá có `O(log n)` cạnh nhẹ; đường bất kỳ gồm hai phần qua LCA nên đổi chuỗi `O(log n)` lần. Số nút trên một chuỗi vẫn có thể lớn, nhưng số **đoạn cần hỏi** đã nhỏ.

```note-visualization
{"id":"hld-decompose","preset":"normal"}
```

## Xây chỉ số rồi mới truy vấn đoạn

Lượt đầu tính `parent,depth,size,heavy`. Lượt sau đi hết cạnh nặng trước để gán `head[v]` là đầu chuỗi và `pos[v]` là vị trí trong mảng của chuỗi đó. Mỗi chuỗi có segment tree trả tổng đoạn; tổng số vị trí của mọi chuỗi đúng bằng `n`, nên bộ nhớ cấu trúc đoạn là `O(n)`.

Có thể cài một mảng chung bằng cách đánh số liên tiếp khi đi các chuỗi, nhưng bài này giữ mô hình mảng riêng đã nêu. Điều kiện cần ở cả hai cách là các nút trên một chuỗi nằm liên tiếp và thứ tự vị trí khớp độ sâu. Việc đánh số không làm hai nút bất kỳ trên đường thành một đoạn duy nhất.

Khi `head[u]!=head[v]`, chọn phía có đầu chuỗi sâu hơn. Đoạn từ đầu ấy tới nút hiện tại nằm hoàn toàn trên đường đang hỏi. Lấy tổng đoạn rồi nhảy sang cha của đầu chuỗi, tức đi qua một cạnh nhẹ. Khi hai nút cùng chuỗi, chỉ còn một đoạn giữa vị trí của chúng.

```go
for head[u] != head[v] {
    if depth[head[u]] < depth[head[v]] { u, v = v, u }
    answer += chainRangeSum(head[u], u) // hai nút cùng chuỗi
    u = parent[head[u]]
}
if depth[u] > depth[v] { u, v = v, u }
answer += chainRangeSum(u, v)
```

Đây là lõi ghép query Go, không phải hàm độc lập. `head,depth,parent` đã được tính; `chainRangeSum(a,b)` nhận hai nút cùng chuỗi, với `a` không sâu hơn `b`, và hỏi tổng bao gồm hai đầu. `answer` khởi tạo 0; hai đầu query thuộc cùng cây. Việc chọn đầu sâu hơn bảo đảm không nhảy một phía qua phần giao chung với phía còn lại.

## Theo đường 5 tới 2 qua ba đoạn

Giả sử chuỗi nặng là `0–1–3–4`, nút 2 là con nhẹ của 0, nút 5 là con nhẹ của 3. Query `5→2` lấy riêng nút 5, nhảy về 3; lấy riêng nút 2, nhảy về 0; rồi hai đầu nằm trên chuỗi nặng và lấy đoạn 0–1–3. Các đoạn không chồng nút, tổng của chúng là tổng trên đường 5–3–1–0–2.

Nếu giá trị mỗi nút bằng 1, đáp án là 5. Nếu nút 1 đổi thành 10 bằng point update trên cấu trúc chuỗi, query sau trả 14. Ta không cần đi qua từng nút của một chuỗi dài: segment tree xử lý đoạn đó trong `O(log n)`.

```note-visualization
{"id":"hld-path-query","preset":"normal"}
```

Mỗi query có `O(log n)` đoạn và mỗi đoạn `O(log n)`, cho `O(log² n)`. Point update dùng `O(log n)`; cập nhật cả đường có thể dùng cùng phân rã với segment tree lazy hỗ trợ đúng phép cập nhật, cho `O(log² n)`. Tiền xử lý cây `O(n)` cộng chi phí dựng các cấu trúc đoạn, thường `O(n)` với xây từ mảng; tổng bộ nhớ ngoài cây `O(n)`.

## Đổi dữ liệu hoặc phép gộp cần đổi điều gì?

Nếu trọng số ở cạnh, quy ước lưu cạnh cha–con tại vị trí nút con. Các đoạn tháo khỏi đầu chuỗi vẫn lấy nút đầu vì nó biểu diễn cạnh nhẹ nối lên cha mà đường đi cần dùng. Riêng đoạn cuối cùng chuỗi phải bỏ vị trí LCA, vì cạnh từ LCA tới cha không nằm trên đường. Query hai đầu trùng nhau vì thế cho tổng cạnh 0, trong khi tổng nút vẫn gồm giá trị nút ấy.

Muốn max thay tổng, thay phép cộng bằng max và khởi tạo bằng phần tử đơn vị phù hợp, chẳng hạn âm vô cực khi giá trị có thể âm. Khởi tạo 0 sẽ sai với một đường toàn giá trị âm. Min tương tự cần dương vô cực.

Nối chuỗi hay nhân ma trận có thứ tự không giao hoán. Đổi hai đầu `u,v` trong code có thể đảo hướng đọc mà không lưu lại; một `answer` duy nhất chưa đủ. Giữ phần đi từ `u` lên LCA và phần đi từ LCA xuống `v`, lưu/đảo kết quả đoạn theo hướng rồi ghép đúng thứ tự. Cấu trúc đoạn có thể cần trả cả kết quả thuận và ngược.

Nếu chỉ hỏi khoảng cách không đổi, [LCA](/vi/notes/data-structures-algorithms/lca-binary-lifting/) đủ. Nếu chỉ hỏi cả cây con, một cách đánh số DFS thành đoạn có thể đơn giản hơn. Với một query trên cây nhỏ, đi đường trực tiếp có thể rẻ công cài đặt hơn toàn bộ HLD.

**Tự thử:** nút có các cây con kích thước 5,2,1 chọn con nặng nào? Vì sao không có quá nhiều lần đổi chuỗi? Max trên đường toàn số âm cần khởi tạo gì?

**Giải thích:** chọn con kích thước 5; hai con còn lại là nhẹ. Mỗi bước nhẹ giảm ít nhất một nửa kích thước theo chiều xuống, nên số bước logarithm. Max cần giá trị đơn vị nhỏ hơn hoặc bằng mọi giá trị hợp lệ, không dùng 0 nếu số âm được phép. Độ phức tạp phụ thuộc số đoạn và giá hỏi mỗi đoạn, không chỉ vào tên HLD.

*Đọc thêm: [VNOI — Heavy Light Decomposition](https://wiki.vnoi.info/algo/data-structures/heavy-light-decomposition).*

[USACO Guide — Heavy-Light Decomposition](https://usaco.guide/plat/hld) — chuỗi nặng và cận truy vấn đường.

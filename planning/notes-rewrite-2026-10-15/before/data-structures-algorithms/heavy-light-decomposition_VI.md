---
title: "Heavy-Light Decomposition: hỏi và sửa dữ liệu trên đường đi của cây"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/heavy-light-decomposition"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 24
tags: ["tree", "heavy-light-decomposition", "path-query", "segment-tree"]
description: "Chia cây thành các chuỗi nặng để biến truy vấn trên đường đi thành ít truy vấn đoạn."
draft: false
---

Segment tree trả lời tổng/min/max trên **đoạn của mảng**, nhưng đường giữa hai nút của cây không nằm sẵn trong một mảng liên tiếp. Heavy-Light Decomposition (HLD) chia cây thành các **chuỗi nặng**: tại mỗi nút chọn con có cây con lớn nhất làm cạnh nặng; các cạnh còn lại là cạnh nhẹ. Mỗi chuỗi nặng được lưu thành một mảng theo độ sâu, kèm cấu trúc truy vấn đoạn. Đường `u–v` đi qua ít chuỗi, nên ta hỏi từng đoạn rồi gộp.

## 1. Vì sao chỉ có ít cạnh nhẹ?

Gọi `size[x]` là số nút của cây con `x`. Nếu đi từ cha `x` xuống một con nhẹ `y`, `size[y]` không thể lớn hơn một nửa `size[x]`: nếu lớn hơn một nửa, `y` chắc chắn là con lớn nhất và đã được chọn nặng. Vì vậy mỗi lần đi qua cạnh nhẹ, kích thước cây con ít nhất giảm một nửa; một đường từ gốc tới lá có nhiều nhất `O(log n)` cạnh nhẹ. Một đường bất kỳ gồm hai đường đi lên tới LCA, nên cắt thành `O(log n)` đoạn chuỗi.

## 2. Dữ liệu cần giữ

Lượt duyệt đầu tính `parent`, `depth`, `size`, `heavy` cho từng nút. Lượt sau đi dọc mỗi chuỗi nặng, gán `head[v]` là nút đầu chuỗi và vị trí `pos[v]` trong mảng riêng của chuỗi. Một cấu trúc đoạn quản lý giá trị các nút của **mỗi chuỗi**. Khi hỏi đường `u–v`, nếu `head[u] != head[v]`, lấy đầu chuỗi sâu hơn, hỏi từ `head[u]` tới `u`, rồi đặt `u=parent[head[u]]`; lặp. Khi cùng chuỗi, hỏi đoạn giữa hai vị trí. Với segment tree `O(log n)` mỗi đoạn, tổng `O(log² n)`; bộ nhớ `O(n)` ngoài cây.





```go
for head[u] != head[v] {
    if depth[head[u]] < depth[head[v]] { u, v = v, u }
    answer += chainRangeSum(head[u], u) // hai nút cùng chuỗi
    u = parent[head[u]]
}
if depth[u] > depth[v] { u, v = v, u }
answer += chainRangeSum(u, v)
```

Đây là phần ghép truy vấn; `chainRangeSum` dùng cấu trúc đoạn của chuỗi và các vị trí đã gán. Đoạn code tính tổng **giá trị ở nút**, bao gồm hai đầu. Nếu trọng số đặt trên cạnh, quy ước “giá trị cạnh nằm ở nút con” làm đoạn cuối phải bỏ vị trí LCA, nếu không đếm thừa. Với phép gộp không giao hoán như nối chuỗi, cần giữ cả hướng `u→LCA` và `LCA→v`, rồi đảo thứ tự gộp ở một phía; chỉ dùng `answer +=` phù hợp các phép giao hoán như tổng.

Giả sử chuỗi nặng của một cây gồm `0–1–3–4`, còn nút `2` là con nhẹ của `0` và nút `5` là con nhẹ của `3`. Đường `5→2` được chia thành ba đoạn: nút `5` trên chuỗi riêng, đoạn `3→1→0` trên chuỗi nặng, và nút `2` trên chuỗi riêng. Ta không cần duyệt từng nút khi mỗi chuỗi có hàng nghìn nút: hỏi tổng đoạn bằng segment tree. Khi nhảy từ đầu chuỗi `5` lên `parent[5]=3`, rồi cuối cùng từ chuỗi `2` về `0`, số lần **đổi chuỗi** bị chặn bởi số cạnh nhẹ trên đường đi, tức `O(log n)`.

Nếu chỉ có một truy vấn trên cây nhỏ, xây `size`, `heavy`, `head` và các segment tree có thể tốn công hơn DFS thẳng trên đường. HLD hữu ích khi có nhiều truy vấn/cập nhật xen kẽ; chi phí tiền xử lý và bộ nhớ là `O(n)` cộng chi phí dựng các cấu trúc đoạn.

Nếu chỉ hỏi khoảng cách không đổi, LCA đủ; nếu chỉ hỏi tổng của cả cây con, có cách đánh số DFS và truy vấn đoạn đơn giản hơn HLD.



```note-visualization
{"id":"hld-decompose","preset":"normal"}
```



```note-visualization
{"id":"hld-path-query","preset":"normal"}
```

**Tự luyện:** (1) Vẽ cạnh nặng/nhẹ cho cây gốc có các cây con kích thước `5,2,1`. (2) Tại sao tối đa `O(log n)` cạnh nhẹ? (3) Sửa đoạn ghép để trả giá trị lớn nhất trên đường thay vì tổng.

*Đọc thêm: [VNOI — Heavy Light Decomposition](https://wiki.vnoi.info/algo/data-structures/heavy-light-decomposition).*

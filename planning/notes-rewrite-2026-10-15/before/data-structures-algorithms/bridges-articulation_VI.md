---
title: "Cầu, đỉnh khớp và low-link trong đồ thị vô hướng"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/bridges-articulation"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 12
tags: ["bridge", "articulation-point", "low-link", "dfs"]
description: "Từ thời điểm DFS suy ra cạnh hoặc đỉnh nào làm đồ thị mất kết nối."
draft: false
---

Một **cầu** là cạnh mà xóa nó làm số thành phần liên thông tăng. Một **đỉnh khớp** là đỉnh mà xóa nó cùng các cạnh kề làm số thành phần tăng. Cả hai có thể tìm trong một DFS `O(V+E)` bằng thời điểm vào `tin[u]` và giá trị `low[u]`.

`low[u]` là thời điểm nhỏ nhất có thể chạm tới từ cây con DFS của `u` bằng cách đi xuống các cạnh cây rồi dùng tối đa một cạnh ngược về tổ tiên. Khi duyệt cạnh cây `u-v`, sau khi xử lý `v`, cập nhật `low[u]=min(low[u],low[v])`. Với cạnh ngược `u-w` đến tổ tiên đã thăm, cập nhật `low[u]=min(low[u],tin[w])`. Đối với đồ thị vô hướng, cạnh quay về cha **theo ID cạnh** phải bỏ qua.

## 1. Điều kiện cầu

Cạnh cây `(u,v)` là cầu khi `low[v] > tin[u]`. Dấu `>` là nghiêm ngặt: nếu `low[v]==tin[u]`, cây con `v` có đường ngược về `u`, nên vẫn nối được khi bỏ cạnh cây. Một cạnh không thuộc cây DFS không thể là cầu vì nó nằm trên một chu trình với đường cây.





```note-visualization
{"id":"bridges-lowlink","preset":"normal"}
```

## 2. Điều kiện đỉnh khớp

Với `u` không phải gốc DFS, nó là khớp nếu có con DFS `v` sao cho `low[v] >= tin[u]`: cây con `v` không thể nối về tổ tiên của `u` nếu bỏ `u`. Dấu `>=` vì đường quay về chính `u` cũng bị mất khi xóa `u`. Gốc là trường hợp riêng: nó là khớp khi có **ít nhất hai con DFS**. Một gốc với một con, dù có rất nhiều hậu duệ, không phải khớp nếu toàn bộ được thăm từ nhánh đó.



Nếu đồ thị có nhiều thành phần, bắt đầu DFS từ từng đỉnh chưa thăm. Với **cạnh song song**, so `v==parent` để bỏ qua mọi cạnh tới cha là sai: cạnh song song thứ hai là một đường thay thế, khiến cạnh đầu không phải cầu. Gắn ID riêng cho mỗi cạnh và chỉ bỏ đúng cạnh đã dùng đi xuống. Tự khuyên không tạo cầu; cần xử lý nhất quán nhưng không làm thay đổi điều kiện cơ bản.



```note-visualization
{"id":"articulation-lowlink","preset":"normal"}
```

## 3. Đi từng bước trên một đồ thị nhỏ

Xét tam giác `0–1–2–0` và thêm cạnh `2–3`. DFS bắt đầu tại `0`, đi theo `0→1→2→3`, gán `tin=[0,1,2,3]`. Từ `2` có cạnh ngược tới `0`, nên `low[2]` giảm xuống 0. Nút `3` không có cạnh ngược, nên `low[3]=3`. Khi quay về `2`, `low[3]>tin[2]` (`3>2`): cạnh `2–3` là cầu. Với cạnh `1–2`, `low[2]=0` không lớn hơn `tin[1]=1`: nó nằm trong tam giác, không phải cầu. `2` cũng là đỉnh khớp vì xóa `2` cô lập `3`.

```go
// Trong DFS(u, parentEdgeID), sau khi đi xuống một cạnh cây u-v:
dfs(v, edgeID)
low[u] = min(low[u], low[v])
if low[v] > tin[u] { bridges = append(bridges, edgeID) }
if parentEdgeID != -1 && low[v] >= tin[u] { cut[u] = true }
// Với cạnh đã thăm u-w nhưng không phải cạnh cha:
low[u] = min(low[u], tin[w])
```

Đây là phần lõi, không phải hàm Go độc lập: `dfs`, `tin`, `low`, `bridges`, `cut` và ID cạnh nằm trong cấu trúc duyệt. Với gốc DFS, thay điều kiện `parentEdgeID != -1` bằng việc đếm số **con DFS** và đánh dấu khớp khi có ít nhất hai. `min` là hàm có sẵn trong Go mới; ở phiên bản cũ có thể viết so sánh thường. Việc đưa ID cạnh vào adjacency list là điều cần thiết cho đồ thị có cạnh song song.

**Tự luyện:** (1) Tính `tin/low` trên tam giác `0-1-2-0` nối thêm đỉnh `3` bằng cạnh `2-3`. (2) Vì sao điều kiện cầu dùng `>` còn khớp dùng `>=`? (3) Hai cạnh song song nối cùng cặp đỉnh có phải cầu không?

*Đối chiếu: Lê Minh Hoàng, phần 4 §5.*

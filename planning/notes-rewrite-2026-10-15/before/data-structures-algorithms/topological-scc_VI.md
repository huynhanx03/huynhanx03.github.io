---
title: "Thứ tự topo và thành phần liên thông mạnh trong đồ thị có hướng"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/topological-scc"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 11
tags: ["topological-sort", "scc", "dag", "kahn", "tarjan"]
description: "Sắp phụ thuộc trên DAG và gom chu trình thành các thành phần mạnh."
draft: false
---

Thứ tự topo là một hoán vị các đỉnh sao cho với mọi cạnh `u→v`, `u` xuất hiện trước `v`. Nó chỉ tồn tại khi đồ thị có hướng **không có chu trình** (DAG). Nếu các công việc có quan hệ phụ thuộc, thứ tự topo là một lịch thực hiện hợp lệ; nhiều lịch có thể cùng đúng.

## 1. Thuật toán Kahn

Tính `indegree[v]` cho mọi đỉnh, đưa tất cả đỉnh có indegree 0 vào queue. Lặp lấy một đỉnh `u`, ghi vào kết quả, giảm indegree của từng `v` kề `u`; khi indegree về 0, đưa `v` vào queue. Bất biến: một đỉnh vào queue chỉ khi mọi tiền nhiệm chưa xử lý của nó đã hết. Nếu kết quả có đúng `V` đỉnh, ta có thứ tự topo; nếu ít hơn, phần còn lại có chu trình. Chi phí `O(V+E)`. Nếu cần thứ tự topo nhỏ nhất theo thứ tự ID, dùng min-heap thay queue, chi phí `O((V+E)log V)`.


```note-visualization
{"id":"kahn-topo","preset":"normal"}
```






DFS cũng tạo topo bằng cách ghi đỉnh **sau** khi xử lý mọi cạnh đi ra rồi đảo danh sách kết quả. Cần trạng thái ba màu để phát hiện cạnh tới đỉnh đang trên stack; chỉ dùng `visited` hai trạng thái có thể bỏ qua chu trình. Cả hai cách đều đúng trên DAG.


```note-visualization
{"id":"dfs-topo","preset":"normal"}
```


## 2. Thành phần liên thông mạnh (SCC)

Trong đồ thị có hướng, `u` và `v` cùng SCC khi có đường `u→v` **và** `v→u`. Mỗi SCC là tập cực đại theo quan hệ này. Nếu co mỗi SCC thành một siêu đỉnh, đồ thị ngưng tụ luôn là DAG; nếu nó có chu trình, các SCC trên chu trình phải gộp thành một, mâu thuẫn tính cực đại.


```note-visualization
{"id":"scc-condensation","preset":"normal"}
```








Tarjan dùng DFS, gán `disc[u]` là thời điểm vào và `low[u]` là `disc` nhỏ nhất có thể tới qua cạnh DFS và cạnh quay về **một đỉnh còn trên stack SCC**. Khi `low[u]==disc[u]`, `u` là gốc một SCC; pop stack đến `u`. Khi xét cạnh `u→v`, nếu `v` chưa thăm thì DFS rồi lấy `min(low[u],low[v])`; nếu `v` đang trên stack thì lấy `min(low[u],disc[v])`. Không dùng `low[v]` trong nhánh thứ hai: điều đó có thể trộn những SCC khác nhau. Thời gian `O(V+E)`, bộ nhớ `O(V)`.


```note-visualization
{"id":"tarjan-scc","preset":"normal"}
```


Kosaraju là cách khác: DFS lấy thứ tự hoàn tất, đảo chiều mọi cạnh, DFS theo thứ tự hoàn tất giảm dần. Nó dễ giải thích nhưng cần đồ thị đảo và hai lượt duyệt. SCC hữu ích để gom phụ thuộc vòng trước khi lập lịch trên DAG ngưng tụ.


```note-visualization
{"id":"kosaraju-scc","preset":"normal"}
```


**Tự luyện:** (1) Chạy Kahn trên `0→1,0→2,1→3,2→3`. (2) Thêm `3→1`, kiểm tra độ dài kết quả. (3) Vẽ SCC và DAG ngưng tụ cho `0↔1,1→2,2↔3`.

*Đối chiếu: Jain, chương 13; Drozdek, chương 8; Lê Minh Hoàng, phần 4 §4.*

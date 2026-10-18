---
title: "Đường đi ngắn nhất một nguồn: DAG, Dijkstra và Bellman–Ford"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/shortest-paths"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 13
tags: ["shortest-path", "dijkstra", "bellman-ford", "dag"]
description: "Chọn thuật toán theo cấu trúc cạnh và trọng số, hiểu relaxation và chu trình âm."
draft: false
---

Với nguồn `s`, `dist[v]` là trọng số nhỏ nhất của một đường từ `s` tới `v`, hoặc vô cực nếu không tới được. Thao tác chung là **relax** cạnh `u→v` trọng số `w`: nếu `dist[u]+w < dist[v]`, cập nhật `dist[v]` và `parent[v]=u`. Chỉ cộng khi `dist[u]` hữu hạn, và chọn kiểu số tránh tràn. Phải xác định có cạnh âm hay chu trình âm trước khi chọn thuật toán.

## 1. DAG: thứ tự topo

Nếu đồ thị có hướng không chu trình, xử lý đỉnh theo thứ tự topo và relax mọi cạnh đi ra đúng một lần. Khi đến `u`, mọi tiền nhiệm đã xử lý nên `dist[u]` đã tối ưu. Chi phí `O(V+E)`, chấp nhận cả cạnh âm vì không có chu trình âm. Nếu đồ thị không phải DAG, lập luận này không dùng được.





```note-visualization
{"id":"dag-shortest-path","preset":"normal"}
```

## 2. Dijkstra: trọng số không âm

Đặt `dist[s]=0`, còn lại vô cực. Min-heap chứa cặp `(distance, vertex)`; lấy cặp nhỏ nhất, bỏ nếu nó cũ hơn `dist[vertex]`, rồi relax các cạnh đi ra. Với trọng số **không âm**, khi lấy một đỉnh với khoảng cách nhỏ nhất hiện tại, không đường chưa xét nào có thể quay lại làm nó nhỏ hơn: mọi phần tiếp theo đều không âm. Dùng heap nhị phân và cách thêm bản ghi mới thay cho decrease-key cho `O((V+E)log V)` theo cách cài thông dụng và bộ nhớ `O(V+E)` có thể phát sinh do bản ghi trùng. Với cạnh âm, chứng minh “chốt đỉnh” thất bại.





```note-visualization
{"id":"dijkstra","preset":"normal"}
```

## 3. Bellman–Ford: cạnh âm và phát hiện chu trình âm

Mọi đường đơn có tối đa `V-1` cạnh. Relax **tất cả** cạnh trong `V-1` lượt; sau lượt `k`, mọi đường tốt nhất có tối đa `k` cạnh đã được xét. Nếu lượt thứ `V` vẫn cải thiện đỉnh **đến được từ nguồn**, tồn tại chu trình âm ảnh hưởng tới khoảng cách của một số đỉnh. Khi đó không có khoảng cách ngắn nhất hữu hạn cho các đỉnh có thể đi tiếp từ chu trình ấy. Chi phí `O(VE)`, bộ nhớ `O(V)`; có thể dừng sớm nếu một lượt không đổi.



BFS là trường hợp mọi cạnh cùng trọng số (thường là 1). Đừng dùng BFS để tối ưu tổng trọng số `2,5,10`. Nếu chỉ cần đường đi, dùng `parent` truy ngược từ đích về nguồn sau khi tìm khoảng cách; với đỉnh không tới được, không truy `parent` vô hạn.



```note-visualization
{"id":"bellman-ford","preset":"normal"}
```

**Tự luyện:** (1) Cho phản ví dụ Dijkstra khi có cạnh âm. (2) Chạy Bellman–Ford trên `0→1(4),0→2(5),1→2(-3)`. (3) Giải thích tại sao cạnh âm trên DAG không gây vấn đề cho thứ tự topo.

*Đối chiếu: Jain, chương 13; Drozdek, chương 8; Lê Minh Hoàng, phần 4 §8.*

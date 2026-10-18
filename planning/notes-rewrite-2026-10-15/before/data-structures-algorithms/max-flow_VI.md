---
title: "Luồng cực đại: mạng thặng dư và lát cắt nhỏ nhất"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/max-flow"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 16
tags: ["max-flow", "residual-network", "min-cut", "edmonds-karp"]
description: "Hiểu cạnh ngược, đường tăng luồng và chứng chỉ tối ưu từ min-cut."
draft: false
---

Mạng luồng là đồ thị có hướng với nguồn `s`, đích `t`, capacity không âm trên mỗi cạnh. Luồng `f` phải thỏa `0<=f(u,v)<=c(u,v)` và bảo toàn tại mọi đỉnh khác `s,t`. Giá trị luồng là tổng rời nguồn ròng. Điểm khó không phải chỉ tìm một đường `s→t`, mà là cho phép **sửa lại quyết định cũ** để đạt giá trị lớn hơn.

## 1. Mạng thặng dư

Với cạnh gốc `u→v` capacity `c` và luồng hiện tại `f`, cạnh thặng dư tiến còn `c-f`; cạnh thặng dư ngược `v→u` có capacity `f`. Đi ngược không phải “tạo luồng vật lý ngược” tùy tiện: nó hủy một phần luồng đã gửi trên cạnh tiến. Ví dụ đã gửi qua `s→a→b→t`, sau đó có thể dùng cạnh ngược `b→a` trong đường tăng khác để chuyển dòng sang tuyến phù hợp hơn.



Tìm đường từ `s` tới `t` chỉ qua cạnh thặng dư dương; lấy bottleneck là capacity nhỏ nhất trên đường, tăng/giảm luồng tương ứng, cập nhật hai cạnh thặng dư. Lặp tới khi không còn đường. Ford–Fulkerson với capacity nguyên kết thúc vì mỗi lần tăng ít nhất 1 đơn vị, nhưng thời gian phụ thuộc giá trị luồng; với capacity số thực và cách chọn đường bất lợi, có thể không kết thúc. **Edmonds–Karp** dùng BFS chọn đường ít cạnh nhất và có cận `O(VE²)`.



```note-visualization
{"id":"max-flow-augment","preset":"normal"}
```

## 2. Định lý max-flow min-cut

Một lát cắt `(S,T)` có `s∈S`, `t∈T`; capacity cắt là tổng capacity **cạnh gốc** từ `S` sang `T`. Mọi luồng hợp lệ có giá trị không vượt capacity của bất kỳ lát cắt nào. Khi mạng thặng dư không còn đường tới `t`, lấy `S` là các đỉnh còn tới được từ `s`; mọi cạnh gốc `S→T` đã bão hòa và mọi cạnh gốc `T→S` không chảy luồng ròng gây chênh lệch. Giá trị luồng bằng capacity lát cắt đó, nên cả luồng và lát cắt đều tối ưu. Đây là chứng chỉ đúng đắn, không chỉ điều kiện dừng của một vòng lặp.



Trong code, mỗi cạnh thặng dư nên có chỉ số của **cạnh ngược tương ứng**, đặc biệt khi có cạnh song song hoặc hai cạnh gốc ngược hướng. Dùng một ô ma trận duy nhất mà không phân biệt các cạnh có thể làm sai khi truy vết hoặc cập nhật. Capacity có thể lớn; chọn kiểu đủ rộng cho tổng luồng.



```note-visualization
{"id":"min-cut","preset":"normal"}
```

**Tự luyện:** (1) Vẽ hai cạnh thặng dư của một cạnh capacity 5 đang chảy 3. (2) Với hai đường song song capacity 2 và 3, tìm luồng cực đại và min-cut. (3) Giải thích vì sao cần cạnh ngược để sửa đường đã chọn.

*Đối chiếu: Drozdek, chương 8; Lê Minh Hoàng, phần 4 §10.*

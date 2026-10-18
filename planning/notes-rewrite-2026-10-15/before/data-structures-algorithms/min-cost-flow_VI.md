---
title: "Luồng chi phí cực tiểu: gửi đủ hàng với tổng giá nhỏ nhất"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/min-cost-flow"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 27
tags: ["graph", "min-cost-flow", "residual-network", "potentials"]
description: "Kết hợp capacity với cost, dùng cạnh ngược và đường tăng rẻ nhất trong mạng thặng dư."
draft: false
---

Max-flow hỏi “gửi được **bao nhiêu** từ `s` tới `t`?”. Min-cost flow thêm chi phí trên mỗi cạnh và hỏi “để gửi đúng `F` đơn vị, **tổng chi phí nhỏ nhất** là bao nhiêu?”. Ví dụ có nhiều tuyến vận chuyển, mỗi tuyến có sức chứa và phí khác nhau. Nếu không thể gửi `F`, phải báo bất khả thi; đừng trả một lời giải gửi ít hơn như thể đủ yêu cầu.

## 1. Cạnh thặng dư có chi phí âm

Với cạnh gốc `u→v` capacity `c`, cost `w`, cạnh thặng dư tiến có capacity còn lại và cost `w`; cạnh ngược `v→u` có capacity bằng luồng đang dùng và cost `-w`. Đi qua cạnh ngược là **hủy** một đơn vị luồng cũ và lấy lại chi phí cũ. Vì vậy ngay cả khi mọi cost gốc không âm, mạng thặng dư có cạnh âm sau lần tăng đầu tiên. Chạy Dijkstra trực tiếp trên cost gốc của mạng thặng dư có thể sai.

Một thuật toán thực dụng là successive shortest augmenting path. Lặp tìm đường **chi phí nhỏ nhất** từ `s` đến `t` trong mạng thặng dư; đẩy `delta=min(capacity trên đường, F-flow)`; cập nhật capacity hai chiều và `totalCost += delta * pathCost`. Để dùng Dijkstra, giữ **potential** `h[v]` sao cho reduced cost `w'(u,v)=w(u,v)+h[u]-h[v]` không âm trên các cạnh còn capacity. Sau mỗi đường ngắn nhất, cập nhật `h[v] += dist'[v]` cho các đỉnh tới được. Ban đầu nếu có cạnh cost âm, cần Bellman–Ford hoặc phương pháp khác để tìm potential hợp lệ. Tính đường thực từ reduced cost bằng `dist'(t)-h(s)+h(t)` với potential trước cập nhật.

## 2. Tại sao tham lam theo đường rẻ nhất hoạt động?

Trong mạng thặng dư, nếu còn một chu trình **chi phí âm** với capacity dương, ta có thể đẩy luồng quanh chu trình mà không đổi tổng luồng nhưng giảm chi phí. Điều kiện tối ưu của luồng cố định là không còn chu trình âm cải thiện được. Phương pháp đường tăng rẻ nhất cùng potential duy trì điều kiện đó khi khởi đầu từ luồng không và xử lý đúng mạng thặng dư. Cạnh ngược bảo đảm quyết định tuyến ở lượt trước có thể được thay bằng tuyến khác.

Với `F` đơn vị được tăng mỗi lượt ít nhất một và Dijkstra heap, một cận đơn giản là `O(F E log V)` trong trường hợp capacity nguyên, dù một lượt có thể đẩy nhiều đơn vị. Cost âm và cycle âm ở đầu vào đòi hỏi giả định và thuật toán khởi tạo rõ ràng; không nên hứa cận này cho một code Dijkstra chưa xử lý chúng. Tổng chi phí có thể tràn kiểu `int`, nên dùng kiểu rộng và kiểm tra giới hạn.

## 3. Một lần đổi tuyến bằng cạnh ngược

Xét các cạnh capacity đều bằng 1: `s→a (0)`, `s→b (0)`, `a→b (0)`, `a→t (1)`, `b→t (0)`, trong ngoặc là cost. Nếu đơn vị đầu đi `s→a→b→t`, tổng cost bằng 0 nhưng đã dùng kín cạnh `b→t`. Để gửi đơn vị thứ hai, mạng thặng dư cho đường `s→b→a→t`: đoạn `b→a` là **cạnh ngược** của `a→b`, hủy luồng cũ trên cạnh ấy. Sau hai lượt, luồng thực là `s→a→t` (cost 1) và `s→b→t` (cost 0), tổng cost bằng 1. Không có đường thứ hai trong đồ thị cạnh **chỉ theo hướng ban đầu** sau lựa chọn đầu, nên bỏ cạnh ngược sẽ báo sai rằng không gửi được đủ 2 đơn vị.



Khung cài đặt Go nên lưu mỗi cạnh bằng `(to, rev, cap, cost)`, trong đó `rev` là chỉ số cạnh ngược ở danh sách kề của `to`. Khi thêm `u→v`, tạo cả cạnh tiến `(v, indexReverse, c, w)` và cạnh ngược `(u, indexForward, 0, -w)`; mỗi lần đẩy `delta`, giảm capacity tiến và tăng capacity ngược. Sau Dijkstra, lưu `(parentVertex, parentEdgeIndex)` để đi ngược từ `t` về `s` hai lần: lần đầu tìm bottleneck, lần sau cập nhật cạnh. Phải kiểm tra `t` tới được trước khi truy vết; nếu không, trả “không đủ `F`”.



```note-visualization
{"id":"min-cost-flow","preset":"normal"}
```

**Tự luyện:** (1) Một cạnh capacity 3, cost 5 đã chảy 2: vẽ hai cạnh thặng dư. (2) Vì sao cost cạnh ngược là `-5`? (3) Phân biệt maximum matching với bài phân công ít chi phí nhất.

*Đọc thêm: [VNOI — Min-cost flow](https://wiki.vnoi.info/algo/graph-theory/min-cost-flow).*

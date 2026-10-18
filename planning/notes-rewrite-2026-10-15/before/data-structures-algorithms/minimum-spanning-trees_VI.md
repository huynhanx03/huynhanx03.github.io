---
title: "Cây khung nhỏ nhất: Kruskal, Prim và tính chất lát cắt"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/minimum-spanning-trees"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 15
tags: ["mst", "kruskal", "prim", "cut-property"]
description: "Chứng minh chọn cạnh an toàn và phân biệt cây khung với đường đi ngắn nhất."
draft: false
---

Với đồ thị vô hướng liên thông có trọng số, cây khung là `V-1` cạnh nối mọi đỉnh không có chu trình. MST là cây khung có **tổng** trọng số nhỏ nhất. Nó không nhất thiết giữ đường đi ngắn nhất giữa từng cặp đỉnh; mục tiêu của MST và shortest path khác nhau. Trọng số âm vẫn dùng được vì cây khung luôn có hữu hạn cạnh và không lặp chu trình.

## 1. Tính chất lát cắt

Một lát cắt chia đỉnh thành `S` và `V\S`. Cạnh nhẹ nhất băng qua lát cắt là **an toàn**: tồn tại một MST chứa nó (nếu có nhiều cạnh cùng nhẹ nhất, có thể có nhiều MST). Chứng minh đổi chỗ: lấy một MST không chứa cạnh `e` ấy; thêm `e` tạo chu trình, trên chu trình có cạnh `f` khác cũng băng qua lát cắt. Vì `w(e)<=w(f)`, thay `f` bằng `e` cho cây khung không nặng hơn. Từ đây suy ra cả Kruskal và Prim.





```note-visualization
{"id":"mst-cut","preset":"normal"}
```

## 2. Kruskal

Sắp toàn bộ cạnh theo trọng số tăng; với mỗi cạnh `(u,v)`, nếu `Union(u,v)` của DSU thành công thì nhận cạnh, ngược lại bỏ vì tạo chu trình. Mỗi thành phần DSU đóng vai trò một phía của một lát cắt; cạnh nhẹ nhất sẵn có nối hai thành phần là an toàn. Với `E` cạnh, sắp xếp `O(E log E)`, DSU gần tuyến tính, bộ nhớ `O(V+E)` nếu giữ danh sách cạnh. Nếu đồ thị không liên thông, kết quả là **minimum spanning forest** với một cây cho mỗi thành phần, không phải một MST duy nhất.





```note-visualization
{"id":"kruskal","preset":"normal"}
```

## 3. Prim

Bắt đầu từ một đỉnh, giữ tập `S` đã vào cây. Luôn lấy cạnh nhẹ nhất nối `S` với đỉnh ngoài `S`; dùng min-heap cho các cạnh biên. Bất biến: các cạnh đã nhận là một cây và mỗi cạnh mới an toàn theo lát cắt `(S,V\S)`. Dùng danh sách kề và heap cho độ phức tạp thường là `O(E log V)`; với ma trận kề và quét tuyến tính có thể `O(V²)` phù hợp đồ thị dày. Phải bỏ các cạnh heap dẫn tới đỉnh đã vào cây.



Nếu trọng số bằng nhau, MST không nhất thiết duy nhất; tổng trọng số tối ưu vẫn xác định. Nếu mọi trọng số **phân biệt**, MST là duy nhất, nhưng điều kiện này là đủ chứ không cần thiết.



```note-visualization
{"id":"prim","preset":"normal"}
```

**Tự luyện:** (1) Chạy Kruskal trên tam giác trọng số `1,2,3`. (2) Cho ví dụ MST không chứa đường ngắn nhất giữa hai đỉnh. (3) Trình bày lập luận đổi chỗ của một cạnh Prim vừa chọn.

*Đối chiếu: Jain, chương 13; Drozdek, chương 8; Lê Minh Hoàng, phần 4 §9.*

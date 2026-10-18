---
title: "Centroid decomposition: chia cây quanh một nút cân bằng"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/centroid-decomposition"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 25
tags: ["tree", "centroid-decomposition", "distance-query"]
description: "Xây cây trọng tâm và trả truy vấn khoảng cách tới nút được đánh dấu."
draft: false
---

Một **centroid** của cây `n` nút là nút mà sau khi bỏ nó, mọi thành phần còn lại có không quá `n/2` nút. Cây luôn có ít nhất một centroid. Tìm nó bằng cách tính kích thước cây con rồi đi sang phía nào còn lớn hơn `n/2` cho tới khi không còn phía như vậy. Bỏ centroid, đệ quy trên từng thành phần: centroid của toàn cây thành gốc của một **cây phân rã**. Vì mỗi bước ít nhất giảm một nửa, độ sâu cây phân rã là `O(log n)`.

## 1. Ví dụ truy vấn “nút đỏ gần nhất”

Ban đầu một số nút được tô đỏ. Có hai thao tác: tô thêm nút `v` đỏ, và hỏi khoảng cách từ `u` đến nút đỏ gần nhất. Với mỗi centroid `c`, giữ `best[c]` là khoảng cách nhỏ nhất từ `c` tới một nút đỏ đã tô. Tô `v`: đi qua các centroid tổ tiên của `v` trong cây phân rã, cập nhật `best[c]=min(best[c],dist(v,c))`. Hỏi `u`: lấy `min_c(best[c]+dist(u,c))` trên cùng dãy tổ tiên.



Tại sao đúng? Xét đường từ `u` tới một nút đỏ tối ưu `v`. Ở mức phân rã đầu tiên mà `u` và `v` nằm trong hai thành phần khác nhau, đường của chúng phải qua centroid `c` vừa tách. Do đó `dist(u,v)=dist(u,c)+dist(c,v)`, và phương án này xuất hiện trong công thức. Các centroid khác chỉ tạo độ dài của một đường đi qua `c`, không thể nhỏ hơn khoảng cách thật `u–v` theo bất đẳng thức tam giác. Cận trên và cận dưới gặp nhau tại nghiệm tối ưu.



```note-visualization
{"id":"nearest-red","preset":"normal"}
```

## 2. Tiền xử lý khoảng cách và chi phí

Có thể tính `dist(v,c)` bằng LCA trong `O(log n)` mỗi lần, làm thao tác `O(log² n)`; hoặc lưu trước khoảng cách từ từng nút tới các centroid tổ tiên của nó, tốn `O(n log n)` bộ nhớ và cho cập nhật/hỏi `O(log n)`. Xây cây phân rã thường `O(n log n)` nếu mỗi mức tính lại kích thước của từng thành phần. Khi đã “xóa” centroid khỏi bài toán con, chỉ đánh dấu tạm trong quá trình xây; không được xóa cạnh khỏi đồ thị gốc nếu các truy vấn khoảng cách vẫn cần nó.



Ví dụ trên chỉ **thêm** màu đỏ. Nếu cho bỏ màu đỏ, `best[c]` không thể đơn giản hoàn tác bằng một số: cần một multiset/heap có xóa hoặc quản lý đếm, và phải xử lý các bản ghi cũ. Đây là khác biệt quan trọng giữa biến thể động một chiều và hai chiều.



```note-visualization
{"id":"centroid-build","preset":"normal"}
```

**Tự luyện:** (1) Tìm centroid của một đường 7 nút. (2) Vẽ hai mức đầu của cây phân rã. (3) Vì sao chỉ lưu một số `best[c]` không đủ khi được bỏ màu đỏ?

*Đọc thêm: [VNOI — Centroid decomposition](https://wiki.vnoi.info/vi/algo/graph-theory/centroid-decomposition).*

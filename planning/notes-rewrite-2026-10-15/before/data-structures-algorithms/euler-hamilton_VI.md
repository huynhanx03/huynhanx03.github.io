---
title: "Đường Euler và Hamilton: dùng hết cạnh hay thăm hết đỉnh?"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/euler-hamilton"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 18
tags: ["euler-path", "hamilton-path", "hierholzer", "backtracking"]
description: "Điều kiện Euler và thuật toán Hierholzer; vì sao Hamilton cần tìm kiếm khó hơn."
draft: false
---

Một đường Euler đi qua **mỗi cạnh đúng một lần**; một chu trình Euler quay về điểm xuất phát. Một đường Hamilton đi qua **mỗi đỉnh đúng một lần**. Hai tên gần nhau nhưng độ khó khác hẳn: bài Euler có điều kiện đơn giản và thuật toán tuyến tính, còn bài Hamilton tổng quát không có tiêu chuẩn bậc đơn giản tương tự.

## 1. Điều kiện Euler cho đồ thị vô hướng

Bỏ qua các đỉnh cô lập (bậc 0), các đỉnh còn cạnh phải nằm trong cùng một thành phần liên thông. Nếu mọi đỉnh có bậc chẵn, có chu trình Euler. Nếu đúng hai đỉnh bậc lẻ, có đường Euler mở bắt đầu ở một đỉnh lẻ và kết thúc ở đỉnh kia. Nếu có số đỉnh bậc lẻ khác 0 hoặc 2, không có đường Euler. Lý do: mỗi lần đi vào một đỉnh trung gian phải có một cạnh khác để đi ra; chỉ hai đầu đường có thể dùng số cạnh vào/ra lệch một. Điều kiện này cùng liên thông là đủ.





```note-visualization
{"id":"euler-check","preset":"normal"}
```

## 2. Thuật toán Hierholzer

Bắt đầu ở đỉnh lẻ nếu có, nếu không ở một đỉnh có cạnh. Đi theo cạnh chưa dùng, đánh dấu **ID cạnh** đã dùng, đẩy các đỉnh qua lên stack. Khi đỉnh trên đỉnh stack hết cạnh chưa dùng, pop nó vào kết quả. Đảo kết quả để có thứ tự đường đi. Nếu dùng con trỏ vị trí duyệt riêng cho từng danh sách kề, mỗi cạnh được xét hữu hạn lần, `O(V+E)`. Với multigraph, hai cạnh song song cần ID khác nhau; chỉ đánh dấu cặp đỉnh là sai. Với đồ thị không cạnh, quy ước kết quả là đường rỗng hay một đỉnh tùy đề.





```note-visualization
{"id":"hierholzer","preset":"normal"}
```

## 3. Hamilton

Điều kiện bậc của Euler không bảo đảm chu trình Hamilton: hai tam giác chỉ chung một đỉnh có mọi bậc chẵn và có chu trình Euler, nhưng không có chu trình Hamilton vì đỉnh chung phải được đi qua hai lần để thăm cả hai phía. Cách trực tiếp là quay lui chọn đỉnh kề chưa thăm, `O(V!)` trong trường hợp xấu. Với `V` nhỏ, DP bitmask đặt `dp[mask][v]` là có đường đi qua đúng các đỉnh trong `mask` và kết thúc ở `v`; thử nối sang `u` chưa trong mask có cạnh `v-u`. Chi phí `O(2^V V²)` với ma trận kề, bộ nhớ `O(2^V V)`. Muốn chu trình, cố định đỉnh bắt đầu và kiểm tra cạnh trở về nó ở cuối.



Các điều kiện đủ như định lý Dirac áp dụng trong phạm vi giả định riêng, không thay thế thuật toán tổng quát. Nếu bài là người giao hàng với **trọng số** và cần chu trình ngắn nhất, đó là TSP, còn khó hơn câu hỏi chỉ có tồn tại chu trình Hamilton.



```note-visualization
{"id":"hamilton-search","preset":"normal"}
```

**Tự luyện:** (1) Kiểm tra điều kiện Euler cho đường `0-1-2` và tam giác. (2) Mô phỏng Hierholzer trên tam giác. (3) Định nghĩa trạng thái DP bitmask cho đường Hamilton bắt đầu ở đỉnh 0.

*Đối chiếu: Drozdek, chương 8; Lê Minh Hoàng, phần 4 §6–7.*

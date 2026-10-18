---
title: "Ghép cặp hai phía và bài toán phân công"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/bipartite-matching"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 17
tags: ["bipartite-matching", "augmenting-path", "assignment", "hopcroft-karp"]
description: "Từ đường tăng đến maximum matching, rồi phân biệt ghép cặp nhiều nhất với chi phí nhỏ nhất."
draft: false
---

Đồ thị hai phía chia đỉnh thành `L` và `R`, chỉ có cạnh giữa hai phía. Một matching là tập cạnh không chung đầu mút; mục tiêu **maximum matching** là có nhiều cạnh nhất. Đừng nhầm với **maximal matching**: một matching không thể thêm trực tiếp cạnh nào có thể vẫn nhỏ hơn tối ưu nếu cần đổi các cạnh đã chọn.

## 1. Đường tăng

Một đường tăng bắt đầu ở đỉnh tự do bên `L`, kết thúc ở đỉnh tự do bên `R`, và luân phiên cạnh **không trong matching**, **trong matching**. Đổi trạng thái tất cả cạnh trên đường làm số cạnh matching tăng đúng 1: số cạnh chưa ghép nhiều hơn số cạnh đã ghép một. Định lý Berge: matching là cực đại về số lượng khi và chỉ khi không còn đường tăng. Đây là cơ sở của mọi thuật toán ghép cặp.



Cách DFS cơ bản thử tìm đường tăng từ từng đỉnh trái, dùng `matchR[v]` lưu đỉnh trái đang ghép với `v`. Nếu `v` rảnh, nhận; nếu đã ghép, đệ quy tìm chỗ khác cho đối tác cũ. `visited` phải reset theo **mỗi lượt tìm đường tăng**; giữ toàn cục sẽ bỏ lỡ đường xuất hiện sau lần lật matching. Chi phí thô `O(|L|E)`. Hopcroft–Karp dùng BFS phân tầng các đường tăng ngắn nhất rồi DFS tìm nhiều đường tăng rời nhau trong một pha, đạt `O(E√V)`.



```note-visualization
{"id":"bipartite-augment","preset":"normal"}
```

## 2. Chuyển về luồng

Nối nguồn tới mỗi đỉnh trái capacity 1, mỗi cạnh `L→R` capacity 1, mỗi đỉnh phải tới đích capacity 1. Mọi luồng nguyên đơn vị tương ứng một matching; max-flow cho kích thước matching lớn nhất. Với capacity nguyên, thuật toán đường tăng duy trì luồng nguyên. Cách dựng này giúp tái dùng lý thuyết min-cut và giải các biến thể capacity lớn hơn 1.





```note-visualization
{"id":"matching-as-flow","preset":"normal"}
```

## 3. Phân công có chi phí

Nếu mỗi cặp người–việc có chi phí và phải gán mỗi người đúng một việc, bài toán là **minimum-cost perfect matching**/assignment. Chỉ chạy thuật toán maximum matching là chưa đủ: nó tối đa **số cặp**, không tối thiểu tổng chi phí. Với ma trận chi phí vuông, thuật toán Hungarian giải trong `O(n³)` theo cách cài chuẩn; với mạng tổng quát và capacity/chi phí, dùng min-cost flow. Nếu một số cặp bị cấm, biểu diễn bằng không có cạnh hoặc chi phí vô cùng cẩn thận; phải kiểm tra liệu perfect matching có tồn tại.





```note-visualization
{"id":"min-cost-assignment","preset":"normal"}
```

**Tự luyện:** (1) Vẽ đường tăng giúp đổi từ matching 1 cạnh sang 2 cạnh khi đỉnh mới chỉ nối tới đỉnh phải đã ghép. (2) Chứng minh matching cực đại về số lượng không thể còn đường tăng. (3) Đưa ví dụ hai perfect matching có chi phí khác nhau.

*Đối chiếu: Drozdek, chương 8; Lê Minh Hoàng, phần 4 §11–13.*

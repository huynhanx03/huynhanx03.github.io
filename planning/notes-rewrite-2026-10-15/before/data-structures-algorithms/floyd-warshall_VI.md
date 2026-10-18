---
title: "Floyd–Warshall: mọi cặp đường đi qua những đỉnh trung gian"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/floyd-warshall"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 14
tags: ["floyd-warshall", "all-pairs-shortest-path", "dynamic-programming"]
description: "Một DP ba vòng với bất biến rõ ràng, xử lý vô cực và chu trình âm."
draft: false
---

Nếu cần khoảng cách giữa **mọi cặp** đỉnh của đồ thị nhỏ/vừa, Floyd–Warshall dùng `O(V³)` thời gian và `O(V²)` bộ nhớ. Nó cho phép cạnh âm, nhưng khoảng cách tới các cặp chịu ảnh hưởng của chu trình âm không còn giá trị hữu hạn. Với đồ thị thưa rất lớn, chạy thuật toán một nguồn nhiều lần có thể phù hợp hơn, tùy trọng số.

## 1. Trạng thái theo đỉnh trung gian

Gọi `D_k[i][j]` là đường ngắn nhất từ `i` tới `j` mà các đỉnh **trung gian** chỉ thuộc tập `{0,...,k-1}`. Đường tối ưu hoặc không đi qua `k`, hoặc đi qua `k` và tách thành `i→k` với `k→j`. Do đó cập nhật `dist[i][j] = min(dist[i][j], dist[i][k]+dist[k][j])` với vòng `k` ở ngoài cùng.



Khởi tạo `dist[i][i]=0`, `dist[u][v]=min` giữa các cạnh song song, còn lại vô cực. Với đường đi không có chu trình âm liên quan, cập nhật tại chỗ đúng vì các giá trị ở lượt `k` có thể dùng lại mà không tạo trung gian ngoài tập cho phép. Không được đổi vòng `k` vào trong tùy tiện: khi đó thứ tự phụ thuộc DP bị phá.

```go
for k := 0; k < n; k++ {
    for i := 0; i < n; i++ {
        for j := 0; j < n; j++ {
            if dist[i][k] == inf || dist[k][j] == inf { continue }
            via := dist[i][k] + dist[k][j]
            if via < dist[i][j] { dist[i][j] = via }
        }
    }
}
```

`inf` phải là sentinel đủ lớn, nhưng không lớn đến mức cộng hai khoảng cách hợp lệ gây tràn; kiểm tra cả cận giá trị đầu vào. Nếu cần tái dựng đường, lưu `next[i][j]`: khi cải thiện qua `k`, đặt `next[i][j]=next[i][k]`.

Với cạnh `0→1` trọng số 3, `1→2` trọng số -1 và `0→2` trọng số 5, ma trận ban đầu là:

| Từ / đến | 0 | 1 | 2 |
| --- | ---: | ---: | ---: |
| 0 | 0 | 3 | 5 |
| 1 | ∞ | 0 | -1 |
| 2 | ∞ | ∞ | 0 |

Ở lượt cho phép đỉnh trung gian `k=1`, ta tìm thấy đường `0→1→2` nặng `3+(-1)=2`, nên `dist[0][2]` đổi từ 5 thành 2. Các ô còn lại giữ nguyên. Nếu đổi thứ tự vòng để `i` ở ngoài và `k` ở trong, một giá trị vừa cập nhật có thể bị dùng trong cùng lượt theo một tập đỉnh trung gian không kiểm soát được; ta mất bất biến `D_k` dùng để chứng minh.



```note-visualization
{"id":"floyd-warshall","preset":"normal"}
```

## 2. Chu trình âm

Sau thuật toán, nếu `dist[k][k]<0`, có chu trình âm liên quan tới `k`. Một cặp `(i,j)` có khoảng cách không bị chặn dưới nếu tồn tại `k` như vậy với `i` tới được `k` và `k` tới được `j`. Chỉ thấy một `dist[k][k]<0` không có nghĩa **mọi** cặp đều vô nghĩa. Nếu bài chỉ hỏi phát hiện chu trình âm bất kỳ, điều kiện đường chéo đủ; nếu hỏi khoảng cách từng cặp, cần đánh dấu các cặp bị ảnh hưởng.

**Tự luyện:** (1) Viết ma trận ban đầu cho `0→1(3),1→2(-1),0→2(5)`, rồi thực hiện lượt `k=1`. (2) Vì sao phải kiểm tra vô cực trước phép cộng? (3) Xây ví dụ có chu trình âm chỉ ảnh hưởng một phần các cặp.

*Đối chiếu: Drozdek, chương 8; Lê Minh Hoàng, phần 4 §8.*

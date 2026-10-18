---
title: "LCA và binary lifting: tìm tổ tiên chung gần nhất"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/lca-binary-lifting"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 23
tags: ["tree", "lca", "binary-lifting", "ancestor"]
description: "Tiền xử lý các tổ tiên cách 1, 2, 4 bước để trả truy vấn LCA và khoảng cách trên cây."
draft: false
---

Trong cây có gốc, **tổ tiên chung gần nhất** của `u` và `v` (LCA) là nút sâu nhất nằm trên cả hai đường từ gốc tới `u` và `v`. Ví dụ hai file nằm trong hai thư mục con khác nhau: LCA là thư mục chung gần nhất chứa cả hai. Nếu mỗi truy vấn đều lần theo cha từng bước, có thể mất `O(n)` trên cây dây. Binary lifting chuẩn bị các bước nhảy theo lũy thừa hai để mỗi truy vấn dùng `O(log n)`.

## 1. Bảng tổ tiên

Gốc cây tại `root`. Đặt `up[k][v]` là tổ tiên cách `2^k` cạnh của `v`; nếu không tồn tại, dùng `-1`. `up[0][v]` là cha của `v`, và `up[k][v]=up[k-1][up[k-1][v]]` nếu nút trung gian tồn tại. Cùng một DFS/BFS từ gốc tính `depth[v]` và cha. Cần `K` sao cho `2^K > n`; bảng dùng `O(n log n)` thời gian và bộ nhớ.





```go
func Jump(v, steps int, up [][]int) int {
    bit := 0
    for steps > 0 && v != -1 {
        if steps&1 == 1 { v = up[bit][v] }
        steps >>= 1
        bit++
    }
    return v
}
```

Hàm giả sử bảng có đủ tầng cho `steps`. Bất biến: những bit đã xử lý biểu diễn đúng số cạnh đã đi lên; các bit còn lại biểu diễn phần chưa đi. Để tìm LCA, trước tiên đưa nút sâu hơn lên cùng độ sâu. Nếu hai nút bằng nhau, đó là đáp án. Nếu khác, xét `k` từ lớn xuống 0: khi cả `up[k][u]` và `up[k][v]` tồn tại **và khác nhau**, nhảy cả hai; cuối cùng cha trực tiếp của một trong hai là LCA. Không nhảy khi tổ tiên ở tầng đó bằng nhau vì sẽ đi qua đáp án.

```go
func LCA(u, v int, depth []int, up [][]int) int {
    if depth[u] < depth[v] { u, v = v, u }
    u = Jump(u, depth[u]-depth[v], up)
    if u == v { return u }
    for k := len(up)-1; k >= 0; k-- {
        pu, pv := up[k][u], up[k][v]
        if pu != -1 && pv != -1 && pu != pv {
            u, v = pu, pv
        }
    }
    return up[0][u]
}
```

Hàm giả sử `u,v` là nút hợp lệ trong **cùng cây**, và `up[k][v]` đã được tính đầy đủ. Ví dụ cây gốc `0` có con `1,2`, còn `1` có con `3,4`: `LCA(3,4)=1`; để hỏi `LCA(3,2)`, nâng `3` từ độ sâu 2 lên `1`, rồi thấy hai nút ở hai nhánh và trả cha chung `0`. Nếu dùng `-1` cho tổ tiên không tồn tại, `Jump` phải dừng khi `v==-1` như code phía trên; không bao giờ lấy `up[k][-1]`.

Để tạo bảng, duyệt cây từ gốc bằng queue: `parent[root]=-1`, `depth[root]=0`, với mỗi cạnh tới con chưa thăm đặt `parent[child]=u`, `depth[child]=depth[u]+1`. Sau lượt duyệt, gán `up[0]=parent`, rồi với `k=1..K-1`, `up[k][v] = -1` nếu `up[k-1][v]==-1`, ngược lại lấy `up[k-1][up[k-1][v]]`. Trên danh sách cạnh **vô hướng**, phải bỏ cạnh quay về cha khi duyệt. Đây là bước tiền xử lý `O(n log n)`; hàm LCA không tự xây bảng.



```note-visualization
{"id":"ancestor-table","preset":"normal"}
```



```note-visualization
{"id":"lca-query","preset":"normal"}
```

## 2. Khoảng cách và đường đi

Trong cây không trọng số, `distance(u,v)=depth[u]+depth[v]-2*depth[LCA(u,v)]`. Với trọng số, thay `depth` trong công thức bằng tổng trọng số từ gốc và giữ độ sâu theo số cạnh riêng để nâng hai nút. Nếu hai nút không cùng thành phần của một rừng, LCA không tồn tại; API cần kiểm tra component trước. Khi gốc thay đổi theo truy vấn, LCA theo gốc cố định không còn là câu trả lời trực tiếp; có một công thức dùng ba LCA với gốc cũ, nhưng nên học bản gốc cố định trước.



**Lỗi thường gặp:** đặt cha gốc bằng chính gốc rồi không kiểm tra điều kiện nhảy có thể làm giải thích “không có tổ tiên” khó theo dõi; dùng `-1` rõ ràng hơn. Với cây rất sâu, DFS đệ quy Go có thể tốn stack; BFS/stack tường minh giúp kiểm soát. Không có nhiều truy vấn thì cách đi cha đơn giản có thể rẻ hơn tiền xử lý.



```note-visualization
{"id":"tree-distance","preset":"normal"}
```

**Tự luyện:** (1) Dựng bảng `up[0..2]` cho cây `0→{1,2}`, `1→{3,4}`. (2) Tính `LCA(3,4)` và `LCA(3,2)`. (3) Chứng minh công thức khoảng cách bằng cách tách đường qua LCA.

*Đọc thêm: [VNOI — LCA](https://wiki.vnoi.info/vi/algo/data-structures/lca), [VNOI — binary lifting](https://wiki.vnoi.info/vnoi-magazine/2023/binary-lifting).*

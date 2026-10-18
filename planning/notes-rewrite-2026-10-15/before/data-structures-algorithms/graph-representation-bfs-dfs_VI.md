---
title: "Đồ thị đầu tiên: biểu diễn, BFS và DFS"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/graph-representation-bfs-dfs"
translationPending: true
series: "DSA cơ bản"
seriesOrder: 18
tags: ["graph", "adjacency-list", "bfs", "dfs", "go"]
description: "Phân biệt đồ thị có hướng/vô hướng, chọn biểu diễn và chứng minh đường đi ít cạnh nhất của BFS."
draft: false
---

Đồ thị gồm tập đỉnh `V` và tập cạnh `E`. Cạnh có thể có hướng hoặc vô hướng, có trọng số hoặc không. Trước khi chọn thuật toán, phải xác định loại đồ thị, cách đánh số đỉnh, cạnh song song/tự khuyên có được phép không, và ý nghĩa của “đã thăm”. Những khác biệt nhỏ này quyết định code có đúng hay không.

## 1. Biểu diễn

**Danh sách kề** lưu với mỗi đỉnh các láng giềng, chiếm `O(V+E)` bộ nhớ và duyệt mọi cạnh hiệu quả. Với đồ thị vô hướng, mỗi cạnh `{u,v}` thường xuất hiện trong cả `adj[u]` và `adj[v]`; khi tính bậc, cần nhớ hai bản ghi ấy thuộc một cạnh. **Ma trận kề** dùng `O(V²)` bộ nhớ, kiểm tra có cạnh `(u,v)` trong `O(1)`, phù hợp đồ thị dày hoặc thuật toán mọi cặp. Nếu có cạnh song song/trọng số, ô ma trận cần quy ước lưu một giá trị, danh sách, hoặc trọng số tốt nhất.





```note-visualization
{"id":"graph-adjacency","preset":"normal"}
```

## 2. BFS: queue và khoảng cách theo số cạnh

```go
func Distances(adj [][]int, source int) []int {
    dist := make([]int, len(adj))
    for i := range dist { dist[i] = -1 }
    queue := []int{source}
    dist[source] = 0
    for head := 0; head < len(queue); head++ {
        u := queue[head]
        for _, v := range adj[u] {
            if dist[v] != -1 { continue }
            dist[v] = dist[u] + 1
            queue = append(queue, v)
        }
    }
    return dist
}
```



Giả sử `source` hợp lệ và mọi láng giềng là chỉ số hợp lệ. Đánh dấu **khi đưa vào queue**, không phải khi lấy ra, để mỗi đỉnh chỉ vào queue một lần. Bất biến: queue xử lý đỉnh theo khoảng cách không giảm; lần đầu phát hiện `v` từ `u` cho đường đi `dist[u]+1` cạnh ngắn nhất, vì mọi đường ngắn hơn đã được xét ở tầng trước. BFS này chỉ tối ưu **số cạnh**, không tối ưu tổng trọng số bất kỳ. Thời gian `O(V+E)`, bộ nhớ `O(V)` ngoài biểu diễn đồ thị.



```note-visualization
{"id":"bfs","preset":"normal"}
```

## 3. DFS: đi sâu và thời điểm xử lý

DFS đệ quy hoặc stack tường minh đi theo một nhánh tới khi không đi tiếp được rồi quay lại. Duy trì `visited` để tránh vòng lặp; với đồ thị có hướng, muốn phát hiện chu trình trong DFS cần phân biệt trạng thái chưa thăm, đang trên stack, đã hoàn tất. Một cạnh tới đỉnh đang trên stack là back edge. Với đồ thị vô hướng, cạnh trở lại cha là bình thường; phải loại nó khi nhận diện chu trình (và với multigraph, cần phân biệt theo ID cạnh).



DFS cũng `O(V+E)`; stack có thể `O(V)`. Nếu đồ thị không liên thông, phải bắt đầu BFS/DFS từ mọi đỉnh chưa thăm để duyệt hết. Thứ tự đỉnh thăm phụ thuộc thứ tự danh sách kề, không nên coi là một kết quả duy nhất nếu đề bài không quy định.



```note-visualization
{"id":"dfs","preset":"normal"}
```

**Tự luyện:** (1) Vẽ BFS từ `0` trên cạnh `0-1,0-2,1-3,2-3`; ghi `dist`. (2) Vì sao đánh dấu khi pop có thể đưa cùng đỉnh vào queue nhiều lần? (3) Sửa DFS để đếm thành phần liên thông của đồ thị vô hướng.

*Đối chiếu: Jain, chương 13; Drozdek, chương 8; Lê Minh Hoàng, phần 4 §1–3.*

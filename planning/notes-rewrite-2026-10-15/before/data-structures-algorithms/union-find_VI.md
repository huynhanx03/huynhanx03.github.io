---
title: "Union-Find: quản lý thành phần liên thông khi cạnh được thêm"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/union-find"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 10
tags: ["disjoint-set", "union-find", "path-compression", "kruskal"]
description: "Find, union by size, nén đường đi và giới hạn của cấu trúc khi xóa cạnh."
draft: false
---

Disjoint-set union (DSU) chia các phần tử thành những tập không giao nhau. `Find(x)` trả đại diện tập của `x`; `Union(a,b)` gộp hai tập. Nó giải tốt bài “hai đỉnh đã nối với nhau chưa?” khi ta **chỉ thêm cạnh**. Nó không tự hỗ trợ xóa một cạnh và tách một thành phần thành hai.





```go
type DSU struct { parent, size []int }

func NewDSU(n int) *DSU {
    d := &DSU{make([]int, n), make([]int, n)}
    for i := 0; i < n; i++ { d.parent[i], d.size[i] = i, 1 }
    return d
}

func (d *DSU) Find(x int) int {
    if d.parent[x] != x { d.parent[x] = d.Find(d.parent[x]) }
    return d.parent[x]
}

func (d *DSU) Union(a, b int) bool {
    ra, rb := d.Find(a), d.Find(b)
    if ra == rb { return false }
    if d.size[ra] < d.size[rb] { ra, rb = rb, ra }
    d.parent[rb] = ra
    d.size[ra] += d.size[rb]
    return true
}
```

Bất biến: mỗi tập tạo một cây cha có gốc tự trỏ vào mình; `size` chỉ đáng tin ở gốc. `Find` nén đường đi bằng cách cho các nút trên đường trỏ thẳng về gốc. `Union` gắn cây nhỏ vào cây lớn, làm chiều cao tăng chậm. Khi **cả hai** kỹ thuật được dùng, một dãy `m` thao tác trên `n` phần tử có chi phí `O(m α(n))` amortized, với `α` là hàm nghịch đảo Ackermann tăng cực chậm; không nên gọi đây là bảo đảm `O(1)` tuyệt đối cho từng lần.

Trong Kruskal, sắp cạnh theo trọng số rồi thử `Union(u,v)`: nếu trả `true`, hai đầu đang ở hai thành phần khác nhau và cạnh này được nhận; nếu `false`, nhận cạnh sẽ tạo chu trình. DSU cũng đếm thành phần: bắt đầu `n`, mỗi lần `Union` thành công giảm 1. Với đồ thị có cạnh xóa và truy vấn xen kẽ, cần thuật toán dynamic connectivity khác hoặc xử lý offline với rollback DSU; nén đường đi không tiện cho rollback vì thay đổi nhiều con trỏ.



```note-visualization
{"id":"union-by-size","preset":"normal"}
```



```note-visualization
{"id":"path-compression","preset":"normal"}
```

**Tự luyện:** (1) Mô phỏng `Union(0,1), Union(2,3), Union(1,3)`. (2) Vì sao phải so `Find(a)==Find(b)` thay vì `parent[a]==parent[b]`? (3) Cho một ví dụ xóa cạnh làm DSU cũ trả sai.

*Đối chiếu: Drozdek, chương 8; Jain, chương 13.*

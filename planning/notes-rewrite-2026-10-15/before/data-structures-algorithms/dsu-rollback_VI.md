---
title: "DSU rollback: quay lại trạng thái kết nối trước đó"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/dsu-rollback"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 26
tags: ["dsu", "rollback", "offline-connectivity"]
description: "Lưu lịch sử các phép gộp để xử lý nhiều nhánh truy vấn kết nối offline."
draft: false
---

DSU thông thường hỗ trợ **thêm** cạnh: một khi hai tập đã gộp, nó không biết phải tách thế nào khi cạnh bị bỏ. DSU rollback cho phép `Snapshot()` đánh dấu thời điểm và `Rollback(snapshot)` hoàn tác các lần gộp sau đó. Nó đặc biệt hữu ích trong thuật toán **offline**: biết trước toàn bộ thao tác, chia thời gian thành các đoạn, đi vào một nhánh với một tập cạnh rồi quay lại để xét nhánh khác.

## 1. Cần bỏ path compression

Path compression trong `Find` thay nhiều con trỏ một cách khó ghi log gọn. Bản rollback thường dùng **union by size nhưng không nén đường**. Khi luôn gắn cây nhỏ vào cây lớn, chiều cao tối đa `O(log n)`, nên `Find` là `O(log n)` tệ nhất. Mỗi lần gộp thành công chỉ đổi `parent[smallRoot]`, `size[largeRoot]` và số thành phần; lưu các giá trị cũ vào stack. Một lần gộp không thành công cũng cần quy ước: có thể không ghi gì và snapshot theo `len(history)`, hoặc ghi một marker để số thao tác và số log khớp nhau.



```go
type Change struct { Small, Large, OldSize int }
type RollbackDSU struct { Parent, Size []int; History []Change }

func (d *RollbackDSU) Find(x int) int {
    for d.Parent[x] != x { x = d.Parent[x] }
    return x
}
func (d *RollbackDSU) Snapshot() int { return len(d.History) }
func (d *RollbackDSU) Union(a, b int) bool {
    a, b = d.Find(a), d.Find(b)
    if a == b { return false }
    if d.Size[a] < d.Size[b] { a, b = b, a }
    d.History = append(d.History, Change{b, a, d.Size[a]})
    d.Parent[b] = a
    d.Size[a] += d.Size[b]
    return true
}
func (d *RollbackDSU) Rollback(snapshot int) {
    for len(d.History) > snapshot {
        i := len(d.History)-1
        c := d.History[i]
        d.History = d.History[:i]
        d.Parent[c.Small] = c.Small
        d.Size[c.Large] = c.OldSize
    }
}
```

Khởi tạo `Parent[i]=i`, `Size[i]=1` như DSU thường. Bất biến: mọi thay đổi kể từ snapshot nằm ở đỉnh stack, nên hoàn tác theo thứ tự ngược phục hồi chính xác trạng thái cũ. `Rollback` mất `O(k)` cho `k` lần gộp thành công được hoàn tác; việc truy vấn số thành phần có thể giữ thêm một biến và hoàn tác tương ứng.



```note-visualization
{"id":"dsu-rollback","preset":"normal"}
```

## 2. Cạnh sống trên một khoảng thời gian

Nếu cạnh `(u,v)` tồn tại từ lúc `l` đến trước `r`, gắn nó vào các nút của một cây phân chia **trục thời gian** phủ `[l,r)`. DFS cây thời gian: chụp snapshot, gộp mọi cạnh gắn ở nút, xuống các con; tới lá là thời điểm truy vấn và DSU mô tả chính xác các cạnh đang sống; quay về thì rollback. Mỗi cạnh được gắn `O(log q)` nút thời gian, nên tổng chi phí xấp xỉ `O((m log q) log n)` với union by size, cộng chi phí trả lời truy vấn. Phải ghép đúng lần thêm và lần xóa của từng cạnh; multigraph cần đếm hoặc ID cạnh riêng.





```note-visualization
{"id":"offline-connectivity","preset":"normal"}
```

**Tự luyện:** (1) Gộp `0–1`, chụp snapshot, gộp `1–2`, rồi rollback và hỏi `Find(0)==Find(2)`. (2) Giải thích tại sao path compression làm log hoàn tác dài. (3) Một cạnh tồn tại trong `[2,6)` thì cần xuất hiện ở những nhánh thời gian nào?

*Đọc thêm: [VNOI — DSU Rollback](https://wiki.vnoi.info/algo/data-structures/dsu-rollback).*

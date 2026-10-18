---
title: "Đồ thị đầu tiên: biểu diễn, BFS và DFS"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/graph-representation-bfs-dfs"
series: "DSA cơ bản"
seriesOrder: 18
tags: ["graph", "adjacency-list", "bfs", "dfs", "go"]
description: "Phân biệt đồ thị có hướng/vô hướng, chọn biểu diễn và chứng minh đường đi ít cạnh nhất của BFS."
draft: false
updated: 2026-10-15
---

Một sơ đồ đường nối có thể trả lời hai câu hỏi khác nhau: đi từ A có tới B không, và ít nhất phải qua bao nhiêu đoạn đường? Đồ thị biểu diễn các địa điểm bằng đỉnh và các kết nối bằng cạnh. BFS và DFS dùng cùng biểu diễn ấy nhưng tổ chức thứ tự khám phá khác nhau, dẫn đến những điều có thể suy ra khác nhau.

Trước khi cài đặt, xác định đồ thị có hướng hay vô hướng, có trọng số không, đỉnh được đánh số thế nào, có cạnh song song hoặc cạnh khuyên không. Cạnh `u→v` chỉ cho đi từ `u` tới `v`; cạnh vô hướng cho đi cả hai chiều. Các thuật toán trong bài giả sử chỉ số đỉnh thuộc `0..V-1`.

## Chọn biểu diễn theo thao tác cần làm

Danh sách kề `adj[u]` giữ các đỉnh có cạnh từ `u`. Nó dùng `O(V+E)` bộ nhớ và phù hợp khi muốn duyệt các láng giềng thật sự tồn tại. Đồ thị vô hướng thường ghi mỗi cạnh `{u,v}` hai lần, ở `adj[u]` và `adj[v]`. Tổng số bản ghi là `2E`, vẫn có độ lớn `O(V+E)`. Hai bản ghi này thuộc một cạnh, còn hai cạnh song song là hai cạnh khác nhau và có thể cần ID riêng.

Ma trận kề dành một ô cho mỗi cặp đỉnh, nên dùng `O(V²)` bộ nhớ dù có ít cạnh. Đổi lại, kiểm tra cạnh `(u,v)` trong `O(1)`. Duyệt mọi láng giềng phải quét cả hàng `V` ô; vì thế cận tuyến tính theo `V+E` của BFS/DFS bên dưới dựa trên danh sách kề. Với cạnh song song, một ô boolean chỉ giữ thông tin tồn tại; bài toán cần số cạnh hoặc trọng số phải quy ước lưu đếm, danh sách hay trọng số tốt nhất. Ma trận hợp với đồ thị dày và một số thuật toán mọi cặp.

```note-visualization
{"id":"graph-adjacency","preset":"normal"}
```

## BFS mở rộng theo từng lớp khoảng cách

Với cạnh vô hướng `0-1,0-2,1-3,2-3`, bắt đầu ở 0. Queue ban đầu `[0]`. Xử lý 0 phát hiện 1,2 ở khoảng cách 1. Xử lý 1 phát hiện 3 ở khoảng cách 2. Khi xử lý 2, đỉnh 3 đã được đánh dấu nên không đưa vào lần nữa. Kết quả là `[0,1,1,2]` dù danh sách kề có thể khiến 2 được xử lý trước 1.

### Cài đặt queue và bảng khoảng cách

```go
func Distances(adj [][]int, source int) []int {
	dist := make([]int, len(adj))
	for i := range dist {
		dist[i] = -1
	}

	queue := []int{source}
	dist[source] = 0 // Đánh dấu ngay khi enqueue.
	for head := 0; head < len(queue); head++ {
		u := queue[head]
		for _, v := range adj[u] {
			if dist[v] != -1 {
				continue
			}
			dist[v] = dist[u] + 1
			queue = append(queue, v)
		}
	}
	return dist
}
```

Đây là hàm Go nhận danh sách kề và một `source` hợp lệ; mọi láng giềng cũng phải là chỉ số hợp lệ. `-1` đồng thời có nghĩa chưa phát hiện và không tới được sau khi kết thúc. Queue được đọc bằng chỉ số `head` thay vì xóa phần tử đầu slice; mỗi đỉnh được đánh dấu trước khi append.

Queue xử lý khoảng cách không giảm: khi xử lý lớp `d`, các đỉnh mới chỉ thuộc lớp `d+1`, nằm sau những đỉnh đã chờ. Nếu lần đầu thấy `v` từ `u`, đường đó dài `dist[u]+1`. Một đường ngắn hơn phải có tiền nhiệm ở lớp trước và đã phát hiện `v` sớm hơn, mâu thuẫn. Do đó lần phát hiện đầu cho số cạnh nhỏ nhất.

Đánh dấu khi pop có thể làm 3 được cả 1 và 2 đưa vào queue trước khi nó được xử lý. Mark lúc enqueue tránh bản ghi lặp ấy. Có tối đa `V` lần enqueue, mỗi bản ghi kề xét một lần: thời gian `O(V+E)`, bộ nhớ phụ `O(V)`. Muốn xuất đường đi, lưu `parent[v]=u` đúng lúc phát hiện rồi truy ngược từ đích.

```note-visualization
{"id":"bfs","preset":"normal"}
```

BFS tối ưu số cạnh, không tối ưu tổng trọng số tùy ý. Đường một cạnh nặng 10 được ưu tiên theo số cạnh hơn đường hai cạnh nặng 2+2. Với mọi trọng số cùng một giá trị dương, ít cạnh cũng cho tổng nhỏ nhất; trường hợp trọng số khác nhau cần [thuật toán đường đi ngắn nhất](/vi/notes/data-structures-algorithms/shortest-paths/).

## DFS giữ một nhánh đang mở

DFS đi vào một láng giềng chưa thăm, xử lý sâu đến khi không đi tiếp được rồi quay lại. Đệ quy dùng call stack để nhớ các nhánh chưa xong; stack tường minh là cách khác. Nếu cần thời điểm hoàn tất như DFS đệ quy, stack phải giữ cả vị trí đang duyệt hoặc sự kiện vào/ra, không chỉ đẩy đỉnh tùy ý.

`visited` ngăn quay vòng. Với đồ thị có hướng, phát hiện chu trình cần ba trạng thái: chưa vào, đang trên stack đệ quy, đã hoàn tất. Cạnh đến đỉnh đang trên stack đóng một đường quay về và chứng minh có chu trình; cạnh đến đỉnh đã hoàn tất chưa đủ kết luận như vậy. Với đồ thị vô hướng, cạnh từ con về cha là mặt còn lại của cạnh cây, không phải chu trình mới. Với cạnh song song phải bỏ đúng ID cạnh cha, không bỏ mọi cạnh tới cùng đỉnh cha.

```note-visualization
{"id":"dfs","preset":"normal"}
```

DFS trên danh sách kề cũng dùng `O(V+E)` thời gian, stack có thể dài `O(V)` ở cây dây. Một lần BFS/DFS chỉ thăm phần tới được từ nguồn. Muốn duyệt hết đồ thị không liên thông, mở lượt mới từ từng đỉnh chưa thăm. Trong đồ thị vô hướng, mỗi lượt mới tương ứng một thành phần liên thông; trong đồ thị có hướng, cách đếm lượt ấy không tự cho số thành phần liên thông mạnh.

**Tự thử:** ở ví dụ hình thoi, khoảng cách tới 3 có phụ thuộc việc xét 1 trước hay 2 trước không? Vì sao mark muộn gây lặp? Đếm thành phần vô hướng bằng DFS thế nào?

**Giải thích:** khoảng cách luôn 2, nhưng parent của 3 có thể là 1 hoặc 2. Mark muộn để hai tiền nhiệm cùng thấy 3 chưa được xử lý và cùng enqueue. Đếm thành phần bằng cách duyệt mọi đỉnh, tăng bộ đếm khi bắt đầu một DFS từ đỉnh chưa thăm rồi đánh dấu toàn bộ thành phần của nó. Thứ tự thăm phụ thuộc danh sách kề; chỉ coi một thứ tự là bắt buộc khi hợp đồng đầu ra quy định.

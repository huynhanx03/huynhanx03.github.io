---
title: "Union-Find: quản lý thành phần liên thông khi cạnh được thêm"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/union-find"
series: "DSA nâng cao"
seriesOrder: 10
tags: ["disjoint-set", "union-find", "path-compression", "kruskal"]
description: "Find, union by size, nén đường đi và giới hạn của cấu trúc khi xóa cạnh."
draft: false
updated: 2026-10-15
---

Ban đầu mỗi người thuộc một nhóm riêng. Mỗi lần nhận tin hai người cùng nhóm, ta gộp hai nhóm; sau đó chỉ cần hỏi hai người đã thuộc cùng nhóm chưa. Nếu không có thao tác tách nhóm, giữ toàn bộ đường nối thường là thông tin dư. Disjoint-set union (DSU), hay Union-Find, chỉ giữ cách chia các phần tử thành các tập không giao nhau.

`Find(x)` trả một đại diện; `Union(a,b)` gộp tập chứa a và tập chứa b. Đại diện là nhãn nội bộ, không nhất thiết là phần tử nhỏ nhất hay xuất hiện sớm nhất. Caller cần so đại diện để biết quan hệ tập, không gán ý nghĩa nghiệp vụ cho số đại diện nếu API chưa hứa điều đó.

## Một rừng cây cha biểu diễn các tập

Mỗi phần tử có parent; gốc tự trỏ vào chính nó. Mọi node đi theo parent tới cùng gốc thuộc một tập. `size` chỉ lưu kích thước đáng tin tại gốc; các ô size của node đã thành con có thể là giá trị cũ.

Khai báo Go sau dùng hai slice dài n. `NewDSU` yêu cầu n không âm; mọi x,a,b dùng sau đó phải thuộc `[0,n)`. Code không thêm nhánh kiểm tra index ở từng method và `Find` có sửa parent để nén đường.

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

Khi khởi tạo, parent[i]=i,size[i]=1: mỗi tập có một phần tử. Union trước hết Find hai gốc. Nếu bằng nhau, không nối nữa và trả false; nối một gốc vào chính tập của nó bằng cách khác có thể tạo chu trình hoặc đếm size sai. Nếu khác, gắn gốc tập nhỏ vào gốc tập lớn, cộng size ở gốc sống và trả true.

## Theo dõi một lần gộp nhiều tầng

Với n=4:

| Thao tác | Parent sau thao tác | Size đáng tin ở gốc |
| --- | --- | --- |
| khởi tạo | `[0,1,2,3]` | mỗi gốc 1 |
| Union(0,1) | `[0,0,2,3]` | size[0]=2,size[2]=1,size[3]=1 |
| Union(2,3) | `[0,0,2,2]` | size[0]=2,size[2]=2 |
| Union(1,3) | `[0,0,0,2]` | size[0]=4 |

Ở lần gộp cuối, Find(1)=0,Find(3)=2. Hai tập bằng size; code giữ ra=0 và gắn 2 dưới 0. Node 3 vẫn trỏ vào 2, nên cây có đường 3→2→0. Tập đúng dù chưa làm phẳng toàn bộ.

```note-visualization
{"id":"union-by-size","preset":"normal"}
```

Không nén đường, union-by-size đã cho chiều cao O(log n): mỗi lần độ sâu một node tăng, cây chứa nó được gắn vào cây ít nhất lớn bằng, nên kích thước tập chứa nó tối thiểu gấp đôi. Kích thước không vượt n, do đó độ sâu chỉ tăng O(log n) lần.

## Find vừa trả đại diện vừa rút ngắn đường lần sau

Gọi Find(3) trên trạng thái cuối: đi đến 2, rồi 0; khi trả về, gán parent[2]=0 và parent[3]=0. Parent trở thành `[0,0,0,0]`. Không đổi phần tử thuộc tập nào, chỉ đổi đường để tới cùng gốc. Các Find sau từ 3 nhanh hơn nhờ việc đã làm.

```note-visualization
{"id":"path-compression","preset":"normal"}
```

Với union-by-size cùng path compression, một chuỗi m thao tác Find/Union sau khởi tạo có cận amortized dạng `O(m α(n))`, cộng `O(n)` khởi tạo; các cách phát biểu có thể gộp số lần MakeSet vào m. α là nghịch đảo Ackermann tăng cực chậm. Đây không phải O(1) tuyệt đối cho từng lần Find: một lần đầu vẫn có thể đi qua nhiều parent.

Bộ nhớ mảng O(n); bản Find đệ quy còn dùng stack theo đường đi, bị chặn O(log n) nhờ union-by-size trước nén trong cấu trúc này. Nếu tự sửa parent tùy ý, không thể tiếp tục mượn cận ấy. Path compression còn khiến một truy vấn tưởng như “chỉ hỏi” có ghi, nên không dùng đồng thời thiếu đồng bộ.

## Thêm cạnh kết nối được ánh xạ thành Union

Trong đồ thị vô hướng, ban đầu n thành phần. Thêm cạnh u–v thì Union(u,v). Nếu hai gốc khác, hai thành phần hợp nhất và số thành phần giảm một; nếu cùng gốc, đã có đường giữa hai đầu, thêm cạnh không giảm số thành phần. DSU chỉ cần biết quan hệ này, không giữ một đường cụ thể để xuất ra.

Kruskal sắp cạnh theo trọng số rồi thử Union. Nhận cạnh khi true vì nó nối hai thành phần hiện khác nhau; từ chối khi false để tránh chu trình. Lập luận chọn cạnh nhẹ để tối ưu thuộc thuật toán Kruskal; DSU đảm nhận kiểm tra thành phần/chu trình, không tự chứng minh tối ưu chỉ từ bool trả về. Nếu đồ thị không liên thông, các cạnh nhận tạo rừng bao trùm thay vì một cây bao trùm toàn bộ.

## Xóa cạnh là một câu hỏi khác

Cho cạnh 0–1 và 1–2. Sau hai Union, cả ba chung tập. Nếu xóa 1–2, node 2 tách ra, nhưng parent DSU vẫn chỉ nói đã từng gộp chung; không có dữ liệu đủ để tự tách. Nếu còn cạnh 0–2 khác, xóa 1–2 lại chưa làm tách. Vì vậy “đảo ngược một Union gần đây” không tự mô phỏng được mọi thao tác xóa cạnh trực tuyến.

Dynamic connectivity cần kỹ thuật khác hoặc xử lý offline theo thời gian với rollback DSU. Rollback ghi những thay đổi để hoàn tác; path compression sửa nhiều parent trong Find nên thường không tiện kết hợp cách rollback đơn giản. Một thiết kế rollback thường giữ union-by-size mà bỏ nén để kiểm soát số thay đổi; không mặc định mang nguyên cận α(n) sang mọi biến thể ấy.

## Tự kiểm tra

**1.** Sau trace trên mà chưa Find(3) lần nữa, parent[1] và parent[3] khác nhau. Chúng có khác tập không? **2.** Union cùng tập có giảm số thành phần không? **3.** Xóa cạnh nào làm DSU cũ trả lời lỗi thời?

**Giải thích:** Parent trực tiếp 0 và 2 khác nhưng Find cả hai đều 0; phải so root, không so cha gần nhất. Union false không giảm thành phần và không cộng size. Trong chuỗi 0–1–2 không có cạnh khác, bỏ 1–2 khiến 2 tách khỏi 0 nhưng DSU cũ vẫn báo chung; đó là ranh giới của hợp đồng chỉ gộp.

Đọc thêm: [Princeton COS 226: Union-Find](https://www.cs.princeton.edu/courses/archive/spring21/cos226/lectures/15UnionFind.pdf) trình bày weighted union, nén đường và các loại cận.

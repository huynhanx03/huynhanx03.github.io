---
title: "LCA và binary lifting: tìm tổ tiên chung gần nhất"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/lca-binary-lifting"
series: "DSA nâng cao"
seriesOrder: 23
tags: ["tree", "lca", "binary-lifting", "ancestor"]
description: "Tiền xử lý các tổ tiên cách 1, 2, 4 bước để trả truy vấn LCA và khoảng cách trên cây."
draft: false
updated: 2026-10-15
---

Hai file ở hai thư mục con có một thư mục chung gần nhất chứa cả hai. Trên cây có gốc, ý tưởng ấy là LCA của hai nút `u,v`: nút sâu nhất nằm trên cả hai đường từ gốc tới chúng. Lần theo cha từng bước trả được đáp án, nhưng trên cây dây dài `n`, một truy vấn có thể mất `O(n)`.

Binary lifting chuẩn bị những lần nhảy 1, 2, 4, 8 cạnh. Một khoảng cách nguyên là tổng các lũy thừa hai, nên không cần đi từng cạnh. Bài này dùng cây cố định, gốc cố định và nhiều truy vấn; không đưa thay đổi cấu trúc cây vào cùng mô hình.

## Xây bảng từ cha trực tiếp

Duyệt BFS hoặc DFS từ `root`, tính `parent[v]` và `depth[v]` theo số cạnh. Đặt cha gốc bằng `-1`, độ sâu gốc bằng 0. Với danh sách cạnh vô hướng, bỏ cạnh trở về cha; nếu đầu vào chưa được bảo đảm là cây, còn phải kiểm tra hoặc dùng visited phù hợp.

`up[k][v]` là tổ tiên cách `2^k` cạnh, hoặc `-1` nếu không có. Hàng 0 là cha trực tiếp. Muốn đi `2^k` cạnh, đi hai lần `2^(k-1)`:

`up[k][v] = up[k-1][up[k-1][v]]`.

Nếu nút trung gian là `-1`, kết quả cũng là `-1`, không được dùng nó làm chỉ số. Chọn số tầng `K` đủ sao cho `2^K>n`. Tính các hàng tăng theo `k`, với `n` nút mỗi hàng: thời gian và bộ nhớ `O(n log n)`.

```note-visualization
{"id":"ancestor-table","preset":"normal"}
```

Với `0→{1,2}`, `1→{3,4}`, ta có `up[0]=[-1,0,0,1,1]`, `up[1]=[-1,-1,-1,0,0]`; hàng `up[2]` toàn -1. Hai lần đi cha từ 3 là 3→1→0, nên `up[1][3]=0`, không phải một nút chọn theo giá trị ID.

## Phân tích steps thành các bit

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

Đây là hàm Go nhận bảng đã xây; `steps>=0`, nút đầu hợp lệ và số tầng phải đủ cho các bit cần dùng. Sau mỗi vòng, các bit đã xử lý là số cạnh đã đi, các bit còn lại là phần chưa đi. Ví dụ nhảy 5 cạnh dùng bit 0 và 2, tức một bước 1 cạnh và một bước 4 cạnh từ vị trí đã cập nhật. Nếu tổ tiên không tồn tại, hàm dừng với -1 trước khi đọc bảng bằng chỉ số ấy.

LCA không tự gọi Jump với khoảng cách vượt miền: nó dùng hiệu hai độ sâu trong cùng cây. Nếu cung cấp Jump như API tổng quát, caller vẫn phải xử lý bước nhảy lớn hơn phạm vi bảng thay vì giả định hàm luôn trả -1 an toàn.

## Nâng hai nút mà không vượt qua đáp án

Trước tiên nâng nút sâu hơn bằng hiệu độ sâu. Nếu hai nút trùng nhau, nút đó là LCA, kể cả khi một nút ban đầu là tổ tiên của nút kia. Nếu còn khác nhau, xét tầng từ lớn xuống: chỉ nhảy cả hai khi hai tổ tiên ở tầng đó tồn tại và khác nhau.

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

Hàm giả sử hai nút hợp lệ cùng cây và bảng đầy đủ. Khi hai nút đang cùng độ sâu bên dưới LCA, nhảy đến hai tổ tiên khác nhau vẫn giữ chúng ở hai nhánh dưới đáp án. Nếu hai tổ tiên bằng nhau, nhảy sẽ đặt cả hai vào hoặc phía trên LCA và có thể bỏ qua nút chung sâu nhất. Bỏ bước ấy và thử bước nhỏ hơn giúp tiến gần mà không vượt. Khi hết tầng, hai nút khác nhau nhưng có cùng cha; cha đó là LCA.

Với cây ví dụ, `LCA(3,4)=1`. Với `LCA(3,2)`, nâng 3 lên 1 để cùng độ sâu với 2. Cha của 1 và 2 đều 0 nên không nhảy vào cùng cha trong vòng lặp; trả 0 ở cuối. `LCA(u,u)=u` dừng ngay sau cân bằng độ sâu.

```note-visualization
{"id":"lca-query","preset":"normal"}
```

Mỗi Jump và vòng xét tầng dùng `O(log n)`, nên mỗi LCA có cùng cận. Rừng cần thêm component ID: hai nút khác thành phần không có LCA. Không gọi hàm trên chúng rồi hy vọng một giá trị parent ngẫu nhiên có ý nghĩa.

## Từ tổ tiên chung đến khoảng cách

Đường duy nhất từ `u` tới `v` đi từ `u` lên `l=LCA(u,v)` rồi xuống `v`. Số cạnh là `(depth[u]-depth[l])+(depth[v]-depth[l])`, tức `depth[u]+depth[v]-2*depth[l]`.

Với trọng số, giữ thêm tổng trọng số từ gốc `rootDist`. Thay depth bằng rootDist trong công thức để tính tổng trọng số đường duy nhất; vẫn giữ depth theo số cạnh để nâng nút. Với trọng số âm, công thức vẫn là tổng trên đường cây duy nhất, nhưng không nên tự coi nó là metric thỏa các tính chất khoảng cách không âm.

```note-visualization
{"id":"tree-distance","preset":"normal"}
```

Thay gốc theo query làm câu trả lời LCA đổi; LCA theo gốc tiền xử lý không phải đáp án trực tiếp. Có kỹ thuật dùng ba LCA dưới gốc cũ để xử lý, nhưng bài này giữ phạm vi gốc cố định. Đặt cha gốc là chính gốc cũng là một quy ước cài đặt được, song phải điều chỉnh ý nghĩa của “không có tổ tiên” và Jump; không trộn nó với sentinel -1 trong code này.

DFS đệ quy trên cây rất sâu dùng nhiều stack; BFS/stack tường minh giúp kiểm soát việc duyệt. Nếu chỉ có vài query hoặc cây nhỏ, đi cha trực tiếp có thể đơn giản hơn chi phí xây bảng.

**Tự kiểm tra:** hàng `up[1]` của cây ví dụ là gì? Vì sao không nhảy khi hai tổ tiên bằng nhau? Khoảng cách 3 tới 2 bằng bao nhiêu?

**Giải thích:** hàng đó là `[-1,-1,-1,0,0]`. Một tổ tiên chung ở bước lớn có thể nằm trên đáp án, nên cần giữ hai nhánh khác nhau và giảm bước. Khoảng cách bằng `2+1-2*0=3`, theo đường 3→1→0→2. Tách đường tại LCA vừa chứng minh công thức vừa chỉ ra vì sao trừ phần từ gốc đến LCA hai lần.

*Đọc thêm: [VNOI — LCA](https://wiki.vnoi.info/vi/algo/data-structures/lca), [VNOI — binary lifting](https://wiki.vnoi.info/vnoi-magazine/2023/binary-lifting).*

[USACO Guide — Binary jumping](https://usaco.guide/plat/binary-jump) — bảng nhảy và truy vấn tổ tiên.

---
title: "Cây và phép duyệt: hiểu cấu trúc phân cấp bằng bất biến"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/trees-and-traversals"
series: "DSA cơ bản"
seriesOrder: 15
tags: ["tree", "traversal", "dfs", "bfs", "go"]
description: "Nút, cạnh, chiều cao, preorder/inorder/postorder và duyệt theo tầng."
draft: false
updated: 2026-10-15
---

Một thư mục chứa thư mục con; một biểu thức có các phép toán con; một cây tìm kiếm chia các khóa thành hai miền. Những cấu trúc này đều có thể được xử lý bằng câu hỏi “đã xử lý các con chưa, và lúc nào xử lý cha?”. Lựa chọn thời điểm ấy tạo ra các phép duyệt khác nhau.

Trước khi duyệt, cần hiểu cây được biểu diễn theo chiều nào. Một cây vô hướng là đồ thị liên thông không có chu trình, có n-1 cạnh với n nút và đúng một đường đi đơn giữa hai nút. Chọn một gốc tạo quan hệ cha–con: mọi nút khác gốc có một cha. Trong biểu diễn pointer từ cha xuống con, ta không cần đi lại về cha; trong danh sách cạnh vô hướng thì phải tránh việc ấy.

## Chiều sâu và chiều cao tính theo cạnh

Độ sâu nút là số cạnh từ gốc đến nó. Chiều cao nút là số cạnh trên đường dài nhất từ nó xuống lá. Ta dùng lá cao 0 và cây rỗng cao -1 để công thức `1+max(height(left),height(right))` áp dụng nhất quán.

Với cây gốc 4, trái 2 có hai con 1,3 và phải 6: 4 sâu 0, 2 và 6 sâu 1, 1 và 3 sâu 2. Chiều cao 4 bằng 2; 6 là lá nên cao 0 dù ở độ sâu 1. Hai đại lượng đo từ hai hướng khác nhau, không nhất thiết bằng nhau tại một nút.

Có tài liệu tính chiều cao bằng số nút, lệch một so với quy ước cạnh. Khi so công thức, xác nhận quy ước và trường hợp rỗng trước; khác một đơn vị không nhất thiết là khác thuật toán.

## Ba thời điểm của một lần duyệt sâu

Trên cây nhị phân, chọn thứ tự cây trái trước cây phải:

| Phép duyệt | Vị trí xử lý node | Thứ tự trên cây ví dụ |
| --- | --- | --- |
| Preorder | trước các con | `4,2,1,3,6` |
| Inorder | giữa trái và phải | `1,2,3,4,6` |
| Postorder | sau các con | `1,3,2,6,4` |

Preorder tại 4 xử lý 4 ngay, rồi hoàn thành toàn cây con 2 trước khi tới 6. Inorder trì hoãn 4 đến sau toàn cây trái, không chỉ sau node con 2. Postorder phải có kết quả cả hai cây con rồi mới xử lý 4. Mỗi quy tắc áp dụng lặp lại tại mọi node, nên toàn thứ tự được suy từ cùng một hợp đồng.

```go
type TreeNode struct {
    Value int
    Left, Right *TreeNode
}

func Height(root *TreeNode) int {
    if root == nil { return -1 } // chiều cao tính theo số cạnh
    left, right := Height(root.Left), Height(root.Right)
    if left > right { return left + 1 }
    return right + 1
}
```

Đây là khai báo Go độc lập và hàm Height không sửa cây. Base case trả -1; với lá, hai con đều -1 nên trả 0. Với node 2, hai con cao 0 nên trả 1; tại 4, max của 1 và 0 cộng 1 cho 2. Hàm có tổ chức postorder vì tính kết quả cha sau hai kết quả con.

Giả sử Height đúng ở các cây con, đường dài nhất từ cha phải đi qua một trong hai con và thêm một cạnh. Công thức chọn max vì cần đường **dài nhất**, không phải tổng cả hai nhánh. Đây là bước quy nạp chứng minh đúng; cây rỗng là cơ sở.

```note-visualization
{"id":"tree-preorder","preset":"normal"}
```

```note-visualization
{"id":"tree-inorder","preset":"normal"}
```

```note-visualization
{"id":"tree-postorder","preset":"normal"}
```

Mỗi node được thăm một lần nên thời gian O(n). Stack đồng thời theo một đường từ gốc tới node hiện tại, dùng O(h+1) frame; thường viết O(h) với cây không tầm thường. Cây dây h=n-1 dẫn tới O(n) stack, cây cân bằng h=O(log n). Tổng số node của cây không bằng số frame cùng sống ở mỗi thời điểm.

Preorder thuận tiện khi truyền trạng thái từ cha xuống, như đường dẫn thư mục. Postorder phù hợp khi cha cần đáp án con: kích thước, chiều cao, biểu thức hoặc tháo tài nguyên của cấu trúc do chính mình quản lý. Inorder cho thứ tự tăng chỉ khi cây còn thỏa bất biến **BST**, không phải do nó là cây nhị phân. Một cây gốc 4 có con trái 9 sẽ được inorder in 9 trước 4 và không tăng.

Stack tường minh có thể tái tạo DFS. Preorder thường đẩy con phải trước để con trái được Pop trước. Postorder cần phân biệt lần phát hiện node với thời điểm xử lý sau các con, chẳng hạn frame có trạng thái đã mở con; chỉ Push node một lần rồi xử lý ngay sẽ thành preorder khác.

## BFS dùng thứ tự FIFO để tạo các tầng

Khởi đầu queue chỉ chứa gốc nếu không rỗng. Pop một node, xử lý nó rồi Enqueue các con theo thứ tự muốn duyệt. Queue luôn chứa các node đã phát hiện nhưng chưa xử lý theo độ sâu không giảm.

Trên ví dụ, trạng thái queue lần lượt: `[4]` → `[2,6]` sau xử lý 4 → `[6,1,3]` sau xử lý 2 → `[1,3]` sau xử lý 6 → `[3]` → rỗng. Output `4,2,6,1,3`. Việc 1 được thêm trước khi xử lý 6 không khiến 1 vượt lên 6, vì FIFO giữ 6 ở đầu.

```note-visualization
{"id":"tree-level-order","preset":"normal"}
```

Muốn gom từng tầng, chụp size queue ở đầu vòng ngoài rồi xử lý đúng size node; các con thêm trong lượt đó thuộc tầng sau. Nếu liên tục đọc size mới tăng để quyết định số node của tầng hiện tại, có thể gom nhầm nhiều tầng vào một nhóm.

BFS thăm n node và n-1 cạnh một lần nên O(n), queue O(w) với w là bề rộng lớn nhất tính theo bậc: queue có thể đồng thời chứa phần đuôi tầng hiện tại và phần đầu tầng sau nhưng vẫn bị chặn bởi hằng số nhân w. Trên cây rất rộng, BFS dùng nhiều bộ nhớ hơn DFS theo chiều cao; trên cây dây, queue chỉ ít mục còn stack đệ quy dài.

## Cây nhiều nhánh và cây biểu diễn bằng cạnh

Node có `Children []*Node` vẫn duyệt trước hoặc sau mọi con theo cùng ý tưởng. Inorder “trái–cha–phải” cần quy ước đặc biệt khi không còn đúng hai con, nên không tự dùng cùng nghĩa trên mọi cây nhiều nhánh.

Nếu cây lưu bằng các cạnh vô hướng u–v, DFS từ u sang v sẽ thấy u trong danh sách kề v. Truyền parent và bỏ cạnh trở lại cha, hoặc dùng visited, để không quay lại. Nếu cấu trúc thực tế chứa chu trình hay nhiều cha, nó không còn là cây pointer theo giả định ở trên; cần thuật toán đồ thị cùng trạng thái đánh dấu thích hợp.

## Tự dựng và đối chiếu

**1.** Size(root) bằng gì? **2.** Preorder và inorder có dựng duy nhất cây khi khóa trùng không? **3.** Cùng n node, cây dây và cây nhị phân hoàn chỉnh khác chiều cao thế nào?

**Giải thích:** Size(nil)=0; Size(node)=1+Size(left)+Size(right), tổ chức postorder và O(n) thời gian. Với giá trị phân biệt, phần tử đầu preorder xác định gốc duy nhất trong inorder, chia hai cây con để đệ quy; khóa trùng làm vị trí gốc trong inorder mơ hồ, nên thường không đủ bảo đảm duy nhất nếu không thêm danh tính/quy ước. Cây dây cao n-1, cây hoàn chỉnh cao floor(log₂ n) khi n>0. Sự khác nhau về hình cây giải thích O(h) chứ không tự mọi thao tác trên cây là logarithmic.

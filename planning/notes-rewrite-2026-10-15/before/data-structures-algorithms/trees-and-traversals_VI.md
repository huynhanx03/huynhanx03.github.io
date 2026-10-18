---
title: "Cây và phép duyệt: hiểu cấu trúc phân cấp bằng bất biến"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/trees-and-traversals"
translationPending: true
series: "DSA cơ bản"
seriesOrder: 15
tags: ["tree", "traversal", "dfs", "bfs", "go"]
description: "Nút, cạnh, chiều cao, preorder/inorder/postorder và duyệt theo tầng."
draft: false
---

Cây là đồ thị liên thông không có chu trình. Với `n` nút, cây có đúng `n-1` cạnh và giữa hai nút có đúng một đường đi đơn. Khi chọn một nút làm **gốc**, mỗi nút khác có một cha; quan hệ cha-con giúp mô tả bài toán đệ quy. Độ sâu là số cạnh từ gốc; chiều cao của một nút là độ dài đường dài nhất từ nút ấy xuống lá. Có tài liệu tính chiều cao bằng số nút thay vì số cạnh: chọn một quy ước và giữ nhất quán, đặc biệt với cây rỗng.

## 1. Duyệt sâu theo ba thời điểm

Với cây nhị phân, preorder xử lý nút **trước** hai cây con, inorder xử lý **giữa**, postorder xử lý **sau**. Ví dụ gốc `4`, trái `2` với con `1,3`, phải `6`: preorder `4,2,1,3,6`; inorder `1,2,3,4,6`; postorder `1,3,2,6,4`. Inorder chỉ tạo thứ tự tăng khi cây thỏa bất biến của cây tìm kiếm nhị phân, không phải mọi cây.







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

Bất biến của hàm: trả chiều cao đúng của cây con tại `root`. Cơ sở cây rỗng là `-1`, nên lá có chiều cao `0`. Hàm thăm mỗi nút một lần: `O(n)` thời gian; stack đệ quy `O(h)` với `h` là chiều cao. Trên cây lệch, `h=n-1`; trên cây cân bằng, `h=O(log n)`.

Postorder phù hợp khi kết quả cha phụ thuộc kết quả con (đếm kích thước, xóa cây, tính biểu thức). Preorder phù hợp khi truyền trạng thái từ cha xuống con. Inorder phù hợp với BST. Cách duyệt bằng stack tường minh có cùng thứ tự nhưng cho phép kiểm soát stack; cần phân biệt “đã khám phá” với “đã xử lý” ở postorder.



```note-visualization
{"id":"tree-preorder","preset":"normal"}
```



```note-visualization
{"id":"tree-inorder","preset":"normal"}
```



```note-visualization
{"id":"tree-postorder","preset":"normal"}
```

## 2. Duyệt theo tầng

Đưa gốc vào queue, lặp lấy một nút ra rồi đưa các con vào. Bất biến: queue chứa các nút đã phát hiện nhưng chưa xử lý, theo thứ tự độ sâu không giảm. BFS thăm mỗi nút/cạnh một lần: `O(n)` thời gian; bộ nhớ có thể `O(w)` với `w` là bề rộng tầng lớn nhất. Nếu cần gom kết quả theo tầng, chụp `size` của queue ở đầu mỗi vòng ngoài rồi xử lý đúng `size` nút; các con mới thêm thuộc tầng sau.



Cây không nhất thiết là nhị phân. Cây nhiều nhánh thường lưu `Children []*Node`; DFS/BFS vẫn giữ nguyên ý tưởng. Với cây biểu diễn bằng danh sách cạnh vô hướng, khi DFS phải truyền `parent` hoặc `visited` để không đi ngược về cha.



```note-visualization
{"id":"tree-level-order","preset":"normal"}
```

**Tự luyện:** (1) Viết `Size(root)` bằng postorder. (2) Từ preorder và inorder của một cây có giá trị **phân biệt**, dựng lại cây; vì sao điều kiện phân biệt cần thiết? (3) So sánh chiều cao của cây dây và cây nhị phân đầy đủ có cùng số nút.

*Đối chiếu: Jain, chương 10; Drozdek, chương 6; Lê Minh Hoàng, phần 2 §6–7.*

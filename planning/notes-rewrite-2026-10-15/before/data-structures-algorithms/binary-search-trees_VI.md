---
title: "Cây tìm kiếm nhị phân: tìm, thêm, xóa mà vẫn giữ thứ tự"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/binary-search-trees"
translationPending: true
series: "DSA cơ bản"
seriesOrder: 16
tags: ["bst", "search-tree", "deletion", "invariant"]
description: "Bất biến BST, ba trường hợp xóa và tác động của chiều cao lên mọi thao tác."
draft: false
---

BST là cây nhị phân có quy tắc: mọi khóa ở cây con trái nhỏ hơn khóa nút, mọi khóa ở cây con phải lớn hơn. Đây là điều kiện cho **toàn bộ cây con**, không chỉ hai con trực tiếp. Với khóa trùng, cần quy ước rõ: đếm số lần trong nút, đặt bằng nhau về một phía, hoặc không cho trùng. Bài này chọn khóa phân biệt.

## 1. Tìm và thêm

Từ gốc, so khóa cần tìm với khóa nút: bằng thì xong; nhỏ hơn đi trái; lớn hơn đi phải. Mỗi bước đi xuống một tầng nên thời gian `O(h)`. Thêm cũng đi theo đường tìm kiếm cho tới con trống rồi gắn nút mới. Bất biến: miền khóa cho phép ngày càng hẹp; mọi nhánh bị bỏ không thể chứa khóa cần tìm. Trên cây cân bằng `h=O(log n)`; trên chuỗi tăng dần chèn vào BST thường, cây thành dây và `h=Θ(n)`. BST thông thường **không tự cân bằng**.





```go
func Contains(root *TreeNode, key int) bool {
    for root != nil {
        if key == root.Value { return true }
        if key < root.Value { root = root.Left } else { root = root.Right }
    }
    return false
}
```

Duyệt inorder cho khóa tăng dần vì ta duyệt mọi khóa nhỏ hơn trước nút, rồi mọi khóa lớn hơn. Tìm predecessor/successor có thể dựa vào đường từ gốc và cây con trái/phải, đều `O(h)`.



```note-visualization
{"id":"bst-search","preset":"normal"}
```



```note-visualization
{"id":"bst-insert","preset":"normal"}
```

## 2. Xóa: ba trường hợp phải nhớ

Nếu nút cần xóa là lá, tháo liên kết từ cha. Nếu có đúng một con, nối cha trực tiếp với con ấy. Nếu có hai con, lấy successor (khóa nhỏ nhất của cây con phải) hoặc predecessor (lớn nhất của cây con trái), chép khóa hoặc chuyển nút vào vị trí cần xóa, rồi xóa vị trí cũ. Successor không có con trái nên bước xóa thứ hai chỉ rơi vào trường hợp lá hoặc một con. Nếu nút bị xóa là gốc, hàm xóa phải trả **gốc mới**; một API chỉ sửa con trỏ cục bộ dễ làm mất cây.



Lập luận đúng đắn của cách dùng successor: mọi khóa bên trái vẫn nhỏ hơn khóa mới; successor là khóa nhỏ nhất bên phải nên mọi khóa còn lại bên phải lớn hơn nó. Nếu nút lưu thêm payload hoặc bộ đếm trùng, phải di chuyển toàn bộ bản ghi tương ứng, không chỉ một trường khóa rồi để dữ liệu lệch nhau.



```note-visualization
{"id":"bst-delete","preset":"normal"}
```

## 3. Thứ tự và giới hạn

BST cho tìm, thêm, xóa, min/max và duyệt tăng dần trong `O(h)` mỗi thao tác tìm/sửa; duyệt toàn bộ `O(n)`. Bảng băm thường nhanh hơn cho truy vấn thành viên kỳ vọng nhưng không cung cấp thứ tự. Nếu cần bảo đảm `O(log n)` cả ở trường hợp xấu, dùng AVL hoặc red-black tree ở topic nâng cao. Nếu dữ liệu gần như chỉ thêm theo thứ tự, đừng giả định BST thường luôn nhanh.

**Tự luyện:** (1) Chèn `5,3,7,6,8`, rồi xóa `7` bằng successor; vẽ cây trước/sau. (2) Xóa gốc của cây một nút. (3) Chứng minh inorder của BST cho dãy tăng bằng quy nạp theo kích thước cây.

*Đối chiếu: Jain, chương 10; Drozdek, chương 6; Lê Minh Hoàng, phần 2 §9.*

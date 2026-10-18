---
title: "Cây tìm kiếm nhị phân: tìm, thêm, xóa mà vẫn giữ thứ tự"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/binary-search-trees"
series: "DSA cơ bản"
seriesOrder: 16
tags: ["bst", "search-tree", "deletion", "invariant"]
description: "Bất biến BST, ba trường hợp xóa và tác động của chiều cao lên mọi thao tác."
draft: false
updated: 2026-10-15
---

Một cây nhị phân chưa tự cho phép tìm kiếm nhanh. Để so một khóa với gốc rồi bỏ cả cây con, ta cần một quy tắc đúng với **mọi hậu duệ**: khóa bên trái nhỏ hơn khóa gốc, bên phải lớn hơn. Đó là bất biến của binary search tree, BST.

Bài này dùng khóa phân biệt. Nếu cho trùng, cần quyết định tăng bộ đếm, giữ một danh sách payload, đưa bằng nhau về một phía hoặc từ chối; quy tắc ấy sẽ ảnh hưởng tìm và xóa. Không trộn các chính sách giữa các thao tác.

## Mỗi bước tìm loại một miền khóa

Cho gốc 5, trái 3, phải 7; 7 có con 6 và 8. Tìm 6: so với 5 rồi sang phải vì mọi khóa trái nhỏ hơn 5; so với 7 rồi sang trái vì mọi khóa phải của 7 lớn hơn 7; gặp 6 thì thành công. Nếu đi đến nil, đường được bất biến cho phép đã hết nên khóa không tồn tại.

Hàm Go sau dùng kiểu `TreeNode` với Value, Left, Right đã định nghĩa trong [bài cây và phép duyệt](/vi/notes/data-structures-algorithms/trees-and-traversals/). Khai báo hàm ở phạm vi package, không cần import:

```go
func Contains(root *TreeNode, key int) bool {
    for root != nil {
        if key == root.Value { return true }
        if key < root.Value { root = root.Left } else { root = root.Right }
    }
    return false
}
```

Bất biến của vòng là nếu khóa có trong cây ban đầu, nó nằm trong cây con tại root hiện tại. So sánh chỉ chọn nhánh được phép theo miền khóa, nên không bỏ mất nó. Mỗi lượt xuống một tầng; thời gian O(h), phụ O(1) cho phiên bản lặp, với h là chiều cao theo bậc của đường đi.

```note-visualization
{"id":"bst-search","preset":"normal"}
```

Khi thêm, cũng đi theo đường tìm cho tới liên kết nil rồi gắn node mới. Miền hợp lệ của node mới là giao các điều kiện từ mọi tổ tiên. Chỉ kiểm tra quan hệ với cha chưa đủ: gốc 10, con trái 5, con phải của 5 là 12 vi phạm BST dù 12>5 đúng tại cạnh cuối.

```note-visualization
{"id":"bst-insert","preset":"normal"}
```

Chèn 1,2,3,4 theo thứ tự vào BST thường tạo dây nghiêng phải; h=n-1 và thao tác có thể Θ(n). Cây không tự cân bằng vì node có hai ô con. Khi tương đối cân bằng h=O(log n), cùng thuật toán tìm/thêm mới có chi phí logarithmic. Không chuyển kết luận có điều kiện ấy thành lời hứa của mọi BST.

## Thứ tự inorder đến từ toàn cây con

Duyệt cây trái, node, cây phải. Theo quy nạp, hai cây con đã được inorder theo thứ tự tăng. Mọi khóa trái nhỏ hơn node, mọi khóa phải lớn hơn node, nên nối ba phần cho dãy tăng toàn cục. Duyệt hết O(n), dù một thao tác tìm chỉ đi O(h) node.

Minimum đi trái đến hết, maximum đi phải đến hết. Successor của node có cây phải là minimum của cây phải. Nếu không có cây phải, cần tổ tiên gần nhất mà node nằm trong nhánh trái của tổ tiên đó; có thể giữ ứng viên trên đường tìm từ gốc. Predecessor đối xứng. Các cách này O(h), không nhất thiết phải inorder toàn cây để lấy một khóa kế tiếp.

## Xóa lá hoặc node một con chỉ đổi đường vào

Lá không có hậu duệ, nên tháo liên kết từ cha là đủ. Node chỉ có một con được thay bởi chính cây con đó. Mọi khóa của cây con vẫn thuộc miền đã được node cũ cho phép từ tổ tiên, nên nối lên cha không phá thứ tự.

Nếu node là gốc, không có cha để sửa field. Hàm xóa phải trả gốc mới hoặc nhận cách truy cập biến gốc của caller. Với cây một node, kết quả là nil; sửa một tham số pointer cục bộ thành nil không tự đổi biến gốc ở caller.

## Hai con: thay bằng khóa sát nhất trong một phía

Xóa 7 trong cây ví dụ: successor là 8, minimum ở cây phải của 7. Thay bản ghi của 7 bằng bản ghi 8, rồi xóa node 8 cũ. Kết quả gốc 5, trái 3, phải 8 với con trái 6. Successor không thể có con trái; nếu có, nó chưa là minimum. Vì vậy lần xóa vị trí cũ chỉ rơi vào lá hoặc một con.

```note-visualization
{"id":"bst-delete","preset":"normal"}
```

Vì sao dùng 8 được? Mọi khóa trái của node cũ nhỏ hơn 7 nên cũng nhỏ hơn 8. Trong cây phải, 8 là minimum và được lấy đi ở vị trí cũ; mọi khóa còn lại lớn hơn 8. Hai phía do đó giữ đúng quan hệ với khóa thay thế. Dùng predecessor, maximum của cây trái, cho chứng minh đối xứng.

Nếu node lưu key cùng payload, phải di chuyển bản ghi tương ứng, không thay mỗi key rồi giữ payload của khóa khác. Nếu ứng dụng giữ handle tới node, “chép nội dung” và “chuyển node vật lý” có hệ quả khác: handle có thể vẫn trỏ cùng node nhưng nội dung đổi. API cần lựa chọn phù hợp với quyền sở hữu và cách định danh.

## Chi phí và lựa chọn có thứ tự

Tìm, thêm, xóa, min/max, predecessor/successor đều theo O(h) cho các thao tác đơn đã mô tả; duyệt toàn bộ O(n). Xóa hai con có thêm đường tìm successor nhưng tổng vẫn O(h), không nhân hai đường thành h².

Hash table phù hợp truy vấn equality kỳ vọng nhưng không cung cấp thứ tự khóa. BST có thứ tự để tìm hàng xóm/range, nhưng bản thường không bảo đảm h. Muốn worst-case O(log n), cần invariant AVL/red-black hoặc cấu trúc cân bằng phù hợp; [bài cây cân bằng](/vi/notes/data-structures-algorithms/balanced-search-trees/) phát triển bước này.

## Tự kiểm tra có lời giải

**1.** Xóa gốc của cây chỉ chứa 5 trả gì? **2.** Vì sao không chọn một khóa bất kỳ trong cây phải làm thay thế? **3.** Inorder tăng có cần cây cân bằng không?

**Giải thích:** Trả nil và caller phải giữ gốc mới. Một khóa bất kỳ không là minimum có thể còn khóa nhỏ hơn nó trong cây phải, phá bất biến tại node thay thế; successor tránh điều đó. Inorder tăng chỉ cần BST đúng, kể cả cây dây. Cân bằng quyết định chiều cao và chi phí đường đi, không quyết định tính đúng của thứ tự inorder.

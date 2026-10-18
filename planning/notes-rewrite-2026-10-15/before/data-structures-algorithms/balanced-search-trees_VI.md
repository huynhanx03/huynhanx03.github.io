---
title: "Cây tìm kiếm cân bằng: AVL, red-black và splay"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/balanced-search-trees"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 6
tags: ["avl", "red-black-tree", "splay-tree", "rotation"]
description: "Ba cách kiểm soát chiều cao BST và vai trò của phép quay."
draft: false
---

BST thường có thể thành một đường thẳng sau dãy chèn đã sắp, làm tìm kiếm `O(n)`. Cây cân bằng thêm bất biến để kiểm soát chiều cao. Phép **quay** đổi cấu trúc cục bộ nhưng giữ thứ tự inorder: với nút `x`, con phải `y` và cây con giữa `B`, quay trái biến `(x, B, y)` thành `y` có con trái `x`, còn `B` chuyển thành con phải của `x`. Vì mọi khóa trong `B` nằm giữa khóa `x` và `y`, bất biến BST được giữ.

## 1. AVL: cân bằng theo chiều cao

Mỗi nút lưu chiều cao; balance factor là `height(left)-height(right)` và phải thuộc `{-1,0,1}`. Sau chèn/xóa, cập nhật chiều cao từ điểm sửa lên gốc. Nếu lệch trái-trái, quay phải; phải-phải, quay trái; trái-phải, quay trái ở con rồi quay phải; phải-trái đối xứng. Chỉ nhìn chiều cao gốc là chưa đủ: cần kiểm tra các tổ tiên bị ảnh hưởng. AVL có chiều cao `O(log n)`, nên tìm/thêm/xóa tệ nhất `O(log n)`; việc xóa có thể cần tái cân bằng ở nhiều mức.





```note-visualization
{"id":"avl-insert","preset":"normal"}
```

## 2. Red-black: cân bằng lỏng hơn

Mỗi nút đỏ hoặc đen; gốc đen, nút đỏ không có con đỏ, và mọi đường từ một nút đến lá nil có cùng số nút đen. Bất biến này giới hạn đường dài nhất không quá hai lần đường ngắn nhất, nên chiều cao `O(log n)`. Chèn nút đỏ rồi xử lý vi phạm bằng đổi màu/quay; xóa cần sửa “thiếu đen” qua nhiều trường hợp. Red-black thường sửa ít hơn AVL trên một số workload, đổi lại cách chứng minh và cài đặt phức tạp hơn. Nil leaf nên được xem như nút đen trong lập luận.





```note-visualization
{"id":"red-black-insert","preset":"normal"}
```

## 3. Splay: đưa nút vừa truy cập lên gốc

Splay tree không lưu màu/chiều cao. Sau tìm, chèn hoặc xóa, nó dùng các bước zig, zig-zig, zig-zag để đưa nút được truy cập lên gốc. Một thao tác riêng lẻ có thể `O(n)` nhưng chi phí **amortized** cho chuỗi thao tác là `O(log n)`; những khóa truy cập gần đây trở nên gần gốc. Đừng trình bày bảo đảm amortized như bảo đảm từng lần. Splay cũng làm thay đổi cây ngay cả khi chỉ tìm, điều này quan trọng nếu nhiều luồng cùng đọc.



| Cấu trúc | Bảo đảm mỗi thao tác | Thông tin phụ |
| --- | --- | --- |
| AVL | `O(log n)` | chiều cao/balance |
| Red-black | `O(log n)` | màu |
| Splay | amortized `O(log n)` | không cần màu/chiều cao |



```note-visualization
{"id":"splay-access","preset":"normal"}
```

**Tự luyện:** (1) Chèn `1,2,3` vào AVL và vẽ quay. (2) Giải thích vì sao “mọi đường có cùng số nút đen” chưa bắt đường dài bằng đường ngắn. (3) Phân biệt worst-case và amortized của splay.

*Đối chiếu: Jain, chương 10; Drozdek, chương 6.*

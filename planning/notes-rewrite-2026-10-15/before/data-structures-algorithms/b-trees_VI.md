---
title: "B-tree và B+ tree: cây nhiều nhánh cho dữ liệu trên trang"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/b-trees"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 7
tags: ["b-tree", "b-plus-tree", "external-memory", "index"]
description: "Vì sao tăng số nhánh giảm I/O và cách split, merge giữ các nút đủ đầy."
draft: false
---

Trong bộ nhớ ngoài, đọc một trang thường đắt hơn so sánh vài khóa trong trang. B-tree lưu **nhiều khóa và nhiều con trong một nút**, thường đặt nút vừa kích thước trang. Với hệ số phân nhánh lớn `B`, chiều cao khoảng `O(log_B n)`, giảm số trang phải đọc so với BST nhị phân. Các quy ước “order”, “degree” giữa sách khác nhau; ở đây dùng **minimum degree** `t>=2`.

## 1. Bất biến B-tree bậc tối thiểu `t`

Mỗi nút không phải gốc có từ `t-1` đến `2t-1` khóa. Nút trong có số con bằng số khóa `+1`; khóa ngăn cách các khoảng khóa của con. Gốc có thể ít hơn nhưng, nếu không rỗng, phải có ít nhất một khóa. Mọi lá ở **cùng độ sâu**. Những điều kiện này cho chiều cao logarithmic: một nút trong tối thiểu có `t` con, nên số nút tăng theo `t^h`.



Tìm kiếm so khóa trong một nút để chọn con, rồi đi xuống; cần `O(log_t n)` trang, nhưng tổng số phép so sánh còn phụ thuộc cách tìm trong từng trang. Khi chèn vào nút đầy (`2t-1` khóa), **split**: khóa giữa lên cha, `t-1` khóa mỗi bên. Một cách cài là tách nút đầy trước khi đi xuống, nên lúc đến lá luôn còn chỗ. Khi xóa, có thể mượn khóa từ anh em hoặc gộp nút để tránh đi vào con chỉ có số khóa tối thiểu; xóa khóa ở nút trong phải thay bằng predecessor/successor hoặc gộp đúng quy tắc.



```note-visualization
{"id":"btree-insert","preset":"normal"}
```

## 2. B+ tree và range scan

B+ tree giữ bản ghi hoặc con trỏ tới bản ghi ở **lá**; nút trong chỉ giữ khóa phân cách. Lá thường nối nhau theo thứ tự, cho phép tìm khóa bắt đầu rồi quét một khoảng bằng các lần đọc trang liên tiếp. Vì nút trong nhỏ hơn, nó có thể chứa nhiều khóa phân cách hơn, làm cây nông hơn. Khóa phân cách có thể lặp lại giữa nút trong và lá; đây không phải dữ liệu bị “nhân đôi sai” mà là vai trò chỉ mục. Chi tiết split/merge và quy tắc chọn khóa phân cách phụ thuộc triển khai.



B-tree/B+ tree thích hợp cho index trên disk hoặc page cache. Với vài trăm phần tử trong RAM, overhead trang và code phức tạp có thể không đáng. Nếu cần concurrency, recovery và persistence, một cây đúng về mặt thuật toán vẫn chưa thành một storage engine: khóa trang, write-ahead log và xử lý crash là vấn đề riêng.



```note-visualization
{"id":"bplus-range","preset":"normal"}
```

**Tự luyện:** (1) Với `t=2`, chèn các khóa `1,2,3,4` và vẽ lần split đầu tiên. (2) Giải thích vì sao tất cả lá cùng độ sâu là quan trọng. (3) So sánh truy vấn một khóa với truy vấn khoảng trên B+ tree.

*Đối chiếu: Jain, chương 10; Drozdek, chương 7.*

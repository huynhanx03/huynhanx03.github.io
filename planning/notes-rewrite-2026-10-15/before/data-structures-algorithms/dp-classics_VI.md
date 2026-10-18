---
title: "Ba mẫu DP kinh điển: LIS, knapsack và edit distance"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/dp-classics"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 4
tags: ["dynamic-programming", "lis", "knapsack", "edit-distance"]
description: "Ba kiểu trạng thái khác nhau và cách tránh lỗi cập nhật bảng."
draft: false
---

Ba bài này đều là DP nhưng không dùng chung một công thức. Hãy đọc từng trạng thái như một câu tiếng Việt chính xác, rồi mới viết chuyển tiếp.

## 1. Longest Increasing Subsequence (LIS)

Đặt `dp[i]` là độ dài dãy con tăng nghiêm ngặt **kết thúc tại** `i`. Khi đó `dp[i]=1+max(dp[j])` trên mọi `j<i` và `a[j]<a[i]`, mặc định `1`; đáp án `max_i dp[i]`. Chi phí `O(n²)` thời gian, `O(n)` bộ nhớ. Điều kiện `<` quyết định “tăng nghiêm ngặt”; nếu cho bằng nhau, đổi thành `<=`.



Cách `O(n log n)` giữ `tails[len-1]` là giá trị kết thúc nhỏ nhất có thể của một dãy tăng độ dài `len`. Với mỗi `x`, tìm bằng lower bound vị trí đầu `>=x`, thay bằng `x`, hoặc nối nếu không có. `tails` **không nhất thiết là một dãy con thật**; độ dài của nó mới là đáp án. Muốn phục hồi dãy, cần lưu chỉ số tiền nhiệm và chỉ số cuối theo từng độ dài. Bất biến “giá trị kết thúc nhỏ nhất” giải thích vì sao thay bằng giá trị nhỏ hơn không phá khả năng nối về sau.



```note-visualization
{"id":"lis-dp","preset":"normal"}
```

## 2. 0/1 knapsack

Mỗi vật `i` có trọng lượng `w_i`, giá trị `v_i`; lấy tối đa một lần, tổng trọng lượng không quá `W`. `dp[i][c]` là giá trị lớn nhất từ `i` vật đầu với sức chứa `c`. Chuyển tiếp là bỏ vật `i` hoặc lấy nó nếu `w_i<=c`: `max(dp[i-1][c], dp[i-1][c-w_i]+v_i)`. Thời gian `O(nW)`, bộ nhớ `O(nW)`; đây là **pseudo-polynomial**, vì `W` được mã hóa bằng `O(log W)` bit.



Nếu nén còn một mảng `dp[c]`, phải duyệt `c` **giảm** từ `W` về `w_i` để không dùng lại cùng vật trong lượt hiện tại. Duyệt tăng sẽ biến bài thành unbounded knapsack. Với unbounded knapsack, được dùng vật nhiều lần nên duyệt tăng lại là chủ ý. Khi vật có trọng lượng 0 và giá trị dương, cần xác định 0/1 hay vô hạn để xử lý đúng.



```note-visualization
{"id":"knapsack-dp","preset":"normal"}
```

## 3. Edit distance

`dp[i][j]` là số thao tác ít nhất biến tiền tố dài `i` của chuỗi A thành tiền tố dài `j` của B, với chèn, xóa, thay thế mỗi thao tác giá 1. Cơ sở `dp[i][0]=i`, `dp[0][j]=j`. Nếu ký tự cuối bằng nhau, lấy `dp[i-1][j-1]`; nếu khác, lấy `1+min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])`. Thời gian `O(mn)`, bộ nhớ `O(mn)` hoặc `O(min(m,n))` nếu chỉ cần khoảng cách. Với tiếng Việt, quyết định so sánh byte, rune hay grapheme trước khi lập bảng.





```note-visualization
{"id":"edit-distance","preset":"normal"}
```

**Tự luyện:** (1) Tính LIS của `[3,1,2,2,4]` theo hai định nghĩa tăng nghiêm ngặt/không giảm. (2) Mô phỏng cập nhật knapsack một hàng và chỉ ra lỗi khi duyệt tăng. (3) Vẽ bảng edit distance cho `cat` → `cut`.

*Đối chiếu: Lê Minh Hoàng, phần 3 §3; Jain, chương 19.*

---
title: "Suffix structures và so khớp gần đúng"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/suffix-approximate"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 20
tags: ["suffix-array", "lcp", "suffix-tree", "approximate-matching"]
description: "Lập chỉ mục mọi hậu tố và tìm mẫu khi cho phép lỗi chỉnh sửa."
draft: false
---

KMP xử lý một mẫu trên một văn bản trong `O(n+m)`, nhưng nếu cùng văn bản nhận rất nhiều mẫu, việc lập chỉ mục có thể đáng giá. Mỗi **suffix** là đoạn từ một vị trí đến cuối văn bản. Suffix array lưu các vị trí bắt đầu suffix theo thứ tự từ điển; LCP lưu độ dài tiền tố chung dài nhất của hai suffix kề nhau trong thứ tự đó.

## 1. Suffix array và LCP

Với `banana`, các suffix theo thứ tự là `a` (5), `ana` (3), `anana` (1), `banana` (0), `na` (4), `nana` (2), nên suffix array là `[5,3,1,0,4,2]`. Một mẫu là tiền tố của một khoảng **liên tiếp** trong suffix array. Ta có thể binary search biên trái/phải của khoảng ấy; cách so sánh ngây thơ mất `O(m)` mỗi lần, cho `O(m log n)` truy vấn sau khi đã có chỉ mục. Có thuật toán xây suffix array `O(n log n)` hoặc tốt hơn; cách đơn giản sort mọi chuỗi suffix bằng so sánh trực tiếp có thể đắt tới `O(n² log n)` vì mỗi so sánh dài `O(n)`.



LCP giúp đo mức lặp, tìm đoạn con lặp dài nhất (giá trị LCP lớn nhất) và tăng tốc một số phép so sánh. Suffix tree là trie nén của mọi suffix; nó hỗ trợ nhiều truy vấn tuyến tính theo độ dài mẫu với xây dựng phù hợp, nhưng overhead con trỏ và cài đặt khó hơn. Suffix automaton là một cấu trúc khác cho các **substring** khác nhau, không nên đồng nhất với suffix tree.



```note-visualization
{"id":"suffix-search","preset":"normal"}
```

## 2. So khớp gần đúng

Khi mẫu được phép tối đa `k` phép chèn/xóa/thay thế, tìm khớp chính xác không đủ. Edit distance giữa hai chuỗi dùng DP `O(mn)` như bài trước. Để tìm **đoạn** văn bản gần mẫu nhất, đổi điều kiện biên `dp[0][j]=0` cho mọi vị trí văn bản `j`: mẫu rỗng có thể bắt đầu ở bất kỳ đâu, còn `dp[i][0]=i`. Các ô `dp[m][j]` cho chi phí khớp mẫu với một đoạn kết thúc ở `j`; nếu cần vị trí bắt đầu, lưu đường truy vết hoặc thông tin nguồn. Giới hạn `k` có thể giúp chỉ tính một dải ô quanh đường chéo khi điểm bắt đầu đã bị giới hạn, nhưng với khớp ở vị trí tùy ý cần thiết kế dải phù hợp.



Nếu “gần đúng” nghĩa là Hamming distance (chỉ thay thế, hai chuỗi cùng độ dài), không được dùng công thức edit distance gồm chèn/xóa vì nó giải bài khác. Với Unicode, phải chọn byte, rune hay grapheme trước khi định nghĩa một lỗi.



```note-visualization
{"id":"approximate-matching","preset":"normal"}
```

**Tự luyện:** (1) Viết suffix array của `aba`. (2) Dùng LCP tìm đoạn lặp của `banana`. (3) Phân biệt Hamming và edit distance cho `ab` với `ba`.

*Đối chiếu: Drozdek, chương 13; Jain, chương 14.*

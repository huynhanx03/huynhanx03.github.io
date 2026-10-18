---
title: "Nim và Sprague–Grundy: biến trò chơi thành trạng thái thắng thua"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/nim-sprague-grundy"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 35
tags: ["game-theory", "nim", "sprague-grundy", "mex"]
description: "Phân tích trò chơi hai người hoàn hảo, quy tắc chơi bình thường và xor Grundy."
draft: false
---

Xét trò chơi hai người luân phiên, không ngẫu nhiên, cả hai thấy toàn bộ trạng thái, và ai **không còn nước đi thì thua** (normal play). Với một trạng thái, nếu có nước tới trạng thái thua của đối thủ thì nó là trạng thái thắng; nếu mọi nước đều dẫn tới trạng thái thắng của đối thủ thì nó là trạng thái thua. Đây là DP trên đồ thị trạng thái không chu trình. Nếu luật có hòa/chu trình hoặc “ai đi cuối thua”, công thức này cần đổi.

## 1. Nim: nhiều đống sỏi

Có nhiều đống, mỗi lượt chọn **một** đống và lấy ít nhất một viên. Gọi kích thước là `a1,...,ak`; đặt `x=a1 xor ... xor ak`. Nếu `x=0`, người sắp đi thua khi cả hai chơi tối ưu; nếu `x!=0`, họ có nước đi đưa xor về 0. Tại sao? Khi `x=0`, đổi một đống từ `a` xuống `b<a` làm xor mới `a xor b`, không thể bằng 0. Khi `x!=0`, chọn bit cao nhất đang bật trong `x`; ít nhất một đống `a` có bit ấy, đặt `b=a xor x`, khi đó `b<a` và xor toàn bộ trở thành 0.





```go
func NimWinning(piles []uint64) bool {
    var x uint64
    for _, pile := range piles { x ^= pile }
    return x != 0
}
```

Thời gian `O(k)`, bộ nhớ `O(1)`. Mọi đống rỗng cho xor 0 và người đầu không có nước đi nên thua, đúng theo quy tắc trên. Đừng áp dụng công thức Nim cho luật chỉ được lấy 1 hoặc 2 viên; trò chơi đó có tập nước khác.



```note-visualization
{"id":"nim-xor","preset":"normal"}
```



```note-visualization
{"id":"nim-winning-move","preset":"normal"}
```

## 2. Grundy: tổng quát hóa một đống Nim

Với trạng thái `s`, định nghĩa `g(s)=mex{g(t) | s có nước đi tới t}`, với `mex` là số nguyên không âm nhỏ nhất **không nằm trong tập**. Trạng thái không có nước đi có `g=0`. Trạng thái thắng khi và chỉ khi `g(s)!=0`. Định lý Sprague–Grundy nói rằng tổng của các trò chơi con **độc lập** có Grundy bằng xor Grundy từng trò, giống các đống Nim. “Độc lập” nghĩa là một lượt chỉ thay đổi một trò con và luật kết thúc bình thường; nếu một nước có thể đồng thời sửa hai trò, không thể xor tùy tiện.



Ví dụ một đống chỉ được lấy 1 hoặc 2 viên: `g(0)=0`, `g(1)=mex{0}=1`, `g(2)=mex{1,0}=2`, `g(3)=mex{2,1}=0`; mẫu lặp theo `n mod 3`. Với nhiều đống cùng luật, xor các giá trị này. Nếu trạng thái nhiều hoặc có chuyển tiếp trùng, memoization tránh tính lại; số trạng thái hữu hạn là điều kiện cần cho cách DP trực tiếp.



```note-visualization
{"id":"grundy-mex","preset":"normal"}
```

**Tự luyện:** (1) Tìm nước thắng cho Nim `[3,4,5]`. (2) Tính `g(0..6)` của trò lấy 1 hoặc 2. (3) Nêu một luật làm các trò con không còn độc lập.

*Đọc thêm: [VNOI — Nim và Sprague–Grundy](https://wiki.vnoi.info/algo/math/game-theory.md).*

---
title: "Tổ hợp và bao hàm–loại trừ: đếm mà không liệt kê"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/combinatorics-inclusion-exclusion"
translationPending: true
series: "Toán cho thuật toán"
seriesOrder: 7
tags: ["combinatorics", "permutation", "combination", "inclusion-exclusion"]
description: "Quy tắc cộng/nhân, hoán vị/tổ hợp và cách sửa đếm trùng bằng dấu xen kẽ."
draft: false
---

Đếm số nghiệm mà liệt kê từng nghiệm có thể là `O(2^n)` hoặc `O(n!)`. Tổ hợp giúp tìm **công thức** khi các lựa chọn có cấu trúc. Bước quan trọng là xác định các trường hợp có rời nhau không và thứ tự có quan trọng không. Quy tắc cộng áp dụng cho các trường hợp rời nhau; quy tắc nhân áp dụng khi thực hiện tuần tự các lựa chọn và số cách của bước sau đã được xác định theo bước trước.

## 1. Hoán vị, chỉnh hợp, tổ hợp

Sắp `n` vật phân biệt có `n!` cách. Chọn **có thứ tự** `k` vật trong `n` có `n!/(n-k)!` cách. Chọn **không thứ tự** có `C(n,k)=n!/(k!(n-k)!)`. Công thức này vì mỗi nhóm `k` vật xuất hiện `k!` lần trong các dãy có thứ tự. Với `n=5,k=2`, có 20 cặp có thứ tự nhưng 10 cặp không thứ tự.





Nếu vật trùng loại, `n!` đếm thừa. Ví dụ các hoán vị khác nhau của `AAB` có `3!/2!=3`. Với `n` vật gồm các nhóm kích thước `a₁,...,a_t`, số hoán vị phân biệt là `n!/(a₁!...a_t!)`. Chọn lặp được/không lặp, vật phân biệt/không phân biệt, hộp có nhãn/không nhãn là những bài khác nhau; đừng áp một công thức quen thuộc trước khi xác định mô hình.



```note-visualization
{"id":"permutations-count","preset":"normal"}
```



```note-visualization
{"id":"combinations-count","preset":"normal"}
```

## 2. Bao hàm–loại trừ

Muốn đếm phần tử thỏa **ít nhất một** trong các tính chất `A₁,...,A_k`, cộng kích thước từng tập, trừ giao từng cặp vì bị đếm hai lần, cộng giao từng bộ ba, v.v. Với hai tập: `|A∪B|=|A|+|B|-|A∩B|`. Với `k` tập: `|∪A_i|=Σ_{∅≠S⊆[k]} (-1)^{|S|+1}|∩_{i∈S}A_i|`. Có `2^k-1` tập con phải xét nếu dùng công thức trực tiếp, nên kỹ thuật này phù hợp khi `k` nhỏ hoặc các giao có công thức gọn.



Ví dụ đếm số từ 1 đến 100 chia hết cho 2 **hoặc** 3: `⌊100/2⌋+⌊100/3⌋-⌊100/6⌋=50+33-16=67`. Muốn đếm số **không** chia hết cho số nào trong các số nguyên tố `p_i`, lấy tổng số rồi trừ hợp các tập bội. Khi tính giao “chia hết cho tất cả `p_i` trong S”, dùng bội của `lcm` các số trong S, không nhất thiết là tích nếu chúng không nguyên tố cùng nhau.



```note-visualization
{"id":"inclusion-exclusion","preset":"normal"}
```

## 3. Kết hợp với DP

Một số bài tổ hợp có công thức đóng; nhiều bài khác cần truy hồi. `C(n,k)=C(n-1,k-1)+C(n-1,k)` vì phần tử cuối hoặc được chọn hoặc không, hai trường hợp rời nhau. Công thức Pascal cho DP `O(nk)` thời gian, có thể dùng khi modulo hợp số làm công thức nghịch đảo khó. Tính modulo vẫn phải cẩn thận với tràn trung gian.

**Tự luyện:** (1) Đếm chuỗi 4 bit có ít nhất một bit 1. (2) Đếm số nguyên 1..60 không chia hết cho 2 hoặc 3. (3) Giải thích vì sao `AAB` chỉ có 3 hoán vị khác nhau.

*Đọc thêm: [VNOI — bao hàm–loại trừ](https://wiki.vnoi.info/algo/algebra/pie), [VNOI — danh mục tổ hợp](https://wiki.vnoi.info/vi/articles).*

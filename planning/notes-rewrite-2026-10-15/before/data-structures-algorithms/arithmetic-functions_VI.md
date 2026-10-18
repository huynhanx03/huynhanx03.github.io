---
title: "Số học thuật toán IV: phi Euler, Möbius và hàm nhân tính"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/arithmetic-functions"
translationPending: true
series: "Toán cho thuật toán"
seriesOrder: 4
tags: ["number-theory", "euler-phi", "mobius", "multiplicative-function"]
description: "Ba cách nhìn vào cấu trúc thừa số nguyên tố và ứng dụng đếm số nguyên tố cùng nhau."
draft: false
---

Một **hàm số học** gán giá trị cho mỗi số nguyên dương. Hàm `f` là **nhân tính** nếu `f(ab)=f(a)f(b)` khi `gcd(a,b)=1`; điều kiện nguyên tố cùng nhau là thiết yếu. Nhờ phân tích nguyên tố, ta chỉ cần biết `f(p^k)` để tính `f(n)`. Số ước `d(n)` và tổng ước `σ(n)` là ví dụ. Bài này đi sâu vào `φ` và `μ`.

## 1. Phi Euler

`φ(n)` là số `x` trong `[1,n]` nguyên tố cùng nhau với `n`. Nếu `n=∏p_i^{a_i}`, thì `φ(n)=n∏_{p_i|n}(1-1/p_i)`. Lập luận bằng bao hàm–loại trừ: bỏ các số chia hết cho ít nhất một nguyên tố `p_i`; các nguyên tố khác nhau độc lập theo mật độ trên một chu kỳ đủ dài. Tính bằng số nguyên an toàn hơn: bắt đầu `result=n`, với mỗi **nguyên tố phân biệt** `p` chia `n`, đặt `result=result/p*(p-1)`. Ví dụ `φ(12)=12/2·1/3·2=4`, các số là `1,5,7,11`.



Định lý Euler: nếu `gcd(a,n)=1` thì `a^{φ(n)}≡1 (mod n)`. Vì vậy `a^{φ(n)-1}` có thể là nghịch đảo của `a` modulo `n`, nhưng tính `φ(n)` thường đòi hỏi phân tích thừa số; Extended Euclid hay hơn cho một nghịch đảo. Nếu `a` không nguyên tố cùng nhau với `n`, không được dùng định lý này.



```note-visualization
{"id":"totient","preset":"normal"}
```

## 2. Hàm Möbius

`μ(1)=1`. Nếu `n` chia hết cho bình phương của một nguyên tố, `μ(n)=0`. Nếu `n` là tích của `k` nguyên tố **phân biệt**, `μ(n)=(-1)^k`. Ví dụ `μ(6)=1`, `μ(12)=0`, `μ(30)=-1`. Tính chất trung tâm là `Σ_{d|n} μ(d)=1` khi `n=1`, và bằng 0 khi `n>1`. Với `n` có `k` nguyên tố phân biệt, tổng này chính là `(1-1)^k` sau khi bỏ mọi ước chứa bình phương.



Từ đó có Möbius inversion: nếu `F(n)=Σ_{d|n} f(d)`, thì `f(n)=Σ_{d|n} μ(d)F(n/d)`. Nó “gỡ” một phép cộng trên các ước, hữu ích cho đếm cặp nguyên tố cùng nhau hoặc đếm chu kỳ nguyên thủy. Chẳng hạn số cặp `1<=a<=A`, `1<=b<=B` với `gcd(a,b)=1` bằng `Σ_{d=1}^{min(A,B)} μ(d)⌊A/d⌋⌊B/d⌋`; dấu cộng/trừ của `μ` chính là bao hàm–loại trừ theo các ước chung.

Một ví dụ tính được bằng tay: `Σ_{d|n}φ(d)=n`. Với `n=6`, các ước `1,2,3,6` có phi lần lượt `1,1,2,2`, tổng bằng 6. Đảo công thức bằng Möbius cho `φ(6)=μ(1)·6+μ(2)·3+μ(3)·2+μ(6)·1=6-3-2+1=2`. Cách này chưa nhanh hơn công thức phân tích thừa số cho một số đơn lẻ; giá trị của nó là biến một tổng trên **mọi ước** thành một công thức có thể tiền xử lý hoặc biến đổi trong những bài đếm lớn.

Sàng tuyến tính có thể tính `φ` và `μ` cho mọi số tới `N` trong `O(N)` với danh sách prime, nếu cần nhiều truy vấn. Một lần tính `φ(n)` từ phân tích thừa số đơn lẻ không cần sàng cả miền lớn.



```note-visualization
{"id":"mobius","preset":"normal"}
```

**Tự luyện:** (1) Tính `φ(30)` và `μ(30)`. (2) Kiểm tra `Σ_{d|12}μ(d)=0`. (3) Giải thích điều kiện `gcd(a,b)=1` trong định nghĩa hàm nhân tính.

*Đọc thêm: [VNOI — phi Euler](https://wiki.vnoi.info/algo/algebra/phi-ham-euler), [VNOI — hàm nhân tính](https://wiki.vnoi.info/algo/math/multiplicative-function).*

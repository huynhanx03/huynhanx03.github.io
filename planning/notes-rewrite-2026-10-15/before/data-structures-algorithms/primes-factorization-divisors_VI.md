---
title: "Số học thuật toán II: số nguyên tố, phân tích thừa số và ước"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/primes-factorization-divisors"
translationPending: true
series: "Toán cho thuật toán"
seriesOrder: 2
tags: ["number-theory", "sieve", "primality", "factorization", "divisors"]
description: "Từ sàng Eratosthenes đến công thức đếm và cộng các ước của một số."
draft: false
---

Số nguyên tố là số nguyên `p>1` chỉ có ước dương 1 và `p`. Một số `n>1` có phân tích nguyên tố duy nhất `n=∏p_i^{a_i}`. Nhiều bài tưởng phải duyệt mọi ước thực ra chỉ cần biết các số mũ `a_i`. Phải quyết định bài xử lý **một số rất lớn** hay **nhiều số trong miền vừa**: lựa chọn thuật toán khác nhau.

## 1. Sàng và kiểm tra một số

Sàng Eratosthenes tạo bảng nguyên tố tới `N`: bắt đầu `prime[0]=prime[1]=false`, từ mỗi `p` còn nguyên tố với `p*p<=N`, gạch các bội từ `p*p`. Những bội nhỏ hơn đã được gạch bởi ước nhỏ hơn. Thời gian `O(N log log N)`, bộ nhớ `O(N)`. Nếu cần phân tích nhiều số tới `N`, lưu **smallest prime factor** (`spf[x]`); sau đó liên tục chia `x` cho `spf[x]` để lấy thừa số, thời gian gần số lượng thừa số.


```note-visualization
{"id":"eratosthenes","preset":"normal"}
```



```note-visualization
{"id":"spf-factorization","preset":"normal"}
```












Với một số `n`, thử chia `d` từ 2 tới `d*d<=n` cho `O(√n)` phép thử (viết `d<=n/d` nếu sợ tràn `d*d`). Mỗi khi chia được, lặp đến hết để đếm số mũ. Nếu cuối cùng `n>1`, phần dư là một nguyên tố. Đây là cách dễ hiểu và đủ cho `n` vừa; với số 64-bit gần cực đại, `√n` có thể quá lớn. Khi đó Miller–Rabin kiểm tra nguyên tố nhanh bằng lũy thừa modulo; việc chọn số cơ sở để có bảo đảm xác định trên toàn miền 64-bit phải theo bộ cơ sở đã chứng minh. Pollard–Rho có thể tìm thừa số lớn nhưng là chủ đề triển khai chuyên sâu, không nên gọi phép thử chia đơn giản là đủ cho mọi 64-bit.


```note-visualization
{"id":"trial-factorization","preset":"normal"}
```



```note-visualization
{"id":"miller-rabin","preset":"normal"}
```



```note-visualization
{"id":"pollard-rho","preset":"normal"}
```


## 2. Đếm và tổng các ước

Nếu `n=∏p_i^{a_i}`, mỗi ước chọn số mũ từ `0` đến `a_i` độc lập, nên số ước là `d(n)=∏(a_i+1)`. Tổng các ước là `σ(n)=∏(1+p_i+...+p_i^{a_i})`. Với `360=2³·3²·5¹`, số ước là `(3+1)(2+1)(1+1)=24`. Không cần sinh 24 ước để biết con số đó. Tổng có thể tràn ngay cả khi `n` vừa; dùng `math/big` hoặc modulo theo yêu cầu.



Nếu cần **liệt kê** ước, tạo mọi tích `∏p_i^{b_i}` với `0<=b_i<=a_i`, tốn ít nhất `Ω(d(n))` thời gian vì phải xuất từng ước. Có thể duyệt `d=1..√n`, thêm `d` và `n/d` khi chia hết, tránh thêm hai lần khi `d*d=n`.



```note-visualization
{"id":"divisor-count-sum","preset":"normal"}
```

**Tự luyện:** (1) Sàng tới 30, liệt kê các số nguyên tố. (2) Phân tích 756 và tính số ước/tổng ước. (3) Vì sao sàng bắt đầu gạch từ `p*p` thay vì `2p` vẫn đúng?

*Đọc thêm: [VNOI — sàng nguyên tố](https://wiki.vnoi.info/algo/algebra/prime_sieve.md), [VNOI — phân tích thừa số](https://wiki.vnoi.info/algo/math/integer-factorization).*

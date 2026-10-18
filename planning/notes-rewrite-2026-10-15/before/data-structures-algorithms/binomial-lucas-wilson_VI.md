---
title: "Số học thuật toán V: tổ hợp modulo, Lucas và Wilson"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/binomial-lucas-wilson"
translationPending: true
series: "Toán cho thuật toán"
seriesOrder: 5
tags: ["number-theory", "binomial", "factorial-modulo", "lucas", "wilson"]
description: "Tính nCk dưới modulo nguyên tố và hiểu khi công thức giai thừa thường mất hiệu lực."
draft: false
---

`C(n,k)=n!/(k!(n-k)!)` đếm cách chọn `k` phần tử từ `n` phần tử phân biệt. Khi làm việc modulo **nguyên tố** `p`, công thức dùng nghịch đảo chỉ hoạt động trực tiếp nếu mẫu số không chia hết cho `p`. Vì vậy tiền xử lý `fact[i]=i! mod p`, `invFact[i]=(i!)⁻¹ mod p` dùng thuận lợi khi `0<=i<p`. Với nhiều truy vấn `n<p`, tiền xử lý `O(N)` thời gian/bộ nhớ, mỗi truy vấn `O(1)`; tính `invFact[N]=fact[N]^(p-2) mod p`, rồi đi ngược để lấy các giá trị còn lại.

```go
// Giả sử p nguyên tố, 0 <= k <= n < p và bảng đã đủ tới n.
func Choose(n, k int, p int64, fact, invFact []int64) int64 {
    return fact[n] * invFact[k] % p * invFact[n-k] % p
}
```

Các tích trong Go có thể tràn `int64` trước khi `%p` nếu `p` lớn; chọn miền `p` phù hợp hoặc nhân modulo an toàn. Nếu `k<0` hoặc `k>n`, quy ước `C(n,k)=0` trước khi truy cập bảng.

## 1. Khi `n>=p`: Lucas

Nếu `n>=p`, `n! mod p=0`, nên không thể lấy nghịch đảo của nó. **Lucas** tách `n` và `k` thành các chữ số cơ số `p`: `n=n₀+n₁p+...`, `k=k₀+k₁p+...`; khi đó `C(n,k)≡∏ C(nᵢ,kᵢ) (mod p)`. Nếu có chữ số `kᵢ>nᵢ`, đáp án 0. Ví dụ modulo 5, `7=(12)_5` có chữ số cao 1, thấp 2; `2=(02)_5` có chữ số cao 0, thấp 2. Vì vậy `C(7,2)≡C(1,0)C(2,2)=1`, đúng với `21 mod 5=1`. Ngược lại, `6=(11)_5`, `2=(02)_5` có chữ số thấp `2>1`, nên `C(6,2)=15≡0 (mod 5)`. Ghi đúng thứ tự chữ số là một phần của thuật toán.





Lucas cần tính `C(a,b) mod p` cho các chữ số `<p`; nếu `p` rất lớn, không thể luôn cấp mảng giai thừa dài `p`, mà phải chọn cách tính từng truy vấn theo `min(b,a-b)` hoặc thuật toán khác. Với modulus hợp số, Lucas dạng trên không áp dụng trực tiếp; thường xử lý từng lũy thừa nguyên tố rồi ghép CRT.



```note-visualization
{"id":"binomial-pascal","preset":"normal"}
```



```note-visualization
{"id":"lucas","preset":"normal"}
```

## 2. Wilson và giai thừa bỏ bội của `p`

Wilson phát biểu: `p` nguyên tố khi và chỉ khi `(p-1)!≡-1 (mod p)` với `p>1`. Chứng minh chiều nguyên tố bằng cách ghép mỗi phần tử khác 0 với nghịch đảo của nó; chỉ `1` và `p-1` tự nghịch đảo (trường hợp `p=2` vẫn đúng). Đây là tính chất lý thuyết, **không** phải thuật toán kiểm tra nguyên tố hiệu quả cho số lớn vì phải nhân gần `p` số.



Khi tính giai thừa modulo `p` mà cần theo dõi các bội của `p`, tách số mũ `v_p(n!)=Σ_{j>=1}⌊n/p^j⌋` khỏi tích các phần không chia hết cho `p`. Phần còn lại có cấu trúc theo từng khối độ dài `p`, dùng Wilson để tính nhanh hơn trong các bài tổ hợp modulo. Đừng nhầm “`n! mod p=0` khi `n>=p`” với việc mọi biểu thức chứa giai thừa đều bằng 0: trong `C(n,k)`, các nhân tử `p` ở tử và mẫu có thể triệt tiêu ở **số nguyên** trước khi lấy mod.



```note-visualization
{"id":"wilson-factorial","preset":"normal"}
```

**Tự luyện:** (1) Tính `C(6,2) mod 5` bằng Lucas. (2) Tại sao bảng `invFact[p]` không tồn tại? (3) Tính số mũ của 5 trong `100!`.

*Đọc thêm: [VNOI — nCk](https://wiki.vnoi.info/algo/algebra/nCk), [VNOI — Lucas](https://wiki.vnoi.info/translate/he/Lucas-theorem).*

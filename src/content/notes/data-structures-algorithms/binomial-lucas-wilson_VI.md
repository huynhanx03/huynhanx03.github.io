---
title: "Số học thuật toán V: tổ hợp modulo, Lucas và Wilson"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/binomial-lucas-wilson"
series: "Toán cho thuật toán"
seriesOrder: 5
tags: ["number-theory", "binomial", "factorial-modulo", "lucas", "wilson"]
description: "Tính nCk dưới modulo nguyên tố và hiểu khi công thức giai thừa thường mất hiệu lực."
draft: false
updated: 2026-10-15
---

Chọn hai người trong bảy người có 21 cách, nên kết quả modulo 5 bằng 1. Nhưng nếu lập bảng giai thừa tới 7 rồi lấy nghịch đảo modulo 5, ta gặp 5!=0 và không đảo được. Đáp án vẫn tồn tại; điều hỏng là cách biến phép chia số nguyên thành phép chia modulo.

Bài này giả định bạn đã biết tổ hợp, lũy thừa nhị phân và điều kiện tồn tại nghịch đảo. Ta sẽ xác định lúc bảng giai thừa dùng được, rồi chuyển sang Lucas khi n vượt modulus nguyên tố.

## Khi giai thừa còn khả nghịch

Công thức số nguyên là `C(n,k)=n!/(k!(n−k)!)`. Với prime p và 0≤n<p, mọi thừa số 1..n đều khác 0 modulo p nên các giai thừa đảo được. Lập `fact[i]=i! mod p` và `invFact[i]=(i!)⁻¹ mod p`, rồi thay phép chia bằng nhân hai nghịch đảo:

```go
// Giả sử p nguyên tố, 0 <= k <= n < p và bảng đã đủ tới n.
func Choose(n, k int, p int64, fact, invFact []int64) int64 {
    return fact[n] * invFact[k] % p * invFact[n-k] % p
}
```

Hàm là đoạn Go dùng bảng caller đã chuẩn bị, giả định 0≤k≤n<p và bảng đủ tới n. Nếu API nhận k<0 hoặc k>n, hãy trả 0 **trước khi** truy cập mảng. Tích int64 có thể tràn trước `%p`; chọn p trong miền tích an toàn hoặc dùng nhân modulo phù hợp.

Để chuẩn bị tới N<p, tính fact bằng một vòng tăng. Tính `invFact[N]=PowMod(fact[N],p−2,p)` bằng Fermat nhỏ, sau đó đi ngược theo `invFact[i−1]=invFact[i]·i mod p`. Lý do là `i! = (i−1)!·i`, nên nghịch đảo của (i−1)! bằng i nhân nghịch đảo của i!.

Phần điền bảng tốn O(N) thời gian/bộ nhớ, ngoài một lần lũy thừa O(log p); mỗi truy vấn O(1). Không phải tính riêng một lũy thừa cho từng invFact. Khi nói “tiền xử lý O(N)”, cần hiểu bước nghịch đảo ban đầu hoặc tính nó vào `O(N+log p)`.

```note-visualization
{"id":"binomial-pascal","preset":"normal"}
```

## Lucas chia bài lớn thành bài trên từng chữ số

Khi n≥p, n! chứa p nên fact[n]=0 modulo p. Một số C(n,k) vẫn khác 0 vì các thừa số p có thể triệt tiêu trong **phép chia số nguyên** trước khi lấy modulo. Không được lấy nghịch đảo của 0 để giả lập sự triệt tiêu đó.

Viết `n=n₀+n₁p+...`, `k=k₀+k₁p+...`, với mỗi chữ số trong 0..p−1. Lucas cho

`C(n,k)≡∏ C(n_i,k_i) (mod p)`.

Nếu có k_i>n_i, thừa số tương ứng là 0. Với p=5, `7=(12)₅`, `2=(02)₅`, tức chữ số thấp lần lượt 2 và 2. Kết quả `C(1,0)C(2,2)=1`, đúng 21 dư 1. Với `6=(11)₅`, chữ số thấp 1 nhỏ hơn 2, nên C(6,2)=0 modulo 5, đúng 15 dư 0.

```note-visualization
{"id":"lucas","preset":"normal"}
```

Có thể hiểu vì sao chữ số xuất hiện qua đẳng thức đa thức modulo p: `(1+x)^p≡1+x^p`, vì mọi hệ số giữa chia hết cho p. Phân tích số mũ n theo cơ số p biến `(1+x)^n` thành tích các `(1+x^(p^i))^n_i`. Hệ số x^k được chọn theo các chữ số k_i, tạo đúng tích trên. Đây là cơ sở của Lucas, không phải mẹo thao tác biểu diễn số.

Nếu đã có bảng cho mọi chữ số <p, một truy vấn có O(log_p n) thừa số. Nhưng p rất lớn thì bảng dài p không khả thi. Có thể tính từng C(a,b) bằng min(b,a−b) thừa số với nghịch đảo hợp lệ, hoặc chọn thuật toán theo giới hạn. Lucas chỉ giảm kích thước về chữ số, không tự bảo đảm mọi chữ số đều nhỏ theo tài nguyên máy.

Với modulus hợp số, không thay p bằng m trong công thức. Thường phải giải theo lũy thừa prime với cách theo dõi số mũ prime phù hợp rồi ghép CRT; đó là một bước mở rộng, không phải Lucas cơ bản.

## Wilson giải thích tích một khối phần dư

Wilson nói p>1 nguyên tố khi và chỉ khi `(p−1)!≡−1 (mod p)`. Ở chiều prime, ghép mỗi số khác 0 với nghịch đảo của nó. Các cặp đóng góp 1; với p lẻ, chỉ 1 và p−1 tự nghịch đảo vì `(x−1)(x+1)=0` trong trường modulo prime. Tích còn lại bằng −1. Với p=2, cùng kết luận vẫn đúng vì 1≡−1 modulo 2.

Nếu muốn thấy chiều ngược: hợp số n có ước a với 1<a<n. Khi ấy a chia (n−1)!, nên tích không thể đồng dư −1 modulo n vì −1 không chia hết cho a. Wilson là tiêu chuẩn đúng nhưng tính gần p phép nhân không phải cách kiểm tra prime hiệu quả cho số lớn.

```note-visualization
{"id":"wilson-factorial","preset":"normal"}
```

## Tách số mũ p khỏi phần còn lại của giai thừa

Số mũ của p trong n! là `v_p(n!)=⌊n/p⌋+⌊n/p²⌋+...`. Mỗi bội của p đóng góp ít nhất một p, mỗi bội p² đóng góp thêm một, và cứ thế. Với 100! và p=5, có 20+4=24 thừa số 5.

Trong C(n,k), lấy hiệu ba số mũ tương ứng để biết còn bao nhiêu p sau triệt tiêu. Đồng thời giữ tích của các phần còn lại sau khi bỏ **mọi** thừa số p khỏi từng số, không chỉ bỏ hẳn các số chia hết cho p. Những khối phần dư khác 0 có tích liên quan tới Wilson, tạo cơ sở cho thuật toán giai thừa bỏ p và tổ hợp theo lũy thừa prime.

Bài này giải thích vì sao cần tách hai phần, chưa đưa một hàm tổng quát cho prime powers. Đừng kết luận “có n! trong tử và n≥p thì tổ hợp bằng 0”: C(7,2) modulo 5 ở mở đầu là phản ví dụ.

## Tự thử

1. Tính C(6,2) modulo 5 bằng chữ số cơ số 5.
2. Vì sao invFact[p] không tồn tại modulo p?
3. Trong C(10,5), có bao nhiêu thừa số 5 còn lại sau chia số nguyên?

**Đối chiếu:** (1) `(11)₅` chọn `(02)₅` có chữ số thấp không đủ, kết quả 0. (2) p! chứa p, có phần dư 0 và gcd với p khác 1. (3) v₅(10!)=2, mỗi v₅(5!)=1 nên hiệu bằng 0; C(10,5)=252 không chia hết cho 5. Với 100!, riêng số mũ 5 là 24.

## Tài liệu đọc tiếp

[MIT 18.781 — Fermat, Euler, Wilson](https://ocw.mit.edu/courses/18-781-theory-of-numbers-spring-2012/resources/mit18_781s12_lec4/) cho nền tảng đồng dư; [VNOI — Lucas](https://wiki.vnoi.info/translate/he/Lucas-theorem) là tài liệu luyện triển khai. Xem [nghịch đảo và CRT](/vi/notes/data-structures-algorithms/modular-inverse-crt/) trước khi ghép các modulus.

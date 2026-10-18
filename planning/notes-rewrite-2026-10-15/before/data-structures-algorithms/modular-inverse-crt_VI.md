---
title: "Số học thuật toán III: nghịch đảo modulo và định lý thặng dư Trung Hoa"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/modular-inverse-crt"
translationPending: true
series: "Toán cho thuật toán"
seriesOrder: 3
tags: ["number-theory", "modular-inverse", "extended-euclid", "crt"]
description: "Khi nào được chia trong modulo và cách ghép nhiều điều kiện phần dư."
draft: false
---

Trong số học modulo `m`, “chia cho `a`” nghĩa là nhân với một số `a⁻¹` sao cho `a·a⁻¹≡1 (mod m)`. Số này tồn tại **khi và chỉ khi** `gcd(a,m)=1`. Với `m=7`, nghịch đảo của 3 là 5 vì `3·5=15≡1`; với `a=2,m=6`, không có nghịch đảo vì mọi tích `2x` đều chẵn, không thể đồng dư 1 modulo 6.

## 1. Tìm nghịch đảo

Extended Euclid tìm `x,y` sao cho `ax+my=gcd(a,m)`. Nếu gcd bằng 1 thì `ax≡1 (mod m)`, nên `x mod m` là nghịch đảo. Chi phí `O(log m)` phép chia. Khi `m` nguyên tố và `a` không chia hết `m`, định lý Fermat nhỏ cho `a^(m-1)≡1`, nên nghịch đảo là `a^(m-2) mod m`; tính bằng lũy thừa nhị phân. Nếu `m` không nguyên tố, công thức Fermat này không dùng trực tiếp. Muốn giải `a x ≡ b (mod m)` khi `g=gcd(a,m)>1`, chỉ có nghiệm nếu `g` chia `b`; khi ấy chia cả `a,b,m` cho `g` rồi tìm nghiệm theo modulus mới.



```go
// Trả g >= 0 và x,y sao cho a*x+b*y=g.
func ExtendedGCD(a, b int64) (g, x, y int64) {
    if b == 0 {
        if a < 0 { return -a, -1, 0 }
        return a, 1, 0
    }
    g, x1, y1 := ExtendedGCD(b, a%b)
    return g, y1, x1-(a/b)*y1
}

func InverseMod(a, m int64) (int64, bool) {
    if m <= 1 { return 0, false }
    g, x, _ := ExtendedGCD(a, m)
    if g != 1 { return 0, false }
    x %= m
    if x < 0 { x += m }
    return x, true
}
```

Ví dụ `ExtendedGCD(7,26)` cho một hệ số `x` thỏa `7x+26y=1`; chuẩn hóa `x` modulo 26 cho nghịch đảo `15`, vì `7·15=105≡1 (mod 26)`. Trong Go, với đầu vào gần giới hạn `int64`, phép nhân hệ số Bézout có thể tràn; khi cần bảo đảm cho toàn miền 64-bit, dùng `math/big` hoặc giới hạn đầu vào rõ ràng.



```note-visualization
{"id":"modular-inverse","preset":"normal"}
```

## 2. Ghép hai đồng dư

Giả sử `x≡r₁ (mod m₁)` và `x≡r₂ (mod m₂)` với `gcd(m₁,m₂)=1`. Viết `x=r₁+m₁k`; thay vào điều kiện hai: `m₁k≡r₂-r₁ (mod m₂)`. Vì `m₁` có nghịch đảo modulo `m₂`, ta tìm `k`, rồi lấy `x` theo modulo `m₁m₂`. Ví dụ `x≡2 (mod 3)`, `x≡3 (mod 5)`: `x=2+3k`, `3k≡1 (mod 5)`, nghịch đảo của 3 là 2, nên `k≡2`; đáp án `x≡8 (mod 15)`.



Nếu modulus **không nguyên tố cùng nhau**, hệ có nghiệm khi và chỉ khi `r₂-r₁` chia hết cho `g=gcd(m₁,m₂)`. Khi có nghiệm, nghiệm duy nhất theo modulo `lcm(m₁,m₂)`, không phải tích. Ví dụ `x≡1 (mod 4)` và `x≡3 (mod 6)` có nghiệm `x≡9 (mod 12)`; nhưng `x≡1 (mod 4)` và `x≡2 (mod 6)` vô nghiệm vì chênh lệch 1 không chia hết cho gcd 2.

Trong code, tích hai modulus có thể tràn `int64`, và phần dư âm cần chuẩn hóa. Với nhiều điều kiện, ghép từng cặp và dừng ngay khi vô nghiệm. Một lời giải chỉ viết công thức CRT cho các modulus nguyên tố cùng nhau mà không nêu giả định sẽ cho đáp án sai ở trường hợp tổng quát.



```note-visualization
{"id":"crt-merge","preset":"normal"}
```

**Tự luyện:** (1) Tìm nghịch đảo của 7 modulo 26. (2) Giải hệ `x≡1 (mod 4), x≡3 (mod 6)`. (3) Nêu điều kiện để `6x≡9 (mod 15)` có nghiệm.

*Đọc thêm: [VNOI — nghịch đảo modulo](https://wiki.vnoi.info/algo/math/modular-inverse), [VNOI — CRT](https://wiki.vnoi.info/algo/math/crt).*

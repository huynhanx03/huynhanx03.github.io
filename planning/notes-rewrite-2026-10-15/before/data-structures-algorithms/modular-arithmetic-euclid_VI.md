---
title: "Số học thuật toán I: modulo, Euclid và lũy thừa nhị phân"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/modular-arithmetic-euclid"
translationPending: true
series: "Toán cho thuật toán"
seriesOrder: 1
tags: ["number-theory", "modulo", "gcd", "binary-exponentiation"]
description: "Nền tảng tính toán số nguyên: đồng dư, gcd/extended gcd và lũy thừa nhanh."
draft: false
---

Bài toán đếm thường cho kết quả rất lớn nên yêu cầu “lấy modulo `m`”. Khi đó ta chỉ lưu phần dư, nhưng phải giữ đúng quy tắc của **đồng dư**: `a≡b (mod m)` nghĩa là `m` chia hết `a-b`. Cộng và nhân bảo toàn đồng dư; phép chia nói chung **không** bảo toàn nếu mẫu số không có nghịch đảo modulo. Trước khi viết thuật toán, xác định `m>0`, miền số đầu vào và liệu phép nhân trung gian có tràn kiểu máy hay không.

## 1. Chuẩn hóa phần dư

Trong Go, phần dư của số âm có thể âm. Để luôn nhận đại diện trong `[0,m)`, dùng `r := a % m; if r < 0 { r += m }` khi `m>0`. Đừng thay mọi phép trừ bằng `%m` mà quên cộng `m` trước khi dùng làm chỉ số. `(a+b)%m` có thể tràn trước khi lấy mod nếu `a,b` gần giới hạn `int64`; với dữ liệu lớn cần cộng modulo an toàn hoặc kiểu big integer.





```note-visualization
{"id":"normalize-modulo","preset":"normal"}
```

## 2. Ước chung lớn nhất

`gcd(a,b)` là số dương lớn nhất chia hết cả hai. Tính chất `gcd(a,b)=gcd(b,a mod b)` cho thuật toán Euclid. Mỗi bước giảm số dư, thời gian `O(log min(|a|,|b|))` theo số bước số học, bộ nhớ `O(1)` nếu lặp. Quy ước `gcd(0,0)=0`; nếu cần gcd không âm, chuẩn hóa dấu đầu vào. Với `a=30,b=18`: `30 mod 18=12`, `18 mod 12=6`, `12 mod 6=0`, nên gcd bằng 6.


```note-visualization
{"id":"euclid","preset":"normal"}
```






```go
func GCD(a, b int64) int64 {
    for b != 0 { a, b = b, a%b }
    if a < 0 { return -a }
    return a
}
```

Nếu đầu vào có thể là giá trị nhỏ nhất của `int64`, `-a` không biểu diễn được; API production nên dùng miền không âm hoặc xử lý trường hợp ấy riêng. **Extended Euclid** còn tìm `x,y` sao cho `ax+by=gcd(a,b)`. Đây là chìa khóa cho nghịch đảo modulo và giải phương trình đồng dư: khi đi ngược từ `gcd(b,a%b)`, thay số dư bằng `a-qb` để cập nhật hệ số Bézout.


```note-visualization
{"id":"extended-euclid","preset":"normal"}
```


## 3. Lũy thừa nhị phân

Muốn tính `a^e mod m` với `e>=0`, không nhân `e` lần. Viết `e` ở dạng nhị phân; mỗi vòng bình phương cơ số và chỉ nhân vào đáp án khi bit hiện tại bằng 1.



```go
func PowMod(a, e, m int64) int64 {
    result := int64(1 % m)
    a %= m
    if a < 0 { a += m }
    for e > 0 {
        if e&1 == 1 { result = result * a % m }
        a = a * a % m
        e >>= 1
    }
    return result
}
```

Hàm giả sử `m>0`, `e>=0` và các tích `int64` không tràn **trước khi** `%m`; khi modulus lớn, dùng nhân modulo an toàn hoặc `math/big`. Bất biến: `result * a^e` (theo modulo `m`) bằng `a_original^e_original`; mỗi lượt xử lý một bit, nên `O(log e)` phép nhân modulo. Mũ âm chỉ có nghĩa modulo nếu `a` có nghịch đảo và cần xử lý riêng.



```note-visualization
{"id":"binary-power","preset":"normal"}
```

**Tự luyện:** (1) Tính `gcd(252,105)` bằng tay. (2) Tính `3^13 mod 7` bằng các lần bình phương. (3) Cho phản ví dụ “chia hai vế đồng dư cho 2” không hợp lệ.

*Đọc thêm: [VNOI — số học cơ bản](https://wiki.vnoi.info/vi/articles), mục Số học.*

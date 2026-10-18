---
title: "Số học thuật toán I: modulo, Euclid và lũy thừa nhị phân"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/modular-arithmetic-euclid"
series: "Toán cho thuật toán"
seriesOrder: 1
tags: ["number-theory", "modulo", "gcd", "binary-exponentiation"]
description: "Nền tảng tính toán số nguyên: đồng dư, gcd/extended gcd và lũy thừa nhanh."
draft: false
updated: 2026-10-15
---

Một bài đếm yêu cầu trả kết quả modulo 7. Thay vì lưu cả một số khổng lồ, ta chỉ giữ một trong bảy phần dư. Cách làm này hữu ích vì cộng và nhân vẫn cho phần dư đúng khi thực hiện trên các đại diện nhỏ. Tuy nhiên, phép chia không tự đi theo quy tắc ấy: muốn chia, ta phải kiểm tra thêm điều kiện.

Bài này xây ba công cụ thường đi cùng nhau: đồng dư để giữ số nhỏ, Euclid để tìm ước chung và lũy thừa nhị phân để giảm số phép nhân. Bạn cần biết vòng lặp và phép chia số nguyên. Các hàm Go là khai báo độc lập; chưa bao gồm phần đọc input hay chương trình `main`.

## Phần dư là đại diện của một lớp số

Viết `a≡b (mod m)` nghĩa là `m` chia hết `a-b`, với `m>0`. Chẳng hạn `17≡3 (mod 7)` vì chênh lệch 14 chia hết cho 7. Dù thay 17 bằng 3, phần dư của tổng hoặc tích với số khác vẫn được giữ: cộng hay nhân chênh lệch vốn là bội của 7 vẫn cho một bội của 7.

Nhờ đó có thể lấy modulo sau mỗi bước của một tổng/tích dài. Nhưng phải tính được phép cộng hoặc nhân trung gian trước. Nếu `a+b` hay `a*b` tràn `int64`, phép `%m` sau đó không sửa lại kết quả toán học đã mất. Modulus và miền giá trị là một phần của hợp đồng thuật toán, không chỉ là lựa chọn kiểu dữ liệu lúc cuối.

Trong Go, `%` là phép lấy số dư và số dư âm có thể xuất hiện. Ví dụ `-3%7=-3`; đại diện tương ứng trong `[0,7)` là 4. Để chuẩn hóa khi `m>0`, tính `r := a % m`, rồi nếu `r<0` thì `r+=m`. Sau bước đầu, r nằm giữa `-(m-1)` và `m-1`, nên chỉ cần cộng m một lần. Cách này cũng tránh việc cộng m vào a rất lớn trước khi lấy dư.

```note-visualization
{"id":"normalize-modulo","preset":"normal"}
```

Nếu dùng phần dư làm index mảng, phải chuẩn hóa trước. Với phép cộng hai đại diện gần giới hạn kiểu máy, vẫn cần cộng modulo an toàn hoặc `math/big`; “đã lấy modulo đầu vào” chưa đủ bảo đảm tổng hoặc tích nằm trong miền kiểu.

## Vì sao Euclid có thể bỏ bớt một số mà không mất gcd?

Ước chung của a và b cũng chia `a-qb`, tức số dư khi chia a cho b. Ngược lại, ước chung của b và số dư cũng chia a. Hai cặp có cùng tập ước chung, nên `gcd(a,b)=gcd(b,a%b)`.

Theo dõi `30,18`: thay bằng `18,12`, rồi `12,6`, rồi `6,0`. Khi số thứ hai bằng 0, mọi ước của số thứ nhất đều chia 0, nên gcd chính là trị tuyệt đối của số thứ nhất. Ta không phải thử lần lượt các ước.

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

Hàm chọn gcd không âm và cho `gcd(0,0)=0` theo quy ước. Với đầu vào âm, vòng lặp vẫn dựa trên cùng đẳng thức chia dư, rồi chuẩn hóa dấu ở kết quả. Tuy nhiên, trị tuyệt đối của giá trị nhỏ nhất `int64` không biểu diễn được bằng `int64`. API cần giới hạn miền, dùng kiểu không âm phù hợp hoặc xử lý riêng trường hợp ấy; dòng `return -a` không giải được toàn miền signed 64-bit.

Số dư giảm dần nên thuật toán dừng. Mạnh hơn, sau một số bước hằng số, kích thước số nhỏ giảm ít nhất một nửa; vì vậy có `O(log min(|a|,|b|))` bước khi cả hai khác 0. Bản lặp dùng `O(1)` bộ nhớ. Đây là số bước số học; nếu số có hàng nghìn bit, chi phí mỗi phép chia còn phụ thuộc độ dài bit.

## Giữ lại các hệ số: Extended Euclid

Ta còn có thể hỏi: gcd có viết thành `ax+by` được không? Với 30 và 18, từ `6=18-12` và `12=30-18`, suy ra `6=-30+2·18`. Đây là một cặp hệ số Bézout `x=-1,y=2`.

Extended Euclid giữ các hệ số ấy khi đi ngược các bước chia dư. Nếu lời gọi nhỏ trả `b·x₁+(a-qb)·y₁=g`, gom hệ số thành `a·y₁+b·(x₁-qy₁)=g`. Vì vậy hệ số mới là `x=y₁,y=x₁-qy₁`. Phần [nghịch đảo và CRT](/vi/notes/data-structures-algorithms/modular-inverse-crt/) dùng đúng đẳng thức này để tìm phép “chia” hợp lệ trong modulo.

```note-visualization
{"id":"extended-euclid","preset":"normal"}
```

## Tính lũy thừa bằng cách đọc từng bit của số mũ

Muốn tính `3^13 mod 7`, không cần nhân 3 mười ba lần. Vì `13=8+4+1`, chỉ cần các cơ số bình phương liên tiếp: `3,3²,3⁴,3⁸`. Theo modulo 7, chúng là `3,2,4,2`; nhân những mức có bit 1 được `3·4·2≡3`.

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

Trước vòng lặp, result là 1 theo modulo m. Mỗi bước xét bit thấp của e. Nếu bit ấy bằng 1, chuyển một thừa số a sang result; sau đó bình phương a và chia đôi e. Bất biến là `result·a^e ≡ a_ban_đầu^e_ban_đầu (mod m)`. Với e chẵn, chỉ thay `a^e` bằng `(a²)^(e/2)`; với e lẻ, tách thêm một a trước khi làm vậy. Khi e về 0, result là đáp án.

Hàm yêu cầu `m>0`, `e>=0` và mọi phép nhân `int64` trung gian không tràn. Nếu modulus lớn, cần nhân modulo an toàn hoặc `math/big`. Mũ 0 trả `1 mod m`, nên với m=1 kết quả là 0. Mũ âm đòi hỏi nghịch đảo của a và phải xử lý riêng, không thể truyền thẳng vào vòng lặp này.

```note-visualization
{"id":"binary-power","preset":"normal"}
```

Có một lượt cho mỗi bit, nên với e dương thời gian là `O(log e)` phép nhân modulo, bộ nhớ `O(1)`. Với e=0, công việc là hằng số. Đây là lý do lũy thừa nhanh xuất hiện trong kiểm tra nguyên tố, nghịch đảo và nhiều bài số học sau đó.

## Tự thử rồi đối chiếu

1. Tính `gcd(252,105)` bằng Euclid, rồi viết gcd thành tổ hợp hai số.
2. Vì sao `3^13 mod 7` bằng 3? Số 13 có những bit nào bật?
3. Từ `2≡8 (mod 6)`, chia hai vế cho 2 để nhận `1≡4 (mod 6)` có hợp lệ không?

**Giải thích:** (1) `252=2·105+42`, `105=2·42+21`, `42=2·21`; gcd là 21 và `21=5·105-2·252`. (2) Các bit 0,2,3 bật, chọn các lũy thừa 1,4,8; tích phần dư là 24, dư 3. (3) Không: 1 và 4 chênh 3, không phải bội 6. Sau khi chia phải đổi modulus phù hợp hoặc dùng nghịch đảo khi tồn tại; 2 không có nghịch đảo modulo 6.

## Tài liệu đọc tiếp

[MIT 18.781 — lecture notes](https://ocw.mit.edu/courses/18-781-theory-of-numbers-spring-2012/pages/lecture-notes/) có các bài giảng về divisibility, Euclid và congruences. Bài [nghịch đảo và CRT](/vi/notes/data-structures-algorithms/modular-inverse-crt/) nối hệ số Bézout với phép chia và ghép phần dư.

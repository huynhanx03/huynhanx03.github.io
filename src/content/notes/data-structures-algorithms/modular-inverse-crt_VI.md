---
title: "Số học thuật toán III: nghịch đảo modulo và định lý thặng dư Trung Hoa"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/modular-inverse-crt"
series: "Toán cho thuật toán"
seriesOrder: 3
tags: ["number-theory", "modular-inverse", "extended-euclid", "crt"]
description: "Khi nào được chia trong modulo và cách ghép nhiều điều kiện phần dư."
draft: false
updated: 2026-10-15
---

Để giải `3x≡1 (mod 7)`, ta có thể thử các phần dư và thấy x=5. Nhưng với modulus lớn, thử từng số không còn hợp lý. Extended Euclid cho một cách trực tiếp; cùng công cụ ấy còn ghép được thông tin kiểu “chia 3 dư 2, chia 5 dư 3”.

Bài này tiếp nối [modulo và Euclid](/vi/notes/data-structures-algorithms/modular-arithmetic-euclid/). Ta xét modulus lớn hơn 1, chuẩn hóa nghiệm về miền phần dư không âm và tách rõ trường hợp có nghịch đảo với trường hợp chỉ có một phương trình đồng dư giải được.

## Phép chia modulo phải có một phần tử đảo được

Nghịch đảo của a modulo m là số x thỏa `ax≡1 (mod m)`. Với a=3,m=7, x=5 vì 15 dư 1. Với a=2,m=6 thì không: mọi `2x` đều chẵn, không thể chênh 1 một bội của 6.

Điều kiện chính xác là `gcd(a,m)=1`. Nếu tồn tại ax−1 là bội m thì có `ax+my=1`, nên mọi ước chung của a,m phải chia 1. Ngược lại, khi gcd bằng 1, đẳng thức Bézout từ Extended Euclid cung cấp đúng x,y như vậy. Lập luận hai chiều vừa cho tiêu chuẩn tồn tại, vừa cho thuật toán tìm nghiệm.

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

Hai hàm là khai báo Go độc lập. ExtendedGCD trả hệ số, còn InverseMod từ chối m≤1 hoặc gcd khác 1 rồi chuẩn hóa hệ số x. Phép gán đệ quy dùng đẳng thức `a%b=a-(a/b)b`: nếu lời gọi nhỏ có hệ số x₁,y₁ thì hệ số mới là y₁ và x₁−(a/b)y₁. Không cần tự thử các phần dư.

Với 7 và 26, truy vết Euclid cho `1=3·26−11·7`. Vậy hệ số của 7 là −11, chuẩn hóa modulo 26 thành 15; `7·15=105≡1`. Các phép chia cần `O(log m)` bước khi a đã chuẩn hóa. Hệ số và tích cập nhật có thể tràn với đầu vào sát giới hạn int64, cũng như trị tuyệt đối của MinInt64; muốn hỗ trợ toàn miền phải dùng math/big hoặc hợp đồng đầu vào chặt hơn.

```note-visualization
{"id":"modular-inverse","preset":"normal"}
```

Khi m là nguyên tố và a không chia hết cho m, Fermat nhỏ cho `a^(m−1)≡1`, nên `a^(m−2)` là nghịch đảo. Tính nó bằng lũy thừa nhị phân. Điều kiện nguyên tố không thể bỏ: với modulus hợp số, cứ nâng m−2 không cho công thức chung. Extended Euclid không cần giả định nguyên tố nên thường là lựa chọn gọn cho một nghịch đảo đơn lẻ.

## Không có nghịch đảo vẫn có thể giải ax≡b

Nếu `g=gcd(a,m)>1`, phương trình có nghiệm khi và chỉ khi g chia b. Điều kiện cần xuất phát từ `ax−b=km`: g chia cả ax và km thì phải chia b. Khi g chia b, chia **cả a,b,m** cho g được phương trình có hệ số a/g khả nghịch modulo m/g.

Ví dụ `6x≡9 (mod 15)`: g=3 chia 9, nên giải `2x≡3 (mod 5)`. Nghịch đảo của 2 là 3, cho x≡4 modulo 5. Trên miền 0..14 có ba nghiệm 4,9,14. Như vậy “2 không đảo được trong modulo 6” và “một phương trình có hệ số không đảo được vẫn có nghiệm” không hề mâu thuẫn; đích b khác nhau và modulus sau rút gọn cũng khác.

## Ghép hai điều kiện bằng một ẩn phụ

Xét `x≡2 (mod 3)` và `x≡3 (mod 5)`. Điều kiện đầu cho `x=2+3k`. Thay vào điều kiện hai: `3k≡1 (mod 5)`. Nhân nghịch đảo 2 của 3, ta được k≡2 và x≡8 modulo 15. Kiểm tra 8 chia 3 dư 2, chia 5 dư 3.

Với hai modulus nguyên tố cùng nhau, thay các con số bằng r₁,m₁,r₂,m₂ vẫn làm được như vậy: giải `m₁k≡r₂−r₁ (mod m₂)`, rồi lấy `r₁+m₁k`. Nếu hai nghiệm thỏa cả hai đồng dư thì hiệu chia hết cho m₁ và m₂, nên chia hết cho tích; vì thế nghiệm duy nhất theo modulo m₁m₂.

```note-visualization
{"id":"crt-merge","preset":"normal"}
```

### Modulus có ước chung: kiểm tra tương thích trước

Cùng cách đặt ẩn vẫn đúng, nhưng m₁ chưa chắc có nghịch đảo modulo m₂. Áp dụng phần phương trình tuyến tính vừa học: đặt g=gcd(m₁,m₂), hệ có nghiệm khi và chỉ khi g chia `r₂−r₁`. Khi có, giải

`(m₁/g)k ≡ (r₂−r₁)/g (mod m₂/g)`.

Nghiệm ghép được xác định theo `lcm(m₁,m₂)=m₁·(m₂/g)`, không phải luôn theo tích. Với `x≡1 (mod 4), x≡3 (mod 6)`, ta có `4k≡2 (mod 6)`, rút thành `2k≡1 (mod 3)`, suy ra k≡2 và x≡9 modulo 12. Đổi dư thứ hai thành 2 làm chênh lệch bằng 1, không chia hết cho g=2, nên hệ vô nghiệm. Sự không tương thích ở đây thấy ngay bằng tính chẵn lẻ.

## Từ công thức tới một hàm ghép đáng tin

Với nhiều điều kiện, giữ một cặp “nghiệm hiện tại, modulus hiện tại”, ghép từng điều kiện mới và dừng ngay nếu vô nghiệm. Sau mỗi lần ghép, invariant là cặp ấy mô tả đúng tất cả nghiệm của các điều kiện đã xử lý. Không cần giả sử mọi modulus đều nguyên tố hay đôi một nguyên tố cùng nhau nếu hàm ghép xử lý trường hợp tổng quát.

Trong Go, cả `r₂−r₁`, phép nhân với nghịch đảo, `m₁*k` và modulus mới đều có thể tràn. Chia g trước khi nhân giảm một phần nguy cơ nhưng không bảo đảm toàn miền. Chuẩn hóa phần dư âm sau tính toán và kiểm tra độ lớn hoặc dùng math/big. Khi modulus rút gọn bằng 1, điều kiện k không còn ràng buộc; không gọi một API nghịch đảo vốn từ chối modulus 1 rồi kết luận hệ vô nghiệm.

## Tự kiểm tra

1. Tìm nghịch đảo của 7 modulo 26 bằng một đẳng thức Bézout.
2. Hệ dư 1 modulo 4 và dư 3 modulo 6 có các nghiệm nào trong 0..23?
3. Vì sao `6x≡9 (mod 15)` có nghiệm nhưng `6x≡8 (mod 15)` không?

**Đối chiếu:** (1) `−11·7+3·26=1`, nên nghịch đảo là 15. (2) x≡9 modulo 12, nên 9 và 21. (3) gcd là 3; 3 chia 9 nhưng không chia 8. Phương trình đầu rút thành x≡4 modulo 5, không phải một nghiệm duy nhất modulo 15.

## Tài liệu

[MIT 18.781 — Linear Congruences, Chinese Remainder Theorem](https://ocw.mit.edu/courses/18-781-theory-of-numbers-spring-2012/resources/mit18_781s12_lec5/) trình bày hệ đồng dư và thuật toán. Bài [phi Euler và Möbius](/vi/notes/data-structures-algorithms/arithmetic-functions/) tiếp tục với cấu trúc ước số; bài [tổ hợp modulo](/vi/notes/data-structures-algorithms/binomial-lucas-wilson/) cho thấy khi nào nghịch đảo giai thừa mất hiệu lực.

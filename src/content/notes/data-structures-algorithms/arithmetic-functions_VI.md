---
title: "Số học thuật toán IV: phi Euler, Möbius và hàm nhân tính"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/arithmetic-functions"
series: "Toán cho thuật toán"
seriesOrder: 4
tags: ["number-theory", "euler-phi", "mobius", "multiplicative-function"]
description: "Ba cách nhìn vào cấu trúc thừa số nguyên tố và ứng dụng đếm số nguyên tố cùng nhau."
draft: false
updated: 2026-10-15
---

Trong 12 số từ 1 tới 12, những số nào không có ước chung với 12 ngoài 1? Liệt kê được `1,5,7,11`, tức bốn số. Khi n lớn hoặc có nhiều truy vấn, ta muốn đếm bằng cấu trúc prime của n thay vì chạy gcd với từng ứng viên. Phi Euler làm việc đó; Möbius đi thêm một bước, giúp gỡ những tổng đang đếm qua các ước chung.

Bài này giả định bạn đã biết phân tích thừa số và bao hàm–loại trừ cơ bản. Ta sẽ dùng lại hai ý ấy để giải thích công thức, không coi các ký hiệu φ,μ như những bảng giá trị phải học thuộc.

## Hàm nhân tính tận dụng phần độc lập trong phân tích prime

Hàm số học gán một giá trị cho mỗi số nguyên dương. Hàm f là nhân tính nếu `f(ab)=f(a)f(b)` khi gcd(a,b)=1, với quy ước thông thường f(1)=1. Hai số nguyên tố cùng nhau không chia sẻ prime, nên biết f trên từng lũy thừa prime đủ để ghép f(n).

Điều kiện gcd không phải trang trí. Hàm số ước d có `d(2)=2`, nhưng `d(4)=3`, không bằng `d(2)d(2)=4`; khi hai phần cùng chứa prime 2, số mũ phải gộp trước. d và tổng ước σ đã học đều nhân tính, nhưng không nhân tính hoàn toàn trên mọi cặp số.

## Phi Euler: loại số có chung prime với n

`φ(n)` đếm x trong [1,n] thỏa gcd(x,n)=1. Đối với n=12, số bị loại là bội của 2 hoặc 3. Có 6 bội của 2 và 4 bội của 3, nhưng hai bội của 6 bị đếm hai lần. Vậy còn `12−6−4+2=4` số.

Với `n=∏p_i^a_i`, mọi prime p_i chia n nên trong 1..n có đúng n/p_i bội của nó. Giao các tập bội cũng đếm được chính xác vì tích các prime phân biệt chia n. Bao hàm–loại trừ gom thành

`φ(n)=n·∏_{p|n}(1−1/p)`.

Đây là phép đếm chính xác trên một chu kỳ chia hết phù hợp, không cần giả định xác suất độc lập mơ hồ. Chỉ dùng mỗi prime **phân biệt** một lần. Khi tính bằng số nguyên, khởi tạo result=n rồi cập nhật `result=result/p*(p−1)` cho mỗi p. Phép chia trước tránh dùng số thực và giảm nguy cơ tràn so với nhân trước, nhưng vẫn phải chọn kiểu theo miền.

```note-visualization
{"id":"totient","preset":"normal"}
```

Với n=30, loại các prime 2,3,5 cho `30·1/2·2/3·4/5=8`. Với n=1, chỉ có số 1 và gcd(1,1)=1, nên φ(1)=1. Từ công thức lũy thừa prime, `φ(p^a)=p^a−p^(a−1)`; ghép các prime khác nhau cho thấy φ nhân tính.

### Phi nối với lũy thừa, nhưng cần đúng giả định

Với modulus n≥2, định lý Euler nói nếu gcd(a,n)=1 thì `a^φ(n)≡1 (mod n)`. Vì vậy `a^(φ(n)−1)` là một nghịch đảo modulo n. Nếu a có prime chung với n, bước ấy mất cơ sở: chẳng hạn 2 modulo 4 không thể có nghịch đảo.

Tính phi của một số thường cần phân tích prime trước. Để tìm một nghịch đảo, Extended Euclid thường tránh được công đoạn ấy; dùng định lý Euler khi φ đã biết hoặc nó phù hợp với bài toán, không coi đây là cách nhanh nhất mặc định.

## Möbius: các dấu cần thiết để loại đếm trùng

Định nghĩa `μ(1)=1`; nếu n có thừa số bình phương prime thì μ(n)=0; nếu n là tích k prime phân biệt thì `μ(n)=(-1)^k`. Vì vậy μ(6)=1, μ(12)=0 và μ(30)=−1.

Xét tổng μ trên mọi ước của n. Những ước chứa bình phương đóng góp 0. Mỗi ước còn lại tương ứng một tập con prime của n và mang dấu theo kích thước tập ấy. Nếu n có k prime phân biệt, tổng là `(1−1)^k`: bằng 0 khi n>1, bằng 1 khi n=1. Chính tổng này đóng vai trò công tắc nhận biết “ước chung bằng 1”.

```note-visualization
{"id":"mobius","preset":"normal"}
```

Với n=12, các ước 1,2,3,4,6,12 có μ lần lượt 1,−1,−1,0,1,0; tổng bằng 0. Ta thấy các số chứa bình phương bị bỏ, còn bốn tập con của {2,3} triệt tiêu nhau.

## Đảo một tổng trên ước

Giả sử `F(n)=Σ_{d|n}f(d)`. Khi thay F vào `Σ_{d|n}μ(d)F(n/d)` rồi gom hệ số của từng f(t), hệ số là `Σ_{d|(n/t)}μ(d)`. Tính chất vừa chứng minh làm mọi t<n triệt tiêu, chỉ còn t=n. Vì vậy

`f(n)=Σ_{d|n}μ(d)F(n/d)`.

Đó là Möbius inversion: gỡ phép cộng qua các ước. Ví dụ `Σ_{d|n}φ(d)=n`. Có thể hiểu đẳng thức này bằng cách nhóm 1..n theo gcd với n; mỗi nhóm có kích thước là một giá trị φ của ước tương ứng. Với n=6, phi ở 1,2,3,6 là 1,1,2,2, tổng 6. Đảo lại cho `φ(6)=6−3−2+1=2`.

Mục tiêu không phải tính riêng φ(6) nhanh hơn công thức prime. Đảo tổng giúp biến một bài đếm qua nhiều ước thành biểu thức dễ tiền xử lý hoặc gom nhóm.

### Đếm cặp nguyên tố cùng nhau

Với `1≤a≤A,1≤b≤B`, mỗi cặp đóng góp `Σ_{d|gcd(a,b)}μ(d)`: bằng 1 nếu gcd=1 và 0 nếu không. Đổi thứ tự cộng cho

`Σ_{d=1}^{min(A,B)} μ(d)⌊A/d⌋⌊B/d⌋`.

Vì có ⌊A/d⌋ lựa chọn a chia hết cho d và tương tự cho b, công thức còn lại rất cụ thể. Ví dụ A=B=3 cho `9−1−1=7`: trong chín cặp, chỉ (2,2) và (3,3) không nguyên tố cùng nhau. Không cần kiểm tra gcd riêng của từng cặp sau khi đã có bảng μ.

## Một số hay cả miền số?

Nếu chỉ cần φ(n), phân tích n rồi áp công thức là đủ. Nếu có nhiều truy vấn tới N, sàng tuyến tính tính φ,μ trong O(N) thời gian/bộ nhớ. Với prime p mới: φ(p)=p−1 và μ(p)=−1. Khi p chia x, `φ(xp)=pφ(x)` và μ(xp)=0; khi p không chia x, `φ(xp)=(p−1)φ(x)` và μ(xp)=−μ(x). Sàng phải tổ chức sao cho mỗi hợp số được tạo đúng lần phù hợp, không chỉ lồng hai vòng rồi gọi tuyến tính.

## Tự thử

1. Tính φ(30), μ(30), và giải thích vì sao d(4) không bằng d(2)².
2. Viết tổng μ trên các ước của 12.
3. Trong công thức cặp, vì sao một cặp có gcd=6 đóng góp 0?

**Đối chiếu:** (1) φ=8, μ=−1; hai thừa số 2 không nguyên tố cùng nhau nên không được tách hàm nhân tính. (2) `1−1−1+0+1+0=0`. (3) Nó góp μ(1)+μ(2)+μ(3)+μ(6)=1−1−1+1=0, đúng mục tiêu chỉ đếm gcd=1.

## Tài liệu

[MIT 18.781 — Arithmetic Functions](https://ocw.mit.edu/courses/18-781-theory-of-numbers-spring-2012/resources/mit18_781s12_lec13/) và [Möbius Inversion Formula](https://ocw.mit.edu/courses/18-781-theory-of-numbers-spring-2012/resources/mit18_781s12_lec14/) là tài liệu học tiếp về các tổng trên ước và phép đảo.

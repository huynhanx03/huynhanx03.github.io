---
title: "Số học thuật toán VI: căn bậc hai modulo và logarit rời rạc"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/modular-roots-discrete-log"
series: "Toán cho thuật toán"
seriesOrder: 6
tags: ["number-theory", "quadratic-residue", "tonelli-shanks", "discrete-log", "bsgs"]
description: "Hai bài toán đảo phép lũy thừa modulo và những giả định phải nói rõ."
draft: false
updated: 2026-10-15
---

Tính `3^5 mod 7` chỉ cần vài lần bình phương. Nhưng nếu biết kết quả bằng 5 và cần tìm số mũ, ta không thể lấy logarit thực rồi làm tròn. Tương tự, một số có thể có hai căn bậc hai modulo, hoặc không có căn nào. Phép đảo phụ thuộc cấu trúc phần dư, không đi theo thứ tự của trục số thực.

Ta xét prime lẻ p, các giá trị đã chuẩn hóa vào [0,p), và giả định biết lũy thừa/ nghịch đảo modulo. Các bước sau là thuật toán học thuật; implementation cho số lớn còn phải bảo đảm nhân không tràn. Không dùng note này như một thiết kế thư viện mật mã.

## Trước khi tìm căn, xác định nó có tồn tại không

Modulo 7, bình phương của 0..6 lần lượt là `0,1,4,2,2,4,1`. Vì thế 2 có căn 3 và 4, còn 3 không có căn. Hai căn không cần nằm gần căn thực của 2. Với a khác 0 và p lẻ, nếu x²=a thì (p−x)²=a; hai nghiệm khác nhau. Hơn nữa, `(x−y)(x+y)=0 mod p` cho thấy mọi nghiệm khác phải là x hoặc −x.

Tiêu chuẩn Euler phân biệt hai trường hợp: với a≠0, `a^((p−1)/2)` bằng 1 khi a là quadratic residue, bằng −1 khi không. Tính phép lũy thừa trước tránh chạy thuật toán tìm căn trên một input vô nghiệm. Riêng a=0 có nghiệm 0; p=2 có miền rất nhỏ và nên xử lý riêng.

```note-visualization
{"id":"euler-criterion","preset":"normal"}
```

### Đường ngắn khi p dư 3 modulo 4

Nếu p≡3 modulo 4 và a là residue khác 0, đặt `x=a^((p+1)/4)`. Khi bình phương, `x²=a·a^((p−1)/2)≡a` nhờ tiêu chuẩn Euler. Với p=7,a=2, số mũ là 2, x=4; nghiệm còn lại 3.

```note-visualization
{"id":"sqrt-mod-3","preset":"normal"}
```

Công thức chỉ có số mũ nguyên ở lớp prime phù hợp. Luôn kiểm tra lại x² mod p bằng a; phép kiểm phát hiện áp sai giả định hoặc lỗi tính toán, nhưng không thay việc bảo đảm phép nhân đúng. Khi p≡1 modulo 4, cần phương pháp tổng quát hơn.

## Tonelli–Shanks thu hẹp bậc của phần sai khác

Viết `p−1=q·2^s`, q lẻ. Chọn non-residue z bằng tiêu chuẩn Euler và khởi tạo `r=a^((q+1)/2)`, `t=a^q`, `c=z^q`, `M=s`. Ta giữ invariant `r²≡a·t`: khi t=1 thì r là căn. Phần cần xử lý nằm trong một nhóm có bậc là lũy thừa của 2.

Nếu t≠1, tìm số i nhỏ nhất trong 1..M−1 sao cho `t^(2^i)=1`. Đặt `b=c^(2^(M−i−1))`, rồi cập nhật `r←rb`, `t←tb²`, `c←b²`, `M←i`, tất cả theo modulo p. Cả r² và a·t đều được nhân b² nên invariant giữ nguyên; cách chọn b làm bậc còn lại của t nhỏ hơn, thể hiện qua M giảm. Vì M giảm chặt, vòng lặp dừng khi t=1 dưới các giả định hợp lệ.

Bất biến về bậc còn gồm `ord(c)=2^M` và `ord(t)` chia `2^(M−1)`, nên i luôn tồn tại khi t≠1. Ban đầu, điều này theo tiêu chuẩn Euler cho z và a. Sau đó t và b² đều có bậc `2^i`: nâng tới `2^(i−1)` đều cho −1, nên tích cho 1. Vì vậy t mới có bậc nhỏ hơn `2^i`, đúng với M mới bằng i. [Ghi chú MIT về Tonelli](https://ocw.mit.edu/courses/18-781-theory-of-numbers-spring-2012/resources/mit18_781s12_lec11/) giải thích tính chất giảm bậc này.

Ví dụ p=13,a=10: p−1=3·4 nên q=3,s=2. Chọn z=2 là non-residue; r=10²≡9, t=10³≡12, c=2³≡8. Vì t²=1 nên i=1, b=8. Sau cập nhật, r=9·8≡7 và t=12·8²≡1. Quả thật 7²≡10; căn còn lại là 6.

```note-visualization
{"id":"tonelli-shanks","preset":"normal"}
```

Bản tìm i bằng bình phương trực tiếp có O(log p+s²) phép nhân modulo sau khi đã có z; vì s≤log₂p, thường nêu cận O(log²p) cho phần này. Tìm non-residue là bước riêng: thử ngẫu nhiên phần dư khác 0 cho xác suất thành công 1/2 ở mỗi lần, nhưng không biến một vòng thử tuần tự tùy ý thành cận xác định nhỏ. Code hoàn chỉnh phải xử lý a=0,p=2, vô nghiệm, miền số và phép nhân an toàn.

## Logarit rời rạc: tìm số mũ bằng một điểm gặp

Bây giờ xét `g^x≡h (mod p)` với g≠0. Các lũy thừa g lặp sau ord(g), bậc của g. Nếu h không thuộc nhóm con do g sinh, không có nghiệm; h=0 cũng không thể đạt bằng lũy thừa của g khác 0 trong nhóm nhân.

Chọn `m=ceil(sqrt(ord(g)))`. Mọi x trong [0,ord(g)) viết được `x=im+j`, 0≤j<m. Chuyển phương trình thành `g^j ≡ h·g^(−im)`. Baby-step giant-step lưu các g^j, rồi đi các bước lớn h, h·g^(−m), h·g^(−2m),... để tìm giá trị gặp nhau.

Modulo 7, lấy g=3,h=5 và ord=6, m=3. Baby steps là `1→0,3→1,2→2`. Giant đầu 5 chưa có; `3³≡6`, nghịch đảo 6 cũng là 6, giant tiếp `5·6≡2`, gặp j=2. Vậy x=1·3+2=5; kiểm tra 3⁵≡5.

```note-visualization
{"id":"bsgs","preset":"normal"}
```

Với bảng hash lookup trung bình O(1), thời gian kỳ vọng và bộ nhớ O(√ord(g)), ngoài các bước lũy thừa/nghịch đảo ban đầu. Nếu chỉ biết cận p−1, dùng nó làm độ dài phủ miền vẫn tìm được nghiệm nếu có, nhưng có thể tốn hơn bậc thực. Nếu cần nghiệm nhỏ nhất, giữ j nhỏ nhất cho mỗi giá trị và xét/cập nhật các ứng viên hợp lệ, không tùy ý ghi đè bằng lần xuất hiện cuối.

Bất cứ ứng viên nào cũng nên được kiểm tra bằng PowMod, giới hạn vào miền yêu cầu và xử lý chuyện bậc nhỏ làm nhiều số mũ tương đương. Gần giới hạn 64-bit, √p vẫn có thể cần hàng tỷ entry; cận căn không có nghĩa luôn khả thi. Sự khó khăn của discrete log trong các nhóm được chọn thích hợp có vai trò trong mật mã, nhưng tham số và nhóm an toàn là một chủ đề khác.

## Tự thử

1. Liệt kê residue bình phương modulo 7 và căn của 2.
2. Tìm x cho `3^x≡5 (mod 7)` bằng BSGS với m=3.
3. Vì sao `2^x≡3 (mod 7)` vô nghiệm?

**Đối chiếu:** (1) Các residue là 0,1,2,4; căn của 2 là 3,4. (2) Giant thứ hai gặp baby g²=2, cho x=5. (3) Nhóm do 2 sinh chỉ gồm 1,2,4; 3 không thuộc nhóm ấy. Không có phép lấy log thực nào tạo ra một số mũ nguyên hợp lệ.

## Tài liệu

[MIT 18.781 — Square Roots, Tonelli’s Algorithm](https://ocw.mit.edu/courses/18-781-theory-of-numbers-spring-2012/resources/mit18_781s12_lec11/) cùng các bài về order/primitive roots trong [lecture notes](https://ocw.mit.edu/courses/18-781-theory-of-numbers-spring-2012/pages/lecture-notes/) cung cấp nền tảng nhóm phần dư. [VNOI — discrete log](https://wiki.vnoi.info/algo/math/discrete-log) là đường đọc thêm về triển khai.

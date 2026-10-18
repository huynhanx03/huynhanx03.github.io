---
title: "Số học thuật toán VI: căn bậc hai modulo và logarit rời rạc"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/modular-roots-discrete-log"
translationPending: true
series: "Toán cho thuật toán"
seriesOrder: 6
tags: ["number-theory", "quadratic-residue", "tonelli-shanks", "discrete-log", "bsgs"]
description: "Hai bài toán đảo phép lũy thừa modulo và những giả định phải nói rõ."
draft: false
---

Lũy thừa `a^e mod p` tính nhanh bằng bình phương nhị phân. Nhưng “đi ngược” có hai dạng khó hơn: tìm `x` sao cho `x²≡a (mod p)`, hoặc tìm `x` sao cho `g^x≡h (mod p)`. Không thể dùng căn bậc hai/logarit trên số thực rồi làm tròn: modulo tạo ra cấu trúc khác. Bài này xét `p` là **nguyên tố lẻ** và các số đã chuẩn hóa vào `[0,p)`.

## 1. Căn bậc hai modulo

Một số `a` có nghiệm `x²≡a (mod p)` thì gọi là **quadratic residue**. Với `a≠0`, tiêu chuẩn Euler nói `a^{(p-1)/2}≡1 (mod p)` khi có nghiệm, và `-1` khi không có. Nếu có một nghiệm `x`, nghiệm còn lại là `p-x` (trừ khi chúng trùng nhau; với nguyên tố lẻ và `a≠0`, chúng khác). Với `p≡3 (mod 4)`, một nghiệm là `x=a^{(p+1)/4} mod p`; kiểm tra lại `x² mod p==a` để tránh áp dụng sai giả định. Ví dụ `p=7,a=2`, `x=2^{2}=4`, và `4²≡2`.







Trường hợp tổng quát dùng **Tonelli–Shanks**. Viết `p-1=q·2^s` với `q` lẻ; tìm một quadratic **non-residue** `z`; giữ các biến sao cho `t=a^q`, `r=a^{(q+1)/2}`, `c=z^q` và điều chỉnh bậc của `t` về 1 bằng các lần bình phương. Bất biến là `r²≡a·t (mod p)`; khi `t=1`, `r` là nghiệm. Đây là bản đồ các bước để học thuật toán đầy đủ; code production phải xử lý `a=0`, `p=2`, không có nghiệm và nhân modulo không tràn.



```note-visualization
{"id":"euler-criterion","preset":"normal"}
```



```note-visualization
{"id":"sqrt-mod-3","preset":"normal"}
```



```note-visualization
{"id":"tonelli-shanks","preset":"normal"}
```

## 2. Logarit rời rạc và baby-step giant-step

Tìm `x` trong `g^x≡h (mod p)`. Nếu `g` thuộc nhóm nhân modulo `p`, các giá trị lũy thừa lặp theo **bậc** của `g`; nghiệm có thể không tồn tại nếu `h` không thuộc nhóm con sinh bởi `g`. Baby-step giant-step đặt `m≈√ord(g)`, viết `x=im+j` với `0<=j<m`. Lưu các `g^j` trong hash map (baby steps), rồi duyệt `h·g^{-im}` (giant steps) để tìm va chạm. Thời gian và bộ nhớ `O(√ord(g))`, sau khi tính được nghịch đảo thích hợp. Nếu dùng `p-1` thay cho `ord(g)` làm cận, vẫn có cận tìm kiếm nhưng phải kiểm tra nghiệm `PowMod(g,x,p)==h` và xử lý nghiệm nhỏ nhất nếu bài yêu cầu.



Khác với logarit số thực, không có công thức chia đơn giản biến `g^x≡h` thành `x`. Với modulo 64-bit lớn, `√p` phần tử có thể vẫn quá lớn; độ phức tạp này giải thích vì sao discrete log có vai trò trong mật mã. Không nên tự cài thuật toán mật mã từ note học thuật.



```note-visualization
{"id":"bsgs","preset":"normal"}
```

**Tự luyện:** (1) Liệt kê các bình phương modulo 7. (2) Tìm `x` sao cho `3^x≡5 (mod 7)` bằng duyệt nhỏ. (3) Giải thích vì sao `h` ngoài nhóm con sinh bởi `g` khiến logarit rời rạc vô nghiệm.

*Đọc thêm: [VNOI — căn bậc hai modulo](https://wiki.vnoi.info/vi/algo/math/sqrt-mod-p), [VNOI — logarit rời rạc](https://wiki.vnoi.info/algo/math/discrete-log).*

---
title: "Xác suất cho thuật toán: đếm biến cố và kỳ vọng"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/probability-for-algorithms"
translationPending: true
series: "Toán cho thuật toán"
seriesOrder: 8
tags: ["probability", "expectation", "conditional-probability", "randomized-algorithms"]
description: "Không gian mẫu, xác suất có điều kiện, Bayes và tính tuyến tính của kỳ vọng."
draft: false
---

Xác suất mô tả điều gì xảy ra khi thuật toán hoặc đầu vào có yếu tố ngẫu nhiên. Trước tiên phải nói rõ **không gian mẫu** và phân bố: “chọn ngẫu nhiên một hoán vị” thường nghĩa là mọi hoán vị có xác suất bằng nhau; “mỗi phần tử xuất hiện độc lập” là giả định khác. Nếu các kết quả cơ bản đồng khả năng, `P(A)=số kết quả thuận lợi / tổng số kết quả`; nếu không, phải cộng xác suất riêng từng kết quả.

## 1. Hợp, giao và điều kiện

`P(A∪B)=P(A)+P(B)-P(A∩B)` vì giao bị đếm hai lần. Hai biến cố **độc lập** khi `P(A∩B)=P(A)P(B)`; hai biến cố **xung khắc** có giao rỗng. Độc lập và xung khắc không đồng nghĩa: hai biến cố có xác suất dương mà xung khắc thì không thể độc lập.





Xác suất có điều kiện `P(A|B)=P(A∩B)/P(B)` khi `P(B)>0`. Bayes đổi hướng điều kiện: `P(A|B)=P(B|A)P(A)/P(B)`. Ví dụ kiểm thử một lỗi hiếm: dù phép kiểm có tỷ lệ phát hiện cao, một kết quả dương tính vẫn có thể chủ yếu là báo nhầm nếu lỗi rất hiếm. Luôn dùng cả **base rate** `P(A)`; chỉ nhìn `P(B|A)` rồi kết luận `P(A|B)` là sai.



```note-visualization
{"id":"probability-outcomes","preset":"normal"}
```



```note-visualization
{"id":"conditional-probability","preset":"normal"}
```

## 2. Kỳ vọng và biến chỉ báo

Kỳ vọng của biến ngẫu nhiên rời rạc `X` là `E[X]=Σ x·P(X=x)`. Tính tuyến tính `E[X+Y]=E[X]+E[Y]` đúng **ngay cả khi X và Y phụ thuộc**. Đặt `I_i=1` nếu sự kiện thứ `i` xảy ra, ngược lại 0; `E[I_i]=P(I_i=1)`. Do đó số sự kiện xảy ra `X=ΣI_i` có `E[X]=ΣP(I_i=1)` mà không cần biết mọi quan hệ phụ thuộc. Ví dụ tung đồng xu công bằng `n` lần, kỳ vọng số mặt ngửa là `n/2`.



Phân tích hash table thường nói thao tác `O(1)` **kỳ vọng**, dựa trên giả định phân bố hash; đó không phải bảo đảm mỗi lần. Quicksort chọn pivot ngẫu nhiên có `O(n log n)` kỳ vọng nhưng vẫn tồn tại lần chạy `O(n²)`. “Kỳ vọng” là trung bình theo nguồn ngẫu nhiên đã nêu, không phải cam kết cho mọi đầu vào và mọi lần chạy.



```note-visualization
{"id":"expectation","preset":"normal"}
```

## 3. Tính xác suất trong chương trình

Nếu cần xác suất chính xác dưới dạng phân số, lưu tử/mẫu và rút gọn bằng gcd; `float64` có sai số. Nếu đề yêu cầu kết quả modulo nguyên tố, phép chia xác suất có thể thay bằng nghịch đảo modulo **khi mẫu số khả nghịch**; kết quả modulo là một biểu diễn đại số, không phải số thực trong `[0,1]`. Với mô phỏng Monte Carlo, dùng bộ sinh ngẫu nhiên thích hợp và đo sai số; không coi vài nghìn lượt thử là chứng minh xác suất chính xác.

**Tự luyện:** (1) Tung hai xúc xắc công bằng, tính xác suất tổng bằng 7. (2) Với ba lần tung đồng xu, dùng biến chỉ báo tính kỳ vọng số mặt ngửa. (3) Cho ví dụ hai biến cố xung khắc nhưng không độc lập.

*Đọc thêm: [VNOI — danh mục tổ hợp và xác suất](https://wiki.vnoi.info/vi/articles).*

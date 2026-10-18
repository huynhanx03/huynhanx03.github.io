---
title: "Xác suất cho thuật toán: đếm biến cố và kỳ vọng"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/probability-for-algorithms"
series: "Toán cho thuật toán"
seriesOrder: 8
tags: ["probability", "expectation", "conditional-probability", "randomized-algorithms"]
description: "Không gian mẫu, xác suất có điều kiện, Bayes và tính tuyến tính của kỳ vọng."
draft: false
updated: 2026-10-15
---

Một hash table được mô tả là có thời gian tra cứu O(1) kỳ vọng. Điều đó không có nghĩa mọi lần tra đều tốn như nhau. “Kỳ vọng” cần một nguồn ngẫu nhiên và một phân bố cụ thể; nếu không nói rõ, ta chưa biết đang lấy trung bình trên điều gì.

Bài này bắt đầu từ phép đếm có thể kiểm bằng tay rồi nối sang chi phí thuật toán. Bạn cần biết phân số và quy tắc đếm cơ bản. Các công thức giả định biến ngẫu nhiên rời rạc; ví dụ hữu hạn tránh vấn đề hội tụ của kỳ vọng vô hạn.

## Không gian mẫu phải mô tả kết quả cơ bản

Tung hai xúc xắc công bằng và độc lập tạo 36 cặp có thứ tự đồng khả năng. Tổng bằng 7 ứng với (1,6),(2,5),...,(6,1), có sáu cặp nên xác suất 1/6. Nếu chọn “tổng” làm kết quả rồi cho 11 tổng từ 2..12 xác suất bằng nhau, ta đã đổi sang một phân bố sai: tổng 7 có nhiều cách tạo hơn tổng 2.

Một **biến cố** là tập các kết quả cơ bản. Khi chúng đồng khả năng, `P(A)=|A|/|Ω|`. Nếu không đồng khả năng, phải cộng trọng số xác suất của từng kết quả thuộc A. “Chọn ngẫu nhiên hoán vị” thường ngầm chỉ mọi hoán vị đồng khả năng; “mỗi phần tử độc lập xuất hiện” lại là mô hình khác và cần nêu xác suất xuất hiện.

```note-visualization
{"id":"probability-outcomes","preset":"normal"}
```

## Xung khắc và độc lập trả lời hai câu hỏi khác nhau

Hợp A∪B nghĩa là ít nhất một biến cố xảy ra. Cộng P(A)+P(B) đã đếm giao hai lần, nên `P(A∪B)=P(A)+P(B)−P(A∩B)`.

Hai biến cố xung khắc không thể cùng xảy ra. Hai biến cố độc lập thỏa `P(A∩B)=P(A)P(B)`: biết một biến cố xảy ra không thay xác suất biến cố kia khi các điều kiện xác suất có nghĩa. Trong một lần tung xúc xắc, A={ra 1}, B={ra 2} xung khắc; nhưng không độc lập, vì giao có xác suất 0 trong khi tích là 1/36. Với xác suất dương ở cả hai, xung khắc loại trừ độc lập.

## Điều kiện thay đổi tập kết quả đang xét

`P(A|B)=P(A∩B)/P(B)` khi P(B)>0. Ta chỉ giữ các kết quả trong B rồi chuẩn hóa lại tổng xác suất về 1. Vì giao có thể viết theo hai chiều, suy ra Bayes:

`P(A|B)=P(B|A)P(A)/P(B)`.

Giả sử một kiểm thử phát hiện một loại lỗi hiếm trong 10.000 trường hợp: có 100 trường hợp thật sự lỗi, phát hiện 90%; trong 9.900 trường hợp không lỗi, tỷ lệ báo nhầm 5%. Số dương tính kỳ vọng là 90 thật và 495 nhầm. Trong một kết quả dương, tỷ lệ thật sự lỗi là `90/(90+495)≈15,38%`, dù khả năng phát hiện khi đã có lỗi là 90%.

```note-visualization
{"id":"conditional-probability","preset":"normal"}
```

Hai số ấy trả lời hai điều kiện ngược nhau. Base rate P(lỗi)=1% quyết định mạnh kết quả; bỏ nó rồi suy trực tiếp từ P(dương|lỗi) sang P(lỗi|dương) sẽ sai. Đây là ví dụ mô hình toán học cho kiểm thử, không phải số liệu thực nghiệm của một công cụ cụ thể.

## Kỳ vọng có thể cộng dù các phần phụ thuộc

Với biến X, `E[X]=Σ_x xP(X=x)`. Nó là trung bình có trọng số, có thể không bằng bất kỳ kết quả một lần chạy nào: số mặt ngửa kỳ vọng trong ba lần tung là 1,5, dù không lần nào có một nửa mặt ngửa.

Biến chỉ báo I_A nhận 1 khi A xảy ra, ngược lại 0. Vì `E[I_A]=P(A)`, nếu X là tổng các chỉ báo thì `E[X]=ΣP(A_i)`. Tính tuyến tính `E[X+Y]=E[X]+E[Y]` không cần X,Y độc lập: mỗi kết quả cơ bản góp tổng X+Y, phân phối phép cộng trong tổng kỳ vọng đã đủ chứng minh.

Với n lần tung đồng xu công bằng, mỗi chỉ báo “lần i là ngửa” có kỳ vọng 1/2, nên tổng là n/2. Ngay cả nếu các lần tung phụ thuộc nhưng từng lần vẫn có xác suất ngửa 1/2, kỳ vọng tổng vẫn n/2. Phân bố và mức dao động có thể thay đổi rất nhiều; tuyến tính kỳ vọng chưa cho phép nhân xác suất hoặc kết luận độ tập trung.

```note-visualization
{"id":"expectation","preset":"normal"}
```

## Đọc đúng một cận kỳ vọng của thuật toán

Hash table thường có chi phí kỳ vọng tốt dưới giả định về cách phân bố hash và tải bảng. Va chạm vẫn làm một lần tra lâu hơn; một hàm hash cố định với dữ liệu đối kháng có thể không thỏa mô hình dùng để phân tích.

Quicksort chọn pivot ngẫu nhiên có thời gian kỳ vọng O(n log n) trên một input cố định dưới mô hình lựa chọn pivot thích hợp, nhưng vẫn có lần chọn liên tục lệch dẫn tới O(n²). Cận kỳ vọng không phải cận tệ nhất, cũng không tự cho xác suất cụ thể của một lần chạy chậm. Khi báo độ phức tạp, hãy nói rõ đang trung bình theo lựa chọn ngẫu nhiên của thuật toán hay theo phân bố đầu vào.

## Biểu diễn xác suất trong chương trình

Nếu cần chính xác, giữ phân số tử/mẫu và rút gọn bằng gcd; tử/mẫu lớn còn cần big integer. Float64 tiện cho số gần đúng nhưng có sai số cộng dồn và so sánh. Kết quả hiển thị 0,1 không chứng minh quá trình tính đã dùng một phân số chính xác 1/10.

Đề bài đôi khi yêu cầu xác suất modulo prime p. Khi mẫu khả nghịch, thay phân số a/b bằng `a·b⁻¹ mod p`. Nếu b chia hết cho p, không áp công thức này trực tiếp. Một phần dư như p−1 là biểu diễn đại số, không phải xác suất thực lớn hơn 1 hay nhỏ hơn 0.

Mô phỏng Monte Carlo ước lượng qua nhiều lần thử theo đúng phân bố. Cần chọn bộ sinh và cách lấy mẫu phù hợp, đánh giá sai số theo số mẫu và mô hình; vài nghìn kết quả gần lý thuyết không thành chứng minh chính xác. Các giả định của phân tích phải khớp cách chương trình thực sự lấy mẫu.

## Tự kiểm tra

1. Vì sao tổng hai xúc xắc bằng 7 có xác suất 1/6 chứ không phải 1/11?
2. Ba lần tung công bằng có số mặt ngửa kỳ vọng bao nhiêu? Có cần liệt kê tám chuỗi không?
3. Nếu hai biến cố xung khắc và đều có xác suất dương, tại sao không độc lập?

**Đối chiếu:** (1) Có sáu trong 36 cặp đồng khả năng; các tổng không đồng khả năng. (2) 3/2, bằng tổng kỳ vọng của ba chỉ báo; không cần liệt kê. (3) Giao bằng 0 trong khi tích xác suất dương. Đừng chuyển tính tuyến tính của kỳ vọng thành một giả định độc lập không có trong đề.

## Đọc tiếp

[VNOI — danh mục tổ hợp và xác suất](https://wiki.vnoi.info/vi/articles) cung cấp bài luyện. Bài [rolling hash](/vi/notes/data-structures-algorithms/rolling-hash/) là một trường hợp cần phân biệt chi phí tính nhanh với rủi ro va chạm và tính đúng của kết quả.

---
title: "Tổ hợp và bao hàm–loại trừ: đếm mà không liệt kê"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/combinatorics-inclusion-exclusion"
series: "Toán cho thuật toán"
seriesOrder: 7
tags: ["combinatorics", "permutation", "combination", "inclusion-exclusion"]
description: "Quy tắc cộng/nhân, hoán vị/tổ hợp và cách sửa đếm trùng bằng dấu xen kẽ."
draft: false
updated: 2026-10-15
---

Có năm người, cần chọn hai người vào một nhóm. Nếu chọn trưởng nhóm rồi phó nhóm thì có 20 cách, nhưng nếu hai người có vai trò ngang nhau thì chỉ có 10. Trước khi viết công thức đếm, phải biết đổi thứ tự có tạo một kết quả mới hay không.

Tổ hợp giúp tránh liệt kê hàng triệu cấu hình, nhưng công thức chỉ đúng với mô hình đã xác định. Ta sẽ đi từ lựa chọn có thứ tự sang không thứ tự, rồi xử lý trường hợp một đối tượng bị đếm nhiều lần.

## Cộng các nhánh, nhân các bước

Nếu chọn một trong hai phương án rời nhau, cộng số cách. Nếu thực hiện hai bước và mỗi lựa chọn ở bước đầu có đúng b cách tiếp tục, nhân số cách đầu với b. Khi số cách tiếp tục thay đổi theo lựa chọn đầu, phải cộng từng số cách tương ứng thay vì nhân tùy ý.

Chẳng hạn đặt hai chức vụ khác nhau trong năm người: chức vụ đầu có 5 lựa chọn, sau đó chức vụ hai còn 4, cho 5·4=20. Hai bước phụ thuộc vì không chọn lại một người, nhưng quy tắc nhân vẫn đúng do mỗi nhánh đầu đều có đúng bốn cách tiếp tục. “Dùng phép nhân” không đòi hỏi hai biến cố xác suất độc lập.

## Vì sao tổ hợp có phép chia k!?

Sắp n vật phân biệt có n! cách. Chọn có thứ tự k vật không lặp từ n có `n!/(n−k)!` cách: mỗi vị trí làm giảm số còn được chọn đi một. Nếu thứ tự không quan trọng, cùng một nhóm k vật xuất hiện k! lần trong danh sách dãy có thứ tự. Chia theo từng nhóm trùng kích thước cho

`C(n,k)=n!/(k!(n−k)!)`.

Với năm người chọn hai, các dãy (An,Bình) và (Bình,An) biểu diễn cùng một nhóm, nên 20/2=10. Nếu hai vai trò khác nhau, phép chia ấy lại làm mất những kết quả thực sự khác.

```note-visualization
{"id":"permutations-count","preset":"normal"}
```

```note-visualization
{"id":"combinations-count","preset":"normal"}
```

Khi vật trùng loại, cũng phải xác định điều gì được coi là khác. Với AAB, tạm đánh nhãn A₁,A₂ cho 3!=6 dãy; bỏ nhãn thì mỗi dãy bị đếm 2! lần. Còn đúng AAB, ABA, BAA. Tổng quát với nhóm kích thước a₁,...,a_t có `n!/(a₁!...a_t!)` dãy phân biệt.

Chọn lặp/không lặp, vật phân biệt/không phân biệt và hộp có nhãn/không nhãn là các mô hình khác. Một cách tự kiểm tra là lấy trường hợp rất nhỏ, liệt kê vài cấu hình và hỏi công thức có gộp đúng những cấu hình được coi là một hay không.

## Bao hàm–loại trừ sửa số lần đếm của từng đối tượng

Trong 1..100, có 50 số chia hết cho 2 và 33 số chia hết cho 3. Nếu cộng được 83, các bội của 6 đã bị tính hai lần. Trừ 16 bội của 6, còn 67 số chia hết cho ít nhất một trong hai.

Đó là `|A∪B|=|A|+|B|−|A∩B|`. Với k tập, cộng giao một tập, trừ giao hai tập, cộng giao ba tập,...:

`|∪A_i|=Σ_{∅≠S⊆[k]}(−1)^(|S|+1)|∩_{i∈S}A_i|`.

Một phần tử thuộc đúng t tập xuất hiện với tổng hệ số `C(t,1)−C(t,2)+...=1`, suy ra từ (1−1)^t. Vì thế dù thuộc nhiều tập, nó vẫn được tính đúng một lần trong hợp. Đây là lý do dấu xen kẽ, không phải quy tắc dấu cần nhớ riêng cho từng bài.

```note-visualization
{"id":"inclusion-exclusion","preset":"normal"}
```

Với giao các tập “chia hết cho d_i”, ta cần đếm bội của lcm các d_i. Nếu các d_i là prime phân biệt thì lcm là tích; với 4 và 6, lcm là 12, không phải 24. Chọn sai mẫu số ở giao sẽ khiến bao hàm–loại trừ đúng về hình thức nhưng sai số đếm.

Muốn đếm số không thuộc tập nào, lấy kích thước vũ trụ trừ hợp. Trong 1..60, số không chia hết cho 2 và cũng không chia hết cho 3 là `60−30−20+10=20`. Cụm “không chia hết cho 2 hoặc 3” dễ gây nhập nhằng ngôn ngữ; cần nêu rõ là cả hai điều kiện không chia hết đều phải đúng.

Dùng trực tiếp k tập có 2^k−1 giao cần xét, nên phù hợp khi k nhỏ hoặc có cách gom các giao đặc biệt. Chi phí mỗi giao và nguy cơ tràn khi tính lcm cũng phải tính vào triển khai; nếu lcm vượt giới hạn đếm N thì giao không còn phần tử trong 1..N.

## Khi công thức đóng không thuận tiện: chia bài thành hai nhánh

Để tính C(n,k), xét phần tử cuối: nếu chọn nó, còn C(n−1,k−1) cách; nếu không, còn C(n−1,k). Hai trường hợp rời nhau và phủ hết nên

`C(n,k)=C(n−1,k−1)+C(n−1,k)`.

Khởi tạo C(n,0)=1, C(n,k)=0 khi k>n. DP tính tới n,k trong O(nk) thời gian; lưu một hàng giảm bộ nhớ còn O(k) nếu cập nhật từ k lớn xuống nhỏ, tránh dùng giá trị vừa ghi của cùng hàng. Công thức chỉ cộng, nên dùng được cả modulo hợp số mà không cần nghịch đảo giai thừa. Tổng trung gian vẫn có thể tràn trước lấy modulo.

Chẳng hạn hàng n=4 có 1,4,6,4,1. Lên n=5, giá trị k=2 là 4+6=10. Ta đang đếm lại đúng năm người chọn hai, bằng cách phân nhánh thay vì chia giai thừa.

## Tự thử rồi xem lời giải

1. Có bao nhiêu chuỗi bốn bit có ít nhất một bit 1?
2. Đếm số trong 1..60 không chia hết cho 2 và không chia hết cho 3.
3. Nếu AAB có thêm một B thành AABB thì có bao nhiêu dãy phân biệt?

**Lời giải:** (1) Có 2⁴ chuỗi, bỏ đúng chuỗi 0000, còn 15; đếm bù thuận tiện hơn liệt kê từng số lượng bit 1. (2) `60−30−20+10=20`, giao là bội của 6. (3) `4!/(2!2!)=6`; hai nhóm hoán đổi nội bộ không tạo dãy mới. Nếu vật có nhãn riêng, đáp án sẽ khác.

## Đọc tiếp

[VNOI — bao hàm–loại trừ](https://wiki.vnoi.info/algo/algebra/pie) có các ứng dụng đếm. Bài [tổ hợp modulo, Lucas và Wilson](/vi/notes/data-structures-algorithms/binomial-lucas-wilson/) giải thích khi phép chia giai thừa không thể thực hiện trực tiếp trong modulo; bài [xác suất](/vi/notes/data-structures-algorithms/probability-for-algorithms/) dùng phép đếm làm tử và mẫu của phân bố đồng khả năng.

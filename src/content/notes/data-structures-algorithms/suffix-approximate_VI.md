---
title: "Suffix structures và so khớp gần đúng"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/suffix-approximate"
series: "DSA nâng cao"
seriesOrder: 20
tags: ["suffix-array", "lcp", "suffix-tree", "approximate-matching"]
description: "Lập chỉ mục mọi hậu tố và tìm mẫu khi cho phép lỗi chỉnh sửa."
draft: false
updated: 2026-10-15
---

Một văn bản cố định nhận hàng nghìn mẫu tìm kiếm. Quét lại cả văn bản với KMP cho từng mẫu sẽ tốn nhiều lượt đọc. Lập chỉ mục mọi hậu tố giúp đổi cách hỏi: những hậu tố nào bắt đầu bằng mẫu này? Nhưng nếu cho phép gõ sai một ký tự, câu hỏi đã đổi và chỉ mục khớp chính xác chưa tự giải được.

Bài này tách hai nhu cầu ấy: suffix structures cho nhiều truy vấn chính xác trên văn bản, rồi dynamic programming để mẫu khớp gần đúng với một đoạn ở vị trí bất kỳ. Bạn nên biết thứ tự từ điển, binary search và edit distance hai chuỗi.

## Mỗi vị trí bắt đầu cho một hậu tố

Suffix tại i là s[i:] tới hết chuỗi. Với banana, sắp các suffix theo từ điển được:

| Rank | Vị trí | Suffix | LCP với dòng trước |
| --- | --- | --- | --- |
| 0 | 5 | a | 0 |
| 1 | 3 | ana | 1 |
| 2 | 1 | anana | 3 |
| 3 | 0 | banana | 0 |
| 4 | 4 | na | 0 |
| 5 | 2 | nana | 2 |

Suffix array là `[5,3,1,0,4,2]`, chỉ giữ index thay vì copy các chuỗi dài. Mẫu ana là tiền tố của hai suffix rank 1,2. Chúng liền nhau: nếu hai chuỗi cùng bắt đầu bằng p, mọi chuỗi nằm giữa trong thứ tự từ điển cũng phải bắt đầu bằng p; một ký tự khác trước khi hết p sẽ đẩy nó ra trước hoặc sau cả khoảng.

```note-visualization
{"id":"suffix-search","preset":"normal"}
```

Nhờ tính liên tiếp, tìm biên trái/phải bằng binary search. Mỗi comparator bản đơn giản đọc tối đa m ký tự mẫu nên truy vấn O(m log n), rồi thêm chi phí xuất các vị trí khớp. Các vị trí trong khoảng theo thứ tự suffix, không chắc tăng dần theo vị trí văn bản; nếu API cần thứ tự xuất hiện, còn phải sắp hoặc tổ chức kết quả.

Xây chỉ mục không miễn phí. Sort trực tiếp các suffix bằng comparator có thể so O(n) ký tự mỗi lần và tốn O(n² log n). Doubling/radix cho O(n log n), còn các thuật toán phù hợp có thể tuyến tính với giả định alphabet. Bài [xây suffix array](/vi/notes/data-structures-algorithms/suffix-array-construction/) giải thích riêng chi phí ấy.

## LCP cho biết những vùng lặp có sẵn

LCP là longest common prefix của hai suffix kề nhau. Max LCP trong bảng là 3 ở ana/anana, nên ana là một substring lặp dài nhất, xuất hiện tại 3 và 1. Hai lần xuất hiện có thể chồng lấn; yêu cầu “không chồng lấn” sẽ là bài khác cần điều kiện khoảng cách vị trí.

Suffix tree nén trie của các suffix, cho tìm mẫu O(m+occ) với biểu diễn và xây dựng phù hợp, nhưng có overhead cạnh/con trỏ và cài đặt phức tạp hơn. Suffix automaton gộp lớp substring theo endpos, không phải suffix tree đổi tên. [Suffix tree](/vi/notes/data-structures-algorithms/suffix-tree/) và [SAM](/vi/notes/data-structures-algorithms/suffix-automaton/) làm rõ các cấu trúc ấy. Chọn theo truy vấn cần trả và chi phí triển khai, không chỉ theo một cận tốt nhất.

## Gần đúng: trước tiên định nghĩa một lỗi

Edit distance Levenshtein cho chèn, xóa, thay thế với chi phí 1. Hamming chỉ đếm vị trí khác nhau giữa hai chuỗi cùng độ dài, không cho dịch bằng chèn/xóa. Với ab và ba, cả hai khoảng cách đều bằng 2; ví dụ này chưa thể phân biệt hai mô hình. Với abc và bc, edit distance là 1 nhờ xóa a, còn Hamming tiêu chuẩn không định nghĩa vì độ dài khác nhau.

Byte, rune hay grapheme cũng đổi “một lỗi”. Một chữ có dấu UTF-8 có thể nhiều byte; nếu đếm lỗi theo ký tự hiển thị, phải chọn và có thể chuẩn hóa dãy ký hiệu trước DP.

## Cho mẫu bắt đầu ở bất kỳ vị trí nào bằng điều kiện biên

Đặt dp[i][j] là chi phí nhỏ nhất biến tiền tố mẫu p[:i] thành **một đoạn kết thúc ở j** của văn bản t[:j]. Ta cho phép bỏ phần đầu văn bản miễn phí bằng `dp[0][j]=0`; với j=0, phải xóa i ký tự mẫu nên `dp[i][0]=i`.

Ở ô i,j lấy min của ba lựa chọn: xóa p[i−1] từ dp[i−1][j]+1, chèn t[j−1] từ dp[i][j−1]+1, hoặc ghép cặp ký tự từ dp[i−1][j−1] cộng 0/1 tùy bằng nhau. Cùng recurrence edit distance, khác hàng đầu, đã đổi mục tiêu từ khớp toàn văn bản sang tìm một đoạn tự chọn điểm đầu.

```note-visualization
{"id":"approximate-matching","preset":"normal"}
```

Với mẫu cat trong văn bản xcuty, kết quả ở cột sau chữ t là 1: chọn đoạn cut, thay a thành u. Chữ x đầu văn bản không bị tính là một phép xóa/chèn bắt buộc vì hàng đầu bằng 0 cho phép bắt đầu sau nó. Nếu dùng dp[0][j]=j của khoảng cách hai chuỗi đầy đủ, ta lại tính cả phần tiền tố văn bản không cần khớp.

Các ô dp[m][j] cho chi phí tốt nhất với điểm cuối j. Lấy các cột có giá trị ≤k nếu cần mọi điểm cuối đạt ngưỡng; muốn vị trí bắt đầu hoặc đường sửa thì lưu truy vết/thông tin nguồn, không suy ra từ chỉ một số chi phí. Một điểm cuối có thể có nhiều đoạn tối ưu; API phải chọn cách trả.

DP có O(mn) thời gian, O(mn) bộ nhớ nếu giữ bảng để truy vết; chỉ giữ hai hàng giảm còn O(n) cho giá trị, hoặc đổi hướng lưu theo cách triển khai phù hợp. Ngưỡng k có thể giúp dải quanh đường chéo khi điểm đầu đã bị giới hạn. Với điểm bắt đầu tùy ý trên toàn văn bản, một dải cố định quanh i=j sẽ bỏ sót nhiều khớp; phải thiết kế dải theo các ứng viên hoặc một phương pháp khác phù hợp.

## Tự thử

1. Suffix array của aba là gì? LCP kề nhau thế nào?
2. Vì sao LCP lớn nhất của banana tìm ra ana nhưng chưa bảo đảm hai lần không chồng lấn?
3. Với mẫu cat trong xcuty, hàng dp[0][j]=0 thay điều gì so với j? Ab và ba có giúp phân biệt edit/Hamming không?

**Đối chiếu:** (1) Suffix a(2),aba(0),ba(1): SA=[2,0,1], LCP=[0,1,0]. (2) Hai vị trí 1,3 cách nhau 2 nhỏ hơn độ dài 3 nên chồng lấn. (3) Nó bỏ phí phần trước điểm bắt đầu, cho đoạn cut chi phí 1. Ab/ba đều khoảng cách 2 ở cả hai; abc/bc mới làm lộ khác biệt độ dài/chèn-xóa.

## Đọc tiếp

[Kasai và cộng sự — Linear-Time Longest-Common-Prefix Computation](https://www.ime.usp.br/~cris/aulas/19_1_6957/KasaiLAAP2001-LCP.pdf) giải thích LCP. [Ukkonen — On-line construction of suffix trees](https://www.cs.helsinki.fi/u/ukkonen/SuffixT1withFigs.pdf) là nguồn gốc xây suffix tree trực tuyến. Bài [suffix array chuyên sâu](/vi/notes/data-structures-algorithms/suffix-array-construction/) tiếp tục từ bảng ví dụ sang cách xây.

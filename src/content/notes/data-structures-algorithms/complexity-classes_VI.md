---
title: "P, NP, NP-hard: hiểu độ khó qua bài quyết định và phép reduction"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/complexity-classes"
series: "DSA nâng cao"
seriesOrder: 22
tags: ["complexity-theory", "p", "np", "np-complete", "reduction"]
description: "Phân biệt tìm nghiệm với kiểm tra chứng chỉ và hướng đúng của phép giảm."
draft: false
updated: 2026-10-15
---

Một người đưa cho bạn thứ tự đi qua các thành phố và nói rằng đó là một chu trình hợp lệ. Bạn có thể kiểm tra các cạnh theo thứ tự ấy mà không phải tự tìm ra lộ trình. Sự khác nhau giữa **tìm** một lời giải và **kiểm tra** một lời giải được đề xuất là điểm xuất phát của P và NP.

Những lớp này nói về bài toán tổng quát với mọi kích thước đầu vào trong một mô hình tính toán. Chúng không phải nhãn đo thời gian của một instance cụ thể, cũng không có nghĩa mọi instance NP-hard đều cần rất lâu.

## Trước hết chuyển thành câu hỏi có/không

Bài tối ưu hỏi “chu trình ngắn nhất dài bao nhiêu?”. Bài quyết định tương ứng hỏi “có chu trình dài không quá K không?”. Hai bài liên quan nhưng khác loại đầu ra. Trong định nghĩa thông thường dưới đây, P và NP là các lớp **bài toán quyết định**.

P gồm các bài có thuật toán xác định chạy trong thời gian đa thức theo độ dài **biểu diễn đầu vào**. NP gồm các bài mà với instance trả lời có, tồn tại một chứng chỉ dài đa thức cho phép verifier xác nhận trong thời gian đa thức. Với instance trả lời không, không có chứng chỉ nào làm verifier chấp nhận sai. NP không có nghĩa “non-polynomial”; cũng không đòi verifier phải có cách tìm chứng chỉ nhanh.

Mọi bài trong P thuộc NP: verifier có thể tự giải instance và bỏ qua chứng chỉ. Vì thế `P⊆NP`. Câu hỏi `P=NP?` vẫn được [Clay Mathematics Institute liệt kê là chưa giải](https://www.claymath.org/millennium/p-vs-np/) tại thời điểm đối chiếu 2026-10-15. Chưa có cơ sở từ định nghĩa NP để khẳng định mọi bài NP nằm ngoài P.

## Chứng chỉ cho Hamilton cycle

Cho đồ thị n đỉnh, hỏi có chu trình ghé mỗi đỉnh đúng một lần rồi quay về điểm đầu không. Chứng chỉ là danh sách n đỉnh theo thứ tự trên chu trình. Verifier cần kiểm tra: đủ n đỉnh; mỗi đỉnh hợp lệ và xuất hiện một lần; mỗi cặp liên tiếp có cạnh; cặp cuối–đầu cũng có cạnh.

Với chu trình đề xuất `[A,C,B,D]`, chỉ kiểm tra A–C, C–B, B–D chưa đủ: còn D–A. Nếu thiếu cạnh quay về thì đó là đường đi, chưa phải chu trình. Có thể dùng tập đánh dấu để phát hiện đỉnh lặp. Với biểu diễn đồ thị phù hợp, các bước này đều có chi phí đa thức; đổi biểu diễn có thể đổi số mũ cụ thể nhưng không đổi kết luận thuộc NP.

```note-visualization
{"id":"hamilton-certificate","preset":"normal"}
```

Việc một chứng chỉ được kiểm tra nhanh không làm việc thử mọi thứ tự trở thành đa thức. Có thể có n! thứ tự ứng viên. Kết luận ở đây là Hamilton cycle có verifier đa thức; một chứng minh độ khó cần thêm lập luận reduction.

## Kích thước số khác độ dài mã hóa số

Knapsack 0/1 quyết định hỏi: có chọn một tập vật với tổng trọng lượng không quá W và tổng giá trị ít nhất K không? Chứng chỉ là n bit chọn/bỏ vật. Verifier cộng trọng lượng và giá trị của vật được chọn rồi so với W, K. Phải tính cả số bit khi xét số học, nhưng vẫn đa thức theo độ dài dữ liệu đầu vào.

DP có bảng theo n và W thường mất `O(nW)` thao tác số học trong mô hình thích hợp. Nếu W được mã hóa nhị phân bằng b bit, W có thể cỡ `2^b`. Khi ấy `O(nW)` có thể là `O(n2^b)`, không phải đa thức theo b. Tăng biểu diễn W từ khoảng 20 bit lên 40 bit không chỉ tăng gấp đôi miền chỉ số bảng.

Ta gọi chi phí đa thức theo **giá trị số** nhưng chưa đa thức theo độ dài mã hóa là pseudo-polynomial. DP này rất hữu ích khi W nhỏ, nhưng không chứng minh knapsack quyết định thuộc P với mã hóa nhị phân tổng quát. Nêu cả tham số lẫn cách mã hóa giúp tránh kết luận sai từ chữ “DP”.

## Reduction phải đi theo đúng chiều

Viết `A ≤p B` nghĩa là có phép biến đổi f chạy thời gian đa thức sao cho với mọi instance x của A, x trả lời có **khi và chỉ khi** f(x) trả lời có ở B. Một thuật toán nhanh cho B kết hợp với f sẽ giải A nhanh. Theo nghĩa này, B ít nhất khó bằng A đối với loại reduction đang xét.

Muốn chứng minh bài mới B là NP-hard, bắt đầu từ bài A đã biết NP-hard và xây `A ≤p B`. Chiều `B ≤p A` chỉ cho thấy B có thể nhờ A giải; nó không chứng minh B khó. Chuyển đổi cần có output dài đa thức và chứng minh cả hai chiều giữ đáp án, không chỉ mô tả một cách tạo dữ liệu có vẻ hợp lý.

H là NP-hard nếu mọi bài trong NP giảm được về H trong thời gian đa thức theo cách hiểu phù hợp. Nếu H còn là một bài quyết định thuộc NP, H là NP-complete. Bài tối ưu có thể được gọi NP-hard nhưng không tự mang nhãn NP-complete theo định nghĩa dành cho bài quyết định này.

## Một phép giảm có thể kiểm tra từng chiều

Từ Hamilton cycle trên đồ thị vô hướng n đỉnh, tạo đồ thị đầy đủ cùng đỉnh: cạnh gốc có trọng số 1, cạnh chưa có trọng số 2. Hỏi TSP quyết định có tour đi mỗi đỉnh một lần, quay về đầu và tổng không quá n không. Việc tạo nhiều nhất O(n²) cạnh là đa thức.

Nếu đồ thị gốc có Hamilton cycle, tour ấy dùng n cạnh trọng số 1 nên tổng n. Ngược lại, một tour trên n đỉnh có n cạnh, mỗi cạnh ít nhất 1. Tổng không quá n buộc tất cả đều là 1, tức đều là cạnh của đồ thị gốc. Tour ấy chính là Hamilton cycle ban đầu. Ngưỡng n và điều kiện quay về đầu là phần thiết yếu của chứng minh; thiếu chúng có thể làm hai bài không còn tương đương.

Khi đã biết Hamilton cycle NP-hard, phép giảm này chứng minh phiên bản TSP quyết định tương ứng NP-hard. Để kết luận NP-complete, còn nêu verifier của TSP: kiểm tra tour hợp lệ và cộng trọng số trong thời gian đa thức theo mã hóa.

## Độ khó tổng quát dẫn tới lựa chọn có điều kiện

NP-hard không chọn hộ một thuật toán thực tế. Với instance nhỏ, backtracking hoặc nhánh cận có thể đủ; với tham số nhỏ, DP theo tham số ấy có thể hợp lý. Approximation cần nêu tỷ lệ bảo đảm và giả định của phiên bản bài; heuristic cần đánh giá chất lượng nhưng không hứa tối ưu. Một lớp đồ thị đặc biệt có thể cho phép thuật toán tốt hơn lớp tổng quát.

Cần phân biệt “chưa tìm được lời giải tốt trong thời hạn”, “có lời giải hợp lệ nhưng chưa biết tối ưu” và “đã chứng minh không có”. Thất bại của một heuristic không phải chứng minh instance trả lời không. Ngược lại, một ví dụ nhỏ giải rất nhanh cũng không phủ nhận kết quả worst-case của cả lớp.

## Kiểm tra lập luận

**1.** Chứng chỉ cho clique ít nhất k đỉnh là gì? **2.** Vì sao bảng nW có thể rất lớn dù W viết ngắn? **3.** Để chứng minh B khó, mũi tên xuất phát ở đâu?

**Giải thích:** Đưa danh sách k đỉnh phân biệt và kiểm tra mọi cặp đều có cạnh; số cặp O(k²), nên verifier đa thức. W nhị phân b bit có thể gần `2^b`, nên bảng theo mọi giá trị đến W có kích thước mũ theo b. Reduction cần xuất phát từ một bài đã biết khó A và đi đến B: lời giải nhanh cho B sẽ kéo theo lời giải nhanh cho A. Nếu B thuộc NP nữa, mới đủ hai điều kiện NP-complete.

---
title: "P, NP, NP-hard: hiểu độ khó qua bài quyết định và phép reduction"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/complexity-classes"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 22
tags: ["complexity-theory", "p", "np", "np-complete", "reduction"]
description: "Phân biệt tìm nghiệm với kiểm tra chứng chỉ và hướng đúng của phép giảm."
draft: false
---

Trong lý thuyết độ phức tạp, ta thường xét **bài toán quyết định**: câu trả lời có/không. `P` là lớp giải được bằng thuật toán xác định trong thời gian đa thức theo kích thước **biểu diễn đầu vào**. `NP` là lớp mà một câu trả lời “có” có thể được xác minh trong thời gian đa thức từ một **chứng chỉ** độ dài đa thức. `P⊆NP`; câu hỏi `P=NP?` vẫn chưa được giải. “NP” không có nghĩa “không đa thức” hay “nhất thiết khó trong thực tế”.

## 1. Ví dụ chứng chỉ

Với bài Hamilton cycle quyết định, chứng chỉ là thứ tự các đỉnh trên chu trình. Ta kiểm tra mỗi đỉnh xuất hiện đúng một lần và mỗi cặp liên tiếp, kể cả cạnh quay về đầu, đều có cạnh: thời gian đa thức. Điều này đặt bài trong NP nhưng **không** cho thuật toán đa thức tìm chu trình.



Với 0/1 knapsack quyết định, câu hỏi có tập vật có tổng trọng lượng `<=W` và tổng giá trị `>=K` không? Chứng chỉ là bit chọn vật, kiểm tra bằng phép cộng. DP `O(nW)` không chứng minh bài thuộc P theo mã hóa nhị phân của `W`, vì `W` có thể lớn theo hàm mũ của số bit biểu diễn nó. Đây là lý do phân biệt pseudo-polynomial với polynomial.



```note-visualization
{"id":"hamilton-certificate","preset":"normal"}
```

## 2. NP-hard và NP-complete

Bài `H` là NP-hard nếu **mọi** bài trong NP có thể được giảm về `H` trong thời gian đa thức. Nếu `H` còn thuộc NP, nó là NP-complete. Bài tối ưu có thể là NP-hard mà không được gọi NP-complete theo định nghĩa lớp bài quyết định. Muốn chứng minh bài mới `B` là NP-hard, lấy một bài đã biết NP-hard `A`, xây phép giảm `A ≤p B`: giải được `B` nhanh thì giải được `A` nhanh. Hướng `B ≤p A` chỉ nói `B` không khó hơn `A`, không chứng minh `B` khó.

Một reduction phải biến mọi instance `x` thành instance `f(x)` trong thời gian đa thức và giữ đáp án: `x` là “có” khi và chỉ khi `f(x)` là “có”. Với chứng minh NP-complete còn cần chứng minh `B∈NP`. Ví dụ giảm từ Hamilton cycle sang TSP quyết định có thể đặt trọng số 1 cho cạnh hiện có, 2 cho cạnh còn thiếu trên đồ thị đầy đủ, hỏi có tour tổng không quá `n` không; tour đạt `n` phải dùng toàn cạnh gốc. Điều kiện tour đi mỗi đỉnh đúng một lần và quay về đầu là quan trọng.

## 3. Làm gì khi bài khó?

Độ khó trường hợp xấu không cấm giải instance nhỏ hoặc có cấu trúc. Các lựa chọn gồm backtracking/nhánh cận với cận tốt, DP theo tham số nhỏ, approximation có tỷ lệ bảo đảm, heuristic có đo lường nhưng không bảo đảm tối ưu, hoặc khai thác lớp đồ thị đặc biệt. Hãy nêu rõ chất lượng lời giải, điều kiện áp dụng và kích thước đầu vào đã xử lý; “NP-hard” không tự chọn hộ kỹ thuật.

**Tự luyện:** (1) Nêu chứng chỉ cho bài clique kích thước ít nhất `k`. (2) Vì sao DP `O(nW)` chưa chứng minh knapsack quyết định thuộc P? (3) Với mục tiêu chứng minh `B` NP-hard, vẽ đúng chiều mũi tên reduction.

*Đối chiếu: Jain, chương 21; Drozdek, chương 2 và phụ lục C.*

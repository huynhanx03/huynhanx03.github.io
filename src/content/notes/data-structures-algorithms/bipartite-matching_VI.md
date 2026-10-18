---
title: "Ghép cặp hai phía và bài toán phân công"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/bipartite-matching"
series: "DSA nâng cao"
seriesOrder: 17
tags: ["bipartite-matching", "augmenting-path", "assignment", "hopcroft-karp"]
description: "Từ đường tăng đến maximum matching, rồi phân biệt ghép cặp nhiều nhất với chi phí nhỏ nhất."
draft: false
updated: 2026-10-15
---

Có hai người A, B và hai việc 1, 2. A làm được cả hai việc, B chỉ làm được việc 1. Nếu ghép A với 1 trước, việc 2 còn trống nhưng B không nhận trực tiếp được. Tuy vậy ta vẫn ghép đủ hai người bằng cách đổi A sang 2 rồi ghép B với 1. Khả năng đổi các cặp đã nhận là trọng tâm của thuật toán matching.

Đồ thị hai phía chia đỉnh thành `L,R`, chỉ có cạnh giữa hai phía. Matching là tập cạnh không chung đầu mút. **Maximum** matching có số cạnh lớn nhất; **maximal** matching chỉ có nghĩa không thêm trực tiếp được một cạnh nữa. Matching `{A-1}` trong ví dụ là maximal nhưng chưa maximum.

## Đường tăng mô tả chính xác chuỗi đổi chỗ

Đường `B→1→A→2` bắt đầu ở đỉnh trái tự do, kết thúc ở đỉnh phải tự do, luân phiên cạnh chưa ghép và cạnh đã ghép. Bỏ `A-1`, thêm `B-1,A-2` làm số cặp tăng từ 1 lên 2. Tổng quát, trên một đường tăng, số cạnh chưa ghép nhiều hơn số đã ghép đúng một; lật trạng thái mọi cạnh vẫn giữ mỗi đỉnh có tối đa một đối tác.

Nếu còn đường tăng thì matching chưa tối ưu. Chiều ngược là định lý Berge: nếu có matching lớn hơn, xét các cạnh thuộc đúng một trong hai matching; các thành phần là đường hoặc vòng luân phiên. Một thành phần phải chứa nhiều cạnh của matching lớn hơn hơn matching hiện tại, tạo đường tăng cho matching hiện tại. Vì thế không còn đường tăng là chứng chỉ maximum, mạnh hơn điều kiện không thêm trực tiếp cạnh được.

```note-visualization
{"id":"bipartite-augment","preset":"normal"}
```

## DFS tìm chỗ mới cho đối tác cũ

Giữ `matchR[v]` là đỉnh trái đang ghép với đỉnh phải `v`, hoặc một sentinel nếu rảnh. Với một đỉnh trái cần ghép, thử láng giềng phải. Nếu rảnh thì nhận; nếu bận, thử tìm chỗ khác cho đối tác đang chiếm nó. Chỉ cập nhật ghép khi nhánh đệ quy thành công, để chuỗi thay thế dẫn tới một đỉnh rảnh thật sự.

`visited` ngăn xoay vòng trong một lượt tìm kiếm. Phải reset cho mỗi lượt tìm đường tăng vì matching đã thay đổi: một đỉnh bế tắc ở lượt trước có thể tham gia đường mới sau khi lật cặp. Giữ visited toàn cục dễ khiến quy trình dừng ở maximal thay vì maximum.

Mỗi lượt DFS xét tối đa `O(E)` cạnh và cách cài cơ bản thử tối đa `|L|` đỉnh trái, cho phần tìm kiếm `O(|L|E)`. Chi phí quản lý visited cũng cần được tính: xóa cả mảng dài V mỗi lượt có thể thêm `O(|L|V)`. Dùng số hiệu lượt thăm hoặc chỉ xóa các ô đã chạm, đồng thời bỏ qua đỉnh cô lập, tránh phần xóa toàn mảng ấy; vẫn có chi phí khởi tạo/đọc input `O(V+E)`.

Hopcroft–Karp dùng BFS phân tầng theo đường tăng ngắn nhất, rồi DFS tìm một tập **tối đại theo bao hàm** gồm các đường tăng ngắn nhất không chung đỉnh: không còn thêm được một đường cùng độ dài mà không giao tập đã chọn. Không cần tập có nhiều đường nhất, nhưng chỉ chọn tùy ý một vài đường là chưa đủ. Tính chặn này mới bảo đảm sau pha, mọi đường tăng còn lại dài hơn. Số pha là `O(√V)` với `V=|L|+|R|`; sau khi loại đỉnh cô lập, phần chính tốn `O(E√V)`, cộng `O(V)` xử lý các đỉnh ban đầu. [Cornell CS 6820: Matchings](https://www.cs.cornell.edu/courses/cs6820/2024fa/handouts/matchings.pdf) trình bày cách xây tập đường chặn và phân tích từng pha.

## Chuyển bài toán về luồng nguyên

Thêm nguồn nối mỗi đỉnh trái capacity 1; chuyển cạnh hai phía thành cạnh `L→R` capacity 1; mỗi đỉnh phải nối đích capacity 1. Matching kích thước `k` tạo luồng `k` bằng các đường `s→left→right→t`.

Chiều ngược, luồng nguyên trên mạng này chọn tối đa một cạnh qua mỗi đỉnh trái và phải vì hai cạnh biên capacity 1. Các cạnh giữa hai phía chảy 1 tạo matching. Thuật toán đường tăng với capacity nguyên duy trì tính nguyên, nên max-flow cho maximum matching. Tăng capacity có thể mô hình hóa mỗi người/nhóm nhận nhiều việc, nhưng lúc đó kết quả là biến thể capacity, không còn matching một-một nguyên bản.

```note-visualization
{"id":"matching-as-flow","preset":"normal"}
```

## Số cặp và tổng phí là hai mục tiêu khác nhau

Cho ma trận phí: A-1 giá 1, A-2 giá 2, B-1 giá 2, B-2 giá 100. Cả hai cách ghép đủ đều có 2 cặp. `{A-1,B-2}` tốn 101, `{A-2,B-1}` tốn 4. Maximum matching không có thông tin để ưu tiên cách thứ hai nếu chỉ xét tồn tại cạnh.

Bài assignment yêu cầu ghép mỗi người đúng một việc và tối thiểu tổng chi phí. Với ma trận vuông, Hungarian có cách cài chuẩn `O(n³)`. Mô hình mạng tổng quát có capacity/cost dùng [min-cost flow](/vi/notes/data-structures-algorithms/min-cost-flow/). Trước khi tối ưu phí vẫn phải xác định có đủ cặp hợp lệ; perfect matching không mặc nhiên tồn tại.

Cặp bị cấm nên biểu diễn bằng không có cạnh khi mô hình cho phép. Nếu dùng chi phí rất lớn trong ma trận, phải bảo đảm nó vượt mọi lời giải hợp lệ cần so và không làm tràn khi cộng; sau cùng vẫn kiểm tra có cặp cấm nào được nhận không. Một số lớn không biến phương án bất khả thi thành phương án hợp lệ.

```note-visualization
{"id":"min-cost-assignment","preset":"normal"}
```

**Tự kiểm tra:** đường nào sửa `{A-1}` thành hai cặp ở ví dụ đầu? Tại sao không còn cạnh thêm trực tiếp chưa đủ tối ưu? Hai perfect matching trong ma trận phí chênh nhau bao nhiêu?

**Giải thích:** lật `B-1-A-2`, bỏ A-1 rồi thêm B-1 và A-2. Matching có thể cần đổi một chuỗi cặp để tăng, dù không có cạnh nối hai đỉnh tự do trực tiếp. Hai tổng 101 và 4 chênh 97; kích thước matching bằng nhau không phản ánh chênh lệch phí. Khi thiết kế bài phân công, phải ghi cả yêu cầu về số người được ghép và tiêu chí chi phí.

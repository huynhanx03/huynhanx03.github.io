---
title: "Floyd–Warshall: mọi cặp đường đi qua những đỉnh trung gian"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/floyd-warshall"
series: "DSA nâng cao"
seriesOrder: 14
tags: ["floyd-warshall", "all-pairs-shortest-path", "dynamic-programming"]
description: "Một DP ba vòng với bất biến rõ ràng, xử lý vô cực và chu trình âm."
draft: false
updated: 2026-10-15
---

Khi câu hỏi là khoảng cách giữa mọi cặp thành phố, chạy một nguồn chỉ trả lời được một hàng của bảng. Floyd–Warshall trực tiếp xây bảng mọi cặp bằng một DP theo tập đỉnh trung gian được phép sử dụng. Thuật toán dùng `O(V³)` thời gian và `O(V²)` bộ nhớ, nên phù hợp đồ thị nhỏ hoặc vừa; với đồ thị thưa rất lớn, nhiều lần chạy thuật toán một nguồn có thể hợp hơn tùy trọng số.

## Mỗi lượt mở thêm một đỉnh trung gian

Gọi `D_k[i][j]` là khoảng cách từ `i` tới `j` khi các đỉnh ở giữa đường chỉ được thuộc `{0,...,k-1}`. Hai đầu `i,j` không bị hạn chế bởi tập ấy. Khi mở thêm đỉnh `k`, đường tối ưu hoặc không cần `k`, hoặc tách tại `k` thành hai đường `i→k`, `k→j`. Do đó:

`D_(k+1)[i][j] = min(D_k[i][j], D_k[i][k]+D_k[k][j])`.

Với cặp có khoảng cách hữu hạn và không chịu chu trình âm, có thể chọn đường tối ưu không lặp đỉnh, nên việc tách này đủ. Bất biến yêu cầu xử lý xong toàn bộ cặp `(i,j)` của một `k` trước khi sang `k` khác; đó là lý do vòng `k` ở ngoài.

Khởi tạo đường rỗng `dist[i][i]=0`, các cặp khác vô cực, rồi lấy min với trọng số từng cạnh. Cạnh song song chọn cạnh nhẹ nhất. Đặc biệt, tự khuyên trọng số âm phải làm đường chéo âm thay vì bị phép gán 0 phía sau ghi đè.

```go
for k := 0; k < n; k++ {
    for i := 0; i < n; i++ {
        for j := 0; j < n; j++ {
            if dist[i][k] == inf || dist[k][j] == inf { continue }
            via := dist[i][k] + dist[k][j]
            if via < dist[i][j] { dist[i][j] = via }
        }
    }
}
```

Đây là lõi Go, giả sử có ma trận `dist` kích thước `n×n` và sentinel `inf` cùng kiểu. Với các cặp hữu hạn không chịu chu trình âm, cập nhật tại chỗ giữ đúng DP: đi vòng qua `k` rồi quay lại `k` không tạo cải thiện nghiêm ngặt khi chu trình liên quan không âm. Nếu có chu trình âm, các số giảm không phải khoảng cách tối ưu hữu hạn; phần sau phân loại những cặp ấy.

`inf` phải lớn hơn mọi đáp án hữu hạn cần biểu diễn. Kiểm tra sentinel trước phép cộng ngăn “vô cực cộng số âm” thành một đường giả; vẫn phải bảo đảm tổng hai số hữu hạn không tràn. Chọn kiểu rộng và cận dựa vào đầu vào, không chỉ một hằng lớn tùy ý.

## Theo một ô thay đổi trong ma trận

Cho `0→1(3),1→2(-1),0→2(5)`. Bảng ban đầu:

| Từ / đến | 0 | 1 | 2 |
| --- | ---: | ---: | ---: |
| 0 | 0 | 3 | 5 |
| 1 | ∞ | 0 | -1 |
| 2 | ∞ | ∞ | 0 |

Ở lượt `k=0`, không có đường mới hữu ích vì không có cạnh từ 1 hay 2 về 0. Ở `k=1`, ô `(0,2)` thử `3+(-1)=2`, tốt hơn 5 nên đổi thành 2. Các cặp không có hai nửa đường hữu hạn bị bỏ qua. Lượt `k=2` không cải thiện thêm vì 2 không có đường ra ngoài nó.

Ví dụ minh họa việc ghép hai nửa đường; nó không phải lý do để đổi vòng lặp tùy ý. Đặt `i` ngoài cùng rồi `k` trong có thể khiến một cặp cần dữ liệu chỉ được tìm sau khi hàng đó đã đi qua, và một lượt duy nhất không bảo đảm đúng. Khi đổi thứ tự tính DP, phải xây lại chứng minh phụ thuộc thay vì suy từ một ma trận nhỏ tình cờ chạy đúng.

```note-visualization
{"id":"floyd-warshall","preset":"normal"}
```

Mỗi bộ ba `(k,i,j)` xét hằng số phép toán nên thời gian lập phương, kể cả khi đồ thị có ít cạnh. Nếu cần xuất đường, khởi tạo `next[i][j]=j` cho đường trực tiếp hợp lệ; khi cải thiện qua `k`, đặt `next[i][j]=next[i][k]`. Truy vết liên tiếp từ `i` về `j`, nhưng chỉ cho cặp tới được và không chịu chu trình âm.

## Chu trình âm ảnh hưởng những cặp nào?

Sau quá trình, đường chéo `dist[k][k]<0` chứng tỏ có một đường khép kín âm liên quan tới `k`. Nếu `i` tới được `k` và `k` tới được `j`, đường `i→k`, lặp chu trình, rồi `k→j` giảm mãi. Cặp `(i,j)` không có khoảng cách nhỏ nhất hữu hạn. Đây là điều kiện theo từng cặp, không phải cứ có đường chéo âm thì toàn ma trận mất ý nghĩa.

Ví dụ các cạnh `0→1(1),1→2(-2),2→1(1)` tạo chu trình âm giữa 1 và 2; thêm `2→3(1)`. Các đường từ 0 đến 1,2,3 bị ảnh hưởng. Đỉnh 4 cô lập vẫn có khoảng cách từ nó tới chính nó bằng 0 và không tới được các đỉnh khác. Muốn trả khoảng cách, cần đánh dấu các cặp đi qua được một `k` có đường chéo âm; muốn chỉ phát hiện chu trình âm bất kỳ, kiểm tra đường chéo đã đủ.

**Tự thử:** sau lượt `k=1` của ma trận ba đỉnh, ô nào thay đổi? Vì sao `inf+(-1)` nguy hiểm? Trong ví dụ có đỉnh 4 cô lập, khoảng cách `4→4` là gì?

**Giải thích:** chỉ `(0,2)` từ 5 thành 2. Sentinel có thể bị biến thành số nhỏ hơn chính nó và bị nhận sai là đường tới được; số máy còn có thể tràn. `4→4` vẫn bằng 0 vì không có đường tới chu trình âm và quay lại. Cần phân biệt không tới được, hữu hạn và không bị chặn dưới trong hợp đồng đầu ra.

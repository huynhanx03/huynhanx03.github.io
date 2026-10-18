---
title: "Đường đi ngắn nhất một nguồn: DAG, Dijkstra và Bellman–Ford"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/shortest-paths"
series: "DSA nâng cao"
seriesOrder: 13
tags: ["shortest-path", "dijkstra", "bellman-ford", "dag"]
description: "Chọn thuật toán theo cấu trúc cạnh và trọng số, hiểu relaxation và chu trình âm."
draft: false
updated: 2026-10-15
---

Một đường ít cạnh chưa chắc rẻ nhất: cạnh trực tiếp từ 0 đến 2 nặng 10, còn `0→1→2` nặng `2+2` chỉ bằng 4. Từ đây ta chuyển mục tiêu của BFS sang tối thiểu tổng trọng số. Việc chọn thuật toán phụ thuộc cấu trúc đồ thị và dấu của các trọng số.

Với nguồn `s`, khởi tạo `dist[s]=0`, còn lại vô cực. Giá trị hữu hạn đang giữ là trọng số của một đường đã tìm thấy, chưa nhất thiết tối ưu. Relax cạnh `u→v` trọng số `w` nghĩa là thử `dist[u]+w`, cập nhật `dist[v]` và `parent[v]=u` nếu tốt hơn. Chỉ cộng khi `u` tới được và kiểu số đủ chứa phép cộng; một sentinel vô cực không được tham gia như số bình thường.

## DAG cho sẵn thứ tự hoàn tất phụ thuộc

Nếu đồ thị có hướng không chu trình, xử lý đỉnh theo thứ tự topo rồi relax mọi cạnh đi ra. Khi đến `u`, mọi cạnh đi vào `u` đều đến từ đỉnh đã xử lý. Mọi đường tới `u` có tiền nhiệm cuối như vậy, nên không còn đường chưa xét có thể cải thiện `dist[u]`.

Với `0→1(4),0→2(5),1→2(-3)`, thứ tự `0,1,2` cho `dist[1]=4`, `dist[2]=5` sau 0; xử lý 1 giảm `dist[2]` thành 1. Cạnh âm không gây khó vì không có chu trình để một đường quay lại làm hỏng thứ tự phụ thuộc. Tính topo và duyệt cạnh đều `O(V+E)`, bộ nhớ phụ `O(V)` ngoài đồ thị.

```note-visualization
{"id":"dag-shortest-path","preset":"normal"}
```

## Dijkstra chốt khoảng cách nhờ tính không âm

Nếu đồ thị có chu trình nhưng mọi trọng số không âm, dùng min-heap chứa `(distance,vertex)`. Lấy cặp nhỏ nhất; nếu khoảng cách lưu trong cặp khác `dist[vertex]` hiện tại thì bản ghi đã cũ, bỏ qua. Nếu còn đúng, relax các cạnh đi ra và thêm bản ghi mới khi cải thiện.

Giả sử một đỉnh có nhãn nhỏ nhất `d` vừa lấy ra nhưng còn đường tốt hơn chưa được tìm. Trên đường ấy, xét điểm đầu tiên ra khỏi tập đã chốt. Phần đi tới biên không thể đắt hơn cả đường vì các cạnh còn lại không âm; relaxation từ phần đã chốt phải tạo một nhãn nhỏ hơn `d`, trái với việc heap vừa lấy nhãn nhỏ nhất. Đây là nơi giả định không âm được dùng; cạnh trọng số 0 vẫn hợp lệ.

Phản ví dụ cho việc chốt với cạnh âm: `s→a(2),s→b(5),b→a(-4)`. Chốt `a` ở 2 trước `b` là quá sớm vì đường qua `b` có giá trị 1. Một biến thể cho phép mở lại đỉnh có thể sửa vài đầu vào như vậy, nhưng không còn chứng minh và cận chuẩn của Dijkstra; không dùng điều ấy làm bảo đảm cho cạnh âm.

```note-visualization
{"id":"dijkstra","preset":"normal"}
```

Với heap nhị phân có decrease-key, cận chuẩn là `O((V+E)log V)`. Cách thêm bản ghi mới có thể giữ `O(E)` bản ghi, nên cận tổng quát là `O(V+E log(E+1))` và bộ nhớ `O(V+E)`. Với đồ thị đơn, `E<=V²`, cách viết thông dụng `O((V+E)log V)` vẫn phù hợp. Cạnh song song không bị chặn số lượng theo `V`, nên không nên bỏ điều kiện này khi giải thích lazy heap.

## Bellman–Ford cho phép nhãn cải thiện nhiều lượt

Nếu không thể dùng thứ tự DAG hay trọng số không âm, relax toàn bộ cạnh trong `V-1` lượt. Mọi đường đơn có tối đa `V-1` cạnh. Sau lượt thứ `k`, ít nhất mọi khoảng cách tốt nhất dùng không quá `k` cạnh đã được bao phủ. Nếu cập nhật tại chỗ, một lượt có thể truyền xa hơn `k` cạnh tùy thứ tự cạnh; không nên hiểu phát biểu đó là nhãn chỉ chứa đường đúng `k` cạnh.

Với ví dụ `0→1(4),0→2(5),1→2(-3)`, thứ tự cạnh như viết cho kết quả `[0,4,1]` ngay lượt đầu. Nếu xét `1→2` trước, cần lượt sau để dùng nhãn 4 của đỉnh 1. Lặp đủ lượt làm kết quả không phụ thuộc sự thuận lợi ấy. Một lượt không đổi cho phép dừng sớm.

```note-visualization
{"id":"bellman-ford","preset":"normal"}
```

Sau `V-1` lượt, nếu lượt tiếp theo còn cải thiện từ một đỉnh **tới được từ nguồn**, có chu trình âm ảnh hưởng đến một phần khoảng cách. Đi quanh chu trình nhiều lần làm tổng giảm không giới hạn. Những đỉnh đi tiếp được từ chu trình cũng không có khoảng cách hữu hạn; các đỉnh không tới được chu trình hay không đi từ nó đến được có thể vẫn có đáp án bình thường. Muốn đánh dấu toàn bộ phần bị ảnh hưởng, lan từ các đỉnh còn được cải thiện theo cạnh đi ra.

Bellman–Ford dùng `O(VE)` thời gian và `O(V)` bộ nhớ phụ. Với đỉnh không tới được, giữ vô cực và không truy parent. Với đỉnh chịu chu trình âm, cũng không được coi parent hiện có là một đường ngắn nhất hữu hạn.

**Tự kiểm tra:** vì sao DAG nhận cạnh âm còn Dijkstra cần không âm? Bellman–Ford ở ví dụ ba cạnh trả gì? Một chu trình âm ở thành phần tách rời có làm mọi khoảng cách từ `s` vô nghĩa không?

**Giải thích:** DAG dựa vào thứ tự tiền nhiệm, Dijkstra dựa vào việc phần đường chưa đi không thể giảm chi phí. Ví dụ trả `[0,4,1]`. Chu trình âm không tới được từ nguồn không ảnh hưởng bài toán một nguồn; chỉ những đỉnh nằm sau chu trình âm tới được mới mất cận dưới hữu hạn.

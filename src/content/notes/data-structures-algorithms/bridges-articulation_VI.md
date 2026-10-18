---
title: "Cầu, đỉnh khớp và low-link trong đồ thị vô hướng"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/bridges-articulation"
series: "DSA nâng cao"
seriesOrder: 12
tags: ["bridge", "articulation-point", "low-link", "dfs"]
description: "Từ thời điểm DFS suy ra cạnh hoặc đỉnh nào làm đồ thị mất kết nối."
draft: false
updated: 2026-10-15
---

Trong một mạng vô hướng, một tuyến nối bị hỏng có thể chia mạng thành hai phần; một nút trung chuyển bị hỏng cũng có thể gây điều tương tự. Ta gọi cạnh kiểu thứ nhất là cầu, đỉnh kiểu thứ hai là đỉnh khớp. Cụ thể, xóa cạnh cầu làm tăng số thành phần liên thông; xóa đỉnh khớp cùng mọi cạnh kề cũng làm số thành phần tăng.

Thử xóa lần lượt rồi DFS lại sẽ lặp rất nhiều công việc. Một DFS cùng thông tin về đường quay về tổ tiên đủ để tìm cả hai trong `O(V+E)`. Bài này xét đồ thị vô hướng; low-link dùng cho SCC có quy tắc stack khác và không nên chép nguyên điều kiện sang đây.

## Low ghi nhận đường thoát khỏi một cây con

Khi vào đỉnh `u`, gán thời điểm `tin[u]` và khởi tạo `low[u]=tin[u]`. `low[u]` là thời điểm nhỏ nhất có thể đạt từ cây con DFS của `u` bằng các cạnh cây đi xuống rồi tối đa một cạnh ngược về tổ tiên. Sau cạnh cây `u-v`, lấy `min(low[u],low[v])`. Với cạnh ngược `u-w`, lấy `min(low[u],tin[w])`.

Hãy hình dung cắt cạnh cây nối `u` với con `v`. Mọi đỉnh trong cây con `v` vẫn nối với nhau qua cây DFS. Câu hỏi duy nhất là có đường nào ra phần phía trên bằng một cạnh khác không. Low cô đọng thông tin ấy thành việc có chạm được chính `u` hoặc tổ tiên của `u` hay không.

Trong đồ thị vô hướng, hai bản ghi adjacency của cạnh cây không phải hai đường độc lập. Khi ở `v`, phải bỏ đúng **ID cạnh** vừa đi từ cha xuống. Nếu chỉ bỏ `neighbor==parent`, code sẽ bỏ cả một cạnh song song thật sự khác và mất thông tin về đường thay thế.

## Vì sao cầu dùng dấu lớn hơn nghiêm ngặt?

Cạnh cây `(u,v)` là cầu khi `low[v]>tin[u]`. Khi đó cây con `v` không có cạnh ngược tới `u` hay phía trên, nên xóa cạnh cây tách nó khỏi phần còn lại. Nếu `low[v]==tin[u]`, vẫn có đường khác quay về chính `u`; cạnh cây không phải cầu.

Cạnh không thuộc cây DFS nằm trên chu trình tạo bởi nó cùng đường cây nối hai đầu, nên không thể là cầu. Điều này giải thích vì sao chỉ kiểm tra điều kiện cho cạnh cây sau khi đã xử lý xong con.

```note-visualization
{"id":"bridges-lowlink","preset":"normal"}
```

## Xóa đỉnh còn xóa cả chỗ đường vòng quay về

Với đỉnh `u` không phải gốc, điều kiện khớp là tồn tại con DFS `v` có `low[v]>=tin[u]`. Dấu bằng lúc này cũng nguy hiểm: cây con quay về được `u` nhưng không tới được tổ tiên của `u`; xóa chính `u` làm đường vòng ấy mất luôn.

Gốc không có phần tổ tiên phía trên nên cần điều kiện riêng. Gốc là khớp khi có ít nhất hai **con DFS**. Nếu chỉ một con, mọi đỉnh còn lại trong thành phần được thăm qua nhánh đó và vẫn nối nhau khi bỏ gốc. Số láng giềng của gốc không thay thế được số con DFS: trong một tam giác, gốc có hai láng giềng nhưng chỉ một con cây nếu DFS đi xuyên hết từ nhánh đầu.

```note-visualization
{"id":"articulation-lowlink","preset":"normal"}
```

## Theo tam giác có một nhánh treo

Xét `0-1-2-0` cùng cạnh `2-3`. DFS theo `0→1→2→3` cho `tin=[0,1,2,3]`. Cạnh `2-0` hạ `low[2]` về 0. Đỉnh 3 không có cạnh thoát khác nên giữ low bằng 3. Khi trở về 2, `3>2` xác nhận cạnh `2-3` là cầu; đồng thời `3>=2` xác nhận 2 là khớp.

Sau khi quay hết, low là `[0,0,0,3]`. Cạnh `1-2` không phải cầu vì low của 2 chạm được 0. Đỉnh 1 không phải khớp vì cây con 2 đi vòng về 0 mà không cần 1. Gốc 0 chỉ có con DFS 1 nên cũng không phải khớp. Ví dụ cho thấy chỉ nhìn hình dạng cạnh cây mà không xét cạnh ngược sẽ kết luận sai.

## Những chi tiết giữ kết quả đúng ngoài ví dụ đơn

Đồ thị có nhiều thành phần cần mở DFS ở từng đỉnh chưa thăm, mỗi lượt có gốc riêng. Hai cạnh song song nối cùng cặp đỉnh không cạnh nào là cầu: bỏ một vẫn còn cạnh kia. Cạnh khuyên (self-loop) không nối hai phần khác nhau nên không tạo cầu; quy ước bậc và adjacency phải nhất quán nhưng không thay lập luận low cơ bản.

Mỗi bản ghi kề xử lý một lần; thời gian `O(V+E)`, các mảng và stack phụ `O(V)`. DFS đệ quy có thể sâu tuyến tính ở một đường dài. Nếu chuyển sang stack tường minh, vẫn phải giữ sự kiện trở về từ con để cập nhật low **sau** khi con hoàn tất.

**Tự kiểm tra:** low của 3 trong ví dụ bằng bao nhiêu? Vì sao cầu dùng `>` còn khớp dùng `>=`? Gốc có bậc 5 luôn là khớp không?

**Giải thích:** low của 3 là 3 vì không có cạnh ngược. Khi bỏ cạnh, đường quay lại chính cha còn cứu kết nối; khi bỏ đỉnh cha, đường ấy cũng bị xóa. Gốc bậc 5 có thể chỉ có một con DFS nếu các nhánh nối với nhau, nên phải đếm con DFS chứ không đếm bậc.

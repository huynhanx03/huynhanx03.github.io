---
title: "Thứ tự topo và thành phần liên thông mạnh trong đồ thị có hướng"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/topological-scc"
series: "DSA nâng cao"
seriesOrder: 11
tags: ["topological-sort", "scc", "dag", "kahn", "tarjan"]
description: "Sắp phụ thuộc trên DAG và gom chu trình thành các thành phần mạnh."
draft: false
updated: 2026-10-15
---

Muốn chạy bước triển khai, ta phải build xong; muốn build, phải có mã nguồn và dependency. Một cạnh `u→v` biểu diễn việc `u` phải đứng trước `v`. Thứ tự topo là cách xếp mọi đỉnh sao cho tất cả ràng buộc đó đều đúng. Nó chỉ tồn tại trên đồ thị có hướng không chu trình, gọi là DAG.

Khi có phụ thuộc vòng, thay vì cố xếp các đỉnh trong vòng thành một hàng, ta có thể gom nhóm những đỉnh tới được lẫn nhau. Phần sau dùng SCC để tạo các nhóm ấy rồi thu lại một DAG ở cấp nhóm.

## Kahn: loại những việc đã hết tiền nhiệm

Tính `indegree[v]`, số cạnh đi vào từng đỉnh. Đưa mọi đỉnh indegree 0 vào queue. Lấy `u`, ghi vào kết quả, giảm indegree của mỗi đỉnh ở đầu kia cạnh `u→v`; khi về 0 thì đưa `v` vào queue. Indegree ở đây phải được hiểu là số cạnh đi vào **từ phần chưa xử lý**, nên giảm nó chính là xóa tác động của công việc đã hoàn tất.

Với `0→1,0→2,1→3,2→3`, indegree ban đầu `[0,1,1,2]`. Lấy 0 làm cả 1 và 2 sẵn sàng. Lấy 1 giảm indegree của 3 còn 1, chưa được nhận; lấy 2 mới đưa nó về 0. Hai kết quả `0,1,2,3` và `0,2,1,3` đều đúng.

Nếu thêm `3→1`, sau khi lấy 0 rồi 2, queue rỗng nhưng 1 và 3 vẫn chờ nhau. Kết quả chỉ có 2 trong 4 đỉnh nên không có topo toàn đồ thị. Tập chưa xử lý chứa một chu trình, nhưng không phải mọi đỉnh còn lại nhất thiết nằm trên chu trình: một đỉnh phụ thuộc vào vòng cũng có thể mắc kẹt phía sau.

```note-visualization
{"id":"kahn-topo","preset":"normal"}
```

Mỗi đỉnh vào queue một lần và mỗi cạnh giảm indegree một lần, nên `O(V+E)` thời gian, `O(V)` bộ nhớ phụ. Muốn topo nhỏ nhất theo ID, thay queue bằng min-heap để luôn chọn đỉnh sẵn sàng nhỏ nhất. Một cận đơn giản là `O((V+E)log V)`; thực tế chỉ thao tác heap theo đỉnh, còn việc quét cạnh vẫn tuyến tính.

## DFS đặt đỉnh vào kết quả khi đã xong phần sau

DFS có thể ghi đỉnh sau khi xử lý mọi cạnh đi ra rồi đảo thứ tự hoàn tất. Với cạnh `u→v` trên DAG, `v` phải hoàn tất trước `u` nếu được DFS từ `u`, hoặc đã hoàn tất từ nhánh khác. Khi đảo danh sách, `u` đứng trước `v` như yêu cầu.

Điều kiện DAG phải được kiểm tra. Dùng ba màu để biết đỉnh chưa vào, đang trên stack hay đã xong. Cạnh tới một đỉnh đang trên stack đóng chu trình; một cờ visited duy nhất không phân biệt được tình huống đó với cạnh tới phần đã xong. DFS cũng `O(V+E)` và stack có thể sâu `O(V)`.

```note-visualization
{"id":"dfs-topo","preset":"normal"}
```

## SCC biến quan hệ đi lại hai chiều thành một nhóm

`u,v` cùng thành phần liên thông mạnh khi có đường `u→v` và `v→u`. Mỗi SCC là tập cực đại theo quan hệ ấy. Với `0↔1,1→2,2↔3`, có hai nhóm `{0,1}`, `{2,3}` và một cạnh giữa hai nhóm theo chiều từ nhóm đầu sang nhóm sau.

Co mỗi SCC thành siêu đỉnh tạo đồ thị ngưng tụ. Đồ thị này không thể có chu trình: nếu các nhóm đi quanh một vòng, từ nhóm nào cũng đến và quay lại mọi nhóm trên vòng, nên chúng phải là một SCC duy nhất. Do đó có thể lập lịch ở cấp nhóm, dù bên trong mỗi nhóm vẫn cần cách giải quyết phụ thuộc vòng riêng.

```note-visualization
{"id":"scc-condensation","preset":"normal"}
```

## Tarjan: giữ những đỉnh chưa được chốt nhóm

DFS gán `disc[u]` là thời điểm phát hiện và đẩy `u` vào stack SCC. Stack này khác call stack: một lời gọi có thể trả về nhưng đỉnh vẫn còn trên stack SCC cho đến khi nhóm của nó được chốt. `low[u]` lưu chỉ số phát hiện nhỏ nhất kết nối được theo quy tắc DFS tới phần còn mở ấy.

Với cạnh cây tới `v` chưa thăm, DFS `v` rồi cập nhật `low[u]=min(low[u],low[v])`. Với cạnh tới `v` đã thăm và **còn trên stack SCC**, dùng `disc[v]`. Nếu `v` đã được pop vào SCC hoàn chỉnh, không dùng cạnh đó để hạ low. Đây là các nhánh của phiên bản Tarjan đang trình bày; dùng `low[v]` thay `disc[v]` ở nhánh cạnh đã thăm sẽ đổi ý nghĩa bất biến và không nên trộn tùy ý giữa các biến thể.

Khi `low[u]==disc[u]`, không có kết nối cần giữ nhóm của `u` mở với một đỉnh được phát hiện trước nó. Pop đến và gồm `u`; các đỉnh vừa pop tạo một SCC. Mỗi đỉnh vào/ra stack một lần, mỗi cạnh xét một lần: thời gian `O(V+E)`, bộ nhớ phụ `O(V)`.

```note-visualization
{"id":"tarjan-scc","preset":"normal"}
```

Kosaraju tách công việc thành hai lượt: DFS đồ thị gốc lấy thứ tự hoàn tất, đảo chiều toàn bộ cạnh, rồi DFS theo thứ tự hoàn tất giảm dần. Mỗi lượt DFS thứ hai thu đúng một SCC. Cách này dùng thêm biểu diễn đồ thị đảo và cũng tuyến tính theo `V+E`; tổng bộ nhớ phải tính cả các cạnh đảo, ngoài các mảng `O(V)`.

```note-visualization
{"id":"kosaraju-scc","preset":"normal"}
```

**Tự kiểm tra:** Kahn trả thiếu đỉnh chứng minh điều gì? Đồ thị ví dụ có những SCC nào? Cạnh đến SCC đã đóng có hạ low trong Tarjan này không?

**Giải thích:** nó chứng minh còn chu trình trong phần chưa loại, không chứng minh từng đỉnh còn lại đều nằm trên vòng. Hai SCC là `{0,1}` và `{2,3}`, ngưng tụ là một cạnh có hướng. Cạnh tới nhóm đã đóng bị bỏ trong cập nhật low, vì nhóm ấy không còn thuộc phần stack đang chờ ghép. Phân biệt hai loại stack là bước quan trọng khi tự mô phỏng Tarjan.

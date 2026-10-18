---
title: "Luồng chi phí cực tiểu: gửi đủ hàng với tổng giá nhỏ nhất"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/min-cost-flow"
series: "DSA nâng cao"
seriesOrder: 27
tags: ["graph", "min-cost-flow", "residual-network", "potentials"]
description: "Kết hợp capacity với cost, dùng cạnh ngược và đường tăng rẻ nhất trong mạng thặng dư."
draft: false
updated: 2026-10-15
---

Max-flow hỏi gửi được bao nhiêu hàng. Nếu mỗi tuyến còn có phí trên một đơn vị, ta muốn gửi **đúng F** với tổng phí nhỏ nhất. Gửi rẻ nhưng thiếu hàng chưa đáp ứng bài toán; khi mạng không đủ capacity, thuật toán phải báo bất khả thi hoặc trả riêng lượng đã gửi và trạng thái chưa đủ.

Bài này nối [mạng thặng dư](/vi/notes/data-structures-algorithms/max-flow/) với đường đi ngắn nhất. Để trình bày successive shortest augmenting path rõ ràng, trước hết giả sử capacity và `F` nguyên không âm, chi phí hữu hạn, luồng đầu bằng 0 và **không có chu trình âm** trong mạng thặng dư ban đầu. Mọi cost gốc không âm là một điều kiện đủ dễ kiểm tra cho giả định cuối.

## Hủy một đơn vị phải trả lại đúng chi phí của nó

Cạnh gốc `u→v` capacity 3, cost 5, đang chảy 2 có cạnh thặng dư tiến capacity 1 cost 5, cạnh ngược capacity 2 cost -5. Giảm một đơn vị luồng cũ phải giảm tổng phí 5, nên cost ngược có dấu âm. Ngay cả cost gốc không âm cũng không giữ mạng thặng dư luôn không âm sau khi tăng luồng.

Mỗi lượt tìm đường rẻ nhất trong mạng thặng dư, đẩy `delta=min(bottleneck,F-flow)`, cập nhật capacity cặp cạnh và cộng `delta*pathCost` vào chi phí. Cạnh ngược tham gia đường tìm kiếm như các cạnh khác; bỏ nó sẽ khiến quyết định cũ không sửa được.

## Một đường tăng có thể đổi hai tuyến đang dùng

Cho tất cả capacity bằng 1 và cost trong ngoặc: `s→a(0),s→b(0),a→b(0),a→t(1),b→t(0)`. Lượt đầu có thể chọn `s→a→b→t` cost 0. Lượt thứ hai dùng `s→b→a→t` cost 1, trong đó `b→a` là cạnh ngược cost 0 của `a→b`.

Sau hai lượt, `a→b` trở lại luồng 0. Hai tuyến thật là `s→a→t` cost 1 và `s→b→t` cost 0, tổng bằng 1. Nếu chỉ xét cạnh theo hướng gốc còn capacity sau lượt đầu, không còn đường thứ hai và ta sẽ báo thiếu hàng sai. Nếu cạnh bị hủy có phí dương, cost âm của cạnh ngược còn bảo đảm tính lại tổng phí đúng.

```note-visualization
{"id":"min-cost-flow","preset":"normal"}
```

## Potential thay đổi nhãn cạnh nhưng giữ so sánh giữa các đường

Dijkstra cần trọng số không âm, nên không chạy trực tiếp trên các cost thặng dư có thể âm. Gán potential `h[v]`, tạo reduced cost `w'(u,v)=w(u,v)+h[u]-h[v]`. Trên một đường `s→t`, các potential nội bộ triệt tiêu, nên `cost'=cost+h[s]-h[t]`. Mọi đường cùng hai đầu được cộng cùng một lượng, do đó đường rẻ nhất không thay đổi.

Nếu reduced cost không âm trên phần mạng tới được từ nguồn, dùng Dijkstra tìm `dist'`. Sau đó cộng `dist'[v]` vào `h[v]` cho các đỉnh tới được. Bất đẳng thức đường ngắn nhất `dist'[v]<=dist'[u]+w'(u,v)` làm reduced cost mới không âm trên các cạnh liên quan. Các cạnh ngược mới của đường ngắn nhất có reduced cost 0, nên lượt sau vẫn dùng được Dijkstra.

Với cost gốc không âm, bắt đầu `h=0`. Nếu có cạnh âm nhưng không có chu trình âm, có thể khởi tạo potential bằng khoảng cách Bellman–Ford; muốn potential hợp lệ trên toàn mạng, thêm siêu nguồn nối cost 0 đến mọi đỉnh khi tính bước khởi tạo. Giá đường thật trước khi cập nhật potential là `dist'[t]-h[s]+h[t]`; lưu ý dùng các giá trị `h` cùng thời điểm, tránh trộn trước/sau cập nhật.

## Tại sao đường tăng rẻ nhất giữ được tối ưu?

Với một lượng luồng cố định, nếu mạng thặng dư có chu trình cost âm và capacity dương, đẩy quanh vòng làm chi phí giảm mà giá trị luồng không đổi. Ngược lại, chênh lệch với một luồng cùng giá trị tốt hơn có thể phân rã thành các vòng thặng dư; phải có vòng giảm phí. Vì vậy không có chu trình âm là tiêu chuẩn tối ưu cho lượng luồng hiện tại.

Dưới giả định khởi đầu nêu trên, luồng 0 đã tối ưu cho lượng 0. Tăng theo đường rẻ nhất và cập nhật potential duy trì không có vòng cải thiện, nên sau mỗi lượt ta có luồng rẻ nhất cho lượng đã gửi. Cạnh ngược làm tiêu chuẩn này xét được cả việc sửa quyết định trước.

Nếu mạng đầu vào đã có chu trình âm, luồng 0 có thể chưa tối ưu ngay cả với lượng 0: gửi một circulation quanh vòng làm giảm phí mà không gửi thêm từ `s` tới `t`. Chu trình capacity hữu hạn không tự làm lời giải vô hạn, nhưng cần xử lý circulation/chu trình âm bằng thuật toán phù hợp. Chỉ chạy Bellman–Ford rồi tiếp tục không sửa được giả định đó; bài này không cung cấp bộ giải tổng quát cho trường hợp ấy.

## Dữ liệu và cận chi phí của một cài đặt

Lưu cạnh `(to,rev,cap,cost)`, tạo tiến `(c,w)` và ngược `(0,-w)` cùng lúc. Sau Dijkstra lưu cả `parentVertex` lẫn `parentEdgeIndex`: một lượt truy ngược tìm bottleneck, lượt sau cập nhật đúng cặp cạnh. Kiểm tra đích tới được trước; nếu không thì không thể hoàn thành `F` bằng quy trình đang xét.

Mỗi lượt capacity nguyên tăng ít nhất 1 nên tối đa `F` lượt, có thể ít hơn vì đẩy bottleneck lớn. Với cài Dijkstra `O(E log V)`, cận đơn giản `O(FE log V)`, cộng bước khởi tạo Bellman–Ford `O(VE)` nếu dùng. Lazy heap trên multigraph cần tính cận theo số bản ghi, không mặc định `log E=O(log V)`. Tích `delta*pathCost` và tổng phí có thể tràn `int`; cần kiểu và giới hạn phù hợp.

**Tự thử:** tại sao cost ngược là -5? Maximum matching có giải assignment rẻ nhất không? Có chu trình âm ban đầu thì potential từ Bellman–Ford luôn tồn tại không?

**Giải thích:** hủy một đơn vị phải hoàn lại 5 phí. Matching nhiều nhất chỉ tối ưu số cặp, còn assignment tối ưu phí cần thêm mục tiêu cost. Chu trình âm làm khoảng cách phù hợp không hữu hạn và không có potential toàn mạng khiến mọi reduced cost không âm; phải xử lý giả định/thuật toán trước, không dùng Dijkstra như thể chỉ có một vài cạnh âm thông thường.

*Đọc thêm: [VNOI — Min-cost flow](https://wiki.vnoi.info/algo/graph-theory/min-cost-flow).*

[Princeton COS 226 — Mincost flow](https://www.cs.princeton.edu/courses/archive/spr03/cs226/lectures/mincost.4up.pdf) — mạng thặng dư và reduced cost.

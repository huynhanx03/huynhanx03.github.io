---
title: "Luồng cực đại: mạng thặng dư và lát cắt nhỏ nhất"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/max-flow"
series: "DSA nâng cao"
seriesOrder: 16
tags: ["max-flow", "residual-network", "min-cut", "edmonds-karp"]
description: "Hiểu cạnh ngược, đường tăng luồng và chứng chỉ tối ưu từ min-cut."
draft: false
updated: 2026-10-15
---

Một mạng có nhiều tuyến gửi hàng từ nguồn `s` tới đích `t`, mỗi tuyến có sức chứa. Chọn được một đường chưa đủ: lựa chọn đầu có thể chặn tuyến cần cho các lượt sau. Luồng cực đại giải bài toán này bằng cách giữ cả khả năng gửi thêm lẫn khả năng rút lại quyết định cũ.

Mạng là đồ thị có hướng với capacity không âm. Mỗi cạnh gốc giữ luồng `0<=f<=c`. Ở mọi đỉnh khác `s,t`, tổng vào bằng tổng ra; không thể tự tạo hoặc làm mất hàng. Giá trị luồng là lượng rời nguồn ròng, tức tổng ra trừ tổng vào. Bài toán tìm giá trị lớn nhất, không gán chi phí ưu tiên cho các tuyến.

## Cạnh ngược là quyền hủy một phần lựa chọn

Cạnh gốc `u→v` capacity 5 đang chảy 3 tạo hai khả năng thặng dư: tiến `u→v` còn 2, ngược `v→u` có 3. Đi tiến tăng luồng gốc; đi ngược giảm luồng gốc. Hai khả năng này không phải hai cạnh vận tải gốc độc lập.

Xét các cạnh capacity 1: `s→a,s→b,a→b,a→t,b→t`. Lượt đầu chọn `s→a→b→t`, đạt 1 nhưng làm kín `s→a` và `b→t`. Nếu chỉ tìm đường chưa dùng theo hướng gốc, ta tưởng hết đường. Mạng thặng dư vẫn có `s→b→a→t`: đoạn `b→a` hủy luồng trên `a→b`. Sau khi tăng, luồng thật đi `s→a→t` và `s→b→t`, đạt 2. Cạnh ngược cho phép sửa cách phân tuyến mà không phải xây lại mọi thứ từ đầu.

```note-visualization
{"id":"max-flow-augment","preset":"normal"}
```

Mỗi đường tăng chỉ dùng cạnh thặng dư dương. Lấy `delta` là capacity nhỏ nhất trên đường, tăng/giảm tương ứng rồi cập nhật hai bản ghi thặng dư. Bottleneck bảo đảm không vượt capacity. Các đỉnh trung gian cùng nhận và gửi thêm `delta`, nên bảo toàn vẫn đúng; giá trị luồng tăng đúng `delta`.

## Tìm đường bằng cách nào quyết định cận thời gian

Ford–Fulkerson lặp tìm một đường tăng bất kỳ. Với capacity nguyên, mọi giá trị thặng dư và `delta` vẫn nguyên, nên mỗi lượt tăng ít nhất 1 và kết thúc sau nhiều nhất `F*` lượt, với `F*` là luồng cực đại. Một tìm đường `O(V+E)` cho cận phụ thuộc giá trị số `F*`; đây không phải bảo đảm đa thức theo số bit capacity.

Với capacity thực tùy ý, đặc biệt số vô tỉ, lựa chọn đường bất lợi có thể tạo quá trình không kết thúc. Không thể giữ lập luận “mỗi lượt tăng ít nhất một” nếu đã bỏ giả định nguyên.

Edmonds–Karp dùng BFS tìm đường thặng dư ít cạnh nhất. Sau các lần tăng, khoảng cách BFS thặng dư không giảm. Một cạnh trở thành bottleneck bão hòa nhiều lần chỉ sau khi các đường đi liên quan tăng độ dài; phân tích này chặn tổng số lượt bởi `O(VE)`. Mỗi BFS `O(V+E)`, cho cận chuẩn `O(VE²)` theo biểu diễn mạng thông dụng. Cận không phụ thuộc độ lớn luồng như Ford–Fulkerson chọn đường tùy ý.

## Lát cắt biến kết quả thành chứng chỉ tối ưu

Một lát cắt `(S,T)` có `s∈S,t∈T`. Capacity cắt là tổng capacity **cạnh gốc** đi từ `S` sang `T`. Cộng các phương trình bảo toàn ở mọi đỉnh trong `S` làm các cạnh nội bộ triệt tiêu, nên giá trị luồng bằng luồng qua cắt theo chiều đi trừ chiều về. Đại lượng ấy không vượt capacity cắt. Mọi cắt do đó là một cận trên cho mọi luồng.

Khi không còn đường tăng, lấy `S` là mọi đỉnh tới được từ `s` bằng cạnh thặng dư dương. Mỗi cạnh gốc `S→T` đã bão hòa, nếu không đầu bên `T` cũng tới được. Mỗi cạnh gốc `T→S` có luồng bằng 0, nếu có thì cạnh thặng dư ngược cho phép từ `S` tới `T`. Vì vậy giá trị luồng đúng bằng capacity cắt này. Một nghiệm đạt cận trên là tối ưu, và lát cắt cũng nhỏ nhất.

```note-visualization
{"id":"min-cut","preset":"normal"}
```

Hai đường độc lập từ `s` tới `t` có bottleneck 2 và 3 gửi được tổng 5. Nếu các cạnh rời nguồn của hai đường lần lượt capacity 2 và 3, lát cắt chỉ chứa `s` có capacity 5. Ta vừa có cách gửi 5 vừa có chứng chỉ không thể vượt 5, thay vì chỉ tin thuật toán đã dừng.

## Giữ đúng cặp cạnh trong cài đặt

Mỗi bản ghi thặng dư nên lưu chỉ số `rev` của cạnh ngược tương ứng. Với cạnh song song hoặc hai cạnh gốc ngược hướng, có nhiều bản ghi cùng hai đầu nhưng vai trò khác nhau. Cập nhật theo cặp đỉnh đơn thuần có thể hủy sai cạnh. Một ma trận có thể dùng được với quy ước gộp và biểu diễn nhất quán, nhưng không được mặc định một ô lưu đủ danh tính để truy vết từng cạnh.

Chọn kiểu đủ rộng cho capacity và tổng luồng; nguồn/đích phải hợp lệ và thường yêu cầu khác nhau. Kiểm tra đích tới được trước khi truy parent, nếu không sẽ đọc một đường tăng không tồn tại.

**Tự kiểm tra:** cạnh capacity 5 chảy 3 còn hai capacity thặng dư nào? Vì sao luồng trên cạnh `T→S` phải bằng 0 ở cắt cuối? Bỏ cạnh ngược làm ví dụ năm cạnh sai thế nào?

**Giải thích:** tiến còn 2, ngược có 3. Luồng chiều về dương sẽ sinh cạnh thặng dư từ `S` sang `T`, trái định nghĩa tập tới được. Bỏ cạnh ngược mắc kẹt ở 1 dù có hai tuyến độc lập cuối cùng; đó là lỗi mô hình trạng thái, không chỉ lỗi chọn đường chưa khéo.

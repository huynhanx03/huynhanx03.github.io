---
title: "Cây khung nhỏ nhất: Kruskal, Prim và tính chất lát cắt"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/minimum-spanning-trees"
series: "DSA nâng cao"
seriesOrder: 15
tags: ["mst", "kruskal", "prim", "cut-property"]
description: "Chứng minh chọn cạnh an toàn và phân biệt cây khung với đường đi ngắn nhất."
draft: false
updated: 2026-10-15
---

Muốn nối mọi địa điểm bằng một mạng cáp rẻ nhất, ta không nhất thiết cần đường giữa từng cặp ngắn nhất. Mục tiêu là tổng chi phí của toàn bộ mạng. Với đồ thị vô hướng liên thông có trọng số, cây khung gồm `V-1` cạnh nối mọi đỉnh và không có chu trình; MST là cây khung có tổng trọng số nhỏ nhất.

Trọng số âm vẫn hợp lệ: cây không lặp chu trình và chỉ có hữu hạn cạnh. Nếu đồ thị không liên thông thì không tồn tại một cây khung cho toàn bộ đỉnh; ta có thể tìm rừng khung nhỏ nhất, gồm một MST cho từng thành phần.

## Lát cắt cho một phép chọn có chứng minh

Một lát cắt chia đỉnh thành hai tập không rỗng `S` và `V\S`. Cạnh nhẹ nhất băng qua lát cắt có thể thuộc một MST. Lấy một MST chưa chứa cạnh đó `e`; thêm `e` tạo một chu trình. Đường cũ giữa hai đầu `e` phải qua một cạnh `f` cũng băng lát cắt. Vì `w(e)<=w(f)`, thay `f` bằng `e` cho cây khung không nặng hơn.

Khi đã có một tập cạnh đang xây, giữ bất biến rằng có một MST chứa toàn bộ các cạnh đã nhận. Chọn chính MST ấy cho phép đổi trên, và chọn lát cắt không cắt ngang các cạnh đã nhận. Khi ấy cạnh `f` bị bỏ không nằm trong tập đã cam kết, nên phép đổi giữ được mọi lựa chọn trước. MST sau phép đổi chứa cả tập cũ lẫn cạnh mới, duy trì bất biến. Đây là dạng “an toàn” mà Kruskal và Prim cần, thay vì chỉ nói một cạnh nhẹ xuất hiện trong một MST bất kỳ.

```note-visualization
{"id":"mst-cut","preset":"normal"}
```

## Kruskal gộp các thành phần chưa nối nhau

Sắp cạnh tăng theo trọng số. Với `(u,v)`, nếu hai đầu thuộc hai tập DSU khác nhau, nhận cạnh và Union; nếu đã cùng tập, cạnh tạo chu trình nên bỏ. DSU mô tả chính xác các thành phần của rừng cạnh đã nhận.

Với tam giác `0-1(1),1-2(2),0-2(3)`, nhận hai cạnh đầu cho tổng 3. Cạnh thứ ba bị bỏ vì 0 và 2 đã nối. Để thấy việc chọn an toàn, xét lát cắt là một thành phần DSU hiện tại: cạnh được xét nhẹ nhất còn có thể nối nó ra ngoài. Lát cắt không chia một cạnh đã nhận nào, nên lập luận đổi chỗ giữ được rừng hiện có.

Sắp `E` cạnh tốn `O(E log E)`. DSU với union by size/rank và path compression có tổng chi phí gần tuyến tính; lưu đồ thị và DSU cần `O(V+E)` bộ nhớ. Nếu kết thúc nhận ít hơn `V-1` cạnh trên đồ thị có nhiều thành phần, đó là rừng khung nhỏ nhất chứ không được báo là một cây nối toàn bộ.

```note-visualization
{"id":"kruskal","preset":"normal"}
```

## Prim mở rộng một cây qua biên hiện tại

Bắt đầu từ một đỉnh, giữ `S` là tập đã vào cây. Mỗi lần chọn cạnh nhẹ nhất từ `S` ra ngoài. Lát cắt `(S,V\S)` tôn trọng cây đang có, nên cạnh mới an toàn; cạnh đó thêm đúng một đỉnh ngoài, không tạo chu trình.

Lazy Prim có thể lưu mọi cạnh biên trong min-heap. Một cạnh từng là biên có thể trở nên nội bộ khi đầu kia đã vào cây, nên phải bỏ bản ghi heap có đích đã nhận. Với đồ thị đơn, cận thường viết `O(E log V)`; heap cạnh tổng quát có `O(E)` bản ghi, nên với multigraph cận trực tiếp là `O(E log(E+1))`. Eager Prim giữ một khóa tốt nhất cho mỗi đỉnh cho cận `O(E log V)` với heap phù hợp. Với ma trận kề, quét chọn đỉnh rẻ nhất mỗi lượt dùng `O(V²)`, có thể hợp đồ thị dày hơn việc quản lý nhiều bản ghi heap.

```note-visualization
{"id":"prim","preset":"normal"}
```

Nếu không liên thông, muốn rừng phải khởi động lại Prim ở đỉnh chưa nhận. Việc heap rỗng trước khi lấy hết đỉnh là dấu hiệu thành phần hiện tại đã hết, không phải mọi đỉnh đều được nối.

## Tổng rẻ nhất không bảo toàn đường ngắn nhất

Tam giác có cạnh `A-B=2,B-C=2,A-C=3`. MST lấy hai cạnh giá 2, tổng 4; đường A tới C trong cây dài 4, trong khi cạnh trực tiếp dài 3. MST tiết kiệm tổng mạng, còn shortest path tối ưu một tuyến: hai tiêu chí dẫn đến hai lựa chọn khác nhau.

Nếu có nhiều cạnh cùng trọng số, có thể tồn tại nhiều MST nhưng tổng tối ưu vẫn như nhau. Mọi trọng số phân biệt là điều kiện đủ cho MST duy nhất; chiều ngược không đúng, chẳng hạn đồ thị vốn đã là cây vẫn có cây khung duy nhất dù nhiều cạnh cùng trọng số.

**Tự thử:** Kruskal trên tam giác `1,2,3` nhận những cạnh nào? Prim phải bỏ bản ghi heap cũ nào? Một đồ thị có trọng số trùng có bắt buộc nhiều MST không?

**Giải thích:** nhận 1 và 2, bỏ 3 vì tạo chu trình. Prim bỏ cạnh có đầu ngoài cũ nay đã vào `S`, nếu không có thể nhận cạnh nội bộ. Trọng số trùng không đủ kết luận nhiều MST; đồ thị chỉ có một cây khung là phản ví dụ. Chứng minh an toàn phải gắn với lát cắt hiện tại và những cạnh đã cam kết.

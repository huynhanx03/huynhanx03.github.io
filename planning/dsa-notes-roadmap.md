# Lộ trình 62 notes: Data Structures & Algorithms và toán cho thuật toán

Thư mục bài viết: `src/content/notes/data-structures-algorithms/`. Ba topic có thứ tự đọc thủ công trong `src/data/topic-guides.json`; chỉ thêm `noteKeys` khi bài đã hoàn chỉnh. Tên file dùng hậu tố `_VI.md` và `translationPending: true` như các series Cadence/Temporal hiện có. Mỗi bài cần trực giác, bất biến hoặc lập luận đúng đắn, ví dụ minh họa (ưu tiên Go), phân tích thời gian/bộ nhớ, lỗi thường gặp và bài tập tự kiểm tra. Không sao chép văn bản hoặc mã của nguồn tham khảo.

Sách đối chiếu: Hemant Jain, *Data Structures & Algorithms in Go* (các chương 2–20); Adam Drozdek, *Data Structures and Algorithms in C++*, ấn bản 4 (các chương 2–13); Lê Minh Hoàng, *DSAP Textbook* (các phần 1–4). Go nhập môn, OOP và quản lý bộ nhớ đã có notes riêng, nên dùng làm kiến thức trước thay vì lặp lại.

## Topic 1: Cấu trúc dữ liệu và thuật toán cơ bản

1. [x] Cách tiếp cận một bài toán: đầu vào, ràng buộc, bất biến, kiểm thử — Jain 3; Lê Minh Hoàng phần 2 §1.
2. [x] Độ phức tạp: O, Ω, Θ, trường hợp tốt/xấu/trung bình, amortized — Jain 2; Drozdek 2; Lê Minh Hoàng phần 2 §2.
3. [x] ADT và cách chọn biểu diễn dữ liệu — Jain 4; Drozdek 1; Lê Minh Hoàng phần 2 §1, §4.
4. [x] Mảng, slice và chuỗi trong Go — Jain 1; Drozdek 1; Lê Minh Hoàng phần 2 §4.
5. [x] Đệ quy, call stack và công thức truy hồi — Jain 1; Drozdek 5; Lê Minh Hoàng phần 2 §3.
6. [x] Danh sách liên kết đơn, đôi, vòng — Jain 7; Drozdek 3; Lê Minh Hoàng phần 2 §4.
7. [x] Stack, queue và deque — Jain 8–9; Drozdek 4; Lê Minh Hoàng phần 2 §5.
8. [x] Bảng băm và xử lý va chạm — Jain 12; Drozdek 10; Lê Minh Hoàng phần 2 §9.
9. [x] Tìm kiếm tuyến tính, nhị phân và bất biến biên — Jain 5; Lê Minh Hoàng phần 2 §9.
10. [x] Sắp xếp cơ bản: selection, insertion, bubble — Jain 6; Drozdek 9; Lê Minh Hoàng phần 2 §8.
11. [x] Merge sort, quicksort, heapsort và tính ổn định — Jain 6; Drozdek 9; Lê Minh Hoàng phần 2 §8.
12. [x] Counting, radix, bucket sort và giới hạn miền khóa — Jain 6; Drozdek 9; Lê Minh Hoàng phần 2 §8.
13. [x] Sinh cấu hình: dãy nhị phân, tập con, hoán vị — Lê Minh Hoàng phần 1 §1–2.
14. [x] Quay lui và cắt tỉa — Jain 20; Drozdek 5; Lê Minh Hoàng phần 1 §3.
15. [x] Cây và các phép duyệt — Jain 10; Drozdek 6; Lê Minh Hoàng phần 2 §6–7.
16. [x] Cây tìm kiếm nhị phân: tìm, thêm, xóa — Jain 10; Drozdek 6; Lê Minh Hoàng phần 2 §9.
17. [x] Heap và priority queue — Jain 11; Drozdek 6; Lê Minh Hoàng phần 2 §8.
18. [x] Biểu diễn đồ thị, BFS và DFS — Jain 13; Drozdek 8; Lê Minh Hoàng phần 4 §1–3.

## Topic 2: Cấu trúc dữ liệu và thuật toán nâng cao

1. [x] Chia để trị, truy hồi và Master theorem — Jain 18; Drozdek 2; Lê Minh Hoàng phần 2 §8.
2. [x] Greedy: chứng minh lựa chọn tham lam — Jain 17; Lê Minh Hoàng phần 4 §9.
3. [x] Quy hoạch động: trạng thái, chuyển tiếp, thứ tự tính — Jain 19; Lê Minh Hoàng phần 3 §1–2.
4. [x] Quy hoạch động qua LIS, knapsack, edit distance — Lê Minh Hoàng phần 3 §3.
5. [x] Nhánh cận và bài toán tối ưu tổ hợp — Jain 15; Lê Minh Hoàng phần 1 §4.
6. [x] Cây cân bằng: AVL, red-black và splay — Jain 10; Drozdek 6.
7. [x] B-tree, B+ tree và lưu trữ nhiều nhánh — Jain 10; Drozdek 7.
8. [x] Trie, radix tree và tìm kiếm theo tiền tố — Drozdek 7; Lê Minh Hoàng phần 2 §9.
9. [x] Segment tree và Fenwick tree cho truy vấn đoạn — Jain 10; mở rộng ứng dụng.
10. [x] Union-Find, path compression và union by size — Drozdek 8.
11. [x] Topological sort và thành phần liên thông mạnh — Jain 13; Drozdek 8; Lê Minh Hoàng phần 4 §4.
12. [x] Cầu, khớp và low-link — Lê Minh Hoàng phần 4 §5.
13. [x] Đường đi ngắn nhất: DAG, Dijkstra, Bellman–Ford — Jain 13; Drozdek 8; Lê Minh Hoàng phần 4 §8.
14. [x] Đường đi ngắn nhất mọi cặp: Floyd–Warshall — Drozdek 8; Lê Minh Hoàng phần 4 §8.
15. [x] Cây khung nhỏ nhất: Kruskal và Prim — Jain 13; Drozdek 8; Lê Minh Hoàng phần 4 §9.
16. [x] Luồng cực đại và mạng thặng dư — Drozdek 8; Lê Minh Hoàng phần 4 §10.
17. [x] Ghép cặp đồ thị hai phía và bài toán phân công — Drozdek 8; Lê Minh Hoàng phần 4 §11–13.
18. [x] Đường đi Euler và Hamilton — Drozdek 8; Lê Minh Hoàng phần 4 §6–7.
19. [x] So khớp chuỗi: KMP và Boyer–Moore — Jain 14; Drozdek 13.
20. [x] Suffix structures và so khớp gần đúng — Drozdek 13.
21. [x] Nén dữ liệu: Huffman, RLE và LZ — Drozdek 11.
22. [x] P, NP, NP-hard và reduction — Jain 21; Drozdek 2, phụ lục C.

### Phần mở rộng được chọn từ danh mục VNOI Wiki

23. [x] LCA và binary lifting — tổ tiên chung, khoảng cách trên cây.
24. [x] Heavy-Light Decomposition — truy vấn và cập nhật trên đường đi của cây.
25. [x] Centroid decomposition — phân rã cây và truy vấn khoảng cách.
26. [x] DSU rollback — hoàn tác các lần gộp cho truy vấn offline.
27. [x] Min-cost flow — luồng với tổng chi phí nhỏ nhất.
28. [x] Rolling hash — hash đoạn và va chạm.
29. [x] Z-function — khớp tiền tố ở mọi vị trí.
30. [x] Manacher — palindrome quanh mọi tâm.
31. [x] Aho–Corasick — tìm nhiều mẫu cùng lúc.
32. [x] Suffix array — doubling, LCP và truy vấn.
33. [x] Suffix automaton — xây trạng thái, clone và ứng dụng substring.
34. [x] Suffix tree — trie nén, xây dựng và ứng dụng.
35. [x] Nim và Sprague–Grundy — trò chơi vô tư, tổng xor.
36. [x] Minimax và alpha–beta — tìm kiếm đối kháng có cắt tỉa.

## Topic 3: Toán cho thuật toán

1. [x] Modulo, Euclid, extended Euclid và lũy thừa nhị phân.
2. [x] Số nguyên tố, sàng, kiểm tra nguyên tố, phân tích thừa số và ước.
3. [x] Nghịch đảo modulo và định lý thặng dư Trung Hoa.
4. [x] Phi Euler, Möbius và hàm nhân tính.
5. [x] Tổ hợp modulo, giai thừa, Lucas và Wilson.
6. [x] Căn bậc hai modulo và logarit rời rạc.
7. [x] Tổ hợp, hoán vị và bao hàm–loại trừ.
8. [x] Xác suất cơ bản, xác suất có điều kiện và kỳ vọng.

Nguồn đối chiếu cho phần mở rộng: [danh mục VNOI Wiki](https://wiki.vnoi.info/vi/articles) và các bài chuyên đề được liên kết ở cuối từng note. Các bài viết là bản diễn giải độc lập bằng tiếng Việt, phục vụ việc học theo hệ thống của repo.

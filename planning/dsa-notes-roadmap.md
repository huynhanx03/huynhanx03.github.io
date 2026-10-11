# Lộ trình notes: Data Structures & Algorithms

Thư mục bài viết: `src/content/notes/data-structures-algorithms/`. Hai topic có thứ tự đọc thủ công trong `src/data/topic-guides.json`; chỉ thêm `noteKeys` khi bài đã hoàn chỉnh. Tên file dùng hậu tố `_VI.md` và `translationPending: true` như các series Cadence/Temporal hiện có. Mỗi bài cần trực giác, bất biến hoặc lập luận đúng đắn, ví dụ Go, phân tích thời gian/bộ nhớ, lỗi thường gặp và bài tập tự kiểm tra. Không sao chép văn bản hoặc mã của sách.

Sách đối chiếu: Hemant Jain, *Data Structures & Algorithms in Go* (các chương 2–20); Adam Drozdek, *Data Structures and Algorithms in C++*, ấn bản 4 (các chương 2–13); Lê Minh Hoàng, *DSAP Textbook* (các phần 1–4). Go nhập môn, OOP và quản lý bộ nhớ đã có notes riêng, nên dùng làm kiến thức trước thay vì lặp lại.

## Topic 1: Cấu trúc dữ liệu và thuật toán cơ bản

1. [x] Cách tiếp cận một bài toán: đầu vào, ràng buộc, bất biến, kiểm thử — Jain 3; Lê Minh Hoàng phần 2 §1.
2. [x] Độ phức tạp: O, Ω, Θ, trường hợp tốt/xấu/trung bình, amortized — Jain 2; Drozdek 2; Lê Minh Hoàng phần 2 §2.
3. [x] ADT và cách chọn biểu diễn dữ liệu — Jain 4; Drozdek 1; Lê Minh Hoàng phần 2 §1, §4.
4. [x] Mảng, slice và chuỗi trong Go — Jain 1; Drozdek 1; Lê Minh Hoàng phần 2 §4.
5. [x] Đệ quy, call stack và công thức truy hồi — Jain 1; Drozdek 5; Lê Minh Hoàng phần 2 §3.
6. [ ] Danh sách liên kết đơn, đôi, vòng — Jain 7; Drozdek 3; Lê Minh Hoàng phần 2 §4.
7. [ ] Stack, queue và deque — Jain 8–9; Drozdek 4; Lê Minh Hoàng phần 2 §5.
8. [ ] Bảng băm và xử lý va chạm — Jain 12; Drozdek 10; Lê Minh Hoàng phần 2 §9.
9. [ ] Tìm kiếm tuyến tính, nhị phân và bất biến biên — Jain 5; Lê Minh Hoàng phần 2 §9.
10. [ ] Sắp xếp cơ bản: selection, insertion, bubble — Jain 6; Drozdek 9; Lê Minh Hoàng phần 2 §8.
11. [ ] Merge sort, quicksort, heapsort và tính ổn định — Jain 6; Drozdek 9; Lê Minh Hoàng phần 2 §8.
12. [ ] Counting, radix, bucket sort và giới hạn miền khóa — Jain 6; Drozdek 9; Lê Minh Hoàng phần 2 §8.
13. [ ] Sinh cấu hình: dãy nhị phân, tập con, hoán vị — Lê Minh Hoàng phần 1 §1–2.
14. [ ] Quay lui và cắt tỉa — Jain 20; Drozdek 5; Lê Minh Hoàng phần 1 §3.
15. [ ] Cây và các phép duyệt — Jain 10; Drozdek 6; Lê Minh Hoàng phần 2 §6–7.
16. [ ] Cây tìm kiếm nhị phân: tìm, thêm, xóa — Jain 10; Drozdek 6; Lê Minh Hoàng phần 2 §9.
17. [ ] Heap và priority queue — Jain 11; Drozdek 6; Lê Minh Hoàng phần 2 §8.
18. [ ] Biểu diễn đồ thị, BFS và DFS — Jain 13; Drozdek 8; Lê Minh Hoàng phần 4 §1–3.

## Topic 2: Cấu trúc dữ liệu và thuật toán nâng cao

1. [x] Chia để trị, truy hồi và Master theorem — Jain 18; Drozdek 2; Lê Minh Hoàng phần 2 §8.
2. [ ] Greedy: chứng minh lựa chọn tham lam — Jain 17; Lê Minh Hoàng phần 4 §9.
3. [ ] Quy hoạch động: trạng thái, chuyển tiếp, thứ tự tính — Jain 19; Lê Minh Hoàng phần 3 §1–2.
4. [ ] Quy hoạch động qua LIS, knapsack, edit distance — Lê Minh Hoàng phần 3 §3.
5. [ ] Nhánh cận và bài toán tối ưu tổ hợp — Jain 15; Lê Minh Hoàng phần 1 §4.
6. [ ] Cây cân bằng: AVL, red-black và splay — Jain 10; Drozdek 6.
7. [ ] B-tree, B+ tree và lưu trữ nhiều nhánh — Jain 10; Drozdek 7.
8. [ ] Trie, radix tree và tìm kiếm theo tiền tố — Drozdek 7; Lê Minh Hoàng phần 2 §9.
9. [ ] Segment tree và Fenwick tree cho truy vấn đoạn — Jain 10; mở rộng ứng dụng.
10. [ ] Union-Find, path compression và union by size — Drozdek 8.
11. [ ] Topological sort và thành phần liên thông mạnh — Jain 13; Drozdek 8; Lê Minh Hoàng phần 4 §4.
12. [ ] Cầu, khớp và low-link — Lê Minh Hoàng phần 4 §5.
13. [ ] Đường đi ngắn nhất: DAG, Dijkstra, Bellman–Ford — Jain 13; Drozdek 8; Lê Minh Hoàng phần 4 §8.
14. [ ] Đường đi ngắn nhất mọi cặp: Floyd–Warshall — Drozdek 8; Lê Minh Hoàng phần 4 §8.
15. [ ] Cây khung nhỏ nhất: Kruskal và Prim — Jain 13; Drozdek 8; Lê Minh Hoàng phần 4 §9.
16. [ ] Luồng cực đại và mạng thặng dư — Drozdek 8; Lê Minh Hoàng phần 4 §10.
17. [ ] Ghép cặp đồ thị hai phía và bài toán phân công — Drozdek 8; Lê Minh Hoàng phần 4 §11–13.
18. [ ] Đường đi Euler và Hamilton — Drozdek 8; Lê Minh Hoàng phần 4 §6–7.
19. [ ] So khớp chuỗi: KMP và Boyer–Moore — Jain 14; Drozdek 13.
20. [ ] Suffix structures và so khớp gần đúng — Drozdek 13.
21. [ ] Nén dữ liệu: Huffman, RLE và LZ — Drozdek 11.
22. [ ] P, NP, NP-hard và reduction — Jain 21; Drozdek 2, phụ lục C.

Những nhánh chuyên sâu như skip list, treap, k-d tree, external sort, min-cost flow, matching trên đồ thị tổng quát, graph coloring và memory management có thể tách thành chặng mở rộng sau khi 40 bài trên hoàn chỉnh. Chúng được ghi rõ ở đây để không biến việc “bao phủ sách” thành lời hứa rằng mọi tiểu mục đều đã có bài riêng.

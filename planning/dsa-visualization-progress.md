# Tiến độ visualization DSA

Danh sách đã triển khai. Nghiệm thu build/UI và review được ghi trong ledger; số lượng registry không thay thế xác minh từng input.

| ID | Note | Section | Giới hạn | Presets / expected output |
|---|---|---|---|---|
| scan-maximum | problem-solving | lời giải | Mảng / Unicode ≤24 phần tử; thao tác ≤24. Tối đa 2.048 bước; công việc có budget. | normal: 9; boundary: Rỗng |
| linear-count | complexity | Đếm | 0≤n≤12. Tối đa 2.048 bước; công việc có budget. | normal: 6; boundary: 0 |
| nested-loop-count | complexity | Đếm | 0≤n≤12. Tối đa 2.048 bước; công việc có budget. | normal: 36; boundary: 0 |
| halving-count | complexity | Đếm | 0≤n≤12. Tối đa 2.048 bước; công việc có budget. | normal: 3; boundary: 0 |
| dynamic-capacity | complexity | Amortized | 0≤n≤12. Tối đa 2.048 bước; công việc có budget. | normal: 8; boundary: 0 |
| stack-contract | abstract-data-types | hợp đồng | Mảng / Unicode ≤24 phần tử; thao tác ≤24. Tối đa 2.048 bước; công việc có budget. | normal: 3; boundary: Rỗng |
| slice-alias | arrays-and-slices | alias | Mảng / Unicode ≤24 phần tử; thao tác ≤24. Tối đa 2.048 bước; công việc có budget. | normal: 1, 9, 3; boundary: Lỗi chỉ số |
| two-pointers | arrays-and-slices | Hai con trỏ | Mảng / Unicode ≤24 phần tử; thao tác ≤24. Tối đa 2.048 bước; công việc có budget. | normal: 1, 3; boundary: Không có cặp |
| prefix-sum | arrays-and-slices | Tổng tiền tố | Mảng / Unicode ≤24 phần tử; thao tác ≤24. Tối đa 2.048 bước; công việc có budget. | normal: 10; boundary: 0 |
| utf8-bytes-runes | arrays-and-slices | Chuỗi Go | Mảng / Unicode ≤24 phần tử; thao tác ≤24. Tối đa 2.048 bước; công việc có budget. | normal: 3 byte / 2 rune; boundary: 0 byte / 0 rune |
| stack-operations | stacks-queues-deques | Stack | Mảng / Unicode ≤24 phần tử; thao tác ≤24. Tối đa 2.048 bước; công việc có budget. | normal: 3; boundary: Rỗng |
| circular-queue | stacks-queues-deques | Queue | Mảng / Unicode ≤24 phần tử; thao tác ≤24. Tối đa 2.048 bước; công việc có budget. | normal: 2; boundary: Rỗng |
| monotonic-deque | stacks-queues-deques | Deque | Mảng / Unicode ≤24 phần tử; thao tác ≤24. Tối đa 2.048 bước; công việc có budget. | normal: 3, 5, 5; boundary:  |
| upper-bound | searching | upper_bound | Mảng / Unicode ≤24 phần tử; thao tác ≤24. Tối đa 2.048 bước; công việc có budget. | normal: 3; boundary: 0 |
| answer-binary-search | searching | đáp án | Mảng / Unicode ≤24 phần tử; thao tác ≤24. Tối đa 2.048 bước; công việc có budget. | normal: 6; boundary: 0 |
| selection-sort | elementary-sorting | Selection | Tối đa 24 số nguyên; trace ≤2.048. Tối đa 2.048 bước; công việc có budget. | normal: 1, 3, 3, 5, 7, 9; boundary:  |
| insertion-sort | elementary-sorting | Insertion | Tối đa 24 số nguyên; trace ≤2.048. Tối đa 2.048 bước; công việc có budget. | normal: 1, 3, 3, 5, 7, 9; boundary:  |
| bubble-sort | elementary-sorting | Bubble | Tối đa 24 số nguyên; trace ≤2.048. Tối đa 2.048 bước; công việc có budget. | normal: 1, 3, 3, 5, 7, 9; boundary:  |
| merge-sort | efficient-sorting | Merge sort | Tối đa 24 số nguyên; trace ≤2.048. Tối đa 2.048 bước; công việc có budget. | normal: 1, 3, 3, 5, 7, 9; boundary:  |
| quick-sort | efficient-sorting | Quicksort | Tối đa 24 số nguyên; trace ≤2.048. Tối đa 2.048 bước; công việc có budget. | normal: 1, 3, 3, 5, 7, 9; boundary:  |
| heap-sort | efficient-sorting | Heapsort | Tối đa 24 số nguyên; trace ≤2.048. Tối đa 2.048 bước; công việc có budget. | normal: 1, 3, 3, 5, 7, 9; boundary:  |
| counting-sort | distribution-sorting | Counting | Tối đa 24 số; span ≤40. Tối đa 2.048 bước; công việc có budget. | normal: 1, 3, 3, 5, 7, 9; boundary:  |
| radix-sort | distribution-sorting | Radix | Tối đa 24 số nguyên không âm ≤1.000.000. Tối đa 2.048 bước; công việc có budget. | normal: 1, 3, 3, 5, 7, 9; boundary:  |
| bucket-sort | distribution-sorting | Bucket | Tối đa 24 số nguyên 0–99. Tối đa 2.048 bước; công việc có budget. | normal: 1, 3, 3, 5, 7, 9; boundary:  |
| merge-call-tree | divide-and-conquer | Theo dõi | Tối đa 24 số nguyên; trace ≤2.048. Tối đa 2.048 bước; công việc có budget. | normal: 1, 3, 3, 5, 7, 9; boundary:  |
| factorial-stack | recursion | Call stack | 0≤n≤12. Tối đa 2.048 bước; công việc có budget. | normal: 120; boundary: 1 |
| fibonacci-calls | recursion | phân nhánh | 0≤n≤8. Tối đa 2.048 bước; công việc có budget. | normal: 5; boundary: 0 |
| binary-configurations | configuration-generation | Dãy bit | 0≤n≤6. Tối đa 2.048 bước; công việc có budget. | normal: 8; boundary: 1 |
| next-permutation | configuration-generation | Hoán vị | Mảng ≤24 phần tử. Tối đa 2.048 bước; công việc có budget. | normal: 1, 3, 2; boundary: 1, 2, 3 |
| n-queens | backtracking | quân hậu | 1≤n≤6; 25.000 công việc; ≤2.048 frame. Tối đa 2.048 bước; công việc có budget. | normal: 2; boundary: 0 |
| interval-scheduling | greedy | khoảng | ≤12 khoảng, 0≤start<end≤100. Tối đa 2.048 bước; công việc có budget. | normal: 0, 2; boundary:  |
| greedy-coin-counterexample | greedy | thất bại | Tiền ≤30, tối đa 8 mệnh giá dương. Tối đa 2.048 bước; công việc có budget. | normal: greedy=3; optimal=2; boundary: greedy=0; optimal=0 |
| stairs-memo | dynamic-programming | Top-down | 0≤n≤20. Tối đa 2.048 bước; công việc có budget. | normal: 8; boundary: 1 |
| stairs-bottom-up | dynamic-programming | leo cầu thang | 0≤n≤20. Tối đa 2.048 bước; công việc có budget. | normal: 8; boundary: 1 |
| lis-dp | dp-classics | Increasing | Mảng ≤24 phần tử. Tối đa 2.048 bước; công việc có budget. | normal: 3: 1, 2, 5; boundary: 0:  |
| knapsack-dp | dp-classics | knapsack | ≤10 items; capacity≤30; trọng lượng dương. Tối đa 2.048 bước; công việc có budget. | normal: 7; boundary: 0 |
| knapsack-branch-bound | branch-and-bound | knapsack | ≤10 items; capacity≤30; trọng lượng dương. Tối đa 2.048 bước; công việc có budget. | normal: 7; boundary: 0 |
| edit-distance | dp-classics | Edit distance | Tối đa 16 Unicode code points mỗi chuỗi. Tối đa 2.048 bước; công việc có budget. | normal: 3; boundary: 3 |
| hamilton-certificate | complexity-classes | chứng chỉ | ≤8 đỉnh; kiểm tra chu trình đóng. Tối đa 2.048 bước; công việc có budget. | normal: Hợp lệ; boundary: Không hợp lệ |
| graph-adjacency | graph-representation-bfs-dfs | Biểu diễn | ≤12 đỉnh, ≤30 cạnh; hướng/trọng số theo thuật toán. Tối đa 2.048 bước; công việc có budget. | normal: 4 cạnh; boundary: 0 cạnh |
| bfs | graph-representation-bfs-dfs | BFS | ≤12 đỉnh, ≤30 cạnh; hướng/trọng số theo thuật toán. Tối đa 2.048 bước; công việc có budget. | normal: 0, 1, 2, 3; boundary: 0 |
| dfs | graph-representation-bfs-dfs | DFS | ≤12 đỉnh, ≤30 cạnh; hướng/trọng số theo thuật toán. Tối đa 2.048 bước; công việc có budget. | normal: 0, 1, 2, 3; boundary: 0 |
| dag-shortest-path | shortest-paths | DAG | ≤12 đỉnh, ≤30 cạnh; hướng/trọng số theo thuật toán. Tối đa 2.048 bước; công việc có budget. | normal: 0, 2, 3, 6; boundary: 0, ∞, ∞, ∞ |
| dijkstra | shortest-paths | Dijkstra | ≤12 đỉnh, ≤30 cạnh; hướng/trọng số theo thuật toán. Tối đa 2.048 bước; công việc có budget. | normal: 0, 2, 3, 6; boundary: 0, ∞, ∞, ∞ |
| bellman-ford | shortest-paths | Bellman | ≤12 đỉnh, ≤30 cạnh; hướng/trọng số theo thuật toán. Tối đa 2.048 bước; công việc có budget. | normal: 0, 2, 3, 6; boundary: 0, ∞, ∞, ∞ |
| floyd-warshall | floyd-warshall | trung gian | ≤12 đỉnh, ≤30 cạnh; hướng/trọng số theo thuật toán. Tối đa 2.048 bước; công việc có budget. | normal: 0, 2, 3, 6; boundary: 0, ∞, ∞, ∞ |
| kruskal | minimum-spanning-trees | Kruskal | ≤12 đỉnh, ≤30 cạnh; hướng/trọng số theo thuật toán. Tối đa 2.048 bước; công việc có budget. | normal: 6; boundary: 0 |
| prim | minimum-spanning-trees | Prim | ≤12 đỉnh, ≤30 cạnh; hướng/trọng số theo thuật toán. Tối đa 2.048 bước; công việc có budget. | normal: 6; boundary: 0 |
| mst-cut | minimum-spanning-trees | lát cắt | ≤12 đỉnh, ≤30 cạnh; hướng/trọng số theo thuật toán. Tối đa 2.048 bước; công việc có budget. | normal: 6; boundary: 0 |
| tree-preorder | trees-and-traversals | Duyệt sâu | Cây nhị phân liên thông ≤12 đỉnh. Tối đa 2.048 bước; công việc có budget. | normal: 0, 1, 3, 4, 2; boundary: 0 |
| tree-inorder | trees-and-traversals | Duyệt sâu | Cây nhị phân liên thông ≤12 đỉnh. Tối đa 2.048 bước; công việc có budget. | normal: 3, 1, 4, 0, 2; boundary: 0 |
| tree-postorder | trees-and-traversals | Duyệt sâu | Cây nhị phân liên thông ≤12 đỉnh. Tối đa 2.048 bước; công việc có budget. | normal: 3, 4, 1, 2, 0; boundary: 0 |
| tree-level-order | trees-and-traversals | tầng | Cây nhị phân liên thông ≤12 đỉnh. Tối đa 2.048 bước; công việc có budget. | normal: 0, 1, 2, 3, 4; boundary: 0 |
| prefix-function | string-matching | Prefix | Mảng ≤24 phần tử. Tối đa 2.048 bước; công việc có budget. | normal: 0, 0, 1; boundary:  |
| kmp-search | string-matching | Prefix | UTF-8 bytes, text≤24, pattern≤16; trả byte offsets. Tối đa 2.048 bước; công việc có budget. | normal: 0, 2; boundary: 0, 1, 2, 3, 4, 5 |
| boyer-moore | string-matching | Boyer | UTF-8 bytes, text≤24, pattern≤16; trả byte offsets. Tối đa 2.048 bước; công việc có budget. | normal: 0, 2; boundary: 0, 1, 2, 3, 4, 5 |
| hash-prefix | rolling-hash | Hash đa thức | BigInt, base=31, modulus=97; byte offsets, ≤24 byte. Tối đa 2.048 bước; công việc có budget. | normal: 43; boundary: 0 |
| hash-substring | rolling-hash | công thức đoạn | BigInt, base=31, modulus=97; byte offsets, ≤24 byte. Tối đa 2.048 bước; công việc có budget. | normal: 31; boundary: 0 |
| hash-window | rolling-hash | Cửa sổ | BigInt, base=31, modulus=97; byte offsets, ≤24 byte. Tối đa 2.048 bước; công việc có budget. | normal: 0, 2; boundary: 0 |
| manacher-odd | manacher | Tâm | ≤24 Unicode code points. Tối đa 2.048 bước; công việc có budget. | normal: 1, 2, 3, 2, 1; boundary:  |
| manacher-even | manacher | Tâm | ≤24 Unicode code points. Tối đa 2.048 bước; công việc có budget. | normal: 0, 0, 0, 0, 0; boundary:  |
| z-box | z-function | Z | Mảng ≤24 phần tử. Tối đa 2.048 bước; công việc có budget. | normal: 0, 0, 3, 0, 1; boundary:  |
| z-pattern | z-function | Tìm mẫu | Unicode code points; text≤24, pattern≤16. Tối đa 2.048 bước; công việc có budget. | normal: 0, 2; boundary: 0, 1, 2, 3, 4, 5 |
| rle-codec | data-compression | Run-length | ≤24 byte UTF-8; LZ77 window 1–16. Output là bytes đã giải mã. Tối đa 2.048 bước; công việc có budget. | normal: abababa; boundary:  |
| huffman-codec | data-compression | Huffman | ≤24 byte UTF-8; LZ77 window 1–16. Output là bytes đã giải mã. Tối đa 2.048 bước; công việc có budget. | normal: abababa; boundary:  |
| lz77-codec | data-compression | Lempel | ≤24 byte UTF-8; LZ77 window 1–16. Output là bytes đã giải mã. Tối đa 2.048 bước; công việc có budget. | normal: abababa; boundary:  |
| aho-trie | aho-corasick | automaton | ≤5 pattern phân cách /; mỗi pattern≤8 code points, text≤16. Tối đa 2.048 bước; công việc có budget. | normal: 6; boundary: 1 |
| aho-failure | aho-corasick | automaton | ≤5 pattern phân cách /; mỗi pattern≤8 code points, text≤16. Tối đa 2.048 bước; công việc có budget. | normal: 6; boundary: 1 |
| aho-scan | aho-corasick | automaton | ≤5 pattern phân cách /; mỗi pattern≤8 code points, text≤16. Tối đa 2.048 bước; công việc có budget. | normal: aba@0, ba@1, aba@2, ba@3; boundary:  |
| suffix-doubling | suffix-array-construction | Doubling | ≤16 Unicode code points; offsets là code point; approximate trả vị trí kết thúc. Tối đa 2.048 bước; công việc có budget. | normal: 4, 2, 0, 3, 1; boundary:  |
| kasai-lcp | suffix-array-construction | Kasai | ≤16 Unicode code points; offsets là code point; approximate trả vị trí kết thúc. Tối đa 2.048 bước; công việc có budget. | normal: 1, 3, 0, 2; boundary:  |
| suffix-search | suffix-approximate | Suffix array | ≤16 Unicode code points; offsets là code point; approximate trả vị trí kết thúc. Tối đa 2.048 bước; công việc có budget. | normal: 0, 2; boundary: 0 |
| approximate-matching | suffix-approximate | gần đúng | ≤16 Unicode code points; offsets là code point; approximate trả vị trí kết thúc. Tối đa 2.048 bước; công việc có budget. | normal: 3, 5; boundary: 0 |
| sam-extend | suffix-automaton | Xây | ≤16 Unicode code points. Clone và suffix links là state thật. Tối đa 2.048 bước; công việc có budget. | normal: 6; boundary: 1 |
| sam-substring-count | suffix-automaton | Ứng dụng | ≤16 Unicode code points. Clone và suffix links là state thật. Tối đa 2.048 bước; công việc có budget. | normal: 9; boundary: 0 |
| suffix-trie-compress | suffix-tree | Tự xây | ≤16 code points; trie nén O(n²), không phải Ukkonen. Tối đa 2.048 bước; công việc có budget. | normal: 6 hậu tố; boundary: 1 hậu tố |
| suffix-tree-search | suffix-tree | Ứng dụng | ≤16 code points; trie nén O(n²), không phải Ukkonen. Tối đa 2.048 bước; công việc có budget. | normal: 0, 2; boundary: 0 |
| normalize-modulo | modular-arithmetic-euclid | Chuẩn hóa | Số nguyên BigInt; giới hạn theo từng trường. Tối đa 2.048 bước; công việc có budget. | normal: 3; boundary: 0 |
| euclid | modular-arithmetic-euclid | Ước chung | Số nguyên BigInt; giới hạn theo từng trường. Tối đa 2.048 bước; công việc có budget. | normal: 6; boundary: 0 |
| extended-euclid | modular-arithmetic-euclid | Ước chung | Số nguyên BigInt; giới hạn theo từng trường. Tối đa 2.048 bước; công việc có budget. | normal: 6; boundary: 0 |
| binary-power | modular-arithmetic-euclid | Lũy thừa | Số nguyên BigInt; giới hạn theo từng trường. Tối đa 2.048 bước; công việc có budget. | normal: 24; boundary: 1 |
| eratosthenes | primes-factorization-divisors | Sàng | N≤100. Tối đa 2.048 bước; công việc có budget. | normal: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29; boundary:  |
| spf-factorization | primes-factorization-divisors | Sàng | SPF n≤100; trial n≤1.000.000. Tối đa 2.048 bước; công việc có budget. | normal: 2^2 × 3^1 × 5^1; boundary:  |
| trial-factorization | primes-factorization-divisors | Sàng | SPF n≤100; trial n≤1.000.000. Tối đa 2.048 bước; công việc có budget. | normal: 2^2 × 3^1 × 5^1; boundary:  |
| miller-rabin | primes-factorization-divisors | Sàng | 2≤n≤1.000.000; bases cố định; không bảo đảm cho toàn 64-bit. Tối đa 2.048 bước; công việc có budget. | normal: Nguyên tố; boundary: Hợp số |
| pollard-rho | primes-factorization-divisors | Sàng | 2≤n≤1.000.000; 20.000 công việc; retry deterministic. Tối đa 2.048 bước; công việc có budget. | normal: 7; boundary: Nguyên tố |
| divisor-count-sum | primes-factorization-divisors | Đếm | 1≤n≤1.000.000; BigInt. Tối đa 2.048 bước; công việc có budget. | normal: 24; 1170; boundary: 1; 1 |
| totient | arithmetic-functions | Phi | 1≤n≤1.000.000; BigInt. Tối đa 2.048 bước; công việc có budget. | normal: 12; boundary: 1 |
| mobius | arithmetic-functions | Möbius | 1≤n≤1.000.000; BigInt. Tối đa 2.048 bước; công việc có budget. | normal: -1; boundary: 0 |
| modular-inverse | modular-inverse-crt | nghịch đảo | Số nguyên BigInt; giới hạn theo từng trường. Tối đa 2.048 bước; công việc có budget. | normal: 4; boundary: Không có nghịch đảo |
| crt-merge | modular-inverse-crt | đồng dư | Số nguyên BigInt; giới hạn theo từng trường. Tối đa 2.048 bước; công việc có budget. | normal: 8 (mod 15); boundary: Vô nghiệm |
| binomial-pascal | binomial-lucas-wilson | Lucas | n≤20; BigInt modulo. Tối đa 2.048 bước; công việc có budget. | normal: 10; boundary: 1 |
| lucas | binomial-lucas-wilson | Lucas | n≤10.000; prime p≤97. Tối đa 2.048 bước; công việc có budget. | normal: 1; boundary: 1 |
| wilson-factorial | binomial-lucas-wilson | Wilson | n≤10.000; prime p≤97; dùng Wilson cho các block. Tối đa 2.048 bước; công việc có budget. | normal: 3; boundary: 1 |
| euler-criterion | modular-roots-discrete-log | Căn bậc | Prime p≤997; xử lý a=0 và p=2. Tối đa 2.048 bước; công việc có budget. | normal: Có nghiệm; boundary: Vô nghiệm |
| sqrt-mod-3 | modular-roots-discrete-log | Căn bậc | Prime p≤997; xử lý a=0 và p=2. Tối đa 2.048 bước; công việc có budget. | normal: 3, 4; boundary: Vô nghiệm |
| tonelli-shanks | modular-roots-discrete-log | Căn bậc | Prime p≤997; xử lý a=0 và p=2. Tối đa 2.048 bước; công việc có budget. | normal: 3, 4; boundary: Vô nghiệm |
| bsgs | modular-roots-discrete-log | Logarit | Prime p≤997; base khác 0; trả exponent nhỏ nhất. Tối đa 2.048 bước; công việc có budget. | normal: 5; boundary: Vô nghiệm |
| permutations-count | combinatorics-inclusion-exclusion | Hoán vị | 0≤k≤n≤20; BigInt. Tối đa 2.048 bước; công việc có budget. | normal: 60; boundary: 1 |
| combinations-count | combinatorics-inclusion-exclusion | Hoán vị | 0≤k≤n≤20; BigInt. Tối đa 2.048 bước; công việc có budget. | normal: 10; boundary: 1 |
| inclusion-exclusion | combinatorics-inclusion-exclusion | Bao hàm | Ba tập số nguyên, mỗi tập≤16 phần tử. Tối đa 2.048 bước; công việc có budget. | normal: 5; boundary: 0 |
| probability-outcomes | probability-for-algorithms | Hợp | Xúc xắc đều n mặt, 1≤n≤16. Biến cố nhập các mặt. Tối đa 2.048 bước; công việc có budget. | normal: 1/2; boundary: 0/1 |
| conditional-probability | probability-for-algorithms | điều kiện | P(A/B)=(A∩B)/B; B rỗng được báo rõ. Tối đa 2.048 bước; công việc có budget. | normal: 2/3; boundary: Không xác định |
| expectation | probability-for-algorithms | Kỳ vọng | Uniform die n mặt, 1≤n≤16; phân số chính xác. Tối đa 2.048 bước; công việc có budget. | normal: 7/2; boundary: 1/1 |
| nim-xor | nim-sprague-grundy | Nim | ≤8 piles, mỗi pile 0–20, normal play. Tối đa 2.048 bước; công việc có budget. | normal: 2; boundary: 0 |
| nim-winning-move | nim-sprague-grundy | Nim | ≤8 piles, mỗi pile 0–20, normal play. Tối đa 2.048 bước; công việc có budget. | normal: 0: 3→1; boundary: Không có nước thắng |
| grundy-mex | nim-sprague-grundy | Grundy | Đồ thị nước đi DAG ≤12 trạng thái. Tối đa 2.048 bước; công việc có budget. | normal: 0, 1, 0, 2; boundary: 0 |
| minimax | alpha-beta-pruning | Hai cận | Số lá là lũy thừa 2, ≤16 lá; root MAX, luân phiên MIN/MAX. Tối đa 2.048 bước; công việc có budget. | normal: 6; boundary: -5 |
| alpha-beta | alpha-beta-pruning | Hai cận | Số lá là lũy thừa 2, ≤16 lá; root MAX, luân phiên MIN/MAX. Tối đa 2.048 bước; công việc có budget. | normal: 6; boundary: -5 |
| singly-linked-list | linked-lists | Danh sách đơn | List ≤15 nodes, ≤24 thao tác. Tối đa 2.048 bước; công việc có budget. | normal: 7; boundary: Rỗng |
| doubly-linked-list | linked-lists | Danh sách đôi | List ≤15 nodes, ≤24 thao tác. Tối đa 2.048 bước; công việc có budget. | normal: 7; boundary: Rỗng |
| floyd-cycle | linked-lists | nhanh/chậm | ≤15 nodes; k là đầu chu trình, −1 nghĩa không có. Tối đa 2.048 bước; công việc có budget. | normal: 1; boundary: Không có chu trình |
| hash-chaining | hash-tables | Chaining | Capacity 1–16; tối đa 12 keys, normalized modulo. Tối đa 2.048 bước; công việc có budget. | normal: 1, 6, 11; boundary:  |
| hash-linear-probing | hash-tables | Chaining | Capacity 1–16; tối đa 12 keys, normalized modulo. Tối đa 2.048 bước; công việc có budget. | normal: 1, 6, 11; boundary:  |
| hash-rehash | hash-tables | Rehash | Capacity 1–16; tối đa 12 keys, normalized modulo. Tối đa 2.048 bước; công việc có budget. | normal: 1, 6, 11; boundary:  |
| bst-search | binary-search-trees | Tìm | Cây ≤15 keys. Tối đa 2.048 bước; công việc có budget. | normal: Có; boundary: Không có |
| bst-insert | binary-search-trees | Tìm | Cây ≤15 keys. Tối đa 2.048 bước; công việc có budget. | normal: 3, 4, 5, 7; boundary: 1 |
| bst-delete | binary-search-trees | Xóa | Cây ≤15 keys. Tối đa 2.048 bước; công việc có budget. | normal: 2, 3, 4, 6, 7, 8; boundary:  |
| heap-push-pop | heaps-priority-queues | Biểu diễn | ≤15 keys; 0≤k≤n. Tối đa 2.048 bước; công việc có budget. | normal: 1, 3, 5, 7, 9; boundary:  |
| build-heap | heaps-priority-queues | build-heap | ≤15 keys; 0≤k≤n. Tối đa 2.048 bước; công việc có budget. | normal: 1, 3, 7, 9, 5; boundary:  |
| heap-top-k | heaps-priority-queues | Top-k | ≤15 keys; 0≤k≤n. Tối đa 2.048 bước; công việc có budget. | normal: 9, 7, 5; boundary:  |
| avl-insert | balanced-search-trees | AVL | ≤15 unique keys. Tối đa 2.048 bước; công việc có budget. | normal: 10, 20, 25, 28, 30; boundary:  |
| red-black-insert | balanced-search-trees | Red-black | ≤15 unique keys. Tối đa 2.048 bước; công việc có budget. | normal: 10, 20, 25, 28, 30; boundary:  |
| splay-access | balanced-search-trees | Splay | ≤15 unique keys. Tối đa 2.048 bước; công việc có budget. | normal: 25; boundary: Không có |
| btree-insert | b-trees | B-tree | ≤15 unique keys, minimum degree 2. Tối đa 2.048 bước; công việc có budget. | normal: 1, 2, 3, 4, 5, 6, 7, 8, 9; boundary:  |
| bplus-range | b-trees | B+ | ≤15 unique keys, 3 keys/page; range inclusive. Tối đa 2.048 bước; công việc có budget. | normal: 3, 4, 5, 6, 7; boundary:  |
| trie-insert-search | tries-radix-trees | Bất biến | ≤6 từ phân cách /, mỗi từ≤8 code points. Tối đa 2.048 bước; công việc có budget. | normal: Có; boundary: Không có |
| trie-delete | tries-radix-trees | Bất biến | ≤6 từ phân cách /, mỗi từ≤8 code points. Tối đa 2.048 bước; công việc có budget. | normal: cat, dog; boundary:  |
| radix-compression | tries-radix-trees | nén | ≤6 từ phân cách /, mỗi từ≤8 code points. Tối đa 2.048 bước; công việc có budget. | normal: car, cat, dog; boundary:  |
| union-by-size | union-find |  | ≤12 nodes; union u v / find u. Tối đa 2.048 bước; công việc có budget. | normal: 0, 0, 0, 0, 4, 5; boundary: 0, 1, 2, 3, 4, 5 |
| path-compression | union-find |  | ≤12 nodes; union u v / find u. Tối đa 2.048 bước; công việc có budget. | normal: 0, 0, 0, 0, 4, 5; boundary: 0, 1, 2, 3, 4, 5 |
| segment-query | segment-fenwick-trees | Segment | ≤24 số; query [l,r), update k=value. Tối đa 2.048 bước; công việc có budget. | normal: 10; boundary: 0 |
| segment-update | segment-fenwick-trees | Segment | ≤24 số; query [l,r), update k=value. Tối đa 2.048 bước; công việc có budget. | normal: 14; boundary: Lỗi chỉ số |
| fenwick-query | segment-fenwick-trees | Fenwick | ≤24 số; query [l,r), update k=value. Tối đa 2.048 bước; công việc có budget. | normal: 10; boundary: 0 |
| fenwick-update | segment-fenwick-trees | Fenwick | ≤24 số; query [l,r), update k=value. Tối đa 2.048 bước; công việc có budget. | normal: 14; boundary: Lỗi chỉ số |
| kahn-topo | topological-scc | Kahn | Đồ thị ≤12 đỉnh, ≤30 cạnh. Tối đa 2.048 bước; công việc có budget. | normal: 0, 1, 2, 3; boundary: Chu trình |
| dfs-topo | topological-scc | Kahn | Đồ thị ≤12 đỉnh, ≤30 cạnh. Tối đa 2.048 bước; công việc có budget. | normal: 0, 2, 1, 3; boundary: Chu trình |
| tarjan-scc | topological-scc | liên thông mạnh | Đồ thị ≤12 đỉnh, ≤30 cạnh. Tối đa 2.048 bước; công việc có budget. | normal: 0,1 / 2,3 / 4; boundary: 0 / 1 / 2 / 3 / 4 |
| kosaraju-scc | topological-scc | liên thông mạnh | Đồ thị ≤12 đỉnh, ≤30 cạnh. Tối đa 2.048 bước; công việc có budget. | normal: 0,1 / 2,3 / 4; boundary: 0 / 1 / 2 / 3 / 4 |
| scc-condensation | topological-scc | liên thông mạnh | Đồ thị ≤12 đỉnh, ≤30 cạnh. Tối đa 2.048 bước; công việc có budget. | normal: 3 SCC; boundary: 5 SCC |
| bridges-lowlink | bridges-articulation | cầu | Đồ thị ≤12 đỉnh, ≤30 cạnh. Tối đa 2.048 bước; công việc có budget. | normal: 1–3, 3–4; boundary:  |
| articulation-lowlink | bridges-articulation | đỉnh khớp | Đồ thị ≤12 đỉnh, ≤30 cạnh. Tối đa 2.048 bước; công việc có budget. | normal: 1, 3; boundary:  |
| euler-check | euler-hamilton | Điều kiện | Đồ thị ≤12 đỉnh, ≤30 cạnh. Tối đa 2.048 bước; công việc có budget. | normal: Chu trình Euler; boundary: Chu trình Euler |
| hierholzer | euler-hamilton | Hierholzer | Đồ thị ≤12 đỉnh, ≤30 cạnh. Tối đa 2.048 bước; công việc có budget. | normal: 0, 1, 2, 0; boundary: 0 |
| hamilton-search | euler-hamilton | Hamilton | ≤8 đỉnh; 50.000 công việc. Tối đa 2.048 bước; công việc có budget. | normal: 0, 1, 2, 3, 4, 0; boundary: Không có chu trình |
| max-flow-augment | max-flow | thặng dư | ≤8 đỉnh; capacity 0–20; edges u v capacity. Tối đa 2.048 bước; công việc có budget. | normal: 4; boundary: 0 |
| min-cut | max-flow | min-cut | ≤8 đỉnh; capacity 0–20; edges u v capacity. Tối đa 2.048 bước; công việc có budget. | normal: 4; boundary: 0 |
| bipartite-augment | bipartite-matching | Đường tăng | Hai phía đánh số riêng; mỗi phía≤3, edges left right. Tối đa 2.048 bước; công việc có budget. | normal: 3; boundary: 0 |
| matching-as-flow | bipartite-matching | luồng | Hai phía đánh số riêng; mỗi phía≤3, edges left right. Tối đa 2.048 bước; công việc có budget. | normal: 3; boundary: 0 |
| min-cost-assignment | bipartite-matching | chi phí | Mỗi phía≤3; edges left right cost, /cost/≤20. Tối đa 2.048 bước; công việc có budget. | normal: 2; 2; boundary: 0; 0 |
| min-cost-flow | min-cost-flow | đổi tuyến | ≤8 đỉnh; edges u v capacity cost; capacity≤20, /cost/≤20. Tối đa 2.048 bước; công việc có budget. | normal: 2; 3; boundary: 0; 0 |
| dsu-rollback | dsu-rollback | path compression | ≤12 nodes, 24 operations; không path compression. Tối đa 2.048 bước; công việc có budget. | normal: Không; boundary: Không |
| offline-connectivity | dsu-rollback | khoảng thời gian | ≤12 nodes; 24 events; mỗi cạnh chỉ active một lần tại một thời điểm. Tối đa 2.048 bước; công việc có budget. | normal: Không, Có, Không; boundary: Không |
| ancestor-table | lca-binary-lifting | Bảng tổ tiên | Cây liên thông ≤12 đỉnh; HLD range sums không dùng Euler tour trên cây. Tối đa 2.048 bước; công việc có budget. | normal: 3 levels; boundary: 1 levels |
| lca-query | lca-binary-lifting | Bảng tổ tiên | Cây liên thông ≤12 đỉnh; HLD range sums không dùng Euler tour trên cây. Tối đa 2.048 bước; công việc có budget. | normal: 0; boundary: 0 |
| tree-distance | lca-binary-lifting | Khoảng cách | Cây liên thông ≤12 đỉnh; HLD range sums không dùng Euler tour trên cây. Tối đa 2.048 bước; công việc có budget. | normal: 4; boundary: 0 |
| hld-decompose | heavy-light-decomposition | Dữ liệu | Cây liên thông ≤12 đỉnh; HLD range sums không dùng Euler tour trên cây. Tối đa 2.048 bước; công việc có budget. | normal: 0, 1, 3, 4, 2, 5, 6; boundary: 0 |
| hld-path-query | heavy-light-decomposition | Dữ liệu | Cây liên thông ≤12 đỉnh; HLD range sums không dùng Euler tour trên cây. Tối đa 2.048 bước; công việc có budget. | normal: 17; boundary: 5 |
| centroid-build | centroid-decomposition | Tiền xử lý | Cây liên thông ≤12 đỉnh; HLD range sums không dùng Euler tour trên cây. Tối đa 2.048 bước; công việc có budget. | normal: 0; boundary: 0 |
| nearest-red | centroid-decomposition | nút đỏ | Cây liên thông ≤12 đỉnh; HLD range sums không dùng Euler tour trên cây. Tối đa 2.048 bước; công việc có budget. | normal: 4; boundary: Không có nút đỏ |
| binary-search | searching | lower_bound | 32 phần tử | found: theo ví dụ Binary Search hiện có; duplicates: theo ví dụ Binary Search hiện có; absent: theo ví dụ Binary Search hiện có; empty: theo ví dụ Binary Search hiện có |

## Kết quả bàn giao — 2026-10-12

- Phạm vi: 160 scenario mới + Binary Search đã có = **161**, nhúng đúng một lần vào **62 notes**; đối chiếu 161 ID trong plan, không thiếu/ngoài phạm vi, không có chủ đề đã loại.
- `pnpm typecheck`: exit 0; 132 files, 0 errors, 0 warnings, 0 hints.
- `pnpm build`: exit 0; Astro xuất site và Pagefind lập chỉ mục 128 pages. Pagefind thông báo tiếng Việt chưa có stemming; tìm kiếm vẫn lập chỉ mục được.
- Source review độc lập đã hoàn tất; các phát hiện về validation, cây gọi, trie deletion, tree metadata, vị trí nhúng, alignment và graph loops đã được sửa.
- UI đã quan sát: ba demo sorting độc lập, insertion key/gap, Fibonacci/cây gọi, sàng/SPF n=1, preset update sai không replay input cũ, Aho hai mẫu 8 ký tự, residual min-cost flow 2/cost 3, KMP Unicode `éaé`/`é` trả byte offsets `0, 3`.
- Không thêm/chạy test suite. Các kết quả trên không phải xác minh mọi input được chấp nhận hoặc đo hiệu năng/memory trường hợp xấu nhất.
- Source/CSS kiểm tra các nhánh reduced motion, pause khi tab ẩn, cleanup, fallback khi module lỗi và lỗi fence có vị trí nguồn. Chưa mô phỏng lỗi network tải module trong browser.
- Hướng dẫn mở rộng: `planning/visualization-author-guide.md`. Go runner và Kafka/database simulation chưa triển khai trong phạm vi DSA này.
- Toàn bộ thay đổi ở local, chưa commit/push/PR/publish.

- Theme sáng/tối đã quan sát trên min-cost flow; ảnh bàn giao: `dsa-inline-flow-final.png` trong thư mục visualization của chat. Preview đang chạy ở `http://127.0.0.1:4322/vi/notes/`.

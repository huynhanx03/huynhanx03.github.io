# Mở rộng visualization cho toàn bộ bộ notes DSA

Trạng thái: bản phạm vi và thiết kế để duyệt; chưa triển khai các scenario mới.

## Mục tiêu

Người đọc chạy dữ liệu mẫu hoặc input riêng, theo dõi trạng thái thuật toán trong chính đoạn note đang đọc. Phủ các thuật toán chính đã được trình bày trong cả 62 notes hiện có, không chỉ đặt một demo chung ở đầu mỗi bài.

Giữ player đã duyệt: manual/next/previous/play/pause/speed/scrub/reset/loop, input validation và immutable snapshots. Chạy bằng mô phỏng TypeScript; không tuyên bố chạy code Go thật khi chưa có runner. Chỉ sửa local, không commit/push/PR/publish.

## Ranh giới triển khai

- Scenario chứa input và logic trace, renderer chứa cách vẽ, player không phân nhánh theo thuật toán.
- Dùng lại indexed array; bổ sung renderer bảng/matrix, graph/tree, string alignment, call stack và các tập hợp/queue. Các renderer này cũng là nền cho service/Kafka sau này.
- Một thuật toán chính có definition riêng. Một note có thể nhúng nhiều ID ngay sau đoạn lý thuyết tương ứng.
- Các bài nền tảng dùng mô phỏng thao tác hoặc đếm trạng thái; không gán thuật toán giả cho khái niệm P/NP hoặc Big-O.
- Input mặc định nhỏ, deterministic. Mỗi scenario khai báo giới hạn riêng phù hợp với thuật toán; trace không vượt 2.048 frame. Với thuật toán tổ hợp/exponential, giới hạn input trước khi tạo trace và có giới hạn công việc độc lập với số frame.
- Graph input phải kiểm tra hướng/trọng số/kết nối/điều kiện tiền đề đúng theo scenario. Negative cycle, không có lời giải, pattern rỗng hoặc đường đi không tới được là kết quả có mô tả, không output mẫu thay thế.
- Chuỗi định nghĩa đơn vị ký tự rõ ràng. Số học lớn dùng BigInt với output dạng chuỗi; modulo/hash không tính bằng phép nhân Number thiếu chính xác.
- Các ví dụ suffix tree/SAM/Aho thể hiện xây cấu trúc thực sự. Nếu chỉ mô phỏng một phiên bản giáo dục (ví dụ suffix trie nén O(n²)), phải ghi đúng phiên bản và độ phức tạp; không gắn tên thuật toán tuyến tính cho bản brute force.
- Mỗi preset có expected output, giải thích các bước đổi state, và giới hạn. Source code đồng bộ chỉ bật khi có source khớp với trace; không highlight Go không tương ứng.

## Danh sách phủ nội dung

| Note | Scenario cần có | Renderer chính |
|---|---|---|
| problem-solving | Kiểm tra hợp đồng và quét tìm cực trị | Array + biến |
| complexity | Đếm vòng lặp tuyến tính, lồng nhau, chia đôi; tăng cap/amortized | Array + bảng đếm |
| abstract-data-types | Push/pop và invariant stack | Stack |
| arrays-and-slices | Alias/len/cap; two pointers; prefix sum; byte/rune | Array + bảng bộ nhớ |
| recursion | Call stack factorial; cây gọi Fibonacci | Stack + cây |
| linked-lists | Insert/delete singly linked list; double links; fast/slow cycle detection | Linked graph |
| stacks-queues-deques | Stack; circular queue; monotonic deque | Queue + array |
| hash-tables | Chaining; linear probing; rehash | Buckets + array |
| searching | Lower bound (đã có); upper bound; predicate đơn điệu tìm đáp án | Array + khoảng đáp án |
| elementary-sorting | Selection; insertion; bubble | Array |
| efficient-sorting | Merge; quick partition/sort; heap sort | Array + cây heap |
| distribution-sorting | Counting; LSD radix; bucket | Array + buckets |
| configuration-generation | Dãy bit/tập con; next permutation | Array + cây lựa chọn |
| backtracking | N-Queens và loại nhánh không hợp lệ | Board + cây |
| trees-and-traversals | Preorder; inorder; postorder; level order | Tree + stack/queue |
| binary-search-trees | Search; insert; delete ba trường hợp | Tree |
| heaps-priority-queues | Push/pop; build heap; top-k | Tree + array |
| graph-representation-bfs-dfs | Adjacency list/matrix; BFS; DFS | Graph + queue/stack |
| divide-and-conquer | Cây chia và ghép merge | Tree + array |
| greedy | Interval scheduling; phản ví dụ greedy coin | Timeline + array |
| dynamic-programming | Staircase top-down; bottom-up; truy vết trạng thái | DAG + bảng DP |
| dp-classics | LIS; 0/1 knapsack; edit distance | DP matrix + array |
| branch-and-bound | 0/1 knapsack với upper bound và pruning | Cây trạng thái |
| balanced-search-trees | AVL rotations/insert; red-black insert fixup; splay | Tree |
| b-trees | B-tree split/insert; B+ leaf links/range scan | Multiway tree |
| tries-radix-trees | Trie insert/search/delete; radix edge compression | Trie |
| union-find | Union by size; find/path compression | Forest |
| segment-fenwick-trees | Segment sum query/update; Fenwick prefix/query/update | Tree + array |
| shortest-paths | DAG relaxation; Dijkstra; Bellman–Ford và negative cycle | Weighted graph |
| floyd-warshall | DP qua đỉnh k; kiểm tra negative diagonal | Matrix + graph |
| minimum-spanning-trees | Kruskal; Prim; cut property | Graph + DSU |
| topological-scc | Kahn; DFS topo; Tarjan; Kosaraju; DAG ngưng tụ | Directed graph |
| bridges-articulation | DFS tin/low; bridges; articulation | Graph + DFS tree |
| euler-hamilton | Điều kiện Euler; Hierholzer; Hamilton backtracking nhỏ | Graph |
| max-flow | Residual graph; augmenting path; min cut | Flow graph |
| bipartite-matching | Augmenting path matching; chuyển sang flow; assignment có chi phí | Bipartite graph |
| string-matching | Prefix/KMP; Boyer–Moore bad-character và good-suffix | String alignment |
| suffix-approximate | Suffix sorting/LCP; approximate matching | Strings + matrix |
| data-compression | RLE encode/decode; Huffman tree/code/decode; LZ77 window encode/decode | String + coding tree |
| complexity-classes | Kiểm tra chứng chỉ Hamilton; enumerate vs verify | Graph + bộ đếm |
| rolling-hash | Polynomial prefix; substring hash; rolling window | String + bảng hash |
| manacher | Odd/even radii, mirror và mở rộng biên | String + array |
| z-function | Z-box reuse; pattern matching | String + array |
| aho-corasick | Trie; BFS failure links; scan nhiều pattern | Automaton + queue |
| suffix-array-construction | Doubling ranks; Kasai LCP | Bảng suffix/rank |
| suffix-automaton | Extend; suffix links; clones; đếm substring | Automaton |
| suffix-tree | Xây bản trie nén giáo dục; tìm mẫu theo cạnh; giải thích khác Ukkonen | Compressed trie |
| dsu-rollback | Union, snapshot, rollback; cạnh sống theo khoảng | Forest + history stack |
| lca-binary-lifting | Ancestor table; nâng độ sâu; LCA/khoảng cách | Tree + table |
| heavy-light-decomposition | Subtree sizes; heavy edges; phân rã đường đi và query | Tree + ranges |
| centroid-decomposition | Tìm centroid; cây phân rã; nearest red queries | Tree + bảng khoảng cách |
| min-cost-flow | Residual costs; shortest augmenting path; reroute cạnh ngược | Flow graph |
| modular-arithmetic-euclid | Normalize; Euclid/extended Euclid; binary exponentiation | Bảng số học |
| primes-factorization-divisors | Eratosthenes/SPF; trial division; Miller–Rabin; Pollard–Rho có seed; factorization/count/sum divisors | Sieve grid + table |
| arithmetic-functions | Phi; Möbius và factorization | Bảng số học |
| modular-inverse-crt | Inverse; CRT ghép hai đồng dư | Bảng số học |
| binomial-lucas-wilson | Pascal/binomial modulo; Lucas digits; Wilson/factorial bỏ bội p | Matrix + bảng số học |
| modular-roots-discrete-log | Euler criterion; p≡3 mod 4 root; Tonelli–Shanks; baby-step giant-step | Bảng số học |
| combinatorics-inclusion-exclusion | Permutation/combination; inclusion–exclusion | Tập hợp + bảng đếm |
| probability-for-algorithms | Không gian mẫu; conditional probability; expectation | Bảng outcomes |
| nim-sprague-grundy | Nim XOR; winning move; mex/Grundy | Piles + DAG |
| alpha-beta-pruning | Minimax; alpha/beta bounds; pruned branches | Game tree |

Đường đi Euler/Hierholzer trong đồ thị không phải Euler tour trên cây đã bị loại. Không bổ sung Persistent structure, Wavelet tree, Li Chao tree, Euler tour trên cây, 0–1 BFS, 2-SAT, hình học tính toán, FFT, ternary search hoặc parallel binary search.

## Thứ tự triển khai

1. Renderer array/table/stack và các scenario DSA cơ bản, sorting, recursion, greedy, DP.
2. Renderer graph/tree cùng các cấu trúc dữ liệu, traversal, shortest paths, connectivity, flow.
3. Renderer string/automaton và các scenario chuỗi/nén.
4. Số học, tổ hợp, xác suất, game tree và các kỹ thuật nâng cao còn lại.

Thứ tự là cách chia việc, không phải giới hạn phạm vi. Một chặng xong vẫn tiếp tục chặng tiếp theo sau khi các lỗi của chặng đó được xử lý.

## Điều kiện hoàn tất

- Có bảng đối chiếu từng scenario → note/section, preset/expected output và giới hạn input; không đánh dấu hoàn tất chỉ vì note có fence.
- Mỗi thuật toán chính trong bảng trên có mô phỏng thực sự, output tính từ input, và state thay đổi có lời giải thích.
- Player chung vẫn không chứa switch theo thuật toán; renderer có thể tái dùng cho chủ đề khác.
- Nhúng đúng vị trí đọc, nhiều instance độc lập, rewind/loop đúng snapshot; reduced motion giữ đủ thông tin.
- Typecheck và build thành công; không thêm/chạy test nếu chủ repo chưa yêu cầu.
- Báo rõ mọi scenario chưa hoàn tất hoặc chỉ phủ một phiên bản, không tuyên bố đã làm toàn bộ khi còn khoảng trống.

Bản này mở rộng phạm vi từ demo một thuật toán sang toàn bộ bộ notes. Cần duyệt phạm vi đã viết trước kế hoạch triển khai theo quy trình brainstorming.

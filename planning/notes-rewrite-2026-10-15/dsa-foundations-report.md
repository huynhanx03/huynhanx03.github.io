# DSA nền tảng và cấu trúc dữ liệu — 2026-10-15

## Phạm vi

22 bài tiếng Việt, từ ADT đến trie/radix tree. Filename, tiêu đề dịch, thứ tự series, tag và các khối visualization được giữ. Bài được tổ chức lại theo một câu hỏi hoặc tình huống xuyên suốt; các phần cần điều kiện, chứng minh, chi phí và giới hạn đều được đặt cạnh ví dụ tương ứng.

## Nội dung được phát triển

| Bài | Trọng tâm sau biên tập |
| --- | --- |
| ADT | Hợp đồng thao tác, thứ tự, quyền sở hữu và cách chọn biểu diễn theo workload. |
| Mảng và slice | Truy cập theo chỉ số, chi phí thao tác, hai con trỏ, prefix sum và đơn vị ký tự. |
| Độ phức tạp | Kích thước input/mô hình, cận, trường hợp, vòng lặp, amortized và bộ nhớ. |
| Lớp độ phức tạp | Bài toán quyết định, chứng chỉ, P/NP/NP-hard, kích thước mã hóa và chiều reduction. |
| Giải bài toán | Hợp đồng, lời giải nền, bất biến, code theo trạng thái, chọn ca kiểm tra. |
| Đệ quy | Hợp đồng trạng thái, call stack, độ sâu so với số lời gọi, alias/copy và bài toán con. |
| Chia để trị | Merge sort, nửa khoảng, buffer, chi phí theo tầng và phân biệt dạng recurrence. |
| Tìm kiếm | Lower/upper bound, bất biến biên và tìm điểm chuyển đơn điệu. |
| Sắp xếp cơ bản | Selection, insertion, bubble; trạng thái prefix/suffix và các tiêu chí so sánh. |
| Sắp xếp hiệu quả | Merge sort, quicksort, heapsort, cận dưới so sánh và điều kiện chi phí. |
| Sắp xếp phân phối | Counting, radix, bucket cùng giả định miền khóa và chi phí từng pha. |
| Hash table | Hash/equality, va chạm, tải, worst case và phạm vi của trung bình kỳ vọng. |
| Heap/priority queue | Heap invariant, Push/Pop, heapify, duplicate key và chi phí thao tác. |
| Linked list | Head, đảo liên kết, danh sách đôi, slow/fast và tradeoff truy cập. |
| Stack/queue/deque | Hợp đồng LIFO/FIFO/hai đầu, vòng đệm và deque đơn điệu. |
| Cây và traversal | Parent/child, chiều sâu/chiều cao, DFS/BFS và biểu diễn cây tổng quát. |
| BST | Inorder, tìm/chèn/xóa theo từng trường hợp và suy giảm chiều cao. |
| Cây cân bằng | AVL, red-black, splay, phép quay và bảo đảm amortized/worst-case riêng. |
| B-tree/B+ tree | Quy ước bậc/độ đầy, split/merge, lá và quét range của B+. |
| Segment/Fenwick | Segment tree, lazy propagation, Fenwick blocks, update/query và điều kiện phép gộp. |
| Union-Find | Forest đại diện, path compression, union-by-size, ứng dụng thêm cạnh và giới hạn khi xóa. |
| Trie/radix | Prefix, terminal, Unicode, xóa khóa, nén đường và chi phí trả kết quả truy vấn. |

## Gộp, thay và giới hạn

Các đoạn lặp về định nghĩa/công thức được gộp vào lời giải thích nơi chúng được dùng. Ví dụ được giữ hoặc làm lại theo một input nhỏ có thể theo dõi; các câu tự kiểm tra được thay bằng câu có đáp án suy luận. Một số hình dung ví von hoặc cận không nêu điều kiện được thay bằng mô tả cấu trúc và giả định cụ thể. Không thêm Euler-tour LCA, persistent structure, wavelet tree hay Li Chao tree; phạm vi tuân theo roadmap đã duyệt.

Các trích dẫn kiểu tên sách/chương từ bản cũ chỉ được giữ khi có thể đối chiếu; báo cáo không khẳng định đã đọc những sách không có trong nguồn kiểm tra của đợt này. Mọi bài vẫn giữ link đọc thêm còn hữu ích. Bảng này ghi trọng tâm và loại chỉnh sửa theo nhóm; không khẳng định từng câu hay từng ví dụ cũ được giữ nguyên.

## Kiểm tra tài liệu

So sánh snapshot trước/sau và metadata được ghi trong `coverage.json`. Những bài DSA có visualization vẫn giữ nguyên bytes của từng fence; audit toàn bộ website ghi nhận 161/161 fences. Không chạy test, snippet, benchmark hay build trong đợt biên tập này.

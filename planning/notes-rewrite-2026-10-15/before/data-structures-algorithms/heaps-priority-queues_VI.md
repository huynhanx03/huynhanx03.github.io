---
title: "Heap và priority queue: giữ cực trị mà không sắp toàn bộ"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/heaps-priority-queues"
translationPending: true
series: "DSA cơ bản"
seriesOrder: 17
tags: ["heap", "priority-queue", "sift-up", "sift-down"]
description: "Heap nhị phân trong mảng, chi phí từng thao tác và cách dùng với Dijkstra, top-k."
draft: false
---

Priority queue lấy phần tử có độ ưu tiên cao nhất, không nhất thiết là phần tử vào trước. Min-heap nhị phân là một cách cài: khóa ở cha không lớn hơn khóa ở hai con. Nó chỉ bảo đảm **gốc** là nhỏ nhất; các phần tử còn lại không được sắp hoàn toàn. Vì vậy tìm một giá trị bất kỳ vẫn có thể `O(n)`.

## 1. Biểu diễn và thao tác

Với mảng đánh chỉ số từ `0`, con của `i` ở `2i+1`, `2i+2`; cha của `i>0` là `(i-1)/2`. `Push(x)` đặt `x` cuối mảng rồi **sift-up**: đổi với cha chừng nào khóa con còn nhỏ hơn. `PopMin()` lấy gốc, đưa phần tử cuối lên gốc rồi **sift-down** với con nhỏ hơn cho tới khi bất biến heap phục hồi. Chiều cao heap hoàn chỉnh là `O(log n)`, nên cả hai thao tác `O(log n)`; xem min `O(1)`.



Bất biến sift-up: chỉ có thể có một vi phạm trên đường từ nút mới lên gốc; các cây con khác vẫn là heap. Bất biến sift-down đối xứng. Nếu dùng `container/heap` trong Go, kiểu của bạn cần cài `Len`, `Less`, `Swap`, `Push`, `Pop`; hai hàm `Push/Pop` của interface thao tác với slice, còn các hàm của gói mới thực hiện điều chỉnh heap. Nhầm hai tầng API thường tạo priority queue sai.



```note-visualization
{"id":"heap-push-pop","preset":"normal"}
```

## 2. Vì sao build-heap là `O(n)`?

Thay vì thêm từng phần tử (`O(n log n)`), ta sift-down từ nút trong cuối về gốc. Phần lớn nút nằm rất thấp và chỉ dịch ít bước. Có tối đa khoảng `n/2^{h+1}` nút ở chiều cao `h`, nên tổng công việc tỷ lệ `n Σ(h/2^h)=O(n)`. Kết quả là một heap hợp lệ, **không phải** mảng đã sắp.





```note-visualization
{"id":"build-heap","preset":"normal"}
```

## 3. Top-k và cập nhật ưu tiên

Để giữ `k` phần tử lớn nhất trong luồng dài `n`, dùng min-heap kích thước tối đa `k`: khi thấy số lớn hơn gốc, thay gốc và sift-down. Chi phí `O(n log k)`, bộ nhớ `O(k)`. Nếu priority của một phần tử thay đổi, heap cần vị trí của nó để sift-up/down. Một map từ ID đến chỉ số trong heap có thể hỗ trợ `decrease-key`; mỗi lần `Swap` phải cập nhật map. Cách đơn giản trong Dijkstra là thêm bản ghi mới và bỏ bản ghi cũ khi lấy ra, đổi lấy heap có thể chứa nhiều bản ghi cho cùng đỉnh.



Nếu hai phần tử có cùng priority, heap thông thường không giữ thứ tự vào trước. Cần FIFO giữa các khóa bằng nhau thì so sánh cặp `(priority, sequenceNumber)`.



```note-visualization
{"id":"heap-top-k","preset":"normal"}
```

**Tự luyện:** (1) Từ `[5,2,7,1]`, build min-heap từ dưới lên. (2) Mô phỏng `Push(0)` và `PopMin`. (3) Giải thích vì sao duyệt toàn bộ mảng heap không cho dãy tăng.

*Đối chiếu: Jain, chương 11; Drozdek, chương 6; Lê Minh Hoàng, phần 2 §8.*

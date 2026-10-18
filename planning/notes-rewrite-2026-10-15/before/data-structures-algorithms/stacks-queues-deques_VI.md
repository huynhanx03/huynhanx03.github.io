---
title: "Stack, queue và deque: thứ tự lấy ra quyết định cấu trúc"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/stacks-queues-deques"
translationPending: true
series: "DSA cơ bản"
seriesOrder: 7
tags: ["stack", "queue", "deque", "ring-buffer", "go"]
description: "Hiểu LIFO, FIFO, deque và tự xây queue vòng không giữ mãi backing array."
draft: false
---

Ba cấu trúc này khác nhau ở **hợp đồng lấy phần tử**, không nhất thiết ở hình dạng bộ nhớ. Stack lấy phần tử mới nhất (LIFO); queue lấy phần tử cũ nhất (FIFO); deque cho thêm và lấy ở cả hai đầu. Chọn cấu trúc đúng giúp diễn đạt thuật toán: DFS dùng stack, BFS dùng queue, sliding-window maximum thường dùng deque đơn điệu.

## 1. Stack: đỉnh là cuối slice

```go
type Stack[T any] []T



func (s *Stack[T]) Push(x T) { *s = append(*s, x) }

func (s *Stack[T]) Pop() (T, bool) {
    var zero T
    if len(*s) == 0 { return zero, false }
    i := len(*s) - 1
    x := (*s)[i]
    (*s)[i] = zero // bỏ tham chiếu để GC có thể thu hồi đối tượng
    *s = (*s)[:i]
    return x, true
}
```

`Push` có chi phí amortized `O(1)`; một lần cấp phát lại có thể `O(n)`. `Pop` là `O(1)`. Hàm trả `bool` để phân biệt stack rỗng với giá trị zero hợp lệ. Stack lời gọi của đệ quy cũng là LIFO: frame mới phải hoàn tất trước khi quay về frame cũ. Vì vậy nhiều thuật toán đệ quy có thể chuyển sang stack tường minh.



```note-visualization
{"id":"stack-operations","preset":"normal"}
```

## 2. Queue: `head` và vòng đệm

`q = q[1:]` lấy đầu trong `O(1)` nhưng slice còn tham chiếu backing array; nếu queue sống lâu, vùng lớn có thể bị giữ lại. Dùng một mảng vòng có `head`, `size` và `cap`: vị trí phần tử thứ `i` là `(head+i)%cap`. Khi thêm cuối, ghi vào `(head+size)%cap`, tăng `size`; khi lấy đầu, xóa ô tại `head`, đặt `head=(head+1)%cap`, giảm `size`. Bất biến là `0 <= size <= cap`, và `size` phần tử logic nằm theo thứ tự vòng tính từ `head`.



Khi đầy, cấp vùng mới lớn hơn, sao chép `size` phần tử theo thứ tự logic rồi đặt `head=0`. Nếu tăng capacity theo hệ số cố định lớn hơn 1, tổng chi phí sao chép qua nhiều lần thêm là tuyến tính theo số phần tử đã thêm, nên mỗi `Enqueue` có chi phí amortized `O(1)`. Có thể giảm kích thước khi queue quá thưa, nhưng phải dùng ngưỡng khác với ngưỡng tăng để tránh tăng/giảm liên tục.



```note-visualization
{"id":"circular-queue","preset":"normal"}
```

## 3. Deque và tính đơn điệu

Deque cho `PushFront`, `PushBack`, `PopFront`, `PopBack` trong `O(1)` amortized khi cài bằng ring buffer. Với cửa sổ độ dài `k` và yêu cầu tìm giá trị lớn nhất mỗi cửa sổ, lưu **chỉ số** trong deque theo thứ tự giá trị giảm dần: trước khi thêm chỉ số `i`, bỏ ở cuối những chỉ số có giá trị không lớn hơn `a[i]`; bỏ ở đầu chỉ số đã ra ngoài cửa sổ. Đầu deque luôn là chỉ số của cực đại. Mỗi chỉ số vào và ra tối đa một lần, nên toàn bộ `n` phần tử xử lý trong `O(n)`, không phải `O(nk)`.



Một priority queue cũng lấy phần tử “quan trọng nhất”, nhưng không duy trì FIFO và không xóa phần tử hết hạn ở đầu theo cùng cách; dùng nó cho sliding window đòi hỏi xử lý phần tử cũ riêng.



```note-visualization
{"id":"monotonic-deque","preset":"normal"}
```

**Tự luyện:** (1) Kiểm tra ngoặc `()[]{}` bằng stack, nêu đầu vào sai sớm nhất. (2) Tự viết queue vòng với `Grow`, `Enqueue`, `Dequeue` và giải thích vì sao cần reset ô vừa lấy. (3) Vẽ trạng thái deque cho `[2,1,3,4,2]`, `k=3`.

*Đối chiếu: Jain, chương 8–9; Drozdek, chương 4; Lê Minh Hoàng, phần 2 §5.*

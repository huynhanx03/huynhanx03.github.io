---
title: "Stack, queue và deque: thứ tự lấy ra quyết định cấu trúc"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/stacks-queues-deques"
series: "DSA cơ bản"
seriesOrder: 7
tags: ["stack", "queue", "deque", "ring-buffer", "go"]
description: "Hiểu LIFO, FIFO, deque và tự xây queue vòng không giữ mãi backing array."
draft: false
updated: 2026-10-15
---

Khi duyệt các phòng theo từng lớp khoảng cách, ta cần lấy phòng được phát hiện sớm nhất. Khi quay lại một lựa chọn vừa thử, ta cần lấy trạng thái mới nhất. Queue và stack diễn đạt hai thứ tự đó; deque mở rộng để thao tác cả hai đầu.

Stack dùng LIFO, queue dùng FIFO. Chúng là hợp đồng thao tác, không bắt buộc phải cài bằng node hay array. DFS có thể dùng stack, BFS cần queue, còn cực đại cửa sổ thường dùng một deque chỉ giữ các ứng viên còn hữu ích.

## Stack dùng cuối slice làm đỉnh

Khai báo Go generic sau cần hỗ trợ generics (Go 1.18 trở lên). Zero value dùng được; caller giữ một biến Stack rồi gọi method, không truyền receiver pointer nil.

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

Push nối cuối. Pop giữ phần tử cuối để trả, đặt ô đó về zero rồi rút len. Đặt zero giúp bỏ tham chiếu cũ nếu T chứa pointer, để array sống lâu không giữ đối tượng đã Pop ngoài ý muốn. Việc xóa không đổi số phần tử đang truy cập cho tới lúc reslice.

Với Push A rồi B, Pop nhận B rồi A. Pop trên rỗng trả `(zero,false)` khác với việc lấy một phần tử có giá trị zero thật `(zero,true)`. Theo mô hình array tăng capacity hợp lý, Push amortized O(1), một lần cấp/copy có thể O(n); Pop O(1).

```note-visualization
{"id":"stack-operations","preset":"normal"}
```

Stack lời gọi cũng LIFO: frame con hoàn tất rồi mới trả về frame cha. Stack tường minh có thể thay nhiều đệ quy, nhưng frame đôi lúc cần giữ thêm “đang ở bước nào”, không chỉ node, để tái tạo postorder hay công việc sau lời gọi con.

## Queue cần giữ thứ tự logic qua việc quay vòng

Dùng slice và dịch toàn phần còn lại sau mỗi Dequeue tốn O(n). Chỉ `q=q[1:]` thì O(1) về descriptor nhưng có thể giữ array lớn cùng ô tham chiếu cũ. Một queue sống lâu nên có cách dùng lại khoảng trống và giải phóng tham chiếu.

Ring buffer có vùng dài C, head là vị trí phần tử đầu, size là số phần tử sống. Phần tử logic thứ i nằm ở `(head+i)%C`, với `0≤i<size`. Enqueue ghi ở `(head+size)%C` rồi tăng size; Dequeue đọc/xóa ô head, chuyển `head=(head+1)%C` rồi giảm size. Invariant `0≤size≤C` phân biệt đầy với rỗng dù hai vị trí vòng có thể trùng nhau.

Ví dụ C=4, head=2, size=3, ba mục A,B,C nằm ở ô 2,3,0. Dequeue A làm head=3,size=2; Enqueue D ghi ô `(3+2)%4=1`, cho thứ tự logic B,C,D dù thứ tự ô vật lý khác. Duyệt thẳng array không phản ánh thứ tự FIFO.

```note-visualization
{"id":"circular-queue","preset":"normal"}
```

Khi size=C, không ghi đè phần tử đầu; cần từ chối nếu queue dung lượng cố định hoặc Grow nếu queue động. Grow cấp vùng lớn hơn, chép từng phần tử theo **thứ tự logic** sang index 0..size-1 rồi head=0. C=0 phải tăng vùng trước khi lấy modulo để tránh chia 0.

Nếu tăng theo hệ số cố định >1, tổng copy qua nhiều lần tăng là tuyến tính theo số mục đã thêm, Enqueue amortized O(1). Dequeue không shrink là O(1). Muốn shrink, chọn ngưỡng thưa thấp hơn hẳn ngưỡng đầy, tránh thêm một mục tăng rồi bớt một mục giảm liên tục. Xóa ô lấy ra giúp GC bỏ đối tượng con; thu nhỏ slice logic không tự giảm vùng đệm đã cấp.

## Deque mở cả hai đầu, rồi thêm bất biến đơn điệu

Ring buffer hỗ trợ PushFront/PushBack/PopFront/PopBack O(1) amortized với tăng vùng thích hợp. Điều đó chưa tự tìm maximum cửa sổ; cần thêm quy tắc loại ứng viên không còn có ích.

Với cửa sổ k, lưu **index** trong deque theo thứ tự tăng dần, đồng thời giá trị ở các index giảm dần. Khi xử lý i, bỏ index đầu đã ngoài `[i-k+1,i]`. Ở cuối, bỏ mọi index có giá trị `≤a[i]`, rồi thêm i. Index mới vừa không nhỏ hơn những ứng viên bị bỏ, vừa hết hạn muộn hơn, nên chúng không thể thắng nó trong cửa sổ tương lai. Đầu deque là maximum của cửa sổ hiện tại khi đã đủ k phần tử.

Với `[2,1,3,4,2]`, k=3:

| i, giá trị | Index trong deque sau cập nhật | Maximum khi đủ cửa sổ |
| --- | --- | --- |
| 0,2 | `[0]` | chưa đủ |
| 1,1 | `[0,1]` | chưa đủ |
| 2,3 | `[2]` | 3 |
| 3,4 | `[3]` | 4 |
| 4,2 | `[3,4]` | 4 |

```note-visualization
{"id":"monotonic-deque","preset":"normal"}
```

Dấu `≤` giữ ứng viên mới nhất giữa các giá trị bằng nhau, hợp lệ khi chỉ cần giá trị maximum. Nếu hợp đồng muốn index sớm nhất khi bằng, cần giữ giá trị bằng theo chính sách khác, chẳng hạn chỉ bỏ `<`. Vì giữ index, ta biết chính xác mục nào hết hạn; giữ mỗi số không đủ phân biệt các lần xuất hiện giống nhau.

Mỗi index được thêm một lần và bị bỏ nhiều nhất một lần, nên tổng O(n), phụ O(k). Một lượt có thể bỏ nhiều mục, nhưng tổng chuỗi vẫn tuyến tính; không nhân n với k chỉ vì thấy vòng while trong vòng for. Yêu cầu `1≤k≤n` cho phiên bản xuất mọi cửa sổ đủ độ dài; k=0 hoặc lớn hơn n cần quyết định lỗi/rỗng theo API.

Priority queue cũng giữ cực trị nhưng không có cùng quy tắc xóa hết hạn ở đầu. Dùng heap cần handle hoặc stale-entry policy, và chi phí có thể khác. Deque đơn điệu tận dụng việc các index hết hạn theo thứ tự và sự lấn át theo giá trị.

## Áp dụng và đối chiếu

**Bài ngoặc:** gặp ngoặc mở thì Push; gặp ngoặc đóng thì cần stack không rỗng và đỉnh đúng loại rồi Pop; hết input cần stack rỗng. `([)]` sai ngay khi gặp `)`: đỉnh là `[`, dù tổng số mở/đóng có thể cân bằng. Ngoặc mở còn dư cũng là lỗi, không chỉ Pop rỗng.

**Bài queue:** khi Grow từ trạng thái C=4,head=2,size=3 ở trên, vùng mới phải bắt đầu A,B,C rồi head=0. Copy vật lý ô 0,1,2 sẽ lấy sai thứ tự và cả ô không sống. Đây là cách dùng invariant logic để kiểm tra code.

**Bài deque:** giải thích vì sao bỏ 1 ở index 1 khi thấy 3 ở index 2 là an toàn. 3 lớn hơn và ở lại cửa sổ ít nhất lâu bằng 1; khi 3 chưa hết hạn, 1 không thể là maximum, còn khi 3 hết hạn thì 1 đã hết hạn từ trước. Lập luận ấy mới cho phép bỏ ứng viên, không chỉ là cách ghi nhớ thao tác PopBack.

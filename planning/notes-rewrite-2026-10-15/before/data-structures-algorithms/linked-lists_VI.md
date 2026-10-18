---
title: "Danh sách liên kết: đổi truy cập ngẫu nhiên lấy khả năng nối nút"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/linked-lists"
translationPending: true
series: "DSA cơ bản"
seriesOrder: 6
tags: ["linked-list", "pointer", "invariant", "go"]
description: "Danh sách đơn, đôi và vòng; cách chèn, xóa, đảo danh sách và phân tích chi phí thật sự."
draft: false
---

Một slice đặt phần tử gần nhau trong bộ nhớ; danh sách liên kết đặt mỗi phần tử trong một **nút** chứa dữ liệu và liên kết đến nút khác. Vì thế không thể tính địa chỉ nút thứ `i` trực tiếp. Muốn đến nó phải đi qua các nút trước: `O(i)`. Đổi lại, nếu đã giữ con trỏ đến đúng vị trí, nối hoặc tháo một nút chỉ cần đổi vài liên kết, `O(1)`.

## 1. Danh sách đơn và bất biến của `head`

```go
type Node struct {
    Value int
    Next  *Node
}



func PushFront(head *Node, value int) *Node {
    return &Node{Value: value, Next: head}
}

func Reverse(head *Node) *Node {
    var prev *Node
    for head != nil {
        next := head.Next
        head.Next = prev
        prev, head = head, next
    }
    return prev
}
```

Trong `Reverse`, trước mỗi vòng, `prev` trỏ tới tiền tố đã đảo; `head` trỏ tới phần chưa xử lý. Lưu `next` **trước khi** đổi `head.Next`, nếu không ta đánh mất đường tới phần còn lại. Mỗi nút được xử lý đúng một lần: `O(n)` thời gian, `O(1)` bộ nhớ phụ. Danh sách rỗng (`nil`) và một nút đều chạy đúng.

Để xóa nút đầu, đặt `head = head.Next`. Để xóa nút sau `prev`, đặt `prev.Next = prev.Next.Next` sau khi chắc chắn hai con trỏ cần thiết không nil. Nếu chỉ biết **giá trị** cần xóa, vẫn phải tìm vị trí `O(n)`; nói “xóa danh sách liên kết là `O(1)`” mà bỏ tiền tìm kiếm là sai. Giữ thêm `tail` giúp nối cuối `O(1)`, nhưng phải cập nhật `tail` khi xóa nút cuối; nếu không bất biến `tail.Next == nil` hỏng.



```note-visualization
{"id":"singly-linked-list","preset":"normal"}
```

## 2. Danh sách đôi và danh sách vòng

Danh sách đôi có cả `Prev` và `Next`. Khi xóa một nút đã biết, cần nối cả hàng xóm trái lẫn phải rồi cập nhật `head`/`tail` nếu ở biên. Đổi lấy xóa `O(1)` từ một handle, mỗi nút tốn thêm một con trỏ và mỗi phép sửa có nhiều trạng thái phải giữ nhất quán. Một nút sentinel giả ở đầu/cuối thường làm code bớt nhánh đặc biệt; sentinel không phải dữ liệu người dùng.



Danh sách vòng nối `tail.Next` về `head`. Nó hữu ích cho vòng quay lượt hoặc queue vòng, nhưng điều kiện dừng `node != nil` không còn đúng. Hãy duyệt đúng `size` bước hoặc dừng khi quay lại nút xuất phát. Với danh sách đôi vòng có sentinel, có thể dùng cùng một đoạn code nối/xóa cho cả đầu, giữa và cuối.



```note-visualization
{"id":"doubly-linked-list","preset":"normal"}
```

## 3. Hai con trỏ nhanh/chậm

Đặt `slow` đi một cạnh, `fast` đi hai cạnh. Nếu có chu trình, sau khi cả hai vào vòng, khoảng cách theo modulo độ dài vòng thay đổi một mỗi lượt, nên chúng sẽ gặp nhau. Nếu `fast` hoặc `fast.Next` thành nil, không có chu trình. Cùng cách đó, khi `fast` đến cuối, `slow` gần giữa danh sách. Đây là cách suy ra thuật toán từ tốc độ tương đối, không cần mảng phụ.





```note-visualization
{"id":"floyd-cycle","preset":"normal"}
```

## 4. Khi nào nên dùng?

| Nhu cầu | Slice | Linked list |
| --- | --- | --- |
| Truy cập theo chỉ số | `O(1)` | `O(n)` |
| Chèn/xóa sau vị trí đã biết | dời phần tử `O(n)` | nối con trỏ `O(1)` |
| Duyệt tuần tự | locality tốt | nhiều lần theo con trỏ |
| Bộ nhớ mỗi phần tử | ít overhead | thêm một/hai con trỏ |

Trong Go, slice thường nhanh và đơn giản hơn cho dữ liệu nhỏ hoặc truy cập theo chỉ số. Danh sách liên kết đáng giá khi cần giữ handle đến nút và chèn/xóa ở nhiều vị trí liên tục. Đừng quyết định chỉ từ Big-O: cấp phát từng nút và cache locality có ảnh hưởng thực tế.

**Tự luyện:** (1) Viết `DeleteAfter(prev)` và liệt kê mọi tiền điều kiện. (2) Tìm nút giữa với `slow/fast`; với độ dài chẵn, xác định bạn muốn nút giữa bên trái hay phải. (3) Chứng minh thuật toán phát hiện chu trình kết thúc.

*Đối chiếu: Jain, chương 7; Drozdek, chương 3; Lê Minh Hoàng, phần 2 §4.*

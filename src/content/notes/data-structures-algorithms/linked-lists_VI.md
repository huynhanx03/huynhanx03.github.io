---
title: "Danh sách liên kết: đổi truy cập ngẫu nhiên lấy khả năng nối nút"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/linked-lists"
series: "DSA cơ bản"
seriesOrder: 6
tags: ["linked-list", "pointer", "invariant", "go"]
description: "Danh sách đơn, đôi và vòng; cách chèn, xóa, đảo danh sách và phân tích chi phí thật sự."
draft: false
updated: 2026-10-15
---

Bạn đã giữ một handle tới một công việc và muốn tháo nó khỏi giữa danh sách. Slice thường phải dịch phần đuôi; danh sách liên kết có thể chỉ sửa vài liên kết. Tuy nhiên, nếu mới biết “công việc thứ 100”, linked list phải đi qua các nút trước để đến đó. Lợi ích phụ thuộc việc **đã có vị trí** hay còn phải tìm.

Một node chứa dữ liệu cùng liên kết; các node không cần nằm liên tiếp trong bộ nhớ. Vì không tính trực tiếp địa chỉ theo index, truy cập node thứ i tốn O(i), tổng quát O(n). Nối hoặc tháo ở vị trí đã biết có thể O(1), với điều kiện có đủ các pointer cần thiết.

## Head cho biết đường vào một danh sách đơn

Node có Value và Next; head=nil biểu thị rỗng, node cuối có Next=nil. Code Go sau gồm các khai báo độc lập; Reverse yêu cầu danh sách hữu hạn, không chu trình, và sửa các liên kết hiện có.

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

`PushFront` tạo node có Next trỏ vào head cũ rồi trả head mới. Caller phải giữ kết quả, chẳng hạn `head=PushFront(head,7)`. Chỉ tạo node mới trong hàm mà không thay head ở caller sẽ không làm caller bắt đầu từ node ấy. Trên danh sách rỗng, Next=nil vẫn đúng.

Để xóa đầu, sau khi xác nhận head không nil, chuyển head sang head.Next. Để xóa node **sau** prev, cần prev và prev.Next không nil, rồi nối `prev.Next=prev.Next.Next`. Đây là O(1) vì đã biết node đứng trước. Nếu chỉ giữ node cần xóa trong danh sách đơn mà không có node trước, nói chung chưa có đủ liên kết để tháo nó theo cách thông thường.

```note-visualization
{"id":"singly-linked-list","preset":"normal"}
```

Nếu thêm tail để nối cuối O(1), cần duy trì: rỗng thì cả head/tail nil; không rỗng thì tail là node cuối và tail.Next=nil. Xóa node cuối hoặc lấy đi node duy nhất phải cập nhật tail. Một pointer tail còn dẫn đến node đã tháo khiến những lần nối sau có thể thêm vào vùng không còn thuộc danh sách.

## Đảo bằng ba vai trò pointer

Với `A→B→C→nil`, ban đầu prev=nil, head=A. Lượt đầu lưu next=B rồi đổi A.Next=nil; prev=A, head=B. Lượt hai lưu C rồi đổi B.Next=A; prev=B, head=C. Lượt ba đổi C.Next=B và head=nil. Trả prev cho đường mới `C→B→A→nil`.

Bất biến trước mỗi lượt: prev là tiền tố đã đảo, head là phần chưa xử lý, hai phần cùng chứa đúng các node ban đầu. `next` phải được lưu **trước** khi sửa head.Next, vì sửa link làm mất đường đi cũ từ node hiện tại. Mỗi lượt chuyển một node từ phần chưa xử lý sang phần đã đảo, nên kết thúc và giữ đủ mọi node.

Thời gian O(n), phụ O(1); rỗng trả nil, một node giữ nguyên. Alias tới node cũ vẫn là alias tới cùng node nhưng các liên kết sau Reverse đã đổi. Nếu caller khác đang trông vào thứ tự cũ, việc sửa tại chỗ phải được nêu trong API.

## Danh sách đôi đổi thêm bộ nhớ lấy khả năng đi ngược

Mỗi node có Prev và Next. Với node x ở giữa, x.Prev.Next cần chuyển sang x.Next và x.Next.Prev chuyển sang x.Prev; nếu ở đầu/cuối thì cập nhật head/tail thay liên kết không có. Đủ cả hai chiều mới giữ invariant `x.Next.Prev==x` ở các cặp kề còn trong danh sách.

Xóa một node đã biết là O(1), nhưng node phải thật sự thuộc danh sách theo hợp đồng; không tùy tiện nối qua một handle cũ đã tháo. Mỗi node thêm pointer, mỗi thao tác nhiều trạng thái cần đồng bộ hơn. Sentinel là node giả dùng làm biên, không chứa dữ liệu người dùng; nó giúp đầu/cuối có hàng xóm ổn định nên bớt nhánh đặc biệt.

```note-visualization
{"id":"doubly-linked-list","preset":"normal"}
```

Danh sách vòng cho tail.Next quay về head; danh sách đôi vòng thường có sentinel liên kết cả hai phía. Duyệt `node!=nil` sẽ không dừng ở cấu trúc vòng. Cần đi đúng size hoặc dừng khi quay về điểm xuất phát, xử lý riêng rỗng nếu không có sentinel. Dùng cấu trúc vòng cho lượt chơi hay queue không có nghĩa nó có chu trình “lỗi”; chu trình là một phần thiết kế đã được hợp đồng hóa.

## Slow/fast phát hiện chu trình không cần tập node

Với danh sách đơn chưa biết có vòng, cho slow đi một cạnh và fast đi hai cạnh mỗi lượt. Trước khi bước fast, kiểm tra fast và fast.Next không nil. Nếu gặp nil, đường đi hữu hạn đã kết thúc và không có chu trình.

Nếu có vòng dài c, sau khi cả hai vào vòng, khoảng cách giữa chúng theo modulo c thay đổi một mỗi lượt. Trong không quá c lượt tiếp theo sẽ về 0, hai pointer gặp nhau. Tốn O(n) theo số node có thể tới, phụ O(1); không cần lưu mọi node đã thấy. Code phải kiểm tra gặp sau khi tiến theo sơ đồ phù hợp, tránh kết luận có vòng ngay lúc cả hai cùng bắt đầu ở head.

```note-visualization
{"id":"floyd-cycle","preset":"normal"}
```

Để tìm giữa trên danh sách không chu trình, cũng cho fast đi hai và slow đi một. Với khởi tạo cả hai ở head và tiếp tục khi fast!=nil,fast.Next!=nil, độ dài chẵn cho node giữa bên phải. Muốn giữa bên trái cần đổi điều kiện hoặc vị trí khởi đầu; nêu rõ để tránh hai lời giải khác nhau đều tưởng mình trả sai.

## Quyết định theo truy cập thực tế

| Nhu cầu | Slice | Linked list |
| --- | --- | --- |
| Index bất kỳ | O(1) | O(n) |
| Chèn/xóa giữ thứ tự sau vị trí đã biết | O(n) dịch | O(1) nối link |
| Tìm theo giá trị chưa có chỉ mục | O(n) | O(n) |
| Duyệt | liên tục, thường locality tốt | đi theo pointer |
| Overhead | ít trên mỗi phần tử | thêm link và cấp phát node |

Trong Go, slice thường đơn giản và phù hợp cho dữ liệu nhỏ hoặc cần index. List đáng cân nhắc khi giữ handle và sửa nhiều vị trí. Big-O chưa tính hết chi phí cấp phát/cache, nên không suy “list luôn nhanh hơn khi xóa”.

**Tự kiểm tra:** DeleteAfter cần điều kiện gì? Reverse có làm các alias thành bản sao không? Slow/fast dừng nhờ đâu?

**Giải thích:** Cần prev!=nil và prev.Next!=nil, cùng điều kiện prev thuộc danh sách và cập nhật tail nếu xóa cuối trong cấu trúc có tail. Reverse sửa node cũ nên alias vẫn chia sẻ node, không clone. Slow/fast hoặc chạm nil, hoặc gặp trong vòng do tốc độ tương đối modulo chiều dài vòng; hai lập luận bao phủ cả trường hợp hữu hạn lẫn có chu trình.

---
title: "ADT: chọn cấu trúc dữ liệu từ thao tác cần làm"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/abstract-data-types"
series: "DSA cơ bản"
seriesOrder: 3
tags: ["abstract-data-type", "data-structure", "invariant", "go"]
description: "Tách hợp đồng thao tác khỏi cách lưu dữ liệu để chọn slice, danh sách liên kết, bảng băm hay cây đúng với bài toán."
draft: false
updated: 2026-10-15
---

Một danh sách công việc có thể được dùng theo hai cách rất khác. Nếu xử lý theo thứ tự nhận, ta cần lấy công việc cũ nhất. Nếu luôn ưu tiên deadline gần nhất, ta cần lấy công việc có khóa nhỏ nhất. Cả hai đều “lưu nhiều công việc”, nhưng hợp đồng lấy ra khác nhau sẽ dẫn đến cấu trúc phù hợp khác nhau.

**Kiểu dữ liệu trừu tượng** (Abstract Data Type, ADT) mô tả những thao tác được phép và ý nghĩa của chúng. **Cấu trúc dữ liệu** mô tả cách biểu diễn để thực hiện hợp đồng đó. Stack là một ADT; slice hoặc linked list có thể là cách cài stack. Tách hai tầng giúp thay cách lưu mà vẫn biết hành vi nào phải được giữ.

## Bắt đầu bằng thứ tự và thao tác cần thiết

Với stack, `Push(x)` thêm vào đỉnh, `Pop()` lấy phần tử ở đỉnh. Quy tắc vào sau ra trước là LIFO. Sau `Push(4); Push(9)`, hai lần Pop phải lần lượt nhận 9 rồi 4. Hợp đồng còn phải nói điều gì xảy ra khi stack rỗng: trả trạng thái thất bại, trả lỗi hay panic theo tiền điều kiện? Giá trị 0 không đủ báo vắng mặt khi 0 cũng là dữ liệu hợp lệ.

Queue giữ FIFO, vào trước ra trước. Priority queue lấy theo ưu tiên thay vì tuổi của phần tử. Các ADT này có thể cùng dùng một vùng nhớ dạng mảng nhưng diễn đạt những quan hệ khác nhau. Không chọn `map` chỉ vì tra cứu quen tay nếu yêu cầu chính lại là thứ tự lấy ra.

| Câu hỏi về workload | Khả năng cần có | Lựa chọn cần khảo sát |
| --- | --- | --- |
| Hay đọc phần tử thứ `i`? | Truy cập vị trí bất kỳ | Array/slice |
| Thêm và lấy ở những đầu nào? | LIFO ở cùng đầu; FIFO thêm cuối, lấy đầu | Stack/queue |
| Tìm khóa chính xác? | Tra cứu theo equality | Hash table/map |
| Cần khóa nhỏ nhất, kế tiếp, khoảng khóa? | Quan hệ thứ tự giữa khóa | Cây tìm kiếm hoặc dãy đã sắp |
| Liên tục lấy phần tử ưu tiên nhất? | Cực trị thay đổi theo cập nhật | Heap/priority queue |

Workload là tập thao tác cùng tần suất và quy mô của chúng. Slice đọc index `O(1)` và duyệt liên tục, nhưng chèn đầu thường dịch `O(n)` phần tử. Linked list nối đầu `O(1)`; truy cập vị trí thứ `i` cần đi qua khoảng `i` liên kết. Nếu việc tìm đúng node đã tốn `O(n)`, không thể mô tả cả thao tác “tìm rồi xóa” là `O(1)` chỉ vì khâu tháo node nhanh.

## Một stack cho thấy ranh giới hợp đồng và biểu diễn

Khai báo Go sau lưu số nguyên bằng slice. Đây là các khai báo ở phạm vi package; zero value `IntStack{}` dùng được ngay:

```go
type IntStack struct {
    items []int
}

func (s *IntStack) Push(x int) {
    s.items = append(s.items, x)
}

func (s *IntStack) Pop() (int, bool) {
    if len(s.items) == 0 {
        return 0, false
    }

    last := len(s.items) - 1
    value := s.items[last]
    s.items = s.items[:last]
    return value, true
}

func (s *IntStack) Len() int {
    return len(s.items)
}
```

Caller thấy các phương thức `Push`, `Pop`, `Len`; field `items` mô tả chi tiết cài đặt. Khi Pop rỗng, `(0,false)` biểu đạt không có phần tử. Khi stack thật sự chứa 0, Pop trả `(0,true)`. Hai trường hợp khác nhau dù kết quả số giống nhau.

Bất biến biểu diễn là: các phần tử từ đầu slice đến cuối giữ thứ tự được Push và chưa Pop; khi không rỗng, `items[len(items)-1]` là đỉnh. Push nối đúng vào cuối, nên phần tử mới thành đỉnh. Pop đọc cuối rồi rút ngắn slice, nên phần tử trước đó lộ ra làm đỉnh tiếp theo. `Len` đếm đúng số phần tử logic vì mọi phần tử còn lại nằm trong độ dài slice.

| Thao tác | Dữ liệu logic sau thao tác | Kết quả |
| --- | --- | --- |
| bắt đầu | `[]` | Len bằng 0 |
| Push 4 | `[4]` | đỉnh là 4 |
| Push 9 | `[4,9]` | đỉnh là 9 |
| Pop | `[4]` | `(9,true)` |
| Pop | `[]` | `(4,true)` |
| Pop | `[]` | `(0,false)` |

```note-visualization
{"id":"stack-contract","preset":"normal"}
```

Theo mô hình dynamic array tăng capacity hợp lý, Push là amortized `O(1)` nhưng một lần có thể `O(n)` khi phải cấp vùng khác và sao chép. Pop và Len ở cách cài này là worst-case `O(1)`. LIFO không tự yêu cầu những độ phức tạp này; đây là tính chất của biểu diễn đã chọn.

Nếu thay `int` bằng pointer tới đối tượng lớn, rút len chưa xóa tham chiếu ở ô cũ của backing array. Cần cân nhắc đặt ô ấy về zero value trước khi rút ngắn để tránh giữ đối tượng không cần thiết. Với `int` trong code, không có đối tượng con bị giữ bởi pointer. Chi tiết ấy thuộc cách cài nhưng có thể ảnh hưởng tài nguyên quan sát được.

## Cùng FIFO nhưng chi phí lấy đầu khác nhau

Giả sử queue chứa `[A,B,C]`. Mỗi Dequeue dịch B, C sang trái thì hành vi FIFO đúng nhưng cần `O(n)` lượt chuyển. Nếu giữ `head`, Dequeue có thể chỉ đọc `items[head]` rồi tăng head; thao tác logic trở thành hằng số nhưng còn các ô cũ và vùng đầu đã bỏ. Phải quyết định xóa tham chiếu và khi nào nén hoặc cấp lại.

Ring buffer cho phép quay vòng vị trí trong một vùng đệm. Có `head`, `tail` hoặc `size`, cùng bất biến phần tử logic đi theo thứ tự vòng và không ghi đè phần tử chưa lấy. Không có cách cài nào được chọn chỉ từ chữ FIFO: FIFO nói kết quả, còn sự phân tích thêm mới nói chi phí và điều kiện.

Quan hệ giữa hợp đồng và bất biến là cầu nối để chứng minh: caller yêu cầu FIFO; biểu diễn giữ một thứ tự logic; từng thao tác được chứng minh duy trì thứ tự đó. Khi thay slice bằng linked list hoặc ring buffer, chứng minh chi tiết đổi nhưng lời hứa với caller vẫn có thể giữ nguyên.

## Một hợp đồng còn bao gồm quyền sửa dữ liệu

Khi API trả một slice là view của dữ liệu bên trong, caller có thể sửa cùng backing array. Hai tên biến khác nhau chưa tạo hai bản sao. Một view ngắn còn có thể giữ array lớn sống lâu. Nếu cần quyền sở hữu độc lập, phải copy theo đúng độ sâu dữ liệu và tính chi phí ấy vào hợp đồng.

Trước khi chốt một ADT, ghi đủ thao tác/đầu vào/kết quả, trường hợp rỗng hoặc thiếu khóa, invariant, worst-case hay expected/amortized của thao tác, và chính sách chia sẻ hoặc sửa dữ liệu. Một bảng `O(1)` không nói được kết quả lúc rỗng hay caller có được sửa phần tử trả ra không.

## Chọn theo tình huống và giải thích lựa chọn

**1. Back/Forward của trình duyệt:** dùng hai stack như thế nào? Khi người dùng đi Back rồi mở một trang hoàn toàn mới, Forward còn hợp lệ không?

**2. Job có deadline gần nhất:** FIFO đủ không? Nếu hai job cùng deadline, cần thêm gì?

**Giải thích:** Khi đi sang trang mới, đẩy trang hiện tại vào stack Back và xóa Forward. Back lấy từ Back, đồng thời đẩy trang hiện tại vào Forward; Forward làm đối xứng. Một trang mới sau Back tạo nhánh lịch sử mới, nên lịch sử Forward cũ không còn được dùng theo hợp đồng thường gặp. Với job, cần priority queue theo deadline; FIFO chỉ đúng nếu thứ tự nhận đã phù hợp deadline. Muốn kết quả xác định khi bằng deadline, thêm thứ tự nhận hoặc ID làm tiêu chí phụ. Cách lưu được chọn sau khi các quy tắc hành vi đã rõ.

[Bài stack, queue và deque](/vi/notes/data-structures-algorithms/stacks-queues-deques/) phát triển những biểu diễn ấy; [bài slice Go](/vi/notes/go/slices/) giải thích sâu về view và copy.

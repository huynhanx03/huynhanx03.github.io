---
title: "ADT: chọn cấu trúc dữ liệu từ thao tác cần làm"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/abstract-data-types"
translationPending: true
series: "DSA cơ bản"
seriesOrder: 3
tags: ["abstract-data-type", "data-structure", "invariant", "go"]
description: "Tách hợp đồng thao tác khỏi cách lưu dữ liệu để chọn slice, danh sách liên kết, bảng băm hay cây đúng với bài toán."
draft: false
---

Một **kiểu dữ liệu trừu tượng** (Abstract Data Type, ADT) nói dữ liệu *cho phép làm gì* và mỗi thao tác phải có ý nghĩa ra sao. Một **cấu trúc dữ liệu** nói dữ liệu *được đặt trong bộ nhớ như thế nào* để thực hiện các thao tác ấy. Nhầm hai tầng này khiến ta chọn công cụ chỉ vì quen tay: dùng `map` cho mọi thứ, hoặc dùng linked list chỉ vì bài học vừa nhắc tới nó.

Ví dụ, stack là ADT với hai thao tác chính: `Push(x)` đưa `x` lên đỉnh, `Pop()` lấy phần tử ở đỉnh ra. Quy tắc là **vào sau, ra trước** (LIFO). Stack có thể được cài bằng slice, mảng cố định hoặc linked list. Người dùng stack cần biết hành vi LIFO và cách xử lý stack rỗng; họ không cần biết con trỏ `next` nằm ở đâu.

## 1. Thiết kế từ thao tác, không từ tên cấu trúc

Giả sử cần lưu một danh sách công việc. Hãy hỏi:

| Câu hỏi | Nếu câu trả lời là “có” | Gợi ý ban đầu |
| --- | --- | --- |
| Truy cập phần tử thứ `i` thường xuyên? | Cần vị trí bất kỳ nhanh | slice/mảng |
| Thêm, xóa ở một đầu? | Cần giữ thứ tự vào/ra | stack hoặc queue |
| Tìm theo khóa chính xác? | Cần tra cứu key | hash table/map |
| Cần duyệt theo thứ tự khóa? | Cần quan hệ `<` giữa key | cây tìm kiếm hoặc danh sách đã sắp |
| Cần phần tử ưu tiên cao nhất? | Không cần sắp toàn bộ | heap/priority queue |

Đây là câu hỏi về **khối lượng công việc** (workload). Một cấu trúc không “nhanh” nói chung; nó nhanh cho một số thao tác và đổi lại chi phí ở thao tác khác, bộ nhớ, hoặc độ phức tạp cài đặt. Ví dụ slice truy cập chỉ số `O(1)` và duyệt liên tục trong bộ nhớ, nhưng chèn ở đầu thường phải dịch `O(n)` phần tử. Linked list có thể nối đầu `O(1)` khi đã có node, nhưng truy cập phần tử thứ `i` cần đi qua các node trước đó và tốn `O(i)`.

## 2. Một hợp đồng stack nhỏ trong Go

Go thường biểu diễn hợp đồng qua kiểu và phương thức. Dưới đây là một stack lưu `int` bằng slice; `Pop` trả thêm `bool` để không đánh đồng stack rỗng với phần tử có giá trị `0`.

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

Hợp đồng quan trọng ở đây là: sau `Push(a); Push(b)`, `Pop()` trả `b`, rồi `a`. Bất biến của cài đặt là `items[len(items)-1]` luôn là đỉnh khi stack không rỗng. Thêm hoặc lấy ở cuối slice có chi phí amortized `O(1)` cho `Push`, worst-case `O(1)` cho `Pop`; một lần `Push` riêng lẻ có thể `O(n)` nếu `append` phải cấp phát và sao chép.

Nếu stack giữ con trỏ tới object lớn, cần cân nhắc xóa tham chiếu ở ô cuối trước khi rút ngắn slice để object không bị giữ sống bởi backing array. Với `int` như ví dụ, điều đó không cần thiết. Chi tiết này cho thấy cùng một ADT vẫn có quyết định triển khai phụ thuộc kiểu dữ liệu và runtime.

## 3. Bất biến là cầu nối giữa hai tầng

ADT nói **điều phải đúng**; cài đặt duy trì điều đó qua bất biến. Với queue, hợp đồng là vào trước, ra trước (FIFO). Nếu cài queue bằng slice và mỗi lần lấy phần tử đầu lại sao chép toàn bộ phần còn lại, hành vi đúng nhưng `Dequeue` thành `O(n)`. Nếu chỉ tăng một chỉ số `head`, thao tác nhanh hơn, nhưng phải giải quyết vấn đề backing array giữ các phần tử cũ và khi nào nén lại. Một ring buffer có thể giữ `head`, `tail`, `size` và bất biến các vị trí hợp lệ quay vòng theo capacity.

Ta không cần cài mọi phương án ngay. Điều cần học là nhìn thấy **hợp đồng không đổi trong khi chi phí thay đổi**. Phần tiếp theo của lộ trình sẽ triển khai riêng slice, linked list, stack/queue, hash table, cây và heap để so sánh rõ từng lựa chọn.

## 4. Tính đúng và hiệu năng cần được mô tả cùng nhau

Khi thiết kế một ADT, ghi ra tối thiểu:

1. Tập thao tác, tham số, kết quả và hành vi khi rỗng hoặc khi khóa không tồn tại.
2. Bất biến dữ liệu, ví dụ thứ tự trong BST hoặc chỉ số `head` của queue.
3. Chi phí của từng thao tác trong worst-case và, nếu có, expected/amortized case.
4. Quyền sở hữu dữ liệu: thao tác có sửa đầu vào không, có trả bản sao hay chia sẻ vùng nhớ không.

Trong Go, slice là một descriptor trỏ tới backing array. Trả một slice đã cắt không tự động tạo bản sao; sửa phần tử qua một alias có thể làm dữ liệu của nơi khác thay đổi. Do vậy hợp đồng về quyền sở hữu quan trọng ngang với bảng `O(1)`/`O(n)`.

**Tự luyện:** một trình duyệt có nút Back và Forward cần những thao tác gì? Hãy mô tả bằng hai stack trước khi chọn cách lưu. Một hệ thống luôn lấy job có deadline gần nhất cần queue FIFO hay priority queue? Nếu nhiều job cùng deadline, cần thêm quy tắc gì để hành vi có thể dự đoán?

*Đọc thêm trong bộ sách: Hemant Jain, chương 4; Adam Drozdek, chương 1–4; Lê Minh Hoàng, phần 2 §1 và §4.*

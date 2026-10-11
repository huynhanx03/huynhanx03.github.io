---
title: "Bắt đầu giải một bài toán thuật toán"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/problem-solving"
translationPending: true
series: "DSA cơ bản"
seriesOrder: 1
tags: ["algorithm-design", "correctness", "invariant", "go"]
description: "Từ đề bài đến lời giải: làm rõ hợp đồng, thử ví dụ nhỏ, chọn cách biểu diễn, chứng minh đúng và kiểm tra ca biên."
draft: false
---

Một bài toán thuật toán không bắt đầu ở dòng `for` đầu tiên. Nó bắt đầu khi ta trả lời được ba câu hỏi: **đầu vào là gì, đầu ra phải thỏa điều gì, và những trường hợp nào được phép xuất hiện?** Viết code trước khi làm rõ ba điều này thường dẫn đến một lời giải đúng với ví dụ mẫu nhưng sai với dữ liệu thật.

Hãy dùng bài toán xuyên suốt chương: cho một dãy số nguyên, tìm **giá trị nhỏ thứ hai phân biệt**. Với `[7, 2, 2, 5]`, kết quả là `5`, không phải `2`. Với `[4, 4, 4]`, kết quả không tồn tại. Đầu ra của một hàm Go có thể là `(value, found)` để biểu diễn rõ cả hai khả năng; dùng một số đặc biệt như `-1` làm tín hiệu lỗi sẽ sai nếu `-1` cũng là đáp án hợp lệ.

## 1. Viết lại hợp đồng bằng ví dụ

Trước khi nghĩ thuật toán, ta thử các đầu vào có chủ đích:

| Đầu vào | Kết quả | Lý do |
| --- | --- | --- |
| `[]` | không có | chưa có giá trị nào |
| `[9]` | không có | mới có một giá trị phân biệt |
| `[2, 2]` | không có | trùng nhau không tạo hạng hai |
| `[7, 2, 2, 5]` | `5` | hai giá trị nhỏ nhất phân biệt là `2`, `5` |
| `[-8, -3, -8]` | `-3` | số âm vẫn là dữ liệu bình thường |

Tiếp theo đọc ràng buộc. Dãy vài chục phần tử cho phép nhiều cách giải; dãy hàng triệu phần tử khiến việc sao chép và sắp xếp trở thành chi phí đáng cân nhắc. Nếu đề không nói rõ dãy có thể rỗng hay không, thiết kế hàm xử lý cả trường hợp rỗng sẽ an toàn hơn. Cũng cần hỏi có được sửa dãy gốc không: `sort.Ints(a)` thay đổi dữ liệu mà người gọi đang giữ.

## 2. Bắt đầu bằng lời giải dễ kiểm chứng

Cách trực tiếp là sao chép dãy, sắp xếp tăng dần rồi bỏ qua các phần tử bằng giá trị đầu. Phần tử khác đầu tiên là đáp án. Cách này dễ giải thích, nhưng mất `O(n log n)` thời gian và `O(n)` bộ nhớ nếu phải giữ nguyên đầu vào. Nó là điểm xuất phát tốt: một lời giải chậm nhưng đúng giúp ta kiểm tra lời giải tối ưu bằng các ví dụ nhỏ.

Quan sát quan trọng hơn nằm ở **thông tin thực sự cần giữ**. Sau khi đọc một tiền tố của dãy, ta không cần nhớ toàn bộ tiền tố; chỉ cần giá trị nhỏ nhất và nhỏ thứ hai phân biệt của tiền tố đó. Mỗi phần tử mới sẽ rơi vào một trong ba tình huống:

1. Nhỏ hơn giá trị nhỏ nhất hiện có: giá trị nhỏ nhất cũ trở thành hạng hai.
2. Bằng giá trị nhỏ nhất: bỏ qua vì cần các giá trị phân biệt.
3. Lớn hơn giá trị nhỏ nhất nhưng nhỏ hơn hạng hai hiện có: cập nhật hạng hai.

Đó là cách chuyển từ “thử mọi dữ liệu” sang một trạng thái ngắn gọn. Bước này thường quyết định hiệu quả của thuật toán hơn việc đổi cú pháp vòng lặp.

## 3. Bất biến: câu giải thích vì sao code đúng

**Bất biến vòng lặp** là mệnh đề luôn đúng sau mỗi lần xử lý một phần tử. Ở đây, sau khi đọc `a[0:i]`, biến `first` giữ giá trị nhỏ nhất; nếu có ít nhất hai giá trị phân biệt, `second` giữ giá trị nhỏ thứ hai phân biệt. Hai biến boolean cho biết mỗi giá trị đã tồn tại hay chưa. Không dùng `math.MaxInt` làm “chưa có”, vì bản thân `MaxInt` có thể là dữ liệu hợp lệ.

Xét dãy `[7, 2, 2, 5]`:

| Vừa đọc | `first` | `second` | Nhận xét |
| --- | ---: | ---: | --- |
| `7` | 7 | chưa có | mới một giá trị |
| `2` | 2 | 7 | giá trị nhỏ nhất cũ lùi xuống hạng hai |
| `2` | 2 | 7 | trùng `first`, không đổi |
| `5` | 2 | 5 | `5` nằm giữa `first` và `second` |

Lập luận đúng đắn có ba phần. Ban đầu, tiền tố rỗng chưa có giá trị nên bất biến đúng. Giả sử nó đúng trước khi đọc `x`: ba tình huống ở trên cập nhật đúng hai giá trị nhỏ nhất của tiền tố mới. Khi vòng lặp kết thúc, tiền tố chính là toàn bộ dãy, nên `second` là đáp án nếu nó tồn tại. Đây là một chứng minh bằng quy nạp trên số phần tử đã đọc.

```go
func SecondDistinctMin(values []int) (int, bool) {
    var first, second int
    hasFirst, hasSecond := false, false

    for _, x := range values {
        if !hasFirst || x < first {
            if hasFirst {
                second, hasSecond = first, true
            }
            first, hasFirst = x, true
            continue
        }

        if x == first {
            continue
        }

        if !hasSecond || x < second {
            second, hasSecond = x, true
        }
    }

    return second, hasSecond
}
```

Mỗi phần tử được xét đúng một lần, với số phép so sánh không phụ thuộc `n`: thời gian `O(n)`, bộ nhớ phụ `O(1)`. Đây là **cận trên**; với dãy không rỗng, bài toán cũng cần xem mọi phần tử trong trường hợp xấu nhất, vì một giá trị rất nhỏ ở cuối có thể thay đổi cả hai vị trí. Do đó lời giải một lượt là tối ưu theo bậc tăng trưởng trong mô hình đọc tuần tự.

## 4. Kiểm tra có chiến lược

Đừng chỉ kiểm tra ví dụ đề cho. Tạo ca cho từng nhánh điều kiện: dãy rỗng, chỉ một giá trị phân biệt, giá trị nhỏ nhất xuất hiện ở cuối, số âm, số trùng xen kẽ, và `MaxInt` nếu muốn chắc rằng mình không dùng sentinel. So sánh kết quả của lời giải một lượt với lời giải sắp xếp trên các dãy nhỏ tự tạo cũng là cách tìm phản ví dụ rất hiệu quả.

Một lỗi hay gặp là cập nhật `second` trước khi lưu `first` cũ; lỗi khác là cho phép `second == first`. Cả hai đều lộ ra nếu ta ghi bảng trạng thái sau từng bước. Khi code phức tạp hơn bảng trạng thái có thể giải thích, hãy quay lại mô tả bất biến trước khi thêm điều kiện mới.

## 5. Quy trình áp dụng cho bài khác

1. Viết hợp đồng và ca biên bằng lời của mình.
2. Tìm lời giải đơn giản để có điểm so sánh.
3. Chọn cách biểu diễn chỉ giữ những thông tin thật sự cần.
4. Phát biểu bất biến hoặc tính chất khiến lựa chọn ở mỗi bước là hợp lệ.
5. Ước lượng thời gian, bộ nhớ theo ràng buộc; sau đó mới viết code.
6. Tự kiểm bằng ca biên và một lời giải tham chiếu nhỏ.

**Tự luyện:** đổi bài toán thành tìm giá trị lớn thứ ba phân biệt. Trạng thái cần thêm gì? Khi một giá trị mới lớn nhất xuất hiện, các vị trí cũ dịch chuyển ra sao? Thử chứng minh bất biến trước khi code.

*Đọc thêm trong bộ sách: Hemant Jain, chương 3; Lê Minh Hoàng, phần 2 §1. Cấu trúc bài học và ví dụ ở đây được diễn giải độc lập.*

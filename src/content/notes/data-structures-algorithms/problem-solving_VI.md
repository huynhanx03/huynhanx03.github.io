---
title: "Bắt đầu giải một bài toán thuật toán"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/problem-solving"
series: "DSA cơ bản"
seriesOrder: 1
tags: ["algorithm-design", "correctness", "invariant", "go"]
description: "Từ đề bài đến lời giải: làm rõ hợp đồng, thử ví dụ nhỏ, chọn cách biểu diễn, chứng minh đúng và kiểm tra ca biên."
draft: false
updated: 2026-10-15
---

Với dãy `[7, 2, 2, 5]`, “phần tử nhỏ thứ hai” là 2 hay 5? Nếu xếp mọi phần tử theo vị trí thì là 2; nếu cần **giá trị nhỏ thứ hai phân biệt** thì là 5. Một lời giải có thể chạy nhanh và không gặp lỗi cú pháp nhưng vẫn giải nhầm bài, vì hai cách hiểu này dẫn đến hai hợp đồng khác nhau.

Ta sẽ giải phiên bản có giá trị phân biệt, từ cách đọc đề đến trạng thái của thuật toán một lượt. Mục tiêu là tự giải thích được vì sao mỗi nhánh cập nhật đúng, thay vì nhớ một đoạn code để áp dụng cho mọi bài tìm cực trị.

## Hợp đồng cần bao gồm cả trường hợp không có đáp án

Đầu vào là một dãy số nguyên, có thể rỗng, trùng nhau hoặc chứa số âm. Nếu dãy có ít nhất hai giá trị phân biệt, đầu ra là giá trị nhỏ thứ hai trong số đó. Nếu không đủ, đầu ra phải biểu đạt sự vắng mặt.

| Đầu vào | Đáp án | Điều đang được kiểm tra |
| --- | --- | --- |
| `[]` | không có | chưa có phần tử |
| `[9]` | không có | mới một giá trị |
| `[2,2]` | không có | số lần xuất hiện không tạo thêm hạng |
| `[7,2,2,5]` | `5` | bỏ qua giá trị trùng |
| `[-8,-3,-8]` | `-3` | số âm vẫn là dữ liệu hợp lệ |

Một hàm Go có thể trả `(value, found)`. `found=false` cho biết không có đáp án; lúc đó không diễn giải `value` như một kết quả tìm được. Nếu dùng `-1` để báo vắng mặt, dãy `[-2,-1]` sẽ khiến tín hiệu ấy trùng với đáp án thật. Tương tự, không dùng `math.MaxInt` làm trạng thái “chưa có”, bởi `MaxInt` cũng có thể xuất hiện trong dãy.

Ràng buộc còn gồm quyền sửa dữ liệu. `sort.Ints(a)` thay đổi dãy mà caller giữ; sao chép rồi sắp không có tác động ấy nhưng thêm bộ nhớ. Vài chục phần tử cho phép nhiều lựa chọn, còn hàng triệu phần tử làm chi phí lưu bản sao và sắp xếp đáng cân nhắc. Nếu đề không bảo đảm dãy không rỗng, một API có trạng thái vắng mặt giúp xử lý biên rõ ràng.

## Một lời giải trực tiếp làm điểm đối chiếu

Sao chép dãy, sắp tăng, rồi tìm phần tử đầu tiên khác giá trị đầu. Với ví dụ, dãy sau sắp là `[2,2,5,7]`; bỏ qua hai số 2 thì gặp 5. Mọi phần tử đứng sau đều không nhỏ hơn 5, nên 5 chính là giá trị cần tìm. Nếu duyệt hết mà chưa gặp số khác, không có hạng hai.

Cách này tốn `O(n log n)` thời gian với thuật toán sắp xếp tương ứng, và `O(n)` bộ nhớ để giữ nguyên đầu vào. Nó có ích dù chưa tối ưu: logic ngắn giúp tạo một lời giải tham chiếu khi đối chiếu các đầu vào nhỏ. Khi cải tiến, ta cần giữ nguyên hợp đồng chứ không chỉ cho cùng kết quả trên một ví dụ.

Muốn bỏ bước sắp xếp, hãy xác định thông tin thật sự cần giữ sau mỗi phần tử. Để biết hai giá trị nhỏ nhất phân biệt của tiền tố đã đọc, không cần nhớ thứ tự của mọi giá trị khác. Chỉ cần hai giá trị và trạng thái chúng đã tồn tại hay chưa.

```note-visualization
{"id":"scan-maximum","preset":"normal"}
```

Minh họa quét cực trị giúp theo dõi ý tưởng “đọc một phần tử, cập nhật trạng thái”. Bài toán dưới đây giữ hai cực trị phân biệt, nên còn phải xử lý sự trùng nhau và việc đẩy giá trị nhỏ nhất cũ xuống hạng hai.

## Từ bất biến đến các nhánh cập nhật

Sau khi đọc một tiền tố, giữ bất biến: nếu `hasFirst`, `first` là giá trị nhỏ nhất; nếu `hasSecond`, `second` là giá trị nhỏ thứ hai phân biệt và `first < second`. Cờ boolean mô tả sự hiện diện, nên giá trị số ban đầu của hai biến không bị nhầm với dữ liệu.

Với phần tử mới `x`, xét theo thứ tự:

1. Chưa có giá trị đầu hoặc `x < first`: nếu đã có `first`, nó trở thành hạng hai; sau đó đặt `first=x`.
2. `x == first`: không tạo giá trị phân biệt mới, giữ trạng thái.
3. `x > first`: chỉ cập nhật `second` nếu hạng hai chưa có hoặc `x < second`.

Vì sao ở trường hợp đầu được thay cả hạng hai cũ bằng `first` cũ? Trước đó, `first` cũ nhỏ hơn mọi giá trị khác phân biệt trong tiền tố. Sau khi thêm một `x` còn nhỏ hơn nó, hai giá trị nhỏ nhất mới đúng là `x` và `first` cũ. Không cần giữ hạng hai cũ nữa.

| Đã đọc thêm | `first` | `second` | Lý do |
| --- | ---: | ---: | --- |
| `7` | 7 | chưa có | phần tử đầu tiên |
| `2` | 2 | 7 | 7 từ hạng nhất thành hạng hai |
| `2` | 2 | 7 | không thêm giá trị phân biệt |
| `5` | 2 | 5 | 5 tốt hơn hạng hai cũ là 7 |

## Code thể hiện đúng trạng thái đã mô tả

Đây là khai báo hàm độc lập, không cần import. Hàm chỉ đọc slice đầu vào và không sắp xếp hay sửa phần tử:

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

Hai câu `continue` kết thúc xử lý phần tử ngay khi đã thuộc trường hợp đầu hoặc trường hợp trùng. Nhờ vậy, nhánh cập nhật `second` phía dưới chỉ nhận giá trị lớn hơn `first`. Thứ tự lưu `first` cũ trước khi gán `first=x` là cần thiết: đảo thứ tự sẽ làm mất ứng viên hạng hai.

Có thể chứng minh bằng quy nạp theo số phần tử đã đọc. Ban đầu tiền tố rỗng có cả hai cờ false, phù hợp bất biến. Giả sử bất biến đúng trước khi đọc `x`: ba trường hợp trên bao phủ mọi khả năng và giữ đúng hai giá trị tốt nhất của tiền tố mới. Khi vòng lặp kết thúc, tiền tố là toàn dãy, nên `second` đúng nếu `hasSecond=true`.

Mỗi phần tử cần một số phép kiểm tra bị chặn bởi hằng số. Thời gian là `O(n)`, bộ nhớ phụ `O(1)`. Trong mô hình đọc các phần tử chưa được sắp xếp, phải xem mọi phần tử ở trường hợp xấu: một phần tử chưa xem có thể rất nhỏ và đổi đáp án. Vì vậy bậc thời gian tuyến tính là tối ưu trong mô hình này. Lập luận này không nói một cách cài cụ thể luôn nhanh nhất về thời gian thực.

## Chọn ca kiểm tra theo nhánh suy luận

Ngoài bảng đầu bài, xét giá trị nhỏ nhất ở cuối, nhiều số trùng xen kẽ và dữ liệu chứa `MaxInt`. Mỗi ca có mục đích: đi vào một nhánh cụ thể hoặc phát hiện một sentinel không hợp lệ. Ghi trạng thái sau mỗi lượt giúp tìm lỗi logic sớm hơn việc thêm điều kiện theo cảm giác. Đối chiếu với lời giải sắp xếp trên các dãy nhỏ cũng là cách tìm phản ví dụ.

Có thể dùng cùng quy trình ở bài khác: viết hợp đồng và biên; tìm cách đơn giản; chọn trạng thái đủ thông tin; phát biểu bất biến; tính chi phí theo ràng buộc; rồi viết code và đối chiếu. Các bước có thể quay lại nhau khi phát hiện giả định thiếu, không phải một nghi thức chỉ làm đúng một lần.

## Tự mở rộng và đối chiếu lập luận

**Bài tập:** đổi thành giá trị **lớn thứ ba phân biệt**. Khi đọc một giá trị lớn nhất mới, ba vị trí dịch chuyển thế nào? Có nên bỏ một giá trị bằng hạng hai không?

**Gợi ý giải thích:** giữ ba giá trị cùng cờ hiện diện, luôn có thứ tự giảm nghiêm ngặt ở các vị trí đã có. Giá trị lớn nhất mới đẩy hạng nhất cũ xuống hai, hạng hai cũ xuống ba; phải lưu theo thứ tự không làm mất giá trị cũ. Một giá trị bằng bất kỳ hạng đang giữ không tạo giá trị phân biệt mới, nên bỏ qua. Đáp án cần giải thích các vị trí sau cập nhật vẫn là ba giá trị lớn nhất của tiền tố; chỉ liệt kê ba biến chưa đủ chứng minh đúng.

Đọc tiếp [độ phức tạp](/vi/notes/data-structures-algorithms/complexity/) để phân biệt cận trên với cận chặt và worst-case với amortized.

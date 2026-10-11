---
title: "Đệ quy: từ bài toán nhỏ đến lời giải hoàn chỉnh"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/recursion"
translationPending: true
series: "DSA cơ bản"
seriesOrder: 5
tags: ["recursion", "call-stack", "recurrence", "go"]
description: "Hiểu base case, bước thu nhỏ, call stack, chứng minh quy nạp và phân tích thời gian lẫn độ sâu bộ nhớ."
draft: false
---

Đệ quy là cách giải một bài toán bằng lời giải của **một hoặc nhiều bài toán cùng dạng nhưng nhỏ hơn**. Nó đặc biệt tự nhiên với cây, chia để trị, sinh cấu hình và quay lui. Tuy nhiên, câu “hàm gọi chính nó” chỉ mô tả cú pháp; để một lời giải đệ quy đúng, ta phải biết **khi nào dừng** và **mỗi lần gọi tiến gần đến điểm dừng như thế nào**.

## 1. Ba thành phần của một lời giải đệ quy

Tính tổng dãy từ vị trí `i` trở đi là ví dụ nhỏ:

```go
func SumFrom(a []int, i int) int {
    if i == len(a) { // base case: phần còn lại rỗng
        return 0
    }
    return a[i] + SumFrom(a, i+1) // bài toán nhỏ hơn
}
```

Ta cần ba điều: **trạng thái** của lời gọi là `i`; **base case** là `i == len(a)`; **thước đo tiến triển** là `len(a)-i`, giảm một sau mỗi lời gọi. Khi `0 ≤ i ≤ len(a)`, thước đo là số nguyên không âm và không thể giảm mãi; vì vậy thuật toán kết thúc. Nếu `i > len(a)`, hàm sẽ truy cập ngoài biên, nên đó là tiền điều kiện cần nêu hoặc kiểm tra ở API bên ngoài.

Chứng minh đúng bằng quy nạp theo số phần tử còn lại. Nếu còn 0 phần tử, tổng là 0. Giả sử lời gọi ở `i+1` trả đúng tổng phần đuôi; cộng `a[i]` cho ra tổng từ `i`. Cách chứng minh này bám sát cấu trúc code: base case, giả thiết cho bài toán nhỏ, và bước ghép kết quả.

## 2. Call stack lưu những việc chưa hoàn thành

Với `a = [4, 1, 3]`, lời gọi `SumFrom(a, 0)` chưa trả kết quả ngay. Nó chờ `SumFrom(a, 1)`, lời gọi này chờ `SumFrom(a, 2)`, rồi đến `SumFrom(a, 3)` trả 0. Khi stack tháo ra, ta tính lần lượt `3+0`, `1+3`, `4+4`.

| Frame | Việc còn chờ |
| --- | --- |
| `i = 0` | cộng `4` vào kết quả đuôi |
| `i = 1` | cộng `1` vào kết quả đuôi |
| `i = 2` | cộng `3` vào kết quả đuôi |
| `i = 3` | trả `0` |

Có `n+1` lời gọi, mỗi lời gọi làm công việc hằng số: `T(n) = T(n-1) + Θ(1) = Θ(n)`. Nhưng có thể đồng thời giữ `n+1` frame, nên bộ nhớ stack là `Θ(n)`. Vòng `for` cũng tính tổng trong `Θ(n)` thời gian và chỉ cần `Θ(1)` bộ nhớ phụ. Vì thế đệ quy không tự làm thuật toán “nhanh hơn”; nó diễn đạt cấu trúc bài toán rõ hơn trong những trường hợp phù hợp.

Go quản lý stack của goroutine có thể tăng kích thước khi cần, nhưng lời gọi đệ quy quá sâu vẫn tốn bộ nhớ và có thể chạm giới hạn. Đừng giả định compiler Go sẽ tối ưu mọi tail recursion thành vòng lặp.

## 3. Đệ quy phân nhánh có thể lặp lại công việc

Fibonacci theo định nghĩa `F(n)=F(n-1)+F(n-2)` có vẻ là ví dụ đẹp, nhưng cài đặt ngây thơ tính lại cùng một `F(k)` nhiều lần:

```go
func FibSlow(n int) int {
    if n < 2 {
        return n
    }
    return FibSlow(n-1) + FibSlow(n-2)
}
```

Số lời gọi tăng theo cấp số mũ (`Θ(φⁿ)` với `φ` là tỉ số vàng, nếu phân tích chặt hơn); độ sâu stack lớn nhất là `O(n)`. Cây lời gọi có nhiều nhánh, nhưng **độ sâu stack** không bằng tổng số node trong cây. Khi hai nhánh cần cùng một bài toán con, ta có thể nhớ kết quả (memoization) hoặc tính từ nhỏ lên (bottom-up). Cả hai dẫn tới `O(n)` thời gian cho các trạng thái `0..n`, đổi lại `O(n)` bộ nhớ nếu lưu toàn bộ bảng; cách lặp chỉ giữ hai giá trị gần nhất còn `O(1)` bộ nhớ.

Đây là cửa vào của quy hoạch động: không phải mọi đệ quy đều là DP; DP xuất hiện khi các bài toán con **chồng lặp** và ta có thể tái sử dụng kết quả.

## 4. Chọn trạng thái nhỏ nhưng đủ thông tin

Khi viết đệ quy trên dãy, truyền cặp chỉ số `(left, right)` thường rẻ hơn tạo một slice mới bằng sao chép. Trong Go, `a[left:right]` chỉ tạo một slice descriptor mới và chia sẻ backing array, nên bản thân thao tác cắt thường `O(1)`; nhưng nếu lưu lâu, nó có thể giữ cả backing array lớn trong bộ nhớ. Truyền chỉ số cũng giúp thấy rõ biên và bất biến. Với cây, trạng thái tự nhiên thường là con trỏ node hiện tại; với đồ thị, phải thêm thông tin `visited` để không lặp vô hạn qua chu trình.

Một mẫu tự kiểm hữu ích là viết ra bốn câu trước khi code:

1. Hàm này hứa trả lời câu hỏi chính xác nào với trạng thái hiện tại?
2. Trạng thái nào đủ nhỏ để trả lời ngay?
3. Sau lời gọi con, ta ghép đáp án ra sao?
4. Đại lượng nguyên không âm nào giảm sau mỗi bước?

Nếu không trả lời được câu 4, thuật toán có thể không dừng. Nếu câu 1 mơ hồ, rất dễ truyền thiếu trạng thái hoặc đếm trùng nghiệm.

## 5. Từ đệ quy sang các kỹ thuật kế tiếp

Chia để trị tách bài toán thành các phần nhỏ **ít chồng lặp**, giải từng phần rồi ghép, như merge sort. Quay lui thử một lựa chọn, đi sâu, rồi hoàn tác để thử lựa chọn khác. Quy hoạch động lưu kết quả của những trạng thái lặp lại. Ba kỹ thuật đều dùng tư duy bài toán con, nhưng mục tiêu và cách kiểm soát chi phí khác nhau; các bài tiếp theo sẽ tách chúng ra.

**Tự luyện:** (1) Viết `MaxFrom(a, i)` có API trả `bool` khi phần còn lại rỗng. (2) Vẽ cây lời gọi `FibSlow(5)` và khoanh những trạng thái tính lặp. (3) Viết hàm tính tổng dãy bằng vòng lặp, so sánh bất biến vòng lặp với chứng minh quy nạp của bản đệ quy. (4) Xác định time và stack space của binary search đệ quy.

*Đọc thêm trong bộ sách: Hemant Jain, chương 1; Adam Drozdek, chương 5; Lê Minh Hoàng, phần 2 §3.*

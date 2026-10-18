---
title: "Đệ quy: từ bài toán nhỏ đến lời giải hoàn chỉnh"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/recursion"
series: "DSA cơ bản"
seriesOrder: 5
tags: ["recursion", "call-stack", "recurrence", "go"]
description: "Hiểu base case, bước thu nhỏ, call stack, chứng minh quy nạp và phân tích thời gian lẫn độ sâu bộ nhớ."
draft: false
updated: 2026-10-15
---

Khi cộng `[4,1,3]`, ta có thể nói “4 cộng với tổng của `[1,3]`”. Phần tổng còn lại có cùng dạng câu hỏi ban đầu nhưng ít phần tử hơn. Đó là ý tưởng đệ quy: dùng lời giải của bài toán con cùng dạng để hoàn thành bài toán hiện tại.

“Hàm gọi chính nó” mới mô tả cú pháp. Để dùng được, ta cần xác định chính xác câu hỏi của mỗi lời gọi, trường hợp trả ngay, cách thu nhỏ và cách ghép đáp án. Cây, chia để trị, sinh cấu hình và quay lui thường có cấu trúc khiến cách mô tả này tự nhiên.

## Một trạng thái có hợp đồng rõ

Hàm sau hứa trả tổng của đoạn từ i đến cuối dãy. Đây là khai báo Go độc lập; yêu cầu `0≤i≤len(a)` và tổng trung gian không tràn int.

```go
func SumFrom(a []int, i int) int {
    if i == len(a) { // base case: phần còn lại rỗng
        return 0
    }
    return a[i] + SumFrom(a, i+1) // bài toán nhỏ hơn
}
```

Trạng thái lời gọi là a cùng i. Khi i bằng len, phần còn lại rỗng và tổng là 0. Nếu chưa rỗng, tổng cần tìm gồm `a[i]` và tổng bắt đầu tại i+1. Không cần làm lại việc của lời gọi con; cần tin vào đúng hợp đồng đã định rồi kiểm tra bước ghép.

Thước đo `len(a)-i` là số nguyên không âm và giảm một mỗi lần gọi. Vì không thể giảm mãi trong tập số nguyên không âm, lời gọi sẽ tới base case. Nếu i âm hoặc lớn hơn len, tiền điều kiện bị vi phạm và việc index có thể panic; base case `i==len` không tự bảo vệ mọi input.

Chứng minh đúng đi theo số phần tử còn lại: phần rỗng trả đúng 0; giả sử lời gọi i+1 trả đúng tổng đuôi, cộng a[i] tạo đúng tổng hiện tại. Ta vừa có tính đúng của kết quả vừa có lập luận kết thúc, hai phần đều cần thiết.

## Stack giữ phần công việc đang chờ

Với `[4,1,3]`, `SumFrom(a,0)` chưa thể hoàn tất vì cần tổng đuôi. Các frame lần lượt giữ:

| Lời gọi | Việc còn chờ |
| --- | --- |
| i=0 | cộng 4 vào kết quả i=1 |
| i=1 | cộng 1 vào kết quả i=2 |
| i=2 | cộng 3 vào kết quả i=3 |
| i=3 | không còn phần tử, trả 0 |

Khi quay về, kết quả lần lượt là `3+0=3`, `1+3=4`, `4+4=8`. Thứ tự gọi đi xuống khác thứ tự hoàn tất đi lên; đây là lý do một lần gọi con thường chưa đồng nghĩa xử lý xong nút hiện tại.

Với n phần tử còn lại, có n+1 lời gọi, mỗi lời gọi ngoài đệ quy làm công việc hằng số. `T(n)=T(n-1)+Θ(1)=Θ(n)`. Đồng thời có thể giữ n+1 frame, nên stack `Θ(n)`. Một vòng lặp cộng dãy cũng tuyến tính nhưng chỉ giữ tổng và index, bộ nhớ phụ `Θ(1)`.

```note-visualization
{"id":"factorial-stack","preset":"normal"}
```

Minh họa giai thừa có cùng mẫu: mỗi tầng giữ một phép nhân đang chờ. Đệ quy không tự làm phép tính nhanh hơn. Stack goroutine Go có thể tăng, nhưng độ sâu lớn vẫn tốn bộ nhớ và có giới hạn; không giả định compiler sẽ biến mọi tail recursion thành loop.

## Nhiều nhánh không đồng nghĩa cùng độ sâu với số lời gọi

Fibonacci tạo hai bài toán con theo định nghĩa:

```go
func FibSlow(n int) int {
    if n < 2 {
        return n
    }
    return FibSlow(n-1) + FibSlow(n-2)
}
```

Đoạn này dành cho n không âm, đủ nhỏ để kết quả vừa int. Với n=5, F(5) gọi F(4), F(3); F(4) lại gọi F(3), F(2). F(3) bị tính lại, và các trạng thái nhỏ hơn cũng lặp theo nhiều nhánh. Base case đúng và bài toán giảm vẫn chưa bảo đảm thuật toán hiệu quả.

```note-visualization
{"id":"fibonacci-calls","preset":"normal"}
```

Tổng số lời gọi tăng `Θ(φⁿ)` với φ là tỉ số vàng trong mô hình số học hằng số. Cận `O(2ⁿ)` cũng đúng nhưng lỏng hơn. Stack sâu tối đa chỉ `O(n)` vì khi một nhánh hoàn tất mới trở lại để chạy nhánh kia; không giữ mọi node của cây lời gọi cùng lúc. Đừng dùng tổng node để suy ra bộ nhớ stack.

Memoization lưu mỗi F(k) sau lần đầu, nên các lần sau chỉ đọc kết quả. Bottom-up tính F(0), F(1), rồi tăng dần. Cả hai xử lý O(n) trạng thái; bảng đầy đủ cần O(n) bộ nhớ. Với riêng Fibonacci, mỗi giá trị chỉ cần hai giá trị trước nên cách lặp có thể còn O(1) bộ nhớ phụ. Nếu dùng số nguyên độ dài tùy ý để tránh tràn, phải tính thêm chi phí số học theo số bit; các cận trên không còn tự là thời gian thực hằng số cho từng phép cộng.

Quy hoạch động xuất hiện khi bài toán con chồng lặp và kết quả có thể dùng lại. Một đệ quy trên hai nửa độc lập như merge sort không tự trở thành DP chỉ vì có nhiều lời gọi.

## Chọn trạng thái mà không âm thầm sao chép

Trên dãy, cặp index `(left,right)` làm rõ đoạn đang xử lý và tránh copy dữ liệu mỗi lần thu nhỏ. Trong Go, `a[left:right]` chỉ tạo slice descriptor, thường O(1) và chia sẻ array; nó không phải một bản copy độc lập. Nếu giữ lâu, view ấy có thể giữ array lớn sống. Hợp đồng cần nói các lời gọi có được sửa cùng array hay không.

Trên cây, node hiện tại thường là trạng thái tự nhiên. Trên đồ thị có chu trình, chỉ truyền node mà không parent/visited hoặc điều kiện khác có thể quay lại mãi. Một lời gọi “nhìn có vẻ gần gốc hơn” không thay thế được thước đo kết thúc.

Trước khi code, viết bốn câu cụ thể: lời gọi trả gì với trạng thái hiện tại; trường hợp nào trả ngay; kết quả con ghép thế nào; đại lượng nguyên không âm nào giảm. Nếu thiếu trạng thái, cùng một tham số có thể cần hai đáp án khác nhau. Nếu thiếu tiến triển, một nhánh có thể gọi lại chính trạng thái cũ.

## Những kỹ thuật dùng chung cách nghĩ bài toán con

Chia để trị giải các phần ít chồng lặp rồi ghép, như merge sort. Quay lui thử một lựa chọn, gọi xuống sâu rồi hoàn tác trạng thái trước khi thử nhánh tiếp. DP lưu trạng thái lặp lại. Chúng cùng có thể dùng đệ quy nhưng khác về quan hệ giữa các nhánh và cách tránh công việc thừa. Khi chọn kỹ thuật, hãy vẽ trạng thái và quan hệ phụ thuộc trước khi đặt tên.

## Tự suy luận và lời giải gợi ý

**1.** `MaxFrom(a,i)` nên trả gì khi phần còn lại rỗng? **2.** Binary search đệ quy có tổng thời gian và stack thế nào? **3.** Bản loop tính tổng tương ứng với quy nạp ở điểm nào?

**Giải thích:** Max nên có `(int,bool)` hoặc hợp đồng vắng mặt tương đương. Rỗng trả false; không dùng 0 hay MinInt làm một giá trị “không có” trộn với dữ liệu. Binary search chỉ gọi một nửa mỗi bước, làm O(1) việc ngoài lời gọi nên thời gian `O(log n)`, stack `O(log n)` nếu không copy đoạn; bản loop có thể dùng O(1) phụ. Với loop tính tổng, bất biến là tổng hiện giữ đúng tổng tiền tố đã đọc; với đệ quy, giả thiết là lời gọi con trả đúng tổng đuôi. Cả hai đều xây tính đúng từ trạng thái nhỏ sang trạng thái lớn.

Để tự kiểm sự lặp, vẽ F(5) và đánh dấu mọi F(3), F(2): những tên lặp cho thấy cơ hội dùng lại kết quả. Không cần chạy số n lớn để kết luận bản đệ quy ngây thơ có công việc thừa.

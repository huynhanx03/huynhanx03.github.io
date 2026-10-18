---
title: "Greedy: chọn cục bộ và chứng minh có nghiệm tối ưu đi cùng"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/greedy"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 2
tags: ["greedy", "exchange-argument", "interval-scheduling"]
description: "Phân biệt trực giác tham lam với chứng minh qua bài chọn khoảng và phản ví dụ."
draft: false
---

Thuật toán tham lam xây lời giải bằng những lựa chọn không quay lại. Nó chỉ đúng nếu có thể chứng minh mỗi lựa chọn cục bộ tương thích với **một nghiệm tối ưu toàn cục**. “Chọn thứ tốt nhất trước” chưa xác định tốt nhất theo tiêu chí nào, và nhiều tiêu chí nghe hợp lý lại sai.

## 1. Chọn nhiều khoảng không giao nhau nhất

Mỗi công việc có thời điểm bắt đầu `start` và kết thúc `end`; hai khoảng `[start,end)` tương thích khi công việc sau bắt đầu `>= end` công việc trước. Sắp tăng theo `end`, lần lượt nhận công việc đầu tiên bắt đầu không trước `lastEnd`. Sắp xếp `O(n log n)`, quét `O(n)`, bộ nhớ phụ tùy cách sắp xếp.



```go
type Interval struct { Start, End int }

func SelectMax(intervals []Interval) []Interval {
    sort.Slice(intervals, func(i, j int) bool {
        return intervals[i].End < intervals[j].End
    })
    chosen := make([]Interval, 0)
    for _, in := range intervals {
        if len(chosen) == 0 || in.Start >= chosen[len(chosen)-1].End {
            chosen = append(chosen, in)
        }
    }
    return chosen
}
```

Cần `import "sort"`; hàm sắp xếp slice đầu vào tại chỗ và giả sử `Start <= End`. Chứng minh bằng **đổi chỗ**: gọi `g` là khoảng kết thúc sớm nhất, `o` là khoảng đầu của một lịch tối ưu. Vì `end(g)<=end(o)`, thay `o` bằng `g` không làm khoảng nào phía sau mất tương thích. Vậy tồn tại lịch tối ưu bắt đầu bằng `g`. Bỏ phần trước `end(g)`, phần còn lại có cùng dạng bài toán; lặp quy nạp.



```note-visualization
{"id":"interval-scheduling","preset":"normal"}
```

## 2. Khi tham lam thất bại

Chọn khoảng **bắt đầu sớm nhất** sai: `[0,10)` chặn `[1,2),[2,3),...,[9,10)`. Với đổi tiền tối thiểu, lấy mệnh giá lớn nhất trước cũng không luôn đúng: tiền `[1,3,4]`, cần `6`; tham lam cho `4+1+1` (3 đồng), tối ưu `3+3` (2 đồng). Đây là cách hữu ích để tự kiểm định một heuristic: tìm đầu vào nhỏ phá vỡ nó trước khi viết code.



Greedy thường xuất hiện khi có tính chất trao đổi (interval scheduling, MST), cấu trúc matroid, hoặc chứng minh cận rõ ràng. Với fractional knapsack, lấy theo tỷ lệ giá trị/trọng lượng đúng vì có thể lấy một phần vật; với 0/1 knapsack, cùng quy tắc không còn đúng vì không thể chia vật. Cần đọc chính xác ràng buộc trước khi chuyển chứng minh từ bài này sang bài khác.



```note-visualization
{"id":"greedy-coin-counterexample","preset":"normal"}
```

**Tự luyện:** (1) Chứng minh chọn công việc ngắn nhất trước cũng có thể sai. (2) Mô phỏng thuật toán với khoảng có cùng thời điểm kết thúc. (3) Tìm một hệ mệnh giá mà tham lam đổi tiền đúng cho một số mục tiêu nhưng sai cho mục tiêu khác.

*Đối chiếu: Jain, chương 17; Lê Minh Hoàng, phần 4 §9.*

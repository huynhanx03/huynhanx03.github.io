---
title: "Greedy: chọn cục bộ và chứng minh có nghiệm tối ưu đi cùng"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/greedy"
series: "DSA nâng cao"
seriesOrder: 2
tags: ["greedy", "exchange-argument", "interval-scheduling"]
description: "Phân biệt trực giác tham lam với chứng minh qua bài chọn khoảng và phản ví dụ."
draft: false
updated: 2026-10-15
---

Một phòng chỉ nhận một công việc tại một thời điểm. Mỗi công việc đã có giờ bắt đầu và kết thúc; ta muốn nhận nhiều công việc nhất. Chọn công việc bắt đầu sớm nhất nghe hợp lý, nhưng một việc kéo dài cả ngày có thể chặn nhiều việc ngắn. Muốn dùng greedy, cần xác định chính xác tiêu chí và chứng minh tại sao cam kết theo tiêu chí ấy vẫn giữ được một nghiệm tối ưu.

Thuật toán tham lam xây lời giải bằng những lựa chọn không quay lại sửa. Bằng chứng thường không nói rằng lựa chọn đó thuộc mọi nghiệm tối ưu. Ta chỉ cần chứng minh tồn tại một nghiệm tối ưu đi cùng lựa chọn ấy, rồi giải phần còn lại.

## Thời điểm kết thúc giữ lại cơ hội nào?

Công việc là khoảng `[start,end)`, trong bài này giả sử `start<end`. Việc sau tương thích khi bắt đầu `>=` giờ kết thúc việc trước. Kết thúc càng sớm, phần thời gian còn lại càng rộng. Vì vậy sắp tăng theo `end`, quét và nhận công việc đầu tiên chưa xung đột với việc cuối đã nhận.

Với các khoảng `[0,6),[1,3),[3,5),[5,7)`, thứ tự kết thúc đưa `[1,3)` lên trước. Sau khi nhận nó, `[3,5)` được nhận vì bắt đầu đúng lúc 3; `[0,6)` bị bỏ vì bắt đầu trước 5; `[5,7)` được nhận. Kết quả có 3 việc. Quy tắc không ưu tiên khoảng ngắn nhất riêng lẻ, mà ưu tiên mốc giải phóng phòng sớm nhất tại mỗi bước.

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

Đây là khai báo Go, cần `import "sort"`. Hàm sắp slice đầu vào tại chỗ; muốn giữ thứ tự cũ, caller cần sao chép trước. Nó dùng độ dài `chosen` để nhận biết chưa có việc nào, nên không cần chọn một `lastEnd` giả có thể sai với mốc thời gian âm. Slice rỗng trả lịch rỗng.

Hợp đồng `Start<End` làm rõ công việc có thời lượng dương. Nếu cho khoảng rỗng `Start==End`, cần định nghĩa lại tính tương thích và cách xử lý đồng hạng; comparator chỉ theo `End` không tự giải quyết mọi quy ước cho khoảng rỗng. Các công việc dương có cùng giờ kết thúc có thể chọn tùy thứ tự: chúng để lại cùng mốc cho phần sau.

## Chứng minh bằng một lần đổi chỗ

Gọi `g` là khoảng kết thúc sớm nhất, `o` là khoảng đầu của một lịch tối ưu. Vì `end(g)<=end(o)`, mọi công việc sau `o` cũng bắt đầu không trước `end(g)`. Thay `o` bằng `g` không làm mất công việc nào phía sau và không đổi số lượng. Do đó có một lịch tối ưu bắt đầu bằng `g`.

Sau khi chọn `g`, bỏ các khoảng bắt đầu trước `end(g)`. Bài toán còn lại vẫn là chọn nhiều khoảng tương thích nhất từ phần thời gian còn lại. Áp dụng lập luận đổi chỗ cho bài toán con, rồi quy nạp theo số công việc còn lại, ta được toàn bộ lịch tối ưu. Đây là bước nối lựa chọn cục bộ với mục tiêu toàn cục mà trực giác “kết thúc sớm thì tốt” chưa cung cấp.

Sắp xếp tốn `O(n log n)`, quét mỗi khoảng một lần tốn `O(n)`. Kết quả lưu tối đa `n` khoảng; bộ nhớ phụ của bước sắp tùy cách cài. Không có bước thử lại các quyết định đã nhận.

```note-visualization
{"id":"interval-scheduling","preset":"normal"}
```

## Phá một quy tắc khác bằng đầu vào nhỏ

Chọn bắt đầu sớm nhất sẽ nhận `[0,10)` và chặn `[1,2),[2,3),...,[9,10)`. Chọn thời lượng ngắn nhất cũng có thể sai: `[0,3)` và `[3,6)` tương thích với nhau, nhưng khoảng ngắn hơn `[2,4)` giao cả hai. Nhận `[2,4)` trước chỉ được một việc thay vì hai.

Tương tự, đổi tiền với các mệnh giá `[1,3,4]` và mục tiêu 6: lấy đồng lớn nhất trước cho `4+1+1`, trong khi `3+3` ít đồng hơn. Cùng hệ tiền ấy, mục tiêu 5 lại có nghiệm greedy tối ưu `4+1`. Một vài mục tiêu chạy đúng không chứng minh quy tắc đúng trên cả hệ mệnh giá.

```note-visualization
{"id":"greedy-coin-counterexample","preset":"normal"}
```

## Nhận ra giả định làm greedy có hiệu lực

Với fractional knapsack, mỗi đơn vị trọng lượng của vật tỷ lệ cao thay được đơn vị tỷ lệ thấp mà không làm giảm giá trị. Khả năng chia nhỏ giúp thực hiện bước đổi chỗ. Với 0/1 knapsack, không thể đổi một phần vật tùy ý nên cùng tỷ lệ không còn bảo đảm đúng. [Nhánh cận](/vi/notes/data-structures-algorithms/branch-and-bound/) dùng lời giải fractional làm cận, chứ không coi nó là lời giải nguyên.

Greedy cũng xuất hiện trong MST qua tính chất lát cắt và trong các cấu trúc có tính trao đổi như matroid. Các tên này không tự chứng minh một heuristic mới: cần chỉ ra chính xác thao tác trao đổi nào giữ tính hợp lệ và không giảm chất lượng. Khi không tìm được bước ấy, thử phản ví dụ nhỏ hoặc chuyển sang trạng thái đầy đủ hơn như DP.

**Tự thử:** vì sao hai việc dương cùng giờ kết thúc không cần tie-break để bảo toàn số lượng tối ưu? Quy tắc ngắn nhất sai ở đâu trong ví dụ `[0,3),[2,4),[3,6)`? Với tiền `[1,3,4]`, mục tiêu 6 cần bao nhiêu đồng?

**Giải thích:** sau một trong hai việc cùng mốc kết thúc, tập công việc có thể nhận tiếp giống nhau, nên lập luận đổi chỗ vẫn dùng được. Khoảng `[2,4)` ngắn nhất nhưng cản cả hai khoảng còn lại, làm mất cơ hội nhận cặp tương thích. Mục tiêu 6 cần 2 đồng `3+3`; greedy cho 3 đồng nên không tối ưu.

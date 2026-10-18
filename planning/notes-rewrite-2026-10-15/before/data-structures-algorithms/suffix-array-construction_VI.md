---
title: "Suffix array chuyên sâu: xây bằng doubling, tính LCP và trả truy vấn"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/suffix-array-construction"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 32
tags: ["string", "suffix-array", "lcp", "kasai"]
description: "Từ sắp hậu tố bằng rank đôi đến LCP tuyến tính và tìm mẫu bằng binary search."
draft: false
---

Suffix array `sa` chứa vị trí bắt đầu các hậu tố theo thứ tự từ điển. Với `banana`, `sa=[5,3,1,0,4,2]`: hậu tố ở 5 là `a`, ở 3 là `ana`, v.v. Bài tổng quan trước đã nêu ý tưởng. Ở đây ta xây nó mà không so trực tiếp cả hai hậu tố dài `O(n)` ở mỗi lần sort, rồi tính LCP để khai thác các đoạn lặp.

## 1. Doubling: phân biệt tiền tố dài gấp đôi

Ban đầu `rank[i]` là thứ tự của ký tự `s[i]` (nên nén về các số nguyên liên tiếp); mọi hậu tố được phân biệt theo 1 ký tự đầu. Ở lượt `k`, đã biết rank của đoạn dài `k`. Để sắp theo `2k` ký tự đầu, so cặp `(rank[i], rank[i+k])`; nếu `i+k>=n`, dùng rank `-1`, nhỏ hơn mọi ký tự hợp lệ. Sort các vị trí `i=0..n-1` theo cặp đó, rồi gán rank mới: hai vị trí cùng rank mới khi và chỉ khi hai cặp bằng nhau. Lặp `k=1,2,4,...` cho tới `k>=n` hoặc mọi rank đã khác nhau.



Bất biến sau mỗi lượt: `rank[i]` phản ánh chính xác thứ tự của tiền tố độ dài `2k` của hậu tố ở `i`, với phần thiếu cuối chuỗi xếp trước phần kéo dài. Vì thứ tự từ điển so nửa đầu trước, nếu bằng mới so nửa sau, so cặp rank là đủ. Có `O(log n)` lượt. Nếu mỗi lượt dùng `sort.Slice` với so sánh `O(1)`, chi phí `O(n log² n)`, bộ nhớ `O(n)`; nếu dùng counting/radix sort trên các rank nguyên, giảm còn `O(n log n)`. Một lời cài “doubling O(n log n)” nhưng dùng comparison sort ở mọi lượt là báo chi phí thiếu một `log n`.

```go
// Ý tưởng khóa so sánh ở lượt k; rank ngoài chuỗi là -1.
func pair(rank []int, i, k int) (int, int) {
    second := -1
    if i+k < len(rank) { second = rank[i+k] }
    return rank[i], second
}
```

Trong Go, hàm comparator `sort.Slice` gọi `pair(rank,i,k)` và `pair(rank,j,k)`, so thành phần đầu rồi thành phần sau. Sau sort, gán rank mới bằng một vòng từ trái sang phải. Phải dùng **rank cũ** cho cả lần sort và gán; ghi đè rank ngay khi đang so sẽ phá kết quả.



```note-visualization
{"id":"suffix-doubling","preset":"normal"}
```

## 2. LCP bằng thuật toán Kasai

`lcp[r]` là độ dài tiền tố chung của `s[sa[r]:]` và `s[sa[r-1]:]`, với `lcp[0]=0`. Tạo `position[i]` là rank của suffix tại `i`. Duyệt `i` theo thứ tự gốc. Nếu suffix `i` có LCP `h` với suffix đứng trước nó trong thứ tự sort, thì suffix `i+1` có LCP với người đứng trước **ít nhất `h-1`**; bỏ ký tự đầu khỏi hai hậu tố không thể mất hơn một ký tự khớp. Bắt đầu so từ `max(h-1,0)` rồi tăng cho tới sai khớp. Tổng phần tăng/giảm là `O(n)`, nên Kasai tính LCP trong `O(n)`.



Giá trị LCP lớn nhất là độ dài đoạn con lặp dài nhất; cặp suffix tương ứng cho vị trí hai lần xuất hiện. Một mẫu `p` xuất hiện ở các suffix có tiền tố `p`, tạo một khoảng liên tiếp trong `sa`. Tìm hai biên bằng binary search; comparator so tối đa `|p|` ký tự cho mỗi bước, nên `O(|p| log n)` với bản đơn giản. Cần xác định mẫu rỗng có được coi là xuất hiện ở `n+1` ranh giới hay không.



```note-visualization
{"id":"kasai-lcp","preset":"normal"}
```

**Tự luyện:** (1) Làm hai lượt doubling đầu cho `banana`. (2) Tính LCP của các suffix kề trong `sa` trên. (3) Giải thích tại sao LCP lớn nhất tìm được đoạn lặp dài nhất.

*Đọc thêm: [VNOI — Suffix Array](https://wiki.vnoi.info/algo/string/suffix-array).*

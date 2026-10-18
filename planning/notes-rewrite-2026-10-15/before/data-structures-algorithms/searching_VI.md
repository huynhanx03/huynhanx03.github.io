---
title: "Tìm kiếm: bất biến biên làm nên binary search đúng"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/searching"
translationPending: true
series: "DSA cơ bản"
seriesOrder: 9
tags: ["linear-search", "binary-search", "lower-bound", "invariant", "go"]
description: "Từ quét tuyến tính đến lower bound, upper bound và tìm đáp án bằng một predicate đơn điệu."
draft: false
---

Nếu dữ liệu chưa có cấu trúc, tìm một phần tử thường phải xem từng vị trí: tìm tuyến tính `O(n)`, bộ nhớ `O(1)`. Nếu dãy **đã sắp xếp**, ta có thể loại nửa không gian tìm kiếm mỗi bước. Cái khó của binary search không nằm ở phép chia đôi, mà ở việc nói rõ đoạn nào còn chứa đáp án.

## 1. `lower_bound` trên khoảng nửa mở

Ta tìm chỉ số đầu tiên `i` sao cho `a[i] >= target`; nếu không có, trả `len(a)`. Duy trì khoảng `[lo, hi)` còn có thể chứa đáp án. Mọi chỉ số `<lo` chắc chắn quá nhỏ; mọi chỉ số `>=hi` đã đủ lớn. Ban đầu `lo=0`, `hi=n`; đến khi bằng nhau, đó là biên cần tìm.

Thử thay input và xem hai biên dịch chuyển. Phần minh họa chạy thuật toán mẫu ngay trong trình duyệt.

```note-visualization
{"id":"binary-search","preset":"found"}
```

```go
func LowerBound(a []int, target int) int {
    lo, hi := 0, len(a)
    for lo < hi {
        mid := lo + (hi-lo)/2
        if a[mid] < target {
            lo = mid + 1
        } else {
            hi = mid
        }
    }
    return lo
}
```

Nếu `a[mid] < target`, mọi chỉ số `<=mid` đều quá nhỏ; nếu không, `mid` là ứng viên nên giữ lại nó bằng `hi=mid`. Mỗi vòng làm `hi-lo` nhỏ đi, do đó kết thúc. Thời gian `O(log n)`, bộ nhớ `O(1)`. Với `[1,2,2,4]` và target `2`, kết quả là `1`; với target `5`, kết quả là `4`. Kiểm tra có mặt bằng `i<len(a) && a[i]==target`.

## 2. `upper_bound` và dãy trùng lặp

Đổi điều kiện thành `a[mid] <= target` thì ta tìm phần tử đầu tiên **lớn hơn** target. Số lần target xuất hiện là `UpperBound(a,target)-LowerBound(a,target)`. Việc phân biệt `<` với `<=` quan trọng hơn tên hàm: viết invariant ngay cạnh code nếu dễ nhầm. Cách chia `lo+(hi-lo)/2` tránh tràn của `lo+hi` trên các kiểu số hữu hạn.





```note-visualization
{"id":"upper-bound","preset":"normal"}
```

## 3. Binary search trên đáp án

Đôi khi không có mảng đã sắp, nhưng có predicate `feasible(x)` đơn điệu: nếu đáp án `x` khả thi thì mọi `y>x` cũng khả thi (hoặc chiều ngược lại). Ta tìm giá trị khả thi nhỏ nhất bằng cùng khuôn lower bound. Ví dụ muốn tìm công suất máy tối thiểu để xử lý mọi công việc trong `d` ngày: `feasible(capacity)` mô phỏng số ngày; công suất càng lớn không thể làm số ngày tăng. Mỗi lần kiểm tra tốn `O(n)`, tìm trong miền giá trị kích thước `R` tốn `O(n log R)`.



Phải xác định một biên bất khả thi và một biên khả thi, cùng đơn vị đo và xử lý cả trường hợp không có đáp án. Nếu predicate không đơn điệu, binary search trả kết quả vô nghĩa dù vòng lặp vẫn kết thúc.



```note-visualization
{"id":"answer-binary-search","preset":"normal"}
```

**Tự luyện:** (1) Viết `UpperBound` và đếm số `2` trong `[1,2,2,2,5]`. (2) Tìm căn bậc hai nguyên của `x` bằng predicate tránh `mid*mid` tràn số. (3) Với dãy chưa sắp, giải thích vì sao so sánh ở giữa không cho phép bỏ nửa dãy.

*Đối chiếu: Jain, chương 5; Lê Minh Hoàng, phần 2 §9.*

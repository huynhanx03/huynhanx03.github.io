---
title: "Tìm kiếm: bất biến biên làm nên binary search đúng"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/searching"
series: "DSA cơ bản"
seriesOrder: 9
tags: ["linear-search", "binary-search", "lower-bound", "invariant", "go"]
description: "Từ quét tuyến tính đến lower bound, upper bound và tìm đáp án bằng một predicate đơn điệu."
draft: false
updated: 2026-10-15
---

Với `[1,2,2,4]`, tìm giá trị 2 có thể trả index 1 hoặc 2 nếu chỉ hỏi “có một vị trí nào không?”. Nhưng nếu cần đếm số lần xuất hiện hoặc chèn trước mọi số 2, ta cần vị trí đầu tiên. Binary search trở nên dễ kiểm soát hơn khi đầu ra được định nghĩa là một **ranh giới** chính xác.

Nếu dãy chưa có thứ tự hay chỉ mục, quét từ đầu đến cuối có thể là lựa chọn đúng: thời gian worst-case O(n), phụ O(1), không cần bước chuẩn bị. Khi dãy đã sắp và truy cập index O(1), binary search dùng thứ tự để bỏ cả vùng không thể chứa đáp án.

## Lower bound là một vị trí từ 0 đến n

Trên dãy không giảm a, `LowerBound` trả index đầu tiên có `a[i]≥target`, hoặc n nếu không có. Trước khi tìm, mọi index chưa được phân loại. Duy trì hai vùng đã chắc chắn: mọi index `<lo` có giá trị nhỏ hơn target; mọi index `≥hi` trong dãy có giá trị không nhỏ hơn target. Vùng chưa phân loại là `[lo,hi)`; ranh giới đáp án có thể là hi.

Cách nói cuối quan trọng: khi hi=n, n là một vị trí trả về hợp lệ dù không phải index để đọc a[n]. Không được diễn giải “đáp án luôn là một phần tử nằm trong `[lo,hi)`” ở lúc vùng ấy đã rỗng.

```note-visualization
{"id":"binary-search","preset":"found"}
```

Khai báo Go sau không sửa đầu vào và không cần import:

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

Với `[1,2,2,4]`, target 2:

| lo | hi | mid | Quan sát và cập nhật |
| ---: | ---: | ---: | --- |
| 0 | 4 | 2 | a[2]=2 đủ lớn, hi=2 |
| 0 | 2 | 1 | a[1]=2 đủ lớn, hi=1 |
| 0 | 1 | 0 | a[0]=1 quá nhỏ, lo=1 |

Kết thúc lo=hi=1. Nếu a[mid] nhỏ, mọi index tới mid cũng nhỏ vì dãy đã sắp; bỏ được chúng bằng `lo=mid+1`. Nếu a[mid] đủ lớn, mid vẫn có thể là đáp án nên chuyển hi về mid, không bỏ thêm nó như một giá trị quá nhỏ. Mỗi lượt giảm độ dài vùng chưa biết, nên vòng kết thúc và hai vùng đã phân loại gặp nhau đúng tại ranh giới.

Với target 5, kết quả n=4. Với dãy rỗng, vòng không chạy và trả 0. Muốn xác nhận target có mặt, sau khi lấy i phải kiểm tra `i<len(a) && a[i]==target`. Thứ tự kiểm tra tránh đọc vượt biên; lower bound tự nó chỉ trả ranh giới, chưa hứa phần tử tại đó bằng target.

Mỗi lượt giảm khoảng còn khoảng một nửa, nên O(log n) thời gian, O(1) phụ trong mô hình so sánh số nguyên/index hằng số. `lo+(hi-lo)/2` tránh phép cộng lo+hi có thể tràn; các biên vẫn cần hợp lệ theo kiểu số đang dùng.

## Upper bound tách phần bằng target khỏi phần lớn hơn

Để tìm index đầu tiên có giá trị **lớn hơn** target, thay phép kiểm tra vùng nhỏ thành `a[mid] <= target`; nếu đúng thì lo=mid+1, ngược lại hi=mid. Đây là upper bound. Bất biến đổi thành vùng bên trái không lớn hơn target và vùng bên phải lớn hơn target.

Với `[1,2,2,2,5]`, lower bound của 2 là 1, upper bound là 4. Ba phần tử bằng 2 nằm trong khoảng `[1,4)`, nên số lần xuất hiện bằng `4-1=3`. Nếu target vắng mặt, hai biên bằng nhau và số lần bằng 0, không cần nhánh đếm riêng.

```note-visualization
{"id":"upper-bound","preset":"normal"}
```

Các tên lower/upper hữu ích để tra cứu, nhưng điều kiện `<` hay `<=` và ý nghĩa biên mới quyết định code đúng. Không trộn quy tắc cập nhật của khoảng đóng `[lo,hi]` vào code dùng khoảng nửa mở mà không đổi bất biến tương ứng.

## Không có mảng vẫn có thể tìm một biên đơn điệu

Giả sử có các công việc theo thứ tự, mỗi công việc không chia nhỏ, cần hoàn tất trong không quá d ngày và công suất mỗi ngày là C. Predicate `feasible(C)` mô phỏng lần lượt: nếu thêm công việc tiếp theo vượt C thì chuyển ngày; công việc nào tự lớn hơn C khiến bất khả thi. Giả định tải không âm, d≥1 và không có quy tắc phụ khiến tăng C làm tình hình xấu đi.

Nếu C khả thi thì công suất lớn hơn có thể dùng lại chính lịch ấy, nên cũng khả thi. Các giá trị C tạo dạng false...false,true...true. Ta tìm true đầu tiên như lower bound. Với tải `[3,2,4]`, d=2: C=4 cần ba ngày; C=5 dùng `[3,2]` rồi `[4]`, đủ hai ngày. Minimum là 5.

```note-visualization
{"id":"answer-binary-search","preset":"normal"}
```

Với đầu vào không rỗng như trên, max tải là cận dưới và tổng tải là một cận trên khả thi. Có thể chọn biên bất khả thi/khả thi cho một biến thể khác của vòng lặp, hoặc giữ khoảng ứng viên kiểu lower bound; cần nhất quán ý nghĩa biên và xử lý không có đáp án. Dữ liệu rỗng, d không hợp lệ, công việc âm hay tổng tràn cần hợp đồng riêng. Một predicate không đơn điệu vẫn có thể làm loop kết thúc nhưng không bảo đảm đúng đáp án.

Nếu mỗi kiểm tra đọc n công việc và miền ứng viên nguyên có R giá trị, tổng O(n log R) lần công việc, phụ tùy predicate. Không được chỉ ghi O(log R) rồi quên chi phí một lần mô phỏng.

## Tự suy luận ở biên

**1.** Viết upper bound để đếm 2 trong `[1,2,2,2,5]`. **2.** Tìm căn bậc hai nguyên của x không âm mà không tính `mid*mid`. **3.** Vì sao không bỏ nửa dãy chưa sắp bằng một so sánh ở giữa?

**Giải thích:** Upper bound dùng `<=`, trả 4; lower bound trả 1, hiệu là 3. Với mid>0, `mid²≤x` tương đương `mid≤x/mid` trong số học nguyên không âm; xử lý mid=0 riêng để tránh chia 0 và tránh biên x+1 tràn khi x cực đại. Có thể tìm giá trị lớn nhất thỏa điều kiện, hoặc true đầu tiên của điều kiện đối lập với quy ước biên tương ứng. Trên dãy chưa sắp, a[mid]<target không nói phần bên trái cũng nhỏ: một target có thể nằm bất kỳ bên nào. Chính thứ tự hoặc tính đơn điệu, không phải phép chia đôi, cho phép loại cả vùng.

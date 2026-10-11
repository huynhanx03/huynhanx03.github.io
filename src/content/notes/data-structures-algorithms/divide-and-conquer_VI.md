---
title: "Chia để trị: tách, giải, rồi ghép"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/divide-and-conquer"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 1
tags: ["divide-and-conquer", "merge-sort", "recurrence", "master-theorem", "go"]
description: "Đi từ merge sort đến cây đệ quy, Master theorem, và hiểu khi nào chia bài toán không giúp giảm chi phí."
draft: false
---

Chia để trị gồm ba bước: **chia** một bài toán thành các bài toán nhỏ cùng dạng, **giải** từng phần, rồi **ghép** các kết quả. Từ “chia” nghe đơn giản, nhưng chất lượng thuật toán nằm ở câu hỏi: *chi phí ghép là bao nhiêu, các phần có cân bằng không, và chúng có lặp lại cùng công việc không?*

Merge sort là ví dụ minh bạch. Chia dãy làm hai nửa, sắp xếp mỗi nửa, rồi trộn hai dãy đã sắp thành một dãy đã sắp. Base case là đoạn dài 0 hoặc 1: nó đã có thứ tự.

## 1. Theo dõi một lần trộn

Giả sử hai nửa đã sắp là `[2, 7, 9]` và `[1, 5, 8]`. Đặt con trỏ ở đầu mỗi nửa. So sánh `2` với `1`, lấy `1`; tiếp tục so sánh `2` với `5`, lấy `2`; sau đó lần lượt lấy `5`, `7`, `8`, `9`. Kết quả là `[1, 2, 5, 7, 8, 9]`. Mỗi phần tử được ghi một lần vào vùng đệm, nên trộn `n` phần tử tốn `Θ(n)`.

**Bất biến của bước trộn:** sau khi ghi `k` phần tử, đoạn đầu của kết quả chứa đúng `k` phần tử nhỏ nhất trong hai nửa, theo thứ tự không giảm. Hai phần tử chưa dùng nhỏ nhất luôn ở đầu phần còn lại của từng nửa; lấy phần tử nhỏ hơn sẽ duy trì bất biến. Nếu bằng nhau, chọn từ nửa trái trước để giữ thứ tự tương đối của các phần tử bằng nhau: tính **stable**.

```go
func MergeSort(values []int) {
    buffer := make([]int, len(values))
    mergeSortRange(values, buffer, 0, len(values))
}

// Sắp xếp đoạn nửa mở [lo, hi).
func mergeSortRange(values, buffer []int, lo, hi int) {
    if hi-lo <= 1 {
        return
    }

    mid := lo + (hi-lo)/2
    mergeSortRange(values, buffer, lo, mid)
    mergeSortRange(values, buffer, mid, hi)

    i, j, k := lo, mid, lo
    for i < mid && j < hi {
        if values[i] <= values[j] {
            buffer[k] = values[i]
            i++
        } else {
            buffer[k] = values[j]
            j++
        }
        k++
    }
    for i < mid {
        buffer[k] = values[i]
        i++
        k++
    }
    for j < hi {
        buffer[k] = values[j]
        j++
        k++
    }
    copy(values[lo:hi], buffer[lo:hi])
}
```

`buffer` được cấp phát **một lần** và dùng lại; nếu mỗi tầng tự tạo một slice mới, tổng cấp phát và áp lực GC có thể lớn hơn dù bậc thời gian vẫn là `O(n log n)`. Đoạn `[lo, hi)` nửa mở giúp `hi-lo` chính là độ dài và hai nửa `[lo, mid)`, `[mid, hi)` không chồng nhau. Hàm sửa trực tiếp `values`; API cần nói rõ điều này.

## 2. Từ code sang phương trình truy hồi

Với `n` phần tử, có hai lời gọi trên cỡ `n/2` và bước trộn `Θ(n)`: `T(n) = 2T(n/2) + Θ(n)`, `T(1)=Θ(1)`. Cây đệ quy có khoảng `log₂ n` tầng; ở mỗi tầng, tổng số phần tử được trộn là `n`. Tổng thời gian là `Θ(n log n)`. Vùng đệm là `Θ(n)`; call stack sâu `Θ(log n)`, nên bộ nhớ phụ tổng thể là `Θ(n)`.

Nếu `n` lẻ, hai nửa khác nhau một phần tử; điều đó không đổi kết luận tiệm cận. Với mọi thuật toán dựa chỉ trên so sánh, sắp xếp tổng quát có cận dưới `Ω(n log n)` ở worst-case, nên merge sort đạt đúng bậc tối ưu trong mô hình này. Counting/radix sort vượt được cận đó vì chúng khai thác thêm giả định về khóa, không chỉ so sánh.

## 3. Master theorem là công cụ, không phải câu thần chú

Nhiều thuật toán có dạng `T(n) = aT(n/b) + f(n)`: tạo `a` bài toán con cỡ `n/b`, còn `f(n)` là công việc chia và ghép. So sánh `f(n)` với `n^{log_b a}` để biết chi phí chủ yếu nằm ở lá, đều giữa các tầng hay ở gần gốc, **khi các điều kiện áp dụng của định lý được thỏa**.

| Truy hồi | Cách nhìn | Kết quả |
| --- | --- | --- |
| `2T(n/2)+Θ(n)` | mỗi tầng tốn `Θ(n)` | `Θ(n log n)` |
| `T(n/2)+Θ(1)` | số tầng là `log n` | `Θ(log n)` |
| `4T(n/2)+Θ(n)` | số bài toán con tăng nhanh | `Θ(n²)` |

Không ép Master theorem lên `T(n)=T(n-1)+1`, vì bài toán con không có kích thước `n/b` với `b>1`. Cũng không bỏ qua giả định rằng các bài toán con có kích thước gần nhau. Nếu chia lệch nặng, hãy viết truy hồi thực tế hoặc dùng cây đệ quy.

## 4. Phân biệt với các kỹ thuật họ hàng

Binary search là **giảm để trị**: mỗi bước chỉ tiếp tục trên *một* nửa, không giải cả hai. Quicksort chia quanh pivot, nhưng nếu pivot luôn tạo đoạn kích thước `0` và `n-1`, worst-case là `Θ(n²)`; chọn pivot tốt hơn cải thiện hành vi điển hình chứ không tự tạo bảo đảm worst-case cân bằng. Quy hoạch động cũng chia thành bài toán con, nhưng các bài toán con thường **chồng lặp**, nên cần lưu kết quả để tránh giải lại. Merge sort giải hai nửa không chồng lặp rồi ghép.

Khi gặp một bài mới, hãy tự hỏi: (1) Phần con có cùng cấu trúc với bài gốc không? (2) Có bị giải lặp không? (3) Có chia được tương đối cân bằng không? (4) Ghép kết quả có rẻ hơn giải trực tiếp không? Nếu bước ghép trở thành `Θ(n²)`, một phép chia đẹp trên giấy chưa chắc tạo thuật toán tốt.

**Tự luyện:** (1) Vẽ cây đệ quy cho `n=8` của merge sort và cộng chi phí từng tầng. (2) Đổi `<=` trong bước trộn thành `<`; với hai phần tử bằng nhau có nguồn ở hai nửa khác nhau, tính stable thay đổi thế nào? (3) Phân tích `T(n)=3T(n/2)+Θ(n)` bằng cách so sánh chi phí mỗi tầng. (4) Tìm đầu vào khiến quicksort chọn phần tử đầu làm pivot bị chia lệch liên tục.

*Đọc thêm trong bộ sách: Hemant Jain, chương 18 và chương 6; Adam Drozdek, chương 2 và 9; Lê Minh Hoàng, phần 2 §8.*

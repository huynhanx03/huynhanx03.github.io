---
title: "Chia để trị: tách, giải, rồi ghép"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/divide-and-conquer"
series: "DSA nâng cao"
seriesOrder: 1
tags: ["divide-and-conquer", "merge-sort", "recurrence", "master-theorem", "go"]
description: "Đi từ merge sort đến cây đệ quy, Master theorem, và hiểu khi nào chia bài toán không giúp giảm chi phí."
draft: false
updated: 2026-10-15
---

Một dãy chưa sắp có thể khó xử lý trực tiếp, nhưng hai dãy đã sắp thì trộn được bằng cách nhìn phần tử đầu còn lại của mỗi bên. Merge sort tận dụng điều này: chia dãy làm hai, sắp từng nửa, rồi giải bài toán ghép đơn giản hơn.

Chia để trị không chỉ là có hai lời gọi đệ quy. Ta phải biết phần con có nhỏ đi không, có giải lặp không, và công việc ghép có đủ rẻ để việc chia mang lại lợi ích. Bài này dùng merge sort để nối cách cài, chứng minh và phương trình chi phí.

## Tại sao trộn hai nửa đã sắp lại rẻ?

Cho `[2,7,9]` và `[1,5,8]`. Hai giá trị đầu 2 và 1 là hai ứng viên nhỏ nhất của phần chưa lấy. Chọn 1 rồi tiến con trỏ bên phải; so 2 với 5, chọn 2; tiếp theo chọn 5, 7, 8. Bên phải hết, chép nốt 9. Kết quả `[1,2,5,7,8,9]` không đòi tìm minimum bằng một lần quét mới ở mỗi vị trí.

Sau k lần ghi, bất biến là k vị trí đầu kết quả chứa đúng k phần tử nhỏ nhất của cả hai nửa đầu vào gộp lại, theo thứ tự không giảm. Mỗi phần tử nhỏ nhất chưa dùng của một nửa luôn nằm ở đầu phần còn lại của nửa ấy. Vì vậy chọn đầu nhỏ hơn là hợp lệ; khi một bên hết, bên kia đã có thứ tự để chép tiếp. Mỗi phần tử được ghi một lần, nên ghép n phần tử là `Θ(n)`.

Nếu khóa bằng nhau, cần theo dõi cả danh tính: trái có `4A`, phải có `4B`, A xuất hiện trước B trong đầu vào. Chọn trái khi bằng giữ A trước B. Đây là điều kiện để merge sort ổn định, không tự có từ thao tác chia đôi.

## Khoảng nửa mở và một buffer dùng lại

Code Go sau sửa trực tiếp `values`; khai báo các hàm ở phạm vi package, không cần import. `buffer` được tạo đúng một lần trong hàm ngoài.

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

Đoạn `[lo,hi)` có độ dài `hi-lo`. Base case độ dài 0 hoặc 1 đã có thứ tự. `mid=lo+(hi-lo)/2` tạo hai đoạn liền kề không chồng nhau: `[lo,mid)` và `[mid,hi)`. Dãy lẻ chỉ làm độ dài lệch một, không bỏ phần tử nào.

Hai lời gọi con sửa xong mỗi nửa trước khi bắt đầu trộn. Ba index i, j, k lần lượt là vị trí đọc trái, đọc phải, ghi buffer. Các vòng chép đuôi chỉ chạy cho phần chưa hết, sau đó copy đoạn đã trộn về đúng vùng của values. Không copy toàn bộ array ở mỗi nút đệ quy, chỉ copy đoạn của nút ấy.

Tính đúng được chứng minh theo độ dài: base case đúng; giả sử hai nửa ngắn hơn được sắp đúng, invariant trộn tạo đúng thứ tự của toàn đoạn và giữ nguyên đa tập phần tử. Vì lời gọi luôn nhỏ hơn, đệ quy kết thúc. Dãy rỗng đi thẳng vào base case; khóa trùng vẫn được xử lý với quy tắc trái trước.

```note-visualization
{"id":"merge-call-tree","preset":"normal"}
```

## Chi phí nằm ở cả mỗi tầng

Với n phần tử, hai lời gọi khoảng n/2 và trộn/copy tuyến tính cho truy hồi `T(n)=2T(n/2)+Θ(n)`, với base case hằng số. Cho n=8: tầng gốc xử lý 8 phần tử; tầng hai có hai đoạn 4, tổng 8; tầng ba bốn đoạn 2, tổng 8. Có khoảng log₂ n tầng trộn, nên tổng `Θ(n log n)`.

Số lời gọi không đủ tính thời gian nếu bỏ việc trộn. Ngược lại, cộng n cho mọi node như thể mọi node xử lý toàn dãy sẽ đếm thừa. Cần dùng đúng kích thước đoạn tại mỗi node.

Buffer chiếm `Θ(n)`. Hai nhánh chạy nối tiếp nên stack chỉ giữ một đường sâu `Θ(log n)` cùng lúc, không giữ toàn cây lời gọi trên stack. Tổng bộ nhớ phụ `Θ(n)`. Tạo buffer mới ở nhiều lời gọi có thể tăng tổng lượng cấp phát và áp lực GC, dù cách tổ chức cụ thể có thể vẫn giữ cùng bậc thời gian hoặc bộ nhớ đỉnh; dùng lại buffer làm mục đích rõ và tránh cấp phát không cần thiết.

Sắp xếp chỉ dùng so sánh có cận dưới worst-case `Ω(n log n)` trên dữ liệu tổng quát. Merge sort đạt bậc đó. Counting/radix sort có thể nhanh hơn theo n khi tận dụng miền khóa/chữ số; chúng đổi mô hình thao tác và thêm giả định, không phủ nhận cận dưới so sánh.

## Dùng cây đệ quy trước khi dùng một định lý

Dạng quen thuộc `T(n)=aT(n/b)+f(n)` có a bài con gần bằng nhau, b>1 cố định, f(n) là việc ngoài đệ quy. Đặt `p=log_b a`; `n^p` phản ánh tốc độ tăng số lá. Những trường hợp cơ bản của Master theorem so f(n) với mốc này:

| Quan hệ thích hợp | Chi phí chủ yếu | Kết quả thường dùng |
| --- | --- | --- |
| `f(n)=O(n^(p-ε))`, ε>0 | gần lá | `Θ(n^p)` |
| `f(n)=Θ(n^p)` | mỗi tầng đóng góp cùng bậc | `Θ(n^p log n)` |
| `f(n)=Ω(n^(p+ε))` và điều kiện đều đặn | gần gốc | `Θ(f(n))` |

Ở trường hợp cuối, cần điều kiện như `a f(n/b)≤c f(n)` với c<1 khi n đủ lớn. Bảng chỉ nêu dạng cơ bản; không ép mọi f hoặc mọi phép chia vào nó. `2T(n/2)+Θ(n)` cho `Θ(n log n)`; `T(n/2)+Θ(1)` cho `Θ(log n)`; `4T(n/2)+Θ(n)` cho `Θ(n²)`.

`T(n)=T(n-1)+1` không có bài con cỡ n/b cố định. Phân hoạch quicksort lệch 0 và n-1 cũng không trở thành hai nửa chỉ vì code có hai nhánh. Khi điều kiện không khớp, khai triển hoặc vẽ cây với kích thước thực tế sẽ rõ hơn.

## Những quan hệ bài toán con khác nhau

Binary search chỉ tiếp tục một nửa, thường được gọi giảm để trị. Quicksort xử lý cả hai phía pivot, nhưng cân bằng hay không phụ thuộc phân hoạch; pivot đầu trên dãy tăng có thể liên tục tạo một phía n-1 và dẫn tới `Θ(n²)`. Pivot ngẫu nhiên cho bảo đảm kỳ vọng phù hợp chứ không làm mọi lần phân hoạch cân bằng.

DP lưu các trạng thái chồng lặp. Hai nửa merge sort không chồng nhau nên không cần memoization để tránh sắp lại cùng một nửa. Quay lui có thể chia thành nhiều lựa chọn nhưng còn hoàn tác trạng thái giữa các nhánh. Tên kỹ thuật nên đi sau việc hiểu quan hệ các phần, không thay cho sự phân tích ấy.

Trước một phép chia mới, hỏi phần con có cùng cấu trúc không, có thu nhỏ đủ không, có bị giải lặp không và ghép mất bao nhiêu. Nếu ghép `Θ(n²)`, một cây chia cân bằng chưa tự cho tổng `Θ(n log n)`.

## Tự kiểm tra có lời giải

**1.** Đổi `<=` trong trộn thành `<` ảnh hưởng gì? **2.** `3T(n/2)+Θ(n)` tăng theo bậc nào? **3.** Vì sao dãy tăng gây khó cho quicksort pivot đầu?

**Giải thích:** Khi hai đầu bằng nhau, `<` chọn bên phải trước, có thể đảo thứ tự của hai bản ghi bằng khóa từ hai nửa, nên mất ổn định. Với truy hồi thứ hai, tầng j có việc tỷ lệ `n(3/2)^j`; tầng gần lá chi phối và cho `Θ(n^(log₂3))`. Với quicksort nói trên, pivot luôn là minimum, một phía rỗng và phía còn lại chỉ giảm một; cộng chi phí phân hoạch n+(n-1)+... cho bậc hai. Cần nêu cách xử lý khóa bằng nhau nếu dùng dữ liệu nhiều trùng.

---
title: "Merge sort, quicksort, heapsort: ba cách đạt O(n log n)"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/efficient-sorting"
translationPending: true
series: "DSA cơ bản"
seriesOrder: 11
tags: ["merge-sort", "quicksort", "heapsort", "stability"]
description: "So sánh chia để trị và heap qua độ phức tạp, bộ nhớ, tính ổn định và đầu vào xấu."
draft: false
---

Mọi thuật toán sắp xếp dựa chỉ vào so sánh có cận dưới `Ω(n log n)` trong trường hợp xấu nhất: có `n!` hoán vị cần phân biệt, một phép so sánh nhị phân cung cấp tối đa một bit thông tin, nên cây quyết định cần độ sâu ít nhất `log₂(n!) = Ω(n log n)`. Ba thuật toán sau tiếp cận cận này theo các cách khác nhau.

## 1. Merge sort: trộn hai nửa đã sắp

Chia dãy thành hai nửa, sắp mỗi nửa, rồi trộn. Bất biến khi trộn: phần kết quả đã ghi là những phần tử nhỏ nhất của hai nửa và đã sắp. Chọn phần tử ở nửa trái khi hai khóa bằng nhau giữ thứ tự gốc, nên merge sort **ổn định** nếu phép trộn được viết đúng. Truy hồi `T(n)=2T(n/2)+Θ(n)` cho `Θ(n log n)` ở cả tốt, trung bình, xấu. Với mảng, cần `O(n)` bộ nhớ phụ để trộn; cấp một buffer dùng lại sẽ tránh cấp phát mỗi tầng.





```note-visualization
{"id":"merge-sort","preset":"normal"}
```

## 2. Quicksort: phân hoạch quanh pivot

Chọn pivot, đưa các phần tử nhỏ hơn sang trái và lớn hơn sang phải, rồi xử lý hai phía. Sau phân hoạch, pivot hoặc ranh giới phân hoạch đã ở đúng quan hệ với mọi phần tử hai bên. Nếu pivot chia gần đều, `T(n)≈2T(n/2)+O(n)=O(n log n)`; nếu liên tục lệch `0` và `n-1`, thời gian là `O(n²)`. Chọn pivot ngẫu nhiên hoặc median-of-three giảm xác suất gặp đầu vào xấu nhưng không xóa cận xấu tuyệt đối. Với nhiều khóa bằng nhau, phân hoạch ba vùng `<`, `=`, `>` giúp tránh lặp lại công việc vô ích.



Quicksort thường tại chỗ nhưng stack đệ quy chiếm `O(log n)` khi chia cân bằng và có thể `O(n)` khi lệch; xử lý nhánh nhỏ trước và lặp ở nhánh lớn giữ stack `O(log n)`. Bản phân hoạch tại chỗ thường **không ổn định**.



```note-visualization
{"id":"quick-sort","preset":"normal"}
```

## 3. Heapsort: lặp lấy cực đại

Biến mảng thành max-heap trong `O(n)` bằng sift-down từ các nút trong cuối; liên tục đổi gốc với phần tử cuối vùng heap rồi khôi phục heap trong `O(log n)`. Bất biến: phần đuôi đã sắp chứa các phần tử lớn nhất; phần đầu vẫn là max-heap. Tổng thời gian xấu nhất `O(n log n)`, bộ nhớ phụ `O(1)`, nhưng không ổn định và thường có locality kém hơn quicksort.



| Thuật toán | Thời gian xấu | Bộ nhớ phụ | Ổn định thông thường |
| --- | --- | --- | --- |
| Merge sort trên mảng | `O(n log n)` | `O(n)` | có |
| Quicksort thường | `O(n²)` | stack tối đa `O(n)` | không |
| Heapsort | `O(n log n)` | `O(1)` | không |

Trong Go, `slices.Sort`/`slices.SortFunc` phục vụ nhu cầu thông thường; khi cần giữ thứ tự khóa bằng nhau, chọn API stable tương ứng. Bảng trên mô tả thuật toán cổ điển, không suy ra chi tiết triển khai thư viện từ tên API.



```note-visualization
{"id":"heap-sort","preset":"normal"}
```

**Tự luyện:** (1) Trộn `[1,4,4]` và `[2,4]`, đánh dấu nguồn từng số `4` để kiểm tra ổn định. (2) Vẽ phân hoạch ba vùng cho `[3,1,3,2,3]`. (3) Giải thích vì sao build-heap từ dưới lên là `O(n)`, dù một sift-down có thể `O(log n)`.

*Đối chiếu: Jain, chương 6; Drozdek, chương 9; Lê Minh Hoàng, phần 2 §8.*

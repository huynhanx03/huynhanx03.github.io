---
title: "Đọc và tính độ phức tạp thuật toán"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/complexity"
translationPending: true
series: "DSA cơ bản"
seriesOrder: 2
tags: ["big-o", "complexity", "amortized-analysis", "go"]
description: "Hiểu O, Ω, Θ, chọn đúng kích thước đầu vào, đếm vòng lặp và phân biệt worst-case với amortized."
draft: false
---

Khi nói một thuật toán chạy trong `O(n)`, ta không nói nó mất đúng `n` mili giây. Ta nói **chi phí tăng theo kích thước đầu vào** không nhanh hơn một hàm tuyến tính, sau khi bỏ qua hệ số hằng và những giá trị `n` quá nhỏ. Ký hiệu tiệm cận giúp so sánh thuật toán khi quy mô thay đổi; nó không thay thế việc đo hiệu năng thật của một chương trình.

## 1. Xác định `n` trước khi đếm

Với một slice, `n` thường là `len(values)`. Với ma trận `rows × cols`, hai tham số `r` và `c` có thể độc lập; viết `O(r × c)` rõ hơn ép cả hai thành `n`. Với đồ thị, dùng `V` đỉnh và `E` cạnh. Với số nguyên `x`, vòng lặp chia `x` cho 2 có số bước theo **số bit** của `x`, tức `O(log x)`, chứ không nhất thiết theo số phần tử của một mảng nào đó.

Chọn sai kích thước đầu vào làm một phép phân tích đúng về đại số nhưng vô ích về kỹ thuật. Trước mỗi công thức, hãy viết câu “n là ...”.

## 2. O, Ω và Θ nói ba điều khác nhau

Với hàm chi phí `T(n)` và hàm mốc `g(n)` không âm khi `n` đủ lớn:

- `T(n) = O(g(n))` nghĩa có hằng số `C, n₀` sao cho `T(n) ≤ Cg(n)` với mọi `n ≥ n₀`: **cận trên**.
- `T(n) = Ω(g(n))` nghĩa có `c, n₀` sao cho `T(n) ≥ cg(n)` khi `n ≥ n₀`: **cận dưới**.
- `T(n) = Θ(g(n))` nghĩa cùng lúc có hai cận trên và dưới theo `g(n)`: **cận chặt**.

Nếu một vòng lặp thực hiện `3n² + 5n + 7` phép cơ bản, nó thuộc `Θ(n²)`. Viết `O(n³)` vẫn đúng về mặt cận trên, nhưng kém chính xác. Cũng cần tách **cận của một thuật toán cụ thể** khỏi **cận dưới của cả bài toán**: tìm phần tử lớn nhất bằng cách quét dãy là `Θ(n)`; trong mô hình so sánh, mọi thuật toán đúng cũng phải xem tất cả phần tử ở trường hợp xấu nhất.

## 3. Trường hợp nào đang được đo?

Tìm tuyến tính một giá trị trong dãy độ dài `n` có best-case `Θ(1)` nếu nó nằm ngay đầu, worst-case `Θ(n)` nếu nằm cuối hoặc không có. Average-case cần một **giả định về phân bố đầu vào**; không có phân bố thì câu “trung bình O(n/2)” chỉ là trực giác, không phải kết luận có nghĩa đầy đủ. Thường ta báo worst-case trước vì đó là cam kết an toàn; với cấu trúc băm, có thể báo thêm expected hoặc amortized để mô tả thực tế.

## 4. Đếm từ cấu trúc vòng lặp

Các quy tắc sau là điểm bắt đầu, không phải công thức áp dụng mù quáng:

```go
for i := 0; i < n; i++ {       // n lần
    use(i)                     // giả sử use là O(1)
}
// Θ(n)

for i := 0; i < n; i++ {
    for j := 0; j < n; j++ {
        use(i, j)
    }
}
// Θ(n²)

for x := n; x > 1; x /= 2 {
    use(x)
}
// Θ(log n) với n > 1
```

Hai đoạn chạy **nối tiếp** có chi phí `T₁(n) + T₂(n)`; khi chỉ cần bậc tăng trưởng, ta giữ hạng chi phối. Hai vòng **lồng nhau** không phải lúc nào cũng là `n²`: nếu vòng trong đi từ `0` đến `i-1`, tổng số lượt là `0 + 1 + ... + (n-1) = n(n-1)/2`, vẫn là `Θ(n²)`; nhưng nếu mỗi con trỏ trong một thuật toán hai con trỏ chỉ tăng tối đa `n` lần trên toàn bộ hàm, tổng có thể là `Θ(n)` dù nhìn code thấy vòng lặp lồng nhau.

Với chia để trị, viết truy hồi trước. Merge sort có `T(n) = 2T(n/2) + Θ(n)`: hai lời gọi trên nửa dãy và một lần trộn tuyến tính, dẫn tới `Θ(n log n)`. Đệ quy tuyến tính `T(n) = T(n-1) + Θ(1)` là `Θ(n)`. Bài chia để trị ở topic nâng cao sẽ giải thích cây đệ quy và khi nào dùng Master theorem.

## 5. Amortized không phải average-case

Khi slice Go cần tăng capacity, `append` đôi khi phải cấp phát vùng mới và sao chép nhiều phần tử: **một lần append** có thể tốn `O(n)`. Nhưng nếu capacity tăng theo hệ số lớn hơn 1, tổng lượng phần tử được sao chép qua một dãy `n` lần append là tuyến tính theo `n`; vì thế chi phí **amortized** cho mỗi append là `O(1)` dưới mô hình tăng trưởng đó. Đây là bảo đảm trên một *chuỗi thao tác*, không cần giả định đầu vào được chọn ngẫu nhiên.

Lưu ý Go không hứa một hệ số tăng capacity cố định cho mọi phiên bản và kích thước. Vì vậy không nên dựa vào con số nhân đôi cụ thể trong chứng minh về triển khai Go. Nếu biết trước số phần tử, `make([]T, 0, n)` tránh nhiều lần cấp phát và cho ý định rõ ràng hơn.

## 6. Bộ nhớ phụ và bộ nhớ của kết quả

Một hàm tính tổng dãy dùng vài biến có **bộ nhớ phụ** `O(1)`. Nếu trả một bản sao của dãy, kết quả chiếm `O(n)` dù thuật toán nội bộ chỉ dùng vài biến. Đệ quy sâu `n` tầng dùng `O(n)` stack frame, kể cả khi mỗi frame chỉ có `O(1)` biến. Với merge sort, vùng trộn thường cần `O(n)` bộ nhớ phụ; với quicksort, bộ nhớ stack phụ thuộc cách chọn pivot và trường hợp đầu vào.

Khi so sánh giải pháp, ghi rõ “thời gian”, “bộ nhớ phụ” và “có sửa input không”. Ba điều này thường quan trọng hơn một nhãn `O(...)` đứng một mình.

## 7. Bảng ghi nhớ và tự luyện

| Bậc | Nếu `n` tăng gấp đôi | Ví dụ thường gặp |
| --- | --- | --- |
| `O(1)` | gần như không đổi | truy cập slice theo chỉ số |
| `O(log n)` | thêm một số bước cố định | tìm kiếm nhị phân |
| `O(n)` | gần gấp đôi | quét một dãy |
| `O(n log n)` | hơn gấp đôi một chút | merge sort |
| `O(n²)` | gần gấp bốn | so sánh mọi cặp |
| `O(2ⁿ)` | tăng rất nhanh | duyệt mọi tập con |

**Tự luyện:** (1) Đếm số lần chạy của vòng `for i := 1; i < n; i *= 3`. (2) Một hàm duyệt `r` hàng và `c` cột có độ phức tạp gì? (3) Một thao tác thêm vào dynamic array thỉnh thoảng sao chép `n` phần tử: vì sao không thể gọi mỗi thao tác là worst-case `O(1)`? (4) Phân biệt thời gian của thuật toán với tốc độ thực tế khi hai cách đều `O(n)` nhưng một cách truy cập bộ nhớ liên tục hơn.

*Đọc thêm trong bộ sách: Hemant Jain, chương 2; Adam Drozdek, chương 2; Lê Minh Hoàng, phần 2 §2.*

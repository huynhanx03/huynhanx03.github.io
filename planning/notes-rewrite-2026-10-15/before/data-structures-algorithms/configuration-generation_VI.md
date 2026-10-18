---
title: "Sinh cấu hình có thứ tự: dãy bit, tập con và hoán vị"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/configuration-generation"
translationPending: true
series: "DSA cơ bản"
seriesOrder: 13
tags: ["enumeration", "subsets", "permutations", "combinatorics"]
description: "Liệt kê hết nghiệm theo thứ tự xác định và hiểu chi phí không thể tránh của số lượng đầu ra."
draft: false
---

Sinh cấu hình là liệt kê mọi đối tượng hợp lệ đúng một lần, thường theo thứ tự từ điển. Cần nói rõ **biểu diễn**, **cấu hình đầu**, **quy tắc kế tiếp** và **điều kiện dừng**. Khi có `2^n` tập con hay `n!` hoán vị, thuật toán không thể chạy nhanh hơn số đầu ra cần in; chi phí mũ hoặc giai thừa đôi khi là bản chất bài toán.

## 1. Dãy bit và tập con

Dãy bit độ dài `n` có `2^n` cấu hình. Xem bit như số nhị phân từ `0` đến `2^n-1` tạo thứ tự rõ ràng; với `n` lớn hơn độ rộng kiểu máy, dùng slice bit và thuật toán “cộng một”: tìm bit `0` cuối cùng, đổi nó thành `1`, đặt mọi bit sau nó thành `0`. Khi tất cả bit là `1`, đã hết. Mỗi lần tạo bản in dài `n` tốn `O(n)`, nên in toàn bộ tốn `Θ(n2^n)` ký tự/thao tác sao chép.



Một tập con của `{0,...,n-1}` tương ứng duy nhất với dãy bit: bit `i=1` nghĩa là lấy phần tử `i`. Nếu phần tử nguồn có giá trị trùng nhau, hai tập **chỉ số** khác nhau có thể cho cùng tập giá trị; cần quyết định bài toán muốn liệt kê theo chỉ số hay loại bản sao theo giá trị.

```go
func VisitSubsets(n int, visit func([]int)) {
    chosen := make([]int, 0, n)
    var walk func(int)
    walk = func(i int) {
        if i == n {
            visit(append([]int(nil), chosen...))
            return
        }
        walk(i + 1) // không lấy i
        chosen = append(chosen, i)
        walk(i + 1) // lấy i
        chosen = chosen[:len(chosen)-1]
    }
    walk(0)
}
```

Bất biến: trước `walk(i)`, `chosen` mô tả quyết định cho các vị trí `<i`. `append` bản sao trước callback để callback không giữ một view sẽ bị sửa ở các nhánh sau. Trường hợp `n=0` có đúng một tập con rỗng.



```note-visualization
{"id":"binary-configurations","preset":"normal"}
```

## 2. Hoán vị và thứ tự từ điển

Với `n` phần tử phân biệt, có `n!` hoán vị. Từ một hoán vị hiện tại, để tìm hoán vị kế tiếp theo từ điển: tìm từ phải sang trái chỉ số `i` đầu tiên có `a[i]<a[i+1]`; tìm phần tử nhỏ nhất bên phải lớn hơn `a[i]` (trong hậu tố đang giảm, quét từ phải là đủ); đổi hai phần tử; đảo ngược hậu tố sau `i` để được hậu tố nhỏ nhất. Nếu không tìm thấy `i`, đây là hoán vị cuối cùng. Bất biến quan trọng là hậu tố ban đầu đang giảm nên không thể tăng cấu hình chỉ bằng thay đổi trong hậu tố ấy.



Muốn liệt kê tổ hợp chọn `k` trong `n`, có `C(n,k)` cấu hình. Lưu chỉ số tăng `c[0]<...<c[k-1]`; tìm từ phải phần tử còn tăng được, tăng nó và đặt phần sau về các giá trị nhỏ nhất kế tiếp. Đây là cách sinh không tạo các cấu hình trùng rồi lọc.



```note-visualization
{"id":"next-permutation","preset":"normal"}
```

**Tự luyện:** (1) Liệt kê dãy bit độ dài 3. (2) Tìm hoán vị kế tiếp của `[1,3,2]` và `[3,2,1]`. (3) Phân biệt tập con của ba **vị trí** chứa `[a,a,b]` với tập giá trị duy nhất.

*Đối chiếu: Lê Minh Hoàng, phần 1 §1–2.*

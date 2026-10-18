---
title: "Manacher: tìm các đoạn đối xứng quanh mọi tâm trong O(n)"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/manacher"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 30
tags: ["string", "palindrome", "manacher"]
description: "Dùng tính đối xứng của đoạn lớn nhất hiện có để tránh mở rộng lại từng tâm."
draft: false
---

Một palindrome đọc xuôi và ngược giống nhau: `racecar`, `abba`. Cách thử mở rộng quanh mỗi tâm đơn giản nhưng tệ nhất `O(n²)` trên chuỗi toàn một ký tự. Manacher vẫn xét từng tâm, nhưng tận dụng đoạn palindrome vươn xa nhất đã biết để khởi tạo bán kính, rồi chỉ so ký tự **bên ngoài** đoạn đó.

## 1. Tâm lẻ và tâm chẵn

Với độ dài lẻ, `odd[i]` là số cặp mở rộng cộng ký tự tâm: palindrome là `s[i-odd[i]+1 : i+odd[i]]`. Với độ dài chẵn, `even[i]` là số cặp quanh khe giữa `i-1` và `i`, đoạn là `s[i-even[i] : i+even[i]]`. Ví dụ `abba` có `even[2]=2`; `aba` có `odd[1]=2`. Hai bảng tránh phải chèn ký tự phân cách vào chuỗi.





Đối với bảng lẻ, giữ đoạn palindrome đã biết có biên phải xa nhất `[l,r]` (biên **đóng**). Nếu `i<=r`, tâm đối xứng của `i` qua trung điểm là `mirror=l+r-i`; lấy bán kính ban đầu `min(odd[mirror], r-i+1)`. Sau đó mở rộng bằng so `s[i-k]==s[i+k]` khi hai chỉ số hợp lệ. Nếu palindrome mới vươn xa hơn `r`, cập nhật `l=i-k+1`, `r=i+k-1`. Bảng chẵn làm tương tự nhưng tâm nằm giữa hai ký tự, nên công thức mirror và biên lệch một; không nên copy nguyên công thức lẻ sang chẵn.



```note-visualization
{"id":"manacher-odd","preset":"normal"}
```



```note-visualization
{"id":"manacher-even","preset":"normal"}
```

## 2. Cài đặt cả hai loại tâm trong Go

```go
func PalindromeRadii(s []rune) (odd, even []int) {
    n := len(s)
    odd, even = make([]int, n), make([]int, n)
    l, r := 0, -1 // đoạn lẻ đã biết xa nhất, biên đóng
    for i := 0; i < n; i++ {
        k := 1
        if i <= r {
            k = odd[l+r-i]
            if k > r-i+1 { k = r-i+1 }
        }
        for i-k >= 0 && i+k < n && s[i-k] == s[i+k] { k++ }
        odd[i] = k
        if i+k-1 > r { l, r = i-k+1, i+k-1 }
    }
    l, r = 0, -1 // đoạn chẵn đã biết xa nhất
    for i := 0; i < n; i++ {
        k := 0
        if i <= r {
            k = even[l+r-i+1]
            if k > r-i+1 { k = r-i+1 }
        }
        for i-k-1 >= 0 && i+k < n && s[i-k-1] == s[i+k] { k++ }
        even[i] = k
        if i+k-1 > r { l, r = i-k, i+k-1 }
    }
    return odd, even
}
```

Với `[]rune("abba")`, kết quả là `odd=[1,1,1,1]` và `even=[0,0,2,0]`. Tâm chẵn ở `i=2` nằm **giữa** hai chữ `b`; bán kính 2 phủ đoạn `[0,4)`. Với `[]rune("aaa")`, `odd=[1,2,1]`, `even=[0,1,1]`; tổng bán kính là 6, đúng bằng sáu đoạn palindrome không rỗng. Hai ví dụ này bắt được lỗi lệch một thường xảy ra khi dùng chung công thức cho tâm lẻ và chẵn.

## 3. Vì sao tuyến tính?

Mỗi tâm có thể dùng kết quả đối xứng để bỏ qua phần bên trong đoạn đã biết. Những lần so thành công vượt qua biên phải làm biên phải tăng, mà biên này tăng tối đa `n` lần. Mỗi tâm chỉ có tối đa một lần so thất bại dừng mở rộng. Tổng thời gian `O(n)`, bộ nhớ `O(n)`.

Từ hai bảng, palindrome dài nhất có độ dài `max(2*odd[i]-1, 2*even[i])`. Muốn đếm tất cả đoạn palindrome, tổng `sum(odd[i]+even[i])` vì mỗi bán kính `k` ứng với một đoạn khác nhau. Nếu chỉ cần kiểm tra một đoạn `[l,r)` có đối xứng, xác định tâm và so độ dài với bán kính tương ứng.

Đoạn code/định nghĩa ở đây hiểu chuỗi như dãy ký hiệu. Với tiếng Việt UTF-8, `string` Go là dãy byte: đảo byte có thể cắt đôi ký tự. Hãy chuyển sang `[]rune` nếu muốn palindrome theo code point; nếu yêu cầu theo ký tự hiển thị, còn cần phân đoạn grapheme và chuẩn hóa.

**Tự luyện:** (1) Tính `odd` và `even` cho `abba`. (2) Vì sao `aaaa` làm cách mở rộng ngây thơ tốn `O(n²)`? (3) Từ bán kính, đếm số palindrome của `aaa`.

*Đọc thêm: [VNOI — Manacher](https://wiki.vnoi.info/algo/string/manacher).*

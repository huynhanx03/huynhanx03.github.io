---
title: "Manacher: tìm các đoạn đối xứng quanh mọi tâm trong O(n)"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/manacher"
series: "DSA nâng cao"
seriesOrder: 30
tags: ["string", "palindrome", "manacher"]
description: "Dùng tính đối xứng của đoạn lớn nhất hiện có để tránh mở rộng lại từng tâm."
draft: false
updated: 2026-10-15
---

Với chuỗi toàn chữ a, mở rộng quanh một tâm có thể đi gần tới hai đầu. Lặp lại từ tâm kế bên sẽ so lại phần lớn những cặp vừa biết. Tổng công việc có thể O(n²), dù câu hỏi chỉ là palindrome dài nhất ở mỗi tâm.

Manacher dùng đối xứng của một palindrome đã biết để tránh phần so lại ấy. Ta vẫn xét từng tâm, nhưng chỉ mở rộng mới khi đi tới biên của vùng chưa được chứng minh. Bài này dùng hai bảng cho tâm lẻ/chẵn, không cần chèn separator vào dữ liệu.

## Bán kính cần một quy ước rõ trước khi viết index

Với tâm lẻ i, `odd[i]=k` nghĩa là palindrome lớn nhất ở tâm ấy là đoạn nửa mở `[i−k+1,i+k)`, dài 2k−1. Ký tự tâm tự tạo palindrome dài 1 nên bán kính khởi đầu là 1. Với aba, odd[1]=2 phủ [0,3).

Với tâm chẵn i, tâm nằm **giữa i−1 và i**, `even[i]=k` phủ `[i−k,i+k)`, dài 2k. Không có cặp nào vẫn hợp lệ với k=0. Với abba, even[2]=2 phủ cả bốn ký tự; đừng đặt tâm này vào riêng một chữ b.

```note-visualization
{"id":"manacher-odd","preset":"normal"}
```

```note-visualization
{"id":"manacher-even","preset":"normal"}
```

Hai bảng tránh tranh luận về một ký tự separator có xuất hiện trong input hay không, đổi lại cần giữ chính xác hai công thức index. Chúng đo cùng tính đối xứng nhưng khác vị trí tâm.

## Dùng palindrome xa nhất bên phải làm vùng đã biết

Đối với tâm lẻ, giữ [l,r] là palindrome đã tìm có biên phải xa nhất, ở đây r là **biên đóng**. Nếu i nằm bên trong, tâm đối xứng của i là `mirror=l+r−i`. Những cặp nằm trọn trong [l,r] phản chiếu sang nhau, nên khởi tạo `min(odd[mirror],r−i+1)`.

Nếu bán kính phản chiếu nhỏ hơn khoảng tới r, chỗ không khớp của tâm mirror cũng phản chiếu sang i, nên ta đã có trọn đáp án. Nếu bán kính chạm biên, ta mới chỉ biết phần trong [l,r], cần so thêm ngoài vùng ấy. Không thể copy nguyên bán kính mirror ra ngoài biên.

Tâm chẵn dùng cùng lập luận, nhưng tâm là khe nên mirror đổi thành `l+r−i+1`. Đoạn khi cập nhật cũng đổi từ `[i−k+1,i+k−1]` ở lẻ sang `[i−k,i+k−1]` ở chẵn. Đây là nguyên nhân lệch một nếu sao chép công thức mà chưa vẽ vị trí hai tâm.

## Cài đặt hai lượt độc lập

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

Hàm Go nhận []rune, không cần import. Trước mỗi lượt, [l,r]=[0,−1] là vùng rỗng; chỉ dùng mirror khi i≤r. Sau mở rộng, k đã là bán kính tối đa theo quy ước bảng, nên cập nhật biên theo k mà không trừ thêm một lần vào odd/even. Chuỗi rỗng trả hai slice rỗng.

Theo abba, mọi tâm lẻ chỉ chứa chính ký tự tâm nên odd=[1,1,1,1]. Với even[2], so b=b được k=1, tiếp theo a=a được k=2, rồi ra ngoài; even=[0,0,2,0]. Ở bước sau, đối xứng được dùng trong vùng [0,3] nhưng không tạo palindrome chẵn mới ở khe cuối.

Với aaa, odd=[1,2,1], even=[0,1,1]. Có ba palindrome một ký tự, hai đoạn aa và một đoạn aaa. Tổng bán kính 1+2+1+0+1+1=6 ghi đúng sáu đoạn; hai đoạn cùng nội dung nhưng ở vị trí khác vẫn là hai lần xuất hiện.

## Tại sao chỉ còn O(n) phép so?

Những so sánh chắc chắn ở bên trong palindrome đã biết được thay bằng kết quả mirror. Nếu bán kính mirror kết thúc trước biên, chỉ cần tối đa một lần sai để dừng. Nếu chạm biên, mỗi so thành công mới đẩy biên phải xa hơn; biên ấy không lùi và chỉ đi qua n ký hiệu. Cộng tối đa một so thất bại cho mỗi tâm, toàn bộ một lượt O(n), hai lượt vẫn O(n).

Mảng kết quả dùng O(n) bộ nhớ. Thuật toán có thể chứa while trong for mà vẫn tuyến tính vì tổng mở rộng mới bị chặn; không được đánh giá chỉ bằng hình dạng các vòng lặp.

## Từ bán kính trả lời những câu hỏi nào?

Palindrome dài nhất có độ dài lớn nhất trong `2odd[i]−1` và `2even[i]`; công thức đoạn ở đầu bài cho vị trí. Để đếm mọi đoạn palindrome không rỗng, cộng tất cả odd[i]+even[i]: tâm bán kính k có đúng k palindrome nhỏ hơn lồng vào nó. Tổng có thể Θ(n²) nên kiểu lưu số đếm phải đủ rộng dù mảng chỉ O(n).

Để kiểm tra [l,r), lấy d=r−l. Nếu d lẻ, tâm `(l+r−1)/2`, cần odd tại đó ≥(d+1)/2. Nếu d chẵn, tâm khe `(l+r)/2`, cần even≥d/2. Đoạn rỗng nên xử lý theo quy ước API trước, tránh dùng tâm không tồn tại.

[]rune đo code point Unicode. Chuỗi tiếng Việt có thể có ký tự dựng sẵn hoặc tổ hợp; nếu yêu cầu palindrome theo ký tự hiển thị, còn cần chuẩn hóa và phân đoạn grapheme. Đảo/so byte của UTF-8 giải một bài khác và có thể cắt giữa ký tự; lựa chọn ký hiệu phải theo yêu cầu đầu vào.

## Tự thử

1. Viết odd/even của abba và chỉ ra index tâm palindrome dài 4.
2. Vì sao aaaa làm mở rộng ngây thơ tốn bậc hai mà Manacher vẫn tuyến tính?
3. Đếm số palindrome trong aaa bằng bảng bán kính; đếm nội dung khác nhau có cùng kết quả không?

**Đối chiếu:** (1) odd=[1,1,1,1], even=[0,0,2,0], tâm khe i=2. (2) Cách ngây thơ so lại các vùng lồng nhau; Manacher chép phần trong vùng đã biết, chỉ tính mới khi biên phải tăng. (3) Có sáu đoạn theo vị trí, nhưng chỉ ba nội dung a,aa,aaa. Bài đếm substring khác nhau cần công cụ/lập luận khác.

## Tài liệu

[Manacher — A New Linear-Time “On-Line” Algorithm for Finding the Smallest Initial Palindrome of a String](https://dl.acm.org/doi/10.1145/321892.321896) là công trình gốc về palindrome tuyến tính; [VNOI — Manacher](https://wiki.vnoi.info/algo/string/manacher) có cách trình bày phục vụ luyện thuật toán.

---
title: "So khớp chuỗi: KMP và Boyer–Moore"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/string-matching"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 19
tags: ["string-matching", "kmp", "boyer-moore", "prefix-function"]
description: "Từ so khớp ngây thơ đến tái dùng phần tiền tố đã biết và dịch mẫu theo thông tin sai khớp."
draft: false
---

Cho văn bản dài `n` và mẫu dài `m`, ta muốn tìm mọi vị trí bắt đầu nơi mẫu xuất hiện. Cách ngây thơ thử mẫu tại từng vị trí, so từ đầu, tệ nhất `O(nm)` khi có nhiều tiền tố giống nhau. KMP tránh so lại các ký tự đã được suy ra từ một lần khớp trước; Boyer–Moore so từ phải của mẫu và có thể nhảy qua nhiều vị trí khi sai khớp.

## 1. Prefix function của KMP

Với mỗi vị trí `i` trong mẫu `p`, `pi[i]` là độ dài tiền tố **thật sự** dài nhất của `p[:i+1]` đồng thời là hậu tố của đoạn ấy. Ví dụ `p="ababaca"` có `pi=[0,0,1,2,3,0,1]`. Khi đang có `j` ký tự mẫu khớp mà ký tự tiếp theo sai, không cần thử lại từ đầu: đặt `j=pi[j-1]`, tức giữ tiền tố dài nhất vẫn có thể là hậu tố của đoạn đã khớp. Lặp tới khi có thể khớp hoặc `j=0`.





```go
func Prefix(p []byte) []int {
    pi := make([]int, len(p))
    for i := 1; i < len(p); i++ {
        j := pi[i-1]
        for j > 0 && p[i] != p[j] { j = pi[j-1] }
        if p[i] == p[j] { j++ }
        pi[i] = j
    }
    return pi
}
```

Bất biến: trước khi đọc `p[i]`, `j` là độ dài border tốt nhất của `p[:i]`; mỗi lần fallback chọn border ngắn hơn đúng theo `pi`. Trong bước tìm trên văn bản, duy trì `j` bằng vòng fallback tương tự; khi `j==m`, ghi vị trí `i-m+1`, rồi `j=pi[j-1]` để phát hiện cả các lần xuất hiện **chồng lấn**. Xây `pi` `O(m)`, quét văn bản `O(n)`, bộ nhớ `O(m)`. Ví dụ mẫu `aa` trong `aaa` xuất hiện ở vị trí 0 và 1. Trường hợp mẫu rỗng cần quy ước API riêng trước khi truy cập `p[0]`.



```note-visualization
{"id":"prefix-function","preset":"normal"}
```



```note-visualization
{"id":"kmp-search","preset":"normal"}
```

## 2. Boyer–Moore

Boyer–Moore đặt mẫu dưới văn bản và so từ phải sang trái. Heuristic **bad character** dịch mẫu để ký tự văn bản gây sai khớp thẳng với lần xuất hiện phù hợp gần nhất của nó trong mẫu (hoặc vượt qua nếu không có). Heuristic **good suffix** dùng đoạn cuối đã khớp để dịch tới một đoạn tương ứng khác hoặc tiền tố thích hợp. Dùng cả hai thường nhảy xa trên văn bản tự nhiên, nhưng việc cài bảng good-suffix đúng đòi hỏi xử lý biên cẩn thận. Biến thể chỉ dùng bad character không mang cùng bảo đảm tệ nhất của bản Boyer–Moore đầy đủ.



Chọn đơn vị ký tự nhất quán: code trên làm việc theo **byte** UTF-8 và trả vị trí byte. Nếu yêu cầu vị trí theo rune hoặc grapheme, cần chuyển đổi và chấp nhận chi phí/bộ nhớ khác. Chuẩn hóa Unicode cũng có thể cần nếu hai cách mã hóa cùng hiển thị phải khớp.



```note-visualization
{"id":"boyer-moore","preset":"normal"}
```

**Tự luyện:** (1) Tự tính `pi` cho `aabaaab`. (2) Mô phỏng KMP tìm `aba` trong `ababa`. (3) Giải thích vì sao chỉ “dịch 1 khi sai” không tận dụng thông tin mẫu.

*Đối chiếu: Jain, chương 14; Drozdek, chương 13.*

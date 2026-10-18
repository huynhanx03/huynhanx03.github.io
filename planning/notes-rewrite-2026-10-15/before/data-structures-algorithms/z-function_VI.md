---
title: "Z-function: mỗi vị trí khớp với đầu chuỗi bao xa?"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/z-function"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 29
tags: ["string", "z-function", "pattern-matching"]
description: "Tính Z-array tuyến tính nhờ đoạn khớp đã biết và ứng dụng tìm mọi lần xuất hiện của mẫu."
draft: false
---

`Z[i]` là số ký tự đầu tiên của `s` trùng với đoạn bắt đầu ở `i`. Với `s="aaaa"`, `Z=[0,3,2,1]` nếu ta quy ước `Z[0]=0`. Câu hỏi này có vẻ cần so từ đầu ở mọi `i`, tệ nhất `O(n²)`. Bí quyết là giữ một đoạn `[l,r)` đã biết khớp với tiền tố; khi `i<r`, một phần kết quả của `i` đã có thể suy ra từ vị trí tương ứng `i-l` trong tiền tố.

```go
func ZFunction(s string) []int {
    z := make([]int, len(s))
    l, r := 0, 0
    for i := 1; i < len(s); i++ {
        if i < r {
            z[i] = z[i-l]
            if z[i] > r-i { z[i] = r-i }
        }
        for i+z[i] < len(s) && s[z[i]] == s[i+z[i]] { z[i]++ }
        if i+z[i] > r { l, r = i, i+z[i] }
    }
    return z
}
```

Bất biến: `[l,r)` là đoạn khớp tiền tố vươn xa nhất đã tìm thấy. Nếu `i` nằm trong đoạn, `z[i-l]` cho số ký tự đã biết bên trong hộp nhưng không thể khẳng định gì vượt qua `r`; do đó lấy min với `r-i`, rồi so thêm từ `r`. Mỗi lần vòng `for` so thêm thành công, `r` chỉ tăng về phải; tổng số lần mở rộng là `O(n)`, nên toàn bộ thuật toán `O(n)` thời gian, `O(n)` bộ nhớ. Nếu `s` là UTF-8, code so **byte** và chỉ số trả về là byte offset.

Với `s="ababa"`, ta có `Z=[0,0,3,0,1]`: tại `i=2`, đoạn `aba` khớp tiền tố và tạo hộp `[2,5)`; tại `i=4`, chỉ một ký tự `a` còn nằm trong hộp, nên kết quả là 1 mà không cần so lại cả tiền tố. Để tự kiểm tra thuật toán, luôn xét ba ca: `i` ngoài hộp; `i` trong hộp và `Z[i-l]<r-i`; `i` trong hộp nhưng khớp chạm biên `r` nên cần so thêm. Ca cuối là nơi nhiều cách cài bị thiếu vòng mở rộng.



```note-visualization
{"id":"z-box","preset":"normal"}
```

## 2. Tìm mẫu

Ghép `pattern + delimiter + text`, với delimiter không xuất hiện trong cả hai, rồi tính Z. Ở vị trí thuộc `text`, nếu `Z[i]>=len(pattern)` thì có một lần xuất hiện. Nếu không có ký tự delimiter chắc chắn khác (ví dụ dữ liệu byte tùy ý), có thể tính trên một dãy số nguyên với sentinel ngoài miền byte, hoặc so mẫu và văn bản bằng cách cài đặt riêng. Mẫu rỗng cần định nghĩa kết quả riêng.





Z và KMP đều cho tìm mẫu `O(n+m)` nhưng bảng thông tin khác: KMP lưu border của **tiền tố kết thúc tại i**, Z lưu khớp với tiền tố **bắt đầu tại i**. Z đặc biệt tiện cho bài có câu hỏi “đoạn từ i khớp đầu chuỗi bao nhiêu?” như phát hiện chu kỳ hoặc tiền tố xuất hiện lại.



```note-visualization
{"id":"z-pattern","preset":"normal"}
```

**Tự luyện:** (1) Tính Z của `ababa`. (2) Chỉ ra `[l,r)` thay đổi thế nào khi xử lý `aaaa`. (3) Tìm `aba` trong `ababa` bằng chuỗi ghép và ghi vị trí trong văn bản.

*Đọc thêm: [VNOI — Z-function](https://wiki.vnoi.info/algo/string/z-algo).*

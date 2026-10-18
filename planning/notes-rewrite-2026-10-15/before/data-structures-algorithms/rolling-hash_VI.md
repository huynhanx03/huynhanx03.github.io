---
title: "Rolling hash: so sánh đoạn chuỗi bằng dấu vân tay"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/rolling-hash"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 28
tags: ["string", "rolling-hash", "rabin-karp", "collision"]
description: "Hash đa thức, tổng tiền tố, truy vấn đoạn O(1) và cách xử lý va chạm."
draft: false
---

Nếu phải so rất nhiều cặp đoạn của cùng một chuỗi, so từng ký tự tốn `O(length)` mỗi lần. Rolling hash gán một số cho mỗi đoạn để **lọc nhanh khả năng bằng nhau**. Nó giống dấu vân tay: hai đoạn bằng nhau chắc chắn cùng hash; hai đoạn khác nhau **có thể** trùng hash. Vì vậy hash không phải bằng chứng tuyệt đối khi bài toán yêu cầu đúng 100%.

## 1. Hash đa thức và công thức đoạn

Chọn cơ số `B`, modulus nguyên tố `M`, biểu diễn byte `s[i]` thành số dương. Đặt `H[0]=0`, `H[i+1]=(H[i]*B+value(s[i])) mod M`, và `P[i]=B^i mod M`. Với đoạn nửa mở `[l,r)`, hash chuẩn hóa là `(H[r]-H[l]*P[r-l]) mod M`. Ta tiền xử lý `O(n)` thời gian/bộ nhớ rồi lấy hash một đoạn trong `O(1)`. Dấu âm sau phép trừ phải được cộng `M` rồi mod lại trước khi so.





```go
func SliceHash(prefix, power []int64, l, r int, mod int64) int64 {
    x := (prefix[r] - prefix[l]*power[r-l]) % mod
    if x < 0 { x += mod }
    return x
}
```

Hàm giả sử `0<=l<=r<len(prefix)` và phép nhân `int64` không tràn; với modulus gần giới hạn `int64`, cần phép nhân modulo an toàn. Vì byte UTF-8 không tương ứng một ký tự hiển thị, vị trí `l,r` ở đây là **byte offset**. Nếu cần rune, hãy chuyển chuỗi thành `[]rune` và hash dãy rune thống nhất.



```note-visualization
{"id":"hash-prefix","preset":"normal"}
```



```note-visualization
{"id":"hash-substring","preset":"normal"}
```

## 2. Cửa sổ trượt và tìm mẫu

Hash mẫu độ dài `m`, lấy hash của từng đoạn văn bản dài `m`; đoạn có hash bằng nhau là ứng viên. Với công thức prefix, có `n-m+1` ứng viên và chi phí `O(n+m)` kỳ vọng nếu chỉ so hash. Nếu cần kết quả chắc chắn, so lại ký tự ở mỗi ứng viên; trường hợp xấu có thể `O(nm)` nếu hash va chạm nhiều. Có thể dùng hai modulus độc lập để làm xác suất va chạm cực nhỏ, nhưng vẫn không phải chứng minh tuyệt đối.



Chọn `B=1` là sai lầm rõ: nhiều chuỗi hoán vị có cùng tổng. Modulus nhỏ cũng tạo nhiều va chạm. Với đầu vào có thể do đối thủ kiểm soát, dùng cơ số ngẫu nhiên tại runtime hoặc thuật toán khớp chính xác như KMP/Z khi có thể. Trong hệ thống thật, đừng dùng rolling hash này làm **cryptographic hash** cho bảo mật; yêu cầu chống giả mạo khác hoàn toàn.



```note-visualization
{"id":"hash-window","preset":"normal"}
```

## 3. Bài toán phù hợp

Tìm đoạn lặp, kiểm tra hai đoạn có thể bằng nhau, hoặc binary search độ dài chung lớn nhất của hai suffix đều dùng hash đoạn. Điều kiện đơn điệu trong binary search là “tồn tại đoạn chung độ dài `k`” thì mọi độ dài ngắn hơn cũng tồn tại. Để tránh xây set lưu chuỗi dài, ta lưu hash nhưng vẫn cân nhắc va chạm.

**Tự luyện:** (1) Với `B=10`, `M=101`, tự tính hash của `abc` nếu `a=1,b=2,c=3`. (2) Chứng minh công thức `[l,r)` từ prefix. (3) Tìm hai chuỗi khác nhau trùng hash với một modulus rất nhỏ.

*Đọc thêm: [VNOI — Hash chuỗi](https://wiki.vnoi.info/algo/string/hash).*

---
title: "Rolling hash: so sánh đoạn chuỗi bằng dấu vân tay"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/rolling-hash"
series: "DSA nâng cao"
seriesOrder: 28
tags: ["string", "rolling-hash", "rabin-karp", "collision"]
description: "Hash đa thức, tổng tiền tố, truy vấn đoạn O(1) và cách xử lý va chạm."
draft: false
updated: 2026-10-15
---

Khi so hàng triệu cặp đoạn chuỗi, đọc lại từng ký tự có thể đắt hơn phần còn lại của thuật toán. Rolling hash thay mỗi đoạn bằng một số để lọc nhanh: hash khác thì chắc chắn khác; hash giống thì **có thể** giống. Hai chiều suy luận không đối xứng.

Ta sẽ xây một dấu vân tay đa thức cho dãy byte, suy ra công thức đoạn rồi xét cách dùng trong tìm mẫu. Mục tiêu là hiểu cả phần tiết kiệm thời gian lẫn phần rủi ro; rolling hash này không phải cryptographic hash cho bảo mật.

## Prefix hash giữ lại phép nhân theo vị trí

Chọn cơ số B và modulus M, thường là prime, cùng ánh xạ byte thành số dương. Đặt `H[0]=0`, `H[i+1]=(H[i]B+v_i) mod M`, và `P[k]=B^k mod M`. Ví dụ a=1,b=2,c=3,B=10,M=101: H cho `abc` lần lượt 0,1,12,22, vì 123 dư 22.

B khác 1 giúp phân biệt vai trò vị trí; nếu B=1 thì ab và ba cùng có tổng 3 ngay cả trước modulo. Tuy vậy, chọn B khác 1 không làm hash một-một: miền chuỗi lớn hơn số phần dư nên va chạm luôn có thể có.

```note-visualization
{"id":"hash-prefix","preset":"normal"}
```

Để lấy đoạn [l,r), H[r] chứa phần trước l đã được nhân `B^(r−l)` cùng phần đoạn cần lấy. Vì vậy trừ `H[l]P[r−l]` sẽ loại đúng phần trước:

`hash(l,r)=(H[r]−H[l]P[r−l]) mod M`.

Với đoạn bc của abc, lấy `22−1·100=−78`, chuẩn hóa modulo 101 thành 23, đúng giá trị đa thức 2·10+3. Độ dài hai đoạn so sánh cũng phải phù hợp; việc một đoạn ngắn có cùng hash với đoạn dài chưa cho phép bỏ qua thông tin độ dài.

```go
func SliceHash(prefix, power []int64, l, r int, mod int64) int64 {
    x := (prefix[r] - prefix[l]*power[r-l]) % mod
    if x < 0 { x += mod }
    return x
}
```

Hàm Go cần bảng prefix/power đã khởi tạo tới độ dài chuỗi, modulus dương, `0≤l≤r<len(prefix)` và phép nhân không tràn int64. Với các đại diện đã chuẩn hóa, phần dư sau phép trừ nằm trong miền có thể sửa bằng cộng mod một lần khi âm. Với modulus gần giới hạn kiểu, cần nhân modulo an toàn; `%mod` không cứu được tích đã tràn.

```note-visualization
{"id":"hash-substring","preset":"normal"}
```

Xây hai bảng O(n) thời gian/bộ nhớ, lấy một hash đoạn O(1) phép toán máy theo giả định ấy. Index ở đây là byte offset; nếu chọn rune, phải xây và truy vấn nhất quán trên dãy rune. Không trộn độ dài byte của mẫu với khoảng rune của văn bản.

## Dùng hash làm bộ lọc tìm mẫu

Với mẫu dài m, tính hash mẫu và hash từng cửa sổ văn bản dài m. Có n−m+1 cửa sổ nếu m≤n. Tiền xử lý và so dấu vân tay tốn O(n+m) phép toán theo mô hình số học hằng số; bản quét chỉ dùng prefix hash không cần một giả định kỳ vọng cho chính thời gian quét này.

Nhưng nếu nhận mọi cửa sổ cùng hash như một khớp, kết quả có thể sai. Muốn chắc chắn, so lại ký tự tại ứng viên. Khi va chạm hoặc nhiều lần khớp thật cần so đủ m ký tự, bản kiểm lại ngây thơ có thể O(nm) tệ nhất. Nếu m>n không có cửa sổ; mẫu rỗng cần quy ước API riêng trước xử lý.

```note-visualization
{"id":"hash-window","preset":"normal"}
```

Dùng hai hash với tham số được chọn thích hợp làm trùng đồng thời ít xảy ra hơn, nhưng không biến nó thành bằng chứng bằng nhau. Không được nhân hai xác suất va chạm rồi coi chúng độc lập chỉ vì đã dùng hai modulus; cần nói rõ nguồn ngẫu nhiên và cách chọn tham số. Đầu vào đối kháng biết tham số cố định có thể khai thác cấu trúc ấy. Randomize cơ số ở runtime hỗ trợ mô hình chống input cố định phù hợp, còn KMP/Z cung cấp tìm mẫu chính xác không có rủi ro hash.

## Tìm đoạn lặp và độ dài chung

Hash đoạn cũng giúp gom các đoạn có thể bằng nhau hoặc so hai suffix tới một độ dài thử. Để tìm longest common prefix của hai suffix, mệnh đề “hai tiền tố độ dài k bằng nhau” là đơn điệu: đúng ở k thì đúng ở mọi độ dài nhỏ hơn. Binary search hỏi O(log n) độ dài, mỗi hash query O(1); nếu coi trùng hash là bằng, đáp án vẫn mang rủi ro va chạm.

Với bài longest common substring giữa hai chuỗi, mệnh đề “tồn tại đoạn chung dài k” cũng đơn điệu. Có thể lưu hash các đoạn dài k của chuỗi thứ nhất vào set rồi tra chuỗi thứ hai. Đó là một thuật toán khác với so một cặp suffix; chi phí mỗi lần kiểm tra gồm quét các cửa sổ và thao tác set. Cần tính bộ nhớ, chi phí hash table và chiến lược xác minh nếu đòi đúng tuyệt đối.

Modulus nhỏ là cách thấy rủi ro bằng tay: với B=10,M=7 và a=1,b=2,c=3, hash ab=12 dư 5, còn ba=21 dư 0; nhưng aa=11 dư 4 và bc=23 dư 2. Không phải mọi cặp hoán vị đều trùng khi B≠1; phải thật sự tính một phản ví dụ. Chẳng hạn aa có hash 4, còn cb=32 dư 4, nên chúng va chạm dù cùng độ dài và khác nội dung.

## Tự thử rồi giải thích

1. Với B=10,M=101, hash abc là bao nhiêu và lấy hash bc bằng prefix thế nào?
2. Vì sao có thể trừ H[l]P[r−l] mà không cần chia cho lũy thừa B?
3. Với B=10,M=7, aa và cb có cùng hash không? Nếu đòi đúng tuyệt đối, xử lý ra sao?

**Đối chiếu:** (1) 22; `22−100≡23`. (2) Quy ước prefix đặt số mũ cao ở ký tự trái, nên phép trừ đã để đoạn cần lấy ở đúng thang số mũ. (3) 11 và 32 đều dư 4. So lại nội dung hoặc dùng thuật toán chính xác; thêm modulus giảm rủi ro chứ chưa chứng minh không có va chạm.

## Đọc tiếp

[Karp và Rabin — Efficient randomized pattern-matching algorithms](https://doi.org/10.1147/rd.312.0249) là nguồn gốc phương pháp fingerprint cho tìm mẫu. [KMP](/vi/notes/data-structures-algorithms/string-matching/) và [Z-function](/vi/notes/data-structures-algorithms/z-function/) là hai lựa chọn chính xác khi chỉ cần tìm một mẫu.

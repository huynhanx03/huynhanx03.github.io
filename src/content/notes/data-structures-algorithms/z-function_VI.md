---
title: "Z-function: mỗi vị trí khớp với đầu chuỗi bao xa?"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/z-function"
series: "DSA nâng cao"
seriesOrder: 29
tags: ["string", "z-function", "pattern-matching"]
description: "Tính Z-array tuyến tính nhờ đoạn khớp đã biết và ứng dụng tìm mọi lần xuất hiện của mẫu."
draft: false
updated: 2026-10-15
---

Ở vị trí 2 của `ababa`, đoạn bắt đầu tại đó là `aba`, khớp ba ký tự đầu chuỗi. Ở vị trí 4 chỉ còn một chữ a, nên khớp được một. Z-function ghi lại câu trả lời này cho mọi vị trí, để không phải so từ đầu mỗi lần.

Quy ước `Z[0]=0`; với i>0, Z[i] là độ dài tiền tố dài nhất của s trùng với đoạn bắt đầu ở i. Các chỉ số trong code Go là byte offset. Trước hết ta xem vì sao một đoạn đã khớp giúp suy ra những đoạn nằm bên trong nó.

## Một hộp khớp chứa thông tin có thể dùng lại

Giữ `[l,r)` sao cho `s[l:r]` bằng tiền tố độ dài r−l, và r xa nhất trong các đoạn đã xử lý. Nếu i nằm trong hộp, ký tự s[i] tương ứng s[i−l] ở đầu chuỗi. Vì thế bảng Z đã biết ở i−l có thể được chuyển sang vị trí i, nhưng chỉ tới biên r.

Có ba tình huống:

- i≥r: chưa có thông tin trong hộp, bắt đầu so từ độ dài 0.
- i<r và `Z[i−l]<r−i`: chỗ sai đã nằm hoàn toàn trong hộp, nên giá trị chép lại là đáp án đầy đủ.
- i<r và `Z[i−l]≥r−i`: biết chắc ít nhất r−i ký tự, nhưng ngoài r chưa biết; khởi tạo r−i rồi so tiếp.

Ta lấy min vì hộp chỉ chứng minh phần đã biết, không cho quyền suy luận ra ngoài nó. Nếu lấy nguyên Z[i−l] vượt biên, có thể bỏ qua ký tự chưa được kiểm tra và báo một khớp giả.

```note-visualization
{"id":"z-box","preset":"normal"}
```

## Theo một lượt quét cụ thể

Với ababa, i=1 gặp b khác a nên Z[1]=0. Tới i=2, so được aba rồi hết chuỗi, Z[2]=3, hộp thành [2,5). Với i=3, vị trí tương ứng 1 có Z[1]=0 và còn hai ký tự trong hộp, nên đáp án 0 đã biết. Tới i=4, vị trí tương ứng 2 có Z[2]=3 nhưng hộp chỉ còn một ký tự; lấy min(3,1)=1, và đã hết chuỗi. Kết quả `[0,0,3,0,1]`.

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

Hàm độc lập không cần import; chuỗi rỗng trả bảng rỗng. Vòng mở rộng luôn có kiểm tra i+z[i] còn trong chuỗi. Nếu giá trị mới vươn xa hơn r, cập nhật l=i,r=i+z[i]. R là biên mở, nên số ký tự còn lại khi ở trong hộp là r−i, không phải r−i+1.

Với aaaa, i=1 mở rộng tới cuối, tạo [1,4), các giá trị sau suy ra là 2 và 1. Kết quả `[0,3,2,1]` không có nghĩa ta đã so 3+2+1 cặp mới. Những lần ở trong hộp dùng lại phần đã chứng minh.

### Vì sao tổng chi phí tuyến tính?

Nếu Z sao chép nhỏ hơn phần còn trong hộp, lần so kế tiếp thất bại ngay tại vị trí sai đã suy ra, nên không có chuỗi mở rộng dài ở phía trong. Những lần so thành công cần làm mới bắt đầu tại biên phải hoặc ở ngoài hộp và đẩy biên phải về phía phải. R không lùi và không vượt n, nên tổng thành công mới là O(n). Mỗi tâm i có nhiều nhất một lần sai để dừng, thêm O(n).

Bởi vậy thuật toán chạy O(n) thời gian, O(n) bộ nhớ. Lập luận dùng tổng sự dịch chuyển của biên, không phải nói vòng while “thường chạy ít”. Với UTF-8, n là số byte; muốn code point hoặc grapheme, cần đổi dãy ký hiệu nhất quán trước khi áp cùng ý tưởng.

## Tìm mẫu bằng cách đưa nó lên đầu dãy

Ghép `pattern + delimiter + text`. Delimiter không có trong cả hai, nên phần Z ở vùng văn bản đo xem đoạn ấy khớp với pattern bao xa mà không nhầm qua ranh giới. Với pattern=aba,text=ababa, dãy `aba#ababa` có các vị trí text bắt đầu ở index 4; tại index 4 và 6, Z ít nhất 3, cho offset văn bản 0 và 2.

```note-visualization
{"id":"z-pattern","preset":"normal"}
```

Đổi index ghép i sang index text bằng `i−len(pattern)−1`. Xây dãy và bảng có thời gian/bộ nhớ O(n+m). Mẫu rỗng cần quy ước riêng; không lấy công thức Z≥0 rồi vô tình chỉ trả những ranh giới đã được lưu trong dãy ghép.

Với dữ liệu byte tùy ý, không luôn có sẵn một byte delimiter vắng mặt. Có thể chuyển các byte sang dãy integer và dùng sentinel 256 ngoài miền 0..255, hoặc dùng một bản so mẫu/văn bản riêng. Dùng ký tự # tùy tiện mà input cũng chứa # làm mất giả định chứng minh.

## Z và prefix function lưu hai hướng thông tin

KMP hỏi border của tiền tố **kết thúc tại i**; Z hỏi độ dài khớp tiền tố **bắt đầu tại i**. Cả hai cho tìm mẫu O(n+m), nhưng một bài hỏi nhiều vị trí có khớp đầu chuỗi không thường diễn đạt tự nhiên bằng Z.

Ví dụ một độ dài p là chu kỳ của chuỗi theo điều kiện `s[i]=s[i−p]` với i≥p khi `Z[p]≥n−p`. Nếu còn yêu cầu chuỗi là lặp nguyên khối độ dài p, cần thêm n chia hết cho p. “Có chu kỳ” và “lặp đúng số khối” là hai điều kiện khác nhau.

## Tự thử

1. Tính Z của ababa và giải thích tại sao Z[3]=0 đã suy ra được trong hộp.
2. Với aaaa, sau i=1 còn những hộp/giá trị nào?
3. Trong aba#ababa, hai kết quả i=4 và i=6 đổi về offset text thế nào?

**Đối chiếu:** (1) `[0,0,3,0,1]`; vị trí tương ứng i−l=1 có sai khớp bên trong hộp. (2) Hộp xa nhất giữ [1,4), Z[2]=2,Z[3]=1. (3) Trừ 4 để có 0 và 2. Nếu dùng delimiter khác, độ dài trường ngăn vẫn phải được tính đúng theo đơn vị ký hiệu đã chọn.

## Đọc tiếp

[VNOI — Z-function](https://wiki.vnoi.info/algo/string/z-algo) có bài luyện về hộp Z. [KMP](/vi/notes/data-structures-algorithms/string-matching/) giúp đối chiếu prefix function và xử lý khớp chồng lấn theo cách giữ trạng thái khác.

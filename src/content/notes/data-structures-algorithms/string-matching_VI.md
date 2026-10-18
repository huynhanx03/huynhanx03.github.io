---
title: "So khớp chuỗi: KMP và Boyer–Moore"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/string-matching"
series: "DSA nâng cao"
seriesOrder: 19
tags: ["string-matching", "kmp", "boyer-moore", "prefix-function"]
description: "Từ so khớp ngây thơ đến tái dùng phần tiền tố đã biết và dịch mẫu theo thông tin sai khớp."
draft: false
updated: 2026-10-15
---

Mẫu `aa` xuất hiện ở đâu trong `aaa`? Có hai vị trí 0 và 1, vì hai lần xuất hiện được phép chồng lấn. Một cách tìm mẫu đúng cần nói rõ quy ước ấy, đồng thời tránh so lại quá nhiều phần đã biết khi văn bản có nhiều ký tự giống nhau.

Cho văn bản dài n và mẫu dài m, cách ngây thơ thử tại từng vị trí tốn O(nm) trong trường hợp xấu. Bài này giải thích hai hướng dùng thông tin mẫu: KMP giữ phần tiền tố còn khớp, còn Boyer–Moore dùng sai khớp ở phía phải để dịch mẫu. Code KMP bên dưới làm việc theo byte và trả byte offset.

## KMP cần nhớ phần đuôi nào còn dùng được?

Giả sử mẫu bắt đầu `ababa...` và ta đã khớp `ababa`, nhưng ký tự kế tiếp sai. Đoạn văn bản vừa khớp kết thúc bằng `aba`, cũng là một tiền tố của mẫu. Thay vì bỏ toàn bộ, ta có thể giữ ba ký tự này làm phần khớp đầu cho vị trí mới.

Một chuỗi vừa là tiền tố vừa là hậu tố gọi là border; ở đây cần border **thật sự**, ngắn hơn chính chuỗi. Prefix function `pi[i]` là độ dài border dài nhất của `p[:i+1]`. Với `ababaca`, các giá trị là `[0,0,1,2,3,0,1]`.

```note-visualization
{"id":"prefix-function","preset":"normal"}
```

Tại i=4, đoạn `ababa` có border `aba`, nên pi[4]=3. Tới ký tự c ở i=5, thử nối border dài 3 yêu cầu ký tự b nhưng gặp c. Fallback về pi[2]=1 rồi pi[0]=0, vẫn không nối được, nên pi[5]=0. Ta đang xét các border có thể tồn tại theo chuỗi link, không thử mọi độ dài tùy ý.

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

Hàm Go trả bảng rỗng nếu mẫu rỗng vì vòng lặp không chạy. Với mẫu khác rỗng, j bắt đầu là border tốt nhất của tiền tố trước i. Nếu ký tự tiếp theo không khớp, một border khả dĩ ngắn hơn phải là border của chính border cũ; vì thế j=pi[j−1] không bỏ sót ứng viên đúng. Nếu khớp, tăng j một và lưu lại.

Mỗi lần i tiến lên, j chỉ tăng tối đa một; fallback giảm j. Tổng các lần tăng/giảm vì thế tuyến tính theo m, cho O(m) thời gian và O(m) bộ nhớ. Một vòng while nằm trong for không tự có nghĩa O(m²); cần xét đại lượng j thực sự đi lên xuống bao nhiêu.

## Quét văn bản với cùng một cơ chế fallback

Giữ j là số ký tự mẫu đã khớp ở cuối phần văn bản vừa đọc. Đọc ký tự mới, fallback bằng pi cho tới khi nối được hoặc j=0. Khi j=m, ghi vị trí bắt đầu i−m+1 rồi fallback ngay để tìm được cả lần chồng lấn.

```go
// Quy ước: mẫu rỗng khớp tại mọi ranh giới byte, kể cả cuối text.
func FindAll(text, pattern string) []int {
    p := []byte(pattern)
    if len(p) == 0 {
        positions := make([]int, len(text)+1)
        for i := range positions { positions[i] = i }
        return positions
    }
    pi := Prefix(p)
    positions := []int{}
    j := 0
    for i := 0; i < len(text); i++ {
        for j > 0 && text[i] != p[j] { j = pi[j-1] }
        if text[i] == p[j] { j++ }
        if j == len(p) {
            positions = append(positions, i-len(p)+1)
            j = pi[j-1]
        }
    }
    return positions
}
```

Ghép hàm với Prefix đã khai báo ở trên. Quy ước mẫu rỗng trong API này theo **ranh giới byte**, không phải vị trí ký tự Unicode. Các API khác có thể chọn quy ước khác nhưng phải xử lý trước khi đọc p[0].

Với `aba` trong `ababa`, ba ký tự đầu tạo kết quả tại 0. Khi báo xong, j=pi[2]=1 giữ chữ a cuối làm đầu của lần tiếp. Đọc b,a cho kết quả tại 2. Nếu reset j=0 sau khớp đầy đủ, ta sẽ bỏ sót sự chồng lấn này.

```note-visualization
{"id":"kmp-search","preset":"normal"}
```

Lập bảng O(m), quét O(n), bộ nhớ làm việc O(m) ngoài danh sách kết quả. Nếu xuất occ vị trí, còn cần O(occ) cho đầu ra. Với streaming, có thể giữ j qua các chunk; không tạo lại trạng thái ở mỗi chunk rồi bỏ lỡ mẫu vắt qua ranh giới.

## Boyer–Moore dùng thông tin ở phía phải

Boyer–Moore đặt mẫu dưới một cửa sổ văn bản và so từ phải sang trái. Khi sai tại ký tự mẫu j, phần đuôi sau j đã khớp. Hai heuristic tận dụng hai thông tin khác nhau.

**Bad character** nhìn ký tự văn bản gây sai. Dịch để một lần xuất hiện phù hợp của nó trong mẫu nằm dưới ký tự ấy; nếu không có ứng viên phù hợp, dịch vượt qua. Với bảng lần xuất hiện cuối đơn giản, độ dịch cần chặn ít nhất 1 để không đi lùi khi lần xuất hiện nằm bên phải j. Bản dùng lần xuất hiện phù hợp trước j có thể chính xác hơn về bước nhảy.

**Good suffix** dùng phần đuôi đã khớp: thử căn nó với một lần xuất hiện khác hợp lệ trong mẫu, hoặc căn một hậu tố của nó với tiền tố mẫu. Phần “hợp lệ” và các trường hợp biên là lý do bảng good-suffix khó cài hơn một bảng vị trí ký tự.

```note-visualization
{"id":"boyer-moore","preset":"normal"}
```

Hai luật có thể cho bước dịch dài, nhất là trên dữ liệu alphabet rộng và mẫu phù hợp. Nhưng biến thể chỉ bad-character không mang tự động mọi bảo đảm tệ nhất của các phiên bản đầy đủ có quy tắc bổ sung. Không gộp Boyer–Moore, bản giản lược và các tối ưu khác thành một tên rồi gán cùng cận. KMP có chứng minh tuyến tính rõ cho tìm tất cả vị trí; Boyer–Moore thường đáng cân nhắc khi đặc tính dữ liệu và thư viện triển khai phù hợp.

## Chọn cùng một đơn vị ký hiệu trước khi tìm

String Go là byte UTF-8. Code ở đây so byte chính xác và trả index byte, không index rune. Nếu cần code point, chuyển cả mẫu và văn bản sang rune, rồi quản lý ánh xạ nếu cần offset gốc. Nếu cần ký tự hiển thị, còn có grapheme; nếu hai cách mã hóa Unicode cùng hiển thị phải khớp, cần chuẩn hóa theo yêu cầu trước tìm. Thuật toán không tự quyết định thế nào là “cùng một chữ”.

## Tự thử

1. Tính pi của `aabaaab`.
2. Tìm `aba` trong `ababa`; sau lần khớp đầu, giữ lại bao nhiêu ký tự?
3. Vì sao dịch một vị trí sau mọi sai khớp bỏ phí thông tin?

**Đối chiếu:** (1) `[0,1,0,1,2,2,3]`; tại chữ a thứ sáu, border dài 2 sau fallback vẫn nối được. (2) Vị trí 0 và 2, giữ j=1. (3) Mẫu đã cho biết những dịch chuyển không thể tạo khớp; KMP loại chúng qua border, Boyer–Moore qua ký tự sai/phần đuôi. Bước nhảy phải có lập luận ấy để không bỏ vị trí đúng.

## Đọc tiếp

[Knuth, Morris và Pratt — Fast Pattern Matching in Strings](https://epubs.siam.org/doi/10.1137/0206024) trình bày nền tảng tìm mẫu tuyến tính; [Boyer và Moore — A Fast String Searching Algorithm](https://www.cs.utexas.edu/~moore/publications/fstrpos.pdf) mô tả hướng so từ phải. [Z-function](/vi/notes/data-structures-algorithms/z-function/) trả lời câu hỏi tương tự bằng một bảng khác, còn [Aho–Corasick](/vi/notes/data-structures-algorithms/aho-corasick/) chia sẻ fallback giữa nhiều mẫu.

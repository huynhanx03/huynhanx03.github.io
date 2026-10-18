---
title: "Ba mẫu DP kinh điển: LIS, knapsack và edit distance"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/dp-classics"
series: "DSA nâng cao"
seriesOrder: 4
tags: ["dynamic-programming", "lis", "knapsack", "edit-distance"]
description: "Ba kiểu trạng thái khác nhau và cách tránh lỗi cập nhật bảng."
draft: false
updated: 2026-10-15
---

Ba bài trong chương này minh họa ba câu hỏi khác nhau: dãy tăng kết thúc ở đâu, chọn được giá trị nào với một mức sức chứa, và đổi hai tiền tố chuỗi bằng bao nhiêu thao tác. Chúng đều dùng DP nhưng trạng thái và thứ tự cập nhật phải được suy ra từ ràng buộc riêng. Hãy đọc [bài quy hoạch động](/vi/notes/data-structures-algorithms/dynamic-programming/) trước nếu chưa quen việc định nghĩa một ô bảng bằng lời.

## LIS: điều gì quan trọng ở phần tử cuối?

Một subsequence giữ thứ tự chỉ số nhưng không cần liên tiếp. Đặt `dp[i]` là độ dài dãy con tăng nghiêm ngặt kết thúc **đúng tại** `i`. Nếu phần tử ngay trước là `j`, ta cần `j<i` và `a[j]<a[i]`. Do đó lấy `1+max(dp[j])` trên các `j` hợp lệ, hoặc 1 khi chỉ lấy riêng `a[i]`. Đáp án là `max dp[i]`, không nhất thiết nằm ở ô cuối; đầu vào rỗng có độ dài LIS bằng 0.

Với `[3,1,2,2,4]`, bảng là `[1,1,2,2,3]`. Hai số 2 không nối nhau vì yêu cầu `<`; một nghiệm là `[1,2,4]`. Mỗi ô xét tối đa `i` tiền nhiệm nên thời gian `O(n²)`, bộ nhớ `O(n)`. Nếu muốn không giảm, dùng `<=` và đáp án ví dụ thành 4 với `[1,2,2,4]`.

Cách `O(n log n)` thay câu hỏi bằng `tails[len-1]`: giá trị kết thúc nhỏ nhất có thể của một dãy tăng độ dài `len` trong phần đã đọc. Với `x`, tìm vị trí đầu `>=x` bằng lower bound, thay ô đó hoặc nối cuối nếu không có. Một đuôi nhỏ hơn không làm mất khả năng nối tiếp: bất kỳ số nào nối được sau đuôi cũ cũng nối được sau đuôi mới. Các giá trị `tails` có thứ tự tăng, nên binary search áp dụng được.

Ví dụ `[2,3,4,1]` cho `tails=[1,3,4]` ở cuối. Đây không phải một subsequence của đầu vào vì số 1 xuất hiện sau 3 và 4. Mỗi ô có thể đến từ một dãy khác nhau; chỉ độ dài bảng là đáp án. Muốn phục hồi dãy thật, lưu chỉ số cuối ứng với mỗi độ dài cùng chỉ số tiền nhiệm cho từng phần tử. Với biến thể không giảm, tìm vị trí đầu **lớn hơn** `x` thay vì `>=x` để các giá trị bằng nhau được nối.

```note-visualization
{"id":"lis-dp","preset":"normal"}
```

## 0/1 knapsack: một lượt tương ứng một vật

Cho vật `i` trọng lượng nguyên không âm `w_i`, giá trị `v_i`, sức chứa nguyên `W>=0`. Được lấy mỗi vật tối đa một lần và không vượt sức chứa. `dp[i][c]` là giá trị lớn nhất dùng `i` vật đầu với sức chứa tối đa `c`. Chọn bỏ vật hoặc lấy một lần nếu đủ chỗ:

`dp[i][c] = max(dp[i-1][c], dp[i-1][c-w_i]+v_i)`.

Khi được phép không chọn vật, hàng 0 bằng 0 cho mọi `c`. Công thức xét đủ hai trường hợp rời nhau theo quyết định với vật hiện tại. Nếu bài yêu cầu lấp **đúng** trọng lượng, cơ sở phải đánh dấu sức chứa chưa đạt được bằng trạng thái không khả thi, không khởi tạo tất cả thành 0 như bài “không quá”.

Bảng có `n(W+1)` ô, thời gian và bộ nhớ `O(n(W+1))`, thường viết `O(nW)` khi `W>=1`. Đây là pseudo-polynomial: mã hóa `W` chỉ cần `O(log(W+1))` bit (ít nhất một bit), nên tuyến tính theo giá trị `W` chưa phải đa thức theo độ dài mã hóa đầu vào.

Nén còn `dp[c]` đòi hỏi quét `c` giảm. Với một vật `(w,v)=(2,3)` và `W=4`, quét tăng đặt `dp[2]=3` rồi dùng chính ô vừa cập nhật để đặt `dp[4]=6`, như thể có hai bản sao của vật. Quét giảm tính `dp[4]` từ `dp[2]` của lượt trước, nên chỉ cho 3. Với unbounded knapsack, dùng nhiều lần là chủ đích nên quét tăng đúng với mô hình đó.

Vật trọng lượng 0 cần chú ý: trong 0/1 chỉ được cộng giá trị một lần cho mỗi vật; với unbounded và giá trị dương, giá trị tối ưu không bị chặn. Cần xác định biến thể trước khi dùng chung một vòng cập nhật.

```note-visualization
{"id":"knapsack-dp","preset":"normal"}
```

## Edit distance: nhìn thao tác cuối trên hai tiền tố

`dp[i][j]` là số thao tác ít nhất biến `i` ký tự đầu của A thành `j` ký tự đầu của B. Cho phép chèn, xóa, thay thế, mỗi thao tác giá 1. Với chuỗi đích rỗng cần xóa hết, nên `dp[i][0]=i`; nguồn rỗng cần chèn hết, nên `dp[0][j]=j`.

Nếu ký tự cuối bằng nhau, giữ chúng và dùng `dp[i-1][j-1]`. Nếu khác, thao tác cuối có ba khả năng: xóa ký tự A lấy `dp[i-1][j]`, chèn ký tự B lấy `dp[i][j-1]`, hoặc thay thế lấy `dp[i-1][j-1]`; cộng 1 vào phương án nhỏ nhất. Với `cat→cut`, tiền tố `c` khớp, thay `a` bằng `u`, rồi giữ `t`, nên khoảng cách bằng 1. Không thể bằng 0 vì hai chuỗi khác nhau.

| A / B | rỗng | c | u | t |
| --- | ---: | ---: | ---: | ---: |
| rỗng | 0 | 1 | 2 | 3 |
| c | 1 | 0 | 1 | 2 |
| a | 2 | 1 | 1 | 2 |
| t | 3 | 2 | 2 | 1 |

Mỗi ô dùng ô trên, trái và chéo trên trái nên tính theo hàng/cột tăng. Thời gian `O(mn)` và bộ nhớ `O(mn)`; chỉ cần khoảng cách thì giữ hai hàng, chọn chiều ngắn hơn làm hàng để dùng `O(min(m,n))`. Cần giữ đủ quyết định/bảng nếu muốn xuất chuỗi thao tác.

Với tiếng Việt, “ký tự” phải được định nghĩa: byte UTF-8, rune hay grapheme cho những bài toán khác nhau. Cắt theo byte không tương đương thao tác một ký tự hiển thị. Hãy quyết định đơn vị và chuẩn hóa dữ liệu theo hợp đồng trước khi tính bảng.

```note-visualization
{"id":"edit-distance","preset":"normal"}
```

**Tự kiểm tra:** LIS nghiêm ngặt và không giảm của `[3,1,2,2,4]` là bao nhiêu? Một vật nặng 2, giá trị 3 với `W=4` được giá trị 6 khi nào? Ô cuối bảng `cat→cut` chứng minh gì?

**Giải thích:** lần lượt 3 và 4 vì chỉ biến thể không giảm nối được hai số 2. Giá trị 6 đúng khi cho dùng hai bản sao, nhưng là lỗi nếu 0/1 chỉ có một vật; hướng quét quyết định có dùng lại lượt hiện tại hay không. Ô cuối là 1 vì truy hồi xét đầy đủ các thao tác cuối trên toàn bộ hai chuỗi; một đường thay thế cụ thể cung cấp nghiệm đạt giá trị đó.

---
title: "Nim và Sprague–Grundy: biến trò chơi thành trạng thái thắng thua"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/nim-sprague-grundy"
series: "DSA nâng cao"
seriesOrder: 35
tags: ["game-theory", "nim", "sprague-grundy", "mex"]
description: "Phân tích trò chơi hai người hoàn hảo, quy tắc chơi bình thường và xor Grundy."
draft: false
updated: 2026-10-15
---

Có ba đống sỏi 3,4,5. Mỗi lượt lấy ít nhất một viên từ đúng một đống; ai tới lượt mà không còn nước thì thua. Thử toàn bộ cây nước đi được, nhưng số trạng thái tăng nhanh. Nim cho một tiêu chuẩn tính bằng xor; Sprague–Grundy giải thích khi nào tiêu chuẩn ấy mở rộng được sang trò chơi khác.

Ta xét trò chơi hai người luân phiên, không ngẫu nhiên, thông tin đầy đủ và normal play: hết nước đi là thua. Phần Grundy còn cần **impartial**: tập nước hợp lệ của một trạng thái không phụ thuộc danh tính người đang đi. Đồ thị trạng thái trong cách DP ở đây hữu hạn và không chu trình. Luật có hòa, vòng lặp hoặc ai đi cuối thua cần phân tích khác.

## Thắng nghĩa là đưa lượt khó cho đối thủ

Trạng thái không có nước là thua. Một trạng thái là thắng nếu tồn tại nước dẫn tới trạng thái thua của người kế tiếp; nếu mọi nước đều dẫn tới trạng thái thắng của họ thì nó là thua. Đây là truy hồi từ cuối ván ngược lại, không phải nói rằng người chơi luôn chọn được nước tốt khi không biết luật hoặc chơi sai.

Với đồ thị không chu trình, có thể tính từ các trạng thái không còn nước đi hoặc dùng memoization đệ quy. Nếu có chu trình, lời gọi không tự về tới đáy, và hai nhãn thắng/thua có thể chưa mô tả đầy đủ một luật cho phép hòa.

## Nim: vì sao xor bằng 0 là trạng thái thua?

Đặt `x=a₁ xor ... xor a_k`. Xor theo từng bit, bằng 0 khi mỗi cột có số bit 1 chẵn. Với 3,4,5 ở dạng nhị phân `011,100,101`, xor là 010, tức 2.

Nếu x=0, giảm một đống từ a xuống b<a làm xor mới `a xor b`. Hai số khác nhau nên xor không thể 0. Vì vậy không có nước từ một trạng thái xor 0 tới một trạng thái xor 0 khác.

Nếu x≠0, chọn bit cao nhất bật trong x. Có một đống a bật bit ấy; đặt `b=a xor x`. Các bit cao hơn không đổi, bit vừa chọn chuyển từ 1 thành 0, nên b<a và đây là nước lấy sỏi hợp lệ. Xor mới là `x xor a xor b=0`.

```note-visualization
{"id":"nim-xor","preset":"normal"}
```

Với [3,4,5], chọn a=3, b=3 xor 2=1: lấy hai viên ở đống đầu để còn [1,4,5], xor bằng 0. Từ đây, sau mỗi nước đối thủ đưa xor khác 0, ta lại có nước đưa về 0. Mỗi lượt giảm tổng số sỏi nên ván hữu hạn, cuối cùng đối thủ nhận trạng thái mọi đống rỗng.

```note-visualization
{"id":"nim-winning-move","preset":"normal"}
```

```go
func NimWinning(piles []uint64) bool {
    var x uint64
    for _, pile := range piles { x ^= pile }
    return x != 0
}
```

Hàm Go chỉ trả có nước thắng hay không, không tìm nước cụ thể; công thức chọn bit ở trên bổ sung được bước ấy. Nó chạy O(k) thời gian, O(1) bộ nhớ. Với mọi đống rỗng, xor=0 và người đầu thua đúng quy ước. Nếu luật chỉ cho lấy 1 hoặc 2 viên, nước b=a xor x chưa chắc được phép, nên không thể áp nguyên kích thước đống vào công thức Nim.

## Grundy ghi nhiều thông tin hơn một nhãn thắng/thua

Với trạng thái s, lấy tập Grundy của mọi trạng thái t đi tới được, rồi đặt `g(s)=mex{g(t)}`. Mex là số nguyên không âm nhỏ nhất vắng mặt; ví dụ mex{0,2,2}=1, mex{1,2}=0. Đếm trùng phần tử không đổi mex.

Trạng thái hết nước có tập rỗng nên g=0. Nếu g=0, không có nước tới g=0; nếu g≠0, số 0 phải có trong tập lựa chọn, nên có nước tới trạng thái thua. Vì vậy nhãn thắng/thua tương ứng g≠0/g=0. Những giá trị lớn hơn 1 cần thiết khi ghép nhiều trò con; chỉ giữ một bit thắng/thua sẽ làm mất thông tin ghép.

Ví dụ một đống chỉ lấy 1 hoặc 2:

| Số sỏi n | Grundy của các nước tới được | g(n) |
| --- | --- | --- |
| 0 | Tập rỗng | 0 |
| 1 | {0} | 1 |
| 2 | {1,0} | 2 |
| 3 | {2,1} | 0 |
| 4 | {0,2} | 1 |

Hai trạng thái trước của n luôn mang hai giá trị còn lại trong 0,1,2, nên suy nạp cho g(n)=n mod 3. Đây là công thức từ đúng tập nước hợp lệ, không phải lấy n làm nimber như Nim thông thường.

```note-visualization
{"id":"grundy-mex","preset":"normal"}
```

## Khi nào được xor các trò con?

Định lý Sprague–Grundy nói tổng các trò impartial độc lập dưới normal play có Grundy bằng xor Grundy từng phần. “Tổng” ở đây có nghĩa mỗi lượt chọn đúng một trò con và đi một nước trong nó; các trò còn lại không đổi. Không phải chỉ vì màn hình vẽ nhiều đống mà luật đã độc lập.

Ví dụ hai đống chỉ lấy 1 hoặc 2, kích thước 4 và 5, có Grundy 1 và 2, xor 3 nên thắng. Người chơi có thể đổi một phần để xor về 0 theo lý thuyết Grundy, nhưng nước cụ thể phải là một cạnh hợp lệ của trò gốc. Nếu một lượt được lấy đồng thời ở hai đống, hoặc luật cấm lấy một số lượng tùy đống đã chọn trước, mô hình tổng này không còn được phép áp trực tiếp.

Với nhiều trạng thái có đường đi trùng nhau, memoization tránh tính lại. Trên đồ thị hữu hạn, tính mex hiệu quả theo số cạnh và phạm vi giá trị cần xét; tính g(s) không nhất thiết O(1) nếu s có rất nhiều nước. Số trạng thái khả thi mới quyết định DP có dùng được hay không.

## Tự thử

1. Tìm một nước thắng cho Nim [3,4,5] và kiểm tra xor sau nước ấy.
2. Viết g(0..6) với luật lấy 1 hoặc 2.
3. Hai trò riêng đều có g=1; tổng của chúng thắng hay thua? Luật nào khiến kết luận ấy không áp được?

**Đối chiếu:** (1) Giảm 3 còn 1, xor 1 xor 4 xor 5=0. (2) 0,1,2,0,1,2,0. (3) Xor 1 xor 1=0 nên thua với normal play và mỗi lượt đổi đúng một phần. Nếu được đi đồng thời ở cả hai hoặc đổi sang misère, cần lời giải khác. Cùng trạng thái nhưng đổi luật có thể đổi đáp án.

## Tài liệu

[MIT — Theory of impartial games](https://ocw.mit.edu/courses/es-268-the-mathematics-in-toys-and-games-spring-2010/a56c2f19070acfc62af446e3d7ddc4b4_MITES_268S10_Ses1_slides.pdf) trình bày các điều kiện của Sprague–Grundy. [Minimax và alpha–beta](/vi/notes/data-structures-algorithms/alpha-beta-pruning/) xét cây trò chơi đối kháng theo giá trị đánh giá, một mô hình tổng quát hơn về cách tìm kiếm nước đi.

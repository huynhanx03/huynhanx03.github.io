---
title: "Minimax và alpha–beta: tìm nước đi mà không duyệt mọi nhánh"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/alpha-beta-pruning"
series: "DSA nâng cao"
seriesOrder: 36
tags: ["game-theory", "minimax", "alpha-beta", "search"]
description: "Từ cây quyết định đối kháng đến cắt tỉa an toàn bằng cận alpha, beta."
draft: false
updated: 2026-10-15
---

Max có hai nước đi. Nếu chọn nhánh trái, đối thủ Min có thể ép điểm còn 5. Sang nhánh phải, vừa xét một lựa chọn của Min ta thấy nó cho điểm 3. Có cần xem hết các lựa chọn khác của Min ở nhánh phải nữa không? Không: Min đã có thể giữ điểm không quá 3, nên Max sẽ chọn phương án 5 ở nhánh trái.

Alpha–beta biến lập luận ấy thành cắt tỉa trên cây minimax. Nó bỏ phần không thể đổi quyết định của tổ tiên, nhưng vẫn tính cùng giá trị gốc với minimax trên độ sâu đã chọn. Điều này khác với cắt bớt theo một dự đoán chưa được chứng minh.

## Trước tiên xác định giá trị của một nút

Xét trò chơi hai người, thông tin đầy đủ, không ngẫu nhiên và điểm zero-sum: Max muốn điểm lớn, Min muốn điểm nhỏ. Tại lá, đánh giá điểm từ cùng góc nhìn Max. Ở nút Max lấy max giá trị con; ở nút Min lấy min. Nếu duyệt tới trạng thái kết thúc của cây hữu hạn và cả hai chơi tối ưu, giá trị gốc là kết quả Max bảo đảm được.

Cây hai tầng có hai nút Min dưới gốc Max. Nếu lá bên trái là 5,8 thì giá trị trái là 5; lá bên phải là 3,9 thì giá trị phải là 3. Gốc chọn max(5,3)=5. Không lấy lá 9 làm bằng chứng nhánh phải tốt: Min có quyền tránh lá ấy.

```note-visualization
{"id":"minimax","preset":"normal"}
```

Với hệ số phân nhánh b và độ sâu d, cây đầy có O(b^d) nút. Nhiều trò chơi không thể đi tới tận cuối bằng tìm kiếm thô, nên thường dừng tại độ sâu hữu hạn và dùng hàm đánh giá. Khi đó minimax tối ưu đối với cây đánh giá đó, chưa bảo đảm tối ưu tuyệt đối trên toàn trò chơi.

## Alpha và beta ghi phương án tổ tiên đã có

Alpha là cận dưới Max đã có thể bảo đảm nhờ một lựa chọn đã xét; beta là cận trên Min đã có thể ép theo góc nhìn điểm của Max. Chúng mang thông tin dọc đường tìm kiếm, không nhất thiết bằng giá trị chính xác của nút hiện tại.

Quay lại ví dụ: sau nhánh trái, alpha của gốc là 5. Tại nút Min bên phải, thấy lá đầu bằng 3 làm beta xuống 3. Dù lá còn lại 9 hay 100, Min vẫn có thể chọn 3 hoặc thấp hơn; nhánh phải không vượt phương án 5 Max đã có. Khi alpha≥beta, phần còn lại không thể cải thiện quyết định tổ tiên nên cắt được.

```note-visualization
{"id":"alpha-beta","preset":"normal"}
```

Nếu đảo thứ tự hai lá của nhánh phải thành 9 rồi 3, chưa thể cắt sau 9 vì nó vẫn có thể đánh bại phương án 5. Chỉ sau khi gặp 3 mới có đủ cận. Thứ tự thay lượng việc phải làm, không thay giá trị minimax đúng.

## Theo cận trong DFS

```go
func AlphaBeta(node State, depth int, alpha, beta int) int {
    if depth == 0 || node.Terminal() { return node.Evaluate() }
    if node.MaxTurn() {
        best := -inf
        for _, child := range node.Moves() {
            best = max(best, AlphaBeta(child, depth-1, alpha, beta))
            alpha = max(alpha, best)
            if alpha >= beta { break }
        }
        return best
    }
    best := inf
    for _, child := range node.Moves() {
        best = min(best, AlphaBeta(child, depth-1, alpha, beta))
        beta = min(beta, best)
        if alpha >= beta { break }
    }
    return best
}
```

Đây là mã giả theo cú pháp Go: trò chơi phải định nghĩa State, Terminal, Evaluate, Moves, MaxTurn và inf. Gọi gốc với độ sâu không âm và alpha=−inf,beta=inf; cần bảo đảm **mọi điểm hợp lệ nằm nghiêm ngặt giữa −inf và inf**. Chỉ yêu cầu inf lớn hơn điểm tối đa chưa đủ nếu điểm âm có độ lớn vượt inf: giá trị best khởi tạo ở −inf có thể lớn hơn mọi con thật. Mỗi trạng thái không terminal phải có ít nhất một nước trong Moves; nếu hết nước là thua, hòa hoặc phải bỏ lượt, mô hình phải biểu đạt quy tắc đó. Hàm max/min có thể dùng built-in ở phiên bản Go hỗ trợ hoặc helper tương đương.

Ở lượt Max, best tăng khi có con tốt hơn; alpha được siết bằng best. Ở lượt Min, best giảm và beta được siết. Kiểm tra cắt sau cập nhật vì chính kết quả vừa đọc có thể làm hai cận gặp nhau. Một lời gọi bị cắt có thể chỉ cung cấp giá trị đủ làm cận cho caller, không phải mọi subtree đều đã có giá trị chính xác; điều cần bảo đảm là giá trị cuối của lời gọi gốc với cửa sổ đầy đủ.

Nếu một nước được đi thêm, MaxTurn phải phản ánh đúng trạng thái kế tiếp, không giả định cứ xuống một tầng là đổi người. Điểm lá phải theo cùng góc nhìn. Trò ngẫu nhiên có xúc xắc cần nút kỳ vọng như expectiminimax; không thay nút đó bằng min rồi gọi là cùng bài toán.

## Cắt tỉa tiết kiệm tới đâu?

Thử nước tốt sớm khiến cận chặt sớm. Với thứ tự rất thuận lợi trên mô hình cây đều, lượng việc có thể gần O(b^(d/2)); trường hợp xấu vẫn O(b^d). Đây là tiết kiệm số nút, không xóa chi phí sinh nước, sao chép trạng thái hoặc Evaluate.

Iterative deepening tìm lần lượt các độ sâu, dùng nước tốt ở lượt trước để sắp thứ tự lượt sau. Bảng trạng thái đã gặp giúp khi nhiều đường dẫn tới cùng trạng thái, nhưng entry phải ghi độ sâu đủ và phân biệt điểm chính xác với cận dưới/cận trên từ lời gọi đã bị cắt. Dùng một cận như giá trị chính xác có thể làm kết quả sai dù cơ chế alpha–beta riêng đúng.

Vòng lặp trạng thái và luật hòa cũng cần được đưa vào mô hình; không chỉ memoize rồi bỏ qua lịch sử nếu luật phụ thuộc lặp nước. Chọn độ sâu và hàm đánh giá còn gây horizon effect: một hậu quả xấu nằm ngay sau điểm cắt độ sâu có thể chưa được thấy. Alpha–beta không chữa sai số mô hình đánh giá ấy.

## Tự thử trước khi xem lời giải

1. Gốc Max có hai con Min với các lá lần lượt [5,8] và [3,9]. Duyệt trái trước, lá nào bỏ được?
2. Đổi nhánh phải thành [9,3]. Vì sao không bỏ lá 3 sau khi thấy 9?
3. Cắt ở alpha≥beta có làm giá trị gốc đổi không? Dừng vì depth=0 có cùng ý nghĩa không?

**Lời giải:** (1) Sau trái, alpha=5. Gặp 3 ở phải làm beta=3, bỏ lá 9. (2) Min mới có cận trên 9; chưa biết nó có hạ xuống dưới 5 hay không, nên phải xem tiếp. (3) Alpha–beta giữ giá trị minimax của cây đã chọn; giới hạn depth thay lá kết thúc bằng Evaluate nên thay bài toán đánh giá. Cần phân biệt hai loại “dừng”.

## Tài liệu

[UC Berkeley CS188 — Minimax](https://inst.eecs.berkeley.edu/~cs188/textbook/games/minimax.html) và [Games: Minimax and Alpha–Beta](https://inst.eecs.berkeley.edu/~cs188/sp24/assets/lectures/cs188-sp24-lec05.pdf) giải thích các cận và ảnh hưởng của thứ tự nước đi. Với trò impartial hữu hạn có cấu trúc tổng độc lập, xem [Nim và Sprague–Grundy](/vi/notes/data-structures-algorithms/nim-sprague-grundy/) để tránh duyệt cây khi có invariant mạnh hơn.

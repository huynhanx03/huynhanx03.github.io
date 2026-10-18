---
title: "Minimax và alpha–beta: tìm nước đi mà không duyệt mọi nhánh"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/alpha-beta-pruning"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 36
tags: ["game-theory", "minimax", "alpha-beta", "search"]
description: "Từ cây quyết định đối kháng đến cắt tỉa an toàn bằng cận alpha, beta."
draft: false
---

Trong trò chơi hai người đối kháng, bên `Max` muốn điểm cuối lớn, bên `Min` muốn điểm cuối nhỏ. **Minimax** gán điểm cho lá, rồi tính từ dưới lên: nút Max lấy max các con, nút Min lấy min. Nếu cả hai chơi tối ưu và duyệt toàn bộ cây hữu hạn, giá trị tại gốc là kết quả bảo đảm cho Max. Với hệ số phân nhánh `b` và độ sâu `d`, duyệt thô `O(b^d)` nút.

## 1. Hai cận mang thông tin gì?

Trong DFS minimax, `alpha` là giá trị tốt nhất **Max đã có thể bảo đảm** trên đường tìm kiếm hiện tại; `beta` là giá trị tốt nhất **Min đã có thể bảo đảm** theo góc nhìn của Min, tức một cận trên cho Max. Khi `alpha>=beta`, nhánh còn lại không thể thay đổi lựa chọn của tổ tiên: Max đã có phương án ít nhất `alpha`, còn Min sẽ không cho Max vượt quá `beta` trong nhánh đang xét. Cắt ở đây là một chứng minh so sánh cận, không phải đoán nhánh “có vẻ tệ”.





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

Đây là mã giả theo cú pháp Go: `State`, `inf`, `Terminal`, `Evaluate`, `Moves`, `MaxTurn` phải do trò chơi cụ thể định nghĩa. Nếu dừng ở `depth==0`, kết quả chỉ tốt bằng hàm đánh giá; **không còn bảo đảm tối ưu tuyệt đối** trên toàn trò chơi. Nếu có lượt “đi thêm” hoặc quy tắc điểm không đối xứng, `MaxTurn` cần phản ánh đúng luật.



```note-visualization
{"id":"minimax","preset":"normal"}
```



```note-visualization
{"id":"alpha-beta","preset":"normal"}
```

## 2. Thứ tự nước đi và giới hạn

Cắt tỉa đúng với mọi thứ tự duyệt, nhưng hiệu quả phụ thuộc thứ tự. Nếu thử nước tốt trước, alpha/beta thắt nhanh; trường hợp thuận lợi số nút có thể gần `O(b^{d/2})`, trong trường hợp xấu vẫn `O(b^d)`. Các kỹ thuật như iterative deepening, bảng trạng thái đã gặp và sắp nước đi giúp thực tế, nhưng phải quản lý trạng thái lặp và điểm theo độ sâu đúng. Alpha–beta không áp dụng trực tiếp cho trò ngẫu nhiên có xúc xắc; khi đó nút kỳ vọng cần thuật toán khác như expectiminimax.

**Tự luyện:** (1) Vẽ cây hai tầng, chấm điểm lá rồi tính minimax. (2) Đổi thứ tự lá và đếm số nhánh alpha–beta có thể bỏ. (3) Giải thích vì sao cắt tỉa không thay giá trị gốc khi duyệt đến hết độ sâu đã chọn.

*Đọc thêm: [VNOI — Alpha–Beta](https://wiki.vnoi.info/algo/games/Giai-Thuat-Cat-Tia-Alpha-beta).*

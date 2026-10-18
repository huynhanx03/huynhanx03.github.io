---
title: "Quay lui: xây nghiệm từng bước và cắt nhánh sai sớm"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/backtracking"
translationPending: true
series: "DSA cơ bản"
seriesOrder: 14
tags: ["backtracking", "pruning", "n-queens", "invariant"]
description: "Thiết kế cây trạng thái, điều kiện hợp lệ và thao tác hoàn tác qua bài toán N quân hậu."
draft: false
---

Quay lui xem một nghiệm là chuỗi quyết định. Ở mỗi mức, ta thử một lựa chọn, kiểm tra điều kiện cần, đi sâu rồi **hoàn tác** để thử lựa chọn khác. Nó khác sinh tất cả rồi lọc ở chỗ có thể loại sớm cả một nhánh. Nhưng cắt tỉa chỉ đúng nếu nhánh bị bỏ chắc chắn không chứa nghiệm; một heuristic “có vẻ không tốt” không đủ làm chứng minh.

## 1. Cây trạng thái của N quân hậu

Đặt một quân hậu trên mỗi hàng của bàn `n×n`. Tại hàng `row`, thử từng cột chưa dùng. Hai ô `(r1,c1)` và `(r2,c2)` cùng chéo khi `r1-c1 == r2-c2` hoặc `r1+c1 == r2+c2`. Ta giữ ba tập: cột, chéo chính `row-col+n-1`, chéo phụ `row+col`. Khi đặt quân, đánh dấu; khi quay về, xóa dấu.



```go
func CountQueens(n int) int {
    col := make([]bool, n)
    diag1, diag2 := make([]bool, 2*n-1), make([]bool, 2*n-1)
    count := 0
    var place func(int)
    place = func(row int) {
        if row == n { count++; return }
        for c := 0; c < n; c++ {
            d1, d2 := row-c+n-1, row+c
            if col[c] || diag1[d1] || diag2[d2] { continue }
            col[c], diag1[d1], diag2[d2] = true, true, true
            place(row+1)
            col[c], diag1[d1], diag2[d2] = false, false, false
        }
    }
    place(0)
    return count
}
```

Hàm giả sử `n>=1`. Bất biến trước `place(row)`: đã đặt đúng một hậu ở mỗi hàng `<row`, không quân nào tấn công nhau; các mảng đánh dấu khớp chính xác với những quân ấy. Mỗi nhánh hợp lệ thêm một quân và thao tác hoàn tác phục hồi bất biến trước nhánh tiếp. Độ sâu đệ quy `O(n)`, ba mảng đánh dấu `O(n)`; thời gian xấu tăng theo số cấu hình được duyệt, có cận trên thô `O(n·n!)` cho vòng thử cột, nhưng số nhánh thực tế ít hơn nhờ cắt tỉa.



```note-visualization
{"id":"n-queens","preset":"normal"}
```

## 2. Thiết kế cắt tỉa

Ba câu hỏi cần trả lời: (1) trạng thái tối thiểu để quyết định bước tiếp là gì; (2) điều kiện nào khiến mọi phần mở rộng đều vô hiệu; (3) trạng thái nào phải hoàn nguyên? Với tổng mục tiêu và các số không âm, nếu tổng hiện tại đã vượt mục tiêu, có thể cắt nhánh; nếu còn số âm, lập luận ấy sai. Với hoán vị có phần tử trùng, sắp đầu vào rồi bỏ lựa chọn trùng tại **cùng một mức** giúp tránh in cùng nghiệm nhiều lần, nhưng không được bỏ tất cả giá trị trùng trên toàn bộ cây.

Quay lui thường dùng khi cần liệt kê nghiệm; để tìm một nghiệm, trả `bool` và dừng ngay khi thấy; để tối ưu, kết hợp cận trên/cận dưới hợp lệ như bài nhánh cận ở topic nâng cao.

**Tự luyện:** (1) Vẽ cây tìm kiếm N quân hậu với `n=4` đến nghiệm đầu tiên. (2) Sửa code để trả danh sách vị trí từng nghiệm và giải thích tại sao phải copy slice. (3) Cho phản ví dụ cắt nhánh “tổng hiện tại vượt mục tiêu” khi có số âm.

*Đối chiếu: Jain, chương 20; Drozdek, chương 5; Lê Minh Hoàng, phần 1 §3.*

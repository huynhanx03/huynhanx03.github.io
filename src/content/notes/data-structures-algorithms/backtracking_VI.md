---
title: "Quay lui: xây nghiệm từng bước và cắt nhánh sai sớm"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/backtracking"
series: "DSA cơ bản"
seriesOrder: 14
tags: ["backtracking", "pruning", "n-queens", "invariant"]
description: "Thiết kế cây trạng thái, điều kiện hợp lệ và thao tác hoàn tác qua bài toán N quân hậu."
draft: false
updated: 2026-10-15
---

Giả sử đang đặt hậu trên bàn cờ. Sau vài hàng, một quân mới đã cùng cột với quân cũ. Không cần đặt hết các hàng mới biết cách chọn đó thất bại: mọi cách hoàn thiện đều còn cặp hậu tấn công nhau. Quay lui tận dụng nhận xét này để tìm kiếm trên các nghiệm đang xây dở.

Mỗi nút của cây tìm kiếm là một chuỗi quyết định. Ta chọn một bước, cập nhật trạng thái, đi sâu rồi hoàn tác trước khi thử bước khác. Khác với sinh toàn bộ rồi lọc, quay lui có thể bỏ cả cây con; điều kiện bỏ phải bảo đảm cây con ấy không chứa nghiệm. Một lựa chọn “có vẻ xấu” chưa đủ cho kết luận đó.

## Xây bàn cờ từng hàng

Bài N quân hậu yêu cầu đặt `n` hậu trên bàn `n×n` sao cho không cặp nào cùng hàng, cột hay đường chéo. Đặt đúng một quân mỗi hàng làm điều kiện hàng tự được thỏa. Tại `row`, ta còn phải chọn cột không xung đột với các hàng trước.

Hai ô cùng chéo khi hiệu `row-col` bằng nhau hoặc tổng `row+col` bằng nhau. Hiệu có thể âm, nên cộng `n-1` để làm chỉ số mảng. Với `0<=row,col<n`, cả `row-col+n-1` và `row+col` nằm trong `[0,2n-2]`. Ba mảng boolean vì thế trả lời được “cột/chéo đã dùng chưa?” trong `O(1)` cho mỗi lần thử.

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

Đây là hàm Go hoàn chỉnh, không cần import. Hợp đồng là `n>=1`; `n=0` làm kích thước `2*n-1` âm và không thuộc miền dùng của code. Nếu muốn định nghĩa bàn rỗng có một cách đặt, cần xử lý riêng trước khi tạo mảng. Bộ đếm kiểu `int` cũng phải đủ chứa số nghiệm mà đầu vào yêu cầu. `CountQueens(4)` dự kiến trả 2; con số này đếm mọi cách đặt, chưa gộp các nghiệm đối xứng.

## Theo một nhánh để hiểu bước hoàn tác

Đánh số hàng/cột từ 0. Với `n=4`, thử hàng 0 ở cột 0. Hàng 1 không thể dùng cột 0 hay 1; thử cột 2. Đến hàng 2 không còn cột hợp lệ, nên lời gọi trở về. Ta xóa đúng dấu của quân ở `(1,2)` rồi thử `(1,3)`. Nhánh này cũng không hoàn tất được, nên cuối cùng phải xóa dấu quân `(0,0)` và chuyển hàng 0 sang cột 1.

Một nghiệm tìm thấy sau đó là các cột `[1,3,0,2]`. Mỗi bước chỉ đi tiếp khi ba phép kiểm tra đều qua. Sau khi đếm nghiệm, chương trình vẫn phải quay về và xóa dấu để tiếp tục tìm nghiệm còn lại `[2,0,3,1]`. Nếu quên xóa một đường chéo, nhánh sau sẽ tưởng có một quân không còn tồn tại và có thể mất nghiệm.

```note-visualization
{"id":"n-queens","preset":"normal"}
```

Bất biến trước `place(row)` là đã đặt đúng một hậu ở từng hàng `<row`, không quân nào tấn công nhau và các dấu khớp chính xác với những quân đó. Đặt quân hợp lệ duy trì bất biến cho hàng tiếp theo. Khi `row==n`, mọi hàng đều đã được xử lý nên tăng bộ đếm là đúng. Thử mọi cột giữ tính đầy đủ; một cấu hình hoàn chỉnh chỉ có một chuỗi chọn cột nên không bị đếm hai lần. Hoàn tác đưa trạng thái về đúng trước lần thử, cho phép áp dụng cùng lập luận ở nhánh kế.

Ba mảng dùng `O(n)` bộ nhớ, độ sâu đệ quy cũng `O(n)`. Vì không lặp cột, số tiền tố bị chặn bởi số cách sắp các cột; một cận thô có tính cả vòng thử `n` cột là `O(n·n!)`. Cắt tỉa chéo làm nhiều trường hợp thực tế nhỏ hơn cận ấy, nhưng không biến thuật toán thành đa thức.

## Điều kiện cắt phải còn đúng với mọi phần mở rộng

Trong bài tổng mục tiêu với các số không âm, nếu tổng hiện tại lớn hơn mục tiêu thì thêm phần tử không thể làm tổng giảm. Ta có thể bỏ nhánh. Nhưng với mục tiêu 5, tiền tố đang có tổng 8 và còn số `-3`, nhánh đó vẫn tạo nghiệm. Điều kiện cắt cũ đã dựa vào tính không âm; bỏ giả định mà giữ code sẽ sai.

Khi sinh hoán vị từ giá trị trùng, chẳng hạn `[a,a,b]`, việc thử cả hai bản sao `a` ở cùng một mức tạo cùng kiểu tiền tố. Sắp đầu vào và bỏ lựa chọn giá trị trùng **ở mức hiện tại** giúp tránh lặp. Không được cấm mọi lần dùng `a` trên toàn cây: một nghiệm vẫn có thể cần cả hai bản sao tại hai vị trí khác nhau.

Trước khi viết hàm đệ quy, hãy xác định dữ liệu nào đủ để quyết định bước tiếp, điều kiện nào chứng minh không thể hoàn thiện và mọi dữ liệu đã thay đổi cần được phục hồi. Những câu hỏi này cũng giúp phát hiện lỗi khi code chạy đúng ở nhánh đầu nhưng sai sau khi quay về.

## Đổi mục tiêu mà giữ cấu trúc tìm kiếm

Đếm nghiệm chỉ cần bộ đếm. Muốn liệt kê, thêm slice `position[row]=col`; khi đủ `n` hàng, sao chép slice vào danh sách kết quả. Nếu giữ nguyên slice dùng lại, các kết quả có thể trỏ đến cùng vùng nhớ và bị lần thử sau ghi đè.

Muốn một nghiệm, có thể trả `bool` và dừng khi tìm thấy. Cần quy ước liệu khi trả sớm hàm còn phải hoàn nguyên trạng thái cho caller hay caller giữ luôn cấu hình thành công. Với bài tối ưu, không chỉ cắt nhánh sai mà còn muốn bỏ nhánh không thể tốt hơn nghiệm hiện có; [nhánh cận](/vi/notes/data-structures-algorithms/branch-and-bound/) bổ sung chứng minh cho bước ấy.

**Tự thử:** vì sao nhánh `(0,0),(1,2)` không cần đi tiếp? Khi lưu nghiệm, phải copy những gì? Tổng 8 vượt mục tiêu 5 có luôn được cắt không?

**Giải thích:** mọi cột ở hàng 2 đều đã bị cột hoặc chéo tấn công, nên không có lựa chọn kế tiếp. Cần copy các giá trị vị trí của nghiệm, không chỉ thêm một bản sao descriptor của slice dùng chung. Tổng 8 chỉ cắt được nếu mọi phần bổ sung không làm tổng giảm; số `-3` là phản ví dụ khi cho số âm.

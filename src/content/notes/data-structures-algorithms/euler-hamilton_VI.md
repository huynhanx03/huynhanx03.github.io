---
title: "Đường Euler và Hamilton: dùng hết cạnh hay thăm hết đỉnh?"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/euler-hamilton"
series: "DSA nâng cao"
seriesOrder: 18
tags: ["euler-path", "hamilton-path", "hierholzer", "backtracking"]
description: "Điều kiện Euler và thuật toán Hierholzer; vì sao Hamilton cần tìm kiếm khó hơn."
draft: false
updated: 2026-10-15
---

Một xe kiểm tra đường cần đi qua mọi đoạn đường; một người thăm địa điểm cần ghé mọi điểm đúng một lần. Hai yêu cầu đều vẽ được thành đường trên đồ thị nhưng không kiểm soát cùng đối tượng. Euler dùng **mỗi cạnh đúng một lần**, cho phép thăm lại đỉnh; Hamilton dùng **mỗi đỉnh đúng một lần**.

Chu trình tương ứng quay về điểm xuất phát. Bài Euler vô hướng có tiêu chuẩn bậc và liên thông cùng thuật toán tuyến tính. Hamilton tổng quát cần tìm kiếm hoặc DP mũ; không thể lấy điều kiện bậc của Euler để kết luận cho nó. Bài này chỉ trình bày điều kiện Euler cho đồ thị vô hướng.

## Ghép từng lần đi vào với một lần đi ra

Một đỉnh ở giữa đường Euler mỗi lần đi vào phải dùng một cạnh khác để đi ra. Các cạnh kề vì thế ghép thành cặp. Với đường mở, chỉ hai đầu có thể dư một lần ra hoặc vào. Do đó số đỉnh bậc lẻ phải là 0 hoặc 2.

Còn cần mọi đỉnh có cạnh nằm trong cùng một thành phần liên thông: không có đường nào đi qua hai nhóm cạnh tách rời. Bỏ qua đỉnh cô lập khi kiểm tra điều kiện này. Hai điều kiện kết hợp là đủ: mọi bậc chẵn cho chu trình Euler; đúng hai bậc lẻ cho đường mở từ một đỉnh lẻ đến đỉnh kia. Số bậc lẻ khác 0 hoặc 2 không thể có đường Euler.

Với `0-1-2`, bậc `[1,2,1]` cho đường mở 0→1→2. Tam giác có mọi bậc 2, cho chu trình 0→1→2→0. Thêm một đỉnh cô lập vào tam giác không làm mất khả năng đi hết các cạnh; thêm một cạnh tách rời thì có. Cạnh khuyên đóng góp 2 vào bậc của đỉnh, vì nó dùng một lần ra và một lần vào cùng nút.

```note-visualization
{"id":"euler-check","preset":"normal"}
```

## Hierholzer ghi lại đỉnh khi đã hết cạnh để đi

Bắt đầu tại một đỉnh lẻ nếu có hai đỉnh lẻ, nếu không chọn đỉnh có cạnh. Đẩy nó lên stack. Khi đỉnh trên cùng còn cạnh chưa dùng, đi cạnh đó, đánh dấu ID rồi đẩy đầu kia. Khi không còn cạnh, pop đỉnh vào danh sách kết quả. Cuối cùng đảo danh sách.

Với tam giác, stack lần lượt `0`, `0,1`, `0,1,2`, `0,1,2,0`. Đỉnh 0 ở trên cùng hết cạnh nên đưa vào kết quả, rồi pop 2,1,0. Danh sách pop là `[0,2,1,0]`; đảo lại thành `[0,1,2,0]`. Thứ tự cạnh có thể tạo chu trình khác cùng hợp lệ.

Tại sao ghi khi pop? Một hành trình đang đi có thể quay về một đỉnh còn nhánh chưa dùng. Stack giữ vị trí chèn các vòng phụ tại đỉnh chung; chỉ khi đỉnh hết cạnh mới cố định nó trong thứ tự hoàn tất. Đảo thứ tự hoàn tất chính là ghép các vòng ấy thành một hành trình dùng hết cạnh. Điều kiện bậc bảo đảm không mắc kẹt sai ở một đỉnh trung gian trong phần còn phải nối.

```note-visualization
{"id":"hierholzer","preset":"normal"}
```

Dùng con trỏ vị trí riêng cho adjacency của mỗi đỉnh để không quét lại phần đã xét. Mỗi bản ghi cạnh được bỏ qua hoặc đi qua hữu hạn lần nên `O(V+E)` thời gian, bộ nhớ stack/kết quả `O(E)` ngoài biểu diễn. Với vô hướng, hai bản ghi của cùng cạnh dùng một ID; hai cạnh song song phải có hai ID khác nhau. Đánh dấu cặp đỉnh sẽ làm mất một cạnh thật.

Sau thuật toán có thể kiểm tra số ID đã dùng bằng `E` và số đỉnh kết quả bằng `E+1` khi có cạnh. Đây là kiểm tra quan trọng nếu đầu vào chưa được xác nhận liên thông. Đồ thị không cạnh cần quy ước riêng: trả đường rỗng hay một đỉnh được chọn tùy đề bài, không lấy một đỉnh có cạnh không tồn tại.

## Hamilton cần nhớ những đỉnh đã đi qua

Hai tam giác chỉ chung một đỉnh có mọi bậc chẵn và có chu trình Euler: đi một tam giác rồi đi tam giác kia. Nhưng không có chu trình Hamilton qua toàn bộ: để nối hai phía và quay lại, phải thăm đỉnh chung nhiều hơn một lần. Ví dụ tách rõ “dùng cạnh một lần” và “dùng đỉnh một lần”.

Quay lui Hamilton chọn một đỉnh kề chưa thăm, đánh dấu, đi sâu rồi hoàn tác. Kiểm tra visited giữ điều kiện không lặp đỉnh, nhưng không làm số nhánh nhỏ trong mọi trường hợp; một cận tìm kiếm thô là `O(V!)` với kiểm tra cạnh hằng số theo biểu diễn thích hợp.

Với `V` nhỏ, đặt `dp[mask][v]` là có đường đi dùng đúng tập đỉnh trong `mask` và kết thúc tại `v`. Muốn bắt đầu ở 0, cơ sở chỉ có `dp[1<<0][0]=true`. Từ trạng thái đúng, nối sang `u` chưa có trong mask nếu có cạnh `v-u`, rồi đánh dấu trạng thái `mask|(1<<u),u`. Mỗi bước tăng số bit nên tính theo kích thước tập hoặc thứ tự mask phù hợp.

Có `2^V V` trạng thái, mỗi trạng thái thử `V` đích với ma trận kề, cho `O(2^V V²)` thời gian và `O(2^V V)` bộ nhớ. Muốn chu trình, cố định đỉnh đầu và ở mask đầy đủ còn phải kiểm tra cạnh từ `v` về 0. Muốn xuất đường đi, lưu predecessor hoặc tái dựng từ bảng. Kiểu bitmask phải đủ rộng cho `V` và bộ nhớ thực tế thường giới hạn trước cả độ rộng bit.

```note-visualization
{"id":"hamilton-search","preset":"normal"}
```

Các điều kiện đủ như Dirac có giả định riêng và không phải tiêu chuẩn cần–đủ đơn giản cho Hamilton tổng quát. Bài có trọng số yêu cầu chu trình ngắn nhất qua mọi đỉnh là TSP: thêm mục tiêu tối ưu chi phí lên câu hỏi tồn tại Hamilton, nên cần thuật toán và trạng thái phù hợp, không chỉ kiểm tra bậc.

**Tự kiểm tra:** đường 0-1-2 có chu trình Euler không? Vì sao hai cạnh song song cần ID khác nhau? DP Hamilton bắt đầu ở 0 chấp nhận chu trình lúc nào?

**Giải thích:** có đường Euler mở nhưng không có chu trình vì hai đỉnh lẻ. Hai cạnh là hai lần sử dụng độc lập; cùng ID sẽ đánh dấu nhầm một cạnh chưa đi. Chu trình cần trạng thái mask đầy đủ kết thúc ở `v` và có cạnh `v→0`; chỉ thăm đủ đỉnh mới bảo đảm đường Hamilton, chưa bảo đảm khép vòng.

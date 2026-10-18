---
title: "Đọc và tính độ phức tạp thuật toán"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/complexity"
series: "DSA cơ bản"
seriesOrder: 2
tags: ["big-o", "complexity", "amortized-analysis", "go"]
description: "Hiểu O, Ω, Θ, chọn đúng kích thước đầu vào, đếm vòng lặp và phân biệt worst-case với amortized."
draft: false
updated: 2026-10-15
---

Một cách tìm số lớn nhất phải đọc cả dãy; một cách tìm kiếm trên dãy đã sắp có thể bỏ một nửa sau mỗi bước. Khi dữ liệu tăng từ một nghìn lên một triệu phần tử, hai kiểu tăng chi phí này khác nhau rõ hơn một phép đo trên dữ liệu nhỏ. Phân tích độ phức tạp giúp diễn đạt sự khác nhau đó mà không gắn thuật toán với một CPU cụ thể.

`O(n)` không có nghĩa đúng n mili giây. Nó là một cận theo kích thước đầu vào trong mô hình chi phí đã chọn. Trước khi tính, cần nói n đo thứ gì và thao tác nào được xem là một đơn vị.

## Đặt đúng kích thước và mô hình

Với slice, n thường là số phần tử. Ma trận có r hàng, c cột thì duyệt mọi ô là `O(rc)`; nếu chỉ viết `O(n²)`, người đọc có thể tưởng ma trận bắt buộc vuông. Đồ thị dùng V đỉnh và E cạnh vì hai đại lượng thay đổi độc lập. Với số nguyên x, số bit biểu diễn khoảng `log₂ x`, nên thuật toán chia đôi x có số bước tuyến tính theo số bit nhưng logarithmic theo giá trị x.

Trong mô hình word-RAM, đọc một index hoặc cộng hai số vừa một machine word thường được tính `O(1)`. Nếu dùng số nguyên độ dài tùy ý, phép cộng không còn có chi phí hằng số bất kể số bit. Tương tự, so sánh hay hash một string dài có thể phải đọc nhiều byte. Giả định thao tác cơ bản cần đặt gần công thức để tránh biến một mô hình tiện lợi thành cam kết cho mọi dữ liệu.

```note-visualization
{"id":"linear-count","preset":"normal"}
```

Đếm thao tác như số lượt đọc giúp thấy xu hướng. Nó không bao gồm tự động mọi chi phí cache, cấp phát, hệ điều hành hay I/O; những phần ấy cần mô hình hoặc phép đo riêng khi ảnh hưởng quyết định thực tế.

## Cận trên, cận dưới và cận chặt

Với hàm chi phí T(n), hàm mốc g(n) không âm khi n đủ lớn:

- `T(n)=O(g(n))` nếu tồn tại hằng số dương C và n₀ sao cho `T(n)≤C g(n)` với mọi `n≥n₀`. Đây là cận trên.
- `T(n)=Ω(g(n))` nếu tồn tại c dương và n₀ sao cho `T(n)≥c g(n)` từ n₀ trở đi. Đây là cận dưới.
- `T(n)=Θ(g(n))` nếu cả hai cận cùng đúng. Đây là cận chặt về bậc tăng.

Ví dụ `3n²+5n+7` thuộc `Θ(n²)`: hạng bậc hai chi phối khi n lớn. Viết `O(n³)` vẫn là cận trên đúng nhưng không nói sát mức tăng thực tế bằng `Θ(n²)`. Bỏ hằng số phục vụ so bậc tăng, không có nghĩa hệ số 3 không bao giờ quan trọng khi chạy chương trình.

Cận của một thuật toán khác cận dưới của bài toán. Quét tìm maximum là `Θ(n)`; để nói tối ưu, còn cần lập luận rằng mọi lời giải đúng trong mô hình so sánh phải xem mọi phần tử ở trường hợp xấu. Một phần tử chưa xem có thể lớn hơn maximum hiện tại. Cận dưới ấy giải thích vì sao không thể cải tiến thành logarithmic nếu không thêm cấu trúc hay thông tin đầu vào.

## Best, worst và average là những hàm khác nhau

Tìm tuyến tính một target trên dãy dài n có thể dừng ở phần tử đầu, best-case `Θ(1)`. Nếu target cuối hoặc vắng mặt, worst-case `Θ(n)`. Hai khẳng định không mâu thuẫn vì xét những tập đầu vào khác nhau.

Average-case cần phân bố. Nếu target chắc chắn tồn tại và mỗi vị trí có xác suất bằng nhau, số phần tử đọc trung bình là `(n+1)/2`, vẫn `Θ(n)`. Nếu thường vắng mặt hoặc thường ở đầu, kỳ vọng khác. “Trung bình n/2” mà không nói target được chọn thế nào chưa phải một phân tích đầy đủ. Với hashing, expected thường liên quan đến lựa chọn hàm băm hoặc mô hình phân bố; phải ghi điều kiện ấy.

## Đếm vòng lặp theo số lượt thực sự

Các đoạn sau là mã khung: n không âm, `use` đại diện cho công việc `O(1)` với chữ ký phù hợp ở từng đoạn, không phải hàm đã được cung cấp để chạy chung.

```go
for i := 0; i < n; i++ {       // n lần
    use(i)                     // giả sử use là O(1)
}
// Θ(n)

for i := 0; i < n; i++ {
    for j := 0; j < n; j++ {
        use(i, j)
    }
}
// Θ(n²)

for x := n; x > 1; x /= 2 {
    use(x)
}
// Θ(log n) với n > 1
```

Vòng lồng nhau với hai biên n độc lập có n lần ngoài, mỗi lần n lượt trong, tổng n². Nhưng hình dạng hai chữ `for` chưa đủ kết luận. Nếu vòng trong chạy tới i thì tổng là `0+1+...+(n-1)=n(n-1)/2`, vẫn `Θ(n²)` dù hệ số khác.

```note-visualization
{"id":"nested-loop-count","preset":"normal"}
```

Nếu một con trỏ trong chỉ tiến và không reset, tổng số lần tiến của nó có thể chỉ n trên **toàn hàm**, dù nằm trong vòng ngoài. Khi ấy cần cộng tổng chuyển trạng thái, không nhân n với n theo hình thức. Đây là nguyên nhân nhiều thuật toán hai con trỏ tuyến tính có code lồng vòng.

Hai đoạn nối tiếp cộng chi phí. `Θ(n)+Θ(n²)` thành `Θ(n²)` khi chỉ cần bậc tăng. Với vòng chia x cho 2, sau k bước còn khoảng `n/2^k`; dừng ở 1 khi k xấp xỉ `log₂ n`. Cơ số log khác nhau chỉ đổi hệ số hằng khi cơ số cố định lớn hơn 1.

```note-visualization
{"id":"halving-count","preset":"normal"}
```

Đệ quy cần tính cả số lời gọi và công việc ngoài lời gọi. `T(n)=T(n-1)+Θ(1)` cho `Θ(n)`; merge sort `T(n)=2T(n/2)+Θ(n)` có khoảng log n tầng, mỗi tầng làm tổng công việc tuyến tính nên `Θ(n log n)`. [Bài chia để trị](/vi/notes/data-structures-algorithms/divide-and-conquer/) giải thích cây lời gọi và giới hạn của Master theorem.

## Amortized phân tích một chuỗi thao tác

Giả sử dynamic array có capacity 1, 2, 4, 8,... Khi đầy, tạo array lớn gấp đôi và copy. Để xây n phần tử, số phần tử bị copy qua các lần tăng nằm trong tổng hình học `1+2+4+...<2n`. Cộng n lần ghi phần tử mới, toàn chuỗi vẫn `O(n)`, nên chi phí amortized một append là `O(1)`.

Một append tại đúng lúc đầy vẫn phải copy `O(n)` phần tử. Amortized không phủ nhận lần đắt ấy; nó phân bổ chi phí toàn chuỗi cho số thao tác. Không có giả định input ngẫu nhiên như average-case. Nếu một request bắt buộc độ trễ thấp ở từng lần, cận amortized chưa giải quyết hết yêu cầu đó.

```note-visualization
{"id":"dynamic-capacity","preset":"normal"}
```

Dãy cap nhân đôi ở trên phục vụ chứng minh cho mô hình cụ thể. Go không hứa một hệ số tăng cap cố định ở mọi phiên bản và kích thước; không dùng dãy số này làm output bắt buộc của runtime. Nếu biết kích thước hợp lý, `make([]T,0,n)` dự trù vùng chứa để giảm cấp lại, nhưng chi phí giữ chỗ cũng phải được tính.

## Bộ nhớ tính tại một thời điểm

Hàm cộng dãy giữ vài biến dùng `O(1)` bộ nhớ phụ. Hàm trả một bản sao có kết quả `O(n)` dù phần tính nội bộ ít biến. Vì vậy nên tách bộ nhớ kết quả khỏi bộ nhớ phụ khi so giải pháp.

Đệ quy sâu n giữ `O(n)` stack frame cùng lúc. Merge sort thường dùng buffer `O(n)` cùng stack `O(log n)`, tổng phụ `O(n)`. Quicksort phụ thuộc độ sâu phân hoạch; không được bỏ stack khỏi phân tích chỉ vì phân hoạch tại chỗ. Bộ nhớ đỉnh đồng thời cũng khác tổng lượng cấp phát qua thời gian: buffer tạo rồi bỏ ở nhiều tầng có thể làm tổng cấp phát lớn mà đỉnh không cộng tất cả lần cấp ấy.

| Bậc tăng điển hình | Khi n gấp đôi | Ví dụ trong mô hình phù hợp |
| --- | --- | --- |
| `Θ(1)` | gần như giữ nguyên số bước | đọc index |
| `Θ(log n)` | thêm số bước hằng | binary search |
| `Θ(n)` | gần gấp đôi | quét dãy |
| `Θ(n log n)` | hơn gấp đôi một chút | merge sort thường |
| `Θ(n²)` | gần gấp bốn | mọi cặp |
| `Θ(2ⁿ)` | nhân thêm một hệ số `2ⁿ` | liệt kê mọi tập con |

Bảng dùng cận chặt cho dạng hàm điển hình; một nhãn `O(n²)` lỏng không tự bảo đảm chi phí thực sẽ gấp bốn. Hai thuật toán cùng tuyến tính vẫn có thể khác tốc độ do locality, số phép cấp phát hay chi phí từng bước. Muốn chọn trên workload thật, cần đo phù hợp sau khi đã hiểu bậc tăng.

## Tự kiểm tra

**1.** `i=1; i<n; i*=3` có bao nhiêu lượt? **2.** Duyệt r hàng c cột tốn bao nhiêu? **3.** Vì sao không gọi mọi append là worst-case hằng số?

**Giải thích:** Với n>1 và số học không tràn, i nhận `3^k<n`, nên số lượt là `ceil(log₃ n)`, bậc `Θ(log n)`. Nếu số nguyên hữu hạn tràn trước khi dừng, code phải xử lý riêng; phân tích toán học không sửa lỗi ấy. Duyệt mọi ô tốn `Θ(rc)` khi công việc mỗi ô hằng số. Append có lần cấp/copy tuyến tính; chỉ toàn chuỗi theo mô hình tăng trưởng mới có amortized hằng số. Khi báo kết quả phân tích, ghi cả thời gian, bộ nhớ phụ và việc có sửa input hay không.

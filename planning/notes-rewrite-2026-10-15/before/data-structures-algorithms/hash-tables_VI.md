---
title: "Bảng băm: từ khóa đến ô nhớ và cái giá của va chạm"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/hash-tables"
translationPending: true
series: "DSA cơ bản"
seriesOrder: 8
tags: ["hash-table", "collision", "load-factor", "go"]
description: "Hàm băm, chaining, open addressing, rehash và các giới hạn của O(1) kỳ vọng."
draft: false
---

Một bảng băm biến khóa thành vị trí trong bảng bằng hàm `h(key)`. Nếu hai khóa khác nhau cùng rơi vào một vị trí, ta có **va chạm**. Không thể loại bỏ va chạm khi miền khóa lớn hơn số ô; điều cần thiết là xử lý nó đúng và giữ phân bố đủ tốt. Bảng băm hỗ trợ tìm/thêm/xóa trung bình hoặc kỳ vọng `O(1)` dưới giả định về hàm băm và hệ số tải, nhưng trường hợp xấu nhất có thể là `O(n)`.

## 1. Hợp đồng của hàm băm

Nếu hai khóa bằng nhau theo phép so sánh của bảng, chúng **phải** có cùng hash. Chiều ngược lại không đúng: hash bằng nhau chưa chứng minh khóa bằng nhau, nên luôn cần so sánh khóa thật. Khóa không nên bị thay đổi theo cách làm đổi hash khi đang nằm trong bảng. Trong Go, `map[K]V` yêu cầu `K` comparable; slice không dùng trực tiếp làm khóa. Với dữ liệu phức tạp, có thể chuyển sang chuỗi chuẩn hóa hoặc một struct gồm các trường comparable.

```go
func Frequency(words []string) map[string]int {
    count := make(map[string]int)
    for _, word := range words { count[word]++ }
    return count
}
```

Ví dụ xử lý `n` từ với `O(n)` thời gian kỳ vọng, `O(u)` bộ nhớ cho `u` từ khác nhau. Thứ tự duyệt `map` Go không được đảm bảo; muốn kết quả ổn định, lấy khóa ra slice rồi sắp xếp.

## 2. Chaining và open addressing

**Separate chaining** cho mỗi bucket một danh sách/cấu trúc chứa mọi khóa cùng hash. Với `m` bucket và `n` khóa, hệ số tải `α=n/m`; dưới giả định phân bố đều, độ dài chain kỳ vọng xấp xỉ `α`, nên tra cứu kỳ vọng `O(1+α)`. Ưu điểm là xóa đơn giản; đổi lại có thêm cấp phát và con trỏ.





**Open addressing** giữ khóa ngay trong mảng và thử ô khác khi đụng độ. Linear probing thử các ô liên tiếp; dễ cài và có locality tốt nhưng dễ tạo cụm. Quadratic probing và double hashing thay dãy thử để giảm cụm, với điều kiện phải bảo đảm có thể tìm ô. Khi xóa, không thể luôn đánh dấu ô thành “chưa từng dùng”: việc đó có thể cắt đứt chuỗi tìm kiếm của khóa phía sau. Thường dùng tombstone hoặc tái bố trí theo quy tắc của bảng.



```note-visualization
{"id":"hash-chaining","preset":"normal"}
```



```note-visualization
{"id":"hash-linear-probing","preset":"normal"}
```

## 3. Rehash và chi phí amortized

Khi hệ số tải cao, bảng mới lớn hơn được cấp phát và mọi khóa được hash lại. Một lần rehash `O(n)`, nhưng nếu dung lượng tăng theo hệ số, tổng chi phí qua nhiều lần thêm vẫn `O(n)`; mỗi phép thêm là amortized `O(1)`. Ngưỡng cụ thể phụ thuộc cách xử lý va chạm; không có một số phù hợp mọi thiết kế. Hash tệ hoặc đầu vào cố ý gây va chạm phá hủy kỳ vọng này.



Bảng băm không giữ khóa có thứ tự. Nếu cần “phần tử nhỏ nhất”, truy vấn theo khoảng, hoặc duyệt tăng dần, cây tìm kiếm có thể phù hợp hơn. Nếu chỉ cần kiểm tra thành viên, dùng `map[T]struct{}` diễn đạt một set trong Go.



```note-visualization
{"id":"hash-rehash","preset":"normal"}
```

**Tự luyện:** (1) Với bảng 7 ô và `h(x)=x mod 7`, chèn `10,17,24`; vẽ chain và linear probing. (2) Giải thích tại sao phép xóa bằng ô trống thông thường làm tìm kiếm sai trong linear probing. (3) So sánh `map` với slice đã sắp khi phải trả rất nhiều truy vấn thành viên nhưng dữ liệu không đổi.

*Đối chiếu: Jain, chương 12; Drozdek, chương 10; Lê Minh Hoàng, phần 2 §9.*

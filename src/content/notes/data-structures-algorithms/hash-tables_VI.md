---
title: "Bảng băm: từ khóa đến ô nhớ và cái giá của va chạm"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/hash-tables"
series: "DSA cơ bản"
seriesOrder: 8
tags: ["hash-table", "collision", "load-factor", "go"]
description: "Hàm băm, chaining, open addressing, rehash và các giới hạn của O(1) kỳ vọng."
draft: false
updated: 2026-10-15
---

Bạn đếm số lần xuất hiện của từng từ. Một slice các cặp từ–số lần sẽ phải tìm từ cũ trước mỗi lần tăng; nếu nhiều từ khác nhau, việc tìm có thể lặp lại rất lâu. Bảng băm dùng một hàm từ khóa đến vị trí để thu hẹp nơi cần tìm, rồi vẫn so khóa thật để xác nhận.

Va chạm xảy ra khi hai khóa khác nhau cùng được ánh xạ vào một vùng. Khi miền khóa lớn hơn số ô, va chạm không thể bị loại bỏ hoàn toàn; tính đúng đến từ cách xử lý va chạm, còn tốc độ đến từ phân bố và mức đầy của bảng.

## Hash giống nhau chưa phải khóa giống nhau

Nếu hai khóa bằng nhau theo equality của bảng, chúng phải có cùng hash. Chiều ngược lại không bắt buộc: 10 và 17 cùng dư 3 khi chia 7 nhưng vẫn là hai khóa. Dùng hash để quyết định luôn equality có thể trả sai giá trị hoặc ghi đè bản ghi khác.

Khóa đang ở trong bảng không nên bị thay đổi theo cách làm đổi hash/equality mà bảng không biết, vì lần tìm sau có thể đi đến vùng khác. Trong Go, `map[K]V` yêu cầu K comparable; slice không dùng trực tiếp làm khóa. Một struct chỉ gồm các field comparable có thể dùng làm khóa ghép; chuỗi chuẩn hóa có thể biểu diễn dữ liệu phức tạp, nhưng cần hợp đồng chuẩn hóa nhất quán.

Khai báo hàm Go sau dùng zero value 0 khi chưa có từ để tăng số đếm:

```go
func Frequency(words []string) map[string]int {
    count := make(map[string]int)
    for _, word := range words { count[word]++ }
    return count
}
```

Với `["go","tree","go"]`, trạng thái lần lượt là go:1, thêm tree:1, rồi go:2. Bản thân việc tăng đúng nhờ mỗi khóa có một giá trị đếm; thứ tự duyệt map không được Go bảo đảm. Muốn in kết quả theo thứ tự xác định, lấy khóa vào slice và sort trước.

Nếu coi hash/equality mỗi khóa là O(1), n từ cho expected O(n) thời gian và O(u) mục lưu, u là số từ khác nhau. Với string dài thay đổi, phải tính cả byte được đọc để hash/so sánh và dung lượng khóa: không hứa O(n) bất kể độ dài từ. Dưới mô hình băm phù hợp, thường tính theo tổng độ dài đầu vào cùng số thao tác; va chạm và so khóa có thể thêm chi phí. Đây là điều kiện bị che khuất nếu chỉ đếm số từ.

## Chaining giữ nhiều khóa trong một bucket

Separate chaining cho mỗi bucket một danh sách hoặc cấu trúc chứa khóa rơi vào đó. Với 7 bucket và `h(x)=x mod 7`, chèn 10,17,24 đều vào bucket 3. Muốn tìm 24, đi qua các mục trong chain và so khóa thật. Xóa 17 chỉ cần tháo đúng mục, không thay đường tìm của bucket khác.

```note-visualization
{"id":"hash-chaining","preset":"normal"}
```

Với m bucket, n khóa, load factor `α=n/m`. Dưới giả định phân bố đều, số mục phải xét kỳ vọng liên quan đến α, nên tra cứu expected `O(1+α)` khi hash/equality hằng số. Giữ α bị chặn giúp kỳ vọng hằng số. Nếu mọi khóa vào một chain, tra cứu có thể O(n); tăng bảng mà hash vẫn dồn cùng một nơi chưa tự sửa hết vấn đề.

Chaining dễ xử lý xóa và có thể chứa nhiều mục hơn số bucket, nhưng liên kết/đối tượng con thêm bộ nhớ, cấp phát và truy cập gián tiếp. Cách lưu chain không bắt buộc là linked list; phân tích cụ thể phụ thuộc cấu trúc được chọn.

## Open addressing biến va chạm thành một dãy dò

Open addressing giữ mục ngay trong mảng. Linear probing bắt đầu h(key), thử từng ô kế tiếp theo vòng đến khi tìm thấy khóa hoặc vị trí dừng hợp lệ. Với bảng 7 ô và cùng hash 3, 10 ở ô 3,17 ở 4,24 ở 5. Các ô liên tiếp tận dụng locality nhưng dễ tạo cụm khiến dãy dò dài.

```note-visualization
{"id":"hash-linear-probing","preset":"normal"}
```

Nếu xóa 17 bằng cách đặt ô 4 thành “chưa từng dùng”, tìm 24 bắt đầu ở 3 rồi gặp 4 trống sẽ kết luận không có và bỏ qua 24 ở 5. Tombstone phân biệt “đã xóa, cần dò tiếp” với “chưa dùng, có thể dừng”. Khi thêm, có thể tái sử dụng tombstone theo đúng quy tắc, đồng thời phải kiểm tra không tạo khóa trùng ở vị trí xa hơn.

Quadratic probing và double hashing thay chuỗi vị trí để giảm một số loại cụm. Dãy dò phải có khả năng đi đến ô cần thiết theo lựa chọn kích thước bảng/hàm bước; không mặc định thử công thức bất kỳ sẽ thăm mọi ô. Load factor của open addressing phải kiểm soát trước khi đầy, và nhiều tombstone cũng có thể làm hiệu năng kém dù số mục sống ít.

## Rehash là một lần đắt trong chuỗi thêm

Khi bảng quá đầy theo chính sách của nó, tạo bảng lớn hơn và đặt lại các khóa theo kích thước mới. Vì vị trí phụ thuộc số bucket, không thể chỉ copy nguyên ô cũ rồi coi hợp lệ. Một rehash chạm O(n) mục dưới mô hình khóa hằng số.

```note-visualization
{"id":"hash-rehash","preset":"normal"}
```

Nếu capacity tăng theo hệ số lớn hơn 1, tổng số mục chuyển qua các lần tăng có bậc tuyến tính theo số mục đã thêm. Kết hợp giả định hash tốt và load được giữ phù hợp, ta có expected amortized O(1) cho thêm. Hai từ expected/amortized giải thích hai điều khác nhau: va chạm được phân tích theo kỳ vọng, còn rehash được phân bổ trên chuỗi. Hash tệ hoặc input gây va chạm có thể làm mất kết luận kỳ vọng; rehash không tạo bảo đảm worst-case hằng số từng lần.

Ngưỡng load cụ thể tùy collision scheme và thiết kế; bài không mô tả layout nội bộ của `map` Go như một hợp đồng API. Hash table không giữ khóa có thứ tự. Cần min, khóa kế tiếp hoặc range query thì cây tìm kiếm/dãy đã sắp đáng xem xét. Với set chỉ hỏi hiện diện, `map[T]struct{}` diễn đạt không cần payload riêng.

## Tự kiểm tra

**1.** Vẽ vị trí 10,17,24 trong chaining và linear probing với bảng 7 ô. **2.** Nếu xóa 17, tìm 24 cần đi qua trạng thái gì? **3.** Dữ liệu không đổi nhưng rất nhiều truy vấn thành viên: map hay sorted slice?

**Giải thích:** Chaining đặt cả ba ở bucket 3; linear probing theo thứ tự chèn đặt ở 3,4,5. Ô 4 cần cho phép dò tiếp, chẳng hạn tombstone hoặc một quy trình dồn lại đúng, thay vì trạng thái chưa dùng. Map cho expected lookup nhanh dưới giả định băm, có overhead; sorted slice cần O(n log n) chuẩn bị nếu chưa sắp nhưng binary search worst-case O(log n), bộ nhớ gọn và sẵn thứ tự. Quy mô, khóa dài, nhu cầu thứ tự và bộ nhớ quyết định lựa chọn; không có đáp án duy nhất từ chữ “nhiều”.

Nguồn cho điều kiện ngôn ngữ: [Go specification: map types](https://go.dev/ref/spec#Map_types). Phân tích bảng băm ở đây tách khỏi cam kết cụ thể về runtime Go.

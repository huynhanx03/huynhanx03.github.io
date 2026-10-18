---
title: "Data race và race condition: cần bảo vệ thao tác nào?"
category: "Fundamentals"
tags: ["concurrency", "distributed-systems", "basics"]
description: "Phân biệt lỗi truy cập bộ nhớ với lỗi do các bước nghiệp vụ xen kẽ, qua bộ đếm và tồn kho."
updated: 2026-10-15
translationKey: "fundamentals/concurrency_race"
---

Hai khách cùng mua món hàng cuối. Bạn đã khóa các lệnh đọc và ghi, nhưng vẫn bán được hai đơn. Điều này không mâu thuẫn: bảo vệ từng lần truy cập bộ nhớ chưa chắc bảo vệ được cả quyết định nghiệp vụ.

Bài này tách hai câu hỏi: các truy cập dữ liệu có được đồng bộ đúng không, và toàn bộ thao tác có còn đúng khi sự kiện xen kẽ không? Đây là cách phân biệt data race với race condition. Ví dụ dùng Go, nhưng vấn đề kiểm tra rồi cập nhật cũng xuất hiện giữa nhiều request và nhiều service.

Các đoạn Go là ví dụ riêng: đặt khai báo kiểu và method ở cấp package, các câu lệnh trong `main`, và import `fmt`, `sync` ở nơi sử dụng. Comment chỉ kết quả dự kiến hoặc cảnh báo về code cố ý sai.

## Data race xét quan hệ giữa các truy cập

```go
var count int
var wg sync.WaitGroup
for i := 0; i < 2; i++ {
    wg.Add(1)
    go func() {
        defer wg.Done()
        count++ // Cố ý viết sai: truy cập dữ liệu dùng chung không đồng bộ.
    }()
}
wg.Wait()
fmt.Println(count) // Không nên giả định trước kết quả cụ thể.
```

Hai goroutine cùng truy cập `count`, có thao tác ghi, và không có đồng bộ sắp thứ tự các truy cập đó. Chúng không cần chạy đúng cùng một thời điểm trên hai CPU để thành data race. `count++` cũng không tự trở thành một phép tăng atomic.

`Wait` chỉ giúp main chờ hai goroutine hoàn tất trước khi in; nó chưa sắp thứ tự hai phép tăng với nhau. Muốn sửa, cần bảo vệ cả thao tác tăng bằng cùng mutex, dùng phép tăng atomic thích hợp, hoặc chuyển quyền cập nhật cho một goroutine duy nhất.

Không nên gán mọi hậu quả trong Go bằng cùng câu “undefined behavior như C/C++”. Mô hình bộ nhớ Go quy định trách nhiệm đồng bộ và những giới hạn riêng cho chương trình có race; race trên giá trị nhiều word còn có thể gây trạng thái không nhất quán nguy hiểm. Cách sử dụng đúng là loại bỏ race, không dựa vào một output tình cờ. [Go Memory Model](https://go.dev/ref/mem) giải thích quan hệ happens-before.

## Race condition xét tính đúng của cả thao tác

Giả sử `Available` và `Decrement` đều giữ cùng mutex khi truy cập tồn kho, nhưng mua hàng gọi chúng riêng rẽ. Một lịch chạy có thể là:

| Bước | Request A | Request B | Tồn kho |
| --- | --- | --- | --- |
| 1 | Đọc được 1 rồi nhả khóa | | 1 |
| 2 | | Đọc được 1 rồi nhả khóa | 1 |
| 3 | Trừ 1 dưới khóa | | 0 |
| 4 | | Trừ 1 dưới khóa | -1 |

Mỗi lần truy cập được khóa, nhưng quyết định “còn hàng nên cho mua” dựa vào dữ liệu có thể hết hiệu lực trước khi trừ. Đây là race condition về logic. Lịch trên chỉ là một khả năng hợp lệ, không phải thứ tự luôn xảy ra.

Cần giữ cùng ranh giới bảo vệ cho cả kiểm tra và thay đổi trạng thái:

```go
type Stock struct {
    mu sync.Mutex
    remaining int
}

func (s *Stock) Buy() bool {
    s.mu.Lock()
    defer s.mu.Unlock()
    if s.remaining == 0 {
        return false
    }
    s.remaining--
    return true
}
```

Ví dụ giả định tồn kho ban đầu không âm và mọi đường sửa đều tuân theo cùng cơ chế. Từ tồn kho 1, một lời gọi thành công sẽ làm lời gọi sau thấy 0 và từ chối. Không copy `Stock` sau khi mutex đã được dùng.

Nếu có nhiều process, mutex trong một process không khóa được dữ liệu ở process khác. Khi dữ liệu ở database, có thể dùng cập nhật có điều kiện như `UPDATE ... SET stock = stock - 1 WHERE stock > 0` rồi kiểm tra số dòng ảnh hưởng, hoặc transaction với khóa/isolation phù hợp. Một transaction chỉ bao quanh hai lệnh ở mức isolation bất kỳ chưa tự bảo đảm mọi race nghiệp vụ đều biến mất.

## Chọn công cụ theo ranh giới cần bảo vệ

| Cách làm | Giúp ở đâu | Điều chưa tự giải quyết |
| --- | --- | --- |
| Mutex | Nhóm truy cập dùng chung khóa trong một process | Nhiều process hoặc một chuỗi Get/Set bị tách khóa |
| Atomic | Một thao tác hoặc giao thức atomic được thiết kế đúng | Invariant trên nhiều field một cách tự động |
| Channel và ownership | Sắp thứ tự giao tiếp, giao quyền cập nhật rõ ràng | Pointer đã gửi nhưng hai bên vẫn sửa đồng thời |
| Transaction/conditional update | Bảo vệ thay đổi ở nơi dữ liệu thực sự được quản lý | Tác dụng phụ ngoài database hoặc retry không đúng |
| Idempotency | Hạn chế tác dụng phụ của cùng yêu cầu bị thực hiện lại | Hai yêu cầu khác nhau cùng tranh món hàng cuối |
| Dữ liệu bất biến | Giảm chỗ cần sửa đồng thời | Công bố/thay reference mới và logic nhiều bước |

Đừng áp dụng một công cụ theo tên lỗi mà bỏ qua hợp đồng cần giữ. Đơn vị cần bảo vệ có thể là một biến, nhiều field hoặc cả quyết định nhận đơn.

## Phát hiện được gì, kết luận được gì?

Go có race detector, thường dùng qua `go run -race` hoặc `go test -race` trong môi trường phát triển được hỗ trợ. Đây là hướng dẫn công cụ, không phải kết quả đã chạy cho các snippet trong bài. Detector chỉ quan sát những đường chạy thực sự diễn ra; không thấy cảnh báo không chứng minh chương trình hết race. Nó cũng không tự hiểu quy tắc “không được bán quá số tồn”. [Tài liệu race detector](https://go.dev/doc/articles/race_detector) mô tả cách dùng và giới hạn.

Để tìm race condition logic, hãy viết invariant rồi thử những lịch xen kẽ: ai đọc dữ liệu nào, khóa được giữ đến đâu, thông tin có thể cũ ở bước nào. Stress test có thể giúp lộ lỗi nhưng không thay thế lập luận về ranh giới thao tác.

Không cần dựa vào khẩu hiệu “có data race mà không có race condition” để phân loại mọi chương trình. Thuật ngữ race condition được dùng rộng hẹp khác nhau. Điểm thực dụng cần giữ là **không có data race vẫn chưa đủ bảo đảm logic đồng thời đúng**.

## Tự kiểm tra

Hai lệnh `Load` và `Store` đều atomic. Chuỗi `Load → cộng 1 → Store` đã là một phép tăng atomic chưa?

Chưa. Hai caller có thể cùng Load giá trị cũ và cùng Store một kết quả. Cần phép tăng atomic hoặc giao thức CAS/khóa bảo vệ cả thao tác theo yêu cầu.

Nếu gửi pointer qua channel rồi người gửi tiếp tục sửa đối tượng trong lúc người nhận đọc, đã hết data race chưa? Chưa chắc. Channel sắp thứ tự những sự kiện theo quy tắc đồng bộ, không tự cấm truy cập về sau. Cần quy ước quyền sở hữu hoặc cơ chế bảo vệ phù hợp.

Đọc tiếp [map](/vi/notes/go/maps/) và [ACID](/vi/notes/database/acid/) để áp dụng hai ranh giới trong bộ nhớ và ở database.

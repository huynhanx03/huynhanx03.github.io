---
title: "Stack và heap: vòng đời dữ liệu trước vị trí bộ nhớ"
category: "Operating System"
tags: ["memory", "stack", "heap", "gc", "fundamentals"]
description: "Hiểu frame, allocation, escape analysis và phân mảnh mà không suy hiệu năng hoặc vị trí từ cú pháp."
updated: 2026-10-15
translationKey: "operating-system/stack_vs_heap"
---

Một hàm tạo dữ liệu rồi trả pointer. Hàm đã kết thúc, nhưng caller vẫn sử dụng dữ liệu được. Nếu hiểu “biến cục bộ luôn nằm trên stack và biến mất khi return”, trường hợp này sẽ có vẻ không hợp lệ.

Muốn hiểu bộ nhớ, cần tách nơi viết khai báo, thời gian dữ liệu còn sống và cách compiler/runtime bố trí nó. Stack và heap mô tả những cơ chế quản lý khác nhau; chúng không chia mọi giá trị thành “biến nhỏ” và “đối tượng lớn” theo cú pháp.

## Stack theo dõi các lời gọi đang hoạt động

Khi A gọi B rồi B gọi C, chương trình cần giữ thông tin để C quay về B, rồi B quay về A. Stack frame là mô hình cho trạng thái của một lời gọi: địa chỉ trở về, dữ liệu tạm, tham số hoặc biến cục bộ theo cách compiler tổ chức. Một số giá trị có thể nằm trong register hoặc bị tối ưu bỏ, nên không nên xem sơ đồ frame như bản đồ chính xác cho mọi build.

Cấp và thu hồi frame thường theo LIFO: lời gọi vào sau kết thúc trước. Cơ chế này cho phép nhiều thao tác quản lý rất rẻ, thường chỉ điều chỉnh con trỏ stack. Nhưng tổng chi phí gọi hàm, tăng stack hay khởi tạo dữ liệu không được bảo đảm đều là một thao tác O(1).

Thread thường có stack; Go còn quản lý stack cho từng goroutine. Stack goroutine có thể tăng và di chuyển khi cần. Không suy thành stack của mọi ngôn ngữ/hệ điều hành đều có cùng kích thước ban đầu hoặc tự tăng giống Go.

## Vì sao đệ quy có thể hết stack?

```go
func descend(n int) int {
    if n == 0 {
        return 0
    }
    return 1 + descend(n-1)
}
```

Giả định `n` không âm. Mỗi lời gọi cần chờ lời gọi tiếp theo trả về, nên độ sâu tăng theo n. Có điểm dừng không đồng nghĩa mọi n đều phù hợp; độ sâu rất lớn vẫn có thể vượt giới hạn runtime. Nếu bỏ điều kiện dừng hoặc truyền dữ liệu không tiến đến nó, số frame có thể tăng không kiểm soát.

Biến cục bộ lớn cũng có thể làm tăng nhu cầu bộ nhớ, nhưng trong Go không thể nhìn `var buf [1000000]int` rồi khẳng định chắc chắn nó nằm trên stack và gây tràn. Compiler có thể chọn heap hoặc tối ưu theo ngữ cảnh. Phải đọc quyết định của compiler khi cần phân tích cụ thể.

## Heap cho phép vòng đời không theo thứ tự gọi hàm

```go
func makeCount() *int {
    count := 10
    return &count
}

p := makeCount()
fmt.Println(*p) // 10
```

Go cho phép ví dụ này: dữ liệu phải còn hợp lệ khi caller sử dụng pointer. Heap cung cấp cách quản lý những đối tượng có vòng đời không gắn chặt với việc tháo frame. Đây là khác biệt về vòng đời, không có nghĩa mọi đối tượng heap đều sống lâu hoặc được nhiều goroutine sử dụng.

Heap có thể được tổ chức thành nhiều vùng và size class. Mỗi đối tượng vẫn cần một vùng địa chỉ phù hợp; “heap không liên tiếp” không có nghĩa từng đối tượng gồm các byte rải tùy ý. Allocator có thể dùng fast path thay vì tìm toàn bộ free list ở mỗi lần cấp phát.

Trong Go, GC thu hồi heap object không còn reachable. Ngôn ngữ khác có thể dùng giải phóng tường minh hoặc mô hình khác. Dữ liệu ở heap không tự được đồng bộ, và dữ liệu qua pointer không tự trở nên an toàn để chia sẻ. Vị trí lưu trữ không thay thế quy tắc truy cập.

## Escape analysis quyết định theo cách dữ liệu được dùng

Compiler phân tích dữ liệu có thể còn được dùng ngoài vòng đời phù hợp của frame hay không. Trả địa chỉ biến cục bộ thường là một tình huống liên quan, nhưng inlining có thể làm thay đổi kết quả bố trí. Cú pháp `new(T)` hoặc `&T{}` không bảo đảm heap; biến chỉ dùng trong hàm cũng có thể lên heap vì kích thước hoặc các quyết định compiler khác. [Go FAQ](https://go.dev/doc/faq#stack_or_heap) giải thích vì sao không nên suy nơi cấp phát từ cú pháp.

Để xem quyết định cho một build, có thể dùng:

```sh
go build -gcflags="-m" ./...
```

Kết quả còn phụ thuộc compiler, flags và ngữ cảnh gọi. Giảm allocation có thể giảm công việc của GC, nhưng cố ép mọi giá trị lên stack có thể làm code khó hiểu mà chưa tạo lợi ích đo được. Đầu tiên cần biết workload đang tốn chi phí ở đâu.

## Phân mảnh và phần bộ nhớ chưa được trả lại

Vòng đời heap object khác nhau làm các khoảng trống xuất hiện giữa những vùng còn sống. **External fragmentation** nói đến các khoảng trống khó ghép thành vùng cần cấp; **internal fragmentation** là chỗ thừa bên trong đơn vị cấp phát, chẳng hạn làm tròn theo size class. Tổng bộ nhớ trống không luôn nói được có thể đáp ứng một allocation cụ thể hay không.

LIFO tránh kiểu lỗ trống do giải phóng frame giữa các frame còn hoạt động trong mô hình stack thông thường. Điều đó không có nghĩa stack miễn mọi lãng phí: stack có thể còn capacity chưa dùng, và runtime có các chính sách riêng để thu nhỏ hoặc tái sử dụng.

| Câu hỏi | Stack/frame | Heap |
| --- | --- | --- |
| Vòng đời chính | Gắn với lời gọi đang hoạt động | Có thể độc lập với thứ tự lời gọi |
| Quản lý điển hình | Thêm/bỏ frame theo LIFO | Allocator và cơ chế thu hồi của ngôn ngữ |
| Chi phí cần xét | Độ sâu, kích thước frame, tăng stack | Allocation, số object sống, GC, phân mảnh |
| Chia sẻ an toàn? | Không suy từ vị trí | Không suy từ vị trí |

Để hiểu vì sao heap giảm object sống mà RSS chưa giảm, đọc [garbage collector](/vi/notes/go/garbage_collection/).

## Tự kiểm tra

**Hàm trả pointer tới biến cục bộ có tự tạo dangling pointer trong Go không?** Không. Go giữ dữ liệu hợp lệ theo vòng đời sử dụng; vị trí thực tế còn tùy compiler. Khác biệt với ngôn ngữ khác phải được đọc theo quy tắc của ngôn ngữ đó.

**Heap object có luôn chậm hơn stack value trong mọi chương trình không?** Không có kết luận tổng quát như vậy. Cần xét toàn bộ thao tác, cache, vòng đời, allocation và công việc GC. “Stack thường quản lý rẻ” không phải benchmark cho ứng dụng.

**Muốn chia sẻ pointer giữa goroutine cần biết nó nằm ở đâu là đủ chưa?** Chưa. Cần biết ai đọc/ghi và quan hệ đồng bộ. Xem [data race](/vi/notes/fundamentals/concurrency_race/).

Nguồn đối chiếu: [Go FAQ về stack/heap](https://go.dev/doc/faq#stack_or_heap), [Go GC guide](https://go.dev/doc/gc-guide).

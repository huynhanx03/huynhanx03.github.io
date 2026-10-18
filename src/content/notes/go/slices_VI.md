---
title: "Slice trong Go: hiểu dữ liệu dùng chung và append"
category: "Go"
tags: ["golang", "slices", "arrays", "fundamentals"]
description: "Theo dõi array nền, len và cap để hiểu khi nào slice chia sẻ dữ liệu, append ghi vào đâu và lúc nào cần copy."
updated: 2026-10-15
translationKey: "go/slices"
---

Bạn có một danh sách điểm và muốn lấy hai điểm đầu để chỉnh sửa. Bạn tạo thêm một biến, sửa phần tử của nó, rồi nhận ra danh sách ban đầu cũng thay đổi. Vì sao hai biến khác tên lại ảnh hưởng nhau?

Với slice trong Go, tên biến chưa cho biết dữ liệu có độc lập hay không. Muốn dự đoán đúng kết quả, ta cần theo dõi hai thứ: giá trị slice và array chứa các phần tử phía sau nó.

Bài này đi từ việc chia sẻ dữ liệu đến `append`, sao chép và giữ bộ nhớ. Bạn chỉ cần biết biến, hàm và vòng lặp; nếu chưa quen địa chỉ và pointer, có thể đọc thêm [bài con trỏ](/vi/notes/go/pointers/). Các đoạn code độc lập với nhau: đặt câu lệnh trong `main`, khai báo hàm ở ngoài `main` và thêm import được sử dụng. Kết quả trong comment là kết quả dự kiến theo quy tắc ngôn ngữ.

## Hai biến, một vùng dữ liệu

```go
scores := []int{10, 20, 30, 40}
firstTwo := scores[:2]
firstTwo[0] = 99

fmt.Println(firstTwo) // [99 20]
fmt.Println(scores)   // [99 20 30 40]
```

Cú pháp `scores[:2]` lấy đoạn từ đầu đến trước index 2, tức hai phần tử có index 0 và 1. Đoạn này không sao chép các phần tử sang array khác. `firstTwo[0]` và `scores[0]` đang truy cập cùng một vị trí, nên phép gán qua `firstTwo` cũng được nhìn thấy khi in `scores`.

Array chứa dữ liệu đó được gọi là **array nền**, hay *backing array*. Slice mô tả một đoạn của array nền; nhiều slice có thể mô tả các đoạn chồng lên nhau. Có thêm biến slice chưa đồng nghĩa với có thêm bản sao dữ liệu.

Để thấy vì sao, ta tạm nhìn vào array trước.

## Array giữ phần tử; slice mô tả một đoạn

```go
original := [3]int{10, 20, 30}
other := original
other[0] = 99

fmt.Println(original) // [10 20 30]
fmt.Println(other)    // [99 20 30]
```

`[3]int` là array có ba phần tử kiểu `int`. Số 3 thuộc về kiểu, nên `[3]int` và `[4]int` là hai kiểu khác nhau. Gán array sang biến khác sao chép các phần tử: `other[0]` độc lập với `original[0]` trong ví dụ này.

Với slice, kiểu được viết là `[]int`, không có kích thước trong dấu ngoặc. Có thể hình dung mỗi giá trị slice bằng ba thành phần:

| Thành phần | Ý nghĩa |
| --- | --- |
| Pointer | Xác định điểm bắt đầu trong array nền |
| `len` | Số phần tử hiện có thể truy cập qua slice |
| `cap` | Số phần tử tính từ điểm bắt đầu ấy đến giới hạn array mà slice còn được phép mở rộng tới |

Khi gán slice, Go sao chép giá trị mô tả này; array nền vẫn có thể được dùng chung. Mô hình pointer–len–cap đủ để theo dõi hành vi ở đây, không yêu cầu tự dựng cấu trúc bằng `unsafe`.

Phép sao chép array cũng không tự sao chép sâu mọi thứ: nếu phần tử là slice, map hoặc pointer, các giá trị được sao chép vẫn có thể tham chiếu chung dữ liệu bên trong. Ta sẽ gặp lại điều này khi dùng `copy`.

## Đọc đúng len, cap và các biên

```go
scores := []int{10, 20, 30, 40}
middle := scores[1:3]

fmt.Println(middle)           // [20 30]
fmt.Println(len(middle))      // 2
fmt.Println(cap(middle))      // 3
fmt.Println(middle[:3])       // [20 30 40]
// fmt.Println(middle[2])     // Would panic: index is outside len.
```

`scores[1:3]` bắt đầu ở index 1 và dừng trước index 3. `middle` có hai phần tử, nhưng từ chỗ nó bắt đầu đến cuối array vẫn còn ba vị trí: 20, 30 và 40. Vì thế `len(middle)` bằng 2, còn `cap(middle)` bằng 3.

Một điểm dễ nhầm là **index dựa vào len**, không dựa vào cap. `middle[2]` chưa hợp lệ, dù array phía sau còn phần tử 40. Ta có thể tạo slice dài hơn bằng `middle[:3]` vì biên mới vẫn nằm trong capacity; thao tác này không tự thay đổi `len(middle)` nếu chưa gán lại kết quả.

Với slice, biểu thức `s[low:high]` có độ dài `high-low`; các biên hợp lệ thỏa `0 ≤ low ≤ high ≤ cap(s)`. Đây là lý do reslice có thể đi xa hơn độ dài hiện tại. Truy cập phần tử `s[i]` vẫn cần `0 ≤ i < len(s)`.

## make: có chỗ trống chưa có nghĩa là có phần tử

```go
scores := make([]int, 0, 4)
fmt.Println(len(scores), cap(scores)) // 0 4
// scores[0] = 10                    // Would panic.

scores = append(scores, 10, 20)
fmt.Println(scores) // [10 20]

zeros := make([]int, 2, 4)
fmt.Println(zeros) // [0 0]
```

`make([]int, 0, 4)` tạo slice rỗng có chỗ cho bốn phần tử trước khi cần vượt capacity. Vì độ dài vẫn bằng 0, ta chưa thể gán `scores[0]`. Ở đây, `append` đưa phần tử vào và trả về slice có độ dài mới.

Ngược lại, `make([]int, 2, 4)` đã có hai phần tử truy cập được; chúng được khởi tạo bằng zero value của `int`, tức 0. Nếu dùng `append` ngay trên slice này, giá trị thêm vào nằm sau hai số 0, không thay thế chúng.

Khi biết số phần tử sẽ gán theo index, tạo đúng `len` cần dùng. Khi muốn xây danh sách bằng `append`, thường bắt đầu với `len` bằng 0 và capacity dự kiến hợp lý.

## append ghi vào đâu?

Ta quay lại danh sách điểm. Lần này, dùng capacity rõ ràng để kết quả không phụ thuộc cách runtime chọn kích thước khi mở rộng.

```go
scores := make([]int, 3, 5)
copy(scores, []int{10, 20, 30})
firstTwo := scores[:2]

firstTwo = append(firstTwo, 99)
fmt.Println(firstTwo) // [10 20 99]
fmt.Println(scores)   // [10 20 99]
```

`firstTwo` ban đầu có `len=2`, `cap=5`. Khi thêm 99, capacity vẫn đủ nên `append` dùng lại array nền. Phần tử mới nằm ở index 2 tính từ đầu `firstTwo`, cũng chính là vị trí đang chứa 30 của `scores`. Vì vậy, 30 bị thay bằng 99.

| Thời điểm | `scores` | `firstTwo` | Dữ liệu liên quan trong array chung |
| --- | --- | --- | --- |
| Trước append | len 3, cap 5 | len 2, cap 5 | 10, 20, 30 |
| Sau append | len 3, cap 5 | len 3, cap 5 | 10, 20, 99 |

`append` không biết ta muốn giữ nguyên dữ liệu mà slice khác đang nhìn thấy. Nó chỉ làm việc với slice được truyền vào và capacity của slice đó.

Bây giờ chỉ thay giới hạn capacity, giữ cách thêm phần tử như cũ:

```go
scores := []int{10, 20, 30}
firstTwo := scores[:2:2]
firstTwo = append(firstTwo, 99)

fmt.Println(scores)   // [10 20 30]
fmt.Println(firstTwo) // [10 20 99]
```

Cú pháp ba biên `s[low:high:max]` cho `len=high-low` và `cap=max-low`. Với `scores[:2:2]`, cả len và cap đều bằng 2. Thêm phần tử thứ ba vượt capacity, nên `append` cần array mới rồi sao chép hai phần tử cũ sang. Lần ghi 99 diễn ra ở array mới, không thay 30 trong array cũ.

Nhưng việc giới hạn capacity **chưa tạo bản sao ngay lúc cắt slice**. Nếu gán `firstTwo[0] = 77` trước lần append, `scores[0]` vẫn đổi. Cách này buộc lần append vượt capacity tách vùng nền; nó không ngăn sửa các phần tử đang được chia sẻ. Nếu cần độc lập ngay từ đầu, hãy copy dữ liệu.

## Vì sao hàm phải trả slice sau append?

```go
func addScore(scores []int, value int) []int {
    return append(scores, value)
}

scores := make([]int, 2, 3)
copy(scores, []int{10, 20})
longer := addScore(scores, 30)

fmt.Println(scores)       // [10 20]
fmt.Println(longer)       // [10 20 30]
fmt.Println(scores[:3])   // [10 20 30]
```

Go truyền tham số bằng giá trị. Hàm nhận bản sao của giá trị slice, bao gồm len và cap; bản sao ấy vẫn có thể trỏ tới cùng array với caller. Trong ví dụ, hàm ghi 30 vào array dùng chung, nhưng `len(scores)` ở caller vẫn bằng 2. `longer` giữ slice mà hàm trả về nên có len bằng 3.

Nếu mục tiêu là cập nhật danh sách hiện tại, cách gọi thường là `scores = addScore(scores, 30)`. Giữ kết quả như vậy cũng đúng khi append phải cấp array mới. Chỉ trông chờ tác động lên array cũ sẽ làm hàm có vẻ chạy được khi còn chỗ nhưng sai khi capacity không đủ.

Một hàm chỉ sửa phần tử đã có, chẳng hạn `scores[0] = 99`, có thể làm caller thấy thay đổi mà không trả slice mới. Cần phân biệt sửa dữ liệu nền với thay giá trị slice mà caller đang giữ.

## Copy để có dữ liệu độc lập

```go
scores := []int{10, 20, 30}
independent := make([]int, 2)
copied := copy(independent, scores[:2])
independent[0] = 99

fmt.Println(copied)      // 2
fmt.Println(scores)      // [10 20 30]
fmt.Println(independent) // [99 20]
```

Lần này `make` tạo vùng chứa riêng, rồi `copy` chép phần tử từ nguồn sang đích. Sửa `independent` không làm đổi `scores` vì hai slice không còn dùng chung array.

`copy` trả số phần tử đã chép, bằng giá trị nhỏ hơn giữa độ dài nguồn và đích. Nó không tự tăng len hoặc cấp thêm chỗ cho đích: copy vào nil slice hay slice có len bằng 0 sẽ chép 0 phần tử, dù slice đích có thể còn capacity.

Với `[]int`, sao chép phần tử đủ để sửa các số độc lập. Với `[][]int` hoặc `[]*User`, `copy` chỉ chép các slice hoặc pointer bên trong. Chúng vẫn có thể tham chiếu chung dữ liệu. Cần quyết định độ sâu sao chép theo cấu trúc thật, thay vì mặc định `copy` đã clone toàn bộ đối tượng. [Bài struct](/vi/notes/go/structs/) giải thích cùng vấn đề khi slice nằm trong một field.

## Lọc tại chỗ: dùng lại bộ nhớ cũng là sửa dữ liệu chung

```go
func positiveInPlace(src []int) []int {
    n := 0
    for _, value := range src {
        if value > 0 {
            src[n] = value
            n++
        }
    }
    clear(src[n:])
    return src[:n]
}

values := []int{-1, 2, 0, 3}
alias := values
values = positiveInPlace(values)

fmt.Println(values) // [2 3]
fmt.Println(alias)  // [2 3 0 0]
```

Biến `n` chỉ vị trí ghi tiếp theo. Khi gặp số dương, hàm đưa nó về đầu slice và tăng `n`. Vị trí ghi không vượt vị trí đang đọc, nên phép ghi không làm hỏng phần chưa duyệt. Các số dương giữ nguyên thứ tự tương đối.

Sau vòng lặp, hai số cần giữ nằm ở đầu array. `clear(src[n:])` đưa phần đuôi về zero value; hàm trả slice có len bằng `n`. Caller gán lại vào `values`, còn `alias` vẫn giữ len cũ nên nhìn thấy cả hai số 0 ở đuôi. Đây là lý do API lọc tại chỗ cần nói rõ nó sửa dữ liệu chung.

`clear` có từ Go 1.21. Với `[]int`, nó chỉ xóa giá trị đuôi; khi áp dụng mẫu này cho phần tử có pointer, xóa đuôi còn giúp bỏ các tham chiếu không cần thiết. `clear` không đổi len hoặc cap. Nếu caller cần giữ nguyên dữ liệu đầu vào, hãy tạo slice kết quả riêng thay vì dùng cách lọc này.

## Một slice ngắn có thể giữ array lớn sống

Giả sử một hàm đọc packet lớn rồi chỉ trả vài byte đầu:

```go
func header() []byte {
    packet := make([]byte, 8<<20)
    copy(packet, "HEADER")
    return packet[:6]
}
```

Kết quả chỉ có len bằng 6, nhưng vẫn tham chiếu array 8 MiB. Khi caller còn giữ kết quả, array ấy vẫn có thể truy cập được và chưa trở thành rác để GC thu hồi.

Giới hạn thành `packet[:6:6]` cũng không tách array. Nếu cần giữ header lâu nhưng không cần packet, hãy trả dữ liệu được sao chép:

```go
func headerCopy() []byte {
    packet := make([]byte, 8<<20)
    copy(packet, "HEADER")
    result := make([]byte, 6)
    copy(result, packet[:6])
    return result
}
```

Bây giờ kết quả không giữ array lớn sống. Điều này không bảo đảm RSS của tiến trình giảm ngay sau khi hàm trả: thời điểm GC, allocator và việc trả bộ nhớ cho hệ điều hành còn ảnh hưởng số đo. Xem [bài garbage collector](/vi/notes/go/garbage_collection/) để phân biệt chúng.

Copy có chi phí, nên cân nhắc theo vòng đời sử dụng: giữ vài byte lâu dài khác với dùng chúng tức thời rồi bỏ.

## Nil và rỗng: giống khi duyệt, khác khi biểu diễn

```go
var missing []int
empty := []int{}

fmt.Println(len(missing), len(empty)) // 0 0
fmt.Println(missing == nil)          // true
fmt.Println(empty == nil)            // false

missingJSON, _ := json.Marshal(missing)
emptyJSON, _ := json.Marshal(empty)
fmt.Println(string(missingJSON)) // null
fmt.Println(string(emptyJSON))   // []
```

Cả hai đều duyệt được bằng `range` mà không có lượt lặp nào, và đều dùng được với `append`. Khác biệt là `missing` bằng nil, còn `empty` không bằng nil. Không thể so sánh hai slice với nhau bằng `==`; phép so sánh trực tiếp với nil là trường hợp được phép.

Ví dụ trên cần import `encoding/json` và `fmt`, dùng `json.Marshal` trực tiếp với `[]int` nên bỏ qua error cho hai đầu vào cụ thể này. Khi marshal dữ liệu tổng quát, vẫn phải xử lý lỗi. Với API `encoding/json.Marshal` ở đây, nil slice thành `null`, empty slice thành `[]`. Field có `omitempty` hoặc kiểu tự định nghĩa marshaling có thể có cách biểu diễn khác. Chọn theo hợp đồng API, không dựa vào địa chỉ nội bộ của slice rỗng. [Tài liệu Marshal](https://pkg.go.dev/encoding/json#Marshal) mô tả các quy tắc mã hóa.

## Đọc thêm: địa chỉ, kích thước và tăng capacity

Các chi tiết sau hữu ích khi đọc mã hoặc phân tích hiệu năng; chúng không cần thiết để giải thích việc chia sẻ dữ liệu ở trên.

`&array` trỏ tới cả array, còn `&array[0]` trỏ tới phần tử đầu. Chúng có kiểu khác nhau, dù địa chỉ được in ra có thể trùng:

```go
array := [3]int{10, 20, 30}
fmt.Printf("%T %T\n", &array, &array[0]) // *[3]int *int
```

Array rỗng không có phần tử index 0 để lấy địa chỉ. Trên nhiều kiến trúc 64-bit, phần mô tả slice chiếm ba word; đó là chi tiết biểu diễn, không phải hợp đồng để lưu trực tiếp thành định dạng dữ liệu hay tự dựng bằng `unsafe`.

Khi append vượt capacity, đừng tính chính xác cap tiếp theo chỉ bằng quy tắc “gấp đôi”. Trong [mã runtime được đối chiếu ngày 2026-10-15](https://go.dev/src/runtime/slice.go), `nextslicecap` dùng ngưỡng 256 và chuyển dần sang tăng xấp xỉ 1,25 lần ở slice lớn. Số phần tử cần thêm và việc làm tròn cấp phát cũng ảnh hưởng cap thực tế. Chi tiết này có thể thay đổi theo phiên bản; code ứng dụng nên dựa vào việc capacity mới đủ chứa kết quả, không dựa vào một chuỗi cap cố định.

Nếu biết kích thước đầu vào hợp lý, preallocate có thể giảm những lần phải cấp array khác. Dành quá nhiều chỗ lại tăng bộ nhớ giữ lại. Chỉ tối ưu sau khi xác định nhu cầu và chi phí cần giảm.

## Thử dự đoán trước khi xem giải thích

Không cần nhớ địa chỉ cụ thể. Với mỗi câu, hãy xác định slice nào đang chia sẻ array và len/cap nào quyết định thao tác tiếp theo.

**1. Chỉ thay một giới hạn.** Trong ví dụ append có `scores := make([]int, 3, 5)`, nếu đổi `firstTwo := scores[:2]` thành `firstTwo := scores[:2:2]`, giá trị 30 trong `scores` có bị thay không? Vì sao?

**2. Giữ capacity nhưng bỏ độ dài.** Đoạn dưới chép được bao nhiêu phần tử?

```go
source := []int{10, 20}
destination := make([]int, 0, 2)
n := copy(destination, source)
```

**3. Dùng lại hay giữ nguyên?** Bạn cần lọc số dương nhưng vẫn dùng danh sách gốc để ghi log sau đó. Có nên truyền thẳng danh sách vào `positiveInPlace` không? Hãy đề xuất cách giữ nguyên dữ liệu.

**Giải thích — đọc sau khi đã thử:**

1. Không. `firstTwo` có cap bằng 2, nên thêm phần tử thứ ba cần array khác. Nếu sửa một trong hai phần tử trước append thì vẫn ảnh hưởng array cũ.
2. `n` bằng 0 vì độ dài đích bằng 0. Muốn chép hai phần tử, tạo đích có len bằng 2 hoặc reslice đích tới len bằng 2 trước khi copy.
3. Không nên nếu muốn giữ nguyên dữ liệu. Có thể copy `[]int` rồi lọc bản sao, hoặc xây slice kết quả riêng. Đáp án cần giải thích được phần dữ liệu nào còn chia sẻ và chi phí cấp phát thêm; không bắt buộc cùng một cách triển khai.

Điều cần mang sang các bài tiếp theo là cách theo dõi dữ liệu: slice nào đang giữ mô tả riêng, array nào đang dùng chung và thao tác nào làm thay đổi mỗi thứ. Từ đó có thể suy ra kết quả thay vì học thuộc từng đoạn code.

## Tài liệu đối chiếu

- [Go specification: slices](https://go.dev/ref/spec#Slice_types), [slice expressions](https://go.dev/ref/spec#Slice_expressions), [append và copy](https://go.dev/ref/spec#Appending_and_copying_slices) — đối chiếu quy tắc ngôn ngữ.
- [Go Slices: usage and internals](https://go.dev/blog/slices-intro) — mô hình array nền và cách sử dụng slice; bài viết cũ nên không dùng làm cam kết cho thuật toán tăng cap hiện tại.
- [Runtime slice.go](https://go.dev/src/runtime/slice.go) — chi tiết triển khai; đối chiếu ngày 2026-10-15.
- [encoding/json.Marshal](https://pkg.go.dev/encoding/json#Marshal) — quy tắc biểu diễn nil và empty slice.

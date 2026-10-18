---
title: "Mảng và slice: nền móng của dữ liệu tuyến tính"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/arrays-and-slices"
translationPending: true
series: "DSA cơ bản"
seriesOrder: 4
tags: ["array", "slice", "two-pointers", "prefix-sum", "go"]
description: "Hiểu truy cập liên tục, len/cap, chia sẻ backing array và hai kỹ thuật đầu tiên trên dãy: hai con trỏ, tổng tiền tố."
draft: false
---

Mảng là cách lưu một dãy phần tử cùng kiểu ở các vị trí liên tiếp. Nếu biết địa chỉ đầu và kích thước mỗi phần tử, máy có thể tính địa chỉ của phần tử thứ `i` bằng phép cộng và nhân, nên truy cập chỉ số là `O(1)`. Đây là ưu điểm lớn, nhưng chèn ở giữa phải dời các phần tử phía sau: thời gian `O(n)` trong trường hợp xấu nhất.

Trong Go, `[4]int` là **mảng có độ dài nằm trong kiểu**; `[4]int` và `[5]int` là hai kiểu khác nhau. `[]int` là **slice**: một descriptor gồm con trỏ tới backing array, `len` và `cap`. Slice linh hoạt hơn cho thuật toán, nhưng không có nghĩa mọi thao tác trên nó đều tự động rẻ hoặc độc lập về bộ nhớ.

## 1. `len`, `cap` và alias

```go
base := []int{10, 20, 30, 40}
part := base[1:3] // [20, 30]



part[0] = 99
// base lúc này là [10, 99, 30, 40]
```

`part` không sao chép hai số `20, 30`; nó nhìn vào cùng backing array với `base`. `len(part)` là số phần tử nhìn thấy; `cap(part)` là số phần tử tính từ điểm bắt đầu của `part` đến hết phần backing array có thể dùng. `append(part, x)` có thể ghi vào vùng backing array chung nếu còn capacity, hoặc cấp phát mảng mới nếu không đủ. Không nên dựa vào việc `append` *chắc chắn* giữ hay tách alias; nếu cần một bản độc lập, hãy sao chép rõ ràng:

```go
independent := append([]int(nil), part...)
// hoặc: independent := slices.Clone(part)
```

Khi đọc một lời giải thuật toán, câu hỏi “slice này là view hay copy?” quan trọng ngang với “độ phức tạp là bao nhiêu?”. Một view nhỏ giữ tham chiếu tới backing array rất lớn cũng có thể làm bộ nhớ chưa được giải phóng như ta tưởng.



```note-visualization
{"id":"slice-alias","preset":"normal"}
```

## 2. Bảng chi phí thao tác

| Thao tác trên slice độ dài `n` | Chi phí thường phân tích | Ghi chú |
| --- | --- | --- |
| Đọc/ghi `a[i]` | `O(1)` | cần chỉ số hợp lệ |
| Duyệt hết | `O(n)` | dữ liệu liên tục, locality tốt |
| `append` cuối | amortized `O(1)` | một lần có thể `O(n)` khi cấp phát |
| Chèn/xóa ở đầu hoặc giữa | `O(n)` | phải dịch phần tử |
| Tìm giá trị bất kỳ | `O(n)` | nếu chưa sắp xếp hoặc chưa có chỉ mục |
| Sao chép dãy | `O(n)` thời gian và bộ nhớ | tạo vùng lưu mới |

Với bài cần thêm vào cuối rất nhiều lần, có thể dùng `make([]int, 0, expected)` để dự trù capacity. Với bài cần xóa đầu liên tục, `a = a[1:]` là `O(1)` về thao tác slice nhưng không tự giải quyết vấn đề backing array còn giữ bộ nhớ; một queue dài hạn thường cần thiết kế `head` và cơ chế nén hoặc ring buffer.

## 3. Hai con trỏ: mỗi phần tử được nhìn ít lần

Cho dãy **đã sắp tăng** và một `target`. Ta muốn biết có hai phần tử ở hai chỉ số khác nhau có tổng bằng `target` không. Đặt `left` ở đầu, `right` ở cuối. Nếu tổng quá nhỏ, tăng `left`; nếu quá lớn, giảm `right`.



```go
func HasPairSum(sorted []int, target int) bool {
    left, right := 0, len(sorted)-1
    for left < right {
        sum := sorted[left] + sorted[right]
        switch {
        case sum == target:
            return true
        case sum < target:
            left++
        default:
            right--
        }
    }
    return false
}
```

Tại sao được bỏ qua một phía? Nếu `sorted[left] + sorted[right] < target`, giữ nguyên `left` mà đổi `right` sang một chỉ số nhỏ hơn chỉ làm tổng không lớn hơn. Vậy `left` hiện tại không thể ghép với bất kỳ phần tử nào trong đoạn đang xét; ta tăng nó. Lập luận đối xứng cho trường hợp tổng quá lớn. Mỗi vòng lặp thu hẹp khoảng ít nhất một vị trí, nên thời gian `O(n)`, bộ nhớ phụ `O(1)`. Điều kiện **đã sắp xếp** là một phần hợp đồng; bỏ nó đi thì chứng minh trên không còn đúng.

Trong code production, nếu giá trị có thể gần giới hạn `int`, phép cộng `a+b` có nguy cơ tràn số; khi đó phải chọn kiểu rộng hơn hoặc so sánh theo cách không tràn. Ví dụ ở đây tập trung vào bất biến hai con trỏ và giả sử tổng nằm trong miền `int`.



```note-visualization
{"id":"two-pointers","preset":"normal"}
```

## 4. Tổng tiền tố: đổi truy vấn đoạn thành phép trừ

Nếu cần trả nhiều câu hỏi “tổng các phần tử từ `l` đến `r`, bao gồm hai đầu”, ta tạo `prefix[0] = 0` và `prefix[i+1] = prefix[i] + a[i]`. Khi đó:



`sum(l, r) = prefix[r+1] - prefix[l]`.

```go
func PrefixSums(a []int64) []int64 {
    prefix := make([]int64, len(a)+1)
    for i, x := range a {
        prefix[i+1] = prefix[i] + x
    }
    return prefix
}

func RangeSum(prefix []int64, left, right int) int64 {
    return prefix[right+1] - prefix[left]
}
```

Với `a = [3, -2, 5, 1]`, `prefix = [0, 3, 1, 6, 7]`; tổng đoạn chỉ số `1..2` là `prefix[3]-prefix[1] = 6-3 = 3`. Tiền xử lý tốn `O(n)` thời gian và bộ nhớ, mỗi truy vấn hợp lệ tốn `O(1)`. Hàm minh họa giả sử `0 ≤ left ≤ right < len(a)`; API thật nên kiểm tra biên hoặc ghi rõ tiền điều kiện. `int64` giảm rủi ro tràn so với `int` 32-bit, nhưng tổng vẫn có thể tràn nếu dữ liệu vượt miền `int64`.



```note-visualization
{"id":"prefix-sum","preset":"normal"}
```

## 5. Chuỗi Go không phải slice ký tự Unicode

`string` trong Go là dãy byte bất biến, thường chứa UTF-8. `len("Việt")` trả số **byte**, không phải số ký tự người đọc nhìn thấy. `s[i]` lấy byte thứ `i`; `for range` giải mã từng Unicode code point (`rune`). Ngay cả số rune cũng có thể khác số grapheme hiển thị vì dấu kết hợp. Thuật toán chuỗi phải nói rõ nó làm việc trên byte, rune hay grapheme. Với dữ liệu ASCII của nhiều bài tập, byte là đủ; với tiếng Việt, đừng áp dụng im lặng cùng giả định.





```note-visualization
{"id":"utf8-bytes-runes","preset":"normal"}
```

**Tự luyện:** (1) Viết hàm đảo slice `int` tại chỗ bằng hai con trỏ. (2) Tính tổng của mọi đoạn độ dài cố định `k`: so sánh tổng tiền tố với sliding window. (3) Tìm ví dụ `part := base[1:2]` rồi `append(part, x)` làm `base` thay đổi; sau đó tạo một bản copy để kết quả không phụ thuộc capacity.

*Đọc thêm trong bộ sách: Hemant Jain, chương 1 và 4; Adam Drozdek, chương 1; Lê Minh Hoàng, phần 2 §4. Note [Slices trong Go](/vi/notes/go/slices/) giải thích thêm về ngôn ngữ.*

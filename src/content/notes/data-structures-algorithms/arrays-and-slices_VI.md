---
title: "Mảng và slice: nền móng của dữ liệu tuyến tính"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/arrays-and-slices"
series: "DSA cơ bản"
seriesOrder: 4
tags: ["array", "slice", "two-pointers", "prefix-sum", "go"]
description: "Hiểu truy cập liên tục, len/cap, chia sẻ backing array và hai kỹ thuật đầu tiên trên dãy: hai con trỏ, tổng tiền tố."
draft: false
updated: 2026-10-15
---

Một dãy điểm cần đọc phần tử thứ 100, thêm điểm cuối và đôi lúc lấy một đoạn để xử lý. Cả ba thao tác đều dùng được với slice, nhưng chi phí và quan hệ chia sẻ bộ nhớ khác nhau. Đọc index không cần đi qua 100 phần tử trước; lấy đoạn không tự sao chép; thêm cuối đôi khi phải chuyển dữ liệu sang array khác.

Bài này nối cách lưu liên tục với chi phí thuật toán, rồi dùng hai con trỏ và tổng tiền tố để tận dụng cấu trúc dãy. Các đoạn Go là ví dụ độc lập; khai báo hàm ngoài `main`, câu lệnh trong hàm và import theo phần sử dụng. Code minh họa giả định các điều kiện miền giá trị được nêu gần từng ví dụ.

## Array giữ phần tử, slice mô tả một vùng

Mảng đặt các phần tử cùng kiểu ở các vị trí liên tiếp. Trong mô hình truy cập bộ nhớ thông thường, địa chỉ phần tử `i` được tính từ địa chỉ đầu cộng `i × kích thước phần tử`, nên đọc/ghi index hợp lệ là `O(1)`. Chèn giữa lại phải dịch phần đuôi để dành chỗ, có thể `O(n)`.

Trong Go, `[4]int` có độ dài thuộc về kiểu; `[5]int` là kiểu khác. Slice `[]int` linh hoạt về độ dài, có thể hình dung bằng pointer đến backing array, len và cap. Gán array sao chép các phần tử; gán slice sao chép phần mô tả, nên dữ liệu nền có thể vẫn chung.

```go
base := []int{10, 20, 30, 40}
part := base[1:3] // [20, 30]



part[0] = 99
// base lúc này là [10, 99, 30, 40]
```

Ở đây `part` bắt đầu tại phần tử index 1 của `base`. Len bằng 2 vì có 20, 30; cap bằng 3 vì từ điểm bắt đầu đến cuối array còn ba ô. `part[0]` và `base[1]` là cùng ô, nên ghi 99 qua một bên được thấy ở bên kia.

Nếu `part` hiện là `[99,30]`, `append(part, 7)` vừa trong cap 3 và ghi vào vị trí tương ứng `base[3]`, thay 40. `append` trả một slice có len mới; len của biến `base` không bị tăng theo. Nếu thêm vượt cap thì cần array mới và chép phần tử. Cần phân tích capacity cụ thể thay vì đoán mọi append đều tách hay đều dùng lại.

```go
independent := append([]int(nil), part...)
// hoặc: independent := slices.Clone(part)
```

Dòng đầu tạo slice số nguyên có vùng chứa độc lập rồi chép phần tử. Cách viết `slices.Clone` trong comment cần import `slices` và phiên bản có package ấy (Go 1.21 trở lên). Với `[]int`, copy phần tử đủ để tách dữ liệu; phần tử là pointer/map/slice còn có thể chia sẻ dữ liệu bên trong. Một view ngắn giữ array lớn sống, kể cả khi giới hạn cap của view. [Bài slice](/vi/notes/go/slices/) theo dõi chi tiết các trường hợp này.

```note-visualization
{"id":"slice-alias","preset":"normal"}
```

## Giá của những thao tác quen thuộc

| Thao tác trên `n` phần tử | Chi phí | Điều kiện cần hiểu |
| --- | --- | --- |
| Đọc/ghi `a[i]` | `O(1)` | index trong len |
| Duyệt hết | `O(n)` | locality thường tốt do lưu liên tục |
| Append cuối | amortized `O(1)` theo mô hình tăng capacity | một lần cấp và copy có thể `O(n)` |
| Chèn/xóa giữ thứ tự ở đầu/giữa | `O(n)` | cần dịch phần tử |
| Tìm một giá trị khi chưa có thứ tự/chỉ mục | `O(n)` | có thể phải xem hết |
| Tạo bản sao độc lập của dãy | `O(n)` thời gian và bộ nhớ | không phải chỉ reslice |

`make([]int, 0, expected)` dự trù chỗ khi biết quy mô phù hợp; nó chưa tạo các phần tử truy cập được theo index vì len vẫn 0. Rút đầu bằng `a=a[1:]` là `O(1)` đối với phần mô tả slice, nhưng không trả lại ngay array nền. Queue lâu dài thường cần head kèm cơ chế nén hoặc ring buffer để kiểm soát vùng được giữ.

## Hai con trỏ tìm một cặp tổng

Cho dãy **đã sắp không giảm**, cần hai chỉ số khác nhau có tổng bằng target. Đặt left đầu và right cuối. Ta không thử mọi cặp: mỗi so sánh phải cho phép loại một đầu mà không bỏ mất nghiệm.

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

Với `[1,2,4,7,11]`, target 9: cặp đầu 1+11=12 quá lớn nên bỏ 11; 1+7=8 quá nhỏ nên bỏ 1; 2+7=9 là nghiệm. Vì left nhỏ hơn right, không dùng cùng một phần tử hai lần. Hai giá trị bằng nhau vẫn có thể tạo nghiệm nếu ở hai index khác nhau.

Khi tổng nhỏ hơn target, mọi số bên trái right đều không lớn hơn `sorted[right]`. Giữ left mà thay right bằng số nhỏ hơn không thể đạt target, nên left hiện tại không thuộc nghiệm nào còn lại. Khi tổng lớn hơn, lập luận đối xứng loại right. Bất biến là: nếu có nghiệm chưa tìm được, còn một nghiệm trong đoạn đang xét. Đoạn giảm ít nhất một ô mỗi lượt, nên kết thúc sau `O(n)` bước, dùng `O(1)` bộ nhớ phụ.

Dãy rỗng hoặc một phần tử cho left không nhỏ hơn right và trả false. Nếu bỏ điều kiện đã sắp, việc loại đầu không có cơ sở. Nếu phải tự sort trước, tính thêm chi phí sắp và tác động sửa dữ liệu. Phép cộng trong code giả định không tràn `int`; dữ liệu gần giới hạn cần cách biểu diễn hoặc so sánh tránh tràn phù hợp.

```note-visualization
{"id":"two-pointers","preset":"normal"}
```

## Tổng tiền tố trả nhiều truy vấn đoạn

Nếu liên tục cộng lại từng đoạn, một truy vấn dài có thể đọc `O(n)` phần tử. Với dãy không đổi, ta trả trước chi phí xây bảng. Đặt `prefix[0]=0`, và `prefix[i+1]` là tổng các phần tử trước vị trí `i+1`. Khi đó tổng đoạn đóng `l..r` bằng `prefix[r+1]-prefix[l]`: tổng tới hết r trừ đi phần đứng trước l.

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

Ví dụ `a=[3,-2,5,1]` tạo prefix `[0,3,1,6,7]`. Tổng đoạn `1..2` là `6-3=3`, đúng bằng `-2+5`. Prefix có thêm một ô 0 để đoạn bắt đầu ở index 0 dùng cùng công thức, không cần nhánh riêng.

Xây bảng tốn `O(n)` thời gian và bộ nhớ; mỗi truy vấn hợp lệ `O(1)`. `RangeSum` giả định bảng được xây đúng và `0 ≤ left ≤ right < len(a)`; không tự kiểm tra biên. `int64` vẫn có thể tràn nếu tổng vượt miền biểu diễn, dù rộng hơn `int` trên kiến trúc 32-bit. Nếu a đổi, bảng cũ không tự đổi; đó là lúc cần cập nhật bảng hoặc [Fenwick/segment tree](/vi/notes/data-structures-algorithms/segment-fenwick-trees/).

```note-visualization
{"id":"prefix-sum","preset":"normal"}
```

## Chuỗi cần nói rõ đơn vị phần tử

String Go là dãy byte bất biến, thường chứa UTF-8. `len("Việt")` đếm byte, `s[i]` lấy byte; `range` giải mã code point thành rune. Một grapheme người dùng nhìn thấy có thể gồm nhiều rune, như dấu kết hợp. Vì vậy đảo byte của tiếng Việt có thể làm hỏng UTF-8; đảo rune vẫn chưa bảo đảm giữ từng grapheme. Bài tập ASCII có thể dùng byte, nhưng thuật toán phải ghi rõ giả định ấy.

```note-visualization
{"id":"utf8-bytes-runes","preset":"normal"}
```

## Tự giải rồi xem cách đối chiếu

**1. Đảo slice int tại chỗ:** cần bất biến nào? **2.** Với mọi đoạn độ dài k, chọn tổng tiền tố hay sliding window? **3.** Làm sao chắc append vào một đoạn không đổi base?

**Giải thích:** Đảo bằng hai index ở hai đầu, đổi chỗ rồi tiến vào. Ngoài đoạn đang xét, các cặp đối xứng đã ở vị trí cuối cùng; dừng khi hai index gặp hoặc vượt nhau. Thời gian `O(n)`, bộ nhớ `O(1)`, rỗng cũng hợp lệ. Với `1≤k≤n`, sliding window tính cửa sổ đầu rồi trừ phần ra, cộng phần vào, dùng `O(n)` thời gian và `O(1)` bộ nhớ phụ; prefix dùng `O(n)` bộ nhớ nhưng tiện nếu sau đó hỏi nhiều đoạn khác độ dài. Muốn dữ liệu của đoạn độc lập ngay, copy trước khi sửa/append; giới hạn cap chỉ buộc append vượt cap tạo array mới, chưa tách các phần tử đang có.

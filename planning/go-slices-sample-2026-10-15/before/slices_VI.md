---
title: "Slice và array: chia sẻ bộ nhớ, len, cap và append"
category: "Go"
tags: ["golang", "slices", "arrays", "fundamentals"]
description: "Array chứa các phần tử; slice mô tả một vùng của array nền. Phân biệt hai thứ này giúp giải thích vì sao sửa một slice có thể ảnh hưởng slice khác và vì sao append phải trả về slice mới."
updated: 2026-10-14
translationKey: "go/slices"
---

Array chứa các phần tử; slice mô tả một vùng của array nền. Phân biệt hai thứ này giúp giải thích vì sao sửa một slice có thể ảnh hưởng slice khác và vì sao append phải trả về slice mới.

## 1. Array có kích thước trong kiểu

```go
a := [3]int{10, 20, 30}
b := a
b[0] = 99
fmt.Println(a, b) // [10 20 30] [99 20 30]

whole := &a
first := &a[0]
fmt.Printf("%T %T\n", whole, first) // *[3]int *int
```

`[3]int` và `[4]int` khác kiểu. Gán array sao chép toàn bộ phần tử, nhưng phần tử là pointer/slice/map vẫn có thể giữ tham chiếu dùng chung. &a trỏ tới toàn array, &a[0] trỏ tới phần tử đầu: kiểu và thao tác hợp lệ khác nhau, dù địa chỉ in ra có thể trùng. Array rỗng không có phần tử số 0.

## 2. Mô hình ba thành phần của slice

Có thể hình dung slice là `(pointer, len, cap)`: pointer tới vùng nền, len là số phần tử hiện truy cập được, cap là số phần tử từ đầu slice tới cuối vùng có thể reslice. Đây là mô hình giải thích, không phải cấu trúc bạn cần dựng bằng unsafe. Trên nhiều kiến trúc 64-bit descriptor chiếm ba word, nhưng không dùng một con số này làm hợp đồng dữ liệu ngoài Go.

```go
nums := []int{10, 20, 30, 40}
sub := nums[1:3]
fmt.Println(len(sub), cap(sub)) // 2 3
sub[0] = 99
fmt.Println(nums) // [10 99 30 40]
```

Biên [low:high) lấy low, bỏ high. Sub bắt đầu ở nums[1], nên sub[0] chính là cùng phần tử đó. Gán sub sang biến khác hoặc truyền vào hàm chỉ sao chép descriptor, không sao chép array nền.

## 3. make và append thay đổi gì?

```go
s := make([]int, 0, 3)
s = append(s, 10, 20)
t := s
t = append(t, 30)
fmt.Println(len(s), len(t)) // 2 3
fmt.Println(s[:3]) // [10 20 30]
```

Make với len 0, cap 3 dành sẵn chỗ nhưng chưa tạo phần tử truy cập bằng s[0]. Append trả descriptor mới: caller phải dùng kết quả. Khi còn capacity, append có thể ghi vào array dùng chung; khi thiếu, nó cấp array lớn hơn và copy dữ liệu. Append trong hàm không tự đổi len của slice ở caller, dù nó có thể sửa vùng nền.

Runtime thường tăng cap nhanh cho slice nhỏ rồi tăng chậm hơn cho slice lớn. Trong một số phiên bản, ngưỡng chuyển là 256 và tốc độ tăng dần tiến về 1.25×; số phần tử thêm và làm tròn size class còn ảnh hưởng kết quả. Đây không phải quy tắc ngôn ngữ hay cam kết cap luôn gấp đôi. Preallocate khi biết kích thước hợp lý, tránh dành quá nhiều bộ nhớ chỉ để giảm allocation.

## 4. Giới hạn cap không phải copy

```go
a := []int{1, 2, 3}
limited := a[:2:2]
limited = append(limited, 9)
fmt.Println(a, limited) // [1 2 3] [1 2 9]
```

Cú pháp [low:high:max] tạo len=high-low, cap=max-low. Append trong ví dụ phải cấp vùng nền mới vì cap đã hết. Nhưng trước append, limited[0]=7 vẫn sửa a[0]: full slice expression không tạo sự cô lập cho các phần tử đã có.

## 5. Copy và lọc tại chỗ

```go
clone := make([]int, len(a))
copy(clone, a)

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
```

Copy trả số phần tử đã chép, bằng min độ dài nguồn/đích; copy vào nil slice không tự cấp chỗ. Copy là shallow copy nếu phần tử chứa tham chiếu. Lọc tại chỗ thay đổi vùng nền và có thể làm alias thấy dữ liệu khác; caller cần gán lại slice trả về. Clear phần đuôi giúp loại tham chiếu không cần thiết khi áp dụng mẫu này cho pointer/object. Clear có từ Go 1.21.

## 6. Giữ bộ nhớ, nil và empty

Giữ một subslice nhỏ có thể giữ cả backing array lớn reachable. Nếu chỉ cần vùng nhỏ lâu dài, copy nó sang array mới và bỏ các tham chiếu tới array cũ. Đây là retention, không phải GC quên thu hồi rác.

Nil slice và empty non-nil slice đều có len 0, dùng range/append được. Chỉ nil slice thỏa s==nil; slice không so sánh với slice khác bằng ==. Với encoding/json truyền thống, nil thường thành null và empty thành []; omitempty/custom marshaler có thể thay đổi kết quả. Không dựa vào chi tiết zerobase để phân biệt chúng.

## Ví dụ áp dụng

### Tình huống: append làm thay đổi phần tử mà slice khác nhìn thấy

Dùng capacity rõ ràng để theo dõi bộ nhớ nền. Ví dụ không dựa vào quy tắc runtime chọn capacity khi tăng kích thước.

```go
base := make([]int, 3, 5)
copy(base, []int{10, 20, 30})
left := base[:2]
left = append(left, 99)
fmt.Println(base) // [10 20 99]

isolated := base[:2:2]
isolated = append(isolated, 77)
fmt.Println(base)     // [10 20 99]
fmt.Println(isolated) // [10 20 77]
```

| Bước | len/cap của slice đang thao tác | Điều xảy ra |
| --- | --- | --- |
| base[:2] | 2/5 | Còn chỗ trong cùng array |
| append(left, 99) | 3/5 | Ghi 99 vào vị trí index 2 của array chung |
| base[:2:2] | 2/2 | Giới hạn capacity ở 2 |
| append(isolated, 77) | len bằng 3, cap ít nhất 3 | Cần array mới vì vượt capacity |

Full slice expression không lập tức sao chép hai phần tử đầu: trước append, isolated vẫn chia sẻ chúng với base. Nó chỉ buộc append vượt capacity phải chuyển sang array khác. Nếu cần độc lập ngay từ đầu, hãy clone/copy dữ liệu.

## Tự kiểm tra

Giải thích output của ví dụ append qua alias. Full slice expression ngăn thao tác nào, và không ngăn thao tác nào?

## Tài liệu đối chiếu

- [Go language specification](https://go.dev/ref/spec)
- [Slices: usage and internals](https://go.dev/blog/slices-intro)

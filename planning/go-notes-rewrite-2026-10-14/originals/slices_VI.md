---
title: "Slices"
category: "Go"
tags: ["golang", "slices", "arrays", "fundamentals"]
---

# Slices: Những mảng linh hoạt

Trong Go, chúng ta có hai khái niệm: **Arrays** (Mảng) và **Slices** (Cắt lát). Trong thực tế, 99% thời gian bạn sẽ làm việc với Slices. Tại sao lại như vậy? Vì Array trong Go có kích thước cố định, còn Slice thì cực kỳ linh hoạt và mạnh mẽ.

## 1. Mảng (Array) vs Cắt lát (Slice): Sự khác biệt

-   **Array**: `[5]int` (Luôn cố định 5 phần tử, không thể mở rộng hay thu hẹp).
-   **Slice**: `[]int` (Có khả năng tự động co giãn kích thước tùy theo nhu cầu).

> Trong Go, kích thước là một phần không thể tách rời của kiểu dữ liệu Mảng. `[5]int` và `[10]int` được coi là hai kiểu dữ liệu hoàn toàn khác nhau.

### Địa chỉ của Mảng vs Địa chỉ phần tử đầu tiên
Mặc dù về mặt giá trị vật lý, hai địa chỉ này thường giống nhau, nhưng chúng mang ý nghĩa hoàn toàn khác nhau trong hệ thống kiểu của Go:
-   **`&arr`**: Là con trỏ trỏ tới **toàn bộ mảng** (kiểu `*[N]T`).
-   **`&arr[0]`**: Là con trỏ trỏ tới **duy nhất phần tử đầu tiên** (kiểu `*T`).

Hiểu rõ điều này giúp bạn tránh nhầm lẫn khi làm việc với Pointer và các hàm yêu cầu kiểu dữ liệu chính xác.

## 2. Cơ chế vận hành của Slice (Sức mạnh ẩn giấu)

Thực chất, một Slice không trực tiếp chứa dữ liệu. Nó đóng vai trò như một **Descriptor** (Mô tả) trỏ tới một Mảng nền tảng (**Underlying Array**) bên dưới. Một Slice bao gồm 3 thành phần chính:
1.  **Pointer (Con trỏ)**: Trỏ tới phần tử đầu tiên của Mảng mà nó quản lý.
2.  **Length (Độ dài)**: Số lượng phần tử hiện đang có trong Slice.
3.  **Capacity (Sức chứa)**: Số lượng phần tử tối đa mà nó có thể chứa trước khi cần phải cấp phát một Mảng mới.
### Hệ quả của việc sao chép Descriptor (Header)
Khi bạn truyền một Slice vào một hàm, Go thực hiện **Value Copy** cấu trúc Descriptor này (bao gồm con trỏ, độ dài, sức chứa).
-   **Thay đổi giá trị**: Vì con trỏ `Data` vẫn trỏ tới cùng một mảng nền tảng, các thay đổi phần tử bên trong hàm **sẽ phản ánh ra bên ngoài**.
-   **Thay đổi cấu trúc (Append)**: Nếu bạn dùng `append` bên trong hàm, nó chỉ cập nhật `Length` hoặc `Capacity` trên **bản sao** của Descriptor. Descriptor bản gốc ở hàm gọi vẫn giữ nguyên giá trị cũ. Đây là lý do tại sao bạn luôn thấy cú pháp: `s = append(s, ...)`.

### Cơ chế mở rộng dung lượng
Hàm `append` tự động quản lý việc mở rộng bộ nhớ khi Slice chạm ngưỡng giới hạn (`Len == Cap`):

1.  **Cấp phát tài nguyên**: Go tính toán sức chứa mới (Capacity) để cân bằng giữa tốc độ và tiết kiệm RAM.
    -   Nếu `Cap < 256`: Thường sẽ **gấp đôi** (2x) sức chứa.
    -   Nếu `Cap >= 256`: Go sử dụng công thức tăng trưởng mượt mà hơn (tiệm cận mức **1.25x**) để tránh việc phình to bộ nhớ quá đột ngột ở các Slice lớn.
2.  **Sao chép dữ liệu**: Go tạo một mảng nền tảng mới, sử dụng hàm `memmove` để copy dữ liệu từ mảng cũ sang.
3.  **Thu hồi**: Mảng cũ sau đó sẽ được Garbage Collector (GC) thu hồi nếu không còn ai trỏ tới.

> Luôn ưu tiên dùng `make([]T, len, cap)` nếu bạn đã biết trước số lượng phần tử dự kiến. Việc này giúp loại bỏ hoàn toàn các bước cấp phát lại và sao chép dữ liệu tốn kém.

## 3. Các thao tác căn bản

### Khởi tạo Slice
```go
// Sử dụng hàm make để cấp phát bộ nhớ trước
s := make([]string, 3, 5) // Độ dài là 3, Sức chứa là 5

// Hoặc khởi tạo trực tiếp kèm giá trị
nums := []int{1, 2, 3}
```

### Kỹ thuật Slicing (Cắt lát)
Bạn có thể tạo ra một Slice mới từ một Slice hoặc Mảng có sẵn cực nhanh mà không cần sao chép lại dữ liệu (vì chúng sẽ dùng chung Mảng nền tảng bên dưới).

```go
sub := nums[1:3] // Trích xuất từ chỉ số 1 đến 2 (không bao gồm index 3)
```

### Full slice expression (Cú pháp 3 tham số)
Cú pháp `a[low : high : max]` cho phép bạn kiểm soát chính xác sức chứa của Slice mới tạo ra.
- **`max`**: Giới hạn `Cap` của Slice con. 
- **Lợi ích**: Ngăn chặn rủi ro Slice con vô tình `append` làm ghi đè dữ liệu của Slice cha khi chúng vẫn dùng chung mảng nền tảng.

### In-place Slice (Thao tác trên chính vùng nhớ)
Đây là kỹ thuật tối ưu RAM bậc cao, giúp thực hiện các thao tác như Filter (lọc) mà không cần tạo Slice mới:

```go
func Filter(src []int) []int {
    n := 0
    for _, x := range src {
        if x > 0 {
            src[n] = x // Tận dụng lại mảng nền tảng của chính nó
            n++
        }
    }
    return src[:n]
}
```

## 4. Những "cạm bẫy" thường gặp

Vì Slices dùng chung Mảng nền tảng, nên nếu bạn thay đổi giá trị trong `sub`, Slice `nums` ban đầu cũng sẽ bị ảnh hưởng trực tiếp!

```go
nums := []int{10, 20, 30}
sub := nums[0:2]
sub[0] = 99

fmt.Println(nums[0]) // Kết quả sẽ là 99!
```

### Cảnh báo về bộ nhớ (Memory Leaks)
Vì Slice trỏ vào mảng nền tảng, nếu bạn có một mảng khổng lồ và chỉ cắt lấy một Slice rất nhỏ từ nó, cả mảng khổng lồ đó sẽ vẫn nằm trong bộ nhớ và **không được Garbage Collector giải phóng**. 

**Giải pháp:** Nếu bạn chỉ cần một phần nhỏ của mảng lớn, hãy dùng `copy` sang một Slice mới hoàn toàn để mảng lớn có thể được giải phóng.

### Nil vs Empty Slice
Đây là sự khác biệt tinh tế thường xuất hiện trong các câu hỏi phỏng vấn:
- **Nil Slice** (`var s []int`): Header có `Data = 0`. Thường dùng để khởi tạo hoặc khi hàm trả về lỗi.
- **Empty Slice** (`s := []int{}`): Header có `Data` trỏ vào một vùng nhớ đặc biệt gọi là **`zerobase`** (không tốn RAM).
- **JSON**: Nil Slice encode ra `null`, trong khi Empty Slice encode ra `[]`.

---

> Nếu bạn muốn tạo ra một bản sao hoàn toàn độc lập và không ảnh hưởng đến dữ liệu gốc, hãy sử dụng hàm `copy()`.

---

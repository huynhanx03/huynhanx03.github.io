---
title: "Sắp xếp cơ bản: selection, insertion và bubble"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/elementary-sorting"
translationPending: true
series: "DSA cơ bản"
seriesOrder: 10
tags: ["sorting", "selection-sort", "insertion-sort", "bubble-sort", "go"]
description: "Ba thuật toán bậc hai và điều chúng dạy về bất biến, số phép đổi chỗ và tính ổn định."
draft: false
---

Các thuật toán `O(n²)` không phải lựa chọn mặc định cho dữ liệu lớn, nhưng chúng cho thấy rõ cách chứng minh một thuật toán sắp xếp. Ta xét thứ tự tăng và phân biệt **so sánh**, **ghi/đổi chỗ**, và **tính ổn định**: hai phần tử có khóa bằng nhau có giữ thứ tự ban đầu hay không.

## 1. Selection sort: chọn phần tử nhỏ nhất

Ở bước `i`, tìm chỉ số nhỏ nhất trong `[i,n)` rồi đổi với `i`. Bất biến: trước bước `i`, đoạn `[0,i)` đã chứa `i` phần tử nhỏ nhất ở đúng thứ tự, và không phần tử nào bên phải nhỏ hơn chúng. Sau `n-1` bước, cả dãy đúng. Số so sánh luôn là `n(n-1)/2`, kể cả dãy đã sắp; số lần đổi tối đa `n-1`. Bản đổi trực tiếp **không ổn định**: với `(2,a),(2,b),(1,c)`, chọn `1` rồi đổi với `(2,a)` làm `b` đứng trước `a`.





```note-visualization
{"id":"selection-sort","preset":"normal"}
```

## 2. Insertion sort: chèn vào tiền tố đã sắp

```go
func InsertionSort(a []int) {
    for i := 1; i < len(a); i++ {
        key := a[i]
        j := i
        for j > 0 && a[j-1] > key {
            a[j] = a[j-1]
            j--
        }
        a[j] = key
    }
}
```



Bất biến: trước lượt `i`, `[0,i)` đã sắp và chứa đúng các phần tử ban đầu ở vùng đó. Vòng trong dịch các phần tử lớn hơn `key` sang phải; tại vị trí `j`, phần tử bên trái không lớn hơn `key`, nên chèn được. Dùng `>` thay vì `>=` để các khóa bằng nhau không vượt qua nhau, vì vậy thuật toán ổn định. Tệ nhất `O(n²)`, tốt nhất `O(n)` với dãy đã sắp, bộ nhớ phụ `O(1)`. Khi dữ liệu gần như có thứ tự hoặc mảng rất nhỏ, nó thường hợp lý.



```note-visualization
{"id":"insertion-sort","preset":"normal"}
```

## 3. Bubble sort: đẩy cực đại sang phải

Mỗi lượt đi từ đầu tới biên chưa sắp, đổi hai phần tử kề nhau nếu trái lớn hơn phải. Sau lượt thứ nhất, cực đại nằm cuối; sau lượt thứ `k`, `k` phần tử cuối đúng vị trí. Nếu một lượt không có đổi chỗ, có thể dừng sớm: tốt nhất `O(n)`, tệ nhất `O(n²)`. Chỉ đổi khi `>` nên bản này ổn định. Tuy vậy bubble sort thường thực hiện nhiều đổi chỗ hơn insertion sort, và ít được chọn trong chương trình thật.





```note-visualization
{"id":"bubble-sort","preset":"normal"}
```

## 4. Chọn theo dữ liệu

Cả ba dùng `O(1)` bộ nhớ phụ. Selection sort hữu ích khi số lần ghi đắt hơn số lần đọc/so sánh; insertion sort thích hợp cho dãy ngắn hoặc gần sắp; bubble sort chủ yếu để luyện chứng minh. Với dữ liệu lớn, dùng thuật toán `O(n log n)` hoặc thư viện sắp xếp của Go. Khi đánh giá tốc độ, hãy ghi rõ đầu vào ngẫu nhiên, đảo ngược, gần sắp hay nhiều phần tử trùng; một con số Big-O không mô tả đủ.

**Tự luyện:** (1) Mô phỏng ba thuật toán trên `[4,1,3,1]`, ghi dãy sau mỗi lượt ngoài. (2) Chứng minh insertion sort ổn định. (3) Đếm chính xác số lần so sánh của selection sort với `n=5`.

*Đối chiếu: Jain, chương 6; Drozdek, chương 9; Lê Minh Hoàng, phần 2 §8.*

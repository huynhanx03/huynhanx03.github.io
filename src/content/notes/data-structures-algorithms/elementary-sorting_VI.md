---
title: "Sắp xếp cơ bản: selection, insertion và bubble"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/elementary-sorting"
series: "DSA cơ bản"
seriesOrder: 10
tags: ["sorting", "selection-sort", "insertion-sort", "bubble-sort", "go"]
description: "Ba thuật toán bậc hai và điều chúng dạy về bất biến, số phép đổi chỗ và tính ổn định."
draft: false
updated: 2026-10-15
---

Với dãy `[4,1,3,1]`, ta có thể đặt phần tử nhỏ nhất vào đầu, chèn từng phần tử vào tiền tố đã sắp, hoặc đẩy phần tử lớn nhất về cuối qua các cặp kề nhau. Selection, insertion và bubble sort cùng tạo thứ tự tăng nhưng giữ những bất biến khác nhau. Theo dõi ba cách trên một dãy nhỏ giúp hiểu vì sao chúng đúng và tại sao cùng O(n²) chưa có cùng chi phí ghi.

Ta tính so sánh khóa là hằng số, sắp trực tiếp trên dãy. Với bản ghi, **ổn định** nghĩa các phần tử bằng khóa vẫn giữ thứ tự tương đối ban đầu. Gắn nhãn `1A`, `1B` làm khác biệt đó quan sát được dù in mỗi số 1 sẽ che nó đi.

## Selection sort đặt một minimum vào vị trí cuối cùng của nó

Ở lượt i, quét `[i,n)` tìm minimum rồi đổi với a[i]. Trước lượt ấy, tiền tố `[0,i)` đã chứa i phần tử nhỏ nhất theo thứ tự và không lớn hơn mọi phần tử còn lại. Chọn minimum của phần còn lại đặt vào i duy trì bất biến. Sau n-1 lượt, phần cuối chỉ còn một phần tử nên toàn dãy đã sắp.

Với `[4,1A,3,1B]`, chọn minimum xuất hiện đầu tiên là 1A và đổi với 4: `[1A,4,3,1B]`. Lượt sau chọn 1B: `[1A,1B,3,4]`; lượt cuối vùng `[3,4]` đã đúng. Đây là một diễn biến cụ thể, không chứng minh ổn định cho mọi input.

```note-visualization
{"id":"selection-sort","preset":"normal"}
```

Số so sánh là `(n-1)+(n-2)+...+1=n(n-1)/2`, kể cả dữ liệu đã sắp. Nếu bỏ đổi khi minimum đã ở i, nhiều nhất n-1 lần swap. Vì số swap thấp, selection có thể đáng cân nhắc khi ghi đắt hơn đọc/so sánh; cần tính số lần ghi thật của swap trong môi trường đó.

Bản đổi trực tiếp không ổn định. Trên `[2A,2B,1C]`, đổi 1C với 2A tạo `[1C,2B,2A]`, đảo A/B dù cùng khóa 2. Tính không ổn định đến từ việc nhảy qua một phần tử bằng khóa, không phải thiếu một phép so sánh đặc biệt trong tìm minimum.

## Insertion sort mở rộng một tiền tố đã có thứ tự

Trước lượt i, `[0,i)` chứa đúng các phần tử ban đầu của tiền tố ấy theo thứ tự. Ta giữ a[i] trong key, dịch những phần tử lớn hơn sang phải rồi đặt key vào khoảng trống:

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

Đây là khai báo hàm Go độc lập, không cần import và sửa trực tiếp input. Với `[4,1A,3,1B]`: chèn 1A được `[1A,4,3,1B]`; chèn 3 được `[1A,3,4,1B]`; chèn 1B cần dịch 4 và 3, nhưng dừng sau 1A, thành `[1A,1B,3,4]`.

Trong lúc dịch, key đã được giữ riêng nên không mất phần tử gốc ở i. Khi vòng trong dừng, hoặc j=0, hoặc phần tử trước j không lớn hơn key; phía phải đã được dịch gồm những phần tử lớn hơn key. Chèn key tại j tạo lại tiền tố dài i+1 đã sắp và không mất hay thêm phần tử.

Dấu `>` quyết định ổn định: phần tử bằng key không bị dịch vượt qua key, nên bản ghi đến sau vẫn ở sau bản ghi bằng khóa đến trước. Đổi thành `>=` vẫn có thể cho thứ tự số đúng nhưng đảo thứ tự của những bản ghi bằng khóa.

```note-visualization
{"id":"insertion-sort","preset":"normal"}
```

Dãy tăng khiến vòng trong hầu như không dịch, best-case Θ(n) với n lớn hơn 1. Dãy giảm cần 1+2+...+(n-1) lượt dịch, worst-case Θ(n²). Cách cài dùng O(1) phụ. Dãy gần sắp hoặc rất ngắn thường khiến insertion hợp lý vì số phần tử cần dịch ít, nhưng đánh giá tốc độ vẫn cần workload cụ thể.

## Bubble sort cố định dần phần đuôi

Quét các cặp kề nhau từ trái sang phải, đổi nếu phần tử trái lớn hơn phải. Phần tử lớn nhất gặp tới lúc đó được chuyển dần sang phải; hết một lượt, maximum của vùng chưa sắp nằm ở cuối vùng ấy. Lượt sau giảm biên phải, không cần đụng phần đuôi đã cố định.

Trên `[4,1A,3,1B]`, lượt đầu lần lượt thành `[1A,4,3,1B]`, `[1A,3,4,1B]`, `[1A,3,1B,4]`. Lượt hai đưa 3 qua 1B được `[1A,1B,3,4]`. Một lượt không có swap chứng tỏ mọi cặp kề trong vùng đều đúng thứ tự, nên có thể dừng sớm.

```note-visualization
{"id":"bubble-sort","preset":"normal"}
```

Bản có cờ dừng sớm tốt nhất Θ(n); tệ nhất Θ(n²). Nếu luôn chạy mọi lượt dù không đổi, không còn best-case tuyến tính ấy. Chỉ đổi khi `>` giữ ổn định vì hai phần tử bằng khóa không đổi chỗ trực tiếp qua nhau. Bộ nhớ phụ O(1). Bubble thường cần nhiều swap hơn cách dịch của insertion; nó hữu ích để học bất biến nhưng ít khi là lựa chọn sắp xếp thông thường cho dãy lớn.

## Đặt các tiêu chí cạnh nhau

| Cách cài đã nêu | Best-case | Worst-case | Stable | Điểm đáng chú ý |
| --- | --- | --- | --- | --- |
| Selection đổi minimum | Θ(n²) | Θ(n²) | không | ít swap, vẫn quét mọi minimum |
| Insertion với `>` | Θ(n) | Θ(n²) | có | thích nghi khi ít phần tử sai chỗ |
| Bubble có dừng sớm | Θ(n) | Θ(n²) | có | cố định maximum mỗi lượt |

Cả ba dùng O(1) phụ và xử lý dãy rỗng/một phần tử bằng việc không có lượt sửa cần thiết. Với dữ liệu lớn, nên khảo sát thuật toán O(n log n) hoặc thư viện Go. Khóa ngẫu nhiên, giảm, gần sắp hay nhiều trùng tác động khác nhau; một nhãn Big-O không đủ chọn cách nhanh nhất trong mọi tình huống.

## Tự kiểm tra

**1.** Selection trên n=5 so sánh bao nhiêu lần? **2.** Vì sao insertion không cần đổi hai phần tử ở mỗi bước? **3.** Hai số bằng nhau có chứng minh một sort ổn định chỉ từ output số không?

**Giải thích:** 4+3+2+1=10 so sánh, kể cả dãy tăng. Insertion giữ key riêng rồi dịch các phần tử lớn sang phải để tạo đúng một chỗ; không cần swap liên tiếp để bảo toàn key. Output số không thể phân biệt danh tính của hai bản ghi bằng khóa; cần nhãn A/B hoặc payload để kiểm tra thứ tự tương đối. Trên `[4,1,3,1]`, hãy đối chiếu trạng thái mỗi lượt với các trace trên, rồi tự tạo phản ví dụ selection bằng `[2A,2B,1C]`.

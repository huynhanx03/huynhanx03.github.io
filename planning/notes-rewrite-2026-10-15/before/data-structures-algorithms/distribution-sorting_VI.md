---
title: "Counting, radix và bucket sort: vượt cận so sánh bằng giả định dữ liệu"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/distribution-sorting"
translationPending: true
series: "DSA cơ bản"
seriesOrder: 12
tags: ["counting-sort", "radix-sort", "bucket-sort", "key-range"]
description: "Khi khóa thuộc miền hẹp hoặc có chữ số, có thể sắp xếp tuyến tính với chi phí bộ nhớ rõ ràng."
draft: false
---

Cận `Ω(n log n)` áp dụng cho sắp xếp **chỉ bằng so sánh**. Nếu biết thêm cấu trúc của khóa, ta có thể dùng chính giá trị khóa để định vị phần tử. Đổi lại, thời gian và bộ nhớ phụ thuộc miền khóa `k`, số chữ số `d`, hoặc giả định phân bố; gọi các thuật toán này “luôn O(n)” là thiếu điều kiện.

## 1. Counting sort

Với `n` số nguyên trong `[min,max]`, đặt `k=max-min+1` và đếm `count[x-min]`. Nếu chỉ cần dãy số, xuất mỗi giá trị theo số lần xuất hiện; chi phí `O(n+k)` thời gian, `O(k)` bộ nhớ. Nếu phần tử là bản ghi có khóa và phải **ổn định**, chuyển `count` thành tổng tích lũy vị trí kết thúc, rồi đi từ phải sang trái của đầu vào: giảm `count[key]` và đặt bản ghi vào vị trí đó. Những bản ghi cùng khóa giữ đúng thứ tự cũ.



Ví dụ khóa `[-2,0,-2,1]` dùng offset `+2` để chỉ số không âm. Nếu `min=-10^12`, `max=10^12` nhưng chỉ có vài bản ghi, mảng đếm là không khả thi; bảng băm để đếm không tự biến thuật toán thành counting sort xuất kết quả theo thứ tự mà không xử lý khóa.



```note-visualization
{"id":"counting-sort","preset":"normal"}
```

## 2. Radix sort

Xử lý từng chữ số của khóa ở cơ số `b`. Bản LSD (least significant digit trước) cần phép sắp xếp **ổn định** ở mỗi lượt: thứ tự các chữ số thấp đã có phải được giữ khi sắp theo chữ số cao. Với `d` chữ số và counting sort cho từng chữ số, thời gian `O(d(n+b))`, bộ nhớ `O(n+b)`. Việc chọn `b` là đánh đổi giữa số lượt `d` và mảng đếm kích thước `b`.



Số âm cần mã hóa có thứ tự phù hợp: không thể lấy trị tuyệt đối rồi dùng cùng quy trình mà mong ra thứ tự số nguyên. Với chuỗi có độ dài biến thiên, cần quy tắc cho ký tự thiếu và thứ tự từ điển. Bản MSD (most significant digit trước) phân nhóm theo chữ số cao rồi đệ quy từng nhóm; điều kiện và bộ nhớ khác bản LSD.



```note-visualization
{"id":"radix-sort","preset":"normal"}
```

## 3. Bucket sort

Chia miền khóa thành các bucket, đặt mỗi phần tử vào bucket tương ứng, sắp từng bucket rồi ghép theo thứ tự. Nếu đầu vào phân bố gần đều và số bucket hợp lý, tổng chi phí kỳ vọng có thể `O(n)`; nếu tất cả rơi vào một bucket và dùng insertion sort, xấu nhất `O(n²)`. Phải định nghĩa rõ cách ánh xạ biên: giá trị đúng bằng cận trên đi vào bucket nào? Bucket sort cũng có thể ổn định nếu thao tác trong từng bucket và ghép ổn định.





```note-visualization
{"id":"bucket-sort","preset":"normal"}
```

**Tự luyện:** (1) Viết vị trí tích lũy của counting sort ổn định cho khóa `[2,1,2,0]`. (2) Vì sao dùng selection sort ở từng lượt LSD phá hỏng radix sort? (3) Với `n=1000`, miền khóa một tỷ giá trị, chọn thuật toán nào và vì sao?

*Đối chiếu: Jain, chương 6; Drozdek, chương 9; Lê Minh Hoàng, phần 2 §8.*

---
title: "Counting, radix và bucket sort: vượt cận so sánh bằng giả định dữ liệu"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/distribution-sorting"
series: "DSA cơ bản"
seriesOrder: 12
tags: ["counting-sort", "radix-sort", "bucket-sort", "key-range"]
description: "Khi khóa thuộc miền hẹp hoặc có chữ số, có thể sắp xếp tuyến tính với chi phí bộ nhớ rõ ràng."
draft: false
updated: 2026-10-15
---

Nếu mỗi bản ghi có mã điểm từ 0 đến 100, ta có thể đếm 101 nhóm rồi xuất theo mã, thay vì hỏi từng cặp bản ghi ai đứng trước. Thông tin về miền khóa cho phép một thao tác khác mô hình chỉ so sánh. Đó là lý do counting, radix và bucket sort có thể tuyến tính **dưới những điều kiện cụ thể**.

Để so với O(n log n), phải tính thêm k là số giá trị trong miền, d là số chữ số và giả định phân bố. Một miền khóa khổng lồ hoặc một bucket quá đông có thể làm cách tưởng nhanh trở thành không phù hợp.

## Counting sort đổi giá trị khóa thành index

Với n số nguyên thuộc `[min,max]`, đặt `k=max-min+1`; ô `count[x-min]` chứa số lần xuất hiện của x. Lần quét đầu đếm, lần quét miền khóa theo thứ tự tăng xuất từng giá trị đúng số lần. Với `[-2,0,-2,1]`, offset +2 cho các index 0,2,0,3; count là `[2,0,1,1]`. Kết quả `[-2,-2,0,1]`.

Ta đọc n phần tử, khởi tạo/quét k ô, xuất n phần tử, nên thời gian O(n+k). Nếu chỉ cần sắp số và ghi lại vào input, bảng đếm dùng O(k) phụ. Nếu phải trả array mới, kết quả còn O(n). Miền có số âm không thành vấn đề nếu offset đúng, nhưng phép tính k/offset cũng cần không tràn kiểu số.

```note-visualization
{"id":"counting-sort","preset":"normal"}
```

Khi phần tử là bản ghi có payload, “xuất lại khóa” sẽ làm mất payload. Bản stable cần bảng output riêng. Với `[2A,1B,2C,0D]`, count theo khóa là `[1,1,2]`; tổng tích lũy `[1,2,4]` cho vị trí kết thúc sau cùng của từng nhóm theo cách đếm số lượng.

Đi từ phải sang trái: khóa 0D làm count[0] từ 1 xuống 0, ghi D vào output[0]; 2C từ 4 xuống 3, ghi C vào 3; 1B từ 2 xuống 1, ghi B vào 1; 2A từ 3 xuống 2, ghi A vào 2. Kết quả `[0D,1B,2A,2C]` giữ A trước C. Đi ngược đầu vào cùng với giảm vị trí kết thúc chính là phần bảo đảm ổn định. Bản này dùng O(n+k) phụ nếu tính cả output.

Nếu min=-10^12, max=10^12 mà chỉ có vài phần tử, mảng đếm k ô không khả thi. Map đếm tiết kiệm miền rỗng, nhưng muốn xuất theo thứ tự còn phải sắp hoặc xử lý thứ tự các khóa khác nhau; không thể giữ kết luận O(n+k) theo mảng bằng cách âm thầm đổi thành map.

## LSD radix giữ kết quả của các chữ số đã xét

Chọn cơ số b và xử lý chữ số từ thấp lên cao. Sau lượt đầu, dãy có thứ tự theo chữ số thấp nhất; sau lượt hai, theo hai chữ số cuối. Để quy nạp này đúng, lượt sắp theo chữ số cao hơn phải **ổn định**, giữ thứ tự theo phần thấp giữa những phần tử có chữ số hiện tại bằng nhau.

Ví dụ `[21,12,11]`: sắp stable theo hàng đơn vị được `[21,11,12]`; sắp stable theo hàng chục được `[11,12,21]`. Trong nhóm hàng chục 1, thứ tự 11 trước 12 đến từ lượt trước. Nếu lượt sau tùy tiện đảo hai phần tử cùng hàng chục, có thể thành `[12,11,21]` và sai thứ tự số.

```note-visualization
{"id":"radix-sort","preset":"normal"}
```

Dùng counting sort stable cho mỗi chữ số tốn O(n+b) mỗi lượt. Với d chữ số: O(d(n+b)) thời gian, O(n+b) phụ dùng lại. Tăng b thường giảm số lượt nhưng tăng mảng đếm; phải tính theo độ dài khóa thực tế, không mặc định d là hằng số nếu giá trị số không bị chặn.

Selection sort thông thường không stable nên không phải phép sắp chữ số hợp lệ cho LSD theo lập luận trên. Có thể xây một phiên bản stable khác, nhưng cần chứng minh và tính lại chi phí chứ không mượn tính chất của tên thuật toán.

Số âm cần mã hóa giữ thứ tự; lấy trị tuyệt đối sẽ đưa -2 và 2 vào cùng cách xếp và đảo quan hệ giữa nhiều số âm. Với khóa nguyên độ rộng cố định có thể dùng một phép biến đổi thứ tự phù hợp với biểu diễn, nhưng cần nêu rõ biểu diễn trước khi cài. Chuỗi độ dài khác nhau cũng cần quy tắc ký hiệu thiếu và thứ tự từ điển. MSD radix bắt đầu chữ số cao, phân nhóm rồi đệ quy trong nhóm; nó không có cùng tổ chức/bộ nhớ tự động như bản LSD vừa phân tích.

## Bucket sort cần cả thứ tự bucket và chi phí bên trong

Chia miền thành các khoảng theo thứ tự, đưa mỗi phần tử vào bucket chứa nó, sắp từng bucket rồi nối từ bucket nhỏ đến lớn. Hai phần tử ở bucket khác nhau đã có quan hệ nhờ ánh xạ miền; còn trong bucket vẫn cần một thuật toán sắp.

Với dữ liệu trong `[0,1)`, m bucket có thể dùng index `floor(m*x)`. Nếu cho phép x=1, công thức ra m ngoài biên, nên phải đổi hợp đồng hoặc quy tắc biên. Không âm thầm kẹp mọi input sai miền vào bucket cuối rồi coi như đã xử lý đúng.

```note-visualization
{"id":"bucket-sort","preset":"normal"}
```

Nếu dữ liệu phân bố độc lập gần đều và m tỷ lệ n, kích thước các bucket đủ nhỏ theo kỳ vọng để tổng chi phí, kể cả insertion sort bên trong, có thể O(n). Đây là kết quả có giả định phân bố. Nếu mọi phần tử vào một bucket và sắp bucket ấy bằng insertion, worst-case O(n²). Bộ nhớ để giữ bucket và phần tử thường O(n+m). Muốn stable, thao tác đưa vào, sắp bên trong và nối phải cùng giữ thứ tự của phần tử bằng khóa.

## Chọn theo miền và tự kiểm tra

**1.** Với n=1000 và miền một tỷ giá trị, vì sao không chọn ngay counting sort? **2.** Nếu một lượt LSD theo chữ số cao phá thứ tự các chữ số thấp trong nhóm bằng nhau, lượt sau stable có bảo đảm sửa được không? **3.** Stable counting trên `[2A,1B,2C,0D]` cần giữ điều gì?

**Giải thích:** Khởi tạo/quét hoặc giữ một tỷ ô áp đảo n=1000; sort so sánh O(n log n), hoặc radix với biểu diễn và b thích hợp, thường là ứng viên thực tế hơn. Không có bảo đảm một lượt sau sửa lại thứ tự chữ số thấp đã bị phá trong nhóm chữ số cao bằng nhau; invariant LSD đã mất. Counting cần giữ A trước C đồng thời bảo toàn payload; bảng tích lũy `[1,2,4]` và đi ngược đặt A,C vào index 2,3 chứng minh điều đó.

Cận so sánh không bị vi phạm: các thuật toán ở bài khai thác index miền khóa, chữ số hoặc phân bố ngoài phép so sánh đôi. Khi báo “tuyến tính”, hãy ghi rõ tuyến tính theo n trong điều kiện k,d,b nào.

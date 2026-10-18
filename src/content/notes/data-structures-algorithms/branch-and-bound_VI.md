---
title: "Nhánh cận: dùng giới hạn lạc quan để loại bài toán con"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/branch-and-bound"
series: "DSA nâng cao"
seriesOrder: 5
tags: ["branch-and-bound", "optimization", "knapsack", "pruning"]
description: "Khác quay lui liệt kê ở mục tiêu tối ưu và chứng minh cận loại nhánh an toàn."
draft: false
updated: 2026-10-15
---

Ta đã tìm được cách xếp hàng vào ba lô có giá trị 12. Nếu bỏ vật đầu tiên, ngay cả cận lạc quan cho nhánh đó cũng chỉ đạt 11. Vì vậy, ta có thể dừng xét nhánh dù bên trong vẫn có cách xếp hợp lệ. Đây là bước mở rộng từ quay lui sang nhánh cận.

Quay lui bỏ nhánh không có nghiệm hợp lệ. Nhánh cận còn bỏ nhánh không thể cải thiện nghiệm tốt nhất đã biết, gọi là `incumbent`. Với bài tối đa hóa, cần cận trên cho **mọi** nghiệm hoàn tất từ trạng thái hiện tại. Cận phải lạc quan: có thể quá cao và bỏ lỡ cơ hội cắt, nhưng không được thấp hơn nghiệm tốt nhất trong nhánh.

## Nới lỏng bài toán để có cận trên

Trong 0/1 knapsack, mỗi vật có trọng lượng và giá trị, được lấy tối đa một lần; tổng trọng lượng không vượt `W`. Giả sử các trọng lượng dương và giá trị không âm. Sắp vật theo tỷ lệ `value/weight` giảm dần. Nút tìm kiếm giữ chỉ số vật tiếp theo, giá trị đã chọn và sức chứa còn lại.

Để tính cận, tạm cho phép chia nhỏ các vật chưa quyết định. Lấy theo tỷ lệ: lấy trọn vật còn vừa, rồi lấy phần lẻ của vật tiếp khi hết chỗ. Bài fractional này tối ưu bằng cách ưu tiên mỗi đơn vị trọng lượng có giá trị cao nhất. Mọi nghiệm nguyên của nhánh cũng là nghiệm fractional hợp lệ; tối ưu trên tập nghiệm rộng hơn không thể nhỏ hơn tối ưu nguyên. Cộng giá trị đã chọn vào kết quả fractional cho cận trên cần dùng.

Vật trọng lượng 0 phải xử lý riêng trước phép chia tỷ lệ: với mô hình 0/1, vật giá trị dương có thể lấy một lần mà không tốn chỗ. Không được để phép chia cho 0 quyết định thứ tự. Giá trị âm hoặc các ràng buộc bổ sung cũng cần xét lại cách xây cận và nhận nghiệm.

## Theo số liệu đến quyết định bỏ nhánh

Cho `W=5` và các vật `(weight,value)` là `(3,8),(3,7),(2,4)`, có tỷ lệ `8/3`, `7/3`, `2`. Nhánh lấy vật 1 rồi vật 3 cho nghiệm hợp lệ giá trị 12. Ở gốc, cận fractional lấy vật 1 và thêm `2/3` vật 2, được `8 + 14/3 = 12⅔`, nên chưa thể cắt gốc.

Sau khi đã có incumbent 12, xét nhánh bỏ vật 1. Vật 2 và 3 vừa đủ sức chứa, cho giá trị 11; cận của nhánh này là 11. Vì `11<=12`, không nghiệm trong nhánh này có thể cải thiện incumbent, nên ta cắt được nó. Thứ tự này minh họa quyết định tìm kiếm hợp lệ: trước hết có nghiệm 12, sau đó dùng cận để loại nhánh còn lại.

Nếu dùng `<=`, thuật toán đang tìm một giá trị tối ưu hoặc một nghiệm tối ưu. Nếu yêu cầu liệt kê **mọi** nghiệm tối ưu, nhánh có cận bằng incumbent vẫn có thể chứa nghiệm đồng hạng và không được bỏ theo cùng điều kiện.

```note-visualization
{"id":"knapsack-branch-bound","preset":"normal"}
```

## Tách việc tìm nghiệm khỏi việc chứng minh cận

```text
search(index, remaining, value):
    incumbent = max(incumbent, value)  // trạng thái hiện tại hợp lệ
    if index == n: return
    if fractionalUpperBound(index, remaining, value) <= incumbent: return
    nếu vật index vừa chỗ: thử nhánh lấy vật
    thử nhánh bỏ vật
```

Đây là mã giả. `fractionalUpperBound` phải tính cả `value` đã có, chỉ dùng các vật chưa quyết định, và tôn trọng sức chứa còn lại. Nhánh lấy giảm sức chứa, cộng giá trị rồi chuyển chỉ số; nhánh bỏ chỉ chuyển chỉ số. Mỗi nghiệm 0/1 thuộc đúng một chuỗi quyết định, nên nếu không bị cắt sai, quá trình vẫn tìm đủ các ứng viên cần thiết.

Cập nhật incumbent ở trạng thái giữa chừng hợp lệ vì ta có thể không lấy thêm vật nào. Ví dụ đang có giá trị 6 đã là một phương án hoàn chỉnh bằng cách bỏ hết phần còn lại. Lập luận này không còn đủ nếu phải chọn đúng `k` vật hay thỏa một mức giá trị/trọng lượng tối thiểu: tiền tố hiện tại có thể chưa là nghiệm. Khi ấy chỉ cập nhật bằng nghiệm thật sự thỏa mọi ràng buộc.

Incumbent nên đến từ một nghiệm khả thi, không phải một dự đoán cao chưa đạt được. Trong bài tối đa hóa, đặt incumbent quá cao có thể làm bỏ mọi nhánh, giống như dùng cận quá thấp. Một heuristic có thể giúp tìm nghiệm đầu tốt, nhưng giá trị phải gắn với một nghiệm hợp lệ.

## Thứ tự tìm kiếm và chi phí phải trả

DFS giữ đường hiện tại có độ sâu `O(n)` cùng dữ liệu dùng tính cận; khi quay về thì thử nhánh khác. Có thể thử nhánh nhiều triển vọng trước để nâng incumbent sớm. Best-first giữ nhiều nút trong priority queue theo cận, thường ưu tiên trạng thái có khả năng cải thiện lớn nhất nhưng có thể dùng bộ nhớ rất lớn.

Độ chặt của cận và giá tìm cận là một đánh đổi: cận tốt hơn có thể giảm số nút nhưng tốn thêm thời gian ở từng nút. Với `2^n` chuỗi lấy/bỏ, trường hợp xấu vẫn có số trạng thái theo hàm mũ; nhánh cận không có bảo đảm đa thức cho knapsack tổng quát.

Số thực tạo thêm một rủi ro đúng đắn. Cận thật 12,0001 bị làm tròn thành 12 rồi so với incumbent 12 có thể khiến nhánh bị bỏ dù còn cải thiện. Khi có thể, dùng số học chính xác hoặc cơ chế làm tròn có bảo đảm theo hướng lạc quan. Thêm một epsilon tùy ý không tự tạo chứng minh cho mọi cỡ dữ liệu.

## Tự đánh giá một phép cắt

**1.** Cận gốc của ví dụ là bao nhiêu? **2.** Nếu nhánh chứa nghiệm 12 nhưng hàm cận trả 10 và incumbent là 11 thì sao? **3.** Cận hợp lệ nhưng rất cao ảnh hưởng gì?

**Giải thích:** cận gốc bằng `8+14/3=12⅔`: lấy trọn vật đầu rồi lấy 2/3 vật thứ hai theo bài toán nới lỏng. Cận sai 10 làm bỏ nhánh tối ưu và có thể báo 11, nên đây là lỗi tính đúng chứ không chỉ giảm chất lượng tìm kiếm. Cận quá cao vẫn an toàn nhưng ít cắt được; thuật toán có thể duyệt gần toàn cây. Khi xem một cận mới, cần kiểm tra trước tính lạc quan rồi mới đo khả năng giảm công việc.

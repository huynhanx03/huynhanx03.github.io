---
title: "Quy hoạch động: trạng thái, chuyển tiếp và thứ tự tính"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/dynamic-programming"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 3
tags: ["dynamic-programming", "memoization", "tabulation", "invariant"]
description: "Thiết kế DP từ truy hồi, chứng minh trạng thái đủ thông tin và tối ưu bộ nhớ."
draft: false
---

Quy hoạch động (DP) phù hợp khi bài toán có nhiều bài toán con **lặp lại** và nghiệm lớn có thể xây từ nghiệm con. Đừng bắt đầu bằng một bảng hai chiều chỉ vì “bài này là DP”. Hãy xác định `state` trả lời câu hỏi nào, các lựa chọn tiếp theo là gì, trường hợp cơ sở là gì, và đồ thị phụ thuộc có chu trình hay không.

## 1. Ví dụ: số cách leo cầu thang

Có `n` bậc, mỗi bước đi 1 hoặc 2 bậc. Gọi `dp[i]` là số cách đứng đúng ở bậc `i`. Bước cuối đến từ `i-1` hoặc `i-2`, hai tập cách rời nhau, nên `dp[i]=dp[i-1]+dp[i-2]`; `dp[0]=1` là cách không đi bước nào. Với `n>=1`, `dp[1]=1`. Tính tăng `i` cho `O(n)` thời gian, `O(n)` bộ nhớ; vì chỉ cần hai giá trị trước, có thể giữ hai biến và giảm bộ nhớ `O(1)`. Cần chọn kiểu đủ rộng hoặc tính modulo vì số cách tăng nhanh.



Điểm quan trọng là **trạng thái đã chứa đủ lịch sử**: để tính số cách đến `i`, ta không cần nhớ toàn bộ đường đi, chỉ cần số cách ở hai bậc trước. Nếu ràng buộc là “không được bước 2 hai lần liên tiếp”, trạng thái `i` đơn độc không đủ; cần thêm loại bước cuối.



```note-visualization
{"id":"stairs-bottom-up","preset":"normal"}
```

## 2. Top-down và bottom-up

Top-down viết hàm đệ quy theo công thức rồi lưu kết quả đã tính (memoization). Nó thường dễ đi từ định nghĩa, chỉ tính trạng thái chạm tới, nhưng dùng call stack và cần phân biệt “chưa tính” với kết quả hợp lệ bằng `0`. Bottom-up chọn thứ tự sao cho mọi tiền nhiệm được tính trước; nó tránh stack và thường dễ tối ưu bộ nhớ. Với đồ thị trạng thái là DAG, thứ tự topological chính là thứ tự tính hợp lệ. Nếu truy hồi có vòng mà không có cấu trúc giải khác, chỉ thêm memo không giải được chu trình.





```note-visualization
{"id":"stairs-memo","preset":"normal"}
```

## 3. Chứng minh và truy vết nghiệm

Chứng minh DP bằng quy nạp theo thứ tự tính: cơ sở đúng, mỗi trạng thái xét **đầy đủ** và **không đếm trùng** các lựa chọn dẫn đến nó, rồi lấy min/max/tổng đúng theo mục tiêu. Nếu chỉ lưu giá trị tối ưu nhưng cần xuất đường đi, lưu thêm `parent`/quyết định tại mỗi trạng thái hoặc tái dựng bằng so sánh các giá trị bảng. Tối ưu bộ nhớ bằng rolling array chỉ an toàn khi không cần các hàng cũ để truy vết và thứ tự cập nhật không ghi đè giá trị còn dùng.

**Tự luyện:** (1) Sửa bài cầu thang để có bước dài 1, 2, 3. (2) Thêm ô cấm; định nghĩa `dp[i]` và cơ sở. (3) Với bài có ràng buộc không đi 2 hai lần liên tiếp, đề xuất trạng thái đủ thông tin.

*Đối chiếu: Jain, chương 19; Lê Minh Hoàng, phần 3 §1–2.*

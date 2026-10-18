---
title: "Quy hoạch động: trạng thái, chuyển tiếp và thứ tự tính"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/dynamic-programming"
series: "DSA nâng cao"
seriesOrder: 3
tags: ["dynamic-programming", "memoization", "tabulation", "invariant"]
description: "Thiết kế DP từ truy hồi, chứng minh trạng thái đủ thông tin và tối ưu bộ nhớ."
draft: false
updated: 2026-10-15
---

Muốn đếm số cách lên 5 bậc bằng bước dài 1 hoặc 2, ta có thể thử mọi chuỗi bước. Nhưng khi các nhánh cùng đi tới bậc 3, chúng gặp lại đúng bài toán còn 2 bậc. Quy hoạch động khai thác những bài toán con lặp lại bằng cách lưu câu trả lời và dùng lại.

Để thiết kế DP, trước hết phải nói rõ trạng thái trả lời câu hỏi gì. Kích thước bảng đến sau. Một trạng thái thiếu thông tin sẽ ghép nhầm các lịch sử có khả năng tiếp tục khác nhau, dù bảng được tính rất nhanh.

## Đếm bằng bước cuối cùng

Gọi `dp[i]` là số cách đứng đúng ở bậc `i`, bắt đầu tại bậc 0. Mọi đường đến `i` kết thúc bằng bước 1 từ `i-1` hoặc bước 2 từ `i-2`. Hai nhóm rời nhau vì bước cuối khác nhau; bỏ bước cuối tạo phép tương ứng với cách đến bậc trước. Do đó `dp[i]=dp[i-1]+dp[i-2]` với `i>=2`.

Cơ sở `dp[0]=1` đếm một cách không đi bước nào. Đây không phải 0 cách: chính cách rỗng ấy tạo đường `[1]` và `[2]` khi thêm một bước. Với `n>=1`, `dp[1]=1`. Bảng đầu là:

| Bậc i | 0 | 1 | 2 | 3 | 4 | 5 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Số cách | 1 | 1 | 2 | 3 | 5 | 8 |

Chẳng hạn 5 cách ở bậc 4 đi thêm 1 và 3 cách ở bậc 3 đi thêm 2 tạo đủ 8 cách ở bậc 5. Mỗi đường có đúng một bước cuối nên không bị đếm trùng.

```note-visualization
{"id":"stairs-bottom-up","preset":"normal"}
```

Mỗi ô cần số phép toán hằng số và có `n+1` ô: thời gian `O(n)`, bộ nhớ `O(n)`. Nếu chỉ cần kết quả cuối, giữ hai số liên tiếp thay cho cả bảng, giảm bộ nhớ `O(1)`. Đây là cận theo mô hình phép cộng số máy có chi phí hằng số. Số cách tăng nhanh: dùng kiểu đủ rộng, số nguyên lớn hoặc modulo theo yêu cầu; số nguyên lớn khiến chi phí một phép cộng phụ thuộc số chữ số.

## Cùng vị trí nhưng chưa chắc cùng trạng thái

Giả sử cấm hai bước dài 2 liên tiếp. Hai đường cùng ở bậc 4 nhưng một đường vừa đi 1, đường kia vừa đi 2, không có cùng lựa chọn tiếp theo. Chỉ giữ `i` sẽ làm mất thông tin cần thiết.

Có thể đặt `dp[i][last]`, với `last` cho biết bước cuối có phải 2 không. Bước 1 nhận từ cả hai loại ở `i-1`; bước 2 chỉ nhận từ loại không kết thúc bằng 2 ở `i-2`. Trạng thái gốc ở bậc 0 được coi là chưa có bước 2 trước đó. Việc thêm một chiều có lý do: nó giữ phần lịch sử ảnh hưởng tương lai, chứ không sao chép toàn bộ đường đi.

Đối với bài min/max, tư duy tương tự là các lịch sử có cùng trạng thái phải có cùng các lựa chọn tiếp tục; khi đó có thể chỉ giữ lịch sử tốt nhất theo mục tiêu. Với bài đếm, phải cộng số cách của các lịch sử thay vì bỏ hết chỉ giữ một lịch sử đại diện.

## Chọn thời điểm tính một trạng thái

Top-down bắt đầu từ câu hỏi `ways(n)`, đệ quy theo công thức rồi ghi nhớ kết quả. Không lưu kết quả khiến các lời gọi như `ways(n-2)` xuất hiện nhiều lần. Memoization dùng lại câu trả lời đó, thường chỉ tính trạng thái được chạm tới nhưng vẫn dùng call stack. Phải phân biệt “chưa tính” với “kết quả bằng 0”; một mảng `seen` riêng là cách rõ ràng khi 0 có thể hợp lệ.

```note-visualization
{"id":"stairs-memo","preset":"normal"}
```

Bottom-up chọn thứ tự sao cho các phụ thuộc có sẵn trước. Với cầu thang, chỉ số tăng đáp ứng điều kiện vì `i-1,i-2<i`. Với trạng thái phức tạp hơn, hãy vẽ cạnh từ trạng thái phụ thuộc sang trạng thái sử dụng nó: nếu đồ thị là DAG, thứ tự topo là thứ tự tính hợp lệ. Chỉ thêm memo vào một đệ quy có vòng không tự giải quyết chu trình; có thể quay lại trạng thái đang tính mà chưa có đáp án.

## Từ công thức đến chứng minh và truy vết

Chứng minh theo thứ tự tính: cơ sở đúng; giả sử các trạng thái trước đúng; phân loại đầy đủ các lựa chọn cho trạng thái hiện tại; dùng tổng, min hay max phù hợp. Với bài đếm cần chứng minh không trùng; với bài tối ưu cần chứng minh mỗi phương án tốt nhất được một chuyển tiếp xét tới và các chuyển tiếp không tạo nghiệm sai.

Nếu cần xuất một đường đi hay tập quyết định, giá trị tối ưu đơn thuần có thể chưa đủ. Lưu `parent`/lựa chọn tại mỗi trạng thái hoặc tái dựng từ bảng đầy đủ. Rolling array có thể xóa dữ liệu cần truy vết. Ngay cả khi chỉ cần giá trị, cập nhật tại chỗ cũng phải kiểm tra ô nào thuộc lượt cũ và ô nào thuộc lượt mới; [ba mẫu DP](/vi/notes/data-structures-algorithms/dp-classics/) cho thấy hướng duyệt làm thay đổi knapsack.

## Biến thể để tự xây lại trạng thái

**1.** Nếu được bước 1, 2 hoặc 3, công thức nào đúng? **2.** Nếu bậc 3 bị cấm đứng lên thì xử lý ra sao? **3.** Vì sao `dp[i]` thiếu thông tin khi cấm hai bước 2 liên tiếp?

**Giải thích:** cộng các `dp[i-d]` có `d∈{1,2,3}` và `i-d>=0`, vẫn giữ `dp[0]=1`. Với ô cấm, đặt `dp[3]=0` rồi tính các ô sau; bước dài 2 được phép nhảy qua bậc cấm nếu luật chỉ cấm điểm đáp, còn nếu cấm cả việc vượt qua thì chuyển tiếp phải đổi. Ràng buộc liên tiếp cần biết loại bước cuối, nên hai lịch sử cùng bậc chưa thể gộp vào một trạng thái duy nhất.

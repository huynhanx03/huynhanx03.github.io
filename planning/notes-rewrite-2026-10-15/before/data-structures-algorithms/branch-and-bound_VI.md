---
title: "Nhánh cận: dùng giới hạn lạc quan để loại bài toán con"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/branch-and-bound"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 5
tags: ["branch-and-bound", "optimization", "knapsack", "pruning"]
description: "Khác quay lui liệt kê ở mục tiêu tối ưu và chứng minh cận loại nhánh an toàn."
draft: false
---

Quay lui loại nhánh **không hợp lệ**. Nhánh cận còn loại nhánh hợp lệ nhưng **không thể đánh bại** nghiệm tốt nhất đã biết (`incumbent`). Với bài tối đa hóa, mỗi trạng thái cần một **cận trên lạc quan** cho mọi nghiệm hoàn tất từ nó. Nếu cận trên `<= incumbent`, cả nhánh có thể bỏ. Cận sai theo hướng quá thấp có thể loại nghiệm tối ưu, nên chứng minh cận là phần trung tâm của thuật toán.

## 1. Ví dụ 0/1 knapsack

Sắp vật theo tỷ lệ `value/weight` giảm. Ở một nút tìm kiếm, ta đã quyết định vài vật, còn sức chứa `remaining`. Tính cận trên bằng cách giả sử được **chia nhỏ** các vật còn lại: lấy trọn các vật theo tỷ lệ cho tới khi hết chỗ, rồi lấy phần lẻ của vật tiếp theo. Vì bài gốc không cho chia vật, nghiệm fractional không thể kém nghiệm 0/1 tối ưu của nhánh; nó là cận trên hợp lệ. Nếu có vật trọng lượng 0, xử lý riêng trước khi chia tỷ lệ.



Tại mỗi vật, rẽ nhánh “lấy” nếu còn chỗ và “không lấy”. Giữ `currentValue`, `remaining`, chỉ số vật tiếp theo. Khi gặp nghiệm hoàn chỉnh hoặc bất kỳ trạng thái hợp lệ nào, cập nhật `incumbent`. Có thể duyệt nhánh có cận cao trước để sớm tìm nghiệm tốt, nhưng thứ tự duyệt không ảnh hưởng tính đúng đắn nếu cận đúng. Tệ nhất vẫn có `2^n` trạng thái; nhánh cận là kỹ thuật giảm tìm kiếm thực tế, không bảo đảm đa thức.

Ví dụ sức chứa `W=5`, ba vật `(weight,value)` là `(2,6)`, `(3,6)`, `(4,7)`. Tỷ lệ lần lượt là `3`, `2`, `1.75`. Cận fractional ở gốc lấy trọn vật 1 và 2, được 12; đây cũng là một nghiệm 0/1 nên ta có `incumbent=12`. Xét nhánh **bỏ vật 1**: sức chứa 5 còn nguyên nhưng chỉ có vật 2 và 3. Cận lạc quan lấy vật 2 (giá trị 6, còn 2 chỗ), rồi lấy nửa vật 3 (giá trị thêm 3.5), tổng chỉ 9.5. Vì `9.5<=12`, toàn bộ nhánh bỏ vật 1 có thể cắt. Một người đọc có thể kiểm chứng trực tiếp hai nghiệm hợp lệ còn lại: lấy vật 2 cho 6, lấy vật 3 cho 7; không thể lấy cả hai vì trọng lượng 7 vượt 5.

```text
search(index, remaining, value):
    incumbent = max(incumbent, value)  // trạng thái hiện tại hợp lệ
    if index == n: return
    if fractionalUpperBound(index, remaining, value) <= incumbent: return
    nếu vật index vừa chỗ: thử nhánh lấy vật
    thử nhánh bỏ vật
```

Việc cập nhật `incumbent` ngay ở trạng thái chưa xét hết vật đúng vì “không lấy thêm vật nào” luôn là một nghiệm hợp lệ cho knapsack **giá trị không âm**. Nếu bài buộc chọn đúng `k` vật hoặc có ràng buộc khác, trạng thái giữa chừng chưa chắc là nghiệm hợp lệ và bước cập nhật phải đổi.



```note-visualization
{"id":"knapsack-branch-bound","preset":"normal"}
```

## 2. DFS, best-first và độ chính xác số

DFS dùng ít bộ nhớ hơn (độ sâu `O(n)`) nhưng có thể tìm nghiệm tốt muộn. Best-first dùng priority queue theo cận, thường tìm nghiệm tốt sớm nhưng có thể giữ rất nhiều trạng thái. Nếu cận tính bằng số thực, làm tròn xuống sai có thể cắt nhánh chứa tối ưu; nên dùng số học chính xác khi có thể, hoặc làm tròn **lên** theo hướng lạc quan. Với giá trị âm, tỷ lệ và cách cận trên thông thường phải xét lại.

**Tự luyện:** (1) Với sức chứa 5, vật `(w,v)=(2,6),(3,6),(4,7)`, tính cận fractional tại gốc. (2) Cho một cận quá thấp và chỉ ra nhánh tối ưu bị loại. (3) Giải thích vì sao có cận hợp lệ vẫn không bảo đảm chạy nhanh trong mọi trường hợp.

*Đối chiếu: Jain, chương 15; Lê Minh Hoàng, phần 1 §4.*

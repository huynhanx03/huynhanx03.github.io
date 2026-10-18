---
title: "Segment tree và Fenwick tree: cập nhật điểm, hỏi tổng đoạn"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/segment-fenwick-trees"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 9
tags: ["segment-tree", "fenwick-tree", "range-query", "lazy-propagation"]
description: "Hai cách lưu tổng trên các đoạn và sự khác nhau giữa truy vấn tĩnh, cập nhật điểm và lazy propagation."
draft: false
---

Tổng tiền tố trả tổng đoạn `O(1)` sau tiền xử lý, nhưng mỗi lần sửa một phần tử có thể buộc cập nhật `O(n)` giá trị tiền tố. Nếu dữ liệu thay đổi và có nhiều truy vấn, ta cần cấu trúc giữ các tổng trung gian. Cả segment tree và Fenwick tree cho cập nhật điểm, tổng tiền tố/đoạn trong `O(log n)`, với cách chia đoạn khác nhau.

## 1. Segment tree

Mỗi nút lưu tổng của một đoạn `[l,r)`. Hai con lưu `[l,m)` và `[m,r)` với `m=(l+r)/2`; tổng cha bằng tổng hai con. Cập nhật `a[i]` chỉ sửa các nút trên một đường từ lá tới gốc, `O(log n)`. Hỏi tổng `[ql,qr)` trả `0` nếu hai đoạn không giao, trả tổng nút nếu đoạn nút nằm trọn trong đoạn hỏi, còn lại cộng kết quả hai con. Một truy vấn chạm `O(log n)` nút “biên” cộng các đoạn phủ hoàn toàn; tổng `O(log n)` cho truy vấn đoạn liên tiếp.





Bất biến: mỗi nút luôn lưu đúng tổng phần tử ở đoạn của nó. Có thể dùng mảng cỡ khoảng `4n` cho cài đệ quy đơn giản, hoặc cây lặp trên một mảng kích thước lũy thừa hai. Bộ nhớ `O(n)`. Nếu phép gộp là min/max thay vì tổng, cần chọn phần tử đơn vị phù hợp (`+∞` cho min, `-∞` cho max).

**Lazy propagation** hỗ trợ cộng một giá trị cho cả đoạn trong `O(log n)`: nút phủ hoàn toàn cập nhật tổng bằng `delta * length` và lưu `lazy` để hoãn đẩy xuống con. Trước khi đi xuống, phải truyền nhãn chờ để bất biến của con đúng. Gán cả đoạn khác cộng cả đoạn: nhãn gán có thể ghi đè nhãn cộng, nên quy tắc kết hợp phải được thiết kế riêng.



```note-visualization
{"id":"segment-query","preset":"normal"}
```



```note-visualization
{"id":"segment-update","preset":"normal"}
```

## 2. Fenwick tree

Fenwick dùng chỉ số **1-based**. `tree[i]` lưu tổng đoạn kết thúc ở `i` có độ dài `lowbit(i)=i & -i`. Thêm `delta` tại chỉ số `i`: cập nhật `i, i+lowbit(i), ...`; tổng tiền tố `1..i`: cộng `tree[i]`, rồi `i-=lowbit(i)` tới 0. Cả hai `O(log n)`, bộ nhớ `O(n)`; tổng `[l,r] = prefix(r)-prefix(l-1)`. Đổi từ chỉ số mảng 0-based sang Fenwick bằng `i+1` và ghi rõ khoảng đóng/mở để tránh lệch một.





Fenwick gọn cho phép cộng và tổng; segment tree linh hoạt hơn cho phép gộp/tác vụ đoạn phức tạp. Cả hai yêu cầu phép gộp có tính kết hợp; phép trừ để lấy đoạn còn cần phần tử nghịch đảo, điều mà min không có.



```note-visualization
{"id":"fenwick-query","preset":"normal"}
```



```note-visualization
{"id":"fenwick-update","preset":"normal"}
```

**Tự luyện:** (1) Vẽ các đoạn `tree[i]` cho `i=1..8`. (2) Truy vấn tổng `[2,5)` trên cây đoạn của 8 phần tử. (3) Giải thích vì sao không thể lấy `min(l,r)` bằng `prefixMin(r)-prefixMin(l-1)`.

*Đối chiếu: Jain, chương 10; mở rộng theo ứng dụng truy vấn đoạn.*

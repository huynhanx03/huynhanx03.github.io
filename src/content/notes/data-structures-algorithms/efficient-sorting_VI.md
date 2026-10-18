---
title: "Merge sort, quicksort, heapsort: ba cách đạt O(n log n)"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/efficient-sorting"
series: "DSA cơ bản"
seriesOrder: 11
tags: ["merge-sort", "quicksort", "heapsort", "stability"]
description: "So sánh chia để trị và heap qua độ phức tạp, bộ nhớ, tính ổn định và đầu vào xấu."
draft: false
updated: 2026-10-15
---

Selection sort tìm minimum mới bằng cách quét lại phần còn lại; số lượt so sánh tăng bậc hai. Muốn sắp dãy lớn, ta cần dùng kết quả của những bước trước để tránh quét lặp như vậy. Merge sort giữ thứ tự của các nửa, quicksort thiết lập quan hệ quanh pivot, còn heapsort giữ một cực trị ở gốc heap.

Ba cách đều thường gắn với O(n log n), nhưng quicksort thông thường có worst-case bậc hai. Cần đọc kèm điều kiện đầu vào, bộ nhớ và độ ổn định thay vì xem tên thuật toán là một cam kết chung.

## Cận dưới so sánh nói trong mô hình nào?

Xét n khóa phân biệt có n! thứ tự đầu vào. Một thuật toán chỉ dùng so sánh phải phân biệt các khả năng ấy để chọn thứ tự đúng. Cây quyết định nhị phân có độ sâu h chứa tối đa 2^h lá, nên cần h ít nhất log₂(n!), tức Ω(n log n). Với khóa phân biệt, mỗi phép so sánh có hai kết quả có ý nghĩa; cách lập luận này không nói một phép toán khai thác chữ số cũng chỉ cung cấp một bit.

Cận dưới là worst-case cho sắp xếp so sánh tổng quát. Dãy đã có nhiều cấu trúc hoặc thuật toán dùng miền khóa bổ sung có thể được phân tích khác. Nó cũng chưa quyết định thuật toán nào có locality hoặc hệ số tốt nhất trên một máy cụ thể.

## Merge sort trả chi phí cho việc trộn

Chia thành hai nửa, sắp mỗi nửa, rồi trộn bằng hai con trỏ đầu. Vì các nửa đã có thứ tự, minimum còn lại luôn là một trong hai đầu; mỗi phần tử được lấy đúng một lần trong bước trộn. Bất biến là phần đã xuất chứa các phần tử nhỏ nhất theo đúng thứ tự.

```note-visualization
{"id":"merge-sort","preset":"normal"}
```

Với trái `[1,4A,4B]`, phải `[2,4C]`, ta lấy 1,2 rồi gặp các khóa 4. Chọn nửa trái khi bằng cho `4A,4B,4C`, giữ thứ tự xuất hiện trong đầu vào. Nếu chọn phải khi bằng, 4C nhảy lên trước và mất ổn định dù thứ tự số vẫn đúng.

Bản chuẩn luôn chia và trộn cho `T(n)=2T(n/2)+Θ(n)`, thời gian Θ(n log n) ở các trường hợp thông thường được xét. Trên array, buffer trộn O(n), stack O(log n), tổng phụ O(n). Cấp buffer một lần rồi dùng lại tránh cấp mới ở mỗi đoạn. Một biến thể có thể bỏ trộn khi hai nửa đã đúng quan hệ, nên không tự gán best-case của bản chuẩn cho mọi phiên bản tối ưu. [Bài chia để trị](/vi/notes/data-structures-algorithms/divide-and-conquer/) có code và chứng minh đầy đủ.

## Quicksort trả chi phí theo chất lượng phân hoạch

Phân hoạch đưa phần tử nhỏ hơn pivot về một phía và lớn hơn về phía kia. Có cách đặt pivot đúng vị trí cuối, có cách chỉ trả ranh giới; phải dùng đúng miền gọi con của sơ đồ đang cài. Một ranh giới phân hoạch không nhất thiết là vị trí cuối cùng của một phần tử pivot cụ thể.

Nếu hai phía gần n/2, tổng theo các tầng là O(n log n). Nếu liên tục nhận 0 và n-1, tổng n+(n-1)+... thành Θ(n²). Chọn phần tử đầu trên dãy tăng là tình huống điển hình của một số bản phân hoạch gây lệch. Pivot ngẫu nhiên cho expected O(n log n) dưới mô hình ngẫu nhiên phù hợp nhưng vẫn có chuỗi lựa chọn xấu; median-of-three là heuristic giảm một số trường hợp xấu, không phải bảo đảm cân bằng tuyệt đối.

```note-visualization
{"id":"quick-sort","preset":"normal"}
```

Với `[3,1,3,2,3]`, pivot 3 và phân hoạch ba vùng sẽ gom thành nhóm `<3` gồm 1,2; nhóm `=3` gồm ba số 3; nhóm `>3` rỗng. Chỉ cần xử lý nhóm nhỏ/lớn, bỏ qua vùng bằng đã hoàn tất. Thứ tự nội bộ trong vùng có thể tùy sơ đồ; mô tả nhóm không hứa một array trung gian duy nhất. Điều này tránh đệ quy lại nhiều lần trên khóa trùng.

Phân hoạch thường tại chỗ nhưng các lời gọi vẫn dùng stack: O(log n) khi cân bằng, có thể O(n) khi lệch. Đệ quy nhánh nhỏ trước rồi **lặp** trên nhánh lớn giữ độ sâu O(log n), vì mỗi lần xuống stack kích thước bài toán ít nhất giảm nửa. Chỉ đổi thứ tự hai lời gọi mà vẫn đệ quy cả hai không đủ kết luận tối ưu stack đó. Thời gian worst-case vẫn có thể bậc hai. Các bản swap tại chỗ thường không ổn định.

## Heapsort giữ phần lớn nhất chưa xuất ở gốc

Tạo max-heap trong đầu dãy, với cha không nhỏ hơn con. Đổi gốc với phần tử cuối vùng heap, thu nhỏ vùng heap một ô rồi sift-down gốc. Sau mỗi lượt, phần đuôi chứa những phần tử lớn nhất đã ở đúng thứ tự; phần đầu lại là max-heap hợp lệ. Khi vùng heap còn một phần tử, toàn dãy tăng.

Build-heap từ dưới lên chỉ O(n). Khoảng một nửa node là lá không cần đi xuống; ít node ở cao mới có nhiều bước. Tổng chi phí có dạng `n Σ h/2^h`, bị chặn bởi hằng số nhân n. Không dùng “n node × log n” làm cận chặt khi đa số node không thể đi log n tầng.

Có O(n) lần lấy maximum, mỗi lần O(log n), nên worst-case O(n log n). Với sift-down lặp, bộ nhớ phụ O(1). Swap gốc với cuối có thể vượt qua phần tử bằng khóa nên không ổn định. Các đường truy cập trong heap nhảy giữa cha/con theo chỉ số; locality có thể kém hơn cách quét liên tiếp hoặc một số quicksort, nhưng tốc độ thực cần đo theo workload.

```note-visualization
{"id":"heap-sort","preset":"normal"}
```

## Chọn theo lời hứa cần giữ

| Bản cổ điển trên array | Worst-case | Bộ nhớ phụ | Stable thông thường |
| --- | --- | --- | --- |
| Merge sort dùng buffer | O(n log n) | O(n) | có nếu trái trước khi bằng |
| Quicksort thông thường | O(n²) | có thể O(n) stack | không |
| Heapsort sift-down lặp | O(n log n) | O(1) | không |

Trong Go, `slices.Sort` hoặc `slices.SortFunc` phục vụ sắp xếp thông thường; `slices.SortStableFunc` giữ thứ tự giữa các phần tử được comparator coi là bằng. Các API sửa slice đầu vào. Comparator phải thỏa thứ tự nhất quán theo hợp đồng thư viện; không dùng comparator thay đổi tùy lần gọi. Không suy từ bảng cổ điển ra chi tiết triển khai thư viện chỉ vì API có tên Sort.

## Tự kiểm tra

**1.** Trộn hai dãy có 4A,4B,4C ở ví dụ bằng quy tắc phải trước sẽ mất gì? **2.** Vì sao ba vùng giúp khi khóa trùng? **3.** Build-heap O(n) có nghĩa array kết quả đã sắp không?

**Giải thích:** Mất thứ tự ban đầu giữa các bản ghi khóa 4, còn thứ tự số không giảm vẫn có thể đúng. Vùng bằng pivot đã có quan hệ cuối với hai vùng ngoài nên không cần đệ quy nó; một phân hoạch kém có thể xử lý lại cùng khóa qua nhiều mức. Build-heap chỉ bảo đảm quan hệ cha/con và cực trị ở gốc; giữa anh em hay hai cây con chưa có thứ tự toàn cục. Muốn dãy sắp cần tiếp tục các lần lấy cực trị.

Tài liệu API: [package slices](https://pkg.go.dev/slices) mô tả các hàm sắp xếp và hợp đồng comparator; các cận trong bảng thuộc những thuật toán đã giải thích ở bài.

---
title: "Suffix array chuyên sâu: xây bằng doubling, tính LCP và trả truy vấn"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/suffix-array-construction"
series: "DSA nâng cao"
seriesOrder: 32
tags: ["string", "suffix-array", "lcp", "kasai"]
description: "Từ sắp hậu tố bằng rank đôi đến LCP tuyến tính và tìm mẫu bằng binary search."
draft: false
updated: 2026-10-15
---

Trong banana, hậu tố ana đứng trước anana vì nó kết thúc sau phần ana chung. Nếu sort các suffix bằng cách đọc từng ký tự mỗi lần, các tiền tố giống nhau bị so lại nhiều lần. Doubling thay các đoạn đã phân loại bằng rank, để mỗi phép so ở lượt tiếp chỉ cần so hai số.

Bài này tiếp nối [suffix structures](/vi/notes/data-structures-algorithms/suffix-approximate/). Ta xây suffix array, tính LCP rồi dùng chúng trả truy vấn. Ví dụ dùng index 0 và các đoạn nửa mở; chọn byte hay rune phải nhất quán trong cả chuỗi và thứ tự alphabet.

## Rank của một đoạn là kết quả so sánh đã cô đọng

Ban đầu, rank[i] biểu diễn thứ tự ký hiệu s[i], nén về các số nguyên không âm. Với banana, dùng a=0,b=1,n=2, được rank ban đầu `[1,0,2,0,2,0]`. Hai vị trí cùng rank nghĩa là tiền tố dài một ký hiệu bằng nhau, chưa nói cả suffix bằng nhau.

Giả sử rank hiện tại mô tả đúng các đoạn dài k. Tiền tố dài 2k của suffix ở i gồm hai nửa có khóa `(rank[i],rank[i+k])`. So từ điển cần so nửa đầu trước; chỉ khi bằng mới xét nửa sau, nên khóa đôi giữ đúng thứ tự. Nếu nửa sau ra ngoài chuỗi, dùng −1 nhỏ hơn mọi rank hợp lệ để suffix ngắn hơn đứng trước phần kéo dài cùng tiền tố.

```go
// Ý tưởng khóa so sánh ở lượt k; rank ngoài chuỗi là -1.
func pair(rank []int, i, k int) (int, int) {
    second := -1
    if i+k < len(rank) { second = rank[i+k] }
    return rank[i], second
}
```

Đây là helper Go để tạo khóa; comparator thực nhận các **vị trí suffix** từ mảng sa. Nếu dùng sort.Slice, các đối số i,j của comparator là index trong sa, nên cần gọi pair(rank,sa[i],k), không dùng i,j trực tiếp như vị trí suffix. Đây là khác biệt giữa thứ tự phần tử đang sort và vị trí trong chuỗi.

```note-visualization
{"id":"suffix-doubling","preset":"normal"}
```

## Làm hai lượt đầu cho banana

Ở k=1, các khóa theo vị trí 0..5 là `(1,0),(0,2),(2,0),(0,2),(2,0),(0,−1)`. Sort cho thứ tự `[5,1,3,0,2,4]` nếu giữ tie theo index. Gán rank mới theo từng nhóm khóa: `[2,1,3,1,3,0]`. Vị trí 1 và 3 vẫn cùng nhóm vì an bằng nhau; chưa có lý do đặt chúng ở thứ tự cuối cùng.

Lượt k=2 dùng các rank mới làm **rank cũ của cả lượt**. Các khóa ở vị trí 0..5 là `(2,3),(1,1),(3,3),(1,0),(3,−1),(0,−1)`. Sort được `[5,3,1,0,4,2]`; mọi nhóm đã khác nhau nên có thể dừng. Rank cuối theo vị trí là `[3,2,5,1,4,0]`.

Sau sort, quét từ trái sang phải, so mỗi khóa với khóa trước để gán lớp mới. Không ghi đè rank trong lúc comparator hoặc việc gán vẫn cần khóa cũ: thay một giá trị giữa chừng làm các phép so không còn mô tả cùng một độ dài. Dùng mảng rank mới rồi thay sau khi xong lượt.

Sau mỗi lượt, invariant là rank phản ánh đúng thứ tự đoạn dài 2k, kể cả phần thiếu cuối chuỗi. Khi độ dài phủ n hoặc mọi rank khác nhau, thứ tự ấy đủ phân biệt suffix hoàn chỉnh. Chuỗi rỗng cho SA rỗng; chuỗi một ký hiệu đã phân biệt ngay, không cần truy cập cặp kế tiếp.

### Cận thời gian phụ thuộc cách sort

Có O(log n) lượt tăng gấp đôi. Comparison sort O(n log n) mỗi lượt, comparator O(1), cho tổng O(n log²n), bộ nhớ O(n). Để đạt O(n log n), dùng counting/radix sort trên các rank đã nén: sort theo thành phần thứ hai rồi thứ nhất bằng sort ổn định, mỗi lượt O(n). Cần ánh xạ sentinel −1 sang miền chỉ số không âm phù hợp.

Vì vậy “doubling O(n log n)” chưa đủ mô tả implementation dùng sort.Slice ở mọi lượt. Nếu chỉ nêu tên mà bỏ công đoạn sort, ta có thể đánh giá thiếu một hệ số log.

## LCP: tái dùng phần chung khi bỏ ký tự đầu

Định nghĩa `lcp[r]` là độ dài tiền tố chung của suffix `sa[r]` với `sa[r−1]`, lcp[0]=0. Với banana và SA trên, LCP là `[0,1,3,0,0,2]`.

Kasai tạo position[i], rank của suffix i, rồi duyệt i theo **thứ tự vị trí gốc**, không theo sa. Giữ h là lượng khớp có thể dùng lại. Nếu suffix i có LCP h với người đứng trước nó, bỏ ký tự đầu khỏi cả hai cho hai suffix có ít nhất h−1 ký tự chung. Suffix đứng ngay trước i+1 trong thứ tự từ điển có thể khác suffix cũ cộng một, nhưng các suffix có chung tiền tố tạo khoảng liên tiếp: người gần i+1 hơn vẫn có ít nhất phần chung ấy. Đây là bước cần để suy ra cận h−1.

```note-visualization
{"id":"kasai-lcp","preset":"normal"}
```

Tại mỗi i có position[i]>0, lấy j=sa[position[i]−1], tiếp tục so từ độ dài h thay vì 0 cho tới hết/sai, lưu LCP rồi giảm h một nếu dương để chuẩn bị i+1. Nếu position[i]=0 không có người trước, đặt h=0. Giảm mỗi lượt tối đa một, còn mọi lần tăng bù bị chặn bởi số ký tự đi qua, nên tổng O(n) thời gian; position và LCP tốn O(n) bộ nhớ.

Điều suy ra là một **cận dưới**, không phải mọi LCP liên tiếp theo vị trí gốc đều bằng h−1. Vẫn cần mở rộng sau khi dùng lại cận; bỏ vòng so thêm sẽ làm mất những tiền tố chung dài hơn.

## Dùng SA và LCP để trả câu hỏi

Max LCP là độ dài substring lặp dài nhất. Nếu một đoạn X xuất hiện ở hai suffix, tất cả suffix bắt đầu bằng X nằm trong cùng khoảng liên tiếp, nên có một cặp kề nhau LCP ít nhất |X|. Ngược lại, một LCP dài k chứng minh có hai lần xuất hiện của một đoạn dài k. Hai chiều này giải thích vì sao chỉ xét cặp kề đủ, thay vì mọi cặp O(n²).

Với banana, max 3 cho ana tại vị trí 3 và 1; hai lần có thể chồng lấn. Nếu yêu cầu không chồng, phải xét thêm khoảng cách vị trí. Đếm nội dung khác nhau cũng là truy vấn khác, không bằng max LCP.

Để tìm mẫu p, binary search hai biên của các suffix có tiền tố p. Comparator bản đơn giản so tối đa |p| ký hiệu nên O(|p| log n), cộng O(occ) nếu xuất vị trí. Đây là chi phí sau xây chỉ mục, không tính lại thời gian doubling. Mẫu rỗng thường khớp ở n+1 ranh giới, trong khi SA bản này chỉ lưu n suffix không rỗng; API cần xử lý riêng chứ không dùng nguyên khoảng SA rồi thiếu cuối chuỗi.

## Tự thử

1. Từ rank `[1,0,2,0,2,0]`, vì sao khóa của vị trí 5 dùng thành phần thứ hai −1?
2. LCP của SA banana bằng gì và đoạn lặp dài nhất là gì?
3. Bản dùng sort.Slice mỗi lượt có thật O(n log n) không?

**Đối chiếu:** (1) Không còn ký tự thứ hai; sentinel làm a đứng trước ana/anana. (2) `[0,1,3,0,0,2]`, cho ana dài 3. (3) Không: O(log n) lượt × O(n log n) sort = O(n log²n). Counting/radix trên rank mới cho cận O(n log n).

## Tài liệu

[Kasai và cộng sự — Linear-Time Longest-Common-Prefix Computation in Suffix Arrays](https://www.ime.usp.br/~cris/aulas/19_1_6957/KasaiLAAP2001-LCP.pdf) trình bày tính LCP tuyến tính. [VNOI — Suffix Array](https://wiki.vnoi.info/algo/string/suffix-array) có các cách dựng phục vụ luyện thuật toán.

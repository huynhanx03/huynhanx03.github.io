---
title: "Suffix tree: trie nén của mọi hậu tố"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/suffix-tree"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 34
tags: ["string", "suffix-tree", "compressed-trie", "ukkonen"]
description: "Tự xây bản dễ hiểu trước, rồi hiểu vai trò của active point và suffix link trong bản tuyến tính."
draft: false
---

Lấy mọi hậu tố của `s` và đưa vào một trie; mọi đường từ gốc biểu diễn một tiền tố của một hậu tố, tức một substring. Trie thô có thể chiếm `Θ(n²)` ký tự/nút. **Suffix tree** nén mọi đoạn đường chỉ có một con thành một cạnh mang cả đoạn chuỗi, lưu cạnh bằng cặp chỉ số `(start,end)` trỏ vào `s` thay vì sao chép ký tự. Với ký tự kết thúc đặc biệt `#` không xuất hiện trong `s`, mỗi hậu tố kết thúc ở một lá riêng. Cây nén có `O(n)` nút/cạnh, dù xây ngây thơ vẫn có thể mất `O(n²)` thời gian.

## 1. Tự xây bản đơn giản

Với từng hậu tố `s[i:] + #`, bắt đầu ở gốc. Chọn cạnh có ký tự đầu phù hợp; so tiếp trên nhãn cạnh. Nếu khớp hết cạnh, đi xuống và tiếp tục. Nếu sai ở giữa cạnh, tạo một nút phân nhánh: cạnh cũ bị tách thành đoạn trước chỗ sai và đoạn còn lại, hậu tố mới tạo cạnh thứ hai từ nút ấy. Nếu không có cạnh phù hợp, tạo lá mới. Bất biến sau khi chèn hậu tố thứ `i`: mọi hậu tố đã chèn có đường riêng từ gốc tới một lá, và các cạnh cùng xuất phát từ một nút có ký tự đầu khác nhau. Vì mỗi lần chèn có thể so `O(n)` ký tự, toàn bộ bản học tập `O(n²)` thời gian.



```text
banana#
  Hậu tố 5: a#
  Hậu tố 3: ana#  → cùng tiền tố a, tách cạnh tại a
  Hậu tố 1: anana# → tiếp tục chia sẻ nhánh ana
```



```note-visualization
{"id":"suffix-trie-compress","preset":"normal"}
```

## 2. Tại sao có thể xây tuyến tính?

Ukkonen thêm từng ký tự từ trái sang phải nhưng xử lý các hậu tố đang hoạt động **ngầm**. `active point` gồm nút hiện tại, cạnh hiện tại và độ dài đã đi trong cạnh; nó giúp bắt đầu lần chèn tiếp tại chỗ thích hợp thay vì quay về gốc. `suffix link` từ một nút biểu diễn `cX` trỏ tới nút biểu diễn `X`, cho phép bỏ ký tự đầu của một hậu tố đã xử lý và tiếp tục với hậu tố kế. Các lá có thể dùng chung một biến `end` tăng theo chuỗi để không cập nhật cuối từng cạnh mỗi lượt. Với alphabet cố định và cài đặt đúng, xây được `O(n)`; đây là thuật toán phức tạp, nên bản nén `O(n²)` là bước học hợp lý trước khi cài Ukkonen.

## 3. Ứng dụng

Để tìm mẫu `p`, đi theo các cạnh so ký tự; nếu đọc hết `p`, mọi lá dưới điểm dừng là vị trí xuất hiện của mẫu. Chi phí tìm là `O(|p|+occ)` khi xuất `occ` vị trí. Nút trong sâu nhất theo tổng độ dài nhãn cạnh cho một substring lặp dài nhất. Với hai chuỗi `A#B$` và hai sentinel khác nhau, đánh dấu lá thuộc chuỗi nào; nút trong sâu nhất có lá từ cả hai nguồn cho longest common substring. Nếu chỉ cần tìm mẫu trong một chuỗi tĩnh, suffix array thường gọn và dễ triển khai hơn.





```note-visualization
{"id":"suffix-tree-search","preset":"normal"}
```

**Tự luyện:** (1) Vẽ trie nén cho `aba#`. (2) Tại sao sentinel cần khác mọi ký tự của chuỗi? (3) Chỉ ra hai hậu tố của `banana` có tiền tố chung `ana`.

*Đọc thêm: [VNOI — danh mục xử lý xâu](https://wiki.vnoi.info/vi/articles), mục Suffix Tree.*

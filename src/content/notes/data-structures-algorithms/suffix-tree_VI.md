---
title: "Suffix tree: trie nén của mọi hậu tố"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/suffix-tree"
series: "DSA nâng cao"
seriesOrder: 34
tags: ["string", "suffix-tree", "compressed-trie", "ukkonen"]
description: "Tự xây bản dễ hiểu trước, rồi hiểu vai trò của active point và suffix link trong bản tuyến tính."
draft: false
updated: 2026-10-15
---

Nếu đưa mọi suffix của banana vào trie, ta lưu lại nhiều đường chỉ có đúng một cách đi tiếp. Suffix tree nén những đường ấy thành cạnh mang cả một đoạn nhãn. Điều quan trọng là nhãn không được copy thành chuỗi riêng ở từng cạnh: nó tham chiếu vào văn bản gốc bằng chỉ số.

Ta sẽ tự xây một bản dễ theo dõi trước, rồi giải thích Ukkonen tránh công việc lặp như thế nào. Bài này giả định bạn đã biết trie và suffix array; phần Ukkonen là bản đồ cơ chế, chưa phải đầy đủ một implementation tuyến tính.

## Nén đường đi mà vẫn giữ mọi substring

Một đường từ gốc trong suffix trie biểu diễn tiền tố của một suffix, tức substring của văn bản. Trie thô có thể Θ(n²) nút/ký tự. Nén mọi đường có một con thành một cạnh lưu cặp [start,end) trong văn bản giúp giữ cùng chuỗi nhãn mà không giữ riêng từng nút trung gian.

Thêm sentinel # không xuất hiện trong s và xây cho `t=s+#`. Mọi suffix của t kết thúc ở một lá riêng, kể cả suffix chỉ gồm #. Không suffix nào là tiền tố hoàn chỉnh của một suffix khác vì # chỉ có ở cuối. Nếu bỏ sentinel, vẫn có cách biểu diễn điểm kết thúc ngầm, nhưng phải xử lý chúng chứ không mặc định mọi suffix kết thúc ở lá.

```note-visualization
{"id":"suffix-trie-compress","preset":"normal"}
```

Với N=|t|, có N lá. Mỗi nút trong khác gốc có ít nhất hai con sau nén, nên số nút trong/cạnh O(N). Mỗi nhãn chỉ giữ hai index O(1), cho bộ nhớ tuyến tính. Nếu copy toàn nhãn ở mỗi cạnh, tổng ký tự lưu có thể lớn hơn và lập luận O(n) ấy không còn áp nguyên vẹn.

## Chèn từng suffix để thấy thao tác tách cạnh

Bắt đầu ở gốc, chọn cạnh theo ký tự đầu của suffix cần chèn. Nếu không có, tạo lá với nhãn phần còn lại. Nếu có, so dọc nhãn cạnh. Khớp hết cạnh thì xuống nút và tiếp tục; sai giữa cạnh thì tạo nút phân nhánh tại chỗ sai, tách nhãn cũ thành hai phần và thêm một cạnh mới cho phần còn lại của suffix mới.

```text
banana#
  Hậu tố 5: a#
  Hậu tố 3: ana#  → cùng tiền tố a, tách cạnh tại a
  Hậu tố 1: anana# → tiếp tục chia sẻ nhánh ana
```

Đoạn text minh họa phần chia sẻ của các suffix kết thúc bằng #. Với a# và ana#, cùng chữ a được chia sẻ; sau nó # khác n nên phải phân nhánh. Khi thêm anana#, phần ana có thể được chia sẻ tiếp rồi tách ở ký tự kế. Index start/end của cạnh cần cập nhật theo điểm tách, còn mỗi lá phải giữ vị trí bắt đầu suffix để sau này trả vị trí xuất hiện.

Sau mỗi lần chèn, invariant là mọi suffix đã xử lý có một đường tới lá và các cạnh cùng xuất phát có ký tự đầu khác nhau. Tách cạnh giữ nguyên đường cũ, thêm đúng đường mới nên không làm mất suffix trước đó. Mỗi chèn có thể đọc O(n) ký tự, tổng O(n²) thời gian dù cây cuối chỉ O(n) kích thước. Cây nhỏ không tự chứng minh thuật toán xây nhanh.

## Ukkonen không quay lại gốc cho mọi suffix

Ukkonen thêm từng ký tự trái sang phải, duy trì cây cho phần văn bản đã đọc và các suffix còn cần cập nhật một cách ngầm. Active point gồm một nút, một cạnh và độ dài đã đi bên trong cạnh. Nó biểu diễn vị trí hiện hành mà không cần tạo nút cho mọi điểm nằm giữa nhãn.

Suffix link của nút biểu diễn cX trỏ tới nút biểu diễn X, cho phép bỏ ký tự đầu rồi tiếp tục với suffix kế. Các leaf edge có thể cùng tham chiếu một biến end tăng mỗi phase; việc nối thêm một ký tự vào mọi suffix đã là lá nhờ đó không cần cập nhật riêng từng lá.

Hai ý này chưa đủ nếu vẫn so lại toàn nhãn hoặc đi lại nhiều đoạn. Bản đầy đủ còn tổ chức extension, dừng khi phần cần nối đã hiện diện và skip/count qua cạnh bằng độ dài. Với alphabet cố định và cấu trúc chuyển phù hợp, phân tích amortized cho O(n) xây dựng. Nếu tra cạnh bằng cấu trúc cân bằng theo alphabet lớn, chi phí lookup cần được tính thêm.

Đây là lý do học bản chèn nén O(n²) trước có ích: nó làm rõ thao tác split và invariant. Muốn cài Ukkonen phải đối chiếu đầy đủ các quy tắc active point/link/end, không lấy ba tên biến rồi tự suy rằng code đã tuyến tính.

## Tìm mẫu có thể dừng giữa cạnh

Từ gốc, theo nhãn tương ứng với p và so ký tự. Nếu sai hoặc không có cạnh, mẫu không xuất hiện. Nếu đã đọc hết p, kể cả đang ở giữa một cạnh, mọi lá dưới phần đường ấy cho một lần xuất hiện; không cần bắt mẫu kết thúc đúng một nút rõ ràng.

```note-visualization
{"id":"suffix-tree-search","preset":"normal"}
```

Với lookup cạnh O(1), tìm và xuất occ vị trí tốn O(|p|+occ). Mẫu rỗng và sentinel là các trường hợp API cần quy ước; thường người dùng tìm trong s gốc, không coi # là ký tự thật được hỏi. Nếu chỉ kiểm tra tồn tại thì không cần duyệt mọi lá.

Nút trong sâu nhất theo **tổng độ dài nhãn**, không theo số cạnh, cho substring lặp dài nhất. Mọi nút trong có ít nhất hai lá nên chuỗi đường tới nó xuất hiện ít nhất hai lần. Trong banana, hai suffix ở 1 và 3 cùng tiền tố ana; các lần này có thể chồng lấn, nên yêu cầu không chồng lấn cần thêm điều kiện vị trí.

## Hai nguồn dữ liệu trên cùng một cây

Với A#B$ và hai sentinel khác nhau không có trong dữ liệu, phân loại lá theo điểm bắt đầu thuộc A hay B. Nút sâu nhất có lá từ cả hai nguồn cho longest common substring. Độ sâu đo số ký hiệu trước sentinel; một đoạn đi qua ký tự phân cách không phải substring hợp lệ của cả hai nguồn. Hai sentinel riêng giúp các suffix có đường kết thúc phân biệt và ngăn chia sẻ giả qua ranh giới.

Suffix array thường gọn hơn và dễ triển khai cho văn bản tĩnh, còn tree diễn đạt trực tiếp các nhánh tiền tố và việc liệt kê dưới một điểm dừng. Chọn cấu trúc theo truy vấn và bộ nhớ, không chỉ vì suffix tree có cận xây tốt nhất tuyến tính. Byte/rune/grapheme cũng cần thống nhất như các cấu trúc chuỗi khác.

## Tự thử rồi đối chiếu

1. Các nhánh chính của trie nén cho aba# bắt đầu bằng gì? Nhánh a phân ra sao?
2. Vì sao sentinel cần vắng mặt trong dữ liệu?
3. Suffix nào của banana cùng bắt đầu ana, và vì sao cần độ sâu nhãn thay vì số cạnh để đo nó?

**Đối chiếu:** (1) Gốc có a,b,#. Nhánh a chia sau a thành # cho suffix a# và ba# cho aba#; b dẫn ba#. (2) Nó xác định kết thúc riêng, không bị hiểu là ký hiệu nội dung ở giữa, để các suffix tương ứng lá đúng. (3) Vị trí 1 và 3; cạnh có thể dài nhiều ký tự sau nén, nên số cạnh không bằng độ dài chuỗi.

## Tài liệu

[Ukkonen — On-line construction of suffix trees](https://www.cs.helsinki.fi/u/ukkonen/SuffixT1withFigs.pdf) trình bày cách đi từ suffix trie sang cây nén và xây trực tuyến. [Suffix array chuyên sâu](/vi/notes/data-structures-algorithms/suffix-array-construction/) là hướng thay thế khi ưu tiên một chỉ mục mảng trên văn bản tĩnh.

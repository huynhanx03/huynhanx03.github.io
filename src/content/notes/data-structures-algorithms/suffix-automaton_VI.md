---
title: "Suffix automaton: gom các đoạn con có cùng tập vị trí kết thúc"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/suffix-automaton"
series: "DSA nâng cao"
seriesOrder: 33
tags: ["string", "suffix-automaton", "substring", "endpos"]
description: "Xây automaton bằng trạng thái last, suffix link và clone; đếm đoạn con khác nhau."
draft: false
updated: 2026-10-15
---

Chuỗi ab có ba substring không rỗng khác nhau: a,b,ab. Với chuỗi dài n, số substring có thể Θ(n²), nhưng ta vẫn muốn kiểm tra mẫu hoặc đếm chúng mà không lưu từng chuỗi. Suffix automaton gộp những substring có cùng tập vị trí kết thúc, tạo một đồ thị nhỏ hơn nhiều.

Bài này giả định bạn biết automaton, suffix và đồ thị có cạnh mang ký hiệu. Ta tập trung vào ý nghĩa trạng thái, vì nếu chỉ nhớ các dòng clone mà chưa hiểu lớp đang bị tách, rất khó sửa một implementation sai.

## Các chuỗi khác nhau có thể cùng kết thúc ở một tập vị trí

Trong ab, b và ab đều chỉ kết thúc ở index 1. Chúng có thể cùng một trạng thái endpos={1}. A kết thúc ở 0 nên thuộc trạng thái khác. Một trạng thái vì thế không nhất thiết biểu diễn đúng một substring, mà biểu diễn một lớp có cùng **endpos**.

Từ gốc, đọc một dãy ký hiệu theo transitions; nếu đường đi tồn tại, dãy ấy là substring. Khi dùng SAM như máy nhận **suffix**, còn cần đánh dấu các trạng thái kết thúc suffix; khả năng đi được một đường từ gốc là phép kiểm substring và không đòi trạng thái cuối là suffix terminal. Không đồng nhất hai câu hỏi này hoặc gọi SAM là suffix tree dưới hình khác.

Mỗi v giữ len[v], độ dài lớn nhất trong lớp. link[v] trỏ tới lớp của hậu tố dài nhất nằm ngoài lớp ấy. Mọi độ dài từ `len[link[v]]+1` tới len[v] có đúng một substring trong lớp: chúng là các hậu tố lồng nhau của đại diện dài nhất. Bởi vậy số substring không rỗng khác nhau là

`Σ_{v≠root}(len[v]−len[link[v]])`.

Với ab, trạng thái a có khoảng độ dài 1, trạng thái b/ab có khoảng 1..2. Tổng 1+2=3. Các lớp endpos rời nhau và mỗi độ dài trong một lớp chỉ có một chuỗi nên công thức không đếm trùng, dù không liệt kê ba chuỗi ấy.

```note-visualization
{"id":"sam-substring-count","preset":"normal"}
```

## Thêm ký tự: cập nhật mọi suffix vừa được kéo dài

Ban đầu gốc có len=0,link=−1; last là trạng thái của toàn bộ tiền tố đã đọc. Khi thêm c, tạo cur có len=len[last]+1. Từ last đi ngược links, với mỗi trạng thái p chưa có cạnh c, thêm p —c→ cur. Những suffix ấy vừa có một cách kéo dài mới.

Khi gặp p đã có cạnh c tới q, có ba trường hợp:

1. Nếu không gặp p trước khi về −1, link[cur]=root.
2. Nếu len[p]+1=len[q], q có độ dài phù hợp cho suffix mới, nên link[cur]=q.
3. Nếu len[p]+1<len[q], đường mới tới q ngắn hơn độ dài lớn nhất q đang giữ; phải tách lớp bằng clone.

Clone sao chép transitions và link của q, nhưng len[clone]=len[p]+1. Đi ngược các tổ tiên còn có cạnh c trỏ q và đổi chúng sang clone, rồi đặt link[q]=link[cur]=clone. Cuối bước, last=cur. Sao chép map transitions trong code phải tạo bản sao độc lập nếu sau đó các trạng thái có thể đổi cạnh; gán chung một map rồi sửa sẽ phá việc tách trạng thái.

```note-visualization
{"id":"sam-extend","preset":"normal"}
```

## Vì sao clone cần thiết: một ví dụ nhỏ abb

Sau ab, b và ab cùng endpos={1}, nên ở chung q có len=2. Thêm b thứ hai tạo cur cho abb. Từ trạng thái ab chưa có cạnh b, ta thêm tới cur. Đi link về gốc, gốc đã có cạnh b tới q, nhưng len[root]+1=1 nhỏ hơn len[q]=2.

Giờ b kết thúc ở cả 1 và 2, còn ab vẫn chỉ kết thúc ở 1. Chúng không thể cùng một lớp nữa. Clone có len=1 đại diện b; q tiếp tục đại diện ab. Cạnh b từ gốc đổi sang clone, link của q và cur cùng trỏ clone. Clone nhận các đường nối tiếp cần từ q nhưng **không** là một vị trí kết thúc mới tự phát sinh.

Ví dụ này cho thấy clone không đơn thuần là tối ưu bộ nhớ. Nếu bỏ nó, len/link và lớp endpos sai, kéo theo công thức đếm và số lần xuất hiện sai. Tối đa mỗi ký tự tạo một cur và một clone nên số trạng thái O(n). Cận chuẩn 2n−1 áp dụng khi n≥2; với n=1 có gốc và một trạng thái, tức 2, còn chuỗi rỗng chỉ có gốc.

## Số lần xuất hiện: cộng dồn về suffix link

Mỗi cur tạo khi đọc một vị trí mới nhận count ban đầu 1; clone nhận 0 vì không thêm vị trí văn bản. Xử lý trạng thái theo len giảm dần, cộng count[v] vào count[link[v]]. Một lần kết thúc của chuỗi dài cũng là một lần kết thúc của suffix nó, nên propagation khôi phục endpos counts.

Sau khi đọc mẫu p từ gốc, count ở trạng thái đạt được chính là số vị trí kết thúc của p, dù p không phải đại diện dài nhất của trạng thái. Trong abb, b có count 2, ab có count 1. Phải propagation theo thứ tự giảm len; cộng trong thứ tự tạo tùy tiện có thể gửi số đếm chưa hoàn chỉnh lên tổ tiên. Mẫu rỗng có n+1 ranh giới và cần quy ước riêng, không lấy count[root] làm đáp án một cách máy móc.

## Các truy vấn và điều kiện chi phí

Kiểm tra mẫu dài m mất O(m) transition với alphabet có lookup hằng số. Longest common substring của chuỗi gốc và chuỗi khác có thể tìm bằng quét chuỗi thứ hai: giữ state và độ dài khớp, thiếu cạnh thì đi links để rút suffix, có cạnh thì kéo dài; theo dõi độ dài lớn nhất. Khi đi link phải cập nhật độ dài tương ứng, không giữ một length vượt len của trạng thái mới.

Số trạng thái/cạnh là O(n); bản xây chuẩn có thời gian tuyến tính với alphabet cố định và thao tác chuyển phù hợp. Chỉ việc nói “mỗi ký tự tạo tối đa hai trạng thái” chưa chứng minh thời gian của mọi cách copy map hoặc tìm cạnh. Mảng transitions nhỏ cho hằng số ổn định nhưng tốn theo alphabet ở từng state; map thưa tiện với alphabet lớn nhưng lookup/bộ nhớ có chi phí thực và cận trung bình theo implementation.

Nếu chuỗi là UTF-8, quyết định dùng byte hay rune trước xây: n, len và vị trí endpos đều theo số ký hiệu đã chọn. Một SAM cho byte vẫn đúng với bài byte, nhưng không tự trả số ký tự hiển thị.

## Tự thử

1. Với ab, hai trạng thái khác gốc đóng góp bao nhiêu substring?
2. Khi thêm b vào ab, vì sao b và ab phải tách lớp? Clone nhận count ban đầu bao nhiêu?
3. Vì sao hai lớp không thể đếm trùng một substring trong công thức len−len[link]?

**Đối chiếu:** (1) 1 và 2, tổng 3: a,b,ab. (2) B có endpos {1,2}, ab chỉ {1}; clone nhận 0, cur mới nhận 1, rồi propagation tạo số đếm đúng. (3) Mỗi substring có một endpos xác định nên thuộc một lớp duy nhất; trong lớp, mỗi độ dài ứng với một hậu tố xác định. Cần cả hai ý để chứng minh không trùng.

## Tài liệu

[Ukkonen — On-line construction of suffix trees](https://www.cs.helsinki.fi/u/ukkonen/SuffixT1withFigs.pdf), phần về suffix automata/DAWG, nối suffix links với máy trạng thái. [VNOI — Suffix Automaton](https://wiki.vnoi.info/algo/string/suffix-automaton) có trình bày thực hành các bước extend và clone.

---
title: "Suffix automaton: gom các đoạn con có cùng tập vị trí kết thúc"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/suffix-automaton"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 33
tags: ["string", "suffix-automaton", "substring", "endpos"]
description: "Xây automaton bằng trạng thái last, suffix link và clone; đếm đoạn con khác nhau."
draft: false
---

Suffix automaton (SAM) là automaton hữu hạn biểu diễn **mọi substring** của một chuỗi. Từ trạng thái đầu, đi theo các cạnh mang ký tự của một chuỗi `p`; nếu đi được thì `p` là substring. Nó không phải suffix tree viết theo cách khác: SAM gộp những substring có cùng tập **vị trí kết thúc** (`endpos`) vào một trạng thái, nhờ đó số trạng thái và số cạnh là `O(n)` theo alphabet cố định hoặc biểu diễn chuyển tiếp phù hợp.

## 1. Ý nghĩa trạng thái

Mỗi trạng thái `v` lưu `len[v]`: độ dài lớn nhất của substring thuộc lớp ấy; `link[v]` là trạng thái biểu diễn hậu tố dài nhất thuộc lớp khác. Những độ dài substring mới do trạng thái `v` đại diện nằm trong `(len[link[v]], len[v]]`. Từ đó số substring **khác nhau** là tổng `len[v]-len[link[v]]` trên mọi trạng thái khác gốc. Đây là kết quả đẹp: không cần liệt kê có thể là `Θ(n²)` substring.

## 2. Xây từng ký tự

Ban đầu chỉ có gốc với `len=0`, `link=-1`; `last` là trạng thái của toàn bộ chuỗi đã đọc. Khi thêm ký tự `c`, tạo trạng thái `cur` với `len[cur]=len[last]+1`. Đi ngược suffix links từ `last`, bổ sung cạnh `c` tới `cur` ở các trạng thái chưa có cạnh ấy. Gọi trạng thái đầu tiên đã có cạnh `c` là `p`, cạnh tới `q`:



- Nếu không có `p` (đã tới `-1`), `link[cur]=root`.
- Nếu `len[p]+1==len[q]`, `link[cur]=q`.
- Nếu `len[p]+1<len[q]`, cần **clone** `q`: sao chép transitions và suffix link của `q`, đặt `len[clone]=len[p]+1`, rồi đổi những cạnh `c` của các trạng thái tổ tiên đang trỏ `q` sang clone. Cuối cùng `link[q]=link[cur]=clone`.

Clone không đại diện một lần xuất hiện mới; nó tách một lớp endpos cũ khi xuất hiện đường mới với độ dài ngắn hơn. Nếu bỏ bước clone, điều kiện khoảng độ dài của trạng thái hỏng, công thức đếm substring và những truy vấn khác sẽ sai. Mỗi ký tự tạo tối đa một trạng thái mới và một clone, nên tối đa `2n-1` trạng thái cho chuỗi không rỗng.



```note-visualization
{"id":"sam-extend","preset":"normal"}
```

## 3. Ứng dụng và chi phí

Kiểm tra một mẫu `p` có là substring trong `O(|p|)` bằng cách đi từ gốc theo transitions. Để đếm số lần xuất hiện, mỗi trạng thái mới `cur` nhận đếm ban đầu 1, clone nhận 0; cộng dồn đếm từ trạng thái có `len` lớn xuống `link`. Số đếm của trạng thái đạt được khi đọc `p` chính là số vị trí kết thúc của `p`. Để tìm longest common substring của chuỗi xây automaton và chuỗi khác, quét chuỗi thứ hai, khi không có cạnh thì lần theo suffix links và rút ngắn chiều dài khớp.



Với `map[byte]int`, code dễ viết nhưng lookup và bộ nhớ phụ thuộc số cạnh thực tế; với alphabet cố định nhỏ, mảng transitions cho chi phí hằng số ổn định hơn. Một chuỗi UTF-8 cần quyết định xử lý byte hay rune; số trạng thái tính theo số ký hiệu được chọn.



```note-visualization
{"id":"sam-substring-count","preset":"normal"}
```

**Tự luyện:** (1) Xây SAM cho `ab`, đếm ba substring `a,b,ab`. (2) Giải thích clone khác trạng thái `cur` ở số lần xuất hiện ban đầu. (3) Vì sao tổng `len[v]-len[link[v]]` không đếm trùng substring?

*Đọc thêm: [VNOI — Suffix Automaton](https://wiki.vnoi.info/algo/string/suffix-automaton).*

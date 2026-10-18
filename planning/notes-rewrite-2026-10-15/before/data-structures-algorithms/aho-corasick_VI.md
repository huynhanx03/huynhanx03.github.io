---
title: "Aho–Corasick: tìm nhiều mẫu cùng lúc"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/aho-corasick"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 31
tags: ["string", "trie", "aho-corasick", "failure-link"]
description: "Gắn failure links vào trie để quét văn bản một lần và tìm các mẫu chồng lấn."
draft: false
---

Có hàng nghìn từ khóa và một văn bản dài. Chạy KMP riêng cho từng từ khóa sẽ đọc văn bản hàng nghìn lần. Aho–Corasick đặt các mẫu vào một trie, rồi thêm **failure link** để khi nhánh hiện tại không khớp ký tự tiếp theo, máy chuyển sang hậu tố dài nhất còn có thể là tiền tố của mẫu khác. Nó là ý tưởng “fallback” của KMP áp dụng cho nhiều mẫu.

## 1. Xây automaton

Mỗi nút trie biểu diễn một tiền tố của ít nhất một mẫu. `fail[v]` trỏ tới nút biểu diễn hậu tố **thật sự** dài nhất của chuỗi tại `v` mà cũng tồn tại trong trie. Gốc có failure về chính nó. Dùng BFS từ gốc: với cạnh ký tự `c` từ `u` sang `v`, lần theo `fail[u]` để tìm trạng thái có cạnh `c`, hoặc về gốc nếu không có; đó là `fail[v]`. Vì nút failure luôn có độ sâu nhỏ hơn, BFS bảo đảm link cần thiết đã biết trước khi xử lý con.


```note-visualization
{"id":"aho-trie","preset":"normal"}
```



```note-visualization
{"id":"aho-failure","preset":"normal"}
```








Khi quét văn bản, từ trạng thái `state`, nếu không có cạnh mang ký tự mới thì đi theo failure links cho tới khi có cạnh hoặc về gốc; nếu có cạnh, chuyển sang con. Mọi mẫu kết thúc tại `state` là kết quả. Ngoài ra, mẫu ngắn hơn có thể kết thúc tại các failure ancestor: ví dụ với mẫu `he` và `she`, khi khớp `she` phải báo **cả hai**. Có thể nối danh sách kết quả từ failure link hoặc dùng một **output link** tới nút terminal gần nhất để không sao chép quá nhiều ID vào từng nút.


```note-visualization
{"id":"aho-scan","preset":"normal"}
```


Với các mẫu `he`, `she`, `hers` và văn bản `ushers`, quá trình quét đọc `u,s,h,e,r,s`. Tại ký tự `e` ở vị trí 3, trạng thái hiện tại khớp `she` (bắt đầu 1), còn failure/output link cho biết `he` cũng kết thúc tại đó (bắt đầu 2). Sau đó trạng thái có thể tiếp tục theo `r,s` để báo `hers` bắt đầu ở vị trí 2. Đây là lý do chỉ kiểm tra `terminal` ở nút hiện tại sẽ bỏ sót kết quả.

```go
// Khi automaton đã được dựng, next[state][c] là chuyển tiếp
// đầy đủ; output[state] là các ID mẫu kết thúc ở trạng thái.
func Scan(text string, next [][26]int, output [][]int, lengths []int,
    report func(patternID, start int)) {
    state := 0
    for i := 0; i < len(text); i++ {
        c := int(text[i] - 'a')
        if c < 0 || c >= 26 { state = 0; continue }
        state = next[state][c]
        for _, id := range output[state] {
            report(id, i+1-lengths[id])
        }
    }
}
```

Đoạn Go này giả sử **chỉ mẫu và văn bản chữ thường `a`–`z`**, mọi trạng thái đã có đủ 26 chuyển tiếp (chuyển tiếp thiếu ở gốc về gốc, ở nút khác kế thừa từ failure link), và `output[state]` đã gồm cả kết quả dọc failure links. Ký tự ngoài alphabet đặt lại trạng thái về gốc; nếu ứng dụng muốn coi chữ hoa hoặc dấu tiếng Việt là cùng một chữ, phải chuẩn hóa trước. `report` nhận byte offset. Trường hợp mẫu rỗng cần một quy ước riêng vì nó khớp tại mọi ranh giới.

## 2. Chi phí và lựa chọn biểu diễn

Xây trie tốn tổng chiều dài mẫu `L` nút/cạnh trong trường hợp xấu. Với alphabet cố định nhỏ và bảng chuyển hoàn chỉnh, xây automaton thường `O(L·alphabet)` và quét văn bản `O(n+matches)`; với map con thưa, chi phí phụ thuộc số lần theo failure và lookup, nhưng tổng quét vẫn có thể chứng minh tuyến tính theo chiều dài văn bản cộng số kết quả trong cách cài chuẩn. Không thể in `matches` kết quả nhanh hơn kích thước đầu ra.

Nếu chỉ cần **đếm** số mẫu khớp mà không in vị trí, có thể ghi số lần đến mỗi trạng thái rồi cộng ngược theo cây failure. Nếu thêm mẫu mới sau khi xây, failure links hiện tại có thể hết đúng; bản tĩnh thường phải xây lại. Nếu cần xóa mẫu hoặc cập nhật liên tục, cần cấu trúc động khác.

**Tự luyện:** (1) Dựng trie cho `he`, `she`, `his`, `hers`. (2) Trong `ushers`, vì sao phải báo cả `she` và `he`? (3) Khi một mẫu là tiền tố của mẫu khác, cờ terminal ở nút nào?

*Đọc thêm: [VNOI — Aho–Corasick](https://wiki.vnoi.info/algo/string/aho-corasick).*

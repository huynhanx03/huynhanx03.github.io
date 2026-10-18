---
title: "Trie và radix tree: chỉ mục theo tiền tố"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/tries-radix-trees"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 8
tags: ["trie", "radix-tree", "prefix-search", "unicode"]
description: "Tìm kiếm tiền tố, đánh dấu kết thúc từ và nén các đường chỉ có một con."
draft: false
---

Trie lưu khóa dưới dạng đường đi theo từng ký hiệu. Hai khóa có cùng tiền tố chia sẻ những cạnh đầu. Với khóa dài `L`, tìm/chen/xóa đi `O(L)` bước theo số ký hiệu, không phụ thuộc trực tiếp tổng số khóa; đổi lại bộ nhớ có thể lớn nếu nhiều nút ít con. Đây là lựa chọn tự nhiên cho autocomplete, từ điển tiền tố và routing theo prefix.

## 1. Bất biến nút và kết thúc từ

Một nút biểu diễn tiền tố tạo bởi đường từ gốc; `terminal` cho biết **chính tiền tố này** là một khóa hoàn chỉnh. Nếu chứa `an` và `and`, nút `an` phải là terminal dù vẫn có con `d`. Tìm khóa cần theo hết đường rồi kiểm tra terminal; tìm tiền tố chỉ cần đường tồn tại. Xóa `an` chỉ bỏ terminal, không được xóa đường còn phục vụ `and`.





```go
type TrieNode struct {
    End bool
    Next map[rune]*TrieNode
}

func Insert(root *TrieNode, word string) {
    node := root
    for _, ch := range word {
        if node.Next == nil { node.Next = make(map[rune]*TrieNode) }
        if node.Next[ch] == nil { node.Next[ch] = &TrieNode{} }
        node = node.Next[ch]
    }
    node.End = true
}
```

Code chọn `rune` làm ký hiệu, nên tính theo Unicode code point; một chữ hiển thị có dấu kết hợp có thể gồm nhiều rune. Nếu ứng dụng coi hai chuỗi Unicode tương đương là cùng khóa, cần chuẩn hóa đầu vào trước khi đưa vào trie. Dùng `map[rune]` tiết kiệm so với mảng kích thước bảng chữ cái lớn ở nút thưa, nhưng có overhead; với alphabet nhỏ cố định, mảng con có thể nhanh hơn.



```note-visualization
{"id":"trie-insert-search","preset":"normal"}
```



```note-visualization
{"id":"trie-delete","preset":"normal"}
```

## 2. Xóa và nén đường

Khi xóa, đi tới terminal, bỏ cờ, rồi đi ngược lên: chỉ tháo một nút nếu nó **không terminal và không còn con**. Nếu cần biết số từ dưới mỗi tiền tố, lưu `subtreeCount` và cập nhật trên đường chèn/xóa, cẩn thận với chèn khóa đã tồn tại. Radix tree (compressed trie) gộp chuỗi các nút chỉ có một con thành một cạnh mang **đoạn chuỗi**. Khi chèn một từ rẽ giữa cạnh, phải tách cạnh tại tiền tố chung; khi xóa làm nút còn một con, có thể gộp lại. Nó giảm số nút nhưng phép so sánh cạnh phải xét nhiều ký hiệu.



Trie không tự trả từ theo thứ tự từ điển nếu con lưu bằng `map` Go vì thứ tự duyệt không xác định. Muốn output ổn định, sắp khóa con hoặc dùng cấu trúc con có thứ tự.



```note-visualization
{"id":"radix-compression","preset":"normal"}
```

**Tự luyện:** (1) Vẽ trie của `to`, `tea`, `ten`. (2) Xóa `tea` mà giữ `ten`. (3) Mô tả cách tách cạnh radix khi đã có `testing` và chèn `test`.

*Đối chiếu: Drozdek, chương 7; Lê Minh Hoàng, phần 2 §9.*

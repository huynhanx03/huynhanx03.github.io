---
title: "Trie và radix tree: chỉ mục theo tiền tố"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/tries-radix-trees"
series: "DSA nâng cao"
seriesOrder: 8
tags: ["trie", "radix-tree", "prefix-search", "unicode"]
description: "Tìm kiếm tiền tố, đánh dấu kết thúc từ và nén các đường chỉ có một con."
draft: false
updated: 2026-10-15
---

Một danh bạ có `an`, `and`, `ant`. Khi người dùng gõ `an`, cả ba tên cùng có một tiền tố. Hash table tìm khóa đầy đủ tốt nhưng không tự gom chúng theo tiền tố; trie dùng chính đường đi qua từng ký hiệu của khóa để chia sẻ phần đầu ấy.

Với khóa dài L ký hiệu, tìm/chèn/xóa đi qua O(L) cạnh trong trie thường, nếu chọn một con có chi phí hằng số; dùng map cho con thường cho chi phí kỳ vọng tương ứng. Tổng số khóa không trực tiếp quyết định độ dài một đường, nhưng bộ nhớ và lượng kết quả truy vấn tiền tố vẫn có thể lớn.

## Một node là một tiền tố, chưa chắc một từ

Gốc biểu diễn tiền tố rỗng. Cạnh nhãn a rồi n đưa tới node `an`. Cờ terminal/End nói chính tiền tố này là khóa hoàn chỉnh. Nếu chỉ giữ đường mà không cờ, không phân biệt tập {and} với tập {an,and}.

Tìm **khóa** `an` cần đi hết hai cạnh và kiểm tra End. Tìm **tiền tố** `an` chỉ cần đường tồn tại. Một node vừa terminal vừa có con là hợp lệ: `an` là từ, còn d và t mở rộng thành những từ khác.

Khai báo Go dưới đây dùng rune làm ký hiệu. Root cần được cấp và không nil, chẳng hạn `root := &TrieNode{}`. Map con được tạo khi cần, nên node mới không phải tạo sẵn map ở mọi tầng.

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

Chèn `an` tạo đường a→n rồi bật End tại n. Chèn `and` đi lại a,n đã có và chỉ thêm d; End tại n vẫn bật. Chèn lại `an` chỉ bật cờ đã true, không tạo bản sao từ: code thể hiện một tập khóa, không phải multiset đếm số lần thêm.

```note-visualization
{"id":"trie-insert-search","preset":"normal"}
```

Chuỗi rỗng không có lượt range, nên code bật End của root. Nếu ứng dụng không chấp nhận khóa rỗng, cần từ chối ở API trước Insert; không giả định vòng lặp tự loại trường hợp ấy. Đường mới luôn đi sâu một ký hiệu nên không tạo chu trình trong cấu trúc được quản lý đúng.

## Unicode quyết định L đang đếm gì

`range` string Go giải mã UTF-8 thành rune, tức code point. Một chữ hiển thị có thể gồm nhiều code point do dấu kết hợp. Hai cách mã hóa Unicode tương đương về hiển thị có thể tạo hai đường trie khác nhau nếu không chuẩn hóa cùng quy tắc trước chèn/tìm/xóa.

Với ứng dụng coi các dạng tương đương là cùng khóa, chọn normalization phù hợp rồi áp dụng nhất quán ở mọi thao tác; có thể còn cần chính sách hoa/thường theo nghiệp vụ. Không gọi mọi thay đổi này là “chuẩn hóa Unicode” duy nhất vì chúng giải quyết các quan hệ khác nhau. [Go: Text normalization](https://go.dev/blog/normalization) giải thích quan hệ biểu diễn Unicode.

Code minh họa thích hợp với đầu vào UTF-8 hợp lệ. Với byte lỗi, range có thể sinh rune thay thế; nếu cần phân biệt mọi chuỗi byte kể cả không hợp lệ, trie byte hoặc bước validation rõ sẽ phù hợp hơn. Thuật toán phải chốt đơn vị byte/rune trước khi hứa equality của khóa.

Map rune tiết kiệm so với mảng con rất lớn ở node thưa, nhưng mỗi map có overhead. Alphabet nhỏ cố định có thể dùng array để truy cập con worst-case hằng số, đổi lại nhiều ô rỗng. Đánh giá bộ nhớ theo số node/cạnh và layout thực, không chỉ theo L của một khóa.

## Xóa phải giữ đường đang phục vụ khóa khác

Xóa `an` trong {an,and,ant} chỉ bỏ End tại node n. Không tháo n vì nó vẫn có con d,t. Nếu xóa `and`, bỏ End d rồi có thể tháo d vì không còn terminal hay con; n vẫn cần cho `an` hoặc `ant`.

Quy tắc đi ngược đường xóa là chỉ tháo node khi **không terminal và không còn con**. Trước hết phải xác nhận khóa tồn tại; xóa một khóa chưa có không được làm giảm bộ đếm hay tháo đường của một tiền tố hợp lệ.

```note-visualization
{"id":"trie-delete","preset":"normal"}
```

Với {to,tea,ten}, gốc có t; sau t rẽ o và e; e rẽ a,n. Xóa tea tháo a nhưng giữ e vì còn ten, và giữ t vì còn to. Đây là tình huống nhỏ để kiểm tra thuật toán không xóa quá xa lên trên.

Nếu cần đếm số từ dưới tiền tố, lưu subtreeCount và cập nhật các node trên đường. Chèn một khóa đã có chỉ nên tăng nếu hợp đồng là multiset; với set, phải biết lần chèn ấy có thật sự tạo từ mới trước khi cộng. Xóa cần điều kiện đối xứng. Cờ End và count có liên quan nhưng không thay thế nhau một cách tùy tiện.

## Radix tree nén phần đường chưa rẽ

Nếu một chuỗi node trung gian không kết thúc khóa và chỉ có một con, có thể gộp các cạnh thành một cạnh mang đoạn chuỗi. Thay t→e→s→t→i→n→g bằng cạnh `testing` giảm số node cần giữ. Một terminal ở giữa như `test` là ranh giới cần bảo toàn, không được nén làm mất thông tin kết thúc từ.

Đang có cạnh `testing`, chèn `test`: tiền tố chung dài 4, tách thành cạnh `test` tới node terminal rồi cạnh `ing` tới terminal của testing. Nếu chèn `team` vào cạnh `testing`, tiền tố chung `te` tạo node rẽ, hai cạnh còn lại `sting` và `am`. Phải so ký hiệu trong nhãn cạnh, không chỉ ký hiệu đầu.

```note-visualization
{"id":"radix-compression","preset":"normal"}
```

Khi xóa làm một node không terminal chỉ còn một con, có thể nối nhãn cạnh vào và bỏ node trung gian. Root hoặc node terminal có vai trò riêng nên không cứ “một con” là gộp. Cách nén giảm node/pointer, nhưng tổng ký hiệu được so trên đường vẫn cần tính theo L; giảm số cạnh không biến lookup một khóa dài thành O(1).

## Truy vấn tiền tố còn phải trả kết quả

Theo đường prefix để tới node hoặc vị trí trong một cạnh radix. Sau đó duyệt các nhánh dưới nó để xuất khóa. Chi phí không chỉ O(L_prefix): nếu prefix rỗng và từ điển có rất nhiều từ, còn phải duyệt/xuất lượng dữ liệu ấy. Autocomplete giới hạn số kết quả cần thêm chính sách thứ tự/ưu tiên phù hợp.

Map con Go không có thứ tự duyệt xác định, nên DFS trie dùng map chưa tự cho thứ tự từ điển ổn định. Cần sắp các ký hiệu con hoặc dùng cấu trúc con có thứ tự; tính thêm chi phí đó. Thứ tự code point cũng chưa tự là thứ tự sắp tên theo ngôn ngữ của người dùng.

## Tự kiểm tra

**1.** Tìm `te` trong trie {to,tea,ten} có thành công không? **2.** Xóa tea tháo những node nào? **3.** Chèn test vào cạnh testing đặt terminal ở đâu?

**Giải thích:** Lookup tiền tố thành công vì có đường t,e; lookup khóa thất bại nếu node e chưa End. Xóa tea bỏ End và tháo a, giữ e vì còn n và giữ t vì còn các từ khác. Radix cần tách cạnh tại test và bật terminal ở node tách, giữ phần ing đi tới khóa testing. Cả ba câu đều yêu cầu phân biệt “đường tồn tại” với “một khóa kết thúc ở đây”.

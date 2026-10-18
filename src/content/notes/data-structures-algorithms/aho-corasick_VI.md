---
title: "Aho–Corasick: tìm nhiều mẫu cùng lúc"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/aho-corasick"
series: "DSA nâng cao"
seriesOrder: 31
tags: ["string", "trie", "aho-corasick", "failure-link"]
description: "Gắn failure links vào trie để quét văn bản một lần và tìm các mẫu chồng lấn."
draft: false
updated: 2026-10-15
---

Trong văn bản `ushers`, ta cần tìm đồng thời `he`, `she`, `hers`. Khi đọc tới chữ e, vừa khớp she vừa khớp he. Nếu chỉ kiểm tra mẫu dài nhất đang đi theo, ta mất một kết quả đúng. Nếu chạy KMP riêng cho từng mẫu, lại phải quét văn bản nhiều lần khi từ điển có hàng nghìn mẫu.

Aho–Corasick dùng một trie chung cho các tiền tố và thêm đường fallback để tiếp tục từ hậu tố còn hữu ích. Bài này giả định bạn biết trie, BFS và ý tưởng border/fallback của [KMP](/vi/notes/data-structures-algorithms/string-matching/). Chỉ số ví dụ bắt đầu từ 0.

## Trie cho biết tiền tố nào đang được đọc

Chèn từng mẫu vào trie; nút v đại diện chuỗi ký tự trên đường từ gốc tới v. Đánh dấu terminal ở **mọi nút kết thúc một mẫu**, không chỉ lá: nếu có he và hers, nút he vừa terminal vừa có cạnh đi tiếp. Nếu cùng một mẫu có nhiều ID theo ứng dụng, phải quyết định lưu một hay nhiều ID; cấu trúc không tự gộp ý nghĩa nghiệp vụ.

```note-visualization
{"id":"aho-trie","preset":"normal"}
```

Khi quét, trạng thái cần biểu diễn hậu tố dài nhất của phần văn bản đã đọc mà còn là tiền tố trong trie. Nếu đọc thêm ký tự c có cạnh, đi cạnh ấy. Nếu không, bỏ toàn bộ về gốc có thể mất một hậu tố ngắn hơn vẫn nối được c; ta cần failure link.

## Failure link là nơi tiếp tục hợp lệ dài nhất

`fail[v]` trỏ tới nút có chuỗi là hậu tố **thật sự** dài nhất của chuỗi tại v và cũng có mặt trong trie. Gốc fail về chính nó; con trực tiếp của gốc fail về gốc. Ví dụ fail của she là he. Khi she không có cạnh r, đi fail tới he rồi cạnh r sẽ giữ được her, thay vì quên cả phần đã đọc.

```note-visualization
{"id":"aho-failure","preset":"normal"}
```

Xây fail bằng BFS từ gốc. Với cạnh u —c→ v, tìm trạng thái từ fail[u] có cạnh c sau các lần fallback; nếu có thì đích là fail[v], nếu không thì gốc. Không áp công thức này cho con gốc một cách máy móc rồi tạo self-link. Vì failure của u có độ sâu nhỏ hơn u, BFS bảo đảm phần thông tin cần từ mức trước đã sẵn sàng.

Với bảng alphabet nhỏ, có thể điền đủ chuyển tiếp: cạnh thiếu ở gốc trỏ về gốc; cạnh thiếu ở nút khác kế thừa chuyển tiếp của fail. Khi ấy phần scan chỉ tra next[state][c], không tự chạy while. Với cạnh thưa, giữ riêng cạnh trie và đi theo fail khi cần; đó là hai cách biểu diễn cùng hành vi, không được trộn ý nghĩa “không có cạnh” với một transition đã điền sẵn.

## Báo cả mẫu kết thúc trên chuỗi failure

Sau khi đọc e ở vị trí 3 trong ushers, trạng thái she có mẫu she bắt đầu tại 1. Failure tới he cho thêm mẫu he bắt đầu tại 2. Đọc r tiếp theo fallback từ she tới he rồi đi r, đọc s tạo hers bắt đầu tại 2. Các lần khớp chồng lấn là kết quả cần giữ.

```note-visualization
{"id":"aho-scan","preset":"normal"}
```

Có thể gộp output của fail vào output hiện tại khi xây. Cách này làm scan đơn giản nhưng sao chép nhiều ID nếu mẫu có nhiều hậu tố cũng là mẫu. Output link là lựa chọn khác: trỏ tới terminal gần nhất trên chuỗi fail rồi lần theo các terminal để báo kết quả, tránh lưu lặp toàn bộ danh sách ở từng nút.

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

Hàm Go là phần scan **sau khi automaton đã xây**. next phải có đủ 26 transition ở mọi state, output[state] phải gồm cả kết quả qua failure, lengths ánh xạ ID sang độ dài mẫu; report là callback caller cung cấp. Nó không phải cả bộ dựng Aho–Corasick và không thể dùng một bảng cạnh trie còn để trống thay cho next đầy đủ.

Mẫu ở đây chỉ chứa a..z. Văn bản ngoài alphabet đặt state về gốc; nghĩa là không mẫu hợp lệ nào được phép bắc qua ký tự ấy. Nếu muốn chữ hoa và chữ thường tương đương hoặc hỗ trợ tiếng Việt, phải chọn alphabet/chuẩn hóa trước, không chỉ sửa mỗi phép trừ 'a'. Report trả byte offset; với mẫu UTF-8 hoặc rune cần đổi cả bảng chuyển và length theo cùng đơn vị. Mẫu rỗng khớp tại mọi ranh giới nên phải có quy ước riêng trước khi dùng đoạn scan này.

## Vì sao quét không phụ thuộc số mẫu ở từng ký tự?

Gọi L là tổng độ dài mẫu, n là độ dài văn bản. Trie có tối đa L+1 nút. Với alphabet σ và bảng chuyển đầy đủ, riêng việc dựng bảng chuyển/failure tốn O(Lσ), còn scan chuyển trạng thái tốn O(n). Nếu sao chép các danh sách output kế thừa như cách dùng trong hàm Scan, cần cộng thêm O(Q) thời gian và bộ nhớ, với Q là tổng số ID được lưu qua mọi danh sách output. Mỗi ID được sao chép đều cần một lần ghi; không thể bỏ chi phí ấy khỏi bước dựng. Output link tránh việc lưu lặp toàn bộ danh sách. Nếu xuất matches kết quả, thời gian scan là O(n+matches), với giả định callback report tốn O(1) cho mỗi kết quả; callback làm thêm việc phải được tính riêng.

Với cạnh thưa và lookup O(1) trung bình, mỗi bước đi cạnh tăng độ sâu nhiều nhất một, còn failure giảm độ sâu. Tổng số fallback trong scan bị chặn bởi tổng tăng độ sâu, nên vẫn có quét tuyến tính theo n cộng đầu ra trong bản chuẩn. Lookup kiểu cây có thể thêm log σ; sao chép output còn tạo chi phí bộ nhớ ngoài riêng bảng chuyển. Cận phải đi cùng biểu diễn, không chỉ tên thuật toán.

## Nếu cần đếm thay vì in mọi vị trí

Có thể tăng visit[state] mỗi lần scan tới state. Sau đó duyệt các nút theo độ sâu giảm, cộng visit[v] vào visit[fail[v]]. Mỗi lần tới v cũng là một lần xuất hiện của các hậu tố trên failure path, nên sau cộng dồn số ở terminal là số lần mẫu ấy kết thúc. Cách này tránh xuất từng match khi chỉ cần thống kê, nhưng vẫn phải trả đủ số kết quả đếm theo các mẫu cần hỏi.

Bản này là automaton tĩnh. Thêm mẫu có thể tạo một hậu tố-prefix dài hơn cho fail của nút cũ, nên không chỉ chèn nhánh mới là mọi link còn đúng. Thường xây lại khi từ điển đổi; xóa/cập nhật liên tục cần thiết kế động khác hoặc cách tổ chức nhiều automaton. Chọn Aho–Corasick khi có nhiều mẫu và cần chia sẻ một lượt quét, không chỉ vì một mẫu đơn lẻ có thể đặt trong trie.

## Tự thử

1. Thêm his vào bộ he,she,hers. Có làm nút he mất terminal không?
2. Tại e của ushers, báo mẫu nào và bắt đầu đâu?
3. Nếu chỉ nhìn output riêng của state hiện tại mà không truyền output hoặc có output link, mất gì?

**Đối chiếu:** (1) Không; terminal gắn với việc một mẫu kết thúc ở nút, không với việc nút có con. (2) she ở 1 và he ở 2. (3) Bỏ he khi đứng ở she; sau đó hers ở 2 vẫn là một lần khác cần báo. BFS dựng fail và cách báo output giải hai phần liên quan nhưng không thay thế nhau.

## Tài liệu

[Aho và Corasick — Efficient String Matching: An Aid to Bibliographic Search](https://doi.org/10.1145/360825.360855) trình bày máy tìm nhiều từ khóa; [VNOI — Aho–Corasick](https://wiki.vnoi.info/algo/string/aho-corasick) là tài liệu luyện triển khai.

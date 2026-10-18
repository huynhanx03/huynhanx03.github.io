---
title: "DSU rollback: quay lại trạng thái kết nối trước đó"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/dsu-rollback"
series: "DSA nâng cao"
seriesOrder: 26
tags: ["dsu", "rollback", "offline-connectivity"]
description: "Lưu lịch sử các phép gộp để xử lý nhiều nhánh truy vấn kết nối offline."
draft: false
updated: 2026-10-15
---

DSU thường rất hợp với việc thêm cạnh: mỗi cạnh có thể gộp hai thành phần. Nhưng khi xóa cạnh, một thành phần có thể phải tách thành nhiều phần mà DSU không lưu đủ cấu trúc để biết cách tách. DSU rollback giải một yêu cầu hẹp hơn: quay lại đúng trạng thái trước một loạt phép gộp, theo thứ tự ngược.

Điều này đặc biệt hữu ích khi biết trước mọi thao tác, tức xử lý offline. Ta tổ chức các trạng thái cần xét thành cây, đi vào một nhánh thì thêm cạnh, quay ra thì hoàn tác. Đây không phải cấu trúc online hỗ trợ tùy ý xóa một cạnh bất kỳ ngay trong lịch sử.

## Mỗi phép gộp phải có một bản ghi đủ để đảo lại

Bản rollback dùng union by size nhưng thường bỏ path compression. Mỗi `Find` chỉ đọc chuỗi cha. Khi gắn gốc cây nhỏ vào gốc cây lớn, chỉ hai dữ liệu cần đổi: cha của gốc nhỏ và size của gốc lớn. Lưu chúng trước khi ghi, rồi hoàn tác theo stack.

Vì một nút chỉ tăng độ sâu khi cây chứa nó được gộp vào cây ít nhất cùng kích thước, kích thước thành phần khi ấy ít nhất gấp đôi. Có tối đa `O(log n)` lần như vậy, nên `Find` là `O(log n)` tệ nhất dù không nén đường. Path compression có thể dùng nếu log mọi thay đổi cùng phân tích phù hợp, nhưng không còn là bản đơn giản với số thay đổi hằng số cho mỗi gộp.

```go
type Change struct { Small, Large, OldSize int }
type RollbackDSU struct { Parent, Size []int; History []Change }

func (d *RollbackDSU) Find(x int) int {
    for d.Parent[x] != x { x = d.Parent[x] }
    return x
}
func (d *RollbackDSU) Snapshot() int { return len(d.History) }
func (d *RollbackDSU) Union(a, b int) bool {
    a, b = d.Find(a), d.Find(b)
    if a == b { return false }
    if d.Size[a] < d.Size[b] { a, b = b, a }
    d.History = append(d.History, Change{b, a, d.Size[a]})
    d.Parent[b] = a
    d.Size[a] += d.Size[b]
    return true
}
func (d *RollbackDSU) Rollback(snapshot int) {
    for len(d.History) > snapshot {
        i := len(d.History)-1
        c := d.History[i]
        d.History = d.History[:i]
        d.Parent[c.Small] = c.Small
        d.Size[c.Large] = c.OldSize
    }
}
```

Đây là các khai báo Go. Khởi tạo hai slice cùng độ dài, `Parent[i]=i`, `Size[i]=1`; đầu vào đỉnh phải hợp lệ. `History` ban đầu rỗng. `Snapshot()` trả **độ dài lịch sử**, không phải bản sao toàn bộ DSU. `Union` thất bại không ghi marker; cách dùng snapshot theo chiều dài làm điều này hợp lệ. Nếu API muốn hoàn tác theo số lần gọi Union, phải có quy ước marker khác.

`Rollback(snapshot)` cần một snapshot hợp lệ còn thuộc tiền tố lịch sử hiện tại. Nó không đi tới tương lai, cũng không lưu nhiều phiên bản để truy cập độc lập. Mỗi bản ghi được lấy ra khôi phục `Small` về gốc và trả size của `Large` về giá trị cũ. Size của gốc nhỏ không bị sửa lúc gộp nên không cần thêm bản sao cho nó.

## Theo lịch sử qua một lần quay lại

Bắt đầu ba đỉnh riêng. `Union(0,1)` tạo một bản ghi; gọi snapshot được 1. `Union(1,2)` tìm gốc của 1, nối 2 vào thành phần `{0,1}`, tạo bản ghi thứ hai. Lúc này `Find(0)==Find(2)` đúng.

Rollback về 1 chỉ lấy bản ghi thứ hai: đỉnh 2 lại là gốc riêng, size của thành phần `{0,1}` trở về 2. Phép gộp 0-1 vẫn còn, vì nó diễn ra trước snapshot. Query 0 với 2 vì thế trả false. Nếu sau đó một nhánh khác thêm 0-2, nó bắt đầu từ đúng trạng thái `{0,1},{2}`, không bị tác động của nhánh cũ.

```note-visualization
{"id":"dsu-rollback","preset":"normal"}
```

Bất biến là mọi thay đổi sau snapshot nằm ở đỉnh stack, và bản ghi sau được đảo trước bản ghi trước. Thứ tự ấy bảo đảm `Large` trong bản ghi đang hoàn tác đã trở về đúng cấu trúc tại lúc gộp. Hoàn tác `k` lần gộp thành công tốn `O(k)`; `Union` cần hai Find nên `O(log n)`, ghi lịch sử thêm `O(1)`. Muốn đếm thành phần, giữ một biến giảm khi gộp thành công và tăng khi undo; code hiện tại chưa giữ biến ấy.

## Biến xóa cạnh thành rời khỏi một nhánh thời gian

Có `q` mốc thao tác. Cạnh sống từ lúc thêm `l` đến trước lúc xóa `r` có khoảng `[l,r)`. Dựng cây phân chia trục thời gian; gắn cạnh vào một tập nút có các đoạn rời nhau phủ đúng khoảng sống. Mỗi khoảng chỉ cần `O(log q)` nút, như cách phân rã truy vấn đoạn của segment tree.

DFS cây thời gian: chụp snapshot, Union mọi cạnh gắn ở nút, xử lý con, rồi rollback. Tại lá thời điểm `t`, những cạnh trên đường từ gốc xuống lá chính xác là các cạnh sống ở `t`. Một cạnh không sống ở đó không có đoạn phủ lá ấy; một cạnh sống có đúng một nút trong phủ rời nhau nằm trên đường ấy. Do đó DSU tại lá trả đúng trạng thái kết nối.

```note-visualization
{"id":"offline-connectivity","preset":"normal"}
```

Với trục `[0,8)` chia đôi đều, khoảng `[2,6)` gắn vào hai nút `[2,4)` và `[4,6)`. Không gắn một lần vào `[0,8)` vì sẽ làm cạnh xuất hiện sai ở 0,1,6,7; cũng không bắt buộc gắn từng lá 2,3,4,5 vì hai đoạn lớn đã đủ.

Gọi `m` là số khoảng sống, không nhất thiết số cặp đỉnh phân biệt. Có `O(m log q)` lần gộp, mỗi lần `O(log n)`, nên thời gian `O(m log q log n)` cộng duyệt cây thời gian và chi phí query. Query kết nối dùng hai Find nên thêm `O(log n)` mỗi query. Bộ nhớ lưu các danh sách cạnh ở cây thời gian là `O(m log q)`, cộng DSU, lịch sử đang mở và cây thời gian.

Phải ghép đúng lần thêm/xóa: cạnh chưa xóa kéo dài đến `q`. Với multigraph, hai bản sao cùng đầu mút có thể sống khác khoảng; dùng ID hoặc đếm số bản sao theo hợp đồng, không coi xóa một bản sao là xóa mọi cạnh giữa hai đỉnh.

**Tự kiểm tra:** rollback trong ví dụ có xóa gộp 0-1 không? Vì sao Find không nén đường? `[2,6)` trên `[0,8)` gắn ở đâu?

**Giải thích:** không, vì gộp 0-1 có trong tiền tố snapshot. Bỏ nén đường giúp Find không phát sinh hàng loạt phép ghi cần undo; union by size vẫn giữ chiều cao logarithm. Hai đoạn `[2,4),[4,6)` phủ đúng khoảng, nên mỗi lá hợp lệ gặp cạnh một lần trên đường DFS.

*Đọc thêm: [VNOI — DSU Rollback](https://wiki.vnoi.info/algo/data-structures/dsu-rollback).*

[USACO Guide — Offline deletion](https://usaco.guide/adv/offline-del) — rollback DSU và tổ chức các khoảng thời gian.

---
title: "Map: tra cứu key, đồng bộ và các thế hệ runtime"
category: "Go"
tags: ["golang", "maps", "fundamentals"]
description: "Map lưu quan hệ key → value. Hãy học hành vi được Go bảo đảm trước, rồi đọc bucket/Swiss Table như chi tiết implementation theo phiên bản; hai lớp kiến thức này không thay thế nhau."
updated: 2026-10-15
translationKey: "go/maps"
---

Điểm 0 có thể mang hai nghĩa: người chơi chưa ghi điểm, hoặc tên người chơi chưa có trong danh sách. Map giúp tra điểm theo tên, nhưng một lần đọc thông thường chưa phân biệt được hai tình huống ấy. Ta sẽ bắt đầu từ đó, rồi xem cần thay đổi cách dùng thế nào khi nhiều goroutine cùng sửa bảng điểm.

Bài này giả định bạn đã biết hàm, struct và cách dùng slice cơ bản. Các đoạn code độc lập: đặt câu lệnh trong `main`, khai báo hàm/type bên ngoài, thêm `fmt`, `math` hoặc `sync` khi cần. Kết quả chú thích được suy ra từ quy tắc ngôn ngữ; sơ đồ runtime mô tả từng cách triển khai, không phải hợp đồng chung của Go.

## Lưu giá trị rồi hỏi key có tồn tại không

```go
scores := make(map[string]int, 100)
scores["An"] = 0
value, ok := scores["An"]
fmt.Println(value, ok) // 0 true
value, ok = scores["Binh"]
fmt.Println(value, ok) // 0 false
delete(scores, "An")
fmt.Println(len(scores)) // 0
```

`map[string]int` liên kết key kiểu string với value kiểu int. Phép gán tạo entry cho An dù giá trị bằng 0. Tra Binh cũng nhận zero value của `int`, nhưng `ok` bằng false vì chưa có entry. Khi “không có” khác với “có giá trị 0”, hãy dùng dạng nhận hai kết quả.

Số 100 truyền cho `make` là gợi ý kích thước. Nó không tạo 100 entry, cũng không cấp một capacity công khai; `cap(scores)` không hợp lệ. Literal như `map[string]int{"An": 10}` tạo entry ngay. `len` đếm entry; xóa key không tồn tại vẫn hợp lệ.

Zero value của map cho thấy một khác biệt nữa:

```go
var missing map[string]int
fmt.Println(missing["An"], len(missing)) // 0 0
delete(missing, "An")                   // Valid.
// missing["An"] = 1                    // Would panic.
missing = make(map[string]int)
missing["An"] = 1
```

Nil map đọc, duyệt và `delete` được, nhưng chưa có storage khởi tạo để thêm entry. Hãy khởi tạo trước khi ghi. Empty map khác nil cũng chưa có entry, nhưng ghi được. Bởi vậy, một hàm khởi tạo map khi cần còn phải bảo đảm caller giữ lại giá trị map mới.

## Phép gán chia sẻ entry, không nhân bản chúng

```go
a := map[string]int{"Go": 1}
b := a
b["Go"] = 2
fmt.Println(a["Go"]) // 2
b = map[string]int{"Go": 3}
fmt.Println(a["Go"], b["Go"]) // 2 3
```

Phép gán đầu sao chép giá trị map cùng tham chiếu tới dữ liệu chung. Sửa entry qua `b` vì thế thay đổi kết quả đọc qua `a`. Phép gán sau thay riêng giá trị của biến `b`, không chuyển `a` sang map khác. Muốn có entry độc lập, tạo map mới rồi chép từng entry. Nếu value chứa pointer, map hoặc slice thì bản chép ấy vẫn chia sẻ dữ liệu bên trong.

Khi value là struct, lookup lấy ra một giá trị, không cho ta một biến struct có thể lấy địa chỉ để sửa trường trực tiếp:

```go
type User struct { Name string }
users := map[int]User{1: {Name: "An"}}
// users[1].Name = "Mai" // Invalid: map element is not addressable.
u := users[1]
u.Name = "Mai"
users[1] = u
```

Ta lấy struct ra, sửa bản sao rồi ghi lại. Với `map[int]*User`, có thể sửa qua pointer, nhưng pointer có thể nil và nhiều entry hoặc goroutine có thể cùng giữ một user. Đổi kiểu value vì thế thay đổi cả trách nhiệm sở hữu và đồng bộ, ngoài khác biệt về cú pháp.

## Key cần phép so sánh bằng, không chỉ cần hash

Key phải comparable. Số, string, pointer và array/struct có các thành phần comparable có thể làm key; slice, map và function thì không. `map[any]int` hợp lệ, nhưng chèn một slice làm giá trị động của key sẽ panic vì slice không comparable.

Hash thu hẹp vùng tìm kiếm; equality xác nhận đúng key. Hai key khác nhau vẫn có thể cùng hash nên hash không phải định danh duy nhất. Lookup, update và delete thường có chi phí trung bình tốt, nhưng specification không hứa O(1) cho mọi đầu vào.

Một giá trị comparable đặc biệt cho thấy vì sao equality quan trọng:

```go
n := math.NaN()
values := map[float64]string{n: "value"}
_, found := values[n]
fmt.Println(found) // false
clear(values)
fmt.Println(len(values)) // 0
```

NaN không bằng chính nó. Ta chèn được entry và có thể gặp entry khi range, nhưng lookup hoặc delete bằng NaN không khớp key ấy. `clear`, có từ Go 1.21, xóa toàn bộ entry, kể cả entry này. Nếu miền dữ liệu có NaN và cần tra/xóa thông thường, nên xem lại việc chọn số thực làm key.

Để biểu diễn tập hợp, dùng map không có payload mang ý nghĩa riêng:

```go
languages := map[string]struct{}{"Go": {}}
_, present := languages["Go"]
fmt.Println(present) // true
```

`struct{}` cho biết ta chỉ quan tâm phần tử có mặt hay không. Value này có size 0 nhưng map vẫn tốn key, metadata và có thể có padding. Không thể từ đó suy ra luôn tiết kiệm đúng một byte mỗi entry so với `bool`.

## Duyệt map không tạo ra danh sách đã sắp xếp

Thứ tự range không được xác định và có thể đổi ngay ở lần duyệt tiếp theo. Muốn xuất báo cáo ổn định, thu keys vào slice, sort rồi tra value theo thứ tự đó.

Trong một lần duyệt đã được đồng bộ phù hợp, entry bị xóa trước khi tới lượt sẽ không được sinh ra; entry mới thêm có thể được thấy hoặc bỏ qua. Quy tắc cho phép sửa khi duyệt không cho phép goroutine khác ghi mà thiếu đồng bộ. Thứ tự duyệt và truy cập đồng thời là hai vấn đề riêng.

## Khóa cả thao tác mà caller thực sự cần

Nhiều goroutine có thể cùng đọc một map đã được công bố qua đồng bộ phù hợp, miễn không goroutine nào sửa nó. Khi có ghi xen với truy cập khác, phải bảo vệ những lần đọc và ghi liên quan. Runtime có thể phát hiện và dừng process bằng fatal error do concurrent map access, nhưng không gặp lỗi ấy chưa chứng minh code an toàn và không thay race detector.

Giả sử hai request cùng tăng một bộ đếm. Hai method `Get` và `Set` có khóa riêng tránh truy cập bộ nhớ không đồng bộ, nhưng vẫn cho phép lịch sau:

| Bước | Request A | Request B |
| --- | --- | --- |
| Đọc dưới khóa riêng | Đọc 0 | Đọc 0 |
| Tính ngoài khóa | Tính 1 | Tính 1 |
| Ghi dưới khóa riêng | Ghi 1 | Ghi 1 |

Kết quả là 1 thay vì 2. Đây là mất cập nhật dù có thể không có data race. API cần một thao tác giữ khóa xuyên suốt việc đọc–sửa–ghi:

```go
type Counts struct {
    mu sync.Mutex
    values map[string]int
}

func (c *Counts) Increment(key string) int {
    c.mu.Lock()
    defer c.mu.Unlock()
    if c.values == nil {
        c.values = make(map[string]int)
    }
    c.values[key]++
    return c.values[key]
}

func (c *Counts) Get(key string) (int, bool) {
    c.mu.Lock()
    defer c.mu.Unlock()
    value, ok := c.values[key]
    return value, ok
}

func (c *Counts) Set(key string, value int) {
    c.mu.Lock()
    defer c.mu.Unlock()
    if c.values == nil {
        c.values = make(map[string]int)
    }
    c.values[key] = value
}
```

Zero value dùng được vì nil map đọc được, còn nhánh ghi khởi tạo map dưới khóa. Giữ field không export giúp caller không đi vòng qua mutex. Mọi truy cập phải theo cùng quy tắc và không copy `Counts` sau khi đã dùng mutex. Khi cần tăng, gọi `Increment`; ghép `Get` và `Set` vẫn có lỗi mất cập nhật.

### Khi nhiều reader cùng giữ khóa

`sync.RWMutex` cho nhiều reader cùng giữ `RLock`, còn writer dùng `Lock` độc quyền. Để đổi ví dụ trên, thay kiểu mutex và dùng `RLock`/`RUnlock` trong `Get`; `Set` và `Increment` vẫn cần khóa độc quyền.

Khi writer chờ, reader mới bị chặn để writer có cơ hội chạy. Reader cũ giữ khóa lâu vẫn trì hoãn writer. Không lấy read lock đệ quy hoặc nâng trực tiếp `RLock` đang giữ lên `Lock`: những mẫu ấy có thể deadlock. Nhiều đọc ít ghi là lý do để khảo sát `RWMutex`, chưa phải bằng chứng overhead của nó đáng giá. Cần so trên workload thực tế.

### Khi sync.Map phù hợp

```go
var values sync.Map
values.Store("Go", 2009)
if raw, ok := values.Load("Go"); ok {
    if year, ok := raw.(int); ok {
        fmt.Println(year)
    }
}
actual, loaded := values.LoadOrStore("Rust", 2010)
fmt.Println(actual, loaded) // 2010 false
values.Delete("Rust")
values.Range(func(key, value any) bool {
    fmt.Println(key, value)
    return true
})
```

`sync.Map` có zero value dùng được và các thao tác API an toàn khi gọi đồng thời; không copy sau lần dùng đầu. `LoadOrStore` kiểm tra/chèn trong một thao tác map. Chuỗi `Load`, tính cục bộ rồi `Store` vẫn chưa thành phép tăng atomic. `Range` không tạo snapshot nhất quán của toàn map; object mutable sau pointer được lưu vẫn cần bảo vệ riêng.

API dùng `any` nên phải assertion để lấy kiểu cụ thể. Map có kiểu kết hợp lock thường diễn đạt invariant liên quan nhiều entry rõ hơn. `sync.Map` chuyên cho những trường hợp như key ghi một lần đọc nhiều, hoặc các goroutine làm việc trên những tập key ít giao nhau. Chọn theo hành vi cần có rồi mới đo CPU và bộ nhớ; không cách nào thắng ở mọi workload.

## Đọc lịch sử runtime mà vẫn giữ đúng quy tắc ngôn ngữ

Phần này giúp đọc source và khảo sát hiệu năng. Các chi tiết bên dưới không thay quy tắc lookup, chia sẻ dữ liệu hay khóa đã học.

### Bucket của Go 1.23 trở về trước

```text
hmap: count | B | hash0 | buckets | oldbuckets
bucket count = 2^B
bmap: tophash[8] | keys[8] | values[8] | overflow reference
```

`B` điều khiển số bucket theo lũy thừa hai, không phải capacity công khai chính xác. Seed hash riêng của map làm phân bố khác nhau. Bit thấp chọn bucket; `tophash` lọc ứng viên trước equality đầy đủ. Tám slot chính không giới hạn lookup ở tám phép so sánh vì va chạm có thể tạo overflow chain. Tách keys và values có thể giảm padding so với xen kẽ từng cặp, tùy layout kiểu key/value.

Implementation lịch sử thường grow quanh mức trung bình 6,5 entry/bucket, khoảng 81% slot chính. Nó giữ đồng thời array bucket cũ và mới rồi di tản bucket dần khi sửa map. Công việc chuyển dữ liệu vì thế được phân bố thay vì chép toàn map một lần. Nhiều overflow còn có thể gây same-size grow để sắp xếp lại mà không nhân đôi số bucket. Đây là công việc tăng trưởng của map, không phải một GC stop-the-world phase.

### Swiss Tables được đưa vào Go 1.24

```text
map → directory → tables → groups
                           control word: 8 control bytes
                           slots: 8 key-value pairs
hash → select table/group → filter by 7-bit h2 → full equality
                         ↘ probe other groups when needed
```

Mỗi control byte ghi trạng thái empty/deleted hoặc mảnh hash bảy bit, gọi là `h2`. So metadata theo word lọc nhiều slot ứng viên cùng lúc; h2 khớp vẫn phải so key đầy đủ. Tùy kiến trúc, phép so dùng SIMD hoặc arithmetic/bit operations portable. Không thể nói mọi lookup đều là đúng một lệnh SIMD.

Probing đi theo một sequence các group, không theo overflow list và cũng không nhất thiết sang group liền kề. Extendible hashing qua directory cho một table grow hoặc split mà không ảnh hưởng các table khác. Thiết kế Go 1.24 giới hạn table ở 1.024 slot, tức 128 group, trước khi split; map nhỏ có đường xử lý riêng. Đây là chi tiết theo phiên bản nhằm giới hạn công việc grow, không hứa hết latency spike hoặc mọi thao tác đều nhanh hơn.

### sync.Map có lịch sử riêng

```text
before Go 1.24:
  mu | read (atomic pointer) | dirty | misses
           ↘ shared entries ↙
                  entry.p
from Go 1.24:
  concurrent hash trie (HashTrieMap)
```

Ở thiết kế cũ, `read` phục vụ view đọc nhanh, còn `dirty` giữ key cần slow path. Cờ `amended` cho biết có key ngoài `read`. Load không thấy trong fast view có thể lấy mutex, tra `dirty` và tăng số miss; đủ miss sẽ promote `dirty` thành `read`. Các map cùng giữ entry có pointer value cập nhật atomic; trạng thái nil/expunged hỗ trợ xóa và chèn lại. Điều đó không khiến mọi update đều lock-free. Go 1.24 thay tổ chức này bằng concurrent hash trie; đừng dùng sơ đồ read/dirty để giải thích implementation mới.

## Xóa entry và trả bộ nhớ là hai thời điểm khác nhau

`delete` lẫn `clear` đều không hứa storage thu nhỏ ngay. Nếu map từng lớn nhưng sẽ chỉ còn ít entry lâu dài, có thể chép những entry cần giữ sang map mới. Storage cũ chỉ có thể được thu hồi khi mọi alias ngừng giữ nó. Nếu không cần entry nào, bỏ toàn bộ tham chiếu tới map. Cả hai cách đều cần đồng bộ khi goroutine khác còn sử dụng.

Đủ điều kiện cho GC thu hồi là một bước; trả page về hệ điều hành lại là bước khác. RSS không nhất thiết giảm ngay khi entry biến mất. Bài [Garbage collection](/vi/notes/go/garbage_collection/) giải thích các phép đo ấy.

## Thử dự đoán trước khi xem đáp án

1. Sau `b := a`, `b = make(map[string]int)` có làm rỗng `a` không? Nếu gọi `clear(b)` trước khi thay map thì sao?
2. Vì sao `Get` rồi `Set`, dù từng method có khóa, vẫn có thể mất một lần tăng? Khóa phải bao phủ phần nào?
3. Một bài nói về `oldbuckets`, bài khác nói directory split, bài thứ ba nói promote `dirty`. Chúng đang mô tả cấu trúc nào?

**Giải thích:**

1. Thay biến chỉ đổi `b`; `a` vẫn giữ map cũ. Nếu clear trước khi thay, entry của map chung bị xóa nên `a` cũng thấy map rỗng.
2. Goroutine khác có thể đọc cùng giá trị cũ giữa hai lời gọi. Giữ một khóa từ lúc đọc, qua tính toán đến khi ghi như `Increment`.
3. `oldbuckets` thuộc built-in map lịch sử tới Go 1.23; directory split thuộc built-in map Swiss Table đưa vào 1.24; promote dirty thuộc `sync.Map` cũ, được thay trong 1.24. Không cơ chế nào là yêu cầu của ngôn ngữ.

## Tài liệu đối chiếu

- [Go specification: maps](https://go.dev/ref/spec#Map_types), [indexing](https://go.dev/ref/spec#Index_expressions) và [range](https://go.dev/ref/spec#For_range) — hành vi ngôn ngữ.
- [Swiss Table maps](https://go.dev/blog/swisstable) — thiết kế Go 1.24 và lý do tổ chức grow.
- [sync.Map](https://pkg.go.dev/sync#Map) và [RWMutex](https://pkg.go.dev/sync#RWMutex) — hợp đồng API.
- [Map source Go 1.23](https://github.com/golang/go/blob/go1.23.0/src/runtime/map.go), [sync.Map source Go 1.23](https://github.com/golang/go/blob/go1.23.0/src/sync/map.go) và [Go 1.24 release notes](https://go.dev/doc/go1.24#sync) — implementation lịch sử và thời điểm chuyển đổi.

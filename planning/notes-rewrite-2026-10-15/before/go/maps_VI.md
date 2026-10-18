---
title: "Map: tra cứu key, đồng bộ và các thế hệ runtime"
category: "Go"
tags: ["golang", "maps", "fundamentals"]
description: "Map lưu quan hệ key → value. Hãy học hành vi được Go bảo đảm trước, rồi đọc bucket/Swiss Table như chi tiết implementation theo phiên bản; hai lớp kiến thức này không thay thế nhau."
updated: 2026-10-14
translationKey: "go/maps"
---

Map lưu quan hệ key → value. Hãy học hành vi được Go bảo đảm trước, rồi đọc bucket/Swiss Table như chi tiết implementation theo phiên bản; hai lớp kiến thức này không thay thế nhau.

## 1. Tạo map và phân biệt key thiếu với value zero

```go
scores := make(map[string]int, 100)
scores["An"] = 0
value, ok := scores["An"]
fmt.Println(value, ok) // 0 true
value, ok = scores["Binh"]
fmt.Println(value, ok) // 0 false
delete(scores, "An")
```

Make nhận hint số phần tử, không tạo sẵn 100 entry và map không có cap như slice. Literal `map[string]int{"An": 10}` tạo entry ngay. Lookup key thiếu trả zero value; dùng dạng value, ok khi cần phân biệt. Delete key thiếu hợp lệ. Nil map đọc/delete/range được, nhưng ghi sẽ panic; initialize trước khi ghi.

## 2. Gán map, sửa struct value và điều kiện key

```go
a := map[string]int{"Go": 1}
b := a
b["Go"] = 2
fmt.Println(a["Go"]) // 2

type User struct { Name string }
users := map[int]User{1: {Name: "An"}}
u := users[1]
u.Name = "Mai"
users[1] = u
```

Gán map sao chép giá trị map nhưng vẫn chia sẻ cùng dữ liệu. Gán b sang map mới không đổi a. Map element không addressable nên users[1].Name = ... không hợp lệ với struct value; lấy ra, sửa, ghi lại. Nếu value là *User, bạn có thể sửa qua pointer, nhưng cần quản lý nil và đồng bộ object ấy.

Key phải comparable: số, string, pointer, và array/struct có thành phần comparable là ví dụ. Slice/map/function không làm key được. Interface key hợp lệ ở compile time nhưng panic nếu giá trị động không comparable. Hash có thể va chạm, nên runtime luôn cần equality để xác nhận key; hash không phải ID duy nhất. Lookup/update/delete thường có chi phí trung bình tốt, không được spec bảo đảm O(1) cho mọi input.

## 3. Iteration, set và NaN

Thứ tự range không được xác định và có thể khác giữa hai lần duyệt. Muốn output ổn định, lấy keys rồi sort. Entry chưa tới lượt mà bị delete sẽ không được sinh ra; entry tạo thêm trong lúc range có thể được thấy hoặc bỏ qua. Đây không cho phép ghi đồng thời từ goroutine khác mà không đồng bộ.

```go
set := map[string]struct{}{"Go": {}}
_, present := set["Go"]
fmt.Println(present) // true

n := math.NaN()
m := map[float64]string{n: "value"}
_, found := m[n]
fmt.Println(found) // false
clear(m)
```

Set dùng struct{} biểu đạt membership không có payload. Empty struct size 0 nhưng map vẫn tốn key/metadata/padding; không bảo đảm tiết kiệm đúng 1 byte mỗi entry so với bool. NaN != NaN nên lookup/delete bằng NaN không tìm được entry đã chèn; range vẫn có thể thấy entry, clear hoặc bỏ toàn map có thể loại chúng. Clear có từ Go 1.21, không có nghĩa capacity phải giảm.

## 4. Nhiều goroutine: map + Mutex

```go
type SafeMap struct {
    mu sync.Mutex
    data map[string]int
}
func (m *SafeMap) Set(key string, value int) {
    m.mu.Lock()
    defer m.mu.Unlock()
    if m.data == nil { m.data = make(map[string]int) }
    m.data[key] = value
}
func (m *SafeMap) Get(key string) (int, bool) {
    m.mu.Lock()
    defer m.mu.Unlock()
    value, ok := m.data[key]
    return value, ok
}
```

Map thông thường cho phép concurrent reads khi không có goroutine sửa nó. Nếu có write, mọi access liên quan phải được đồng bộ; một vài lần chạy không crash không chứng minh an toàn. Runtime có thể phát hiện concurrent map access và dừng bằng fatal error, nhưng detection không thay race detector và không bao phủ mọi race.

Ví dụ trên giữ data không export để caller không vượt qua lock; zero value dùng được. Không copy SafeMap sau khi dùng. Với read-modify-write như tăng counter, cần giữ lock xuyên suốt cả chuỗi; gọi Get rồi Set riêng vẫn có thể mất cập nhật dù mỗi method không race.

## 5. RWMutex khác gì?

```go
type RWMap struct {
    mu sync.RWMutex
    data map[string]int
}
func (m *RWMap) Get(key string) (int, bool) {
    m.mu.RLock()
    defer m.mu.RUnlock()
    value, ok := m.data[key]
    return value, ok
}
func (m *RWMap) Set(key string, value int) {
    m.mu.Lock()
    defer m.mu.Unlock()
    if m.data == nil { m.data = make(map[string]int) }
    m.data[key] = value
}
```

RLock cho nhiều reader giữ shared lock; Lock là exclusive. Khi writer đang chờ, RWMutex chặn các reader mới để writer có cơ hội chạy. Giữ read lock quá lâu vẫn làm writer chờ lâu; không nâng cấp RLock sang Lock trực tiếp và không dùng recursive read locking. RWMutex có overhead: read-heavy không tự động chứng minh nó nhanh hơn Mutex. Chọn theo benchmark của workload.

## 6. sync.Map: API chuyên dụng, không phải thay thế mặc định

```go
var values sync.Map
values.Store("Go", 2009)
if raw, ok := values.Load("Go"); ok {
    if year, ok := raw.(int); ok { fmt.Println(year) }
}
actual, loaded := values.LoadOrStore("Rust", 2010)
fmt.Println(actual, loaded) // 2010 false
values.Delete("Rust")
values.Range(func(key, value any) bool {
    fmt.Println(key, value)
    return true
})
```

sync.Map có zero value dùng được và an toàn cho các thao tác API của nó. LoadOrStore là một thao tác atomic ở mức map; một chuỗi Load + tính toán + Store không tự atomic. Range không phải snapshot nhất quán của toàn map. Giá trị mutable như pointer bên trong vẫn cần bảo vệ riêng. Không copy sync.Map sau lần dùng đầu.

Map typed + lock thường dễ giữ invariant hơn. sync.Map hữu ích cho các trường hợp như key được ghi một lần rồi đọc nhiều, hoặc goroutine thao tác tập key ít giao nhau. Nó dùng any nên bạn cần assertion để lấy concrete value; không mặc định hiệu năng/bộ nhớ hơn hay kém ở mọi workload. Chọn theo hợp đồng dữ liệu rồi mới đo hiệu năng.

## 7. Lịch sử runtime: bucket của Go 1.23 trở về trước

```text
hmap metadata: count, B, hash0, buckets, oldbuckets
bucket count: 2^B

bmap (schematic):
  tophash[8] | keys[8] | values[8] | overflow reference
```

B chia số bucket theo lũy thừa hai, không phải cap chính xác của map. Hash seed làm phân bố khác nhau giữa map; bit thấp chọn bucket, phần tophash lọc candidate trước khi equality. Bucket có 8 slot nhưng va chạm có thể dẫn tới overflow chain, nên không có cam kết chỉ so tối đa 8 key. Nhóm keys và values riêng có thể giảm padding so với xen kẽ từng cặp; layout còn tùy K/V.

Implementation cũ thường grow khi trung bình khoảng 6.5 entry/bucket, tương ứng khoảng 81% của 8 slot chính. Bảng mới và oldbuckets cùng tồn tại; các thao tác thay đổi map di tản bucket dần (evacuation), tránh một lần copy toàn map. Quá nhiều overflow còn có thể gây same-size grow để sắp xếp lại mà không tăng số bucket. Đây là logic map growth, không phải một GC stop-the-world phase.

## 8. Swiss Tables từ Go 1.24

```text
map → directory → table → groups

group:
  control word: 8 bytes (empty / deleted / 7-bit h2)
  slots:        8 key-value pairs

hash → table/group selection → h2 candidates → full key equality
                                  ↓ no match / group full
                              probe sequence
```

Group vẫn có 8 slot nhưng metadata được so theo word để lọc nhiều candidate cùng lúc. H2 khớp không bảo đảm key khớp. SIMD có thể hỗ trợ trên một số kiến trúc; có cách portable bằng arithmetic/bit operations, nên không mô tả mọi lookup là đúng một lệnh SIMD. Probing tìm các group theo sequence, không phải overflow linked list hay luôn group kế bên.

Directory/extendible hashing giúp grow/split một table thay vì rehash toàn map. Trong implementation Go 1.24, table bị giới hạn ở 1.024 slot, tức 128 group, trước khi split. Small maps có đường xử lý riêng. Những giới hạn này giúp khống chế công việc tăng trưởng, không hứa không có latency spike hoặc lookup luôn nhanh hơn với mọi case.

## 9. Lịch sử sync.Map và thu hồi bộ nhớ

```text
older sync.Map:
  mu | read (atomic pointer) | dirty | misses
           ↘ shared entries ↙
                   entry.p

newer sync.Map: concurrent hash trie (HashTrieMap)
```

Ở implementation trước Go 1.24, read chứa view đọc nhanh, dirty giữ các key cần slow path; amended cho biết dirty có key ngoài read. Load có thể fallback dưới mutex, tăng misses; khi đủ miss, dirty được promote thành read. Hai map chia sẻ entry, pointer value có thể được cập nhật atomic. Chi tiết expunged/nil hỗ trợ deletion/reinsertion, không phải mọi update đều lock-free. Từ Go 1.24, sync.Map chuyển sang hash trie; không dùng mô hình read/dirty để mô tả phiên bản mới.

Delete/clear không có hợp đồng shrink storage ngay. Khi một map lớn không còn cần, có thể bỏ tham chiếu hoặc copy entry còn cần sang map nhỏ mới. GC chỉ thu hồi map cũ khi không còn alias giữ nó; cũng không bảo đảm RSS giảm ngay. Không dùng nil/recreate để “giải phóng” trong lúc goroutine khác vẫn dùng map mà chưa đồng bộ.

## Ví dụ áp dụng

### Tình huống: bảo vệ cả thao tác đọc–sửa–ghi

Nếu hai goroutine cùng tăng một bộ đếm, khóa từng lần đọc và từng lần ghi riêng vẫn chưa đủ. Hợp đồng cần bảo vệ toàn bộ việc tăng như một thao tác.

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
```

| Nếu tách Get và Set | Goroutine A | Goroutine B |
| --- | --- | --- |
| Đọc dưới khóa riêng | Đọc 0 | Đọc 0 |
| Tính cục bộ | 0 + 1 = 1 | 0 + 1 = 1 |
| Ghi dưới khóa riêng | Ghi 1 | Ghi 1 |

Không nhất thiết có data race, nhưng kết quả cuối là 1 thay vì 2: đây là mất cập nhật. Increment giữ mutex suốt cả thao tác nên tránh tình huống đó. Mọi đường truy cập values phải dùng cùng cơ chế khóa; không copy Counts sau khi mutex đã được sử dụng. sync.Map cũng không làm một chuỗi Load rồi Store tự động trở thành atomic.

## Tự kiểm tra

Vì sao Get rồi Set riêng chưa đủ để tăng counter an toàn? Phân biệt bucket grow, Swiss Table split và read/dirty promotion; cơ chế nào là lịch sử?

## Tài liệu đối chiếu

- [Go language specification](https://go.dev/ref/spec)
- [Swiss Table maps](https://go.dev/blog/swisstable)
- [sync.Map documentation](https://pkg.go.dev/sync#Map)
- [sync.Map source](https://go.dev/src/sync/map.go)

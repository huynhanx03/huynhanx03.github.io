---
title: "Maps"
category: "Go"
tags: ["golang", "maps", "fundamentals"]
---

# Maps

**Map** là một cấu trúc dữ liệu lưu trữ dưới dạng cặp **Key-Value**, được hiện thực hóa dựa trên cơ chế **Hash Table**. Đặc điểm nổi bật nhất của Map là khả năng truy xuất, thêm và xóa phần tử với độ phức tạp trung bình là $O(1)$.

---

## 1. Khởi tạo và Thao tác

Trong Go, Map là một kiểu dữ liệu tham chiếu (**Reference Type**). Bạn có thể khởi tạo Map bằng hai cách:

```go
// Khởi tạo thông qua Map Literal
langs := map[string]string{
    "Go":   "Google",
    "Rust": "Mozilla",
}

// Khởi tạo bằng hàm make (Xác định trước sức chứa để tối ưu hiệu năng)
scores := make(map[string]int, 100)

scores["An"] = 10     // Assign
delete(scores, "An")  // Delete
```

### Kiểm tra sự hiện diện (Lookup Check)
Vì Map sẽ trả về **Zero Value** khi truy cập vào Khóa không tồn tại, cú pháp sau được sử dụng để xác định trạng thái thực tế của phần tử:

```go
val, ok := langs["Java"]
if ok {
    fmt.Println("Tìm thấy:", val)
}
```

---

## 2. Cấu trúc bên trong (Cơ bản & Go 1.23 Trở về trước)

Để đạt được hiệu năng cao, Map trong Go (định nghĩa tại `runtime/map.go`) được cấu tạo từ những thành phần phức tạp bên dưới lớp vỏ cú pháp. 

### 2.0. Tại sao phải chia ra nhiều Bucket? (Triết lý thiết kế)

Hãy tưởng tượng bạn có 1 triệu cuốn sách:
*   **Nếu chỉ có 1 "Bucket" khổng lồ**: Để tìm 1 cuốn sách, bạn phải lục lọi lần lượt cả 1 triệu cuốn ($O(N)$). Càng nhiều sách, bạn tìm càng chậm.
*   **Nếu chia ra 131,072 "Buckets"**: Mỗi xô chỉ chứa trung bình khoảng 6-7 cuốn sách. Khi cần tìm, bạn chỉ cần băm (hash) tên sách để biết nó nằm ở xô nào, sau đó chỉ việc kiểm tra tối đa 8 slots trong xô đó ($O(1)$).

**Kết luận**: Chia nhỏ Map thành nhiều Bucket giúp Go **giới hạn phạm vi tìm kiếm**. Thay vì quét toàn bộ Map, Go chỉ quét 1 xô cố định (8 slots), giúp tốc độ truy xuất luôn cực nhanh bất kể Map có 100 hay 100 triệu phần tử.

### 2.1. Cấu tạo của hmap & bmap (Buckets)

#### A. hmap (Cơ thể của Map)
Đây là cấu trúc quản lý metadata. Khi bạn dùng `make(map[K]V)`, thực chất bạn đang làm việc với một con trỏ trỏ tới `hmap`.

```go
// runtime/map.go (Simplified)
type hmap struct {
    count     int    // Số lượng phần tử hiện có
    B         uint8  // log2 của số lượng Buckets (sức chứa = 2^B)
    hash0     uint32 // Seed ngẫu nhiên để chống Hash Collision DoS
    buckets   unsafe.Pointer // Con trỏ trỏ tới mảng các Buckets hiện tại
    oldbuckets unsafe.Pointer // Con trỏ trỏ tới mảng Buckets cũ khi đang Grow
}
```

*   **Số lượng Bucket**: Được quyết định bởi trường `B`. Số lượng bucket luôn là một lũy thừa của 2: **$2^B$**.
    *   Ví dụ: Nếu `B=0`, có $2^0 = 1$ bucket. Nếu `B=3`, có $2^3 = 8$ buckets.
*   **Mảng Buckets**: Con trỏ `buckets` trỏ tới vùng nhớ chứa mảng liên tiếp các xô (`bmap`).

#### B. bmap (Cấu tạo bên trong một Bucket)
Mỗi xô (bucket) là một đơn vị lưu trữ cố định, chứa tối đa **8 slots** cho cặp Key-Value.

```go
// runtime/map.go (Simplified)
type bmap struct {
    tophash [8]uint8 // Lưu 8 bit cao của mã băm để so khớp nhanh
    // (Dữ liệu bên dưới được trình thông dịch Go sắp xếp ngầm):
    // keys     [8]keytype
    // values   [8]valuetype
    // overflow *bmap (Con trỏ trỏ tới bucket tràn nếu cần)
}
```

Sơ đồ bộ nhớ của một bucket như sau:

```text
bucket (bmap)
├─ tophash [8]uint8  (Lưu 8 bit cao của mã băm của 8 key tương ứng)
├─ keys    [8]K      (8 ô chứa Key nằm sát nhau)
├─ values  [8]V      (8 ô chứa Value nằm sát nhau)
└─ overflow *bmap    (Con trỏ trỏ tới bucket tràn nếu xô này đã đầy 8 slots)
```

**Tại sao lại gom `keys` riêng và `values` riêng?**
Nếu lưu kiểu `[key1, value1, key2, value2...]`, Go sẽ phải thêm **Padding** (khoảng trống vô ích) vào giữa mỗi cặp nếu kích thước Key và Value khác nhau (ví dụ: `map[int8]int64`). 
*   Bằng cách gom 8 Keys rồi mới tới 8 Values, Go chỉ cần thêm padding **một lần duy nhất** ở cuối, giúp tiết kiệm RAM tối đa khi map có quy mô lớn.

### 2.2. Cơ chế Hashing & Tophash
Khi một Khóa được đưa vào, Go thực hiện các bước:
1. **Hashing**: Sử dụng mã băm được sinh ra kết hợp với `hash0` để tạo ra chuỗi định danh duy nhất.
2. **Bucket Selection**: Các bit thấp của mã băm quyết định Khóa sẽ nằm ở Bucket nào.
3. **Tophash**: 8 bit cao của mã băm được lưu vào mảng `tophash`. Khi truy vấn, Go chỉ so sánh các bit cao này trước. Nếu khớp, nó mới thực hiện so sánh toàn bộ Khóa trong bộ nhớ. Việc này giúp tăng tốc độ tìm kiếm vượt trội.

### 2.3. Evacuation & Incremental Growth
Go quản lý hiệu năng thông qua **Load Factor**. Khi Load Factor vượt ngưỡng **6.5** ($13/16 \approx 81\%$):
- Go sẽ kích hoạt quá trình mở rộng (Grow).
- Một mảng Bucket mới có kích thước gấp đôi sẽ được tạo ra.
- **Incremental Evacuation**: Thay vì di chuyển toàn bộ dữ liệu cùng lúc gây treo hệ thống (**Stop The World**), Go sẽ di chuyển dữ liệu cũ sang mới một cách rải rác mỗi khi người dùng thực hiện thao tác ghi hoặc xóa.
    - *Nhược điểm*: Cả bucket cũ và mới cùng tồn tại đồng thời, làm tăng mức tiêu thụ RAM đột biến trong quá trình di tản.

---

## 3. Sự tiến hóa trong Go 1.24 (Swiss Tables)

Go 1.24 mang lại một bước nhảy vọt về kiến trúc bằng cách chuyển sang thiết kế **Swiss Tables** (phổ biến bởi Abseil/Rust `hashbrown`), thay đổi hoàn toàn cách quản lý và tìm kiếm phần tử.

### 3.1. Cấu trúc Group & Control Word (Visualizing Swiss Tables)

Thay vì các Bucket rời rạc, Swiss Table tổ chức dữ liệu thành các **Groups**, mỗi group chứa 8 slots. Điểm mấu chốt là **Control Word**.

#### Sơ đồ cấu tạo một Group:
```text
Group (mảnh ghép cơ bản)
├── Control Word (8 bytes metadata)
│   ├── [byte 0]: 7 bits hash (h2) của slot 0
│   ├── [byte 1]: 7 bits hash (h2) của slot 1
│   ├── ...
│   └── [byte 7]: 7 bits hash (h2) của slot 7
└── 8 Slots (Dữ liệu thực tế)
    ├── [slot 0]: Key - Value
    ├── [slot 1]: Key - Value
    ├── ...
    └── [slot 7]: Key - Value
```

*   **Metadata (Control Word)**: Mỗi byte trong Control Word không chỉ lưu 7 bits mã băm (h2) để nhận diện nhanh, mà còn lưu các trạng thái đặc biệt như **Empty** (trống) hoặc **Deleted** (đã xóa).

### 3.2. Sức mạnh của SIMD Lookup

Đây là lý do Swiss Tables nhanh hơn nhiều so với cách quét từng phần tử truyền thống:

*   **Truyền thống (Go 1.23)**: Quét từng Tophash trong bucket một cách tuần tự (8 lần so sánh).
*   **Hiện đại (Go 1.24 - SIMD)**: 
    1.  Lấy 7 bits mã băm của Key cần tìm (gọi là `needle`).
    2.  Dùng 1 chỉ thị CPU duy nhất (**SIMD**) để so sánh `needle` với **toàn bộ 8 bytes** trong Control Word cùng một lúc.
    3.  Kết quả trả về một mặt nạ bit (bitmask) chỉ ra chính xác những slot nào có khả năng khớp.
    **Ưu điểm**: Lookup nhanh gấp nhiều lần và giảm thiểu tối đa việc CPU phải rẽ nhánh (Branching).

### 3.3. Loại bỏ Overflow & Probing
Swiss Tables không dùng danh sách liên kết cho Overflow Bucket. Nếu một Group đã đầy, Go sẽ thực hiện **Probing** (dò tìm) sang Group kế tiếp trong cùng một mảng phẳng. Điều này giúp dữ liệu luôn nằm gần nhau trong bộ nhớ, cực kỳ thân thiện với bộ đệm CPU (Cache-friendly).

### 3.4. Extendible Hashing (Directory Management)

Để tránh tình trạng "đứng hình" khi bản đồ quá lớn phải rehash toàn bộ, Go 1.24 sử dụng **Extendible Hashing**.

#### Sơ đồ Directory:
```text
Map (Go 1.24+)
└── Directory (Bảng mục lục)
    ├── [Index 00]: trỏ tới Sub-table A
    ├── [Index 01]: trỏ tới Sub-table A (chia sẻ)
    ├── [Index 10]: trỏ tới Sub-table B
    └── [Index 11]: trỏ tới Sub-table C
```

*   **Chia để trị**: Một Map khổng lồ được chia thành nhiều **Sub-tables** (mỗi bảng chứa tối đa **128 groups**).
*   **Split thay vì Rehash**: Khi một Sub-table đầy, Go chỉ thực hiện "chẻ đôi" (Split) bảng con đó và cập nhật Directory. Các phần còn lại của Map hoàn toàn không bị ảnh hưởng.
*   **Lợi ích**: Độ trễ (latency) của thao tác Ghi luôn ổn định, không còn hiện tượng Spike (vọt lên) khi Map grow.

---

## 4. Cơ chế vận hành chuyên sâu

### 4.1. Tính ngẫu nhiên khi Iteration
Lập trình viên Go tuyệt đối không được dựa vào thứ tự khi dùng `range` trên Map. 
*   **Bản chất**: Trong mỗi vòng lặp `range`, runtime của Go chọn một **Seed ngẫu nhiên** để quyết định bắt đầu ở một Bucket bất kỳ và một vị trí (offset) bất kỳ trong Bucket đó.
*   **Lý do**: Go muốn đảm bảo mã nguồn của bạn không bị phụ thuộc vào thứ tự ngẫu nhiên của bảng băm (vốn sẽ thay đổi sau khi map bị mở rộng).

### 4.2. Same-size Grow (Tái cấu trúc cùng kích thước)
Ngoài việc gấp đôi bộ nhớ khi quá tải ($LF > 6.5$), Go còn thực hiện Grow cùng kích thước nếu số lượng **Overflow Buckets** quá lớn nhưng Load Factor vẫn thấp. 
*   **Mục đích**: Chống lại tình trạng bản đồ bị "rỗng" (do thêm và xóa quá nhiều). Go sẽ gom các phần tử lại cho khít nhau, xóa bỏ các xô tràn dư thừa để duy trì hiệu năng $O(1)$.

### 4.3. Cạm bẫy với Khóa NaN (float64)
Trong Go, `float64` có thể dùng làm Khóa, nhưng giá trị `math.NaN()` cực kỳ nguy hiểm. Theo chuẩn IEEE 754, `NaN != NaN`.
*   **Hệ quả**: Nếu bạn chèn một phần tử với Key là `NaN`, bạn sẽ **không bao giờ** lấy nó ra được bằng Lookup (vì `NaN` đưa vào không bao giờ bằng `NaN` khi tìm kiếm). Nó trở thành "rác" vĩnh viễn trong map.

### 4.4. Pattern: Set Implementations
Go không có kiểu dữ liệu `Set` dựng sẵn. Cách tối ưu nhất để hiện thực hóa Set là dùng Map với `struct{}`:
```go
set := make(map[string]struct{})
set["item1"] = struct{}{}
```
*   **Tại sao dùng `struct{}`?**: `struct{}` chiếm **0 byte** bộ nhớ. Nếu dùng `bool`, bạn sẽ mất thêm 1 byte cho mỗi phần tử. Đây là kỹ thuật tiết kiệm tài nguyên tối đa cho các tập hợp dữ liệu lớn.

---

## 5. Các lưu ý quan trọng

### 5.1. An toàn luồng (Concurrency Control)
Map trong Go **không mặc định an toàn** khi truy cập đồng thời. Nếu thực hiện nhiều thao tác Ghi (hoặc vừa Ghi vừa Đọc) song song mà không bảo vệ, chương trình sẽ xảy ra lỗi: **Fatal Error: concurrent map iteration and map write**.

Để bảo vệ Map, ta thường sử dụng **Mutex** hoặc **RWMutex** bao bọc trong một `struct` để đóng gói dữ liệu và cơ chế bảo vệ lại với nhau.

#### Cách 1: Sử dụng sync.Mutex (Lock toàn phần)
Phù hợp khi tần suất Ghi cao hoặc xấp xỉ tần suất Đọc. Mutex sẽ khóa toàn bộ Map, chỉ cho phép 1 Goroutine truy cập tại một thời điểm.

```go
type SafeMap struct {
    mu   sync.Mutex
    data map[string]int
}

func (m *SafeMap) Set(key string, val int) {
    m.mu.Lock()          // Chặn toàn bộ luồng khác (cả Đọc và Ghi)
    defer m.mu.Unlock()
    m.data[key] = val
}

func (m *SafeMap) Get(key string) int {
    m.mu.Lock()
    defer m.mu.Unlock()
    return m.data[key]
}
```

*   **Ưu điểm**: Đơn giản, dễ triển khai, đảm bảo an toàn tuyệt đối.
*   **Nhược điểm**: Chặn toàn bộ luồng Đọc ngay cả khi chỉ có một luồng Ghi, dễ gây nghẽn (bottleneck) nếu có nhiều luồng cùng truy cập.
*   **Khi nào dùng**: Khi thao tác Ghi xảy ra thường xuyên hoặc map có kích thước nhỏ, logic không quá phức tạp.
*   **Khi nào KHÔNG dùng**: Khi hệ thống cần xử lý hàng triệu lượt Đọc đồng thời trên nhiều CPU cores.

#### Cách 2: Sử dụng sync.RWMutex (Lock phân quyền)
Tối ưu hơn khi có **nhiều thao tác Đọc** và **ít thao tác Ghi**.
*   **RLock()**: Cho phép không giới hạn số lượng Goroutine cùng đọc đồng thời (Shared Lock).
*   **Lock()**: Chỉ duy nhất 1 Goroutine được quyền Ghi (Exclusive Lock).

```go
type RWMap struct {
    mu   sync.RWMutex
    data map[string]int
}

func (m *RWMap) Get(key string) (int, bool) {
    m.mu.RLock()
    defer m.mu.RUnlock()
    val, ok := m.data[key]
    return val, ok
}

func (m *RWMap) Set(key string, val int) {
    m.mu.Lock()
    defer m.mu.Unlock()
    m.data[key] = val
}
```

*   **Ưu điểm**: Tối ưu hóa hiệu năng Đọc song song, giảm thiểu tranh chấp giữa các luồng Đọc.
*   **Nhược điểm**: Overhead quản lý Lock cao hơn Mutex một chút. Có thể gây "đói" (starvation) cho luồng Ghi nếu các luồng Đọc chiếm giữ lock quá lâu.
*   **Khi nào dùng**: Ứng dụng **Read-heavy** (Lưu cấu hình, Cache tệp tin, dữ liệu ít thay đổi).
*   **Khi nào KHÔNG dùng**: Khi tần suất Ghi cao hơn hoặc ngang bằng với tần suất Đọc.

---

## 6. sync.Map (An toàn luồng hiệu năng cao)

Từ Go 1.9, thư viện chuẩn cung cấp `sync.Map` - một cấu trúc dữ liệu được thiết kế đặc biệt cho các hệ chính đa nhân (multi-core) với các kịch bản truy cập đặc thù mà `RWMutex` gặp khó khăn về hiệu năng (do bị nghẽn ở bước cập nhật metadata của Lock).

### 6.1. Cấu trúc Struct bên trong (Internal Structs)

Để hiểu tại sao `sync.Map` lại đạt hiệu năng cao, chúng ta cần nhìn vào cấu trúc thực tế của nó trong thư viện chuẩn Go:

```go
// sync/map.go (Simplified)
type Map struct {
    mu Mutex
    read atomic.Pointer[readOnly] // Bản đồ chỉ đọc (Lock-free)
    dirty map[any]*entry           // Bản đồ chứa dữ liệu mới (Cần Mutex)
    misses int                     // Bộ đếm số lần tìm hụt ở 'read'
}

type readOnly struct {
    m       map[any]*entry
    amended bool // true nếu 'dirty' đang chứa Key mà 'read' không có
}

type entry struct {
    p atomic.Pointer[any] // Con trỏ tới giá trị (nil, expunged hoặc v)
}
```

*   **`read` map**: Được truy cập qua con trỏ nguyên tử (**Atomic Pointer**). Đây là tầng bảo vệ đầu tiên, giúp các thao tác Đọc (Load) diễn ra cực nhanh mà không cần tranh chấp Lock.
*   **`dirty` map**: Lưu trữ các phần tử mới chèn hoặc các phần tử chưa được "nâng cấp". Mọi thao tác với `dirty` phải chiếm giữ `mu` (Mutex).
*   **`entry`**: Điểm hay nhất của `sync.Map` là cả 2 bản đồ (`read` và `dirty`) đều **trỏ chung tới cùng một `entry`**. 
    - Khi bạn cập nhật giá trị của một Key đã tồn tại, Go chỉ cần dùng phép gán nguyên tử cho `p` trong `entry`. Cả `read` và `dirty` sẽ thấy giá trị mới ngay lập tức mà không cần Lock.
*   **`amended`**: Là cờ hiệu giúp tối ưu hóa. Nếu `amended = false`, Go biết chắc chắn mọi dữ liệu đều đã có trong `read`, không cần tốn công Lock Mutex để check `dirty` nữa.

### 6.2. Cơ chế vận hành (The Misses Strategy)

#### A. Thao tác Đọc (Load)
1.  Check `read` map trước (**Lock-free**). Nếu thấy -> Trả về luôn (Cực nhanh).
2.  Nếu không thấy ở `read`, Go mới Lock Mutex và check bản đồ `dirty`.
3.  Lúc này, Go sẽ tăng biến đếm `misses`.

#### B. Cơ chế Promotion (Nâng cấp)
Khi số lần "Miss" (không thấy ở `read` mà phải vào `dirty`) vượt quá số lượng phần tử trong `dirty`:
*   Go sẽ thực hiện **Promotion**: Biến dữ liệu ở `dirty` trở thành `read` map mới.
*   Lúc này, `read` mới sẽ bao gồm toàn bộ dữ liệu hiện tại, giúp các lần Đọc sau trở về trạng thái **Lock-free**.

### 6.3. Đánh giá chiến lược (sync.Map)

*   **Ưu điểm**: Tốc độ Đọc cực nhanh (Lock-free) cho các Key đã ổn định. Giảm thiểu tranh chấp tài nguyên (contention) trên hệ thống nhiều Core.
*   **Nhược điểm**: Tốn bộ nhớ hơn bản thường. Mất tính an toàn kiểu (Type Safety) do trả về `interface{}`.
*   **Khi nào dùng**: 
    1.  **Stable Keys**: Khi tập hợp các Key ít khi thay đổi (chủ yếu là Đọc và Cập nhật giá trị cũ).
    2.  **High Contention**: Khi có hàng chục CPU cores cùng tranh chấp 1 cái Lock lớn của Mutex.
*   **Khi nào KHÔNG dùng**: Khi Ghi/Xóa các Key mới liên tục (gây "Dirty mismatch" và ép Promotion liên tục, làm giảm hiệu năng).

### 6.4. Code mẫu sync.Map

```go
var sm sync.Map

// 1. Store: Ghi dữ liệu
sm.Store("Go", 2009)
sm.Store("Rust", 2010)

// 2. Load: Đọc dữ liệu
if val, ok := sm.Load("Go"); ok {
    fmt.Println("Found:", val.(int)) // Cần ép kiểu (Type Assertion)
}

// 3. LoadOrStore: Đọc nếu có, chưa có thì ghi mới (Atomic)
// Trả về giá trị thực tế trong map và true nếu đã tồn tại
actual, loaded := sm.LoadOrStore("Java", 1995)

// 4. Delete: Xóa dữ liệu
sm.Delete("Rust")

// 5. Range: Duyệt qua các phần tử
sm.Range(func(key, value any) bool {
    fmt.Printf("Key: %v, Value: %v\n", key, value)
    return true // Trả về true để tiếp tục duyệt, false để dừng
})
```

| Tiêu chí | map + RWMutex | sync.Map |
| :--- | :--- | :--- |
| **Loại Lock** | Lock phân quyền (Toàn bộ Map) | Atomic (Read) + Mutex (Dirty) |
| **Hiệu năng** | Ổn định, dễ dự đoán | Cực nhanh nếu Read-heavy & Stable Keys |
| **Type Safety** | **Có (Generics)** | Không (Dùng `any`) |
| **Độ phức tạp** | Đơn giản, trực quan | Phức tạp, tốn RAM hơn |

---

### Giải phóng bộ nhớ (Memory Persistence)
Map **không tự thu hồi** bộ nhớ của các Bucket sau khi phần tử bị xóa bằng `delete`. 
- Để giải phóng hoàn toàn, bạn cần gán `map = nil` hoặc khởi tạo lại Map mới để kích hoạt **Garbage Collection**.

### Điều kiện của Khóa (Comparable Keys)
Khóa của Map phải là kiểu dữ liệu có thể so sánh được (`comparable`). Do đó, **Slices**, **Maps**, và **Functions** không thể làm Khóa vì chúng không hỗ trợ phép so sánh `==`.

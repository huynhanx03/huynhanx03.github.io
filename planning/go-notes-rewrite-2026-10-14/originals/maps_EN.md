---
title: "Maps"
category: "Go"
tags: ["golang", "maps", "fundamentals"]
---

# Maps: High-Performance Associative Arrays

In Go, a **Map** is a built-in data structure that implements an associative array of key-value pairs. Under the hood, it is realized as a sophisticated **Hash Table**. Designed for efficiency, Maps deliver near-constant time complexity—$O(1)$—for search, insertion, and deletion operations, making them indispensable for low-latency systems.

---

## 1. Initialization and Semantics

In the Go type system, a Map is a **Reference Type**. It can be initialized using either a literal syntax or the `make` built-in function:

```go
// Map Literal Initialization
langs := map[string]string{
    "Go":   "Google",
    "Rust": "Mozilla",
}

// Pre-allocating capacity via make() for performance critical paths
scores := make(map[string]int, 100)

scores["Alice"] = 10   // Mutation
delete(scores, "Alice") // Deletion
```

### The "Comma-Ok" Idiom (Presence Verification)
Accessing a non-existent key returns the **Zero Value** of the value type. To distinguish between a missing entry and an entry explicitly stored with a zero value, Go utilizes the "comma-ok" pattern:

```go
val, ok := langs["Java"]
if ok {
    fmt.Println("Entry present:", val)
}
```

---

## 2. Internal Architecture (Basic & Go 1.23 and earlier)

To achieve high performance, the Go Map (defined in `runtime/map.go`) is built from complex components beneath its simple syntax.

### 2.0. The Philosophy of Buckets: Why Divide?

Imagine searching for one specific book in a library with 1 million volumes:
*   **A Single Giant Container**: To find your book, you might have to scan through every single one—a linear scan with $O(N)$ complexity. As the library grows, the search slows down proportionately.
*   **Dividing into 131,072 Buckets**: Each bucket now contains an average of only 7-8 books. When you need a book, you simply hash its title to determine exactly which bucket it resides in, then check at most 8 slots within that bucket.

**Conclusion**: Dividing the Map into many small buckets allows Go to **limit the search scope**. Instead of scanning the entire map, Go only scans a fixed-size bucket (8 slots), ensuring that lookup speed remains $O(1)$ whether the map has 100 or 100 million elements.

### 2.1. hmap & bmap (Buckets)

#### A. hmap (The Map Body)
This is the metadata management structure. When you use `make(map[K]V)`, you are actually working with a pointer to an `hmap`.

```go
// runtime/map.go (Simplified)
type hmap struct {
    count     int    // Number of active elements
    B         uint8  // log2 of the number of buckets (Capacity = 2^B)
    hash0     uint32 // Randomized seed to mitigate Hash Collision DoS
    buckets   unsafe.Pointer // Pointer to the current bucket array
    oldbuckets unsafe.Pointer // Pointer to the previous array during growth
}
```

*   **Bucket Count**: Determined by the `B` field. The number of buckets is always a power of 2: **$2^B$**.
    *   Example: If `B=3`, there are $2^3 = 8$ buckets.
*   **Bucket Array**: The `buckets` pointer points to a contiguous memory region containing the array of `bmap` buckets.

#### B. bmap (Inside a Bucket)
Each bucket (`bmap`) is a fixed unit of storage containing at most **8 slots** for key-value pairs.

```go
// runtime/map.go (Simplified)
type bmap struct {
    tophash [8]uint8 // High-order 8 bits of the hash for rapid filtering
    // Data alignment handled implicitly by the compiler:
    // keys     [8]keytype
    // values   [8]valuetype
    // overflow *bmap (Pointer to an overflow chain if required)
}
```

Memory layout of a single bucket:

```text
bucket (bmap)
├─ tophash [8]uint8  (8 high-order bits of the hash for 8 corresponding keys)
├─ keys    [8]K      (8 Key slots packed contiguously)
├─ values  [8]V      (8 Value slots packed contiguously)
└─ overflow *bmap    (Pointer to an overflow bucket if the current one is full)
```

**Why separate `keys` and `values`?**
If Go stored them as pairs (`k1, v1, k2, v2...`), it would often require **Memory Padding** (useless gap bytes) between every pair if key and value sizes differ (e.g., `map[int8]int64`).
*   By packing all 8 Keys first, followed by all 8 Values, Go only needs to add padding **once at most**, significantly reducing memory footprint in large-scale maps.

### 2.2. Hashing & Tophash Filtering
Upon insertion or lookup:
1.  **Hashing**: A unique hash is generated using the key and the randomized `hash0` seed.
2.  **Bucket Selection**: The low-order bits of the hash determine the specific bucket index.
3.  **Tophash Filtering**: The top-order 8 bits are stored in the `tophash` array. During lookup, Go compares these 8 bits first. A full memory comparison only occurs if a match is found in `tophash`, drastically reducing the overhead of expensive key comparisons (e.g., long strings).

### 2.3. Evacuation & Incremental Growth
Go manages performance through the **Load Factor** ($LF$). When the Load Factor exceeds **6.5** ($13/16 \approx 81\%$):
-   **Expansion**: A new bucket array with double the capacity is allocated.
-   **Incremental Evacuation**: To avoid **Stop The World (STW)** latency spikes, Go migrates data from the old array to the new one rải rác (incrementally) during subsequent write or delete operations.
    -   *Downside*: Both old and new buckets exist simultaneously, causing a temporary spike in RAM usage during evacuation.

---

## 3. Go 1.24 Evolution: Swiss Tables

Go 1.24 introduces a paradigm shift by adopting the **Swiss Tables** design (popularized by Abseil/Rust's `hashbrown`), fundamentally changing how elements are managed and searched.

### 3.1. Groups & Control Words (Visualizing Swiss Tables)

Instead of isolated buckets, Swiss Tables organize data into **Groups**, each containing 8 slots. The key innovation is the **Control Word**.

#### Group Structure:
```text
Group (Basic Building Block)
├── Control Word (8 bytes of metadata)
│   ├── [byte 0]: 7 bits hash (h2) of slot 0
│   ├── [byte 1]: 7 bits hash (h2) of slot 1
│   ├── ...
│   └── [byte 7]: 7 bits hash (h2) of slot 7
└── 8 Slots (Actual Data)
    ├── [slot 0]: Key - Value
    ├── [slot 1]: Key - Value
    ├── ...
    └── [slot 7]: Key - Value
```

*   **Metadata (Control Word)**: Each byte in the Control Word stores a 7-bit hash (h2) for rapid identification, along with special states like **Empty** or **Deleted**.

### 3.2. The Power of SIMD Lookup

This is why Swiss Tables are significantly faster than traditional iteration:

*   **Legacy (Go 1.23)**: Scans each Tophash in a bucket sequentially (8 comparisons).
*   **Modern (Go 1.24 - SIMD)**: 
    1.  Extracts the 7-bit hash of the target Key (the `needle`).
    2.  Uses a single CPU instruction (**SIMD**) to compare the `needle` against **all 8 bytes** in the Control Word simultaneously.
    3.  Returns a bitmask indicating exactly which slots might match.
    **Result**: Lookups are multiples faster with minimal CPU branching.

### 3.3. Eliminating Overflow via Probing
Swiss Tables abandon linked lists for overflow buckets. If a Group is full, Go performs **Probing** (searching) in the next Group within a flat array. This keeps data physically close in memory, making it highly **Cache-friendly**.

### 3.4. Extendible Hashing (Directory Management)

To avoid "freezing" the system when resizing massive maps, Go 1.24 utilizes **Extendible Hashing**.

#### Directory Schema:
```text
Map (Go 1.24+)
└── Directory (Indexing Table)
    ├── [Index 00]: points to Sub-table A
    ├── [Index 01]: points to Sub-table A (shared)
    ├── [Index 10]: points to Sub-table B
    └── [Index 11]: points to Sub-table C
```

*   **Divide and Conquer**: A massive Map is split into multiple **Sub-tables** (each containing up to **128 groups**).
*   **Split instead of Rehash**: When a Sub-table is full, Go only "splits" that specific sub-table and updates the Directory. The rest of the Map remains untouched.
*   **Benefit**: Write latency remains stable, eliminating the "latency spikes" typically seen during map growth.

---

## 4. Operational Deep Dive

### 4.1. Iteration Randomness
Go developers must never rely on the order of `range` iteration over a Map.
*   **Mechanism**: In every `range` loop, the Go runtime selects a **Random Seed** to decide on a random starting bucket and a random offset within that bucket.
*   **Rationale**: This ensures your code doesn't implicitly depend on hash table ordering, which naturally changes after map expansion.

### 4.2. Same-size Grow (Compaction)
In addition to doubling memory when overloaded ($LF > 6.5$), Go performs a "same-size" grow if the number of **Overflow Buckets** is excessive while the Load Factor remains low.
*   **Objective**: This combats "sparse" maps (caused by frequent additions and deletions). Go reshuffles elements to pack them tightly, eliminating redundant overflow chains to maintain $O(1)$ performance.

### 4.3. The NaN Key Paradox (float64)
In Go, `float64` can be used as a Key, but `math.NaN()` is dangerous. Per IEEE 754, `NaN != NaN`.
*   **Consequence**: If you insert an entry with a `NaN` key, you will **never** be able to retrieve it via Lookup (since the input `NaN` never equals the stored `NaN`). It becomes permanent "zombie" memory.

### 4.4. Pattern: Set Implementation
Go lacks a built-in `Set` type. The most efficient way to implement a Set is using a Map with `struct{}`:
```go
set := make(map[string]struct{})
set["item1"] = struct{}{}
```
*   **Why `struct{}`?**: An empty struct occupies **0 bytes**. Using a `bool` would cost 1 byte per element. This technique maximizes resource efficiency for large collections.

---

## 5. Concurrency Control Strategies

Go Maps are **not thread-safe** by default. Concurrent write operations (or concurrent read/write) without synchronization will trigger a fatal error: **Fatal Error: concurrent map iteration and map write**.

To protect a Map, developers typically use **sync.Mutex** or **sync.RWMutex**, often encapsulated within a `struct` to package the data and the protection mechanism together.

### 5.1. Option 1: sync.Mutex (Full Lock)
Ideal when write frequency is high or comparable to read frequency. A Mutex locks the entire Map, allowing only one Goroutine access at a time.

```go
type SafeMap struct {
    mu   sync.Mutex
    data map[string]int
}

func (m *SafeMap) Set(key string, val int) {
    m.mu.Lock()          // Block all other access (Read and Write)
    defer m.mu.Unlock()
    m.data[key] = val
}

func (m *SafeMap) Get(key string) int {
    m.mu.Lock()
    defer m.mu.Unlock()
    return m.data[key]
}
```

*   **Pros**: Simple to implement, deterministic, provides absolute safety.
*   **Cons**: Blocks all readers even if only one writer is active; can become a bottleneck under high contention.
*   **When to use**: Frequent writes, small map sizes, or when code simplicity is the priority.
*   **When NOT to use**: Systems requiring millions of concurrent reads across many CPU cores.

### 5.2. Option 2: sync.RWMutex (Shared/Exclusive Lock)
Optimized for **Read-heavy** workloads with **infrequent writes**.
*   **RLock()**: Allows an unlimited number of concurrent readers (Shared Lock).
*   **Lock()**: Grants exclusive access to a single writer (Exclusive Lock—blocks all readers and writers).

```go
type RWMap struct {
    mu   sync.RWMutex
    data map[string]int
}

func (m *RWMap) Get(key string) (int, bool) {
    m.mu.RLock()         // Multiple threads can read simultaneously
    defer m.mu.RUnlock()
    val, ok := m.data[key]
    return val, ok
}

func (m *RWMap) Set(key string, val int) {
    m.mu.Lock()          // Block all for exclusive write
    defer m.mu.Unlock()
    m.data[key] = val
}
```

*   **Pros**: Maximizes read throughput by allowing parallel reads.
*   **Cons**: Higher management overhead than a simple Mutex. Risk of "write starvation" if readers constantly hold the shared lock.
*   **When to use**: Read-heavy applications (Caches, Configuration stores, File registries).
*   **When NOT to use**: When write frequency is equal to or higher than read frequency.

---

## 6. sync.Map: High-Performance Concurrent Map

Standard since Go 1.9, `sync.Map` is a specialized data structure designed for multi-core systems where traditional `RWMutex` contention becomes a performance bottleneck.

### 6.1. Internal Structs (Source Code Anatomy)

To understand why `sync.Map` is efficient, we look at its internal definition in the Go standard library:

```go
// sync/map.go (Simplified)
type Map struct {
    mu Mutex
    read atomic.Pointer[readOnly] // Thread-safe read-only map (Lock-free)
    dirty map[any]*entry           // Map containing new/unpromoted data (Needs Mutex)
    misses int                     // Counter for 'read' map lookup failures
}

type readOnly struct {
    m       map[any]*entry
    amended bool // true if 'dirty' contains keys not present in 'read'
}

type entry struct {
    p atomic.Pointer[any] // Pointer to the actual value (nil, expunged, or v)
}
```

*   **`read` map**: Accessed via **Atomic Pointers**. This is the first line of defense, allowing lookups (Load) to be **Lock-free** and extremely fast.
*   **`dirty` map**: Stores newly inserted elements or those not yet "promoted". Every operation on `dirty` requires holding the `mu` Mutex.
*   **`entry`**: The brilliance of `sync.Map` is that both maps (`read` and `dirty`) **point to the same `entry` objects**. 
    - When updating an existing key, Go simply performs an atomic swap on the `p` pointer inside the `entry`. Both maps see the update instantly without any locking.
*   **`amended` flag**: An optimization flag. If `amended = false`, Go knows for certain that all data is in the `read` map, skipping the expensive Mutex lock to check `dirty`.

### 6.2. The "Misses" Strategy & Promotion

#### A. Load Operation
1.  Check the `read` map first (**Lock-free**). If found, return immediately.
2.  If not found, Lock the Mutex and check the `dirty` map.
3.  Increment the `misses` counter.

#### B. Promotion Mechanism
When the number of "Misses" (failures to find in `read` requiring a `dirty` fallback) equals the number of elements in the `dirty` map:
*   Go performs **Promotion**: The `dirty` map is promoted to become the new `read` map.
*   Future lookups for those keys become **Lock-free** again.

### 6.3. Strategy Assessment (sync.Map)

*   **Pros**: Extremely high lookup performance (Lock-free) for stable keys. Minimizes CPU contention on high-core systems.
*   **Cons**: Higher memory footprint (maintains dual maps). Loss of **Type Safety** (uses `any`/`interface{}`), requiring type assertion overhead.
*   **When to use**: 
    1.  **Stable Keys**: When the set of keys rarely changes (mostly reads and updates to existing entries).
    2.  **High Contention**: When dozens of CPU cores are competing for a single RWMutex.
*   **When NOT to use**: When frequently adding/deleting new keys (causes continuous "Dirty mismatch" and forced promotions, degrading performance).

### 6.4. Practical sync.Map Example

```go
var sm sync.Map

// 1. Store: Write data
sm.Store("Go", 2009)
sm.Store("Rust", 2010)

// 2. Load: Read data
if val, ok := sm.Load("Go"); ok {
    fmt.Println("Found:", val.(int)) // Type Assertion required
}

// 3. LoadOrStore: Atomic "get or set"
// Returns the actual value and true if loaded, false if stored
actual, loaded := sm.LoadOrStore("Java", 1995)

// 4. Delete: Remove data
sm.Delete("Rust")

// 5. Range: Thread-safe iteration
sm.Range(func(key, value any) bool {
    fmt.Printf("Key: %v, Value: %v\n", key, value)
    return true // Return true to continue, false to break
})
```

**Comparison Matrix:**

| Criteria | map + RWMutex | sync.Map |
| :--- | :--- | :--- |
| **Lock Type** | Granular Lock (Entire Map) | Atomic (Read path) + Mutex (Dirty path) |
| **Performance** | Predictable, stable | Superior for Read-heavy & Stable Keys |
| **Type Safety** | **Strong (via Generics)** | Weak (uses `any`) |
| **Complexity** | Simple, intuitive | Sophisticated, higher RAM usage |

---

### Memory Persistence
A Map **does not shrink** its allocated memory after a `delete` operation.
- To fully reclaim heap space, the map must be set to `nil` or reinitialized to trigger Garbage Collection.

### Key Constraints (Comparability)
Only **comparable** types (types that support the `==` operator) can serve as Map keys. Therefore, **Slices**, **Maps**, and **Functions** are disallowed as keys.

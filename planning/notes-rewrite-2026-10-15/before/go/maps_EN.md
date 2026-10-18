---
title: "Maps: key lookup, synchronization, and runtime generations"
category: "Go"
tags: ["golang", "maps", "fundamentals"]
description: "A map stores key → value associations. Learn the guaranteed language behavior first, then read bucket/Swiss Table internals as version-specific implementation details; these are different layers of knowledge."
updated: 2026-10-14
translationKey: "go/maps"
---

A map stores key → value associations. Learn the guaranteed language behavior first, then read bucket/Swiss Table internals as version-specific implementation details; these are different layers of knowledge.

## 1. Create maps and distinguish missing keys from zero values

```go
scores := make(map[string]int, 100)
scores["An"] = 0
value, ok := scores["An"]
fmt.Println(value, ok) // 0 true
value, ok = scores["Binh"]
fmt.Println(value, ok) // 0 false
delete(scores, "An")
```

Make accepts a size hint; it does not create 100 entries, and maps have no slice-like cap. A literal such as `map[string]int{"An": 10}` creates an entry immediately. Missing lookup returns the value’s zero value; use value, ok to distinguish absence. Deleting a missing key is valid. A nil map supports reads/delete/range, but writes panic; initialize it first.

## 2. Assignment, struct values, and key constraints

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

Map assignment copies the map value while sharing its underlying data. Replacing b with a different map does not replace a. A map element is not addressable, so users[1].Name = ... is invalid for struct values; retrieve, modify, and store it. Pointer values permit mutation through *User but require nil and concurrency handling.

Keys must be comparable: numbers, strings, pointers, and arrays/structs with comparable components are examples. Slices/maps/functions cannot be keys. An interface key can compile but panic if its dynamic value is not comparable. Hash collisions are possible, so full key equality is still needed; a hash is not a unique identity. Lookup/update/delete have good average performance, not a spec guarantee of O(1) for every input.

## 3. Iteration, sets, and NaN

Range order is unspecified and can differ across iterations. For stable output, collect and sort keys. Deleting an entry not yet reached prevents it from being produced; entries added during iteration may be produced or skipped. This does not permit unsynchronized writes from another goroutine.

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

A struct{} set expresses membership without a payload. The value has size zero, but keys, metadata, and padding still cost memory; it does not guarantee exactly one byte saved per entry versus bool. NaN != NaN, so lookup/delete with NaN cannot find an inserted entry. Range can still observe it, and clear or discarding the map removes it. Clear was added in Go 1.21 and does not promise capacity reduction.

## 4. Multiple goroutines: map + Mutex

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

Ordinary maps support concurrent reads when no goroutine mutates them. With writes, relevant accesses must be synchronized; a run without a crash proves nothing. The runtime may detect concurrent access and terminate with a fatal error, but this detection neither replaces the race detector nor covers every race.

The example keeps data private so callers cannot bypass the lock; its zero value is usable. Do not copy SafeMap after use. A read-modify-write operation such as incrementing a counter needs one lock across the whole operation; separate Get and Set calls can lose updates even if each method is race-free.

## 5. How does RWMutex differ?

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

RLock permits shared readers; Lock is exclusive. A waiting writer blocks new readers so it can eventually proceed. Long-held read locks still delay writers; do not directly upgrade RLock to Lock or use recursive read locking. RWMutex has overhead: read-heavy does not automatically mean faster than Mutex. Compare under the actual workload.

## 6. sync.Map: a specialized API, not a default replacement

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

sync.Map has a usable zero value and concurrency-safe API operations. LoadOrStore is atomic at the map level; Load + computation + Store is not automatically atomic. Range is not a consistent whole-map snapshot. Mutable pointed-to values still need their own synchronization. Do not copy sync.Map after first use.

A typed map with a lock often makes invariants easier to maintain. sync.Map can help with write-once/read-many keys or mostly disjoint key sets. It uses any, so retrieving concrete values requires assertions. Its performance or memory use is not universally better or worse. Choose by semantics, then measure.

## 7. Runtime history: buckets through Go 1.23

```text
hmap metadata: count, B, hash0, buckets, oldbuckets
bucket count: 2^B

bmap (schematic):
  tophash[8] | keys[8] | values[8] | overflow reference
```

B represents a power-of-two bucket count, not a map’s exact capacity. A hash seed varies distribution between maps; low bits select buckets, and tophash filters candidates before equality. Buckets have eight slots but can chain overflow buckets, so lookup is not limited to eight key comparisons. Grouping keys and values can reduce padding relative to alternating pairs; layout also depends on K/V.

The old implementation typically grew around 6.5 entries per bucket, roughly 81% of its eight primary slots. New buckets and oldbuckets coexisted while mutations incrementally evacuated buckets, avoiding one whole-map copy. Excess overflow could also trigger a same-size grow to reorganize without doubling bucket count. Map growth is not itself a GC stop-the-world phase.

## 8. Swiss Tables from Go 1.24

```text
map → directory → table → groups

group:
  control word: 8 bytes (empty / deleted / 7-bit h2)
  slots:        8 key-value pairs

hash → table/group selection → h2 candidates → full key equality
                                  ↓ no match / group full
                              probe sequence
```

Groups still contain eight slots, but word-level metadata comparisons filter several candidates together. Matching h2 does not guarantee key equality. Some architectures use SIMD, while portable arithmetic/bit operations also exist; not every lookup is one SIMD instruction. Probing follows a sequence of groups instead of overflow chains or necessarily the adjacent group.

Directory-based extendible hashing grows/splits tables instead of rehashing an entire map. In the Go 1.24 implementation a table is limited to 1,024 slots, or 128 groups, before splitting. Small maps have specialized handling. Such limits bound growth work; they do not promise zero latency spikes or faster lookup in every case.

## 9. sync.Map history and memory reclamation

```text
older sync.Map:
  mu | read (atomic pointer) | dirty | misses
           ↘ shared entries ↙
                   entry.p

newer sync.Map: concurrent hash trie (HashTrieMap)
```

Before Go 1.24, read provided a fast read view and dirty served keys requiring the slow path; amended indicated keys not present in read. Load could fall back under a mutex and count misses, eventually promoting dirty to read. Both maps shared entries whose value pointers could be updated atomically. expunged/nil states supported deletion and reinsertion; not every update was lock-free. Go 1.24 replaced this design with a concurrent hash trie, so read/dirty is not a description of newer versions.

Delete/clear does not promise immediate storage shrinkage. When a large map is no longer needed, drop references or copy retained entries into a new smaller map. GC can reclaim the old map only after aliases stop retaining it, and RSS need not fall immediately. Do not nil/recreate a map concurrently with unsynchronized users.

## Worked example

### Scenario: protecting the whole read–modify–write operation

If two goroutines increment a counter, locking each read and each write separately is still insufficient. The contract must protect the entire increment as one operation.

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

| With separate Get and Set | Goroutine A | Goroutine B |
| --- | --- | --- |
| Read under separate locks | Reads 0 | Reads 0 |
| Compute locally | 0 + 1 = 1 | 0 + 1 = 1 |
| Write under separate locks | Writes 1 | Writes 1 |

There need not be a data race, yet the final result is 1 instead of 2: a lost update. Increment holds its mutex throughout the operation to avoid this. Every access to values must use the same locking discipline; do not copy Counts after its mutex has been used. sync.Map does not make a sequence of Load followed by Store automatically atomic either.

## Check your understanding

Why is Get followed by Set insufficient for a safe counter increment? Distinguish bucket growth, Swiss Table splitting, and read/dirty promotion; which descriptions are historical?

## References

- [Go language specification](https://go.dev/ref/spec)
- [Swiss Table maps](https://go.dev/blog/swisstable)
- [sync.Map documentation](https://pkg.go.dev/sync#Map)
- [sync.Map source](https://go.dev/src/sync/map.go)

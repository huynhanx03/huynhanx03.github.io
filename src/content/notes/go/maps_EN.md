---
title: "Maps: key lookup, synchronization, and runtime generations"
category: "Go"
tags: ["golang", "maps", "fundamentals"]
description: "A map stores key → value associations. Learn the guaranteed language behavior first, then read bucket/Swiss Table internals as version-specific implementation details; these are different layers of knowledge."
updated: 2026-10-15
translationKey: "go/maps"
---

A score of zero can mean two things: a player has not scored, or the player is not in our records. A map lets us look up a score by name, but a plain lookup does not tell these situations apart. Start with that distinction; later, the same map will become shared state that needs a clear synchronization rule.

This lesson assumes functions, structs, and basic slice use. The examples are independent snippets: put statements in `main`, declarations outside it, and import `fmt`, `math`, or `sync` where used. Expected results follow from language rules; runtime diagrams describe particular implementations rather than the language contract.

## Store a value, then ask whether the key exists

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

`map[string]int` associates string keys with integer values. The assignment creates the entry for An even though its value is zero. Looking up Binh returns the zero value of `int` too, but `ok` is false because there is no entry. Use the two-result form whenever absence has a meaning different from a stored zero.

The argument 100 to `make` is a size hint. It creates no entries and does not give the map a public capacity; `cap(scores)` is invalid. A literal such as `map[string]int{"An": 10}` creates entries immediately. `len` counts entries, and deleting an absent key is valid.

A zero-value map introduces another distinction:

```go
var missing map[string]int
fmt.Println(missing["An"], len(missing)) // 0 0
delete(missing, "An")                   // Valid.
// missing["An"] = 1                    // Would panic.
missing = make(map[string]int)
missing["An"] = 1
```

A nil map can be read, ranged over, and used with `delete`; it has no initialized storage for inserting an entry. Initialize it before writing. A non-nil empty map has no entries either, but accepts writes. This is why a function that lazily initializes a map must also arrange for the caller to retain the new map value.

## Assignment shares entries; it does not clone them

```go
a := map[string]int{"Go": 1}
b := a
b["Go"] = 2
fmt.Println(a["Go"]) // 2
b = map[string]int{"Go": 3}
fmt.Println(a["Go"], b["Go"]) // 2 3
```

The first assignment copies a map value that refers to the same data. Updating an entry through `b` therefore changes what `a` sees. The later assignment replaces only `b`'s map value; it does not redirect `a`. To make independent entries, allocate a new map and copy them. That copy remains shallow when values themselves contain pointers, maps, or slices.

A struct stored as a map value has a different consequence: lookup retrieves a value, not an addressable struct variable.

```go
type User struct { Name string }
users := map[int]User{1: {Name: "An"}}
// users[1].Name = "Mai" // Invalid: map element is not addressable.
u := users[1]
u.Name = "Mai"
users[1] = u
```

Read the struct, modify the copy, and store it back. A `map[int]*User` permits mutation through the pointer, but the pointer can be nil and several entries or goroutines can share the same user. Changing the value type changes ownership and synchronization obligations as well as syntax.

## A key needs equality, not just a hash

Keys must be comparable. Numbers, strings, pointers, and arrays or structs whose components are comparable can be keys. Slices, maps, and functions cannot. `map[any]int` is permitted, but inserting a slice as its dynamic key panics because that dynamic value is not comparable.

Hashing narrows the search; equality confirms the actual key. Different keys may have the same hash, so a hash is not a unique identifier. Lookup, update, and deletion generally have good average cost, but the specification does not promise O(1) for every input.

One unusual comparable value explains why equality matters:

```go
n := math.NaN()
values := map[float64]string{n: "value"}
_, found := values[n]
fmt.Println(found) // false
clear(values)
fmt.Println(len(values)) // 0
```

NaN is unequal to itself. The entry can be inserted and encountered during range, but looking it up or deleting it with NaN cannot match its key. `clear`, available since Go 1.21, removes every entry, including this one. Avoid floating-point keys when your domain admits NaN and requires ordinary retrieve/delete behavior.

A membership set uses a map without a meaningful payload:

```go
languages := map[string]struct{}{"Go": {}}
_, present := languages["Go"]
fmt.Println(present) // true
```

`struct{}` expresses that only membership matters. Although that value has size zero, the map still needs keys, metadata, and possibly padding. It does not guarantee an exact one-byte saving per entry compared with `bool`.

## Iteration is a traversal, not a sorted view

Range order is unspecified and may change on the next traversal. For a report with stable output, collect keys into a slice, sort them, and look up values in that order.

Changes made during an otherwise synchronized traversal have defined limits: an entry deleted before it is reached is not produced; an entry newly inserted may be produced or skipped. Do not use this permission as authorization for unsynchronized writes from another goroutine. Iteration and concurrent access are separate questions.

## Protect the operation the caller actually needs

Read-only goroutines can share a map once it has been safely published and no goroutine mutates it. When writes overlap accesses, protect the relevant reads and writes. Runtime checks may terminate the process with a fatal concurrent-map error, but absence of that error does not establish safety or replace the race detector.

Suppose two requests increment the same counter. Separate locked `Get` and `Set` methods prevent unsynchronized individual accesses, yet permit this schedule:

| Step | Request A | Request B |
| --- | --- | --- |
| Read under its own lock | Reads 0 | Reads 0 |
| Compute outside the lock | Computes 1 | Computes 1 |
| Write under its own lock | Stores 1 | Stores 1 |

The final count is 1 instead of 2. This is a lost update even if there is no data race. Give the API an operation that protects the complete read–modify–write sequence:

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

The zero value works because reads on nil maps are valid and writes initialize under the lock. Keeping the field private helps prevent callers from bypassing the lock. Every access must follow the same discipline, and `Counts` must not be copied after its mutex has been used. Call `Increment` for increments; composing `Get` and `Set` still has the lost-update problem.

### When readers share a lock

`sync.RWMutex` lets several readers hold `RLock` concurrently while writers use exclusive `Lock`. To adapt the example, change the mutex type and use `RLock`/`RUnlock` in `Get`; `Set` and `Increment` keep exclusive locking.

When a writer is waiting, new readers are blocked so the writer has a chance to proceed. Existing long reads can still delay it. Do not recursively acquire read locks or try to upgrade a held `RLock` directly to `Lock`: those patterns can deadlock. More reads than writes is a reason to investigate `RWMutex`, not proof that its additional bookkeeping pays off. Compare the actual workload.

### When sync.Map fits

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

`sync.Map` has a usable zero value and safe concurrent API operations; do not copy it after first use. `LoadOrStore` checks/inserts as one map operation. A `Load`, local computation, and `Store` sequence still is not one atomic increment. `Range` is not a consistent snapshot of the entire map, and a stored pointer's mutable object needs its own protection.

The API uses `any`, so concrete values require assertions. A typed map with a lock often expresses related invariants more clearly. `sync.Map` is specialized for cases such as keys written once and read many times or goroutines working on mostly disjoint key sets. Choose by required behavior, then measure CPU and memory; neither representation wins universally.

## Reading runtime history without changing the language rules

These details explain source code and performance investigations. They do not change the lookup, sharing, or locking rules above.

### Buckets through Go 1.23

```text
hmap: count | B | hash0 | buckets | oldbuckets
bucket count = 2^B
bmap: tophash[8] | keys[8] | values[8] | overflow reference
```

`B` controls a power-of-two bucket count, not an exact public capacity. A per-map hash seed changes distribution. Low hash bits choose a bucket; `tophash` filters candidates before full equality. Eight primary slots do not limit lookup to eight comparisons because collisions can create overflow chains. Separating keys from values can reduce padding relative to alternating pairs, depending on the key/value layout.

The historical implementation typically grew around 6.5 entries per bucket, roughly 81% of the primary slots. It retained old and new bucket arrays together and evacuated buckets incrementally during mutations. This spreads migration work rather than copying the entire map at once. Excess overflow could trigger a same-size grow to reorganize storage without doubling bucket count. This growth is map work, not a GC stop-the-world phase.

### Swiss Tables introduced in Go 1.24

```text
map → directory → tables → groups
                           control word: 8 control bytes
                           slots: 8 key-value pairs
hash → select table/group → filter by 7-bit h2 → full equality
                         ↘ probe other groups when needed
```

A control byte records empty/deleted state or a seven-bit hash fragment, `h2`. Comparing control metadata as a word filters multiple candidate slots together; matching `h2` still needs full equality. Depending on architecture, SIMD or portable arithmetic and bit operations implement the comparison. A lookup is not universally one SIMD instruction.

Probing follows a group sequence rather than an overflow list or necessarily the next adjacent group. Directory-based extendible hashing lets one table grow or split while others remain unaffected. The Go 1.24 design limits a table to 1,024 slots, or 128 groups, before splitting; small maps have a specialized path. These are versioned implementation details that limit growth work, not promises of zero latency spikes or faster operations for every workload.

### sync.Map has a separate history

```text
before Go 1.24:
  mu | read (atomic pointer) | dirty | misses
           ↘ shared entries ↙
                  entry.p
from Go 1.24:
  concurrent hash trie (HashTrieMap)
```

In the older design, `read` served a fast view while `dirty` held keys needing a slow path. An `amended` flag indicated keys outside `read`. A load missing the fast view could lock, consult `dirty`, and increase the miss count; enough misses promoted `dirty` to `read`. Shared entry pointers supported atomic value updates, while nil/expunged states handled deletion and reinsertion. That did not make every update lock-free. Go 1.24 replaced this organization with a concurrent hash trie; do not use read/dirty diagrams to explain the newer implementation.

## Removing entries and releasing memory are different events

Neither `delete` nor `clear` promises immediate storage shrinkage. If a formerly large map will remain small, copying retained entries into a new map can release the old storage once every alias stops retaining it. Dropping the map entirely works when none of its entries are needed. Both require synchronization if other goroutines use the map.

GC eligibility is another step, and returning pages to the operating system is another. RSS need not drop immediately after entries disappear. [Garbage collection](/en/notes/go/garbage_collection/) explains those measurements.

## Predict before reading the answers

1. After `b := a`, will `b = make(map[string]int)` empty `a`? Will `clear(b)` before that replacement affect `a`?
2. Why can locked `Get` then locked `Set` lose a counter increment? What must the lock cover?
3. An article describes `oldbuckets`; another describes directory splits; a third describes `dirty` promotion. Which structures do they describe?

**Answers:**

1. Replacement changes only `b`; `a` still names the old map. Clearing before replacement removes entries in the shared map and is visible through `a`.
2. Another goroutine can read the same old count between the calls. Hold one lock over reading, computing, and writing, as in `Increment`.
3. `oldbuckets` belongs to the historical built-in map through Go 1.23; directory splits belong to the Swiss Table built-in map introduced in 1.24; dirty promotion belongs to the older `sync.Map`, replaced in 1.24. None is a language-level requirement.

## References

- [Go specification: maps](https://go.dev/ref/spec#Map_types), [indexing](https://go.dev/ref/spec#Index_expressions), and [range](https://go.dev/ref/spec#For_range) — language behavior.
- [Swiss Table maps](https://go.dev/blog/swisstable) — the Go 1.24 design and growth rationale.
- [sync.Map](https://pkg.go.dev/sync#Map) and [RWMutex](https://pkg.go.dev/sync#RWMutex) — API contracts.
- [Go 1.23 map source](https://github.com/golang/go/blob/go1.23.0/src/runtime/map.go), [Go 1.23 sync.Map source](https://github.com/golang/go/blob/go1.23.0/src/sync/map.go), and [Go 1.24 release notes](https://go.dev/doc/go1.24#sync) — historical implementations and transition.

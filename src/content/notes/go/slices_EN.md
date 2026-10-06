---
title: "Slices"
category: "Go"
tags: ["golang", "slices", "arrays", "fundamentals"]
---

# Slices: Dynamic Array Abstractions

In the Go ecosystem, **Slices** are the primary mechanism for managing sequences of data. While **Arrays** serve as the primitive foundation with a fixed size, Slices provide a powerful, high-level abstraction layer. In professional Go development, Slices are utilized 99% of the time due to their flexibility, efficient memory sharing, and dynamic scaling capabilities.

---

## 1. Array vs. Slice: Type Systems and Memory

### Fixed-size Arrays
An Array, such as `[5]int`, has its dimensions intrinsically tied to its type. Consequently, `[5]int` and `[10]int` are incompatible types. This rigidity makes Arrays unsuitable for general-purpose data collections.

### Semantic Distinctions in Memory Addressing
While the physical memory address of an array and its first element often coincide, they represent different entities in Go's strict type system:
-   **`&arr`**: Represents a pointer to the **entire array structure** (Type: `*[N]T`).
-   **`&arr[0]`**: Represents a pointer to a **single element** (Type: `*T`).

Distinguishing these two is vital when performing low-level pointer arithmetic or interfacing with C-style libraries.

---

## 2. Internal Representation (The SliceHeader)

A Slice does not store data directly; instead, it encapsulates three fields that describe a portion of an underlying array. This "Descriptor" is defined as `SliceHeader` in `runtime/slice.go`:

```go
type SliceHeader struct {
    Data uintptr // Pointer to the initial element in the underlying array
    Len  int     // The current count of accessible elements
    Cap  int     // The total capacity before a re-allocation is mandatory
}
```

### The "Header Copy" Consequence
When a Slice is passed to a function, Go performs a **Shallow Copy** of this 24-byte structure (on 64-bit systems).
-   **Mutable Elements**: Since both the original and the copy point to the same `Data` address, modifications like `s[0] = 10` are globally visible.
-   **Immutable Metadata**: If `append` modifies the `Len` or `Cap` of the local copy, the original Header in the caller remains unaffected. This architectural decision necessitates the standard idiom: `s = append(s, ...)`.

---

## 3. Growth Strategy and Runtime Anatomy

The `append` function is an intelligent wrapper around the runtime's memory management. When `Len` reaches `Cap`, the runtime triggers a re-allocation:

1.  **Capacity Scaling**: To minimize allocation frequency while curbing memory waste, Go employs a dual-threshold strategy:
    -   **Small Slices (`Cap < 256`)**: The capacity is **doubled** (Exponential growth) for rapid scaling.
    -   **Large Slices (`Cap >= 256`)**: Growth shifts to a smoother transition (approaching **1.25x**) to prevent massive, unutilized memory reservations.
2.  **Memory Migration**: A new, larger contiguous memory block is allocated. The runtime uses `memmove` for high-performance data transfer from the obsolete array to the new one.
3.  **GC Integration**: The obsolete array becomes eligible for Garbage Collection (GC) once all references are severed.

> To achieve optimal performance and avoid the latency of repeated migrations, always pre-allocate capacity using `make([]T, len, cap)` when the approximate dataset size is predictable.

---

## 4. Sophisticated Slice Logic

### Full Slice Expression (3-Parameter Reslicing)
The syntax `a[low : high : max]` provides surgical precision over the resulting Slice's capacity.
- **`max`**: Explicitly caps the `Cap`. 
- **Use Case**: This is critical for preventing "leaky" modifications where a child slice might accidentally overwrite parent array data during an `append` operation.

### In-place Filtering and Transformation
For performance-critical code, you can perform transformations without a single allocation by reusing the underlying array:

```go
func FilterInPlace(src []int) []int {
    n := 0
    for _, x := range src {
        if x > 0 {
            src[n] = x // Overwriting current underlying memory
            n++
        }
    }
    return src[:n] // Returning a view of the reused memory
}
```

---

## 5. Operational Pitfalls and Best Practices

### Memory Pinning (Leaks)
A tiny Slice can inadvertently "pin" a massive underlying array in memory, as the GC cannot reclaim the array while a valid pointer (`Data`) refers to it.
*Mitigation*: When slicing a small portion from a large source, use `copy()` to a new, correctly sized allocation.

### The Nil vs. Empty Slice Paradox
This distinction is a favorite topic in technical evaluations:
- **Nil Slice** (`var s []int`): `Data = 0`. Represents a logical absence of data (e.g., failed operation).
- **Empty Slice** (`s := []int{}`): `Data` refers to the internal **`zerobase`** sentinel. This costs zero allocation but satisfies requirements for non-nil results.
- **JSON Serialization**: A Nil Slice serializes to `null`, whereas an Empty Slice serializes to `[]`. Consistency here is paramount for API contract stability.

---

> To create a fundamentally independent data set that is decoupled from the original underlying array, always utilize the `copy()` function.

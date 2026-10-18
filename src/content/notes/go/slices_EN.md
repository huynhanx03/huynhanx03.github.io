---
title: "Go slices: understanding shared data and append"
category: "Go"
tags: ["golang", "slices", "arrays", "fundamentals"]
description: "Track backing arrays, length, and capacity to understand shared data, where append writes, and when copying is needed."
updated: 2026-10-15
translationKey: "go/slices"
---

You take the first two scores from a list, assign them to another variable, and change one of them. Then you discover that the original list changed too. Why can two differently named variables affect each other?

With Go slices, variable names do not tell you whether the data is independent. To predict the result, track two things: the slice value and the array that stores its elements.

This article develops that distinction through mutation, append, copying, and memory retention. It assumes variables, functions, and loops; see [Pointers](/en/notes/go/pointers/) if addresses are unfamiliar. Code snippets are independent: place statements in `main`, function declarations outside `main`, and add the imports they use. Comments show expected results derived from the language rules.

## Two variables, one region of data

```go
scores := []int{10, 20, 30, 40}
firstTwo := scores[:2]
firstTwo[0] = 99

fmt.Println(firstTwo) // [99 20]
fmt.Println(scores)   // [99 20 30 40]
```

The expression `scores[:2]` selects the region from the start up to, but excluding, index 2: elements 0 and 1. It does not copy those elements into another array. `firstTwo[0]` and `scores[0]` access the same location, so a write through `firstTwo` is visible through `scores`.

The array storing these elements is called the **backing array**. A slice describes a region of that array; several slices can describe overlapping regions. Another slice variable does not imply another copy of the data.

To see why, first consider an array on its own.

## An array holds elements; a slice describes a region

```go
original := [3]int{10, 20, 30}
other := original
other[0] = 99

fmt.Println(original) // [10 20 30]
fmt.Println(other)    // [99 20 30]
```

`[3]int` is an array of three integers. Its length is part of its type, so `[3]int` and `[4]int` are different types. Array assignment copies the elements: `other[0]` is independent of `original[0]` in this example.

A slice type is written `[]int`, without a length in the brackets. A useful model of a slice value has three components:

| Component | Meaning |
| --- | --- |
| Pointer | Identifies the starting position in the backing array |
| `len` | The number of elements currently accessible through the slice |
| `cap` | The number of elements from that start to the array boundary the slice is allowed to extend to |

Slice assignment copies this descriptive value; the backing array can remain shared. The pointer–len–cap model is sufficient here; there is no need to construct a representation with `unsafe`.

Array assignment is not automatically a deep copy either. If its elements are slices, maps, or pointers, copied values can still reference shared inner data. This distinction will matter again when using `copy`.

## Reading len, cap, and bounds

```go
scores := []int{10, 20, 30, 40}
middle := scores[1:3]

fmt.Println(middle)           // [20 30]
fmt.Println(len(middle))      // 2
fmt.Println(cap(middle))      // 3
fmt.Println(middle[:3])       // [20 30 40]
// fmt.Println(middle[2])     // Would panic: index is outside len.
```

`scores[1:3]` starts at index 1 and stops before index 3. `middle` has two elements, but three positions remain from its start to the end of the array: 20, 30, and 40. Its length is therefore 2 and its capacity is 3.

The important distinction is that **indexing uses length**, not capacity. `middle[2]` is not valid yet, even though 40 exists in the backing array. `middle[:3]` creates a longer slice because the new bound fits within capacity; it does not update `len(middle)` unless the result is assigned back.

For slices, `s[low:high]` has length `high-low`, with valid bounds satisfying `0 ≤ low ≤ high ≤ cap(s)`. This allows reslicing beyond the current length. Element access `s[i]` still requires `0 ≤ i < len(s)`.

## make: available space is not current length

```go
scores := make([]int, 0, 4)
fmt.Println(len(scores), cap(scores)) // 0 4
// scores[0] = 10                    // Would panic.

scores = append(scores, 10, 20)
fmt.Println(scores) // [10 20]

zeros := make([]int, 2, 4)
fmt.Println(zeros) // [0 0]
```

`make([]int, 0, 4)` creates an empty slice with room for four elements before capacity must be exceeded. Its length is still zero, so `scores[0]` cannot be assigned. Here, `append` adds elements and returns a slice with the new length.

By contrast, `make([]int, 2, 4)` already has two accessible elements, initialized to the zero value of `int`: 0. Appending to it places new values after those two zeros rather than replacing them.

When assigning elements by index, create the required length. When building a list with `append`, starting at length zero with a reasonable anticipated capacity is often appropriate.

## Where does append write?

Return to the scores. Use an explicit capacity so the example does not depend on the runtime's growth choices.

```go
scores := make([]int, 3, 5)
copy(scores, []int{10, 20, 30})
firstTwo := scores[:2]

firstTwo = append(firstTwo, 99)
fmt.Println(firstTwo) // [10 20 99]
fmt.Println(scores)   // [10 20 99]
```

Initially, `firstTwo` has length 2 and capacity 5. Adding 99 fits, so `append` reuses the backing array. The new element occupies index 2 relative to the start of `firstTwo`, which is also the position containing 30 in `scores`. The value 30 is therefore overwritten.

| Moment | `scores` | `firstTwo` | Relevant data in the shared array |
| --- | --- | --- | --- |
| Before append | len 3, cap 5 | len 2, cap 5 | 10, 20, 30 |
| After append | len 3, cap 5 | len 3, cap 5 | 10, 20, 99 |

`append` does not know that we want to preserve the data visible through another slice. It operates on the supplied slice and its capacity.

Now change only the capacity limit, keeping the append operation:

```go
scores := []int{10, 20, 30}
firstTwo := scores[:2:2]
firstTwo = append(firstTwo, 99)

fmt.Println(scores)   // [10 20 30]
fmt.Println(firstTwo) // [10 20 99]
```

The three-index expression `s[low:high:max]` gives length `high-low` and capacity `max-low`. With `scores[:2:2]`, both are 2. Adding a third element exceeds capacity, so `append` needs another array and copies the existing two elements into it. Writing 99 now leaves the old array's 30 untouched.

However, limiting capacity **does not copy the data at slicing time**. Assigning `firstTwo[0] = 77` before appending would still change `scores[0]`. This technique forces an append exceeding capacity to move storage; it does not prevent writes to currently shared elements. Copy when independence is required immediately.

## Why return a slice after appending inside a function?

```go
func addScore(scores []int, value int) []int {
    return append(scores, value)
}

scores := make([]int, 2, 3)
copy(scores, []int{10, 20})
longer := addScore(scores, 30)

fmt.Println(scores)       // [10 20]
fmt.Println(longer)       // [10 20 30]
fmt.Println(scores[:3])   // [10 20 30]
```

Go passes arguments by value. The function receives a copy of the slice value, including its length and capacity; that copy can still refer to the caller's array. Here it writes 30 into shared storage, but the caller's `scores` length remains 2. `longer` holds the returned slice and has length 3.

To update the current list, the usual call is `scores = addScore(scores, 30)`. Keeping the result also works when append allocates another array. Relying only on writes to old storage can appear to work with spare capacity and fail when that capacity runs out.

A function that only changes existing elements, such as `scores[0] = 99`, can make a change visible to the caller without returning another slice. Distinguish mutating backing data from replacing the slice value held by the caller.

## Copying for independent data

```go
scores := []int{10, 20, 30}
independent := make([]int, 2)
copied := copy(independent, scores[:2])
independent[0] = 99

fmt.Println(copied)      // 2
fmt.Println(scores)      // [10 20 30]
fmt.Println(independent) // [99 20]
```

This time, `make` creates separate storage, and `copy` transfers the elements. Changing `independent` leaves `scores` unchanged because the slices no longer share an array.

`copy` returns the smaller of the source and destination lengths. It does not grow the destination or allocate more room: copying into a nil or zero-length slice copies zero elements, even if the destination has spare capacity.

For `[]int`, copying elements is enough to change numbers independently. For `[][]int` or `[]*User`, `copy` only copies the inner slices or pointers, which may still reference shared data. Choose the copying depth for the actual structure rather than assuming `copy` clones an entire object. [Structs](/en/notes/go/structs/) explains the same issue for slice fields.

## In-place filtering also mutates shared data

```go
func positiveInPlace(src []int) []int {
    n := 0
    for _, value := range src {
        if value > 0 {
            src[n] = value
            n++
        }
    }
    clear(src[n:])
    return src[:n]
}

values := []int{-1, 2, 0, 3}
alias := values
values = positiveInPlace(values)

fmt.Println(values) // [2 3]
fmt.Println(alias)  // [2 3 0 0]
```

The variable `n` is the next write position. Each positive number is moved to the front, then `n` is incremented. The write position never passes the current read position, so writes do not destroy unread elements. Positive values retain their relative order.

After the loop, the two retained numbers are at the front. `clear(src[n:])` resets the tail to zero values; the function returns a slice of length `n`. The caller assigns it to `values`, while `alias` keeps its old length and can still see both trailing zeros. An in-place filtering API must therefore document its mutation of shared storage.

`clear` was added in Go 1.21. For `[]int` it resets tail values; for pointer-containing elements, clearing the tail also removes unwanted references. It does not change length or capacity. When the input must remain unchanged, build a separate result slice instead.

## A short slice can retain a large array

Suppose a function reads a large packet and returns only its header:

```go
func header() []byte {
    packet := make([]byte, 8<<20)
    copy(packet, "HEADER")
    return packet[:6]
}
```

The result has length 6 but still references the 8 MiB array. While the caller retains it, that array remains reachable rather than becoming garbage eligible for collection.

Restricting the slice to `packet[:6:6]` does not detach it. If the header must outlive the packet, return a copy:

```go
func headerCopy() []byte {
    packet := make([]byte, 8<<20)
    copy(packet, "HEADER")
    result := make([]byte, 6)
    copy(result, packet[:6])
    return result
}
```

The result no longer retains the large array. This does not guarantee an immediate drop in process RSS: GC timing, allocation, and returning memory to the operating system also affect measurements. See [Garbage collection](/en/notes/go/garbage_collection/) for those distinctions.

Copying has a cost, so consider lifetime: retaining a few bytes long-term differs from consuming them immediately and discarding them.

## Nil and empty: similar iteration, different representation

```go
var missing []int
empty := []int{}

fmt.Println(len(missing), len(empty)) // 0 0
fmt.Println(missing == nil)          // true
fmt.Println(empty == nil)            // false

missingJSON, _ := json.Marshal(missing)
emptyJSON, _ := json.Marshal(empty)
fmt.Println(string(missingJSON)) // null
fmt.Println(string(emptyJSON))   // []
```

Both can be ranged over with no iterations and can be used with `append`. The distinction is that `missing` is nil while `empty` is not. Slices cannot be compared to one another with `==`; direct comparison with nil is permitted.

Import `encoding/json` and `fmt`. The example calls `json.Marshal` directly on `[]int`, ignoring errors only for these specific inputs. General marshaling code must handle errors. With this `encoding/json.Marshal` API, a nil slice becomes `null` and an empty slice becomes `[]`. Fields with `omitempty` or types with custom marshaling can have different representations. Follow the API contract rather than internal addresses of empty slices. The [Marshal documentation](https://pkg.go.dev/encoding/json#Marshal) describes the encoding rules.

## Further detail: addresses, representation, and capacity growth

These details help when reading code or investigating performance; they are not prerequisites for understanding the shared-data examples above.

`&array` points to the entire array, whereas `&array[0]` points to the first element. Their types differ even if printed addresses coincide:

```go
array := [3]int{10, 20, 30}
fmt.Printf("%T %T\n", &array, &array[0]) // *[3]int *int
```

An empty array has no element zero whose address can be taken. On many 64-bit architectures a slice descriptor occupies three words; this representation is not an external storage contract or a reason to construct slices using `unsafe`.

When append exceeds capacity, do not predict the next capacity with an unconditional doubling rule. In the [runtime source checked on 2026-10-15](https://go.dev/src/runtime/slice.go), `nextslicecap` uses a threshold of 256 and transitions towards roughly 1.25× growth for large slices. The required new length and allocator rounding also affect actual capacity. These details can change with versions; application code should depend on sufficient capacity for the result rather than an exact sequence of capacities.

Preallocation can reduce backing-array allocations when an appropriate size is known. Reserving excessive space increases retained memory. Optimize after identifying the workload and the cost that needs reducing.

## Predict before reading the explanation

No concrete memory addresses are needed. For each question, identify shared arrays and the length/capacity that governs the next operation.

**1. Change one bound.** In the append example starting with `scores := make([]int, 3, 5)`, replace `firstTwo := scores[:2]` with `firstTwo := scores[:2:2]`. Is the 30 in `scores` overwritten? Why?

**2. Keep capacity, remove length.** How many elements does this copy?

```go
source := []int{10, 20}
destination := make([]int, 0, 2)
n := copy(destination, source)
```

**3. Reuse or preserve?** You need positive numbers, but must also log the original list afterwards. Should you pass it directly to `positiveInPlace`? Suggest a way to preserve it.

**Explanations — read after trying:**

1. No. `firstTwo` has capacity 2, so adding a third element requires another array. Writing an existing element before appending would still affect the old array.
2. `n` is zero because the destination length is zero. To copy two elements, create a destination of length 2 or reslice it to length 2 before copying.
3. Not when the original must remain unchanged. Copy the `[]int` before filtering, or build a separate result slice. A good answer explains remaining sharing and additional allocation costs; several implementations are valid.

The transferable skill is tracking data: which slices hold separate descriptive values, which arrays remain shared, and which operation changes each. That model lets you derive results rather than memorize snippets.

## References

- [Go specification: slices](https://go.dev/ref/spec#Slice_types), [slice expressions](https://go.dev/ref/spec#Slice_expressions), [append and copy](https://go.dev/ref/spec#Appending_and_copying_slices) — language rules.
- [Go Slices: usage and internals](https://go.dev/blog/slices-intro) — backing-array model and slice usage; its age makes it unsuitable as a promise about today's capacity-growth algorithm.
- [Runtime slice.go](https://go.dev/src/runtime/slice.go) — implementation details, checked on 2026-10-15.
- [encoding/json.Marshal](https://pkg.go.dev/encoding/json#Marshal) — nil and empty slice encoding.

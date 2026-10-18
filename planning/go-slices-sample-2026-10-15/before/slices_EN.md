---
title: "Slices and arrays: shared storage, len, cap, and append"
category: "Go"
tags: ["golang", "slices", "arrays", "fundamentals"]
description: "An array contains elements; a slice describes a region of a backing array. This distinction explains shared mutations and why append returns a slice that must be used."
updated: 2026-10-14
translationKey: "go/slices"
---

An array contains elements; a slice describes a region of a backing array. This distinction explains shared mutations and why append returns a slice that must be used.

## 1. An array’s length is part of its type

```go
a := [3]int{10, 20, 30}
b := a
b[0] = 99
fmt.Println(a, b) // [10 20 30] [99 20 30]

whole := &a
first := &a[0]
fmt.Printf("%T %T\n", whole, first) // *[3]int *int
```

`[3]int` and `[4]int` are different types. Assigning an array copies its elements, though pointer/slice/map elements can still contain shared references. &a points to the whole array, while &a[0] points to its first element: their types and permitted operations differ even if printed addresses coincide. An empty array has no element zero.

## 2. The three-part slice model

A useful model is `(pointer, len, cap)`: a reference to storage, the number of accessible elements, and the available capacity from the slice start. This is an explanatory model, not a structure to construct with unsafe. On many 64-bit architectures the descriptor uses three words; do not use that detail as an external data-format contract.

```go
nums := []int{10, 20, 30, 40}
sub := nums[1:3]
fmt.Println(len(sub), cap(sub)) // 2 3
sub[0] = 99
fmt.Println(nums) // [10 99 30 40]
```

Bounds [low:high) include low and exclude high. Sub starts at nums[1], so sub[0] is that same element. Assignment or function calls copy the descriptor, not the backing array.

## 3. What do make and append change?

```go
s := make([]int, 0, 3)
s = append(s, 10, 20)
t := s
t = append(t, 30)
fmt.Println(len(s), len(t)) // 2 3
fmt.Println(s[:3]) // [10 20 30]
```

Make with length zero and capacity three reserves storage but does not make s[0] accessible. Append returns a new descriptor that the caller must use. With spare capacity it can write to shared storage; otherwise it allocates a larger array and copies data. Append inside a function does not update the caller’s slice length, though it can mutate the backing array.

The runtime generally grows small slices quickly and larger ones more gradually. Some implementations use a threshold of 256 and approach 1.25× growth; requested length and allocator rounding also affect capacity. This is not a language rule or a guarantee of doubling. Preallocate when an appropriate size is known, without reserving excessive memory merely to avoid allocations.

## 4. Limiting capacity does not copy

```go
a := []int{1, 2, 3}
limited := a[:2:2]
limited = append(limited, 9)
fmt.Println(a, limited) // [1 2 3] [1 2 9]
```

The full expression [low:high:max] gives length high-low and capacity max-low. Append must allocate new storage here because capacity is exhausted. Before that append, limited[0]=7 would still modify a[0]: limiting capacity does not isolate existing elements.

## 5. Copying and in-place filtering

```go
clone := make([]int, len(a))
copy(clone, a)

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
```

Copy returns the number copied, the smaller source/destination length; copying into a nil slice allocates nothing. It is shallow when elements contain references. In-place filtering mutates storage, so aliases can observe changes; callers must use the returned slice. Clearing the tail removes stale references when this pattern is applied to pointer/object elements. Clear was added in Go 1.21.

## 6. Retention, nil, and empty slices

Keeping a small subslice can retain a large backing array. For long-lived small results, copy them into new storage and drop references to the old array. This is retention, not a collector failing to reclaim unreachable garbage.

Nil and non-nil empty slices both have length zero and support range/append. Only a nil slice satisfies s==nil; slices cannot be compared to each other with ==. Traditional encoding/json typically writes nil as null and empty as []; omitempty or custom marshalers can change that behavior. Do not rely on zerobase internals to distinguish them.

## Worked example

### Scenario: append changing an element visible through another slice

Use an explicit capacity to track the backing array. This example does not depend on the runtime's capacity-growth choices.

```go
base := make([]int, 3, 5)
copy(base, []int{10, 20, 30})
left := base[:2]
left = append(left, 99)
fmt.Println(base) // [10 20 99]

isolated := base[:2:2]
isolated = append(isolated, 77)
fmt.Println(base)     // [10 20 99]
fmt.Println(isolated) // [10 20 77]
```

| Step | len/cap of the slice being used | What happens |
| --- | --- | --- |
| base[:2] | 2/5 | Room remains in the same array |
| append(left, 99) | 3/5 | Writes 99 at index 2 of the shared array |
| base[:2:2] | 2/2 | Limits capacity to 2 |
| append(isolated, 77) | len is 3, cap is at least 3 | Requires another array because capacity is exceeded |

A full slice expression does not immediately copy the first two elements: before append, isolated still shares them with base. It only forces an append that exceeds capacity to move to another array. Clone/copy the data when independence is needed immediately.

## Check your understanding

Explain append through an alias. Which mutation does a full slice expression prevent, and which does it not prevent?

## References

- [Go language specification](https://go.dev/ref/spec)
- [Slices: usage and internals](https://go.dev/blog/slices-intro)

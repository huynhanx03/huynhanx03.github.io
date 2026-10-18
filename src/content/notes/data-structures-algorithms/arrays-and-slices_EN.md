---
title: "Arrays and slices: the foundation of linear data"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/arrays-and-slices"
series: "DSA Foundations"
seriesOrder: 4
tags: ["array", "slice", "two-pointers", "prefix-sum", "go"]
description: "Connect contiguous storage, length, capacity, and sharing to two-pointer algorithms and prefix sums."
draft: false
updated: 2026-10-15
---

A score list needs indexed access, appends, and occasional subranges. A slice supports all three, but their costs and sharing differ. Reading an index does not traverse preceding elements; selecting a subrange does not copy it; appending sometimes moves data to another array.

This article connects contiguous storage to algorithmic cost, then uses two pointers and prefix sums to exploit a sequence's structure. Go fragments are independent: declare functions outside `main`, put statements inside functions, and add required imports. Each example assumes the stated value-domain conditions.

## An array holds elements; a slice describes a region

An array places equal-type elements in consecutive positions. In the usual memory-access model, element i's address is the start address plus i times the element size, giving O(1) valid indexed reads/writes. Inserting in the middle instead shifts a suffix and can take O(n).

In Go, `[4]int` includes length in its type; `[5]int` is different. A `[]int` slice has variable length and can be understood as a backing-array pointer, length, and capacity. Array assignment copies elements; slice assignment copies the description, allowing shared underlying data.

```go
base := []int{10, 20, 30, 40}
part := base[1:3] // [20, 30]



part[0] = 99
    // base is now [10, 99, 30, 40]
```

`part` begins at `base` index one. Its length is two for 20 and 30; its capacity is three because three array positions remain from its start. `part[0]` and `base[1]` access the same slot, so both observe the write of 99.

With `part` now `[99,30]`, `append(part,7)` fits capacity three and overwrites `base[3]`, formerly forty. Append returns a longer slice without increasing `base`'s length. Exceeding capacity requires another array and element copying. Examine actual capacity rather than assuming every append always separates or always reuses storage.

```go
independent := append([]int(nil), part...)
// hoặc: independent := slices.Clone(part)
```

The first line copies integers into independent storage. The `slices.Clone` alternative needs the `slices` import and a release providing it, Go 1.21 or later. Element copying separates `[]int`; pointer/map/slice elements can still share inner data. A short view retains its backing array even when its capacity is restricted. [Go slices](/en/notes/go/slices/) follows these cases in detail.

```note-visualization
{"id":"slice-alias","preset":"normal"}
```

## The price of familiar operations

| Operation on n elements | Cost | Relevant condition |
| --- | --- | --- |
| Read/write `a[i]` | O(1) | Index within length |
| Full traversal | O(n) | Contiguous data often helps locality |
| Append at end | Amortized O(1) under suitable growth | One allocation/copy can cost O(n) |
| Order-preserving insertion/deletion at front or middle | O(n) | Elements must shift |
| Find a value without ordering/index | O(n) | May inspect everything |
| Independent sequence copy | O(n) time and space | Reslicing alone is insufficient |

`make([]int,0,expected)` reserves appropriate anticipated capacity but creates no index-accessible elements while length is zero. `a=a[1:]` is O(1) for the slice description without immediately releasing its backing array. A long-lived queue generally needs a head plus compaction policy or a ring buffer to control retained storage.

## Two pointers find a target-sum pair

Given a **nondecreasing** sequence, seek two distinct indices whose sum equals target. Put left at the start and right at the end. Instead of trying every pair, each comparison must justify removing an endpoint without losing a solution.

```go
func HasPairSum(sorted []int, target int) bool {
    left, right := 0, len(sorted)-1
    for left < right {
        sum := sorted[left] + sorted[right]
        switch {
        case sum == target:
            return true
        case sum < target:
            left++
        default:
            right--
        }
    }
    return false
}
```

For `[1,2,4,7,11]`, target nine: 1+11 is too large, so remove eleven; 1+7 is too small, so remove one; 2+7 finds the pair. Requiring left<right prevents using one position twice. Equal values can still form a pair at different indices.

When the sum is too small, every alternative to the left of right is no larger than its current value. Keeping left and decreasing right cannot reach target, so the current left belongs to no remaining solution. The symmetric argument removes right when the sum is too large. The invariant is that a remaining solution, if any, has a representative inside the current interval. At least one position disappears each iteration, giving O(n) time and O(1) auxiliary space.

Empty and singleton inputs return false without entering the loop. Without sorted input, endpoint elimination is unjustified. Sorting first adds its cost and mutation implications. The code assumes integer addition does not overflow; near integer limits, choose a suitable representation or overflow-safe comparison.

```note-visualization
{"id":"two-pointers","preset":"normal"}
```

## Prefix sums answer many interval queries

Recomputing a long interval sum can cost O(n) per query. For an unchanged sequence, pay preprocessing once. Set `prefix[0]=0`; `prefix[i+1]` sums elements before position i+1. The inclusive interval l..r sums to `prefix[r+1]-prefix[l]`: everything through r minus everything preceding l.

```go
func PrefixSums(a []int64) []int64 {
    prefix := make([]int64, len(a)+1)
    for i, x := range a {
        prefix[i+1] = prefix[i] + x
    }
    return prefix
}

func RangeSum(prefix []int64, left, right int) int64 {
    return prefix[right+1] - prefix[left]
}
```

For `[3,-2,5,1]`, prefix is `[0,3,1,6,7]`. Interval 1..2 sums to 6−3=3, matching −2+5. The leading zero lets an interval starting at zero use the same formula without a special branch.

Building costs O(n) time and space; each valid query O(1). `RangeSum` assumes a correctly built table and `0≤left≤right<len(a)`; it does not validate bounds. `int64` can still overflow, although wider than `int` on 32-bit machines. Changing a does not update the old prefix table; rebuild/update it or consider [Fenwick/segment trees](/en/notes/data-structures-algorithms/segment-fenwick-trees/).

```note-visualization
{"id":"prefix-sum","preset":"normal"}
```

## Strings need an explicit element unit

Go strings are immutable byte sequences, often UTF-8. `len("Việt")` counts bytes, indexing returns a byte, and `range` decodes code points as runes. A displayed grapheme can contain several runes, such as combining marks. Reversing Vietnamese bytes can corrupt UTF-8; reversing runes still need not preserve graphemes. ASCII exercises may use bytes, but must state that assumption.

```note-visualization
{"id":"utf8-bytes-runes","preset":"normal"}
```

## Try the reasoning before checking it

**1.** What invariant supports in-place integer-slice reversal? **2.** For every fixed-length k interval, choose prefix sums or a sliding window? **3.** How can an appended subrange be independent of base?

**Explanation:** Reverse by swapping endpoints and moving inward. Outside the current interval, symmetric pairs already occupy their final positions; stop when indices meet or cross. Time O(n), auxiliary space O(1), including empty input. For `1≤k≤n`, a sliding window computes the first sum, then subtracts the outgoing value and adds the incoming one, giving O(n) time and O(1) auxiliary space. Prefix sums use O(n) storage but also support later intervals of varying lengths. For immediate independence, copy before mutation/appending. Limiting capacity forces an append exceeding it to allocate but does not separate existing shared elements.

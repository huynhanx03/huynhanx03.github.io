---
title: "Divide and conquer: split, solve, and combine"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/divide-and-conquer"
series: "Advanced DSA"
seriesOrder: 1
tags: ["divide-and-conquer", "merge-sort", "recurrence", "master-theorem", "go"]
description: "Use merge sort to understand recursion trees, the Master theorem, and when splitting does not reduce cost."
draft: false
updated: 2026-10-15
---

An unsorted sequence may be difficult to handle directly, but two sorted sequences can be merged by comparing their remaining first elements. Merge sort exploits this: divide the sequence, sort each half, then solve the simpler combination problem.

Divide and conquer means more than two recursive calls. Determine whether subproblems shrink, whether work repeats, and whether combining is cheap enough to make splitting useful. Merge sort connects implementation, proof, and a cost recurrence here.

## Why is merging sorted halves inexpensive?

Take `[2,7,9]` and `[1,5,8]`. Their heads 2 and 1 are the smallest remaining candidates. Choose 1 and advance the right pointer; compare 2 with 5 and choose 2; then take 5,7,8. The right side is exhausted, so copy 9. Producing `[1,2,5,7,8,9]` requires no new minimum-finding scan at each position.

After k writes, the first k result positions contain exactly the k smallest elements of the two complete input halves combined, in nondecreasing order. Each half's smallest unused element is at its remaining head, so choosing the smaller head is valid. After one half empties, the other is already ordered. Each element is written once, making an n-element merge `Θ(n)`.

For equal keys, track identity: left `4A`, right `4B`, with A earlier in the input. Taking left on equality preserves A before B. This is what makes merge sort stable; halving alone does not provide stability.

## Half-open ranges and a reusable buffer

The following Go declarations sort `values` in place without imports. The outer function allocates `buffer` once.

```go
func MergeSort(values []int) {
    buffer := make([]int, len(values))
    mergeSortRange(values, buffer, 0, len(values))
}

// Sort the half-open range [lo, hi).
func mergeSortRange(values, buffer []int, lo, hi int) {
    if hi-lo <= 1 {
        return
    }

    mid := lo + (hi-lo)/2
    mergeSortRange(values, buffer, lo, mid)
    mergeSortRange(values, buffer, mid, hi)

    i, j, k := lo, mid, lo
    for i < mid && j < hi {
        if values[i] <= values[j] {
            buffer[k] = values[i]
            i++
        } else {
            buffer[k] = values[j]
            j++
        }
        k++
    }
    for i < mid {
        buffer[k] = values[i]
        i++
        k++
    }
    for j < hi {
        buffer[k] = values[j]
        j++
        k++
    }
    copy(values[lo:hi], buffer[lo:hi])
}
```

Range `[lo,hi)` has length `hi-lo`; lengths 0 and 1 are already sorted. `mid=lo+(hi-lo)/2` creates adjacent disjoint `[lo,mid)` and `[mid,hi)` ranges. Odd lengths differ by one without losing an element.

Both calls finish their halves before merging starts. Indices i,j,k read the left, read the right, and write the buffer. Tail loops copy only an unexhausted remainder, then copy the merged range back into its region of values. Each recursive node copies its own range, not the whole array.

Induct on length: bases are correct; assuming shorter halves sort correctly, the merge invariant orders the entire range and preserves its multiset. Calls strictly shrink, so recursion terminates. Empty input reaches the base immediately; duplicate keys follow left-first equality handling.

```note-visualization
{"id":"merge-call-tree","preset":"normal"}
```

## Count work across each level

Two approximately n/2 calls plus linear merging/copying give `T(n)=2T(n/2)+Θ(n)` with constant bases. For n=8, the root handles 8 elements; two size-4 ranges total 8 on the next level; four size-2 ranges total 8 after that. Roughly log₂ n merge levels give `Θ(n log n)` total.

Counting calls without merging undercounts time. Charging n at every node as if each processed the entire input overcounts. Use each node's actual range size.

The buffer uses `Θ(n)`. Calls execute sequentially, so the stack holds one `Θ(log n)`-deep path rather than the entire call tree; total auxiliary memory is `Θ(n)`. Reallocating buffers in many calls can increase total allocations and GC pressure even when a particular arrangement retains the same asymptotic time or peak memory. Reusing one makes the intent clear and avoids unnecessary allocation.

General comparison sorting has worst-case lower bound `Ω(n log n)`, attained asymptotically by merge sort. Counting/radix sorting can be faster in n by exploiting key domains/digits; they change the operation model and assumptions rather than contradict that comparison bound.

## Use a recursion tree before a theorem

In `T(n)=aT(n/b)+f(n)`, a roughly equal subproblems have fixed b>1 and nonrecursive work f(n). Set `p=log_b a`; `n^p` reflects leaf growth. Basic Master theorem cases compare f(n) with this threshold:

| Suitable relationship | Dominant work | Common result |
| --- | --- | --- |
| `f(n)=O(n^(p-ε))`, ε>0 | near leaves | `Θ(n^p)` |
| `f(n)=Θ(n^p)` | comparable contribution per level | `Θ(n^p log n)` |
| `f(n)=Ω(n^(p+ε))` with regularity | near root | `Θ(f(n))` |

The last case requires a condition such as `a f(n/b)≤c f(n)` for c<1 and sufficiently large n. This is only the basic form, not a template for every f or partition. `2T(n/2)+Θ(n)` gives `Θ(n log n)`; `T(n/2)+Θ(1)` gives `Θ(log n)`; `4T(n/2)+Θ(n)` gives `Θ(n²)`.

`T(n)=T(n-1)+1` has no fixed-fraction subproblem. A quicksort partition of 0 and n-1 is not two halves just because the code branches twice. When conditions do not fit, expansion or a tree with actual sizes is clearer.

## Subproblems can have different relationships

Binary search continues into only one half and is often called decrease and conquer. Quicksort handles both pivot sides, but balance depends on partitioning; a first-element pivot on increasing input can repeatedly leave size n-1 and take `Θ(n²)`. Random pivots provide an expected guarantee, not balance at every partition.

DP caches overlapping states. Merge-sort halves do not overlap, so memoization is unnecessary to avoid re-sorting the same half. Backtracking explores choices while undoing shared state between branches. Technique names should follow analysis of these relationships rather than replace it.

Before a new split, ask whether subproblems have the same form, shrink enough, repeat, and how much combination costs. A `Θ(n²)` combine step does not become `Θ(n log n)` merely because the recursion tree is balanced.

## Checks with explanations

**1.** What changes if merging uses `<` instead of `<=`? **2.** What is the order of `3T(n/2)+Θ(n)`? **3.** Why is increasing input difficult for first-pivot quicksort?

**Explanations:** With equal heads, `<` chooses right first and can reverse equal-key records across halves, losing stability. In the recurrence, level j contributes proportionally to `n(3/2)^j`; near-leaf levels dominate, yielding `Θ(n^(log₂3))`. The pivot is always minimum, leaving empty and n-1 sides; partition work n+(n-1)+... is quadratic. State duplicate-key handling explicitly when considering repeated values.

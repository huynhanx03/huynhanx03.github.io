---
title: "Merge sort, quicksort, heapsort: three routes toward O(n log n)"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/efficient-sorting"
series: "DSA Foundations"
seriesOrder: 11
tags: ["merge-sort", "quicksort", "heapsort", "stability"]
description: "Compare divide-and-conquer and heap sorting by complexity, memory, stability, and adverse inputs."
draft: false
updated: 2026-10-15
---

Selection sort rescans the remainder to find each new minimum, accumulating quadratic comparisons. Sorting larger inputs needs reuse of earlier work. Merge sort keeps halves ordered, quicksort establishes relationships around a pivot, and heapsort keeps an extremum at a heap root.

All three are associated with O(n log n), but ordinary quicksort has a quadratic worst case. Read the input assumptions, memory costs, and stability alongside the name rather than treating it as a universal guarantee.

## Which model has the comparison lower bound?

There are n! orders of n distinct keys. An algorithm using only comparisons must distinguish them. A binary decision tree of height h has at most 2^h leaves, requiring h≥log₂(n!), hence Ω(n log n). With distinct keys each comparison has two meaningful outcomes; this does not say that a digit-inspecting operation supplies only one bit.

This is a worst-case bound for general comparison sorting. Structured inputs or extra key-domain operations allow different analyses. It also does not determine the best locality or constants on a particular machine.

## Merge sort pays for combining halves

Split, sort both halves, and merge using two head pointers. Each remaining minimum lies at one head, so each element is selected once per merge. The output prefix contains the smallest elements in correct order.

```note-visualization
{"id":"merge-sort","preset":"normal"}
```

With left `[1,4A,4B]` and right `[2,4C]`, take 1,2, then equal-key 4s. Left-first ties produce `4A,4B,4C`, preserving input order. Right-first moves 4C ahead, losing stability despite correct numeric sorting.

The standard splitting/merging recurrence `T(n)=2T(n/2)+Θ(n)` gives Θ(n log n) in the cases considered. Arrays need O(n) merge buffer and O(log n) stack, O(n) total extra memory. Allocate the buffer once and reuse it. A variant skipping an already-ordered merge can have a different best case; do not transfer the standard version's bound to every optimization. [Divide and conquer](/en/notes/data-structures-algorithms/divide-and-conquer/) includes code and proof.

## Quicksort pays according to partition quality

Partitioning places smaller and larger values on pivot sides. Some schemes finalize the pivot's position, while others return only a boundary; recursive ranges must match the chosen scheme. A partition boundary is not necessarily a particular pivot element's final index.

Near-halves give O(n log n) across levels; repeated 0 and n-1 partitions yield n+(n-1)+... = Θ(n²). A first-element pivot on increasing input is typical for schemes with that imbalance. Random pivots give expected O(n log n) under the appropriate random model but permit unlucky sequences; median-of-three reduces some bad cases without guaranteeing balance.

```note-visualization
{"id":"quick-sort","preset":"normal"}
```

For `[3,1,3,2,3]`, pivot 3 with three-way partitioning groups 1,2 into `<3`, all three 3s into `=3`, and nothing into `>3`. Recurse only on outer groups. Internal order depends on the scheme; describing groups does not promise one intermediate array. This avoids repeatedly recursing over equal keys.

Partitioning is commonly in place, but recursion uses O(log n) stack when balanced and potentially O(n) when skewed. Recursing into the smaller side and **iterating** over the larger bounds stack depth by O(log n), because each actual descent at least halves size. Merely calling the smaller side first while recursively calling both does not provide that bound. Worst-case time can remain quadratic. In-place swap variants are usually unstable.

## Heapsort retains the greatest remaining element at the root

Build a max-heap in the array prefix, with every parent at least its children. Swap root and last heap element, shrink the heap, and sift the root down. The suffix then contains the largest finalized elements in sorted order, while the prefix is again a valid max-heap. One remaining heap element completes sorting.

Bottom-up build-heap takes only O(n). About half the nodes are leaves; few high nodes can descend many steps. Total work has form `n Σ h/2^h`, bounded by a constant times n. Charging every node log n is not tight when most cannot descend that far.

There are O(n) maximum extractions at O(log n) each, so worst-case O(n log n). Iterative sift-down needs O(1) auxiliary memory. Root-to-end swaps can cross equal-key records, losing stability. Parent/child index jumps may have worse locality than sequential merging or some quicksort versions, but actual speed needs workload measurements.

```note-visualization
{"id":"heap-sort","preset":"normal"}
```

## Choose the required guarantee

| Classical array version | Worst case | Auxiliary memory | Usually stable |
| --- | --- | --- | --- |
| Buffered merge sort | O(n log n) | O(n) | yes with left-first ties |
| Ordinary quicksort | O(n²) | up to O(n) stack | no |
| Iterative-sift-down heapsort | O(n log n) | O(1) | no |

Go's `slices.Sort` and `slices.SortFunc` cover ordinary sorting; `slices.SortStableFunc` preserves order among comparator-equal elements. They mutate input slices. Comparators must provide the consistent ordering required by the library, not vary between calls. The classical table does not describe a library's implementation merely because its API says Sort.

## Check yourself

**1.** What do right-first ties lose in the 4A/4B/4C merge? **2.** Why do three regions help duplicate keys? **3.** Does linear-time build-heap produce a sorted array?

**Explanations:** It loses equal-key record order, though numeric order can remain correct. The equal-pivot region is already placed relative to outer regions and needs no recursion; poor partitions may revisit equal keys over many levels. Build-heap establishes parent/child ordering and a root extremum, not global sibling/subtree order. Sorting still requires repeated extraction.

API reference: [package slices](https://pkg.go.dev/slices) describes sorting functions and comparator contracts; the table's bounds concern the algorithms explained here.

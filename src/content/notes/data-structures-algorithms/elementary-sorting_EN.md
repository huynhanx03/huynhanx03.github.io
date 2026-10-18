---
title: "Elementary sorting: selection, insertion, and bubble"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/elementary-sorting"
series: "DSA Foundations"
seriesOrder: 10
tags: ["sorting", "selection-sort", "insertion-sort", "bubble-sort", "go"]
description: "Three quadratic algorithms and what they teach about invariants, swaps, and stability."
draft: false
updated: 2026-10-15
---

For `[4,1,3,1]`, we can put the minimum first, insert each element into a sorted prefix, or move the maximum rightward through neighboring pairs. Selection, insertion, and bubble sort all produce increasing order but maintain different invariants. Following a small input explains correctness and why equal O(n²) bounds need not mean equal write costs.

Assume constant-time key comparison and sort in place. For records, **stability** means equal keys retain their original relative order. Labels `1A,1B` make this observable where printing plain 1s would hide it.

## Selection sort finalizes one minimum

On round i, scan `[i,n)` for a minimum and swap it with a[i]. Beforehand, `[0,i)` contains the i smallest elements sorted and no greater than any remaining element. Placing the remaining minimum at i preserves that invariant. After n-1 rounds, one element remains and the entire array is sorted.

For `[4,1A,3,1B]`, the first encountered minimum 1A swaps with 4: `[1A,4,3,1B]`. Next choose 1B: `[1A,1B,3,4]`; the final `[3,4]` range is already ordered. This is one trace, not proof of stability for every input.

```note-visualization
{"id":"selection-sort","preset":"normal"}
```

Comparisons total `(n-1)+(n-2)+...+1=n(n-1)/2`, even on sorted input. Skipping swaps when the minimum is already at i gives at most n-1 swaps. Few swaps can matter when writes cost more than reads/comparisons, but account for the actual writes per swap in that environment.

Direct swapping is unstable. On `[2A,2B,1C]`, exchanging 1C and 2A gives `[1C,2B,2A]`, reversing equal-key A/B. Crossing an equal-key record causes the problem, not a missing special comparison while finding the minimum.

## Insertion sort extends a sorted prefix

Before round i, `[0,i)` contains exactly its original elements in sorted order. Save a[i] in key, shift larger elements right, and place key into the gap:

```go
func InsertionSort(a []int) {
    for i := 1; i < len(a); i++ {
        key := a[i]
        j := i
        for j > 0 && a[j-1] > key {
            a[j] = a[j-1]
            j--
        }
        a[j] = key
    }
}
```

This standalone Go function needs no imports and mutates input. For `[4,1A,3,1B]`, inserting 1A gives `[1A,4,3,1B]`; inserting 3 gives `[1A,3,4,1B]`; inserting 1B shifts 4 and 3 but stops after 1A, yielding `[1A,1B,3,4]`.

Saving key prevents loss of the original element at i while shifting. When the loop stops, either j=0 or the preceding element is no greater than key; shifted elements to its right are larger. Inserting key at j restores a sorted prefix of length i+1 without losing or adding elements.

The strict `>` comparison supplies stability: equal elements are not shifted past key, so a later equal-key record stays later. Changing to `>=` may still sort numbers but reverse equal-key records.

```note-visualization
{"id":"insertion-sort","preset":"normal"}
```

Increasing input needs almost no shifts, giving best-case Θ(n) for n>1. Decreasing input shifts 1+2+...+(n-1), giving worst-case Θ(n²). Auxiliary memory is O(1). Nearly sorted or tiny inputs often make insertion useful because few elements move, though speed still depends on the workload.

## Bubble sort progressively finalizes the suffix

Scan adjacent pairs left to right, swapping when the left exceeds the right. The greatest value encountered moves right; each pass leaves the unsorted region's maximum at its end. Reduce the right boundary next time, leaving the finalized suffix untouched.

For `[4,1A,3,1B]`, the first pass produces `[1A,4,3,1B]`, `[1A,3,4,1B]`, then `[1A,3,1B,4]`. The second moves 3 past 1B, giving `[1A,1B,3,4]`. A pass without swaps establishes every adjacent pair is ordered, allowing early termination.

```note-visualization
{"id":"bubble-sort","preset":"normal"}
```

The early-stop version is best-case Θ(n), worst-case Θ(n²). Always executing all passes loses that linear best case. Swapping only for `>` preserves stability because equal keys never cross directly. Auxiliary memory is O(1). Bubble commonly performs more swaps than insertion's shifts; useful for studying invariants, it is seldom a default for large inputs.

## Compare the criteria

| Presented version | Best case | Worst case | Stable | Distinguishing property |
| --- | --- | --- | --- | --- |
| Selection by minimum swap | Θ(n²) | Θ(n²) | no | few swaps, still scans every minimum |
| Insertion with `>` | Θ(n) | Θ(n²) | yes | adapts to few misplaced elements |
| Bubble with early stop | Θ(n) | Θ(n²) | yes | finalizes one maximum per pass |

All three use O(1) auxiliary memory and handle empty/single-element inputs without modification rounds. For larger data, consider O(n log n) methods or Go libraries. Random, descending, nearly sorted, and duplicate-heavy inputs affect algorithms differently; one Big-O label cannot identify the fastest in every setting.

## Check yourself

**1.** How many comparisons does selection make for n=5? **2.** Why does insertion sort not need to swap on every step? **3.** Can numeric output alone prove stability for duplicates?

**Explanations:** 4+3+2+1=10 even on increasing input. Insertion saves key and shifts larger elements to create one gap; repeated swaps are unnecessary to preserve key. Plain numbers hide equal-key identities; use labels or payloads to inspect relative order. Trace `[4,1,3,1]` against the rounds above, then verify selection's counterexample `[2A,2B,1C]`.

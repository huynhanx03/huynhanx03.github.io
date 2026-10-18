---
title: "Searching: boundary invariants make binary search correct"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/searching"
series: "DSA Foundations"
seriesOrder: 9
tags: ["linear-search", "binary-search", "lower-bound", "invariant", "go"]
description: "From linear scanning to lower and upper bounds, then answer search with a monotone predicate."
draft: false
updated: 2026-10-15
---

In [1,2,2,4], searching for 2 may return index 1 or 2 if any occurrence suffices. Counting occurrences or inserting before every 2 needs the first position. Binary search is easier to control when its output is a precise **boundary**.

Without ordering or an index, linear scanning may be the right choice: O(n) worst-case time, O(1) auxiliary space, and no preparation. With sorted data and O(1) index access, binary search uses order to discard an entire impossible region.

## A lower bound is a position from 0 through n

For nondecreasing a, LowerBound returns the first index with a[i]≥target, or n if absent. Maintain two classified regions: indices below lo have values smaller than target; array indices at least hi have values no smaller. The unknown region is [lo,hi), and the answer boundary may be hi.

This last point matters: hi=n is a valid return position but cannot be read as a[n]. Do not claim that the answer must be an element inside [lo,hi) when that region becomes empty.

```note-visualization
{"id":"binary-search","preset":"found"}
```

This independent Go declaration neither mutates input nor needs imports:

```go
func LowerBound(a []int, target int) int {
    lo, hi := 0, len(a)
    for lo < hi {
        mid := lo + (hi-lo)/2
        if a[mid] < target {
            lo = mid + 1
        } else {
            hi = mid
        }
    }
    return lo
}
```

For [1,2,2,4] and target 2:

| lo | hi | mid | Observation and update |
| ---: | ---: | ---: | --- |
| 0 | 4 | 2 | a[2]=2 is large enough; hi=2 |
| 0 | 2 | 1 | a[1]=2 is large enough; hi=1 |
| 0 | 1 | 0 | a[0]=1 is too small; lo=1 |

It ends with lo=hi=1. If a[mid] is smaller, sorted order makes every earlier index too small, so lo=mid+1 discards them. Otherwise mid could still be the answer, so hi=mid retains that boundary. Each step shrinks the unknown region; the classified regions meet at exactly the answer.

Target 5 returns n=4; an empty array returns 0 without entering the loop. To confirm presence after obtaining i, check `i<len(a) && a[i]==target`, in that order to avoid out-of-bounds access. Lower bound alone promises a boundary, not an equal element.

Halving gives O(log n) time and O(1) auxiliary memory under constant-time integer comparisons/indexing. `lo+(hi-lo)/2` avoids overflow in lo+hi; boundaries must still fit the chosen type.

## Upper bound separates equal values from greater ones

To find the first index with value **greater than** target, use a[mid]<=target: advance lo when true, otherwise set hi=mid. The invariant now puts values no greater than target on the left and greater values on the right.

For [1,2,2,2,5], lower bound of 2 is 1 and upper bound is 4. Equal elements occupy [1,4), so there are 4−1=3. For an absent target, both boundaries coincide and the difference is zero.

```note-visualization
{"id":"upper-bound","preset":"normal"}
```

Names help with lookup, but the < versus <= condition and boundary meaning determine correctness. Do not mix closed-interval [lo,hi] updates into half-open code without changing the invariant.

## A monotone boundary does not require an array

Suppose ordered, indivisible jobs must finish within d days with daily capacity C. feasible(C) simulates in order: start a new day if the next job would exceed C; a job individually larger than C makes the schedule impossible. Assume nonnegative loads, d≥1, and no extra rule under which increased capacity hurts.

If C is feasible, a larger capacity can reuse its schedule and remains feasible. Values form false...false,true...true, so seek the first true. For loads [3,2,4],d=2, capacity 4 needs three days; capacity 5 schedules [3,2] then [4]. The minimum is 5.

```note-visualization
{"id":"answer-binary-search","preset":"normal"}
```

For nonempty input, the largest job is a lower bound and the total is a feasible upper bound. One can use impossible/possible endpoints or a lower-bound candidate interval, but endpoint meanings and no-solution handling must stay consistent. Empty data, invalid d, negative jobs, or sum overflow need separate contracts. A nonmonotone predicate can still let the loop terminate while returning the wrong answer.

If one check reads n jobs and the integer candidate range contains R values, the total is O(n log R) job operations, with space depending on the predicate. Reporting only O(log R) omits simulation cost.

## Reason at the boundaries

**1.** Use upper bound to count 2 in [1,2,2,2,5]. **2.** Find an integer square root of nonnegative x without evaluating mid*mid. **3.** Why cannot a middle comparison discard half of an unsorted array?

**Answers:** Upper bound uses <= and returns 4; lower returns 1, difference 3. For mid>0, mid²≤x is equivalent to mid≤x/mid in nonnegative integer arithmetic. Handle mid=0 to avoid division by zero and avoid overflowing an endpoint x+1 at the maximum value. Search either the last satisfying value or the first value satisfying the opposite condition with consistent boundaries. Without order, a[mid]<target says nothing about all earlier elements; the target may lie on either side. Ordering or monotonicity, rather than halving itself, permits eliminating a region.

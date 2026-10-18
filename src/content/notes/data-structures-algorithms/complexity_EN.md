---
title: "Reading and calculating algorithmic complexity"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/complexity"
series: "DSA Foundations"
seriesOrder: 2
tags: ["big-o", "complexity", "amortized-analysis", "go"]
description: "Choose an input-size model, distinguish asymptotic bounds and cases, and analyze loops, recursion, amortization, and space."
draft: false
updated: 2026-10-15
---

Finding a maximum requires reading a whole sequence; searching a sorted sequence can eliminate half at each step. Growing input from a thousand to a million elements separates these growth patterns more clearly than one measurement on a small example. Complexity analysis describes that difference without tying the algorithm to a particular CPU.

O(n) does not mean exactly n milliseconds. It is a bound in terms of input size under a chosen cost model. First state what n measures and which operations count as units.

## Choose the size and model correctly

For a slice, n commonly counts elements. Scanning an r-by-c matrix costs O(rc); O(n²) could incorrectly suggest it must be square. Graphs use V vertices and E edges because they vary independently. An integer x takes about log₂x bits, so repeatedly halving it is linear in bit count but logarithmic in numeric value.

Under word-RAM, indexed reads and adding machine-word numbers commonly cost O(1). Arbitrary-length integer addition does not remain constant regardless of bit length. Hashing or comparing long strings can likewise read many bytes. Put assumptions near their formulas rather than turning a convenient model into a universal promise.

```note-visualization
{"id":"linear-count","preset":"normal"}
```

Counting reads illustrates growth without automatically including cache, allocation, operating-system, or I/O costs. Model or measure those separately when they affect a practical decision.

## Upper, lower, and tight bounds

For cost T(n) and reference g(n), nonnegative for sufficiently large n:

- `T(n)=O(g(n))` means positive C and n₀ exist such that `T(n)≤C g(n)` for every n≥n₀: an upper bound.
- `T(n)=Ω(g(n))` means positive c and n₀ exist such that `T(n)≥c g(n)` thereafter: a lower bound.
- `T(n)=Θ(g(n))` means both hold: a tight growth bound.

`3n²+5n+7` is Θ(n²) because the quadratic term dominates eventually. O(n³) is also true but less informative. Ignoring constants supports growth comparison without making the factor three irrelevant in a real execution.

An algorithm's bound differs from a problem's lower bound. A maximum scan takes Θ(n); proving asymptotic optimality additionally requires showing every correct algorithm in the comparison model must inspect every element in the worst case. An unseen element could exceed the current maximum. Without added structure/information, this prevents a logarithmic solution.

## Best, worst, and average describe different functions

Linear search can stop at the first element, best-case Θ(1). An absent or last target requires worst-case Θ(n). The statements concern different input sets and do not conflict.

Average-case needs a distribution. If the target certainly exists and each position is equally likely, the expected number inspected is (n+1)/2, still Θ(n). Frequent absence or early-position bias changes that expectation. “Average n/2” without a target model is incomplete. Hash-table expectations may concern hash selection or an input-distribution model; state which.

## Count actual loop iterations

The following are independent code sketches: n is nonnegative and `use` denotes O(1) work with a suitable signature in each fragment, rather than one supplied function for running them together.

```go
for i := 0; i < n; i++ {       // n iterations
    use(i)                     // assume use is O(1)
}
// Θ(n)

for i := 0; i < n; i++ {
    for j := 0; j < n; j++ {
        use(i, j)
    }
}
// Θ(n²)

for x := n; x > 1; x /= 2 {
    use(x)
}
// Θ(log n) for n > 1
```

Two independent n-bound nested loops multiply to n². But two `for` keywords alone prove nothing. If the inner bound is i, total iterations are `0+1+...+(n−1)=n(n−1)/2`, still Θ(n²) with a different coefficient.

```note-visualization
{"id":"nested-loop-count","preset":"normal"}
```

An inner pointer that only advances and never resets may move at most n times across the **entire function**, despite nesting. Count total state transitions rather than mechanically multiplying bounds. This explains linear two-pointer algorithms with nested-looking loops.

Sequential fragments add costs: Θ(n)+Θ(n²) becomes Θ(n²) when only growth matters. Halving x leaves about n/2^k after k steps, reaching one after roughly log₂n steps. Different fixed logarithm bases greater than one change only a constant factor.

```note-visualization
{"id":"halving-count","preset":"normal"}
```

Recursion requires counting calls and work outside them. `T(n)=T(n−1)+Θ(1)` gives Θ(n); merge sort's `T(n)=2T(n/2)+Θ(n)` has about log n levels with linear aggregate work each, yielding Θ(n log n). [Divide and conquer](/en/notes/data-structures-algorithms/divide-and-conquer/) develops call trees and Master theorem limits.

## Amortization analyzes a sequence

Suppose dynamic-array capacities grow 1,2,4,8,… and full arrays are doubled and copied. Across n insertions, copies sum to a geometric series `1+2+4+...<2n`. Adding n new-element writes keeps the whole sequence O(n), or amortized O(1) per append.

An individual append at full capacity still copies O(n) elements. Amortization distributes total work rather than denying costly events. It needs no random-input assumption like average-case. A per-request latency requirement is not settled by an amortized bound alone.

```note-visualization
{"id":"dynamic-capacity","preset":"normal"}
```

Doubling serves this particular proof model. Go does not promise one fixed capacity multiplier across releases/sizes; that sequence is not mandatory runtime output. Known appropriate sizes let `make([]T,0,n)` reserve space and reduce reallocations, while reserved memory still has a cost.

## Space is counted at an instant

A sequence-sum function holding a few variables uses O(1) auxiliary space. Returning a copy requires O(n) result space even with little internal state. Separate output storage from auxiliary storage when comparing solutions.

Depth-n recursion retains O(n) stack frames simultaneously. Merge sort usually uses O(n) buffer and O(log n) stack, giving O(n) auxiliary space. Quicksort depends on partition depth; in-place partitioning does not erase stack cost. Peak live memory also differs from cumulative allocation over time: repeated buffers across levels can increase allocation volume without all being live together.

| Typical tight growth | When n doubles | Example under suitable assumptions |
| --- | --- | --- |
| Θ(1) | Roughly unchanged steps | Indexed read |
| Θ(log n) | A constant number more | Binary search |
| Θ(n) | Roughly double | Sequence scan |
| Θ(n log n) | Slightly more than double | Ordinary merge sort |
| Θ(n²) | Roughly quadruple | All pairs |
| Θ(2ⁿ) | Multiplied by another 2ⁿ | Enumerating all subsets |

This table uses tight typical forms; a loose O(n²) bound does not force actual quadrupling. Two linear algorithms can differ through locality, allocation count, and step cost. Workload measurements supplement growth analysis for practical choices.

## Check your understanding

**1.** How many iterations does `i=1; i<n; i*=3` take? **2.** What costs r rows of c columns? **3.** Why is every append not worst-case constant?

**Explanation:** For n>1 without arithmetic overflow, i takes powers 3^k<n, giving ceil(log₃n) iterations and Θ(log n). Fixed-width overflow needs separate handling; mathematical analysis does not repair it. Visiting every matrix cell is Θ(rc) for constant work per cell. Some appends allocate/copy linearly; constant amortized cost belongs to a whole sequence under the growth model. Report time, auxiliary space, and input mutation together.

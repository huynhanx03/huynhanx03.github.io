---
title: "Recursion: from a smaller problem to a complete answer"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/recursion"
series: "DSA Foundations"
seriesOrder: 5
tags: ["recursion", "call-stack", "recurrence", "go"]
description: "Base cases, progress, the call stack, inductive correctness, and separate time and memory analysis."
draft: false
updated: 2026-10-15
---

To sum [4,1,3], we can say “4 plus the sum of [1,3].” The remaining question has the same form with fewer elements. Recursion uses an answer to a smaller instance to complete the current one.

“A function calls itself” describes syntax. To use recursion, define exactly what each call answers, when it returns immediately, how it shrinks the problem, and how answers are combined. Trees, divide and conquer, configuration generation, and backtracking often make this structure natural.

## Give each state a precise contract

The following function returns the sum from i to the end. It is an independent Go declaration requiring `0≤i≤len(a)` and intermediate sums that fit int.

```go
func SumFrom(a []int, i int) int {
    if i == len(a) { // base case: no elements remain
        return 0
    }
    return a[i] + SumFrom(a, i+1) // bài toán nhỏ hơn
}
```

The state is a together with i. At i=len(a), the remainder is empty and sums to 0. Otherwise, its sum is a[i] plus the sum starting at i+1. Do not redo the child's work; rely on its stated contract and check the combination step.

The nonnegative measure len(a)−i decreases by one per call, so it must reach the base case. Negative i or i>len(a) violates the precondition and can cause an indexing panic; i==len(a) does not protect against every invalid input.

Correctness follows by the remaining element count: the empty remainder correctly returns 0; if i+1 returns the correct suffix sum, adding a[i] produces the current answer. Correctness and termination are separate necessary arguments.

## The stack holds unfinished work

For [4,1,3], SumFrom(a,0) waits for the suffix sum. Frames hold:

| Call | Pending work |
| --- | --- |
| i=0 | Add 4 to the i=1 result |
| i=1 | Add 1 to the i=2 result |
| i=2 | Add 3 to the i=3 result |
| i=3 | No elements remain; return 0 |

Returns produce 3+0=3, 1+3=4, then 4+4=8. Calls proceed downward; completion proceeds upward. Calling a child does not usually finish the current node's work.

For n remaining elements, n+1 calls each do constant nonrecursive work. `T(n)=T(n−1)+Θ(1)=Θ(n)`. Up to n+1 frames coexist, giving Θ(n) stack space. An iterative sum also takes linear time but keeps only a sum and index, using Θ(1) auxiliary memory.

```note-visualization
{"id":"factorial-stack","preset":"normal"}
```

The factorial visualization has the same pattern: each level holds a pending multiplication. Recursion is not automatically faster. Go goroutine stacks can grow, but deep recursion still costs memory and has limits; do not assume every tail call becomes a loop.

## Branch count and maximum depth are different

Fibonacci follows two subproblems from its definition:

```go
func FibSlow(n int) int {
    if n < 2 {
        return n
    }
    return FibSlow(n-1) + FibSlow(n-2)
}
```

Use nonnegative n small enough for the result to fit int. At n=5, F(5) calls F(4),F(3); F(4) calls F(3),F(2). F(3) is repeated, as are smaller states along other branches. Correct base cases and decreasing problems do not guarantee efficiency.

```note-visualization
{"id":"fibonacci-calls","preset":"normal"}
```

The call count grows Θ(φⁿ), where φ is the golden ratio, under constant-time arithmetic. O(2ⁿ) is also true but looser. Maximum stack depth is only O(n): one branch completes before returning to run the other, so not all call-tree nodes coexist. Do not infer stack memory from total node count.

Memoization stores each F(k) after its first computation. Bottom-up evaluation computes F(0),F(1), then successive states. Both process O(n) states and need O(n) for a full table. Fibonacci alone needs only the two previous values, allowing O(1) auxiliary memory iteratively. Arbitrary-precision integers avoid overflow but add bit-dependent arithmetic costs; additions are then not automatically constant-time.

Dynamic programming arises when subproblems overlap and their answers can be reused. Recursion on independent halves, as in merge sort, does not become DP merely because it makes many calls.

## Choose state without silently copying data

For arrays, index pairs (left,right) identify the range without copying it on every reduction. In Go, a[left:right] creates a slice descriptor, typically O(1), sharing its array rather than making independent data. A long-lived view can retain a large array. The contract must say whether calls may mutate shared storage.

For a tree, the current node is often natural state. On cyclic graphs, passing only a node without parent/visited information or another condition can recurse forever. A call that merely seems closer to the root does not replace a termination measure.

Before coding, write four concrete statements: what this call returns, its immediate-return case, how child results combine, and which nonnegative integer measure decreases. Missing state can make the same parameters require different answers; missing progress can revisit exactly the same state.

## Related techniques use subproblems differently

Divide and conquer solves mostly separate parts and combines them, as in merge sort. Backtracking tries a choice, recurses, and undoes state before another branch. DP saves repeated states. All may use recursion but differ in branch relationships and reuse. Draw states and dependencies before naming a technique.

## Reason it through

**1.** What should MaxFrom(a,i) return for an empty remainder? **2.** What are recursive binary search's time and stack costs? **3.** How does a summing loop correspond to induction?

**Answers:** Max should return (int,bool) or another explicit absence contract. Empty means false; do not mix absence with a valid 0 or MinInt. Binary search calls one half and does O(1) other work, giving O(log n) time and stack if ranges are not copied; iteration can use O(1) auxiliary space. The summing loop's invariant covers the processed prefix, whereas the recursive assumption covers the suffix returned by a child. Both build correctness from smaller states.

To see repetition, draw F(5) and mark every F(3),F(2). Repeated names reveal reusable work without needing to run the naive function at a large n.

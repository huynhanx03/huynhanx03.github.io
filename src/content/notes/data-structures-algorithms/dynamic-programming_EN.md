---
title: "Dynamic programming: states, transitions, and evaluation order"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/dynamic-programming"
series: "Advanced DSA"
seriesOrder: 3
tags: ["dynamic-programming", "memoization", "tabulation", "invariant"]
description: "Design DP from a recurrence, establish that states retain enough information, and reduce memory."
draft: false
updated: 2026-10-15
---

To count ways of climbing 5 stairs using steps of length 1 or 2, we could enumerate every step sequence. But whenever branches reach stair 3, they face the same remaining two-stair problem. Dynamic programming saves and reuses answers to repeated subproblems.

Designing DP starts by stating the question a state answers. Table dimensions come later. An incomplete state incorrectly merges histories with different possible continuations, however quickly the table is computed.

## Count by the final step

Let `dp[i]` count ways to stand exactly on stair `i`, starting at stair 0. Every route to `i` ends with a step of length 1 from `i-1` or length 2 from `i-2`. These groups are disjoint because their final steps differ; removing that step gives a correspondence with routes to the preceding stair. Thus `dp[i]=dp[i-1]+dp[i-2]` for `i>=2`.

The base `dp[0]=1` counts one way of taking no steps. There are not zero ways: this empty route produces `[1]` and `[2]` when a step is appended. For `n>=1`, `dp[1]=1`. The initial table is:

| Stair i | 0 | 1 | 2 | 3 | 4 | 5 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Ways | 1 | 1 | 2 | 3 | 5 | 8 |

For example, the 5 routes to stair 4 followed by 1, and the 3 routes to stair 3 followed by 2, produce all 8 routes to stair 5. Each route has exactly one final step, preventing double counting.

```note-visualization
{"id":"stairs-bottom-up","preset":"normal"}
```

Each cell takes a constant number of operations, and there are `n+1` cells: `O(n)` time and `O(n)` memory. If only the final answer is needed, retain two consecutive numbers instead of the whole table, reducing memory to `O(1)`. These bounds assume constant-cost machine-integer addition. Counts grow quickly: choose a sufficiently wide type, arbitrary-precision integers, or a modulus as required. Arbitrary-precision addition costs depend on the number of digits.

## The same position need not mean the same state

Suppose two consecutive steps of length 2 are forbidden. Two routes at stair 4, one ending in 1 and the other in 2, have different next choices. Keeping only `i` discards necessary information.

Use `dp[i][last]`, where `last` records whether the final step was 2. A step of length 1 accepts both types at `i-1`; a step of length 2 accepts only the type not ending in 2 at `i-2`. Treat stair 0 as having no preceding step of length 2. The extra dimension retains history that affects the future, without storing the entire route.

For min/max problems, histories sharing a state likewise need identical continuation choices; then only the best history for the objective need be kept. Counting problems must add the numbers of histories rather than discard all but one representative.

## Choose when to evaluate a state

Top-down starts with `ways(n)`, recurses through the formula, and caches results. Without caching, calls such as `ways(n-2)` recur many times. Memoization reuses their answers, often computing only reached states, but still uses the call stack. Distinguish “not computed” from a valid result of 0; a separate `seen` array makes this explicit.

```note-visualization
{"id":"stairs-memo","preset":"normal"}
```

Bottom-up chooses an order in which dependencies are available first. Increasing stair indices work because `i-1,i-2<i`. For more complex states, draw edges from a dependency to the state using it: if the graph is a DAG, a topological order gives a valid evaluation order. Adding a memo table to cyclic recursion does not resolve the cycle; execution may revisit a state whose answer is still being computed.

## From a recurrence to proof and reconstruction

Prove correctness in evaluation order: establish the bases, assume preceding states are correct, classify all choices for the current state, then use the appropriate sum, minimum, or maximum. Counting requires no duplicates; optimization requires every best solution to be covered by a transition and every transition to produce a valid solution.

An optimal value alone may not suffice to output a route or decisions. Store `parent`/choices per state, or reconstruct from the complete table. Rolling arrays may erase information needed for reconstruction. Even when only the value matters, in-place updates must distinguish cells from the old and new rounds; [Three DP patterns](/en/notes/data-structures-algorithms/dp-classics/) shows how iteration direction changes knapsack.

## Rebuild the state for a variation

**1.** What recurrence allows steps of length 1, 2, or 3? **2.** What if landing on stair 3 is forbidden? **3.** Why is `dp[i]` insufficient when consecutive steps of length 2 are forbidden?

**Explanations:** Sum `dp[i-d]` for `d∈{1,2,3}` with `i-d>=0`, retaining `dp[0]=1`. For a forbidden landing, set `dp[3]=0` and compute later states; a two-stair step may jump over it if only landing is prohibited, whereas a prohibition on crossing it requires different transitions. The consecutive-step rule needs the previous step type, so histories at the same stair cannot yet be merged into one state.

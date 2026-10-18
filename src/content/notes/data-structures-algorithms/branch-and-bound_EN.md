---
title: "Branch and bound: optimistic bounds eliminate subproblems"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/branch-and-bound"
series: "Advanced DSA"
seriesOrder: 5
tags: ["branch-and-bound", "optimization", "knapsack", "pruning"]
description: "Distinguish feasible-branch pruning from optimization pruning, and derive a safe knapsack upper bound."
draft: false
updated: 2026-10-15
---

We have found a feasible knapsack solution worth 12. Even an optimistic bound for the branch that excludes the first item is only 11. We can stop exploring that branch despite its containing feasible packings. This extends backtracking into branch and bound.

Backtracking rejects branches without feasible solutions. Branch and bound also rejects those unable to improve the best known feasible solution, the **incumbent**. Maximization needs an upper bound for **every** completion of the current state. It may overestimate and miss pruning opportunities, but must never underestimate the branch optimum.

## Relax constraints to obtain an upper bound

In 0/1 knapsack, each weighted/value item is selected at most once and total weight stays within W. Assume positive weights and nonnegative values. Sort by decreasing value/weight ratio. A search node keeps the next item index, chosen value, and remaining capacity.

For a bound, temporarily allow fractions of undecided items. Take highest ratios first, filling complete items while possible, then a fraction of the next. This fractional optimum allocates capacity to highest value per unit weight. Every integral completion is fractionally feasible, so optimizing over the larger set cannot produce a smaller optimum. Add the already-chosen value to obtain the required upper bound.

Zero-weight items need handling before ratio division: a positive-value 0/1 item can be taken once without consuming capacity. Division by zero must not choose order. Negative values or added constraints also require reviewing the bound and feasibility rules.

## Follow the numbers to a pruning decision

Let W=5 and items (weight,value) be (3,8),(3,7),(2,4), with ratios 8/3, 7/3, and 2. Taking items one and three gives a feasible value of 12. At the root, the fractional bound takes item one and 2/3 of item two, for `8 + 14/3 = 12⅔`, so the root cannot yet be pruned.

Once the incumbent is 12, consider the branch that skips item one. Items two and three exactly fill capacity and yield 11; the branch bound is 11. Since `11≤12`, no solution in this branch can improve the incumbent, so it can be pruned. This order shows a valid search decision: first find a value-12 solution, then use the bound to eliminate the remaining branch.

Using ≤ targets one optimal value or solution. Listing **all** optimal solutions cannot discard equality, because a tied branch may contain another optimum.

```note-visualization
{"id":"knapsack-branch-bound","preset":"normal"}
```

## Separate finding solutions from proving bounds

```text
search(index, remaining, value):
    incumbent = max(incumbent, value)  // the current state is feasible
    if index == n: return
    if fractionalUpperBound(index, remaining, value) <= incumbent: return
    if item[index] fits: try the branch that takes it
    try the branch that skips it
```

This is pseudocode. The fractional bound includes value already chosen, considers only undecided items, and respects remaining capacity. Taking an item reduces capacity and increases value before advancing; skipping only advances. Every 0/1 solution has one decision sequence, so correct pruning preserves all necessary candidates.

Updating the incumbent at an intermediate state is valid because taking nothing further completes a feasible solution. A current six is feasible by skipping everything else. Exactly-k selection or lower-bound constraints can invalidate this argument: a prefix may not yet be feasible. Update only from solutions satisfying every constraint.

The incumbent must come from a feasible solution, not an unattained optimistic guess. An overly high incumbent can cut every branch just as an underestimated upper bound can. A heuristic helps by finding a good initial **valid** solution.

## Search order and the work it requires

DFS retains the current O(n)-depth path plus bounding data, then explores siblings. Promising branches first can raise the incumbent early. Best-first retains many nodes in a bound-prioritized queue, often exploring greatest improvement potential while potentially consuming substantial memory.

Bound tightness trades against evaluation cost: a stronger bound may visit fewer nodes but spend more at each. There are 2^n include/exclude sequences, and worst-case visited states remain exponential. General knapsack does not receive a polynomial guarantee from branch and bound.

Floating point introduces correctness risk: a true bound 12.0001 rounded to twelve can cause pruning against incumbent twelve despite an improvement. Prefer exact arithmetic or provably optimistic rounding when possible. An arbitrary epsilon is not a proof for every scale.

## Evaluate a proposed cut

**1.** What is the root bound? **2.** A branch contains twelve but its bound says ten while incumbent is eleven: what happens? **3.** What does a valid but huge bound change?

**Explanation:** The root bound is `8+14/3=12⅔`: take item one fully, then 2/3 of item two in the relaxed problem. The invalid bound ten discards the optimal branch and can incorrectly report eleven, a correctness failure rather than merely poorer search. A high valid bound remains safe but prunes little, potentially exploring almost everything. Establish optimism before measuring saved work.

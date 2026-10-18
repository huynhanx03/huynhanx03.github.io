---
title: "Greedy algorithms: local choices with a global optimality proof"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/greedy"
series: "Advanced DSA"
seriesOrder: 2
tags: ["greedy", "exchange-argument", "interval-scheduling"]
description: "Distinguish a greedy intuition from a proof using interval scheduling and counterexamples."
draft: false
updated: 2026-10-15
---

One room can host one job at a time. Jobs have fixed start and end times; we want to accept as many as possible. Choosing the earliest start sounds plausible, but one all-day job can block many short jobs. A greedy algorithm needs a precise criterion and a proof that committing to it preserves an optimal solution.

Greedy algorithms build a solution without revisiting choices. The proof need not show that every optimum includes a choice, only that some optimum agrees with it, leaving a remaining subproblem to solve.

## Which opportunities does an early finish preserve?

Jobs are intervals `[start,end)`, assuming `start<end` here. A later job is compatible when it starts `>=` the preceding finish. Earlier finishing leaves more time available. Sort by increasing `end`, then accept the next job that does not conflict with the last accepted one.

For `[0,6),[1,3),[3,5),[5,7)`, finish order puts `[1,3)` first. Accept `[3,5)` because it starts at 3; reject `[0,6)` because its start precedes 5; accept `[5,7)`. The result contains 3 jobs. The rule chooses the earliest release time at each step, rather than the shortest individual duration.

```go
type Interval struct { Start, End int }

func SelectMax(intervals []Interval) []Interval {
    sort.Slice(intervals, func(i, j int) bool {
        return intervals[i].End < intervals[j].End
    })
    chosen := make([]Interval, 0)
    for _, in := range intervals {
        if len(chosen) == 0 || in.Start >= chosen[len(chosen)-1].End {
            chosen = append(chosen, in)
        }
    }
    return chosen
}
```

This Go declaration needs `import "sort"` and sorts the input slice in place; copy it first to preserve original order. Checking `len(chosen)` avoids an artificial `lastEnd` sentinel that could mishandle negative times. Empty input returns an empty schedule.

The `Start<End` contract requires positive durations. Allowing `Start==End` needs explicit compatibility and tie-handling conventions; sorting only by `End` does not resolve every empty-interval convention. Positive-duration jobs sharing a finish may be considered in either order: they leave the same boundary for subsequent jobs.

## Prove the choice with one exchange

Let `g` finish earliest and `o` be the first job in an optimum schedule. Since `end(g)<=end(o)`, every job after `o` also starts no earlier than `end(g)`. Replacing `o` with `g` loses no subsequent job and preserves the count. Hence an optimum starts with `g`.

After choosing `g`, discard intervals starting before its finish. The remaining task has the same form on the remaining time. Repeating the exchange argument and inducting on remaining jobs proves the whole schedule optimal. This connects the local choice to the global objective beyond the intuition that finishing early is good.

Sorting takes `O(n log n)` and one scan takes `O(n)`. The result stores at most `n` intervals; sorting's auxiliary storage depends on implementation. Accepted decisions are never retried.

```note-visualization
{"id":"interval-scheduling","preset":"normal"}
```

## Break another rule with a small input

Earliest-start selection takes `[0,10)` and blocks `[1,2),[2,3),...,[9,10)`. Shortest-duration selection can fail too: `[0,3)` and `[3,6)` are compatible, but shorter `[2,4)` intersects both. Taking it first yields only one job instead of two.

Likewise, coin denominations `[1,3,4]` and target 6 give largest-first `4+1+1`, while `3+3` uses fewer coins. The same denominations with target 5 give the optimal greedy result `4+1`. Success on a few targets does not prove correctness for a denomination system.

```note-visualization
{"id":"greedy-coin-counterexample","preset":"normal"}
```

## Identify the assumption supporting the exchange

For fractional knapsack, a unit of weight from a high-ratio item can replace one from a lower-ratio item without decreasing value. Divisibility makes the exchange possible. In 0/1 knapsack arbitrary fractions cannot be exchanged, so the ratio rule loses its guarantee. [Branch and bound](/en/notes/data-structures-algorithms/branch-and-bound/) uses the fractional solution as a bound rather than an integer solution.

Greedy also appears in MST through cuts and in exchange structures such as matroids. These names do not prove a new heuristic: identify an exchange preserving feasibility and quality. Without one, look for small counterexamples or consider fuller state descriptions such as DP.

**Try it:** Why do positive-duration jobs with the same finish need no tie-break for optimal count? Where does shortest-first fail on `[0,3),[2,4),[3,6)`? How many coins make 6 with `[1,3,4]`?

**Explanations:** Either equal-finish choice leaves the same possible continuations, preserving the exchange proof. `[2,4)` is shortest but blocks both mutually compatible alternatives. Target 6 needs two coins `3+3`; greedy uses three and is not optimal.

---
title: "Floyd–Warshall: all-pairs paths through permitted intermediate vertices"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/floyd-warshall"
series: "Advanced DSA"
seriesOrder: 14
tags: ["floyd-warshall", "all-pairs-shortest-path", "dynamic-programming"]
description: "A three-loop DP with explicit invariants, infinity handling, and negative-cycle boundaries."
draft: false
updated: 2026-10-15
---

A single-source algorithm answers only one row of an all-pairs distance table. Floyd–Warshall builds the entire table through a DP over permitted intermediate vertices. It uses `O(V³)` time and `O(V²)` memory, fitting small or medium graphs; on very large sparse graphs, repeated single-source algorithms may be preferable depending on weights.

## Each round admits another intermediate vertex

Let `D_k[i][j]` be the distance from `i` to `j` with internal vertices restricted to `{0,...,k-1}`. Endpoints `i,j` are not restricted to that set. When vertex `k` is admitted, an optimal route either avoids it or splits there into `i→k` and `k→j`. Thus:

`D_(k+1)[i][j] = min(D_k[i][j], D_k[i][k]+D_k[k][j])`.

For pairs with finite distance unaffected by negative cycles, an optimal path can be chosen without repeated vertices, making this split sufficient. The invariant requires finishing every `(i,j)` pair for one `k` before advancing; this is why the `k` loop is outermost.

Initialize empty paths with `dist[i][i]=0`, other pairs to infinity, then minimize with each edge weight. Keep the lightest parallel edge. In particular, a negative self-loop must make the diagonal negative rather than being overwritten by a later assignment of 0.

```go
for k := 0; k < n; k++ {
    for i := 0; i < n; i++ {
        for j := 0; j < n; j++ {
            if dist[i][k] == inf || dist[k][j] == inf { continue }
            via := dist[i][k] + dist[k][j]
            if via < dist[i][j] { dist[i][j] = via }
        }
    }
}
```

This Go core assumes an `n×n` matrix `dist` and sentinel `inf` of the same type. For finite pairs unaffected by negative cycles, in-place updates preserve the DP: a detour through `k` and back cannot strictly improve a relevant path when its cycles are nonnegative. With negative cycles, decreasing numbers are not finite optimum distances; classify affected pairs as described below.

`inf` must exceed every finite answer requiring representation. Checking it before addition prevents “infinity plus a negative number” from creating a fictitious path; addition of two finite distances must still avoid overflow. Choose a wide type and input-based bounds, not an arbitrary large constant.

## Follow one matrix cell changing

Take `0→1(3),1→2(-1),0→2(5)`. Initially:

| From / to | 0 | 1 | 2 |
| --- | ---: | ---: | ---: |
| 0 | 0 | 3 | 5 |
| 1 | ∞ | 0 | -1 |
| 2 | ∞ | ∞ | 0 |

Round `k=0` finds nothing useful because neither 1 nor 2 has an edge to 0. At `k=1`, cell `(0,2)` tries `3+(-1)=2`, improving 5 to 2. Pairs lacking two finite subpaths are skipped. At `k=2`, nothing improves because 2 has no route out to another vertex.

The example illustrates joining paths; it does not justify arbitrary loop reordering. Placing `i` outside and `k` inside may require information discovered only after that row has been processed, and one pass is no longer guaranteed correct. Changing DP evaluation order requires a new dependency argument rather than a small matrix that happens to work.

```note-visualization
{"id":"floyd-warshall","preset":"normal"}
```

Each triple `(k,i,j)` takes constant arithmetic work, giving cubic time even for sparse graphs. To reconstruct paths, initialize `next[i][j]=j` for valid direct paths; on improvement through `k`, set `next[i][j]=next[i][k]`. Follow next hops from `i` to `j` only for reachable pairs unaffected by negative cycles.

## Which pairs does a negative cycle affect?

A final `dist[k][k]<0` indicates a negative closed walk involving `k`. If `i` reaches `k` and `k` reaches `j`, one can travel `i→k`, repeat the cycle, then continue to `j`, reducing cost indefinitely. That pair has no finite shortest distance. This is pair-specific, not a reason to invalidate the entire matrix.

For example, `0→1(1),1→2(-2),2→1(1)` has a negative cycle between 1 and 2; add `2→3(1)`. Routes from 0 to 1,2,3 are affected. An isolated vertex 4 still has self-distance 0 and cannot reach the others. To return pair distances, mark every pair that can pass through some negative-diagonal `k`; to detect any negative cycle, checking the diagonal suffices.

**Check yourself:** Which cell changes at `k=1`? Why is `inf+(-1)` dangerous? What is `4→4` in the isolated-vertex example?

**Explanations:** Only `(0,2)` changes, from 5 to 2. The sentinel may become smaller than itself and be mistaken for a reachable path; machine arithmetic can also overflow. `4→4` remains 0 because no route reaches the negative cycle and returns. The output contract should distinguish unreachable, finite, and unbounded-below cases.

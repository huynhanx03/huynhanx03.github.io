---
title: "Maximum flow: residual networks and minimum cuts"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/max-flow"
series: "Advanced DSA"
seriesOrder: 16
tags: ["max-flow", "residual-network", "min-cut", "edmonds-karp"]
description: "Understand reverse edges, augmenting paths, and optimality certificates from cuts."
draft: false
updated: 2026-10-15
---

A network has several routes from source `s` to sink `t`, each with limited capacity. Finding one route is insufficient: an early choice can block routes needed later. Maximum flow retains both the ability to send more and to retract earlier decisions.

The network is directed with nonnegative capacities. Each original edge carries `0<=f<=c`. At vertices other than `s,t`, total inflow equals outflow: no goods appear or disappear. Flow value is net outflow from the source, outgoing minus incoming. The objective maximizes this value without assigning route costs.

## A reverse edge permits undoing an earlier choice

An original `u→v` edge of capacity 5 carrying 3 gives residual forward capacity 2 and reverse `v→u` capacity 3. Moving forward increases original flow; moving backward reduces it. These are not two independent original transport edges.

Consider capacity-1 edges `s→a,s→b,a→b,a→t,b→t`. First choose `s→a→b→t`, reaching value 1 and saturating `s→a` and `b→t`. Searching only unused original directions seems to find no route. Residual path `s→b→a→t` remains: `b→a` cancels flow on `a→b`. Afterwards actual flow follows `s→a→t` and `s→b→t`, reaching 2. Reverse edges revise routing without rebuilding everything.

```note-visualization
{"id":"max-flow-augment","preset":"normal"}
```

An augmenting path uses positive residual capacity. Let `delta` be its minimum capacity, adjust original flow in the appropriate directions, and update both residual records. The bottleneck prevents exceeding capacity. Intermediate vertices receive and send the same additional `delta`, preserving conservation; total value increases by `delta`.

## Path selection determines the time bound

Ford–Fulkerson repeatedly finds any augmenting path. Integer capacities preserve integer residuals and `delta`, so each round increases flow by at least 1 and there are at most `F*` rounds, where `F*` is maximum flow. A path search takes `O(V+E)`, producing a value-dependent bound, not a polynomial guarantee in capacity bit length.

For arbitrary real capacities, particularly irrational ones, unfavorable path choices can fail to terminate. Removing integrality also removes the “at least one unit” argument.

Edmonds–Karp uses BFS for a residual path with the fewest edges. Residual BFS distances do not decrease over augmentations. An edge can repeatedly become a saturated bottleneck only after relevant path lengths increase; this bounds augmentations by `O(VE)`. Each BFS costs `O(V+E)`, giving the standard `O(VE²)` bound for conventional network representations, independent of numeric flow value.

## A cut turns the result into an optimality certificate

A cut `(S,T)` has `s∈S,t∈T`. Its capacity sums **original** edge capacities from `S` to `T`. Summing conservation equations inside `S` cancels internal edges: flow value equals forward cut flow minus reverse cut flow, and cannot exceed cut capacity. Every cut therefore upper-bounds every feasible flow.

When no augmenting path remains, let `S` contain vertices reachable from `s` by positive residual edges. Every original `S→T` edge is saturated, or its destination would be reachable. Every original `T→S` edge carries zero flow, or its reverse residual edge would reach `T` from `S`. Flow value thus equals this cut's capacity. Reaching an upper bound proves both maximum flow and minimum cut.

```note-visualization
{"id":"min-cut","preset":"normal"}
```

Two independent routes with bottlenecks 2 and 3 carry 5. If their source-outgoing edges have capacities 2 and 3, the cut containing only `s` has capacity 5. We have both a feasible value 5 and a certificate ruling out anything larger, rather than merely trusting termination.

## Preserve residual pairs in code

Every residual record should store its counterpart's index `rev`. Parallel edges and opposite-direction original edges create records with identical endpoints but different roles. Updating by endpoint pair alone can undo the wrong edge. A matrix is possible with consistent aggregation/representation conventions, but one cell must not be assumed to retain all edge identities for tracing individual edges.

Use types wide enough for capacities and total flow; require valid, usually distinct source/sink vertices. Verify sink reachability before tracing parents, or the code will read a nonexistent augmenting path.

**Check yourself:** What residual capacities remain for capacity 5 carrying 3? Why must final-cut `T→S` original edges carry zero? How does omitting reverse edges break the five-edge example?

**Explanations:** Forward 2 and reverse 3. Positive reverse-direction flow would create a residual `S→T` edge, contradicting reachability. Without reverse edges the example gets stuck at 1 despite a final two-route flow; the missing state transition is a modeling error, not merely an unlucky route choice.

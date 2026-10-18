---
title: "Minimum-cost flow: sending the required amount at minimum total cost"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/min-cost-flow"
series: "Advanced DSA"
seriesOrder: 27
tags: ["graph", "min-cost-flow", "residual-network", "potentials"]
description: "Combine capacity and cost using reverse edges and cheapest residual augmenting paths."
draft: false
updated: 2026-10-15
---

Maximum flow asks how much can be sent. If every route also charges per unit, minimum-cost flow asks for **exactly F** at the lowest total cost. Cheap but insufficient delivery does not satisfy the problem; insufficient network capacity must produce infeasibility or a separate delivered-amount/incomplete status.

This article connects [residual networks](/en/notes/data-structures-algorithms/max-flow/) with shortest paths. To explain successive shortest augmenting paths clearly, first assume nonnegative integer capacities and `F`, finite costs, zero initial flow, and **no negative cycle** in the initial residual network. Nonnegative original costs are a simple sufficient condition for the last assumption.

## Undoing a unit must refund its original cost

Original edge `u→v` with capacity 3, cost 5, and flow 2 has residual forward capacity 1 cost 5 and reverse capacity 2 cost -5. Removing one old flow unit reduces total cost by 5, explaining the negative reverse cost. Even nonnegative original costs do not keep residual costs nonnegative after augmentation.

Each round finds the cheapest residual path, sends `delta=min(bottleneck,F-flow)`, updates residual pairs, and adds `delta*pathCost` to total cost. Reverse edges participate normally; omitting them prevents revising earlier routing.

## One augmentation can change two existing routes

All capacities are 1, with parenthesized costs: `s→a(0),s→b(0),a→b(0),a→t(1),b→t(0)`. The first unit may use `s→a→b→t` at cost 0. The second uses `s→b→a→t` at cost 1, where `b→a` reverses `a→b` at cost 0.

After both rounds, flow on `a→b` returns to 0. Actual routes are `s→a→t` costing 1 and `s→b→t` costing 0, totaling 1. Considering only residual capacity in original directions after the first round would falsely report no second route. If the canceled edge had positive cost, its negative reverse cost would also ensure correct accounting.

```note-visualization
{"id":"min-cost-flow","preset":"normal"}
```

## Potentials relabel edges while preserving path comparisons

Dijkstra needs nonnegative weights, so cannot run directly on potentially negative residual costs. Assign potentials `h[v]` and reduced cost `w'(u,v)=w(u,v)+h[u]-h[v]`. On an `s→t` path, internal potentials cancel: `cost'=cost+h[s]-h[t]`. Every path between those endpoints shifts equally, preserving the cheapest choice.

If reduced costs are nonnegative in the source-reachable residual region, run Dijkstra for `dist'`. Then add `dist'[v]` to `h[v]` for reachable vertices. The shortest-path inequality `dist'[v]<=dist'[u]+w'(u,v)` makes new reduced costs nonnegative on relevant edges. Newly enabled reverse edges along a shortest path have reduced cost 0, allowing Dijkstra again.

With nonnegative original costs, initialize `h=0`. With negative edges but no negative cycle, Bellman–Ford distances can initialize potentials; for globally feasible potentials, temporarily add a super-source with zero-cost edges to all vertices. Before updating potentials, actual path cost is `dist'[t]-h[s]+h[t]`. Use potentials from the same moment rather than mixing pre/post-update values.

## Why does cheapest augmentation preserve optimality?

For a fixed flow value, a positive-capacity negative-cost residual cycle can reduce cost without changing value. Conversely, the difference from a cheaper equal-value flow decomposes into residual cycles, at least one reducing cost. Absence of negative cycles therefore characterizes minimum cost for the current flow amount.

Under the stated starting assumption, zero flow is optimal for value zero. Cheapest augmentation with potential updates preserves absence of improving cycles, making each resulting amount minimum-cost. Reverse edges let this criterion include revisions of earlier decisions.

An initially negative cycle can make zero flow suboptimal even at value zero: a circulation around it lowers cost without sending more from `s` to `t`. A finite-capacity negative cycle does not automatically make the answer unbounded, but requires appropriate circulation/cycle handling. Merely running Bellman–Ford does not repair that starting assumption; this article does not supply a general solver for it.

## Implementation data and bounds

Store `(to,rev,cap,cost)`, creating forward `(c,w)` and reverse `(0,-w)` records together. After Dijkstra, store both `parentVertex` and `parentEdgeIndex`: trace backwards once for the bottleneck and again to update exact pairs. First check that the sink is reachable; otherwise the requested `F` cannot be completed by this procedure.

Integer capacities increase delivered flow by at least 1 per round, so there are at most `F` rounds, often fewer because a whole bottleneck can be sent. With `O(E log V)` Dijkstra, a simple bound is `O(FE log V)`, plus `O(VE)` Bellman–Ford initialization if used. Lazy heaps on multigraphs need a record-count-based bound rather than assuming `log E=O(log V)`. `delta*pathCost` and total cost can overflow `int`; select suitable types and limits.

**Try it:** Why is reverse cost -5? Does maximum matching solve cheapest assignment? Does Bellman–Ford always provide potentials with an initial negative cycle?

**Explanations:** Undoing one unit refunds 5. Maximum matching optimizes pair count, whereas assignment adds a cost objective. A negative cycle prevents suitable finite distances and globally nonnegative reduced costs; fix the assumptions/algorithm before treating it as an ordinary negative-edge Dijkstra problem.

*Further reading: [VNOI — Min-cost flow](https://wiki.vnoi.info/algo/graph-theory/min-cost-flow).*

[Princeton COS 226 — Mincost flow](https://www.cs.princeton.edu/courses/archive/spr03/cs226/lectures/mincost.4up.pdf) — residual networks and reduced costs.

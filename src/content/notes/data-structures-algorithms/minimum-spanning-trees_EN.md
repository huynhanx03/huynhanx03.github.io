---
title: "Minimum spanning trees: Kruskal, Prim, and the cut property"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/minimum-spanning-trees"
series: "Advanced DSA"
seriesOrder: 15
tags: ["mst", "kruskal", "prim", "cut-property"]
description: "Prove safe edge choices and distinguish spanning trees from shortest paths."
draft: false
updated: 2026-10-15
---

Connecting locations with the cheapest cable network does not require the shortest route between every pair. The objective minimizes total network cost. In a connected weighted undirected graph, a spanning tree has `V-1` edges connecting all vertices without cycles; an MST minimizes their total weight.

Negative weights are valid: a tree contains finitely many edges and no repeated cycles. A disconnected graph has no spanning tree covering all vertices; instead find a minimum spanning forest, one MST per component.

## A cut provides a provably safe choice

A cut partitions vertices into nonempty `S` and `V\S`. A lightest crossing edge can belong to an MST. Take an MST excluding that edge `e`; adding it forms a cycle. Its old endpoint-to-endpoint path contains another crossing edge `f`. Since `w(e)<=w(f)`, replacing `f` with `e` yields a spanning tree no heavier.

When edges have already been selected, maintain the invariant that some MST contains all of them. Use that particular MST for the exchange above and choose a cut that crosses none of the selected edges. Then removed edge `f` is not committed, so the exchange preserves previous choices. The resulting MST contains both the old set and the new edge, preserving the invariant. This is the safety property Kruskal and Prim need, stronger than saying a light edge belongs to some unrelated MST.

```note-visualization
{"id":"mst-cut","preset":"normal"}
```

## Kruskal merges currently disconnected components

Sort edges by increasing weight. Accept `(u,v)` and Union if its endpoints belong to different DSU sets; otherwise reject the cycle-forming edge. DSU exactly represents components of the accepted forest.

On triangle `0-1(1),1-2(2),0-2(3)`, accept the first two for total 3. Reject the third because 0 and 2 are connected. For safety, consider a current DSU component as a cut side: the examined edge is a lightest available way to join it outward. No accepted edge crosses that cut, so exchange preserves the existing forest.

Sorting `E` edges costs `O(E log E)`. Union by size/rank with path compression contributes near-linear total DSU work; graph and DSU storage use `O(V+E)`. Finishing below `V-1` accepted edges on a disconnected graph produces a minimum spanning forest, not a tree connecting everything.

```note-visualization
{"id":"kruskal","preset":"normal"}
```

## Prim grows one tree across its boundary

Start at one vertex with set `S` of included vertices. Repeatedly choose the lightest edge from `S` outward. Cut `(S,V\S)` respects the current tree, making the edge safe; it introduces one outside vertex and no cycle.

Lazy Prim may store all boundary edges in a min-heap. A former boundary edge becomes internal if its destination has since entered the tree; discard such records. For simple graphs, the bound is commonly `O(E log V)`; a general edge heap holds `O(E)` records, so multigraphs directly give `O(E log(E+1))`. Eager Prim retains one best key per vertex, giving `O(E log V)` with a suitable heap. With an adjacency matrix, linearly selecting the cheapest vertex each round takes `O(V²)`, potentially fitting dense graphs better than many heap records.

```note-visualization
{"id":"prim","preset":"normal"}
```

For a forest, restart Prim at an unvisited vertex. An empty heap before all vertices are included means the current component is exhausted, not that every vertex was connected.

## The cheapest total does not preserve shortest routes

A triangle has `A-B=2,B-C=2,A-C=3`. Its MST takes both weight-2 edges, total 4; A-to-C distance in the tree is 4, though the direct edge costs 3. MST minimizes the entire network; shortest paths minimize a route. Different objectives produce different choices.

Equal edge weights may allow several MSTs, all with the same optimal total. Distinct weights suffice for uniqueness, but are not necessary: a graph already forming a tree has one spanning tree even with repeated weights.

**Try it:** Which edges does Kruskal take on triangle weights `1,2,3`? Which stale Prim record is rejected? Do equal weights require multiple MSTs?

**Explanations:** Accept 1 and 2, rejecting 3 as a cycle. Prim discards an edge whose formerly outside endpoint is now in `S`, preventing an internal edge from being accepted. Equal weights alone prove no multiplicity; an already-tree graph is a counterexample. Safety proofs must refer to the current cut and committed edges.

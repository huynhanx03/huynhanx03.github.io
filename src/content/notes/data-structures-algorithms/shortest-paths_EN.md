---
title: "Single-source shortest paths: DAGs, Dijkstra, and Bellman–Ford"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/shortest-paths"
series: "Advanced DSA"
seriesOrder: 13
tags: ["shortest-path", "dijkstra", "bellman-ford", "dag"]
description: "Choose by graph structure and weight signs, and understand relaxation and negative-cycle effects."
draft: false
updated: 2026-10-15
---

A path with fewer edges need not be cheaper: a direct 0→2 edge costs 10, while 0→1→2 costs 2+2=4. The objective changes from BFS's edge count to minimum total weight. Graph structure and weight signs determine the suitable algorithm.

For source s, initialize dist[s]=0 and all others to infinity. A finite current label is the weight of a discovered path, not necessarily the optimum. Relaxing u→v of weight w tries dist[u]+w, updating dist[v] and parent[v]=u if smaller. Add only from reachable u with a type wide enough for the sum; an infinity sentinel must not participate as ordinary data.

## A DAG supplies the dependency order

For a directed acyclic graph, process vertices topologically and relax outgoing edges. At u, every incoming edge comes from an already-processed vertex. Every path into u has such a final predecessor, so no unexamined path can later improve dist[u].

For `0→1(4),0→2(5),1→2(−3)`, order 0,1,2 gives dist[1]=4,dist[2]=5 after 0, then reduces dist[2] to 1 after 1. Negative edges are safe because no cycle can return and break the dependency order. Topological sorting and edge traversal cost O(V+E), using O(V) auxiliary memory beyond the graph.

```note-visualization
{"id":"dag-shortest-path","preset":"normal"}
```

## Dijkstra finalizes labels using nonnegative weights

For graphs with cycles and nonnegative weights, keep (distance,vertex) in a min-heap. Pop the smallest pair; discard it if its distance differs from the current dist[vertex], since it is stale. Otherwise relax outgoing edges and insert new records on improvement.

Suppose the smallest popped label d had a better undiscovered path. On that path, consider the first point beyond finalized vertices. Reaching that boundary cannot cost more than the entire path because remaining weights are nonnegative. Relaxation from the finalized part would have created a label below d, contradicting the heap minimum. This is where nonnegativity enters; zero weights remain valid.

For a negative-edge counterexample, use `s→a(2),s→b(5),b→a(−4)`. Finalizing a at 2 before b is premature because the route through b costs 1. A variant reopening vertices might fix some such inputs, but loses Dijkstra's standard proof and bound; that is no guarantee for negative edges.

```note-visualization
{"id":"dijkstra","preset":"normal"}
```

A binary heap with decrease-key gives O((V+E)log V). Repeated insertion can retain O(E) records, yielding the general bound O(V+E log(E+1)) and O(V+E) memory. For simple graphs E≤V², the common O((V+E)log V) expression remains appropriate. Parallel edges have no such bound in terms of V alone, so retain that qualification for lazy heaps.

## Bellman–Ford permits repeated improvements

Without DAG order or nonnegative weights, relax all edges for V−1 rounds. A simple path uses at most V−1 edges. After round k, at least every best path using at most k edges has been covered. In-place updates may propagate farther within one round depending on edge order; the claim does not mean labels represent exactly k-edge paths.

For `0→1(4),0→2(5),1→2(−3)` in that order, the first round already gives [0,4,1]. Examining 1→2 first would require another round to use vertex 1's new label. Enough rounds remove this dependence on favorable ordering. A round with no change permits early termination.

```note-visualization
{"id":"bellman-ford","preset":"normal"}
```

If another round after V−1 still improves a label from a vertex **reachable from the source**, a negative cycle affects some distances. Repeating it drives total weight down without bound. Vertices reachable onward from that cycle also lack finite shortest distances; others may still have ordinary answers. To mark the entire affected region, propagate along outgoing edges from vertices still improved.

Bellman–Ford uses O(VE) time and O(V) auxiliary space. Leave unreachable vertices at infinity and do not follow their parents. For vertices affected by negative cycles, current parent pointers must not be interpreted as a finite shortest path either.

**Check:** Why are negative edges acceptable in DAGs but not standard Dijkstra? What does the three-edge Bellman–Ford example return? Does a disconnected negative cycle invalidate every source distance?

**Answers:** DAG processing relies on predecessor order; Dijkstra relies on remaining edges not lowering cost. The example returns [0,4,1]. A cycle unreachable from s does not affect this single-source problem; only vertices downstream from a reachable negative cycle lose a finite lower bound.

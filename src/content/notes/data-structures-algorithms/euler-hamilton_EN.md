---
title: "Euler and Hamilton paths: using every edge or visiting every vertex?"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/euler-hamilton"
series: "Advanced DSA"
seriesOrder: 18
tags: ["euler-path", "hamilton-path", "hierholzer", "backtracking"]
description: "Euler conditions and Hierholzer, and why general Hamilton problems require harder search."
draft: false
updated: 2026-10-15
---

A road-inspection vehicle must traverse every road segment; a visitor must visit every location exactly once. Both are graph routes, but they constrain different objects. Euler uses **each edge exactly once**, allowing repeated vertices; Hamilton visits **each vertex exactly once**.

Their cycle variants return to the starting point. Undirected Euler problems have degree/connectivity criteria and a linear algorithm. General Hamilton problems need search or exponential DP; Euler's degree conditions cannot decide them. This article presents Euler conditions only for undirected graphs.

## Pair each arrival with a departure

At an internal vertex of an Euler trail, every arrival needs another edge for departure. Incident edges therefore occur in pairs. In an open trail, only its endpoints can have one unmatched departure or arrival. Consequently, the number of odd-degree vertices must be 0 or 2.

All vertices incident to edges must also belong to one connected component: a route cannot traverse two disconnected edge groups. Ignore isolated vertices when checking this. Together the conditions are sufficient: all degrees even gives an Euler cycle; exactly two odd degrees gives an open trail between them. Any other odd-degree count rules out an Euler trail.

For `0-1-2`, degrees `[1,2,1]` permit the open trail 0→1→2. A triangle has all degrees 2 and the cycle 0→1→2→0. Adding an isolated vertex preserves the ability to traverse all edges; adding a disconnected edge does not. A self-loop contributes 2 to its vertex's degree, representing one departure and arrival at the same vertex.

```note-visualization
{"id":"euler-check","preset":"normal"}
```

## Hierholzer records vertices after exhausting their edges

Start at an odd-degree vertex if there are two; otherwise choose one incident to an edge. Push it onto a stack. While the top vertex has an unused edge, traverse it, mark its ID, and push the other endpoint. When none remain, pop the vertex into the result. Reverse the result at the end.

For a triangle, the stack becomes `0`, `0,1`, `0,1,2`, `0,1,2,0`. The top 0 has no remaining edges, so append it, then pop 2,1,0. Pop order `[0,2,1,0]` reverses to `[0,1,2,0]`. A different adjacency order may produce another valid cycle.

Why record on popping? A partial walk can return to a vertex with unused branches. The stack retains places to splice additional cycles at shared vertices; a vertex is fixed in completion order only after its edges are exhausted. Reversing completion order joins those cycles into a trail using every edge. The degree conditions prevent becoming stuck at an incorrect internal vertex in the portion still needing connection.

```note-visualization
{"id":"hierholzer","preset":"normal"}
```

Maintain an adjacency cursor per vertex to avoid rescanning. Each edge record is skipped or traversed only a bounded number of times, giving `O(V+E)` time and `O(E)` stack/result memory beyond the representation. The two undirected adjacency records share one edge ID; parallel edges need distinct IDs. Marking endpoint pairs would lose a real edge.

Afterwards, check that all `E` IDs were used and that the result has `E+1` vertices when edges exist. This matters if connectivity was not checked beforehand. An edgeless graph needs a separate convention: return an empty trail or a selected vertex according to the problem, rather than searching for a nonexistent incident vertex.

## Hamilton needs the set of visited vertices

Two triangles sharing only one vertex have even degrees and an Euler cycle: traverse one triangle, then the other. They have no Hamilton cycle through all vertices: connecting both sides and returning requires revisiting the shared vertex. The example distinguishes using edges once from using vertices once.

Hamilton backtracking chooses an unvisited neighbor, marks it, recurses, and undoes the mark. Visited checks enforce vertex uniqueness but do not guarantee few branches; a coarse search bound is `O(V!)` with constant-time adjacency checks in a suitable representation.

For small `V`, let `dp[mask][v]` indicate a path using exactly the vertices in `mask` and ending at `v`. To start at 0, initialize only `dp[1<<0][0]=true`. From a true state, extend to an unmasked `u` with edge `v-u`, marking `mask|(1<<u),u`. Each step increases the bit count, permitting evaluation by set size or a suitable mask order.

There are `2^V V` states, each trying `V` destinations with an adjacency matrix: `O(2^V V²)` time and `O(2^V V)` memory. For a cycle, fix the starting vertex and additionally check the final edge from `v` back to 0 at the full mask. Store predecessors or reconstruct from the table to output a route. The bitmask type must accommodate `V`; practical memory often becomes limiting before bit width does.

```note-visualization
{"id":"hamilton-search","preset":"normal"}
```

Sufficient conditions such as Dirac's theorem have their own assumptions and do not provide a simple necessary-and-sufficient test for general Hamilton problems. A weighted problem seeking the shortest cycle through every vertex is TSP: it adds cost optimization to Hamilton existence and needs suitable algorithms/states, not just degree checks.

**Check yourself:** Does 0-1-2 have an Euler cycle? Why give parallel edges separate IDs? When does Hamilton DP starting at 0 accept a cycle?

**Explanations:** The path has an open Euler trail but no cycle because two degrees are odd. Parallel edges represent independent uses; sharing an ID marks an untraversed edge incorrectly. A Hamilton cycle requires a true full-mask state ending at `v` and edge `v→0`; visiting all vertices alone establishes only a Hamilton path.

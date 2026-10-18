---
title: "Bridges, articulation points, and low-link in undirected graphs"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/bridges-articulation"
series: "Advanced DSA"
seriesOrder: 12
tags: ["bridge", "articulation-point", "low-link", "dfs"]
description: "Use DFS discovery times and escape paths to identify edges and vertices whose removal disconnects a graph."
draft: false
updated: 2026-10-15
---

In an undirected network, losing a link may split the network; losing a transit node may do the same. Such links are bridges and nodes articulation points. More precisely, deleting a bridge increases the number of connected components; deleting an articulation vertex and all incident edges also increases it.

Deleting each candidate and rerunning DFS repeats much work. One DFS tracking routes back to ancestors finds both in O(V+E). This article concerns undirected graphs; SCC low-link uses different stack rules and its conditions must not be copied unchanged here.

## Low records escape from a subtree

On entering u, assign discovery time tin[u] and set low[u]=tin[u]. low[u] is the smallest discovery time reachable from u's DFS subtree by downward tree edges followed by at most one back edge to an ancestor. After tree edge u–v, update with low[v]; for back edge u–w, update with tin[w].

Imagine cutting the tree edge from u to child v. Vertices inside v's subtree remain connected by DFS tree edges. The question is whether another edge escapes upward. Low summarizes whether the subtree can reach u itself or an ancestor above it.

The two adjacency records of an undirected tree edge are not independent routes. At v, skip the exact **edge ID** used from its parent. Skipping every neighbor equal to parent incorrectly discards a distinct parallel edge and loses the alternate route.

## Why does a bridge require strict inequality?

Tree edge (u,v) is a bridge when `low[v]>tin[u]`. The subtree then has no back edge to u or above, so deleting this tree edge separates it. Equality means another route reaches u, preventing bridge status.

A non-tree edge belongs to the cycle formed with the tree path between its endpoints, so cannot be a bridge. This explains testing only tree edges after their children finish.

```note-visualization
{"id":"bridges-lowlink","preset":"normal"}
```

## Removing a vertex also removes the return point

A nonroot u is an articulation point when some DFS child v satisfies `low[v]>=tin[u]`. Equality now matters: the subtree can return to u but not its ancestors, and deleting u removes that detour too.

Root has no ancestor side and needs a separate rule: at least two **DFS children**. With one child, every remaining vertex in its component was reached through that branch and stays connected after root removal. Neighbor count is not child count: a triangle root can have two neighbors but only one DFS-tree child when its first branch reaches everything.

```note-visualization
{"id":"articulation-lowlink","preset":"normal"}
```

## Follow a triangle with a hanging branch

Take edges 0–1–2–0 and 2–3. DFS 0→1→2→3 yields tin=[0,1,2,3]. Edge 2–0 lowers low[2] to zero. Three has no other escape and keeps low three. Returning to two, 3>2 identifies bridge 2–3, while 3≥2 identifies articulation vertex two.

Final low is [0,0,0,3]. Edge 1–2 is not a bridge because two reaches zero. One is not articulation because its child subtree returns to zero without it. Root zero has only DFS child one and is not articulation. Ignoring back edges while inspecting tree shape would give incorrect conclusions.

## Details beyond a simple example

For disconnected graphs, start DFS at every unvisited vertex, each with its own root. Neither of two parallel edges is a bridge because deleting one leaves the other. A self-loop does not join separate parts and creates no bridge; degree/adjacency conventions should remain consistent without changing the low argument.

Each adjacency record is processed once, giving O(V+E) time and O(V) auxiliary arrays/stack. Recursive depth can be linear on a long path. Explicit-stack implementations still need return-from-child events to update low **after** the child finishes.

**Check your understanding:** What is low[3]? Why `>` for bridges but `>=` for articulation? Is a degree-five root necessarily articulation?

**Explanation:** low[3]=3 because no back edge escapes. An alternate route to the parent saves an edge deletion, but disappears if that parent vertex is deleted. A degree-five root can have only one DFS child when its branches interconnect; count DFS children rather than degree.

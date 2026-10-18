---
title: "Centroid decomposition: splitting a tree around balanced vertices"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/centroid-decomposition"
series: "Advanced DSA"
seriesOrder: 25
tags: ["tree", "centroid-decomposition", "distance-query"]
description: "Build a centroid tree and answer nearest-marked-vertex distance queries."
draft: false
updated: 2026-10-15
---

A tree repeatedly receives newly red vertices and nearest-red queries. BFS from each queried vertex may traverse the entire tree. Centroid decomposition prepares balanced intermediate vertices so each original vertex considers only O(log n) such points.

We use an unweighted tree with edge-count distance; the argument extends to nonnegative weights with suitable distance formulas. Red vertices are only **added**, not removed. Both assumptions matter to the proof and best structure.

## Split at a vertex leaving no oversized component

A centroid of an m-vertex component leaves components of at most m/2 after removal. Root temporarily, compute subtree sizes, and find an oversized side. It can be a child subtree or the parent side, so checking candidate v must include m−size[v].

If a side exceeds half, move toward it. Two sides cannot both exceed half. After moving, the side left behind is no longer oversized in the backward direction; continue into the large remaining side until none violates the limit. This both finds a centroid and explains existence.

Remove it, recurse into components, and connect their centroids to the current one. The resulting **decomposition tree** has different parents from the original tree. Each child component is at most half as large, giving O(log n) depth.

Path 0–1–2–3–4–5–6 has centroid three, then centroids one and five, then 0,2,4,6. Distances still refer to original-tree paths rather than decomposition edges.

```note-visualization
{"id":"centroid-build","preset":"normal"}
```

## Best tracks only updates passing through that centroid

For centroid c, best[c] is the smallest distance to a red vertex **updated through c**: one having c among its decomposition ancestors. Initialize infinity. Marking v walks its centroid-ancestor chain and applies `best[c]=min(best[c],dist(v,c))`.

It need not be the minimum over all red vertices globally: red vertices outside c's decomposition branch do not update it. This narrower candidate set suffices because every pair has a suitable shared centroid ancestor.

Query u takes the minimum `best[c]+dist(u,c)` over its centroid ancestors, ignoring infinite entries. With no red vertices, return absence rather than adding a sentinel as though it were a real distance.

## A shared intermediate point lies on the right path

Let v be the optimal red vertex. At the first decomposition step separating u,v into different components, removed centroid c lies on their unique original path; if either endpoint is itself a centroid, use it. It is an ancestor of both, so v updated best[c]. Since c lies on their path, `dist(u,c)+dist(c,v)=dist(u,v)`, producing a candidate no greater than the true answer.

Conversely, every finite best[c] comes from a real red vertex r. With nonnegative weights, detouring through c cannot be shorter than the shortest u–r path. No candidate can undercut the actual nearest-red distance. The two bounds meet and prove the formula.

```note-visualization
{"id":"nearest-red","preset":"normal"}
```

On the seven-vertex path, marking zero updates centroids 0,1,3 by distances 0,1,3. Querying six examines 6,5,3; through three gives 3+3=6. Marking four sets best[5]=1; querying six through five gives 1+1=2. Not every centroid offers a shortest path, but one suitable centroid exists.

## Cost depends on ancestors and distance retrieval

Computing every dist(u,c) through O(log n) LCA while visiting O(log n) centroid ancestors gives O(log²n) per update/query. Precomputing each vertex's distances to centroid ancestors uses O(n log n) data and reduces operations to O(log n). Compute distances during component construction rather than treating decomposition edges as original distances.

Sizes and centroid selection are linear in component size. At a decomposition level, disjoint components total at most n vertices; O(log n) levels give O(n log n) construction. Mark removed centroids to restrict traversals while retaining original adjacency needed for distances; destructively deleting actual edges can lose query information.

## Deletion needs more than one minimum

If best[c]=2 comes from its only candidate at distance two, removing that color leaves no information about the runner-up. Min has no inverse from its result alone. Deletions need a multiset, deletion/stale-entry-managed heap, counted candidates, or another design. Resetting infinity could erase contributions of other red vertices.

**Try it:** Where is the first centroid on the seven-node path? Must best[c] see every red vertex? Why does deletion require additional data?

**Explanation:** Three leaves two size-three components. Best receives only updates whose decomposition ancestor is c; a shared on-path centroid makes that sufficient. Removing the minimum requires remaining candidates that a single number discarded.

Further reading: [VNOI — Centroid decomposition](https://wiki.vnoi.info/vi/algo/graph-theory/centroid-decomposition).

[USACO Guide — Centroid decomposition](https://usaco.guide/plat/centroid) discusses construction and precomputed centroid-ancestor distances.

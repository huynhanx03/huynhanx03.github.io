---
title: "Heavy-Light Decomposition: querying and updating tree paths"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/heavy-light-decomposition"
series: "Advanced DSA"
seriesOrder: 24
tags: ["tree", "heavy-light-decomposition", "path-query", "segment-tree"]
description: "Split a tree into heavy chains so a path becomes a small number of range queries."
draft: false
updated: 2026-10-15
---

A segment tree handles a contiguous array range, while a tree path may ascend one branch and descend another. Finding each query path with DFS still visits many vertices. Heavy-Light Decomposition (HLD) partitions the tree so every path consists of only a few array segments.

This article assumes a fixed tree with many value queries/updates on paths. Heavy chains are stored in depth order in separate arrays with range structures. We begin with vertex values and sums, then distinguish edge values and directional operations.

## Light edges at least halve the remaining size

Root the tree and compute `size[v]`. At each vertex, choose a child with maximum subtree size as its heavy child, breaking ties consistently; other child edges are light. Consecutive heavy edges form a chain. A vertex without a heavy incoming edge starts a new chain.

If a light child `y` of `x` had `size[y]>size[x]/2`, no other child could be as large, so it would have to be heavy, a contradiction. Descending a light edge therefore at least halves subtree size. A root-to-leaf path crosses `O(log n)` light edges; an arbitrary path consists of two parts through its LCA and changes chains `O(log n)` times. A chain can still contain many vertices, but the number of **queried segments** is small.

```note-visualization
{"id":"hld-decompose","preset":"normal"}
```

## Build indices before querying ranges

The first traversal computes `parent,depth,size,heavy`. The second follows heavy edges first, assigning chain head `head[v]` and position `pos[v]` in its chain array. Each chain has a segment tree. The arrays contain exactly `n` total positions, so range-structure memory is `O(n)`.

A single shared array with consecutive chain numbering is another implementation, but we retain the separate-array model here. Either needs contiguous positions within a chain matching depth order. Numbering does not turn an arbitrary tree path into one range.

While `head[u]!=head[v]`, choose the endpoint whose chain head is deeper. Its head-to-endpoint segment lies wholly on the remaining query path. Query it, then jump to the head's parent, crossing one light edge. Once endpoints share a chain, query their intervening range.

```go
for head[u] != head[v] {
    if depth[head[u]] < depth[head[v]] { u, v = v, u }
    answer += chainRangeSum(head[u], u) // hai nút cùng chuỗi
    u = parent[head[u]]
}
if depth[u] > depth[v] { u, v = v, u }
answer += chainRangeSum(u, v)
```

This is a Go query-combination core, not a standalone function. `head,depth,parent` are precomputed; `chainRangeSum(a,b)` accepts vertices in one chain with `a` no deeper than `b`, including both endpoints. Initialize `answer` to 0 and require both query vertices in the same tree. Choosing the deeper head avoids jumping past the region shared with the other endpoint.

## Follow the path from 5 to 2 through three segments

Suppose the heavy chain is `0–1–3–4`, with light child 2 of 0 and light child 5 of 3. Query `5→2` takes vertex 5 and jumps to 3; takes vertex 2 and jumps to 0; then queries heavy-chain segment 0–1–3. These disjoint segments sum exactly path 5–3–1–0–2.

If every vertex value is 1, the answer is 5. Updating vertex 1 to 10 with a point update makes the next answer 14. Even a chain thousands of vertices long is handled by a segment-tree query instead of visiting each vertex.

```note-visualization
{"id":"hld-path-query","preset":"normal"}
```

There are `O(log n)` segments at `O(log n)` each, giving `O(log² n)` per query. A point update takes `O(log n)`. Path updates use the same decomposition with a lazy segment tree supporting the intended operation, also `O(log² n)`. Tree preprocessing is `O(n)` plus range-structure construction, usually `O(n)` from arrays; extra memory is `O(n)`.

## Changing values or combination changes the contract

For edge weights, store each parent–child edge at the child position. Segments removed from chain heads include the head because it represents the light edge to its parent that the path uses. Only the final same-chain segment excludes the LCA position: its edge to its parent is not on the path. Equal-endpoint queries then have edge sum 0, whereas vertex sums include that vertex's value.

For maximum, replace addition with max and initialize with a suitable identity, such as negative infinity if values can be negative. Zero would be wrong on an all-negative path. Minimum analogously needs positive infinity.

Concatenation and matrix multiplication are not commutative. Swapping `u,v` can reverse reading direction without recording it; one accumulator is insufficient. Retain separate `u→LCA` and `LCA→v` parts, reverse/combine segment results in the right direction, and join them in path order. Range structures may need both forward and reverse results.

For static distances, [LCA](/en/notes/data-structures-algorithms/lca-binary-lifting/) suffices. Whole-subtree queries can use simpler DFS interval numbering. One query on a small tree may be easier to answer directly than by building HLD.

**Try it:** Which child is heavy for sizes 5,2,1? Why are chain changes few? How should an all-negative maximum query be initialized?

**Explanations:** Choose size 5; the others are light. Every downward light step at least halves size, bounding their count logarithmically. Max requires an identity no larger than every valid value, rather than 0 when negatives are allowed. Complexity follows the number of segments and cost per segment, not the name HLD alone.

*Further reading: [VNOI — Heavy Light Decomposition](https://wiki.vnoi.info/algo/data-structures/heavy-light-decomposition).*

[USACO Guide — Heavy-Light Decomposition](https://usaco.guide/plat/hld) — heavy chains and path-query bounds.

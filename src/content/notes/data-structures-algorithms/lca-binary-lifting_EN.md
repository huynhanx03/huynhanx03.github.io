---
title: "LCA and binary lifting: finding the lowest common ancestor"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/lca-binary-lifting"
series: "Advanced DSA"
seriesOrder: 23
tags: ["tree", "lca", "binary-lifting", "ancestor"]
description: "Precompute ancestors 1, 2, and 4 edges away for LCA and tree-distance queries."
draft: false
updated: 2026-10-15
---

Two files in different subdirectories have a nearest shared containing directory. In a rooted tree, LCA captures this idea for vertices `u,v`: the deepest vertex on both root-to-vertex paths. Following parents one at a time works, but a query on an `n`-vertex chain can take `O(n)`.

Binary lifting prepares jumps of 1, 2, 4, 8 edges. Every integer distance is a sum of powers of two, avoiding individual edge steps. This article uses a fixed tree, fixed root, and many queries; structural changes are outside this model.

## Build the table from immediate parents

Run BFS or DFS from `root`, computing `parent[v]` and edge depth `depth[v]`. Use root parent `-1` and depth 0. With undirected adjacency lists, skip the edge back to the parent; if input is not guaranteed to be a tree, validate it or use suitable visited handling.

`up[k][v]` is the ancestor `2^k` edges above `v`, or `-1` if absent. Row 0 contains immediate parents. Travel twice `2^(k-1)` edges to travel `2^k`:

`up[k][v] = up[k-1][up[k-1][v]]`.

If the intermediate vertex is `-1`, the answer is also `-1`; never index with it. Choose enough rows `K` that `2^K>n`. Compute rows in increasing `k`, each with `n` vertices: `O(n log n)` time and memory.

```note-visualization
{"id":"ancestor-table","preset":"normal"}
```

For `0→{1,2}`, `1→{3,4}`, `up[0]=[-1,0,0,1,1]`, `up[1]=[-1,-1,-1,0,0]`, and `up[2]` is entirely -1. Two parent steps from 3 are 3→1→0, hence `up[1][3]=0`; ancestor choice is unrelated to numeric vertex IDs.

## Decompose steps into bits

```go
func Jump(v, steps int, up [][]int) int {
    bit := 0
    for steps > 0 && v != -1 {
        if steps&1 == 1 { v = up[bit][v] }
        steps >>= 1
        bit++
    }
    return v
}
```

This Go function accepts a prebuilt table; require `steps>=0`, a valid starting vertex, and enough rows for every used bit. Processed bits represent edges already traveled and remaining bits the outstanding distance. Jumping 5 edges uses bits 0 and 2: a 1-edge jump followed by a 4-edge jump from the updated vertex. If no ancestor exists, it returns -1 before indexing the table with that value.

LCA uses only the depth difference within a tree. A general-purpose Jump API still needs its caller to handle distances outside table coverage rather than assuming every excessive step count safely returns -1.

## Lift both vertices without crossing the answer

First lift the deeper vertex by the depth difference. If they coincide, that vertex is LCA, including when one original endpoint is the other's ancestor. Otherwise inspect rows from largest to smallest, jumping both only when their ancestors exist and differ.

```go
func LCA(u, v int, depth []int, up [][]int) int {
    if depth[u] < depth[v] { u, v = v, u }
    u = Jump(u, depth[u]-depth[v], up)
    if u == v { return u }
    for k := len(up)-1; k >= 0; k-- {
        pu, pv := up[k][u], up[k][v]
        if pu != -1 && pv != -1 && pu != pv {
            u, v = pu, pv
        }
    }
    return up[0][u]
}
```

Require valid vertices in the same tree and a complete table. At equal depth below the LCA, jumping to different ancestors keeps the vertices on distinct branches below the answer. Equal ancestors might be at or above the LCA, so taking that jump could skip the deepest common vertex. Skip it and try smaller jumps. Afterwards the distinct vertices share a parent, which is their LCA.

In the example, `LCA(3,4)=1`. For `LCA(3,2)`, lift 3 to 1 to equalize depths. Parents of 1 and 2 are both 0, so the loop does not jump to that shared parent; it returns 0 afterwards. `LCA(u,u)=u` returns immediately after depth balancing.

```note-visualization
{"id":"lca-query","preset":"normal"}
```

Jump and row scanning each take `O(log n)`, so does LCA. Forests need component IDs: vertices in different components have no LCA. Do not call the function on them and interpret an accidental parent value as meaningful.

## From common ancestors to distance

The unique `u–v` path ascends to `l=LCA(u,v)` then descends to `v`. Its edge count is `(depth[u]-depth[l])+(depth[v]-depth[l])`, or `depth[u]+depth[v]-2*depth[l]`.

For weights, retain root-distance sums `rootDist` and substitute them into the formula for the unique path's weight. Keep edge depths separately for lifting. With negative weights, this remains the unique tree-path sum, but need not be a nonnegative metric.

```note-visualization
{"id":"tree-distance","preset":"normal"}
```

Changing the root per query changes LCA; the preprocessed-root answer is not directly the new answer. A technique using three LCAs under the old root exists, but this article stays with a fixed root. Making the root its own parent is also a valid convention if absent-ancestor and Jump semantics are adjusted; do not mix it with this code's -1 convention.

Recursive DFS on a deep tree consumes stack; BFS or explicit stacks help control traversal. With only a few queries or a small tree, directly following parents may be simpler than preprocessing.

**Check yourself:** What is `up[1]` in the example? Why skip equal ancestors? What is distance from 3 to 2?

**Explanations:** The row is `[-1,-1,-1,0,0]`. A large shared ancestor can lie above the answer, so retain distinct branches while reducing jump size. Distance is `2+1-2*0=3`, following 3→1→0→2. Splitting at the LCA derives the formula and explains subtracting the root-to-LCA portion twice.

*Further reading: [VNOI — LCA](https://wiki.vnoi.info/vi/algo/data-structures/lca), [VNOI — binary lifting](https://wiki.vnoi.info/vnoi-magazine/2023/binary-lifting).*

[USACO Guide — Binary jumping](https://usaco.guide/plat/binary-jump) — jump tables and ancestor queries.

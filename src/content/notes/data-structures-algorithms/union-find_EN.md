---
title: "Union-Find: connectivity as edges are added"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/union-find"
series: "Advanced DSA"
seriesOrder: 10
tags: ["disjoint-set", "union-find", "path-compression", "kruskal"]
description: "Represent disjoint sets with parent trees, union by size, path compression, and clear deletion limits."
draft: false
updated: 2026-10-15
---

Initially everyone belongs to a separate group. Each report that two people share a group merges their groups; later queries ask whether two people are already together. Without splitting, retaining every connection is unnecessary. Disjoint-set union, or Union-Find, stores only a partition into disjoint sets.

Find(x) returns a representative; Union(a,b) merges their sets. A representative is an internal label, not necessarily the smallest or earliest element. Compare representatives for membership rather than assigning business meaning unless the API promises it.

## A parent forest represents the partition

Each element has a parent; a root points to itself. Elements whose parent paths reach the same root belong together. size is authoritative only at roots; entries for former roots can be stale.

The Go declaration uses two length-n slices. NewDSU requires nonnegative n, and later x,a,b must lie in [0,n). Methods omit per-call bounds checks, and Find mutates parents through compression.

```go
type DSU struct { parent, size []int }

func NewDSU(n int) *DSU {
    d := &DSU{make([]int, n), make([]int, n)}
    for i := 0; i < n; i++ { d.parent[i], d.size[i] = i, 1 }
    return d
}

func (d *DSU) Find(x int) int {
    if d.parent[x] != x { d.parent[x] = d.Find(d.parent[x]) }
    return d.parent[x]
}

func (d *DSU) Union(a, b int) bool {
    ra, rb := d.Find(a), d.Find(b)
    if ra == rb { return false }
    if d.size[ra] < d.size[rb] { ra, rb = rb, ra }
    d.parent[rb] = ra
    d.size[ra] += d.size[rb]
    return true
}
```

Initialization sets parent[i]=i,size[i]=1. Union finds both roots. Equal roots return false without joining again; linking within one set incorrectly can create cycles or corrupt size. Otherwise attach the smaller root below the larger, add its size to the surviving root, and return true.

## Trace a multilevel merge

For n=4:

| Operation | Parent array | Authoritative root sizes |
| --- | --- | --- |
| Initialize | [0,1,2,3] | Each root 1 |
| Union(0,1) | [0,0,2,3] | size[0]=2,size[2]=1,size[3]=1 |
| Union(2,3) | [0,0,2,2] | size[0]=2,size[2]=2 |
| Union(1,3) | [0,0,0,2] | size[0]=4 |

The final merge finds roots 0 and 2. Equal sizes leave ra=0, attaching 2 below it. Node 3 still points to 2, giving 3→2→0. Membership is correct without flattening everything.

```note-visualization
{"id":"union-by-size","preset":"normal"}
```

Even without compression, union by size bounds height by O(log n): whenever a node's depth increases, its tree joins one at least as large, so its containing set at least doubles. Size cannot exceed n, hence only O(log n) such increases occur.

## Find returns a root and shortens later paths

Find(3) follows 2 then 0; on return, it sets parent[2]=0 and parent[3]=0, giving [0,0,0,0]. Membership is unchanged, only the route to the same representative. Later queries from 3 benefit from this work.

```note-visualization
{"id":"path-compression","preset":"normal"}
```

Union by size plus path compression gives an amortized sequence bound of O(m α(n)) for m Find/Union operations after initialization, plus O(n) initialization; formulations may include MakeSet operations in m. Inverse Ackermann α grows extremely slowly. This is not an absolute O(1) promise for each Find; an initial call can cross several parents.

Arrays use O(n). Recursive Find also uses stack along a path, bounded by O(log n) here through union by size before compression. Arbitrary parent edits invalidate that bound. Compression also means a seemingly read-only query writes, so concurrent access requires synchronization.

## Adding a graph edge becomes Union

An undirected n-vertex graph starts with n components. Adding u–v calls Union(u,v). Different roots merge components and reduce their count by one; equal roots mean an existing path already connects the endpoints, so the component count stays unchanged. DSU records this relation rather than an explicit path to output.

Kruskal sorts edges by weight and accepts one when Union returns true, joining distinct components without a cycle. The optimality argument for choosing light edges belongs to Kruskal; DSU supplies component/cycle checks, not an optimality proof from its boolean. Disconnected input yields a spanning forest rather than one spanning tree.

## Deletion is a different question

After edges 0–1 and 1–2, all vertices share a set. Removing 1–2 isolates 2, but DSU parents record only the merged partition and cannot split it. An additional 0–2 edge would make the same deletion harmless. Thus undoing one recent Union does not simulate arbitrary online edge deletion.

Dynamic connectivity needs other techniques or offline time processing with rollback DSU. Rollback records changes; path compression changes many parents during Find and complicates simple rollback. Such designs commonly retain union by size and omit compression to control changes. Do not automatically transfer the α(n) bound to every variant.

## Check your understanding

**1.** Before another Find(3), parent[1] and parent[3] differ. Are the elements in different sets? **2.** Does union within one set reduce component count? **3.** Which deletion makes the old DSU answer stale?

**Answers:** Their immediate parents 0 and 2 differ, but both roots are 0; compare roots. A false Union neither reduces components nor adds size. Removing 1–2 from the chain 0–1–2 with no other edges isolates 2, while the old DSU still reports connectivity. This is the boundary of its merge-only contract.

Further reading: [Princeton COS 226: Union-Find](https://www.cs.princeton.edu/courses/archive/spring21/cos226/lectures/15UnionFind.pdf) covers weighted union, compression, and different bounds.

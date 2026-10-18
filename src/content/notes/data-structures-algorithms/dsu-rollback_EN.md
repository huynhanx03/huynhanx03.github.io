---
title: "Rollback DSU: returning to an earlier connectivity state"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/dsu-rollback"
series: "Advanced DSA"
seriesOrder: 26
tags: ["dsu", "rollback", "offline-connectivity"]
description: "Record merge history to explore offline connectivity-query branches."
draft: false
updated: 2026-10-15
---

An ordinary DSU suits edge additions: an edge can merge two components. Deleting an edge may split a component, but DSU does not retain enough graph structure to determine the split. Rollback DSU solves a narrower problem: restore the exact state preceding a sequence of merges, undoing them in reverse order.

This is especially useful offline, when all operations are known in advance. Organize states into a tree, add edges when entering a branch, and undo them when leaving. This is not an online structure supporting arbitrary deletion of any historical edge.

## Every merge needs enough information to reverse it

The rollback version uses union by size and usually omits path compression. `Find` only reads parent links. Attaching the smaller root to the larger changes two values: the smaller root's parent and the larger root's size. Record them before writing and undo through a stack.

A node's depth increases only when its component joins one at least as large, so its component size at least doubles. There are at most `O(log n)` such increases; `Find` is worst-case `O(log n)` without compression. Path compression is possible if every change is logged and analyzed appropriately, but that is no longer the simple constant-number-of-writes-per-merge version.

```go
type Change struct { Small, Large, OldSize int }
type RollbackDSU struct { Parent, Size []int; History []Change }

func (d *RollbackDSU) Find(x int) int {
    for d.Parent[x] != x { x = d.Parent[x] }
    return x
}
func (d *RollbackDSU) Snapshot() int { return len(d.History) }
func (d *RollbackDSU) Union(a, b int) bool {
    a, b = d.Find(a), d.Find(b)
    if a == b { return false }
    if d.Size[a] < d.Size[b] { a, b = b, a }
    d.History = append(d.History, Change{b, a, d.Size[a]})
    d.Parent[b] = a
    d.Size[a] += d.Size[b]
    return true
}
func (d *RollbackDSU) Rollback(snapshot int) {
    for len(d.History) > snapshot {
        i := len(d.History)-1
        c := d.History[i]
        d.History = d.History[:i]
        d.Parent[c.Small] = c.Small
        d.Size[c.Large] = c.OldSize
    }
}
```

These are Go declarations. Initialize equally sized slices with `Parent[i]=i`, `Size[i]=1`; vertex indices must be valid. `History` starts empty. `Snapshot()` returns the **history length**, not a complete DSU copy. Failed `Union` calls add no marker, which is valid with length-based snapshots. An API undoing a number of Union calls instead needs a different marker convention.

`Rollback(snapshot)` requires a valid snapshot still within the current history prefix. It cannot move forward or retain independently accessible versions. Popping a record restores `Small` as a root and the previous size of `Large`. The smaller root's size was not changed by merging, so it needs no additional saved value.

## Follow the history through a rollback

Start with three separate vertices. `Union(0,1)` adds one record; a snapshot returns 1. `Union(1,2)` finds 1's root, attaches 2 to `{0,1}`, and adds another record. Now `Find(0)==Find(2)` is true.

Rolling back to 1 pops only the second record: 2 becomes its own root, and `{0,1}` returns to size 2. The 0–1 merge remains because it predates the snapshot. Querying connectivity of 0 and 2 returns false. A later branch adding 0–2 therefore starts from exactly `{0,1},{2}`, unaffected by the previous branch.

```note-visualization
{"id":"dsu-rollback","preset":"normal"}
```

The invariant is that changes after a snapshot occupy the stack top, with later records undone first. This ensures `Large` in the record being reversed has returned to its original merge-time structure. Undoing `k` successful merges takes `O(k)`; Union uses two Finds and takes `O(log n)`, with `O(1)` history work. To count components, keep a counter decreasing on successful merge and increasing on undo; the displayed code does not maintain one.

## Turn deletion into leaving a time branch

There are `q` operation times. An edge added at `l` and removed at `r` lives on `[l,r)`. Build a tree partitioning the time axis, attaching the edge to disjoint node intervals that cover exactly its lifetime. An interval needs only `O(log q)` nodes, as in a segment-tree range decomposition.

DFS this tree: take a snapshot, Union its attached edges, process children, then roll back. At leaf time `t`, edges along the root-to-leaf path are exactly those alive at `t`. An inactive edge has no covering interval on that path; an active edge has exactly one node from its disjoint cover there. DSU at the leaf therefore represents the correct connectivity.

```note-visualization
{"id":"offline-connectivity","preset":"normal"}
```

On `[0,8)` split evenly, `[2,6)` attaches to `[2,4)` and `[4,6)`. Attaching once to `[0,8)` would wrongly activate the edge at 0,1,6,7; attaching separately to leaves 2,3,4,5 is unnecessary because two larger intervals suffice.

Let `m` count lifetime intervals, not necessarily distinct endpoint pairs. There are `O(m log q)` merges, each `O(log n)`, giving `O(m log q log n)` plus time-tree traversal and query costs. Connectivity queries use two Finds, adding `O(log n)` each. Time-tree edge lists use `O(m log q)` memory, in addition to DSU, open history, and the time tree.

Match additions and removals correctly: an unremoved edge lives until `q`. In a multigraph, copies sharing endpoints can have different lifetimes; use IDs or multiplicity counts according to the contract. Removing one copy must not silently remove every edge between the endpoints.

**Check yourself:** Does the rollback remove 0–1? Why omit compression? Where does `[2,6)` attach on `[0,8)`?

**Explanations:** No: 0–1 belongs to the snapshot prefix. Omitting compression avoids many extra writes requiring undo; union by size still bounds height logarithmically. `[2,4),[4,6)` cover the exact lifetime, giving each applicable leaf one occurrence on its DFS path.

*Further reading: [VNOI — DSU Rollback](https://wiki.vnoi.info/algo/data-structures/dsu-rollback).*

[USACO Guide — Offline deletion](https://usaco.guide/adv/offline-del) — rollback DSU and organizing time intervals.

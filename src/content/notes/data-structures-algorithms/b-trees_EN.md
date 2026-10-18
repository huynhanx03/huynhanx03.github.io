---
title: "B-trees and B+ trees: branching for page-based storage"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/b-trees"
series: "Advanced DSA"
seriesOrder: 7
tags: ["b-tree", "b-plus-tree", "external-memory", "index"]
description: "Understand how wide nodes reduce page reads, and how splitting, borrowing, and merging maintain occupancy."
draft: false
updated: 2026-10-15
---

A balanced BST in RAM needs O(log n) pointer steps. If each step reads another storage page, those descents can dominate cost. A B-tree puts many keys and child pointers in a node, usually organized around pages, so each page read eliminates many key ranges.

Distinguish page I/O from CPU comparisons. Large branching factor B gives height O(log_B n); locating a key or selecting a child inside each page still costs work. Wide branching helps under a page-access model rather than making node operations free.

## Fix a convention before counting keys

Different references use “order” and “degree” differently. Here minimum degree t≥2 means every nonroot node holds t−1 through 2t−1 sorted keys. An internal node has one more child than keys. A nonempty root has at least one key; an internal root has at least two children. All leaves share one depth.

For k1<k2 in a node, its three children hold keys below k1, between k1 and k2, and above k2 under this article's distinct-key policy. Search identifies an equal key or the appropriate interval and follows one child. Checking only key order within nodes is insufficient without checking entire subtree ranges.

A nonroot internal node has at least t children. Together with common leaf depth, this makes the minimum number of nodes/keys grow exponentially with height, giving logarithmic height. Allowing one branch to terminate early while another grows arbitrarily would lose that argument; equal leaf depth is part of balancing.

## Splitting restores occupancy by promoting a median

A full node has 2t−1 keys. A split promotes its median to the parent, leaving t−1 keys on each side; child pointers divide according to the same ranges. One top-down insertion strategy splits a full child before descending, ensuring room at the eventual leaf.

With t=2, nodes hold at most three keys. Inserting 1,2,3 initially makes root leaf `[1,2,3]`. Before inserting four, split the full root: new root `[2]`, children `[1]` and `[3]`. Descend right and insert four into `[3,4]`. Leaves have equal depth and each nonroot holds at least one key.

```note-visualization
{"id":"btree-insert","preset":"normal"}
```

Splitting the root increases height by one for the whole tree; a single leaf does not independently grow deeper. Splitting a child adds the median and a new child pointer to its parent; top-down insertion ensures that parent has room. Dividing keys without updating child pointers loses search paths.

## Deletion borrows or merges before underflow

Deleting from a leaf is straightforward when at least t−1 keys remain. A child already at t−1 would underflow after another deletion. One strategy strengthens it before descending: borrow through the parent from a sibling with spare keys, or merge it with a sibling and the parent's separator.

For t=2, parent `[2]` and children `[1]`, `[3]` are all at relevant minimum occupancy. Merge them through two into `[1,2,3]`; the old root is empty with one child, so that child becomes root. Deleting one then leaves `[2,3]`. The entire tree loses a level while maintaining equal leaf depth.

Borrowing moves a parent separator down into the deficient child and moves an appropriate sibling boundary key up to the parent; internal nodes also transfer a boundary child pointer. Moving an arbitrary sibling key without repairing the separator breaks search ranges.

Deleting an internal key can replace it with a predecessor/successor when the corresponding child has enough keys, or merge the adjacent children through that key and continue inside the merged node. Complete implementations have more cases than this illustration; ordering and occupancy invariants determine which are valid.

A search/update path touches O(log_t n) pages under a one-node-per-page model, with split/merge work at each relevant level. Within-node linear or binary search adds CPU cost depending on t when page capacity is not treated as fixed.

## B+ trees retain data at leaves for range scans

B+ trees store records or record pointers at leaves; internal nodes contain separators and child pointers. Leaves are usually linked in order. After finding an interval's starting leaf, a scan can follow subsequent leaves until the interval ends.

An exact query for 42 descends to a leaf and searches it. A query for 42..80 need not restart at root for each key: find the start and continue scanning. Cost includes the initial descent and the result/leaf pages read, so an arbitrarily large output is not simply an O(log n) operation.

```note-visualization
{"id":"bplus-range","preset":"normal"}
```

A separator can appear both internally and in a leaf because it routes searches. Splitting a B+ leaf must retain data at leaves; copying/selecting its separator differs from moving a median data key out of a classical B-tree node. Equality routing, occupancy, and split/merge rules vary by implementation and must remain consistent.

Without payload, internal nodes often fit more separators per page, potentially reducing height according to workload and key size. This motivates page indexes without guaranteeing every B+ tree fewer I/Os than every B-tree for every query.

## An index tree is not a complete storage engine

B-trees/B+ trees suit disk or page caches. With little data in RAM, page management and implementation complexity may outweigh the benefit. Persistent concurrent updates additionally need locking/latching, recovery, logging such as WAL, and write ordering. Maintaining tree invariants within one execution does not establish those properties.

## Check your understanding

**1.** With t=2, why does splitting `[1,2,3]` leave no empty child? **2.** What happens when merging empties the root? **3.** Why are B+ trees convenient for range scans?

**Explanation:** Promoting median two leaves one key per side, meeting t−1; a wrong split position can underfill a child. An internal root left with one child is replaced by that child; losing all keys yields the representation's empty tree. Ordered leaf links let a scan continue through relevant pages after finding the start, while still paying to read and emit results.

Further reading: [David Galles, University of San Francisco: B-trees](https://www.cs.usfca.edu/~galles/cs245/lecture/lecture20.pdf) uses maximum degree; convert conventions before comparing its bounds with minimum degree t here.

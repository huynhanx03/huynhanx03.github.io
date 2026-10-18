---
title: "Segment and Fenwick trees: point updates and range sums"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/segment-fenwick-trees"
series: "Advanced DSA"
seriesOrder: 9
tags: ["segment-tree", "fenwick-tree", "range-query", "lazy-propagation"]
description: "How two structures store interval sums, and how static queries, point updates, and lazy propagation differ."
draft: false
updated: 2026-10-15
---

Prefix sums answer a range sum with one subtraction. Changing a[2], however, may require updating every later prefix, costing O(n). When updates and queries interleave, we want intermediate sums arranged so one change affects few cells.

Segment and Fenwick trees both support point updates and range sums in O(log n), using O(n) memory. They store different intervals. Understanding each cell's interval matters more than memorizing index jumps.

## A segment tree splits each interval into two

Each node stores a half-open interval [l,r). If its length exceeds 1, split at m=l+(r−l)/2: left [l,m), right [m,r). A leaf represents one element. The basic invariant is that a node stores its interval's sum, combined from its children when no lazy tag remains pending as in the later variant.

For a=[3,−2,5,1,4,0,2,6], the root [0,8) stores 19; [0,4) stores 7 and [4,8) stores 12. Query [2,5) splits into [2,4), sum 6, and [4,5), sum 4, yielding 10 without reading every element.

A query has three cases: no overlap returns 0, the additive identity; complete coverage returns the stored sum; partial overlap recurses into children and adds. This lets whole regions be ignored or answered from saved work.

```note-visualization
{"id":"segment-query","preset":"normal"}
```

At each depth, only a few boundary nodes partially overlap. Interior nodes are accepted whole and stop. The two boundary paths and intervening covering regions total O(log n) visited nodes asymptotically, not every node and not O(log²n). Explicitly outputting elements would additionally require output work.

## A point update changes one ancestor path

Changing a[2] from 5 to 8 gives delta=3. Leaf [2,3) changes, then [2,4) from 6 to 9, [0,4) from 7 to 10, and the root from 19 to 22. Nodes not containing index 2 are unaffected. Query [2,5) now returns 13.

```note-visualization
{"id":"segment-update","preset":"normal"}
```

One path contains O(log n) nodes, giving O(log n) updates. Building leaves and combining every node once costs O(n). Recursive layouts commonly allocate about 4n cells; iterative layouts can place leaves in a region rounded to the next power of two. Both use O(n) memory but different index mappings; do not mix their child rules.

Empty arrays need a convention that does not create a fake leaf and rejects point updates. A valid query commonly satisfies 0≤ql≤qr≤n; empty intervals sum to 0. Numeric types must fit all sums and update products, not just individual input values.

Replace sum by min/max using an associative merge and suitable identity: +∞ for min, −∞ for max. Noncommutative merges such as concatenation still need left-before-right order. Segment trees do not require recovering a range by subtracting prefixes.

## Lazy propagation delays child updates, not the parent's answer

Adding delta to an entire [ql,qr) point by point costs its length. When a node is fully covered, increase sum by delta×(r−l) and add delta to its lazy tag. Its sum already reflects the update; children may not yet reflect that pending change.

A later partial query must push the tag: update both children's sums/tags using their lengths, then clear the parent's tag. After a partial child update, pull the parent's sum from its children. State the invariant accurately: a node's sum includes applicable updates, while its tag records changes not yet passed down. Child sums need not represent the full current data while a parent tag remains pending.

Adding 2 to [0,4) increases that node's sum by 8 without touching every leaf. A later [2,3) query must push +2 down the path to avoid an old value. Range update/query operations under this scheme take O(log n).

Assignment differs from addition. A new assignment can overwrite earlier updates; addition after assignment must modify the assigned value. Tags are not one interchangeable number for every operation. Design their composition order before combining features.

## Fenwick cells store blocks determined by the lowest set bit

Fenwick indexing is one-based. `lowbit(i)=i & -i`; tree[i] stores the closed interval `[i−lowbit(i)+1,i]`.

| i | lowbit | Stored interval |
| ---: | ---: | --- |
| 1 | 1 | 1..1 |
| 2 | 2 | 1..2 |
| 3 | 1 | 3..3 |
| 4 | 4 | 1..4 |
| 5 | 1 | 5..5 |
| 6 | 2 | 5..6 |
| 7 | 1 | 7..7 |
| 8 | 8 | 1..8 |

A prefix through 7 takes tree[7] for 7..7, subtracts 1 to reach 6 for 5..6, then subtracts 2 to reach 4 for 1..4, then zero. These blocks are disjoint and cover 1..7. Each step removes a set bit, giving O(log n) steps.

```note-visualization
{"id":"fenwick-query","preset":"normal"}
```

Adding delta at i moves upward by i+=lowbit(i), updating blocks containing that point. From i=3,n=8, update tree[3],tree[4],tree[8]. Stop beyond n. The initial i must be at least 1 because lowbit(0)=0 makes no progress.

```note-visualization
{"id":"fenwick-update","preset":"normal"}
```

Update and prefix take O(log n), and tree uses O(n) space. Assigning a point requires knowing its old value to obtain delta, or another way to retrieve it. A closed range [l,r] has sum prefix(r)−prefix(l−1). For zero-based arrays, map index i to Fenwick i+1: segment interval [2,5) represents array indices 2,3,4, hence Fenwick 3..5.

Standard Fenwick trees are compact for addition/sums. Addition is associative, commutative, and invertible for prefix subtraction. Associativity alone does not guarantee arbitrary merges support the same updates and range queries. Restricted-update minimum variants exist, but min has no inverse to recover range min from two prefix minima. Segment trees are more convenient for general merges or varied range operations.

## Check your understanding

**1.** Why does [2,5) use [2,4) and [4,5) in the eight-element tree? **2.** Which cells does Fenwick update 5 visit for n=8? **3.** Why not prefixMin(r)−prefixMin(l−1)?

**Answers:** The disjoint intervals cover exactly indices 2,3,4; nonoverlapping nodes return 0, fully covered nodes return sum. Update 5 follows 5→6→8→16 and stops; each stored block contains 5. Subtraction cannot undo min: a minimum before l can hide all values inside the requested range, so two prefix values are insufficient. A different structure or contract is required.

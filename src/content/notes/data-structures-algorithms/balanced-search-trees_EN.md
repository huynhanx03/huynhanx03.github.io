---
title: "Balanced search trees: AVL, red-black, and splay"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/balanced-search-trees"
series: "Advanced DSA"
seriesOrder: 6
tags: ["avl", "red-black-tree", "splay-tree", "rotation"]
description: "Understand how rotations preserve search order and how three balancing strategies provide different guarantees."
draft: false
updated: 2026-10-15
---

Inserting 1,2,3 into an ordinary BST produces a rightward chain. Searching for three follows every node; continuing in increasing order can make paths linear. Balanced search trees add a way to control shape or the total cost of a sequence while preserving BST order.

AVL, red-black, and splay trees all rotate, but their guarantees differ. AVL controls height differences, red-black controls colors and black height, and splay adjusts after accesses with an amortized bound.

## A rotation preserves order by moving the middle subtree

Let x have right child y; A is x's left subtree, B y's left subtree, C y's right subtree. BST order is `A<x<B<y<C`. A left rotation at x makes y the regional root, x its left child, and B x's right child; A and C retain their sides.

Inorder remains A,x,B,y,C. B fits to x's right because its keys lie between x and y. Forgetting that transfer loses nodes or damages links. Right rotation is symmetric. Update the previous parent's link or overall root, plus any height/size metadata.

A rotation changes O(1) local links and metadata. The balancing invariant must explain when and where to apply it.

## AVL bounds height differences at every node

Balance factor `height(left)-height(right)` must be −1,0,or 1. After insertion/deletion, only ancestors along the modification path can change height; update and check them upward. Untouched subtrees preserve their invariant.

Inserting 1,2,3 makes node one right-heavy by two levels, the right-right case. Rotate left at one: root two with children one and three, still inorder 1,2,3. For 3,1,2, the violation at three is left-right: rotate left at child one, then right at three, again producing root two.

```note-visualization
{"id":"avl-insert","preset":"normal"}
```

The four patterns are left-left/right rotation, right-right/left rotation, left-right/two rotations, and its right-left mirror. Deletion requires examining the child's balance rather than only remembering the direction of a newly inserted key; balanced-child cases also arise. Deletion can reduce height and require repair at several ancestors, so fixing one location and always stopping is insufficient.

Why does a local rule bound global height? An AVL tree of height h with the fewest nodes has child heights h−1,h−2, giving `N(h)=1+N(h−1)+N(h−2)`. This grows exponentially in h, hence h=O(log n). Search, insertion, and deletion are worst-case O(log n), with constant-time local metadata work and rotations.

## Red-black allows unequal heights while limiting imbalance

Treat nil leaves as black. The root is black; red nodes have no red children; all paths from a node to descendant nil leaves have the same black-node count under one counting convention. Real nodes are red or black. Equal black counts alone would allow arbitrarily many consecutive red nodes on one path; the no-adjacent-red condition is essential.

Without consecutive reds, a path has at most about one red between successive black nodes. Equal black height bounds the longest path by twice the shortest. To connect this to node count, let b count black nodes down to a nil leaf, excluding the starting node but including nil. This subtree contains at least `2^b−1` real nodes: each black level requires two branches attaining the remaining black count. Thus b is at most `log₂(n+1)`, and total height is O(log n). This is asymptotic balance without AVL's maximum height difference of one. [Open Data Structures: Red-Black Trees](https://opendatastructures.org/newhtml/ods/latex/redblack.html) develops this height argument.

```note-visualization
{"id":"red-black-insert","preset":"normal"}
```

New nodes are usually inserted red to avoid changing path black counts. A black parent creates no red-red conflict. With a red parent, inspect the uncle: red parent/uncle can be recolored black while moving red upward; a black uncle can require rotations and recoloring. Restore a black root. In a standard insertion of 1,2,3, the initial chain has two reds below root one; rotation/recoloring yields black root two with red children one and three.

Deleting black can leave a one-black deficit along one branch. Repair considers sibling and sibling-child colors, sometimes propagating the deficit upward. Insertion repair cannot simply be reused for deletion. This article explains the invariant mechanism rather than listing every red-black deletion implementation case.

Search/insertion/deletion are worst-case O(log n), with color metadata. Rotation/update costs differ between implementations and workloads; colors alone do not prove red-black always performs fewer repairs or runs faster than AVL.

## Splay distributes access costs over a sequence

Splay trees require no stored color or height invariant. After access, rotations bring the relevant node to root: zig when its parent is root, zig-zig for matching directions, zig-zag for opposite directions. Standard zig-zig rotates at grandparent then parent; zig-zag rotates at parent then grandparent. Arbitrarily replacing these patterns with repeated single rotations does not inherit the same analysis.

```note-visualization
{"id":"splay-access","preset":"normal"}
```

Accessing three on chain 1→2→3 and splaying with two left rotations can produce root three above two above one. Another access to three is close; another deep access can still cost O(n). Standard unsuccessful searches commonly splay the last visited node, while insertion/deletion use corresponding splay/join procedures preserving BST order.

The basic guarantee is amortized O(log n) for standard operations over a sequence, accounting for initialization/initial state when stating total bounds. Individual operations need not have logarithmic paths. Recent accesses becoming close to root explains useful locality, without requiring random inputs for amortized analysis.

Even a search can change links, so concurrent readers cannot assume splay searches perform no writes without suitable synchronization.

| Structure | Standard-operation guarantee | Balance metadata |
| --- | --- | --- |
| AVL | Worst-case O(log n) | Height/balance |
| Red-black | Worst-case O(log n) | Color |
| Splay | Amortized O(log n); individual O(n) possible | No required color/height |

## Check your reasoning

**1.** Why must a left rotation retain B? **2.** Does equal black height require equal path lengths? **3.** Does splay's amortized bound guarantee a single request's maximum latency?

**Explanation:** B's keys lie between x and y; transferring it right of x preserves both nodes and ordering. Equal black counts allow different red counts; prohibiting adjacent reds bounds that difference. Amortization bounds sequence totals under its analysis conditions, not a single deep access; request deadlines need another guarantee.

Further reading: [CMU: Splay Trees](https://www.cs.cmu.edu/afs/cs.cmu.edu/academic/class/15451-f97/www/splay.html) explains rotations and splay's guarantee.

---
title: "Binary search trees: preserve order through search, insertion, and deletion"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/binary-search-trees"
series: "DSA Foundations"
seriesOrder: 16
tags: ["bst", "search-tree", "deletion", "invariant"]
description: "Follow the global BST invariant, height-dependent costs, and the three deletion cases."
draft: false
updated: 2026-10-15
---

A binary tree alone does not enable fast search. Comparing a key with the root can eliminate a whole subtree only under a rule covering **all descendants**: every left key is smaller, every right key larger. That is the binary search tree, or BST, invariant.

This article uses distinct keys. Duplicates require a policy: increment a count, retain payloads, direct equals to one side, or reject them. That policy affects search and deletion and must remain consistent.

## Each search step eliminates a key range

Consider root five, left three, right seven with children six and eight. Searching for six goes right at five because all left keys are smaller than five; left at seven because all its right keys exceed seven; then finds six. Reaching nil means the only permitted search path has ended without the key.

This Go function uses `TreeNode` with Value, Left, Right from [trees and traversals](/en/notes/data-structures-algorithms/trees-and-traversals/). Declare it at package scope; no import is needed:

```go
func Contains(root *TreeNode, key int) bool {
    for root != nil {
        if key == root.Value { return true }
        if key < root.Value { root = root.Left } else { root = root.Right }
    }
    return false
}
```

The loop invariant is that a key present originally remains in the subtree at current root. Each comparison selects the allowed range without losing it. One iteration descends a level, giving O(h) time and O(1) auxiliary space in this iterative version, with h measuring path height asymptotically.

```note-visualization
{"id":"bst-search","preset":"normal"}
```

Insertion follows the same path to a nil link and attaches a new node. Its allowed range is the intersection of all ancestor constraints. Checking only the parent is insufficient: root ten, left five, and five's right child twelve violate BST order despite twelve>five on the last edge.

```note-visualization
{"id":"bst-insert","preset":"normal"}
```

Inserting 1,2,3,4 in order creates a right chain in an ordinary BST; h=n−1 and operations can take Θ(n). Two child fields do not imply automatic balance. Only with h=O(log n) do the same search/insertion procedures become logarithmic.

## Inorder ordering follows from whole subtrees

Visit left subtree, node, right subtree. By induction, each subtree's inorder is increasing. All left keys are below the node and all right keys above it, so concatenation is increasing globally. Full traversal costs O(n), unlike an O(h) search path.

Minimum follows left links; maximum follows right. A node's successor, when a right subtree exists, is its minimum. Otherwise use the nearest ancestor for which the node lies in the ancestor's left branch, tracked as a candidate while searching from root. Predecessor is symmetric. Each takes O(h), without traversing the entire tree.

## A leaf or one-child deletion redirects access

A leaf has no descendants, so detach its parent link. A one-child node is replaced by that child subtree. All child-subtree keys already satisfy the ancestor constraints inherited through the old node, preserving order.

Deleting root has no parent field to update. The deletion function must return the new root or receive access to the caller's root variable. A singleton tree becomes nil; setting a local pointer parameter to nil does not replace the caller's variable.

## With two children, use the nearest key from one side

Delete seven in the example: its successor is eight, minimum of its right subtree. Replace seven's record with eight's, then delete eight's old node. The result has root five, left three, and right eight with left child six. A successor has no left child—otherwise it would not be minimum—so its old position needs only leaf/one-child deletion.

```note-visualization
{"id":"bst-delete","preset":"normal"}
```

Why is eight valid? Every key left of the old node was below seven and thus below eight. Eight was the right subtree's minimum and is removed from its original position, leaving all remaining right keys above it. Both sides preserve their relationship with the replacement. Using the left subtree's maximum predecessor is symmetric.

Move the associated record when nodes contain keys and payloads; changing only the key while retaining another key's payload corrupts the association. If applications retain node handles, copying contents versus physically moving nodes has different consequences: the same handle may now refer to changed contents. The API must choose behavior consistent with ownership and identity.

## Costs and ordered operations

Search, insertion, deletion, min/max, and predecessor/successor take O(h) for the operations described; full traversal O(n). Two-child deletion adds a successor path, but the combined paths remain O(h), rather than h².

Hash tables suit expected equality lookup without providing key order. BSTs support neighbors/ranges, but ordinary ones do not bound h. For worst-case O(log n), use appropriate AVL/red-black invariants or another balanced structure; [balanced search trees](/en/notes/data-structures-algorithms/balanced-search-trees/) develops this step.

## Check your understanding

**1.** What does deleting root from a singleton five tree return? **2.** Why not replace a two-child node with any key in its right subtree? **3.** Does increasing inorder require balance?

**Explanation:** Return nil, which the caller must retain as the new root. An arbitrary nonminimum right key can leave smaller keys on its right, violating the replacement node's invariant; the successor prevents this. Increasing inorder requires BST ordering even in a chain. Balance controls height and path costs rather than the correctness of inorder ordering.

---
title: "Trees and traversals: reason about hierarchical structure"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/trees-and-traversals"
series: "DSA Foundations"
seriesOrder: 15
tags: ["tree", "traversal", "dfs", "bfs", "go"]
description: "Nodes, edges, height, depth-first traversal orders, and breadth-first layers."
draft: false
updated: 2026-10-15
---

Directories contain subdirectories, expressions contain subexpressions, and search trees divide keys into regions. Each can be processed by asking whether children are finished and when the parent should be handled. That timing determines the traversal order.

First identify the representation. An undirected tree is connected and acyclic, with n−1 edges for n nodes and exactly one simple path between any two nodes. Choosing a root gives parent–child relationships; every nonroot has one parent. Downward child pointers need no return edge, whereas undirected adjacency lists do.

## Depth and height count edges

A node's depth counts edges from the root. Height counts edges on its longest downward path to a leaf. We use leaf height 0 and empty-tree height −1 so `1+max(height(left),height(right))` remains consistent.

Take root 4, left child 2 with children 1,3, and right child 6. Depths are 0 for 4, 1 for 2,6, and 2 for 1,3. Root height is 2; leaf 6 has height 0 despite depth 1. The measures look in different directions and need not match at a node.

Some references count height in nodes, shifting values by one. Check the convention and empty case before comparing formulas; a one-unit difference need not mean a different algorithm.

## Three processing times within depth-first traversal

Choose left before right in a binary tree:

| Traversal | When to process the node | Example order |
| --- | --- | --- |
| Preorder | Before children | 4,2,1,3,6 |
| Inorder | Between left and right | 1,2,3,4,6 |
| Postorder | After children | 1,3,2,6,4 |

Preorder processes 4 immediately, then its entire subtree at 2 before 6. Inorder delays 4 until the **whole** left subtree finishes, not merely child 2. Postorder waits for both child results. Applying the same local contract at every node determines the whole order.

```go
type TreeNode struct {
    Value int
    Left, Right *TreeNode
}

func Height(root *TreeNode) int {
    if root == nil { return -1 } // height is measured in edges
    left, right := Height(root.Left), Height(root.Right)
    if left > right { return left + 1 }
    return right + 1
}
```

This independent Go declaration does not mutate the tree. Height returns −1 for nil; leaves have two −1 children and return 0. Node 2 returns 1, and root 4 returns max(1,0)+1=2. It is postorder because parent results follow both child results.

Assume Height is correct for the subtrees. A longest parent path must enter one child and add an edge, so choose the maximum, not the sum of both branches. This is the inductive correctness step, with the empty tree as base case.

```note-visualization
{"id":"tree-preorder","preset":"normal"}
```

```note-visualization
{"id":"tree-inorder","preset":"normal"}
```

```note-visualization
{"id":"tree-postorder","preset":"normal"}
```

Each node is visited once, giving O(n) time. Simultaneous stack frames follow a root-to-current path, using O(h+1), often written O(h) for nontrivial trees. A chain has h=n−1 and O(n) stack; a balanced tree has h=O(log n). Total nodes do not equal simultaneously live frames.

Preorder suits parent-to-child state, such as directory paths. Postorder suits sizes, heights, expressions, or releasing resources owned by the structure after children. Inorder is increasing only with a **BST invariant**, not merely a binary shape. Root 4 with left child 9 produces 9 before 4 and is not sorted.

An explicit stack can reproduce DFS. Preorder commonly pushes right before left so left is popped first. Postorder must distinguish discovery from processing after children, for example with a frame stage. Pushing each node once and processing immediately produces a preorder-like traversal instead.

## BFS uses FIFO to form layers

Queue the root if nonnil. Remove a node, process it, and enqueue children in the desired order. The queue contains discovered but unprocessed nodes in nondecreasing depth.

For the example: [4] → [2,6] after 4 → [6,1,3] after 2 → [1,3] after 6 → [3] → empty. Output is 4,2,6,1,3. Discovering 1 before processing 6 does not move it ahead; FIFO keeps 6 at the front.

```note-visualization
{"id":"tree-level-order","preset":"normal"}
```

To group levels, capture queue size at the start of the outer iteration and process exactly that many nodes. Newly enqueued children belong to the next level. Repeatedly reading a growing size can merge levels accidentally.

BFS visits n nodes and n−1 edges once: O(n) time and O(w) queue memory, where w is maximum width asymptotically. The queue can contain the end of one layer and start of the next but remains within a constant factor of w. Wide trees may use more BFS memory than height-based DFS; chains need few queue entries but deep recursive stacks.

## Multiway trees and undirected representations

Nodes with Children []*Node still admit processing before or after all children. Binary inorder needs a special convention without exactly two children; its usual left–parent–right meaning does not transfer automatically.

For undirected u–v adjacency, DFS at v sees u again. Pass parent and skip its edge or use visited. Cycles or multiple parents violate the assumed pointer-tree structure and require suitable graph algorithms and marking state.

## Construct and assess

**1.** What is Size(root)? **2.** Do preorder and inorder uniquely identify a tree with duplicate keys? **3.** How do chain and complete-binary-tree heights compare for n nodes?

**Answers:** Size(nil)=0; Size(node)=1+Size(left)+Size(right), evaluated postorder in O(n). With distinct values, preorder's first element identifies a unique root in inorder, splitting subtrees recursively. Duplicates make that location ambiguous, so uniqueness generally needs extra identity or conventions. A chain has height n−1; a nonempty complete binary tree has floor(log₂n). Shape explains O(h) costs; tree operations are not automatically logarithmic.

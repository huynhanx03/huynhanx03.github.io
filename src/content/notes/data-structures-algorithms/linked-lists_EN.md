---
title: "Linked lists: trading random access for node relinking"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/linked-lists"
series: "DSA Foundations"
seriesOrder: 6
tags: ["linked-list", "pointer", "invariant", "go"]
description: "Singly, doubly, and circular lists; insertion, deletion, reversal, and their actual costs."
draft: false
updated: 2026-10-15
---

You already hold a handle to a job and want to remove it from the middle of a list. A slice usually shifts the suffix; a linked list may change only a few links. But knowing only “the hundredth job” requires following all preceding nodes. The benefit depends on whether the **position is already known**.

A node stores data and links, with no requirement that nodes occupy contiguous memory. Without direct index-based address calculation, reaching node i takes O(i), generally O(n). Inserting/removing at a known position can take O(1), provided the necessary pointers are available.

## Head is the entry to a singly linked list

Nodes have Value and Next; head=nil means empty, and the final Next is nil. These independent Go declarations reverse an existing finite acyclic list in place.

```go
type Node struct {
    Value int
    Next  *Node
}



func PushFront(head *Node, value int) *Node {
    return &Node{Value: value, Next: head}
}

func Reverse(head *Node) *Node {
    var prev *Node
    for head != nil {
        next := head.Next
        head.Next = prev
        prev, head = head, next
    }
    return prev
}
```

`PushFront` creates a node pointing to the old head and returns the new head. The caller must retain it, for example `head=PushFront(head,7)`. Creating a node without updating the caller's head does not change its entry point. Empty input correctly produces Next=nil.

To remove the first node, verify non-nil head and assign head.Next to head. To remove the node **after** prev, require both prev and prev.Next non-nil, then assign `prev.Next=prev.Next.Next`. This is O(1) because its predecessor is known. A handle only to the target in a singly linked list generally lacks the links needed for ordinary removal.

```note-visualization
{"id":"singly-linked-list","preset":"normal"}
```

Adding tail for O(1) append requires invariants: both head/tail nil when empty; otherwise tail is last and tail.Next=nil. Removing the last or sole node must update tail. A stale tail pointing to a detached node can make later appends attach outside the actual list.

## Reverse using three pointer roles

For `A→B→C→nil`, begin prev=nil, head=A. Save next=B, set A.Next=nil, then prev=A, head=B. Save C, set B.Next=A, then prev=B, head=C. Finally set C.Next=B and head=nil. Returning prev gives `C→B→A→nil`.

Before each iteration, prev is the reversed prefix and head the unprocessed remainder; together they contain exactly the original nodes. Save `next` **before** overwriting head.Next or lose the original onward path. Each iteration transfers one node to the reversed region, proving termination and preservation of all nodes.

Time is O(n), extra memory O(1); empty returns nil and a singleton remains itself. Aliases still identify the same nodes, whose links have changed. If another caller expects the old order, the in-place mutation must be explicit in the API.

## Doubly linked lists pay memory for backward navigation

Each node has Prev and Next. To remove an internal x, redirect x.Prev.Next to x.Next and x.Next.Prev to x.Prev; at endpoints update head/tail instead of nonexistent neighbors. Both directions are necessary to preserve `x.Next.Prev==x` for adjacent retained nodes.

Removing a known node is O(1), but the contract must establish membership; do not relink through an already detached stale handle. An extra pointer per node and more state per operation need maintaining/synchronizing. A sentinel is a dummy boundary node without user data; stable endpoint neighbors reduce special cases.

```note-visualization
{"id":"doubly-linked-list","preset":"normal"}
```

A circular list links tail.Next to head; doubly circular lists often use a sentinel in both directions. Traversing until `node==nil` will not terminate. Traverse a known count or stop upon returning to the start, handling empty nonsentinel lists separately. Intentional circular structures for turns or queues do not contain an erroneous cycle: circularity is part of their contract.

## Slow/fast detects cycles without a visited set

For an unknown singly linked structure, advance slow one edge and fast two each iteration. Check fast and fast.Next before advancing. Reaching nil establishes a finite ending and no cycle.

For a cycle of length c, once both pointers enter it, their separation modulo c changes by one per iteration. Within c more iterations it becomes zero and they meet. Time is O(n) in reachable nodes, extra space O(1), without storing visited nodes. Check equality after advancing under the chosen scheme, avoiding a false cycle report merely because both start at head.

```note-visualization
{"id":"floyd-cycle","preset":"normal"}
```

To find a middle in an acyclic list, also move fast twice and slow once. Starting both at head and continuing while fast and fast.Next are non-nil returns the right middle for even lengths. The left middle needs a different stopping/initialization convention; specify it rather than treating two valid conventions as contradictory.

## Choose from actual access patterns

| Need | Slice | Linked list |
| --- | --- | --- |
| Arbitrary index | O(1) | O(n) |
| Order-preserving insertion/removal after a known position | O(n) shifting | O(1) relinking |
| Unindexed value search | O(n) | O(n) |
| Traversal | contiguous, usually good locality | follows pointers |
| Overhead | little per element | links and node allocation |

Go slices are often simpler for small data or indexed access. Lists merit consideration when retaining handles and editing many positions. Big-O omits allocation/cache effects, so it does not establish that lists always delete faster.

**Check yourself:** What must DeleteAfter require? Does Reverse clone aliases? Why does slow/fast stop?

**Explanations:** Require prev!=nil, prev.Next!=nil, membership of prev, and tail updates if removing the last node in a tail-tracking structure. Reverse modifies existing nodes, so aliases still share them. Slow/fast either reaches nil or meets within a cycle through relative motion modulo its length; together these arguments cover finite and cyclic structures.

---
title: "Heaps and priority queues: retain extrema without sorting everything"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/heaps-priority-queues"
series: "DSA Foundations"
seriesOrder: 17
tags: ["heap", "priority-queue", "sift-up", "sift-down"]
description: "Array-based binary heaps, operation costs, Dijkstra, and top-k applications."
draft: false
updated: 2026-10-15
---

A deadline-based job system needs the earliest job after each insertion or completion. Sorting all jobs after every change does unnecessary work: only the next highest-priority item is required.

A priority queue specifies priority-based removal. A binary min-heap implements it by keeping each parent's key no greater than its children's. This local rule places the minimum at the root without sorting all other elements.

## A complete tree fits directly in an array

With zero-based indices, children of i are `2i+1,2i+2` when below length; parent of i>0 is `(i-1)/2`. Nodes fill levels left to right, so shape needs no pointers. Height is O(log n), as positions roughly double per level.

Array `[1,2,7,5]` is a min-heap: 1≤2,7 and 2≤5. Yet 7 precedes 5, so reading the array is not sorted traversal. Every root-to-descendant path is nondecreasing, proving the root minimum, not global array order.

## Push creates only one path of violations

Append x to preserve completeness. If smaller than its parent, swap upward; otherwise stop. Existing subtrees remain heaps, with only the new parent relationship potentially wrong. After a swap, any remaining violation continues up the same path.

Starting `[1,2,7,5]`, Push 0 gives `[1,2,7,5,0]`. Index 4's parent at 1 holds 2; swap to `[1,0,7,5,2]`, then swap with root 1 to obtain `[0,1,7,5,2]`. Other parent–child relations remain valid.

PopMin saves the root, moves the last item there, and shortens the array. Sift down using the smaller child, swapping when the parent exceeds it. Choosing the larger child could leave the new parent above an even smaller child, failing to restore the heap.

For `[0,1,7,5,2]`, removing 0 and moving 2 gives `[2,1,7,5]`; swap with child 1 to get `[1,2,7,5]`. Empty removal needs a bool/error contract. A one-item heap simply becomes empty without reading nonexistent children.

```note-visualization
{"id":"heap-push-pop","preset":"normal"}
```

Sifting follows at most the height, O(log n). A dynamic array's structural Push adjustment is O(log n), but a reallocating append may cost O(n); operation tables separate storage/allocation assumptions or use suitable amortized bounds. Peek is O(1). Searching for an arbitrary key can take O(n), because the heap has no BST relationship eliminating half the candidates.

## Build-heap need not Push n times

Inserting individually gives an O(n log n) adjustment bound. Bottom-up construction treats leaves as heaps and sifts down internal vertices from last to root. When a vertex is processed, both subtrees are already valid; only their root relationship needs repair.

For `[5,2,7,1]`, internal vertex 1 swaps with child 1 to give `[5,1,7,2]`. Root 5 swaps with child 1 to yield `[1,5,7,2]`, then with 2 to yield `[1,2,7,5]`. Nothing attempts to order 7 against 5 because that is outside the invariant.

```note-visualization
{"id":"build-heap","preset":"normal"}
```

About n/2 nodes are leaves, n/4 have height 1, and nodes of height h number at most proportionally n/2^(h+1). Work is bounded by `O(n Σ h/2^h)=O(n)`. Charging every node log n overcounts. Linear heapify underlies heapsort and initialization from an existing collection.

## Top-k retains a threshold rather than total order

For the k largest stream values, keep a min-heap of at most k items. Insert until full. Its root is then the smallest retained item: discard a new value no larger than it, otherwise replace the root and sift down. After each prefix, the heap contains its k largest values, or all values if fewer have arrived.

With k=3 and `[5,2,7,1,6]`, the first three retain {2,5,7}; discard 1 below threshold 2; replace 2 with 6 to retain {5,6,7}. Internal array order need not match that set listing. Complexity is commonly O(n log k) for k≥2, or O(n log(k+1)) including k=1, with O(k) memory. For k=0 return empty without reading a root; k>n returns all input if the contract says “at most k.”

```note-visualization
{"id":"heap-top-k","preset":"normal"}
```

## Priority updates need an item's location

Changing a key without moving its entry can invalidate the heap. Sift up/down at the proper index. An ID→index map finds entries; every swap updates both stored indices. Min-heap decrease-key normally goes up, while an increased key may go down.

Dijkstra can instead append a new record when distance improves and discard popped distances older than the current best. This leaves multiple records per vertex, so memory/time depend on record count, not just vertex count. Failing to skip stale entries can duplicate work or break implementation-specific processing logic.

Ordinary heaps do not preserve FIFO among equal priorities. If needed, compare `(priority,sequenceNumber)`, assigning increasing insertion sequence numbers and ensuring they do not overflow within the intended lifetime.

## Go has two Push/Pop layers

With [container/heap](https://pkg.go.dev/container/heap), implement `Len,Less,Swap,Push,Pop`. The **methods** append/remove the slice's last item; package **functions** `heap.Push,heap.Pop` coordinate them to restore the invariant. Calling the Pop method directly does not mean removing the minimum. `Less` defines min/max priority, and `Swap` must update indices when retaining handles.

**Check yourself:** What follows Push 0 and PopMin on `[1,2,7,5]`? Why not binary-search the heap array?

**Explanations:** Push yields `[0,1,7,5,2]`; Pop returns 0 and restores `[1,2,7,5]`. Binary search requires whole-array ordering to eliminate half the range. Heap ordering applies only along parent–child edges; consecutive array halves are not separated key ranges.

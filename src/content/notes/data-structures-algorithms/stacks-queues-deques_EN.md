---
title: "Stacks, queues, and deques: removal order defines the structure"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/stacks-queues-deques"
series: "DSA Foundations"
seriesOrder: 7
tags: ["stack", "queue", "deque", "ring-buffer", "go"]
description: "LIFO, FIFO, circular buffers, and monotone deques without accidentally retaining popped objects."
draft: false
updated: 2026-10-15
---

When exploring rooms by distance layers, remove the room discovered earliest. When undoing the latest choice, remove the newest state. Queues and stacks express those two orders; deques permit operations at both ends.

Stacks use LIFO and queues FIFO. These are operation contracts, not requirements to use nodes or arrays. DFS can use a stack, BFS needs a queue, and sliding-window maxima often use a deque retaining only useful candidates.

## Use a slice's end as the stack top

This generic Go declaration requires Go 1.18 or later. Its zero value works; callers keep a Stack variable and call methods rather than using a nil receiver pointer.

```go
type Stack[T any] []T



func (s *Stack[T]) Push(x T) { *s = append(*s, x) }

func (s *Stack[T]) Pop() (T, bool) {
    var zero T
    if len(*s) == 0 { return zero, false }
    i := len(*s) - 1
    x := (*s)[i]
    (*s)[i] = zero // clear the reference so the GC can reclaim the object
    *s = (*s)[:i]
    return x, true
}
```

Push appends. Pop saves the final element, zeros its slot, then reduces length. Clearing removes old references when T contains pointers, preventing a long-lived array from retaining popped objects. The clearing itself does not change accessible length until reslicing.

Push A then B; Pop returns B then A. Popping an empty stack returns (zero,false), distinct from a real zero-valued element (zero,true). With suitable array-capacity growth, Push is amortized O(1), while one allocation/copy can take O(n); Pop is O(1).

```note-visualization
{"id":"stack-operations","preset":"normal"}
```

The call stack is also LIFO: a child frame finishes before returning to its parent. An explicit stack can replace many recursions, but frames may need a program-stage field as well as a node to reproduce postorder or work after a child returns.

## A queue preserves logical order across wraparound

Shifting all remaining elements after every Dequeue costs O(n). Using q=q[1:] changes the descriptor in O(1) but can retain a large array and old referenced objects. A long-lived queue should reuse free slots and clear references.

A ring buffer has capacity C, a head index, and live-element count size. Logical element i is at (head+i)%C for 0≤i<size. Enqueue writes at (head+size)%C then increments size. Dequeue reads/clears head, advances it modulo C, then decrements size. The invariant 0≤size≤C distinguishes full from empty even when circular positions coincide.

For C=4,head=2,size=3, elements A,B,C occupy physical slots 2,3,0. Dequeue A gives head=3,size=2. Enqueue D writes slot (3+2)%4=1. Logical order is B,C,D despite a different physical order; scanning the array directly does not implement FIFO.

```note-visualization
{"id":"circular-queue","preset":"normal"}
```

At size=C, do not overwrite the first element: reject for fixed capacity or grow dynamically. Growth allocates a larger buffer, copies **logical order** into 0..size−1, and resets head=0. At C=0, allocate before taking a remainder to avoid division by zero.

Growing by a fixed factor above 1 gives linear total copying over many insertions, so Enqueue is amortized O(1). Dequeue without shrinking is O(1). Shrinking needs a low-occupancy threshold well below the full threshold to avoid alternating growth/shrink on each operation. Clearing removed cells releases child references; reducing logical length does not itself shrink the allocated buffer.

## A deque adds both ends; a monotone invariant adds window maxima

A growing ring buffer supports PushFront/PushBack/PopFront/PopBack in amortized O(1). Finding a window maximum additionally requires a rule for removing dominated candidates.

For width k, store **indices** in increasing order and their values in decreasing order. At i, remove front indices outside [i−k+1,i]. Remove back indices with value ≤a[i], then append i. The new index has at least as large a value and expires later, so discarded candidates can never beat it in a future window. Once k elements have arrived, the front gives the maximum.

For [2,1,3,4,2],k=3:

| i, value | Deque indices after update | Full-window maximum |
| --- | --- | --- |
| 0,2 | [0] | Not full |
| 1,1 | [0,1] | Not full |
| 2,3 | [2] | 3 |
| 3,4 | [3] | 4 |
| 4,2 | [3,4] | 4 |

```note-visualization
{"id":"monotonic-deque","preset":"normal"}
```

Using ≤ retains the newest among equal-valued candidates, valid when only the maximum value matters. For the earliest maximum index, retain ties according to a different policy, such as removing only <. Indices tell which occurrence expires; values alone cannot distinguish equal occurrences.

Each index enters once and leaves at most once, giving O(n) total time and O(k) auxiliary space. One step may remove many candidates, but the sequence remains linear; a nested while does not justify multiplying n by k. For all full windows, require 1≤k≤n; k=0 or k>n needs an error/empty-result API decision.

Priority queues also retain extrema but do not share the same front-expiry rule. A heap needs handles or stale-entry management and may have different costs. The monotone deque exploits both expiry order and value dominance.

## Apply and check the invariants

**Brackets:** Push an opener. A closer needs a nonempty stack with the matching type at its top, then Pop. The final stack must be empty. `([)]` fails at `)` because the top is `[`, even though opener/closer counts can balance. Leftover openers are errors too.

**Queue:** Growing from C=4,head=2,size=3 must put A,B,C at the start of the new buffer and set head=0. Copying physical slots 0,1,2 gives the wrong order and an inactive cell. The logical invariant tells whether the implementation is correct.

**Deque:** Why discard value 1 at index 1 when value 3 arrives at index 2? Three is larger and remains in every future window at least as long. Before 3 expires, 1 cannot be maximum; after 3 expires, 1 expired earlier. This argument, rather than memorized PopBack instructions, justifies discarding it.

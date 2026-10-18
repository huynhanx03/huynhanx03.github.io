---
title: "Abstract data types: choose storage from the operations you need"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/abstract-data-types"
series: "DSA Foundations"
seriesOrder: 3
tags: ["abstract-data-type", "data-structure", "invariant", "go"]
description: "Separate operation contracts from representation, then choose structures for their workload, costs, and ownership rules."
draft: false
updated: 2026-10-15
---

A collection of jobs can be used in two very different ways. Processing jobs in arrival order requires taking the oldest one. Always prioritizing the nearest deadline requires taking the smallest key. Both store many jobs, but their removal contracts lead to different suitable structures.

An **abstract data type** (ADT) describes allowed operations and their meaning. A **data structure** describes a representation implementing that contract. A stack is an ADT; a slice or linked list can implement it. Separating these levels lets us change storage while identifying the behavior that must survive.

## Begin with ordering and required operations

For a stack, `Push(x)` adds at the top and `Pop()` removes the top. The rule is last in, first out, LIFO. After `Push(4); Push(9)`, successive pops must return nine and four. The contract must also define an empty pop: a failure indicator, an error, or a panic under a stated precondition? Zero alone cannot indicate absence when zero is valid data.

A queue is FIFO: first in, first out. A priority queue removes by priority rather than age. These ADTs might all use array storage while expressing different relationships. Familiar map lookups are no reason to choose a map when removal order is the central requirement.

| Workload question | Required capability | Candidates to investigate |
| --- | --- | --- |
| Frequent access to element i? | Arbitrary positional access | Array/slice |
| Which ends receive and remove items? | LIFO uses one end; FIFO adds at the back and removes at the front | Stack/queue |
| Find an exact key? | Equality lookup | Hash table/map |
| Need minimum, successor, or key ranges? | Ordering relationships | Search tree or sorted sequence |
| Repeatedly take the highest-priority item? | Extremum under updates | Heap/priority queue |

A workload includes operations, their frequencies, and their scale. A slice provides O(1) indexed access and contiguous traversal, but inserting at the front usually shifts O(n) elements. A linked list prepends in O(1); reaching position i follows about i links. If locating the node already costs O(n), the combined find-and-delete operation is not O(1) merely because unlinking is cheap.

## A stack exposes the contract–representation boundary

These package-level Go declarations store integers in a slice. The zero value `IntStack{}` is ready to use:

```go
type IntStack struct {
    items []int
}

func (s *IntStack) Push(x int) {
    s.items = append(s.items, x)
}

func (s *IntStack) Pop() (int, bool) {
    if len(s.items) == 0 {
        return 0, false
    }

    last := len(s.items) - 1
    value := s.items[last]
    s.items = s.items[:last]
    return value, true
}

func (s *IntStack) Len() int {
    return len(s.items)
}
```

Callers see `Push`, `Pop`, and `Len`; `items` describes implementation details. An empty pop returns `(0,false)`. Popping an actual zero returns `(0,true)`. Those outcomes differ despite the identical numeric value.

The representation invariant is that slice elements retain the order of pushes not yet popped; when nonempty, `items[len(items)-1]` is the top. Push appends there, making the new item top. Pop reads that position and shortens the slice, exposing its predecessor. Len counts logical elements because all remaining items are within the slice length.

| Operation | Logical contents afterwards | Result |
| --- | --- | --- |
| Start | `[]` | Len is zero |
| Push 4 | `[4]` | Top is four |
| Push 9 | `[4,9]` | Top is nine |
| Pop | `[4]` | `(9,true)` |
| Pop | `[]` | `(4,true)` |
| Pop | `[]` | `(0,false)` |

```note-visualization
{"id":"stack-contract","preset":"normal"}
```

Under a suitable growing-array model, Push is amortized O(1), but an individual push can take O(n) when allocation and copying are required. Pop and Len here are worst-case O(1). LIFO itself does not require those costs; they belong to this representation.

Replacing integers with pointers to large objects introduces another concern. Shortening length does not erase the old backing-array reference. Clearing that slot before shortening can prevent retaining an unwanted object. Integers in this example retain no pointed-to object. Implementation details can therefore affect observable resource use even when the ADT stays the same.

## The same FIFO contract can have different removal costs

Suppose a queue contains `[A,B,C]`. Shifting B and C left on each dequeue preserves FIFO but costs O(n). Keeping a head index allows reading `items[head]` and incrementing head instead. That logical operation is constant time, but old slots and unused leading space remain; clearing references and deciding when to compact or reallocate are still necessary.

A ring buffer reuses positions cyclically. It keeps head, tail or size, and an invariant that logical elements follow circular order without overwriting unread items. FIFO alone does not select an implementation: it defines results; further analysis establishes cost and conditions.

This connects contracts to invariants in a proof. The caller requires FIFO; the representation maintains logical order; each operation preserves it. Switching from a slice to a linked list or ring buffer changes the detailed proof while potentially preserving the caller's promise.

## A contract also defines mutation rights

If an API returns a slice view into internal storage, the caller can mutate the same backing array. Different variable names do not imply independent copies. A small view can also retain a large array. Independent ownership requires copying to the appropriate depth and including that cost in the contract.

Before choosing an ADT, specify operations, arguments, results, empty or missing-key cases, invariants, worst-case or expected/amortized costs, and sharing or mutation policy. An O(1) table says neither what happens on empty input nor whether returned elements may be modified.

## Choose for a situation and explain why

**1. Browser Back/Forward:** how would two stacks work? After going Back and opening a new page, is the old Forward history still valid?

**2. Earliest-deadline jobs:** is FIFO enough? What should happen when deadlines tie?

**Explanation:** Moving to a new page pushes the current page onto Back and clears Forward. Back pops Back while pushing the current page onto Forward; Forward does the reverse. A fresh navigation after Back creates a new history branch, so the usual contract discards old Forward history. Jobs require a priority queue by deadline; FIFO suffices only when arrival order already agrees with deadlines. For deterministic ties, add arrival sequence or ID. Choose storage after clarifying those behavior rules.

[Stacks, queues, and deques](/en/notes/data-structures-algorithms/stacks-queues-deques/) develops those representations; [Go slices](/en/notes/go/slices/) explains views and copies in depth.

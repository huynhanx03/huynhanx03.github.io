---
title: "Stack and heap: understand lifetime before placement"
category: "Operating System"
tags: ["memory", "stack", "heap", "gc", "fundamentals"]
description: "Understand frames, allocation, escape analysis, and fragmentation without inferring placement or performance from syntax."
updated: 2026-10-15
translationKey: "operating-system/stack_vs_heap"
---

A function creates data and returns a pointer. The function has finished, yet its caller can still use the data. This seems invalid if local variables are assumed always to live on a stack and disappear on return.

Separate declaration location, data lifetime, and compiler/runtime placement. Stack and heap describe different management mechanisms; syntax does not divide all values into small local variables and large heap objects.

## The stack tracks active calls

When A calls B and B calls C, execution needs enough state for C to return to B and B to A. A stack frame models an active call's return information, temporaries, arguments, and locals as arranged by the compiler. Some values live in registers or are optimized away, so a frame diagram is not an exact map of every build.

Frame allocation and reclamation generally follow LIFO order: later calls finish first. This allows inexpensive management, often involving a stack-pointer adjustment. It does not guarantee that every function call, stack growth, or data initialization costs a single O(1) operation.

Threads commonly have stacks; Go additionally manages a stack for each goroutine. Goroutine stacks can grow and move. Do not assume every language or operating system provides the same initial size or growth behavior.

## Why can recursion exhaust the stack?

```go
func descend(n int) int {
    if n == 0 {
        return 0
    }
    return 1 + descend(n-1)
}
```

Assume non-negative `n`. Each call waits for the next call to return, so depth grows with n. Having a base case does not make every n practical; excessive depth can still exceed runtime limits. Without a base case or progress toward it, frames can accumulate uncontrollably.

Large local data can also increase memory requirements, but in Go `var buf [1000000]int` does not prove stack placement or immediate stack overflow. The compiler can choose the heap or optimize according to context. Inspect compiler decisions for a specific analysis.

## The heap supports lifetimes independent of call order

```go
func makeCount() *int {
    count := 10
    return &count
}

p := makeCount()
fmt.Println(*p) // 10
```

Go permits this example: the data must remain valid while the caller uses its pointer. Heap allocation supports objects whose lifetime does not follow frame removal. This concerns lifetime, not a requirement that every heap object be long-lived or shared across goroutines.

Heaps can be organized into regions and size classes. An individual object still needs an appropriate address region; a noncontiguous overall heap does not scatter each object's bytes arbitrarily. Allocators can use fast paths rather than searching an entire free list on each allocation.

Go's GC reclaims unreachable heap objects. Other languages can use explicit deallocation or other ownership models. Heap storage does not synchronize data, and a pointer does not make sharing safe. Placement is separate from access discipline.

## Escape analysis follows how data is used

The compiler analyzes whether data can remain in use beyond a suitable frame lifetime. Returning a local address commonly matters, but inlining can change placement. Neither `new(T)` nor `&T{}` guarantees a heap allocation; even local-only data may go to the heap because of size or other compiler choices. The [Go FAQ](https://go.dev/doc/faq#stack_or_heap) explains why allocation cannot be inferred from syntax alone.

To inspect decisions for a particular build, you can use:

```sh
go build -gcflags="-m" ./...
```

Results depend on compiler version, flags, and call context. Fewer allocations can reduce GC work, but forcing a stack-focused design can complicate code without a measured benefit. Identify the actual workload cost first.

## Fragmentation and memory not returned yet

Different object lifetimes leave gaps among live heap regions. **External fragmentation** concerns gaps that cannot readily satisfy a requested region; **internal fragmentation** is unused space within allocation units, for example from size-class rounding. Total free memory alone does not establish whether a particular allocation can be satisfied.

LIFO avoids holes from freeing a frame between active frames in the ordinary stack model. That does not eliminate every kind of waste: a stack can have unused capacity, with runtime-specific shrinking and reuse policies.

| Question | Stack/frame | Heap |
| --- | --- | --- |
| Main lifetime relationship | Active calls | Can be independent of call order |
| Typical management | LIFO frame creation/removal | Allocator and language reclamation mechanism |
| Relevant costs | Depth, frame size, stack growth | Allocation, live objects, GC, fragmentation |
| Safe sharing? | Not implied by placement | Not implied by placement |

See [Garbage collection](/en/notes/go/garbage_collection/) for why fewer live heap objects need not immediately reduce RSS.

## Check your understanding

**Does returning a local pointer automatically create a dangling pointer in Go?** No. Go keeps the data valid for its use; actual placement depends on the compiler. Other languages must be judged by their own lifetime rules.

**Is every heap object slower than every stack value in every program?** No such general performance conclusion follows. Consider the complete operation, caches, lifetime, allocation, and GC work. Cheap stack management is not an application benchmark.

**Is pointer placement enough to establish safe goroutine sharing?** No. Determine who reads/writes and how access is synchronized. See [Data races](/en/notes/fundamentals/concurrency_race/).

References: [Go FAQ on stack/heap](https://go.dev/doc/faq#stack_or_heap), [Go GC guide](https://go.dev/doc/gc-guide).

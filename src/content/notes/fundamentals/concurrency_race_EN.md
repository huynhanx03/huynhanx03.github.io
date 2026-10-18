---
title: "Data races and race conditions: what must be protected?"
category: "Fundamentals"
tags: ["concurrency", "distributed-systems", "basics"]
description: "Distinguish unsafe memory access from interleaving business decisions using counters and inventory."
updated: 2026-10-15
translationKey: "fundamentals/concurrency_race"
---

Two customers buy the last item. You lock every read and write, yet both orders succeed. There is no contradiction: protecting individual memory accesses does not necessarily protect a business decision.

This article separates two questions: are accesses properly synchronized, and does the whole operation remain correct when events interleave? This distinguishes a data race from a race condition. Examples use Go, but check-then-update problems also arise across requests and services.

The Go snippets are separate examples: put type and method declarations at package scope, statements inside `main`, and import `fmt` and `sync` where used. Comments indicate expected results or warn about intentionally incorrect code.

## A data race concerns the relationship between accesses

```go
var count int
var wg sync.WaitGroup
for i := 0; i < 2; i++ {
    wg.Add(1)
    go func() {
        defer wg.Done()
        count++ // Intentionally incorrect: unsynchronized shared access.
    }()
}
wg.Wait()
fmt.Println(count) // No reliable result should be assumed.
```

Both goroutines access `count`, at least one access writes, and no synchronization orders those accesses. They need not execute at precisely the same instant on two CPUs for a data race to exist. `count++` is not automatically an atomic increment.

`Wait` makes main wait for both goroutines before printing; it does not order the increments relative to each other. Fix the increment with a common mutex, an appropriate atomic operation, or a single goroutine owning updates.

Avoid labeling all Go race behavior with C/C++'s unrestricted undefined-behavior model. Go specifies synchronization responsibilities and its own constraints for racy programs; races on multiword values can still create dangerous inconsistent states. Correct code removes races instead of depending on an incidental output. The [Go Memory Model](https://go.dev/ref/mem) explains happens-before relationships.

## A race condition concerns correctness of the whole operation

Suppose `Available` and `Decrement` each hold the same mutex while accessing inventory, but a purchase calls them separately. One possible schedule is:

| Step | Request A | Request B | Stock |
| --- | --- | --- | --- |
| 1 | Reads 1 and releases lock | | 1 |
| 2 | | Reads 1 and releases lock | 1 |
| 3 | Decrements under lock | | 0 |
| 4 | | Decrements under lock | -1 |

Each access is locked, but the “stock exists, allow purchase” decision can become stale before the decrement. This is a logical race condition. The table describes one possible schedule, not a guaranteed execution order.

Protect checking and changing state within the same boundary:

```go
type Stock struct {
    mu sync.Mutex
    remaining int
}

func (s *Stock) Buy() bool {
    s.mu.Lock()
    defer s.mu.Unlock()
    if s.remaining == 0 {
        return false
    }
    s.remaining--
    return true
}
```

Assume initially non-negative stock and that every update follows the same discipline. From stock 1, one successful call makes the next observe 0 and refuse. Do not copy `Stock` after its mutex has been used.

Across multiple processes, an in-process mutex cannot protect another process's data access. Database-backed inventory can use a conditional update such as `UPDATE ... SET stock = stock - 1 WHERE stock > 0`, checking affected rows, or a transaction with suitable locking/isolation. Merely enclosing two statements in a transaction at an arbitrary isolation level does not remove every business race.

## Choose tools for the boundary that needs protection

| Technique | What it helps protect | What it does not automatically solve |
| --- | --- | --- |
| Mutex | Accesses sharing one lock within a process | Multiple processes or separately locked Get/Set sequences |
| Atomic | One operation or a correctly designed atomic protocol | Arbitrary invariants across fields |
| Channels and ownership | Communication order and explicit update ownership | Both sides continuing to mutate a sent pointer |
| Transactions/conditional updates | Changes where data is actually managed | External side effects or incorrect retries |
| Idempotency | Repeated execution of the same logical request | Different requests competing for the last item |
| Immutable data | Fewer concurrent mutations | Publishing/replacing references and multistep decisions |

Select a technique from the contract to preserve, not just the bug's label. The protected unit might be a variable, related fields, or an entire order-acceptance decision.

## What can detection establish?

Go provides a race detector, commonly enabled with `go run -race` or `go test -race` on supported development platforms. These are tool instructions, not execution results for this article. The detector observes paths that actually execute; no report is not proof of race freedom. It also does not infer the business rule against overselling. The [race detector documentation](https://go.dev/doc/articles/race_detector) explains usage and limitations.

For logical race conditions, state the invariant and examine interleavings: who reads what, how long the lock is held, and when information may become stale. Stress testing can expose failures but does not replace reasoning about operation boundaries.

There is no need to classify every program with the slogan “data race without race condition.” Definitions of race condition vary in breadth. The practical distinction is that **data-race freedom alone does not establish correct concurrent logic**.

## Check your understanding

If `Load` and `Store` are individually atomic, is `Load → add 1 → Store` an atomic increment?

No. Two callers can load the same old value and store the same result. Use an atomic increment or a CAS/locking protocol covering the required operation.

If a pointer is sent through a channel and the sender keeps mutating the object while the receiver reads, has the data race disappeared? Not necessarily. Channel operations order events according to synchronization rules; they do not prohibit later accesses. Define ownership or appropriate synchronization.

Continue with [Maps](/en/notes/go/maps/) and [ACID](/en/notes/database/acid/) for in-memory and database boundaries.

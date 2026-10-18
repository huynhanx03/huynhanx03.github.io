---
title: "Semaphores: counting permits and coordinating work"
category: "Operating System"
tags: ["concurrency", "semaphore", "synchronization"]
description: "Use counting semaphores to limit resources and signal events, while distinguishing them from mutexes."
updated: 2026-10-16
translationKey: "operating-system/semaphores"
---

A semaphore is a synchronization primitive with a count. `wait` takes a permit; if none is available, the caller waits. `post` or `signal` adds a permit and may wake a waiter. A counting semaphore models a number of slots or resources that may be used concurrently.

## A semaphore limits resources

Suppose a pool has five connections. Initialize a semaphore with five permits. Each worker takes a permit before borrowing a connection and returns it afterward. If every access follows this protocol, a sixth worker waits instead of borrowing a sixth connection. The semaphore limits only workers that use it; code that bypasses the permit can still exceed the pool's limit.

If a caller forgets to return a permit on an error path, effective capacity gradually shrinks. Use scope cleanup, `finally`, or `defer` as appropriate to the language. Ensure each acquired permit is released exactly once, including on timeout or cancellation.

## A semaphore signals producer-consumer work

One approach is a semaphore named `items` initialized to zero: a producer adds an item and posts; a consumer waits before removing an item. The queue still needs a mutex to protect its internal structure when multiple producers or consumers access it. The semaphore counts available items; it does not protect the head and tail links.

For a bounded buffer of capacity `N`, initialize `empty = N` and `full = 0`. A producer waits on `empty`, locks the mutex only while writing a slot or index, unlocks, then posts `full`. A consumer does the reverse: wait on `full`, lock while removing an item or updating an index, unlock, then post `empty`. Do not hold the mutex while waiting on `full` or `empty`: if a consumer sleeps while holding the mutex, a producer cannot enter to create an item and wake it, causing deadlock.

A semaphore can coordinate a join or event with initial value zero. If a child posts before the parent waits, the permit remains; the parent's later wait consumes it and proceeds. This differs from a condition variable: a signal with no waiter is not remembered, so the predicate must be stored separately and protected by a mutex.

An educational semaphore can be built from a mutex, condition variable, and counter: `wait` sleeps in a `while (value <= 0)` loop, and `post` increments the counter and signals. The internal representation of waiters depends on the implementation; callers should rely only on the API contract.

A counting semaphore does not necessarily have ownership like a mutex. Many APIs allow another thread to post to signal an event. This makes semaphores useful for coordinating producers and consumers, but also makes permit bugs difficult to trace if the protocol is unclear.

## Mutex or semaphore?

| Need to represent | Commonly suitable primitive |
| --- | --- |
| Only one thread enters a critical section | Mutex |
| At most N concurrent operations | Counting semaphore |
| Sleep until an application predicate is true | Condition variable + mutex |
| Wait for a thread to finish | Join/future |

This is a guide, not a replacement for a specific API's behavior. A binary semaphore may have one permit like a mutex, but ownership semantics and use differ. Choosing the right abstraction makes invariants easier to understand.

## Risks in permit design

- Initializing the wrong number of permits allows too many or too few tasks.
- Repeated posts can exceed the intended limit if the semaphore has no cap.
- Forgetting to post leaks a permit and can leave waiters blocked.
- Acquiring multiple semaphores in inconsistent order can deadlock.
- A timeout must clearly handle whether the task acquired a permit.

## Summary

- A semaphore represents permits; wait takes one, and post adds or returns one.
- Use it to limit resources or coordinate events under a clear protocol.
- A queue used with semaphores still usually needs a mutex for its structure.
- Ownership semantics differ from a mutex.
- Every acquire needs exactly one release on every path.

## Check your understanding

**Is a semaphore with value 1 always the same as a mutex?** No. Ownership semantics may differ.

**Does an `items` semaphore replace a lock for a queue?** No. It counts available items; the queue structure still needs protection.

**How many permits should a pool of 10 resources usually start with?** Ten, provided each permit corresponds to one resource and is returned when that resource is released.

## Read next

Using locks, semaphores, and resources in inconsistent orders can create [deadlocks](/en/notes/operating-system/deadlocks-and-livelocks/).

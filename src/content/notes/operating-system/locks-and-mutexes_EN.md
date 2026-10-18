---
title: "Locks and mutexes: protecting shared invariants"
category: "Operating System"
tags: ["concurrency", "lock", "mutex", "synchronization"]
description: "Use mutual exclusion correctly and avoid races, overly broad locks, and lifecycle errors."
updated: 2026-10-16
translationKey: "operating-system/locks-and-mutexes"
---

A mutex lets at most one thread own a lock at a time. Other threads wait before entering the critical section. Correct locking protects shared-data invariants; incorrect locking can cause deadlocks, bottlenecks, or races that remain unfixed.

In POSIX, initialize a mutex before use (with a static initializer or `pthread_mutex_init`) and destroy it with `pthread_mutex_destroy` only after no thread holds, waits on, or uses it in a synchronization operation; [POSIX defines destroying a referenced mutex as undefined behavior](https://pubs.opengroup.org/onlinepubs/9799919799/functions/pthread_mutex_destroy.html). Check return codes from initialization, lock, and unlock. A wrapper that only asserts is appropriate only when stopping the program on failure is acceptable. `trylock` returns immediately if the mutex is busy; `timedlock` waits until a deadline. Both have specific uses and should not replace ordinary locking without a clear reason.

Evaluate a lock on three dimensions: **correctness** (does it provide mutual exclusion?), **fairness** (can a thread starve indefinitely?), and **performance**. Measure uncontended use, contention among threads on one CPU, and contention across CPUs. A lock with a fast uncontended path can still be expensive under heavy contention.

## Protect invariants, not just a write statement

Suppose a queue has `head`, `tail`, and an element count. Enqueue may update all three. If a lock protects only the count increment rather than the relationship among all fields, another thread can observe a half-updated state.

```text
lock(queue)
  inspect queue and update all related fields
unlock(queue)
```

The critical section must be large enough that an invariant cannot be observed in a broken state, but avoid holding a lock across slow I/O or uncontrolled code when possible.

## Locks also define memory ordering

A mutex does more than stop two threads entering the same region. Unlocking and then locking the same mutex creates a synchronization relationship under the API and memory model, allowing the later thread to observe earlier writes correctly. A hand-written Boolean flag does not provide this guarantee; a compiler or CPU may reorder operations without the right primitive.

Do not create a spinlock with `while (flag)` on an ordinary variable. Correct spinlocks need atomic operations, appropriate memory ordering, and scheduling considerations. Mutexes are optimized by the OS/runtime for many situations.

## Granularity: one large lock or many small ones?

A single large lock simplifies reasoning but makes threads wait for one another and limits parallelism. Many small locks allow more concurrency but make acquisition order complicated and increase deadlock risk.

Start from the data structure and its invariants. Optimize contention after profiling identifies it as a bottleneck. Sharding data by key or using separate queues may reduce contention better than adding locks arbitrarily.

## Common mistakes

- **Forgetting to unlock:** use defer, RAII, or a scope guard where the language supports it.
- **Unlocking from a non-owner:** violates the mutex contract.
- **Holding a lock too long:** increases other threads' latency.
- **Calling a callback while locked:** it may take another lock or re-enter the same structure.
- **Reading outside the lock:** a race remains even if writes are protected.
- **Using one lock for everything:** creates global contention.

## A mutex is not a semaphore

A mutex represents exclusive ownership; a thread normally locks and then unlocks it. A semaphore represents a count of permits/resources, and another thread may signal or wait depending on the problem. Replacing a mutex with a semaphore can obscure ownership; using a mutex to count multiple available slots is the wrong abstraction.

## Summary

- A mutex protects a critical section and data invariants.
- Lock/unlock also establish memory synchronization under the API.
- Lock granularity trades simplicity for parallelism.
- Forgetting to unlock, calling callbacks under a lock, and reading outside it are common bugs.
- Use a mutex for mutual exclusion and a semaphore for an appropriate count of permits/signals.

## Check your understanding

**Is it enough to lock only writes if another thread reads the data?** Not necessarily; all conflicting accesses must follow the synchronization rules.

**Is locking an entire function always safer?** It may simplify reasoning but can lengthen the critical section and create contention.

**If a lock protects one variable but not its related invariant, is the structure safe?** No. The invariant must be updated and observed as one logical unit.

## Read next

When a thread must wait for a condition such as “the queue is not empty,” a condition variable coordinates with a mutex more effectively than polling.

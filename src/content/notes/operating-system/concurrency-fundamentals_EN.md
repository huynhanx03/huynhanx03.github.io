---
title: "Concurrency: multiple flows of progress"
category: "Operating System"
tags: ["concurrency", "thread", "race condition"]
description: "Distinguish concurrency from parallelism and see how interleaving exposes bugs in shared state."
updated: 2026-10-16
translationKey: "operating-system/concurrency-fundamentals"
---

A program can handle several tasks by interleaving their progress, even when there is only one CPU core. On a multicore machine, some threads can truly run at the same time. Both cases create the same challenge: results should not depend on an uncontrolled and arbitrary execution order.

## Concurrency and parallelism

**Concurrency** organizes multiple tasks whose progress overlaps in time. **Parallelism** executes multiple tasks at the same time on separate computing resources. A concurrent program can run on one core; parallel execution requires hardware capable of simultaneous work.

Concurrency is useful for separating independent work, keeping an interface responsive while waiting for I/O, or serving multiple requests. It also adds overhead: context switches, synchronization, communication, and cache contention.

## Interleaving changes results

Suppose two threads increment `count`, initially zero. `count++` is usually a read, add, and write sequence rather than one atomic operation:

```text
Thread A: read 0
Thread B: read 0
Thread A: write 1
Thread B: write 1
```

The result is 1 rather than 2. This is a **race condition**: the result depends on the order of concurrent operations. A **data race** occurs when multiple threads concurrently access the same memory location, at least one access is a write, and the accesses are not synchronized according to the language's memory model. The terms are related but not identical.

## Critical sections and atomicity

Code that accesses shared state needs a protection rule. A critical section is a region where threads must coordinate so an execution schedule cannot break an invariant. If a balance must never be negative, the invariant may require locking both the check and update, not only the final write.

An atomic operation is treated as indivisible under the architecture or language contract. “Atomic” does not make a multi-step algorithm atomic automatically; the ordering and scope of synchronization still need design.

The intuition of “all or nothing” also appears outside concurrency: a filesystem may use journaling or copy-on-write to recover from a crash, and a database may group operations into a transaction. The intuition is similar, but the failure models and guarantees differ. A mutex protects against thread interleaving; it does not make data durable through power loss. A journal does not protect an invariant shared by two threads.

## Waiting for another thread

Not every coordination problem is about protecting a critical section. Sometimes a thread should sleep until another finishes a task, such as completing I/O or placing data in a queue. A condition variable or similar primitive handles wait and wakeup; busy-polling the condition should not be the default.

Concurrency matters in operating systems because the kernel is itself a concurrent program: interrupts and multiple CPUs can touch page tables, process lists, inodes, or allocation bitmaps at once. The kernel must protect its own invariants; a kernel race can corrupt system-wide state.

## Execution order is not fully controlled by the program

A thread can be interrupted between instructions, blocked by I/O, or run on another core. Compilers and CPUs may also reorder internal operations when permitted by the language semantics. Correct code must not rely on “A always runs before B” unless a synchronization mechanism establishes that order.

Stress tests can make a bug easier to reproduce, but cannot prove it absent. State the invariant, find shared data, identify synchronization edges, then use a race detector if the language provides one.

## Exercise: trace an interleaving

Write `count++` as three operations: read, add, and write. Enumerate valid interleavings for two threads and calculate the final value. Then put a lock around the critical section and repeat. Add a busy loop waiting for the other thread to change a flag and see when it burns CPU without making progress. The goal is to identify which operation must be protected and which situation calls for waiting and notification.

## Reducing shared state

- **Ownership:** one thread is responsible for modifying data.
- **Message passing:** workers send messages instead of writing the same structure.
- **Immutable data:** published data is not changed afterward.
- **Synchronization:** use a lock, condition variable, semaphore, or atomic around the invariant.

No option is always best. Message passing may still need queue synchronization; immutable data can require copying; locks are simple but may limit parallelism. Choose the approach that makes data ownership and lifetime clear.

## Add concurrency only when the problem needs it

Before creating threads, ask whether the program needs several tasks to progress at once or whether a single flow is easier to understand. Concurrency has a cost: reasoning about more interleavings, coordinating state, and handling hard-to-reproduce errors. If one thread meets the requirements, it is usually easier to verify.

When concurrency is needed, prefer familiar patterns such as locking an invariant or a producer-consumer queue over inventing a new coordination protocol. For parallelism across large datasets, a higher-level abstraction can reduce low-level synchronization. MapReduce is one example: split data for independent map operations, then combine results with reduce. It does not fit every workload, but can avoid managing locks and condition variables in every computation step.

This is not a ban on concurrency. Use it when responsiveness, overlapping I/O, or parallel throughput justifies the added complexity.

## Summary

- Concurrency means multiple tasks can progress; parallelism means they execute simultaneously.
- A race condition makes results depend on interleaving.
- A data race is a particular unsynchronized conflict under a language memory model.
- Protect invariants, not only individual assignments.
- Use waiting/notification for events instead of busy loops.
- Ownership, messages, immutability, and synchronization can reduce unsafe shared state.
- Add concurrency when its benefit is worth its reasoning and runtime cost.

## Check your understanding

**Can a concurrent program run on one CPU core?** Yes. The scheduler can interleave its threads.

**Does making one increment atomic make a multi-step balance update atomic?** No. The complete invariant may need a lock or a carefully designed atomic algorithm.

**Can race conditions happen only on multicore systems, and does a stress test prove a program is race-free?** No. Interleaving on one core is enough to cause a race, and a stress test cannot cover every schedule.

## Read next

To create and coordinate threads, first see the [Thread API](/en/notes/operating-system/thread-lifecycle-api/), then learn to protect critical sections with [locks](/en/notes/operating-system/locks-and-mutexes/).

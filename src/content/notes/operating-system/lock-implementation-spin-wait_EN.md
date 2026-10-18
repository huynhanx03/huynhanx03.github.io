---
title: "Lock implementation: spinning, yielding, and sleeping"
category: "Operating System"
tags: ["concurrency", "mutex", "spinlock", "futex"]
description: "Compare test-and-set spinlocks, yielding, queue locks, and sleeping mutexes for short and long critical sections."
updated: 2026-10-16
translationKey: "operating-system/lock-implementation-spin-wait"
---

A mutex API describes how to use a lock; its implementation determines how a thread waits. One choice is to **spin**, repeatedly trying the lock. Another is to block the thread and let the scheduler run something else. Each fits different workloads.

## Test-and-set spinlocks

Atomic test-and-set reads and sets a lock bit in one operation. The winner enters the critical section; other threads repeatedly try. Spinning avoids a system call and sleep/wakeup when a lock is released quickly, but consumes CPU and causes cache-line ping-pong under contention.

A normal pair of reads and writes is not enough: two threads could both read `0`, both write `1`, and both enter. Disabling interrupts is suitable only for some kernel sections on one CPU; user processes cannot arbitrarily disable interrupts, and it does not lock other CPUs on a multicore machine. Use atomic read-modify-write operations such as test-and-set, compare-and-swap, load-linked/store-conditional, or fetch-add.

Test-and-set/CAS spinlocks provide mutual exclusion but not fairness by themselves; a waiter can lose indefinitely. A ticket lock uses `fetch_add` to assign turns, so threads progress in better FIFO order, but all waiters still spin on the turn variable.

On a single-core CPU, a spinning thread may prevent the lock owner from running and releasing the lock if scheduling does not preempt appropriately. Spinlocks therefore usually suit kernel or very short critical sections under known scheduler assumptions.

## Yielding and queues

Yield gives up the CPU, but the same thread may be scheduled again immediately, causing repeated context switches without resolving contention. Ticket/queue locks provide a fairer waiting order and reduce starvation, at the cost of atomic operations and cache traffic.

Queue-lock sleep/wakeup must avoid a race between “put myself in the queue and prepare to sleep” and “owner releases the lock and wakes a waiter.” If the wakeup occurs just before the waiter parks, it must not sleep forever. Kernel APIs may provide a protocol such as `setpark`/`park`; futex wait checks that the value still matches the expected value before sleeping, avoiding sleep based on a state that has already changed. On unlock, a mutex may hand ownership directly to the next waiter instead of opening the lock and letting all threads race again.

## Sleeping mutexes and futexes

A user-space mutex may use an atomic fast path when the lock is free and call a kernel primitive such as futex only under contention. Uncontended operations then avoid a system call, while long waiters do not burn CPU.

Futex details are Linux-specific; other runtimes and operating systems have their own mechanisms. Consider priority inversion too: a high-priority thread waiting on a low-priority owner's lock may need priority inheritance under the applicable policy.

## Adaptive spinning

A mutex may spin briefly and then sleep if the owner is likely to release soon. Thresholds depend on CPU count, owner scheduling, critical-section length, and contention; there is no universal value.

### Exercise: inspect interleavings and wait costs

In a simulator or instruction trace, compare in order: non-atomic flag reads/writes, test-and-set, Peterson's algorithm for two threads, ticket lock, spin-then-yield, and test-and-test-and-set. For each, schedule interruptions during acquire/release and separately check **mutual exclusion**, **progress/deadlock**, and **fairness**—they are distinct properties. After correctness checks, increase critical-section iterations and thread count, then count spin instructions, yields, or atomic attempts. Correct results on a few traces do not prove correctness for every schedule; a simulator also models only particular instructions and memory ordering.

## Summary

- A spinlock waits in a CPU loop; it is quick for brief contention but costly for long waits.
- Yield does not guarantee that the owner runs immediately.
- A mutex can use an atomic fast path and sleep in the kernel when needed.
- Queue locks can improve fairness while adding state and traffic.
- Priority inversion and scheduler policy affect lock latency.
- Correctness, progress, and fairness are separate properties to evaluate.

## Check your understanding

**Is a spinlock always faster than a mutex because it avoids a system call?** No. CPU use and cache contention can cost more.

**Does yielding solve starvation?** Not necessarily.

**Does using a futex send every uncontended lock operation into the kernel?** Usually the fast path stays in user space; contention needs the kernel.

## Read next

With several locks in a larger structure, define acquisition order clearly and watch for deadlocks.

---
title: "Concurrency Bugs: Atomicity, Ordering, and Lost Wakeups"
category: "Operating System"
tags: ["concurrency", "race condition", "ordering", "deadlock"]
description: "Classify common concurrency bugs and turn invariants into specific synchronization mechanisms."
sources:
  - title: "C++ draft: Order and consistency"
    url: "https://eel.is/c%2B%2Bdraft/atomics.order"
  - title: "The Open Group: pthread_cond_wait"
    url: "https://pubs.opengroup.org/onlinepubs/7908799/xsh/pthread_cond_wait.html"
updated: 2026-10-17
translationKey: "operating-system/concurrency-atomicity-ordering-bugs"
---

A race can do more than produce a wrong value in one variable. A thread may observe a partially updated state, a signal may arrive before a waiter sleeps, or reordering may publish data in the wrong order. Classifying the bug helps select the right primitive.

## Atomicity violation

A logical operation has multiple steps, and another thread interleaves between them. For example, checking `balance >= amount` and then deducting money: each individual read or write may be atomic, but the whole check-then-act operation is not. A lock around the invariant or a suitable transaction is needed.

## Ordering violation

A producer writes a payload and then sets `ready=true`; seeing the flag proves the payload was published only if the protocol creates the required synchronization relationship. In C++, unsynchronized concurrent access to an ordinary payload may be a data race with undefined behavior; in an atomic protocol, reading the flag with relaxed ordering still does not publish the payload by itself. Use a mutex or channel, or a release store to the flag and an acquire load that reads from that store ([C++ draft](https://eel.is/c%2B%2Bdraft/atomics.order)). In some languages, `volatile` only prevents certain optimizations; it does not replace thread synchronization.

## Lost wakeup and predicates

A condition variable does not save a notification for a waiter that arrives later. If the predicate is protected by the same mutex, the waiter checks it in a `while` loop and calls `wait`; the API releases the mutex and blocks the waiter as one atomic operation. The producer locks that mutex to change the predicate, then notifies. On waking, the waiter reacquires the mutex and checks the predicate again, because a notification does not guarantee that the condition is still true when it runs ([The Open Group](https://pubs.opengroup.org/onlinepubs/7908799/xsh/pthread_cond_wait.html)).

## Lock order and deadlock

Two threads acquiring locks in opposite orders can form a cycle. Apply a global order, combine locks, or use ownership/message passing. Document a lock hierarchy and keep it consistent across all code paths.

## Finding bugs

- Draw the state/invariant and list every reader and writer.
- Mark synchronization edges: mutex, atomic, channel, or join.
- Consider lifetime and reclamation when pointers are shared.
- Use a race detector/thread sanitizer and stress schedules; they help find bugs but cannot prove their absence.
- When possible, create deterministic tests or barriers to force a suspicious interleaving.

## Summary

- Atomicity violations let another thread interleave with a multi-step operation.
- Ordering violations publish data in an invalid order.
- Lost wakeups result when predicate checks and waits are not synchronized.
- Inconsistent lock order causes deadlock.
- Detection tools help, but invariants and the memory model still need to be understood.

## Check your understanding

**Does making each variable atomic make check-then-act safe?** No.

**Is `volatile` always enough for producer-consumer?** No.

**Does a passing race detector mean there are no races?** No; it only observes executions that ran.

## Further reading

Barriers and producer-consumer are common coordination patterns; see how to organize synchronization by phase.

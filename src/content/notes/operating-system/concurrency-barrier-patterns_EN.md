---
title: "Synchronization Patterns: Barriers, Producer–Consumer, and Rendezvous"
category: "Operating System"
tags: ["concurrency", "barrier", "producer consumer", "synchronization"]
description: "Use barriers to synchronize phases and coordinate producers and consumers through a queue with backpressure."
updated: 2026-10-16
translationKey: "operating-system/concurrency-barrier-patterns"
---

Primitives such as mutexes and semaphores are tools; a pattern describes how multiple threads use them to achieve a goal. Familiar patterns help reasoning, but still require checking the number of producers and consumers, shutdown, and failures.

## Bounded-buffer producer–consumer

A queue has capacity N. Producers wait when it is full; consumers wait when it is empty. A mutex protects head and tail; condition variables use `not_empty` and `not_full` predicates, or two semaphores count slots and items. A bounded queue creates backpressure instead of letting memory grow without limit.

Shutdown needs a sentinel, cancellation, or closed state; waiters must be awakened so they can exit. If a producer fails without notifying consumers, the system may wait forever.

## Barrier

A barrier divides a computation into phases. Each thread performs its part of the current phase, then waits until N threads reach the barrier; all then proceed to the next phase. If a thread fails or returns before the barrier, the others may deadlock. The barrier API needs cancellation/broken-state semantics, or a coordinator must ensure every participant arrives.

A barrier synchronizes a point; it does not protect data throughout a phase. Writes before the barrier may be published according to the API, but rules are still needed if several threads write after it.

## Rendezvous and pipelines

A rendezvous requires two parties to meet to exchange a value or acknowledge a step. A pipeline divides computation into stages linked by queues; each stage has its own concurrency. Queue capacity controls backpressure and memory use; a slow stage fills the upstream queue.

## Summary

- A bounded queue coordinates producers and consumers while limiting memory.
- Shutdown is part of the protocol, not an arbitrary act of closing a channel or queue.
- A barrier synchronizes phases but must handle a thread that never arrives.
- A pipeline may improve throughput, but its slowest stage limits the whole system.
- Primitives need clear predicates and lifecycle rules.

## Check your understanding

**Does an `items` semaphore protect queue pointers?** No; a mutex or concurrent-queue implementation is needed.

**Does a barrier make every thread finish at the same time?** No; it only prevents moving to the next phase until all participants arrive.

**Does a larger queue always increase throughput?** No; it may increase latency and hide downstream overload.

## Further reading

Event loops and worker pools combine queue and consumer patterns at the application level.

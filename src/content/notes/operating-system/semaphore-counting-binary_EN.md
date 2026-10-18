---
title: "Counting Semaphores, Binary Semaphores, and Mutexes"
category: "Operating System"
tags: ["concurrency", "semaphore", "mutex"]
description: "Distinguish a semaphore as a permit counter from a mutex with ownership, then choose the right primitive for an invariant."
updated: 2026-10-16
translationKey: "operating-system/semaphore-counting-binary"
---

A semaphore stores a counter of permits. `wait/P` decrements the counter when a permit is available; otherwise it blocks. `post/V` increments the counter and may wake a waiter. A counting semaphore represents the number of available resources. A binary semaphore restricts the count to 0 or 1, but does not necessarily have mutex-style ownership.

## A resource pool

If a pool has N connections, initialize the semaphore with N permits. Each worker takes a permit before using a connection and returns it when finished. Every error path must return its permit, or the pool will leak logical capacity.

## Producer/consumer synchronization

The `empty` semaphore counts free slots, `full` counts available items, and a mutex protects the queue structure. Wait/post ordering must be consistent so a thread does not hold the mutex while waiting for a condition that can only be produced by another thread that needs the same mutex.

## How it differs from a mutex

A mutex has an owner, and usually only that owner may unlock it; it represents access to a critical section. A semaphore can be posted by another thread and represents a permit or event. Using a semaphore as a mutex can make ownership and misuse errors harder to recognize.

## Check your understanding

**Can a semaphore count exceed 1?** Yes, for a counting semaphore.

**Does a semaphore protect the queue data by itself?** No; a separate mutex is usually needed.

**Can another thread post a permit?** Usually yes, according to semaphore semantics.

## Further reading

A condition variable wakes a thread so it can recheck a predicate protected by a mutex, rather than storing a permit like a semaphore.

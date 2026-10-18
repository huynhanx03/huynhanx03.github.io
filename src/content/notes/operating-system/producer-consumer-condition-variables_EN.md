---
title: "Producer–Consumer with a Condition Variable"
category: "Operating System"
tags: ["concurrency", "condition-variable", "queue"]
description: "Build a correct bounded buffer with a mutex and condition variables, handle spurious wakeups, and avoid lost wakeups."
updated: 2026-10-16
translationKey: "operating-system/producer-consumer-condition-variables"
---

A bounded buffer has finite capacity. A producer waits when the buffer is full; a consumer waits when it is empty. A mutex protects the queue state, while a condition variable lets a thread sleep until the condition may have changed.

## The predicate is the source of truth

The consumer holds the mutex and loops while `queue.empty(): cond.wait(mutex)`. `wait` atomically releases the mutex and sleeps; when awakened, it reacquires the mutex before continuing. Once the queue is nonempty, the consumer removes an item while holding the same mutex.

The producer does the same for the `queue.full()` condition. When it adds an item, it signals the consumer's condition; when it removes an item, it signals the producer that a slot is free. One condition with `broadcast`, or two separate conditions (`notEmpty`, `notFull`), may be used to reduce unnecessary wakeups.

## Why use `while`, not `if`?

A thread can wake even when the condition is no longer true (a spurious wakeup), or another thread may take the item before this thread reacquires the mutex. A signal only says the state may have changed; it does not reserve an item for the awakened thread. Therefore, check the invariant again while holding the mutex.

Lost wakeups are avoided when both changing and checking the predicate are protected by the same mutex. Do not treat a condition variable as a stored event: if a signal happens before a waiter sleeps, it may be gone. The actual state is in the predicate, such as `queue.empty()`.

## Shutdown

The system needs a shutdown flag protected by the mutex, followed by a broadcast to wake all waiters so they can exit and be joined. If shutdown only signals one waiter, others may sleep forever.

## Check your understanding

**Does a condition signal guarantee an item is reserved for the awakened thread?** No.

**Why use `while` instead of `if`?** Recheck the predicate after every wakeup.

**Who holds the mutex when `wait` returns?** The awakened thread reacquires it before continuing.

## Further reading

Semaphores store counts or signals with different semantics; choose a primitive based on the invariant you need to protect.

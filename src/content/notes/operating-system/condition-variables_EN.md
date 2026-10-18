---
title: "Condition variables: sleep until a condition may be true"
category: "Operating System"
tags: ["concurrency", "condition variable", "mutex"]
description: "Understand wait and signal, predicate loops, and why a notification is not data."
sources:
  - title: "The Open Group: pthread_cond_wait"
    url: "https://pubs.opengroup.org/onlinepubs/7908799/xsh/pthread_cond_wait.html"
updated: 2026-10-17
translationKey: "operating-system/condition-variables"
---

If a consumer repeatedly asks “does the queue have an item yet?”, it wastes CPU while the queue is empty. A condition variable lets a thread sleep and be woken when notified that related state may have changed.

A condition variable does not store the predicate for the program. The actual condition lives in data protected by a mutex, such as `queue.size() > 0`. A notification means “check again”; the thread must read the state while holding the lock.

## Producer-consumer pattern

```text
consumer:
  lock(mutex)
  while queue is empty:
    wait(condition, mutex)
  remove an item from the queue
  unlock(mutex)

producer:
  lock(mutex)
  add an item to the queue
  signal(condition)
  unlock(mutex)
```

APIs commonly guarantee that `wait` atomically releases the mutex as it begins sleeping and reacquires it before returning. The producer uses the same mutex to change the predicate, so it cannot slip between the consumer's predicate check and the start of its wait ([The Open Group](https://pubs.opengroup.org/onlinepubs/7908799/xsh/pthread_cond_wait.html)). Confirm the semantics of the specific language or API.

## Why use `while`, not `if`?

A thread can wake even though the condition remains false (spurious wakeup), another thread may take the item first, or a notification may wake several waiters when only one item exists. The `while` loop rechecks the predicate after reacquiring the protecting mutex.

With `if (queue is empty) wait(); remove item`, the queue may still be empty after waking and the operation can fail. This is a common logic bug caused by treating a notification as if it carried an item.

## Signal, broadcast, and lost wakeups

`signal` usually wakes one waiter; `broadcast` wakes several. Choose based on how many threads can make progress. Broadcast can create a thundering herd if many threads compete for the same condition.

Under Mesa semantics (common in practice), signaling makes a waiter runnable; it does not hand over the mutex immediately or guarantee that the predicate remains true when the waiter runs. The waiter must reacquire the lock and recheck the condition in a `while` loop. Hoare semantics assumes the waiter runs immediately after a signal, but is harder to implement and is not the usual POSIX behavior. Holding the mutex while updating the predicate and signaling is easiest to reason about, although some APIs allow signaling after unlocking.

A lost wakeup can happen if the predicate is checked without synchronization and the thread begins waiting afterward: the producer changes the predicate and signals in between, then the consumer sleeps after the notification and may sleep forever. Both waiter and producer must use the same mutex when checking or changing the predicate; `wait` atomically releases the mutex and begins waiting under the API's semantics, closing that gap.

Sometimes one condition variable serves several different predicates, and `signal` may wake a waiter that cannot proceed. If the correct waiter cannot be selected, a **covering condition** uses `broadcast`: every thread wakes, takes the lock, and checks its own predicate. This is correct but may wake unnecessarily; if broadcast is the only way the code works, check whether predicates or condition variables should be separated.

## When `signal` wakes the wrong waiter

Suppose two threads await allocations of 20 and 10 bytes. When only 15 bytes are freed, `signal` may wake the thread needing 20 bytes. It checks its predicate, sees insufficient memory, and sleeps again; the thread needing 10 bytes remains asleep even though it could proceed. If there is no way to select the right waiter, `broadcast` wakes both so each can recheck. This is a covering condition: it trades extra wakeups and lock contention for correctness, but can create a thundering herd when many waiters wake and only a few can progress.

A monitor binds data and operations to an implicit mutex: only one thread is inside the monitor at a time. A counting semaphore can be built with a monitor: `wait` waits while the permit count is zero, then decrements it; `post` increments the count and signals a waiter. With pthreads, an implicit monitor becomes an explicit mutex; `pthread_cond_wait` receives the mutex, releases it while sleeping, and reacquires it before returning.

Some languages provide monitors directly. Java uses `synchronized` to protect a method or object. Early single-condition `wait/notify` APIs may wake the wrong waiter type in producer-consumer code; `notifyAll` is correct but can wake extra threads. Multiple condition variables or separate `Condition` objects for each predicate help target the right waiters.

## Timeouts and cancellation

A timed wait needs to recheck the predicate after waking; a timeout does not prove that the condition cannot become true immediately afterward. Canceling a waiting thread must leave the mutex and invariants in a valid state. Use the API's cleanup mechanism rather than assuming a thread can disappear without consequences.

## Summary

- The predicate lives in application state; a condition variable coordinates waiting.
- `wait` commonly releases the mutex while sleeping and reacquires it before continuing.
- Always check the predicate in a `while` loop after waking.
- A signal is not data and does not guarantee that the condition is true.
- Broadcast, timeouts, and cancellation need to fit waiter count and invariants.

## Check your understanding

**Does receiving a signal prove that the queue has data?** No. Recheck the predicate under the mutex.

**Can `if` safely replace `while`?** No. Spurious wakeups or another thread taking the resource can make the predicate false again.

**Does a condition variable replace a mutex?** No. The mutex protects the predicate and shared state.

## Read next

A semaphore also lets threads wait, but it stores a count of permits instead of being tied directly to an arbitrary predicate.

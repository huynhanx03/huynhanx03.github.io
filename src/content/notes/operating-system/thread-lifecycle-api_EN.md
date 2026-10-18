---
title: "Thread APIs: creating, joining, and ending threads"
category: "Operating System"
tags: ["thread", "pthread", "concurrency"]
description: "Understand thread lifecycles, joining, result passing, and common errors caused by unmanaged lifetimes."
updated: 2026-10-16
translationKey: "operating-system/thread-lifecycle-api"
---

A thread is an execution flow with its own program counter, registers, and stack. It usually shares process-level resources such as the heap and file descriptors. Thread APIs let a program create workers, wait for results, and decide when thread resources can be reclaimed.

Each thread has its own PC and registers. When a CPU switches threads, the runtime or kernel saves the old thread's state and restores the new one. Because threads in a process share an address space, switching between them usually does not require changing the page table as switching to another process would. Each thread also needs a stack for local variables, arguments, and return addresses. Multiple stacks make the address-space layout more complex and consume space; a stack that is too large or deep recursion can hit a limit or guard page.

## Creating a thread does not determine when it runs

After a thread is created, the scheduler may run it immediately, continue the calling thread, or interleave both. Do not infer execution order from creation order. If the main thread needs data produced by a worker, it must wait or synchronize instead of reading immediately.

A conceptual C/POSIX example:

```c
pthread_t worker;
pthread_create(&worker, NULL, run_task, argument);
pthread_join(worker, NULL);
```

This is illustrative code. A real program needs the proper header, error checking, and a function with the correct signature. POSIX `pthread_join` waits for a joinable thread to finish and collects its status and related resources.

In POSIX C, `pthread_create` takes a function pointer of type `void *(*start_routine)(void *)`, one `void *` argument, and optional thread attributes (often left at their defaults). `pthread_join` can receive the result through a `void **`. Since `void *` is flexible, the caller and worker must agree on the data type, casting, and ownership. Do not return a pointer to a worker's local stack variable: that storage's lifetime ends when the function returns. Use allocated storage with clear ownership, an object that outlives the worker, or a suitably protected result structure.

## Joining and lifecycle

Joining gives the calling thread a point at which it waits for the worker to finish. If the caller does not need to wait for a result but still needs the runtime to reclaim resources appropriately, an API may support detached threads. Details depend on the runtime. Failing to join or detach correctly can leak metadata or let the program exit before a worker finishes.

Do not keep a pointer to a parent's stack variable for a worker to use after that variable's lifetime ends. Also decide who owns arguments and results and who frees them. Lifetime errors are often mistaken for data races.

## Passing results

A thread can write a result into a structure passed through a pointer; the parent can read it after joining. The join synchronization point generally ensures that writes completed before the worker exits are visible to the joining thread under the API and memory model. If several workers write the same structure, they still need partitioned output or synchronization.

A good pattern is to give each worker its own output region, then combine the results after joining. This reduces locking and clarifies ownership. If a worker must stop early, cancellation APIs require cleanup rules; do not forcibly terminate a thread while it holds a lock or updates shared data.

## Thread pools

Creating a thread for every task can be expensive and can cause the thread count to grow without control. A thread pool keeps a fixed set of long-lived workers and places tasks in a queue. A pool needs policies for its size, backpressure, errors, shutdown, and pending tasks.

A pool that is too small can become blocked by tasks doing synchronous I/O; a pool that is too large increases context switching and contention. Choose worker counts based on the workload and measurements, rather than always setting them equal to the number of CPUs.

## Summary

- Threads share much process state but have separate flows of control.
- The scheduler determines execution order; creating a thread does not guarantee when it runs.
- Join and detach define how a thread's lifecycle is collected and completed.
- Passing pointers requires clear ownership and lifetime rules.
- A thread pool avoids repeated creation costs but needs planned backpressure and shutdown.

## Check your understanding

**Does a new thread always run after the `create` call?** No. The scheduler may run it immediately.

**Does joining protect every object shared by other threads?** No. It synchronizes at the completion boundary of the thread being joined.

**Will more pool workers always make a program faster?** No. Too many workers can increase contention and context switches.

## Read next

Next: [Locks and mutexes](/en/notes/operating-system/locks-and-mutexes/).

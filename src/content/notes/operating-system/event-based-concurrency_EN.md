---
title: "Event-based concurrency: event loops and asynchronous I/O"
category: "Operating System"
tags: ["concurrency", "event loop", "asynchronous io"]
description: "Understand event loops, callbacks, blocking, and how event-based design trades code structure against thread count."
updated: 2026-10-16
translationKey: "operating-system/event-based-concurrency"
---

A server can create a thread per connection, or use an event loop to monitor many sockets and handle them when events occur. Event-based concurrency reduces the number of threads to manage for large I/O workloads, but each handler must avoid blocking the event loop for too long.

## The event loop

A typical event loop repeats:

1. Wait for a set of events such as socket-readable/writable, timer, or completion.
2. Collect events that are ready.
3. Call the appropriate handler.
4. Register the next operation to wait for and return to the loop.

An API may provide readiness (a file descriptor is ready to try I/O) or completion (the operation has finished). `select`, `poll`, `epoll`, `kqueue`, and I/O completion APIs have different semantics and limits.

`select`/`poll` are readiness APIs: they report which descriptors can be read or written without immediately blocking; the application still calls I/O and handles results including partial reads/writes, EOF, and errors. With completion-style asynchronous file I/O, the application submits a control block containing the descriptor, offset, buffer, and byte count; the call returns before the I/O completes, then the program polls status or receives a notification to continue. Polling many requests continuously costs work; completion notifications avoid some polling but require callback/state management.

## A blocking call stalls the loop

If a handler processes a request and then calls a blocking disk read for 500 ms, the event loop may fail to process other sockets during that period. Use a suitable asynchronous API, move the blocking task to a worker pool, or split the work into smaller steps.

Moving everything to a worker pool also has limits: the pool can run out of workers, queues can grow, and deadlines can expire. Use backpressure and resource bounds.

## Callbacks, futures, and state machines

Callbacks split work into steps; control flow may be scattered across functions. A future/promise or async/await provides a more sequential style on an asynchronous runtime, but does not remove cancellation, timeout, or ownership costs.

When a request waits on several events, an explicit state machine helps track the current step, retained data, and error handling. Deeply nested callbacks are not required by event-driven design.

A thread naturally keeps its continuation on the stack: after `read`, the variable `socket` remains in the same stack frame for a later `write`. An event handler must save data needed for the next step—the continuation may be an object or state machine looked up by request or file descriptor. This is manual stack management: it reduces dependence on thread stacks but makes code and buffer/request lifetime more complex. Buffers for asynchronous I/O must remain alive until completion.

## An event loop does not remove races automatically

A single loop can serialize its handlers, but an application may have several loops, worker threads, reentrant callbacks, or shared state outside the loop. Event-driven code still needs to define ownership and synchronization across parallel boundaries.

Event models do not eliminate hidden blocking. A page fault when a handler touches data can block the whole loop even if the API is called nonblocking; changing a library from nonblocking to blocking also forces changes to the handler/state machine. When asynchronous disk I/O is unavailable, a hybrid design can let the event loop handle sockets while a worker pool handles disk I/O. Multiple loops running in parallel on multiple CPUs need synchronization just like ordinary threads.

## When to choose each model

Thread-per-task is easy to understand when task count is moderate and blocking is suitable. An event loop is useful with many concurrent I/O operations and an appropriate runtime API. A thread pool suits CPU work or blocking APIs. Many systems combine all three.

## Summary

- An event loop waits for events and calls handlers for ready resources.
- Blocking in a handler can prevent processing other events.
- Worker pools isolate blocking tasks but need queue bounds and backpressure.
- Async abstractions do not automatically solve cancellation, timeouts, or ownership.
- Event-driven code can still race when multiple loops/workers share state.

## Check your understanding

**Does an event loop mean there are no threads?** No. There is commonly one or more loop threads and workers.

**Does async/await automatically make I/O faster?** No. It changes how waiting is coordinated; device and server limits remain.

**Is a single event loop guaranteed to have no races?** Only state serialized on that loop; shared state elsewhere still needs synchronization.

## Read next

Connect event loops to the Network topic to see which socket readiness and TCP events reach applications.

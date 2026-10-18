---
title: "Signals and Interprocess Communication"
category: "Operating System"
tags: ["operating-system", "process", "signal", "ipc"]
description: "Understand signals as asynchronous notifications, compare pipes, sockets, and shared memory, and choose IPC for the task."
updated: 2026-10-16
translationKey: "operating-system/signals-interprocess-communication"
---

Processes often need to coordinate: request another process to stop, send data, or work on a task together. A signal is a small asynchronous notification; IPC provides more structured ways to exchange data and synchronize.

## A signal is not a data packet

The kernel may send a signal after an event such as Ctrl-C in a terminal, an invalid memory access, or another process calling `kill`. A process may handle a signal, ignore it, or use its default action; signals such as `SIGKILL` cannot be caught or ignored. A signal usually reports the event type and does not carry arbitrary payload data.

A handler runs in an asynchronous context and has strict limits: not every library function is safe to call inside it. In C, a basic pattern is for the handler to assign a `volatile sig_atomic_t`; [POSIX permits handlers to call only async-signal-safe operations](https://pubs.opengroup.org/onlinepubs/9799919799/functions/V2_chap02.html). A handler can also use `write` on a nonblocking self-pipe to wake an event loop, which then does complex work outside the handler. In a multithreaded program, choose which thread receives signals explicitly; a common pattern blocks them in worker threads and handles them with `sigwait` in a dedicated thread.

## Choosing IPC

- **Pipe/FIFO:** a byte stream, useful between parent/child processes or shell commands.
- **Unix domain socket:** bidirectional communication on one machine, using the socket API and filesystem permissions.
- **TCP/UDP socket:** communication across machines or network namespaces, with the corresponding transport behavior.
- **Shared memory:** exchanges large data with fewer copies, but needs synchronization to avoid races.
- **Message queue:** messages with boundaries and queuing, depending on the OS API.

IPC does not solve every problem automatically. Define framing, handle partial reads and writes, close unused ends, set timeouts, handle peer failures, and authenticate access.

## Lifecycle and failure detection

When a process exits, the other side of a pipe or socket may get EOF or an error; shared memory may remain with partially updated data. A protocol should detect a lost peer, cancel incomplete work, and clean up resources. For parent/child processes, `wait` or `waitpid` collects the exit status and avoids zombies.

## Check your understanding

**Is a signal suitable for transferring a large file?** No; use an IPC data channel.

**Does shared memory prevent races automatically?** No; use a mutex, semaphore, or synchronization protocol.

**What does EOF on a pipe mean?** All write ends have been closed.

## Further reading

When multiple processes update a shared resource, locks and synchronization rules preserve invariants.

---
title: "Linux Thread, Signal Masks, and Process Lifecycle"
category: "Operating System"
tags: ["linux", "process", "thread", "signal"]
description: "Distinguish processes and threads in Linux, understand process-directed and thread-directed signals, and wait for process exit."
updated: 2026-10-16
translationKey: "operating-system/process-thread-signal-lifecycle"
---

Linux represents schedulable tasks with a common kernel structure. Traditional processes and threads differ mainly in which resources they share and how userspace sees them. `clone` can create a task with a chosen combination of shared address space, file table, signal handlers, and namespaces.

## Processes and threads

Threads in one process typically share an address space, file descriptors, and many other resources, but each thread has its own stack, registers, thread ID, and signal mask. `getpid()` usually returns the shared thread-group ID; `gettid()` identifies a specific Linux thread.

## Signal delivery

A signal may target a process or thread group, or a specific thread. For a process-directed signal, the kernel chooses a thread that has not blocked it. A synchronous signal caused by an instruction fault is generally associated with the thread that caused it. Signal masks are per-thread, while dispositions and handlers are usually shared within a process.

## Exit and collecting status

A thread can exit independently; a process exits when its thread group has no remaining threads, except for special semantics. The parent uses `wait` or `waitpid` to collect a child's status. If an exited child is not reaped, a zombie entry remains in the process table. A zombie does not run, but it occupies metadata.

## Check your understanding

**Does every thread have its own signal mask?** Yes, on Linux/POSIX.

**Does a zombie consume CPU?** No.

**Can a signal caused by a page fault be arbitrarily delivered to another thread?** It is associated with the thread that caused the fault.

## Further reading

Processes are created with fork/exec and are governed by scheduler policy when runnable.

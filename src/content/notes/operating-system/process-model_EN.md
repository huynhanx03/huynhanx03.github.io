---
title: "Processes: programs in execution and their states"
category: "Operating System"
tags: ["process", "operating system", "resource management"]
description: "Distinguish a program from a process, follow process states, and understand the role of the process control block."
updated: 2026-10-16
translationKey: "operating-system/process-model"
---

An executable file on disk is a static program. When the operating system creates an execution environment for it, the result is a **process**: a running unit with CPU state, an address space, permissions, and associated resources.

The same executable can be started several times to create several processes. Each can have its own data and execution flow, even though read-only code pages may be physically shared to save RAM.

## What makes up a process?

At a conceptual level, a process has:

- CPU state needed to resume, such as a program counter and registers;
- an address space and its memory mappings;
- an identity, permissions, and scheduling information;
- open resources such as file descriptors and sockets;
- one or more execution threads.

The kernel keeps metadata for managing a process, often called a **process control block (PCB)** in textbook models. Actual names and layouts vary by kernel. A PCB does not necessarily contain all of the process's RAM; it holds control information and references to resources.

## Mechanism and policy

A mechanism answers “how”: for example, a context switch saves one thread's state and restores another's. A policy answers “which one”: for example, the scheduler chooses the next runnable process. Separating them makes it possible to change a scheduling algorithm without rewriting the CPU-switching mechanism.

## Common states

A simplified state diagram is:

```text
New → Ready → Running → Exit
         ↑       ↓
         └── Blocked
```

- **New:** being created.
- **Ready:** able to run, but waiting for a CPU.
- **Running:** executing on a CPU.
- **Blocked/Waiting:** waiting for an event such as I/O, a lock, or data.
- **Exit:** finished; the kernel may retain a small amount of information for the parent to collect.

In Unix, a new process starts in an initial creation state and then becomes runnable. After it exits, it may remain a **zombie** while the kernel keeps its exit status for the parent to collect with `wait`. A zombie is no longer running and does not retain its entire address space.

Real systems have more states and finer distinctions. A process may contain several threads, each with its own execution state, while many resources are shared at process scope.

## Why can a running process be stopped?

A process can yield the CPU while waiting for I/O or a lock. A timer interrupt gives the kernel a chance to take the CPU back after some time, so one process cannot occupy it forever. A serious fault or a signal can also stop or terminate a process.

When a process moves from running to ready, the kernel saves enough state for it to resume later. If it is waiting for an event, the kernel marks it blocked and makes it ready only when the relevant event occurs. A blocked process cannot run just because a CPU is idle: the event it needs has not happened yet.

### Exercise: trace execution and I/O waits

Draw a timeline for two processes: one executes a few CPU instructions, while the other issues an I/O request and waits. At each point, record which process is running, ready, or blocked, and when the device completes the I/O. Then change the creation order. Compare a policy that switches only when the current process exits with one that switches as soon as it waits for I/O. Also vary whether the process whose I/O just completed runs immediately or waits behind the current process. Measure completion time and idle CPU time. This exercise shows how state transitions allow CPU and I/O to overlap; the exact trace depends on the scheduler and device completion time.

## Processes and threads

A process is commonly a resource and protection boundary; a thread is an execution flow within it. Threads in one process usually share an address space and file descriptors, which makes data exchange convenient but requires synchronization for shared reads and writes.

Separate processes generally isolate their addresses more strongly; they communicate through mechanisms such as pipes, sockets, or shared memory. Process and thread models vary across operating systems. Do not assume every thread maps one-to-one to a kernel entity without knowing the runtime.

## Summary

- A program is static content; a process is a managed execution environment.
- The kernel tracks CPU state, memory, identity, permissions, and resources.
- Mechanisms perform operations; policies make choices such as which process runs.
- A ready process waits for a CPU; a blocked process waits for an event.
- The kernel may retain an exit status until the parent collects it.
- Timers and interrupts help the operating system regain control.
- When a process blocks for I/O, another process can use the CPU while the device works.
- A process is commonly a resource boundary; a thread is an execution flow inside it.

## Check your understanding

**Can the scheduler run a blocked process immediately?** No. The event it awaits must first complete and make it ready.

**Are two launches of the same program one process?** No. They are usually separate processes with separate execution state.

**Can a process have more than one thread?** Yes.

## Read next

Processes use system calls to request kernel services. The next note explains the boundary between user mode and kernel mode.

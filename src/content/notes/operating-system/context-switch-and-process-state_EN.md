---
title: "Context switching and the process lifecycle"
category: "Operating System"
tags: ["operating-system", "process", "context-switch"]
description: "Follow how the kernel switches the CPU between execution flows and distinguish context-switch cost from process state."
sources:
  - title: "Intel: Hyper-Threading Technology Architecture and Microarchitecture"
    url: "https://www.intel.com/content/dam/www/public/us/en/documents/research/2002-vol06-iss-1-intel-technology-journal.pdf"
updated: 2026-10-17
translationKey: "operating-system/context-switch-and-process-state"
---

Each logical CPU executes one OS thread at a time, but a physical core with SMT can expose multiple logical CPUs so several threads make progress while sharing execution resources. Without SMT, the OS creates the impression of concurrency on one core by taking turns. When it switches threads on one logical CPU, the kernel must save the old thread's required state and restore the new thread's state ([Intel: Hyper-Threading](https://www.intel.com/content/dam/www/public/us/en/documents/research/2002-vol06-iss-1-intel-technology-journal.pdf)).

## Process and thread states

A thread may be running, ready and waiting for CPU, or blocked on an event such as I/O, a lock, or a timer. When I/O completes, the kernel changes it from blocked to runnable; the scheduler may choose it at the next opportunity. A process owns resources and an address space; a thread is the schedulable execution unit and commonly shares resources with other threads in the process.

Architectural state can expand when an ISA adds registers, such as vector/SIMD registers. The OS must preserve that state when switching threads or when an application uses the extension; eager/lazy save behavior and which state is enabled depend on CPU and OS. Adding an ISA extension therefore changes context management, not just the compiler.

## What is switched?

At a valid switch point, the kernel saves the program counter, stack pointer, registers, and other required architectural state in the thread's structure. It then switches to the target thread's stack and state and resumes execution. Depending on the design, changing address spaces may change the page-table root and reduce some TLB/cache benefits; many architectures provide mechanisms to lower this cost.

A timer interrupt can bring the CPU into the kernel so the scheduler can decide whether to continue or switch threads. Entering kernel mode but continuing the same thread is a system-call or interrupt entry, not necessarily a context switch. A context switch usually occurs when the kernel selects another thread.

## Costs and consequences

The cost is not only the instructions to save and restore registers. A new thread may make the previous thread's warm cache less useful; on multiple cores, cache coherence and migration add costs too. Still, context switching lets a blocked task yield the CPU so another can make progress.

Creating too many threads can increase stack memory, lock contention, and the number of switches. A bounded pool can stabilize a system, but a suitable count depends on workload: CPU-bound and I/O-bound tasks behave differently.

### Measuring system calls and context switches

To estimate system-call overhead, repeat a small system call and divide total time by the number of calls. To estimate process switching, let two processes on one CPU repeatedly send and receive through two pipes: when one blocks on a read, the kernel may run the other. This measures a round trip, not only context-switch cost; separate pipe/read/write overhead if you want to interpret the number.

Very short timing measurements are affected by timer resolution, timer-read cost, compiler, scheduler, interrupts, and CPU migration. Repeat enough times, measure timer baseline, pin both processes to one CPU when supported, run multiple trials, and report a distribution rather than one number. One machine's result is not a universal architectural constant.

## Check your understanding

**Does every entry into the kernel cause a context switch?** No. The kernel can handle a system call and return to the same thread.

**Does a thread blocked on I/O keep consuming CPU continuously?** No. It waits for an event and becomes runnable later.

**Does a context switch only cost register saves?** No. Cache, TLB, and migration effects can matter.

**Does a pipe ping-pong measure only context-switch cost?** No. System calls, pipes, and scheduling also contribute.

## Read next

The scheduler chooses which runnable thread runs according to latency, fairness, and throughput goals.

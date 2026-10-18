---
title: "Limited direct execution: speed with control"
category: "Operating System"
tags: ["operating system", "cpu virtualization", "trap", "kernel"]
description: "Learn why user code runs directly on the CPU and how system calls and timers preserve kernel control."
updated: 2026-10-16
translationKey: "operating-system/limited-direct-execution"
---

If the kernel simulated every user instruction in software, programs would be slow. But if a program ran on the CPU with full privileges, it could occupy the processor forever or modify system state. **Limited direct execution** addresses both concerns: user code runs directly in user mode, while controlled entry points let the CPU and kernel regain control when needed.

## User mode and kernel mode

The CPU supports privilege levels. Ordinary user instructions run directly and quickly; privileged instructions, such as changing a page table or controlling a device, are blocked. Before switching to user mode, the kernel configures safe entry points for traps and exceptions.

When an application needs a service, it makes a system call. The CPU enters the kernel through a configured entry point. The kernel validates the request, performs the work, and returns through a privileged mechanism. User code cannot choose an arbitrary address and jump into a kernel routine.

## Trap tables and responsibility boundaries

During boot, the kernel registers handlers for system calls, exceptions, and interrupts. The CPU uses the appropriate vector or identifier to enter a handler. The kernel must validate the source and state; hardware provides the mechanism for changing privilege, but it does not enforce policies such as file permissions or process ownership.

## Timer interrupts reclaim the CPU

If a user process never makes a system call and loops forever, the kernel needs a way to regain the CPU. A timer interrupt periodically transfers control to the kernel. The scheduler can preempt the process and run another task. If the timer is unavailable or incorrectly masked, one task could make the system unresponsive.

Timers also add overhead and have finite resolution; modern schedulers use more advanced tickless and timer mechanisms than a simple fixed-tick model.

## Creating a process safely

The kernel creates an address space, initializes the stack and registers, sets an entry point and required permissions, and places the process in a ready queue. During a context switch, the kernel saves the old process's state and restores the new process's state; address spaces and page tables are updated through CPU mechanisms.

## Summary

- User code runs directly on the CPU for performance.
- CPU privilege levels prevent user code from performing kernel-only operations.
- A system call or trap is a controlled entry into the kernel.
- A timer interrupt lets the kernel preempt a task that keeps the CPU.
- Hardware provides mechanisms; the kernel enforces policy and checks permissions.

## Check your understanding

**Does the kernel simulate every user instruction?** Usually not; user code runs directly with limited privileges.

**Is a system call an ordinary function jump?** No. The CPU changes privilege through a special mechanism.

**Must a process voluntarily yield before the scheduler can switch tasks?** No. Timer interrupts enable preemption.

## Read next

A scheduler distributes CPU time using queues and weights; lottery scheduling is one proportional-sharing model.

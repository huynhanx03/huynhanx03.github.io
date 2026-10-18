---
title: "Interrupts, Exceptions, and System Calls"
category: "Operating System"
tags: ["computer-architecture", "kernel", "interrupt"]
description: "Distinguish device interrupts, instruction exceptions, and deliberate system calls, and trace entry into the kernel."
updated: 2026-10-16
translationKey: "operating-system/cpu-interrupts-exceptions-and-system-calls"
---

The CPU needs to transfer control to the kernel when a device needs service, an instruction causes a fault, or a program requests an operating-system service. These events differ even though each may send the CPU to a handler at a higher privilege level.

## Device interrupts

An asynchronous interrupt reports an event such as I/O completion or a timer tick. The CPU saves the required state, looks up the vector or handler, and runs kernel code. The kernel acknowledges the event, updates data structures, may wake a waiting task, then returns or schedules another task.

## Synchronous exceptions

An exception is associated with the instruction being executed: division by zero, a page fault, or an invalid instruction. Some exceptions can be recovered from (a page fault after the kernel loads a page); others become a process signal or exception. A synchronous fault will recur if the kernel returns without fixing its cause.

## System calls

A system call is a deliberate request from userspace, such as `read`, `write`, `open`, or `fork`. The ISA provides an instruction or entry mechanism for switching into kernel mode. Before acting, the kernel checks pointers, permissions, arguments, and process state; a user pointer cannot be trusted as kernel memory.

A system call may return an error instead of completing, and some may be interrupted or return a partial result. A library wrapper commonly converts kernel error codes to the language API's convention.

## Check your understanding

**Is a page fault always a bug?** No; demand paging creates ordinary faults.

**Do a system call and a function call use the same privilege level?** A system call usually switches privilege to the kernel.

**Is a device interrupt synchronous with the current instruction?** No; it may arrive at an appropriate point independently.

## Further reading

A context switch may happen after an interrupt or system call, but not every entry into the kernel changes tasks.

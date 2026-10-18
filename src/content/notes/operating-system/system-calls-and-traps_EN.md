---
title: "System calls, traps, and the user/kernel boundary"
category: "Operating System"
tags: ["system call", "kernel", "protection", "process"]
description: "Follow an application request into the kernel, see how the CPU changes privilege, and learn why a system call is not just a function call."
updated: 2026-10-16
translationKey: "operating-system/system-calls-and-traps"
---

An application needs to read a file, create a process, or send network data, but must not freely manipulate devices and machine memory. A **system call** is a controlled interface through which a program asks the kernel to provide those services.

A library call such as `read()` may prepare arguments and enter the corresponding system call. Library APIs and system calls are not necessarily one-to-one: a library may validate data, combine operations, or use another mechanism depending on the OS.

## Transferring control

A user program runs with limited privileges. To make a system call, it places a service number and arguments according to the ABI, then executes a trap/syscall instruction provided by the CPU. The CPU enters kernel mode, selects a safe entry point, and saves state for the kernel to handle. The kernel checks pointers, arguments, identity, and permissions before accessing resources.

After processing, the kernel returns a result or error according to the ABI and restores user mode. An application cannot elevate privileges simply by jumping to a kernel address; hardware and page-table configuration enforce the protection boundary.

## System calls, traps, interrupts, and exceptions

- **System call:** a program deliberately requests a service.
- **Interrupt:** an asynchronous event, commonly from a device or timer, that needs CPU attention.
- **Exception/fault:** a condition raised while an instruction executes, such as division by zero or a page fault.
- **Trap:** an architectural term for a special control-transfer mechanism; exact classification differs among documents and ISAs.

These events can all enter the kernel, but their causes and continuation behavior differ. A timer interrupt lets the scheduler regain the CPU; a page fault lets the kernel load a page or report an error; a system call starts with an application request.

## Why does a system call have a cost?

Changing privilege requires saving/restoring state and running kernel logic. The operation may also wait for a device or be rescheduled. But do not assume all system calls cost the same: a short call may complete quickly, while a `read` from a slow device may block. Combining operations can sometimes reduce overhead, but changed semantics and buffering also matter.

The kernel must validate data coming from userspace. A pointer may be invalid or memory may change between checks; kernel APIs must handle this safely. This is why system calls have explicit limits and errors instead of trusting every application argument.

## Errors are part of the contract

If a file does not exist, access is denied, or a socket is closed, the kernel returns an error status. A library wrapper may expose it as a return value, error code, or exception depending on the language. Applications need to distinguish retryable errors, configuration problems, and permanent failures.

Not every error means the kernel failed the entire operation. A write that returns fewer bytes than requested may be a partial write, and the caller may need to continue. Read the API contract instead of treating a success return as a guarantee that every byte reached its final destination.

## Summary

- A system call lets a user program request protected kernel work.
- The CPU changes privilege through an architectural mechanism; the kernel validates arguments and permissions.
- System calls, interrupts, and exceptions have different causes even though each can enter the kernel.
- Cost depends on the operation; waiting for I/O differs from a mode switch alone.
- System-call results have specific semantics, including partial success and errors.

## Check your understanding

**Is every library function call a system call?** No. It may run only in userspace or call the kernel when needed.

**Are interrupts and system calls the same because both enter the kernel?** No. An interrupt is commonly asynchronous; a system call begins with a deliberate program request.

**Does a successful network write system call mean the data reached the remote machine?** No. It reports success according to the sending layer's contract, not application acknowledgment or remote processing.

## Read next

Next: create and finish processes with operations such as `fork`, `exec`, and `wait`.

---
title: "Process creation: fork, exec, and wait"
category: "Operating System"
tags: ["process", "fork", "exec", "unix"]
description: "Understand three operations for creating, replacing, and collecting process results in the Unix model."
updated: 2026-10-17
translationKey: "operating-system/process-creation-and-exec"
---

On Unix-like systems, process creation is commonly taught through three operations: `fork` creates a child process from the parent's state; `exec` replaces the current program image with another program; `wait` lets the parent collect the child's termination status. These are Unix-family APIs, not rules for every operating system.

## `fork`: create a new execution branch

After `fork`, parent and child continue running after the call. They receive different return values to distinguish their roles: the parent receives the child's PID, and the child receives 0; errors are reported separately. The processes have logically separate address spaces even though their initial contents may be physically shared through copy-on-write.

File descriptors are inherited according to OS rules and commonly refer to the same open file description, so offsets or file state may be shared. This can surprise programs that assume the child receives a fully independent copy of every resource.

```c
pid_t pid = fork();
if (pid < 0) {
    /* handle error */
} else if (pid == 0) {
    /* child */
} else {
    /* parent: pid is the child's PID */
}
```

This is illustrative C code; a real program needs the right headers and error handling. After `fork`, do not assume a fixed execution order between parent and child without synchronization.

If the process has several threads, the child keeps only the thread that called `fork`; mutex state held by another thread can be copied in a locked state that the child cannot clear. POSIX therefore restricts the child to async-signal-safe functions before it calls `exec`. Keep the interval between `fork` and `exec` very short; see [`fork(2)`](https://man7.org/linux/man-pages/man2/fork.2.html).

## `exec`: replace the program image

The `exec` family loads a new executable into the current process. The PID usually stays the same; code, data, and address space are replaced by the new image. On success, `exec` does not return to the old code. On failure, it returns an error for the existing program to handle.

A common pattern is for a child to `fork` and then `exec` another command. A shell can set up pipes and redirect file descriptors, then let the child execute the target program. This separates process creation from executable selection.

## `wait`: collect the child's result

When a child exits, the kernel retains minimal information so the parent can learn its termination status. The parent calls `wait` or `waitpid` to collect it; if the child is not ready, the call may block. A process that has exited but not yet been collected is commonly called a zombie—it is no longer running and no longer holds the full address space of a live process.

The parent need not wait immediately. It can do other work and collect the child later. If the parent exits first, reparenting behavior depends on the OS and process-management mechanisms.

## Why are these APIs useful?

Separating `fork`, resource setup, `exec`, and `wait` lets a shell compose programs, pipelines, and redirection. Each child can receive file descriptors prepared before the new image starts. The OS still checks executable permissions, environment, and resource limits.

### Exercise: connect the APIs into a pipeline

Write a small program that creates a child with `fork`, calls an `exec` variant in the child, and collects its status with `waitpid` in the parent. Compare passing arguments as an array with passing them individually; verify that after successful `exec`, the child does not continue through the old code. Then open a file before `fork` and observe the inherited descriptors and shared open-file state; add synchronization to distinguish guaranteed order from incidental order. Finally create two children, connect a pipe to stdout/stdin, and close unused pipe ends in each process, or EOF may never arrive. These are experiments to understand Unix semantics; error behavior, buffering, and available APIs depend on the OS and runtime.

On another system, process creation may use a single-step API or a different mechanism. Language runtimes may provide their own abstraction. For portable code, use APIs supported by the runtime rather than assuming Unix semantics.

## Summary

- `fork` creates a child; parent and child continue independently after the call.
- Copy-on-write can avoid immediately copying all memory contents.
- `exec` replaces the running program image; on success, it does not return.
- `wait` collects the status of an exited child.
- Inherited file descriptors and resources have semantics worth checking.
- `waitpid` selects a particular child; pipes connect process output and input through file descriptors.

## Check your understanding

**Does `exec` create a new PID?** Usually not; it replaces the image in the current process.

**Do parent and child run in a fixed order after `fork`?** Not without synchronization.

**Is a zombie still running in the background?** No. It has exited; the kernel retains status until collected.

## Read next

When multiple processes are ready, the scheduler decides who uses the CPU. The next note builds scheduling goals.

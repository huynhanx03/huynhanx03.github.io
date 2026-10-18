---
title: "Observing Linux processes: state, CPU time, and load average"
category: "Operating System"
tags: ["linux", "process", "monitoring", "scheduling"]
description: "Read ps, top, /proc, and load average correctly; avoid confusing high load with constant CPU saturation."
updated: 2026-10-16
translationKey: "operating-system/linux-process-observation"
---

The scheduler chooses what runs, but when a machine is slow we need to observe process state and resource use. `ps`, `top`, `/proc`, and statistics tools provide different views; no single column fully answers “why is it slow?”

## Process state is not CPU percentage

`ps` commonly distinguishes running or runnable, interruptible sleep, uninterruptible sleep, stopped, and zombie states, with symbols that vary by tool. A runnable process may be running or waiting for CPU. A sleeping process may be waiting for I/O or a synchronization event; low CPU use does not prove it is healthy.

A zombie has exited but has not yet been collected by its parent; it does not consume CPU like a running process. Uninterruptible sleep often involves waiting for a kernel operation or resource; sending a termination signal does not necessarily make the wait disappear immediately.

## CPU time and wall-clock time

Wall-clock time measures elapsed time from start to finish. User CPU time measures execution in user mode; system CPU time measures kernel work on behalf of the process. A task taking 10 seconds but using only 1 second of CPU may have spent most of its time waiting for I/O or a lock.

On a multi-core machine, total CPU time across threads can exceed wall-clock duration because multiple threads run in parallel. A tool's CPU percentage may be normalized per core or across the whole machine; read its documentation.

## Load average is not CPU utilization

On Linux, load average is a smoothed average of runnable tasks and some tasks in uninterruptible wait, according to the kernel's definition. It is not a CPU percentage. A load of 4 may be normal on a machine with many CPUs but indicate a queue on a small machine; blocked tasks matter too.

Comparing load average with the number of logical CPUs is a rough signal, not a conclusion. Combine `uptime`, `top`, `vmstat`, I/O-wait information, and process analysis to determine whether work is running or waiting.

## An investigation process

1. Record the time, symptoms, and whether the whole machine or one application is affected.
2. Use `ps` or `top` to identify processes or threads consuming CPU or holding substantial memory.
3. Check whether tasks are runnable, sleeping, or in uninterruptible sleep.
4. Use `vmstat`, `iostat`, or `pidstat` to distinguish CPU, memory, and I/O causes.
5. Use `strace` or selective tracing to find waiting system calls; tracing has overhead, so use it carefully.

Commands and columns vary across distributions and versions of util-linux or procps. Avoid making `kill -9` the first step: understand what a process is doing, then use an appropriate signal to request a clean shutdown.

## Summary

- Process state, CPU time, and load average measure different things.
- A runnable process may be running or waiting for CPU; a sleeping process usually waits for an event.
- Wall time can be large while CPU time is small because of I/O or lock waits.
- Load average is not CPU percentage; interpret it with CPU count and task states.
- Diagnose with multiple tools guided by a specific hypothesis.

## Check your understanding

**Does load average 8 always mean 800% CPU use?** No. Load average is not a CPU percentage.

**Can a sleeping process cause latency?** Yes. It may be waiting on I/O or a lock.

**Should a zombie be killed to stop it?** It has already stopped; its parent needs to collect its status.

## Read next

For more on Linux logs and resource monitoring, see the **Linux System** topic.

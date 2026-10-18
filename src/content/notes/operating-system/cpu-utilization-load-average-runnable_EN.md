---
title: "Load Average, CPU Utilization, and Runnable Tasks"
category: "Operating System"
tags: ["linux", "cpu", "monitoring"]
description: "Interpret load average in context, distinguish busy CPUs from tasks waiting on I/O, and find runnable queues that add latency."
updated: 2026-10-17
translationKey: "operating-system/cpu-utilization-load-average-runnable"
---

CPU utilization reports how much time cores spend in different states. On Linux, load average is a smoothed count of tasks in state `R` (running or runnable) and `D` (uninterruptible sleep, often waiting for I/O) over 1-, 5-, and 15-minute windows. The [`/proc/loadavg` documentation](https://man7.org/linux/man-pages/man5/proc_loadavg.5.html) describes which states are counted. Because load is not normalized by logical CPU count, a load of 4 means something different on machines with 2 and 64 logical CPUs. This is only a rough comparison: SMT, heterogeneous core designs, and current CPU activity also affect processing capacity.

## Runnable and blocked

A runnable task is running or waiting for CPU time. A blocked task waits for an event; if it is in uninterruptible state `D`, it also contributes to load average despite not competing for CPU at that moment. Therefore, high load does not necessarily mean high CPU utilization.

## Observation tools

`uptime` and `top` show load and CPU use; `vmstat 1` reports the runnable queue (`r`), blocked tasks (`b`), CPU, and swap; `mpstat` shows each CPU; and `pidstat` helps relate activity to processes. A single snapshot can miss bursts, so examine a time series alongside application latency.

Context switches, VM steal time, cgroup CPU throttling, and interrupt load also affect processing capacity. Compare load with core count, container quota, and the workload baseline before changing scheduler policy or priority.

## Check your understanding

**Does a load average of 8 mean 800% CPU?** No.

**Does 100% CPU prove that throughput is sufficient?** No; check queues, latency, and core count.

**Is high load always caused by CPU-bound processes?** No; I/O-blocked tasks may contribute too.

## Further reading

A cgroup quota can throttle a process even while other host cores are idle.

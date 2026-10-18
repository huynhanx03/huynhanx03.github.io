---
title: "Linux resource monitoring and cgroups"
category: "Operating System"
tags: ["linux", "monitoring", "cgroups", "resources"]
description: "Analyze CPU, memory, and I/O, and understand how cgroups measure or limit resources for process groups."
updated: 2026-10-16
translationKey: "operating-system/linux-resource-monitoring-cgroups"
---

A process uses resources in several ways: CPU time, resident memory, I/O, and thread count. A high value does not identify a failure by itself. Relate metrics to process state, cgroup limits, and the actual workload.

## Tools for different views

- `top`/`htop`: process and CPU/memory snapshots over time.
- `vmstat`: run queue, memory, swap, block I/O, and overall CPU activity.
- `iostat`: block-device activity and latency or throughput, depending on the tool.
- `pidstat`: statistics by process or thread.
- `lsof`: open files and sockets.
- `strace`: system calls and waiting time at the kernel boundary.

Column names and normalization vary by version. A snapshot is not enough to establish a cause; collect data over time while the problem occurs.

## Load and the run queue

A long run queue suggests runnable tasks are waiting for CPU. Low CPU utilization with high load may come from tasks in uninterruptible waits; high CPU may come from computation or spinning. Inspect process states alongside I/O wait.

`nice` adjusts relative priority weight on some schedulers; it is not a guaranteed CPU limit. Cgroups provide grouping and resource limits and accounting through a hierarchy.

## Cgroups

Control groups organize processes into groups to limit, distribute, and measure resources such as CPU, memory, I/O, and process count. Container runtimes and systemd commonly create cgroups for workloads. The cgroup v1 and v2 kernel interfaces differ, so commands and paths depend on the configuration.

A memory limit can make an allocation fail or trigger an OOM event inside a cgroup even when the machine still has free RAM. A CPU quota limits average processing time; throttling can increase latency even if the host has spare CPU. Inspect cgroup metrics alongside host metrics.

## A process for finding bottlenecks

1. Identify the service and cgroup containing the process.
2. Compare host-level resources with group-level limits and usage.
3. Classify the issue as CPU-bound, memory pressure, I/O wait, lock wait, or throttling.
4. Use detailed tracing or profiling only in the suspected area to avoid unnecessary overhead.
5. Adjust quotas, concurrency, or workload, then compare using the same measurements.

## Summary

- Use several metrics because CPU, memory, and I/O can all contribute to slowness.
- Load average is not utilization; run queues and blocked states help explain it.
- `nice` sets relative priority, while cgroups manage resources by group.
- A cgroup limit can cause OOM or throttling even when the host has resources left.
- Diagnosis should compare host-level and group-level metrics.

## Check your understanding

**If the host has free RAM, can a process still be OOM-killed?** Yes. A cgroup limit may be lower than the host's capacity.

**Does a low CPU quota affect only throughput, not latency?** No. A task can be throttled and forced to wait.

**Does `strace` leave timing unchanged?** No. It adds overhead; use it selectively.

## Read next

The **Linux Tools & Environment** topic covers the shell and administration tools used to work with these subsystems.

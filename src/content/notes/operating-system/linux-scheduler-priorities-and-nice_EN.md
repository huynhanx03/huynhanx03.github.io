---
title: "Linux Scheduling Priorities and nice Values"
category: "Operating System"
tags: ["linux", "scheduler", "priority"]
description: "Interpret nice values correctly, distinguish normal and real-time scheduling classes, and avoid treating priority as a fixed CPU percentage."
updated: 2026-10-16
translationKey: "operating-system/linux-scheduler-priorities-and-nice"
---

Priority is not a promise that a process always receives a fixed percentage of CPU. It affects decisions when multiple runnable tasks compete for the same CPU, while actual load also depends on core count, I/O wait, affinity, and scheduler policy.

## Nice values in the normal scheduling class

For ordinary tasks, nice commonly ranges from -20 to 19: a lower number means higher relative priority; a higher number means the task yields more CPU when competing. Users can commonly increase nice (lower priority); decreasing nice to raise priority may require administrative privileges.

With GNU `nice`, `nice -n 10 command` adds 10 to the inherited nice value, within allowed limits: 0 becomes 10, while 5 becomes 15. This is an adjustment, not a request for an absolute value of 10. `renice` adjusts a running process. `ps -o pid,ni,pri,stat,comm -p PID` shows related information, but do not confuse the `PRI` column with a direct CPU percentage.

## Real-time scheduling and affinity

Linux has real-time policies such as `SCHED_FIFO` and `SCHED_RR`, with semantics different from the normal class. A real-time task can occupy CPU for a long time if designed poorly, making the system unresponsive. Use these policies with privilege limits and a clear understanding of watchdogs, priority inversion, and the system's CPU budget.

CPU affinity limits which cores a task may run on. It can help with locality or workloads needing stable placement, but overly narrow affinity leaves the scheduler fewer choices when a core is overloaded. Cgroups can limit or allocate resources by group and may fit policies for many processes better.

## Observe before changing

`top` or `htop` shows a utilization snapshot; `ps` shows per-process state; `pidstat` or similar tools provide a time series. Check whether CPU is actually busy or tasks are blocked. If most of the workload waits for disk or network, raising priority usually does not address the cause.

Try a change on one representative process, measure latency and throughput, then consider broader use. A higher-priority task may improve its own latency by taking CPU time from another task.

## Check your understanding

**Does nice 19 mean the process receives exactly 19% CPU?** No.

**Does raising priority help slow I/O?** Usually not if the bottleneck is the device or an external service.

**Does real-time mean faster?** It provides a different scheduling policy and can cause starvation if misused.

## Further reading

For a process in a container, cgroups apply resource limits and accounting to the group.

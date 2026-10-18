---
title: "Preemption, Timer Ticks, and Scheduler Latency"
category: "Operating System"
tags: ["operating-system", "scheduler", "kernel"]
description: "Understand preemption points, timer ticks, and sources of delay before a runnable task gets CPU time."
updated: 2026-10-16
translationKey: "operating-system/scheduler-tickless-preemption-latency"
---

Preemption lets the kernel pause a running task and give CPU time to another. A timer interrupt is one way for the kernel to regain control periodically, but scheduler latency also depends on kernel state, interrupt masking, priority, run queues, and CPU affinity.

## Ticks and tickless operation

A periodic timer tick updates time and may trigger scheduling. A tickless kernel reduces unnecessary ticks while a CPU is idle or according to its configuration, saving power and reducing interrupt overhead. Timers are still needed for timeouts and deadlines.

## Sources of latency

A runnable task may wait because a higher-priority task is running, locks are contended, IRQ or softirq load is high, a CPU quota throttles the task, or it is pinned to a busy core. A preemptible kernel configuration and a real-time patch change the limits of some latency paths, but do not automatically turn the system into a hard real-time system.

## Measuring latency

Measure from an event until the task actually runs; context-switch counts alone are not enough. Depending on the system, `perf sched`, ftrace/trace-cmd, and eBPF tools can trace run-queue wait time. Record CPU, priority, cgroup, IRQ activity, and workload to interpret the result.

## Check your understanding

**Does a timer tick every millisecond guarantee every task runs within one millisecond?** No.

**Does a tickless idle CPU have no timers at all?** No; timers still serve deadlines and events.

**Does PREEMPT_RT guarantee application deadlines by itself?** No; the application, configuration, and hardware must also meet their requirements.

## Further reading

Real-time policies require control over priority, interrupts, and blocking to achieve bounded latency.

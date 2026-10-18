---
title: "CPU performance: latency, throughput, and waiting time"
category: "Operating System"
tags: ["performance", "latency", "throughput", "computer architecture"]
description: "Distinguish the time to finish one task from the rate of processing many tasks, then find bottlenecks with evidence."
updated: 2026-10-16
translationKey: "operating-system/performance-latency-throughput"
---

A machine may finish one task sooner but handle fewer requests overall. It may also handle many tasks at once while making each request wait longer. So the question “Is this machine fast?” is incomplete. First decide whether you are measuring latency, throughput, or another goal.

## Two measures answer two questions

- **Latency:** how long one task takes from start to completion.
- **Throughput:** how many tasks or how much data is processed per unit of time.

For example, a server handling 100 requests per second has a throughput of 100 req/s over the measurement interval. But an individual request might take 20 ms or 2 seconds. Look at the latency distribution, especially percentiles such as p50, p95, and p99; an average can hide a group of very slow requests.

A CPU pipeline can increase throughput by overlapping instructions without making each instruction's latency disappear. Likewise, handling more requests concurrently can improve throughput until resources saturate, while contention makes latency rise.

## CPU time and waiting time

The observed runtime of a program can include CPU execution, memory stalls, disk or network waits, lock waits, or time when the operating system has not scheduled it. Raising clock speed helps only the portion that is actually CPU-bound, and is still limited by power, temperature, caches, and available parallelism.

A useful decomposition is:

```text
completion time
≈ useful CPU time
 + resource waiting time
 + synchronization/scheduling/coordination overhead
```

This is a model for asking questions. The parts can overlap, so they cannot always be added directly. Profiling and tracing tools help identify which part dominates a real workload.

## The basic CPU equation and its limits

A classic model is:

```text
CPU time ≈ instruction count × CPI × clock-cycle time
```

CPI is the average number of cycles per instruction under the chosen counting method. The equation reminds us that performance depends on more than clock frequency: instruction count and cycles per instruction matter too.

On modern CPUs, one ISA instruction may become several micro-operations, multiple instructions may execute at once, and cache misses or branches make timing variable. The equation is therefore a reasoning tool, not a replacement for a benchmark or performance counters.

## Amdahl's law: the unimproved part limits total speedup

If a fraction `p` of runtime is accelerated by a factor of `s`, the ideal overall speedup is:

```text
speedup = 1 / ((1 - p) + p / s)
```

Suppose 80% of runtime can be made four times faster:

```text
speedup = 1 / (0.2 + 0.8 / 4) = 2.5×
```

The unimproved 20% sets a limit. Real results can be lower because of overhead, communication between cores, and shared resources. The practical lesson is to measure first, identify the part consuming time, and choose an optimization that affects it directly.

## Benchmarks need a fair comparison

A useful measurement keeps comparison conditions consistent: the same input data, task, build mode, and machine configuration, with enough runs to reveal variation. Record latency as well as throughput when the system serves multiple tasks. Track temperature and machine state during long measurements.

Do not compare only one run or generalize a microbenchmark directly to a large application. A microbenchmark helps isolate an operation, but may not represent caching, allocation, I/O, and concurrency in a real program.

## Summary

- Latency measures the time for one task; throughput measures completed work per unit of time.
- More concurrency can improve throughput while worsening latency once resources saturate.
- Memory, I/O, and synchronization waits can exceed computation time.
- Amdahl's law shows how the unimproved portion limits total speedup.
- Benchmarks should represent real workloads and operating conditions.

## Check your understanding

**Does higher throughput mean every request finishes sooner?** No. More requests can be completed while each one waits longer.

**Will a higher CPU clock speed definitely make a program faster?** No. The program may be limited by memory, I/O, synchronization, or something else.

**If one code section becomes ten times faster, will the whole application become ten times faster?** Only if nearly all runtime was in that section and overhead is negligible; Amdahl's law estimates the limit.

## Read next

In the **Processes & Scheduling** topic, latency and throughput help analyze responsiveness and CPU utilization.
